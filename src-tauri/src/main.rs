#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Menu, Submenu};

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

    let cfg_path = util::config_path();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![gh_oauth, run_subprocess])
        .menu(Menu::new().add_submenu(submenu))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
