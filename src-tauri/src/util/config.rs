use tauri::api::path::config_dir;
use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use serde_json::json;
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::Path;
use std::fs;


struct AppConfig {
    pub github_token: String,
    pub notion_token: String,
    pub google_token: String,
    pub atlassian_token: String
}


pub fn config_path() -> PathBuf {
    if let Some(mut cfg_pt) = config_dir() {
        cfg_pt = cfg_pt.join("sift.config.json");
        cfg_pt
        // println!("Config path: {}", cfg_pt.display());
    } else {
        println!("Failed to get config directory");
        PathBuf::new()
    }
}