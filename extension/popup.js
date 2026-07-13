/* global chrome */

const serverUrlInput = document.getElementById('serverUrl');
const extensionKeyInput = document.getElementById('extensionKey');
const connectBtn = document.getElementById('connectBtn');
const messageEl = document.getElementById('message');

const STORAGE_KEYS = ['serverUrl', 'extensionKey'];

function showMessage(type, text) {
  messageEl.className = `msg ${type}`;
  messageEl.textContent = text;
}

function clearMessage() {
  messageEl.className = 'msg';
  messageEl.textContent = '';
}

// Restore the saved server URL + key so the user only types them once.
chrome.storage.local.get(STORAGE_KEYS, (saved) => {
  if (saved.serverUrl) serverUrlInput.value = saved.serverUrl;
  if (saved.extensionKey) extensionKeyInput.value = saved.extensionKey;
});

function normalizeServerUrl(raw) {
  return String(raw || '').trim().replace(/\/+$/, '');
}

async function readLinkedInCookies() {
  // Grabs every cookie for linkedin.com (and subdomains). li_at is the session
  // cookie; the rest help the session look complete and legitimate.
  const cookies = await chrome.cookies.getAll({ domain: 'linkedin.com' });
  return cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    expirationDate: c.expirationDate,
  }));
}

async function connect() {
  clearMessage();

  const serverUrl = normalizeServerUrl(serverUrlInput.value);
  const extensionKey = extensionKeyInput.value.trim();

  if (!serverUrl || !extensionKey) {
    showMessage('error', 'Enter both the server URL and your key.');
    return;
  }

  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting…';

  try {
    await chrome.storage.local.set({ serverUrl, extensionKey });

    const cookies = await readLinkedInCookies();
    const hasSession = cookies.some((c) => c.name === 'li_at' && c.value);
    if (!hasSession) {
      showMessage(
        'error',
        'You are not logged in to LinkedIn in this browser.\nOpen linkedin.com, sign in, then click Connect again.'
      );
      return;
    }

    const response = await fetch(`${serverUrl}/api/linkedin-session/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-extension-key': extensionKey,
      },
      body: JSON.stringify({ cookies }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      const reason = payload?.error?.message || payload?.message || `Server returned ${response.status}`;
      showMessage('error', `Could not connect: ${reason}`);
      return;
    }

    showMessage('success', 'LinkedIn connected! You can close this and use the app.');
  } catch (error) {
    showMessage('error', `Something went wrong: ${error.message}. Check the server URL.`);
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect LinkedIn';
  }
}

connectBtn.addEventListener('click', connect);
