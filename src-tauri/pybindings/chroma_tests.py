import chromadb 
from chromadb import Settings
from chromadb.utils.embedding_functions.open_clip_embedding_function import OpenCLIPEmbeddingFunction
from chromadb.utils.data_loaders import ImageLoader
from PIL import Image 
from numpy import asarray
import open_clip

embedder = OpenCLIPEmbeddingFunction()
data_loader = ImageLoader()

client = chromadb.Client(
    settings=Settings(
        is_persistent=True,
        persist_directory="./getting-started",
        allow_reset=True
    )
)

coll = client.get_or_create_collection(
    name="siftfiles",
    embedding_function=embedder,
    data_loader=data_loader,
)

image = Image.open("/Users/ashwa/Desktop/IMG_0776.png")
image = asarray(image)

coll.add(
    images=[image],
    ids=["img1"],
    metadatas=[{"path": "/Users/ashwa/Desktop/IMG_0776.png"}]
)



def query_text():
    try:
        coll_name = "siftfiles"
        query_text = "SpaceX"
        n_results = 1
        collection = client.get_or_create_collection(name=coll_name)
        results = collection.query(query_texts=[query_text], n_results=n_results)

        print(results) 
    except Exception as e:
        print("{ \"status\": \"Failed with error: " + str(e) + "\" }")


query_text()

# client.reset()