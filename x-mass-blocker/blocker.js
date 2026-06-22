(function () {
  if (window.__xMassBlockerInjected) return;
  window.__xMassBlockerInjected = true;

  let stopped = false;
  let port = null;

  chrome.runtime.onConnect.addListener((p) => {
    if (p.name !== 'mass-blocker') return;
    port = p;

    port.onMessage.addListener(async (msg) => {
      if (msg.action === 'start') {
        stopped = false;
        await runBlocker();
      } else if (msg.action === 'stop') {
        stopped = true;
      }
    });
  });

  function log(text, cls) {
    if (port) port.postMessage({ type: 'log', text, cls });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function waitForElement(selector, root = document, timeout = 5000) {
    return new Promise((resolve) => {
      const existing = root.querySelector(selector);
      if (existing) return resolve(existing);

      const observer = new MutationObserver(() => {
        const el = root.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(root, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  function getTweetCells() {
    return document.querySelectorAll('[data-testid="cellInnerDiv"]');
  }

  function findMoreButton(cell) {
    return cell.querySelector('[data-testid="caret"]');
  }

  function findBlockMenuItem() {
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    for (const item of menuItems) {
      const text = item.textContent || '';
      if (text.includes('Block @') || text.includes('Block @')) {
        return item;
      }
    }
    return null;
  }

  function findConfirmBlockButton() {
    const buttons = document.querySelectorAll('[data-testid="confirmationSheetConfirm"]');
    if (buttons.length) return buttons[0];

    const allButtons = document.querySelectorAll('[role="button"]');
    for (const btn of allButtons) {
      const text = (btn.textContent || '').trim();
      if (text === 'Block') return btn;
    }
    return null;
  }

  function getUsernameFromCell(cell) {
    const links = cell.querySelectorAll('a[href^="/"][role="link"]');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && href.match(/^\/[A-Za-z0-9_]+$/) && href !== '/home' && href !== '/explore') {
        return href.substring(1);
      }
    }

    const spans = cell.querySelectorAll('span');
    for (const span of spans) {
      const text = (span.textContent || '').trim();
      if (text.startsWith('@')) return text.substring(1);
    }
    return null;
  }

  function dismissMenu() {
    const overlay = document.querySelector('[data-testid="Dropdown"]');
    if (overlay) {
      document.body.click();
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  async function blockUserViaMenu(cell, username) {
    const moreBtn = findMoreButton(cell);
    if (!moreBtn) {
      log(`@${username}: no menu button found, skipping`, 'log-skip');
      return false;
    }

    moreBtn.click();
    await sleep(600);

    const blockItem = findBlockMenuItem();
    if (!blockItem) {
      log(`@${username}: no Block option in menu, skipping`, 'log-skip');
      dismissMenu();
      await sleep(300);
      return false;
    }

    blockItem.click();
    await sleep(600);

    const confirmBtn = findConfirmBlockButton();
    if (!confirmBtn) {
      log(`@${username}: no confirm button found, skipping`, 'log-skip');
      dismissMenu();
      await sleep(300);
      return false;
    }

    confirmBtn.click();
    await sleep(500);

    log(`Blocked @${username}`, 'log-blocked');
    return true;
  }

  async function runBlocker() {
    const cells = getTweetCells();
    log(`Found ${cells.length} tweet cells on page`);

    const seen = new Set();
    let blocked = 0;
    let skipped = 0;

    for (const cell of cells) {
      if (stopped) {
        log('Stopped by user.');
        break;
      }

      const username = getUsernameFromCell(cell);
      if (!username) {
        skipped++;
        continue;
      }
      if (seen.has(username)) {
        continue;
      }
      seen.add(username);

      log(`Processing @${username}...`, 'log-info');

      const success = await blockUserViaMenu(cell, username);
      if (success) {
        blocked++;
      } else {
        skipped++;
      }

      await sleep(800);
    }

    if (port) {
      port.postMessage({ type: 'done', blocked, skipped });
    }

    window.__xMassBlockerInjected = false;
  }
})();
