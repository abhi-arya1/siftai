#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::Deserialize;
use reqwest::Client;
use std::env;
use tokio::sync::mpsc;
use warp::Filter;
use tauri::{CustomMenuItem, Menu, Submenu};

// Custom rejection type for warp
#[derive(Debug)]
struct OAuthError(String);

impl warp::reject::Reject for OAuthError {}

#[tauri::command]
fn run_subprocess(command: String) -> Result<String, String> {
    let mut parts = command.split_whitespace();
    let program = parts.next().ok_or("No command provided".to_string())?;
    let args: Vec<&str> = parts.collect();

    let output = std::process::Command::new(program)
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[derive(Deserialize, Debug)]
struct GitHubAccessTokenResponse {
    access_token: String,
    token_type: String,
    scope: String,
}

#[tauri::command]
async fn start_github_oauth() -> Result<String, String> {
    // Load environment variables
    dotenvy::dotenv().ok();
    let github_client_id = "Ov23liOMmuWUdFA35oZl";
    let github_client_secret = "50b43b1fab7fd17c4f3acf754268ddcddfa34fc5";

    // Set up a mpsc channel to capture the authorization code
    let (tx, mut rx) = mpsc::channel::<String>(1);

    // Spawn a local server to listen for the redirect from GitHub
    let redirect_route = warp::path!("callback")
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(warp::any().map(move || tx.clone()))
        .and_then(|params: std::collections::HashMap<String, String>, 
                  tx: mpsc::Sender<String>| async move {
            if let Some(code) = params.get("code") {
                tx.send(code.clone())
                    .await
                    .map_err(|e| warp::reject::custom(OAuthError(e.to_string())))?;
                Ok::<_, warp::Rejection>(warp::reply::html("Authorization code received. You can close this window."))
            } else {
                Err(warp::reject::custom(OAuthError("No code parameter found".to_string())))
            }
        });

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();
    
    let server = warp::serve(redirect_route);
    let (_addr, server) = server.bind_with_graceful_shutdown(
        ([127, 0, 0, 1], 8080),
        async {
            shutdown_rx.await.ok();
        },
    );

    tokio::spawn(server);

    // Step 1: Redirect user to GitHub OAuth authorization URL
    let auth_url = format!(
        "https://github.com/login/oauth/authorize?client_id={}&scope=repo,user&redirect_uri=http://localhost:8080/callback",
        github_client_id
    );

    println!("Open this URL in your browser: {}", auth_url);

    // Step 2: Wait for the authorization code from the local server
    let github_authorization_code = rx.recv()
        .await
        .ok_or("Failed to receive authorization code".to_string())?;

    // Shutdown the server after receiving the code
    let _ = shutdown_tx.send(());

    // Step 3: Exchange authorization code for an access token
    let client = Client::new();
    let token_url = "https://github.com/login/oauth/access_token";
    let params = [
        ("client_id", github_client_id),
        ("client_secret", github_client_secret),
        ("code", github_authorization_code.as_str()),
    ];

    let response = client
        .post(token_url)
        .header("Accept", "application/json")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let token_response: GitHubAccessTokenResponse = response
            .json()
            .await
            .map_err(|e| e.to_string())?;

        println!("Access Token: {}", token_response.access_token);
        Ok(token_response.access_token)
    } else {
        Err("Error: Unable to get access token".to_string())
    }
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let submenu = Submenu::new("File", Menu::new().add_item(quit));

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            start_github_oauth,
            run_subprocess
        ])
        .menu(Menu::new().add_submenu(submenu))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}