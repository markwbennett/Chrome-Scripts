/**
 * CCA PDR Highlighter — content script for search.txcourts.gov.
 * Colors result rows by PDR stage from the IACLS status map.
 */

(function () {
  "use strict";

  const CASE_RE = /\bPD-\d{4}-\d{2}\b/gi;
  const CASE_RE_STRICT = /^PD-\d{4}-\d{2}$/i;
  const ATTR_MARK = "data-cca-pdr-stage";
  const ATTR_CASE = "data-cca-pdr-case";
  const LEGEND_ID = "cca-pdr-highlighter-legend";

  const DEFAULT_COLORS = {
    granted_pending: "#f5e663",
    submitted: "#7dcea0",
    decided: "#b0b0b0",
    refused: "#f1948a",
  };

  const STAGE_LABELS = {
    granted_pending: "Granted",
    submitted: "Submitted",
    decided: "Decided",
    refused: "Refused",
  };

  let lastSignature = "";
  let highlightMeta = null;
  let debounceTimer = null;
  let busy = false;

  function normalizeCase(cn) {
    return String(cn || "").trim().toUpperCase();
  }

  function extractCaseFromHref(href) {
    if (!href) return null;
    try {
      const u = new URL(href, location.origin);
      const cn = u.searchParams.get("cn") || u.searchParams.get("CN");
      if (cn && CASE_RE_STRICT.test(cn.trim())) {
        return normalizeCase(cn);
      }
    } catch (_) {
      /* ignore */
    }
    const m = String(href).match(/[?&]cn=(PD-\d{4}-\d{2})/i);
    return m ? normalizeCase(m[1]) : null;
  }

  function findResultRows() {
    const rows = [];
    const seen = new Set();

    // Prefer rows that link to a case detail page
    document.querySelectorAll('a[href*="Case.aspx"], a[href*="case.aspx"]').forEach((a) => {
      const cn = extractCaseFromHref(a.getAttribute("href"));
      if (!cn) return;
      const tr = a.closest("tr");
      if (!tr || seen.has(tr)) return;
      seen.add(tr);
      rows.push({ tr, caseNumber: cn, anchor: a });
    });

    // Fallback: any table row whose text contains a PD number
    if (rows.length === 0) {
      document.querySelectorAll("table tr").forEach((tr) => {
        if (seen.has(tr)) return;
        const text = tr.textContent || "";
        const m = text.match(CASE_RE);
        if (!m) return;
        const cn = normalizeCase(m[0]);
        seen.add(tr);
        rows.push({ tr, caseNumber: cn, anchor: null });
      });
    }

    return rows;
  }

  function pageSignature(rows) {
    return rows.map((r) => r.caseNumber).join("|");
  }

  function applyHighlight(tr, caseNumber, stage, colors) {
    // Clear previous
    tr.removeAttribute(ATTR_MARK);
    tr.removeAttribute(ATTR_CASE);
    tr.classList.remove(
      "cca-pdr-granted",
      "cca-pdr-submitted",
      "cca-pdr-decided",
      "cca-pdr-refused",
      "cca-pdr-other"
    );
    tr.style.removeProperty("background-color");

    if (!stage) return;

    tr.setAttribute(ATTR_MARK, stage);
    tr.setAttribute(ATTR_CASE, caseNumber);

    const color = colors[stage];
    if (color) {
      tr.style.setProperty("background-color", color, "important");
      const cls =
        stage === "granted_pending"
          ? "cca-pdr-granted"
          : stage === "submitted"
            ? "cca-pdr-submitted"
            : stage === "decided"
              ? "cca-pdr-decided"
              : stage === "refused"
                ? "cca-pdr-refused"
                : "cca-pdr-other";
      tr.classList.add(cls);

      // Paint cells too — some table styles override tr background
      tr.querySelectorAll("td, th").forEach((cell) => {
        cell.style.setProperty("background-color", color, "important");
      });
    } else {
      tr.classList.add("cca-pdr-other");
    }

    // Stage chip near the case number if not already present
    let chip = tr.querySelector(".cca-pdr-chip");
    if (!chip) {
      chip = document.createElement("span");
      chip.className = "cca-pdr-chip";
      const target =
        tr.querySelector('a[href*="Case.aspx"], a[href*="case.aspx"]') ||
        tr.querySelector("td");
      if (target) {
        target.appendChild(document.createTextNode(" "));
        target.appendChild(chip);
      }
    }
    const label = STAGE_LABELS[stage] || stage.replace(/_/g, " ");
    chip.textContent = label;
    chip.setAttribute("title", `${caseNumber}: ${label}`);
    chip.dataset.stage = stage;
  }

  function ensureLegend(meta) {
    let el = document.getElementById(LEGEND_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = LEGEND_ID;
      el.setAttribute("role", "status");
      document.documentElement.appendChild(el);
    }

    const colors = Object.assign({}, DEFAULT_COLORS);
    if (meta && meta.highlight) {
      for (const [stage, info] of Object.entries(meta.highlight)) {
        if (info && info.color) colors[stage] = info.color;
      }
    }

    const asOf = meta && meta.as_of ? meta.as_of : "…";
    const stale = meta && meta.stale ? " (stale cache)" : "";
    const err = meta && meta.error ? ` · ${meta.error}` : "";

    el.innerHTML = `
      <div class="cca-pdr-legend-title">PDR stage <span class="cca-pdr-asof">as of ${asOf}${stale}</span></div>
      <div class="cca-pdr-legend-items">
        <span class="cca-pdr-swatch" style="background:${colors.granted_pending}"></span><span>Granted</span>
        <span class="cca-pdr-swatch" style="background:${colors.submitted}"></span><span>Submitted</span>
        <span class="cca-pdr-swatch" style="background:${colors.decided}"></span><span>Decided</span>
        <span class="cca-pdr-swatch" style="background:${colors.refused}"></span><span>Refused</span>
      </div>
      <div class="cca-pdr-legend-source">IACLS CCA DB${err}</div>
    `;
  }

  function requestLookup(caseNumbers) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          { type: "LOOKUP_CASES", caseNumbers },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message });
              return;
            }
            resolve(response || { ok: false, error: "No response" });
          }
        );
      } catch (err) {
        resolve({ ok: false, error: String(err) });
      }
    });
  }

  async function highlightNow() {
    if (busy) return;
    const rows = findResultRows();
    if (rows.length === 0) {
      // Still show legend if we ever loaded meta
      if (highlightMeta) ensureLegend(highlightMeta);
      return;
    }

    const sig = pageSignature(rows);
    // Always re-apply if rows exist; sig skip only avoids redundant network
    const caseNumbers = rows.map((r) => r.caseNumber);
    busy = true;
    try {
      const resp = await requestLookup(caseNumbers);
      if (!resp || !resp.ok) {
        highlightMeta = {
          as_of: null,
          stale: true,
          error: (resp && resp.error) || "lookup failed",
        };
        ensureLegend(highlightMeta);
        return;
      }

      const colors = Object.assign({}, DEFAULT_COLORS);
      if (resp.highlight) {
        for (const [stage, info] of Object.entries(resp.highlight)) {
          if (info && info.color) colors[stage] = info.color;
        }
      }

      highlightMeta = {
        as_of: resp.as_of,
        generated_at: resp.generated_at,
        highlight: resp.highlight,
        stale: resp.stale,
        error: resp.error,
      };
      ensureLegend(highlightMeta);

      const hits = resp.hits || {};
      for (const { tr, caseNumber } of rows) {
        applyHighlight(tr, caseNumber, hits[caseNumber] || null, colors);
      }
      lastSignature = sig;
    } finally {
      busy = false;
    }
  }

  function scheduleHighlight() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      highlightNow().catch(() => {});
    }, 150);
  }

  // Initial pass
  scheduleHighlight();

  // ASP.NET postbacks replace table content without full navigation
  const observer = new MutationObserver(() => {
    scheduleHighlight();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Safety: re-run on history changes / focus
  window.addEventListener("pageshow", scheduleHighlight);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleHighlight();
  });
})();
