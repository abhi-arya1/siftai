import chromadb
from chromadb import Settings
from chromadb.utils.embedding_functions import ollama_embedding_function


chroma_client = chromadb.Client(
    settings=Settings(
        is_persistent=True,
        persist_directory="./getting_started"
    )
)

collection = chroma_client.get_or_create_collection(name="DEV_COLLECTION", 
    embedding_function=ollama_embedding_function)

collection.add(
    documents=[
        "This is a document about pineapple",
        "This is a document about oranges"
    ],
    ids=["id1", "id2"]
)

results = collection.query(
    query_texts=["This is a query document about hawaii"], # Chroma will embed this for you
    n_results=2 # how many results to return
)
print(results)