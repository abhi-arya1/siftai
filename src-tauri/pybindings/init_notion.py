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

# chroma dir = argv[1] (path to persistent directory)
appdata_dir = "/Users/ashwa/Desktop/sift.config.json"  # Path to appdata (credentials JSON)

with open(appdata_dir, 'r') as jf:
    data = json.load(jf)

key = data["github_token"]
username = data["github_username"]

cur_file_id = 0

# Create and reset ChromaDB client
client = chromadb.PersistentClient(
    path="/Users/ashwa/Desktop/sift_datastore",
)

coll = client.get_or_create_collection(
    name="siftfiles",
    embedding_function=embedder,
    data_loader=data_loader,
)