/**
 * JobSA — ATS Form Detector
 *
 * Injected on known ATS domains (static) or all HTTPS sites (dynamic).
 * Scans the page for application-like forms and notifies the background
 * service worker to set the toolbar badge. Does NOT autofill.
 *
 * Handles:
 * - Static HTML forms
 * - SPA-rendered forms (MutationObserver with debounce)
 * - Iframe-embedded ATS widgets (runs with all_frames: true)
 */

(() => {
  // Guard: only run once per frame
  if (window.__jobsaDetectFormLoaded) return;
  window.__jobsaDetectFormLoaded = true;

  /** Minimum number of visible interactive inputs to qualify as a form */
  const INPUT_THRESHOLD = 3;

  /** Whether we've already signalled the background for this page load */
  let alreadySignalled = false;

  // -----------------------------------------------------------------------
  // Detection logic
  // -----------------------------------------------------------------------

  /**
   * Count visible, interactive form inputs on the page.
   * Returns true if the page looks like a job-application form.
   */
  function detectApplicationForm() {
    const candidates = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), ' +
      "select, textarea"
    );

    let visibleCount = 0;

    for (const el of candidates) {
      if (el.disabled) continue;
      if (el.offsetParent === null && el.tagName.toLowerCase() !== "select") {
        // Hidden elements — except <select>, which ATS platforms often
        // hide behind custom dropdown UIs
        continue;
      }

      const rect = el.getBoundingClientRect();
      // Elements with explicit display:none or 0×0 size
      if (rect.width === 0 && rect.height === 0 && el.tagName.toLowerCase() !== "select") {
        continue;
      }

      visibleCount++;
      if (visibleCount >= INPUT_THRESHOLD) return true;
    }

    return false;
  }

  /**
   * Notify the background service worker that we found a form.
   */
  function signalFormDetected() {
    if (alreadySignalled) return;
    alreadySignalled = true;

    chrome.runtime.sendMessage({ type: "FORM_DETECTED" }).catch((err) => {
      // Extension context may have been invalidated (e.g. after update)
      console.warn("[JobSA] Could not signal form detection:", err.message);
    });

    console.log("[JobSA] Application form detected on", window.location.href);
  }

  // -----------------------------------------------------------------------
  // Initial scan
  // -----------------------------------------------------------------------

  function runDetection() {
    if (alreadySignalled) return;
    if (detectApplicationForm()) {
      signalFormDetected();
    }
  }

  // Run immediately if DOM is already loaded, otherwise wait
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runDetection);
  } else {
    runDetection();
  }

  // -----------------------------------------------------------------------
  // MutationObserver for SPA-rendered forms
  // -----------------------------------------------------------------------

  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    if (alreadySignalled) {
      observer.disconnect();
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runDetection, 500);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Stop observing after 30 seconds to avoid long-lived overhead
  setTimeout(() => {
    observer.disconnect();
    clearTimeout(debounceTimer);
  }, 30_000);
})();
