import { injectAnswers } from "./fill";

const hostname = window.location.hostname;
// const url = window.location.href;

console.log("[JobSA] Content script loaded on", hostname);

// --- 1. DOM Parser ---

interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  options?: string[];
  required: boolean;
}

function extractFormSchema(): FormField[] {
  const fields: FormField[] = [];
  // Select common input elements
  const elements = document.querySelectorAll('input, select, textarea');
  
  elements.forEach((el) => {
    const element = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    
    // Skip hidden, submit, button, etc.
    if (
      element.type === 'hidden' || 
      element.type === 'submit' || 
      element.type === 'button' ||
      element.disabled ||
      ('readOnly' in element && element.readOnly)
    ) {
      return;
    }
    
    // Try to find the label
    let label = '';
    const id = element.id;
    if (id) {
      const labelEl = document.querySelector(`label[for="${id}"]`) as HTMLLabelElement;
      if (labelEl) {
        label = labelEl.innerText.trim();
      }
    }
    if (!label && element.parentElement && element.parentElement.tagName.toLowerCase() === 'label') {
      label = element.parentElement.innerText.replace(element.innerText, '').trim();
    }
    if (!label && element.getAttribute('aria-label')) {
      label = element.getAttribute('aria-label') || '';
    }
    if (!label && 'placeholder' in element && element.placeholder) {
      label = element.placeholder;
    }
    if (!label) {
      label = element.name || id || 'Unknown Field';
    }

    const field: FormField = {
      id: id || Math.random().toString(36).substring(7), // Ensure there's an ID
      name: element.name || '',
      type: element.type || element.tagName.toLowerCase(),
      label,
      required: element.required
    };
    
    // Assign back the generated ID if it was missing so we can find it later
    if (!element.id) {
      element.id = field.id;
    }
    
    if (element.tagName.toLowerCase() === 'select') {
      const selectEl = element as HTMLSelectElement;
      field.options = Array.from(selectEl.options).map(o => o.text.trim()).filter(t => t.length > 0);
    }
    
    fields.push(field);
  });
  
  return fields;
}

// --- 2. Floating UI ---

function injectUI() {
  const container = document.createElement('div');
  container.id = 'jobsa-overlay';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '10px';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  
  const button = document.createElement('button');
  button.innerText = '✨ Autofill with JobSA';
  button.style.backgroundColor = '#0f172a'; // Tailwind slate-900
  button.style.color = '#f8fafc'; // Tailwind slate-50
  button.style.border = 'none';
  button.style.padding = '12px 20px';
  button.style.borderRadius = '8px';
  button.style.cursor = 'pointer';
  button.style.fontSize = '14px';
  button.style.fontWeight = '600';
  button.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
  button.style.transition = 'all 0.2s';
  
  button.onmouseover = () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
  };
  button.onmouseout = () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
  };
  
  const statusText = document.createElement('div');
  statusText.style.fontSize = '12px';
  statusText.style.color = '#334155'; // Tailwind slate-700
  statusText.style.textAlign = 'right';
  statusText.style.display = 'none';
  statusText.style.backgroundColor = '#ffffff';
  statusText.style.padding = '4px 8px';
  statusText.style.borderRadius = '4px';
  statusText.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';

  button.onclick = async () => {
    button.disabled = true;
    button.innerText = '⏳ Extracting...';
    button.style.opacity = '0.7';
    
    try {
      const fields = extractFormSchema();
      console.log('[JobSA] Extracted schema:', fields);
      
      button.innerText = '🧠 Thinking...';
      
      // Send to background script
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ 
          action: 'autofill',
          payload: {
            url: window.location.href,
            fields
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
      
      console.log('[JobSA] Received answers:', response);
      button.innerText = '⚡ Injecting...';
      
      injectAnswers((response as any).answers);
      
      button.innerText = '✅ Done!';
      statusText.style.display = 'block';
      statusText.innerText = `Filled ${Object.keys((response as any).answers).length} fields`;
      
      setTimeout(() => {
        button.innerText = '✨ Autofill with JobSA';
        button.disabled = false;
        button.style.opacity = '1';
        setTimeout(() => {
          statusText.style.display = 'none';
        }, 3000);
      }, 2000);
      
    } catch (err: any) {
      console.error('[JobSA] Autofill failed:', err);
      button.innerText = '❌ Failed';
      statusText.style.display = 'block';
      statusText.style.color = '#ef4444'; // Red
      statusText.innerText = err.message || 'Check console for errors';
      
      setTimeout(() => {
        button.innerText = '✨ Autofill with JobSA';
        button.disabled = false;
        button.style.opacity = '1';
      }, 3000);
    }
  };
  
  container.appendChild(statusText);
  container.appendChild(button);
  document.body.appendChild(container);
}

function isJobApplicationPage(): boolean {
  const url = window.location.href.toLowerCase();
  const atsDomains = [
    'workdayjobs.com',
    'greenhouse.io',
    'lever.co',
    'ashbyhq.com',
    'smartrecruiters.com',
    'breezy.hr',
    'workable.com',
    'icims.com',
    'taleo.net',
    'bamboohr.com',
    'jobs.',
    'careers.'
  ];
  
  if (atsDomains.some(domain => url.includes(domain))) {
    return true;
  }
  
  if (url.includes('/apply') || url.includes('/application')) {
    return true;
  }
  
  return false;
}

// Only inject if it looks like a job application (has form fields)
// Give ATS scripts a moment to render or poll until they exist
const checkInterval = setInterval(() => {
  if (!isJobApplicationPage()) {
    // If it's definitely not a job page, we can stop polling
    return;
  }

  const inputs = document.querySelectorAll('input, select, textarea');
  if (inputs.length > 3 && !document.getElementById('jobsa-overlay')) {
    injectUI();
    clearInterval(checkInterval);
  }
}, 1000);

// Stop checking after 10 seconds to save resources
setTimeout(() => {
  clearInterval(checkInterval);
}, 10000);
