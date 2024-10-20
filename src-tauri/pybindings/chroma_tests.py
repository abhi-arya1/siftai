import chromadb 

client = chromadb.PersistentClient(
    path="/Users/ashwa/Library/Application\\ Support/sift_datastore"
)

def query_text():
    try:
        coll_name = "siftfiles"
        query_text = "Inheritance in Python"
        n_results = 1
        collection = client.get_or_create_collection(name=coll_name)
        results = collection.query(query_texts=[query_text], n_results=n_results)

        print(results) 
    except Exception as e:
        print("{ \"status\": \"Failed with error: " + str(e) + "\" }")


query_text()