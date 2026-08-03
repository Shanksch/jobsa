/**
 * JobSA Background Service Worker (Permission Layer)
 *
 * Responsibilities:
 * 1. Set toolbar badge when a content script detects an application form.
 * 2. Register / unregister a dynamic content script for all HTTPS sites
 *    when the user enables/disables the option.
 * 3. On startup, restore the dynamic script if the permission is still granted.
 */

const DYNAMIC_SCRIPT_ID = "all-sites-detect";

// ---------------------------------------------------------------------------
// Install & startup
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[JobSA] Extension installed", {
    reason: details.reason,
    version: chrome.runtime.getManifest().version,
  });

  if (details.reason === "install") {
    console.log("[JobSA] First install — welcome!");
  } else if (details.reason === "update") {
    console.log(
      `[JobSA] Updated from ${details.previousVersion} → ${chrome.runtime.getManifest().version}`
    );
    // Clean up stale dynamic scripts from a previous version
    cleanupDynamicScripts();
  }
});

// Restore dynamic all-sites script on service-worker startup
restoreAllSitesScript();

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Content script detected a form on an ATS page
  if (message.type === "FORM_DETECTED") {
    const tabId = sender.tab?.id;
    if (tabId != null) {
      chrome.action.setBadgeText({ text: "!", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#22c55e", tabId });
      console.log(
        `[JobSA] Form detected on tab ${tabId}: ${sender.tab.url}`
      );
    }
    sendResponse({ ok: true });
    return;
  }

  // Options page asks us to register the all-sites content script
  if (message.type === "REGISTER_ALL_SITES") {
    registerAllSitesScript()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error("[JobSA] Failed to register all-sites script:", err);
        sendResponse({ ok: false, error: err.message });
      });
    return true; // async response
  }

  // Options page asks us to unregister the all-sites content script
  if (message.type === "UNREGISTER_ALL_SITES") {
    unregisterAllSitesScript()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error("[JobSA] Failed to unregister all-sites script:", err);
        sendResponse({ ok: false, error: err.message });
      });
    return true; // async response
  }
});

// ---------------------------------------------------------------------------
// Dynamic content-script management
// ---------------------------------------------------------------------------

/**
 * Register a dynamic content script that runs detect-form.js on every
 * HTTPS page. Called after the user grants optional host permissions.
 */
async function registerAllSitesScript() {
  // Unregister first to avoid "duplicate id" errors
  await cleanupDynamicScripts();

  await chrome.scripting.registerContentScripts([
    {
      id: DYNAMIC_SCRIPT_ID,
      matches: ["https://*/*"],
      allFrames: true,
      js: ["content/detect-form.js"],
      runAt: "document_idle",
    },
  ]);

  console.log("[JobSA] Registered all-sites dynamic content script");
}

/**
 * Unregister the dynamic all-sites content script.
 */
async function unregisterAllSitesScript() {
  await cleanupDynamicScripts();
  console.log("[JobSA] Unregistered all-sites dynamic content script");
}

/**
 * Safely remove the dynamic script if it exists (no-op if not registered).
 */
async function cleanupDynamicScripts() {
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts({
      ids: [DYNAMIC_SCRIPT_ID],
    });
    if (registered.length > 0) {
      await chrome.scripting.unregisterContentScripts({
        ids: [DYNAMIC_SCRIPT_ID],
      });
    }
  } catch (err) {
    // Swallow — script may not exist yet
    console.warn("[JobSA] cleanupDynamicScripts:", err.message);
  }
}

/**
 * On service-worker startup, check whether the user previously enabled
 * all-sites detection. If so, verify the permission is still granted
 * and re-register the script. If the permission was revoked externally,
 * clean up the stored flag.
 */
async function restoreAllSitesScript() {
  try {
    const { allSitesEnabled } = await chrome.storage.local.get(
      "allSitesEnabled"
    );

    if (!allSitesEnabled) return;

    const hasPermission = await chrome.permissions.contains({
      origins: ["https://*/*"],
    });

    if (hasPermission) {
      await registerAllSitesScript();
      console.log("[JobSA] Restored all-sites script on startup");
    } else {
      // Permission was revoked externally — clean up
      await chrome.storage.local.set({ allSitesEnabled: false });
      await cleanupDynamicScripts();
      console.warn(
        "[JobSA] All-sites permission was revoked externally; disabled flag"
      );
    }
  } catch (err) {
    console.error("[JobSA] restoreAllSitesScript error:", err);
  }
}
