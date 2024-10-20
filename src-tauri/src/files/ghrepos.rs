use anyhow::{Context, Result};
use async_recursion::async_recursion;
use lru_cache::LruCache;
use reqwest::{header, Client};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::runtime::Runtime;
use tokio::sync::Semaphore;
use tokio::time::sleep;

use crate::util::load_config;

const MAX_CONCURRENT_REQUESTS: usize = 10;
const RATE_LIMIT: u32 = 5000;
const RATE_LIMIT_WINDOW: u64 = 3600;

struct RateLimiter {
    semaphore: Arc<Semaphore>,
    window_start: Instant,
    request_count: u32,
}

impl RateLimiter {
    fn new() -> Self {
        RateLimiter {
            semaphore: Arc::new(Semaphore::new(MAX_CONCURRENT_REQUESTS)),
            window_start: Instant::now(),
            request_count: 0,
        }
    }

    async fn acquire(&mut self) {
        let _permit = self.semaphore.acquire().await.unwrap();
        let now = Instant::now();
        if now.duration_since(self.window_start).as_secs() >= RATE_LIMIT_WINDOW {
            self.window_start = now;
            self.request_count = 0;
        }
        if self.request_count >= RATE_LIMIT {
            let sleep_duration =
                RATE_LIMIT_WINDOW - now.duration_since(self.window_start).as_secs();
            sleep(Duration::from_secs(sleep_duration)).await;
            self.window_start = Instant::now();
            self.request_count = 0;
        }
        self.request_count += 1;
    }
}

fn create_github_client(token: &str) -> Result<Client> {
    let mut headers = header::HeaderMap::new();
    headers.insert(header::AUTHORIZATION, format!("Bearer {}", token).parse()?);
    headers.insert(header::USER_AGENT, "rust-github-api-client".parse()?);
    headers.insert(header::ACCEPT, "application/vnd.github+json".parse()?);
    headers.insert("X-GitHub-Api-Version", "2022-11-28".parse()?);

    Client::builder()
        .default_headers(headers)
        .pool_max_idle_per_host(0) // Disable idle connections
        .build()
        .context("Failed to create GitHub client")
}

async fn fetch_user_repos(
    client: &Client,
    username: &str,
    rate_limiter: Arc<tokio::sync::Mutex<RateLimiter>>,
    cache: Arc<tokio::sync::Mutex<LruCache<String, Value>>>,
) -> Result<Vec<Value>> {
    let cache_key = format!("repos:{}", username);
    if let Some(cached_repos) = cache.lock().await.get_mut(&cache_key) {
        return Ok(cached_repos.as_array().unwrap_or(&Vec::new()).to_vec());
    }

    rate_limiter.lock().await.acquire().await;
    let url = format!(
        "https://api.github.com/search/repositories?q=user:{}&per_page=100",
        username
    );
    let response = client.get(&url).send().await?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "Error fetching repos: {}",
            response.status()
        ));
    }

    let data: Value = response.json().await?;
    let repos = data["items"].as_array().unwrap_or(&Vec::new()).to_vec();
    cache.lock().await.insert(cache_key, json!(repos));
    Ok(repos)
}

#[async_recursion]
async fn fetch_repo_contents(
    client: Client,
    username: String,
    repo: String,
    rate_limiter: Arc<tokio::sync::Mutex<RateLimiter>>,
    cache: Arc<tokio::sync::Mutex<LruCache<String, Value>>>,
) -> Result<Value> {
    let cache_key = format!("contents:{}:{}:", username, repo);
    if let Some(cached_contents) = cache.lock().await.get_mut(&cache_key) {
        return Ok(cached_contents.clone());
    }

    rate_limiter.lock().await.acquire().await;
    let contents_url = format!(
        "https://api.github.com/repos/{}/{}/contents",
        username, repo
    );
    let response = client.get(&contents_url).send().await?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "Error fetching repo contents: {}",
            response.status()
        ));
    }

    let contents: Value = response.json().await?;

    let mut file_contents = HashMap::new();
    for item in contents.as_array().unwrap_or(&Vec::new()) {
        if let (Some(path), Some(item_type)) = (item["path"].as_str(), item["type"].as_str()) {
            match item_type {
                "file" => {
                    let content = fetch_file_content(
                        client.clone(),
                        &username,
                        &repo,
                        path,
                        rate_limiter.clone(),
                        cache.clone(),
                    )
                    .await?;
                    file_contents.insert(path.to_string(), content);
                }
                "dir" => {
                    let sub_contents = fetch_repo_contents(
                        client.clone(),
                        username.clone(),
                        repo.clone(),
                        rate_limiter.clone(),
                        cache.clone(),
                    )
                    .await?;
                    file_contents.insert(path.to_string(), sub_contents.to_string());
                }
                _ => {
                    file_contents.insert(path.to_string(), json!(null).to_string());
                }
            }
        }
    }

    let result = json!({
        "directory_contents": contents,
        "file_contents": file_contents
    });

    cache.lock().await.insert(cache_key, result.clone());
    Ok(result)
}

async fn fetch_file_content(
    client: Client,
    username: &str,
    repo: &str,
    path: &str,
    rate_limiter: Arc<tokio::sync::Mutex<RateLimiter>>,
    cache: Arc<tokio::sync::Mutex<LruCache<String, Value>>>,
) -> Result<String> {
    let cache_key = format!("file:{}:{}:{}", username, repo, path);
    if let Some(cached_content) = cache.lock().await.get_mut(&cache_key) {
        return Ok(cached_content.as_str().unwrap_or_default().to_string());
    }

    rate_limiter.lock().await.acquire().await;
    let main_url = format!(
        "https://raw.githubusercontent.com/{}/{}/main/{}",
        username, repo, path
    );
    let master_url = format!(
        "https://raw.githubusercontent.com/{}/{}/master/{}",
        username, repo, path
    );

    let response = client.get(&main_url).send().await;
    let response = match response {
        Ok(resp) if resp.status().is_success() => resp,
        _ => {
            rate_limiter.lock().await.acquire().await;
            client.get(&master_url).send().await?
        }
    };

    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "Error fetching file content: {}",
            response.status()
        ));
    }

    let content = response
        .text()
        .await
        .context("Failed to get file content as text")?;
    cache.lock().await.insert(cache_key, json!(content.clone()));
    Ok(content)
}

async fn fetch_github_repos_and_contents(username: &str, token: &str) -> Result<Value> {
    let client = create_github_client(token)?;
    let rate_limiter = Arc::new(tokio::sync::Mutex::new(RateLimiter::new()));
    let cache = Arc::new(tokio::sync::Mutex::new(LruCache::new(1000)));

    // Fetch repositories
    let repos = fetch_user_repos(&client, username, rate_limiter.clone(), cache.clone()).await?;

    // Fetch contents for each repository
    let mut repo_contents = HashMap::new();
    for repo in repos.iter() {
        let repo_name = repo["name"].as_str().unwrap_or_default().to_string();
        let contents = fetch_repo_contents(
            client.clone(),
            username.to_string(),
            repo_name.clone(),
            rate_limiter.clone(),
            cache.clone(),
        )
        .await?;
        repo_contents.insert(repo_name, contents);
    }

    Ok(json!({
        "repos": repos,
        "contents": repo_contents
    }))
}

pub fn get_gh_repos() -> Result<String> {
    println!("HERE");

    let app_cfg = load_config().unwrap();
    let username = app_cfg.github_username;
    let token = app_cfg.github_token;

    println!("Fetching GitHub repos and contents for user: {}", username);

    // Create a new Tokio runtime
    let runtime = Runtime::new().context("Failed to create Tokio runtime")?;

    // Run the async function to completion on the runtime
    let result = runtime.block_on(fetch_github_repos_and_contents(
        username.as_str(),
        token.as_str(),
    ))?;
    println!("{}", serde_json::to_string_pretty(&result)?);

    Ok("Test".to_string())
}
