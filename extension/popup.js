// SecurePass Manager Extension Popup Logic

const state = {
  appUrl: '',
  isUnlocked: false,
  passwords: [],
  currentDomain: ''
};

// Elements
const loginView = document.getElementById('login-view');
const configView = document.getElementById('config-view');
const mainView = document.getElementById('main-view');
const addView = document.getElementById('add-view');
const statusDot = document.getElementById('status-dot');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(['appUrl', 'isUnlocked']);
  state.appUrl = data.appUrl || '';
  state.isUnlocked = data.isUnlocked || false;

  // Get current tab domain
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      state.currentDomain = url.hostname;
      document.getElementById('current-domain').textContent = state.currentDomain;
    } catch (e) {
      console.error('Invalid URL', e);
    }
  }

  if (!state.appUrl) {
    showView('config');
  } else if (state.isUnlocked) {
    showView('main');
    fetchPasswords();
  } else {
    showView('login');
  }
});

// View Management
function showView(view) {
  loginView.classList.add('hidden');
  configView.classList.add('hidden');
  mainView.classList.add('hidden');
  addView.classList.add('hidden');

  if (view === 'login') loginView.classList.remove('hidden');
  if (view === 'config') configView.classList.remove('hidden');
  if (view === 'main') mainView.classList.remove('hidden');
  if (view === 'add') addView.classList.remove('hidden');
}

// Actions
document.getElementById('config-link').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('app-url').value = state.appUrl;
  showView('config');
});

document.getElementById('save-config-btn').addEventListener('click', async () => {
  const url = document.getElementById('app-url').value.trim();
  if (!url) return;
  state.appUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  await chrome.storage.local.set({ appUrl: state.appUrl });
  showView('login');
});

document.getElementById('back-to-login').addEventListener('click', () => showView('login'));

document.getElementById('login-btn').addEventListener('click', async () => {
  const password = document.getElementById('master-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.classList.add('hidden');

  try {
    const response = await fetch(`${state.appUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (response.ok) {
      state.isUnlocked = true;
      await chrome.storage.local.set({ isUnlocked: true });
      statusDot.style.background = '#10b981'; // Green
      showView('main');
      fetchPasswords();
    } else {
      errorEl.textContent = 'Invalid master password';
      errorEl.classList.remove('hidden');
    }
  } catch (e) {
    errorEl.textContent = 'Connection failed. Check App URL.';
    errorEl.classList.remove('hidden');
  }
});

async function fetchPasswords() {
  try {
    const response = await fetch(`${state.appUrl}/api/passwords`);
    if (response.ok) {
      state.passwords = await response.json();
      renderPasswords();
    }
  } catch (e) {
    console.error('Failed to fetch passwords', e);
  }
}

function renderPasswords() {
  const list = document.getElementById('password-list');
  list.innerHTML = '';

  // Filter by domain
  const filtered = state.passwords.filter(p => {
    if (!p.url) return false;
    try {
      const pUrl = new URL(p.url.startsWith('http') ? p.url : `https://${p.url}`);
      return pUrl.hostname.includes(state.currentDomain) || state.currentDomain.includes(pUrl.hostname);
    } catch (e) {
      return p.title.toLowerCase().includes(state.currentDomain.split('.')[0]);
    }
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">No matching credentials found.</div>';
  }

  filtered.forEach(p => {
    const item = document.createElement('div');
    item.className = 'password-item';
    item.innerHTML = `
      <div class="password-info">
        <div class="password-title">${p.title}</div>
        <div class="password-user">${p.username}</div>
      </div>
      <button class="btn" style="width: auto; padding: 4px 8px; font-size: 11px;">Fill</button>
    `;
    item.querySelector('button').addEventListener('click', () => fillCredentials(p));
    list.appendChild(item);
  });
}

async function fillCredentials(password) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (username, pass) => {
      const userInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[id*="user"]');
      const passInputs = document.querySelectorAll('input[type="password"]');

      if (userInputs.length > 0) {
        userInputs[0].value = username;
        userInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (passInputs.length > 0) {
        passInputs[0].value = pass;
        passInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
    },
    args: [password.username, password.value]
  });
}

document.getElementById('add-new-btn').addEventListener('click', () => {
  document.getElementById('new-url').value = state.currentDomain;
  showView('add');
});

document.getElementById('cancel-add-btn').addEventListener('click', () => showView('main'));

document.getElementById('save-new-btn').addEventListener('click', async () => {
  const title = document.getElementById('new-title').value;
  const username = document.getElementById('new-username').value;
  const password = document.getElementById('new-password').value;
  const url = document.getElementById('new-url').value;

  if (!title || !username || !password) return;

  try {
    const response = await fetch(`${state.appUrl}/api/passwords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, username, value: password, url, category: 'Web' })
    });

    if (response.ok) {
      showView('main');
      fetchPasswords();
    }
  } catch (e) {
    console.error('Failed to save password', e);
  }
});

document.getElementById('lock-vault-btn').addEventListener('click', async () => {
  state.isUnlocked = false;
  await chrome.storage.local.set({ isUnlocked: false });
  statusDot.style.background = '#ef4444';
  showView('login');
});
