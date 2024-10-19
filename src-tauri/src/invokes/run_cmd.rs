

pub fn run_cmd(command: String) -> Result<String, String> {
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
