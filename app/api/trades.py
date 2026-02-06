from flask import Blueprint, request, jsonify
from datetime import datetime
from app.db.models import db, Trade
from app.services.metrics import detect_trade_type
from app.utils.csv_parser import parse_and_validate_csv

# create blueprint

trade_bp = Blueprint('trades', __name__)

@trade_bp.route('/api/trades', methods=['POST'])
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

        entry_time = datetime.fromisoformat(data['entry_time'])
        exit_time = datetime.fromisoformat(data['exit_time'])

        trade_type = data.get('trade_type')
        if not trade_type:
            trade_type = detect_trade_type(entry_time, exit_time
            )
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
            strategy = data.get('strategy', None) ,
            trade_type = trade_type
        )

        db.session.add(trade)
        db.session.commit()

        return jsonify({'message': 'Trade inserted successfully', 'trade':trade.to_dict()}), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to insert trade: {str(e)}'}), 500

@trade_bp.route('/api/trades', methods = ['GET'])

# get all trades and filter optionally
def get_trades():
    try:
        symbol = request.args.get('symbol')
        id = request.args.get('id')

        # query
        query = Trade.query

        # Filters if provided in url
        if symbol:
            query = query.filter_by(symbol = symbol)
        if id:
            query = query.filter_by(id = id)
        
        trades = query.all()

        # convert trades object into dictionary
        trades_list = [trade.to_dict() for trade in trades]

        return jsonify({
            'count': len(trades_list),
            'trades': trades_list
        }), 200
    except Exception as e:
        return jsonify({'Error': f'Failed to retrieve trades: {str(e)}'}), 500

@trade_bp.route('/api/trades/<trade_id>', methods=['PATCH'])
def update_trade(trade_id):
    """update trade metadata(trade_type, tags, etc.)"""
    try:
        trade = Trade.query.filter_by(id=trade_id).first()

        if not trade:
            return jsonify({'error': f'Trade {trade_id} could not be updated'})

        data = request.get_json()

        # update trade_type if provided
        if 'trade_type' in data:
            allowed_types = ['day_trade', 'swing', 'long_term']
            if data['trade_type'] not in allowed_types:
                return jsonify({'errpr': f'Invalid trade type, must be from {allowed_types}'}), 400
            trade.trade_type = data['trade_type']

        db.session.commit()

        return jsonify({
            'message': 'Trade udpated successfully',
            'trade': trade.to_dict()

        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update trade: {str(e)}'}), 500

@trade_bp.route('/api/trades/import', methods=['POST'])
def import_trades_csv():
    """
    NEW FLOW:
    1. Save all CSV rows to orders table (raw data)
    2. Optionally trigger matching (can be done separately)
    """
    try:
        # Get CSV data
        csv_text = None
        if 'file' in request.files:
            file = request.files['file']
            csv_text = file.read().decode("utf-8")
        elif request.is_json:
            data = request.get_json()
            csv_text = data.get('csv_text') or data.get('csv_data')
        
        if not csv_text:
            return jsonify({'error': 'No CSV data provided'}), 400
        
        # Get account
        account = "default"
        if request.is_json:
            account = request.get_json().get('default_acc_id', account)
        elif request.form:
            account = request.form.get('default_acc_id', account)
        
        # Step 1: Save raw orders to database
        from app.utils.csv_parser import save_raw_orders_to_db
        saved_orders, errors = save_raw_orders_to_db(csv_text, account)
        
        if not saved_orders:
            return jsonify({
                'error': 'No orders were saved',
                'errors': errors
            }), 400
        
        # Step 2: Optionally match orders (can be disabled)
        auto_match = request.get_json().get('auto_match', True) if request.is_json else True
        
        trades_created = 0
        created_trades = []
        if auto_match:
            from app.services.order_matching import match_orders_to_trades
            trades, match_summary = match_orders_to_trades(account=account)
            trades_created = match_summary.get('trades_created', 0)
            errors.extend(match_summary.get('errors', []))
            created_trades = trades
        
        # Return response
        return jsonify({
            'message': f'Imported {len(saved_orders)} orders',
            'orders_saved': len(saved_orders),
            'trades_created': trades_created,
            # Provide a sample of trades so the frontend can immediately render without refetching
            'trades': [t.to_dict() for t in created_trades[:50]],
            'errors': errors[:20]  # Limit errors in response
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': f'Failed to import: {str(e)}',
            'orders_saved': 0,
            'trades_created': 0
        }), 500

@trade_bp.route('/api/trades/match', methods=['POST'])
def match_orders():
    """
    Manually trigger order matching.
    Useful for:
    - Re-running matching after fixing issues
    - Matching new orders after import
    - Testing matching logic
    """
    try:
        account = request.get_json().get('account') if request.is_json else None
        
        from app.services.order_matching import match_orders_to_trades
        trades, summary = match_orders_to_trades(account=account)
        
        return jsonify({
            'message': f'Created {summary["trades_created"]} trades',
            'trades_created': summary['trades_created'],
            'unmatched_orders': summary['unmatched_orders'],
            'errors': summary['errors']
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500