const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

const DOWNLOAD_URLS = {
  vscode: 'https://update.code.visualstudio.com/latest/darwin-universal/stable'
};

// Check if a command exists
function commandExists(command) {
  return new Promise((resolve) => {
    exec(`which ${command}`, (error) => {
      resolve(!error);
    });
  });
}

// Check if Homebrew is installed
async function checkHomebrew() {
  return await commandExists('brew');
}

// Check if VS Code is installed
async function checkVSCode() {
  // Check common installation paths on macOS
  const paths = [
    '/Applications/Visual Studio Code.app',
    path.join(os.homedir(), 'Applications', 'Visual Studio Code.app')
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) return true;
  }

  return await commandExists('code');
}

// Check if Git is installed
async function checkGit() {
  return await commandExists('git');
}

// Check if GitHub CLI is installed
async function checkGitHubCLI() {
  return await commandExists('gh');
}

// Check if Claude Code extension is installed
async function checkClaudeExtension() {
  return new Promise((resolve) => {
    exec('code --list-extensions', (error, stdout) => {
      if (error) {
        resolve(false);
      } else {
        resolve(stdout.toLowerCase().includes('anthropic.claude-code'));
      }
    });
  });
}

// Check all prerequisites
async function checkPrerequisites() {
  const [vscode, git, ghcli, claudeExt] = await Promise.all([
    checkVSCode(),
    checkGit(),
    checkGitHubCLI(),
    checkClaudeExtension()
  ]);

  return {
    vscode,
    git,
    ghcli,
    claudeExtension: claudeExt
  };
}

// Download a file
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath, onProgress)
          .then(resolve)
          .catch(reject);
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (onProgress && totalSize) {
          onProgress(Math.round((downloadedSize / totalSize) * 100));
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    });

    request.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// Run a shell command
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Install Homebrew (if not installed)
async function installHomebrew(onProgress) {
  const hasHomebrew = await checkHomebrew();
  if (hasHomebrew) return;

  onProgress({ software: 'homebrew', stage: 'installing', percent: 0 });

  return new Promise((resolve, reject) => {
    // Homebrew installation script
    // NONINTERACTIVE=1 skips the sudo password prompt and confirmation,
    // which would hang in Electron where there is no TTY.
    const installCmd = 'curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | /bin/bash';

    const installer = spawn('/bin/bash', ['-c', installCmd], {
      stdio: 'pipe',
      env: { ...process.env, NONINTERACTIVE: '1' }
    });

    installer.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('%')) {
        const match = msg.match(/(\d+)%/);
        if (match) {
          onProgress({ software: 'homebrew', stage: 'installing', percent: parseInt(match[1]) });
        }
      }
    });

    installer.stderr.on('data', () => {});

    installer.on('close', (code) => {
      if (code === 0) {
        onProgress({ software: 'homebrew', stage: 'complete', percent: 100 });
        resolve();
      } else {
        reject(new Error(`Homebrew installation exited with code ${code}`));
      }
    });

    installer.on('error', reject);
  });
}

// Install VS Code
async function installVSCode(onProgress) {
  // Try Homebrew first
  const hasHomebrew = await checkHomebrew();

  if (hasHomebrew) {
    onProgress({ software: 'vscode', stage: 'installing', percent: 0 });

    return new Promise((resolve, reject) => {
      const installer = spawn('brew', ['install', '--cask', 'visual-studio-code'], {
        stdio: 'pipe'
      });

      installer.on('close', (code) => {
        if (code === 0) {
          onProgress({ software: 'vscode', stage: 'complete', percent: 100 });
          resolve();
        } else {
          reject(new Error(`VS Code installation exited with code ${code}`));
        }
      });

      installer.on('error', reject);
    });
  }

  // Fallback: Download and install manually
  const tempPath = path.join(os.tmpdir(), 'VSCode-darwin.zip');

  onProgress({ software: 'vscode', stage: 'downloading', percent: 0 });
  await downloadFile(DOWNLOAD_URLS.vscode, tempPath, (percent) => {
    onProgress({ software: 'vscode', stage: 'downloading', percent });
  });

  onProgress({ software: 'vscode', stage: 'installing', percent: 0 });

  // Unzip and move to Applications
  await runCommand(`unzip -o "${tempPath}" -d /Applications`);

  // Clean up
  fs.unlinkSync(tempPath);

  onProgress({ software: 'vscode', stage: 'complete', percent: 100 });
}

// Install Git via Xcode Command Line Tools or Homebrew
async function installGit(onProgress) {
  onProgress({ software: 'git', stage: 'installing', percent: 0 });

  // Try Homebrew first
  const hasHomebrew = await checkHomebrew();

  if (hasHomebrew) {
    return new Promise((resolve, reject) => {
      const installer = spawn('brew', ['install', 'git'], {
        stdio: 'pipe'
      });

      installer.on('close', (code) => {
        if (code === 0) {
          onProgress({ software: 'git', stage: 'complete', percent: 100 });
          resolve();
        } else {
          reject(new Error(`Git installation exited with code ${code}`));
        }
      });

      installer.on('error', reject);
    });
  }

  // Fallback: Install Xcode Command Line Tools (includes Git)
  return new Promise((resolve, reject) => {
    const installer = spawn('xcode-select', ['--install'], {
      stdio: 'pipe'
    });

    installer.on('close', (code) => {
      // xcode-select returns non-zero if already installed, which is fine
      onProgress({ software: 'git', stage: 'complete', percent: 100 });
      resolve();
    });

    installer.on('error', reject);
  });
}

// Install GitHub CLI
async function installGitHubCLI(onProgress) {
  onProgress({ software: 'ghcli', stage: 'installing', percent: 0 });

  // Install via Homebrew
  const hasHomebrew = await checkHomebrew();

  if (!hasHomebrew) {
    throw new Error('Homebrew is required to install GitHub CLI. Please install Homebrew first.');
  }

  return new Promise((resolve, reject) => {
    const installer = spawn('brew', ['install', 'gh'], {
      stdio: 'pipe'
    });

    installer.on('close', (code) => {
      if (code === 0) {
        onProgress({ software: 'ghcli', stage: 'complete', percent: 100 });
        resolve();
      } else {
        reject(new Error(`GitHub CLI installation exited with code ${code}`));
      }
    });

    installer.on('error', reject);
  });
}

// Install Claude Code extension
async function installClaudeExtension(onProgress) {
  onProgress({ software: 'claudeExtension', stage: 'installing', percent: 0 });

  return new Promise((resolve, reject) => {
    exec('code --install-extension anthropic.claude-code', (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        onProgress({ software: 'claudeExtension', stage: 'complete', percent: 100 });
        resolve();
      }
    });
  });
}

// Install all missing software
async function installSoftware(softwareList, onProgress) {
  const installers = {
    vscode: installVSCode,
    git: installGit,
    ghcli: installGitHubCLI,
    claudeExtension: installClaudeExtension
  };

  const results = {};

  // Ensure Homebrew is available for installations that need it
  if (softwareList.includes('ghcli') || softwareList.includes('git')) {
    try {
      await installHomebrew(onProgress);
    } catch (error) {
      console.log('Homebrew installation skipped or failed:', error.message);
    }
  }

  for (const software of softwareList) {
    try {
      if (installers[software]) {
        await installers[software](onProgress);
        results[software] = { success: true };
      }
    } catch (error) {
      results[software] = { success: false, error: error.message };
    }
  }

  return results;
}

module.exports = {
  checkPrerequisites,
  installSoftware
};
