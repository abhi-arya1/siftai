

fn gh_auth() {
    tokio::spawn(async move {
        let redirect_route = warp::path!("callback")
            .and(warp::query::<std::collections::HashMap<String, String>>())
            .map(move |params: std::collections::HashMap<String, String>| {
                if let Some(code) = params.get("code") {
                    tx.send(code.clone()).unwrap();
                    format!("Authorization code received. You can close this window.")
                } else {
                    "Authorization code missing!".to_string()
                }
            });

        warp::serve(redirect_route)
            .run(([127, 0, 0, 1], 8080))
            .await;
    });
}