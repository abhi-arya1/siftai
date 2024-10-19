use serde::Deserialize;
use reqwest::Client;
use tokio::sync::mpsc;
use warp::Filter;
use warp::reply::html;
use warp::http::Uri;
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
struct GitHubAccessTokenResponse {
    access_token: String,
    token_type: String,
    scope: String,
}

pub async fn github_oauth() -> Result<String, String> {
    let mut cfg = util::read_config().unwrap();

    if !cfg.github_token.is_empty() {
        return Ok(cfg.github_token);
    }

    let github_client_id = "Ov23liOMmuWUdFA35oZl";
    let github_client_secret = "50b43b1fab7fd17c4f3acf754268ddcddfa34fc5";

    let (tx, mut rx) = mpsc::channel::<String>(1);

    // Route to handle the GitHub OAuth callback and extract the code
    let redirect_route = warp::path!("gh_auth_callback")
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(warp::any().map(move || tx.clone()))
        .and_then(|params: std::collections::HashMap<String, String>, 
                  tx: mpsc::Sender<String>| async move {
            if let Some(code) = params.get("code") {
                tx.send(code.clone())
                    .await
                    .map_err(|e| warp::reject::custom(OAuthError(e.to_string())))?;
                // Redirect to close the browser tab
                Ok::<_, warp::Rejection>(warp::redirect::see_other(Uri::from_static("/close")))
            } else {
                Err(warp::reject::custom(OAuthError("No code parameter found".to_string())))
            }
        });

    // Route to serve the "window.close()" script to close the browser tab
    let close_tab_route = warp::path!("close")
        .map(|| {
            html(
                r#"
                    <script>
                        window.close();
                    </script>
                    <p>If this window does not close automatically, you may close it manually.</p>
                "#,
            )
        });

    // Combine both routes
    let routes = redirect_route.or(close_tab_route);

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

    // Start the server
    let server = warp::serve(routes);
    let (_addr, server) = server.bind_with_graceful_shutdown(
        ([127, 0, 0, 1], 35435),
        async {
            shutdown_rx.await.ok();
        },
    );

    tokio::spawn(server);

    // Step 1: Open the authorization URL in the user's browser
    let auth_url = format!(
        "https://github.com/login/oauth/authorize?client_id={}&scope=repo,user&redirect_uri=http://localhost:34565/gh_auth_callback",
        github_client_id
    );

    open_url(auth_url);

    // Step 2: Wait for the authorization code from the local server
    let github_authorization_code = rx.recv()
        .await
        .ok_or("Failed to receive authorization code".to_string())?;

    // Step 3: Exchange the authorization code for an access token
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

        // Store the token in the config
        cfg.github_token = token_response.access_token.clone();
        util::write_config(cfg).unwrap();

        // Shutdown the server after 2 seconds to ensure the browser can reach /close
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        let _ = shutdown_tx.send(());

        Ok(token_response.access_token)
    } else {
        Err("Error: Unable to get access token".to_string())
    }
}
