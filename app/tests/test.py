import unittest
import os
from app.main import app, db, Trade

class TestTrades(unittest.TestCase):
    """ Set up test client and database before test"""
    print("\n----- Setting up test client and database-----")
    # use separate test db
    def setUp(self):
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://desmondjung@localhost/trading_journal_test'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'connect_args': {'options': '-csearch_path=trade'}
        }
        
        # test client
        self.app = app.test_client()

        # create tables in test db
        with app.app_context():
            db.create_all()
        print("Test database tables created")

    # drop all tables after each test
    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()
        print("Cleaned up test db")
        
    def test_insert_trade(self):
        trade_data = {
            'id': 'TEST003',
            'acc_id': 'ACC01',
            'symbol': 'MGC',
            'direction': 'LONG',
            'entry_time': '2024-01-15T09:30:00',  
            'exit_time': '2024-01-15T15:45:00',  
            'entry_price': 4231.5,
            'exit_price': 4500.0,
            'quantity': 1,
            'pnl': 268.5,  # (4500 - 4231.5) * 1 = 268.5
            'strategy': 'ICT 22'
        }

        print(f"Sending trade data: {trade_data}")
        response = self.app.post('/api/trades', json=trade_data)
        print(f"Response code: {response.status_code}")
        response_data = response.get_json()

        if response.status_code == 201:
            print("SUCCESS: Trade inserted successfully")
            self.response_data = response_data
            self.trade_data = trade_data

            print(f"   Trade ID: {response_data.get('trade', {}).get('id', 'N/A')}")
        else:
            print(f"FAILED: Expected status 201, got {response.status_code}")
            print(f"Response: {response_data}")
            if 'error' in response_data:
                print(f"Error: {response_data['error']}")
            else:
                print(f"Response data:{response_data}")
            # check for 201 created status code
            self.assertEqual(response.status_code, 201)

if __name__ == '__main__':
    unittest.main()

        