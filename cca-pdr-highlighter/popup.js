function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value == null || value === "" ? "—" : String(value);
}

function loadInfo(force) {
  setText("status", force ? "Refreshing…" : "Loading…");
  chrome.runtime.sendMessage({ type: "GET_STATUS_MAP", force: Boolean(force) }, (resp) => {
    if (chrome.runtime.lastError) {
      setText("status", "Error");
      setText("msg", chrome.runtime.lastError.message);
      return;
    }
    if (!resp || !resp.ok) {
      setText("status", "Error");
      setText("msg", (resp && resp.error) || "Unknown error");
      return;
    }
    const d = resp.data || {};
    setText("status", resp.stale ? "OK (stale cache)" : resp.fromCache ? "OK (cache)" : "OK (fresh)");
    setText("asof", d.as_of || d.generated_at || "—");
    setText("n", d.n_cases != null ? d.n_cases.toLocaleString() : "—");
    setText("url", resp.url || "—");
    setText("msg", resp.error ? String(resp.error) : "");
  });
}

document.getElementById("refresh").addEventListener("click", () => loadInfo(true));
loadInfo(false);
