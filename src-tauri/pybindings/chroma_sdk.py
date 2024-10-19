import chromadb
from chromadb import Settings
from sys import argv 


if len(argv) < 3:
    print("Usage: python chroma_sdk.py <path> [ get_or_create | add | query ] <args>")
    exit(1)

file = argv[0]
db_path = argv[1]

client = chromadb.PersistentClient(
    path=db_path
)


def get_or_create():
    try:
        client.get_or_create_collection(name=argv[3])
        print("{ \"status\": \"Success\" }")
    except Exception as e:
        print("{ \"status\": \"Failed with error: " + str(e) + "\" }")


def add():
    try: 
        coll_name = argv[3]
        docs = eval(argv[4])
        ids = eval(argv[5])

        if len(argv) == 6:
            metadata = None
        else: 
            metadata = eval(argv[6])

        collection = client.get_or_create_collection(name=coll_name)
        collection.add(documents=docs, ids=ids, metadatas=metadata)
        print("{ \"status\": \"Success\" }")
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