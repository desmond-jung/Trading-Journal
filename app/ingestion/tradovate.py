import requests

url = "https://demo.tradovateapi.com/v1/auth/accesstokenrequest"
headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
    }
body = {
    "name": "APEX_419310",
    "password": "AF5@0$F@2c##",
    "appId": "TestApp",
    "appVersion": "1.0",
    "cid": 8,
    "deviceId": "test-device-123",
    "sec": "test-sec-456"   
}

response = requests.post(url, headers=headers, json=body)

print("Status Code:", response.status_code)
print("Response:", response.json())