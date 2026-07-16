/**
 * JobSA Auth Sync Content Script
 * 
 * Runs on the web dashboard (localhost:5173 / production domain) to seamlessly
 * capture the user's Supabase JWT token and pass it to the extension's background script.
 */

window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

  if (event.data && event.data.type === 'JOBSA_AUTH_SYNC') {
    const token = event.data.token;
    
    // Send to the extension's background service worker
    chrome.runtime.sendMessage(
      { action: "save_token", token },
      (response) => {
        // Ignore errors if background script isn't ready
        if (chrome.runtime.lastError) {
          console.debug("[JobSA Auth Sync] Background script not ready or error:", chrome.runtime.lastError.message);
        } else {
          console.debug("[JobSA Auth Sync] Token synced to extension.");
        }
      }
    );
  }
});

// Request token immediately in case we loaded after the web app initialized
window.postMessage({ type: 'JOBSA_AUTH_REQUEST' }, '*');

console.log("[JobSA] Auth sync listener initialized.");
