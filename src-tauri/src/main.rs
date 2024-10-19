#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{CustomMenuItem, Menu, Submenu};
use util::{db_formatted_path, db_path};

mod files;
mod invokes;
mod util;

#[tauri::command]
fn run_subprocess(command: String) -> Result<String, String> {
    invokes::run_cmd(command)
}

#[tauri::command]
async fn gh_oauth() -> Result<String, String> {
    invokes::github_oauth().await
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let submenu = Submenu::new("File", Menu::new().add_item(quit));

    let app_cfg = util::load_config().unwrap();
    println!("\nBeginning Startup Configurations\n");
    // files::parse_files();

    let command = format!("chroma run --path {} --port 35436", db_formatted_path());

    // Spawn the process
    let mut chroma = Arc::new(Mutex::new(
        Command::new("sh")
            .arg("-c")
            .arg(&command)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()
            .expect("Failed to start Chroma server"),
    ));
    let chroma_clone = Arc::clone(&chroma);

    println!("Chroma server is running in the background.");

    println!("AppConfig: {:?}", app_cfg);

    println!("\nCompleted Startup Configurations\n");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![gh_oauth, run_subprocess])
        .menu(Menu::new().add_submenu(submenu))
        .on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                println!("Closing Chroma server...");
                if let Ok(mut chroma) = chroma_clone.lock() {
                    if let Err(e) = chroma.kill() {
                        eprintln!("Failed to kill Chroma server: {}", e);
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
