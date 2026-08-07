let hitFxTimer = null;
let shakeFxTimer = null;

let audioCtx = null;
let audioUnlockHooked = false;

function ensureAudioCtx() {
  if (audioCtx) return audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

function unlockAudio() {
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}

function hookAudioUnlock() {
  if (audioUnlockHooked) return;
  audioUnlockHooked = true;
  document.addEventListener("pointerdown", unlockAudio, { passive: true });
  document.addEventListener("keydown", unlockAudio);
}

hookAudioUnlock();

function hashString(s) {
  const str = String(s || "");
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function playChirp(freqs, totalMs, type, gainValue, delayMs) {
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  unlockAudio();
  const f = Array.isArray(freqs) && freqs.length ? freqs : [440];
  const ms = Math.max(40, Math.floor(totalMs || 140));
  const kind = type || "sine";
  const g = Math.max(0, Math.min(1, typeof gainValue === "number" ? gainValue : 0.06));
  const delay = Math.max(0, Math.floor(delayMs || 0));

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = kind;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const t0 = ctx.currentTime + delay / 1000;
  const dur = ms / 1000;

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(g, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.frequency.setValueAtTime(f[0], t0);
  if (f.length > 1) {
    for (let i = 1; i < f.length; i++) {
      const at = t0 + (dur * i) / (f.length - 1);
      osc.frequency.linearRampToValueAtTime(f[i], at);
    }
  }

  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playEffectSfx(effectKey, kind, delayMs) {
  const k = String(effectKey || "").trim().toLowerCase();
  const h = hashString(k);
  const base = 170 + (h % 420);
  const delay = typeof delayMs === "number" ? delayMs : 0;

  if (k === "bleeding") {
    if (kind === "apply") return playChirp([170, 120, 170], 240, "triangle", 0.07, delay);
    if (kind === "expire") return playChirp([150, 110, 90], 280, "sine", 0.06, delay);
    if (kind === "clear") return playChirp([140, 200], 130, "square", 0.05, delay);
    if (kind === "tick") return playChirp([110, 90], 90, "sine", 0.05, delay);
  }
  if (k === "rested") {
    if (kind === "apply") return playChirp([base * 1.1, base * 1.35, base * 1.6], 240, "sine", 0.06, delay);
    if (kind === "expire") return playChirp([base * 1.6, base * 1.35, base * 1.1], 260, "triangle", 0.05, delay);
    if (kind === "clear") return playChirp([base * 1.2, base * 1.5], 130, "sine", 0.05, delay);
  }
  if (k === "cursed") {
    if (kind === "apply") return playChirp([base * 0.9, base * 0.72, base * 0.9], 260, "square", 0.055, delay);
    if (kind === "expire") return playChirp([base * 0.8, base * 1.1], 220, "triangle", 0.05, delay);
    if (kind === "clear") return playChirp([base * 0.9, base * 1.3], 140, "sine", 0.05, delay);
  }
  if (k === "poisoned") {
    if (kind === "apply") return playChirp([base * 1.05, base * 0.82, base * 1.05], 240, "square", 0.055, delay);
    if (kind === "expire") return playChirp([base * 0.92, base * 1.15], 240, "triangle", 0.05, delay);
    if (kind === "clear") return playChirp([base * 1.0, base * 1.25], 140, "sine", 0.05, delay);
    if (kind === "tick") return playChirp([base * 0.78, base * 0.72], 95, "sine", 0.045, delay);
  }
  if (k === "shielded") {
    if (kind === "apply") return playChirp([base * 1.2, base * 1.5, base * 1.85], 220, "triangle", 0.055, delay);
    if (kind === "expire") return playChirp([base * 1.85, base * 1.5, base * 1.2], 240, "sine", 0.05, delay);
    if (kind === "clear") return playChirp([base * 1.3, base * 1.7], 120, "triangle", 0.05, delay);
  }

  if (kind === "apply") return playChirp([base, base * 1.25, base * 1.5], 220, "triangle", 0.055, delay);
  if (kind === "expire") return playChirp([base * 1.5, base * 1.25, base], 260, "sine", 0.05, delay);
  if (kind === "clear") return playChirp([base * 0.95, base * 1.1], 120, "square", 0.045, delay);
  if (kind === "tick") return playChirp([base * 0.9, base * 0.8], 90, "sine", 0.04, delay);
}

function playHitFx() {
  document.body.classList.add("fx-hit");
  if (hitFxTimer) clearTimeout(hitFxTimer);
  hitFxTimer = setTimeout(() => document.body.classList.remove("fx-hit"), 480);

  if (appEl) {
    appEl.classList.add("fxShake");
    if (shakeFxTimer) clearTimeout(shakeFxTimer);
    shakeFxTimer = setTimeout(() => appEl.classList.remove("fxShake"), 420);
  }
}

function addEffect(key, durationMs) {
  if (!state) return;
  normalizeState(state);
  const ms = typeof durationMs === "number" ? durationMs : 30000;
  state.effects = state.effects || {};
  const prev = state.effects[key];
  const t = nowMs();
  const wasActive = !!prev && typeof prev.expiresAt === "number" && prev.expiresAt > t;
  const existing = prev || { key };
    state.effects[key] = {
    ...existing,
    key,
    expiresAt: t + ms,
    appliedAt: t,
  };
  if (key === "bleeding" && typeof state.effects[key].nextTickAt !== "number") {
    state.effects[key].nextTickAt = t + 5000;
  }
  if (key === "aether" && typeof state.effects[key].nextTickAt !== "number") {
    state.effects[key].nextTickAt = t + 4000;
  }
  if (key === "poisoned" && typeof state.effects[key].nextTickAt !== "number") {
    state.effects[key].nextTickAt = t + 4000;
  }
  if (!wasActive) playEffectSfx(key, "apply");
  renderEffectsUi();
}

function clearEffect(key) {
  if (!state || !state.effects) return;
  const had = !!state.effects[key];
  delete state.effects[key];
  if (had) playEffectSfx(key, "clear");
  renderEffectsUi();
}

function pauseAllEffects(s) {
  const target = s || state;
  if (!target || !target.effects) return 0;
  const t = nowMs();
  let count = 0;
  for (const [k, e] of Object.entries(target.effects)) {
    if (!e) continue;
    if (typeof e.pausedRemaining === 'number') continue; // already paused
    if (typeof e.expiresAt !== 'number') continue;
    if (e.expiresAt <= t) continue; // already expired
    const remaining = Math.max(0, e.expiresAt - t);
    e.pausedRemaining = remaining;
    e.pausedAt = t;
    if (typeof e.nextTickAt === 'number' && e.nextTickAt > t) {
      e.pausedNextTickRemaining = Math.max(0, e.nextTickAt - t);
    }
    // mark paused, delete expiresAt to avoid prune during offline, but keep flag
    e._paused = true;
    delete e.expiresAt;
    delete e.nextTickAt;
    count++;
  }
  return count;
}

function resumeAllEffects(s) {
  const target = s || state;
  if (!target || !target.effects) return 0;
  // Anti-exploit: clean any disallowed permanent effects before resuming
  try { sanitizePermanentEffects(target); } catch(e) {}
  const t = nowMs();
  let count = 0;
  for (const [k, e] of Object.entries(target.effects)) {
    if (!e) continue;
    if (typeof e.pausedRemaining !== 'number') continue;
    const remaining = Math.max(0, Math.floor(e.pausedRemaining));
    e.expiresAt = t + remaining;
    if (typeof e.pausedNextTickRemaining === 'number') {
      e.nextTickAt = t + Math.max(0, Math.floor(e.pausedNextTickRemaining));
      delete e.pausedNextTickRemaining;
    } else {
      // reset tick timers for relevant effects
      if (k === 'bleeding') e.nextTickAt = t + 5000;
      else if (k === 'aether') e.nextTickAt = t + 4000;
      else if (k === 'poisoned') e.nextTickAt = t + 4000;
    }
    delete e.pausedRemaining;
    delete e.pausedAt;
    delete e._paused;
    count++;
  }
  return count;
}

function sanitizePermanentEffects(s) {
  const allowedPerm = ['bleeding', 'poisoned', 'cursed', 'weak', 'dazed', 'drained', 'brittle', 'frostbitten', 'scorched', 'entangled', 'fear', 'withered', 'hollowed', 'branded', 'shadowbound', 'soulfractured', 'rusted'];
  const target = s || state;
  if (!target || !target.effects) return 0;
  let fixed = 0;
  for (const [k, e] of Object.entries(target.effects)) {
    if (!e) continue;
    if (e.permanent) {
      const keyLower = String(k).toLowerCase();
      if (!allowedPerm.includes(keyLower)) {
        // Exploit: non-permanent effect made permanent like shielding, aether - convert to 15s timed or remove
        console.warn(`[ANTI-EXPLOIT] Removing permanent flag from disallowed effect: ${k}`);
        delete e.permanent;
        delete e.isPermanentAdmin;
        delete e.appliedAt;
        // Convert to normal timed 15s buff instead of permanent, to prevent exploit
        const now = (typeof nowMs === 'function' ? nowMs() : Date.now());
        e.expiresAt = now + 15000;
        if (k === 'bleeding') e.nextTickAt = now + 5000;
        if (k === 'aether') e.nextTickAt = now + 4000;
        if (k === 'poisoned') e.nextTickAt = now + 4000;
        fixed++;
      }
    }
  }
  return fixed;
}

function hasPausedEffects(s) {
  const target = s || state;
  if (!target || !target.effects) return false;
  for (const e of Object.values(target.effects)) {
    if (e && typeof e.pausedRemaining === 'number') return true;
  }
  return false;
}

function activeEffects() {
  if (!state || !state.effects) return [];
  const t = nowMs();
  return Object.values(state.effects)
    .filter((e) => {
      if (!e) return false;
      if (e.permanent) return true;
      if (typeof e.pausedRemaining === 'number') return true;
      return typeof e.expiresAt === 'number' && e.expiresAt > t;
    })
    .sort((a, b) => {
      const at = typeof a.expiresAt === 'number' ? a.expiresAt : (typeof a.pausedRemaining === 'number' ? (nowMs()+a.pausedRemaining) : Infinity);
      const bt = typeof b.expiresAt === 'number' ? b.expiresAt : (typeof b.pausedRemaining === 'number' ? (nowMs()+b.pausedRemaining) : Infinity);
      return at - bt;
    });
}

function activeEffectsForState(s) {
  if (!s || !s.effects) return [];
  try { sanitizePermanentEffects(s); } catch(e) {}
  const t = nowMs();
  return Object.values(s.effects)
    .filter((e) => {
      if (!e) return false;
      if (e.permanent) return true;
      if (typeof e.pausedRemaining === 'number') return true;
      return typeof e.expiresAt === 'number' && e.expiresAt > t;
    })
    .sort((a, b) => {
      const at = typeof a.expiresAt === 'number' ? a.expiresAt : (typeof a.pausedRemaining === 'number' ? (t+a.pausedRemaining) : Infinity);
      const bt = typeof b.expiresAt === 'number' ? b.expiresAt : (typeof b.pausedRemaining === 'number' ? (t+b.pausedRemaining) : Infinity);
      return at - bt;
    });
}

let lastEffectsSig = "";
function renderEffectsUi() {
  if (!state) {
    const allFxKeys = ['bleeding', 'poisoned', 'cursed', 'rested', 'shielded', 'aether', 'hasted', 'well_fed', 'hydrated', 'torchlight', 'titanblood', 'sunfire', 'voidsalt', 'wyrmhide', 'ironbark', 'smokeveil', 'shadowstep', 'mindglass', 'stormseed', 'weak', 'dazed', 'drained', 'brittle', 'frostbitten', 'scorched', 'entangled', 'fear', 'withered', 'hollowed', 'branded', 'shadowbound', 'soulfractured', 'rusted', 'hit'];
    for (const fk of allFxKeys) document.body.classList.remove("fx-" + fk);
    if (fxBadges) fxBadges.innerHTML = "";
    return;
  }
  normalizeState(state);
  pruneExpiredEffects();
  const list = activeEffects();
  const t = nowMs();

  const has = (k) => list.some((e) => e.key === k);
  // All effects now have visual FX
  const allFxKeys = ['bleeding', 'poisoned', 'cursed', 'rested', 'shielded', 'aether', 'hasted', 'well_fed', 'hydrated', 'torchlight', 'titanblood', 'sunfire', 'voidsalt', 'wyrmhide', 'ironbark', 'smokeveil', 'shadowstep', 'mindglass', 'stormseed', 'weak', 'dazed', 'drained', 'brittle', 'frostbitten', 'scorched', 'entangled', 'fear', 'withered', 'hollowed', 'branded', 'shadowbound', 'soulfractured', 'rusted', 'hit'];
  for (const fk of allFxKeys) {
    document.body.classList.toggle("fx-" + fk, has(fk));
  }

  if (fxBadges) {
    fxBadges.innerHTML = "";
    for (const e of list) {
      let sec = 0;
      let label = "";
      if (e.permanent) {
        label = `${e.key} (PERM) ⚠️`;
      } else {
        if (typeof e.pausedRemaining === 'number') sec = Math.max(0, Math.ceil(e.pausedRemaining / 1000));
        else if (typeof e.expiresAt === 'number') sec = Math.max(0, Math.ceil((e.expiresAt - t) / 1000));
        const pausedMark = typeof e.pausedRemaining === 'number' ? ' ⏸' : '';
        label = `${e.key} (${sec}s)${pausedMark}`;
      }
      const div = document.createElement("div");
      div.className = "fxBadge";
      div.textContent = label;
      if (e.permanent) {
        div.title = 'PERMANENT - must be cured by Healer, Enchanter, or special item!';
        div.style.borderColor = '#ff4d6d';
        div.style.color = '#ff8a9a';
      } else {
        div.title = typeof e.pausedRemaining === 'number' ? 'Paused - will resume on login' : '';
      }
      fxBadges.appendChild(div);
    }
  }

  const sig = list.map((e) => {
    let remaining = 0;
    if (typeof e.pausedRemaining === 'number') remaining = e.pausedRemaining;
    else if (typeof e.expiresAt === 'number') remaining = e.expiresAt - t;
    return `${e.key}:${Math.ceil(remaining/1000)}:${typeof e.pausedRemaining === 'number' ? 'p' : 'a'}`;
  }).join("|");
  if (sig !== lastEffectsSig) {
    lastEffectsSig = sig;
    renderStats();
  }
}

function pruneExpiredEffects() {
  if (!state || !state.effects) return;
  try { sanitizePermanentEffects(state); } catch(e) {}
  const t = nowMs();
  let changed = false;
  const expired = [];
  for (const [k, e] of Object.entries(state.effects)) {
    if (!e) continue;
    if (e.permanent) continue; // permanent must be cured by healer/enchanter/item
    if (typeof e.pausedRemaining === 'number') continue; // don't prune paused effects
    if (typeof e.expiresAt !== "number" || e.expiresAt <= t) {
      delete state.effects[k];
      changed = true;
      expired.push(k);
    }
  }
  if (expired.length) {
    for (let i = 0; i < expired.length; i++) {
      playEffectSfx(expired[i], "expire", i * 70);
      // Situation: titanblood ending can cause weak
      if (expired[i] === "titanblood" && typeof maybeApplyDebuffFromSituation === 'function') {
        try { maybeApplyDebuffFromSituation(state, "titanblood_end"); } catch(e) {}
      }
      if (expired[i] === "sunfire" && typeof maybeApplyDebuffFromSituation === 'function') {
        try { if (Math.random() < 0.3) maybeApplyDebuffFromSituation(state, "sunfire_overuse"); } catch(e) {}
      }
    }
  }
  if (changed) {
    renderEffectsUi();
    renderStats();
    renderLog();
    try { if (typeof syncSidebarButtons === 'function') syncSidebarButtons(); } catch(e) {}
    try { if (typeof renderQuestList === 'function') renderQuestList(); } catch(e) {}
    autoSave();
    // If rested expired, need full render to re-enable middle panel buttons
    try {
      const hasRestedNow = typeof hasEffectOnState === 'function' && state && hasEffectOnState(state, "rested");
      if (!hasRestedNow) {
        // Check if we previously had rested by looking at expired list
        if (expired.includes("rested") && typeof render === 'function') {
          render();
        }
      }
    } catch(e) {}
  }
}

function tickEffects() {
  if (!state || !state.effects) return;
  let hasPaused = false;
  for (const e of Object.values(state.effects)) { if (e && typeof e.pausedRemaining === 'number') { hasPaused = true; break; } }
  if (hasPaused) return;
  pruneExpiredEffects();
  const t = nowMs();

  const bleed = state.effects.bleeding;
  // Special case: old town hostile permanent bleeding that keeps you at 1 HP until you leave
  const isOldTownHostile = !!(state && (state.nodeId === "old_town_hostile"));
  if (bleed) {
    const isPermBleed = !!bleed.permanent;
    const isActive = (typeof bleed.expiresAt === "number" && bleed.expiresAt > t) || isPermBleed || typeof bleed.pausedRemaining === 'number';
    if (isActive) {
      if (typeof bleed.nextTickAt !== "number") bleed.nextTickAt = t + 5000;
      if (t >= bleed.nextTickAt) {
        const missed = Math.min(3, Math.floor((t - bleed.nextTickAt) / 5000) + 1);
        bleed.nextTickAt = bleed.nextTickAt + missed * 5000;
        if (isOldTownHostile && isPermBleed) {
          // In old town hostile, bleeding is permanent and caps at 1 HP - if HP goes above 1, reduce to 1
          if ((state.hp || 0) > 1) {
            const over = (state.hp || 0) - 1;
            state.hp = 1;
            appendLog(`🩸 Old Town Hostile: Permanent bleeding keeps you at 1 HP! (-${over} HP) - Leave town to stop, healing blocked until you leave.`);
            playEffectSfx("bleeding", "tick");
            renderStats(); renderLog(); autoSave();
          } else {
            // Already at 1 HP, still show tick but no further damage below 1
            appendLog(`🩸 Old Town Hostile: Bleeding holds you at 1 HP - cannot heal here. Pay 2M fine or flee!`);
            playEffectSfx("bleeding", "tick");
            renderStats(); renderLog(); autoSave();
          }
        } else {
          const dealt = applyDamage(missed, { fromEffect: true }) || 0;
          playEffectSfx("bleeding", "tick");
          appendLog(`🩸 Bleeding hurts you (-${dealt} HP) - use Bandage or Healer to cure.`);
          renderStats(); renderLog(); autoSave();
          if (typeof maybeApplyDebuffFromSituation === 'function' && Math.random() < 0.25) {
            try { maybeApplyDebuffFromSituation(state, "bleeding_long"); } catch(e) {}
          }
        }
      }
      // Extra check: if in old town hostile and HP >1 due to healing, force back to 1 immediately (not just on tick)
      if (isOldTownHostile && isPermBleed && (state.hp || 0) > 1) {
        const over = (state.hp || 0) - 1;
        state.hp = 1;
        appendLog(`🩸 Old Town: Healing blocked! Bleeding reduces you back to 1 HP (-${over}). Leave town to heal.`);
        renderStats(); renderLog(); autoSave();
      }
    }
  }

  const aether = state.effects.aether;
  if (aether && typeof aether.expiresAt === "number" && aether.expiresAt > t) {
    if (typeof aether.nextTickAt !== "number") aether.nextTickAt = t + 4000;
    if (t >= aether.nextTickAt) {
      const missed = Math.min(4, Math.floor((t - aether.nextTickAt) / 4000) + 1);
      aether.nextTickAt = aether.nextTickAt + missed * 4000;
      const res = playerStat("resilience");
      const heal = Math.max(1, Math.floor(missed * (2 + res * 0.2)));
      if ((state.hp || 0) > 0 && (state.hp || 0) < playerMaxHp()) {
        state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
        playEffectSfx("aether", "tick");
        appendLog(`✨ Aether knits your wounds (+${heal} HP).`);
        renderStats(); renderLog(); autoSave();
      }
    }
  }

  const poison = state.effects.poisoned;
  if (poison && typeof poison.expiresAt === "number" && poison.expiresAt > t) {
    if (typeof poison.nextTickAt !== "number") poison.nextTickAt = t + 4000;
    if (t >= poison.nextTickAt) {
      const missed = Math.min(5, Math.floor((t - poison.nextTickAt) / 4000) + 1);
      poison.nextTickAt = poison.nextTickAt + missed * 4000;
      const dealt = applyDamage(missed * 2, { fromEffect: true }) || 0;
      playEffectSfx("poisoned", "tick");
      appendLog(`☠️ Poison burns you (-${dealt} HP) - Antidote or Healer cures.`);
      renderStats(); renderLog(); autoSave();
    }
  }

  // NEW: well_fed - slow HP regen + max HP buff
  const wellFed = state.effects.well_fed;
  if (wellFed && typeof wellFed.expiresAt === "number" && wellFed.expiresAt > t) {
    if (typeof wellFed.nextTickAt !== "number") wellFed.nextTickAt = t + 8000;
    if (t >= wellFed.nextTickAt) {
      const missed = Math.min(2, Math.floor((t - wellFed.nextTickAt) / 8000) + 1);
      wellFed.nextTickAt += missed * 8000;
      if ((state.hp||0) < playerMaxHp()) {
        const heal = missed * 1;
        state.hp = Math.min(playerMaxHp(), (state.hp||0)+heal);
        appendLog(`🍖 Well Fed restores (+${heal} HP) - you feel fortified.`);
        renderStats(); renderLog(); autoSave();
      }
    }
  }

  // NEW: hydrated - mana regen
  const hydrated = state.effects.hydrated;
  if (hydrated && typeof hydrated.expiresAt === "number" && hydrated.expiresAt > t) {
    if (typeof hydrated.nextTickAt !== "number") hydrated.nextTickAt = t + 8000;
    if (t >= hydrated.nextTickAt) {
      const missed = Math.min(2, Math.floor((t - hydrated.nextTickAt) / 8000) + 1);
      hydrated.nextTickAt += missed * 8000;
      if ((state.mana||0) < playerMaxMana()) {
        const gain = missed * 1;
        state.mana = Math.min(playerMaxMana(), (state.mana||0)+gain);
        appendLog(`💧 Hydrated restores (+${gain} mana) - clear mind.`);
        renderStats(); renderLog(); autoSave();
      }
    }
  }

  // NEW: rested - strong regen for HP and mana
  const rested = state.effects.rested;
  if (rested && typeof rested.expiresAt === "number" && rested.expiresAt > t) {
    if (typeof rested.nextTickAt !== "number") rested.nextTickAt = t + 6000;
    if (t >= rested.nextTickAt) {
      const missed = Math.min(2, Math.floor((t - rested.nextTickAt) / 6000) + 1);
      rested.nextTickAt += missed * 6000;
      let did = false;
      if ((state.hp||0) < playerMaxHp()) {
        const heal = missed * 2;
        state.hp = Math.min(playerMaxHp(), (state.hp||0)+heal);
        appendLog(`😴 Rested heals (+${heal} HP).`);
        did = true;
      }
      if ((state.mana||0) < playerMaxMana()) {
        const gain = missed * 2;
        state.mana = Math.min(playerMaxMana(), (state.mana||0)+gain);
        if (!did) appendLog(`😴 Rested restores (+${gain} mana).`);
        else appendLog(`😴 Rested restores (+${gain} mana).`);
        did = true;
      }
      if (did) { renderStats(); renderLog(); autoSave(); }
    }
  }

  // NEW: sunfire - mana regen + light
  const sunfire = state.effects.sunfire;
  if (sunfire && typeof sunfire.expiresAt === "number" && sunfire.expiresAt > t) {
    if (typeof sunfire.nextTickAt !== "number") sunfire.nextTickAt = t + 7000;
    if (t >= sunfire.nextTickAt) {
      const missed = Math.min(2, Math.floor((t - sunfire.nextTickAt) / 7000) + 1);
      sunfire.nextTickAt += missed * 7000;
      if ((state.mana||0) < playerMaxMana()) {
        const gain = missed * 2;
        state.mana = Math.min(playerMaxMana(), (state.mana||0)+gain);
        appendLog(`☀️ Sunfire surges (+${gain} mana) - arcane clarity.`);
        renderStats(); renderLog(); autoSave();
      }
    }
  }

  // NEW: titanblood - damage boost already via bonus, plus occasional HP
  const titanblood = state.effects.titanblood;
  if (titanblood && typeof titanblood.expiresAt === "number" && titanblood.expiresAt > t) {
    if (typeof titanblood.nextTickAt !== "number") titanblood.nextTickAt = t + 10000;
    if (t >= titanblood.nextTickAt) {
      titanblood.nextTickAt += 10000;
      if ((state.hp||0) < playerMaxHp()) {
        state.hp = Math.min(playerMaxHp(), (state.hp||0)+1);
        appendLog(`🩸 Titanblood throbs - you feel unstoppable (+1 HP, +14% STR).`);
        renderStats(); renderLog(); autoSave();
      }
    }
  }

  // NEW: cursed - occasional bad tick, mana drain, can become permanent
  const cursed = state.effects.cursed;
  if (cursed && (typeof cursed.expiresAt === "number" && cursed.expiresAt > t || cursed.permanent)) {
    if (!cursed.permanent) {
      if (typeof cursed.nextTickAt !== "number") cursed.nextTickAt = t + 12000;
      if (t >= cursed.nextTickAt) {
        cursed.nextTickAt += 12000;
        if (Math.random() < 0.5 && (state.mana||0) > 0) {
          const drain = Math.min(2, state.mana);
          state.mana = Math.max(0, (state.mana||0)-drain);
          appendLog(`👁️‍🗨️ Cursed drains (-${drain} mana) - seek Voidsalt, Antidote, Healer, or Enchanter to cure.`);
          renderStats(); renderLog(); autoSave();
        }
        // If cursed lasts > 60s without cure, becomes permanent (needs special cure)
        if (cursed.appliedAt && (t - cursed.appliedAt) > 60000 && Math.random() < 0.35 && !cursed.permanent) {
          cursed.permanent = true;
          delete cursed.expiresAt;
          appendLog(`⚠️ Curse has taken root - it is now PERMANENT! Seek Healer (Purify 20g) or Enchanter (Curse Removal 15g) or Purification Draught.`);
          renderStats(); renderLog(); autoSave();
        }
      }
    } else {
      // permanent cursed occasionally drains more
      if (typeof cursed.nextTickAt !== "number") cursed.nextTickAt = t + 15000;
      if (t >= cursed.nextTickAt) {
        cursed.nextTickAt += 15000;
        const drain = Math.min(3, state.mana || 0);
        if (drain > 0) {
          state.mana = Math.max(0, (state.mana||0)-drain);
          appendLog(`👁️‍🗨️ PERMANENT Curse drains (-${drain} mana) - MUST be cured by Healer/Enchanter!`);
          renderStats(); renderLog(); autoSave();
        }
      }
    }
  }

  // Permanent bleeding can happen too - if bleeding > 45s becomes permanent (needs bandage + healer)
  const bleedPerm = state.effects.bleeding;
  if (bleedPerm && !bleedPerm.permanent && bleedPerm.appliedAt && (t - bleedPerm.appliedAt) > 45000 && Math.random() < 0.25) {
    bleedPerm.permanent = true;
    delete bleedPerm.expiresAt;
    appendLog(`⚠️ Bleeding has become DEEP & PERMANENT! Bandage may not work - need Healer or Elixir!`);
    renderStats(); renderLog(); autoSave();
  }

  // NEW: cursed can become permanent if not cured - handled in healer cure section

  // SHIELDED, WYRMHIDE, IRONBARK, VOIDSALT are damage reduction - no tick needed, but show active

  // HASTED, SHADOWSTEP, SMOKEVEIL, STORMSEED, MINDGLASS, TORCHLIGHT are combat buffs - their effect is in combat via escape/accuracy mods
  // We still give them a small regen to feel alive
  const hasted = state.effects.hasted;
  if (hasted && typeof hasted.expiresAt === "number" && hasted.expiresAt > t) {
    if (typeof hasted.nextTickAt !== "number") hasted.nextTickAt = t + 9000;
    if (t >= hasted.nextTickAt) {
      hasted.nextTickAt += 9000;
      if (Math.random() < 0.3) appendLog(`⚡ Hasted - you move quick (+12% cunning, +20% escape).`);
    }
  }

  // New debuffs ticks - each has situation and cure
  const weak = state.effects.weak;
  if (weak && (typeof weak.expiresAt === "number" && weak.expiresAt > t || weak.permanent)) {
    if (typeof weak.nextTickAt !== "number") weak.nextTickAt = t + 15000;
    if (t >= weak.nextTickAt) {
      weak.nextTickAt += 15000;
      if (!weak.permanent) appendLog(`💪 Weak lingers (-12% strength) - Ration, Healer, or rest cures.`);
    }
  }

  const dazed = state.effects.dazed;
  if (dazed && (typeof dazed.expiresAt === "number" && dazed.expiresAt > t || dazed.permanent)) {
    if (typeof dazed.nextTickAt !== "number") dazed.nextTickAt = t + 12000;
    if (t >= dazed.nextTickAt) {
      dazed.nextTickAt += 12000;
      if (!dazed.permanent) appendLog(`💫 Dazed - vision blurs (-12% cunning) - Mindglass or Healer cures.`);
    }
  }

  const drained = state.effects.drained;
  if (drained && (typeof drained.expiresAt === "number" && drained.expiresAt > t || drained.permanent)) {
    if (typeof drained.nextTickAt !== "number") drained.nextTickAt = t + 8000;
    if (t >= drained.nextTickAt) {
      drained.nextTickAt += 8000;
      const drain = Math.min(2, state.mana || 0);
      if (drain > 0) {
        state.mana = Math.max(0, (state.mana||0)-drain);
        appendLog(`🌀 Drained saps mana (-${drain}) - Waterskin, rest, or Healer cures.`);
        renderStats(); renderLog(); autoSave();
      }
    }
  }

  const brittle = state.effects.brittle;
  if (brittle && (typeof brittle.expiresAt === "number" && brittle.expiresAt > t || brittle.permanent)) {
    if (typeof brittle.nextTickAt !== "number") brittle.nextTickAt = t + 14000;
    if (t >= brittle.nextTickAt) {
      brittle.nextTickAt += 14000;
      if (!brittle.permanent) appendLog(`💔 Brittle - armor cracked (-10% resilience) - Ironbark, Wyrmhide, or Healer cures.`);
    }
  }

  const frost = state.effects.frostbitten;
  if (frost && (typeof frost.expiresAt === "number" && frost.expiresAt > t || frost.permanent)) {
    if (typeof frost.nextTickAt !== "number") frost.nextTickAt = t + 7000;
    if (t >= frost.nextTickAt) {
      frost.nextTickAt += 7000;
      const dealt = applyDamage(1, { fromEffect: true }) || 0;
      appendLog(`❄️ Frostbitten chills (-${dealt} HP) - Torchlight, warm fire, or Healer cures.`);
      renderStats(); renderLog(); autoSave();
    }
  }

  const scorch = state.effects.scorched;
  if (scorch && (typeof scorch.expiresAt === "number" && scorch.expiresAt > t || scorch.permanent)) {
    if (typeof scorch.nextTickAt !== "number") scorch.nextTickAt = t + 6000;
    if (t >= scorch.nextTickAt) {
      scorch.nextTickAt += 6000;
      const dealt = applyDamage(1, { fromEffect: true }) || 0;
      appendLog(`🔥 Scorched burns (-${dealt} HP) - Waterskin, Aether, or Healer cures.`);
      renderStats(); renderLog(); autoSave();
    }
  }

  const ent = state.effects.entangled;
  if (ent && (typeof ent.expiresAt === "number" && ent.expiresAt > t || ent.permanent)) {
    if (typeof ent.nextTickAt !== "number") ent.nextTickAt = t + 13000;
    if (t >= ent.nextTickAt) {
      ent.nextTickAt += 13000;
      if (!ent.permanent) appendLog(`🌿 Entangled - roots hold (-10% cunning) - Torch, Hasted, or Healer cures.`);
    }
  }

  const fear = state.effects.fear;
  if (fear && (typeof fear.expiresAt === "number" && fear.expiresAt > t || fear.permanent)) {
    if (typeof fear.nextTickAt !== "number") fear.nextTickAt = t + 10000;
    if (t >= fear.nextTickAt) {
      fear.nextTickAt += 10000;
      if (Math.random() < 0.4 && (state.mana||0) > 0) {
        const drain = Math.min(1, state.mana);
        state.mana = Math.max(0, (state.mana||0)-drain);
        appendLog(`😱 Fear gnaws (-${drain} mana) - Torchlight, Rested, or Healer cures.`);
        renderStats(); renderLog(); autoSave();
      }
    }
  }

  // New permanent debuffs - all have no timer, stay until cured by specific person/item
  const withered = state.effects.withered;
  if (withered && withered.permanent) {
    if (typeof withered.nextTickAt !== "number") withered.nextTickAt = t + 20000;
    if (t >= withered.nextTickAt) {
      withered.nextTickAt += 20000;
      const dealt = applyDamage(1, { fromEffect: true }) || 0;
      appendLog(`🥀 Withered withers (-${dealt} HP) - Max HP reduced 10%. Need Aether + Healer + Alchemist Purification + rare herb.`);
      renderStats(); renderLog(); autoSave();
    }
  }

  const hollowed = state.effects.hollowed;
  if (hollowed && hollowed.permanent) {
    if (typeof hollowed.nextTickAt !== "number") hollowed.nextTickAt = t + 18000;
    if (t >= hollowed.nextTickAt) {
      hollowed.nextTickAt += 18000;
      if (Math.random() < 0.5 && (state.mana||0) > 0) {
        const drain = Math.min(2, state.mana);
        state.mana = Math.max(0, (state.mana||0)-drain);
        appendLog(`👻 Hollowed whispers (-${drain} mana) - Need Lys burn doll + Healer + Enchanter Blessing.`);
        renderStats(); renderLog(); autoSave();
      }
    }
  }

  const branded = state.effects.branded;
  if (branded && branded.permanent) {
    if (typeof branded.nextTickAt !== "number") branded.nextTickAt = t + 25000;
    if (t >= branded.nextTickAt) {
      branded.nextTickAt += 25000;
      appendLog(`🔖 Branded - Crown watches. -8% cunning/resilience. Need Healer Purify + pay 30g at Market + Crown contact.`);
    }
  }

  const shadowbound = state.effects.shadowbound;
  if (shadowbound && shadowbound.permanent) {
    if (typeof shadowbound.nextTickAt !== "number") shadowbound.nextTickAt = t + 16000;
    if (t >= shadowbound.nextTickAt) {
      shadowbound.nextTickAt += 16000;
      if (Math.random() < 0.4 && !hasEffectOnState(state, "cursed")) {
        addEffect("cursed", 12000);
        appendLog(`🌑 Shadowbound pulls - Cursed! Need Torchlight + Sunfire + Healer + Enchanter ritual.`);
        renderStats(); renderLog(); autoSave();
      }
    }
  }

  const soulfractured = state.effects.soulfractured;
  if (soulfractured && soulfractured.permanent) {
    if (typeof soulfractured.nextTickAt !== "number") soulfractured.nextTickAt = t + 20000;
    if (t >= soulfractured.nextTickAt) {
      soulfractured.nextTickAt += 20000;
      if ((state.mana||0) > 0) {
        const drain = Math.min(2, state.mana);
        state.mana = Math.max(0, (state.mana||0)-drain);
        appendLog(`💔 Soulfractured - soul cracked (-${drain} mana, -12% res). Need Aether + Rested + Healer Cleanse + Enchanter.`);
        renderStats(); renderLog(); autoSave();
      }
    }
  }

  const rusted = state.effects.rusted;
  if (rusted && rusted.permanent) {
    if (typeof rusted.nextTickAt !== "number") rusted.nextTickAt = t + 22000;
    if (t >= rusted.nextTickAt) {
      rusted.nextTickAt += 22000;
      appendLog(`🔩 Rusted - armor degraded (-14% resilience). Need Blacksmith + oil + Healer.`);
    }
  }
}


function badgeForDifficulty(diffKey) {
  const d = DIFFICULTY[diffKey] || DIFFICULTY.normal;
  return `<span class="badge ${d.className}">${d.label}</span>`;
}

function missionTitle(i) {
  const seedKey = arguments.length >= 2 ? arguments[1] : 0;
  const seed = Math.floor(seedKey || 0);
  const verbs = ["Recover", "Escort", "Investigate", "Hunt", "Guard", "Deliver", "Explore", "Breach", "Rescue", "Map"];
  const nouns = ["the Ruins", "the Wildwood", "the Old Road", "a Relic", "a Caravan", "a Beacon", "a Lost Mage", "a Smuggler Ring", "the Shadow Cell", "the Sun Vault"];
  if (!seed) return `${verbs[i % verbs.length]} ${nouns[i % nouns.length]}`;
  const hv = (hashString(`town:${seed}:mission:${i}:v`) >>> 0);
  const hn = (hashString(`town:${seed}:mission:${i}:n`) >>> 0);
  return `${verbs[hv % verbs.length]} ${nouns[hn % nouns.length]}`;
}

function sideQuestTitle(i) {
  const seedKey = arguments.length >= 2 ? arguments[1] : 0;
  const seed = Math.floor(seedKey || 0);
  const a = ["Whispers", "Ashes", "Lanterns", "Oaths", "Crows", "Mist", "Coins", "Runes", "Fires", "Echoes"];
  const b = ["in the Market", "by Moonlight", "of the Marsh", "of the Fallen", "at the Shrine", "under Stone", "of the River", "of the Watch", "of the Hollow", "at Dawn"];
  if (!seed) return `${a[i % a.length]} ${b[i % b.length]}`;
  const ha = (hashString(`town:${seed}:side:${i}:a`) >>> 0);
  const hb = (hashString(`town:${seed}:side:${i}:b`) >>> 0);
  return `${a[ha % a.length]} ${b[hb % b.length]}`;
}

function pickDifficultyByIndex(i) {
  if (i < 200) return "easy";
  if (i < 350) return "normal";
  if (i < 480) return "hard";
  if (i < 560) return "elite";
  return "legendary";
}

function genMissions(count) {
  const seedKey = arguments.length >= 2 ? arguments[1] : 0;
  const seed = Math.floor(seedKey || 0);
  const missions = [];
  for (let i = 0; i < count; i++) {
    const diff = pickDifficultyByIndex(i);
    const d = DIFFICULTY[diff];
    const faction = FACTIONS[(i + 1) % FACTIONS.length];
    // Remodule: quest recLevel now scales to PLAYER_MAX_LEVEL (700) - player cap 700, admin 999
    const progress = i / Math.max(1, count - 1); // 0..1
    let levelScale = 0;
    if (diff === "easy") levelScale = Math.floor(progress * 200); // 1..201
    else if (diff === "normal") levelScale = Math.floor(progress * 320); // 4..324
    else if (diff === "hard") levelScale = Math.floor(progress * 480); // 8..488
    else if (diff === "elite") levelScale = Math.floor(progress * 620); // 12..632
    else levelScale = Math.floor(progress * 684); // legendary 16..700
    let recLevel = d.recLevel + levelScale;
    recLevel = Math.max(1, Math.min(700, recLevel));
    // XP scaled higher for high level quests to help reach 700 cap
    const tierMult = 1 + (recLevel / 700) * 2.5;
    const xp = Math.max(1, Math.floor(((d.baseXp || 0) + recLevel * (d.xpPerLevel || 0)) * tierMult));
    const gold = Math.max(0, Math.floor(((d.baseGold || 0) + recLevel * (d.goldPerLevel || 0)) * (1 + recLevel * 0.03)));
    missions.push({
      id: `m${i + 1}`,
      kind: "mission",
      title: `#${i + 1} ${missionTitle(i, seed)}`,
      difficulty: diff,
      recLevel,
      faction,
      xp,
      gold,
    });
  }
  // Boss missions with lairs and roads as requested - lowest boss 200 highest 800/900, mini bosses 70-90
  const bossMissions = [
    { id: "boss_mini_70", title: "Mini-Boss: Whispering Hollow Lv70", diff: "hard", rec: 70, faction: "Wilds", place: "mini_lair_70", desc: "Road to boss map via ruins/road - Boss: Hollow Warden" },
    { id: "boss_mini_80", title: "Mini-Boss: Fog Mire Den Lv80", diff: "hard", rec: 80, faction: "Wilds", place: "mini_lair_80", desc: "Road via marsh/wilds - Boss: Mire Chieftain" },
    { id: "boss_mini_90", title: "Mini-Boss: Sunken Chapel Lv90 (Highest Mini)", diff: "elite", rec: 90, faction: "Wilds", place: "mini_lair_90", desc: "Road via ruins/vault - Boss: Drowned Saint - highest mini boss" },
    { id: "boss_200", title: "Boss: Bone King Crypt Lv200 (Lowest Boss)", diff: "elite", rec: 200, faction: "Crown", place: "boss_lair_200", desc: "Road via ruins/vault - Boss: Bone King - lowest boss legendary rank" },
    { id: "boss_400", title: "Boss: Ashen Citadel Lv400", diff: "legendary", rec: 400, faction: "Crown", place: "boss_lair_400", desc: "Road via vault/wilds - Boss: Ash Tyrant" },
    { id: "boss_600", title: "Boss: Void Scar Lv600", diff: "legendary", rec: 600, faction: "Guild", place: "boss_lair_600", desc: "Road via wilds - Boss: Void Harbinger" },
    { id: "boss_800", title: "Boss: Stormpeak Throne Lv800", diff: "legendary", rec: 800, faction: "Guild", place: "boss_lair_800", desc: "Road via wilds - Boss: Storm Emperor - high boss" },
    { id: "boss_900", title: "Boss: Sun Vault Core Lv900 (Highest Boss)", diff: "legendary", rec: 900, faction: "Guild", place: "boss_lair_900", desc: "Road via vault - Boss: Sun Vault Overlord - highest boss final" },
  ];
  for (const bm of bossMissions) {
    const d = DIFFICULTY[bm.diff] || DIFFICULTY.elite;
    const recLevel = bm.rec;
    const xp = Math.max(200, Math.floor((d.baseXp + recLevel * d.xpPerLevel) * (1 + recLevel * 0.04)));
    const gold = Math.max(100, Math.floor((d.baseGold + recLevel * d.goldPerLevel) * (1 + recLevel * 0.05)));
    missions.push({
      id: bm.id,
      kind: "mission",
      title: bm.title,
      difficulty: bm.diff,
      recLevel,
      faction: bm.faction,
      place: bm.place,
      xp,
      gold,
      isBoss: true,
      bossDesc: bm.desc,
    });
  }
  return missions;
}

function genSideQuests(count) {
  const seedKey = arguments.length >= 2 ? arguments[1] : 0;
  const seed = Math.floor(seedKey || 0);
  const quests = [];
  const places = ["Virelia Gate", "Old Harbor", "Moonwell", "High Market", "Wind Shrine", "Blackwood Edge", "Stonebridge", "Glass Marsh"];
  const exileA = ["Ash", "Lantern", "Moon", "Cinder", "Iron", "Glass", "Fog", "Shadow", "Salt", "Storm", "Dawn", "Grave", "Gutter", "Hollow", "Bitter", "Black", "White", "Copper", "Sable", "Bright"];
  const exileB = ["Gate", "Row", "Spur", "Crossing", "Stairs", "Arcade", "Spire", "Canal", "Cistern", "Shrine", "Bridge", "Vault", "Yard", "Lane", "Court", "Bazaar", "Foundry", "Chapel", "Wharf", "Keep"];
  for (let i = 0; i < count; i++) {
    // Remodule: side quest minLevel scales to PLAYER_MAX 700 - player cap 700
    const progress = i / Math.max(1, count - 1);
    const minLevel = Math.max(1, Math.min(700, 1 + Math.floor(progress * 699)));
    const faction = FACTIONS[(i + 2) % FACTIONS.length];
    let place = places[i % places.length];
    if (seed) {
      const ha = (hashString(`town:${seed}:place:${i}:a`) >>> 0);
      const hb = (hashString(`town:${seed}:place:${i}:b`) >>> 0);
      place = `${exileA[ha % exileA.length]} ${exileB[hb % exileB.length]}`;
    }
    // XP scales better for high level side quests to help reach 700 cap
    const xp = Math.max(18, Math.floor((18 + i * 1.7) * (1 + minLevel * 0.05)));
    const gold = Math.max(6, Math.floor((6 + i * 0.6) * (1 + minLevel * 0.04)));
    quests.push({
      id: `s${i + 1}`,
      kind: "side",
      title: `Side Quest ${i + 1}: ${sideQuestTitle(i, seed)}`,
      minLevel,
      faction,
      place,
      xp,
      gold,
    });
  }
  return quests;
}

function difficultyGateText(reqLevel, diffKey) {
  const d = DIFFICULTY[diffKey] || DIFFICULTY.normal;
  return `Recommended Level ${reqLevel} (${d.label}).`;
}

function canTakeQuest(q) {
  if (!state) return { ok: false, reason: "No profile." };
  if (isAdminProfile(state.profile)) return { ok: true };
  if (!state.character?.created) return { ok: false, reason: "Finish character creation first." };
  if (q.kind === "mission") {
    const rep = (state.reputation && state.reputation[q.faction]) ? state.reputation[q.faction] : 0;
    if (q.faction !== "Wilds" && rep < -2) return { ok: false, reason: `Your standing with the ${q.faction} is too low.` };
    // Remodule: missions as hard as level suggests - strict gate, no level 5 doing legendary/hard/normal
    // Easy allows 2 below, Normal requires exact, Hard requires exact, Elite requires +1, Legendary +2 (must be at or above rec)
    const diff = String(q.difficulty || "normal").toLowerCase();
    let minRequired = q.recLevel;
    if (diff === "easy") minRequired = q.recLevel - 2;
    else if (diff === "normal") minRequired = q.recLevel;
    else if (diff === "hard") minRequired = q.recLevel;
    else if (diff === "elite") minRequired = q.recLevel + 1;
    else if (diff === "legendary") minRequired = q.recLevel + 2;
    if (state.level < minRequired) return { ok: false, reason: `Too dangerous. Requires Level ${minRequired}. ${difficultyGateText(q.recLevel, q.difficulty)} You are Level ${state.level}.` };
    const reqParty = missionPartyRequirement(q);
    if (partySize(state) < reqParty) return { ok: false, reason: `Requires party size ${reqParty}. Visit the Tavern.` };
    return { ok: true };
  }
  if (q.kind === "side") {
    if (state.level < q.minLevel) return { ok: false, reason: `Requires Level ${q.minLevel}.` };
    return { ok: true };
  }
  return { ok: false, reason: "Unknown quest." };
}

function startQuest(q) {
  if (!state) return;
  worldTick(`Accept: ${q.kind}`);
  clearLog();
  state.activeQuest = { kind: q.kind, id: q.id };
  autoSave();
  if (q.kind === "mission") {
    const reqParty = missionPartyRequirement(q);
    appendLog(`📜 Mission Accepted: ${q.title}`);
    appendLog(`${badgeText(q)}  Faction: ${q.faction}`);
    appendLog(`Reward: +${q.xp} XP, +${q.gold} gold. ${difficultyGateText(q.recLevel, q.difficulty)} Party required: ${reqParty}.`);
    appendLog("How will you approach it?");
    showChoices([
      {
        label: "Scout (safer)",
        onChoose: () => attemptMission(q, "scout"),
      },
      {
        label: "Negotiate (reputation)",
        onChoose: () => attemptMission(q, "negotiate"),
      },
      {
        label: "Charge (risky)",
        onChoose: () => attemptMission(q, "charge"),
      },
      {
        label: "Back to Town",
        className: "secondary",
        onChoose: () => enterNode(hubNodeId(state)),
      },
    ]);
    render();
    return;
  }

  if (q.kind === "side") {
    appendLog(`🧭 Side Quest: ${q.title}`);
    appendLog(`Location: ${q.place}. Faction: ${q.faction}`);
    appendLog(`Reward: +${q.xp} XP, +${q.gold} gold.`);
    showChoices([
      {
        label: "Help",
        onChoose: () => beginSideQuest(q, "help"),
      },
      {
        label: "Demand Payment",
        onChoose: () => beginSideQuest(q, "demand"),
      },
      {
        label: "Refuse",
        className: "secondary",
        onChoose: () => finalizeSideQuest(q, "refuse", "none"),
      },
    ]);
    render();
  }
}

function badgeText(q) {
  const d = DIFFICULTY[q.difficulty] || DIFFICULTY.normal;
  return `[${d.label}]`;
}

function hubNodeId(s) {
  if (!s) return "crossroads";
  if (!isAdminProfile(s.profile) && !!s.flags?.["exile:active"]) return "exile_town";
  return "crossroads";
}

function missionSuccessChance(q, approach) {
  const rep = (state.reputation && state.reputation[q.faction]) ? state.reputation[q.faction] : 0;
  const levelEdge = state.level - q.recLevel;
  const repEdge = rep * 0.03;
  // Remodule: missions as hard as level suggests - stricter success chance
  // Old allowed 15% even if 20+ levels below. New scales harsher for high diff
  const diff = String(q.difficulty || "normal").toLowerCase();
  let diffPenalty = 0;
  if (diff === "hard") diffPenalty = -0.08;
  else if (diff === "elite") diffPenalty = -0.15;
  else if (diff === "legendary") diffPenalty = -0.25;
  const base = 0.55 + diffPenalty;
  // Level edge more punishing: each level below -7% instead of +5%, each above +3%
  let levelBonus = 0;
  if (levelEdge >= 0) levelBonus = levelEdge * 0.03;
  else levelBonus = levelEdge * 0.07; // negative edge hurts more
  let chance = base + levelBonus + repEdge;
  if (getFlag("heardRumors")) chance += 0.03;
  if (approach === "scout") chance += 0.08;
  if (approach === "negotiate") chance += clamp(rep * 0.02, -0.08, 0.10);
  if (approach === "charge") chance -= 0.08;
  if (
    state
    && !isAdminProfile(state.profile)
    && !!state.flags?.["exile:active"]
    && Math.max(0, Math.floor(state.flags?.["exile:riskMissionsLeft"] || 0)) > 0
  ) {
    chance -= 0.12;
  }
  // Clamp min lower for hard difficulties - legendary at 20 below should be near impossible
  let minChance = 0.02;
  if (diff === "easy") minChance = 0.10;
  else if (diff === "normal") minChance = 0.06;
  else if (diff === "hard") minChance = 0.03;
  else if (diff === "elite") minChance = 0.02;
  else if (diff === "legendary") minChance = 0.01;
  return clamp(chance, minChance, 0.90);
}

function missionTierFromRecLevel(recLevel) {
  const lvl = Math.max(1, Math.floor(recLevel || 1));
  // Remodule for 700 cap: tier progression slower, matches quest recLevel scaling
  // Old: 1+ floor((lvl-1)/4) => tier5 at 17
  // New: tier1 1-99, tier2 100-249, tier3 250-399, tier4 400-549, tier5 550+
  if (lvl < 100) return clamp(1 + Math.floor((lvl - 1) / 50), 1, 5);
  if (lvl < 250) return clamp(2 + Math.floor((lvl - 100) / 75), 1, 5);
  if (lvl < 400) return clamp(3 + Math.floor((lvl - 250) / 75), 1, 5);
  if (lvl < 550) return clamp(4 + Math.floor((lvl - 400) / 75), 1, 5);
  return 5;
}

function missionTierForQuest(q) {
  const baseTier = missionTierFromRecLevel(q?.recLevel || 1);
  const dt = tierForDifficultyKey(q?.difficulty);
  const mod = dt - 2;
  return clamp(baseTier + mod, 1, 5);
}

function pickMissionMobForQuest(s, q) {
  // Boss missions have specific levels: 70,80,90,200,400,600,800,900
  if (q && q.isBoss) {
    const recLevel = Math.max(1, Math.floor(q.recLevel || 70));
    // Map recLevel to tier for boss
    const tier = recLevel < 100 ? 4 : 5;
    const idx = (tier - 1) * 60 + 1 + Math.floor(Math.random() * 60);
    const baseDef = mobDef(idx);
    const boss = { ...baseDef };
    boss.recLevel = recLevel;
    boss.tier = tier;
    boss.legendaryRank = recLevel >= 200;
    boss.powerful = true;
    boss.name = `${q.title.split(':')[1] ? q.title.split(':')[1].trim() : q.title} [${recLevel >= 200 ? 'LEGENDARY' : 'MINI-BOSS'} Lv${recLevel}]`;
    // Scale boss to its level as requested: lowest boss 200, highest 800/900, mini 70-90
    const hpMult = recLevel < 100 ? (3.5 + recLevel * 0.02) : (recLevel < 200 ? 5 + recLevel * 0.03 : recLevel < 400 ? 8 + recLevel * 0.04 : recLevel < 600 ? 12 + recLevel * 0.05 : 20 + recLevel * 0.06);
    const atkMult = recLevel < 100 ? (2.2 + recLevel * 0.01) : (recLevel < 200 ? 3 + recLevel * 0.02 : recLevel < 400 ? 4 + recLevel * 0.025 : recLevel < 600 ? 5 + recLevel * 0.03 : 7 + recLevel * 0.035);
    boss.maxHp = Math.max(300, Math.floor((baseDef.maxHp || 100) * hpMult + recLevel * 5));
    boss.hp = boss.maxHp;
    boss.atk = Math.max(20, Math.floor((baseDef.atk || 15) * atkMult + recLevel * 0.8));
    boss.acc = 0.88;
    if (recLevel >= 200) {
      boss.bossLair = true;
    }
    return boss;
  }
  const tier = missionTierForQuest(q);
  const p = partySize(s);
  const wantGroup = String(q?.difficulty || "").toLowerCase() === "legendary";
  const wantPower = wantGroup || String(q?.difficulty || "").toLowerCase() === "elite";
  for (let tries = 0; tries < 140; tries++) {
    const idx = (tier - 1) * 60 + 1 + Math.floor(Math.random() * 60);
    const def = mobDef(idx);
    if (def.requiresPartySize > p) continue;
    if (wantGroup && p >= 3 && !def.requiresParty) continue;
    if (wantPower && !def.powerful && Math.random() < 0.75) continue;
    return def;
  }
  return pickMobForDifficulty(s, tier);
}

function tuneMissionCombatEvent(ev, q) {
  if (!ev || !q) return;
  const dt = tierForDifficultyKey(q.difficulty);
  // Base difficulty multipliers - scaled up for 700 cap, legendary much harder
  const hpMulBase = dt <= 1 ? 0.95 : (dt === 2 ? 1.05 : (dt === 3 ? 1.35 : (dt === 4 ? 1.75 : 2.40)));
  const atkMulBase = dt <= 1 ? 0.96 : (dt === 2 ? 1.05 : (dt === 3 ? 1.30 : (dt === 4 ? 1.65 : 2.10)));
  const accAddBase = dt <= 1 ? -0.01 : (dt === 2 ? 0.01 : (dt === 3 ? 0.04 : (dt === 4 ? 0.07 : 0.10)));
  // Level difference scaling: if recLevel > player level, enemies become even harder (as hard as level suggests)
  const lvl = Math.max(1, Math.floor(state?.level || 1));
  const rec = Math.max(1, Math.floor(q.recLevel || 1));
  const diff = Math.max(0, rec - lvl);
  // For each level difference, increase HP 4%, Atk 3%, Acc 0.3%
  const lvlHpMul = 1 + diff * 0.04;
  const lvlAtkMul = 1 + diff * 0.03;
  const lvlAccAdd = diff * 0.003;
  const hpMul = hpMulBase * lvlHpMul;
  const atkMul = atkMulBase * lvlAtkMul;
  const accAdd = accAddBase + lvlAccAdd;
  for (const e of ev.enemies || []) {
    if (!e) continue;
    if (typeof e.maxHp === "number") e.maxHp = Math.max(1, Math.round(e.maxHp * hpMul));
    if (typeof e.hp === "number" && typeof e.maxHp === "number") e.hp = Math.min(e.maxHp, Math.round(e.hp * hpMul));
    if (typeof e.atk === "number") e.atk = Math.max(1, Math.round(e.atk * atkMul));
    if (typeof e.acc === "number") e.acc = clamp(e.acc + accAdd, 0.45, 0.96);
  }
}

function sideTierFromMinLevel(minLevel) {
  const lvl = Math.max(1, Math.floor(minLevel || 1));
  // Remodule for 700 cap
  if (lvl < 100) return clamp(1 + Math.floor((lvl - 1) / 50), 1, 5);
  if (lvl < 250) return clamp(2 + Math.floor((lvl - 100) / 75), 1, 5);
  if (lvl < 400) return clamp(3 + Math.floor((lvl - 250) / 75), 1, 5);
  if (lvl < 550) return clamp(4 + Math.floor((lvl - 400) / 75), 1, 5);
  return 5;
}

function sideTierForQuest(s, q, approach) {
  const baseTier = sideTierFromMinLevel(q?.minLevel || 1);
  const under = Math.max(0, (q?.minLevel || 1) - (s?.level || 1));
  let mod = 0;
  if (under >= 6) mod += 2;
  else if (under >= 2) mod += 1;
  if (String(approach || "") === "bold") mod += 1;
  return clamp(baseTier + mod, 1, 5);
}

function pickSideMobForQuest(s, q, approach) {
  const tier = sideTierForQuest(s, q, approach);
  const p = partySize(s);
  const wantPower = tier >= 4 || String(approach || "") === "bold";
  for (let tries = 0; tries < 120; tries++) {
    const idx = (tier - 1) * 60 + 1 + Math.floor(Math.random() * 60);
    const def = mobDef(idx);
    if (def.requiresPartySize > p) continue;
    if (wantPower && !def.powerful && Math.random() < 0.60) continue;
    return def;
  }
  return pickMobForDifficulty(s, tier);
}

function tuneSideCombatEvent(ev, q, approach) {
  if (!ev || !q) return;
  const dt = sideTierForQuest(state, q, approach);
  const hpMulBase = dt <= 1 ? 0.96 : (dt === 2 ? 1.08 : (dt === 3 ? 1.30 : (dt === 4 ? 1.60 : 2.00)));
  const atkMulBase = dt <= 1 ? 0.97 : (dt === 2 ? 1.05 : (dt === 3 ? 1.20 : (dt === 4 ? 1.45 : 1.85)));
  const accAddBase = dt <= 1 ? -0.01 : (dt === 2 ? 0.01 : (dt === 3 ? 0.03 : (dt === 4 ? 0.06 : 0.09)));
  // Side quests as hard as level suggests: if minLevel > player level, scale up
  const lvl = Math.max(1, Math.floor(state?.level || 1));
  const rec = Math.max(1, Math.floor(q.minLevel || 1));
  const diff = Math.max(0, rec - lvl);
  const lvlHpMul = 1 + diff * 0.035;
  const lvlAtkMul = 1 + diff * 0.025;
  const lvlAccAdd = diff * 0.0025;
  const hpMul = hpMulBase * lvlHpMul;
  const atkMul = atkMulBase * lvlAtkMul;
  const accAdd = accAddBase + lvlAccAdd;
  for (const e of ev.enemies || []) {
    if (!e) continue;
    if (typeof e.maxHp === "number") e.maxHp = Math.max(1, Math.round(e.maxHp * hpMul));
    if (typeof e.hp === "number" && typeof e.maxHp === "number") e.hp = Math.min(e.maxHp, Math.round(e.hp * hpMul));
    if (typeof e.atk === "number") e.atk = Math.max(1, Math.round(e.atk * atkMul));
    if (typeof e.acc === "number") e.acc = clamp(e.acc + accAdd, 0.45, 0.96);
  }
}

function createSideTaskEvent(s, q, choice, approach) {
  const rep = (s.reputation && s.reputation[q.faction]) ? s.reputation[q.faction] : 0;
  const pressure = Math.max(0, (q.minLevel || 1) - (s.level || 1));
  const dt = sideTierForQuest(s, q, approach);
  const goldCost = Math.max(6, Math.floor((q.gold || 0) * 0.08) + 3 + dt * 2 + pressure * 2);
  return {
    kind: "side",
    subtype: "task",
    fromNode: s.nodeId || "crossroads",
    phase: 0,
    edge: 0,
    heat: (choice === "demand") ? 1 : 0,
    goldCost,
    title: `Side Task — ${q.title}`,
    text: `Step 1/3 — Set up the job.\nEdge: 0 • Heat: ${(choice === "demand") ? 1 : 0}\n\nMinimum level: ${q.minLevel} • Your rep: ${rep}`,
    quest: {
      kind: "side",
      id: q.id,
      title: q.title,
      rewardXp: q.xp,
      rewardGold: q.gold,
      faction: q.faction,
      returnNode: hubNodeId(s),
      minLevel: q.minLevel,
      choice,
      approach,
    },
  };
}

function sideTaskResolve(actionKey) {
  if (!state) return;
  normalizeState(state);
  const ev = state.world?.pendingEvent;
  if (!ev || ev.kind !== "side" || ev.subtype !== "task") return;

  const q = ev.quest;
  const a = String(actionKey || "").trim().toLowerCase();
  const rep = (state.reputation && state.reputation[q.faction]) ? state.reputation[q.faction] : 0;
  const pressure = Math.max(0, (q.minLevel || 1) - (state.level || 1));
  const dt = sideTierForQuest(state, q, q.approach);
  const phase = Math.max(0, Math.floor(ev.phase || 0));

  if (a === "abort") {
    appendLog("You pull out. Sometimes the safest victory is refusing the wager.");
    adjustReputation(q.faction, -1);
    state.activeQuest = null;
    state.pendingSide = null;
    state.world.pendingEvent = null;
    autoSave();
    render();
    return;
  }

  const lines = [];
  const roll = Math.random();

  const approachKey = String(q.approach || "");
  const approachBonus = approachKey === "quiet" ? 0.03 : (approachKey === "bold" ? -0.02 : 0.01);
  const check = (base, perStat, statKey, repMul) => {
    const stat = playerStat(statKey);
    const chance = clamp(base + approachBonus + stat * perStat + rep * repMul - pressure * 0.05 - Math.max(0, dt - 2) * 0.03, 0.10, 0.92);
    return { chance, ok: roll < chance };
  };

  if (phase === 0) {
    if (a === "bribe") {
      const cost = Math.max(1, Math.floor(ev.goldCost || 10));
      if ((state.gold || 0) < cost) {
        lines.push("You reach for coin — but you don't have enough.");
      } else {
        state.gold -= cost;
        const c = clamp(0.62 + approachBonus + rep * 0.04 - pressure * 0.04 - Math.max(0, dt - 2) * 0.04, 0.18, 0.90);
        if (roll < c) {
          ev.edge = (ev.edge || 0) + 1;
          lines.push("A small payment buys silence and time.");
        } else {
          ev.heat = (ev.heat || 0) + 1;
          lines.push("The bribe draws the wrong eyes.");
        }
      }
    } else if (a === "arcane") {
      if ((state.mana || 0) < 3) {
        ev.heat = (ev.heat || 0) + 1;
        lines.push("Your focus slips. The spell frays.");
      } else {
        state.mana -= 3;
        const c = check(0.40, 0.04, "arcana", 0.02);
        if (c.ok) {
          ev.edge = (ev.edge || 0) + 1;
          lines.push("You read the currents. Hidden motives show themselves.");
        } else {
          ev.heat = (ev.heat || 0) + 1;
          lines.push("A backlash bites your nerves. Something notices you.");
        }
      }
    } else {
      const c = check(0.44, 0.04, "cunning", 0.03);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("You learn the right names and the right doors.");
      } else {
        ev.heat = (ev.heat || 0) + 1;
        applyDamage(2 + Math.max(0, dt - 2));
        lines.push("A small mistake. A cut. A warning delivered in pain.");
      }
    }

    ev.phase = 1;
    ev.text = `Step 2/3 — Do the work.\nEdge: ${ev.edge || 0} • Heat: ${ev.heat || 0}\n\n${lines.join("\n")}`;
    autoSave();
    renderPendingEvent();
    return;
  }

  if (phase === 1) {
    if (a === "push") {
      const c = check(0.38, 0.04, "strength", 0.01);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("You force progress. The job moves because you decide it will.");
      } else {
        ev.heat = (ev.heat || 0) + 2;
        lines.push("You push too hard. The world pushes back.");
      }
    } else if (a === "steady") {
      const c = check(0.42, 0.03, "resilience", 0.02);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("You keep your hands steady and your breath even.");
      } else {
        ev.heat = (ev.heat || 0) + 1;
        lines.push("Fatigue and doubt creep in.");
      }
    } else {
      const c = check(0.40, 0.04, "cunning", 0.02);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("A clean maneuver. No wasted motion.");
      } else {
        ev.heat = (ev.heat || 0) + 1;
        lines.push("You almost slip. Someone hears something.");
      }
    }

    ev.phase = 2;
    ev.text = `Step 3/3 — Leave no loose ends.\nEdge: ${ev.edge || 0} • Heat: ${ev.heat || 0}\n\n${lines.join("\n")}`;
    autoSave();
    renderPendingEvent();
    return;
  }

  if (phase === 2) {
    if (a === "cover") {
      const c = check(0.44, 0.04, "cunning", 0.03);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("You cover tracks and close doors behind you.");
      } else {
        ev.heat = (ev.heat || 0) + 1;
        lines.push("A trail remains. Not obvious. Not invisible.");
      }
    } else if (a === "public") {
      const c = check(0.40, 0.03, "resilience", 0.03);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("You make it official. Witnesses seal the story.");
      } else {
        ev.heat = (ev.heat || 0) + 1;
        lines.push("Too many eyes. Too many questions.");
      }
    } else {
      const c = check(0.38, 0.04, "strength", 0.01);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("You end it decisively. No one doubts who acted.");
      } else {
        ev.heat = (ev.heat || 0) + 2;
        lines.push("You make noise where silence was needed.");
      }
    }

    const finalRoll = Math.random();
    const finalChance = clamp(
      0.36 + approachBonus + (ev.edge || 0) * 0.17 - (ev.heat || 0) * 0.11 + rep * 0.02 + playerStat("cunning") * 0.015 + playerStat("resilience") * 0.012 - pressure * 0.06 - Math.max(0, dt - 2) * 0.03,
      0.06,
      0.92
    );

    appendLog(lines.join("\n"));
    appendLog(`Outcome… (Success chance ~${Math.round(finalChance * 100)}%, roll ${Math.round(finalRoll * 100)})`);

    if (finalRoll < finalChance) {
      appendLog("✅ The task is done — clean enough to count.");
      const bonus = approachKey === "bold" ? 1.1 : (approachKey === "quiet" ? 1.0 : 1.05);
      gainXp(Math.floor((q.rewardXp || 0) * bonus));
      state.gold += Math.floor((q.rewardGold || 0) * bonus);
      adjustReputation(q.faction, approachKey === "bold" ? 2 : 1);
      state.completed = state.completed || { missions: {}, side: {} };
      state.completed.side[q.id] = true;
      state.activeQuest = null;
      state.pendingSide = null;
      state.world.pendingEvent = null;
      autoSave();
      render();
      if (state.hp > 0) {
        showChoices([
          { label: "Another Side Quest", onChoose: () => { activeTab = "side"; questPage = 0; setTabUi(); render(); } },
          { label: "Return to Town", className: "secondary", onChoose: () => enterNode(hubNodeId(state)) },
        ]);
      }
      return;
    }

    appendLog("❌ It slips. Something goes wrong.");
    const riskRoll = Math.random();
    const riskMod = approachKey === "quiet" ? -0.04 : (approachKey === "bold" ? 0.03 : -0.01);
    const threshold = 0.16 + pressure * 0.04 + (ev.heat || 0) * 0.05 + riskMod;

    if (riskRoll < threshold) {
      appendLog("A twist of fate: the task bites back.");
      appendLog("A minor ambush. A broken oath. A door that shouldn’t have been opened.");
      const mob = pickSideMobForQuest(state, q, approachKey);
      const cev = createCombatEvent(state, "side", mob);
      tuneSideCombatEvent(cev, q, approachKey);
      cev.quest = {
        kind: "side",
        id: q.id,
        title: q.title,
        rewardXp: Math.floor((q.rewardXp || 0) * 0.35),
        rewardGold: Math.floor((q.rewardGold || 0) * 0.15),
        returnNode: hubNodeId(state),
        completed: false,
      };
      state.world.pendingEvent = cev;
      autoSave();
      renderPendingEvent();
      return;
    }

    appendLog("You limp away with nothing to show but a lesson.");
    adjustReputation(q.faction, approachKey === "bold" ? -2 : -1);
    gainXp(Math.floor((q.rewardXp || 0) * 0.12));
    state.activeQuest = null;
    state.pendingSide = null;
    state.world.pendingEvent = null;
    autoSave();
    render();
    return;
  }
}

function createMissionNegotiationEvent(s, q) {
  const dt = tierForDifficultyKey(q?.difficulty);
  const rep = (s.reputation && s.reputation[q.faction]) ? s.reputation[q.faction] : 0;
  const pressure = Math.max(0, (q.recLevel || 1) - (s.level || 1));
  const goldCost = Math.max(8, Math.floor((q.gold || 0) * 0.10) + 4 + dt * 2 + pressure * 2);
  return {
    kind: "mission",
    subtype: "negotiate",
    fromNode: s.nodeId || "crossroads",
    phase: 0,
    edge: 0,
    heat: 0,
    goldCost,
    title: `Mission Negotiation — ${q.title}`,
    text: `You work contacts and back doors. One mistake can turn the room into a battlefield.\n\nDifficulty: ${String(q.difficulty || "")} • Recommended level: ${q.recLevel} • Your rep: ${rep}`,
    quest: {
      kind: "mission",
      id: q.id,
      title: q.title,
      rewardXp: q.xp,
      rewardGold: q.gold,
      faction: q.faction,
      returnNode: hubNodeId(s),
      recLevel: q.recLevel,
      difficulty: q.difficulty,
    },
  };
}

function missionNegotiateResolve(actionKey) {
  if (!state) return;
  normalizeState(state);
  const ev = state.world?.pendingEvent;
  if (!ev || ev.kind !== "mission" || ev.subtype !== "negotiate") return;

  const exilePenalty = ev.exileRisk
    ? (typeof ev.exileRiskPenalty === "number" ? ev.exileRiskPenalty : 0.10)
    : 0;

  const q = ev.quest;
  const a = String(actionKey || "").trim().toLowerCase();
  const rep = (state.reputation && state.reputation[q.faction]) ? state.reputation[q.faction] : 0;
  const pressure = Math.max(0, (q.recLevel || 1) - (state.level || 1));
  const dt = tierForDifficultyKey(q.difficulty);
  const phase = Math.max(0, Math.floor(ev.phase || 0));

  if (a === "abort") {
    appendLog("You walk away. Deals left unfinished leave scars.");
    adjustReputation(q.faction, -1);
    state.activeQuest = null;
    state.world.pendingEvent = null;
    autoSave();
    render();
    return;
  }

  const lines = [];
  const roll = Math.random();

  const check = (base, perStat, statKey, repMul) => {
    const stat = playerStat(statKey);
    const chance = clamp(base + stat * perStat + rep * repMul - pressure * 0.04 - Math.max(0, dt - 2) * 0.03 - exilePenalty, 0.10, 0.92);
    return { chance, ok: roll < chance };
  };

  if (phase === 0) {
    if (a === "bribe") {
      const cost = Math.max(1, Math.floor(ev.goldCost || 10));
      if ((state.gold || 0) < cost) {
        lines.push("You reach for coin — but you don't have enough.");
      } else {
        state.gold -= cost;
        const c = clamp(0.62 + rep * 0.05 - pressure * 0.03 - Math.max(0, dt - 2) * 0.04 - exilePenalty, 0.18, 0.90);
        if (roll < c) {
          ev.edge = (ev.edge || 0) + 1;
          lines.push("Coin changes hands. Doors open.");
        } else {
          ev.heat = (ev.heat || 0) + 1;
          lines.push("The bribe draws the wrong attention.");
        }
      }
    } else if (a === "favor") {
      const c = check(0.40, 0.03, "cunning", 0.06);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("A favor is called in. A name is spoken. The room shifts.");
      } else {
        ev.heat = (ev.heat || 0) + 1;
        lines.push("Your name lands wrong. Someone smiles like a knife.");
      }
    } else {
      const c = check(0.44, 0.04, "cunning", 0.03);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("You find leverage. The right words in the right ear.");
      } else {
        ev.heat = (ev.heat || 0) + 1;
        applyDamage(2 + Math.max(0, dt - 2));
        lines.push("A shove in an alley. A warning. Your ribs ache.");
      }
    }

    ev.phase = 1;
    ev.text = `Step 2/3 — Set the terms.\nEdge: ${ev.edge || 0} • Heat: ${ev.heat || 0}\n\n${lines.join("\n")}`;
    autoSave();
    renderPendingEvent();
    return;
  }

  if (phase === 1) {
    if (a === "threaten") {
      const c = check(0.36, 0.04, "strength", 0.02);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("You lean in. The threat lands.");
      } else {
        ev.heat = (ev.heat || 0) + 2;
        lines.push("You overplay it. Hands drift to weapons.");
      }
    } else if (a === "sweeten") {
      const cost = Math.max(1, Math.floor((ev.goldCost || 10) * 0.8));
      if ((state.gold || 0) < cost) {
        lines.push("You can't afford to sweeten the deal.");
      } else {
        state.gold -= cost;
        const c = clamp(0.66 + rep * 0.04 - pressure * 0.03 - Math.max(0, dt - 2) * 0.04 - exilePenalty, 0.20, 0.92);
        if (roll < c) {
          ev.edge = (ev.edge || 0) + 1;
          lines.push("You offer more. The terms soften.");
        } else {
          ev.heat = (ev.heat || 0) + 1;
          lines.push("They take the coin and still demand blood.");
        }
      }
    } else {
      const c = check(0.42, 0.03, "resilience", 0.04);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("You speak steady. They believe you'll deliver.");
      } else {
        ev.heat = (ev.heat || 0) + 1;
        lines.push("Doubt spreads. Someone calls you a liar.");
      }
    }

    ev.phase = 2;
    ev.text = `Step 3/3 — Close and exit.\nEdge: ${ev.edge || 0} • Heat: ${ev.heat || 0}\n\n${lines.join("\n")}`;
    autoSave();
    renderPendingEvent();
    return;
  }

  if (phase === 2) {
    if (a === "public") {
      const c = check(0.38, 0.03, "resilience", 0.05);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("You make it official. Witnesses lock it in.");
      } else {
        ev.heat = (ev.heat || 0) + 1;
        lines.push("Witnesses turn hostile. Too many eyes.");
      }
    } else {
      const c = check(0.44, 0.04, "cunning", 0.03);
      if (c.ok) {
        ev.edge = (ev.edge || 0) + 1;
        lines.push("You slip away clean. No loose ends.");
      } else {
        ev.heat = (ev.heat || 0) + 1;
        lines.push("A tail follows. Footsteps speed up behind you.");
      }
    }

    const finalRoll = Math.random();
    const finalChance = clamp(
      0.34 + (ev.edge || 0) * 0.16 - (ev.heat || 0) * 0.10 + rep * 0.02 + playerStat("cunning") * 0.02 - pressure * 0.05 - Math.max(0, dt - 2) * 0.03 - exilePenalty,
      0.08,
      0.92
    );
    appendLog(lines.join("\n"));
    appendLog(`Negotiation outcome… (Success chance ~${Math.round(finalChance * 100)}%, roll ${Math.round(finalRoll * 100)})`);

    if (finalRoll < finalChance) {
      appendLog("✅ A deal is struck. You avoid bloodshed.");
      state.completed = state.completed || { missions: {}, side: {} };
      state.completed.missions[q.id] = true;
      adjustReputation(q.faction, 1);
      gainXp(q.rewardXp);
      state.gold += q.rewardGold;
      state.activeQuest = null;
      state.world.pendingEvent = null;
      render();
      showChoices([
        { label: "Next Mission", onChoose: () => { activeTab = "missions"; setTabUi(); render(); } },
        { label: "Return to Town", className: "secondary", onChoose: () => enterNode(hubNodeId(state)) },
      ]);
      autoSave();
      return;
    }

    appendLog("❌ Talks collapse. Steel answers.");
    const mob = pickMissionMobForQuest(state, q);
    const cev = createCombatEvent(state, "mission", mob);
    tuneMissionCombatEvent(cev, q);
    cev.quest = {
      kind: "mission",
      id: q.id,
      title: q.title,
      rewardXp: q.rewardXp,
      rewardGold: q.rewardGold,
      faction: q.faction,
      returnNode: hubNodeId(state),
      completed: false,
    };
    pushCombatLog(cev, "⚠️ Negotiation failed: the enemy strikes while you're exposed.");
    enemiesAttack(cev);
    endCombatIfNeeded(cev);
    state.world.pendingEvent = cev;
    autoSave();
    renderPendingEvent();
    return;
  }
}

function attemptMission(q, approach) {
  if (!state) return;
  normalizeState(state);

  const riskLeft = Math.max(0, Math.floor(state.flags?.["exile:riskMissionsLeft"] || 0));
  const applyExileRisk = !!state.flags?.["exile:active"] && !isAdminProfile(state.profile) && riskLeft > 0;
  if (applyExileRisk) {
    state.flags["exile:riskMissionsLeft"] = Math.max(0, riskLeft - 1);
    appendLog(`⚠️ Exile risk: your first missions here are dangerous (-10% mission outcomes). Remaining: ${Math.max(0, riskLeft - 1)}.`);
  }

  if (approach === "scout") {
    appendLog("You move quietly: counting patrols, measuring distances, reading footprints.");
  } else if (approach === "negotiate") {
    appendLog("You seek a soft door: names, favors, and quiet bargains in back rooms.");
  } else {
    appendLog("You go in loud. Sometimes the world moves for the brave.");
  }

  if (approach === "negotiate") {
    const nev = createMissionNegotiationEvent(state, q);
    if (applyExileRisk) {
      nev.exileRisk = true;
      nev.exileRiskPenalty = 0.10;
    }
    state.world.pendingEvent = nev;
    autoSave();
    renderPendingEvent();
    return;
  }

  const mob = pickMissionMobForQuest(state, q);
  const ev = createCombatEvent(state, "mission", mob);
  tuneMissionCombatEvent(ev, q);
  if (applyExileRisk) {
    ev.exileRisk = true;
    ev.exileRiskPenalty = 0.10;
    for (const e of ev.enemies || []) {
      if (!e) continue;
      if (typeof e.atk === "number") e.atk = Math.max(1, Math.floor(e.atk * 1.06));
      if (typeof e.acc === "number") e.acc = clamp(e.acc + 0.02, 0.50, 0.95);
    }
    pushCombatLog(ev, "⚠️ Exile risk: enemies press harder in unfamiliar territory." );
  }
  ev.quest = {
    kind: "mission",
    id: q.id,
    title: q.title,
    rewardXp: q.xp,
    rewardGold: q.gold,
    faction: q.faction,
    returnNode: hubNodeId(state),
    completed: false,
  };
  if (approach === "scout") {
    for (const e of ev.enemies || []) {
      if (!e) continue;
      e.accMod = -0.08;
      e.accModTurns = Math.max(e.accModTurns || 0, 1);
    }
    pushCombatLog(ev, "🧭 Scout advantage: enemy accuracy is reduced." );
  }
  if (approach === "charge") {
    pushCombatLog(ev, "⚡ Charge: the enemy reacts first!" );
    enemiesAttack(ev);
    endCombatIfNeeded(ev);
  }

  state.world.pendingEvent = ev;
  autoSave();
  renderPendingEvent();
}

function beginSideQuest(q, choice) {
  if (!state) return;
  state.pendingSide = { id: q.id, choice };
  appendLog("How will you handle it?");
  showChoices([
    { label: "Quietly (safer)", onChoose: () => finalizeSideQuest(q, choice, "quiet") },
    { label: "Boldly (reputation)", onChoose: () => finalizeSideQuest(q, choice, "bold") },
    { label: "Arcane (costs mana)", onChoose: () => finalizeSideQuest(q, choice, "arcane") },
    { label: "Cancel", className: "secondary", onChoose: () => { state.pendingSide = null; render(); } },
  ]);
  render();
}

function finalizeSideQuest(q, choice, approach) {
  const baseRisk = Math.max(0, q.minLevel - state.level);
  const riskRoll = Math.random();

  if (choice === "refuse") {
    appendLog("You turn away. In Virelia, every refusal becomes a rumor.");
    adjustReputation(q.faction, -1);
    state.activeQuest = null;
    state.pendingSide = null;
    autoSave();
    render();
    showChoices([
      { label: "Back to Quest Board", className: "secondary", onChoose: () => render() },
      { label: "Town", className: "secondary", onChoose: () => enterNode(hubNodeId(state)) },
    ]);
    return;
  }

  if (approach === "arcane") {
    if (state.mana < 6) {
      appendLog("Your mana is too low — the spell fizzles.");
    } else {
      state.mana -= 6;
      appendLog("You weave a small spell. The air tightens, and details sharpen.");
    }
  } else if (approach === "quiet") {
    appendLog("You keep your head down and your words measured.");
  } else {
    appendLog("You do it publicly. Witnesses matter in Virelia.");
  }

  if (choice === "demand") {
    appendLog("You negotiate hard. The world respects strength... and remembers greed.");
    state.gold += Math.floor(q.gold * 0.4);
    if (approach === "bold") adjustReputation(q.faction, -1);
  }

  const tev = createSideTaskEvent(state, q, choice, approach);
  state.world.pendingEvent = tev;
  autoSave();
  renderPendingEvent();
}

function renderStats() {
  if (!state) {
    statsEl.innerHTML = "";
    return;
  }
  normalizeState(state);
  const char = characterSummary(state);
  const pSize = partySize(state);
  const st = effectiveStats(state);
  const learned = state.skills?.learned || {};
  const learnedCount = Object.keys(learned).filter((k) => !!learned[k]).length;
  const effectsCount = activeEffects().length;

  statsEl.innerHTML = "";
  const rows = [
    ["Class", char],
    ["Party", String(pSize)],
    ["Level", String(state.level)],
    ["HP", `${state.hp}/${playerMaxHp()}`],
    ["Mana", `${state.mana}/${playerMaxMana()}`],
    ["Gold", String(state.gold)],
    ["Stats", `S${st.strength || 0} C${st.cunning || 0} A${st.arcana || 0} R${st.resilience || 0}`],
    ["Effects", String(effectsCount)],
    ["Skills", String(learnedCount)],
  ];
  for (const [k, v] of rows) {
    const kv = document.createElement("div");
    kv.className = "kv";
    const kk = document.createElement("div");
    kk.className = "k";
    kk.textContent = k;
    const vv = document.createElement("div");
    vv.textContent = v;
    kv.appendChild(kk);
    kv.appendChild(vv);
    statsEl.appendChild(kv);
  }

  const actions = document.createElement("div");
  actions.className = "row";
  actions.style.justifyContent = "flex-end";

  const btnDetails = document.createElement("button");
  btnDetails.className = "secondary";
  btnDetails.textContent = "Details";
  btnDetails.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openAdvModal();
  });

  actions.appendChild(btnDetails);
  statsEl.appendChild(actions);
}

function clearChoices() {
  choicesEl.innerHTML = "";
}

function weatherForDay(day) {
  const list = ["Clear", "Rain", "Fog", "Wind", "Ashfall", "Stormlight"];
  return list[Math.max(0, (day - 1)) % list.length];
}

function worldTick(actionLabel) {
  if (!state) return;
  normalizeState(state);
  state.world = state.world || { turn: 0, day: 1, weather: "Clear" };
  if (typeof state.world.turn !== "number") state.world.turn = 0;
  if (typeof state.world.day !== "number") state.world.day = 1;
  if (!state.world.weather) state.world.weather = "Clear";

  state.world.turn += 1;
  if (state.world.turn % 12 === 0) {
    state.world.day += 1;
    state.world.weather = weatherForDay(state.world.day);
    appendLog(`🌒 Day ${state.world.day}. Weather: ${state.world.weather}.`);
  }

  const w = state.world.weather;
  const snippets = {
    Clear: ["Lanterns glow", "Bootsteps echo", "Coins clink"],
    Rain: ["Rain drums", "Cloaks drip", "Gutters rush"],
    Fog: ["Fog thickens", "Shapes shift", "Voices blur"],
    Wind: ["Banners snap", "Dust swirls", "Windows rattle"],
    Ashfall: ["Ash drifts", "Coughs rise", "Torches dim"],
    Stormlight: ["Sky cracks", "Air hums", "Hair lifts"],
  };
  const pool = snippets[w] || snippets.Clear;
  const pick = pool[state.world.turn % pool.length];
  appendLog(`⏳ ${pick}. (${actionLabel})`);

  const manaRegen = Math.max(1, 1 + Math.floor(playerStat("arcana") / 12));
  state.mana = Math.min(playerMaxMana(), (state.mana || 0) + manaRegen);
  if (state.party && Array.isArray(state.party.members)) {
    for (const m of state.party.members) {
      if (!m) continue;
      if ((m.hp || 0) <= 0) continue;
      if ((m.maxMana || 0) <= 0) continue;
      m.mana = Math.min(m.maxMana || 0, (m.mana || 0) + 1);
    }
  }
  clampResourcesForState(state);

  if (state.world.day >= 2 && !getFlag("messengerUnlocked")) {
    setFlag("messengerUnlocked", true);
    appendLog("A courier has been asking for you at the Crossroads.");
  }

  const inv = state.arcs?.investigation;
  if (inv && inv.stage === 1 && typeof inv.startedDay === "number") {
    if (state.world.day >= inv.startedDay + 1) {
      inv.stage = 2;
      appendLog("A new lead surfaces: a ledger kept in a lantern-shop cellar.");
    }
  }

  if (maybeQueueMysteryEncounter(actionLabel)) return;
  maybeQueueSkillTraderEncounter(actionLabel);
  maybeQueueHostileEncounter(actionLabel);
}

function maybeQueueTownAttacks(actionLabel) {
  if (!state) return false;
  if (isAdminProfile(state.profile)) return false;
  normalizeState(state);
  if (state.world.pendingEvent) return false;
  if (state.activeQuest) return false;
  if (!state.character?.created) return false;

  const nid = state.nodeId || "crossroads";
  const inHub = nid === "crossroads" || nid === "market" || nid === "gate" || nid === "tavern";
  if (!inHub) return false;

  const label = String(actionLabel || "");
  if (/^Accept:/i.test(label)) return false;
  if (label === "Save") return false;

  const roll = Math.random();
  // 3 times random events for town attacks: single, group, horde
  if (roll < 0.008) {
    // Single monster attacks town/player - Level scales with player, but can be far above
    const lvl = Math.max(1, Math.floor(state.level || 1));
    // Single monster can be 10-50 levels above player for challenge, success drops to 5-2%
    const extraLevels = 10 + Math.floor(Math.random() * 40);
    const mobLevel = lvl + extraLevels;
    const tier = Math.min(5, 1 + Math.floor(mobLevel / 140));
    const idx = (tier - 1) * 60 + 1 + Math.floor(Math.random() * 60);
    const def = mobDef(idx);
    const ev = createCombatEvent(state, "town_single", def);
    ev.encounterKind = "town_single";
    // Scale to mobLevel
    for (const e of ev.enemies) {
      e.recLevel = mobLevel;
      e.maxHp = Math.floor(e.maxHp * (1 + mobLevel * 0.12));
      e.hp = e.maxHp;
      e.atk = Math.floor(e.atk * (1 + mobLevel * 0.08));
      e.name = `[SINGLE Lv${mobLevel}] ${e.name} attacks town!`;
    }
    ev.log = [
      `⚠️ Town Attack - SINGLE Monster (Lv${mobLevel})!`,
      `A lone ${ev.enemies[0].name} rushes the town gates.`,
      `If you are far below Lv${mobLevel}, success rate drops to 5% or 2%!`,
    ];
    state.world.pendingEvent = ev;
    return true;
  } else if (roll < 0.015) {
    // Group of 3-4 monsters attacks
    const lvl = Math.max(1, Math.floor(state.level || 1));
    const extraLevels = 5 + Math.floor(Math.random() * 30);
    const mobLevel = lvl + extraLevels;
    const tier = Math.min(5, 1 + Math.floor(mobLevel / 140));
    const ev = createCombatEvent(state, "town_group", mobDef((tier-1)*60+10));
    ev.encounterKind = "town_group";
    // Add 2-3 extra
    const extraCount = 2 + Math.floor(Math.random()*2);
    for (let i=0;i<extraCount;i++) {
      const idx = (tier - 1) * 60 + 1 + Math.floor(Math.random() * 60);
      const def = mobDef(idx);
      const e = { ...def, hp: def.maxHp, maxHp: Math.floor(def.maxHp * (1 + mobLevel*0.12)), atk: Math.floor(def.atk * (1 + mobLevel*0.08)) };
      e.recLevel = mobLevel;
      e.name = `[GROUP Lv${mobLevel}] ${e.name}`;
      e.hp = e.maxHp;
      ev.enemies.push(e);
    }
    for (const e of ev.enemies) {
      e.recLevel = mobLevel;
      e.maxHp = Math.floor((e.maxHp || 40) * (1 + mobLevel * 0.12));
      e.hp = e.maxHp;
      e.atk = Math.floor((e.atk || 8) * (1 + mobLevel * 0.08));
      e.name = e.name.includes("Lv") ? e.name : `[GROUP Lv${mobLevel}] ${e.name} attacks!`;
    }
    ev.log = [
      `⚠️ Town Attack - GROUP of ${ev.enemies.length} monsters (Lv${mobLevel})!`,
      `A pack rushes from the wilds. Town militia calls for help.`,
      `Far above your level? Success drops to 5-2%!`,
    ];
    state.world.pendingEvent = ev;
    return true;
  } else if (roll < 0.020) {
    // Horde attacks town - 6-9 monsters, like mini siege
    const lvl = Math.max(1, Math.floor(state.level || 1));
    const extraLevels = Math.floor(Math.random() * 20);
    const mobLevel = Math.max(60, lvl + extraLevels); // at least 60 as requested for horde
    const tier = Math.min(5, 1 + Math.floor(mobLevel / 140));
    const count = 6 + Math.floor(Math.random()*4);
    const enemies = [];
    for (let i=0;i<count;i++) {
      const idx = (tier - 1) * 60 + 1 + Math.floor(Math.random() * 60);
      const def = mobDef(idx);
      const e = { ...def, hp: def.maxHp };
      e.recLevel = mobLevel;
      e.maxHp = Math.floor((e.maxHp || 40) * (2.0 + mobLevel * 0.10));
      e.hp = e.maxHp;
      e.atk = Math.floor((e.atk || 8) * (1.5 + mobLevel * 0.07));
      e.name = `[HORDE Lv${mobLevel}] ${e.name}`;
      enemies.push(e);
    }
    const ev = {
      kind: "combat",
      fromNode: state.nodeId || "crossroads",
      stage: "combat",
      encounterKind: "town_horde",
      log: [
        `🚨 Town Attack - HORDE of ${count} monsters (Lv${mobLevel})!`,
        `Horns blare! A horde crashes into town! This is 3rd type of random town attack.`,
        `If you are far below Lv${mobLevel}, success rate drops to 2%!`,
      ],
      enemies,
      guard: {},
      defeated: {},
      didLoot: false,
      didSearch: false,
      didReward: false,
      partyDmgBoost: 0,
      partyDmgBoostTurns: 0,
      escapeBoost: 0,
      escapeBoostTurns: 0,
      quest: null,
    };
    state.world.pendingEvent = ev;
    return true;
  }
  return false;
}

function maybeQueueHostileEncounter(actionLabel) {
  if (!state) return;
  if (isAdminProfile(state.profile)) return;
  normalizeState(state);
  if (state.world.pendingEvent) return;
  if (state.activeQuest) return;
  if (!state.character?.created) return;

  const nid = state.nodeId || "crossroads";
  const inHub = nid === "crossroads" || nid === "market" || nid === "gate";
  if (!inHub) return;

  const label = String(actionLabel || "");
  if (/^Accept:/i.test(label)) return;
  if (label === "Save") return;

  // First try town attacks (3 types: single, group, horde)
  if (maybeQueueTownAttacks(actionLabel)) return;

  const chance = 0.015;
  if (Math.random() >= chance) return;

  state.world.pendingEvent = createCombatEvent(state, "ambush");
}

function maybeQueueSkillTraderEncounter(actionLabel) {
  if (!state) return;
  if (isAdminProfile(state.profile)) return;
  normalizeState(state);
  if (state.world.pendingEvent) return;
  if (state.activeQuest) return;
  if (!state.character?.created) return;

  const nid = state.nodeId || "crossroads";
  const inHub = nid === "crossroads" || nid === "market" || nid === "gate";
  if (!inHub) return;

  const label = String(actionLabel || "");
  if (/^Accept:/i.test(label)) return;

  const chance = 0.02;
  if (Math.random() >= chance) return;
  state.world.pendingEvent = createSkillTraderEvent(state);
}

function statCheckPass(statKey, base, per, min, max) {
  const k = String(statKey || "").trim().toLowerCase();
  const chance = clamp((base || 0) + playerStat(k) * (per || 0), min || 0, max || 1);
  return Math.random() < chance;
}

function createMysteryEvent(s) {
  const pSize = partySize(s);
  const pick = weightedPick([
    { k: "eyes", w: 4 },
    { k: "door", w: 3 },
    { k: "cache", w: 3 },
    { k: "companion", w: pSize > 1 ? 3 : 0 },
  ]);
  const subtype = pick?.k || "eyes";
  const out = {
    kind: "mystery",
    fromNode: s.nodeId || "crossroads",
    subtype,
    phase: "prompt",
    title: "Something Happens",
    text: "",
    carry: [],
  };

  if (subtype === "eyes") {
    out.title = "A Pair of Eyes";
    out.text = "A pair of eyes watches you from the alley shadow. You feel the city holding its breath.";
    return out;
  }
  if (subtype === "door") {
    out.title = "A Door Slams";
    out.text = "A door slams behind you. The latch clicks. The air smells like old oil and wet stone.";
    return out;
  }
  if (subtype === "cache") {
    out.title = "A Warded Cache";
    out.text = "You find a small cache sealed with runes. The lock hums faintly.";
    return out;
  }

  const members = Array.isArray(s.party?.members) ? s.party.members.filter((m) => m && (m.hp || 0) > 0) : [];
  const c = members.length ? members[Math.floor(Math.random() * members.length)] : null;
  out.companionId = c?.id || null;
  out.companionName = c?.name || "Companion";
  out.variant = (Math.random() < 0.55) ? "trouble" : "discovery";
  out.title = out.variant === "trouble" ? "A Companion Stumbles" : "A Companion Signals";
  out.text = out.variant === "trouble"
    ? `${out.companionName} stumbles and grips their side. "Something hit me…"`
    : `${out.companionName} catches your sleeve. "Quiet. I found something."`;
  return out;
}

function maybeQueueMysteryEncounter(actionLabel) {
  if (!state) return false;
  if (isAdminProfile(state.profile)) return false;
  normalizeState(state);
  if (state.world.pendingEvent) return false;
  if (state.activeQuest) return false;
  if (!state.character?.created) return false;

  const nid = state.nodeId || "crossroads";
  const inHub = nid === "crossroads" || nid === "market" || nid === "gate";
  if (!inHub) return false;

  const label = String(actionLabel || "");
  if (/^Accept:/i.test(label)) return false;
  if (label === "Save") return false;

  const chance = 0.03;
  if (Math.random() >= chance) return false;
  state.world.pendingEvent = createMysteryEvent(state);
  return true;
}

function mysteryResolve(actionKey) {
  if (!state) return;
  normalizeState(state);
  const ev = state.world?.pendingEvent;
  if (!ev || ev.kind !== "mystery") return;

  const a = String(actionKey || "").trim();
  if (a === "continue") {
    const back = ev.fromNode || state.nodeId || "crossroads";
    state.logCarry = Array.isArray(ev.carry) ? ev.carry.slice(-8) : [];
    state.world.pendingEvent = null;
    autoSave();
    enterNode(back);
    return;
  }
  if (ev.phase !== "prompt") return;

  const lines = [];

  if (ev.subtype === "eyes") {
    if (a === "torch") {
      if (!consumeInvItem(state, "torch", 1)) {
        lines.push("You reach for a torch — but you have none.");
      } else {
        addEffect("torchlight", 12000);
        const ok = statCheckPass("cunning", 0.55, 0.03, 0.20, 0.90);
        if (ok) {
          const gold = 6 + Math.floor(Math.random() * 10);
          state.gold = (state.gold || 0) + gold;
          lines.push("You raise the torch. The watcher flinches and disappears.");
          lines.push(`You find dropped coin. (+${gold} gold)`);
        } else {
          lines.push("The light only shows empty brick. The feeling remains.");
        }
      }
    } else if (a === "investigate") {
      const ok = statCheckPass("cunning", 0.42, 0.04, 0.15, 0.88);
      if (ok) {
        const gold = 4 + Math.floor(Math.random() * 9);
        state.gold = (state.gold || 0) + gold;
        if (Math.random() < 0.35) addInvItem(state, "lockpick", 1);
        lines.push("You slip into the shadow and catch a whisper of footsteps.");
        lines.push(`You recover something useful. (+${gold} gold)`);
      } else {
        applyDamage(3);
        lines.push("You step wrong. Something sharp grazes you in the dark.");
        lines.push("(-3 HP)");
      }
    } else {
      lines.push("You keep moving. Whatever watched you chooses not to follow.");
    }
  } else if (ev.subtype === "door") {
    if (a === "lockpick") {
      if (!consumeInvItem(state, "lockpick", 1)) {
        lines.push("You pat your pockets — no lockpicks.");
      } else {
        const ok = statCheckPass("cunning", 0.50, 0.04, 0.20, 0.92);
        if (ok) {
          const k = pickCombatDropKey(2);
          addInvItem(state, k, 1);
          lines.push("The lock yields with a soft click.");
          lines.push(`Inside, you grab: ${itemLabel(k)}.`);
        } else {
          applyDamage(4);
          lines.push("The pick snaps. You force the door and cut yourself on the latch.");
          lines.push("(-4 HP)");
        }
      }
    } else if (a === "force") {
      const ok = statCheckPass("strength", 0.46, 0.04, 0.18, 0.90);
      if (ok) {
        const gold = 8 + Math.floor(Math.random() * 12);
        state.gold = (state.gold || 0) + gold;
        lines.push("You shoulder the door open. The hinges scream.");
        lines.push(`You find loose coin on the floor. (+${gold} gold)`);
      } else {
        applyDamage(2);
        lines.push("The door holds. You bruise your shoulder and back away.");
        lines.push("(-2 HP)");
      }
    } else if (a === "rune") {
      if (!consumeInvItem(state, "rune_shard", 1)) {
        lines.push("You reach for a rune shard — but you don't have one.");
      } else {
        const k = pickCombatDropKey(3);
        addInvItem(state, k, 1);
        lines.push("The rune shard warms and the latch releases like it was never locked.");
        lines.push(`You salvage: ${itemLabel(k)}.`);
      }
    } else {
      lines.push("You take a slow breath and wait. Eventually the pressure passes.");
    }
  } else if (ev.subtype === "cache") {
    if (a === "rune") {
      if (!consumeInvItem(state, "rune_shard", 1)) {
        lines.push("You have no rune shard to answer the ward.");
      } else {
        const k = pickCombatDropKey(3);
        addInvItem(state, k, 1);
        lines.push("Runes unwind and fade. The cache opens.");
        lines.push(`You claim: ${itemLabel(k)}.`);
      }
    } else if (a === "ember") {
      if (!consumeInvItem(state, "ember_gem", 1)) {
        lines.push("You have no ember gem to burn the seal.");
      } else {
        const gold = 12 + Math.floor(Math.random() * 18);
        state.gold = (state.gold || 0) + gold;
        lines.push("The ember gem flares. The seal cracks and crumbles.");
        lines.push(`You find coin and scraps of value. (+${gold} gold)`);
      }
    } else if (a === "lockpick") {
      if (!consumeInvItem(state, "lockpick", 1)) {
        lines.push("You have no lockpicks.");
      } else {
        const ok = statCheckPass("cunning", 0.44, 0.04, 0.16, 0.90);
        if (ok) {
          const k = pickCombatDropKey(2);
          addInvItem(state, k, 1);
          lines.push("You bypass the mechanism without waking the ward.");
          lines.push(`You take: ${itemLabel(k)}.`);
        } else {
          applyDamage(3);
          lines.push("The ward bites your fingers with cold pain.");
          lines.push("(-3 HP)");
        }
      }
    } else {
      lines.push("You leave the cache alone. Some doors stay shut for a reason.");
    }
  } else if (ev.subtype === "companion") {
    const id = ev.companionId;
    const c = id ? findPartyMemberById(state, id) : null;

    if (ev.variant === "trouble") {
      if (a === "bandage") {
        if (!consumeInvItem(state, "bandage", 1)) lines.push("No bandages.");
        else {
          const heal = Math.max(6, 12 + playerStat("resilience") * 2);
          const did = healPartyTarget(id, heal);
          lines.push(`You bind the wound. ${ev.companionName} steadies. (+${did} HP)`);
        }
      } else if (a === "cloth") {
        if (!consumeInvItem(state, "cloth", 1)) lines.push("No cloth.");
        else {
          const did = healPartyTarget(id, 8);
          lines.push(`You tear cloth into wraps. (+${did} HP)`);
        }
      } else if (a === "sageleaf") {
        if (!consumeInvItem(state, "herb_sageleaf", 1)) lines.push("No sageleaf.");
        else {
          const did = healPartyTarget(id, 10);
          lines.push(`You grind sageleaf into a paste and apply it. (+${did} HP)`);
        }
      } else {
        const ok = statCheckPass("resilience", 0.48, 0.04, 0.18, 0.90);
        if (ok) {
          const did = healPartyTarget(id, 6);
          lines.push(`You help ${ev.companionName} breathe through it. (+${did} HP)`);
        } else {
          if (c) c.hp = Math.max(1, Math.floor((c.hp || 1) - 6));
          lines.push(`${ev.companionName} worsens. You need supplies next time.`);
        }
      }
    } else {
      if (a === "investigate") {
        const ok = statCheckPass("cunning", 0.44, 0.04, 0.16, 0.90);
        if (ok) {
          const k = pickCombatDropKey(2);
          addInvItem(state, k, 1);
          lines.push(`${ev.companionName} leads you to a hidden niche.`);
          lines.push(`You take: ${itemLabel(k)}.`);
        } else {
          lines.push("It's a false lead. Whoever passed here covered their trail well.");
        }
      } else if (a === "torch") {
        if (!consumeInvItem(state, "torch", 1)) lines.push("No torch.");
        else {
          addEffect("torchlight", 12000);
          const k = pickCombatDropKey(2);
          addInvItem(state, k, 1);
          lines.push("In torchlight, the hidden mark becomes obvious.");
          lines.push(`You recover: ${itemLabel(k)}.`);
        }
      } else {
        lines.push("You wave them off. Not every whisper is worth chasing.");
      }
    }
  }

  ev.phase = "result";
  ev.resultText = lines.join("\n") || "Nothing happens.";
  ev.carry = lines;
  autoSave();
  renderPendingEvent();
}

function roamAreaDef(key) {
  const k = String(key || "").trim().toLowerCase();
  const defs = {
    streets: { key: "streets", label: "Low Streets", desc: "Lantern haze, cheap wine, watchful eyes.", encounterBase: 0.10 },
    docks: { key: "docks", label: "Dock Warrens", desc: "Salt air, ropes, and knives traded like handshakes.", encounterBase: 0.12 },
    ruins: { key: "ruins", label: "Old Ruins", desc: "Broken stone and old curses that never fully left.", encounterBase: 0.16 },
    marsh: { key: "marsh", label: "Fog Marsh", desc: "Wet ground, muffled sounds, and shapes that move wrong.", encounterBase: 0.18 },
    road: { key: "road", label: "Open Road", desc: "The road between places: safer, but never safe.", encounterBase: 0.08 },
  };
  return defs[k] || defs.streets;
}

function ensureRoamState(s) {
  if (!s) return null;
  s.roam = s.roam || {};
  if (!s.roam.areaKey) s.roam.areaKey = "streets";
  if (typeof s.roam.risk !== "number") s.roam.risk = 0;
  if (typeof s.roam.steps !== "number") s.roam.steps = 0;
  s.roam.risk = clamp(Math.floor(s.roam.risk), 0, 100);
  s.roam.steps = Math.max(0, Math.floor(s.roam.steps));
  return s.roam;
}

function roamDangerLabel(risk) {
  const r = clamp(Math.floor(risk || 0), 0, 100);
  if (r <= 33) return "Green";
  if (r <= 70) return "Orange";
  return "Red";
}

function weightedPick(entries) {
  const list = Array.isArray(entries) ? entries : [];
  let total = 0;
  for (const e of list) total += Math.max(0, e.w || 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const e of list) {
    roll -= Math.max(0, e.w || 0);
    if (roll <= 0) return e;
  }
  return list[list.length - 1] || null;
}

function roamLoot(s, areaKey) {
  const area = roamAreaDef(areaKey);
  const common = [
    { k: "bandage", w: 20 },
    { k: "health_potion", w: 14 },
    { k: "mana_potion", w: 12 },
    { k: "smoke_bomb", w: 6 },
    { k: "tonic", w: 8 },
  ];
  const wild = [
    { k: "herb_sageleaf", w: 16 },
    { k: "herb_nightbloom", w: 10 },
    { k: "rune_shard", w: 5 },
    { k: "ember_gem", w: 3 },
  ];
  const pool = (area.key === "marsh" || area.key === "ruins") ? common.concat(wild) : common;
  const pick = weightedPick(pool);
  if (!pick || !pick.k) return;
  addInvItem(s, pick.k, 1);
  appendLog(`You find: ${itemLabel(pick.k)}.`);
}

function roamRumor() {
  const pool = [
    "A patrol captain has been replacing routes without telling the rank-and-file.",
    "A lantern-shop owner keeps two ledgers: one for customers, one for ghosts.",
    "Someone is paying in old coin to move sealed letters through back alleys.",
    "A mercenary band is recruiting — but only for those who already have scars.",
    "Fog nights make the city listen. The wrong words carry farther than they should.",
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

function roamMaybeEncounter(s, areaKey) {
  if (!s) return false;
  if (isAdminProfile(s.profile)) return false;
  if (s.world?.pendingEvent) return false;
  const roam = ensureRoamState(s);
  const area = roamAreaDef(areaKey);
  const risk = clamp(roam.risk, 0, 100);

  const forced = risk >= 90;
  const chance = clamp(area.encounterBase + risk / 180, 0, 0.85);
  if (!forced && Math.random() >= chance) return false;

  appendLog("⚠️ Trouble finds you.");
  s.world.pendingEvent = createCombatEvent(s, "ambush");
  roam.risk = clamp(roam.risk - 35, 0, 100);
  return true;
}

function roamMaybeSkillTrader(s) {
  if (!s) return false;
  if (isAdminProfile(s.profile)) return false;
  if (s.world?.pendingEvent) return false;
  const chance = 0.05;
  if (Math.random() >= chance) return false;
  appendLog("A cloaked figure signals you from the edge of the light.");
  s.world.pendingEvent = createSkillTraderEvent(s);
  return true;
}

function roamAct(s, kind) {
  if (!s) return;
  normalizeState(s);
  if (typeof isCombatActive === 'function' && isCombatActive(s)) {
    appendLog("You can't rest during combat.");
    return;
  }
  if (typeof hasEffectOnState === 'function' && hasEffectOnState(s, "rested")) {
    appendLog("You aren't ready to rest again yet. (Rested cooldown active)");
    return;
  }
  const roam = ensureRoamState(s);
  const area = roamAreaDef(roam.areaKey);
  roam.steps += 1;

  if (kind === "rest") {
    roam.risk = clamp(roam.risk - 30, 0, 100);
    s.hp = Math.min(s.maxHp || 1, (s.hp || 0) + 2);
    s.mana = Math.min(typeof playerMaxMana === 'function' ? playerMaxMana() : (s.maxMana||0), (s.mana||0)+1);
    appendLog("You slow your breathing and let the noise pass. (+2 HP, +1 mana)");
    if (typeof addEffect === 'function') addEffect("rested", 15000);
    if (typeof autoSave === 'function') autoSave();
    if (typeof render === 'function') render();
    return;
  }

  if (kind === "scout") {
    roam.risk = clamp(roam.risk + 10, 0, 100);
    if (Math.random() < 0.55) {
      appendLog(`Rumor: ${roamRumor()}`);
      return;
    }
    if (roamMaybeSkillTrader(s)) return;
    appendLog("You map faces and exits. Nothing bites — yet.");
    return;
  }

  if (kind === "forage") {
    roam.risk = clamp(roam.risk + 14, 0, 100);
    if (roamMaybeEncounter(s, area.key)) return;
    if (Math.random() < 0.70) roamLoot(s, area.key);
    else appendLog("You find nothing worth taking.");
    return;
  }

  roam.risk = clamp(roam.risk + 18, 0, 100);
  if (roamMaybeEncounter(s, area.key)) return;
  if (roamMaybeSkillTrader(s)) return;
  if (Math.random() < 0.35) {
    const gold = 3 + Math.floor(Math.random() * 10);
    s.gold = (s.gold || 0) + gold;
    appendLog(`You pick up loose coin in the gutter. (+${gold} gold)`);
    return;
  }
  if (Math.random() < 0.35) {
    roamLoot(s, area.key);
    return;
  }
  appendLog(`You move through ${area.label}. The city watches back.`);
}

const DESTINATION_COUNT = 50;
const DESTINATIONS_PER_PAGE = 10;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function seededPick(seed, arr) {
  const list = Array.isArray(arr) ? arr : [];
  if (!list.length) return "";
  const h = hashString(String(seed || ""));
  return list[h % list.length];
}

function buildDestinationDefs() {
  const a = ["Ash", "Lantern", "Moon", "Cinder", "Iron", "Glass", "Fog", "Shadow", "Salt", "Storm", "Dawn", "Grave", "Gutter", "Hollow", "Bitter", "Black", "White", "Copper", "Sable", "Bright"];
  const b = ["Quarter", "Row", "Spur", "Crossing", "Stairs", "Arcade", "Spire", "Canal", "Cistern", "Shrine", "Bridge", "Vault", "Yard", "Lane", "Court", "Bazaar", "Foundry", "Chapel", "Wharf", "Gate"];
  const moods = [
    "Whispers cling to the brickwork.",
    "The air tastes like oil and rain.",
    "Lanternlight fights a losing war.",
    "Footsteps echo where they shouldn’t.",
    "Old stone remembers names.",
    "A watchful silence hangs over the crowd.",
    "The city feels thin here — like paper.",
    "Someone has been here recently, and they were careful.",
  ];
  const hooks = [
    "A missing courier was last seen here.",
    "A guard patrol changes routes near this place.",
    "A cellar door is rumored to hide accounts and secrets.",
    "Mercenaries take contracts in the shadows nearby.",
    "A shrine-bell rings when no one touches it.",
    "Smugglers trade coin for silence.",
    "A rival faction keeps eyes on this corner.",
    "Something valuable is said to be hidden in plain sight.",
  ];
  const itemAdj = ["Sealed", "Etched", "Frayed", "Oil-scented", "Moonlit", "Ash-stained", "Copper", "Runed", "Blackglass", "Stormmarked", "Hollow", "Worn", "Threadbare", "Gilded", "Sooty", "Silvered"];
  const itemNoun = ["Token", "Key", "Charm", "Map Scrap", "Signet", "Shard", "Medallion", "Ledger Page", "Badge", "Coin", "Ribbon", "Seal", "Ring", "Vial", "Talisman", "Note"];
  const itemUses = [
    "It feels like evidence.",
    "It smells faintly of lantern oil.",
    "It might open doors later.",
    "It could be traded for favors in the right hands.",
    "It’s a clue that someone important passed through.",
    "It ties this place to the city’s hidden routes.",
  ];
  const stats = ["cunning", "strength", "arcana", "resilience"];

  const out = [];
  for (let i = 1; i <= DESTINATION_COUNT; i++) {
    const id = `dest_${pad2(i)}`;
    const name = `${seededPick(`${id}:a`, a)} ${seededPick(`${id}:b`, b)}`;
    const mood = seededPick(`${id}:m`, moods);
    const hook = seededPick(`${id}:h`, hooks);
    const itemKey = `loc_${pad2(i)}`;
    const itemLabel = `${seededPick(`${id}:ia`, itemAdj)} ${seededPick(`${id}:in`, itemNoun)}`;
    const itemDesc = `Found at ${name}. ${seededPick(`${id}:iu`, itemUses)}`;
    const findStat = seededPick(`${id}:s`, stats);
    const encounterBase = 0.06 + (hashString(id) % 15) / 100;
    out.push({ i, id, name, mood, hook, itemKey, itemLabel, itemDesc, findStat, encounterBase });
  }
  return out;
}

const DESTINATIONS = buildDestinationDefs();

function destinationDefById(id) {
  const k = String(id || "").trim();
  const m = /^dest_(\d\d)$/i.exec(k);
  if (!m) return null;
  const idx = Math.max(1, Math.min(DESTINATION_COUNT, parseInt(m[1], 10)));
  return DESTINATIONS[idx - 1] || null;
}

function destinationFoundFlag(def) {
  return def ? `found_${def.id}` : "";
}

function destinationAct(s, def, kind) {
  if (!s || !def) return;
  normalizeState(s);
  if (typeof isCombatActive === 'function' && isCombatActive(s)) {
    appendLog("You can't rest during combat.");
    return;
  }
  if (typeof hasEffectOnState === 'function' && hasEffectOnState(s, "rested")) {
    appendLog("You aren't ready to rest again yet. (Rested cooldown active)");
    return;
  }
  const msgA = [
    `A door closes somewhere behind you in ${def.name}.`,
    `A pair of eyes track you from the edge of ${def.name}.`,
    `You catch a fragment of a coded phrase — then it’s gone.`,
    `The lanterns here burn low, but they burn stubborn.`,
  ];
  const msgB = [
    "You keep your pace steady and your hands ready.",
    "You blend in, then slip away.",
    "You watch corners, exits, and reflections.",
    "You move like you belong here.",
  ];

  if (kind === "rest") {
    s.hp = Math.min(s.maxHp || 1, (s.hp || 0) + 2);
    s.mana = Math.min(typeof playerMaxMana === 'function' ? playerMaxMana() : (s.maxMana||0), (s.mana||0)+1);
    appendLog("You take a breath and let the crowd swallow your presence. (+2 HP, +1 mana)");
    if (typeof addEffect === 'function') addEffect("rested", 15000);
    if (typeof autoSave === 'function') autoSave();
    if (typeof render === 'function') render();
    return;
  }

  if (kind === "listen") {
    appendLog(`Rumor: ${roamRumor()}`);
    return;
  }

  if (!isAdminProfile(s.profile) && !s.world?.pendingEvent) {
    const chance = clamp(def.encounterBase + ((hashString(def.id + ":turn") % 10) / 100), 0, 0.60);
    if (Math.random() < chance) {
      appendLog("⚠️ Trouble finds you.");
      s.world.pendingEvent = createCombatEvent(s, "ambush");
      return;
    }
  }

  if (Math.random() < 0.30) {
    const gold = 2 + Math.floor(Math.random() * 8);
    s.gold = (s.gold || 0) + gold;
    appendLog(seededPick(`${def.id}:g`, msgA));
    appendLog(`You find loose coin tucked under rubble. (+${gold} gold)`);
    return;
  }

  if (Math.random() < 0.30) {
    roamLoot(s, "streets");
    appendLog(seededPick(`${def.id}:l`, msgB));
    return;
  }

  appendLog(seededPick(`${def.id}:w`, msgA));
}

function registerDestinations() {
  for (const def of DESTINATIONS) {
    if (!ITEM_CATALOG[def.itemKey]) {
      ITEM_CATALOG[def.itemKey] = { label: def.itemLabel, consumable: false, desc: def.itemDesc };
    }
    STORY[def.id] = {
      text: (s) => {
        const found = !!getFlag(destinationFoundFlag(def));
        const foundLine = found ? `Recovered: ${itemLabel(def.itemKey)}.` : "A unique item is rumored to be hidden here.";
        return `${def.name}\n${partyLine(s)}\n${def.mood}\n${def.hook}\n${foundLine}`;
      },
      choices: (s) => {
        const found = !!getFlag(destinationFoundFlag(def));
        const statLabel = titleCaseWord(def.findStat);
        const searchLabel = `Search for the local find (${statLabel})`;
        return [
          { label: "Explore", next: def.id, effect: () => destinationAct(s, def, "explore") },
          { label: "Listen for rumors", next: def.id, effect: () => destinationAct(s, def, "listen") },
          {
            label: searchLabel,
            next: def.id,
            disabled: found,
            check: { stat: def.findStat, base: 0.52, per: 0.04, min: 0.18, max: 0.92 },
            success: {
              text: `You spot the telltale mark and pull it free: ${itemLabel(def.itemKey)}.`,
              effect: () => {
                setFlag(destinationFoundFlag(def), true);
                addInvItem(s, def.itemKey, 1);
                openItemModal(def.itemKey);
              },
            },
            failForward: {
              text: `You get what you came for — but someone notices. You leave with ${itemLabel(def.itemKey)} anyway.`,
              effect: () => {
                setFlag(destinationFoundFlag(def), true);
                addInvItem(s, def.itemKey, 1);
                applyDamage(4);
                openItemModal(def.itemKey);
              },
            },
            fail: {
              text: "You search too long. The place turns hostile.",
              effect: () => {
                applyDamage(6);
              },
            },
          },
          { label: "Rest (+2 HP)", next: def.id, effect: () => destinationAct(s, def, "rest") },
          { label: "Back to Destinations", className: "secondary", next: "travel_destinations", effect: () => { s.destPage = Math.floor((def.i - 1) / DESTINATIONS_PER_PAGE); } },
          { label: "Back to Crossroads", className: "secondary", next: "crossroads" },
        ];
      },
    };
  }
}

function createSkillTraderEvent(s) {
  const prof = s.character?.profession || "fighter";
  const build = s.character?.build || "balanced";
  const playerLvl = Math.max(1, Math.floor(s.level || 1));
  const offers = [];
  const offerBases = new Set();
  const learned = s.skills?.learned || {};
  // Tier requirement mapping as hard as level suggests
  const tierReqMap = {1:1, 2:25, 3:70, 4:150, 5:300, 6:500, 7:650};
  let tries = 0;
  while (offers.length < 6 && tries < 1200) {
    tries += 1;
    const idx = 1 + Math.floor(Math.random() * SKILLS_PER_COMBO);
    const k = skillKeyFor(prof, build, idx);
    if (learned[k]) continue;
    if (offers.includes(k)) continue;
    if (typeof canLearnSkillByBaseLabel === "function" && !canLearnSkillByBaseLabel(s, k)) continue;
    const def = skillDef(k);
    const tier = Math.max(1, Math.floor(def.tier || 1));
    const req = tierReqMap[tier] || tier*100;
    // Only offer skills where requirement is not too far above player level - as hard as level suggests
    // Allow up to 15 levels above current for challenge, but not 100+ above
    if (req > playerLvl + 15) {
      // 30% chance to still show high-tier as preview but locked? For now skip if too high
      if (Math.random() < 0.7) continue;
    }
    const base = (typeof skillFamilyIdForKey === "function") ? String(skillFamilyIdForKey(k) || "").trim() : "";
    if (base && offerBases.has(base)) continue;
    offers.push(k);
    if (base) offerBases.add(base);
  }
  // If not enough offers due to level filter, fill with lower tier
  if (offers.length < 3) {
    for (let i=1; i<=SKILLS_PER_COMBO && offers.length < 6; i++) {
      const k = skillKeyFor(prof, build, i);
      if (learned[k]) continue;
      if (offers.includes(k)) continue;
      const def = skillDef(k);
      const tier = Math.max(1, Math.floor(def.tier || 1));
      const req = tierReqMap[tier] || 1;
      if (req > playerLvl) continue;
      offers.push(k);
    }
  }
  return {
    kind: "skillTrader",
    fromNode: s.nodeId || "crossroads",
    profession: prof,
    build,
    offers,
    playerLevel: playerLvl,
  };
}

function buySkillFromTrader(skillKey) {
  if (!state) return;
  normalizeState(state);
  const k = String(skillKey || "").trim();
  if (!k) return;
  if (state.skills.learned[k]) {
    appendLog("Already learned.");
    renderPendingEvent();
    return;
  }
  if (typeof canLearnSkillByBaseLabel === "function" && !canLearnSkillByBaseLabel(state, k)) {
    appendLog("You already know a stronger version of that skill.");
    renderPendingEvent();
    return;
  }

  const def = skillDef(k);
  const cost = skillPointCost(def);
  if ((state.skillPoints || 0) < cost) {
    appendLog(`Not enough Skill Points. Need ${cost}.`);
    renderPendingEvent();
    return;
  }

  state.skillPoints -= cost;
  state.skills.sources = (state.skills.sources && typeof state.skills.sources === "object") ? state.skills.sources : {};
  const src = state.skills.sources[k] || skillSourceForKey(state, k, def);
  if (typeof replaceLearnedSkillByBaseLabel === "function") {
    replaceLearnedSkillByBaseLabel(state, k, 1, src);
  } else {
    state.skills.learned[k] = 1;
    if (!state.skills.sources[k]) state.skills.sources[k] = src;
  }
  playChirp([560, 820, 1120], 190, "triangle", 0.055, 0);
  appendLog(`✨ Learned from a Skill Trader: ${def.label}. (-${cost} Skill Points)`);
  autoSave();
  renderPendingEvent();
}

function renderPendingEvent() {
  if (!state) return;
  normalizeState(state);
  const ev = state.world?.pendingEvent;
  if (!ev) return;
  if (ev.kind === "side" && ev.subtype === "task") {
    outputEl.innerHTML = "";
    choicesEl.innerHTML = "";
    if (questListEl) questListEl.innerHTML = "";

    const header = document.createElement("div");
    header.className = "line";
    header.textContent = ev.title || "Side Task";
    outputEl.appendChild(header);

    const body = document.createElement("div");
    body.className = "hint";
    body.style.whiteSpace = "pre-wrap";
    body.textContent = ev.text || "";
    outputEl.appendChild(body);

    const phase = Math.max(0, Math.floor(ev.phase || 0));
    if (phase === 0) {
      const bribeCost = Math.max(1, Math.floor(ev.goldCost || 10));
      showChoices([
        { label: "Gather Rumors (Cunning)", onChoose: () => sideTaskResolve("rumors") },
        { label: "Arcane Read (Arcana + mana)", className: "secondary", onChoose: () => sideTaskResolve("arcane") },
        { label: `Bribe (${bribeCost} gold)`, className: "secondary", disabled: (state.gold || 0) < bribeCost, onChoose: () => sideTaskResolve("bribe") },
        { label: "Abort", className: "secondary", onChoose: () => sideTaskResolve("abort") },
      ]);
    } else if (phase === 1) {
      showChoices([
        { label: "Steady Hands (Resilience)", onChoose: () => sideTaskResolve("steady") },
        { label: "Move Fast (Cunning)", className: "secondary", onChoose: () => sideTaskResolve("fast") },
        { label: "Push Through (Strength)", className: "secondary", onChoose: () => sideTaskResolve("push") },
        { label: "Abort", className: "secondary", onChoose: () => sideTaskResolve("abort") },
      ]);
    } else {
      showChoices([
        { label: "Cover Tracks (Cunning)", onChoose: () => sideTaskResolve("cover") },
        { label: "Make it Public (Resilience)", className: "secondary", onChoose: () => sideTaskResolve("public") },
        { label: "End it Decisively (Strength)", className: "secondary", onChoose: () => sideTaskResolve("end") },
        { label: "Abort", className: "secondary", onChoose: () => sideTaskResolve("abort") },
      ]);
    }

    outputEl.scrollTop = 0;
    renderStats();
    return;
  }
  if (ev.kind === "mission") {
    outputEl.innerHTML = "";
    choicesEl.innerHTML = "";
    if (questListEl) questListEl.innerHTML = "";

    const header = document.createElement("div");
    header.className = "line";
    header.textContent = ev.title || "Mission";
    outputEl.appendChild(header);

    const body = document.createElement("div");
    body.className = "hint";
    body.style.whiteSpace = "pre-wrap";
    body.textContent = ev.text || "";
    outputEl.appendChild(body);

    const phase = Math.max(0, Math.floor(ev.phase || 0));
    if (phase === 0) {
      showChoices([
        { label: "Scout Contacts (Cunning)", onChoose: () => missionNegotiateResolve("contacts") },
        { label: "Call in a Favor", className: "secondary", onChoose: () => missionNegotiateResolve("favor") },
        { label: `Bribe (${Math.max(1, Math.floor(ev.goldCost || 10))} gold)`, className: "secondary", disabled: (state.gold || 0) < Math.max(1, Math.floor(ev.goldCost || 10)), onChoose: () => missionNegotiateResolve("bribe") },
        { label: "Abort", className: "secondary", onChoose: () => missionNegotiateResolve("abort") },
      ]);
    } else if (phase === 1) {
      showChoices([
        { label: "Promise Results (Resilience)", onChoose: () => missionNegotiateResolve("promise") },
        { label: "Sweeten the Deal", className: "secondary", onChoose: () => missionNegotiateResolve("sweeten") },
        { label: "Threaten (Strength)", className: "secondary", onChoose: () => missionNegotiateResolve("threaten") },
        { label: "Abort", className: "secondary", onChoose: () => missionNegotiateResolve("abort") },
      ]);
    } else {
      showChoices([
        { label: "Leave Quietly (Cunning)", onChoose: () => missionNegotiateResolve("quiet") },
        { label: "Make it Public (Resilience)", className: "secondary", onChoose: () => missionNegotiateResolve("public") },
        { label: "Abort", className: "secondary", onChoose: () => missionNegotiateResolve("abort") },
      ]);
    }

    outputEl.scrollTop = 0;
    renderStats();
    return;
  }
  if (ev.kind === "mystery") {
    outputEl.innerHTML = "";
    choicesEl.innerHTML = "";
    if (questListEl) questListEl.innerHTML = "";

    const header = document.createElement("div");
    header.className = "line";
    header.textContent = ev.title || "Something Happens";
    outputEl.appendChild(header);

    const body = document.createElement("div");
    body.className = "hint";
    body.style.whiteSpace = "pre-wrap";
    body.textContent = (ev.phase === "result") ? (ev.resultText || "") : (ev.text || "");
    outputEl.appendChild(body);

    if (String(ev.phase || "prompt") === "result") {
      showChoices([
        { label: "Continue", className: "secondary", onChoose: () => mysteryResolve("continue") },
      ]);
      outputEl.scrollTop = 0;
      renderStats();
      return;
    }

    if (ev.subtype === "eyes") {
      showChoices([
        { label: "Investigate", onChoose: () => mysteryResolve("investigate") },
        { label: `Raise a Torch (${state.inventory.torch || 0})`, className: "secondary", disabled: (state.inventory.torch || 0) <= 0, onChoose: () => mysteryResolve("torch") },
        { label: "Keep Walking", className: "secondary", onChoose: () => mysteryResolve("leave") },
      ]);
    } else if (ev.subtype === "door") {
      showChoices([
        { label: `Pick the Lock (${state.inventory.lockpick || 0})`, disabled: (state.inventory.lockpick || 0) <= 0, onChoose: () => mysteryResolve("lockpick") },
        { label: "Force the Door (Strength)", className: "secondary", onChoose: () => mysteryResolve("force") },
        { label: `Use Rune Shard (${state.inventory.rune_shard || 0})`, className: "secondary", disabled: (state.inventory.rune_shard || 0) <= 0, onChoose: () => mysteryResolve("rune") },
        { label: "Wait it Out", className: "secondary", onChoose: () => mysteryResolve("leave") },
      ]);
    } else if (ev.subtype === "cache") {
      showChoices([
        { label: `Dispel with Rune Shard (${state.inventory.rune_shard || 0})`, disabled: (state.inventory.rune_shard || 0) <= 0, onChoose: () => mysteryResolve("rune") },
        { label: `Crack it with Ember Gem (${state.inventory.ember_gem || 0})`, className: "secondary", disabled: (state.inventory.ember_gem || 0) <= 0, onChoose: () => mysteryResolve("ember") },
        { label: `Bypass with Lockpick (${state.inventory.lockpick || 0})`, className: "secondary", disabled: (state.inventory.lockpick || 0) <= 0, onChoose: () => mysteryResolve("lockpick") },
        { label: "Leave", className: "secondary", onChoose: () => mysteryResolve("leave") },
      ]);
    } else {
      const isTrouble = String(ev.variant || "") === "trouble";
      if (isTrouble) {
        showChoices([
          { label: `Use Bandage (${state.inventory.bandage || 0})`, disabled: (state.inventory.bandage || 0) <= 0, onChoose: () => mysteryResolve("bandage") },
          { label: `Use Cloth (${state.inventory.cloth || 0})`, className: "secondary", disabled: (state.inventory.cloth || 0) <= 0, onChoose: () => mysteryResolve("cloth") },
          { label: `Use Sageleaf (${state.inventory.herb_sageleaf || 0})`, className: "secondary", disabled: (state.inventory.herb_sageleaf || 0) <= 0, onChoose: () => mysteryResolve("sageleaf") },
          { label: "Help (Resilience)", className: "secondary", onChoose: () => mysteryResolve("help") },
        ]);
      } else {
        showChoices([
          { label: "Investigate with them", onChoose: () => mysteryResolve("investigate") },
          { label: `Light a Torch (${state.inventory.torch || 0})`, className: "secondary", disabled: (state.inventory.torch || 0) <= 0, onChoose: () => mysteryResolve("torch") },
          { label: "Ignore it", className: "secondary", onChoose: () => mysteryResolve("leave") },
        ]);
      }
    }

    outputEl.scrollTop = 0;
    renderStats();
    return;
  }
  if (ev.kind === "combat") {
    outputEl.innerHTML = "";
    choicesEl.innerHTML = "";
    if (questListEl) questListEl.innerHTML = "";

    const header = document.createElement("div");
    header.className = "line";
    header.textContent = ev.stage === "victory" ? "After the Fight" : "Combat";
    outputEl.appendChild(header);

    const party = allPartyActors(state);
    const partyLine = document.createElement("div");
    partyLine.className = "hint";
    partyLine.textContent = party.map((p) => `${p.name}: ${p.hp}/${p.maxHp}`).join(" | ");
    outputEl.appendChild(partyLine);

    const enemies = Array.isArray(ev.enemies) ? ev.enemies : [];
    const enemyLine = document.createElement("div");
    enemyLine.className = "hint";
    enemyLine.textContent = enemies.map((e) => {
      const lvl = e.recLevel || e.level || (e.tier ? (e.tier === 1 ? 1 : e.tier === 2 ? 80 : e.tier === 3 ? 200 : e.tier === 4 ? 380 : 580) : 1);
      const tierInfo = e.tier ? ` T${e.tier}` : "";
      const leg = e.legendaryRank ? " [LEGENDARY]" : (e.powerful ? " [Powerful]" : "");
      return `${e.name} [Lv${lvl}${tierInfo}${leg}]: ${Math.max(0, e.hp || 0)}/${e.maxHp} HP, Atk ${e.atk || 0}`;
    }).join(" | ");
    outputEl.appendChild(enemyLine);

    // Show player vs mob level gap warning
    try {
      const playerLvl = Math.max(1, Math.floor(state?.level || 1));
      const maxMobLvl = Math.max(...enemies.map(e => e.recLevel || e.level || 1));
      const diff = maxMobLvl - playerLvl;
      if (diff >= 30) {
        const warn = document.createElement("div");
        warn.className = "hint";
        warn.style.color = diff >= 50 ? "#ff4d6d" : "#ff8a2b";
        warn.style.fontWeight = "700";
        warn.textContent = diff >= 50 ? `⚠️ EXTREME LEVEL GAP: Mob Lv${maxMobLvl} vs You Lv${playerLvl} (diff ${diff}) - Success rate 2% or 0% IMPOSSIBLE! Must flee or get higher level!` : `⚠️ Level Gap: Mob Lv${maxMobLvl} vs You Lv${playerLvl} (diff ${diff}) - Success dropped to ${diff>=50?2:5}%!`;
        outputEl.appendChild(warn);
      }
    } catch(e) {}

    const logWrap = document.createElement("div");
    logWrap.className = "line";
    logWrap.style.whiteSpace = "pre-wrap";
    logWrap.textContent = (ev.log || []).join("\n");
    outputEl.appendChild(logWrap);

    if (ev.stage === "victory") {
      const isSiege = (typeof isCrossroadsSiegeCombat === "function") ? isCrossroadsSiegeCombat(ev) : false;
      const siegePhase = String(ev?.siege?.phase || "").toLowerCase();
      const canAdvanceSiege = isSiege && siegePhase === "horde" && (typeof createCrossroadsSiegeCombatEvent === "function");
      const hasQuest = !!ev.quest && !ev.quest.completed;
      showChoices([
        { label: ev.didLoot ? "Looted" : "Loot", className: ev.didLoot ? "secondary" : "", onChoose: () => combatLoot(ev) },
        { label: ev.didSearch ? "Searched" : "Search", className: ev.didSearch ? "secondary" : "", onChoose: () => combatSearch(ev) },
        ...(hasQuest ? [{ label: "Complete Quest", onChoose: () => combatCompleteQuest(ev) }] : []),
        ...(canAdvanceSiege ? [{
          label: "Face the Overlord",
          onChoose: () => {
            state.world.pendingEvent = createCrossroadsSiegeCombatEvent(state, "overlord");
            autoSave();
            renderPendingEvent();
          },
        }] : []),
        {
          label: canAdvanceSiege ? "Leave (Siege ongoing)" : "Leave",
          className: "secondary",
          disabled: canAdvanceSiege,
          onChoose: () => {
            const back = ev.fromNode || state.nodeId || "crossroads";
            state.world.pendingEvent = null;
            autoSave();
            enterNode(back);
          },
        },
      ]);
    } else {
      const mode = String(ev.uiMode || "main");
      const profSkills = combatSkillDefsForMenu(state, "profession");
      const buildSkills = combatSkillDefsForMenu(state, "skills");

      if (mode === "profession") {
        const buttons = [];
        const playerLvl = Math.max(1, Math.floor(state?.level || 1));
        for (let i = 0; i < profSkills.length; i++) {
          const d = profSkills[i];
          const tier = Math.max(1, Math.floor(d.tier || 1));
          const tierReq = {1:1, 2:25, 3:70, 4:150, 5:300, 6:500, 7:650}[tier] || (tier*100);
          const locked = playerLvl < tierReq;
          const mobRec = (typeof getEnemyRecLevelForCombat === 'function') ? getEnemyRecLevelForCombat(ev) : 1;
          const label = locked ? `${d.label} [LOCKED Req Lv${tierReq} You Lv${playerLvl}]` : `${d.label} [Lv${tierReq} vs Mob Lv${mobRec}]`;
          buttons.push({
            label: label,
            className: locked ? "secondary" : (d.powerful ? "" : "secondary"),
            disabled: locked,
            onChoose: () => {
              if (locked) {
                pushCombatLog(ev, `🔒 Spell ${d.label} locked! Requires Level ${tierReq}, you are Lv${playerLvl}.`);
                renderPendingEvent();
                return;
              }
              combatPlayerAction(`skill:${d.key}`);
            },
          });
        }
        showChoices([
          ...buttons,
          { label: "Back", className: "secondary", onChoose: () => combatPlayerAction("menu_back") },
        ]);
        outputEl.scrollTop = outputEl.scrollHeight;
        renderStats();
        return;
      }

      if (mode === "skill") {
        const buttons = [];
        const playerLvl = Math.max(1, Math.floor(state?.level || 1));
        for (let i = 0; i < buildSkills.length; i++) {
          const d = buildSkills[i];
          const tier = Math.max(1, Math.floor(d.tier || 1));
          const tierReq = {1:1, 2:25, 3:70, 4:150, 5:300, 6:500, 7:650}[tier] || (tier*100);
          const locked = playerLvl < tierReq;
          const mobRec = (typeof getEnemyRecLevelForCombat === 'function') ? getEnemyRecLevelForCombat(ev) : 1;
          const label = locked ? `${d.label} [LOCKED Req Lv${tierReq} You Lv${playerLvl}]` : `${d.label} [Lv${tierReq} vs Mob Lv${mobRec}]`;
          buttons.push({
            label: label,
            className: locked ? "secondary" : (d.powerful ? "" : "secondary"),
            disabled: locked,
            onChoose: () => {
              if (locked) {
                pushCombatLog(ev, `🔒 Spell ${d.label} locked! Requires Level ${tierReq}, you are Lv${playerLvl}. Level up to unlock.`);
                renderPendingEvent();
                return;
              }
              combatPlayerAction(`skill:${d.key}`);
            },
          });
        }
        showChoices([
          ...buttons,
          { label: "Back", className: "secondary", onChoose: () => combatPlayerAction("menu_back") },
        ]);
        outputEl.scrollTop = outputEl.scrollHeight;
        renderStats();
        return;
      }

      if (mode === "item_target") {
        const itemKey = String(ev.uiItemKey || "").trim();
        if (!itemKey) {
          ev.uiMode = "main";
          renderPendingEvent();
          return;
        }

        if (itemKey === "phoenix_feather") {
          const dead = (Array.isArray(state.party?.members) ? state.party.members : [])
            .filter((m) => m && m.id && (m.hp || 0) <= 0);

          if (!dead.length) {
            showChoices([
              { label: "No fallen companion to revive", className: "secondary", disabled: true, onChoose: () => {} },
              { label: "Back", className: "secondary", onChoose: () => combatPlayerAction("menu_back") },
            ]);
            outputEl.scrollTop = outputEl.scrollHeight;
            renderStats();
            return;
          }

          const buttons = [];
          for (const m of dead) {
            const name = m?.name || "Companion";
            const hp = `${m?.hp || 0}/${m?.maxHp || 0} HP`;
            buttons.push({
              label: `Use ${itemLabel(itemKey)} on ${name} (${hp})`,
              className: "secondary",
              onChoose: () => combatPlayerAction(`item_use:${itemKey}:${m.id}`),
            });
          }

          showChoices([
            ...buttons,
            { label: "Back", className: "secondary", onChoose: () => combatPlayerAction("menu_back") },
          ]);
          outputEl.scrollTop = outputEl.scrollHeight;
          renderStats();
          return;
        }

        const ids = alivePartyActorIds(state);
        const buttons = [];
        const isManaItem = itemKey === "mana_potion" || itemKey === "tonic";

        for (const id of ids) {
          if (!id) continue;
          if (id === "player") {
            const hp = `${state.hp || 0}/${playerMaxHp()} HP`;
            const mana = `${state.mana || 0}/${playerMaxMana()} mana`;
            buttons.push({
              label: `Use ${itemLabel(itemKey)} on ${state.profile || "You"} (${isManaItem ? mana : hp})`,
              className: "secondary",
              onChoose: () => combatPlayerAction(`item_use:${itemKey}:player`),
            });
          } else {
            const m = findPartyMemberById(state, id);
            const name = m?.name || "Companion";
            const hp = `${m?.hp || 0}/${m?.maxHp || 0} HP`;
            const mana = `${m?.mana || 0}/${m?.maxMana || 0} mana`;
            const disabled = isManaItem && ((m?.maxMana || 0) <= 0);
            buttons.push({
              label: `Use ${itemLabel(itemKey)} on ${name} (${isManaItem ? mana : hp})`,
              className: "secondary",
              disabled,
              onChoose: () => combatPlayerAction(`item_use:${itemKey}:${id}`),
            });
          }
        }

        showChoices([
          ...buttons,
          { label: "Back", className: "secondary", onChoose: () => combatPlayerAction("menu_back") },
        ]);
        outputEl.scrollTop = outputEl.scrollHeight;
        renderStats();
        return;
      }

      const items = [];
      items.push({
        label: `Bandage (${state.inventory.bandage || 0})`,
        className: "secondary",
        disabled: (state.inventory.bandage || 0) <= 0,
        onChoose: () => combatPlayerAction("item_bandage"),
      });
      items.push({
        label: `Health Potion (${state.inventory.health_potion || 0})`,
        className: "secondary",
        disabled: (state.inventory.health_potion || 0) <= 0,
        onChoose: () => combatPlayerAction("item_health_potion"),
      });
      items.push({
        label: `Mana Potion (${state.inventory.mana_potion || 0})`,
        className: "secondary",
        disabled: (state.inventory.mana_potion || 0) <= 0,
        onChoose: () => combatPlayerAction("item_mana_potion"),
      });
      items.push({
        label: `Mana Tonic (${state.inventory.tonic || 0})`,
        className: "secondary",
        disabled: (state.inventory.tonic || 0) <= 0,
        onChoose: () => combatPlayerAction("item_tonic"),
      });
      const deadCompanions = (Array.isArray(state.party?.members) ? state.party.members : []).some((m) => m && m.id && (m.hp || 0) <= 0);
      if (deadCompanions) {
        items.push({
          label: `Phoenix Feather (${state.inventory.phoenix_feather || 0})`,
          className: "secondary",
          disabled: (state.inventory.phoenix_feather || 0) <= 0,
          onChoose: () => combatPlayerAction("item_phoenix_feather"),
        });
      }
      items.push({
        label: `Antidote (${state.inventory.antidote || 0})`,
        className: "secondary",
        disabled: (state.inventory.antidote || 0) <= 0,
        onChoose: () => combatPlayerAction("item_antidote"),
      });
      items.push({
        label: `Smoke Bomb (${state.inventory.smoke_bomb || 0})`,
        className: "secondary",
        disabled: (state.inventory.smoke_bomb || 0) <= 0,
        onChoose: () => combatPlayerAction("item_smoke_bomb"),
      });
      showChoices([
        { label: "Profession Skill", className: "secondary", disabled: profSkills.length === 0, onChoose: () => combatPlayerAction("menu_profession") },
        { label: "Skill", className: "secondary", disabled: buildSkills.length === 0, onChoose: () => combatPlayerAction("menu_skill") },
        { label: "Attack", onChoose: () => combatPlayerAction("attack") },
        { label: "Guard", className: "secondary", onChoose: () => combatPlayerAction("guard") },
        ...items,
        { label: "Run", className: "secondary", onChoose: () => combatPlayerAction("run") },
      ]);
    }

    outputEl.scrollTop = outputEl.scrollHeight;
    renderStats();
    return;
  }
  if (ev.kind !== "skillTrader") {
    state.world.pendingEvent = null;
    render();
    return;
  }

  outputEl.innerHTML = "";
  choicesEl.innerHTML = "";
  if (questListEl) questListEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "line";
  header.textContent = `A Skill Trader appears [Player Lv${state.level || 1}] - Offers scaled to your level as hard as level suggests`;
  outputEl.appendChild(header);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = `A masked trader offers techniques suited to your path. You can spend Skill Points to learn them. Skill Points: ${state.skillPoints || 0} | Filter by Tier below. Tier req: T1=Lv1, T2=Lv25, T3=70, T4=150, T5=300, T6=500, T7=650. Locked skills show requirement.`;
  outputEl.appendChild(hint);

  // Tier filter for trader
  const filterRow = document.createElement("div");
  filterRow.className = "row";
  const tierLabel = document.createElement("div");
  tierLabel.className = "hint";
  tierLabel.textContent = "Filter Tier";
  const tierSel = document.createElement("select");
  tierSel.style.minWidth = "110px";
  const tierOpts = [
    { v: "all", t: "All Tiers" },
    { v: "1", t: "Tier 1 (Lv1)" },
    { v: "2", t: "Tier 2 (Lv25)" },
    { v: "3", t: "Tier 3 (Lv70)" },
    { v: "4", t: "Tier 4 (Lv150)" },
    { v: "5", t: "Tier 5 (Lv300)" },
    { v: "6", t: "Tier 6 (Lv500)" },
    { v: "7", t: "Tier 7 (Lv650)" },
  ];
  for (const o of tierOpts) {
    const opt = document.createElement("option");
    opt.value = o.v;
    opt.textContent = o.t;
    tierSel.appendChild(opt);
  }
  tierSel.value = String(ev.tierFilter || "all");
  tierSel.addEventListener("change", () => {
    ev.tierFilter = String(tierSel.value || "all");
    renderPendingEvent();
  });
  filterRow.appendChild(tierLabel);
  filterRow.appendChild(tierSel);
  outputEl.appendChild(filterRow);

  const list = document.createElement("div");
  list.className = "skillList";
  const seenBases = new Set();
  const tierFilter = String(ev.tierFilter || "all");
  for (const k of ev.offers || []) {
    if (!k) continue;
    if (typeof canLearnSkillByBaseLabel === "function" && !canLearnSkillByBaseLabel(state, k)) continue;
    const base = (typeof skillFamilyIdForKey === "function") ? String(skillFamilyIdForKey(k) || "").trim() : "";
    if (base && seenBases.has(base)) continue;
    if (base) seenBases.add(base);

    const def = skillDef(k);
    const row = document.createElement("div");
    row.className = `skillRow${def.powerful ? " powerful" : ""}`;

    const left = document.createElement("div");
    left.className = "skillLeft";
    const title = document.createElement("div");
    title.className = "skillTitle";
    title.textContent = def.label;
    const meta = document.createElement("div");
    meta.className = "skillMeta";
    const tierReqMap = {1:1, 2:25, 3:70, 4:150, 5:300, 6:500, 7:650};
    const reqLvl = tierReqMap[def.tier] || def.tier * 100;
    const playerLvl = Math.max(1, Math.floor(state.level || 1));
    const locked = playerLvl < reqLvl;
    meta.textContent = `${titleCaseWord(def.focus)} • Tier ${def.tier} (Req Lv${reqLvl})${def.powerful ? " • Powerful" : ""} • Cost ${skillPointCost(def)} SP${locked ? ` • LOCKED (You Lv${playerLvl})` : ""}`;
    if (locked) meta.style.color = "#ff8a8a";
    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "skillActions";

    const info = document.createElement("button");
    info.className = "iconBtn";
    info.textContent = "ℹ";
    info.title = "Skill details";
    info.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSkillModal(def.key);
    });

    const buy = document.createElement("button");
    buy.textContent = locked ? `Locked Req Lv${reqLvl}` : "Learn";
    const canLearn = (typeof canLearnSkillByBaseLabel === "function") ? canLearnSkillByBaseLabel(state, def.key) : true;
    buy.disabled = locked || (state.skillPoints || 0) < skillPointCost(def) || !!state.skills.learned[def.key] || !canLearn;
    buy.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      buySkillFromTrader(def.key);
    });

    right.appendChild(info);
    right.appendChild(buy);
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  }
  outputEl.appendChild(list);

  showChoices([
    {
      label: "Leave",
      className: "secondary",
      onChoose: () => {
        const back = state.world.pendingEvent?.fromNode || state.nodeId || "crossroads";
        state.world.pendingEvent = null;
        enterNode(back);
      },
    },
  ]);

  outputEl.scrollTop = 0;
  renderStats();
}

