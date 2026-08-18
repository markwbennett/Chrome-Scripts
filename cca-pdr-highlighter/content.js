/**
 * Texas Appellate Highlighter — content script for search.txcourts.gov.
 * Colors result rows by CCA PDR stage or COA stage from the IACLS maps.
 */

(function () {
  "use strict";

  const CCA_RE = /\bPD-\d{4}-\d{2}\b/gi;
  const CCA_RE_STRICT = /^PD-\d{4}-\d{2}$/i;
  const COA_RE = /\b\d{2}-\d{2}-\d{5}-[A-Z]{2}\b/gi;
  const COA_RE_STRICT = /^\d{2}-\d{2}-\d{5}-[A-Z]{2}$/i;
  const ATTR_MARK = "data-cca-pdr-stage";
  const ATTR_COURT = "data-cca-pdr-court";
  const ATTR_CASE = "data-cca-pdr-case";
  const LEGEND_ID = "cca-pdr-highlighter-legend";

  const DEFAULT_CCA_COLORS = {
    granted_pending: "#f5e663",
    submitted: "#7dcea0",
    decided: "#b0b0b0",
    refused: "#f1948a",
  };

  const DEFAULT_COA_COLORS = {
    pending: "#f5e663",
    submitted: "#7dcea0",
    decided: "#b0b0b0",
    dismissed: "#f1948a",
  };

  const STAGE_LABELS = {
    granted_pending: "Granted",
    pending: "Pending",
    submitted: "Submitted",
    decided: "Decided",
    refused: "Refused",
    dismissed: "Dismissed",
  };

  const STAGE_CLASS = {
    granted_pending: "cca-pdr-granted",
    pending: "cca-pdr-pending",
    submitted: "cca-pdr-submitted",
    decided: "cca-pdr-decided",
    refused: "cca-pdr-refused",
    dismissed: "cca-pdr-dismissed",
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
      const raw = cn.trim();
      if (CCA_RE_STRICT.test(raw) || COA_RE_STRICT.test(raw)) {
        return normalizeCase(raw);
      }
    } catch (_) {
      /* ignore */
    }
    const m = String(href).match(/[?&]cn=(PD-\d{4}-\d{2}|\d{2}-\d{2}-\d{5}-[A-Z]{2})/i);
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

    // Fallback: any table row whose text contains a PD or COA number
    if (rows.length === 0) {
      document.querySelectorAll("table tr").forEach((tr) => {
        if (seen.has(tr)) return;
        const text = tr.textContent || "";
        CCA_RE.lastIndex = 0;
        COA_RE.lastIndex = 0;
        const m = text.match(CCA_RE) || text.match(COA_RE);
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

  function applyHighlight(tr, caseNumber, hit, colorsByCourt) {
    // Clear previous
    tr.removeAttribute(ATTR_MARK);
    tr.removeAttribute(ATTR_COURT);
    tr.removeAttribute(ATTR_CASE);
    tr.classList.remove(
      "cca-pdr-granted",
      "cca-pdr-pending",
      "cca-pdr-submitted",
      "cca-pdr-decided",
      "cca-pdr-refused",
      "cca-pdr-dismissed",
      "cca-pdr-other"
    );
    tr.style.removeProperty("background-color");
    tr.querySelectorAll("td, th").forEach((cell) => {
      cell.style.removeProperty("background-color");
    });

    if (!hit) {
      const oldChip = tr.querySelector(".cca-pdr-chip");
      if (oldChip) oldChip.remove();
      return;
    }

    const stage = typeof hit === "string" ? hit : hit.stage;
    const court = typeof hit === "string" ? "cca" : hit.court || "cca";
    if (!stage) return;

    tr.setAttribute(ATTR_MARK, stage);
    tr.setAttribute(ATTR_COURT, court);
    tr.setAttribute(ATTR_CASE, caseNumber);

    const colors = colorsByCourt[court] || DEFAULT_CCA_COLORS;
    const color = colors[stage];
    if (color) {
      tr.style.setProperty("background-color", color, "important");
      tr.classList.add(STAGE_CLASS[stage] || "cca-pdr-other");

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
    chip.dataset.court = court;
  }

  function ensureLegend(meta) {
    let el = document.getElementById(LEGEND_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = LEGEND_ID;
      el.setAttribute("role", "status");
      document.documentElement.appendChild(el);
    }

    const ccaColors = Object.assign({}, DEFAULT_CCA_COLORS);
    if (meta && meta.highlight) {
      for (const [stage, info] of Object.entries(meta.highlight)) {
        if (info && info.color) ccaColors[stage] = info.color;
      }
    }
    const coaColors = Object.assign({}, DEFAULT_COA_COLORS);
    if (meta && meta.coa_highlight) {
      for (const [stage, info] of Object.entries(meta.coa_highlight)) {
        if (info && info.color) coaColors[stage] = info.color;
      }
    }

    const asOf = meta && meta.as_of ? meta.as_of : "…";
    const coaAsOf = meta && meta.coa_as_of ? meta.coa_as_of : asOf;
    const stale = meta && meta.stale ? " (stale cache)" : "";
    const err = meta && meta.error ? ` · ${meta.error}` : "";

    el.innerHTML = `
      <div class="cca-pdr-legend-title">PDR stage <span class="cca-pdr-asof">as of ${asOf}${stale}</span></div>
      <div class="cca-pdr-legend-items">
        <span class="cca-pdr-swatch" style="background:${ccaColors.granted_pending}"></span><span>Granted</span>
        <span class="cca-pdr-swatch" style="background:${ccaColors.submitted}"></span><span>Submitted</span>
        <span class="cca-pdr-swatch" style="background:${ccaColors.decided}"></span><span>Decided</span>
        <span class="cca-pdr-swatch" style="background:${ccaColors.refused}"></span><span>Refused</span>
      </div>
      <div class="cca-pdr-legend-title" style="margin-top:6px">COA stage <span class="cca-pdr-asof">as of ${coaAsOf}</span></div>
      <div class="cca-pdr-legend-items">
        <span class="cca-pdr-swatch" style="background:${coaColors.pending}"></span><span>Pending</span>
        <span class="cca-pdr-swatch" style="background:${coaColors.submitted}"></span><span>Submitted</span>
        <span class="cca-pdr-swatch" style="background:${coaColors.decided}"></span><span>Decided</span>
        <span class="cca-pdr-swatch" style="background:${coaColors.dismissed}"></span><span>Dismissed</span>
      </div>
      <div class="cca-pdr-legend-source">IACLS CCA + Bennett COA${err}</div>
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

      const colorsByCourt = {
        cca: Object.assign({}, DEFAULT_CCA_COLORS),
        coa: Object.assign({}, DEFAULT_COA_COLORS),
      };
      if (resp.highlight) {
        for (const [stage, info] of Object.entries(resp.highlight)) {
          if (info && info.color) colorsByCourt.cca[stage] = info.color;
        }
      }
      if (resp.coa_highlight) {
        for (const [stage, info] of Object.entries(resp.coa_highlight)) {
          if (info && info.color) colorsByCourt.coa[stage] = info.color;
        }
      }

      highlightMeta = {
        as_of: resp.as_of,
        coa_as_of: resp.coa_as_of,
        generated_at: resp.generated_at,
        highlight: resp.highlight,
        coa_highlight: resp.coa_highlight,
        stale: resp.stale,
        error: resp.error,
      };
      ensureLegend(highlightMeta);

      const hits = resp.hits || {};
      for (const { tr, caseNumber } of rows) {
        applyHighlight(tr, caseNumber, hits[caseNumber] || null, colorsByCourt);
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
