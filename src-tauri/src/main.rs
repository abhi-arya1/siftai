#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use files::get_gh_repos;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{CustomMenuItem, Menu, Submenu};
use tokio::signal;
use util::db_formatted_path;

mod apis;
mod chroma;
mod files;
mod invokes;
mod util;

fn start_chroma_server(command: &str) -> Arc<Mutex<std::process::Child>> {
    let chrdb = if cfg!(target_os = "windows") {
        Arc::new(Mutex::new(
            Command::new("cmd")
                .args(&["/C", command]) // Use "/C" for cmd.exe to run a command
                .stdout(Stdio::inherit()) // Inherit standard output for logging
                .stderr(Stdio::inherit()) // Inherit standard error for logging
                .spawn()
                .expect("Failed to start Chroma server on Windows"),
        ))
    } else {
        Arc::new(Mutex::new(
            Command::new("sh")
                .arg("-c")
                .arg(command)
                .stdout(Stdio::inherit()) // Inherit standard output for logging
                .stderr(Stdio::inherit()) // Inherit standard error for logging
                .spawn()
                .expect("Failed to start Chroma server on Unix-like system"),
        ))
    };

    let _ = Arc::clone(&chrdb);
    chrdb
}

fn start_chroma_db() {
    chroma::run_python_sdk(
        &db_formatted_path().as_str(),
        &chroma::Action::GetOrCreate {
            collection_name: "siftfiles".to_string(),
        },
    )
    .expect("Failed to create Chroma database collection");
}

#[tauri::command]
fn run_subprocess(command: String) -> Result<String, String> {
    invokes::run_cmd(command)
}

#[tauri::command]
fn rungh() -> Result<String, String> {
    get_gh_repos();
    Ok("Fetching GitHub repositories...".to_string())
}

#[tauri::command]
async fn gh_oauth() -> Result<String, String> {
    invokes::github_oauth().await
}

#[tauri::command]
async fn gh_find(token: &str) -> Result<String, String> {
    invokes::get_repos_and_files(token).await
}

#[tauri::command]
async fn slk_oauth() -> Result<String, String> {
    invokes::slack_oauth().await
}

#[tauri::command]
async fn disc_oauth() -> Result<String, String> {
    invokes::discord_oauth().await
}

#[tauri::command]
async fn ntn_oauth() -> Result<String, String> {
    invokes::notion_oauth().await
}

#[tauri::command]
async fn ggl_oauth() -> Result<String, String> {
    invokes::google_oauth().await
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let submenu = Submenu::new("File", Menu::new().add_item(quit));

    let app_cfg = util::load_config().unwrap();
    println!("\nBeginning Sift.AI Startup...\n");

    let command = format!("chroma run --path {} --port 35436", db_formatted_path());
    // let chroma_clone = start_chroma_server(&command);

    println!("Chroma server is running in the background on http://localhost:35436.\n");
    println!("AppConfig: {:?}", app_cfg);

    // start_chroma_db();
    println!("Chroma database is configured.\n");

    println!("Parsing files in the background...");
    // files::parse_files();
    files::get_gh_repos();

    println!("\nCompleted Startup Configurations\n");

    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();

            // Spawn the background server and handle Ctrl+C signal
            tauri::async_runtime::spawn(async move {
                let server_handle = tokio::spawn(apis::fileserv::serve());

                // Handle Ctrl+C for graceful shutdown
                tokio::spawn(async move {
                    if signal::ctrl_c().await.is_ok() {
                        println!("Ctrl+C detected, shutting down...");
                        app_handle.exit(0);
                    }
                });

                if let Err(e) = server_handle.await {
                    eprintln!("Server error: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            gh_oauth,
            run_subprocess,
            gh_find,
            slk_oauth,
            ntn_oauth,
            disc_oauth,
            ggl_oauth,
            rungh
        ])
        .menu(Menu::new().add_submenu(submenu))
        .on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                println!("Closing Chroma server...");
                // if let Ok(mut chroma) = chroma_clone.lock() {
                //     if let Err(e) = chroma.kill() {
                //         eprintln!("Failed to kill Chroma server: {}", e);
                //     }
                // }
                println!("Goodbye from Sift.AI");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
