import chromadb
from chromadb import Settings
from sys import argv 
import re


if len(argv) < 3:
    print("Usage: python chroma_sdk.py <path> [ get_or_create | add | query ] <args>")
    exit(1)


def parse_file_metadata(metadata_string):
    # Define a regex pattern to extract key-value pairs
    pattern = r'FileMetadata\s*\{\s*filepath:\s*"([^"]+)",\s*filename:\s*"([^"]+)",\s*extension:\s*"([^"]+)",\s*size:\s*(\d+)\s*\}'
    
    # Use regex to search for the pattern
    match = re.search(pattern, metadata_string)
    
    if match:
        # Extract the values
        filepath, filename, extension, size = match.groups()
        
        # Construct and return the dictionary inside a list
        return [{
            "filepath": filepath,
            "filename": filename,
            "extension": extension,
            "size": int(size)  # Convert size to an integer
        }]
    else:
        return [] 

# print(argv)

file = argv[0]
db_path = argv[1]

client = chromadb.PersistentClient(
    path=db_path
)


def get_or_create():
    try:
        collection = client.get_or_create_collection(name=argv[3])
        print("{ \"status\": \"Success: " + str(collection) + "\" }")
    except Exception as e:
        print("{ \"status\": \"Failed with error: " + str(e) + "\" }")


def add():
    try: 
        coll_name = argv[3]

        docs = eval(argv[4])
        try:
            ids = eval(argv[5])
        except Exception as e:
            print("{ \"status\": \"Failed ids with error: " + str(e) + "\" }")
            return

        if len(argv) == 6:
            metadata = None
        else: 
            metadata = parse_file_metadata(argv[6])

        collection = client.get_or_create_collection(name=coll_name)
        collection.add(documents=docs, ids=ids, metadatas=metadata)
        print("{ \"status\": \"Success: " + str(collection) + "\" }")
    except Exception as e:
        print("{ \"status\": \"Failed with error: " + str(e) + "\" }")


def query_text():
    try:
        coll_name = argv[3]
        query_text = argv[4]
        n_results = int(argv[5])
        collection = client.get_or_create_collection(name=coll_name)
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