// use chromadb::v1::client::{ChromaClient, ChromaClientOptions};
// use chromadb::v1::collection::{ChromaCollection, GetResult, CollectionEntries};
// use chromadb::v1::embeddings::EmbeddingFunction;
// use serde_json::json;


// pub fn create_client() -> ChromaClient { 
//     let client: ChromaClient = ChromaClient::new(ChromaClientOptions 
//         { url: "http://localhost:35436".to_string(), auth: Default::default() }
// );
//     client
// }

// pub fn get_or_create_collection(client: &ChromaClient, collection_name: &str) -> ChromaCollection {
//     let collection = 
//         client.create_collection(collection_name, None, true).unwrap();
//     collection
// }


// pub fn insert_document(collection: &ChromaCollection, document: serde_json::Value) {
//     let result = collection.add(collection_entries, embedding_function)
//     let result = collection.insert(document).unwrap();
//     println!("Inserted document: {:?}", result);
// }