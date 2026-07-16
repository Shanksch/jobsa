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
});

async function handleAutofill(payload: any) {
  const BACKEND_URL = "http://localhost:8000"; // In production, read from config/storage
  
  const { sb_auth_token } = await chrome.storage.local.get("sb_auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  
  if (sb_auth_token) {
    headers["Authorization"] = `Bearer ${sb_auth_token}`;
  }
  
  const response = await fetch(`${BACKEND_URL}/api/autofill`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
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

export {};
