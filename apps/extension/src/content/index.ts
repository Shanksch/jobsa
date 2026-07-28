import { injectAnswers } from "./fill";

const hostname = window.location.hostname;
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

interface ResumeItem {
  id: string;
  name: string;
  file_name: string;
  is_primary: boolean;
}

function extractFormSchema(): FormField[] {
  const fields: FormField[] = [];
  const elements = document.querySelectorAll('input, select, textarea');

  elements.forEach((el) => {
    const element = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    if (
      element.type === 'hidden' ||
      element.type === 'submit' ||
      element.type === 'button' ||
      element.disabled ||
      ('readOnly' in element && element.readOnly)
    ) {
      return;
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
    }

    fields.push(field);
  });

  return fields;
}

// --- 2. Floating UI ---

function injectUI() {
  if (!document.body) {
    console.warn("[JobSA] document.body is not ready yet, deferring injection.");
    setTimeout(injectUI, 500);
    return;
  }

  // ── Root host ──────────────────────────────────────────────────────────────
  const host = document.createElement('div');
  host.id = 'jobsa-overlay';
  Object.assign(host.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '2147483647',
    fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,sans-serif',
    fontSize: '13px',
    lineHeight: '1.4',
  });
  document.body.appendChild(host);

  // Inject keyframe for pulse animation
  if (!document.getElementById('jobsa-kf')) {
    const kf = document.createElement('style');
    kf.id = 'jobsa-kf';
    kf.textContent = '@keyframes jobsa-pulse{0%,100%{opacity:1}50%{opacity:.3}}';
    (document.head || document.body).appendChild(kf);
  }

  // ── Pill (default visible) ─────────────────────────────────────────────────
  const pill = document.createElement('div');
  Object.assign(pill.style, {
    background: '#0f172a',
    color: '#f8fafc',
    padding: '10px 18px',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: '600',
    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
    display: 'inline-block',
    userSelect: 'none',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
  });
  pill.textContent = '✨ JobSA';
  host.appendChild(pill);

  // ── Panel (hidden by default) ──────────────────────────────────────────────
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    display: 'none',
    width: '340px',
    maxHeight: '480px',
    background: '#0f172a',
    color: '#f8fafc',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    marginBottom: '8px',
  });

  // Header
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #1e293b',
    cursor: 'move',
  });
  const headerTitle = document.createElement('strong');
  headerTitle.style.color = '#f8fafc';
  headerTitle.textContent = '✨ JobSA';
  const closeBtn = document.createElement('button');
  Object.assign(closeBtn.style, {
    background: 'none', border: 'none', color: '#94a3b8',
    cursor: 'pointer', fontSize: '20px', lineHeight: '1',
    padding: '0', display: 'flex', alignItems: 'center',
  });
  closeBtn.textContent = '×';
  header.appendChild(headerTitle);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Dragging
  let dragging = false, dx = 0, dy = 0;
  header.addEventListener('mousedown', (e) => {
    dragging = true;
    dx = e.clientX - host.getBoundingClientRect().left;
    dy = e.clientY - host.getBoundingClientRect().top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    host.style.left = (e.clientX - dx) + 'px';
    host.style.top  = (e.clientY - dy) + 'px';
    host.style.right = 'auto';
    host.style.bottom = 'auto';
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  // Body
  const body = document.createElement('div');
  Object.assign(body.style, {
    padding: '12px 16px',
    overflowY: 'auto',
    maxHeight: '400px',
  });

  // Status row
  const statusRow = document.createElement('div');
  Object.assign(statusRow.style, {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: '12px', color: '#94a3b8', marginBottom: '10px',
  });
  const statusDot = document.createElement('span');
  Object.assign(statusDot.style, {
    width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b',
    display: 'inline-block', marginRight: '6px',
    animation: 'jobsa-pulse 1.5s infinite',
  });
  const statusLabel = document.createElement('span');
  statusLabel.textContent = 'Checking…';
  const statusRight = document.createElement('div');
  statusRight.style.cssText = 'display:flex;align-items:center;';
  statusRight.appendChild(statusDot);
  statusRight.appendChild(statusLabel);
  statusRow.appendChild(document.createTextNode('Backend'));
  statusRow.appendChild(statusRight);
  body.appendChild(statusRow);

  // Resume selector
  const resumeSelect = document.createElement('select');
  Object.assign(resumeSelect.style, {
    width: '100%', padding: '8px 10px', background: '#1e293b',
    border: '1px solid #334155', color: '#f8fafc', borderRadius: '6px',
    fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box', outline: 'none',
    cursor: 'pointer',
  });
  resumeSelect.innerHTML = '<option value="">Loading resumes…</option>';
  body.appendChild(resumeSelect);

  // Helper: make a button
  function makeBtn(text: string, bg = '#6366f1'): HTMLButtonElement {
    const btn = document.createElement('button');
    Object.assign(btn.style, {
      width: '100%', padding: '9px 12px', background: bg, color: '#fff',
      border: 'none', borderRadius: '8px', cursor: 'pointer',
      fontWeight: '600', fontSize: '13px', marginBottom: '8px',
      boxSizing: 'border-box', display: 'block', textAlign: 'center',
    });
    btn.onmouseover = () => { if (!btn.disabled) btn.style.opacity = '0.85'; };
    btn.onmouseout  = () => { btn.style.opacity = '1'; };
    btn.textContent = text;
    return btn;
  }

  const autofillBtn = makeBtn('✨ Autofill with JobSA');
  autofillBtn.disabled = true;
  autofillBtn.style.opacity = '0.5';
  autofillBtn.title = 'Navigate to the application form first.';
  body.appendChild(autofillBtn);

  const progressText = document.createElement('div');
  Object.assign(progressText.style, {
    fontSize: '12px', color: '#94a3b8', textAlign: 'center',
    padding: '4px 0 8px', display: 'none',
  });
  body.appendChild(progressText);

  const resultsContainer = document.createElement('div');
  resultsContainer.style.display = 'none';
  body.appendChild(resultsContainer);

  panel.appendChild(body);
  // Panel sits above the pill
  host.insertBefore(panel, pill);

  // ── Toggle ─────────────────────────────────────────────────────────────────
  function openPanel()  { panel.style.display = 'block'; pill.style.display = 'none'; chrome.storage.local.set({ jobsa_panel_expanded: true }); }
  function closePanel() { panel.style.display = 'none';  pill.style.display = 'inline-block'; chrome.storage.local.set({ jobsa_panel_expanded: false }); }
  pill.onclick     = openPanel;
  closeBtn.onclick = closePanel;

  chrome.storage.local.get('jobsa_panel_expanded', ({ jobsa_panel_expanded }) => {
    if (jobsa_panel_expanded === true) openPanel();
  });

  // ── Load resumes (backend health check) ───────────────────────────────────
  chrome.runtime.sendMessage({ action: 'list_resumes' }, (response) => {
    if (chrome.runtime.lastError || response?.error) {
      statusDot.style.background = '#ef4444';
      statusDot.style.animation = 'none';
      statusLabel.textContent = 'Disconnected';
      resumeSelect.innerHTML = '<option value="">Failed to load — check auth</option>';
      resumeSelect.disabled = true;
    } else {
      statusDot.style.background = '#10b981';
      statusDot.style.animation = 'none';
      statusLabel.textContent = 'Connected';
      const resumes: ResumeItem[] = response;
      if (resumes.length === 0) {
        resumeSelect.innerHTML = '<option value="">No resumes — upload in dashboard</option>';
        resumeSelect.disabled = true;
      } else {
        resumeSelect.innerHTML = '';
        resumes.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.textContent = r.name;
          if (r.is_primary) opt.selected = true;
          resumeSelect.appendChild(opt);
        });
      }
    }
  });

  // ── Form state: enable autofill when fields exist ─────────────────────────
  host.addEventListener('jobsa-form-state', (e: Event) => {
    const { hasForm } = (e as CustomEvent).detail;
    autofillBtn.disabled = !hasForm;
    autofillBtn.style.opacity = hasForm ? '1' : '0.5';
    autofillBtn.title = hasForm ? '' : 'Navigate to the application form first.';
  });

  // ── Detect job info from page ──────────────────────────────────────────────
  function detectJobInfo() {
    return {
      company: window.location.hostname.replace('www.', '').split('.')[0] || 'Unknown Company',
      role: document.title || 'Unknown Role',
    };
  }

  // ── Autofill handler ───────────────────────────────────────────────────────
  let currentApplicationId: string | null = null;

  autofillBtn.onclick = async () => {
    autofillBtn.disabled = true;
    autofillBtn.textContent = '⏳ Extracting fields…';
    progressText.style.display = 'block';
    progressText.textContent = 'Extracting form schema…';
    resultsContainer.style.display = 'none';

    try {
      const fields = extractFormSchema();
      console.log('[JobSA] Extracted fields:', fields.length, fields);

      autofillBtn.textContent = '🧠 Thinking…';
      progressText.textContent = 'Sending to JobSA AI…';

      const selectedResumeId = resumeSelect.value;

      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'autofill',
          payload: { url: window.location.href, fields, resume_id: selectedResumeId || undefined },
        }, (res) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else if (res?.error) reject(new Error(res.error));
          else resolve(res);
        });
      });

      autofillBtn.textContent = '⚡ Injecting…';
      progressText.textContent = 'Filling in your answers…';

      const fillResults = injectAnswers(response.answers, fields);
      autofillBtn.textContent = '✅ Done!';

      // Results list
      resultsContainer.innerHTML = '';
      const filledCount = fillResults.filter(r => r.filled).length;

      const summary = document.createElement('div');
      summary.style.cssText = 'font-size:12px;margin-bottom:8px;color:#94a3b8;';
      summary.innerHTML = `<strong style="color:#f8fafc">Filled ${filledCount}/${fillResults.length}</strong> fields`;
      resultsContainer.appendChild(summary);

      fillResults.forEach(r => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 6px;font-size:12px;border-radius:4px;cursor:pointer;color:#cbd5e1;';
        row.onmouseover = () => { row.style.background = '#1e293b'; };
        row.onmouseout  = () => { row.style.background = 'transparent'; };

        const icon = document.createElement('span');
        icon.textContent = r.filled ? '✓' : '⚠';
        icon.style.cssText = `color:${r.filled ? '#10b981' : '#f59e0b'};flex-shrink:0;font-weight:bold;`;

        const lbl = document.createElement('span');
        lbl.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px;';
        lbl.textContent = r.label;
        lbl.title = r.label;

        row.appendChild(icon);
        row.appendChild(lbl);

        if (!r.filled) {
          row.onclick = () => {
            const el = document.getElementById(r.fieldId);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus();
              (el as HTMLElement).style.outline = '2px solid #f59e0b';
              setTimeout(() => { (el as HTMLElement).style.outline = ''; }, 3000);
            }
          };
        }
        resultsContainer.appendChild(row);
      });

      // Application tracking card
      const jobInfo = detectJobInfo();
      const card = document.createElement('div');
      card.style.cssText = 'background:#1e293b;border-radius:8px;padding:10px 12px;margin-top:10px;';
      card.innerHTML = `<div style="font-weight:600;color:#f8fafc;margin-bottom:2px;">${jobInfo.company}</div><div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${jobInfo.role}</div>`;
      const appliedBtn = makeBtn('✓ Mark as Applied', '#10b981');
      appliedBtn.style.marginBottom = '0';
      card.appendChild(appliedBtn);
      resultsContainer.appendChild(card);

      resultsContainer.style.display = 'block';
      progressText.style.display = 'none';

      let ats = 'Unknown';
      if (window.location.hostname.includes('greenhouse.io')) ats = 'Greenhouse';
      else if (window.location.hostname.includes('lever.co')) ats = 'Lever';
      else if (window.location.hostname.includes('ashbyhq.com')) ats = 'Ashby';
      else if (window.location.hostname.includes('workday.com')) ats = 'Workday';

      // Create draft application record
      chrome.runtime.sendMessage({
        action: 'create_application',
        payload: { company: jobInfo.company, role: jobInfo.role, posting_url: window.location.href, ats_platform: ats, resume_id: selectedResumeId || undefined, generated_answers: response.answers },
      }, (res) => { 
        if (chrome.runtime.lastError || res?.error) {
          console.error('[JobSA] Failed to save application draft:', chrome.runtime.lastError || res?.error);
          appliedBtn.textContent = '❌ Failed to save draft';
          appliedBtn.disabled = true;
          appliedBtn.title = (res?.error || "Unknown error") as string;
        } else if (res?.id) {
          currentApplicationId = res.id; 
        }
      });

      appliedBtn.onclick = () => {
        if (!currentApplicationId) return;
        appliedBtn.textContent = '⏳ Updating…';
        chrome.runtime.sendMessage({
          action: 'update_application',
          payload: { id: currentApplicationId, status: 'applied', applied_at: new Date().toISOString() },
        }, (res) => { 
          if (chrome.runtime.lastError || res?.error) {
            console.error('[JobSA] Failed to update application:', chrome.runtime.lastError || res?.error);
            appliedBtn.textContent = '❌ Update Failed';
            appliedBtn.title = (res?.error || "Unknown error") as string;
            appliedBtn.disabled = false; // let them try again
          } else {
            appliedBtn.textContent = '✅ Marked as Applied'; 
            appliedBtn.disabled = true; 
          }
        });
      };

      document.addEventListener('submit', () => {
        if (!currentApplicationId) return;
        chrome.runtime.sendMessage({ action: 'update_application', payload: { id: currentApplicationId, status: 'applied', applied_at: new Date().toISOString() } });
        appliedBtn.textContent = '✅ Marked as Applied';
        appliedBtn.disabled = true;
      }, { once: true });

      setTimeout(() => { autofillBtn.textContent = '✨ Autofill with JobSA'; autofillBtn.disabled = false; }, 2000);

    } catch (err: any) {
      console.error('[JobSA] Autofill failed:', err);
      autofillBtn.textContent = '❌ Failed';
      progressText.style.color = '#ef4444';
      progressText.textContent = err.message || 'Check console for errors';
      setTimeout(() => {
        autofillBtn.textContent = '✨ Autofill with JobSA';
        autofillBtn.disabled = false;
        progressText.style.color = '#94a3b8';
        progressText.textContent = '';
        progressText.style.display = 'none';
      }, 4000);
    }
  };
}

// --- 3. Injection logic ---

function isJobApplicationPage(): boolean {
  const url = window.location.href.toLowerCase();
  const atsDomains = [
    'workdayjobs.com', 'greenhouse.io', 'lever.co', 'ashbyhq.com',
    'smartrecruiters.com', 'breezy.hr', 'workable.com',
    'icims.com', 'taleo.net', 'bamboohr.com',
    'jobs.', 'careers.',
  ];

  if (atsDomains.some(domain => url.includes(domain))) return true;
  if (url.includes('/apply') || url.includes('/application')) return true;
  return false;
}

if (isJobApplicationPage()) {
  // Inject panel immediately on known ATS sites
  injectUI();

  // Poll every 1.5s to enable/disable autofill based on form presence
  const checkFields = setInterval(() => {
    const overlay = document.getElementById('jobsa-overlay');
    if (!overlay) { clearInterval(checkFields); return; }
    const inputs = document.querySelectorAll('input:not([type=hidden]), select, textarea');
    overlay.dispatchEvent(new CustomEvent('jobsa-form-state', { detail: { hasForm: inputs.length > 2 } }));
  }, 1500);

  setTimeout(() => clearInterval(checkFields), 60000);
}
