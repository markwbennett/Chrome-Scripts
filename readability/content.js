(() => {
  if (window.__readabilityLoaded) return;
  window.__readabilityLoaded = true;

  const STYLE_ID = 'readability-overrides';
  const PANEL_ID = 'readability-floating-panel';
  const HOST = location.hostname || '_local';
  const STORAGE_KEY = `readability:${HOST}`;

  const DEFAULTS = {
    enabled: false,
    panelVisible: true,
    panelCollapsed: true,
    textScale: 100,
    bgShift: 0,
    fgShift: 0,
    linkShift: 0,
    fontWeightShift: 0,
    minBodyMargin: 48,
  };

  let state = { ...DEFAULTS };
  let panelRoot = null;
  let panelShadow = null;
  let saveTimer = null;
  let applyScheduled = false;
  let marginAppliedLeft = false;
  let marginAppliedRight = false;

  // Map<Element, { c: [r,g,b]|null, bg: [r,g,b,a]|null, isLink: bool }>
  const colorCache = new Map();
  let observer = null;

  function isContextValid() {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  }

  function loadState() {
    return new Promise((resolve) => {
      if (!isContextValid()) { resolve(); return; }
      try {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
          if (chrome.runtime.lastError) { resolve(); return; }
          const stored = result[STORAGE_KEY];
          if (stored && typeof stored === 'object') {
            state = { ...DEFAULTS, ...stored };
          }
          resolve();
        });
      } catch (e) {
        resolve();
      }
    });
  }

  function saveStateSoon() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!isContextValid()) return;
      try {
        chrome.storage.local.set({ [STORAGE_KEY]: state });
      } catch (e) {
        // Extension context invalidated (e.g. after reload); ignore.
      }
    }, 120);
  }

  function parseRgba(str) {
    if (!str) return null;
    const m = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/);
    if (!m) return null;
    return [
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
      m[4] !== undefined ? Number(m[4]) : 1,
    ];
  }

  function shiftColor(rgb, shift) {
    if (!rgb || shift === 0) return rgb;
    const t = Math.abs(shift) / 100;
    const target = shift > 0 ? 255 : 0;
    return [
      Math.round(rgb[0] * (1 - t) + target * t),
      Math.round(rgb[1] * (1 - t) + target * t),
      Math.round(rgb[2] * (1 - t) + target * t),
    ];
  }

  function rgbStr(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }
  function rgbaStr(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

  function isInPanel(el) {
    if (!el) return false;
    if (el.id === PANEL_ID) return true;
    if (el.closest && el.closest(`#${PANEL_ID}`)) return true;
    return false;
  }

  function captureElement(el) {
    if (!el || el.nodeType !== 1) return;
    if (isInPanel(el)) return;
    if (colorCache.has(el)) return;
    let cs;
    try { cs = getComputedStyle(el); } catch (e) { return; }
    const c = parseRgba(cs.color);
    const bg = parseRgba(cs.backgroundColor);
    const fwRaw = parseInt(cs.fontWeight, 10);
    const fw = Number.isFinite(fwRaw) ? fwRaw : 400;
    const fsRaw = parseFloat(cs.fontSize);
    const fs = Number.isFinite(fsRaw) && fsRaw > 0 ? fsRaw : 16;
    colorCache.set(el, {
      c: c ? [c[0], c[1], c[2]] : null,
      bg: bg && bg[3] > 0 ? bg : null,
      fw,
      fs,
      isLink: el.tagName === 'A',
    });
  }

  function captureAll() {
    // Clear our inline overrides so getComputedStyle reads page-native colors.
    for (const el of colorCache.keys()) {
      try {
        el.style.removeProperty('color');
        el.style.removeProperty('background-color');
        el.style.removeProperty('font-weight');
        el.style.removeProperty('font-size');
      } catch (e) {}
    }
    colorCache.clear();
    if (!document.body) return;
    captureElement(document.documentElement);
    captureElement(document.body);
    const all = document.body.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) captureElement(all[i]);
  }

  function applyShiftsToEntry(el, orig) {
    if (!el.style) return;
    const textShift = orig.isLink ? state.linkShift : state.fgShift;
    if (orig.c) {
      if (textShift !== 0) {
        const c = shiftColor(orig.c, textShift);
        el.style.setProperty('color', rgbStr(c), 'important');
      } else {
        el.style.removeProperty('color');
      }
    }
    if (orig.bg) {
      if (state.bgShift !== 0) {
        const c = shiftColor(orig.bg, state.bgShift);
        el.style.setProperty('background-color', rgbaStr(c, orig.bg[3]), 'important');
      } else {
        el.style.removeProperty('background-color');
      }
    }
    if (state.fontWeightShift !== 0) {
      const w = Math.max(100, Math.min(900, orig.fw + state.fontWeightShift));
      el.style.setProperty('font-weight', String(w), 'important');
    } else {
      el.style.removeProperty('font-weight');
    }
    if (state.textScale !== 100) {
      const px = orig.fs * (state.textScale / 100);
      el.style.setProperty('font-size', `${px.toFixed(2)}px`, 'important');
    } else {
      el.style.removeProperty('font-size');
    }
  }

  function applyShifts() {
    if (!state.enabled) return;
    for (const [el, orig] of colorCache) {
      applyShiftsToEntry(el, orig);
    }
  }

  function scheduleApply() {
    if (applyScheduled) return;
    applyScheduled = true;
    requestAnimationFrame(() => {
      applyScheduled = false;
      applyShifts();
    });
  }

  function clearShifts() {
    for (const el of colorCache.keys()) {
      if (!el.style) continue;
      try {
        el.style.removeProperty('color');
        el.style.removeProperty('background-color');
        el.style.removeProperty('font-weight');
        el.style.removeProperty('font-size');
      } catch (e) {}
    }
  }

  function buildFontCss() {
    return `
      html, body {
        line-height: 1.55 !important;
      }
    `;
  }

  function applyMinBodyMargins() {
    const body = document.body;
    if (!body) return;
    if (marginAppliedLeft) {
      body.style.removeProperty('margin-left');
      body.style.removeProperty('padding-left');
      marginAppliedLeft = false;
    }
    if (marginAppliedRight) {
      body.style.removeProperty('margin-right');
      body.style.removeProperty('padding-right');
      marginAppliedRight = false;
    }
    if (!state.enabled) return;
    const min = state.minBodyMargin;
    if (!min || min <= 0) return;
    let cs;
    try { cs = getComputedStyle(body); } catch (e) { return; }
    const ml = parseFloat(cs.marginLeft) + parseFloat(cs.paddingLeft);
    const mr = parseFloat(cs.marginRight) + parseFloat(cs.paddingRight);
    if (ml < min) {
      body.style.marginLeft = `${min}px`;
      body.style.paddingLeft = '0px';
      marginAppliedLeft = true;
    }
    if (mr < min) {
      body.style.marginRight = `${min}px`;
      body.style.paddingRight = '0px';
      marginAppliedRight = true;
    }
  }

  function applyFontStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!state.enabled) {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = buildFontCss();
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      let dirty = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (isInPanel(node)) continue;
          captureElement(node);
          if (node.getElementsByTagName) {
            const sub = node.getElementsByTagName('*');
            for (let i = 0; i < sub.length; i++) captureElement(sub[i]);
          }
          dirty = true;
        }
        for (const node of m.removedNodes) {
          if (node.nodeType !== 1) continue;
          colorCache.delete(node);
        }
      }
      if (dirty) scheduleApply();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function enableEffect() {
    applyFontStyle();
    captureAll();
    applyShifts();
    startObserver();
  }

  function disableEffect() {
    stopObserver();
    clearShifts();
    colorCache.clear();
    applyFontStyle();
  }

  function applyAll() {
    applyMinBodyMargins();
    if (state.enabled) {
      if (colorCache.size === 0) {
        enableEffect();
      } else {
        applyFontStyle();
        scheduleApply();
      }
    } else {
      disableEffect();
    }
  }

  function ensurePanel() {
    if (panelRoot && document.documentElement.contains(panelRoot)) return;

    panelRoot = document.createElement('div');
    panelRoot.id = PANEL_ID;
    panelRoot.style.cssText = `
      all: initial;
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
    `;
    panelShadow = panelRoot.attachShadow({ mode: 'open' });

    panelShadow.innerHTML = `
      <style>
        :host { all: initial; }
        .panel {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
          font-size: 12px;
          color: #1a1a1a;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(0, 0, 0, 0.18);
          border-radius: 10px;
          box-shadow: 0 6px 22px rgba(0, 0, 0, 0.18);
          width: 240px;
          user-select: none;
          backdrop-filter: blur(6px);
          opacity: 0.85;
          transition: opacity 0.15s, width 0.15s;
        }
        .panel:hover, .panel:focus-within { opacity: 1; }
        .panel.is-collapsed { width: auto; }
        .panel.is-collapsed .host { display: none; }
        .panel.is-collapsed .header { border-bottom: 0; padding: 5px 8px; }
        .panel.is-collapsed .title { font-size: 11px; }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          cursor: move;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }
        .title { font-weight: 600; font-size: 12px; }
        .host { font-size: 10px; opacity: 0.6; margin-left: 6px; }
        .header-buttons { display: flex; gap: 4px; }
        button.icon {
          all: unset;
          cursor: pointer;
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          color: #555;
          font-size: 14px;
          line-height: 1;
        }
        button.icon:hover { background: rgba(0,0,0,0.06); }
        .body { padding: 8px 10px 10px; }
        .body.collapsed { display: none; }
        .row { margin: 6px 0; }
        .row-label {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 3px;
        }
        .row-label .value { opacity: 0.6; font-variant-numeric: tabular-nums; }
        input[type=range] {
          width: 100%;
          margin: 0;
        }
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0 8px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          margin-bottom: 6px;
        }
        .hint {
          font-size: 10px;
          opacity: 0.55;
          text-align: center;
          margin-top: 2px;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 6px;
          margin-top: 4px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
        }
        button.text {
          all: unset;
          cursor: pointer;
          font-size: 11px;
          color: #1a73e8;
          padding: 2px 4px;
          border-radius: 3px;
        }
        button.text:hover { background: rgba(26,115,232,0.08); }
        .switch {
          position: relative;
          width: 32px;
          height: 18px;
          flex-shrink: 0;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute; inset: 0;
          background: #ccc;
          border-radius: 18px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .slider::before {
          content: "";
          position: absolute;
          height: 14px; width: 14px;
          left: 2px; bottom: 2px;
          background: white;
          border-radius: 50%;
          transition: transform 0.15s;
        }
        input:checked + .slider { background: #1a73e8; }
        input:checked + .slider::before { transform: translateX(14px); }
      </style>
      <div class="panel" id="panel">
        <div class="header" id="header">
          <div>
            <span class="title">Readability</span>
            <span class="host" id="host"></span>
          </div>
          <div class="header-buttons">
            <button class="icon" id="collapse" title="Collapse">−</button>
            <button class="icon" id="close" title="Hide on this site">×</button>
          </div>
        </div>
        <div class="body" id="body">
          <div class="toggle-row">
            <span>Apply on this site</span>
            <label class="switch">
              <input type="checkbox" id="enabled">
              <span class="slider"></span>
            </label>
          </div>
          <div class="row">
            <div class="row-label"><span>Text size</span><span class="value" id="v-font"></span></div>
            <input type="range" id="font" min="50" max="300" step="5">
          </div>
          <div class="row">
            <div class="row-label"><span>Font weight</span><span class="value" id="v-fw"></span></div>
            <input type="range" id="fw" min="-400" max="400" step="50">
          </div>
          <div class="row">
            <div class="row-label"><span>Background</span><span class="value" id="v-bg"></span></div>
            <input type="range" id="bg" min="-100" max="100" step="1">
          </div>
          <div class="row">
            <div class="row-label"><span>Text</span><span class="value" id="v-fg"></span></div>
            <input type="range" id="fg" min="-100" max="100" step="1">
          </div>
          <div class="row">
            <div class="row-label"><span>Links</span><span class="value" id="v-link"></span></div>
            <input type="range" id="link" min="-100" max="100" step="1">
          </div>
          <div class="hint">−100 → black · 0 = native · +100 → white</div>
          <div class="row" style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.08);">
            <div class="row-label"><span>Min body margin</span><span class="value" id="v-margin"></span></div>
            <input type="range" id="margin" min="0" max="96" step="4">
          </div>
          <div class="footer">
            <button class="text" id="reset">Reset this site</button>
            <button class="text" id="recapture" title="Re-read native colors">Recapture</button>
          </div>
        </div>
      </div>
    `;

    (document.body || document.documentElement).appendChild(panelRoot);
    wirePanel();
    refreshPanel();
    makeDraggable();
  }

  function fmtShift(v) {
    if (v === 0) return '0';
    return v > 0 ? `+${v}` : `${v}`;
  }

  function refreshPanel() {
    if (!panelShadow) return;
    const $ = (sel) => panelShadow.querySelector(sel);
    $('#host').textContent = HOST;
    $('#enabled').checked = !!state.enabled;
    $('#font').value = state.textScale;
    $('#v-font').textContent = `${state.textScale}%`;
    $('#fw').value = state.fontWeightShift;
    $('#v-fw').textContent = fmtShift(state.fontWeightShift);
    $('#bg').value = state.bgShift;
    $('#v-bg').textContent = fmtShift(state.bgShift);
    $('#fg').value = state.fgShift;
    $('#v-fg').textContent = fmtShift(state.fgShift);
    $('#link').value = state.linkShift;
    $('#v-link').textContent = fmtShift(state.linkShift);
    $('#margin').value = state.minBodyMargin;
    $('#v-margin').textContent = `${state.minBodyMargin}px`;
    const body = $('#body');
    const panel = $('#panel');
    if (state.panelCollapsed) {
      body.classList.add('collapsed');
      panel.classList.add('is-collapsed');
    } else {
      body.classList.remove('collapsed');
      panel.classList.remove('is-collapsed');
    }
    $('#collapse').textContent = state.panelCollapsed ? '+' : '−';
    $('#collapse').title = state.panelCollapsed ? 'Expand' : 'Collapse';
  }

  function wirePanel() {
    const $ = (sel) => panelShadow.querySelector(sel);
    $('#enabled').addEventListener('change', (e) => {
      state.enabled = e.target.checked;
      applyAll();
      saveStateSoon();
    });
    const onSlide = (id, key) => {
      const el = $(`#${id}`);
      el.addEventListener('input', (e) => {
        state[key] = Number(e.target.value);
        if (!state.enabled) {
          state.enabled = true;
          $('#enabled').checked = true;
          applyAll();
        } else {
          scheduleApply();
        }
        refreshPanel();
        saveStateSoon();
      });
    };
    onSlide('font', 'textScale');
    onSlide('fw', 'fontWeightShift');
    onSlide('bg', 'bgShift');
    onSlide('fg', 'fgShift');
    onSlide('link', 'linkShift');

    $('#margin').addEventListener('input', (e) => {
      state.minBodyMargin = Number(e.target.value);
      if (!state.enabled) {
        state.enabled = true;
        $('#enabled').checked = true;
        applyAll();
      } else {
        applyMinBodyMargins();
      }
      refreshPanel();
      saveStateSoon();
    });

    $('#collapse').addEventListener('click', () => {
      state.panelCollapsed = !state.panelCollapsed;
      refreshPanel();
      saveStateSoon();
    });
    $('#close').addEventListener('click', () => {
      state.panelVisible = false;
      removePanel();
      saveStateSoon();
    });
    $('#reset').addEventListener('click', () => {
      const visible = state.panelVisible;
      const collapsed = state.panelCollapsed;
      state = { ...DEFAULTS, panelVisible: visible, panelCollapsed: collapsed };
      applyAll();
      refreshPanel();
      saveStateSoon();
    });
    $('#recapture').addEventListener('click', () => {
      if (!state.enabled) return;
      captureAll();
      scheduleApply();
    });
  }

  function makeDraggable() {
    const header = panelShadow.querySelector('#header');
    let dragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      const rect = panelRoot.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      startX = e.clientX;
      startY = e.clientY;
      panelRoot.style.right = 'auto';
      panelRoot.style.left = `${startLeft}px`;
      panelRoot.style.top = `${startTop}px`;
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panelRoot.style.left = `${Math.max(0, startLeft + dx)}px`;
      panelRoot.style.top = `${Math.max(0, startTop + dy)}px`;
    });
    window.addEventListener('mouseup', () => { dragging = false; });
  }

  function removePanel() {
    if (panelRoot && panelRoot.parentNode) {
      panelRoot.parentNode.removeChild(panelRoot);
    }
    panelRoot = null;
    panelShadow = null;
  }

  function togglePanel() {
    state.panelVisible = !state.panelVisible;
    if (state.panelVisible) {
      ensurePanel();
    } else {
      removePanel();
    }
    saveStateSoon();
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'readability:togglePanel') {
      togglePanel();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[STORAGE_KEY]) {
      const next = changes[STORAGE_KEY].newValue;
      if (next && typeof next === 'object') {
        state = { ...DEFAULTS, ...next };
        applyAll();
        if (panelShadow) refreshPanel();
      }
    }
  });

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
      return;
    }
    applyMinBodyMargins();
    if (state.enabled) enableEffect();
    if (state.panelVisible) ensurePanel();
  }

  loadState().then(init);
})();
