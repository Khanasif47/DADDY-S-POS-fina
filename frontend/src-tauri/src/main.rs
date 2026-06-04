// DADDY's Bakery POS — Tauri shell
// This Rust file boots the React frontend inside a native window.
// The cream background (#ede7c7) and DADDY's logo splash live inside the React app
// (see /app/frontend/src/components/Splash.jsx) so the experience is identical
// whether you open the app in Chrome or as a packaged .exe.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running DADDY's POS");
}
