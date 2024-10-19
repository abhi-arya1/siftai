# Rust-based Ports

(all hosted on `localhost:{PORT}`)

- 35435 - GitHub OAuth
   - Run this by invoking `gh_oauth` from the Next.js Frontend

- 35436 - Chroma Database
   - Persistently Running 

- 35438 - File Server API
   - Run this by requesting `http://localhost:35438/path/to/file` from the Next.js Frontend
   - The path must be beyond the user's HOME directory. 
    - For example, if the abs path is `/Users/name/Documents/file.txt`, the path should be `/Documents/file.txt`

- 35439 - Slack OAuth 
  - Run this by invoking `slk_oauth` from the Next.js frontend