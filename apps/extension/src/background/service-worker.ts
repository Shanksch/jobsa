/**
 * JobSA Background Service Worker
 *
 * Runs as the MV3 service worker. Handles extension lifecycle events
 * and will coordinate between content scripts and the backend in later phases.
 */

import detectFormPath from "../../content/detect-form.js?script";
import widgetPath from "../content/widget.ts?script";

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[JobSA] Extension installed", {
    reason: details.reason,
    version: chrome.runtime.getManifest().version,
  });

  if (details.reason === "install") {
    // First install — could show onboarding page in the future
    console.log("[JobSA] First install — welcome!");
  } else if (details.reason === "update") {
    console.log(
      `[JobSA] Updated from ${details.previousVersion} to ${chrome.runtime.getManifest().version}`
    );
    cleanupDynamicScripts();
  }
});

// Toggle the floating widget when the toolbar icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try {
      // Attempt to toggle the widget. If the content script isn't loaded, this throws an error.
      await chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_WIDGET' });
    } catch (e) {
      // Content script may not be loaded yet on some pages.
      // We can use the activeTab permission to inject it now!
      if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://") && !tab.url.startsWith("about:")) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [detectFormPath, widgetPath]
          });
          // Give it a tiny bit of time to initialize
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id!, { action: 'TOGGLE_WIDGET' }).catch(() => { });
          }, 150);
        } catch (injectError) {
          console.error("[JobSA] Failed to dynamically inject widget:", injectError);
        }
      }
    }
  }
});

// Keep-alive ping (MV3 service workers can be killed after 30s of inactivity)
chrome.runtime.onConnect.addListener((port) => {
  console.log("[JobSA] Port connected:", port.name);
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FORM_DETECTED") {
    const tabId = _sender.tab?.id;
    if (tabId != null) {
      chrome.action.setBadgeText({ text: "!", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#22c55e", tabId });
      console.log(`[JobSA] Form detected on tab ${tabId}: ${_sender.tab?.url}`);
    }
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "REGISTER_ALL_SITES") {
    registerAllSitesScript()
      .then(() => sendResponse({ ok: true }))
      .catch((err: any) => {
        console.error("[JobSA] Failed to register all-sites script:", err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  if (message.type === "UNREGISTER_ALL_SITES") {
    unregisterAllSitesScript()
      .then(() => sendResponse({ ok: true }))
      .catch((err: any) => {
        console.error("[JobSA] Failed to unregister all-sites script:", err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  if (message.action === "save_token") {
    if (message.token) {
      const data: Record<string, string> = { sb_auth_token: message.token };
      if (message.refresh_token) data.sb_refresh_token = message.refresh_token;
      chrome.storage.local.set(data);
    } else {
      chrome.storage.local.remove(["sb_auth_token", "sb_refresh_token"]);
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "save_theme") {
    if (message.theme) {
      chrome.storage.local.set({ jobsa_theme: message.theme });
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "get_auth_status") {
    getValidToken()
      .then(token => sendResponse({ authenticated: !!token }))
      .catch(() => sendResponse({ authenticated: false }));
    return true;
  }

  if (message.action === "autofill") {
    handleAutofill(message.payload)
      .then(response => sendResponse(response))
      .catch(error => {
        console.error("[JobSA] Background autofill error:", error);
        sendResponse({ error: error.message || "Failed to generate answers" });
      });

    // Return true to indicate we will respond asynchronously
    return true;
  }

  if (message.action === "list_resumes") {
    handleListResumes()
      .then(response => sendResponse(response))
      .catch(error => {
        console.error("[JobSA] List resumes error:", error);
        sendResponse({ error: error.message || "Failed to fetch resumes" });
      });
    return true;
  }

  if (message.action === "create_application") {
    handleCreateApplication(message.payload)
      .then(response => sendResponse(response))
      .catch(error => {
        console.error("[JobSA] Create application error:", error);
        sendResponse({ error: error.message });
      });
    return true;
  }

  if (message.action === "update_application") {
    handleUpdateApplication(message.payload)
      .then(response => sendResponse(response))
      .catch(error => {
        console.error("[JobSA] Update application error:", error);
        sendResponse({ error: error.message });
      });
    return true;
  }

  if (message.action === "job_match") {
    handleJobMatch(message.payload)
      .then(response => sendResponse(response))
      .catch(error => {
        console.error("[JobSA] Job Match error:", error);
        sendResponse({ error: error.message || "Failed to analyze match" });
      });
    return true;
  }
});

// Listen for messages from the web dashboard (externally_connectable)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Only accept messages from our known origins
  const allowedOrigins = [
    "https://jobsa-web-dashboard.vercel.app",
    "http://localhost:5173",
  ];

  if (!sender.origin || !allowedOrigins.includes(sender.origin)) {
    console.warn("[JobSA] Unauthorized origin blocked:", sender.origin);
    sendResponse({ error: "Unauthorized origin" });
    return;
  }

  if (message.action === "save_token") {
    console.log("[JobSA] Saving new token from web dashboard");
    if (message.token) {
      const data: Record<string, string> = { sb_auth_token: message.token };
      if (message.refresh_token) data.sb_refresh_token = message.refresh_token;
      chrome.storage.local.set(data);
    } else {
      chrome.storage.local.remove(["sb_auth_token", "sb_refresh_token"]);
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "save_theme") {
    if (message.theme) {
      chrome.storage.local.set({ jobsa_theme: message.theme });
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "ping") {
    sendResponse({ status: "connected", version: chrome.runtime.getManifest().version });
    return true;
  }
});

async function getBackendUrl(): Promise<string> {
  return 'http://34.41.44.108:8000';
}

const MAX_RETRIES = 7;
const BASE_DELAY_MS = 1000;

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);
      if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[JobSA] Backend returned ${response.status}, retrying in ${delay}ms (${attempt}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[JobSA] Backend unreachable, retrying in ${delay}ms (${attempt}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw new Error('Backend is still waking up or unreachable. Please try again in a moment.');
    }
  }
  throw new Error('Backend is still waking up or unreachable. Please try again in a moment.');
}

// ---------------------------------------------------------------------------
// Token auto-refresh: keeps the extension authenticated without the dashboard
// ---------------------------------------------------------------------------

/**
 * Decode a JWT and return its payload. Does NOT verify the signature
 * (Supabase/backend does that). We only need the `exp` claim.
 */
function decodeJwtPayload(token: string): { exp?: number; sub?: string } {
  try {
    const base64 = token.split('.')[1]!;
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

/**
 * Returns a valid access token, refreshing it automatically if it has
 * expired (or will expire within the next 5 minutes).
 *
 * Returns `null` if no tokens are stored or refresh fails.
 */
let refreshPromise: Promise<string | null> | null = null;

async function getValidToken(): Promise<string | null> {
  const { sb_auth_token, sb_refresh_token } =
    await chrome.storage.local.get(["sb_auth_token", "sb_refresh_token"]);

  if (!sb_auth_token) return null;

  const payload = decodeJwtPayload(sb_auth_token);
  const now = Math.floor(Date.now() / 1000);
  const BUFFER_SECONDS = 300;

  if (payload.exp && payload.exp - BUFFER_SECONDS > now) {
    return sb_auth_token;
  }

  if (!sb_refresh_token) {
    console.warn("[JobSA] Token expired and no refresh token available");
    chrome.storage.local.remove(["sb_auth_token", "sb_refresh_token"]);
    return null;
  }

  // De-dupe concurrent refresh attempts against the same (soon-to-rotate) token
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    console.log("[JobSA] Access token expired, refreshing…");
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
        body: JSON.stringify({ refresh_token: sb_refresh_token }),
      });

      if (!res.ok) {
        console.error("[JobSA] Refresh failed:", res.status);
        chrome.storage.local.remove(["sb_auth_token", "sb_refresh_token"]);
        return null;
      }

      const data = await res.json();
      if (!data.access_token) {
        chrome.storage.local.remove(["sb_auth_token", "sb_refresh_token"]);
        return null;
      }

      await chrome.storage.local.set({
        sb_auth_token: data.access_token,
        sb_refresh_token: data.refresh_token || sb_refresh_token,
      });

      console.log("[JobSA] Token refreshed successfully");
      return data.access_token;
    } catch (err) {
      console.error("[JobSA] Token refresh error:", err);
      chrome.storage.local.remove(["sb_auth_token", "sb_refresh_token"]);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function handleAutofill(payload: any) {
  const BACKEND_URL = await getBackendUrl();
  const token = await getValidToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const body: any = { url: payload.url, fields: payload.fields };
  if (payload.resume_id) {
    body.resume_id = payload.resume_id;
  }

  const response = await fetchWithRetry(`${BACKEND_URL}/api/autofill`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorBody = await response.json();
      if (errorBody.detail) errorDetail = errorBody.detail;
    } catch {
      // ignore 
    }
    throw new Error(`Backend Error ${response.status}: ${errorDetail}`);
  }

  return await response.json();
}

async function handleJobMatch(payload: any) {
  const BACKEND_URL = await getBackendUrl();
  const token = await getValidToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetchWithRetry(`${BACKEND_URL}/api/match`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      resume_id: payload.resume_id,
      job_description: payload.job_description
    })
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorBody = await response.json();
      if (errorBody.detail) errorDetail = errorBody.detail;
    } catch {
      // ignore 
    }
    throw new Error(`Backend Error ${response.status}: ${errorDetail}`);
  }

  return await response.json();
}

async function handleListResumes() {
  const BACKEND_URL = await getBackendUrl();
  const token = await getValidToken();
  const headers: Record<string, string> = {
    "Accept": "application/json"
  };
  if (!token) {
    throw new Error("Session expired. Please log in again from the JobSA dashboard.");
  }
  headers["Authorization"] = `Bearer ${token}`;
  const response = await fetchWithRetry(`${BACKEND_URL}/api/resumes`, {
    method: "GET",
    headers
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch resumes: ${response.status}`);
  }
  return await response.json();
}

const SUPABASE_URL = "https://xhnzyznqeojaqqzutdfp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CoO0J2LyjpUXvd9TjAeewg_n-bmmXr-";

async function handleCreateApplication(payload: {
  company: string;
  role: string;
  posting_url: string;
  ats_platform?: string;
  resume_id?: string;
  generated_answers?: Record<string, string>;
}) {
  const sb_auth_token = await getValidToken();
  if (!sb_auth_token) throw new Error("Session expired. Please log in again from the JobSA dashboard.");

  // Decode JWT to get user ID (sub claim)
  const jwtParts = sb_auth_token.split('.');
  const jwtPayloadStr = jwtParts[1];
  if (!jwtPayloadStr) throw new Error("Invalid token format.");
  const tokenPayload = JSON.parse(atob(jwtPayloadStr));
  const userId = tokenPayload.sub;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${sb_auth_token}`,
      "Prefer": "return=representation"
    },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      profile_id: userId,
      company: payload.company,
      role: payload.role,
      posting_url: payload.posting_url,
      ats_platform: payload.ats_platform || "Unknown",
      resume_id: payload.resume_id || null,
      status: "draft",
      generated_answers: payload.generated_answers || null,
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data[0]; // Supabase returns an array
}

async function handleUpdateApplication(payload: {
  id: string;
  status: string;
  applied_at?: string;
}) {
  const sb_auth_token = await getValidToken();
  if (!sb_auth_token) throw new Error("Session expired. Please log in again from the JobSA dashboard.");

  const updateData: Record<string, any> = {
    status: payload.status,
    updated_at: new Date().toISOString(),
  };
  if (payload.applied_at) {
    updateData.applied_at = payload.applied_at;
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/applications?id=eq.${payload.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${sb_auth_token}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(updateData)
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase error: ${response.status} ${err}`);
  }
  return (await response.json())[0];
}

// ---------------------------------------------------------------------------
// Dynamic content-script management
// ---------------------------------------------------------------------------

const DYNAMIC_SCRIPT_ID = "all-sites-detect";

async function registerAllSitesScript() {
  await cleanupDynamicScripts();

  await chrome.scripting.registerContentScripts([
    {
      id: DYNAMIC_SCRIPT_ID,
      matches: ["https://*/*"],
      allFrames: true,
      js: [detectFormPath, widgetPath],
      runAt: "document_idle",
    },
  ]);

  console.log("[JobSA] Registered all-sites dynamic content script");
}

async function unregisterAllSitesScript() {
  await cleanupDynamicScripts();
  console.log("[JobSA] Unregistered all-sites dynamic content script");
}

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
  } catch (err: any) {
    console.warn("[JobSA] cleanupDynamicScripts:", err.message);
  }
}

async function restoreAllSitesScript() {
  try {
    const { allSitesEnabled } = await chrome.storage.local.get("allSitesEnabled");

    if (!allSitesEnabled) return;

    const hasPermission = await chrome.permissions.contains({
      origins: ["https://*/*"],
    });

    if (hasPermission) {
      await registerAllSitesScript();
      console.log("[JobSA] Restored all-sites script on startup");
    } else {
      await chrome.storage.local.set({ allSitesEnabled: false });
      await cleanupDynamicScripts();
      console.warn("[JobSA] All-sites permission was revoked externally; disabled flag");
    }
  } catch (err) {
    console.error("[JobSA] restoreAllSitesScript error:", err);
  }
}

restoreAllSitesScript();

export { };
