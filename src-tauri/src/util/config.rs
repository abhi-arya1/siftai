use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tauri::api::path::config_dir;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppConfig {
    pub github_token: String,
    pub notion_token: String,
    pub google_token: String,
    pub atlassian_token: String,
}


pub fn db_path() -> PathBuf {
    if let Some(mut db_pt) = config_dir() {
        db_pt = db_pt.join("sift_datastore");
        if !db_pt.exists() {
            std::fs::create_dir(&db_pt).expect("Failed to create database directory");
        }
        db_pt
        // println!("DB path: {}", db_pt.display());
    } else {
        println!("Failed to get config directory");
        PathBuf::new()
    }
}

pub fn db_formatted_path() -> String {
    let path = db_path();
    let path_str = path.display().to_string();

    let escaped_path = path_str.replace(' ', r"\ ");

    escaped_path
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


pub fn write_config(cfg: AppConfig) -> Result<(), Box<dyn Error>> {
    let cfg_path = config_path();

    let json_data = serde_json::to_string_pretty(&cfg)?;

    let mut file = File::create(cfg_path)?;
    file.write_all(json_data.as_bytes())?;

    Ok(())
}


pub fn read_config() -> Result<AppConfig, Box<dyn Error>> {
    let cfg_path = config_path();
    let file = File::open(cfg_path)?;
    let cfg: AppConfig = serde_json::from_reader(file)?;

    Ok(cfg)
}


pub fn load_config() -> Result<AppConfig, Box<dyn Error>> {
    let cfg_path = config_path();

    if !cfg_path.exists() {
        let default_cfg = AppConfig {
            github_token: "".to_string(),
            notion_token: "".to_string(),
            google_token: "".to_string(),
            atlassian_token: "".to_string(),
        };

        write_config(default_cfg.clone())?;
        Ok(default_cfg)
    } else {
        let cfg = read_config()?;
        Ok(cfg)
    }
}
