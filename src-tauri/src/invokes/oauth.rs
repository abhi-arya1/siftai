use serde::Deserialize;
use reqwest::Client;
use tokio::sync::mpsc;
use warp::Filter;
use open;

use crate::util;

fn open_url(url: String) {
    match open::that(url) {
        Ok(()) => println!("Browser opened successfully"),
        Err(err) => eprintln!("An error occurred when opening the browser: {}", err),
    }
}

#[derive(Debug)]
struct OAuthError(String);

impl warp::reject::Reject for OAuthError {}

#[derive(Deserialize, Debug)]
struct GitHubUserResponse {
    login: String,
}

#[derive(Deserialize, Debug)]
struct GitHubAccessTokenResponse {
    access_token: String,
    token_type: String,
    scope: String
}

#[derive(Deserialize, Debug)]
struct SlackAccessTokenResponse {
    access_token: String,
}


pub async fn github_oauth() -> Result<String, String> {
    let github_client_id = "Ov23liOMmuWUdFA35oZl";
    let github_client_secret = "50b43b1fab7fd17c4f3acf754268ddcddfa34fc5";

    let mut cfg = util::read_config().unwrap();

    if !cfg.github_token.is_empty() {
        return Ok(cfg.github_token);
    }

    let (tx, mut rx) = mpsc::channel::<String>(1);

    let redirect_route = warp::path!("gh_auth_callback")
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(warp::any().map(move || tx.clone()))
        .and_then(|params: std::collections::HashMap<String, String>, 
                  tx: mpsc::Sender<String>| async move {
            if let Some(code) = params.get("code") {
                tx.send(code.clone())
                    .await
                    .map_err(|e| warp::reject::custom(OAuthError(e.to_string())))?;
                Ok::<_, warp::Rejection>(warp::reply::html("Authorization successful! You can close this window."))
            } else {
                Err(warp::reject::custom(OAuthError("No code parameter found".to_string())))
            }
        });

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();
    
    let server = warp::serve(redirect_route);
    let (_addr, server) = server.bind_with_graceful_shutdown(
        ([127, 0, 0, 1], 35435),
        async {
            shutdown_rx.await.ok();
        },
    );

    tokio::spawn(server);

    let auth_url = format!(
        "https://github.com/login/oauth/authorize?client_id={}&scope=repo,user&redirect_uri=http://localhost:35435/gh_auth_callback",
        github_client_id
    );

    // println!("Open this URL in your browser: {}", auth_url);

    open_url(auth_url);

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

    // println!("response: {:?}", response);

    if response.status().is_success() {
        let token_response: GitHubAccessTokenResponse = response
            .json()
            .await
            .map_err(|e| {
                eprintln!("Failed to deserialize JSON: {:?}", e); // Print the deserialization error
                e.to_string()
            })?;

        // Store the token in the config
        cfg.github_token = token_response.access_token.clone();
        
        let user_res = client
            .get("https://api.github.com/user")
            .header("Accept", "application/vnd.github+json")
            .header("Authorization", format!("Bearer {}", cfg.github_token))
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "SiftAI-Rust-Client")
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if user_res.status().is_success() {
            // Deserialize the JSON response to the GitHubUserResponse struct.
            let user_data: GitHubUserResponse = user_res
                .json()
                .await
                .map_err(|e| {
                    eprintln!("Failed to deserialize User JSON: {:?}", e); // Print the deserialization error
                    e.to_string()
                })?;

            cfg.github_username = user_data.login.clone();
        } else {
            eprintln!("Failed to get user data: {:?}", user_res);
            let error_text = user_res.text().await.unwrap_or_else(|_| "No error text".to_string());
            eprintln!("Error details: {}", error_text);
        }

        println!("github token: {}", cfg.github_token);
        util::write_config(cfg).unwrap();

        Ok(token_response.access_token)
    } else {
        Err("Error: Unable to get access token".to_string())
    }
}



pub async fn slack_oauth() -> Result<String, String> {
    let slack_client_id = "7906164823108.7891603819943";
    let slack_client_secret = "4cd4649f28472fb5d5299f85e8696ed0";

    let mut cfg = util::read_config().unwrap();

    // Return the token if it already exists
    if !cfg.slack_token.is_empty() {
        return Ok(cfg.slack_token);
    }

    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(1);

    // Define the redirect route to handle the callback
    let redirect_route = warp::path!("slk_auth_callback")
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(warp::any().map(move || tx.clone())) // Move tx into the warp handler
        .and_then(|params: std::collections::HashMap<String, String>, tx: tokio::sync::mpsc::Sender<String>| async move {
            if let Some(code) = params.get("code") {
                tx.send(code.clone()) // Send the code to the main handler
                    .await
                    .map_err(|e| warp::reject::custom(OAuthError(e.to_string())))?;
                Ok::<_, warp::Rejection>(warp::reply::html("Authorization successful! You can close this window."))
            } else {
                Err(warp::reject::custom(OAuthError("No code parameter found".to_string())))
            }
        });

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();
    
    // Start the Warp server with graceful shutdown
    let server = warp::serve(redirect_route)
        .tls()
        .cert_path("./cert.pem")
        .key_path("./key.pem");
    let (_addr, server_fut) = server.bind_with_graceful_shutdown(
        ([127, 0, 0, 1], 35439),
        async {
            shutdown_rx.await.ok();
        },
    );

    // Spawn the Warp server
    tokio::spawn(server_fut);

    // Define the OAuth scopes required by your Slack bot
    let scopes = "app_mentions:read,channels:read,files:read,links:read,remote_files:read";

    // Slack authorization URL with redirect_uri pointing to the Warp server
    let auth_url = format!(
        "https://slack.com/oauth/v2/authorize?client_id={}&scope={}&redirect_uri=https://localhost:35439/slk_auth_callback",
        slack_client_id, scopes
    );

    // Open the authorization URL in the browser
    open_url(auth_url);

    // Wait for the authorization code from the callback
    let slack_authorization_code = match rx.recv().await {
        Some(code) => {
            println!("Received authorization code: {}", code);
            code  // If the code is received successfully, continue.
        },
        None => {
            let error_message = "Failed to receive authorization code".to_string();
            eprintln!("Error: {}", error_message);
            return Err(error_message);  // Log and return the error if no code is received.
        }
    };

    // Shutdown the Warp server after receiving the code
    let _ = shutdown_tx.send(());

    // Exchange the authorization code for an access token
    let client = reqwest::Client::new();
    let token_url = "https://slack.com/api/oauth.v2.access";

    let params = [
        ("client_id", slack_client_id),
        ("client_secret", slack_client_secret),
        ("code", slack_authorization_code.as_str()),
        ("redirect_uri", "https://localhost:35439/slk_auth_callback")
    ];

    let response = client
        .post(token_url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&params)
        .send()
        .await
        .map_err(|e| {
            eprintln!("Error occurred: {}", e.to_string());
            e.to_string()
        })?;

    if response.status().is_success() {

        let token_response: SlackAccessTokenResponse = response
            .json()
            .await
            .map_err(|e| {
                eprintln!("Failed to deserialize JSON: {:?}", e);
                e.to_string()
            })?;

        // // Store the access token in the configuration
        cfg.slack_token = token_response.access_token.clone();
        util::write_config(cfg).unwrap();

        println!("Slack authentication successful!");

        Ok(token_response.access_token)
    } else {
        let error_text = response.text().await.unwrap_or_else(|_| "No error text".to_string());
        Err(format!("Error: Unable to get access token. {}", error_text))
    }
}