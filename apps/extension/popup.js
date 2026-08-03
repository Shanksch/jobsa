/**
 * JobSA — Popup Script
 *
 * Handles the "Autofill this page" button. Uses the activeTab permission
 * (granted by the popup click) to inject a stub autofill function into
 * the current page. No host permissions required.
 */

// ---------------------------------------------------------------------------
// Stub autofill function — injected into the page context
// ---------------------------------------------------------------------------

/**
 * This function is serialised and injected via chrome.scripting.executeScript.
 * It runs in the target tab's main world. The `data` argument is passed via
 * the `args` array.
 *
 * Replace the body of this function with real resume-parsing and form-filling
 * logic once the permission layer is validated end-to-end.
 */
function autofillResume(data) {
  console.log("Autofilling with:", data);

  // Visual confirmation so the user knows it worked (remove in production)
  const banner = document.createElement("div");
  banner.textContent = "✅ JobSA autofill stub ran successfully";
  Object.assign(banner.style, {
    position: "fixed",
    top: "16px",
    right: "16px",
    zIndex: "2147483647",
    background: "#16a34a",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "8px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: "13px",
    fontWeight: "600",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
    transition: "opacity 0.4s ease",
  });
  document.body.appendChild(banner);
  setTimeout(() => {
    banner.style.opacity = "0";
    setTimeout(() => banner.remove(), 400);
  }, 3000);
}

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------

const btn = document.getElementById("autofill-btn");
const status = document.getElementById("status");

btn.addEventListener("click", async () => {
  btn.disabled = true;
  status.textContent = "Injecting…";
  status.className = "";

  try {
    // Get the currently active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      throw new Error("No active tab found");
    }

    // Guard against chrome:// and edge:// pages where injection is blocked
    if (
      tab.url?.startsWith("chrome://") ||
      tab.url?.startsWith("edge://") ||
      tab.url?.startsWith("chrome-extension://") ||
      tab.url?.startsWith("about:")
    ) {
      throw new Error("Cannot inject into browser internal pages");
    }

    // Stub resume data for testing — replace with real parsed data later
    const stubResumeData = {
      name: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "+1-555-0199",
      location: "San Francisco, CA",
      summary: "Experienced software engineer with 5+ years in web development.",
    };

    // Inject the autofill function using activeTab — no host permission needed
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: autofillResume,
      args: [stubResumeData],
    });

    status.textContent = "✓ Autofill injected successfully";
    status.className = "success";
  } catch (err) {
    console.error("[JobSA] Autofill injection failed:", err);
    status.textContent = `✗ ${err.message}`;
    status.className = "error";
  } finally {
    btn.disabled = false;
  }
});

// Open the options page
document.getElementById("open-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
