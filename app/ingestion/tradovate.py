import requests
import uuid

access_token = None

def authenticate():
    global access_token

    username = "Google:115790771135467284232"
    password = "Djm0nd!23"  

    url = "https://demo.tradovateapi.com/v1/auth/accesstokenrequest"

    body = {
    "name": username,
    "password": password,
    "appId": "tradovate",  # Changed from "TradingJournal"
    "appVersion": "0.0.1",  # Changed from "1.0"
    "deviceId": str(uuid.uuid4()),
    "cid": "9574",  # Changed to string
    "sec": "94bbf03e-a583-4df7-b96e-78df5500f5b8"
    }

    headers = {
        "accept": "application/json",
        "Content-Type": "application/json"
    }

    print("Authenticating...")
    response = requests.post(url, json=body, headers = headers)

    if response.status_code == 200:
        data = response.json()
        access_token = data.get('accessToken')
        print("Authenticated! Token saved")
        return True
    else:
        print(f"Failed{response.json()}")
        return False
    
def get_headers():
        if not access_token:
            raise Exception("Not authenticated")
        return {
            "Authorization": f"Bearer {access_token}",
            "accept": "application/json",
            "Content-Type": "application/json"
        }   

def get_fills():
    headers = get_headers()

    url = 'https://demo.tradovateapi.com/v1/fill/list'

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        fills = response.json()
        print(f"Success: Got {len(fills)} fills")

        # show first fill to see schema
        if len(fills) > 0:
            import json
            print("Fill schema")
            print(json.dumps(fills, indent=2))
        else:
            print("No fills found")
        
        return fills
    else:
        print(f"Error: {response.text}")
        return []

def get_fill_dependents(order_id: int):
    """call filldependents for one order ID"""

    headers = get_headers()
    
    url = 'https://demo.tradovateapi.com/v1/fill/deps'

    params = {
        "masterid": order_id
    }

    print(f"Calling fillDependents for {order_id}")

    response = requests.get(url, headers=headers, params=params)
    print("Status:", response.status_code)

    try:
        data = response.json()
    except Exception:
        print("Non-JSON response:", response.text)
        return None
    import json
    print(json.dumps(data if isinstance(data, dict) else data[:2], indent=2))
    return data
    
def get_orders_list(ord_status = None):
    # Call GET /v1/order/list. Optional query param ord_status (e.g. "Filled") to filter by ordStatus. Return list of order objects. Use for bracket/OCO structure (parentId, linkedId, ocoId).
    """"
    Canceled" "Completed" "Expired" "Filled" "PendingCancel" 
    "PendingNew" "PendingReplace" "Rejected" "Suspended" "Unknown" "Working"
    """

    headers = get_headers()
    url = 'https://demo.tradovateapi.com/v1/order/list'

    params = {}
    if ord_status:
        params["ordStatus"] = ord_status

    response = requests.get(url, headers=headers, params=params)

    if response.status_code != 200:
        print("Error:", response.text)
        return None
 
    import json
    data = response.json()
    print(json.dumps(data[-1]))
    

def get_filled_orders():
    # Return only orders that have fills. Call get_orders(ord_status="Filled") and return that list (or thin wrapper). Used so we only fetch fills for orders that can have them.
    get_orders_list(ord_status = "Filled")
    return None

def parse_order_relationships(order):
    # Return only orders that have fills. Call get_orders(ord_status="Filled") and return that list (or thin wrapper). Used so we only fetch fills for orders that can have them.
    return None

def build_bracket_oco_groups(orders):
    # Take the full list of orders from order/list. Group by parentId (brackets) and by ocoId (OCO). Return a dict: key = group identifier (e.g. "parent:<id>" or "oco:<id>" or "standalone:<id>"), value = list of order IDs in that group. Used so we know which order IDs belong together for fetching fills and pairing entry/exi
    return None

def get_fills_by_order_ids(order_ids: int):
    # Given a list of order IDs (e.g. from one bracket/OCO group), return a dict order_id -> list of fills. Either call get_fill_dependents(order_id) for each ID, or call get_fills() once and filter by orderId in that list. Used to gather all fills for a group before pairing entry/exit.
    return None
def pair_entry_exit_fills(fills_for_group):
    # ake a list of fill dicts for one bracket/OCO group (or single order), sorted by time. Identify entry fill(s) and exit fill(s) (e.g. by action Buy/Sell and timestamp). Return a list of (entry_fill, exit_fill) pairs (or equivalent structure) so PnL can be computed per pair.
    return None
def compute_pnl_for_pair(entry_fill, exit_fill, contract_multiplier):
    # Given one entry fill and one exit fill, compute realized PnL: (exit_price - entry_price) * qty * multiplier, with sign corrected for direction (Buy vs Sell). Return a number (or a small dict with pnl and metadata). Used after pairing entry/exit
    return None


if __name__ == '__main__':
    authenticate()
    print("Token stored")
    get_orders_list()
    #get_fills()


# 1.  authenticate()

# 2.  orders = get_filled_orders()                    # uses get_orders("Filled") under the hood
# 3.  groups = build_bracket_oco_groups(orders)      # group_key -> [order_id, ...]

# 4.  for each (group_key, order_ids) in groups:
# 5.      fills_by_order = get_fills_by_order_ids(order_ids)   # uses get_fill_dependents (or get_fills) per id
# 6.      all_fills_for_group = flatten fills_by_order into one list, sort by timestamp
# 7.      pairs = pair_entry_exit_fills(all_fills_for_group)
# 8.      for each (entry_fill, exit_fill) in pairs:
# 9.          pnl = compute_pnl_for_pair(entry_fill, exit_fill)
# 10.         # store or send (group_key, entry_fill, exit_fill, pnl) to journal/UI

# get_headers is used inside get_filled_orders, get_fills, and get_fill_dependents (and thus inside get_fills_by_order_ids).
# get_orders is used only by get_filled_orders.
# get_fill_dependents is used by get_fills_by_order_ids (or you substitute get_fills + filter by orderId).
# parse_order_relationships is optional and doesn’t drive the flow; it’s for inspecting one order.