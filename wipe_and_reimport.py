#!/usr/bin/env python3
"""
Script to wipe the database and re-import CSV.

Usage:
    python wipe_and_reimport.py [path_to_csv_file]
    
If no CSV path is provided, uses default: /Users/desmondjung/Downloads/Orders.csv
"""

import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.db.models import db, Trade, Order
from app.utils.csv_parser import save_raw_orders_to_db, process_filled_orders_to_trades

def wipe_and_reimport(csv_path: str = "/Users/desmondjung/Downloads/Orders.csv"):
    """
    Wipe all trades and orders, then re-import from CSV.
    """
    print("="*80)
    print("🗑️  WIPING DATABASE")
    print("="*80)
    
    with app.app_context():
        # Step 1: Delete all trades
        trades_count = Trade.query.count()
        print(f"\n📊 Current state:")
        print(f"  - Trades in database: {trades_count}")
        print(f"  - Orders in database: {Order.query.count()}")
        
        print(f"\n🗑️  Deleting all trades...")
        Trade.query.delete()
        print(f"  ✓ Deleted {trades_count} trades")
        
        # Step 2: Delete all orders
        orders_count = Order.query.count()
        print(f"\n🗑️  Deleting all orders...")
        Order.query.delete()
        print(f"  ✓ Deleted {orders_count} orders")
        
        # Commit deletions
        db.session.commit()
        print(f"\n✅ Database wiped clean!")
        
        # Step 3: Re-import CSV
        print("\n" + "="*80)
        print("📥 RE-IMPORTING CSV")
        print("="*80)
        
        if not os.path.exists(csv_path):
            print(f"\n❌ ERROR: CSV file not found: {csv_path}")
            return False
        
        print(f"\n📄 Reading CSV file: {csv_path}")
        with open(csv_path, 'r', encoding='utf-8') as f:
            csv_text = f.read()
        
        csv_rows = csv_text.strip().split('\n')
        print(f"  - CSV has {len(csv_rows) - 1} data rows (excluding header)")
        
        # Step 3a: Save orders
        print(f"\n📦 Step 1: Saving orders to database...")
        saved_orders, errors = save_raw_orders_to_db(csv_text, account="default")
        print(f"  ✓ Saved {len(saved_orders)} orders")
        if errors:
            print(f"  ⚠ {len(errors)} warnings/errors (mostly 'already exists' messages)")
            if len(errors) <= 10:
                for err in errors:
                    print(f"    - {err}")
        
        # Step 3b: Match orders to trades
        print(f"\n🔄 Step 2: Matching orders to trades...")
        match_result = process_filled_orders_to_trades(account=None)  # Get all orders, not filtered by account
        trades_created = match_result.get('trades_created', 0)
        filled_count = match_result.get('filled_orders_count', 0)
        
        print(f"  ✓ Found {filled_count} filled orders")
        print(f"  ✓ Created {trades_created} trades")
        
        if match_result.get('errors'):
            print(f"  ⚠ {len(match_result['errors'])} errors during matching")
            for err in match_result['errors'][:5]:
                print(f"    - {err}")
        
        # Step 4: Verify results
        print(f"\n" + "="*80)
        print("✅ VERIFICATION")
        print("="*80)
        
        final_orders = Order.query.count()
        final_trades = Trade.query.count()
        
        print(f"\n📊 Final state:")
        print(f"  - Orders in database: {final_orders}")
        print(f"  - Trades in database: {final_trades}")
        
        if final_trades > 0:
            # Show sample trade
            sample_trade = Trade.query.first()
            print(f"\n📋 Sample trade:")
            print(f"  - ID: {sample_trade.id}")
            print(f"  - Symbol: {sample_trade.symbol}")
            print(f"  - Direction: {sample_trade.direction}")
            print(f"  - Quantity: {sample_trade.quantity}")
            print(f"  - PnL: {sample_trade.pnl}")
            print(f"  - Fills: {len(sample_trade.fills) if sample_trade.fills else 0} orders")
        
        print(f"\n✅ Import complete!")
        return True

if __name__ == '__main__':
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "/Users/desmondjung/Downloads/Orders.csv"
    success = wipe_and_reimport(csv_path)
    sys.exit(0 if success else 1)
