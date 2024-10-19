use dirs;
use ignore::{WalkBuilder, WalkState};
use std::path::PathBuf;
use std::time::Instant;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::fs::File;
use std::io::{self, BufReader, Read};
use crossbeam_channel::bounded;
use threadpool::ThreadPool;

pub fn parse_files() {
    let home_dir = dirs::home_dir().expect("Failed to get home directory");
    let library_dir = home_dir.join("Library");

    let start = Instant::now();

    let walker = WalkBuilder::new(&home_dir)
        .hidden(true)  // This will skip hidden files and directories
        .git_ignore(true)  // This will respect .gitignore files
        .git_global(true)  // This will respect global gitignore files
        .git_exclude(true)  // This will respect .git/info/exclude files
        .filter_entry(move |entry| {
            entry.path() != library_dir
        })
        .build_parallel();

    let file_count = Arc::new(AtomicUsize::new(0));
    let (sender, receiver) = bounded(1000);
    let pool = ThreadPool::new(num_cpus::get());

    let processing_thread = std::thread::spawn(move || {
        while let Ok(_) = receiver.recv() {
            pool.execute(move || {
                // match read_file_contents(&path) {
                //     Ok(contents) => {
                //         // Process file contents here
                //         // println!("Read file: {} ({} bytes)", path.display(), contents.len());
                //     }
                //     Err(e) => eprintln!("Error reading file {}: {}", path.display(), e),
                // }
            });
        }
    });

    walker.run(|| {
        let file_count = Arc::clone(&file_count);
        let sender = sender.clone();
        Box::new(move |entry| {
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => return WalkState::Continue,
            };

            if entry.file_type().map_or(false, |ft| ft.is_file()) {
                file_count.fetch_add(1, Ordering::Relaxed);
                let _ = sender.send(entry.into_path());
            }

            WalkState::Continue
        })
    });

    drop(sender); // Close the channel
    processing_thread.join().unwrap();

    let duration = start.elapsed();
    println!("Time taken to parse files: {:.2?}", duration);
    println!("Total files processed: {}", file_count.load(Ordering::Relaxed));
}

fn read_file_contents(path: &PathBuf) -> io::Result<String> {
    let file = File::open(path)?;
    let mut buf_reader = BufReader::new(file);
    let mut contents = String::new();
    buf_reader.read_to_string(&mut contents)?;
    Ok(contents)
}