const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Get home directory (via IPC since os module not available in sandbox)
  getHomeDir: () => ipcRenderer.sendSync('get-home-dir-sync'),

  // Check if running in test mode
  getTestMode: () => ipcRenderer.invoke('get-test-mode'),

  // Check prerequisites
  checkPrerequisites: () => ipcRenderer.invoke('check-prerequisites'),

  // Install software
  installSoftware: (software) => ipcRenderer.invoke('install-software', software),
  onInstallProgress: (callback) => ipcRenderer.on('install-progress', (event, progress) => callback(progress)),

  // Open external URL
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Git configuration
  configureGit: (name, email) => ipcRenderer.invoke('configure-git', { name, email }),

  // Cloud providers
  detectCloudProviders: () => ipcRenderer.invoke('detect-cloud-providers'),

  // Folder setup
  setupFolders: (projectsPath, cloudPath) => ipcRenderer.invoke('setup-folders', { projectsPath, cloudPath }),
  browseFolder: (defaultPath) => ipcRenderer.invoke('browse-folder', defaultPath),

  // Clone repo
  cloneWorkflowRepo: (projectsPath) => ipcRenderer.invoke('clone-workflow-repo', projectsPath),
  onCloneProgress: (callback) => ipcRenderer.on('clone-progress', (event, progress) => callback(progress)),

  // GitHub auth
  githubAuth: () => ipcRenderer.invoke('github-auth')
});
