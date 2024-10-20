import chromadb
from chromadb import Settings
from sys import argv 
import re
from chromadb.utils.embedding_functions.open_clip_embedding_function import OpenCLIPEmbeddingFunction
from chromadb.utils.data_loaders import ImageLoader
from PIL import Image 
from numpy import asarray
import open_clip

if len(argv) < 3:
    print("Usage: python chroma_sdk.py <path> [ get_or_create | add | query ] <args>")
    exit(1)


file = argv[0]
db_path = argv[1]

embedder = OpenCLIPEmbeddingFunction()
data_loader = ImageLoader()
client = chromadb.PersistentClient(
    path="/Users/ashwa/Desktop/sift_datastore",
)

def parse_file_metadata(metadata_string):
    # Define a regex pattern to extract key-value pairs
    pattern = r'FileMetadata\s*\{\s*filepath:\s*"([^"]+)",\s*filename:\s*"([^"]+)",\s*extension:\s*"([^"]+)",\s*size:\s*(\d+)\s*\}'
    
    # Use regex to search for the pattern
    match = re.search(pattern, metadata_string)
    
    if match:
        filepath, filename, extension, size = match.groups()
        
        return [{
            "filepath": filepath,
            "extension": extension,
            "size": int(size)
        }]
    else:
        return [] 


def get_or_create():
    try:
        collection = client.get_or_create_collection(
            name=argv[3],
            embedding_function=embedder,
            data_loader=data_loader
        )
        # print("{ \"status\": \"Success: " + str(collection) + "\" }")
    except Exception as e:
        print("{ \"status\": \"Failed with error: " + str(e) + "\" }")


def add():
    try: 
        coll_name = argv[3]
        collection = client.get_or_create_collection(name=coll_name, 
            embedding_function=embedder, data_loader=data_loader
        )

        if argv[4] == "--images":
            images = [asarray(Image.open(path)) for path in eval(argv[5])]
            ids = eval(argv[6])
            if len(argv) == 7:
                metadata = None
            else: 
                metadata = parse_file_metadata(argv[7])
            collection.add(images=images, ids=ids, metadatas=metadata)
        else:
            docs = eval(argv[4])
            ids = eval(argv[5])
            if len(argv) == 6:
                metadata = None
            else:
                metadata = parse_file_metadata(argv[6])
            collection.add(documents=docs, ids=ids, metadatas=metadata)
        # print("{ \"status\": \"Success: " + str(collection) + "\" }")
    except Exception as e:
        print("{ \"status\": \"Failed with error: " + str(e) + "\" }")


def query_text():
    try:
        coll_name = argv[3]
        query_text = argv[4]
        n_results = int(argv[5])
        collection = client.get_or_create_collection(name=coll_name, embedding_function=embedder, data_loader=data_loader)
        results = collection.query(query_texts=[query_text], n_results=n_results)

        print(results) 
    except Exception as e:
        print("{ \"status\": \"Failed with error: " + str(e) + "\" }")
    

action = {
    "get_or_create": get_or_create,
    "add": add,
    "query": query_text
}


if __name__ == "__main__":
    action_id = argv[2]
    action[action_id]()