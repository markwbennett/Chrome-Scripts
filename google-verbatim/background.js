// Intercepts Google search navigations and applies enabled settings:
//   verbatim  — tbs=li:1  (no synonyms, no spelling correction)
//   nopws     — pws=0     (no personalized results)
//   nofilter  — filter=0  (show omitted/similar results)
//   nosafe    — safe=off  (disable SafeSearch)

const DEFAULTS = {
  verbatim: true,
  nopws: true,
  nofilter: true,
  nosafe: true,
};

chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    if (details.frameId !== 0) return; // main frame only

    const url = new URL(details.url);

    // Only process pages that have a query (ignore bare /search)
    if (!url.searchParams.has('q')) return;

    chrome.storage.sync.get(DEFAULTS, (settings) => {
      let changed = false;

      // tbs=li:1 — verbatim
      if (settings.verbatim) {
        const tbs = url.searchParams.get('tbs');
        if (!hasVerbatim(tbs)) {
          url.searchParams.set('tbs', tbs ? `${tbs},li:1` : 'li:1');
          changed = true;
        }
      }

      // pws=0 — disable personalization
      if (settings.nopws && url.searchParams.get('pws') !== '0') {
        url.searchParams.set('pws', '0');
        changed = true;
      }

      // filter=0 — disable duplicate filtering
      if (settings.nofilter && url.searchParams.get('filter') !== '0') {
        url.searchParams.set('filter', '0');
        changed = true;
      }

      // safe=off — disable SafeSearch
      if (settings.nosafe && url.searchParams.get('safe') !== 'off') {
        url.searchParams.set('safe', 'off');
        changed = true;
      }

      if (changed) {
        chrome.tabs.update(details.tabId, { url: url.toString() });
      }
    });
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
