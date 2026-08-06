/**
 * Belt-and-suspenders: if any about:blank tab still slips through and was
 * opened from an LGS portal tab, close it after a short settle period.
 *
 * Real navigations (blank → actual URL within the settle window) are left alone.
 */

const LGS_HOST_RE = /(^|\.)lgsonlinesolutions\.com$/i;
const SETTLE_MS = 600;
const watched = new Map(); // tabId -> timeoutId

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return "";
  }
}

function isLgsUrl(url) {
  if (!url) return false;
  return LGS_HOST_RE.test(hostOf(url));
}

function isBlankTab(tab) {
  const u = tab.url || tab.pendingUrl || "";
  return u === "" || u === "about:blank" || u.indexOf("about:blank") === 0;
}

async function openerIsLgs(tab) {
  if (tab.openerTabId == null) return false;
  try {
    const opener = await chrome.tabs.get(tab.openerTabId);
    return isLgsUrl(opener.url);
  } catch (e) {
    return false;
  }
}

function scheduleWatch(tabId) {
  if (watched.has(tabId)) {
    clearTimeout(watched.get(tabId));
  }
  const tid = setTimeout(async () => {
    watched.delete(tabId);
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!isBlankTab(tab)) return;
      if (!(await openerIsLgs(tab))) return;
      await chrome.tabs.remove(tabId);
    } catch (e) {
      // tab already gone
    }
  }, SETTLE_MS);
  watched.set(tabId, tid);
}

chrome.tabs.onCreated.addListener((tab) => {
  if (isBlankTab(tab)) {
    scheduleWatch(tab.id);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    if (isBlankTab(tab)) {
      scheduleWatch(tabId);
    } else if (watched.has(tabId)) {
      clearTimeout(watched.get(tabId));
      watched.delete(tabId);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (watched.has(tabId)) {
    clearTimeout(watched.get(tabId));
    watched.delete(tabId);
  }
});
