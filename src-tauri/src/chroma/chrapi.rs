use serde::{Deserialize, Serialize};
use std::process::Command;
use std::str;
use std::error::Error;

#[derive(Debug)]
pub enum Action {
    GetOrCreate { collection_name: String },
    Add { collection_name: String, documents: Vec<String>, ids: Vec<String> },
    Query { collection_name: String, query_text: String, n_results: usize },
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QueryResult {
    pub results: Vec<String>,
}


pub fn run_python_sdk(db_path: &str, action: Action) -> Result<Option<QueryResult>, Box<dyn Error>> {
    let sdkpath = "../../pybindings/chroma_sdk.py";
    let output = match action {
        Action::GetOrCreate { collection_name } => {
            Command::new("python3")
                .arg(sdkpath)
                .arg(db_path)
                .arg("get_or_create")
                .arg(&collection_name)
                .output()?
        }
        Action::Add { collection_name, documents, ids } => {
            let docs_str = format!("{:?}", documents);
            let ids_str = format!("{:?}", ids);

            Command::new("python3")
                .arg(sdkpath)
                .arg(db_path)
                .arg("add")
                .arg(&collection_name)
                .arg(&docs_str)
                .arg(&ids_str)
                .output()?
        }
        Action::Query { collection_name, query_text, n_results } => {
            Command::new("python3")
                .arg(sdkpath)
                .arg(db_path)
                .arg("query")
                .arg(&collection_name)
                .arg(&query_text)
                .arg(n_results.to_string())
                .output()?
        }
    };

    if output.status.success() {
        let stdout = str::from_utf8(&output.stdout)?;

        if let Action::Query { .. } = action {
            let results: QueryResult = serde_json::from_str(stdout)?;
            Ok(Some(results))
        } else {
            println!("Python SDK output: {}", stdout);
            Ok(None)
        }
    } else {
        let stderr = str::from_utf8(&output.stderr)?;
        eprintln!("Python SDK Error: {}", stderr);
        Err(Box::from(stderr))
    }
}
