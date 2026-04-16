const DEFAULTS = {
  verbatim: true,
  nopws: true,
  nofilter: true,
  nosafe: true,
};

const ids = ['verbatim', 'nopws', 'nofilter', 'nosafe'];

chrome.storage.sync.get(DEFAULTS, (settings) => {
  for (const id of ids) {
    const el = document.getElementById(id);
    el.checked = settings[id];
    el.addEventListener('change', () => {
      chrome.storage.sync.set({ [id]: el.checked });
    });
  }
});
