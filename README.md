# Clear Lines

A focused, offline-first notes app for the desktop.

Clear Lines gives you a quiet writing surface with local storage and fast search. No account, no cloud, no sync service watching over your notes. Just a fast native window that opens when you need it and gets out of the way otherwise.

Built with Tauri v2, React, and TypeScript.

## Download

**Want to use Clear Lines without setting up the development environment?**

Download the latest Windows installer from **[GitHub Releases](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY/releases/latest)**.

Download the installer, run it, and you're ready to go. You do **not** need Node.js, Rust, or Visual Studio Build Tools to use the packaged application.

> **Platform:** Windows
> **Latest version:** 1.0.0

## Features

* Distraction-free writing surface
* Local-only storage. Your notes never leave your machine
* Fast search across your notes
* Custom frameless window with its own titlebar
* Minimize, maximize/restore, close, and drag-to-move controls
* Native desktop performance through Tauri

## Built with AI agents

Clear Lines was built using AI coding agents, **Codex** and **Antigravity**, as the primary development workflow, submitted for **The Orchestra: AO Hackathon**.

Most iteration happened directly in VS Code's agent panel and terminal sessions, with **[Agent Orchestrator](https://aoagents.dev)** tracking a build task on its Kanban board, shown in the demo video below.

**Demo video:** https://www.youtube.com/watch?v=9BD88ib1vLY

## Tech Stack

* **Frontend:** React + TypeScript
* **Desktop framework:** Tauri v2
* **Backend:** Rust
* **Build tool:** Vite

## Quick start

These instructions are for developers who want to run or modify the project locally.

### Prerequisites

* Node.js 20+ and npm
* Rust (stable), plus Tauri's platform tooling
* On Windows: **Visual Studio Build Tools** with the **Desktop development with C++** workload

### Fast local test

You can run the frontend without Rust:

```bash
npm install
npm run dev
```

Open the URL Vite prints, typically:

```text
http://localhost:5173
```

or:

```text
http://localhost:1420
```

Use this for fast UI iteration with hot module reloading.

### Run the native desktop app

```bash
npm install
npx tauri dev
```

Use this when you need to test native Tauri APIs. It also compiles the Rust backend, so it is slower to start than `npm run dev`.

## Build & package

Build the web assets:

```bash
npm run build
```

Build the native application and installer:

```bash
npx tauri build
```

To target Windows x64 specifically:

```bash
npx tauri build --target x86_64-pc-windows-msvc
```

Build artifacts are generated under:

```text
src-tauri/target/release/bundle/
```

These generated installers can be uploaded to **GitHub Releases** for distribution.

## Project layout

```text
src/          — frontend (React + TypeScript)
src-tauri/    — Rust backend for Tauri
package.json  — npm scripts
spec.md       — original product specification
```

## How the custom window works

The custom titlebar is implemented using Tauri's window APIs.

**`WindowControls`** in `src/App.tsx` handles minimize, maximize, and close. It calls the Rust commands through `@tauri-apps/api/core`'s `invoke`, with a fallback to the JavaScript `@tauri-apps/api/window` API if necessary.

The window control buttons are explicitly excluded from the drag area so that clicks register correctly on Windows.

**Titlebar dragging** uses explicit JavaScript dragging rather than a CSS drag region. On `mousedown`, the frontend calls `getCurrentWindow().startDragging()`. This avoids nested drag-region issues on Windows while keeping the window controls clickable.

**Rust command handlers** in `src-tauri/src/lib.rs` provide:

* `minimize_window`
* `toggle_maximize`
* `close_window`
* `is_maximized`

## Troubleshooting

### Vite port already in use

```bash
npx kill-port 1420
```

Or find and stop the process manually:

```bash
netstat -ano | findstr :1420
Stop-Process -Id <PID> -Force
```

### Native build errors on Windows

Confirm that Visual Studio Build Tools has the **Desktop development with C++** workload installed.

Then update Rust:

```bash
rustup update
```

Check the native project directly:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

### Runtime errors calling window APIs

The frontend tries the Rust `invoke` path first and falls back to `getCurrentWindow()`.

Check both:

* The browser DevTools console
* The terminal running `npx tauri dev`

for the actual error.

## Contributing

Create a feature branch:

```bash
git checkout -b feat/short-description
```

Run the tests and build:

```bash
npm run test
npm run build
```

Then open a pull request against `main`.

## Privacy

All data is stored locally.

Clear Lines does not send notes or preferences to any external service.

## License

Apache-2.0
