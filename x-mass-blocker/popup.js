const blockBtn = document.getElementById('blockBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');

let port = null;

function addLog(text, cls = 'log-info') {
  const line = document.createElement('div');
  line.className = `log-line ${cls}`;
  line.textContent = text;
  statusDiv.appendChild(line);
  statusDiv.scrollTop = statusDiv.scrollHeight;
}

function clearLog() {
  statusDiv.innerHTML = '';
  statusDiv.className = '';
}

blockBtn.addEventListener('click', async () => {
  clearLog();
  blockBtn.disabled = true;
  stopBtn.style.display = 'block';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.includes('x.com')) {
    addLog('Not on x.com. Navigate to an X search page first.', 'log-skip');
    blockBtn.disabled = false;
    stopBtn.style.display = 'none';
    return;
  }

  addLog('Injecting blocker script...');

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['blocker.js']
    });
  } catch (e) {
    addLog('Failed to inject: ' + e.message, 'log-skip');
    blockBtn.disabled = false;
    stopBtn.style.display = 'none';
    return;
  }

  port = chrome.tabs.connect(tab.id, { name: 'mass-blocker' });

  port.onMessage.addListener((msg) => {
    if (msg.type === 'log') {
      addLog(msg.text, msg.cls || 'log-info');
    } else if (msg.type === 'done') {
      addLog(`Done. Blocked ${msg.blocked} user(s), skipped ${msg.skipped}.`, 'log-info');
      blockBtn.disabled = false;
      stopBtn.style.display = 'none';
      port = null;
    }
  });

  port.postMessage({ action: 'start' });
});

stopBtn.addEventListener('click', () => {
  if (port) {
    port.postMessage({ action: 'stop' });
  }
  blockBtn.disabled = false;
  stopBtn.style.display = 'none';
});
