import chromadb
import sys 

if len(sys.argv) < 3:
    print("Usage: python chroma_binary_sdk.py <db_path> <collection_name> [--add | --query] [ARGUMENTS]")
    sys.exit(1)

db_path = str(sys.argv[1])

client = chromadb.PersistentClient(
    path=db_path
)

collection = client.get_or_create_collection(name=sys.argv[2])
