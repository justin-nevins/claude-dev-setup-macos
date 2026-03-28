const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configure git with user's name and email
async function configureGit(name, email) {
  return new Promise((resolve, reject) => {
    exec(`git config --global user.name "${name}" && git config --global user.email "${email}"`, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(true);
      }
    });
  });
}

// Detect installed cloud providers
async function detectCloudProviders() {
  const homeDir = os.homedir();
  const providers = [];

  // macOS CloudStorage location (used by most cloud providers)
  const cloudStorageDir = path.join(homeDir, 'Library', 'CloudStorage');

  const cloudPaths = [
    { name: 'iCloud', paths: [
      path.join(homeDir, 'Library', 'Mobile Documents', 'com~apple~CloudDocs'),
      path.join(homeDir, 'iCloud Drive')
    ]},
    { name: 'Google Drive', paths: [
      // Check CloudStorage folder for Google Drive (newer format)
      ...getCloudStorageFolders(cloudStorageDir, 'GoogleDrive'),
      path.join(homeDir, 'Google Drive')
    ]},
    { name: 'Dropbox', paths: [
      path.join(homeDir, 'Dropbox'),
      ...getCloudStorageFolders(cloudStorageDir, 'Dropbox')
    ]},
    { name: 'OneDrive', paths: [
      ...getCloudStorageFolders(cloudStorageDir, 'OneDrive'),
      path.join(homeDir, 'OneDrive')
    ]},
    { name: 'pCloud', paths: [
      path.join(homeDir, 'pCloud Drive'),
      '/Volumes/pCloud'
    ]},
    { name: 'Box', paths: [
      path.join(homeDir, 'Box'),
      ...getCloudStorageFolders(cloudStorageDir, 'Box')
    ]}
  ];

  for (const provider of cloudPaths) {
    for (const p of provider.paths) {
      if (p && fs.existsSync(p)) {
        providers.push({
          name: provider.name,
          path: p
        });
        break; // Found this provider, move to next
      }
    }
  }

  return providers;
}

// Helper function to find folders in CloudStorage directory
function getCloudStorageFolders(cloudStorageDir, prefix) {
  const folders = [];
  try {
    if (fs.existsSync(cloudStorageDir)) {
      const contents = fs.readdirSync(cloudStorageDir);
      for (const item of contents) {
        if (item.startsWith(prefix)) {
          folders.push(path.join(cloudStorageDir, item));
        }
      }
    }
  } catch (error) {
    // Ignore errors reading directory
  }
  return folders;
}

// Create folder structure
async function setupFolders(projectsPath, cloudPath) {
  const results = { projects: false, cloud: false };

  try {
    // Create projects folder
    if (!fs.existsSync(projectsPath)) {
      fs.mkdirSync(projectsPath, { recursive: true });
    }
    results.projects = true;

    // Create cloud folder structure if provided
    if (cloudPath) {
      const claudeFolder = path.join(cloudPath, 'Claude');
      const sessionNotesFolder = path.join(claudeFolder, 'SessionNotes');

      if (!fs.existsSync(claudeFolder)) {
        fs.mkdirSync(claudeFolder, { recursive: true });
      }
      if (!fs.existsSync(sessionNotesFolder)) {
        fs.mkdirSync(sessionNotesFolder, { recursive: true });
      }
      results.cloud = true;
    }

    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message, results };
  }
}

// Clone the workflow setup repository
async function cloneWorkflowRepo(projectsPath, onProgress) {
  const repoUrl = 'https://github.com/justin-nevins/claude-workflow-setup.git';
  const targetDir = path.join(projectsPath, 'claude-workflow-setup');

  return new Promise((resolve, reject) => {
    // Check if already cloned
    if (fs.existsSync(targetDir)) {
      onProgress({ stage: 'exists', message: 'Repository already exists, pulling latest...' });

      exec(`git -C "${targetDir}" pull`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          onProgress({ stage: 'complete', message: 'Repository updated successfully' });
          resolve({ success: true, path: targetDir, action: 'updated' });
        }
      });
      return;
    }

    onProgress({ stage: 'cloning', message: 'Cloning repository...' });

    const gitClone = spawn('git', ['clone', repoUrl, targetDir], {
      shell: true
    });

    let output = '';

    gitClone.stdout.on('data', (data) => {
      output += data.toString();
    });

    gitClone.stderr.on('data', (data) => {
      // Git outputs progress to stderr
      const message = data.toString();
      if (message.includes('Receiving objects')) {
        const match = message.match(/(\d+)%/);
        if (match) {
          onProgress({ stage: 'cloning', percent: parseInt(match[1]), message });
        }
      }
    });

    gitClone.on('close', (code) => {
      if (code === 0) {
        onProgress({ stage: 'complete', message: 'Repository cloned successfully' });
        resolve({ success: true, path: targetDir, action: 'cloned' });
      } else {
        reject(new Error(`Git clone failed with code ${code}`));
      }
    });

    gitClone.on('error', reject);
  });
}

// Authenticate with GitHub CLI
function authenticateGitHub() {
  return new Promise((resolve, reject) => {
    // Use fully non-interactive flags so it doesn't hang waiting for TTY input.
    // --web opens the browser for OAuth, -h and -p skip the interactive prompts.
    const gh = spawn('gh', ['auth', 'login', '-h', 'github.com', '-p', 'https', '--web'], {
      stdio: 'pipe',
      shell: true
    });

    let stderr = '';

    gh.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gh.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(stderr || `gh auth login failed with code ${code}`));
      }
    });

    gh.on('error', reject);
  });
}

module.exports = {
  configureGit,
  detectCloudProviders,
  setupFolders,
  cloneWorkflowRepo,
  authenticateGitHub
};
