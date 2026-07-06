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

export {};
