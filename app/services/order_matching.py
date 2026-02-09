from typing import List, Dict, Tuple
from app.db.models import Order, Trade, db
from app.services.metrics import detect_trade_type
from datetime import datetime
import uuid

def match_orders_to_trades(account:str = None) -> tuple[List[Trade], Dict]:
    # Match filled orders using FIFO

    # Returns list of created trades, summary dict

    # get all unmatched filled orders
    query = Order.query.filter_by(is_filled=True, is_matched = False)
    if account:
        query = query.filter_by(account = account)

    all_orders = query.order_by(Order.fill_time).all()

    if not all_orders:
        return [], {'trades_created': 0, 'unmatched_orders': 0, 'errors': []}

    # If we can't parse fill_time, we can't reliably match. Keep them unmatched and report.
    orders_missing_time = [o for o in all_orders if o.fill_time is None]
    all_orders = [o for o in all_orders if o.fill_time is not None]

    if not all_orders:
        return [], {
            'trades_created': 0,
            'unmatched_orders': len(orders_missing_time),
            'errors': [f"{len(orders_missing_time)} filled orders missing fill_time; cannot match until timestamps parse correctly."]
        }

    
    # separate by sumbol and account
    orders_by_key = {}
    for order in all_orders:
        key = (order.contract, order.account)
        if key not in orders_by_key:
            orders_by_key[key] = {'buy': [], 'sell': []}
        if order.is_buy:
            orders_by_key[key]['buy'].append(order)
        elif order.is_sell:
            orders_by_key[key]['sell'].append(order)
        
    
    trades = []
    summary = {
        'trades_created': 0,
        'unmatched_orders': 0,
        'errors': []
    }

    # match orders for each symbol acc combo
    for (symbol, acc), order_lists in orders_by_key.items():
        buy_orders = sorted(order_lists['buy'], key=lambda x: x.fill_time)
        sell_orders = sorted(order_lists['sell'], key=lambda x: x.fill_time)
        
        # Match LONG trades (Buy → Sell)
        long_trades, long_errors = _match_long_trades(buy_orders, sell_orders, symbol, acc)
        trades.extend(long_trades)
        summary['errors'].extend(long_errors)
        
        # Match SHORT trades (Sell → Buy) - reverse logic
        short_trades, short_errors = _match_short_trades(sell_orders, buy_orders, symbol, acc)
        trades.extend(short_trades)
        summary['errors'].extend(short_errors)

    if trades:
        try:
            db.session.bulk_save_objects(trades)
            db.session.commit()
            summary['trades_created'] = len(trades)
        except Exception as e:
            db.session.rollback()
            summary['errors'].append(f"Failed to save trades: {str(e)}")
            return [], summary
    
    # Count unmatched orders
    unmatched = Order.query.filter_by(is_filled=True, is_matched=False).count()
    summary['unmatched_orders'] = unmatched
    
    return trades, summary


def _match_long_trades(buy_orders: List[Order], sell_orders: List[Order],
                      symbol: str, account: str) -> tuple[List[Trade], List[str]]:
    """
    Match Buy orders (entries) with Sell orders (exits) for LONG trades.
    Handles scaled exits.
    
    Algorithm: FIFO (First In, First Out)
    - First Buy matches with first Sell
    - If Sell quantity < Buy quantity, create partial trade
    - If Sell quantity > Buy quantity, use remaining for next Buy
    """
    trades = []
    errors = []
    
    # Create position queue (FIFO)
    buy_queue = buy_orders.copy()
    sell_queue = sell_orders.copy()
    
    while buy_queue and sell_queue:
        buy_order = buy_queue[0]  # Get first buy order
        
        # Find sell orders that come AFTER this buy order
        matching_sells = [
            s for s in sell_queue 
            if s.fill_time > buy_order.fill_time and s.filled_qty > 0 and not s.is_matched
        ]
        
        if not matching_sells:
            # No matching sell found, this buy order is orphaned
            buy_queue.pop(0)
            errors.append(f"Orphaned buy order: {buy_order.id} (no matching sell)")
            continue
        
        # Match buy order with sell orders (FIFO)
        remaining_buy_qty = buy_order.filled_qty
        exit_orders = []  # For scaled exits
        total_exit_qty = 0
        weighted_exit_price = 0.0
        
        for sell_order in matching_sells:
            if remaining_buy_qty <= 0:
                break
            # How much to match
            match_qty = min(remaining_buy_qty, sell_order.filled_qty)
            
            exit_orders.append({
                'order_id': sell_order.id,
                'quantity': match_qty,
                'price': float(sell_order.avg_price),
                'fill_time': sell_order.fill_time.isoformat()
            })
            
            total_exit_qty += match_qty
            weighted_exit_price += float(sell_order.avg_price) * match_qty
            
            # Update sell order
            sell_order.filled_qty -= match_qty
            if sell_order.filled_qty <= 0:
                sell_order.is_matched = True
                sell_order.matched_trade_id = None  # Will set after trade created
                sell_queue.remove(sell_order)
            else:
                # Partial match - order still has remaining quantity
                pass

        if total_exit_qty > 0:
            # Calculate average exit price
            avg_exit_price = weighted_exit_price / total_exit_qty
            
            # Calculate PnL
            pnl = (avg_exit_price - float(buy_order.avg_price)) * total_exit_qty
            
            # Get exit time (latest exit order)
            exit_time = max([datetime.fromisoformat(e['fill_time']) for e in exit_orders])
            
            # Create trade
            trade_id = f"trade-{uuid.uuid4().hex[:12]}"
            trade = Trade(
                id=trade_id,
                acc_id=account,
                symbol=symbol,
                direction='LONG',
                entry_time=buy_order.fill_time,
                entry_price=buy_order.avg_price,
                entry_order_id=buy_order.id,
                exit_time=exit_time,
                exit_price=avg_exit_price,
                exit_order_id=exit_orders[0]['order_id'] if len(exit_orders) == 1 else None,
                exit_orders=exit_orders if len(exit_orders) > 1 else None,
                quantity=total_exit_qty,
                pnl=pnl,
                is_scaled=len(exit_orders) > 1,
                trade_type=detect_trade_type(buy_order.fill_time, exit_time)
            )
            
            trades.append(trade)


            # Mark buy order as matched
            buy_order.is_matched = True
            buy_order.matched_trade_id = trade_id
            buy_order.matched_quantity = total_exit_qty
            
            # Update sell orders with trade_id
            for exit_order_data in exit_orders:
                sell_order = Order.query.filter_by(id=exit_order_data['order_id']).first()
                if sell_order:
                    sell_order.matched_trade_id = trade_id
                    sell_order.matched_quantity = exit_order_data['quantity']
            
            # If buy order not fully matched, keep remainder
            if remaining_buy_qty > 0:
                buy_order.filled_qty = remaining_buy_qty
            else:
                buy_queue.pop(0)
    
    return trades, errors

def _match_short_trades(sell_orders: List[Order], buy_orders: List[Order],
                       symbol: str, account: str) -> tuple[List[Trade], List[str]]:
    """
    Match Sell orders (entries) with Buy orders (exits) for SHORT trades.
    Similar logic but reversed.
    """

    trades = []
    errors = []
    
    # Create position queue (FIFO)
    buy_queue = buy_orders.copy()
    sell_queue = sell_orders.copy()
    
    while buy_queue and sell_queue:
        sell_order = sell_queue[0]  # Get first sell order
        
        # Find buy orders that come AFTER this sell order
        matching_buys = [
            b for b in buy_queue 
            if b.fill_time > sell_order.fill_time and b.filled_qty > 0 and not b.is_matched
        ]
        
        if not matching_buys:
            # No matching buy found, this sell order is orphaned
            sell_queue.pop(0)
            errors.append(f"Orphaned sell order: {sell_order.id} (no matching buy)")
            continue
        
        # Match sell order with buy orders (FIFO)
        remaining_sell_qty = sell_order.filled_qty
        exit_orders = []  # For scaled exits
        total_exit_qty = 0
        weighted_exit_price = 0.0
        
        for buy_order in matching_buys:
            if remaining_sell_qty <= 0:
                break
            # How much to match
            match_qty = min(remaining_sell_qty, buy_order.filled_qty)
            
            exit_orders.append({
                'order_id': buy_order.id,
                'quantity': match_qty,
                'price': float(buy_order.avg_price),
                'fill_time': buy_order.fill_time.isoformat()
            })
            
            total_exit_qty += match_qty
            weighted_exit_price += float(buy_order.avg_price) * match_qty
            
            # Update buy order
            buy_order.filled_qty -= match_qty
            if buy_order.filled_qty <= 0:
                buy_order.is_matched = True
                buy_order.matched_trade_id = None  # Will set after trade created
                buy_queue.remove(buy_order)
            else:
                # Partial match - order still has remaining quantity
                pass

        if total_exit_qty > 0:
            # Calculate average exit price
            avg_exit_price = weighted_exit_price / total_exit_qty
            
            # Calculate PnL
            pnl = (float(sell_order.avg_price) - avg_exit_price) * total_exit_qty
            
            # Get exit time (latest exit order)
            exit_time = max([datetime.fromisoformat(e['fill_time']) for e in exit_orders])
            
            # Create trade
            trade_id = f"trade-{uuid.uuid4().hex[:12]}"
            trade = Trade(
                id=trade_id,
                acc_id=account,
                symbol=symbol,
                direction='SHORT',
                entry_time=sell_order.fill_time,
                entry_price=sell_order.avg_price,
                entry_order_id=sell_order.id,
                exit_time=exit_time,
                exit_price=avg_exit_price,
                exit_order_id=exit_orders[0]['order_id'] if len(exit_orders) == 1 else None,
                exit_orders=exit_orders if len(exit_orders) > 1 else None,
                quantity=total_exit_qty,
                pnl=pnl,
                is_scaled=len(exit_orders) > 1,
                trade_type=detect_trade_type(sell_order.fill_time, exit_time)
            )
            
            trades.append(trade)


            # Mark buy order as matched
            sell_order.is_matched = True
            sell_order.matched_trade_id = trade_id
            sell_order.matched_quantity = total_exit_qty
            
            # Update sell orders with trade_id
            for exit_order_data in exit_orders:
                buy_order = Order.query.filter_by(id=exit_order_data['order_id']).first()
                if buy_order:
                    buy_order.matched_trade_id = trade_id
                    buy_order.matched_quantity = exit_order_data['quantity']
            
            # If buy order not fully matched, keep remainder
            if remaining_sell_qty > 0:
                sell_order.filled_qty = remaining_sell_qty
            else:
                sell_queue.pop(0)
    
    return trades, errors