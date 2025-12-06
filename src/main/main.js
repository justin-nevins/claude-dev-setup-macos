const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { checkPrerequisites, installSoftware } = require('./installers');
const { configureGit, setupFolders, cloneWorkflowRepo, detectCloudProviders, authenticateGitHub } = require('./config');

let mainWindow;

// Check for test mode via command line argument
const TEST_MODE = process.argv.includes('--test');

const WINDOW_CONFIG = {
  width: 1000,
  height: 750,
  resizable: true,
  minWidth: 900,
  minHeight: 700
};

// Mock functions for test mode
const mockFunctions = {
  checkPrerequisites: async () => ({
    vscode: false,
    git: true,
    ghcli: false,
    claudeExtension: false
  }),

  installSoftware: async (software, onProgress) => {
    const results = {};
    for (const item of software) {
      // Simulate download
      for (let i = 0; i <= 100; i += 20) {
        onProgress({ software: item, stage: 'downloading', percent: i });
        await new Promise(r => setTimeout(r, 200));
      }
      // Simulate install
      onProgress({ software: item, stage: 'installing', percent: 0 });
      await new Promise(r => setTimeout(r, 500));
      onProgress({ software: item, stage: 'complete', percent: 100 });
      results[item] = { success: true };
    }
    return results;
  },

  configureGit: async () => true,

  detectCloudProviders: async () => [
    { name: 'iCloud', path: '/Users/testuser/Library/Mobile Documents/com~apple~CloudDocs' },
    { name: 'Dropbox', path: '/Users/testuser/Dropbox' }
  ],

  setupFolders: async () => ({ success: true, results: { projects: true, cloud: true } }),

  cloneWorkflowRepo: async (projectsPath, onProgress) => {
    onProgress({ stage: 'cloning', message: 'Cloning repository...' });
    await new Promise(r => setTimeout(r, 1000));
    onProgress({ stage: 'complete', message: 'Repository cloned successfully' });
    return { success: true, path: path.join(projectsPath, 'claude-workflow-setup'), action: 'cloned' };
  },

  authenticateGitHub: async () => {
    await new Promise(r => setTimeout(r, 1000));
    return true;
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    ...WINDOW_CONFIG,
    title: TEST_MODE ? 'Claude Dev Setup [TEST MODE]' : 'Claude Dev Setup',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/icons/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.setMenu(null);

  // Open DevTools in test mode for debugging
  if (TEST_MODE) {
    mainWindow.webContents.openDevTools();
    console.log('Running in TEST MODE - no actual installations will occur');
  }
}

function setupAppLifecycle() {
  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

function registerIPCHandlers() {
  ipcMain.handle('get-test-mode', () => TEST_MODE);

  ipcMain.handle('check-prerequisites', () => {
    return TEST_MODE ? mockFunctions.checkPrerequisites() : checkPrerequisites();
  });

  ipcMain.handle('install-software', async (event, software) => {
    const onProgress = (progress) => {
      mainWindow.webContents.send('install-progress', progress);
    };
    return TEST_MODE
      ? mockFunctions.installSoftware(software, onProgress)
      : installSoftware(software, onProgress);
  });

  ipcMain.handle('open-external', async (event, url) => {
    if (TEST_MODE) {
      console.log(`[TEST MODE] Would open: ${url}`);
      return true;
    }
    await shell.openExternal(url);
    return true;
  });

  ipcMain.handle('configure-git', (event, { name, email }) => {
    if (TEST_MODE) {
      console.log(`[TEST MODE] Would configure git: ${name} <${email}>`);
      return mockFunctions.configureGit();
    }
    return configureGit(name, email);
  });

  ipcMain.handle('detect-cloud-providers', () => {
    return TEST_MODE ? mockFunctions.detectCloudProviders() : detectCloudProviders();
  });

  ipcMain.handle('setup-folders', (event, { projectsPath, cloudPath }) => {
    if (TEST_MODE) {
      console.log(`[TEST MODE] Would create folders: ${projectsPath}, ${cloudPath}`);
      return mockFunctions.setupFolders();
    }
    return setupFolders(projectsPath, cloudPath);
  });

  ipcMain.handle('browse-folder', async (event, defaultPath) => {
    if (TEST_MODE) {
      return defaultPath || path.join(os.homedir(), 'projects');
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath,
      properties: ['openDirectory', 'createDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('clone-workflow-repo', (event, projectsPath) => {
    const onProgress = (progress) => {
      mainWindow.webContents.send('clone-progress', progress);
    };
    if (TEST_MODE) {
      console.log(`[TEST MODE] Would clone repo to: ${projectsPath}`);
      return mockFunctions.cloneWorkflowRepo(projectsPath, onProgress);
    }
    return cloneWorkflowRepo(projectsPath, onProgress);
  });

  ipcMain.handle('github-auth', () => {
    if (TEST_MODE) {
      console.log('[TEST MODE] Would authenticate with GitHub');
      return mockFunctions.authenticateGitHub();
    }
    return authenticateGitHub();
  });

  ipcMain.handle('get-home-dir', () => os.homedir());

  // Sync handler for home dir (needed for preload)
  ipcMain.on('get-home-dir-sync', (event) => {
    event.returnValue = os.homedir();
  });
}

setupAppLifecycle();
registerIPCHandlers();
