/**
 * JobSA — Options Page Script
 *
 * Manages the "Enable auto-detect on all sites" toggle.
 *
 * ON  → chrome.permissions.request (triggers Chrome prompt),
 *        then registers a dynamic content script via the background worker.
 * OFF → chrome.permissions.remove + unregister the dynamic script.
 *
 * On page load, reconciles storage vs actual permission state to handle
 * cases where the user revoked access via chrome://extensions.
 */

const ALL_SITES_ORIGIN = "https://*/*";

const toggle = document.getElementById("all-sites-toggle");
const status = document.getElementById("status");
const badge = document.getElementById("permission-badge");

// ---------------------------------------------------------------------------
// Initialisation — reconcile stored flag with actual permission state
// ---------------------------------------------------------------------------

(async () => {
  toggle.disabled = true;

  try {
    const [{ allSitesEnabled }, hasPermission] = await Promise.all([
      chrome.storage.local.get("allSitesEnabled"),
      chrome.permissions.contains({ origins: [ALL_SITES_ORIGIN] }),
    ]);

    if (allSitesEnabled && !hasPermission) {
      // Permission was revoked externally (e.g. chrome://extensions)
      await chrome.storage.local.set({ allSitesEnabled: false });
      await chrome.runtime.sendMessage({ type: "UNREGISTER_ALL_SITES" });
      setStatus(
        "All-sites permission was revoked externally. Toggle reset.",
        "warning"
      );
      updateBadge(false);
      toggle.checked = false;
    } else {
      toggle.checked = !!allSitesEnabled && hasPermission;
      updateBadge(toggle.checked);
    }
  } catch (err) {
    console.error("[JobSA] Options init error:", err);
    setStatus("Failed to load settings", "error");
  } finally {
    toggle.disabled = false;
  }
})();

// ---------------------------------------------------------------------------
// Toggle change handler
// ---------------------------------------------------------------------------

toggle.addEventListener("change", async () => {
  toggle.disabled = true;
  const enabling = toggle.checked;

  try {
    if (enabling) {
      await enableAllSites();
    } else {
      await disableAllSites();
    }
  } catch (err) {
    console.error("[JobSA] Toggle error:", err);
    // Revert the toggle to its previous state
    toggle.checked = !enabling;
    setStatus(`✗ ${err.message}`, "error");
  } finally {
    toggle.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Enable: request permission → register dynamic script
// ---------------------------------------------------------------------------

async function enableAllSites() {
  // chrome.permissions.request MUST be called in a user-gesture handler
  const granted = await chrome.permissions.request({
    origins: [ALL_SITES_ORIGIN],
  });

  if (!granted) {
    // User declined the Chrome prompt
    toggle.checked = false;
    updateBadge(false);
    setStatus("Permission request declined — toggle stays off.", "warning");
    return;
  }

  // Permission granted → ask background to register the content script
  const response = await chrome.runtime.sendMessage({
    type: "REGISTER_ALL_SITES",
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Failed to register content script");
  }

  await chrome.storage.local.set({ allSitesEnabled: true });
  updateBadge(true);
  setStatus("✓ All-sites auto-detect enabled", "success");
}

// ---------------------------------------------------------------------------
// Disable: revoke permission → unregister dynamic script
// ---------------------------------------------------------------------------

async function disableAllSites() {
  // Unregister the dynamic content script first
  const response = await chrome.runtime.sendMessage({
    type: "UNREGISTER_ALL_SITES",
  });

  if (!response?.ok) {
    console.warn("[JobSA] Unregister response:", response);
  }

  // Revoke the broad host permission
  const removed = await chrome.permissions.remove({
    origins: [ALL_SITES_ORIGIN],
  });

  await chrome.storage.local.set({ allSitesEnabled: false });
  updateBadge(false);

  if (removed) {
    setStatus("✓ All-sites access revoked", "success");
  } else {
    setStatus("Permission revoked (may have been removed already)", "warning");
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function setStatus(text, type) {
  status.textContent = text;
  status.className = type || "";
}

function updateBadge(granted) {
  if (granted) {
    badge.textContent = "All-sites access: Granted";
    badge.className = "permission-badge granted";
  } else {
    badge.textContent = "All-sites access: Not granted";
    badge.className = "permission-badge revoked";
  }
}
