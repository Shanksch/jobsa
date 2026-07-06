/**
 * JobSA Content Script
 *
 * Injected into ATS pages (Greenhouse, Lever) to extract form fields.
 * Phase 0: just logs that the script loaded.
 * Phase 2+: will implement ATSAdapter interface for field extraction and filling.
 */

const hostname = window.location.hostname;
const url = window.location.href;

console.log("[JobSA] Content script loaded", {
  hostname,
  url,
  timestamp: new Date().toISOString(),
});

// Phase 2+ will implement:
// - DOM field extraction via ATSAdapter interface
// - MutationObserver for dynamically-rendered fields
// - Message passing to background service worker
// - Overlay UI injection for human review

export {};
