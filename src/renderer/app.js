// App state
let currentScreen = 0;
const screens = [
  'welcome',
  'prerequisites',
  'install',
  'accounts',
  'gitconfig',
  'folders',
  'success'
];

const milestoneLabels = {
  welcome: 'Get Started',
  prerequisites: 'Check System',
  install: 'Install Tools',
  accounts: 'Create Accounts',
  gitconfig: 'Configure Git',
  folders: 'Set Up Workspace',
  success: 'First Project'
};

let prerequisites = {};
let missingItems = [];
let cloudProviders = [];
let projectsPath = '';
let cloudPath = '';
let completedMilestones = new Set();

// Milestone management
function updateMilestones() {
  const milestones = document.querySelectorAll('.milestone');

  milestones.forEach(milestone => {
    const step = milestone.dataset.step;
    const stepIndex = screens.indexOf(step);
    const icon = milestone.querySelector('.milestone-icon');

    milestone.classList.remove('active');

    if (completedMilestones.has(step)) {
      milestone.dataset.complete = 'true';
      icon.textContent = '✓';
    } else if (stepIndex === currentScreen) {
      milestone.classList.add('active');
      icon.textContent = '●';
    } else {
      milestone.dataset.complete = 'false';
      icon.textContent = '○';
    }
  });

  document.getElementById('completedCount').textContent = completedMilestones.size;
}

function completeMilestone(screenName) {
  if (completedMilestones.has(screenName)) return;

  completedMilestones.add(screenName);
  updateMilestones();
  showCelebration(milestoneLabels[screenName]);
}

function showCelebration(text) {
  const overlay = document.getElementById('celebrationOverlay');
  const celebrationText = document.getElementById('celebrationText');

  celebrationText.textContent = `${text} complete!`;
  overlay.classList.remove('hidden');

  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 1500);
}

// Screen navigation
function showScreen(index) {
  const allScreens = document.querySelectorAll('.screen');
  allScreens.forEach(s => s.classList.remove('active'));

  const screenId = `screen-${screens[index]}`;
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.classList.add('active');

    // Complete previous milestone when moving forward
    if (index > currentScreen && currentScreen >= 0) {
      completeMilestone(screens[currentScreen]);
    }

    currentScreen = index;
    updateMilestones();

    // Run screen-specific initialization
    if (screens[index] === 'prerequisites') {
      checkPrerequisites();
    } else if (screens[index] === 'install') {
      startInstallation();
    } else if (screens[index] === 'folders') {
      initFolderScreen();
    } else if (screens[index] === 'accounts') {
      initAccountsScreen();
    } else if (screens[index] === 'gitconfig') {
      initGitConfigScreen();
    } else if (screens[index] === 'success') {
      completeMilestone('folders');
    }
  }
}

function nextScreen() {
  // Skip install screen if nothing to install
  if (screens[currentScreen] === 'prerequisites' && missingItems.length === 0) {
    completeMilestone('prerequisites');
    completeMilestone('install');
    showScreen(currentScreen + 2);
  } else {
    showScreen(currentScreen + 1);
  }
}

function prevScreen() {
  if (currentScreen > 0) {
    showScreen(currentScreen - 1);
  }
}

// Prerequisites check
async function checkPrerequisites() {
  try {
    prerequisites = await window.api.checkPrerequisites();

    const items = document.querySelectorAll('.check-item');
    missingItems = [];

    items.forEach(item => {
      const software = item.dataset.software;
      const icon = item.querySelector('.check-icon');
      const status = item.querySelector('.check-status');

      if (prerequisites[software]) {
        item.classList.add('installed');
        item.classList.remove('missing');
        icon.textContent = '✓';
        status.textContent = 'Installed';
      } else {
        item.classList.add('missing');
        item.classList.remove('installed');
        icon.textContent = '○';
        status.textContent = 'Not installed';
        missingItems.push(software);
      }
    });

    const resultBox = document.getElementById('prerequisitesResult');
    resultBox.classList.remove('hidden');

    if (missingItems.length === 0) {
      resultBox.className = 'result-box success';
      resultBox.textContent = 'All software is already installed! Click Continue to proceed.';
    } else {
      resultBox.className = 'result-box warning';
      resultBox.textContent = `${missingItems.length} item(s) need to be installed. Click Continue to install them.`;
    }

    document.getElementById('btnPrerequisitesNext').disabled = false;
  } catch (error) {
    console.error('Error checking prerequisites:', error);
  }
}

// Installation
async function startInstallation() {
  if (missingItems.length === 0) {
    nextScreen();
    return;
  }

  const progressContainer = document.getElementById('installProgress');
  progressContainer.innerHTML = '';

  const softwareNames = {
    vscode: 'VS Code',
    git: 'Git',
    ghcli: 'GitHub CLI',
    claudeExtension: 'Claude Code Extension'
  };

  missingItems.forEach(software => {
    const item = document.createElement('div');
    item.className = 'install-item';
    item.id = `install-${software}`;
    item.innerHTML = `
      <div class="install-item-header">
        <span class="install-item-name">${softwareNames[software]}</span>
        <span class="install-item-status">Waiting...</span>
      </div>
      <div class="install-item-bar">
        <div class="install-item-fill"></div>
      </div>
    `;
    progressContainer.appendChild(item);
  });

  window.api.onInstallProgress((progress) => {
    const item = document.getElementById(`install-${progress.software}`);
    if (item) {
      const status = item.querySelector('.install-item-status');
      const fill = item.querySelector('.install-item-fill');

      if (progress.stage === 'downloading') {
        status.textContent = `Downloading... ${progress.percent}%`;
        fill.style.width = `${progress.percent / 2}%`;
      } else if (progress.stage === 'installing') {
        status.textContent = 'Installing...';
        fill.style.width = '75%';
      } else if (progress.stage === 'complete') {
        status.textContent = 'Complete';
        item.classList.add('complete');
      }
    }
  });

  try {
    const results = await window.api.installSoftware(missingItems);

    let allSuccess = true;
    for (const [software, result] of Object.entries(results)) {
      const item = document.getElementById(`install-${software}`);
      if (item) {
        const status = item.querySelector('.install-item-status');
        if (result.success) {
          status.textContent = 'Complete';
          item.classList.add('complete');
        } else {
          status.textContent = `Error: ${result.error}`;
          item.classList.add('error');
          allSuccess = false;
        }
      }
    }

    if (allSuccess) {
      document.getElementById('installMessage').textContent = 'All software installed successfully!';
    } else {
      document.getElementById('installMessage').textContent = 'Some installations failed. You may need to install them manually.';
    }

    document.getElementById('btnInstallNext').disabled = false;
  } catch (error) {
    console.error('Installation error:', error);
    document.getElementById('installMessage').textContent = 'Installation failed: ' + error.message;
  }
}

// Accounts screen
function initAccountsScreen() {
  const claudeCheck = document.getElementById('claudeAccountDone');
  const githubCheck = document.getElementById('githubAccountDone');
  const nextBtn = document.getElementById('btnAccountsNext');
  const claudeBadge = document.getElementById('claudeBadge');
  const githubBadge = document.getElementById('githubBadge');

  function updateAccountsState() {
    claudeBadge.textContent = claudeCheck.checked ? 'Done' : 'Required';
    claudeBadge.classList.toggle('done', claudeCheck.checked);

    githubBadge.textContent = githubCheck.checked ? 'Done' : 'Required';
    githubBadge.classList.toggle('done', githubCheck.checked);

    nextBtn.disabled = !(claudeCheck.checked && githubCheck.checked);
  }

  claudeCheck.addEventListener('change', updateAccountsState);
  githubCheck.addEventListener('change', updateAccountsState);

  updateAccountsState();
}

function openClaudeSignup() {
  window.api.openExternal('https://claude.ai/settings/billing');
}

function openGitHubSignup() {
  window.api.openExternal('https://github.com/signup');
}

// Git configuration screen
function initGitConfigScreen() {
  const nameInput = document.getElementById('gitName');
  const emailInput = document.getElementById('gitEmail');
  const nextBtn = document.getElementById('btnGitConfigNext');

  function updateGitConfigButton() {
    nextBtn.disabled = !(nameInput.value.trim() && emailInput.value.trim());
  }

  nameInput.addEventListener('input', updateGitConfigButton);
  emailInput.addEventListener('input', updateGitConfigButton);
}

async function authenticateGitHub() {
  const statusEl = document.getElementById('githubAuthStatus');
  const btn = document.getElementById('btnGitHubAuth');

  btn.disabled = true;
  statusEl.textContent = 'Opening browser...';
  statusEl.className = 'status-badge';

  try {
    await window.api.githubAuth();
    statusEl.textContent = 'Authenticated';
    statusEl.className = 'status-badge success';
  } catch (error) {
    statusEl.textContent = 'Failed';
    statusEl.className = 'status-badge error';
    btn.disabled = false;
  }
}

async function saveGitConfig() {
  const name = document.getElementById('gitName').value.trim();
  const email = document.getElementById('gitEmail').value.trim();

  try {
    await window.api.configureGit(name, email);
    nextScreen();
  } catch (error) {
    console.error('Git config error:', error);
    alert('Failed to configure Git: ' + error.message);
  }
}

// Folders screen
async function initFolderScreen() {
  const homeDir = getHomeDir();
  projectsPath = `${homeDir}/projects`;
  document.getElementById('projectsPath').value = projectsPath;

  try {
    cloudProviders = await window.api.detectCloudProviders();

    const container = document.getElementById('detectedProviders');
    container.innerHTML = '';

    if (cloudProviders.length > 0) {
      const label = document.createElement('span');
      label.textContent = 'Detected: ';
      label.style.fontSize = '0.875rem';
      label.style.color = 'var(--text-secondary)';
      container.appendChild(label);

      cloudProviders.forEach(provider => {
        const btn = document.createElement('button');
        btn.className = 'provider-btn';
        btn.textContent = provider.name;
        btn.onclick = () => selectCloudProvider(provider.path);
        container.appendChild(btn);
      });

      selectCloudProvider(cloudProviders[0].path);
    }
  } catch (error) {
    console.error('Error detecting cloud providers:', error);
  }
}

function selectCloudProvider(path) {
  cloudPath = path;
  document.getElementById('cloudPath').value = path;
}

async function browseProjects() {
  const result = await window.api.browseFolder(projectsPath);
  if (result) {
    projectsPath = result;
    document.getElementById('projectsPath').value = result;
  }
}

async function browseCloud() {
  const result = await window.api.browseFolder(cloudPath || '');
  if (result) {
    cloudPath = result;
    document.getElementById('cloudPath').value = result;
  }
}

async function setupFolders() {
  try {
    await window.api.setupFolders(projectsPath, cloudPath);
    await window.api.cloneWorkflowRepo(projectsPath);

    document.getElementById('projectPath').textContent = `${projectsPath}/claude-workflow-setup`;

    nextScreen();
  } catch (error) {
    console.error('Folder setup error:', error);
    alert('Failed to set up folders: ' + error.message);
  }
}

function getHomeDir() {
  return window.api.getHomeDir();
}

// Success screen actions
function openVSCode() {
  window.api.openExternal('vscode://');
}

function closeApp() {
  window.close();
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check for test mode and show badge
    const testMode = await window.api.getTestMode();
    if (testMode) {
      document.getElementById('testModeBadge').classList.remove('hidden');
    }
  } catch (e) {
    console.error('Error checking test mode:', e);
  }

  // Navigation buttons
  document.getElementById('btnWelcomeNext').addEventListener('click', nextScreen);
  document.getElementById('btnPrerequisitesBack').addEventListener('click', prevScreen);
  document.getElementById('btnPrerequisitesNext').addEventListener('click', nextScreen);
  document.getElementById('btnInstallNext').addEventListener('click', nextScreen);
  document.getElementById('btnAccountsBack').addEventListener('click', prevScreen);
  document.getElementById('btnAccountsNext').addEventListener('click', nextScreen);
  document.getElementById('btnGitConfigBack').addEventListener('click', prevScreen);
  document.getElementById('btnGitConfigNext').addEventListener('click', saveGitConfig);
  document.getElementById('btnFoldersBack').addEventListener('click', prevScreen);
  document.getElementById('btnSetupFolders').addEventListener('click', setupFolders);

  // Action buttons
  document.getElementById('btnOpenClaude').addEventListener('click', openClaudeSignup);
  document.getElementById('btnOpenGitHub').addEventListener('click', openGitHubSignup);
  document.getElementById('btnGitHubAuth').addEventListener('click', authenticateGitHub);
  document.getElementById('btnBrowseProjects').addEventListener('click', browseProjects);
  document.getElementById('btnBrowseCloud').addEventListener('click', browseCloud);
  document.getElementById('btnOpenVSCode').addEventListener('click', openVSCode);
  document.getElementById('btnCloseApp').addEventListener('click', closeApp);

  showScreen(0);
});
