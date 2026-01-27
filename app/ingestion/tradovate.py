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

if __name__ == '__main__':
    authenticate()
    print("Token stored")