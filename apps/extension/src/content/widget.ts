/**
 * JobSA Floating Widget
 *
 * Injected into every top-level frame. Renders a floating FAB button (the JobSA logo)
 * in the bottom-right corner. Clicking it creates/destroys a floating panel with the
 * full copilot UI built in vanilla JS inside a Shadow DOM.
 */

import { injectAnswers } from "./fill";



/* ── State ───────────────────────────────────────────────────────────── */

interface WidgetState {
  status: 'checking' | 'waking_up' | 'connected' | 'disconnected';
  resumes: { id: string; name: string; file_name: string; is_primary: boolean }[];
  selectedResumeId: string;
  company: string;
  jobTitle: string;
  pageUrl: string;
  hasForm: boolean;
  isMatching: boolean;
  matchScore: { score: number; justification: string } | null;
  isAutofilling: boolean;
  autofillProgress: string;
  error: string | null;
  results: { label: string; status: 'loading' | 'success' | 'error'; fieldId: string }[] | null;
  generatedAnswers: Record<string, string> | null;
  isSaving: boolean;
  isSaved: boolean;
}

const S: WidgetState = {
  status: 'checking',
  resumes: [],
  selectedResumeId: '',
  company: 'Unknown Company',
  jobTitle: 'Unknown Role',
  pageUrl: '',
  hasForm: false,
  isMatching: false,
  matchScore: null,
  isAutofilling: false,
  autofillProgress: '',
  error: null,
  results: null,
  generatedAnswers: null,
  isSaving: false,
  isSaved: false,
};

/* ── Main ────────────────────────────────────────────────────────────── */

function injectWidget() {
  if (document.getElementById('jobsa-widget-host')) return;

  const host = document.createElement('div');
  host.id = 'jobsa-widget-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = WIDGET_CSS;
  shadow.appendChild(style);

  // ── FAB Button ──
  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.innerHTML = `<img src="${chrome.runtime.getURL('logo.png')}" alt="JobSA" /><span class="dot"></span>`;
  shadow.appendChild(fab);

  let panel: HTMLDivElement | null = null;

  function openPanel() {
    if (panel) return;
    panel = document.createElement('div');
    panel.className = 'panel';
    shadow.appendChild(panel);
    renderPanel();
    fab.classList.add('open');
    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { panel!.classList.add('visible'); });
    });
    
    // Squeeze website
    document.documentElement.style.setProperty('padding-right', '404px', 'important');
    document.documentElement.style.setProperty('transition', 'padding-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 'important');
  }

  function closePanel() {
    if (!panel) return;
    panel.classList.remove('visible');
    fab.classList.remove('open');
    const p = panel;
    panel = null;
    
    // Restore website layout
    document.documentElement.style.removeProperty('padding-right');
    setTimeout(() => {
      if (!panel) document.documentElement.style.removeProperty('transition');
      p.remove();
    }, 300);
  }

  function toggle() {
    panel ? closePanel() : openPanel();
  }

  function renderPanel() {
    if (!panel) return;
    panel.innerHTML = buildHTML();
    bindEvents(shadow);
  }

  fab.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  chrome.runtime.onMessage.addListener((msg) => { if (msg.action === 'TOGGLE_WIDGET') toggle(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel && e.isTrusted) closePanel(); });

  // ── Bootstrap ──
  detectPage();
  setInterval(detectPage, 3000);
  fetchResumes(shadow.querySelector('.dot') as HTMLElement, renderPanel);

  /* ── Helpers ── */

  function detectPage() {
    const inputs = document.querySelectorAll('input:not([type=hidden]), select, textarea');
    S.hasForm = inputs.length > 2;
    S.company = window.location.hostname.replace('www.', '').split('.')[0] || 'Unknown';
    S.jobTitle = document.title || 'Unknown Role';
    S.pageUrl = window.location.href;
  }

  function fetchResumes(dot: HTMLElement | null, onDone: () => void) {
    S.status = 'checking';
    chrome.runtime.sendMessage({ action: 'list_resumes' }, (res) => {
      if (chrome.runtime.lastError || res?.error) {
        S.status = 'disconnected';
        S.error = chrome.runtime.lastError?.message || res?.error || 'Failed to connect to backend';
        if (dot) dot.style.background = '#ef4444';
      } else {
        S.status = 'connected';
        if (dot) dot.style.background = '#10b981';
        S.resumes = res || [];
        if (S.resumes.length > 0) {
          const p = S.resumes.find(r => r.is_primary);
          S.selectedResumeId = p ? p.id : S.resumes[0]!.id;
        }
      }
      onDone();
    });
  }

  function bindEvents(root: ShadowRoot) {
    const sel = root.querySelector('#rs') as HTMLSelectElement | null;
    sel?.addEventListener('change', () => { S.selectedResumeId = sel.value; });

    root.querySelector('#match-btn')?.addEventListener('click', async () => {
      if (!S.selectedResumeId || S.isMatching) return;
      S.isMatching = true; S.matchScore = null; S.error = null; renderPanel();
      try {
        const main = document.querySelector('main, [role="main"], #content, .job-description') as HTMLElement;
        let jd = (main || document.body).innerText || '';
        if (jd.length > 10000) jd = jd.substring(0, 10000);
        if (!jd) throw new Error('Could not extract job description');
        const r = await msg('job_match', { resume_id: S.selectedResumeId, job_description: jd });
        S.matchScore = { score: r.score, justification: r.justification };
      } catch (e: any) { S.error = e.message; }
      S.isMatching = false; renderPanel();
    });

    root.querySelector('#fill-btn')?.addEventListener('click', async () => {
      if (!S.selectedResumeId || S.isAutofilling) return;
      S.isAutofilling = true; S.results = null; S.error = null;
      S.autofillProgress = 'Extracting form…'; renderPanel();
      try {
        const fields = extractFormSchema();
        if (!fields.length) throw new Error('No form fields found.');
        
        S.results = fields.map(f => ({ fieldId: f.id, label: f.label, status: 'loading' }));
        S.autofillProgress = 'Thinking (AI)…'; renderPanel();
        
        const r = await msg('autofill', { url: S.pageUrl, fields, resume_id: S.selectedResumeId });
        S.autofillProgress = 'Injecting…'; renderPanel();
        
        await injectAnswers(r.answers, fields, (fieldId, filled) => {
          const res = S.results?.find(x => x.fieldId === fieldId);
          if (res) {
            res.status = filled ? 'success' : 'error';
            renderPanel();
          }
        });
        
        S.generatedAnswers = r.answers; S.isSaved = false;
      } catch (e: any) { S.error = e.message; }
      S.isAutofilling = false; S.autofillProgress = ''; renderPanel();
    });

    root.querySelector('#save-btn')?.addEventListener('click', async () => {
      if (!S.selectedResumeId || S.isSaved || S.isSaving) return;
      S.isSaving = true; S.error = null; renderPanel();
      try {
        await msg('create_application', {
          company: S.company, role: S.jobTitle, posting_url: S.pageUrl,
          resume_id: S.selectedResumeId, generated_answers: S.generatedAnswers || {}
        });
        S.isSaved = true;
      } catch (e: any) { S.error = e.message; }
      S.isSaving = false; renderPanel();
    });

    root.querySelectorAll('[data-fid]').forEach(el => {
      el.addEventListener('click', () => {
        const fid = (el as HTMLElement).dataset.fid;
        if (!fid) return;
        const target = document.getElementById(fid);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.focus();
          target.style.outline = '2px solid #00e599';
          setTimeout(() => { target.style.outline = ''; }, 3000);
        }
      });
    });

    root.querySelector('#close-btn')?.addEventListener('click', closePanel);
  }

  function msg(action: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action, payload }, (r) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (r?.error) return reject(new Error(r.error));
        resolve(r);
      });
    });
  }

  console.log('[JobSA] Widget ready');
}

/* ── HTML ─────────────────────────────────────────────────────────────── */

function buildHTML(): string {
  const dot = S.status === 'connected' ? '#10b981' : S.status === 'disconnected' ? '#ef4444' : '#f59e0b';
  
  const opts = S.resumes.map(r => `<option value="${r.id}" ${r.id === S.selectedResumeId ? 'selected' : ''}>${r.name}</option>`).join('');

  const sc = S.matchScore;
  const scColor = sc ? (sc.score >= 75 ? '#10b981' : sc.score >= 50 ? '#f59e0b' : '#ef4444') : '';
  const badge = sc ? `<div style="position:absolute;top:16px;right:16px;width:44px;height:44px;border-radius:50%;border:2px solid ${scColor};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${scColor};background:#fff">${sc.score}%</div>` : '';

  let resHTML = '';
  if (S.results) {
    const ok = S.results.filter(r => r.status === 'success').length;
    const rows = S.results.map(r => {
      let icon = ''; let color = ''; let opac = '1';
      if (r.status === 'loading') {
        icon = '<span style="display:inline-block;width:12px;height:12px;border:2px solid #ddd;border-top-color:#888;border-radius:50%;animation:spin 1s linear infinite"></span>';
        color = '#888'; opac = '0.6';
      } else if (r.status === 'success') {
        icon = '✓'; color = '#10b981';
      } else {
        icon = '⚠'; color = '#f59e0b';
      }
      return `<div data-fid="${r.fieldId}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;opacity:${opac}" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'"><span style="color:${color};display:flex;align-items:center;justify-content:center;width:16px;font-weight:bold">${icon}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${r.status==='loading'?'#888':'inherit'}">${r.label}</span></div>`;
    }).join('');
    resHTML = `
      <details open style="margin-top:16px;border-top:1px solid #eee;padding-top:16px;">
        <summary style="display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;cursor:pointer;list-style:none;user-select:none;margin-bottom:12px">
          <span style="display:flex;align-items:center;gap:8px">📋 Your Autofill Information <span style="font-size:10px;font-weight:600;background:#f5f5f5;padding:2px 6px;border-radius:10px;color:#666">${ok}/${S.results.length}</span></span>
        </summary>
        <div style="max-height:240px;overflow-y:auto;padding-right:4px">${rows}</div>
        <div style="margin-top:12px">
          <button id="save-btn" style="width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;background:${S.isSaved ? '#d1fae5' : '#111'};color:${S.isSaved ? '#059669' : '#fff'}" ${S.isSaving || S.isSaved ? 'disabled' : ''}>
            ${S.isSaving ? 'Saving…' : S.isSaved ? '✓ Applied' : 'Mark as Applied'}
          </button>
        </div>
      </details>`;
  }

  return `
    <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #eee">
      <img src="${chrome.runtime.getURL('logo.png')}" style="width:28px;height:28px;object-fit:contain" />
      <span style="font-weight:800;font-size:16px;flex:1;letter-spacing:-0.3px">JobSA</span>
      <button id="close-btn" style="background:none;border:none;cursor:pointer;font-size:20px;color:#aaa;line-height:1;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%" onmouseover="this.style.background='#f0f0f0';this.style.color='#333'" onmouseout="this.style.background='none';this.style.color='#aaa'">✕</button>
    </div>
    
    <div style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px;min-height:0">
      
      <div style="background:#fff;border:1px solid #eaeaea;border-radius:14px;padding:16px;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.02)">
        <div style="font-size:12px;color:#666;font-weight:500;margin-bottom:4px;display:flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${dot}"></span> ${S.company}
        </div>
        <div style="font-size:18px;font-weight:800;line-height:1.2;padding-right:50px;letter-spacing:-0.4px">${S.jobTitle}</div>
        ${badge}
      </div>

      <button id="fill-btn" style="width:100%;padding:18px;border:none;border-radius:14px;font-size:18px;font-weight:800;cursor:pointer;font-family:inherit;background:#00e599;color:#000;box-shadow:0 6px 20px rgba(0,229,153,.3);transition:all .2s;letter-spacing:-0.2px" ${S.isAutofilling || !S.selectedResumeId || !S.hasForm ? 'disabled' : ''}>
        ${S.isAutofilling ? 'Autofilling...' : S.hasForm ? 'Autofill' : 'No Form Detected'}
      </button>
      ${S.autofillProgress ? `<div style="text-align:center;font-size:13px;color:#666;font-weight:500">${S.autofillProgress}</div>` : ''}
      ${S.error ? `<div style="padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;font-size:13px;color:#dc2626;font-weight:500">${S.error}</div>` : ''}
      
      <div style="border:1px solid #eaeaea;border-radius:14px;overflow:hidden;background:#fff">
        <div style="padding:14px 16px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;border-bottom:1px solid #eaeaea">
          📄 Upload Resume
        </div>
        <div style="padding:12px 16px;display:flex;flex-direction:column;gap:12px">
          <select id="rs" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:10px;font-size:13px;font-weight:500;font-family:inherit;background:#f9f9f9;cursor:pointer" ${S.resumes.length === 0 ? 'disabled' : ''}>
            ${S.resumes.length === 0 ? '<option>No resumes</option>' : opts}
          </select>
          <button id="match-btn" style="width:100%;padding:10px;border:none;background:#f0fcf7;color:#00b87a;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px" ${S.isMatching || !S.selectedResumeId ? 'disabled' : ''}>
            ${S.isMatching ? '<span style="display:inline-block;width:12px;height:12px;border:2px solid #00b87a;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite"></span> Analyzing...' : '✨ Check Match Score'}
          </button>
          ${S.matchScore ? `<ul style="font-size:12px;color:#444;line-height:1.6;background:#f9f9f9;padding:14px 16px 14px 30px;border-radius:10px;border:1px solid #eee;margin:0;max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">${S.matchScore.justification.split(/(?<=[.?!])\s+/).filter(Boolean).map(s => `<li style="margin-bottom:4px">${s.trim()}</li>`).join('')}</ul>` : ''}
        </div>
      </div>
      
      ${resHTML}
    </div>`;
}

/* ── Form Schema Extraction ──────────────────────────────────────────── */

interface FormField { id: string; name: string; type: string; label: string; options?: string[]; required: boolean; }

function extractFormSchema(): FormField[] {
  const fields: FormField[] = [];
  const els = document.querySelectorAll('input, select, textarea');
  const rg = new Set<string>();
  els.forEach(el => {
    const e = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (e.type === 'submit' || e.type === 'button' || e.disabled || ('readOnly' in e && e.readOnly)) return;
    const hidden = e.type === 'hidden' || e.style.display === 'none' || e.style.visibility === 'hidden' || e.style.opacity === '0' || e.offsetParent === null || (!e.getBoundingClientRect().width && !e.getBoundingClientRect().height);
    if (hidden && e.tagName.toLowerCase() !== 'select') return;
    if (!e.name && !e.id) return;
    if (e.tagName.toLowerCase() === 'input') {
      const r = e.getAttribute('role'), a = e.getAttribute('aria-autocomplete'), c = e.className || '';
      if (r === 'combobox' || a === 'list' || (typeof c === 'string' && (c.includes('select2') || c.includes('react-select')))) {
        const ct = e.closest('div, .field, .form-group, label');
        if (ct?.querySelector('select')) return;
      }
    }
    if (e.type === 'radio' && e.name) { if (rg.has(e.name)) return; rg.add(e.name); }

    let lbl = '';
    const id = e.id;
    if (id) { try { const l = document.querySelector(`label[for="${CSS.escape(id)}"]`) as HTMLLabelElement; if (l) lbl = l.innerText.trim(); } catch {} }
    if (!lbl && e.parentElement?.tagName.toLowerCase() === 'label') lbl = e.parentElement.innerText.replace((e as HTMLElement).innerText || '', '').trim();
    if (!lbl) lbl = e.getAttribute('aria-label') || '';
    if (!lbl && 'placeholder' in e) lbl = e.placeholder || '';
    if (!lbl && e.type === 'radio' && e.name) { const fs = e.closest('fieldset'); if (fs) { const lg = fs.querySelector('legend'); if (lg) lbl = lg.innerText.trim(); } }
    if (!lbl) lbl = e.name || id || 'Unknown';

    const f: FormField = { id: id || Math.random().toString(36).substring(7), name: e.name || '', type: e.type || e.tagName.toLowerCase(), label: lbl, required: e.required };
    if (!e.id) e.id = f.id;
    if (e.tagName.toLowerCase() === 'select') { f.options = Array.from((e as HTMLSelectElement).options).map(o => o.text.trim()).filter(Boolean); }
    else if (e.type === 'radio' && e.name) {
      f.options = Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(e.name)}"]`)).map(r => {
        const ri = r as HTMLInputElement; const rl = ri.id ? document.querySelector(`label[for="${CSS.escape(ri.id)}"]`) : null;
        return (rl as HTMLLabelElement)?.innerText?.trim() || ri.value || 'Option';
      });
    }
    fields.push(f);
  });
  return fields;
}

/* ── CSS ──────────────────────────────────────────────────────────────── */

const WIDGET_CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  :host { all: initial; position: fixed; z-index: 2147483647; bottom: 0; right: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

  .fab {
    position: fixed; bottom: 24px; right: 24px;
    width: 54px; height: 54px; border-radius: 50%;
    background: #fff; border: 1px solid rgba(0,0,0,.08);
    box-shadow: 0 4px 16px rgba(0,0,0,.12);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
    z-index: 2;
  }
  .fab:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,0,0,.16); }
  .fab:active { transform: scale(.95); }
  .fab img { width: 34px; height: 34px; object-fit: contain; pointer-events: none; }
  .fab.open { display: none; }
  .dot { position: absolute; top: -1px; right: -1px; width: 12px; height: 12px; border-radius: 50%; background: #f59e0b; border: 2px solid #fff; }

  .panel {
    position: fixed; top: 12px; right: 12px;
    width: 380px; height: calc(100vh - 24px); max-height: calc(100vh - 24px);
    border-radius: 16px; background: #fff;
    border: 1px solid rgba(0,0,0,.06);
    box-shadow: -10px 0 40px rgba(0,0,0,.1);
    display: flex; flex-direction: column;
    font-size: 14px; color: #1a1a1a; line-height: 1.5;
    z-index: 1;
    opacity: 0; transform: translateX(100%);
    transition: opacity .3s cubic-bezier(.16,1,.3,1), transform .3s cubic-bezier(.16,1,.3,1);
    overflow: hidden;
  }
  .panel.visible { opacity: 1; transform: translateX(0); }

  summary::-webkit-details-marker { display: none; }
  button:disabled { opacity: .5; cursor: not-allowed !important; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
`;

if (window === window.top) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWidget);
  } else {
    injectWidget();
  }
}
