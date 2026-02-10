# Step-by-Step Trace: First Two Filled Orders

## CSV Data

**Order 1 (Row 4):**
```
orderId: 3.72955E+11 (372954710022)
Account: PAAPEX4193100000002
B/S: Buy
Contract: MGCG6
avgPrice: 4616.5
filledQty: 5
Fill Time: 1/15/26 7:40
Status: Filled
```

**Order 2 (Row 7):**
```
orderId: 372954710051
Account: PAAPEX4193100000002
B/S: Sell
Contract: MGCG6
avgPrice: 4625.8
filledQty: 5
Fill Time: 01/15/2026 08:13:56
Status: Filled
```

---

## STEP 1: CSV Parsing (`save_raw_orders_to_db`)

### Order 1 Processing:

1. **Row ID Generation** (`_stable_row_id`):
   - Creates hash from all row data: `"ord-" + sha1_hash[:24]`
   - Result: `order_row_id = "ord-abc123..."` (unique identifier)

2. **Fill Time Parsing** (`_parse_datetime_maybe`):
   - Input: `"1/15/26 7:40"`
   - Tries formats:
     - `"%m/%d/%Y %H:%M:%S"` ❌ (doesn't match)
     - `"%m/%d/%y %H:%M:%S"` ❌ (no seconds)
     - `"%m/%d/%Y %H:%M"` ❌ (wrong year format)
     - `"%m/%d/%y %H:%M"` ✅ **MATCHES!**
   - Result: `fill_time = datetime(2026, 1, 15, 7, 40, 0)`

3. **Status Check**:
   - `status = "Filled"`
   - `is_filled = True` (status == 'Filled')

4. **Order Creation**:
   ```python
   Order(
       id="ord-abc123...",
       order_id="372954710022",
       account="PAAPEX4193100000002",
       b_s="Buy",
       contract="MGCG6",
       avg_price=4616.5,
       filled_qty=5,
       fill_time=datetime(2026, 1, 15, 7, 40, 0),
       status="Filled",
       is_filled=True,
       is_buy=True,
       is_sell=False
   )
   ```

### Order 2 Processing:

1. **Row ID Generation**: Creates unique hash → `"ord-def456..."`

2. **Fill Time Parsing**:
   - Input: `"01/15/2026 08:13:56"`
   - Tries formats:
     - `"%m/%d/%Y %H:%M:%S"` ✅ **MATCHES!**
   - Result: `fill_time = datetime(2026, 1, 15, 8, 13, 56)`

3. **Status Check**:
   - `status = "Filled"`
   - `is_filled = True`

4. **Order Creation**:
   ```python
   Order(
       id="ord-def456...",
       order_id="372954710051",
       account="PAAPEX4193100000002",
       b_s="Sell",
       contract="MGCG6",
       avg_price=4625.8,
       filled_qty=5,
       fill_time=datetime(2026, 1, 15, 8, 13, 56),
       status="Filled",
       is_filled=True,
       is_buy=False,
       is_sell=True
   )
   ```

5. **Database Commit**: Both orders saved to `orders` table

---

## STEP 2: Order Matching (`process_filled_orders_to_trades`)

### Initial Setup:

1. **Query Filled Orders**:
   ```python
   query = Order.query.filter_by(is_filled=True).filter(Order.fill_time.isnot(None))
   all_orders = query.order_by(Order.fill_time).all()
   ```
   - Gets both Order 1 and Order 2 (sorted by fill_time)

2. **Group by (account, contract)**:
   ```python
   orders_by_key = {
       ("PAAPEX4193100000002", "MGCG6"): [Order1, Order2, ...]
   }
   ```

### Processing MGCG6 Group:

**Initial State:**
- `net_position = 0`
- `current_trade_orders = []`

---

### Order 1 Processing (Buy, 5 contracts, 4616.5):

1. **Calculate Position Change**:
   ```python
   if order.is_buy:
       position_change = 5  # filled_qty
   ```

2. **Update Position**:
   ```python
   prev_position = 0
   new_position = 0 + 5 = 5
   ```

3. **Check Trade Logic**:
   ```python
   prev_position == 0  # TRUE
   # This means: "Starting new trade from zero"
   ```

4. **Action**:
   ```python
   current_trade_orders = [Order1]  # Start new trade
   net_position = 5
   # Check if position is 0 (it's not, so don't close)
   ```

**State After Order 1:**
- `net_position = 5` (long 5 contracts)
- `current_trade_orders = [Order1]`
- Trade is OPEN (position not zero)

---

### Order 2 Processing (Sell, 5 contracts, 4625.8):

1. **Calculate Position Change**:
   ```python
   if order.is_sell:
       position_change = -5  # negative for sell
   ```

2. **Update Position**:
   ```python
   prev_position = 5
   new_position = 5 + (-5) = 0
   ```

3. **Check Trade Logic**:
   ```python
   prev_position == 0  # FALSE (it's 5)
   # So we're in the "Continue current trade" branch
   ```

4. **Action**:
   ```python
   current_trade_orders.append(Order2)  # Add to current trade
   net_position = 0
   # Check if position is 0 (YES!)
   if net_position == 0:
       close_current_trade()  # Close the trade!
   ```

**State After Order 2:**
- `net_position = 0` (flat)
- `current_trade_orders = [Order1, Order2]`
- Trade is CLOSED (position returned to zero)

---

## STEP 3: Trade Creation (`_create_trade_from_orders`)

### Input:
- `orders = [Order1 (Buy), Order2 (Sell)]`
- `account = "PAAPEX4193100000002"`
- `contract = "MGCG6"`

### Step-by-Step:

1. **Sort Orders by fill_time**:
   - Order1: `2026-01-15 07:40:00`
   - Order2: `2026-01-15 08:13:56`
   - Already sorted ✅

2. **Determine Direction**:
   ```python
   first_order = Order1
   if first_order.is_buy:
       direction = 'LONG'  # ✅
   ```

3. **Separate Entry/Exit Orders**:
   ```python
   # For LONG trades:
   if order.is_buy:
       entry_orders.append(Order1)
       entry_qty += 5
       entry_value += 4616.5 * 5 = 23082.5
   else:  # is_sell
       exit_orders.append(Order2)
       exit_qty += 5
       exit_value += 4625.8 * 5 = 23129.0
   ```

4. **Calculate Average Prices**:
   ```python
   entry_price = entry_value / entry_qty
   entry_price = 23082.5 / 5 = 4616.5 ✅
   
   exit_price = exit_value / exit_qty
   exit_price = 23129.0 / 5 = 4625.8 ✅
   ```

5. **Calculate PnL**:
   ```python
   # For LONG:
   pnl = (exit_price - entry_price) * entry_qty
   pnl = (4625.8 - 4616.5) * 5
   pnl = 9.3 * 5
   pnl = 46.5 ✅
   ```

6. **Create Trade Object**:
   ```python
   Trade(
       id="trade_8913991f2d94",
       acc_id="PAAPEX4193100000002",
       symbol="MGCG6",
       direction="LONG",
       entry_time=datetime(2026, 1, 15, 7, 40, 0),
       exit_time=datetime(2026, 1, 15, 8, 13, 56),
       entry_price=4616.5,
       exit_price=4625.8,
       quantity=5,
       pnl=46.5,
       fills=[Order1.to_dict(), Order2.to_dict()],
       is_scaled=False  # Only 1 exit order
   )
   ```

---

## FINAL RESULT

**Trade Created:**
- **Entry**: Buy 5 MGCG6 @ 4616.5 (07:40:00)
- **Exit**: Sell 5 MGCG6 @ 4625.8 (08:13:56)
- **PnL**: $46.50 ✅
- **Duration**: 33 minutes 56 seconds

---

## VERIFICATION

Let's verify the PnL calculation:
- Entry: 5 contracts × $4616.5 = $23,082.50
- Exit: 5 contracts × $4625.8 = $23,129.00
- Profit: $23,129.00 - $23,082.50 = **$46.50** ✅

**This matches the calculated PnL!**
