use serde::{Deserialize, Serialize};
use std::env;
use std::error::Error;
use std::process::Command;
use std::str;

// use crate::files::FileMetadata;

#[derive(Debug)]
pub enum Action {
    GetOrCreate {
        collection_name: String,
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
    };

    if output.status.success() {
        let stdout = str::from_utf8(&output.stdout)?;

        if !mute {
            println!("Python SDK output: {}", stdout);
        }

        // if let Action::Query { .. } = action {
        //     let results: QueryResult = serde_json::from_str(stdout)?;
        //     Ok(Some(results))
        // } else {
        //     println!("Python SDK output: {}", stdout);
        //     Ok(None)
        // }
        Ok(None)
    } else {
        let stderr = str::from_utf8(&output.stderr)?;
        // let stdout: String = str::from_utf8(&output.stdout)?.to_string();

        eprintln!("Python SDK Error: {}", stderr);
        // eprintln!("Python SDK Output: {}", stdout);
        Err(Box::from(stderr))
    }
}
