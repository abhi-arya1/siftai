import slack 
import json
import requests
from fastapi import FastAPI
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from fastapi.testclient import TestClient

import os

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), 'sift.config.json')
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    with open(config_path, 'r') as file:
        config = json.load(file)
    return config

config = load_config()
slack_token = config['slack_token']
app = FastAPI()

# @app.post("/api/conversations.list")
# async def conversations_list():
#     url = "https://slack.com/api/conversations.list"
#     headers = {
#         "Authorization": f"Bearer {slack_token}",
#         "Content-Type": "application/json"
#     }
#     try:
#         response = requests.get(url, headers=headers)
#         response_data = response.json()
#         print(response_data)
#     except:
#         print("a")
#         return {"error": "Failed to fetch conversations list"}
    
# @app.post("/api/conversations.history")
# async def conversations_history():
#     url = "https://slack.com/api/conversations.history"
#     headers = {
#         "Authorization": f"Bearer {slack_token}",
#         "Content-Type": "application/json"
#     }
#     try:
#         response = requests.get(url, headers=headers)
#         response_data = response.json()
#         print(response_data)
#     except:
#         print("a")
#         return {"error": "Failed to fetch conversations history"}
    
#     def get_repositories():
#     url = f"https://api.github.com/search/repositories?q=user:{urllib.parse.quote(username)}"
#     req = requests.get(url, headers={
#         "Authorization": f"Bearer {key}",
#         "Accept": "application/vnd.github+json",
#         "X-GitHub-Api-Version": "2022-11-28"
#     })

#     if req.status_code != 200: 
#         return {"error": f"Error fetching repos: {req.text}"}
    
#     return req.json()["items"]
 
def get_slack_conversations():
    url = "https://slack.com/api/conversations.list"
    req = requests.get(url, headers={
        "Authorization": f"Bearer {slack_token}",
        "Accept": "application/x-www-form-urlencoded"
    })

    if req.status_code != 200: 
        return {"error": f"Error fetching repos: {req.text}"}
    
    return req.json()

print(get_slack_conversations())