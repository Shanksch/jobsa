/**
 * JobSA Extension Communication Utilities
 *
 * Uses chrome.runtime.sendMessage with the published extension ID
 * via the externally_connectable manifest key.
 */

const EXTENSION_ID = "ecgeokfhnhelhecnbdndlinhfeebbdmm";

export const CHROME_WEBSTORE_URL = `https://chromewebstore.google.com/detail/${EXTENSION_ID}`;

/**
 * Check if the chrome.runtime API is available and the extension responds to a ping.
 * Returns true if the extension is installed and active.
 */
export async function isExtensionInstalled(): Promise<boolean> {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return false;
  }
  try {
    const response = await new Promise<any>((resolve) => {
      chrome.runtime.sendMessage(EXTENSION_ID, { action: "ping" }, (res) => {
        // If the extension is not installed, chrome.runtime.lastError will be set
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(res);
        }
      });
    });
    return response?.status === "connected";
  } catch {
    return false;
  }
}

/**
 * Send the Supabase auth token to the extension's background service worker.
 * Silently fails if the extension is not installed.
 */
export function syncTokenToExtension(token: string | null): void {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return;
  try {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      { action: "save_token", token },
      () => {
        // Silently ignore errors (extension not installed, etc.)
        if (chrome.runtime.lastError) {
          console.debug("[JobSA] Extension not reachable:", chrome.runtime.lastError.message);
        }
      }
    );
  } catch {
    // Non-Chrome browser or extension not installed — silently ignore
  }
}
