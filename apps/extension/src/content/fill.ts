type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function handleSelectElement(element: HTMLSelectElement, value: string): void {
  let matched = false;
  for (let i = 0; i < element.options.length; i++) {
    const option = element.options[i];
    if (option && (option.text.trim() === value.trim() || option.value === value.trim())) {
      element.selectedIndex = i;
      matched = true;
      break;
    }
  }
  if (!matched) {
    console.warn(`[JobSA] Could not find exact select option for "${value}" on #${element.id}`);
  }
}

function handleCheckableElement(element: HTMLInputElement, value: string): void {
  const normalizedValue = value.toLowerCase();
  element.checked = normalizedValue === 'true' || normalizedValue === 'yes' || normalizedValue === '1';
}

function triggerFrameworkEvents(element: FormElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  
  // React 16+ specific hack for forcing events
  const tracker = (element as any)._valueTracker;
  if (tracker) {
    tracker.setValue(element.value);
  }
}

export function injectAnswers(answers: Record<string, string>) {
  for (const [id, value] of Object.entries(answers)) {
    if (!value) continue;

    const element = document.getElementById(id) as FormElement | null;
    if (!element) {
      console.warn(`[JobSA] Element with id ${id} not found for injection.`);
      continue;
    }

    if (element.tagName.toLowerCase() === 'select') {
      handleSelectElement(element as HTMLSelectElement, value);
    } else if (element.type === 'checkbox' || element.type === 'radio') {
      handleCheckableElement(element as HTMLInputElement, value);
    } else {
      element.value = value;
    }

    triggerFrameworkEvents(element);
  }
}
