# Building DADDY's Bakery POS as a Windows `.exe`

The POS already runs as a web app (preview/production URL on Emergent). To produce a
native installable Windows `.exe` (or macOS `.dmg`, Linux `.AppImage`) you wrap the same
React frontend with **Tauri 2.0**. Tauri is included in the project under
`/app/frontend/src-tauri/`.

> ⚠ The `.exe` itself **must be built on a Windows machine**. Tauri uses your
> system's compiler toolchain — Microsoft can't build a Windows binary from
> Linux/macOS. The Mac/Linux builds, however, can be produced on a Mac.

---

## Prerequisites (one-time setup on your bakery PC)

1. **Node.js 18+** and **Yarn**
   - https://nodejs.org/
   - `npm i -g yarn`

2. **Rust toolchain** (Tauri uses Rust under the hood)
   - https://rustup.rs/  → run the installer, accept defaults, restart terminal.

3. **Microsoft C++ Build Tools** (Windows only)
   - https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - In the installer, tick "Desktop development with C++".

4. **WebView2 Runtime** (almost always already installed on Windows 11)
   - https://developer.microsoft.com/microsoft-edge/webview2/

---

## One-time project setup

```powershell
# from a normal Command Prompt / Terminal on your PC
git clone <YOUR_GITHUB_REPO_URL> daddys-pos
cd daddys-pos\frontend

# install JS deps + the Tauri CLI
yarn install
yarn add -D @tauri-apps/cli@^2
```

(If you downloaded a ZIP from Emergent instead of cloning, just `cd` into the
extracted `frontend` folder.)

---

## Generate the icons (one time)

Tauri needs `.ico`, `.icns`, and several `.png` sizes. The CLI does it for you
from a single source PNG (we already include `icons/icon.png`):

```powershell
yarn tauri icon ..\frontend\public\daddys-logo.png
```

This populates `src-tauri\icons\` with every size needed.

---

## Run the desktop app in dev mode

```powershell
yarn tauri dev
```

A native DADDY's Bakery POS window will open with the splash screen, then the login.
It hot-reloads exactly like the web app.

---

## Produce the `.exe` installer

```powershell
yarn tauri build
```

When it finishes, look in:

```
src-tauri\target\release\bundle\
   ├─ msi\DADDY's Bakery POS_1.0.0_x64_en-US.msi   ← MSI installer
   └─ nsis\DADDY's Bakery POS_1.0.0_x64-setup.exe   ← .exe installer
```

Run the `.exe` (or distribute it). It installs DADDY's Bakery POS like any
Windows program — Start menu shortcut, desktop icon, uninstaller, the works.

---

## Pointing the desktop app to your hosted backend

The desktop app loads the React build, which already calls `REACT_APP_BACKEND_URL`
from `frontend/.env`. Before running `yarn tauri build`, edit that file to your
**production** backend URL (e.g. `https://api.daddyss.org`). After deployment the
desktop app will then talk to your real backend automatically.

---

## What's bundled inside the `.exe`?
- The compiled React frontend (HTML/CSS/JS)
- The DADDY's logo splash that appears the moment the window opens
- A Rust shell that hosts a Microsoft Edge WebView2 (no Chromium — much smaller)
- The native window background pre-set to `#ede7c7` so the splash is seamless

Final installer size: typically **5–10 MB**.

---

## FAQ

**Q. Will it work offline?**
The frontend will open offline, but it needs to reach the backend (MongoDB +
FastAPI) for billing/inventory/etc. To run *fully* offline, you'd also run the
backend locally on the bakery PC (Python + MongoDB) — possible but bigger lift.

**Q. Auto-updates?**
Yes — Tauri has a built-in updater. Once you have a public release, set
`tauri.conf.json -> plugins.updater` and host the latest installer on your site.

**Q. Multiple shops / multiple terminals?**
Build the `.exe` once, install on every PC. They all talk to the same backend
URL (`REACT_APP_BACKEND_URL`).
