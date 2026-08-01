type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export interface FillResult {
  fieldId: string;
  label: string;
  filled: boolean;
  value?: string;
  reason?: string; // Why it wasn't filled (e.g., "No answer from AI", "Element not found")
}

function handleSelectElement(element: HTMLSelectElement, value: string): boolean {
  let matched = false;
  const normalizedValue = value.trim().toLowerCase();

  // 1. Exact match (case-insensitive)
  for (let i = 0; i < element.options.length; i++) {
    const option = element.options[i];
    if (option && (option.text.trim().toLowerCase() === normalizedValue || option.value.trim().toLowerCase() === normalizedValue)) {
      setNativeValue(element, option.value);
      element.selectedIndex = i;
      matched = true;
      break;
    }
  }

  // 2. Partial match (substring) fallback
  if (!matched) {
    for (let i = 0; i < element.options.length; i++) {
      const option = element.options[i];
      if (!option) continue;
      const optionText = option.text.trim().toLowerCase();
      const optionValue = option.value.trim().toLowerCase();
      
      // Check if AI's answer is inside the option, or if the option is inside the AI's answer
      if (
        (optionText && optionText.includes(normalizedValue)) || 
        (optionValue && optionValue.includes(normalizedValue)) || 
        (normalizedValue.length > 2 && optionText && normalizedValue.includes(optionText))
      ) {
        setNativeValue(element, option.value);
        element.selectedIndex = i;
        matched = true;
        break;
      }
    }
  }

  if (!matched) {
    console.warn(`[JobSA] Could not find exact select option for "${value}" on #${element.id}`);
  }
  
  return matched;
}

function handleCheckableElement(element: HTMLInputElement, value: string): HTMLInputElement | null {
  const normalizedValue = value.trim().toLowerCase();
  
  if (element.type === 'radio' && element.name) {
    // For radio groups, we need to find the specific radio button that matches the AI's text value
    const radios = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`);
    let matchedRadio: HTMLInputElement | null = null;
    
    for (let i = 0; i < radios.length; i++) {
      const r = radios[i] as HTMLInputElement;
      const radioLabel = r.id ? document.querySelector(`label[for="${CSS.escape(r.id)}"]`) as HTMLLabelElement : null;
      const labelText = (radioLabel?.innerText || '').trim().toLowerCase();
      const valText = (r.value || '').trim().toLowerCase();
      
      if (labelText === normalizedValue || valText === normalizedValue || labelText.includes(normalizedValue)) {
        matchedRadio = r;
        break;
      }
    }
    
    if (matchedRadio) {
      matchedRadio.checked = true;
      return matchedRadio;
    }
    return null;
  } else {
    // For simple checkboxes
    element.checked = normalizedValue === 'true' || normalizedValue === 'yes' || normalizedValue === '1' || normalizedValue === 'checked';
    return element;
  }
}

// Bulletproof value injection for modern React (16, 17, 18) and other Virtual DOM frameworks.
// React intercepts the standard `element.value = ...` setter. We must bypass it by calling
// the native HTML property descriptor directly, otherwise React's onChange event will not fire.
function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }
  
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function simulateMouseClick(element: HTMLElement) {
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
}

function triggerFrameworkEvents(element: FormElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

export async function injectAnswers(
  answers: Record<string, string>,
  extractedFields: Array<{ id: string; label: string }>,
  onProgress?: (fieldId: string, filled: boolean) => void
): Promise<FillResult[]> {
  const results: FillResult[] = [];

  for (const field of extractedFields) {
    let value = answers[field.id] as string | boolean;

    // The AI often returns boolean true/false for yes/no questions if it wasn't provided explicit dropdown options.
    // We normalize these to "Yes" and "No" strings so they correctly match standard combobox text options.
    if (value === "true" || value === true) {
      value = "Yes";
    } else if (value === "false" || value === false) {
      value = "No";
    }

    // No answer from backend for this field
    if (!value) {
      results.push({
        fieldId: field.id,
        label: field.label,
        filled: false,
        reason: "No answer generated by AI"
      });
      if (onProgress) onProgress(field.id, false);
      continue;
    }

    const element = document.getElementById(field.id) as FormElement | null;
    if (!element) {
      results.push({
        fieldId: field.id,
        label: field.label,
        filled: false,
        value: String(value),
        reason: "Form element not found on page"
      });
      if (onProgress) onProgress(field.id, false);
      continue;
    }

    // Attempt to fill
    let isFilled = false;
    if (element.tagName.toLowerCase() === 'select') {
      isFilled = handleSelectElement(element as HTMLSelectElement, String(value));
      if (isFilled) triggerFrameworkEvents(element);
    } else if (element.type === 'checkbox' || element.type === 'radio') {
      const targetElement = handleCheckableElement(element as HTMLInputElement, String(value));
      if (targetElement) {
        isFilled = true;
        triggerFrameworkEvents(targetElement);
      }
    } else {
      const role = element.getAttribute('role');
      const ariaAuto = element.getAttribute('aria-autocomplete');
      const hasAria = element.hasAttribute('aria-haspopup') || element.hasAttribute('aria-expanded') || element.hasAttribute('aria-controls');
      const classes = element.className || '';
      const isCombobox = role === 'combobox' || ariaAuto === 'list' || hasAria ||
                         (typeof classes === 'string' && (classes.includes('select2-search') || classes.includes('react-select') || classes.includes('ashby')));
      
      if (isCombobox) {
        // Advanced Combobox interaction for headless UI (e.g. Radix, Ashby).
        
        // 1. Aggressively open the dropdown menu.
        // We must use simulateMouseClick because many React comboboxes ignore element.click().
        simulateMouseClick(element as HTMLElement);
        element.focus();
        
        // Note: We intentionally DO NOT type the text into the input using setNativeValue here. 
        // Typing into strict headless comboboxes often breaks their internal filter state, causing "No options".
        // We will strictly rely on physically clicking the option from the menu.

        // 2. Wait for the React Portal to mount the options list in the DOM.
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const targetValue = String(value).toLowerCase();
        let matched = false;

        // 3. Search the document for the newly mounted option using standard accessibility selectors.
        const options = document.querySelectorAll('[role="option"], li, [data-value], [class*="option"]');
        for (const opt of Array.from(options)) {
          const text = (opt.textContent || '').trim().toLowerCase();
          if (text === targetValue || text.includes(targetValue)) {
            simulateMouseClick(opt as HTMLElement);
            matched = true;
            break;
          }
        }
        
        // 4. Fallback: If accessibility tags are missing, search ALL leaf nodes for an exact text match.
        if (!matched) {
          const allElements = document.querySelectorAll('div, span');
          for (const el of Array.from(allElements)) {
            const text = (el.textContent || '').trim().toLowerCase();
            // Only match if it's an exact match and has no children (leaf node) to avoid clicking giant containers
            if (text === targetValue && el.children.length === 0) {
              simulateMouseClick(el as HTMLElement);
              matched = true;
              break;
            }
          }
        }
        
        // 5. Force close the combobox to prevent cross-contamination with the next field
        const escapeEvent = new KeyboardEvent('keydown', {
          bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27
        });
        element.dispatchEvent(escapeEvent);
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        
        // Wait for React to unmount the portal before proceeding
        await new Promise(resolve => setTimeout(resolve, 100));
        
        isFilled = matched;
      } else {
        // Standard text input
        setNativeValue(element as HTMLInputElement, String(value));
        isFilled = true;
      }
    }

    results.push({
      fieldId: field.id,
      label: field.label,
      filled: isFilled,
      value: String(value),
      reason: isFilled ? undefined : "Could not find a matching option in the dropdown"
    });
    
    if (onProgress) onProgress(field.id, isFilled);
  }

  return results;
}
