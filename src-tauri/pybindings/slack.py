import requests
import chromadb
from chromadb import Settings
from chromadb.utils.embedding_functions.open_clip_embedding_function import OpenCLIPEmbeddingFunction
from chromadb.utils.data_loaders import ImageLoader
from sys import argv
from time import time
import requests
import json
import urllib.parse

# Initialize embedders and data loaders for ChromaDB
embedder = OpenCLIPEmbeddingFunction()
data_loader = ImageLoader()

# Track the starting time for performance measurement
start = time()

cur_file_id = 0

start = time()

# Create and reset ChromaDB client
client = chromadb.PersistentClient(
    path="/Users/ashwa/Desktop/sift_datastore",
)

coll = client.get_or_create_collection(
    name="siftfiles",
    embedding_function=embedder,
    data_loader=data_loader,
)


# Your Slack Bot Token
SLACK_TOKEN = "xoxb-7906164823108-7918835233777-3TwEYUxMgbGE64epBEiZCZqJ"

WORKSPACE = "watchfilesforcalhacks"
# Slack API URLs
CHANNEL_LIST_URL = 'https://slack.com/api/conversations.list'
MESSAGE_HISTORY_URL = 'https://slack.com/api/conversations.history'

# Function to fetch all channels in the workspace
def fetch_all_channels():
    headers = {
        'Authorization': f'Bearer {SLACK_TOKEN}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    response = requests.get(CHANNEL_LIST_URL, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Error fetching channels: {response.status_code} {response.text}")
    
    data = response.json()
    if not data.get('ok'):
        raise Exception(f"Error fetching channels: {data.get('error')}")
    
    return data.get('channels', [])

# Function to fetch messages from a specific channel
def fetch_channel_messages(channel_id, limit=100):
    headers = {
        'Authorization': f'Bearer {SLACK_TOKEN}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    params = {
        'channel': channel_id,
        'limit': limit
    }
    
    response = requests.get(MESSAGE_HISTORY_URL, headers=headers, params=params)
    if response.status_code != 200:
        raise Exception(f"Error fetching messages: {response.status_code} {response.text}")
    
    data = response.json()
    if not data.get('ok'):
        raise Exception(f"Error fetching messages: {data.get('error')}")
    
    return data.get('messages', [])

# Function to generate a Slack message URL
def generate_message_url(channel_id, timestamp):
    formatted_ts = timestamp.replace('.', '')
    return f"https://{WORKSPACE}.slack.com/archives/{channel_id}/p{formatted_ts}"

# Main function to fetch channels and their messages
def fetch_all_channel_messages():
    channels = fetch_all_channels()

    for channel in channels:
        channel_id = channel['id']
        channel_name = channel['name']

        
        print(f"\nFetching messages from channel: {channel_name} (ID: {channel_id})")
        
        try:
            messages = fetch_channel_messages(channel_id)
            for message in messages:
                text = message.get('text', '[No Text]')
                timestamp = message['ts']
                message_url = generate_message_url(channel_id, timestamp)

                if "has joined the channel" in text:
                    continue 

                global cur_file_id

                coll.add(documents=[text], ids=[f"slack{cur_file_id}"], metadatas=[{
                    "filepath": message_url,
                    "location": "slack"
                }])
                
                print(f"Message: {text}")
                print(f"URL: {message_url}\n")
                cur_file_id += 1
        
        except Exception as e:
            print(f"Error fetching messages from {channel_name}: {str(e)}")

if __name__ == "__main__":
    fetch_all_channel_messages()
