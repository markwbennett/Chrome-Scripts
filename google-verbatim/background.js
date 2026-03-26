// Intercepts Google search navigations and ensures:
//   tbs=li:1   — verbatim (no synonyms, no spelling correction)
//   pws=0      — no personalized results
//   filter=0   — show omitted/similar results

chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    if (details.frameId !== 0) return; // main frame only

    const url = new URL(details.url);

    // Only process pages that have a query (ignore bare /search)
    if (!url.searchParams.has('q')) return;

    let changed = false;

    // tbs=li:1 — append to existing tbs if not already present
    const tbs = url.searchParams.get('tbs');
    if (!hasVerbatim(tbs)) {
      url.searchParams.set('tbs', tbs ? `${tbs},li:1` : 'li:1');
      changed = true;
    }

    // pws=0 — disable personalization
    if (url.searchParams.get('pws') !== '0') {
      url.searchParams.set('pws', '0');
      changed = true;
    }

    // filter=0 — disable duplicate filtering
    if (url.searchParams.get('filter') !== '0') {
      url.searchParams.set('filter', '0');
      changed = true;
    }

    if (changed) {
      chrome.tabs.update(details.tabId, { url: url.toString() });
    }
  },
  {
    url: [{
      hostEquals: 'www.google.com',
      pathPrefix: '/search'
    }]
  }
);

function hasVerbatim(tbs) {
  if (!tbs) return false;
  return tbs.split(',').some((v) => v.trim() === 'li:1');
}
