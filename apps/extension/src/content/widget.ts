/**
 * JobSA Floating Widget
 *
 * Injected into every top-level frame. Renders a floating FAB button (the JobSA logo)
 * in the bottom-right corner. Clicking it creates/destroys a floating panel with the
 * full copilot UI built in vanilla JS inside a Shadow DOM.
 */

import { injectAnswers } from "./fill";



/* ── State ───────────────────────────────────────────────────────────── */

interface CategoryScores {
  required_skills: number;
  experience_seniority: number;
  domain_relevance: number;
  nice_to_have_skills: number;
  education_certifications: number;
  career_trajectory: number;
}

interface JobMatchResponse {
  overall_score: number;
  verdict: string;
  category_scores: CategoryScores;
  matched_requirements: string[];
  missing_requirements: string[];
  inferred_transferable_skills: string[];
  red_flags: string[];
  confidence: string;
  rationale: string;
}

interface WidgetState {
  status: 'checking' | 'waking_up' | 'connected' | 'disconnected';
  resumes: { id: string; name: string; file_name: string; is_primary: boolean }[];
  selectedResumeId: string;
  company: string;
  jobTitle: string;
  pageUrl: string;
  hasForm: boolean;
  isMatching: boolean;
  matchScore: JobMatchResponse | null;
  isAutofilling: boolean;
  autofillProgress: string;
  error: string | null;
  results: { label: string; status: 'loading' | 'success' | 'error'; fieldId: string }[] | null;
  generatedAnswers: Record<string, string> | null;
  isSaving: boolean;
  isSaved: boolean;
  authenticated: boolean | null;
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
  authenticated: null,
};

/* ── Main ────────────────────────────────────────────────────────────── */

function injectWidget() {
  if (document.getElementById('jobsa-widget-host')) return;

  if (!document.getElementById('jobsa-squeeze-styles')) {
    const style = document.createElement('style');
    style.id = 'jobsa-squeeze-styles';
    style.textContent = `
      html.jobsa-squeeze { overflow-x: hidden; }
      html.jobsa-squeeze body {
        transform: translateZ(0);
        width: calc(100% - var(--jobsa-panel-width, 0px)) !important;
        margin-inline-end: var(--jobsa-panel-width, 0px) !important;
        box-sizing: border-box;
        transition: width 220ms ease, margin-inline-end 220ms ease;
      }
    `;
    document.documentElement.appendChild(style);
  }

  const host = document.createElement('div');
  host.id = 'jobsa-widget-host';
  // Attach to html, not body, so it stays outside the body transform
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Load and listen for theme
  chrome.storage.local.get(['jobsa_theme'], (res) => {
    if (res.jobsa_theme === 'dark') host.classList.add('dark');
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.jobsa_theme) {
      if (changes.jobsa_theme.newValue === 'dark') host.classList.add('dark');
      else host.classList.remove('dark');
    }
  });

  // Listen for theme sync from dashboard
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'JOBSA_THEME_SYNC') {
      chrome.storage.local.set({ jobsa_theme: event.data.theme });
    }
  });

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
    document.documentElement.style.setProperty('--jobsa-panel-width', '404px');
    document.documentElement.classList.add('jobsa-squeeze');
  }

  function closePanel() {
    if (!panel) return;
    panel.classList.remove('visible');
    fab.classList.remove('open');
    const p = panel;
    panel = null;
    
    // Restore website layout
    document.documentElement.classList.remove('jobsa-squeeze');
    document.documentElement.style.removeProperty('--jobsa-panel-width');
    setTimeout(() => {
      p.remove();
    }, 300);
  }

  function toggle() {
    if (panel) {
      closePanel();
    } else {
      openPanel();
    }
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
  checkAuth();

  // React live to sign-in/sign-out — no reopen needed
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.sb_auth_token || changes.sb_refresh_token)) {
      checkAuth();
    }
  });

  /* ── Helpers ── */

  function checkAuth() {
    chrome.runtime.sendMessage({ action: 'get_auth_status' }, (res) => {
      const wasAuthenticated = S.authenticated;
      S.authenticated = !!res?.authenticated;

      if (S.authenticated && !wasAuthenticated) {
        // Just signed in — pull resumes now
        fetchResumes(shadow.querySelector('.dot') as HTMLElement, renderPanel);
      }
      updateFabDot();
      renderPanel();
    });
  }

  function updateFabDot() {
    const dotEl = shadow.querySelector('.dot') as HTMLElement | null;
    if (!dotEl) return;
    if (S.authenticated === null) dotEl.style.background = '#f59e0b';      // checking
    else if (S.authenticated === false) dotEl.style.background = '#9ca3af'; // signed out (neutral, not an error)
    else dotEl.style.background = S.status === 'connected' ? '#10b981' : S.status === 'disconnected' ? '#ef4444' : '#f59e0b';
  }

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
        updateFabDot();
      } else {
        S.status = 'connected';
        updateFabDot();
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
        S.matchScore = r as JobMatchResponse;
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

    root.querySelector('#theme-btn')?.addEventListener('click', () => {
      chrome.storage.local.get(['jobsa_theme'], (res) => {
        const newTheme = res.jobsa_theme === 'dark' ? 'light' : 'dark';
        chrome.storage.local.set({ jobsa_theme: newTheme });
      });
    });

    root.querySelector('#signin-btn')?.addEventListener('click', () => {
      window.open('https://jobsa-web-dashboard.vercel.app', '_blank');
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

function buildMatchHTML(sc: JobMatchResponse): string {
  const scColor = sc.overall_score >= 75 ? 'var(--w-green)' : sc.overall_score >= 50 ? 'var(--w-yellow)' : 'var(--w-red)';
  const confColor = sc.confidence === 'High' ? 'var(--w-green)' : sc.confidence === 'Medium' ? 'var(--w-yellow)' : 'var(--w-red)';
  
  const offset = 339.292 - (339.292 * sc.overall_score) / 100;

  const cats = sc.category_scores;
  const gridHTML = `
    <div class="cat-grid">
      ${[
        { l: 'Required Skills', s: cats.required_skills },
        { l: 'Experience', s: cats.experience_seniority },
        { l: 'Domain Relevance', s: cats.domain_relevance },
        { l: 'Nice-to-Have', s: cats.nice_to_have_skills },
        { l: 'Education', s: cats.education_certifications },
        { l: 'Career Trajectory', s: cats.career_trajectory },
      ].map(c => `
        <div style="background:var(--w-card-bg);border:1px solid var(--w-card-border);border-radius:12px;padding:10px">
          <div style="font-size:11px;color:var(--w-muted);font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.l}</div>
          <div style="font-size:16px;font-weight:800;margin-bottom:6px">${c.s}</div>
          <div style="height:4px;background:var(--w-card-border);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${c.s}%;background:${c.s >= 75 ? 'var(--w-green)' : c.s >= 50 ? 'var(--w-yellow)' : 'var(--w-red)'};border-radius:2px"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const reqPills = (list: string[], type: 'match' | 'miss' | 'trans') => list.map(item => {
    let bg, fg, border;
    if (type === 'match') { bg = '#ecfdf5'; fg = '#059669'; border = '#a7f3d0'; }
    else if (type === 'miss') { bg = '#fff7ed'; fg = '#c2410c'; border = '#fed7aa'; }
    else { bg = '#eff6ff'; fg = '#2563eb'; border = '#bfdbfe'; }
    return `<span class="pill" style="background:${bg};color:${fg};border:1px solid ${border}">${item}</span>`;
  }).join('');

  return `
    <div class="match-results fade-up" style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;flex-direction:column;align-items:center;padding:24px 0;border:1px solid var(--w-card-border);border-radius:14px;background:var(--w-card-bg);box-shadow:0 4px 12px var(--w-shadow)">
        <div style="position:relative;width:120px;height:120px;margin-bottom:16px">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--w-card-border)" stroke-width="8" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="${scColor}" stroke-width="8" stroke-linecap="round" stroke-dasharray="339.292" stroke-dashoffset="${offset}" style="transform:rotate(-90deg);transform-origin:50% 50%;animation:score-fill 1s cubic-bezier(0.16,1,0.3,1) forwards" />
          </svg>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;letter-spacing:-1px">${sc.overall_score}<span style="font-size:16px;color:var(--w-muted);margin-left:2px">%</span></div>
        </div>
        <div style="display:flex;gap:8px">
          <span style="background:${scColor}15;color:${scColor};padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700">${sc.verdict}</span>
          <span style="background:${confColor}15;color:${confColor};padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600">${sc.confidence} Confidence</span>
        </div>
      </div>

      ${gridHTML}

      <div style="display:flex;flex-direction:column;gap:8px;background:var(--w-card-bg);border:1px solid var(--w-card-border);border-radius:14px;padding:12px">
        <details open>
          <summary style="font-size:13px;font-weight:700;cursor:pointer;list-style:none;user-select:none;display:flex;align-items:center">✅ Matched Requirements (${sc.matched_requirements.length})</summary>
          <div style="padding-top:8px">${reqPills(sc.matched_requirements, 'match')}</div>
        </details>
        ${sc.missing_requirements.length > 0 ? `
        <div style="height:1px;background:var(--w-card-border);margin:4px 0"></div>
        <details open>
          <summary style="font-size:13px;font-weight:700;cursor:pointer;list-style:none;user-select:none;display:flex;align-items:center">⚠️ Missing Requirements (${sc.missing_requirements.length})</summary>
          <div style="padding-top:8px">${reqPills(sc.missing_requirements, 'miss')}</div>
        </details>` : ''}
        ${sc.inferred_transferable_skills.length > 0 ? `
        <div style="height:1px;background:var(--w-card-border);margin:4px 0"></div>
        <details>
          <summary style="font-size:13px;font-weight:700;cursor:pointer;list-style:none;user-select:none;display:flex;align-items:center;color:var(--w-muted)">💡 Transferable Skills (${sc.inferred_transferable_skills.length})</summary>
          <div style="padding-top:8px">${reqPills(sc.inferred_transferable_skills, 'trans')}</div>
        </details>` : ''}
      </div>

      ${sc.red_flags.length > 0 ? `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:14px;color:#991b1b">
        <div style="font-size:13px;font-weight:800;margin-bottom:6px;display:flex;align-items:center;gap:6px">🚩 Red Flags</div>
        <ul style="font-size:13px;margin:0;padding-left:18px;line-height:1.5">
          ${sc.red_flags.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>` : ''}

      <details style="background:var(--w-card-bg);border:1px solid var(--w-card-border);border-radius:14px;padding:12px">
        <summary style="font-size:13px;font-weight:700;cursor:pointer;list-style:none;user-select:none;display:flex;align-items:center">📝 AI Analysis Rationale</summary>
        <div style="padding-top:8px;font-size:13px;line-height:1.6;color:var(--w-muted)">${sc.rationale}</div>
      </details>
    </div>
  `;
}

function buildSignedOutHTML(): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px;padding:48px 24px;flex:1">
      <img src="${chrome.runtime.getURL('logo.png')}" style="width:48px;height:48px;object-fit:contain;opacity:.85" />
      <div>
        <div style="font-size:16px;font-weight:800;margin-bottom:6px">You're signed out</div>
        <div style="font-size:13px;color:var(--w-muted);line-height:1.5">Sign in to autofill applications and check your match score.</div>
      </div>
      <button id="signin-btn" style="width:100%;padding:14px;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;background:#00e599;color:#000;box-shadow:0 6px 20px rgba(0,229,153,.3)">
        Sign in to JobSA
      </button>
    </div>`;
}

function buildHTML(): string {
  const opts = S.resumes.map(r => `<option value="${r.id}" ${r.id === S.selectedResumeId ? 'selected' : ''}>${r.name}</option>`).join('');

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
      return `<div data-fid="${r.fieldId}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;opacity:${opac}" onmouseover="this.style.background='var(--w-card-border)'" onmouseout="this.style.background='transparent'"><span style="color:${color};display:flex;align-items:center;justify-content:center;width:16px;font-weight:bold">${icon}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${r.status==='loading'?'var(--w-muted)':'inherit'}">${r.label}</span></div>`;
    }).join('');
    resHTML = `
      <details open style="margin-top:16px;border-top:1px solid var(--w-card-border);padding-top:16px;">
        <summary style="display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;cursor:pointer;list-style:none;user-select:none;margin-bottom:12px">
          <span style="display:flex;align-items:center;gap:8px">📋 Your Autofill Information <span style="font-size:10px;font-weight:600;background:var(--w-card-border);padding:2px 6px;border-radius:10px;color:var(--w-muted)">${ok}/${S.results.length}</span></span>
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
    <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--w-card-border)">
      <img src="${chrome.runtime.getURL('logo.png')}" style="width:28px;height:28px;object-fit:contain" />
      <span style="font-weight:800;font-size:16px;flex:1;letter-spacing:-0.3px">JobSA</span>
      <button id="theme-btn" style="background:none;border:none;cursor:pointer;font-size:18px;line-height:1;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%" onmouseover="this.style.background='var(--w-card-border)'" onmouseout="this.style.background='none'" title="Toggle Theme">🌓</button>
      <button id="close-btn" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--w-muted);line-height:1;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%" onmouseover="this.style.background='var(--w-card-border)';this.style.color='var(--w-text)'" onmouseout="this.style.background='none';this.style.color='var(--w-muted)'">✕</button>
    </div>
    
    ${S.authenticated === false
      ? buildSignedOutHTML()
      : `<div style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px;min-height:0">
          
          <div style="background:var(--w-card-bg);border:1px solid var(--w-card-border);border-radius:14px;padding:16px;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.02)">
            <div style="font-size:12px;color:var(--w-muted);font-weight:500;margin-bottom:4px;display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:${S.status === 'connected' ? '#10b981' : S.status === 'disconnected' ? '#ef4444' : '#f59e0b'}"></span> ${S.company}
            </div>
            <div style="font-size:18px;font-weight:800;line-height:1.2;padding-right:50px;letter-spacing:-0.4px">${S.jobTitle}</div>
          </div>

          <div style="border:1px solid var(--w-card-border);border-radius:14px;overflow:hidden;background:var(--w-card-bg)">
            <div style="padding:14px 16px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--w-card-border)">
              📄 Target Resume
            </div>
            <div style="padding:12px 16px;display:flex;flex-direction:column;gap:12px">
              <select id="rs" style="width:100%;padding:10px 12px;border:1px solid var(--w-card-border);border-radius:10px;font-size:13px;font-weight:500;font-family:inherit;background:var(--w-bg);color:var(--w-text);cursor:pointer" ${S.resumes.length === 0 ? 'disabled' : ''}>
                ${S.resumes.length === 0 ? '<option>No resumes</option>' : opts}
              </select>
              <button id="match-btn" style="width:100%;padding:10px;border:none;background:var(--w-green-light);color:var(--w-green-dark);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px" ${S.isMatching || !S.selectedResumeId ? 'disabled' : ''}>
                ${S.isMatching ? '<span style="display:inline-block;width:12px;height:12px;border:2px solid var(--w-green-dark);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite"></span> Analyzing Match...' : '✨ Check Match Score'}
              </button>
            </div>
          </div>
          
          ${S.matchScore ? buildMatchHTML(S.matchScore) : ''}

          <button id="fill-btn" style="width:100%;padding:18px;border:none;border-radius:14px;font-size:18px;font-weight:800;cursor:pointer;font-family:inherit;background:#00e599;color:#000;box-shadow:0 6px 20px rgba(0,229,153,.3);transition:all .2s;letter-spacing:-0.2px" ${S.isAutofilling || !S.selectedResumeId || !S.hasForm ? 'disabled' : ''}>
            ${S.isAutofilling ? 'Autofilling...' : S.hasForm ? 'Autofill Application' : 'No Form Detected'}
          </button>
          ${S.autofillProgress ? `<div style="text-align:center;font-size:13px;color:var(--w-muted);font-weight:500">${S.autofillProgress}</div>` : ''}
          ${S.error ? `<div style="padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;font-size:13px;color:#dc2626;font-weight:500">${S.error}</div>` : ''}
          
          ${resHTML}
        </div>`
    }
  `;
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
    if (id) { try { const l = document.querySelector(`label[for="${CSS.escape(id)}"]`) as HTMLLabelElement; if (l) lbl = l.innerText.trim(); } catch { /* ignore */ } }
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
  @keyframes score-fill { from { stroke-dashoffset: 339.292; } }
  @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  :host { 
    all: initial; position: fixed; z-index: 2147483647; bottom: 0; right: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
    --w-bg: #f9fafb; --w-text: #111827; --w-border: rgba(0,0,0,.06); --w-shadow: rgba(0,0,0,.1);
    --w-green: #10b981; --w-green-light: #ecfdf5; --w-green-dark: #059669;
    --w-yellow: #f59e0b; --w-red: #ef4444; 
    --w-card-bg: #fff; --w-card-border: #eaeaea; --w-muted: #6b7280;
  }
  :host(.dark) {
    --w-bg: #0f1117; --w-text: #f3f4f6; --w-border: #27272a; --w-shadow: rgba(0,0,0,.5);
    --w-card-bg: #1f2937; --w-card-border: #374151; --w-muted: #9ca3af;
    --w-green-light: #064e3b; --w-green-dark: #34d399;
  }

  .cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pill { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 3px; }
  .fade-up { animation: fade-up 0.4s cubic-bezier(0.16,1,0.3,1); }

  .fab {
    position: fixed; bottom: 24px; right: 24px;
    width: 54px; height: 54px; border-radius: 50%;
    background: var(--w-bg); border: 1px solid var(--w-border);
    box-shadow: 0 4px 16px var(--w-shadow);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
    z-index: 2;
  }
  .fab:hover { transform: scale(1.08); box-shadow: 0 6px 24px var(--w-shadow); }
  .fab:active { transform: scale(.95); }
  .fab img { width: 34px; height: 34px; object-fit: contain; pointer-events: none; }
  .fab.open { display: none; }
  .dot { position: absolute; top: -1px; right: -1px; width: 12px; height: 12px; border-radius: 50%; background: #f59e0b; border: 2px solid var(--w-bg); }

  .panel {
    position: fixed; top: 12px; right: 12px;
    width: 380px; height: calc(100vh - 24px); max-height: calc(100vh - 24px);
    border-radius: 16px; background: var(--w-bg);
    border: 1px solid var(--w-border);
    box-shadow: -10px 0 40px var(--w-shadow);
    display: flex; flex-direction: column;
    font-size: 14px; color: var(--w-text); line-height: 1.5;
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
