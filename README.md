# Claude Dev Setup (macOS)

A hands-off setup wizard for the Claude Code development environment on macOS.

## Quick Start (for built app)

1. Download `claude-dev-setup-macos-darwin-x64-1.0.0.zip`
2. Extract the ZIP by double-clicking it
3. Open the extracted `claude-dev-setup-macos.app`
4. If you see "app cannot be opened" warning:
   - Right-click the app and select "Open"
   - Click "Open" in the dialog that appears

## Building from Source

**Important:** macOS apps must be built on a Mac due to symlink requirements in .app bundles.

### On a Mac:

1. Clone or copy this project to your Mac
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the app:
   ```bash
   npm run make
   ```
4. Find the built ZIP in `out/make/zip/darwin/x64/`

## Test Mode

Run without making actual system changes:
```bash
npm test
```

Or with a built app:
```bash
./claude-dev-setup-macos.app/Contents/MacOS/claude-dev-setup-macos --test
```

## What It Installs

- **VS Code** - Code editor (via Homebrew or direct download)
- **Git** - Version control (via Homebrew or Xcode Command Line Tools)
- **GitHub CLI** - Command-line GitHub access (via Homebrew)
- **Claude Code Extension** - AI coding assistant

## What It Configures

- Git user identity (name & email)
- GitHub CLI authentication
- Project folder structure
- Cloud sync folder for session notes (iCloud, Google Drive, Dropbox, OneDrive, pCloud, Box)
- Clones the claude-workflow-setup repo

## Requirements

- macOS 10.15 (Catalina) or later
- 64-bit Intel or Apple Silicon Mac
- Internet connection
- Homebrew recommended (will be installed if needed for some components)

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Run in Development

```bash
npm start
```

### Run in Test Mode (no installations)

```bash
npm test
```

### Build for macOS

```bash
npm run make
```

The built ZIP will be in `out/make/zip/darwin/x64/`.

## Project Structure

```
claude-dev-setup-macos/
├── package.json
├── src/
│   ├── main/
│   │   ├── main.js           # Electron main process
│   │   ├── preload.js        # Secure IPC bridge
│   │   ├── installers.js     # macOS software installation (Homebrew)
│   │   └── config.js         # Git/folder configuration
│   └── renderer/
│       ├── index.html        # UI markup
│       ├── styles.css        # Styling
│       └── app.js            # UI logic
└── assets/
    └── icons/
        ├── icon.svg          # Source icon
        └── icon.png          # macOS app icon
```

## License

MIT
