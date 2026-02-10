"""
Simplified CSV import tests.

Tests the basic import flow:
1. Database setup/teardown
2. Orders import (all CSV rows → orders table)
3. Trades import (filled orders → trades table)
"""

import unittest
import os
from app.main import app
from app.db.models import db, Trade, Order
from app.utils.csv_parser import save_raw_orders_to_db, process_filled_orders_to_trades


class TestCsvImports(unittest.TestCase):
    """
    Test CSV import pipeline with real CSV file.
    """
    
    # Path to your CSV file
    CSV_FILE_PATH = "/Users/desmondjung/Downloads/Orders.csv"
    
    def setUp(self):
        """Set up test database before each test"""
        print("\n=== Setting up test database ===")
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://desmondjung@localhost/trading_journal_test'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'connect_args': {'options': '-csearch_path=trade'}
        }
        
        self.app = app.test_client()
        
        # Create tables
        with app.app_context():
            db.create_all()
        print("✓ Test database tables created")
    
    def tearDown(self):
        """Clean up test database after each test"""
        print("=== Cleaning up test database ===")
        with app.app_context():
            db.session.remove()
            db.drop_all()
        print("✓ Test database cleaned")
    
    # ============================================
    # TEST 1: Database Setup
    # ============================================
    def test_database_setup(self):
        """
        TEST 1: Database Setup
        
        What we're testing:
        - Both orders and trades tables exist
        - Both tables start empty
        """
        print("\n--- TEST 1: Database Setup ---")
        
        with app.app_context():
            # Check orders table exists and is empty
            orders_count = Order.query.count()
            print(f"  Orders table: {orders_count} rows")
            self.assertEqual(orders_count, 0, "Orders table should be empty")
            
            # Check trades table exists and is empty
            trades_count = Trade.query.count()
            print(f"  Trades table: {trades_count} rows")
            self.assertEqual(trades_count, 0, "Trades table should be empty")
            
            # Verify tables exist by checking if we can query them
            self.assertIsNotNone(Order.query.first() is None, "Orders table should exist")
            self.assertIsNotNone(Trade.query.first() is None, "Trades table should exist")
        
        print("✓ TEST 1 PASSED: Database setup confirmed")
    
    # ============================================
    # TEST 2: Database Teardown
    # ============================================
    def test_database_teardown(self):
        """
        TEST 2: Database Teardown
        
        What we're testing:
        - Can we clean up the database?
        - Are tables empty after teardown?
        """
        print("\n--- TEST 2: Database Teardown ---")
        
        with app.app_context():
            # Add some test data
            test_order = Order(
                id="test-order-1",
                order_id="test-1",
                account="test",
                contract="TEST",
                status="Filled",
                is_filled=True
            )
            db.session.add(test_order)
            db.session.commit()
            
            # Verify data exists
            orders_before = Order.query.count()
            print(f"  Orders before teardown: {orders_before}")
            self.assertGreater(orders_before, 0, "Should have test data")
            
            # Teardown (this happens automatically in tearDown, but we can test it)
            Order.query.delete()
            Trade.query.delete()
            db.session.commit()
            
            # Verify tables are empty
            orders_after = Order.query.count()
            trades_after = Trade.query.count()
            print(f"  Orders after teardown: {orders_after}")
            print(f"  Trades after teardown: {trades_after}")
            
            self.assertEqual(orders_after, 0, "Orders table should be empty after teardown")
            self.assertEqual(trades_after, 0, "Trades table should be empty after teardown")
        
        print("✓ TEST 2 PASSED: Database teardown confirmed")
    
    # ============================================
    # TEST 3: Orders Import
    # ============================================
    def test_orders_import(self):
        """
        TEST 3: Orders Import
        
        What we're testing:
        - Can we import all CSV rows into orders table?
        - Does the number of rows match?
        """
        print("\n--- TEST 3: Orders Import ---")
        
        # Check CSV file exists
        if not os.path.exists(self.CSV_FILE_PATH):
            self.skipTest(f"CSV file not found: {self.CSV_FILE_PATH}")
        
        # Read CSV file
        print(f"  Reading CSV file: {self.CSV_FILE_PATH}")
        with open(self.CSV_FILE_PATH, 'r', encoding='utf-8') as f:
            csv_text = f.read()
        
        # Count rows in CSV (excluding header)
        csv_rows = csv_text.strip().split('\n')
        csv_row_count = len(csv_rows) - 1  # Subtract header
        print(f"  CSV has {csv_row_count} data rows (excluding header)")
        
        with app.app_context():
            # Clear database first
            Order.query.delete()
            Trade.query.delete()
            db.session.commit()
            
            # Import orders
            print("  Importing orders...")
            saved_orders, errors = save_raw_orders_to_db(csv_text, account="default")
            
            print(f"  Saved {len(saved_orders)} orders")
            print(f"  Errors: {len(errors)}")
            if errors:
                print(f"  First 5 errors: {errors[:5]}")
            
            # Verify orders in database
            db_orders_count = Order.query.count()
            print(f"  Orders in database: {db_orders_count}")
            
            # Assertions
            self.assertEqual(
                db_orders_count, 
                csv_row_count, 
                f"Database should have {csv_row_count} orders (matching CSV rows)"
            )
            self.assertEqual(
                len(saved_orders), 
                csv_row_count,
                f"Should save {csv_row_count} orders"
            )
        
        print("✓ TEST 3 PASSED: Orders import confirmed")
    
    # ============================================
    # TEST 4: Trades Import
    # ============================================
    def test_trades_import(self):
        """
        TEST 4: Trades Import
        
        What we're testing:
        - Can we process filled orders?
        - Does the count of filled orders match?
        """
        print("\n--- TEST 4: Trades Import ---")
        
        # Check CSV file exists
        if not os.path.exists(self.CSV_FILE_PATH):
            self.skipTest(f"CSV file not found: {self.CSV_FILE_PATH}")
        
        # Read CSV file
        print(f"  Reading CSV file: {self.CSV_FILE_PATH}")
        with open(self.CSV_FILE_PATH, 'r', encoding='utf-8') as f:
            csv_text = f.read()
        
        with app.app_context():
            # Clear database first
            Order.query.delete()
            Trade.query.delete()
            db.session.commit()
            
            # Step 1: Import orders
            print("  Step 1: Importing orders...")
            saved_orders, errors = save_raw_orders_to_db(csv_text, account="default")
            print(f"    ✓ Saved {len(saved_orders)} orders")
            
            # Step 2: Count filled orders in database
            filled_orders = Order.query.filter_by(is_filled=True).all()
            filled_count = len(filled_orders)
            print(f"  Step 2: Found {filled_count} filled orders in database")
            
            # Step 3: Process filled orders into trades
            print("  Step 3: Processing filled orders into trades...")
            result = process_filled_orders_to_trades(account=None)
            print(f"    ✓ Filled orders count: {result['filled_orders_count']}")
            print(f"    ✓ Trades created: {result['trades_created']}")
            if result.get('errors'):
                print(f"    ⚠ Errors: {len(result['errors'])}")
                for err in result['errors'][:5]:  # Show first 5 errors
                    print(f"      - {err}")
            
            # Assertions
            self.assertEqual(
                result['filled_orders_count'],
                filled_count,
                "Processed count should match database count"
            )
            self.assertGreater(
                filled_count, 
                0, 
                "Should have at least some filled orders"
            )
            
            # Step 4: Verify trades were created
            trades_in_db = Trade.query.count()
            print(f"\n  Step 4: Verifying trades in database...")
            print(f"    ✓ Total trades in database: {trades_in_db}")
            self.assertGreater(
                trades_in_db,
                0,
                "Should have at least one trade created"
            )
            
            # Step 5: Verify trades have fills field and show example
            sample_trade = Trade.query.first()
            if sample_trade:
                print(f"\n  Step 5: Example Trade Entry from Database")
                print(f"    {'='*70}")
                print(f"    📋 THIS IS ONE ROW IN THE 'trades' TABLE:")
                print(f"    {'='*70}")
                print(f"    ")
                print(f"    Database Column → Value")
                print(f"    {'-'*70}")
                print(f"    id                  → {sample_trade.id}")
                print(f"    acc_id              → {sample_trade.acc_id}")
                print(f"    symbol              → {sample_trade.symbol}")
                print(f"    direction           → {sample_trade.direction}")
                print(f"    entry_time          → {sample_trade.entry_time}")
                print(f"    exit_time           → {sample_trade.exit_time}")
                print(f"    entry_price         → {sample_trade.entry_price}")
                print(f"    exit_price          → {sample_trade.exit_price}")
                print(f"    quantity            → {sample_trade.quantity}")
                print(f"    pnl                 → {sample_trade.pnl}")
                print(f"    strategy            → {sample_trade.strategy}")
                print(f"    trade_type          → {sample_trade.trade_type}")
                print(f"    entry_order_id      → {sample_trade.entry_order_id}")
                print(f"    exit_order_id       → {sample_trade.exit_order_id}")
                print(f"    exit_orders         → {sample_trade.exit_orders}")
                print(f"    is_scaled           → {sample_trade.is_scaled}")
                print(f"    fills               → [JSON array with {len(sample_trade.fills) if sample_trade.fills else 0} orders]")
                print(f"    {'='*70}")
                print(f"    ")
                print(f"    ⚠️  IMPORTANT: Everything above (from 'id' to 'fills') is ONE ROW in the trades table.")
                print(f"    Each trade = one row with all these columns. The 'fills' column contains")
                print(f"    a JSON array of all the orders that make up this trade.")
                print(f"    ")
                
                self.assertIsNotNone(
                    sample_trade.fills,
                    "Trade should have fills field"
                )
                self.assertIsInstance(
                    sample_trade.fills,
                    list,
                    "Fills should be a list"
                )
                self.assertGreater(
                    len(sample_trade.fills),
                    0,
                    "Trade should have at least one fill"
                )
                
                # Show all fills (these are INSIDE the 'fills' JSON column)
                if sample_trade.fills:
                    print(f"    ")
                    print(f"    📦 DETAIL: What's inside the 'fills' JSON column:")
                    print(f"    {'-'*70}")
                    for i, fill in enumerate(sample_trade.fills, 1):
                        print(f"      Order {i} in fills array:")
                        print(f"        - Order ID: {fill.get('id', 'N/A')}")
                        print(f"        - B/S: {fill.get('b_s', 'N/A')}")
                        print(f"        - Quantity: {fill.get('filled_qty', 'N/A')}")
                        print(f"        - Avg Price: {fill.get('avg_price', 'N/A')}")
                        print(f"        - Fill Time: {fill.get('fill_time', 'N/A')}")
                        print(f"        - Status: {fill.get('status', 'N/A')}")
                        print(f"        - Contract: {fill.get('contract', 'N/A')}")
                        if i < len(sample_trade.fills):
                            print(f"        ")
                
                # Also show the full trade dict representation
                print(f"    ")
                print(f"    📄 JSON Representation (what the 'fills' column looks like in JSON):")
                print(f"    {'-'*70}")
                import json
                fills_json = json.dumps(sample_trade.fills, indent=8, default=str)
                print(f"    fills = {fills_json}")
            
            # Final summary
            final_trades_count = Trade.query.count()
            print(f"\n  📊 FINAL SUMMARY:")
            print(f"    - Total trades in database: {final_trades_count}")
            print(f"    - Filled orders processed: {filled_count}")
            print(f"    - Trades created: {result['trades_created']}")
        
        print("✓ TEST 4 PASSED: Trades import confirmed")


if __name__ == '__main__':
    unittest.main(verbosity=2)
