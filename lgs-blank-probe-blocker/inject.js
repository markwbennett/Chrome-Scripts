/**
 * LGS Blank-Probe Blocker — page-context (MAIN world) patch.
 *
 * portal.lgsonlinesolutions.com (and other LGS portal frames) run a
 * popup-blocker probe that does:
 *   window.open('about:blank', '', 'top=1000,height=10,width=10,...')
 * then immediately .close(). On Chromium/Vivaldi the open often becomes a
 * real tab; .close() fails or races, so about:blank tabs pile up and steal
 * focus. The same pattern is used after login when navigating menus/links.
 *
 * Strategy: intercept blank/empty window.open, return a fake Window that
 * supports .close() / .focus() / location navigation. Real URLs still open
 * normally. If a page later assigns a real URL onto the fake window, we open
 * a real window at that point.
 */
(function () {
  "use strict";

  if (window.__lgsBlankProbeBlockerInstalled) return;
  window.__lgsBlankProbeBlockerInstalled = true;

  var origOpen = window.open;

  function isBlankUrl(url) {
    if (url == null || url === false) return true;
    var s = String(url).trim();
    if (s === "" || s === "about:blank") return true;
    // Chromium sometimes produces this when a popup is blocked mid-flight
    if (s.indexOf("about:blank") === 0) return true;
    return false;
  }

  function isRealUrl(url) {
    if (url == null) return false;
    var s = String(url).trim();
    if (!s || s.indexOf("about:blank") === 0) return false;
    // relative paths, absolute http(s), javascript: rarely used here
    return true;
  }

  function makeFakeWindow(target, features) {
    var real = null;
    var closed = false;
    var locHref = "about:blank";

    function openReal(href) {
      if (!isRealUrl(href)) return;
      if (closed) return;
      try {
        real = origOpen.call(window, href, target || "_blank", features);
      } catch (e) {
        real = null;
      }
      if (real) {
        locHref = href;
      }
    }

    var locationProxy = {
      get href() {
        return locHref;
      },
      set href(v) {
        locHref = String(v);
        openReal(locHref);
      },
      replace: function (v) {
        locHref = String(v);
        openReal(locHref);
      },
      assign: function (v) {
        locHref = String(v);
        openReal(locHref);
      },
      reload: function () {},
      toString: function () {
        return locHref;
      },
    };

    var fakeDoc = {
      open: function () {
        return fakeDoc;
      },
      write: function () {},
      writeln: function () {},
      close: function () {},
      get body() {
        return null;
      },
      get documentElement() {
        return null;
      },
    };

    var fake = {
      closed: false,
      opener: window,
      name: typeof target === "string" ? target : "",
      close: function () {
        closed = true;
        fake.closed = true;
        try {
          if (real && !real.closed) real.close();
        } catch (e) {}
        real = null;
      },
      focus: function () {
        try {
          if (real && !real.closed) real.focus();
        } catch (e) {}
      },
      blur: function () {},
      postMessage: function () {},
      alert: function () {},
      confirm: function () {
        return false;
      },
      print: function () {},
      get location() {
        return locationProxy;
      },
      set location(v) {
        if (typeof v === "string") {
          locHref = v;
          openReal(v);
        } else if (v && typeof v.href === "string") {
          locHref = v.href;
          openReal(v.href);
        }
      },
      get document() {
        try {
          if (real && real.document) return real.document;
        } catch (e) {}
        return fakeDoc;
      },
      // Some older LGS code touches these
      get length() {
        return 0;
      },
      moveTo: function () {},
      resizeTo: function () {},
      scrollTo: function () {},
    };

    return fake;
  }

  function patchedOpen(url, target, features) {
    if (isBlankUrl(url)) {
      // Satisfies PopBlockTest: truthy return value + close() → PopBlock = 'NO'
      return makeFakeWindow(target, features);
    }
    return origOpen.call(window, url, target, features);
  }

  try {
    Object.defineProperty(window, "open", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: patchedOpen,
    });
  } catch (e) {
    window.open = patchedOpen;
  }

  // Also patch Window.prototype.open so frame-local lookups still hit us
  try {
    if (Window && Window.prototype && Window.prototype.open === origOpen) {
      Object.defineProperty(Window.prototype, "open", {
        configurable: true,
        enumerable: true,
        writable: true,
        value: function (url, target, features) {
          // When called as window.open, `this` is the window
          if (this === window || this === self) {
            return patchedOpen(url, target, features);
          }
          try {
            return origOpen.call(this, url, target, features);
          } catch (e) {
            return patchedOpen(url, target, features);
          }
        },
      });
    }
  } catch (e) {}

  // Optional: if login form is present, mark popups as allowed without the
  // real probe. Harmless if the form appears later; login.js rewrites BROWSER
  // anyway. Kept for frames that re-run probes via other scripts.
  function markNoBlockIfFormReady() {
    try {
      var form = document.main || document.forms.namedItem("main");
      if (form && form.BROWSER && form.BROWSER.value === "NOBLOCKTEST") {
        // already skipped by page config
        return;
      }
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markNoBlockIfFormReady, {
      once: true,
    });
  } else {
    markNoBlockIfFormReady();
  }
})();
