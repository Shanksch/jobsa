/**
 * JobSA Background Service Worker
 *
 * Runs as the MV3 service worker. Handles extension lifecycle events
 * and will coordinate between content scripts and the backend in later phases.
 */

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
  }
});

// Keep-alive ping (MV3 service workers can be killed after 30s of inactivity)
chrome.runtime.onConnect.addListener((port) => {
  console.log("[JobSA] Port connected:", port.name);
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "save_token") {
    if (message.token) {
      chrome.storage.local.set({ sb_auth_token: message.token });
    } else {
      chrome.storage.local.remove("sb_auth_token");
    }
    sendResponse({ success: true });
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
});

async function getBackendUrl(): Promise<string> {
  const { backend_url } = await chrome.storage.local.get('backend_url');
  return backend_url || 'http://localhost:8000';
}

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 2000;

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
      if (error instanceof TypeError && error.message === 'Failed to fetch' && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[JobSA] Backend unreachable, retrying in ${delay}ms (${attempt}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Backend is still waking up. Please try again in a moment.');
      }
      throw error;
    }
  }
  throw new Error('Backend is still waking up. Please try again in a moment.');
}

async function handleAutofill(payload: any) {
  const BACKEND_URL = await getBackendUrl();
  const { sb_auth_token } = await chrome.storage.local.get("sb_auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  
  if (sb_auth_token) {
    headers["Authorization"] = `Bearer ${sb_auth_token}`;
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
    } catch (e) {}
    throw new Error(`Backend Error ${response.status}: ${errorDetail}`);
  }
  
  return await response.json();
}

async function handleListResumes() {
  const BACKEND_URL = await getBackendUrl();
  const { sb_auth_token } = await chrome.storage.local.get("sb_auth_token");
  const headers: Record<string, string> = {
    "Accept": "application/json"
  };
  if (sb_auth_token) {
    headers["Authorization"] = `Bearer ${sb_auth_token}`;
  }
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
  const { sb_auth_token } = await chrome.storage.local.get("sb_auth_token");
  if (!sb_auth_token) throw new Error("Not authenticated");

  // Decode JWT to get user ID (sub claim)
  const tokenPayload = JSON.parse(atob(sb_auth_token.split('.')[1]));
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
  const { sb_auth_token } = await chrome.storage.local.get("sb_auth_token");
  if (!sb_auth_token) throw new Error("Not authenticated");

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

export {};
