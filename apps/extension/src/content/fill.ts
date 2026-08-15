type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export interface FillResult {
  fieldId: string;
  label: string;
  filled: boolean;
  value?: string;
  reason?: string; // Why it wasn't filled (e.g., "No answer from AI", "Element not found")
}

interface MatchCandidate {
  text: string;
  altText?: string;
}

function scoreCandidate(candidateText: string, altText: string | undefined, target: string): number {
  const c = candidateText.trim().toLowerCase();
  const a = (altText || '').trim().toLowerCase();
  const t = target.trim().toLowerCase();
  if (!c && !a) return 0;

  if (c === t || a === t) return 100;

  const normalize = (s: string) => s.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').replace(/\s+/g, ' ').trim();
  if (normalize(c) === normalize(t) || normalize(a) === normalize(t)) return 95;

  let best = 0;

  const wordBoundaryTest = (haystack: string, needle: string) => {
    if (!needle) return false;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\W)${escaped}(\\W|$)`, 'i').test(haystack);
  };
  if (t.length > 1) {
    if (wordBoundaryTest(c, t)) best = Math.max(best, 75 * (t.length / Math.max(c.length, 1)) + 20);
    if (wordBoundaryTest(a, t)) best = Math.max(best, 75 * (t.length / Math.max(a.length, 1)) + 20);
  }

  if (t.length > 2) {
    if (c.startsWith(t) || a.startsWith(t)) best = Math.max(best, 65);
    if (c.includes(t)) best = Math.max(best, 30 * (t.length / c.length) + 15);
    if (a.includes(t)) best = Math.max(best, 30 * (t.length / a.length) + 15);
    if (c.length > 2 && c.length < 40 && t.includes(c)) best = Math.max(best, 30 * (c.length / t.length) + 10);
  }

  return best;
}

function findBestMatchIndex(candidates: MatchCandidate[], target: string, threshold = 25): number | null {
  let bestIdx: number | null = null;
  let bestScore = 0;
  candidates.forEach((cand, i) => {
    const score = scoreCandidate(cand.text, cand.altText, target);
    const isBetter = score > bestScore ||
      (score === bestScore && bestIdx !== null && cand.text.length < candidates[bestIdx]!.text.length);
    if (isBetter) { bestScore = score; bestIdx = i; }
  });
  return bestScore >= threshold ? bestIdx : null;
}

function handleSelectElement(element: HTMLSelectElement, value: string): boolean {
  const candidates = Array.from(element.options).map(opt => ({ text: opt.text, altText: opt.value }));
  const bestIdx = findBestMatchIndex(candidates, value);
  if (bestIdx === null) {
    console.warn(`[JobSA] No confident select option match for "${value}" on #${element.id}`);
    return false;
  }
  const option = element.options[bestIdx];
  if (!option) return false;
  setNativeValue(element, option.value);
  element.selectedIndex = bestIdx;
  return true;
}

function handleCheckableElement(element: HTMLInputElement, value: string): HTMLInputElement | null {
  const normalizedValue = value.trim().toLowerCase();
  
  if (element.type === 'radio' && element.name) {
    // For radio groups, we need to find the specific radio button that matches the AI's text value
    const radios = Array.from(
      document.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`)
    ) as HTMLInputElement[];

    const candidates = radios.map(r => {
      const radioLabel = (r.id ? document.querySelector(`label[for="${CSS.escape(r.id)}"]`) : null) || r.closest('label');
      return { text: (radioLabel?.textContent || '').trim(), altText: r.value };
    });

    const bestIdx = findBestMatchIndex(candidates, value);
    if (bestIdx === null) return null;

    const matchedRadio = radios[bestIdx];
    if (!matchedRadio) return null;
    matchedRadio.checked = true;
    
    const label = (matchedRadio.id ? document.querySelector(`label[for="${CSS.escape(matchedRadio.id)}"]`) : null) || matchedRadio.closest('label');
    simulateMouseClick((label as HTMLElement) || matchedRadio);
    
    return matchedRadio;
  } else {
    // For simple checkboxes
    const shouldCheck = normalizedValue === 'true' || normalizedValue === 'yes' || normalizedValue === '1' || normalizedValue === 'checked';
    if (element.checked !== shouldCheck) {
      element.checked = shouldCheck;
      
      const label = (element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`) : null) || element.closest('label');
      if (label) {
        simulateMouseClick(label as HTMLElement);
      } else {
        simulateMouseClick(element);
      }
    }
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

  element.focus();
  
  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }
  
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  element.blur();
}

function simulateMouseClick(element: HTMLElement) {
  element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  element.focus();
  element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
}

function triggerFrameworkEvents(element: FormElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function getOpenListbox(triggerEl: HTMLElement): Element | Document {
  const controlsId = triggerEl.getAttribute('aria-controls') || triggerEl.getAttribute('aria-owns');
  if (controlsId) {
    const byId = document.getElementById(controlsId);
    if (byId) return byId;
  }
  // Fall back to the most recently mounted listbox/menu portal, not the whole document.
  const candidates = Array.from(
    document.querySelectorAll('[role="listbox"], [role="menu"], ul[class*="menu"], div[class*="menu"]')
  ).filter(el => (el as HTMLElement).offsetParent !== null); // visible only
  return candidates[candidates.length - 1] || document;
}

async function waitForOptions(scope: Element | Document, selector: string, timeoutMs = 1500): Promise<Element[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = Array.from(scope.querySelectorAll(selector)).filter(
      el => (el as HTMLElement).offsetParent !== null
    );
    if (found.length > 0) return found;
    await new Promise(r => setTimeout(r, 100));
  }
  return [];
}

function comboboxShowsValue(triggerEl: HTMLElement, value: string): boolean {
  const normalized = value.trim().toLowerCase();
  const ownText = ((triggerEl as HTMLInputElement).value || triggerEl.textContent || '').trim().toLowerCase();
  if (ownText.includes(normalized)) return true;

  // Climb high enough to grab the main wrapper (value-container or control) that holds both the input and the displayed value.
  const container = triggerEl.closest('[class*="value-container"], [class*="control"], .select2-container, [role="combobox"]') 
                    || triggerEl.closest('[class*="select"]') 
                    || triggerEl.parentElement;
  if (!container) return false;

  const singleValue = container.querySelector('[class*="single-value"], .select2-selection__rendered');
  if (singleValue && (singleValue.textContent || '').trim().toLowerCase().includes(normalized)) return true;

  const placeholder = container.querySelector('[class*="placeholder"]');
  if (placeholder && (placeholder.textContent || '').trim().toLowerCase().includes(normalized)) return true;

  return false;
}

export async function injectAnswers(
  answers: Record<string, string>,
  extractedFields: Array<{ id: string; label: string; name?: string }>,
  onProgress?: (fieldId: string, filled: boolean) => void
): Promise<FillResult[]> {
  const results: FillResult[] = [];
  console.log("[JobSA] Backend returned answers:", answers);

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

    let element = document.getElementById(field.id) as FormElement | null;
    if (!element && field.name) {
      element = document.querySelector(`[name="${CSS.escape(field.name)}"]`) as FormElement | null;
    }
    
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
                         (typeof classes === 'string' && (classes.includes('select2-search') || classes.includes('react-select') || classes.includes('ashby'))) ||
                         element.id.toLowerCase().includes('react-select') ||
                         element.closest('[class*="select__control"], [class*="react-select"]') !== null;
      
      if (isCombobox) {
        simulateMouseClick(element as HTMLElement);
        element.focus();

        const scope = getOpenListbox(element as HTMLElement);
        const optionSelector = '[role="option"], [data-value], .pac-item, .select2-results__option, [class*="Option"], [class*="option"]';
        let options = await waitForOptions(scope, optionSelector, 800);
        console.log(`[JobSA] Combobox initial options count:`, options.length);

        // Greenhouse's location/school fields are network-backed: nothing renders until
        // you type. If the passive open produced no options, type and give it a real chance.
        if (options.length === 0) {
          console.log(`[JobSA] No options initially, typing "${value}" to trigger network...`);
          setNativeValue(element as HTMLInputElement, String(value));
          options = await waitForOptions(scope, optionSelector, 1500);
          console.log(`[JobSA] Options after typing:`, options.length);
        }

        const targetValue = String(value).toLowerCase();
        let matched = false;

        const candidates = options.map(opt => ({
          text: opt.textContent || '',
          altText: opt.getAttribute('data-value') || undefined,
        }));
        
        const bestIdx = findBestMatchIndex(candidates, targetValue, 30);
        if (bestIdx !== null) {
          console.log(`[JobSA] Best match found: "${candidates[bestIdx]!.text}"`);
          simulateMouseClick(options[bestIdx] as HTMLElement);
          matched = true;
        } else {
          console.log(`[JobSA] No match found above threshold. Target: "${targetValue}". Candidates:`, candidates.map(c => c.text).slice(0, 10).join(' | '));
        }

        if (matched) {
          await new Promise(r => setTimeout(r, 50));
          matched = comboboxShowsValue(element as HTMLElement, targetValue); // verify before trusting
          console.log(`[JobSA] comboboxShowsValue verification for "${targetValue}":`, matched);
        }

        const escapeEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27 });
        element.dispatchEvent(escapeEvent);
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
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
