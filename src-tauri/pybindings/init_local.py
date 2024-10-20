import chromadb 
from chromadb import Settings
from chromadb.utils.embedding_functions.open_clip_embedding_function import OpenCLIPEmbeddingFunction
from chromadb.utils.data_loaders import ImageLoader
from PIL import Image 
from numpy import asarray
from pathlib import Path
import os 
from time import time 
import PyPDF2
import docx

embedder = OpenCLIPEmbeddingFunction()
data_loader = ImageLoader()

start = time() 

client = chromadb.PersistentClient(
    path="/Users/ashwa/Desktop/sift_datastore",
)

# client.reset()

# print("RESET")

coll = client.get_or_create_collection(
    name="siftfiles",
    embedding_function=embedder,
    data_loader=data_loader,
)


cur_file_id = 0
cur_img_id = 0

def parse_files(collection: chromadb.Collection, directory: Path):
    global cur_file_id, cur_img_id 

    for file in directory.iterdir():
        if file.name in {"node_modules", "venv", ".venv", "__pycache__", ".git", 'data'}:
            continue 

        if "test" in str(file).lower():
            continue 

        if "targets" in str(file).lower():
            continue

        if file.is_dir():
            if file.name.lower() in {'adobe', 'nasa_adc_all_site_build', 'onedrive - personalmicrosoftsoftware.uci.edu', "high school", 'library', 'target', 'libraries', 'lib'}:
                continue

            if file.name.startswith('.'):
                continue

            print("Now in: ", str(file))
            parse_files(collection, file) 
        else:
            path = str(file)
            if file.name.startswith('.'):
                continue

            if file.suffix[1:] in [
                "dmg", "zip", "xls", "xlsx", "csv", "tar", "gz", "bz2", "xz", "7z", "rar", "iso", "exe", "dll", "bin",
                "so", "obj", "class", "o", "pyc", "lock", "log", "tmp", "config", "cfg", "ini", "svg", "json", "xml", "yaml", "yml", "data"
                "plist", "db", "db-wal", "db-shm", "mp4", "mpeg4", "mov", "avi", "mkv", "flv", "wmv", "webm", "lock", "lockb", "bin", "sh", "obj", "photosLibrary",
                "html", "css", "timestamp", "ipynb", "env", "env.local", "ico", "code-workspace", "rst", "sln", "img"
            ]: 
                continue 

            if "recovery" in file.name.lower():
                continue

            if "d.ts" in file.name:
                continue

            if "csharp" in file.name:
                continue

            if "xcworkspace" in file.name:
                continue

            if "__init__" in file.name:
                continue

            if "mod" in file.name:
                continue
            
            if file.suffix[1:] in {"png", "jpg", "jpeg"}:
                try:
                    image = Image.open(path)
                    image = asarray(image)
                    image_id = f"img{cur_img_id}"
                    image_metadata = {
                        "filepath": path,
                        "location": "local"
                    }

                    collection.add(images=[image], ids=[image_id], metadatas=[image_metadata])

                    cur_img_id += 1  
                except Exception as e:
                    print(f"Error processing image {file.name}: {e}")
                    continue

            elif file.suffix[1:] == "pdf":
                with open(file, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    num_pages = len(pdf_reader.pages)
                    
                    extracted_text = ""
                    for page_num in range(min(num_pages, 30)):
                        page = pdf_reader.pages[page_num]
                        extracted_text += page.extract_text()

                file_id = f"pdf{cur_file_id}" 
                file_metadata = {
                        "filepath": path,
                        "location": "local"
                    }
                collection.add(documents=[extracted_text], ids=[file_id], metadatas=[file_metadata]) 
                cur_file_id += 1 

            else: 
                try:
                    file_content = file.read_text()
                    file_id = f"txt{cur_file_id}"
                    file_metadata = {
                        "filepath": path,
                        "location": "local"
                    }

                    collection.add(documents=[file_content], ids=[file_id], metadatas=[file_metadata])

                    cur_file_id += 1 
                except UnicodeDecodeError:
                    print(f"Skipping non-text file: {file.name}")
                    continue


print("Starting Parse")


documents_dir = Path(os.environ.get("HOME")) / "Documents"
desktop = Path(os.environ.get("HOME")) / "Desktop"


if documents_dir.exists():
    print("Parsing Documents directory...")
    parse_files(coll, documents_dir)


if desktop.exists():
    print("Parsing Desktop directory...")
    parse_files(coll, desktop)

print("Done with file parse")

print("Time taken: ", time() - start)


# results = coll.query(query_texts=["What are iterators and algorithms in Python"], n_results=5)
# print(results)