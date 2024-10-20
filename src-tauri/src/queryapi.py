import fastapi 
from fastapi.middleware.cors import CORSMiddleware
import chromadb
from chromadb.utils.embedding_functions.open_clip_embedding_function import OpenCLIPEmbeddingFunction
from chromadb.utils.data_loaders import ImageLoader
from time import time 
from sys import argv 

embedder = OpenCLIPEmbeddingFunction()
data_loader = ImageLoader()

start = time() 

client = chromadb.Client(
    settings=chromadb.Settings(
        is_persistent=True,
        persist_directory="/Users/ashwa/Application\\ Support/sift_datastore",
    )
)

app = fastapi.FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/query/{ask}/{results}")
def query(ask: str, results: int):
    try:
        collection = client.get_collection(name="siftfiles", embedding_function=embedder, data_loader=data_loader)
        results = collection.query(
            query_texts=[ask],
            n_results=results
        )
        return {"status": "200", "results": results}
    except Exception as e:
        return {"status": "500", "error": str(e)}
