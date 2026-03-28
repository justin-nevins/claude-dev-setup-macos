# Claude Dev Setup (macOS)

A hands-off setup wizard for the Claude Code development environment on macOS. It walks you through installing everything you need to start coding with Claude - VS Code, Git, GitHub CLI, and the Claude Code extension - then configures your workspace so you're ready to go.

## Install from Source (Step by Step)

This is for anyone on a Mac, even if you've never used a terminal before.

### Step 1: Open Terminal

Press **Command + Space**, type **Terminal**, and hit Enter. A window with a text prompt will appear. This is where you'll type the commands below.

### Step 2: Install Node.js (if you don't have it)

Node.js is the tool that builds this app. Check if you already have it:

```bash
node --version
```

If you see a version number (like `v20.11.0`), skip to Step 3.

If you see "command not found", install Node.js:

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (the big green button)
3. Open the downloaded `.pkg` file and follow the installer
4. Close and reopen Terminal, then run `node --version` again to confirm it worked

### Step 3: Download this project

Copy and paste this into Terminal and press Enter:

```bash
git clone https://github.com/justin-nevins/claude-dev-setup-macos.git
```

> **"git: command not found"?** That's okay - this app will install Git for you later. For now, download the project as a ZIP instead:
> 1. Go to [https://github.com/justin-nevins/claude-dev-setup-macos](https://github.com/justin-nevins/claude-dev-setup-macos)
> 2. Click the green **Code** button, then **Download ZIP**
> 3. Double-click the ZIP to extract it
> 4. In Terminal, type `cd ` (with a space after it), then drag the extracted folder into the Terminal window and press Enter

If `git clone` worked, navigate into the folder:

```bash
cd claude-dev-setup-macos
```

### Step 4: Install dependencies

```bash
npm install
```

This downloads everything the app needs. It may take a minute or two.

### Step 5: Build and run

To build the app:

```bash
npm run make
```

The finished app will be at:
```
out/make/zip/darwin/x64/claude-dev-setup-macos-darwin-x64-1.0.0.zip
```

Double-click the ZIP to extract it, then open **claude-dev-setup-macos.app**.

> **"App can't be opened" warning?** Right-click the app, select **Open**, then click **Open** in the dialog. macOS shows this for apps downloaded outside the App Store. You only have to do this once.

Or, to run it directly without building a ZIP (good for testing):

```bash
npm start
```

## What the App Does

Once you open it, the wizard walks you through each step. You just click buttons - it handles the rest:

1. **Checks your system** - Sees what's already installed
2. **Installs missing tools** - VS Code, Git, GitHub CLI, Claude Code extension
3. **Creates accounts** - Walks you through signing up for Claude and GitHub (if needed)
4. **Configures Git** - Sets your name and email so your code commits are tagged to you
5. **Sets up your workspace** - Creates a projects folder and connects cloud storage for notes

## What Gets Installed

| Tool | What it is | Why you need it |
|------|-----------|-----------------|
| **VS Code** | A code editor | Where you write and edit code |
| **Git** | Version control | Tracks changes to your code so you can undo mistakes |
| **GitHub CLI** | Command-line access to GitHub | Lets you push code to GitHub from Terminal |
| **Claude Code Extension** | AI coding assistant | Claude inside your editor, helping you write code |

The app also configures Git with your name/email, sets up a projects folder, and optionally connects cloud storage (iCloud, Google Drive, Dropbox, etc.) for session notes.

## Requirements

- macOS 10.15 (Catalina) or later
- Intel or Apple Silicon Mac (M1/M2/M3/M4)
- Internet connection

## Test Mode

Want to try the app without it actually installing anything? Useful if you just want to see how it works:

```bash
npm test
```

## Troubleshooting

**"npm: command not found"** - You need to install Node.js first (see Step 2 above).

**"git: command not found"** - Download the project as a ZIP from GitHub instead of using `git clone` (see the note in Step 3).

**Build fails with permission errors** - Try `sudo npm run make` and enter your Mac password when prompted.

**App won't open** - Right-click the app, select Open, then click Open in the dialog.

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
