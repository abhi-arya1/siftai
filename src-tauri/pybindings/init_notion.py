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

key = data["notion_token"]
# username = data["github_username"]

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


def get_notion_pages():
    api_url = "https://api.notion.com/v1/search"
    version = "2022-06-28"

    req = requests.post(api_url, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Notion-Version": version
    }, json={
        "filter": {
            "property": "object",
            "value": "page"
        }
    })

    if req.status_code != 200:
        print("Error getting pages")

    data = req.json()

    # print(data)

    return data["results"]



def process_page(page): 
    url = f"https://api.notion.com/v1/blocks/{page['id']}/children"
    version = "2022-06-28"

    print("extracting", page["url"])

    req = requests.get(url, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Notion-Version": version
    })

    if req.status_code != 200:
        print("Error fetching page contents")
        return
    
    data = req.json()

    text = ""
    
    for block in data["results"]:
        text += extract_text_from_block(block)
    
    print(text)

    global cur_file_id 
    coll.add(documents=[text], ids=[f"noti{cur_file_id}"], metadatas=[{
        "filepath": page["url"],
        "location": "notion"
    }])
    cur_file_id += 1



def extract_text_from_block(block):
    # texts = []

    if block["type"] == "text" and block.get("text", {}).get("content"):
        return block["text"]["content"]
    else:
        return ""

    # # Paragraph block
    # if block["type"] == "paragraph" and block.get("paragraph", {}).get("rich_text"):
    #     texts.append(block["paragraph"]["rich_text"])

    # if block["type"] == "text" and block.get("text", {}).get("content"):
    #     texts.append(block["text"]["content"])

    # # Heading 1 block
    # if block["type"] == "heading_1" and block.get("heading_1", {}).get("rich_text"):
    #     texts.append(f"## {block["heading_1"]["rich_text"]}")

    # # Heading 2 block
    # if block["type"] == "heading_2" and block.get("heading_2", {}).get("rich_text"):
    #     texts.append(f"### {block["heading_2"]["rich_text"]}")

    # # Heading 3 block
    # if block["type"] == "heading_3" and block.get("heading_3", {}).get("rich_text"):
    #     formatted_text = block["heading_3"]["rich_text"]
    #     texts.append(f"#### {formatted_text}")

    # # Code block
    # if block["type"] == "code" and block.get("code", {}).get("rich_text"):
    #     formatted_text = block["code"]["rich_text"]
    #     language = block["code"].get("language", "")
    #     texts.append(f"\n```{language}\n{formatted_text}\n```")

    # # Bulleted list item block
    # if block["type"] == "bulleted_list_item" and block.get("bulleted_list_item", {}).get("rich_text"):
    #     formatted_text = block["bulleted_list_item"]["rich_text"]
    #     texts.append(f"- {formatted_text}")

    # # Numbered list item block
    # if block["type"] == "numbered_list_item" and block.get("numbered_list_item", {}).get("rich_text"):
    #     formatted_text = block["numbered_list_item"]["rich_text"]
    #     texts.append(f"1. {formatted_text}")

    # # To-do block
    # if block["type"] == "to_do" and block.get("to_do", {}).get("rich_text"):
    #     formatted_text = block["to_do"]["rich_text"]
    #     checked = "x" if block["to_do"].get("checked") else " "
    #     texts.append(f"- [{checked}] {formatted_text}")

    # # Toggle block
    # if block["type"] == "toggle" and block.get("toggle", {}).get("rich_text"):
    #     formatted_text = block["toggle"]["rich_text"]
    #     texts.append(f"<details><summary>{formatted_text}</summary>")
    #     # Recursively extract children if present
    # #     if block.get("children"):
    # #         for child in block["children"]:
    # #             texts.append(extract_text_from_block(child))
    # #     texts.append("</details>")

    # # # Recursively handle children blocks if any
    # # if block.get("has_children") and block.get("children"):
    # #     for child in block["children"]:
    # #         texts.append(extract_text_from_block(child))

    # print(texts)
    # return "\n".join(texts)



def notion_flow():
    pages = get_notion_pages()

    for page in pages:
        process_page(page)


notion_flow()
