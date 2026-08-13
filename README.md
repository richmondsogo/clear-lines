# Clear Lines

Clear Lines is a focused, offline-first Tauri v2 desktop notes app.
It gives a quiet writing surface, local storage, and fast search.

This README follows a simple structure: quick start, development, build,
project layout, and troubleshooting. It uses short sentences and clear
instructions so you can pick this up later.

Contents
- Quick start
- Development (web and desktop)
- Build & package
- Project layout
- Key files and code notes
- Troubleshooting
- Contributing

Quick start

Prerequisites
- Node.js 20+ and npm
- Rust (stable) and tooling for Tauri (only required to build the desktop app)
  - On Windows install Visual Studio Build Tools with "Desktop development
    with C++" (MSVC) workload.

Fast local test (web only)
1. npm install
2. npm run dev
3. Open the URL printed by Vite (typically http://localhost:5173 or 1420)

Run the native desktop app (dev)
1. npm install
2. npx tauri dev

Notes
- Use the web dev server (`npm run dev`) for fast UI iteration. It supports
  hot module reloading.
- `npx tauri dev` compiles the Rust backend and launches a native window. It
  is slower but required to test native APIs.

Build and package

1. npm install
2. npm run build        # builds web assets (tsc + vite)
3. npx tauri build      # builds native bundles (installer/executable)

Common options
- Build for a specific target (example Windows x64):
  npx tauri build --target x86_64-pc-windows-msvc

Where to find artifacts
- After a successful `npx tauri build`, artifacts are under:
  `src-tauri/target/release/bundle/` and a platform-specific subfolder.

Project layout

- src/ — front-end (React + TypeScript)
- src-tauri/ — Rust backend for Tauri
- package.json — npm scripts
- README.md — this document

Key files and important code notes

src/App.tsx
- WindowControls component
  - Manages minimize, maximize, and close buttons for the custom titlebar.
  - Uses Tauri's window APIs. Primary path: calls Rust commands via
    `@tauri-apps/api/core` (invoke). If that fails, it falls back to the
    JavaScript window API from `@tauri-apps/api/window`.
  - The component opts out of the drag region for the buttons so clicks work
    correctly on Windows.

- Titlebar dragging
  - The titlebar uses explicit JS dragging: on mousedown the front end calls
    `getCurrentWindow().startDragging()` when the user drags the titlebar.
  - This avoids nested drag-region issues on Windows while allowing buttons to
    remain clickable.

src-tauri/src/lib.rs
- Rust command handlers are registered with Tauri's invoke handler.
  - `minimize_window` — minimize the main window
  - `toggle_maximize` — toggle maximize / unmaximize and return the new state
  - `close_window` — close the main window
  - `is_maximized` — return whether the window is maximized

Troubleshooting

1) Vite port already in use
- Use: npx kill-port 1420
- Or find and stop the PID: `netstat -ano | findstr :1420` and `Stop-Process -Id <PID> -Force`

2) Native build errors on Windows
- Install Visual Studio Build Tools → "Desktop development with C++".
- Ensure Rust toolchain is installed and updated: `rustup update`
- Run `cargo check --manifest-path src-tauri/Cargo.toml` to see native errors.

3) Runtime errors calling window APIs
- The front end first calls Rust commands (invoke). If invoke fails, the code
  falls back to `getCurrentWindow()` calls. Check DevTools console and the
  terminal that runs `npx tauri dev` for error details.

Contributing

- Create a branch: `git checkout -b feat/short-description`
- Run tests & build: `npm run test` and `npm run build`
- Open a PR against `main`

License & privacy
- The app stores all data locally. It does not send notes or preferences to
  any external service.

If you want, I can:
- Add more inline comments in specific files
- Add a short HOWTO for signing Windows installers
- Create a small developer checklist in the repo

End of README
