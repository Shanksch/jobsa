/**
 * JobSA Auth Sync Content Script
 * 
 * Runs on the web dashboard (https://jobsa-web-dashboard.vercel.app) to seamlessly
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
      () => {
        // Ignore errors if background script isn't ready
        if (chrome.runtime.lastError) {
          console.debug("[JobSA Auth Sync] Background script not ready or error:", chrome.runtime.lastError.message);
        } else {
          console.debug("[JobSA Auth Sync] Token synced to extension.");
        }
      }
    );
  }

  if (event.data && event.data.type === 'JOBSA_THEME_SYNC') {
    const theme = event.data.theme;
    chrome.runtime.sendMessage(
      { action: "save_theme", theme },
      () => {
        if (chrome.runtime.lastError) {
          console.debug("[JobSA Theme Sync] Background script not ready or error:", chrome.runtime.lastError.message);
        } else {
          console.debug("[JobSA Theme Sync] Theme synced to extension:", theme);
        }
      }
    );
  }
});

// Request token and theme immediately in case we loaded after the web app initialized
window.postMessage({ type: 'JOBSA_AUTH_REQUEST' }, '*');
window.postMessage({ type: 'JOBSA_THEME_REQUEST' }, '*');

console.log("[JobSA] Auth & Theme sync listener initialized.");
