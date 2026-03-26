// Intercepts Google search navigations and appends tbs=li:1 (verbatim)
// if it is not already present. Handles existing tbs parameters by
// appending ,li:1 rather than overwriting.

chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    if (details.frameId !== 0) return; // main frame only

    const url = new URL(details.url);

    // Only process pages that have a query (ignore bare /search)
    if (!url.searchParams.has('q')) return;

    const tbs = url.searchParams.get('tbs');
    if (hasVerbatim(tbs)) return;

    const newTbs = tbs ? `${tbs},li:1` : 'li:1';
    url.searchParams.set('tbs', newTbs);

    chrome.tabs.update(details.tabId, { url: url.toString() });
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
