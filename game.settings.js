/* VIRELIA - SETTINGS & THEME SYSTEM
   Dual theme: text (bland mono) vs colorful (vibrant RPG)
   Fixes Design button (now Settings) and Sanity Check (now Diagnostics)
*/

console.log('[VIRELIA SETTINGS] Loading...');

const THEMES = {
  text: { label: 'Text Mode (Mono)', desc: 'Original bland terminal, pure words, no colors. For purists.' },
  colorful: { label: 'Colorful RPG (Vibrant)', desc: 'New design: gradients, glows, colorful badges, RPG feel.' },
  parchment: { label: 'Parchment (Light)', desc: 'Old map scroll: sepia light, ink brown, readable day mode with paper texture.' }
};

function getSavedTheme() {
  try {
    const fromStorage = localStorage.getItem('virelia_theme');
    if (fromStorage && THEMES[fromStorage]) return fromStorage;
  } catch {}
  if (state && state.flags && state.flags.theme && THEMES[state.flags.theme]) return state.flags.theme;
  // Default to colorful for new players (user requested colorful, not bland)
  return 'colorful';
}

function setTheme(theme, persist) {
  theme = theme || 'colorful';
  if (!THEMES[theme]) theme = 'colorful';
  // Apply to body - support 3 themes
  document.body.classList.remove('theme-text', 'theme-colorful', 'theme-parchment');
  document.body.classList.add('theme-' + theme);
  // Save
  if (persist !== false) {
    try { localStorage.setItem('virelia_theme', theme); } catch {}
    if (state) {
      state.flags = state.flags || {};
      state.flags.theme = theme;
      if (typeof autoSave === 'function') autoSave();
    }
  }
  // Update any theme previews if settings modal open
  const previews = document.querySelectorAll('[data-theme-preview]');
  previews.forEach(el => {
    el.style.borderColor = (el.dataset.themePreview === theme) ? '#7c5cff' : '';
    el.style.boxShadow = (el.dataset.themePreview === theme) ? '0 0 0 2px rgba(124,92,255,0.35)' : '';
  });
  console.log('[THEME] Set to', theme);
  // Log for lore
  if (typeof appendLog === 'function' && state && state.log) {
    // Don't spam log, only if called from settings
  }
}

function initTheme() {
  const theme = getSavedTheme();
  setTheme(theme, false);
}
initTheme();

// Settings Modal
let settingsModalEl = null;
let settingsModalBodyEl = null;

function ensureSettingsModal() {
  if (settingsModalEl) return;
  settingsModalEl = document.createElement('div');
  settingsModalEl.className = 'modalOverlay';
  settingsModalEl.id = 'settingsModal';
  settingsModalEl.style.display = 'none';

  const card = document.createElement('div');
  card.className = 'modalCard';
  card.style.maxWidth = '720px';

  const header = document.createElement('div');
  header.className = 'modalHeader';
  const title = document.createElement('div');
  title.textContent = 'SETTINGS // THEME // DIAGNOSTICS';
  title.style.fontWeight = '800';
  const btnClose = document.createElement('button');
  btnClose.textContent = '[ CLOSE ]';
  btnClose.className = 'secondary';
  btnClose.onclick = () => closeSettingsModal();
  header.appendChild(title);
  header.appendChild(btnClose);

  const body = document.createElement('div');
  body.className = 'modalBody';
  body.id = 'settingsModalBody';

  card.appendChild(header);
  card.appendChild(body);
  settingsModalEl.appendChild(card);
  settingsModalEl.addEventListener('click', (e) => {
    if (e.target === settingsModalEl) closeSettingsModal();
  });
  document.body.appendChild(settingsModalEl);
  settingsModalBodyEl = body;
}

function openSettingsModal() {
  ensureSettingsModal();
  renderSettingsModal();
  settingsModalEl.classList.add('open');
  settingsModalEl.style.display = 'flex';
}

function closeSettingsModal() {
  if (!settingsModalEl) return;
  settingsModalEl.classList.remove('open');
  settingsModalEl.style.display = 'none';
}

function renderSettingsModal() {
  if (!settingsModalBodyEl) return;
  settingsModalBodyEl.innerHTML = '';

  const currentTheme = getSavedTheme();

  // Intro
  const intro = document.createElement('div');
  intro.className = 'hint';
  intro.style.whiteSpace = 'pre-wrap';
  intro.textContent = 'Switch between 3 themes: Text Mode (bland mono), Colorful RPG (vibrant gradients), and Parchment (light old map). Your choice is saved.\n\nCurrent: ' + THEMES[currentTheme].label + ' — ' + THEMES[currentTheme].desc;
  settingsModalBodyEl.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'settingsGrid';

  // Theme Card
  const themeCard = document.createElement('div');
  themeCard.className = 'settingsCard';
  const themeTitle = document.createElement('div');
  themeTitle.className = 'settingsCardTitle';
  themeTitle.textContent = 'THEME';
  themeCard.appendChild(themeTitle);

  for (const key in THEMES) {
    const def = THEMES[key];
    const row = document.createElement('div');
    row.className = 'settingsOption';
    const left = document.createElement('div');
    left.innerHTML = '<strong>' + def.label + '</strong><br><span class="hint" style="margin:0">' + def.desc + '</span>';
    const right = document.createElement('button');
    right.textContent = (currentTheme === key) ? '[ ACTIVE ]' : '[ USE ]';
    right.className = (currentTheme === key) ? '' : 'secondary';
    right.disabled = (currentTheme === key);
    right.onclick = () => {
      setTheme(key, true);
      renderSettingsModal();
      if (typeof render === 'function') render();
    };
    row.appendChild(left);
    row.appendChild(right);
    themeCard.appendChild(row);

    const preview = document.createElement('div');
    preview.className = 'themePreview ' + key;
    preview.dataset.themePreview = key;
    preview.textContent = def.label + ' preview';
    if (currentTheme === key) {
      preview.style.borderColor = '#7c5cff';
      preview.style.boxShadow = '0 0 0 2px rgba(124,92,255,0.35)';
    }
    themeCard.appendChild(preview);
  }
  grid.appendChild(themeCard);

  // Effects Card
  const fxCard = document.createElement('div');
  fxCard.className = 'settingsCard';
  const fxTitle = document.createElement('div');
  fxTitle.className = 'settingsCardTitle';
  fxTitle.textContent = 'VISUAL EFFECTS';
  fxCard.appendChild(fxTitle);

  const fxList = [
    { id: 'fx_hit', label: 'Hit Flash + Shake', key: 'fx-hit' },
    { id: 'fx_status', label: 'Status Glows (Bleed/Rested/Cursed/Poison/Shield)', key: 'fx-status' }
  ];
  // Simplified toggle: we just show info, actual FX controlled via body classes - always on
  const fxRow = document.createElement('div');
  fxRow.className = 'settingsOption';
  fxRow.innerHTML = '<div><strong>FX System</strong><br><span class="hint">Text-mode enhanced FX: red flash, shake, pulses, badges</span></div><div><span class="badge easy">ON</span></div>';
  fxCard.appendChild(fxRow);

  const fxRow2 = document.createElement('div');
  fxRow2.className = 'settingsOption';
  fxRow2.innerHTML = '<div><strong>Build Badge</strong><br><span class="hint">Bottom-left build version</span></div><div><span class="badge normal">VISIBLE</span></div>';
  fxCard.appendChild(fxRow2);

  grid.appendChild(fxCard);

  // Gameplay Card
  const gameCard = document.createElement('div');
  gameCard.className = 'settingsCard';
  gameCard.innerHTML = '<div class="settingsCardTitle">GAMEPLAY</div>';
  const rows = [
    { label: 'World State Decay', desc: 'Vault -1/day if <80, plague spread', value: 'ON' },
    { label: 'Consequence Board', desc: 'City remembers actions', value: 'ON' },
    { label: 'Free Roam Costs', desc: 'Rations/water/torch costs', value: 'ON' },
    { label: 'Combat Twists', desc: 'Surrender, reinforcements, darkness', value: '18% per round' }
  ];
  rows.forEach(r => {
    const row = document.createElement('div');
    row.className = 'settingsOption';
    row.innerHTML = '<div><strong>' + r.label + '</strong><br><span class="hint">' + r.desc + '</span></div><div><span class="badge">' + r.value + '</span></div>';
    gameCard.appendChild(row);
  });
  grid.appendChild(gameCard);

  // Diagnostics Card
  const diagCard = document.createElement('div');
  diagCard.className = 'settingsCard';
  diagCard.innerHTML = '<div class="settingsCardTitle">DIAGNOSTICS</div><div class="hint" style="margin-bottom:8px">Formerly Sanity Check button. Now shows full diagnostics.</div>';
  const diagBtn = document.createElement('button');
  diagBtn.textContent = '[ RUN DIAGNOSTICS ]';
  diagBtn.onclick = () => runFullDiagnostics();
  diagCard.appendChild(diagBtn);
  const diagResult = document.createElement('div');
  diagResult.id = 'settingsDiagnosticsResult';
  diagResult.className = 'hint';
  diagResult.style.whiteSpace = 'pre-wrap';
  diagResult.style.marginTop = '10px';
  diagResult.textContent = 'Click to run...';
  diagCard.appendChild(diagResult);
  grid.appendChild(diagCard);

  settingsModalBodyEl.appendChild(grid);

  // Footer with reset
  const footer = document.createElement('div');
  footer.className = 'row';
  footer.style.marginTop = '14px';
  footer.style.justifyContent = 'space-between';
  const btnReset = document.createElement('button');
  btnReset.textContent = '[ RESET SETTINGS ]';
  btnReset.className = 'danger';
  btnReset.onclick = () => {
    try { localStorage.removeItem('virelia_theme'); } catch {}
    if (state) {
      state.flags = state.flags || {};
      delete state.flags.theme;
    }
    setTheme('colorful', true);
    renderSettingsModal();
  };
  const btnClose = document.createElement('button');
  btnClose.textContent = '[ CLOSE ]';
  btnClose.className = 'secondary';
  btnClose.onclick = () => closeSettingsModal();
  footer.appendChild(btnReset);
  footer.appendChild(btnClose);
  settingsModalBodyEl.appendChild(footer);
}

function runFullDiagnostics() {
  const resultEl = document.getElementById('settingsDiagnosticsResult');
  if (!resultEl) return;
  let out = '';
  try {
    if (typeof window.vireliaSanityCheck === 'function') {
      const r = window.vireliaSanityCheck();
      out += '--- vireliaSanityCheck ---\n' + JSON.stringify(r, null, 2) + '\n\n';
    } else {
      out += 'vireliaSanityCheck: NOT FOUND\n\n';
    }
  } catch(e) { out += 'vireliaSanityCheck ERROR: ' + e + '\n\n'; }
  try {
    if (typeof window.v2Sanity === 'function') {
      const r = window.v2Sanity();
      out += '--- v2Sanity (consequence, mix, free roam) ---\n' + JSON.stringify(r, null, 2) + '\n\n';
    }
  } catch(e) { out += 'v2Sanity ERROR: ' + e + '\n\n'; }
  try {
    if (typeof window.loreSanity === 'function') {
      const r = window.loreSanity();
      out += '--- loreSanity (codex) ---\n' + JSON.stringify(r, null, 2) + '\n\n';
    }
  } catch(e) { out += 'loreSanity ERROR: ' + e + '\n\n'; }
  try {
    if (typeof window.storySanity === 'function') {
      const r = window.storySanity();
      out += '--- storySanity (acts) ---\n' + JSON.stringify(r, null, 2) + '\n\n';
    }
  } catch(e) { out += 'storySanity ERROR: ' + e + '\n\n'; }

  out += '--- Theme ---\nCurrent: ' + getSavedTheme() + '\n';
  out += 'Body classes: ' + document.body.className + '\n';
  out += 'State flags theme: ' + (state && state.flags && state.flags.theme || 'none') + '\n';
  out += 'LocalStorage theme: ';
  try { out += localStorage.getItem('virelia_theme') || 'none'; } catch { out += 'blocked'; }
  out += '\n\n--- Game State ---\n';
  if (state) {
    out += 'Profile: ' + state.profile + '\nLevel: ' + state.level + ' Node: ' + state.nodeId + '\nHP: ' + state.hp + '/' + (typeof playerMaxHp === 'function' ? playerMaxHp() : state.maxHp) + '\nEffects: ' + (state.effects ? Object.keys(state.effects).join(',') : 'none') + '\n';
  } else {
    out += 'No active state (home screen)\n';
  }

  resultEl.textContent = out;
  // Also set home msg if exists
  if (typeof setHomeMsg === 'function') {
    setHomeMsg('Diagnostics ran. See Settings modal for details. Check console for full object.');
  }
  console.log('[DIAGNOSTICS]\n' + out);
}

// Fix btnDesign (now Settings) and ensure it opens settings
function fixDesignButton() {
  const btn = document.getElementById('btnDesign');
  if (!btn) return;
  // Rename
  btn.textContent = '[ SETTINGS ]';
  btn.title = 'Open settings: switch Text vs Colorful vs Parchment themes, diagnostics';
  // Remove old listeners by cloning
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    if (typeof worldTick === 'function') worldTick('Settings');
    openSettingsModal();
  });
  // Ensure enabled even in drafts? Keep disabled logic from syncSidebarButtons? We'll keep but always allow settings
  // Override sync to not disable settings
  const origSync = typeof syncSidebarButtons === 'function' ? syncSidebarButtons : null;
  if (origSync) {
    const original = syncSidebarButtons;
    // Monkey patch to keep settings enabled
    window.syncSidebarButtons = function() {
      original();
      const b = document.getElementById('btnDesign');
      if (b) b.disabled = false;
      const lb = document.getElementById('btnLogout');
      if (lb) lb.disabled = false;
    };
    try { syncSidebarButtons = window.syncSidebarButtons; } catch {}
  }
}

function logoutNormalUser() {
  // Similar to admin logout but for normal users
  try {
    if (typeof worldTick === 'function') worldTick('Logout');
  } catch {}
  // Save current if exists?
  if (state && typeof autoSave === 'function') {
    try { autoSave(); } catch {}
  }
  // Clear state
  state = null;
  // Clear UI panels
  try {
    if (typeof outputEl !== 'undefined' && outputEl) outputEl.innerHTML = '';
    if (typeof choicesEl !== 'undefined' && choicesEl) choicesEl.innerHTML = '';
    if (typeof statsEl !== 'undefined' && statsEl) statsEl.innerHTML = '';
    if (typeof questListEl !== 'undefined' && questListEl) questListEl.innerHTML = '';
    if (typeof renderEffectsUi === 'function') renderEffectsUi();
  } catch {}
  // Reset admin flags
  if (typeof adminMode !== 'undefined') adminMode = false;
  if (typeof adminEditingProfile !== 'undefined') adminEditingProfile = null;
  if (typeof adminShowGame !== 'undefined') adminShowGame = true;
  const adminPassEl = document.getElementById('adminPass');
  if (adminPassEl) adminPassEl.value = '';
  if (typeof setAdminDashboardUi === 'function') setAdminDashboardUi();
  if (typeof renderHomeSaves === 'function') renderHomeSaves();
  if (typeof setHomeMsg === 'function') setHomeMsg('Logged out. Enter profile name to Continue or Start New.');
  // Scroll to top/home
  const homeEl = document.getElementById('home');
  if (homeEl) homeEl.scrollIntoView({ behavior: 'smooth' });
  const profileNameEl = document.getElementById('profileName');
  if (profileNameEl) profileNameEl.focus();
}

function fixLogoutButton() {
  const btn = document.getElementById('btnLogout');
  if (!btn) return;
  btn.textContent = '[ LOGOUT ]';
  btn.title = 'Logout current profile, save, return to home screen';
  btn.style.display = 'inline-block';
  btn.disabled = false;
  // Remove old and add new with fresh listener, also keep backup via onclick
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  const finalBtn = document.getElementById('btnLogout');
  if (finalBtn) {
    finalBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[LOGOUT] Button clicked');
      logoutNormalUser();
    };
    finalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      logoutNormalUser();
    });
  }
}

// Global delegated handler for logout (backup)
document.addEventListener('click', function(e){
  const target = e.target;
  if (!target) return;
  if (target.id === 'btnLogout' || (target.closest && target.closest('#btnLogout'))) {
    console.log('[LOGOUT] Delegated click');
    e.preventDefault();
    e.stopPropagation();
    if (typeof logoutNormalUser === 'function') logoutNormalUser();
  }
});

// Also fix admin sanity button - enhance its behavior
function fixSanityButton() {
  // The sanity button is created dynamically in renderAdminTools, so we patch renderAdminTools
  const origRenderAdminTools = typeof renderAdminTools === 'function' ? renderAdminTools : null;
  if (!origRenderAdminTools) return;

  window.renderAdminTools = function() {
    origRenderAdminTools();
    // Find the sanity button by text
    const adminToolsEl = document.getElementById('adminTools');
    if (!adminToolsEl) return;
    const buttons = adminToolsEl.querySelectorAll('button');
    for (let i=0; i<buttons.length; i++) {
      const b = buttons[i];
      if (b.textContent && b.textContent.toLowerCase().indexOf('sanity check') >=0) {
        b.textContent = '[ RUN DIAGNOSTICS ]';
        b.title = 'Shows full diagnostics: sanity + v2 + lore + story + theme';
        // Replace click handler
        const newB = b.cloneNode(true);
        b.parentNode.replaceChild(newB, b);
        newB.addEventListener('click', () => {
          runFullDiagnostics();
          openSettingsModal();
          // Also scroll diagnostics card into view
          setTimeout(() => {
            const resultEl = document.getElementById('settingsDiagnosticsResult');
            if (resultEl) resultEl.scrollIntoView({ behavior: 'smooth' });
          }, 200);
        });
        break;
      }
    }
  };
  try { renderAdminTools = window.renderAdminTools; } catch {}
}

// Initialize on load
function initSettings() {
  // Apply theme ASAP
  initTheme();
  // Fix buttons after DOM ready
  setTimeout(() => {
    fixDesignButton();
    fixSanityButton();
    fixLogoutButton();
  }, 500);
  // Also re-fix after home saves render (which recreates admin tools)
  const origRenderHomeSaves = typeof renderHomeSaves === 'function' ? renderHomeSaves : null;
  if (origRenderHomeSaves) {
    window.renderHomeSaves = function() {
      origRenderHomeSaves();
      fixDesignButton();
      fixSanityButton();
      fixLogoutButton();
    };
    try { renderHomeSaves = window.renderHomeSaves; } catch {}
  }
}

// Run
initSettings();

// Expose
if (typeof window !== 'undefined') {
  window.setTheme = setTheme;
  window.getSavedTheme = getSavedTheme;
  window.openSettingsModal = openSettingsModal;
  window.closeSettingsModal = closeSettingsModal;
  window.runFullDiagnostics = runFullDiagnostics;
}

console.log('[VIRELIA SETTINGS] Ready. Themes: text, colorful. Design button now Settings.');
