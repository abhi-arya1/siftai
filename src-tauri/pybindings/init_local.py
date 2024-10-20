import chromadb 
from chromadb import Settings
from chromadb.utils.embedding_functions.open_clip_embedding_function import OpenCLIPEmbeddingFunction
from chromadb.utils.data_loaders import ImageLoader
from PIL import Image 
from numpy import asarray
from pathlib import Path
import os 
from time import time 

embedder = OpenCLIPEmbeddingFunction()
data_loader = ImageLoader()

start = time() 

client = chromadb.Client(
    settings=Settings(
        is_persistent=True,
        persist_directory="/Users/ashwa/Application\\ Support/sift_datastore",
        allow_reset=True
    )
)

# client.reset()

coll = client.get_or_create_collection(
    name="siftfiles",
    embedding_function=embedder,
    data_loader=data_loader,
)

# Global counters for file and image IDs
cur_file_id = 0
cur_img_id = 0

def parse_files(collection: chromadb.Collection, directory: Path):
    global cur_file_id, cur_img_id  # Use global counters to keep track of IDs

    for file in directory.iterdir():
        if file.name in {"node_modules", "venv", ".venv", "__pycache__", ".git"}:
            continue 

        if file.is_dir():
            if file.name.lower() in {'adobe', 'nasa_adc_all_site_build', 'onedrive - personalmicrosoftsoftware.uci.edu', "high school", 'library', 'libraries', 'lib'}:
                continue

            if file.name.startswith('.'):
                continue

            print("Now in: ", str(file))
            parse_files(collection, file)  # Recursive call for subdirectories
        else:
            path = str(file)
            if file.name.startswith('.'):
                continue

            # Skip certain file types
            if file.suffix[1:] in [
                "dmg", "zip", "xls", "xlsx", "csv", "tar", "gz", "bz2", "xz", "7z", "rar", "iso", "exe", "dll", "bin",
                "so", "obj", "class", "o", "pyc", "lock", "log", "tmp", "config", "cfg", "ini",
                "plist", "db", "db-wal", "db-shm", "mp4", "mpeg4", "mov", "avi", "mkv", "flv", "wmv", "webm", "lock", "lockb", "bin", "sh", "obj", "photosLibrary"
            ]: 
                continue 
            
            # Process image files
            if file.suffix[1:] in {"png", "jpg", "jpeg"}:
                try:
                    image = Image.open(path)
                    image = asarray(image)
                    image_id = f"img{cur_img_id}"  # Use the global cur_img_id
                    image_metadata = {
                        "filepath": path,
                        "extension": file.suffix[1:],
                        "size": file.stat().st_size
                    }

                    # Upload image to ChromaDB
                    collection.add(images=[image], ids=[image_id], metadatas=[image_metadata])

                    cur_img_id += 1  # Increment global image ID counter after use
                except Exception as e:
                    print(f"Error processing image {file.name}: {e}")
                    continue

            # Process text files (not PDF, doc, docx)
            if file.suffix[1:] not in {'pdf', 'doc', 'docx'}:
                try:
                    file_content = file.read_text()
                    file_id = f"txt{cur_file_id}"  # Use the global cur_file_id
                    file_metadata = {
                        "filepath": path,
                        "extension": file.suffix[1:],
                        "size": file.stat().st_size
                    }

                    # Upload text file to ChromaDB
                    collection.add(documents=[file_content], ids=[file_id], metadatas=[file_metadata])

                    cur_file_id += 1  # Increment global file ID counter after use
                except UnicodeDecodeError:
                    print(f"Skipping non-text file: {file.name}")
                    continue

print("Starting Parse")

# Parse only Documents and Downloads directories on Desktop
documents_dir = Path(os.environ.get("HOME")) / "Documents"
downloads_dir = Path(os.environ.get("HOME")) / "Downloads"

# # Parse Documents directory if it exists
# if documents_dir.exists():
#     print("Parsing Documents directory...")
#     parse_files(coll, documents_dir)

# # Parse Downloads directory if it exists
# if downloads_dir.exists():
#     print("Parsing Downloads directory...")
#     parse_files(coll, downloads_dir)

print("Done with file parse")

print("Time taken: ", time() - start)

# Query the collection (example query)
results = coll.query(query_texts=["What are iterators and algorithms in Python"], n_results=5)
print(results)
