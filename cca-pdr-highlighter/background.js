/**
 * Texas Appellate Highlighter — service worker.
 * Fetches and caches CCA + COA status maps from iacls.org.
 */

const MAPS = {
  cca: {
    urls: [
      "https://iacls.org/cca/status_map.json",
      "https://www.iacls.org/cca/status_map.json",
    ],
    storageKey: "ccaStatusMapCache",
    court: "cca",
  },
  coa: {
    urls: [
      "https://iacls.org/coa/status_map.json",
      "https://www.iacls.org/coa/status_map.json",
    ],
    storageKey: "coaStatusMapCache",
    court: "coa",
  },
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function fetchStatusMap(spec) {
  let lastError = null;
  for (const url of spec.urls) {
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
      return { data, url, fetchedAt: Date.now(), court: spec.court };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error(`Failed to fetch ${spec.court} status map`);
}

async function readCache(spec) {
  const stored = await chrome.storage.local.get(spec.storageKey);
  return stored[spec.storageKey] || null;
}

async function writeCache(spec, entry) {
  await chrome.storage.local.set({ [spec.storageKey]: entry });
}

async function getStatusMap(court, { force = false } = {}) {
  const spec = MAPS[court];
  if (!spec) throw new Error(`Unknown court ${court}`);

  if (!force) {
    const cached = await readCache(spec);
    if (cached && cached.data && cached.fetchedAt) {
      if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return { ...cached, fromCache: true, court: spec.court };
      }
    }
  }

  try {
    const fresh = await fetchStatusMap(spec);
    await writeCache(spec, fresh);
    return { ...fresh, fromCache: false };
  } catch (err) {
    const cached = await readCache(spec);
    if (cached && cached.data) {
      return {
        ...cached,
        fromCache: true,
        stale: true,
        court: spec.court,
        error: String(err),
      };
    }
    throw err;
  }
}

async function getBothMaps({ force = false } = {}) {
  const settled = await Promise.allSettled([
    getStatusMap("cca", { force }),
    getStatusMap("coa", { force }),
  ]);
  const cca = settled[0].status === "fulfilled" ? settled[0].value : null;
  const coa = settled[1].status === "fulfilled" ? settled[1].value : null;
  const errors = [];
  if (settled[0].status === "rejected") errors.push(`cca: ${settled[0].reason}`);
  if (settled[1].status === "rejected") errors.push(`coa: ${settled[1].reason}`);
  if (!cca && !coa) {
    throw new Error(errors.join("; ") || "Failed to load status maps");
  }
  return { cca, coa, errors };
}

function lookupHits(wanted, cca, coa) {
  const ccaMap = (cca && cca.data && cca.data.cases) || {};
  const coaMap = (coa && coa.data && coa.data.cases) || {};
  const hits = {};
  for (const cn of wanted) {
    const key = String(cn || "").trim().toUpperCase();
    if (!key) continue;
    if (Object.prototype.hasOwnProperty.call(ccaMap, key)) {
      hits[key] = { stage: ccaMap[key], court: "cca" };
    } else if (Object.prototype.hasOwnProperty.call(coaMap, key)) {
      hits[key] = { stage: coaMap[key], court: "coa" };
    }
  }
  return hits;
}

function mapsMeta(cca, coa, extraError) {
  const errors = [];
  if (cca && cca.error) errors.push(cca.error);
  if (coa && coa.error) errors.push(coa.error);
  if (extraError) errors.push(extraError);
  return {
    highlight: (cca && cca.data && cca.data.highlight) || null,
    coa_highlight: (coa && coa.data && coa.data.highlight) || null,
    as_of: (cca && cca.data && cca.data.as_of) || null,
    coa_as_of: (coa && coa.data && coa.data.as_of) || null,
    generated_at: (cca && cca.data && cca.data.generated_at) || null,
    coa_generated_at: (coa && coa.data && coa.data.generated_at) || null,
    n_cases: (cca && cca.data && cca.data.n_cases) || null,
    coa_n_cases: (coa && coa.data && coa.data.n_cases) || null,
    fromCache: Boolean((cca && cca.fromCache) || (coa && coa.fromCache)),
    stale: Boolean((cca && cca.stale) || (coa && coa.stale)),
    url: (cca && cca.url) || null,
    coa_url: (coa && coa.url) || null,
    error: errors.length ? errors.join("; ") : null,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  if (message.type === "GET_STATUS_MAP") {
    getBothMaps({ force: Boolean(message.force) })
      .then(({ cca, coa, errors }) => {
        sendResponse({
          ok: true,
          data: cca ? cca.data : null,
          coa_data: coa ? coa.data : null,
          fromCache: Boolean((cca && cca.fromCache) || (coa && coa.fromCache)),
          stale: Boolean((cca && cca.stale) || (coa && coa.stale)),
          fetchedAt: (cca && cca.fetchedAt) || (coa && coa.fetchedAt) || null,
          url: (cca && cca.url) || null,
          coa_url: (coa && coa.url) || null,
          error: errors.length ? errors.join("; ") : (cca && cca.error) || (coa && coa.error) || null,
        });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
    return true; // async
  }

  if (message.type === "LOOKUP_CASES") {
    const wanted = Array.isArray(message.caseNumbers) ? message.caseNumbers : [];
    getBothMaps({ force: Boolean(message.force) })
      .then(({ cca, coa, errors }) => {
        sendResponse({
          ok: true,
          hits: lookupHits(wanted, cca, coa),
          ...mapsMeta(cca, coa, errors.length ? errors.join("; ") : null),
        });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
    return true;
  }

  return false;
});

function warm(force) {
  getBothMaps({ force }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  warm(true);
});

chrome.runtime.onStartup.addListener(() => {
  warm(false);
});
