# Alex's Bootleg Terminal

A lightweight SSH and serial connection manager built with Electron, React, and xterm.js. Designed for developers and hardware tinkerers who want a clean, fast terminal without the bloat.

---

## Features

- **SSH connections** — password and private key authentication, host key verification
- **Serial connections** — configurable baud rate, data bits, stop bits, and parity
- **Local terminal** — spawn a PowerShell session directly in a tab (Ctrl+N)
- **Multi-tab interface** — middle-click or click × to close, tabs animate in on open
- **Five colour themes** — Dark Navy, Dracula, Solarized Dark, One Dark, Monokai (persisted across restarts)
- **Saved connections** — stored on disk via electron-store, survives reinstalls
- **Custom icon and installer** — NSIS installer with Start Menu folder and uninstall shortcut

---

## Installation

Download `Alex's Bootleg Terminal Setup 1.0.0.exe` from the `dist/` folder and run it.

The installer will:
- Let you choose the installation directory
- Create a desktop shortcut
- Create a Start Menu folder containing the app shortcut and an uninstall shortcut

To uninstall, use **Start Menu → Alex's Bootleg Terminal → Uninstall**, or **Windows Settings → Apps & Features**.

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm

### Setup

```bash
npm install
```

### Run in development mode

```bash
npm run dev
```

Starts the Vite dev server and Electron together. Hot-reload applies to the renderer; restart Electron for main process changes.

### Build installer

```bash
npm run build
```

Runs `scripts/gen-icon.js` to generate `assets/icon.ico`, builds the Vite bundle, then packages with electron-builder. Output goes to `dist/`.

---

## Project Structure

```
├── electron/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Context bridge (IPC surface exposed to renderer)
│   └── ipc/
│       ├── ssh.js       # SSH session management (ssh2)
│       ├── serial.js    # Serial port management (serialport)
│       └── local.js     # Local terminal (child_process)
├── src/
│   ├── App.jsx          # Root component, tab/connection state, theme management
│   ├── themes.js        # Theme definitions (CSS vars + xterm palettes)
│   ├── components/
│   │   ├── Sidebar.jsx        # Connection list, theme picker
│   │   ├── TabBar.jsx         # Tab strip
│   │   ├── TerminalPane.jsx   # xterm.js terminal instance
│   │   ├── ConnectionModal.jsx
│   │   └── HostKeyModal.jsx
│   ├── store/
│   │   └── connections.js     # Thin wrapper around electron-store IPC
│   └── index.css        # Global styles and animation keyframes
├── scripts/
│   └── gen-icon.js      # Generates assets/icon.ico from pure Node.js (no native deps)
├── nsis/
│   └── installer.nsh    # Custom NSIS macros (adds uninstall Start Menu shortcut)
└── assets/
    └── icon.ico         # Generated at build time
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Open a new local terminal tab |
| Middle-click tab | Close tab |

---

## Themes

Themes are selected via the coloured dots at the bottom of the sidebar. The choice is saved automatically.

| Dot | Theme |
|-----|-------|
| Blue | Dark Navy (default) |
| Purple | Dracula |
| Gold | Solarized Dark |
| Green | One Dark |
| Red | Monokai |

Each theme updates both the app chrome and all open terminal colour palettes live.

---

## Notes

- **Local terminal** uses `child_process` with line-buffered I/O and local echo. Arrow-key history and tab completion are not available (these require a native PTY — `node-pty` cannot be compiled without Visual Studio Build Tools installed).
- **Serial ports** require the correct driver for your device to appear in the port list.
- The app stores connections and theme preference in `%APPDATA%\alexs-bootleg-terminal\` via electron-store.
