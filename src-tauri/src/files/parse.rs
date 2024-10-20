use dirs;
use ignore::{WalkBuilder, WalkState};
use serde_json::to_writer_pretty;
use std::path::PathBuf;
use std::time::Instant;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::fs::{File, OpenOptions};
use std::io::{self, BufReader, Read};
use base64;
use crossbeam_channel::bounded;
use threadpool::ThreadPool;

use crate::chroma;
use crate::util::db_formatted_path;

#[derive(Debug, Clone, serde::Serialize)] // Add Serialize for FileMetadata
pub struct FileMetadata { 
    filepath: String,
    filename: String,
    extension: String,
    size: u64
}

pub fn parse_files() {
    let home_dir = dirs::home_dir().expect("Failed to get home directory");
    let library_dir = home_dir.join("Library");

    let start = Instant::now();

    let documents = Arc::new(Mutex::new(Vec::new()));
    let metadata = Arc::new(Mutex::new(Vec::new()));
    let ids = Arc::new(Mutex::new(Vec::new()));  // Array for unique file IDs
    let file_count = Arc::new(AtomicUsize::new(0)); // File counter to track the total files

    let walker = WalkBuilder::new(&home_dir)
        .hidden(true)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .filter_entry(move |entry| {
            let path = entry.path();

            if path == library_dir {
                return false;
            }

            if path.file_name().map_or(false, |name| name == "venv" || name == ".venv") {
                return false;
            }

            true
        })
        .build_parallel();

    let (sender, receiver): (crossbeam_channel::Sender<PathBuf>, crossbeam_channel::Receiver<PathBuf>) = bounded(1000);
    let pool = ThreadPool::new(num_cpus::get());

    // Processing thread to handle file paths from the receiver
    let processing_thread = {
        let documents = Arc::clone(&documents);
        let metadata = Arc::clone(&metadata);
        let ids = Arc::clone(&ids);
        let file_count = Arc::clone(&file_count);

        std::thread::spawn(move || {
            while let Ok(path) = receiver.recv() {
                let documents = Arc::clone(&documents);
                let ids = Arc::clone(&ids);
                let metadata = Arc::clone(&metadata);
                let file_count = Arc::clone(&file_count);

                pool.execute(move || {
                    // Exclude files with certain extensions
                    let excluded_extensions = [
                        "dmg", "zip", "xls", "xlsx", "csv", "tar", "gz", "bz2", "xz", "7z", "rar", "iso", "exe", "dll", "bin",
                        "so", "obj", "class", "o", "pyc", "lock", "log", "tmp", "config", "cfg", "ini",
                        "plist", "db", "db-wal", "db-shm",
                    ];
                    let extension = path
                        .extension()
                        .and_then(|ext| ext.to_str())
                        .unwrap_or("")
                        .to_lowercase();

                    if excluded_extensions.contains(&extension.as_str()) {
                        return; // Skip this file
                    }

                    let current_id = file_count.fetch_add(1, Ordering::Relaxed).to_string(); // Generate a unique ID

                    match read_file_contents(&path) {
                        Ok(contents) => {
                            let file_metadata = extract_metadata(&path);

                            let mut docs_lock = documents.lock().unwrap();
                            let mut ids_lock = ids.lock().unwrap();
                            let mut meta_lock = metadata.lock().unwrap();

                            docs_lock.push(contents.clone());
                            ids_lock.push(current_id.clone());
                            meta_lock.push(file_metadata.clone());

                            // Run your action script on the file contents with a unique ID
                            process_file_with_action_script(contents, &file_metadata, &current_id);
                        }
                        Err(_) => {
                            if let Ok(encoded_content) = read_file_as_base64(&path) {
                                let file_metadata = extract_metadata(&path);

                                let mut docs_lock = documents.lock().unwrap();
                                let mut ids_lock = ids.lock().unwrap();
                                let mut meta_lock = metadata.lock().unwrap();

                                docs_lock.push(encoded_content.clone());
                                ids_lock.push(current_id.clone());
                                meta_lock.push(file_metadata.clone());

                                // Run your action script on the base64 encoded content with a unique ID
                                process_file_with_action_script(encoded_content, &file_metadata, &current_id);
                            }
                        }
                    }
                });
            }
        })
    };

    walker.run(|| {
        let sender = sender.clone();
        Box::new(move |entry| {
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => return WalkState::Continue,
            };

            if entry.file_type().map_or(false, |ft| ft.is_file()) {
                let path = entry.path();

                // Exclude files with certain extensions
                let excluded_extensions = [
                    "dmg", "zip", "tar", "xls", "xlsx", "csv", "gz", "bz2", "xz", "7z", "rar", "iso", "exe", "dll", "bin",
                    "so", "obj", "class", "o", "pyc", "lock", "log", "tmp", "config", "cfg", "ini",
                    "plist", "db", "db-wal", "db-shm",
                ];
                let extension = path
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .unwrap_or("")
                    .to_lowercase();

                if excluded_extensions.contains(&extension.as_str()) {
                    return WalkState::Continue; // Skip this file
                }

                let _ = sender.send(entry.into_path());
            }

            WalkState::Continue
        })
    });

    drop(sender);
    processing_thread.join().unwrap();

    let duration = start.elapsed();
    println!("Time taken to parse files: {:.2?}", duration);
    println!("Total files processed: {}", file_count.load(Ordering::Relaxed));

    // // Write the contents to JSON files
    // let docs_lock = documents.lock().unwrap();
    // let meta_lock = metadata.lock().unwrap();
    // let ids_lock = ids.lock().unwrap();

    // write_to_json("docs.json", &*docs_lock).expect("Failed to write docs.json");
    // write_to_json("ids.json", &*ids_lock).expect("Failed to write ids.json");
    // write_to_json("metas.json", &*meta_lock).expect("Failed to write metas.json");

    println!("Documents, IDs, and metadata successfully written to files.");
}

// Helper function to run your Action script on each file
fn process_file_with_action_script(content: String, metadata: &FileMetadata, file_id: &str) {
    // Replace this with your actual action script logic
    println!("Running action on file: {:?} with ID: {}", metadata, file_id);

    let action = chroma::chrapi::Action::Add {
        collection_name: "siftfiles".to_string(),
        documents: vec![content],
        ids: vec![file_id.to_string()], // Use the dynamic file ID
        metadatas: vec![metadata.clone()],
    };

    chroma::chrapi::run_python_sdk(&db_formatted_path(), &action);
}

// Helper function to write data to a JSON file
fn write_to_json<T: serde::Serialize>(file_name: &str, data: &T) -> io::Result<()> {
    let file = OpenOptions::new().write(true).create(true).truncate(true).open(file_name)?;
    to_writer_pretty(file, data)?; // Write the data in pretty JSON format
    Ok(())
}

// Helper function to read file contents as string
fn read_file_contents(path: &PathBuf) -> io::Result<String> {
    let file = File::open(path)?;
    let mut buf_reader = BufReader::new(file);
    let mut contents = String::new();
    buf_reader.read_to_string(&mut contents)?;
    Ok(contents)
}

// Helper function to read non-text files as base64-encoded string
fn read_file_as_base64(path: &PathBuf) -> io::Result<String> {
    let file = File::open(path)?;
    let mut buf_reader = BufReader::new(file);
    let mut buffer = Vec::new();
    buf_reader.read_to_end(&mut buffer)?;
    Ok(base64::encode(buffer))
}

// Helper function to extract metadata
fn extract_metadata(path: &PathBuf) -> FileMetadata {
    let filepath = path.to_string_lossy().to_string();
    let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let extension = path.extension().unwrap_or_default().to_string_lossy().to_string();
    let size = path.metadata().map(|meta| meta.len()).unwrap_or(0);

    FileMetadata {
        filepath,
        filename,
        extension,
        size,
    }
}
