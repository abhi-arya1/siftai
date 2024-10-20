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


def get_repositories():
    url = f"https://api.github.com/search/repositories?q=user:{urllib.parse.quote(username)}"
    req = requests.get(url, headers={
        "Authorization": f"Bearer {key}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    })

    if req.status_code != 200: 
        return {"error": f"Error fetching repos: {req.text}"}
    
    return req.json()["items"]



def process_repo(repo):
    repo_name = repo["name"]

    def traverse_directory(path=""):
        contents_url = f"https://api.github.com/repos/{urllib.parse.quote(username)}/{urllib.parse.quote(repo_name)}/contents/{urllib.parse.quote(path)}"
        req = requests.get(contents_url, headers={
            'Authorization': f'Bearer {key}',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        })

        if req.status_code != 200:
            print(f"Error fetching repo contents at path {path}: {req.text}")
            return
        
        contents = req.json()
        
        for item in contents:
            if item['type'] == 'file':
                filename = item['name']

                lowerized = filename.lower()

                if (filename.startswith('.') or \
                    'lock' in lowerized or \
                        'config' in lowerized or \
                            'xml' in lowerized or \
                            'yml' in lowerized or \
                            'yaml' in lowerized or \
                            'ttf' in lowerized or \
                            'png' in lowerized or \
                            'jpg' in lowerized or \
                            'jpeg' in lowerized or \
                            'toml' in lowerized or \
                            'svg' in lowerized or \
                            'csv' in lowerized or \
                            'pickle' in lowerized or \
                            'ico' in lowerized or \
                            'env' in lowerized or \
                            'bin' in lowerized or \
                            'csharp' in lowerized or \
                            'target' in lowerized or \
                            'mp4' in lowerized or \
                            'webp' in lowerized or \
                            'avif' in lowerized or \
                            'woff' in lowerized or \
                            "__init__" in lowerized):
                    continue 

                print(filename)
                file_content = get_file_contents(item['path'], repo_name)
                # print(file_content)
                if file_content:
                    embed_file_to_chromadb(filename, item['html_url'], file_content)
            elif item['type'] == 'dir':
                if item['name'].startswith('.'):
                    continue
                traverse_directory(item['path'])

    traverse_directory()


def get_file_contents(fp, repo_name):
    contents_path = lambda filepath: f"https://raw.githubusercontent.com/{urllib.parse.quote(username)}/{urllib.parse.quote(repo_name)}/main/{urllib.parse.quote(filepath)}"
    contents_fb_path = lambda filepath: f"https://raw.githubusercontent.com/{urllib.parse.quote(username)}/{urllib.parse.quote(repo_name)}/master/{urllib.parse.quote(filepath)}"

    res = requests.get(contents_path(fp), headers={
        'Authorization': f'Bearer {key}',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    })

    if res.status_code != 200:
        res = requests.get(contents_fb_path(fp), headers={
            'Authorization': f'Bearer {key}',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        })
    
    if res.status_code != 200:
        print(f"Error fetching file content for {fp}: {res.text}")
        return None

    return res.text



def embed_file_to_chromadb(filename, file_path, file_content):
    global cur_file_id
    coll.add(
        documents=[file_content],
        ids=[f"gh{cur_file_id}"],
        metadatas=[{
            'filepath': file_path,
            "location": "github"
        }]
    )
    cur_file_id += 1



def gh_pipeline():
    repos = get_repositories()
    if "error" in repos:
        print(repos["error"])
        return

    for repo in repos:
        print(f"Processing {repo['name']}...")
        process_repo(repo)

    print("Complete!")


gh_pipeline()