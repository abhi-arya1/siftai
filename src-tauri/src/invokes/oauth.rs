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
    scope: String,
    user: GitHubUserResponse,
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
                Ok::<_, warp::Rejection>(warp::reply::html("Authorization code received. You can close this window."))
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

        println!("HERE");
        let token_response: GitHubAccessTokenResponse = response
            .json()
            .await
            .map_err(|e| e.to_string())?;

        // Store the token in the config
        cfg.github_token = token_response.access_token.clone();
        cfg.github_username = token_response.user.login.clone();

        println!("github token: {}, github_username: {}", cfg.github_token, cfg.github_username);
        util::write_config(cfg).unwrap();

        Ok(token_response.access_token)
    } else {
        Err("Error: Unable to get access token".to_string())
    }
}