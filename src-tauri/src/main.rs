#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{CustomMenuItem, Menu, Submenu};
use tokio::signal;
use util::{config_path, db_formatted_path};

mod apis;
mod chroma;
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
        false,
    )
    .expect("Failed to create Chroma database collection");
}

fn start_chroma_query_agent() -> Arc<Mutex<std::process::Child>> {
    let chrqr = Arc::new(Mutex::new(
        Command::new("uvicorn")
            .arg("src.queryapi:app")
            .arg("--host")
            .arg("127.0.0.1")
            .arg("--port")
            .arg("35443")
            .stdout(Stdio::inherit()) // Inherit standard output for logging
            .stderr(Stdio::inherit()) // Inherit standard error for logging
            .spawn()
            .expect("Failed to start Chroma server on Windows"),
    ));

    let _ = Arc::clone(&chrqr);
    chrqr
}

fn init_local_files() -> Arc<Mutex<std::process::Child>> {
    let proc = Arc::new(Mutex::new(
        Command::new("python3")
            .arg("./pybindings/init_local.py")
            .spawn()
            .expect("Failed to startup local files"),
    ));

    let _ = Arc::clone(&proc);
    proc
}

fn init_gh_files() -> Arc<Mutex<std::process::Child>> {
    let proc = Arc::new(Mutex::new(
        Command::new("python3")
            .arg("./pybindings/init_gh.py")
            .spawn()
            .expect("Failed to startup local files"),
    ));

    let _ = Arc::clone(&proc);
    proc
}

#[tauri::command]
fn run_subprocess(command: String) -> Result<String, String> {
    invokes::run_cmd(command)
}

#[tauri::command]
fn end_app() {
    std::process::exit(0);
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

    let command = "chroma run --path /Users/ashwa/Desktop/sift_datastore --port 35436".to_string();
    let _ = start_chroma_server(&command);

    println!("Chroma server is running in the background on http://localhost:35436.\n");
    println!("AppConfig: {:?}", app_cfg);

    start_chroma_db();
    println!("Chroma database is configured.\n");

    println!("Instantiating File Cache\n");

    // let local_handle = thread::spawn(|| {
    //     init_local_files();
    //     println!("Local files are initialized.\n");
    // });

    // let gh_handle = thread::spawn(|| {
    //     init_gh_files();
    //     println!("GitHub files are initialized.\n");
    // });

    // // Join the threads to ensure both complete
    // local_handle.join().expect("Failed to initialize local files");
    // gh_handle.join().expect("Failed to initialize GitHub files");

    println!("Both tasks are completed.");

    let _ = start_chroma_query_agent();
    println!("Running Chroma Query Agent on http://localhost:35443...\n");

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
            end_app
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
