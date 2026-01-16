from flask import Flask, request, jsonify
from flask_restful import Api, Resource, reqparse, abort, fields, marshal_with
from flask_sqlalchemy import SQLAlchemy
from decimal import Decimal
from datetime import datetime

app = Flask(__name__)
api = Api(app)

# database configs
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://desmondjung@localhost/trading_journal'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'connect_args': {'options': '-csearch_path=trade'}
}

db = SQLAlchemy(app)

# Trade model
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
            'strategy': self.strategy
        }


# API Endpoint
@app.route('/api/trades', methods=['POST'])
def insert_trade():
    data = request.get_json()
    required_fields = ['id', 'acc_id', 'symbol', 'direction', 'entry_time', 'exit_time',
                        'entry_price', 'exit_price', 'quantity', 'pnl']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f"Missing required fields: {field}"})
    
    # check if trade already exists
    existing_trade = Trade.query.filter_by(id = data['id']).first()
    if existing_trade:
        return jsonify({'error': f"Trade {data['id']} already exists"})

    # can validate direction values here too

    # create new trade
    try:
        trade = Trade(
            id=data['id'],
            acc_id=data['acc_id'],
            symbol=data['symbol'],
            direction=data['direction'].upper(),
            entry_time = datetime.fromisoformat(data['entry_time']),
            exit_time = datetime.fromisoformat(data['exit_time']),
            entry_price=float(data['entry_price']),
            exit_price=float(data['exit_price']),
            quantity = int(data['quantity']),
            pnl = float(data['pnl']),
            strategy = data.get('strategy', None) 
        )

        db.session.add(trade)
        db.session.commit()

        return jsonify({'message': 'Trade inserted successfully', 'trade':trade.to_dict()}), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to insert trade: {str(e)}'}), 500

@app.route('/')
def home():
    return jsonify({'message': 'Trading Journal API', 'endpoints': ['POST /api/trades']})

if __name__ == '__main__':
    # create tables
    with app.app_context():
        db.create_all()
    app.run(debug=True)