# Clear Lines - Windows Notes App

Clear Lines is a focused, offline-first Tauri v2 desktop notes app that
prioritizes a quiet writing surface and fast local search.

This README explains how to run and test the project locally (web UI and
desktop app), how to build and package, the project layout, and common
troubleshooting tips so you (or any other developer) can pick this up months
later.

---

## Quick answer — "How do I test it in localhost before compiling?"

- Install dependencies: `npm install`
- Start the web dev server (fast, hot-reloading): `npm run dev`
- Open the web UI in your browser at: http://localhost:5173 (Vite default)

Running `npm run dev` is usually enough to verify the UI behavior without
building the native Tauri runtime. Use `npm run tauri:dev` to run the full
desktop app (that compiles the Rust backend and launches a Tauri window).

---

## Prerequisites

- Node.js 20+ (or the version used in development)
- npm (comes with Node) or another package manager
- For the Tauri desktop app: Rust (stable) and platform build tools. See
  Tauri v2 prerequisites: https://tauri.app/v2/guides/getting-started/prerequisites

Windows-specific notes
- Install "Desktop development with C++" workload via Visual Studio Build Tools
  (required by the Rust MSVC toolchain used to build Tauri native code).
- Make sure the Rust toolchain is installed: `rustup toolchain install stable`

---

## Common local commands

- Install deps: `npm install`
- Run web UI (hot reload): `npm run dev`  -> open http://localhost:5173
- Run Tauri desktop in dev mode: `npm run tauri:dev` (builds Rust parts and
  launches the native window)
- Build web & bundle for tauri: `npm run build` then `npm run tauri:build` or
  `npx tauri build`
- Run tests: `npm run test` (uses Vitest)

Notes
- `npm run dev` is the recommended fast feedback loop. It serves the web UI
  with Vite and supports HMR (hot module replacement).
- `npm run tauri:dev` runs the whole desktop app and may require toolchains
  (Rust, C++ build tools). Expect longer startup time there because the
  native backend must compile.

---

## Project layout

- src/ — front-end web UI (React + TypeScript + Tiptap editor)
- src-tauri/ — Rust backend for the Tauri desktop app
- package.json — NPM scripts and dependencies
- README.md — this file

If you want to change UI code, start in `src/`. If you need native features or
platform APIs, look into `src-tauri/`.

---

## Testing & validation

- Unit / component tests: `npm run test`
- Type check & web build: `npm run build` (runs tsc and Vite build)
- Validate Rust project: `cargo check --manifest-path src-tauri/Cargo.toml`

---

## Troubleshooting (common issues)

1. "tauri dev" fails on Windows with linker errors:
   - Ensure Visual Studio Build Tools are installed with the "Desktop
     development with C++" workload and that the MSVC toolchain is available.
   - Run `rustup default stable` and `rustup target list --installed` to verify
     toolchain state.

2. Port conflicts when running `npm run dev`:
   - Vite usually uses 5173. If that port is already used, Vite will pick a
     different port and print the URL in the terminal.

3. Native build is slow or fails:
   - Confirm Rust is up to date (`rustup update`) and the correct target is
     installed. Check `cargo` output for the specific error.

---

## Contributing / workflow notes

- Create a branch for your work: `git checkout -b feature/short-description`
- Keep commits small and focused. When ready, push branch and open a PR.
- Run `npm run test` and `npm run build` before opening a PR to catch errors.

---

## Where data is stored

Notes and preferences are stored locally inside the Tauri webview storage
(IndexedDB / local storage depending on the implementation). The app does not
send data to any network service.

---

If anything is unclear or the environment has changed when you pick this up in
three months, run `npm run dev` and the console output from Vite is the best
place to start — it will show missing dependencies, the running URL, and
helpful hints about build failures.

Happy hacking.
