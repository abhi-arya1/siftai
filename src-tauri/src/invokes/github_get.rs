use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct Repo {
    name: String,
}

#[derive(Deserialize, Debug)]
struct File {
    name: String,
    path: String,
    // Other fields...
}

pub async fn get_repos_and_files(access_token: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    let mut headers = HeaderMap::new();
    let auth_value = format!("token {}", access_token);
    headers.insert(AUTHORIZATION, HeaderValue::from_str(&auth_value).map_err(|e| e.to_string())?);

    // 1. Get repositories
    let repos_url = "https://api.github.com/user/repos";
    let repos: Vec<Repo> = client
        .get(repos_url)
        .headers(headers.clone())
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    // Collect output in a string
    let mut output = String::new();

    // Iterate through each repository
    for repo in repos {
        output.push_str(&format!("Repository: {}\n", repo.name));

        // 2. Get files in the repository (assuming main branch)
        let files_url = format!("https://api.github.com/repos/{}/contents/", repo.name);
        let files: Vec<File> = client
            .get(&files_url)
            .headers(headers.clone())
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json()
            .await
            .map_err(|e| e.to_string())?;

        // List each file in the repository
        for file in files {
            output.push_str(&format!(" - File: {} (Path: {})\n", file.name, file.path));
        }
    }

    Ok(output)
}
