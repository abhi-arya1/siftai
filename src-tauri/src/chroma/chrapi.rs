use serde::{Deserialize, Serialize};
use std::env;
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
    AddImage {
        collection_name: String,
        images: Vec<String>,
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
    mute: bool
) -> Result<Option<QueryResult>, Box<dyn Error>> {
    let sdkpath = "./pybindings/chroma_sdk.py";

    if !mute {
        println!("Running Python SDK with action: {:?}", action);
    }

    // Determine the appropriate Python command based on the OS
    let python_cmd = if env::consts::OS == "windows" {
        "python"
    } else {
        "python3"
    };

    let output = match action {
        Action::GetOrCreate { collection_name } => Command::new(python_cmd)
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

            Command::new(python_cmd)
                .arg(sdkpath)
                .arg(db_path)
                .arg("add")
                .arg(&collection_name) // Borrow the collection name
                .arg(&docs_str)
                .arg(&ids_str)
                .arg(&metadatas_str)
                .output()?
        }
        Action::AddImage { 
            collection_name ,
            images,
            ids,
            metadatas,
        } => {
            let images_str = format!("{:?}", images);
            let ids_str = format!("{:?}", ids);
            let metadatas_str = format!("{:?}", metadatas);

            Command::new(python_cmd)
                .arg(sdkpath)
                .arg(db_path)
                .arg("add")
                .arg(&collection_name) // Borrow the collection name
                .arg("--images")
                .arg(&images_str)
                .arg(&ids_str)
                .arg(&metadatas_str)
                .output()?
        }
        Action::Query {
            collection_name,
            query_text,
            n_results,
        } => Command::new(python_cmd)
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

        if !mute {
            println!("Python SDK output: {}", stdout);
        }

        if let Action::Query { .. } = action {
            let results: QueryResult = serde_json::from_str(stdout)?;
            Ok(Some(results))
        } else {
            println!("Python SDK output: {}", stdout);
            Ok(None)
        }
    } else {
        let stderr = str::from_utf8(&output.stderr)?;
        // let stdout: String = str::from_utf8(&output.stdout)?.to_string();

        eprintln!("Python SDK Error: {}", stderr);
        // eprintln!("Python SDK Output: {}", stdout);
        Err(Box::from(stderr))
    }
}
