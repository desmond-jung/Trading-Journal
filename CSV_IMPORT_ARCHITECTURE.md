# CSV Import Architecture & Flow Documentation

## 📁 File Structure

```
Trading-Journal/
├── frontend/
│   └── src/
│       ├── components/
│       │   └── ImportModal.tsx          # Frontend UI component
│       └── App.tsx                      # Main app, handles trade state
│
├── app/
│   ├── main.py                          # Flask app entry point
│   │
│   ├── api/
│   │   └── trades.py                    # API endpoint: POST /api/trades/import
│   │
│   ├── utils/
│   │   └── csv_parser.py                # CSV parsing & transformation logic
│   │
│   ├── db/
│   │   └── models.py                    # Trade database model
│   │
│   └── services/
│       └── metrics.py                   # Trade type detection
│
└── PostgreSQL Database
    └── trade.trades                      # Database table (schema: trade)
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React/TypeScript)                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1. User uploads/pastes CSV
                                    ▼
                    ┌───────────────────────────────┐
                    │  ImportModal.tsx              │
                    │  - handleCsvImport()          │
                    │  - csvData (string)           │
                    └───────────────────────────────┘
                                    │
                                    │ 2. HTTP POST Request
                                    │    POST http://localhost:5001/api/trades/import
                                    │    Body: { csv_text: "...", default_acc_id: "default" }
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Flask/Python)                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 3. Route Handler
                                    ▼
                    ┌───────────────────────────────┐
                    │  app/main.py                   │
                    │  - Flask app                  │
                    │  - Registers trade_bp         │
                    └───────────────────────────────┘
                                    │
                                    │ 4. Blueprint Route
                                    ▼
                    ┌───────────────────────────────┐
                    │  app/api/trades.py             │
                    │  - import_trades_csv()         │
                    │  - Receives CSV text           │
                    └───────────────────────────────┘
                                    │
                                    │ 5. Call CSV Parser
                                    ▼
                    ┌───────────────────────────────┐
                    │  app/utils/csv_parser.py       │
                    │  - parse_and_validate_csv()    │
                    │  - parse_csv_text()            │
                    │  - map_csv_row_to_backend_...  │
                    └───────────────────────────────┘
                                    │
                                    │ 6. Returns: List[Dict] of trades
                                    ▼
                    ┌───────────────────────────────┐
                    │  app/api/trades.py             │
                    │  - Loop through trades         │
                    │  - Check for duplicates         │
                    │  - Create Trade objects         │
                    └───────────────────────────────┘
                                    │
                                    │ 7. Database Operations
                                    ▼
                    ┌───────────────────────────────┐
                    │  app/db/models.py              │
                    │  - Trade (SQLAlchemy Model)     │
                    │  - db.session.add(trade)       │
                    │  - db.session.commit()         │
                    └───────────────────────────────┘
                                    │
                                    │ 8. Save to Database
                                    ▼
                    ┌───────────────────────────────┐
                    │  PostgreSQL                    │
                    │  Schema: trade                 │
                    │  Table: trades                 │
                    └───────────────────────────────┘
                                    │
                                    │ 9. HTTP Response
                                    │    { imported_count, trades, errors }
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React/TypeScript)                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 10. Transform & Update UI
                                    ▼
                    ┌───────────────────────────────┐
                    │  ImportModal.tsx               │
                    │  - transformBackendTradeTo...  │
                    │  - onImport(frontendTrades)    │
                    └───────────────────────────────┘
                                    │
                                    │ 11. Update State
                                    ▼
                    ┌───────────────────────────────┐
                    │  App.tsx                       │
                    │  - handleImportTrades()        │
                    │  - setTradeData()              │
                    │  - Updates calendar/dashboard   │
                    └───────────────────────────────┘
```

---

## 📋 Detailed Function Call Chain

### **Step 1: Frontend - User Action**
**File:** `frontend/src/components/ImportModal.tsx`

```typescript
handleCsvImport() {
  // 1. Validate CSV data exists
  if (!csvData.trim()) return;
  
  // 2. Send HTTP POST request
  fetch('http://localhost:5001/api/trades/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      csv_text: csvData,        // Raw CSV string
      default_acc_id: 'default'
    })
  })
}
```

**Data Format:**
- Input: `csvData` (string) - Raw CSV text like `"Date,Symbol,Side,...\n2026-01-15,AAPL,long,..."`
- Output: HTTP POST request with JSON body

---

### **Step 2: Backend - Route Registration**
**File:** `app/main.py`

```python
# Flask app setup
app = Flask(__name__)
app.register_blueprint(trade_bp)  # Registers /api/trades routes
```

**What happens:**
- Flask receives HTTP request
- Routes to `trade_bp` blueprint
- Matches `POST /api/trades/import`

---

### **Step 3: Backend - API Endpoint**
**File:** `app/api/trades.py`

**Function:** `import_trades_csv()`

```python
@trade_bp.route('/api/trades/import', methods=['POST'])
def import_trades_csv():
    # 1. Extract CSV text from request
    csv_text = request.get_json().get('csv_text')
    
    # 2. Get account ID
    default_acc_id = request.get_json().get('default_acc_id', 'default')
    
    # 3. CALL CSV PARSER ⭐
    successful_trades, error_messages = parse_and_validate_csv(csv_text, default_acc_id)
    
    # 4. Process each trade
    for trade_data in successful_trades:
        # Check for duplicates
        existing_trade = Trade.query.filter_by(id=trade_data['id']).first()
        if existing_trade:
            skipped_count += 1
            continue
        
        # Create Trade object
        trade = Trade(
            id=trade_data['id'],
            symbol=trade_data['symbol'],
            direction=trade_data['direction'],
            entry_time=datetime.fromisoformat(trade_data['entry_time']),
            exit_time=datetime.fromisoformat(trade_data['exit_time']),
            entry_price=float(trade_data['entry_price']),
            exit_price=float(trade_data['exit_price']),
            quantity=int(trade_data['quantity']),
            pnl=float(trade_data['pnl']),
            strategy=trade_data.get('strategy'),
            trade_type=detect_trade_type(entry_time, exit_time)  # From services/metrics.py
        )
        
        # Add to database session
        db.session.add(trade)
    
    # 5. Commit all trades to database
    db.session.commit()
    
    # 6. Return response
    return jsonify({
        'imported_count': len(imported_trades),
        'trades': imported_trades[:10],
        'errors': error_messages
    })
```

**Data Format:**
- Input: `csv_text` (string) - Raw CSV text
- Output: `successful_trades` (List[Dict]) - List of trade dictionaries in backend format

---

### **Step 4: CSV Parser - Main Entry Point**
**File:** `app/utils/csv_parser.py`

**Function:** `parse_and_validate_csv(csv_text: str, default_acc_id: str)`

```python
def parse_and_validate_csv(csv_text: str, default_acc_id: str = "default"):
    successful_trades = []
    error_messages = []
    
    # 1. Parse CSV text into rows
    rows = parse_csv_text(csv_text)  # Returns List[Dict[str, str]]
    
    # 2. Process each row
    for row_num, row in enumerate(rows, start=2):
        try:
            # Transform CSV row to backend format
            backend_trade = map_csv_row_to_backend_format(row, default_acc_id)
            successful_trades.append(backend_trade)
        except ValueError as e:
            error_messages.append(f"Row {row_num}: {str(e)}")
    
    return successful_trades, error_messages
```

**Data Format:**
- Input: `csv_text` (string) - Raw CSV text
- Output: `(successful_trades: List[Dict], error_messages: List[str])`

---

### **Step 5: CSV Parser - Parse Text to Rows**
**File:** `app/utils/csv_parser.py`

**Function:** `parse_csv_text(csv_text: str)`

```python
def parse_csv_text(csv_text: str) -> List[Dict[str, str]]:
    csv_file = io.StringIO(csv_text)
    reader = csv.DictReader(csv_file)  # Uses first row as headers
    rows = list(reader)
    return rows
```

**Data Format:**
- Input: `csv_text` (string) - `"Date,Symbol,Side\n2026-01-15,AAPL,long"`
- Output: `[{'Date': '2026-01-15', 'Symbol': 'AAPL', 'Side': 'long'}, ...]`

---

### **Step 6: CSV Parser - Map Row to Backend Format**
**File:** `app/utils/csv_parser.py`

**Function:** `map_csv_row_to_backend_format(row: Dict[str, str], default_acc_id: str)`

```python
def map_csv_row_to_backend_format(row, default_acc_id):
    # 1. Find columns using flexible matching
    symbol = find_column_value(row, ['Symbol', 'symbol', 'sym'])
    side = find_column_value(row, ['Side', 'side', 'Direction'])
    entry_price = find_column_value(row, ['Entry Price', 'entry_price', ...])
    exit_price = find_column_value(row, ['Exit Price', 'exit_price', ...])
    quantity = find_column_value(row, ['Quantity', 'quantity', 'qty'])
    date = find_column_value(row, ['Date', 'date'])
    time = find_column_value(row, ['Time', 'time'])
    
    # 2. Convert side to direction (LONG/SHORT)
    direction = side.upper()  # 'long' -> 'LONG', 'short' -> 'SHORT'
    
    # 3. Combine date + time into datetime
    entry_time = combine_date_time(date, time)
    exit_time = combine_date_time(date, time)
    
    # 4. Calculate PnL if not provided
    pnl = calculate_pnl(entry_price, exit_price, quantity, side)
    
    # 5. Build backend format dictionary
    return {
        'id': f"csv-{uuid.uuid4().hex[:12]}",
        'acc_id': default_acc_id,
        'symbol': symbol,
        'direction': direction,  # 'LONG' or 'SHORT'
        'entry_time': entry_time.isoformat(),  # '2026-01-15T09:30:00'
        'exit_time': exit_time.isoformat(),
        'entry_price': float(entry_price),
        'exit_price': float(exit_price),
        'quantity': int(quantity),
        'pnl': float(pnl),
        'strategy': tags.split(';')[0] if tags else None,
        'trade_type': None  # Will be set by backend
    }
```

**Data Transformation:**
```
CSV Row Format → Backend Format
─────────────────────────────────────────────────────────
Date: "2026-01-15"        → entry_time: "2026-01-15T09:30:00"
Symbol: "AAPL"            → symbol: "AAPL"
Side: "long"              → direction: "LONG"
Entry Price: "150.50"     → entry_price: 150.50
Exit Price: "155.00"      → exit_price: 155.00
Quantity: "100"           → quantity: 100
PnL: "450.00"             → pnl: 450.00
Tags: "Breakout;Morning"  → strategy: "Breakout"
```

**Helper Functions Used:**
- `find_column_value()` - Flexible column name matching
- `normalize_column_name()` - Normalize column names for matching
- `combine_date_time()` - Combine date + time strings into datetime
- `calculate_pnl()` - Calculate profit/loss if not provided

---

### **Step 7: Backend - Create Database Objects**
**File:** `app/api/trades.py`

```python
# For each trade_data from parser:
trade = Trade(
    id=trade_data['id'],
    acc_id=trade_data['acc_id'],
    symbol=trade_data['symbol'],
    direction=trade_data['direction'],  # 'LONG' or 'SHORT'
    entry_time=datetime.fromisoformat(trade_data['entry_time']),
    exit_time=datetime.fromisoformat(trade_data['exit_time']),
    entry_price=float(trade_data['entry_price']),
    exit_price=float(trade_data['exit_price']),
    quantity=int(trade_data['quantity']),
    pnl=float(trade_data['pnl']),
    strategy=trade_data.get('strategy'),
    trade_type=detect_trade_type(entry_time, exit_time)  # 'day_trade', 'swing', etc.
)

db.session.add(trade)  # Add to session (not yet saved)
```

**Trade Type Detection:**
**File:** `app/services/metrics.py`

```python
def detect_trade_type(entry_time, exit_time):
    if entry_time.date() == exit_time.date():
        return 'day_trade'
    else:
        return 'swing'
```

---

### **Step 8: Database - Save to PostgreSQL**
**File:** `app/db/models.py`

**Model:** `Trade`

```python
class Trade(db.Model):
    __tablename__ = 'trades'
    __table_args__ = {'schema': 'trade'}
    
    id = db.Column(db.String(50), primary_key=True)
    acc_id = db.Column(db.String(20), nullable=False)
    symbol = db.Column(db.String(10), nullable=False)
    direction = db.Column(db.String(10), nullable=False)  # 'LONG' or 'SHORT'
    entry_time = db.Column(db.DateTime, nullable=False)
    exit_time = db.Column(db.DateTime, nullable=False)
    entry_price = db.Column(db.Numeric(10,2), nullable=False)
    exit_price = db.Column(db.Numeric(10,2), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    pnl = db.Column(db.Numeric(10,2), nullable=False)
    strategy = db.Column(db.String(50), nullable=True)
    trade_type = db.Column(db.String(20), nullable=True)  # 'day_trade', 'swing', etc.
```

**Database Operation:**
```python
db.session.commit()  # Saves all Trade objects to PostgreSQL
```

**Database Table:**
- **Schema:** `trade`
- **Table:** `trades`
- **Database:** `trading_journal`
- **Connection:** `postgresql://desmondjung@localhost/trading_journal`

---

### **Step 9: Backend - Return Response**
**File:** `app/api/trades.py`

```python
return jsonify({
    'message': f'Successfully imported {imported_count} trades',
    'imported_count': imported_count,
    'skipped_count': skipped_count,
    'failed_count': failed_count,
    'trades': imported_trades[:10],  # First 10 trades
    'errors': error_messages
}), 201
```

**Data Format:**
- Response: JSON with trade data in backend format
- Each trade has: `id`, `acc_id`, `symbol`, `direction`, `entry_time`, `exit_time`, `entry_price`, `exit_price`, `quantity`, `pnl`, `strategy`, `trade_type`

---

### **Step 10: Frontend - Transform Backend to Frontend Format**
**File:** `frontend/src/components/ImportModal.tsx`

**Function:** `transformBackendTradeToFrontend(backendTrade)`

```typescript
transformBackendTradeToFrontend(backendTrade) {
  // Extract date from entry_time
  const entryTime = new Date(backendTrade.entry_time);
  const date = entryTime.toISOString().split('T')[0];  // "2026-01-15"
  
  // Extract time
  const time = `${hours}:${minutes}`;  // "09:30"
  
  // Map direction to side
  const side = backendTrade.direction.toLowerCase();  // "LONG" -> "long"
  
  return {
    id: backendTrade.id,
    date: date,
    symbol: backendTrade.symbol,
    side: side,  // 'long' or 'short'
    entryPrice: backendTrade.entry_price,  // camelCase
    exitPrice: backendTrade.exit_price,
    quantity: backendTrade.quantity,
    pnl: backendTrade.pnl,
    riskReward: 1,
    tags: backendTrade.strategy ? [backendTrade.strategy] : [],
    notes: '',
    time: time,
    screenshots: [],
    account: backendTrade.acc_id
  };
}
```

**Data Transformation:**
```
Backend Format → Frontend Format
─────────────────────────────────────────────────────────
direction: "LONG"           → side: "long"
entry_time: "2026-01-15..." → date: "2026-01-15", time: "09:30"
entry_price: 150.50         → entryPrice: 150.50 (camelCase)
strategy: "Breakout"        → tags: ["Breakout"]
```

---

### **Step 11: Frontend - Update UI State**
**File:** `frontend/src/App.tsx`

**Function:** `handleImportTrades(trades: Trade[])`

```typescript
handleImportTrades(trades: Trade[]) {
  // Group trades by date
  const tradesByDate = new Map<string, Trade[]>();
  trades.forEach(trade => {
    const existing = tradesByDate.get(trade.date) || [];
    tradesByDate.set(trade.date, [...existing, trade]);
  });
  
  // Update trade data state
  const newData = [...tradeData];
  tradesByDate.forEach((dayTrades, date) => {
    const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
    // Add to existing day or create new day
    newData.push({ date, pnl: dayPnL, trades: dayTrades });
  });
  
  setTradeData(newData);  // Updates React state
  // UI automatically re-renders with new trades
}
```

**What happens:**
- Trades are grouped by date
- Daily PnL is calculated
- React state is updated
- Calendar/Dashboard components re-render with new data

---

## 🗄️ Database Storage

### **Yes, trades ARE stored in the database!**

**Database:** PostgreSQL
- **Connection String:** `postgresql://desmondjung@localhost/trading_journal`
- **Schema:** `trade`
- **Table:** `trades`

**When trades are saved:**
1. After CSV parsing succeeds
2. After duplicate checking
3. After creating Trade objects
4. When `db.session.commit()` is called (line 215 in `trades.py`)

**What gets stored:**
- All trade data from CSV
- Auto-generated trade IDs
- Auto-detected trade types
- Calculated PnL (if not in CSV)

**How to verify:**
```sql
-- Connect to database
psql -U desmondjung -d trading_journal

-- Query trades
SELECT * FROM trade.trades ORDER BY entry_time DESC LIMIT 10;
```

---

## 📊 Data Flow Summary

```
CSV Text (string)
    ↓
parse_csv_text() → List[Dict] (CSV rows)
    ↓
map_csv_row_to_backend_format() → Dict (backend format)
    ↓
parse_and_validate_csv() → List[Dict] (all trades)
    ↓
Trade() objects → SQLAlchemy models
    ↓
db.session.add() → Database session
    ↓
db.session.commit() → PostgreSQL database ✅
    ↓
JSON Response → Frontend
    ↓
transformBackendTradeToFrontend() → Frontend Trade format
    ↓
React State Update → UI displays trades
```

---

## 🔑 Key Functions & Their Roles

| Function | File | Purpose |
|----------|------|---------|
| `handleCsvImport()` | `ImportModal.tsx` | Frontend: Sends CSV to backend |
| `import_trades_csv()` | `trades.py` | Backend: Receives CSV, orchestrates import |
| `parse_and_validate_csv()` | `csv_parser.py` | **Main parser entry point** |
| `parse_csv_text()` | `csv_parser.py` | Converts CSV string to list of dicts |
| `map_csv_row_to_backend_format()` | `csv_parser.py` | **Transforms CSV row to backend format** |
| `find_column_value()` | `csv_parser.py` | Flexible column name matching |
| `combine_date_time()` | `csv_parser.py` | Combines date + time into datetime |
| `calculate_pnl()` | `csv_parser.py` | Calculates profit/loss |
| `detect_trade_type()` | `metrics.py` | Determines day_trade vs swing |
| `Trade()` | `models.py` | SQLAlchemy database model |
| `db.session.commit()` | `trades.py` | **Saves trades to database** |
| `transformBackendTradeToFrontend()` | `ImportModal.tsx` | Converts backend format to frontend |
| `handleImportTrades()` | `App.tsx` | Updates React state with imported trades |

---

## 🎯 Where csv_parser Comes In

**`csv_parser.py` is the core transformation engine:**

1. **Entry Point:** `parse_and_validate_csv()` is called from `trades.py` line 156
2. **Parsing:** `parse_csv_text()` converts CSV string to structured data
3. **Transformation:** `map_csv_row_to_backend_format()` converts CSV format → Backend format
4. **Validation:** Checks for required fields, validates data types
5. **Error Handling:** Collects errors for rows that fail validation

**Without csv_parser:**
- The API endpoint would receive raw CSV text
- No way to extract individual fields
- No way to validate data
- No way to transform to database format

**With csv_parser:**
- CSV text → Structured trade data
- Flexible column name matching
- Automatic PnL calculation
- Date/time parsing
- Error collection for debugging

---

## ✅ Summary

**Complete Flow:**
1. User uploads CSV in frontend
2. Frontend sends CSV text to backend API
3. Backend calls `csv_parser.parse_and_validate_csv()`
4. Parser transforms CSV rows to backend format
5. Backend creates Trade objects
6. **Trades are saved to PostgreSQL database** ✅
7. Backend returns success response
8. Frontend transforms to frontend format
9. UI updates with imported trades

**Database Storage:** ✅ **YES** - Trades are permanently stored in `trade.trades` table in PostgreSQL
