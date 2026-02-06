from __future__ import annotations

import csv
import io
import uuid
from typing import Any, List, Dict, Optional
from datetime import datetime

def parse_csv_text(csv_text: str) -> List[Dict[str, str]]:
    """
    Parses csv text into list of dictionary where each row is a dict where key are columns
    """

    csv_file = io.StringIO(csv_text)

    reader = csv.DictReader(csv_file)
    
    rows = list(reader)

    return rows

def normalize_column_name(column_name: str) -> str:
    normalized = column_name.lower().replace(' ', '').replace('_', '')
    return normalized

def find_column_value(row: Dict[str, str], possible_names: List[str]) -> Optional[str]:
    """
    args:
        row: dict representing one csv row
        possible_namesL list of possible col names to try
    """
    # try exact match
    for name in possible_names:
        if name in row:
            return row[name].strip() if row[name] else None
        
        for key in row.keys():
            if key.lower() == name.lower():
                return row[key].strip() if row[key] else None

    # try normalized matches
    normalized_rows = {normalize_column_name(k): v for k, v in row.items()}
    for name in possible_names:
        normalized_name = normalize_column_name(name)
        if normalized_name in normalized_rows:
            value = normalized_rows[normalized_name]
            return value.strip() if value else None

    return None

def combine_date_time(date_str: str, time_str: Optional[str] = None) -> datetime:
    """convert date:2026-01-15, time: 09:30 to datetime(2026, 1, 15, 9, 30)"""

    date_obj = datetime.strptime(date_str, "%Y-%m-%d")

    if time_str:
        time_str = time_str.strip()
        if len(time_str) == 5:
            time_format = "%H:%M"
        else:
            time_format = "%H:%M:%S"

        time_obj = datetime.strptime(time_str, time_format).time()
        return datetime.combine(date_obj.date(), time_obj)
    
    return date_obj

def calculate_pnl(entry_price: float, exit_price: float, quantity: int, side: str) -> float:
    if side.lower() == 'long':
        return (exit_price - entry_price) * quantity

    else:
        return (entry_price - exit_price) * quantity


def map_csv_row_to_backend_format(row:Dict[str, str], default_acc_id: str = "default") -> Dict[str, Any]:
    """
    - Date + Time → entry_time, exit_time
    - Symbol → symbol
    - Side → direction (LONG/SHORT)
    - Entry Price → entry_price
    - Exit Price → exit_price
    - Quantity → quantity
    - PnL → pnl
    - Tags → strategy (first tag)
    - Account → acc_id
    - Notes → (not stored in backend currently, but we can add it later)
    - Duration → (not stored in backend currently)
    """

    trade_id = find_column_value(row, ['id', 'trade_id', 'tradeid'])
    if not trade_id:
        trade_id = f"csv-{uuid.uuid4().hex[:12]}"
    
    # symbol
    symbol = find_column_value(row, ['Symbol', 'symbol', 'sym', 'instrument'])
    if not symbol:
        raise ValueError("Missing required field: Symbol")
    
    # side - direction
    side = find_column_value(row, ['direction', 'side', 'Side', 'Direction', 'dir'])
    if not side:
        raise ValueError("Missing required field: side")

    # Convert to backend format (LONG/SHORT)
    direction = side.upper()
    if direction not in ['LONG', 'SHORT']:
        side_lower = side.lower()
        if side_lower in ['buy', 'b', 'long', 'l']:
            direction = 'LONG'
        elif side_lower in ['sell', 's', 'short', 'sh']:
            direction = 'SHORT'
        else:
            raise ValueError(f"Invalid Side value: {side}. Must be 'long' or 'short'")
    
    # Step 4: Get Entry Price and Exit Price
    entry_price_str = find_column_value(row, ['Entry Price', 'entry price', 'entry_price', 'entryprice', 'entry'])
    exit_price_str = find_column_value(row, ['Exit Price', 'exit price', 'exit_price', 'exitprice', 'exit'])
    
    if not entry_price_str:
        raise ValueError("Missing required field: Entry Price")
    if not exit_price_str:
        raise ValueError("Missing required field: Exit Price")

    try:
        entry_price = float(entry_price_str)
        exit_price = float(exit_price_str)
    except ValueError:
        raise ValueError(f"Invalid price values: entry={entry_price_str}, exit={exit_price_str}")
    
    # Step 5: Get Quantity
    quantity_str = find_column_value(row, ['Quantity', 'quantity', 'qty', 'shares', 'contracts'])
    if not quantity_str:
        raise ValueError("Missing required field: Quantity")
    
    try:
        quantity = int(float(quantity_str))
    except ValueError:
        raise ValueError(f"Invalid Quantity value: {quantity_str}")
    
    # Step 6: Get Date and Time
    date_str = find_column_value(row, ['Date', 'date', 'trade_date'])
    if not date_str:
        raise ValueError("Missing required field: Date")
    
    # Get Time (your CSV has a "Time" column)
    time_str = find_column_value(row, ['Time', 'time', 'trade_time'])
     # For entry_time and exit_time, we'll use the same date+time
    # (If you have separate entry/exit times in future, we can modify this)
    try:
        entry_time = combine_date_time(date_str, time_str)
        exit_time = combine_date_time(date_str, time_str)
        
        # If exit time is before entry time, assume next day (overnight trades)
        if exit_time < entry_time:
            from datetime import timedelta
            exit_time = exit_time + timedelta(days=1)
    except ValueError as e:
        raise ValueError(f"Invalid Date/Time format: {str(e)}")
    
    # Step 7: Get or Calculate PnL
    pnl_str = find_column_value(row, ['PnL', 'pnl', 'profit', 'pl', 'profit_loss'])
    if pnl_str:
        try:
            pnl = float(pnl_str)
        except ValueError:
            # If PnL is invalid, calculate it
            pnl = calculate_pnl(entry_price, exit_price, quantity, side)
    else:
        # Calculate PnL if not provided
        pnl = calculate_pnl(entry_price, exit_price, quantity, side)
    
    # Step 8: Get Account (maps to acc_id)
    acc_id = find_column_value(row, ['Account', 'account', 'acc_id', 'account_id'])
    if not acc_id:
        acc_id = default_acc_id

    # Step 9: Get Tags (maps to strategy - take first tag if multiple)
    tags_str = find_column_value(row, ['Tags', 'tags', 'tag', 'strategy'])
    strategy = None
    if tags_str:
        # If tags are semicolon-separated like "Breakout;Morning", take first one
        if ';' in tags_str:
            strategy = tags_str.split(';')[0].strip()
        else:
            strategy = tags_str.strip()
    
    # Step 10: Notes and Duration
    # These aren't in your backend model yet, but we can store them for future use
    notes = find_column_value(row, ['Notes', 'notes', 'note'])
    duration = find_column_value(row, ['Duration', 'duration'])
    
    # Build the backend format dictionary
    backend_trade = {
        'id': trade_id,
        'acc_id': acc_id,
        'symbol': symbol,
        'direction': direction,
        'entry_time': entry_time.isoformat(),  # Convert datetime to ISO string
        'exit_time': exit_time.isoformat(),
        'entry_price': entry_price,
        'exit_price': exit_price,
        'quantity': quantity,
        'pnl': pnl,
        'strategy': strategy,  # From Tags column
        'trade_type': None  # Will be auto-detected by backend
    }
    
    return backend_trade


def parse_and_validate_csv(csv_text: str, default_acc_id: str = "default") -> tuple[List[Dict[str, Any]], List[str]]:
    successful_trades = []
    error_messages = []

    try:
        rows = parse_csv_text(csv_text)

        if not rows:
            return [], ["CSV file is empty or has no data rows"]
        
        for row_num, row in enumerate(rows, start = 2):
            try:
                backend_trade = map_csv_row_to_backend_format(row, default_acc_id)
                successful_trades.append(backend_trade)
            except ValueError as e:
                # Record error but continue processing
                error_messages.append(f"Row {row_num}: {str(e)}")
            except Exception as e:
                error_messages.append(f"Row {row_num}: Unexpected error - {str(e)}")
    except Exception as e:
        error_messages.append(f"Failed to parse CSV: {str(e)}")
    
    return successful_trades, error_messages  
            
    
def save_raw_orders_to_db(csv_text: str, account: str = "default") -> tuple[List[Order], List[str]]:
    from app.db.models import Order, db
    from datetime import datetime

    rows = parse_csv_text(csv_text)

    if not rows:
        return [], ["CSV file is empty"]

    saved_orders = []
    errors = []

    for row_num, row in enumerate(rows, start = 2):
        try:
            order_id = row.get('orderId') or row.get('Order ID') or row.get('order_id')
            if not order_id:
                order_id = f"order-{uuid.uuid4().hex[:12]}"
            
            # Check if order already exists (idempotency)
            existing = Order.query.filter_by(id=order_id).first()
            if existing:
                errors.append(f"Row {row_num}: Order {order_id} already exists, skipping")
                continue
            
            # Parse fill time
            fill_time = None
            fill_time_str = row.get('Fill Time') or row.get('fill_time') or row.get('Timestamp')
            if fill_time_str:
                try:
                    # Handle format: "01/15/2026 07:40:22"
                    fill_time = datetime.strptime(fill_time_str, '%m/%d/%Y %H:%M:%S')
                except:
                    try:
                        # Try ISO format as fallback
                        fill_time = datetime.fromisoformat(fill_time_str)
                    except:
                        pass  # Leave as None if can't parse
            
            # Determine status flags
            status = row.get('Status', '').strip()
            is_filled = status == 'Filled'
            
            b_s = row.get('B/S', '').strip()
            is_buy = b_s.upper() == 'BUY'
            is_sell = b_s.upper() == 'SELL'

            def safe_float(value):
                if not value:
                    return None
                try:
                    return float(str(value).replace(',', ''))
                except:
                    return None
            
            def safe_int(value):
                if not value:
                    return None
                try:
                    return int(float(str(value).replace(',', '')))
                except:
                    return None
            
            avg_price = safe_float(row.get('Avg Fill Price') or row.get('avgPrice'))
            filled_qty = safe_int(row.get('Filled Qty') or row.get('filledQty'))
            limit_price = safe_float(row.get('Limit Price') or row.get('decimalLimit'))
            stop_price = safe_float(row.get('Stop Price') or row.get('decimalStop'))
            
            # Create Order object
            order = Order(
                id=order_id,
                order_id=order_id,
                account=row.get('Account', account),
                b_s=b_s,
                contract=row.get('Contract', ''),
                product=row.get('Product', ''),
                avg_price=avg_price,
                filled_qty=filled_qty,
                fill_time=fill_time,
                status=status,
                limit_price=limit_price,
                stop_price=stop_price,
                order_type=row.get('Type', ''),
                text=row.get('Text', ''),
                raw_csv_data=row,  # Store entire row as JSON
                is_filled=is_filled,
                is_buy=is_buy,
                is_sell=is_sell
            )
            
            db.session.add(order)
            saved_orders.append(order)
        except Exception as e:
            errors.append(f"Row {row_num}: Error saving order - {str(e)}")
            continue
    
    # Commit all orders in one transaction
    try:
        db.session.commit()
        return saved_orders, errors
    except Exception as e:
        db.session.rollback()
        return [], [f"Database error: {str(e)}"] + errors

if __name__ == '__main__':
    with open('/Users/desmondjung/Downloads/Orders.csv', 'r') as f:
        csv_text = f.read()
    
    trades, errors = parse_and_validate_csv(csv_text, default_acc_id = "default")
    print(f"Successfully parsed: {len(trades)} trades")
    print(f"Errors: {errors}")