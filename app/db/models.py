from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Trade(db.Model):
    __tablename__ = 'trades'
    __table_args__ = {'schema': 'trade'}

    id = db.Column(db.String(50), primary_key = True)
    acc_id = db.Column(db.String(20), nullable = False)
    symbol = db.Column(db.String(10), nullable = False)
    direction = db.Column(db.String(10), nullable = False)
    entry_time = db.Column(db.DateTime, nullable = False)
    exit_time = db.Column(db.DateTime, nullable = False)
    entry_price = db.Column(db.Numeric(10,2), nullable = False)
    exit_price = db.Column(db.Numeric(10,2), nullable = False)
    quantity = db.Column(db.Integer, nullable = False)
    pnl = db.Column(db.Numeric(10,2), nullable = False)
    strategy = db.Column(db.String(50), nullable = True)
    trade_type = db.Column(db.String(20), nullable = True)
    entry_order_id = db.Column(db.String(50)) # which order was entry
    exit_order_id = db.Column(db.String(50)) # which order was exit
    exit_orders = db.Column(db.JSON) # if mulitple exit orders
    is_scaled = db.Column(db.Boolean, default = False)
    fills = db.Column(db.JSON)  # All orders (entry + exit) in this trade as list of dicts


    # convert trade object to dict
    def to_dict(self):
        return {
            'id': self.id,
            'acc_id': self.acc_id,
            'symbol': self.symbol,
            'direction': self.direction,
            'entry_time': self.entry_time.isoformat() if self.entry_time else None, 
            'exit_time': self.exit_time.isoformat() if self.exit_time else None,
            'entry_price': float(self.entry_price),
            'exit_price': float(self.exit_price),
            'quantity': int(self.quantity),
            'pnl': float(self.pnl),
            'strategy': self.strategy,
            'trade_type': self.trade_type,
            'fills': self.fills if self.fills else []  # List of order dicts
        }

class Order(db.Model):
    __tablename__ = 'orders'
    __table_args__ = {'schema': 'trade'}

    # primary key
    id = db.Column(db.String(50), primary_key=True)
    order_id = db.Column(db.String(50))  # orderId column
    account = db.Column(db.String(50))   # Account column
    b_s = db.Column(db.String(10))        # B/S column (Buy/Sell)
    contract = db.Column(db.String(20))  # Contract column (MGCG6, etc.)
    product = db.Column(db.String(50))    # Product column
    avg_price = db.Column(db.Numeric(10,2))  # avgPrice or Avg Fill Price
    filled_qty = db.Column(db.Integer)   # filledQty or Filled Qty
    fill_time = db.Column(db.DateTime)   # Fill Time column
    status = db.Column(db.String(20))    # Status column (Filled, Canceled, etc.)
    limit_price = db.Column(db.Numeric(10,2))
    stop_price = db.Column(db.Numeric(10,2))
    order_type = db.Column(db.String(20))  # Type column (Limit, Market, Stop)
    text = db.Column(db.String(100))

    # metadata
    csv_import_date = db.Column(db.DateTime, default=datetime.utcnow)
    raw_csv_data = db.Column(db.JSON)

    # flags set during import
    is_filled = db.Column(db.Boolean, default = False)
    is_buy = db.Column(db.Boolean)  # b_s == 'Buy'
    is_sell = db.Column(db.Boolean)

    # matching flags
    is_matched = db.Column(db.Boolean, default=False)
    matched_trade_id = db.Column(db.String(50))
    matched_quantity = db.Column(db.Integer)

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'account': self.account,
            'b_s': self.b_s,
            'contract': self.contract,
            'avg_price': float(self.avg_price) if self.avg_price else None,
            'filled_qty': self.filled_qty,
            'fill_time': self.fill_time.isoformat() if self.fill_time else None,
            'status': self.status,
            'is_filled': self.is_filled,
            'is_buy': self.is_buy,
            'is_sell': self.is_sell,
            'is_matched': self.is_matched
        }