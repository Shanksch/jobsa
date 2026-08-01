import { injectAnswers } from "./fill";

const hostname = window.location.hostname;

const ignoreDomains = ['recaptcha.net', 'google.com', 'googleapis.com', 'doubleclick.net', 'facebook.com', 'stripe.com'];
const shouldIgnore = window !== window.top && ignoreDomains.some(domain => hostname.includes(domain));

if (shouldIgnore) {
  console.log("[JobSA] Ignoring background iframe:", hostname);
} else {
  console.log("[JobSA] Content script loaded on", hostname);

  // --- 1. Auth Sync from Dashboard ---
  window.addEventListener("message", (event) => {
    if (event.data?.type === "JOBSA_AUTH_SYNC") {
      chrome.runtime.sendMessage({ action: "save_token", token: event.data.token });
    }
  });

  // If we are on the JobSA dashboard, explicitly ask for the token on load
  if (hostname.includes("localhost") || hostname.includes("jobsa")) {
    window.postMessage({ type: "JOBSA_AUTH_REQUEST" }, "*");
  }

  // --- 2. Headless Communication with SidePanel ---
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "CHECK_PAGE") {
      const inputs = document.querySelectorAll('input:not([type=hidden]), select, textarea');
      const hasForm = inputs.length > 2;
      const payload = {
        hasForm,
        company: window.location.hostname.replace('www.', '').split('.')[0] || 'Unknown Company',
        jobTitle: document.title || 'Unknown Role',
        url: window.location.href,
        isTopFrame: window === window.top
      };
      
      if (hasForm) {
        sendResponse(payload);
      } else if (window === window.top) {
        setTimeout(() => sendResponse(payload), 500);
      }
      return true;
    }

    if (message.action === "GET_FORM_SCHEMA") {
      const fields = extractFormSchema();
      if (fields.length > 0) {
        chrome.runtime.sendMessage({ action: "REPORT_FORM_SCHEMA", fields });
      }
      return true;
    }

    if (message.action === "GET_JOB_DESCRIPTION") {
      if (window === window.top) {
        const mainNode = document.querySelector('main, [role="main"], #content, #main, .job-description, .posting-content, .description') as HTMLElement;
        let text = (mainNode || document.body).innerText || "";
        if (text.length > 10000) text = text.substring(0, 10000) + "...(truncated)";
        sendResponse({ text });
      }
      return true;
    }

    if (message.action === "INJECT_ANSWERS") {
      (async () => {
        const fillResults = await injectAnswers(message.answers, message.fields);
        if (fillResults.length > 0) {
          chrome.runtime.sendMessage({ action: "REPORT_INJECT_RESULTS", results: fillResults });
        }
      })();
      return true;
    }

    if (message.action === "FOCUS_FIELD") {
      const el = document.getElementById(message.fieldId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        (el as HTMLElement).style.outline = '2px solid #00e599';
        setTimeout(() => { (el as HTMLElement).style.outline = ''; }, 3000);
      }
      sendResponse({ success: true });
      return true;
    }
  });
}

interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  options?: string[];
  required: boolean;
}

interface ResumeItem {
  id: string;
  name: string;
  file_name: string;
  is_primary: boolean;
}

function extractFormSchema(): FormField[] {
  const fields: FormField[] = [];
  const elements = document.querySelectorAll('input, select, textarea');
  const radioGroups = new Set<string>();

  elements.forEach((el) => {
    const element = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    const isHidden = 
      element.type === 'hidden' ||
      element.style.display === 'none' ||
      element.style.visibility === 'hidden' ||
      element.style.opacity === '0' ||
      element.offsetParent === null ||
      (element.getBoundingClientRect().width === 0 || element.getBoundingClientRect().height === 0);

    const isNonInteractive = 
      element.type === 'submit' ||
      element.type === 'button' ||
      element.disabled ||
      ('readOnly' in element && element.readOnly);

    if (isNonInteractive) {
      return;
    }

    if (isHidden) {
      // Modern ATS (Greenhouse, Ashby, etc) use custom UI dropdowns that visually hide the real <select>.
      // We MUST extract these hidden <select> elements, otherwise we miss the options!
      if (element.tagName.toLowerCase() !== 'select') {
        return;
      }
    }

    // Ignore functional UI inputs (like Select2 search boxes) that have no name and no id.
    // Real form fields being submitted to an ATS will always have a name or id.
    if (!element.name && !element.id) {
      return;
    }

    // Ignore fake UI search textboxes used by custom dropdowns (Select2, React-Select)
    // ONLY IF a real <select> element exists nearby to take its place.
    // If no <select> exists (like on Ashby), this combobox IS the field, so we must keep it!
    if (element.tagName.toLowerCase() === 'input') {
      const role = element.getAttribute('role');
      const ariaAuto = element.getAttribute('aria-autocomplete');
      const classes = element.className || '';
      
      if (
        role === 'combobox' || 
        ariaAuto === 'list' || 
        (typeof classes === 'string' && (classes.includes('select2-search') || classes.includes('react-select')))
      ) {
        // Look for a nearby select element in a parent container
        const container = element.closest('div, .field, .form-group, label');
        if (container && container.querySelector('select')) {
          return;
        }
      }
    }

    if (element.type === 'radio') {
      if (element.name) {
        if (radioGroups.has(element.name)) return;
        radioGroups.add(element.name);
      }
    }

    let label = '';
    const id = element.id;
    if (id) {
      try {
        const labelEl = document.querySelector(`label[for="${CSS.escape(id)}"]`) as HTMLLabelElement;
        if (labelEl) label = labelEl.innerText.trim();
      } catch (e) {
        // Ignore invalid selector errors
      }
    }
    if (!label && element.parentElement && element.parentElement.tagName.toLowerCase() === 'label') {
      label = element.parentElement.innerText.replace((element as HTMLElement).innerText || '', '').trim();
    }
    if (!label && element.getAttribute('aria-label')) {
      label = element.getAttribute('aria-label') || '';
    }
    if (!label && 'placeholder' in element && element.placeholder) {
      label = element.placeholder;
    }

    // For radio groups, try to find the group label
    if (!label && element.type === 'radio' && element.name) {
      // Look for a fieldset or surrounding div with a label
      const fieldset = element.closest('fieldset');
      if (fieldset) {
        const legend = fieldset.querySelector('legend');
        if (legend) label = legend.innerText.trim();
      }
    }

    if (!label) {
      label = element.name || id || 'Unknown Field';
    }

    const field: FormField = {
      id: id || Math.random().toString(36).substring(7),
      name: element.name || '',
      type: element.type || element.tagName.toLowerCase(),
      label,
      required: element.required,
    };

    if (!element.id) element.id = field.id;

    if (element.tagName.toLowerCase() === 'select') {
      const selectEl = element as HTMLSelectElement;
      field.options = Array.from(selectEl.options).map(o => o.text.trim()).filter(t => t.length > 0);
    } else if (element.type === 'radio' && element.name) {
      // Gather all radio options for this group
      const radios = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`);
      field.options = Array.from(radios).map(r => {
        const radio = r as HTMLInputElement;
        const radioLabel = radio.id ? document.querySelector(`label[for="${CSS.escape(radio.id)}"]`) : null;
        return (radioLabel as HTMLLabelElement)?.innerText?.trim() || radio.value || 'Option';
      });
    }

    fields.push(field);
  });

  return fields;
}

// File ends here
