use base64::encode;
use open;
use reqwest::Client;
use serde::Deserialize;
use warp::Filter;
use std::collections::HashMap;
use tokio::sync::mpsc;
use urlencoding;
use std::env;
use dotenv::dotenv;

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
    scope: String,
}

#[derive(Deserialize, Debug)]
struct SlackAccessTokenResponse {
    access_token: String,
}

#[derive(Deserialize, Debug)]
struct DiscordAccessTokenResponse {
    access_token: String,
}

pub async fn github_oauth() -> Result<String, String> {
    dotenv().ok();
    let mut client_id: String = String::new();
    let mut client_secret: String = String::new();

    match env::var("GITHUB_CLIENT_ID") {
        Ok(value) => {
            client_id = value; 
        },
        Err(e) => println!("Couldn't read GITHUB_CLIENT_ID: {}", e),
    };

    match env::var("GITHUB_CLIENT_SECRET") {
        Ok(value) => {
            client_secret = value;
        },
        Err(e) => println!("Couldn't read GITHUB_CLIENT_SECRET: {}", e),
    };

    let mut cfg = util::read_config().unwrap();
    let github_client_id: &str = client_id.as_str();
    let github_client_secret: &str = client_secret.as_str();

    if !cfg.github_token.is_empty() {
        return Ok(cfg.github_token);
    }

    let (tx, mut rx) = mpsc::channel::<String>(1);

    let html_content = include_str!("../.././auth_page.html");

    let redirect_route = warp::path!("gh_auth_callback")
        .and(warp::query::raw())
        .and(warp::any().map(move || tx.clone()))
        .and_then(move |params: String, tx: mpsc::Sender<String>| {
            let html_content = html_content.to_string();
            async move {
                let params: HashMap<String, String> = serde_qs::from_str(&params)
                    .map_err(|e| warp::reject::custom(OAuthError(e.to_string())))?;

                if let Some(code) = params.get("code") {
                    tx.send(code.clone())
                        .await
                        .map_err(|e| warp::reject::custom(OAuthError(e.to_string())))?;
                    Ok::<_, warp::Rejection>(warp::reply::html(html_content))
                } else {
                    Err(warp::reject::custom(OAuthError(
                        "No code parameter found".to_string(),
                    )))
                }
            }
        });

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

    let server = warp::serve(redirect_route);
    let (_addr, server) = server.bind_with_graceful_shutdown(([127, 0, 0, 1], 35435), async {
        shutdown_rx.await.ok();
    });

    tokio::spawn(server);

    let auth_url = format!(
        "https://github.com/login/oauth/authorize?client_id={}&scope=repo,user&redirect_uri=http://localhost:35435/gh_auth_callback",
        github_client_id
    );

    // println!("Open this URL in your browser: {}", auth_url);

    open_url(auth_url);

    // Step 2: Wait for the authorization code from the local server
    let github_authorization_code = rx
        .recv()
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
        let token_response: GitHubAccessTokenResponse = response.json().await.map_err(|e| {
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
            let user_data: GitHubUserResponse = user_res.json().await.map_err(|e| {
                eprintln!("Failed to deserialize User JSON: {:?}", e); // Print the deserialization error
                e.to_string()
            })?;

            cfg.github_username = user_data.login.clone();
        } else {
            eprintln!("Failed to get user data: {:?}", user_res);
            let error_text = user_res
                .text()
                .await
                .unwrap_or_else(|_| "No error text".to_string());
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
    dotenv().ok();
    let mut client_id: String = String::new();
    let mut client_secret: String = String::new();

    match env::var("SLACK_CLIENT_ID") {
        Ok(value) => {
            client_id = value; 
        },
        Err(e) => println!("Couldn't read SLACK_CLIENT_ID: {}", e),
    };

    match env::var("SLACK_CLIENT_SECRET") {
        Ok(value) => {
            client_secret = value;
        },
        Err(e) => println!("Couldn't read SLACK_CLIENT_SECRET: {}", e),
    };

    let mut cfg = util::read_config().unwrap();
    let slack_client_id: &str = client_id.as_str();
    let slack_client_secret: &str = client_secret.as_str();

    // Return the token if it already exists
    if !cfg.slack_token.is_empty() {
        return Ok(cfg.slack_token);
    }

    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(1);

    // Define the redirect route to handle the callback
    let redirect_route = warp::path!("slk_auth_callback")
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(warp::any().map(move || tx.clone())) // Move tx into the warp handler
        .and_then(
            |params: std::collections::HashMap<String, String>,
             tx: tokio::sync::mpsc::Sender<String>| async move {
                if let Some(code) = params.get("code") {
                    tx.send(code.clone()) // Send the code to the main handler
                        .await
                        .map_err(|e| warp::reject::custom(OAuthError(e.to_string())))?;
                    Ok::<_, warp::Rejection>(warp::reply::html(
                        "Authorization successful! You can close this window.",
                    ))
                } else {
                    Err(warp::reject::custom(OAuthError(
                        "No code parameter found".to_string(),
                    )))
                }
            },
        );

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

    // Start the Warp server with graceful shutdown
    let server = warp::serve(redirect_route)
        .tls()
        .cert_path("./cert.pem")
        .key_path("./key.pem");
    let (_addr, server_fut) = server.bind_with_graceful_shutdown(([127, 0, 0, 1], 35439), async {
        shutdown_rx.await.ok();
    });

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
            code // If the code is received successfully, continue.
        }
        None => {
            let error_message = "Failed to receive authorization code".to_string();
            eprintln!("Error: {}", error_message);
            return Err(error_message); // Log and return the error if no code is received.
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
        ("redirect_uri", "https://localhost:35439/slk_auth_callback"),
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
        let token_response: SlackAccessTokenResponse = response.json().await.map_err(|e| {
            eprintln!("Failed to deserialize JSON: {:?}", e);
            e.to_string()
        })?;

        // // Store the access token in the configuration
        cfg.slack_token = token_response.access_token.clone();
        util::write_config(cfg).unwrap();

        println!("Slack authentication successful!");

        Ok(token_response.access_token)
    } else {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "No error text".to_string());
        Err(format!("Error: Unable to get access token. {}", error_text))
    }
}

pub async fn notion_oauth() -> Result<String, String> {
    dotenv().ok();
    let mut client_id: String = String::new();
    let mut client_secret: String = String::new();

    match env::var("NOTION_CLIENT_ID") {
        Ok(value) => {
            client_id = value; 
        },
        Err(e) => println!("Couldn't read NOTION_CLIENT_ID: {}", e),
    };

    match env::var("NOTION_SECRET") {
        Ok(value) => {
            client_secret = value;
        },
        Err(e) => println!("Couldn't read NOTION_SECRET: {}", e),
    };

    let mut cfg = util::read_config().unwrap();
    let notion_client_id: &str = client_id.as_str();
    let notion_secret: &str = client_secret.as_str();

    // Return the token if it already exists
    if !cfg.notion_token.is_empty() {
        return Ok(cfg.notion_token);
    }

    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(1);

    // Define the redirect route to handle the callback
    let redirect_route = warp::path!("ntn_oauth_callback")
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(warp::any().map(move || tx.clone())) // Move tx into the warp handler
        .and_then(
            |params: std::collections::HashMap<String, String>,
             tx: tokio::sync::mpsc::Sender<String>| async move {
                if let Some(code) = params.get("code") {
                    println!("Received code: {}", code);
                    tx.send(code.clone()) // Send the code to the main handler
                        .await
                        .map_err(|e| warp::reject::custom(OAuthError(e.to_string())))?;
                    Ok::<_, warp::Rejection>(warp::reply::html(
                        "Authorization successful! You can close this window.",
                    ))
                } else {
                    Err(warp::reject::custom(OAuthError(
                        "No code parameter found".to_string(),
                    )))
                }
            },
        );

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

    // Start the Warp server with graceful shutdown
    let server = warp::serve(redirect_route);
    let (_addr, server_fut) = server.bind_with_graceful_shutdown(([127, 0, 0, 1], 35441), async {
        shutdown_rx.await.ok();
    });

    // Spawn the Warp server
    tokio::spawn(server_fut);

    let auth_url = format!("https://api.notion.com/v1/oauth/authorize?client_id={}&response_type=code&owner=user&redirect_uri=http%3A%2F%2Flocalhost%3A35441%2Fntn_oauth_callback",
        notion_client_id,
    );

    open_url(auth_url);

    // Wait for the authorization code from the callback
    let notion_auth_code = match rx.recv().await {
        Some(code) => {
            println!("Received authorization code: {}", code);
            code // If the code is received successfully, continue.
        }
        None => {
            let error_message = "Failed to receive authorization code".to_string();
            eprintln!("Error: {}", error_message);
            return Err(error_message); // Log and return the error if no code is received.
        }
    };

    // Shutdown the Warp server after receiving the code
    let _ = shutdown_tx.send(());

    // Exchange the authorization code for an access token
    let client = reqwest::Client::new();

    let encoded = encode(format!("{}:{}", notion_client_id, notion_secret));
    let token_url = "https://api.notion.com/v1/oauth/token";

    let params = [
        ("grant_type", "authorization_code"),
        ("code", notion_auth_code.as_str()),
        ("redirect_uri", "http://localhost:35441/ntn_oauth_callback"),
    ];

    let response = client
        .post(token_url)
        .header("Authorization", format!("Basic {}", encoded))
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .form(&params)
        .send()
        .await
        .map_err(|e| {
            eprintln!("Error occurred: {}", e.to_string());
            e.to_string()
        })?;

    if response.status().is_success() {
        // println!("response: {:?}", response.text().await.unwrap());

        let token_response: SlackAccessTokenResponse = response.json().await.map_err(|e| {
            eprintln!("Failed to deserialize JSON: {:?}", e);
            e.to_string()
        })?;

        // // Store the access token in the configuration
        cfg.notion_token = token_response.access_token.clone();
        util::write_config(cfg).unwrap();

        println!("Notion authentication successful!");

        Ok(token_response.access_token)
        // Ok("test".to_string())
    } else {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "No error text".to_string());
        Err(format!("Error: Unable to get access token. {}", error_text))
    }
}

pub async fn discord_oauth() -> Result<String, String> {
    dotenv().ok();
    let mut client_id: String = String::new();
    let mut client_secret: String = String::new();

    match env::var("DISCORD_CLIENT_ID") {
        Ok(value) => {
            client_id = value; 
        },
        Err(e) => println!("Couldn't read DISCORD_CLIENT_ID: {}", e),
    };

    match env::var("DISCORD_CLIENT_SECRET") {
        Ok(value) => {
            client_secret = value;
        },
        Err(e) => println!("Couldn't read DISCORD_CLIENT_SECRET: {}", e),
    };

    let mut cfg = util::read_config().unwrap();
    let discord_client_id: &str = client_id.as_str();
    let discord_client_secret: &str = client_secret.as_str();

    // Return the token if it already exists
    if !cfg.discord_token.is_empty() {
        return Ok(cfg.discord_token);
    }

    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(1);

    // Define the redirect route to handle the callback
    let redirect_route = warp::path!("disc_auth_callback")
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(warp::any().map(move || tx.clone())) // Move tx into the warp handler
        .and_then(
            |params: std::collections::HashMap<String, String>,
             tx: tokio::sync::mpsc::Sender<String>| async move {
                if let Some(code) = params.get("code") {
                    tx.send(code.clone()) // Send the code to the main handler
                        .await
                        .map_err(|e| warp::reject::custom(OAuthError(e.to_string())))?;
                    Ok::<_, warp::Rejection>(warp::reply::html(
                        "Authorization successful! You can close this window.",
                    ))
                } else {
                    Err(warp::reject::custom(OAuthError(
                        "No code parameter found".to_string(),
                    )))
                }
            },
        );

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

    // Start the Warp server with graceful shutdown
    let server = warp::serve(redirect_route)
        .tls()
        .cert_path("./cert.pem")
        .key_path("./key.pem");
    let (_addr, server_fut) = server.bind_with_graceful_shutdown(([127, 0, 0, 1], 35440), async {
        shutdown_rx.await.ok();
    });

    // Spawn the Warp server
    tokio::spawn(server_fut);

    // Define the OAuth scopes required by your Slack bot
    // let scopes = "identify%20messages.read+dm_channels.read";
    let encoded_url = urlencoding::encode("https://localhost:35440/disc_auth_callback");

    // Slack authorization URL with redirect_uri pointing to the Warp server
    let auth_url = format!(
        "https://discord.com/oauth2/authorize?response_type=code&client_id={}&scope=identify%20messages.read&redirect_uri={}",
        discord_client_id, encoded_url
    );

    // Open the authorization URL in the browser
    open_url(auth_url);

    // Wait for the authorization code from the callback

    let discord_authorization_code = match rx.recv().await {
        Some(code) => {
            println!("Received authorization code: {}", code);
            code // If the code is received successfully, continue.
        }
        None => {
            let error_message = "Failed to receive authorization code".to_string();
            eprintln!("Error: {}", error_message);
            return Err(error_message); // Log and return the error if no code is received.
        }
    };

    // Shutdown the Warp server after receiving the code
    let _ = shutdown_tx.send(());

    // Exchange the authorization code for an access token
    let client = reqwest::Client::new();
    let token_url = "https://discord.com/api/oauth2/token";

    let params = [
        ("client_id", discord_client_id),
        ("client_secret", discord_client_secret),
        ("code", discord_authorization_code.as_str()),
        ("redirect_uri", "https://localhost:35440/disc_auth_callback"),
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
        let token_response: DiscordAccessTokenResponse = response.json().await.map_err(|e| {
            eprintln!("Failed to deserialize JSON: {:?}", e);
            e.to_string()
        })?;

        // // Store the access token in the configuration
        cfg.discord_token = token_response.access_token.clone();
        util::write_config(cfg).unwrap();

        println!("Discord authentication successful!");

        Ok(token_response.access_token)
    } else {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "No error text".to_string());
        Err(format!("Error: Unable to get access token. {}", error_text))
    }
}

pub async fn google_oauth() -> Result<String, String> {
    dotenv().ok();
    let mut client_id: String = String::new();
    let mut client_secret: String = String::new();

    match env::var("GOOGLE_CLIENT_ID") {
        Ok(value) => {
            client_id = value; 
        },
        Err(e) => println!("Couldn't read GOOGLE_CLIENT_ID: {}", e),
    };

    match env::var("GOOGLE_SECRET") {
        Ok(value) => {
            client_secret = value;
        },
        Err(e) => println!("Couldn't read GOOGLE_SECRET: {}", e),
    };

    let mut cfg = util::read_config().unwrap();
    // let google_client_id: &str = google_client_id.as_str();
    // let google_secret: &str = &google_secret.as_str();

    // Return the token if it already exists
    if !cfg.google_token.is_empty() {
        return Ok(cfg.google_token);
    }

    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(1);

    // Define the redirect route to handle the callback
    let redirect_route = warp::path!("ggl_auth_callback")
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(warp::any().map(move || tx.clone())) // Move tx into the warp handler
        .and_then(
            |params: std::collections::HashMap<String, String>,
             tx: tokio::sync::mpsc::Sender<String>| async move {
                if let Some(code) = params.get("code") {
                    tx.send(code.clone()) // Send the code to the main handler
                        .await
                        .map_err(|e| warp::reject::custom(OAuthError(e.to_string())))?;
                    Ok::<_, warp::Rejection>(warp::reply::html(
                        "Authorization successful! You can close this window.",
                    ))
                } else {
                    Err(warp::reject::custom(OAuthError(
                        "No code parameter found".to_string(),
                    )))
                }
            },
        );

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

    // Start the Warp server with graceful shutdown
    let server = warp::serve(redirect_route);
    let (_addr, server_fut) = server.bind_with_graceful_shutdown(([127, 0, 0, 1], 35442), async {
        shutdown_rx.await.ok();
    });

    // Spawn the Warp server
    tokio::spawn(server_fut);

    // Define the OAuth scopes required by your Slack bot
    let scopes = "messages.read+dm_channels.read";
    let encoded_url = urlencoding::encode("http://localhost:35442/ggl_auth_callback");

    // Slack authorization URL with redirect_uri pointing to the Warp server
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A//www.googleapis.com/auth/drive.metadata.readonly&access_type=offline&include_granted_scopes=true&response_type=code&state=state_parameter_passthrough_value&redirect_uri={}&client_id={}",
        encoded_url, google_client_id
    );

    // Open the authorization URL in the browser
    open_url(auth_url);

    // Wait for the authorization code from the callback

    let ggl_auth_code = match rx.recv().await {
        Some(code) => {
            println!("Received authorization code: {}", code);
            code // If the code is received successfully, continue.
        }
        None => {
            let error_message = "Failed to receive authorization code".to_string();
            eprintln!("Error: {}", error_message);
            return Err(error_message); // Log and return the error if no code is received.
        }
    };

    // Shutdown the Warp server after receiving the code
    let _ = shutdown_tx.send(());

    // Exchange the authorization code for an access token
    let client = reqwest::Client::new();
    let token_url = "https://oauth2.googleapis.com/token";

    let params = [
        ("client_id", google_client_id),
        ("client_secret", google_secret),
        ("code", ggl_auth_code.as_str()),
        ("redirect_uri", "https://localhost:35442/ggl_auth_callback"),
        ("grant_type", "authorization_code"),
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
        println!("response: {:?}", response.text().await.unwrap());
        // let token_response: DiscordAccessTokenResponse = response
        //     .json()
        //     .await
        //     .map_err(|e| {
        //         eprintln!("Failed to deserialize JSON: {:?}", e);
        //         e.to_string()
        //     })?;

        // // // Store the access token in the configuration
        // cfg.discord_token = token_response.access_token.clone();
        // util::write_config(cfg).unwrap();

        // println!("Discord authentication successful!");

        // Ok(token_response.access_token)
        Ok("TEST".to_string())
    } else {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "No error text".to_string());
        Err(format!("Error: Unable to get access token. {}", error_text))
    }
}
