use serde::{Deserialize, Serialize};
use std::error::Error;
use std::process::Command;
use std::str;

use crate::files::FileMetadata;

#[derive(Debug)]
pub enum Action {
    GetOrCreate {
        collection_name: String,
    },
    Add {
        collection_name: String,
        documents: Vec<String>,
        ids: Vec<String>,
        metadatas: Vec<FileMetadata>,
    },
    Query {
        collection_name: String,
        query_text: String,
        n_results: usize,
    },
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QueryResult {
    pub results: Vec<String>,
}

pub fn run_python_sdk(
    db_path: &str,
    action: &Action, // Borrow the action instead of moving it
) -> Result<Option<QueryResult>, Box<dyn Error>> {
    let sdkpath = "./pybindings/chroma_sdk.py";
    println!("Chroma Database at {}", db_path);
    let output = match action {
        Action::GetOrCreate { collection_name } => Command::new("python3")
            .arg(sdkpath)
            .arg(db_path)
            .arg("get_or_create")
            .arg(&collection_name) // Borrow the collection name
            .output()?,
        Action::Add {
            collection_name,
            documents,
            ids,
            metadatas,
        } => {
            let docs_str = format!("{:?}", documents);
            let ids_str = format!("{:?}", ids);
            let metadatas_str = format!("{:?}", metadatas);

            Command::new("python3")
                .arg(sdkpath)
                .arg(db_path)
                .arg("add")
                .arg(&collection_name) // Borrow the collection name
                .arg(&docs_str)
                .arg(&ids_str)
                .arg(&metadatas_str)
                .output()?
        }
        Action::Query {
            collection_name,
            query_text,
            n_results,
        } => Command::new("python3")
            .arg(sdkpath)
            .arg(db_path)
            .arg("query")
            .arg(&collection_name) // Borrow the collection name
            .arg(&query_text) // Borrow the query text
            .arg(n_results.to_string())
            .output()?,
    };

    if output.status.success() {
        let stdout = str::from_utf8(&output.stdout)?;

        println!("Python SDK output: {}", stdout);

        if let Action::Query { .. } = action {
            let results: QueryResult = serde_json::from_str(stdout)?;
            Ok(Some(results))
        } else {
            println!("Python SDK output: {}", stdout);
            Ok(None)
        }
    } else {
        let stderr = str::from_utf8(&output.stderr)?;
        let stdout: String = str::from_utf8(&output.stdout)?.to_string();
        eprintln!("Python SDK Error: {}", stderr);
        eprintln!("Python SDK Output: {}", stdout);
        Err(Box::from(stderr))
    }
}
