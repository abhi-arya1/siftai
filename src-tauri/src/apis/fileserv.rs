use actix_files::NamedFile;
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer, Responder};
use std::env;
use std::path::{Path, PathBuf};

// use std::path::PathBuf;

async fn get_file(req: HttpRequest, path: web::Path<PathBuf>) -> impl Responder {
    let home_dir = match env::var("HOME") {
        Ok(dir) => dir,
        Err(_) => {
            return HttpResponse::InternalServerError().body("Failed to retrieve home directory")
        }
    };

    let full_path = Path::new(&home_dir).join(path.into_inner());

    if !full_path.exists() || full_path.is_dir() {
        return HttpResponse::NotFound().body(format!("File not found, {}", full_path.display()));
    }

    match NamedFile::open(full_path.as_ref() as &Path) {
        Ok(named_file) => named_file.into_response(&req),
        Err(_) => HttpResponse::InternalServerError().body("Failed to open file"),
    }
}

// pub async fn serve(m) {
//     let server = HttpServer::new(|| {
//         App::new()
//             // Your services go here...
//     })
//     .bind("127.0.0.1:3456")
//     .expect("Failed to bind server");

//     tokio::select! {
//         _ = server.run() => {
//             println!("Server finished running.");
//         }
//         _ = &mut shutdown => {
//             println!("Received shutdown signal.");
//         }
//     }
// }

pub async fn serve() -> std::io::Result<()> {
    let server = HttpServer::new(|| {
        App::new().service(web::resource("/{path:.*}").route(web::get().to(get_file)))
    })
    .bind("127.0.0.1:35438")?;

    println!("File Services Running on http://localhost:35438");
    server.run().await
    // tokio::select! {
    //     _ = server.run() => {
    //         println!("Server finished running.");
    //         Ok(())
    //     }
    //     _ = &mut shutdown => {
    //         println!("Received shutdown signal.");
    //         Ok(())
    //     }
    // }
}
