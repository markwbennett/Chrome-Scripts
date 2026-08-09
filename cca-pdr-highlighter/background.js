/**
 * CCA PDR Highlighter — service worker.
 * Fetches and caches status_map.json from iacls.org.
 */

const STATUS_URLS = [
  "https://iacls.org/cca/status_map.json",
  "https://www.iacls.org/cca/status_map.json",
];

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const STORAGE_KEY = "ccaStatusMapCache";

async function fetchStatusMap() {
  let lastError = null;
  for (const url of STATUS_URLS) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} from ${url}`);
        continue;
      }
      const data = await res.json();
      if (!data || typeof data.cases !== "object") {
        lastError = new Error(`Invalid payload from ${url}`);
        continue;
      }
      return { data, url, fetchedAt: Date.now() };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Failed to fetch status map");
}

async function readCache() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] || null;
}

async function writeCache(entry) {
  await chrome.storage.local.set({ [STORAGE_KEY]: entry });
}

async function getStatusMap({ force = false } = {}) {
  if (!force) {
    const cached = await readCache();
    if (cached && cached.data && cached.fetchedAt) {
      if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return { ...cached, fromCache: true };
      }
    }
  }

  try {
    const fresh = await fetchStatusMap();
    await writeCache(fresh);
    return { ...fresh, fromCache: false };
  } catch (err) {
    const cached = await readCache();
    if (cached && cached.data) {
      return { ...cached, fromCache: true, stale: true, error: String(err) };
    }
    throw err;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  if (message.type === "GET_STATUS_MAP") {
    getStatusMap({ force: Boolean(message.force) })
      .then((result) => {
        sendResponse({
          ok: true,
          data: result.data,
          fromCache: result.fromCache,
          stale: Boolean(result.stale),
          fetchedAt: result.fetchedAt,
          url: result.url,
          error: result.error || null,
        });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
    return true; // async
  }

  if (message.type === "LOOKUP_CASES") {
    const wanted = Array.isArray(message.caseNumbers) ? message.caseNumbers : [];
    getStatusMap({ force: Boolean(message.force) })
      .then((result) => {
        const map = result.data.cases || {};
        const hits = {};
        for (const cn of wanted) {
          const key = String(cn || "").trim().toUpperCase();
          if (key && map[key]) {
            hits[key] = map[key];
          }
        }
        sendResponse({
          ok: true,
          hits,
          highlight: result.data.highlight || null,
          as_of: result.data.as_of || null,
          generated_at: result.data.generated_at || null,
          n_cases: result.data.n_cases || null,
          fromCache: result.fromCache,
          stale: Boolean(result.stale),
          error: result.error || null,
        });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
    return true;
  }

  return false;
});

// Warm cache on install / browser start
chrome.runtime.onInstalled.addListener(() => {
  getStatusMap({ force: true }).catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  getStatusMap({ force: false }).catch(() => {});
});
