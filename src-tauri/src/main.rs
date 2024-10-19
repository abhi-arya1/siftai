#![cfg_attr(
<<<<<<< HEAD
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]


#[tauri::command]
fn run_subprocess(command: String) -> Result<String, String> {
    let output = std::process::Command::new(command)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}



fn main() {
  let context = tauri::generate_context!();
  tauri::Builder::default()
    .menu(tauri::Menu::os_default(&context.package_info().name))
    .run(context)
    .expect("error while running tauri application");
}
=======
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
  )]
  
  
  #[tauri::command]
  fn run_subprocess(command: String) -> Result<String, String> {
      let mut parts = command.split_whitespace();
      let program = parts.next().ok_or("No command provided".to_string())?;
      let args: Vec<&str> = parts.collect();
  
      let output = std::process::Command::new(program)
          .args(&args)
          .output()
          .map_err(|e| e.to_string())?;
  
      if output.status.success() {
          Ok(String::from_utf8_lossy(&output.stdout).to_string())
      } else {
          Err(String::from_utf8_lossy(&output.stderr).to_string())
      }
  }
  
  
  
  fn main() {
    let context = tauri::generate_context!();
    tauri::Builder::default()
      .invoke_handler(tauri::generate_handler![run_subprocess])
      .menu(tauri::Menu::os_default(&context.package_info().name))
      .run(context)
      .expect("error while running tauri application");
  }
  
>>>>>>> 7791a1b04f24639a4ee6eb5334daca70d6a6292d
