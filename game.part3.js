const ADMIN_DELETED_FLAG = `virelia_admin_deleted:${ADMIN_PROFILE}`;
const LEGACY_ADMIN_PROFILE = "admin@";
const LEGACY_ADMIN_MIGRATED_FLAG = "virelia_admin_migrated_admin_at";

function cleanupLegacyAdminAccount() {
  try {
    if (localStorage.getItem(LEGACY_ADMIN_MIGRATED_FLAG) === "1") return;
    localStorage.removeItem(saveKey(LEGACY_ADMIN_PROFILE));
    localStorage.removeItem("virelia_admin_deleted");
    localStorage.removeItem("virelia_admin_deleted:admin@");
    localStorage.setItem(LEGACY_ADMIN_MIGRATED_FLAG, "1");
  } catch {
  }
}

function ensureAdminAccount(force) {
  const f = !!force;
  cleanupLegacyAdminAccount();
  if (!f) {
    try {
      if (localStorage.getItem(ADMIN_DELETED_FLAG) === "1") return;
    } catch {
    }
  }
  const existing = safeLoad(ADMIN_PROFILE);
  if (existing) return;
  const s = createNewState(ADMIN_PROFILE);
  s.character = s.character || { profession: "mage", build: "mystic", created: true };
  s.character.profession = "mage";
  s.character.build = "mystic";
  s.character.created = true;
  applyAdminGodMode(s);
  s.flags = s.flags || {};
  s.flags.allegiance = "Guild";
  s.updatedAt = nowIso();
  safeSave(ADMIN_PROFILE, s);
}

function listSaveProfiles() {
  const profiles = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("virelia_save:")) continue;
      const profile = k.slice("virelia_save:".length);
      if (profile) profiles.push(profile);
    }
  } catch {
    return [];
  }
  profiles.sort((a, b) => a.localeCompare(b));
  return profiles;
}

function knownItemKeys() {
  const set = new Set(Object.keys(ITEM_CATALOG));
  try {
    const profiles = listSaveProfiles();
    for (const p of profiles) {
      const s = safeLoad(p);
      const inv = s?.inventory;
      if (!inv || typeof inv !== "object") continue;
      for (const k of Object.keys(inv)) set.add(k);
    }
  } catch {
    // ignore
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function renderHomeSaves() {
  if (!homeSavesEl) return;
  homeSavesEl.innerHTML = "";

  setAdminDashboardUi();

  const profiles = listSaveProfiles();
  if (profiles.length === 0) {
    const div = document.createElement("div");
    div.className = "hint";
    div.textContent = "No saves found yet.";
    homeSavesEl.appendChild(div);
    return;
  }

  for (const p of profiles) {
    const loaded = safeLoad(p);
    const row = document.createElement("div");
    row.className = "saveRow";

    const meta = document.createElement("div");
    meta.className = "saveMeta";
    const lvl = loaded?.level || 1;
    const node = loaded?.nodeId || "?";
    const updatedAt = loaded?.updatedAt || loaded?.createdAt || "";
    const tag = isAdminProfile(p) ? " [ADMIN]" : "";
    meta.textContent = `${p}${tag}\nLvl ${lvl} • Node: ${node}${updatedAt ? ` • ${updatedAt}` : ""}`;

    const actions = document.createElement("div");
    actions.className = "saveActions";

    const btnC = document.createElement("button");
    btnC.className = "secondary";
    btnC.textContent = "Continue";
    btnC.addEventListener("click", () => {
      profileNameEl.value = p;
      continueProfile();
      renderHomeSaves();
    });

    const btnE = document.createElement("button");
    btnE.className = "secondary";
    btnE.textContent = "Edit";
    btnE.disabled = !isAdminSessionActive();
    btnE.addEventListener("click", () => {
      adminEditingProfile = p;
      renderAdminTools();
    });

    const btnD = document.createElement("button");
    btnD.className = "danger";
    btnD.textContent = "Delete";
    btnD.disabled = isAdminProfile(p);
    btnD.addEventListener("click", () => {
      safeDelete(p);
      if (state && state.profile === p) {
        state = null;
        outputEl.innerHTML = "";
        choicesEl.innerHTML = "";
        statsEl.innerHTML = "";
        questListEl.innerHTML = "";
        renderEffectsUi();
      }
      renderHomeSaves();
    });

    actions.appendChild(btnC);
    actions.appendChild(btnE);
    actions.appendChild(btnD);
    row.appendChild(meta);
    row.appendChild(actions);
    homeSavesEl.appendChild(row);
  }

  renderAdminTools();
}

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

function safeLoad(profile) {
  try {
    const raw = localStorage.getItem(saveKey(profile));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeSave(profile, data) {
  try {
    const persisted = {
      ...data,
      missions: undefined,
      sideQuests: undefined,
    };
    localStorage.setItem(saveKey(profile), JSON.stringify(persisted));
    return true;
  } catch {
    return false;
  }
}

function safeDelete(profile) {
  if (isAdminProfile(profile)) return false;
  try {
    localStorage.removeItem(saveKey(profile));
    return true;
  } catch {
    return false;
  }
}

function appendLog(line) {
  if (!state) return;
  state.log = state.log || [];
  state.log.push(String(line));
  if (state.log.length > LOG_MAX) state.log = state.log.slice(-LOG_MAX);
}

function renderLog() {
  outputEl.innerHTML = "";
  const lines = (state && state.log) ? state.log : [];
  for (const ln of lines) {
    const div = document.createElement("div");
    div.className = "line";
    div.style.whiteSpace = "pre-wrap";
    div.textContent = ln;
    outputEl.appendChild(div);
  }
  outputEl.scrollTop = outputEl.scrollHeight;
}

const PLAYER_MAX_LEVEL = 700;
const ADMIN_MAX_LEVEL = 999;

function xpToNext(level) {
  const lvl = Math.max(1, Math.floor(level||1));
  if (lvl >= ADMIN_MAX_LEVEL) return Infinity;
  if (lvl >= PLAYER_MAX_LEVEL) {
    try {
      if (typeof state !== 'undefined' && state && typeof isAdminProfile === 'function' && !isAdminProfile(state.profile)) {
        return Infinity;
      }
    } catch(e) {}
    if (lvl < ADMIN_MAX_LEVEL) {
      // Admin beyond player cap 700-999: very steep
      let base = lvl * 200;
      base += Math.pow(lvl - 100, 2) * 15;
      base += Math.pow(Math.max(0, lvl - 500), 2) * 20;
      return Math.floor(base);
    }
    return Infinity;
  }
  // Player curve 1..700 - progressive but reachable
  let base = lvl * 100;
  if (lvl >= 50) base += Math.pow(lvl - 50, 2) * 4;
  if (lvl >= 100) base += Math.pow(lvl - 100, 2) * 3;
  if (lvl >= 200) base += Math.pow(lvl - 200, 2) * 4;
  if (lvl >= 350) base += Math.pow(lvl - 350, 2) * 6;
  if (lvl >= 500) base += Math.pow(lvl - 500, 2) * 8;
  if (lvl >= 600) base += Math.pow(lvl - 600, 2) * 12;
  return Math.floor(base);
}

function isPlayerAtMaxLevel(s) {
  const st = s || (typeof state !== 'undefined' ? state : null);
  if (!st) return false;
  if (typeof isAdminProfile === 'function' && isAdminProfile(st.profile)) return false; // admin can exceed
  return (st.level || 1) >= PLAYER_MAX_LEVEL;
}

function ensureCompanionStarterSkills(c) {
  if (!c || !c.id) return;
  c.skills = c.skills || {};
  c.skills.learned = c.skills.learned || {};
  c.skills.sources = (c.skills.sources && typeof c.skills.sources === "object") ? c.skills.sources : {};
  c.flags = (c.flags && typeof c.flags === "object") ? c.flags : {};
  if (c.flags.starterSkillKitGranted) return;

  const prof = String(c.profession || "fighter").trim().toLowerCase() || "fighter";
  const build = String(c.build || "balanced").trim().toLowerCase() || "balanced";
  const learned = c.skills.learned;

  const profDef = PROF_SKILL[prof] || PROF_SKILL.fighter;
  const profFocuses = (Array.isArray(profDef.focuses) && profDef.focuses.length)
    ? profDef.focuses.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean)
    : ["strength", "cunning", "arcana", "resilience"];
  const profPrimary = profFocuses[0] || "strength";
  const profSecondary = profFocuses.find((x) => String(x).toLowerCase() !== String(profPrimary).toLowerCase()) || profPrimary;
  let buildFocus = buildFocusForBuild(build);
  if (!buildFocus) buildFocus = profSecondary;

  const take = (focus, source) => {
    const key = findStarterSkillKeyForFocus(prof, build, focus, learned);
    if (!key) return false;
    learned[key] = 1;
    c.skills.sources[key] = source;
    return true;
  };

  for (let i = 0; i < 2; i++) take(buildFocus, "build");
  for (let i = 0; i < 2; i++) take(profPrimary, "profession");
  take(profSecondary, "profession");
  take("", "build");

  c.flags.starterSkillKitGranted = true;
}

function grantCompanionAutoSkillOnLevel(c, level) {
  if (!c || !c.id) return false;
  const lvl = Math.max(1, Math.floor(level || c.level || 1));
  if (lvl % 2 !== 0) return false;
  c.skills = c.skills || {};
  c.skills.learned = c.skills.learned || {};
  c.skills.sources = (c.skills.sources && typeof c.skills.sources === "object") ? c.skills.sources : {};
  const learned = c.skills.learned;

  const prof = String(c.profession || "fighter").trim().toLowerCase() || "fighter";
  const build = String(c.build || "balanced").trim().toLowerCase() || "balanced";
  const profDef = PROF_SKILL[prof] || PROF_SKILL.fighter;
  const profFocuses = (Array.isArray(profDef.focuses) && profDef.focuses.length)
    ? profDef.focuses.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean)
    : ["strength", "cunning", "arcana", "resilience"];
  const profPrimary = profFocuses[0] || "strength";

  let x = hashString(`comp:${c.id}:${prof}:${build}:auto:${lvl}`) >>> 0;
  for (let tries = 0; tries < 1200; tries++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    const idx = (x % SKILLS_PER_COMBO) + 1;
    const key = skillKeyFor(prof, build, idx);
    if (learned[key]) continue;
    const def = skillDefFromParts(prof, build, idx);
    const focus = String(def?.focus || "").toLowerCase();
    let accept = 18;
    if (focus === profPrimary) accept += 30;
    if (def.powerful) accept += 20;
    const roll = (x >>> 24) % 100;
    if (roll >= accept) continue;
    learned[key] = 1;
    c.skills.sources[key] = "level";
    return true;
  }
  return false;
}

function gainCompanionXp(amount, opts) {
  if (!state) return;
  normalizeState(state);
  if (!state.party || !Array.isArray(state.party.members)) return;
  const amt = Math.max(0, Math.floor(amount || 0));
  if (amt <= 0) return;

  const o = opts || {};
  const rate = (typeof o.rate === "number") ? clamp(o.rate, 0, 2) : 1.0;

  for (const c of state.party.members) {
    if (!c || !c.id) continue;
    ensureCompanionStarterSkills(c);
    if (typeof c.xp !== "number" || !Number.isFinite(c.xp)) c.xp = 0;
    const alive = (c.hp || 0) > 0;
    const personalRate = (typeof o.deadRate === "number")
      ? (alive ? rate : clamp(o.deadRate, 0, 1))
      : (alive ? rate : 0.4);
    const gain = Math.max(0, Math.floor(amt * personalRate));
    if (gain <= 0) continue;
    c.xp += gain;

    let leveled = false;
    while ((c.xp || 0) >= xpToNext(c.level || 1)) {
      c.xp -= xpToNext(c.level || 1);
      c.level = Math.max(1, Math.floor((c.level || 1) + 1));
      leveled = true;
      grantCompanionAutoSkillOnLevel(c, c.level);
    }

    if (leveled) {
      appendLog(`⭐ ${c.name || "Companion"} reached Level ${c.level}.`);
    }
  }
}

function gainXp(amount) {
  if (!state) return;
  if (isAdminGodModeActive(state)) {
    applyAdminGodMode(state);
    return;
  }
  // Cap normal players at PLAYER_MAX_LEVEL
  if (isPlayerAtMaxLevel(state)) {
    if (state.level < PLAYER_MAX_LEVEL) state.level = PLAYER_MAX_LEVEL;
    state.xp = 0;
    return;
  }
  const amt = Math.max(0, Math.floor(amount || 0));
  state.xp += amt;
  while (state.xp >= xpToNext(state.level)) {
    // Prevent leveling beyond cap for non-admin
    if ((state.level || 1) >= PLAYER_MAX_LEVEL && !(typeof isAdminProfile === 'function' && isAdminProfile(state.profile))) {
      state.level = PLAYER_MAX_LEVEL;
      state.xp = 0;
      appendLog(`🏆 Max Level Reached! You are now Level ${PLAYER_MAX_LEVEL} (Player Cap). Admin cap is 999.`);
      break;
    }
    const needed = xpToNext(state.level);
    if (!isFinite(needed) || needed === Infinity) {
      state.xp = 0;
      break;
    }
    state.xp -= needed;
    state.level += 1;
    // Clamp
    if (state.level > PLAYER_MAX_LEVEL && !(typeof isAdminProfile === 'function' && isAdminProfile(state.profile))) {
      state.level = PLAYER_MAX_LEVEL;
      state.xp = 0;
      appendLog(`🏆 Max Level Reached! Level ${PLAYER_MAX_LEVEL} cap.`);
      break;
    }
    state.skillPoints = (state.skillPoints || 0) + 10;
    state.maxHp += 6;
    state.hp = Math.min(playerMaxHp(), state.hp + 6);
    state.mana = Math.min(playerMaxMana(), state.mana + 4);
    appendLog(`⭐ Level Up! You reached Level ${state.level}${state.level >= PLAYER_MAX_LEVEL ? ' (MAX)' : ''}.`);
    appendLog("You gained 10 Skill Points.");
    queueLevelUpDraftLevel(state, state.level);
    if (state.level >= PLAYER_MAX_LEVEL && !(typeof isAdminProfile === 'function' && isAdminProfile(state.profile))) {
      state.xp = 0;
      break;
    }
  }
  if (amt > 0) gainCompanionXp(amt, { rate: 1.0, deadRate: 0.4 });
  startNextLevelUpDraftIfNeeded(state);
}

function applyDamage(dmg, opts) {
  if (!state) return;
  normalizeState(state);
  pruneExpiredEffects();

  if (isAdminGodModeActive(state)) {
    applyAdminGodMode(state);
    return 0;
  }

  const o = opts || {};
  const fx = o.fx !== false;
  let amount = Math.max(0, Math.floor(dmg));

  const has = (k) => activeEffects().some((e) => e.key === k);
  if (has("shielded")) amount = Math.max(1, Math.floor(amount * 0.55)); // BUFFED: 45% reduction
  if (has("wyrmhide")) amount = Math.max(1, Math.floor(amount * 0.60)); // BUFFED: 40% reduction
  if (has("ironbark")) amount = Math.max(1, Math.floor(amount * 0.68)); // BUFFED: 32% reduction
  if (has("voidsalt")) amount = Math.max(1, Math.floor(amount * 0.75)); // BUFFED: 25% reduction
  if (has("cursed")) amount = Math.max(1, Math.floor(amount * 1.15));

  const eq = totalEquipmentBonuses(state);
  amount = Math.max(1, Math.floor(amount * (eq.damageTakenMult || 1)));

  const res = playerStat("resilience");
  amount = Math.max(1, Math.floor(amount - res * 1.0));

  if (fx) playHitFx();
  state.hp -= amount;

  if (!o.fromEffect) {
    if (amount >= 8 && Math.random() < 0.35) {
      addEffect("bleeding", 15000);
    }
    // Heavy damage situations trigger new debuffs
    const maxHp = playerMaxHp();
    if (amount >= maxHp * 0.30) {
      if (Math.random() < 0.45) { addEffect("brittle", 18000); appendLog("💔 Heavy blow - Brittle! Armor cracked."); }
      if (Math.random() < 0.35) { addEffect("weak", 15000); }
      if (Math.random() < 0.25) { addEffect("dazed", 12000); }
    } else if (amount >= maxHp * 0.18) {
      if (Math.random() < 0.25) { addEffect("dazed", 10000); }
    }
    if (amount >= 12 && Math.random() < 0.15) {
      // Chance for fear on big hit
      addEffect("fear", 12000);
    }
  }
  if (state.hp <= 0) {
    state.hp = 0;
    appendLog("💀 You collapse. The road of Virelia is unforgiving.");
    enterNode("defeat");
  }

  return amount;
}

function adjustReputation(faction, delta) {
  if (!state) return;
  state.reputation = state.reputation || {};
  state.reputation[faction] = (state.reputation[faction] || 0) + delta;
}

function setFlag(key, value) {
  if (!state) return;
  state.flags = state.flags || {};
  state.flags[key] = value;
}

function getFlag(key) {
  if (!state || !state.flags) return undefined;
  return state.flags[key];
}

function spendGold(cost) {
  if (!state) return false;
  if (isAdminGodModeActive(state)) {
    applyAdminGodMode(state);
    return true;
  }
  const c = Math.max(0, Math.floor(cost || 0));
  if ((state.gold || 0) < c) {
    appendLog("Not enough gold.");
    return false;
  }
  state.gold -= c;
  return true;
}

function partySize(s) {
  const members = s?.party?.members;
  const n = Array.isArray(members) ? members.length : 0;
  return 1 + n;
}

function allPartyActors(s) {
  if (!s) return [];
  const list = [];
  list.push({
    id: "player",
    name: s.profile,
    isPlayer: true,
    profession: s.character?.profession || "fighter",
    build: s.character?.build || "balanced",
    level: s.level || 1,
    stats: effectiveStats(s),
    maxHp: maxHpForState(s),
    hp: s.hp || 0,
    maxMana: maxManaForState(s),
    mana: s.mana || 0,
  });
  const members = Array.isArray(s.party?.members) ? s.party.members : [];
  for (const m of members) {
    if (!m || !m.id) continue;
    list.push({
      id: m.id,
      name: m.name || "Companion",
      isPlayer: false,
      profession: m.profession,
      build: m.build,
      level: m.level || (s.level || 1),
      stats: m.stats || { strength: 0, cunning: 0, arcana: 0, resilience: 0 },
      maxHp: m.maxHp || 1,
      hp: m.hp || 0,
      maxMana: m.maxMana || 0,
      mana: m.mana || 0,
    });
  }
  return list;
}

function findPartyMemberById(s, id) {
  if (!s || !s.party || !Array.isArray(s.party.members)) return null;
  return s.party.members.find((m) => m && m.id === id) || null;
}

function mobKey(i) {
  const n = Math.max(1, Math.min(MOB_COUNT, Math.floor(i || 1)));
  return `mob_${String(n).padStart(3, "0")}`;
}

function mobDef(mobIdOrIndex) {
  const raw = String(mobIdOrIndex || "");
  const m = raw.match(/^(?:mob_)?(\d{1,3})$/i);
  const idx = m ? Math.max(1, Math.min(MOB_COUNT, parseInt(m[1], 10))) : Math.max(1, Math.min(MOB_COUNT, Math.floor(mobIdOrIndex || 1)));
  const seed = hashString(`mob:${idx}`);

  const species = ["Bandit", "Thug", "Highwayman", "Wolf", "Boar", "Ghoul", "Cultist", "Wraith", "Goblin", "Raider", "Sellsword", "Hollow", "Mire Leech", "Ash Hound", "Dune Stalker", "Stoneback", "Feral", "Screecher", "Night Blade", "Hex Adept"];
  const mods = ["Ragged", "Vicious", "Cursed", "Hungry", "Iron", "Frost", "Ash", "Storm", "Blood", "Venom", "Shadow", "Ruin", "Wild", "Grim", "Scarred", "Ravenous", "Hardened", "Ancient", "Merciless", "Wicked"];

  const tier = 1 + Math.floor((idx - 1) / 60);
  const powerful = (seed % 17) === 0 || tier >= 4;
  const name = `${mods[seed % mods.length]} ${species[(seed >>> 4) % species.length]}`;

  // Remoduled for player cap 700: base stats much higher for high tiers
  const baseHp = 28 + tier * 22 + tier * tier * 12 + (powerful ? 35 + tier * 8 : 0) + (seed % 18);
  const atk = 6 + tier * 6 + tier * tier * 2 + (powerful ? 8 + tier * 2 : 0) + (seed % 7);
  const acc = clamp(0.60 + tier * 0.04 + (powerful ? 0.06 : 0) + ((seed % 7) - 3) * 0.01, 0.55, 0.93);
  // RecLevel for display - shows mob level as hard as level suggests
  const expectedByTier = {1:1, 2:80, 3:200, 4:380, 5:580};
  const recLevel = expectedByTier[tier] || (1 + (tier - 1) * 140);

  const requiresParty = tier >= 5 || (powerful && tier >= 4);
  const requiresPartySize = requiresParty ? 3 : (tier >= 4 ? 2 : 1);

  return {
    key: mobKey(idx),
    index: idx,
    name,
    tier,
    powerful,
    recLevel,
    maxHp: baseHp,
    atk,
    acc,
    requiresParty,
    requiresPartySize,
  };
}

function pickMobForEncounter(s, kind) {
  const lvl = Math.max(1, Math.floor(s?.level || 1));
  const p = partySize(s);
  // Remoduled for cap 700: tier progression slower, tier5 is endgame 560+ but can appear earlier with bump
  // Old: floor((lvl-1)/4) -> tier5 at lvl 17. New: tier1 1-139, tier2 140-279, tier3 280-419, tier4 420-559, tier5 560+
  const baseTier = clamp(1 + Math.floor((lvl - 1) / 140), 1, 5);
  const bumpChance = lvl >= 100 ? 0.35 : (lvl >= 50 ? 0.28 : 0.18);
  const bump = Math.random() < bumpChance ? 1 : 0;
  const tier = clamp(baseTier + bump, 1, 5);

  const tierFallback = clamp(tier - 1, 1, 5);
  const canFacePartyMob = (def) => {
    if (!def) return false;
    if ((def.requiresPartySize || 1) <= p) return true;
    const expected = 1 + (Math.max(1, Math.floor(def.tier || 1)) - 1) * 4;
    const over = Math.max(0, lvl - expected);
    const need = Math.max(1, Math.floor((def.requiresPartySize || 1) - p));
    return over >= (3 + need * 2);
  };

  const ambushSkip = lvl >= 20 ? 0.55 : (lvl >= 12 ? 0.75 : 0.9);

  let tries = 0;
  while (tries < 80) {
    tries += 1;
    const t = tries <= 60 ? tier : tierFallback;
    const idx = (t - 1) * 60 + 1 + Math.floor(Math.random() * 60);
    const def = mobDef(idx);
    if (kind === "ambush" && def.requiresParty && Math.random() < ambushSkip) continue;
    if (!canFacePartyMob(def)) continue;
    return def;
  }
  return mobDef((tier - 1) * 60 + 1 + Math.floor(Math.random() * 60));
}

function scaleEnemyForPlayerLevel(enemy, s, encounterKind) {
  if (!enemy || !s) return enemy;
  const lvl = Math.max(1, Math.floor(s?.level || 1));
  const tier = Math.max(1, Math.floor(enemy.tier || 1));
  // Remoduled expected levels for 700 cap: tier1 1, tier2 80, tier3 200, tier4 380, tier5 580
  // This makes tier5 appropriate for 580-700 endgame, but still scales beyond
  const expectedByTier = {1:1, 2:80, 3:200, 4:380, 5:580};
  const expected = expectedByTier[tier] || (1 + (tier - 1) * 140);
  const over = Math.max(0, lvl - expected);
  if (over <= 0) return enemy;

  const kind = String(encounterKind || "").toLowerCase();
  const isQuest = kind === "mission" || kind === "side";

  // Higher rates for high level scaling to keep challenge at 700
  // For 700 cap, need much higher multipliers - old capped at 2.8x, new allows up to 80x for quests, 120x for wild
  const hpRate = isQuest ? 0.07 : 0.11;
  const atkRate = isQuest ? 0.05 : 0.075;
  const accRate = isQuest ? 0.0008 : 0.0012;

  const powerfulBonus = enemy.powerful ? 1 : 0;
  // Caps raised dramatically for 700 cap: old 2.8x now 85x, old 2.0x now 55x
  const hpCap = isQuest ? 85 : 120;
  const atkCap = isQuest ? 55 : 75;
  const accCap = isQuest ? 0.22 : 0.28;
  // Add quadratic scaling for very high over (beyond 200)
  const overQuad = over > 200 ? Math.pow(over - 200, 1.15) * 0.001 : 0;
  const hpMul = clamp((1 + over * hpRate + overQuad) * (1 + powerfulBonus * 0.12), 1, hpCap);
  const atkMul = clamp((1 + over * atkRate + overQuad * 0.6) * (1 + powerfulBonus * 0.10), 1, atkCap);
  const accAdd = clamp(over * accRate + powerfulBonus * 0.015, 0, accCap);

  if (typeof enemy.maxHp === "number") enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * hpMul));
  if (typeof enemy.hp === "number" && typeof enemy.maxHp === "number") enemy.hp = Math.min(enemy.maxHp, Math.round(enemy.hp * hpMul));
  if (typeof enemy.atk === "number") enemy.atk = Math.max(1, Math.round(enemy.atk * atkMul));
  if (typeof enemy.acc === "number") enemy.acc = clamp(enemy.acc + accAdd, 0.50, 0.92);
  return enemy;
}

function createCombatEvent(s, kind) {
  const mob = arguments.length >= 3 && arguments[2] ? arguments[2] : pickMobForEncounter(s, kind);
  const p = partySize(s);
  const isGroup = mob.requiresParty && p >= 3;
  const enemies = [];
  enemies.push({ ...mob, hp: mob.maxHp });
  if (isGroup) {
    const extra = clamp(1 + Math.floor((mob.tier - 3) / 1), 1, 3);
    for (let i = 0; i < extra; i++) {
      const m2 = mobDef(mob.index + 1 + i);
      enemies.push({ ...m2, hp: Math.floor(m2.maxHp * 0.8) });
    }
  }

  for (const e of enemies) {
    scaleEnemyForPlayerLevel(e, s, kind);
  }

  return {
    kind: "combat",
    fromNode: s.nodeId || "crossroads",
    stage: "combat",
    encounterKind: kind || "ambush",
    log: [
      `⚔️ Encounter: ${enemies.map((e) => e.name).join(", ")}.`,
      `Your party braces for a fight.`,
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
}

function bestLearnedSkillForFocus(s, focus) {
  const wanted = String(focus || "").trim().toLowerCase();
  if (!wanted) return null;
  const learned = s?.skills?.learned || {};
  const keys = Object.keys(learned);
  let best = null;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!learned[k]) continue;
    const def = skillDef(k);
    if (String(def.focus || "").toLowerCase() !== wanted) continue;
    if (!best) {
      best = def;
      continue;
    }
    const bt = Math.max(1, Math.floor(best.tier || 1));
    const dt = Math.max(1, Math.floor(def.tier || 1));
    if (dt > bt) best = def;
    else if (dt === bt && !!def.powerful && !best.powerful) best = def;
  }
  return best;
}

function combatSkillDefs(s) {
  if (!s) return [];
  const learned = s.skills?.learned || {};
  const keys = Object.keys(learned).filter((k) => !!learned[k]);
  const defs = keys.map((k) => skillDef(k));
  const prio = (def) => {
    const k = String(def?.focus || "").toLowerCase();
    if (k === "arcana") return 4;
    if (k === "strength") return 3;
    if (k === "cunning") return 2;
    if (k === "resilience") return 1;
    return 0;
  };
  defs.sort((a, b) => {
    const p = prio(b) - prio(a);
    if (p) return p;
    const t = (b.tier || 1) - (a.tier || 1);
    if (t) return t;
    const br = Math.max(1, Math.floor(learned[b.key] || 1));
    const ar = Math.max(1, Math.floor(learned[a.key] || 1));
    if (br !== ar) return br - ar;
    return (b.powerful ? 1 : 0) - (a.powerful ? 1 : 0);
  });
  return defs;
}

function skillSourceForKey(s, skillKey, def) {
  const parsed = parseSkillKey(skillKey);
  if (!parsed) return "profession";
  const build = String(s?.character?.build || "balanced").toLowerCase();
  const buildFocus = buildFocusForBuild(build);
  if (!buildFocus) return "profession";
  const focus = String(def?.focus || "").toLowerCase();
  const h = hashString(`src:${parsed.profession}:${parsed.build}:${parsed.index}`) >>> 0;
  const pct = h % 100;
  let threshold = (build === "tank") ? 55 : 45;
  if (focus && String(buildFocus).toLowerCase() === focus) threshold = Math.min(85, threshold + 20);
  else threshold = Math.max(10, threshold - 20);
  return (pct < threshold) ? "build" : "profession";
}

function combatSkillDefsForMenu(s, menu) {
  if (!s) return [];
  const learned = s.skills?.learned || {};
  const sources = s.skills?.sources || {};
  const defs = Object.keys(learned)
    .filter((k) => !!learned[k])
    .map((k) => {
      const def = skillDef(k);
      const src = sources[k] || skillSourceForKey(s, k, def);
      return { def, src };
    })
    .filter((x) => {
      if (menu === "profession") return x.src === "profession";
      if (menu === "skills") return x.src === "build";
      return true;
    })
    .map((x) => x.def);
  const prio = (def) => {
    const k = String(def?.focus || "").toLowerCase();
    if (k === "arcana") return 4;
    if (k === "strength") return 3;
    if (k === "cunning") return 2;
    if (k === "resilience") return 1;
    return 0;
  };
  defs.sort((a, b) => {
    const p = prio(b) - prio(a);
    if (p) return p;
    const t = (b.tier || 1) - (a.tier || 1);
    if (t) return t;
    const br = Math.max(1, Math.floor(learned[b.key] || 1));
    const ar = Math.max(1, Math.floor(learned[a.key] || 1));
    if (br !== ar) return br - ar;
    return (b.powerful ? 1 : 0) - (a.powerful ? 1 : 0);
  });
  return defs;
}

function addInvItem(s, key, amt) {
  if (!s) return;
  const k = String(key || "").trim();
  if (!k) return;
  const n = Math.max(0, Math.floor(amt || 0));
  if (n <= 0) return;
  s.inventory = s.inventory || {};
  s.inventory[k] = (s.inventory[k] || 0) + n;
}

function consumeInvItem(s, key, amt) {
  if (!s) return false;
  const k = String(key || "").trim();
  if (!k) return false;
  const n = Math.max(1, Math.floor(amt || 1));
  const cur = Math.max(0, Math.floor(s.inventory?.[k] || 0));
  if (cur < n) return false;
  s.inventory[k] = cur - n;
  if (s.inventory[k] <= 0) delete s.inventory[k];
  return true;
}

function pickCombatDropKey(tier, roll) {
  const t = clamp(Math.floor(tier || 1), 1, 5);
  const r = typeof roll === "number" ? roll : Math.random();

  const common = ["bandage", "tonic", "health_potion", "mana_potion", "stamina_draught", "antidote", "smoke_bomb", "ration", "torch"];
  const mats = ["herb_sageleaf", "herb_nightbloom", "ore_iron", "ore_silver", "cloth", "leather", "lumber", "rune_shard", "ember_gem"];
  const rareGear = ["ring_of_focus", "amulet_of_vigor", "charm", "shadowweave_cloak", "stormguard_chainmail", "dawnspire_helm", "moonstone_boots"];

  if (t >= 5 && r < 0.14) return rareGear[Math.floor(Math.random() * rareGear.length)];
  if (t >= 4 && r < 0.08) return rareGear[Math.floor(Math.random() * rareGear.length)];
  if (r < 0.55) return common[Math.floor(Math.random() * common.length)];
  if (r < 0.88) return mats[Math.floor(Math.random() * mats.length)];

  const id = String(1 + Math.floor(Math.random() * 200)).padStart(3, "0");
  const genKey = `consumable_${id}`;
  if (ITEM_CATALOG[genKey]) return genKey;
  return common[Math.floor(Math.random() * common.length)];
}

function tickEnemyBleeds(ev) {
  if (!ev) return;
  const enemies = Array.isArray(ev.enemies) ? ev.enemies : [];
  for (const e of enemies) {
    if (!e || (e.hp || 0) <= 0) continue;
    if ((e.bleedTurns || 0) <= 0) continue;
    const dmg = Math.max(1, Math.floor(e.bleedDmg || 1));
    e.hp = Math.max(0, (e.hp || 0) - dmg);
    e.bleedTurns = Math.max(0, Math.floor((e.bleedTurns || 0) - 1));
    pushCombatLog(ev, `🩸 ${e.name} bleeds (-${dmg} HP).`);
    if (e.hp <= 0) pushCombatLog(ev, `✅ ${e.name} collapses.`);
  }
}

function executeCombatSkill(skillKey, ev) {
  if (!state || !ev) return false;
  normalizeState(state);
  const k = String(skillKey || "").trim();
  if (!k) return false;
  if (!state.skills?.learned?.[k]) {
    pushCombatLog(ev, "You don't know that technique.");
    return false;
  }
  const def = skillDef(k);
  const rank = Math.max(1, Math.floor(state.skills.learned[k] || 1));
  const rankMul = 1 + (rank - 1) * 0.15;
  const enemies = aliveEnemies(ev);
  if (!enemies.length) return false;
  const target = enemies[0];

  // Spells as hard as level suggests - if player level far below skill tier requirement or mob level, success drops to 5% or 2%
  const playerLvl = Math.max(1, Math.floor(state.level || 1));
  const skillTier = Math.max(1, Math.floor(def.tier || 1));
  // Map skill tier to required level for spells: tier1=1, tier2=25, tier3=70, tier4=150, tier5=300, tier6=500, tier7=650
  const tierReq = {1:1, 2:25, 3:70, 4:150, 5:300, 6:500, 7:650}[skillTier] || (skillTier*100);
  // Lock spells that don't meet requirement - as requested by user
  if (playerLvl < tierReq) {
    pushCombatLog(ev, `🔒 [SPELL LOCKED] ${def.label} Tier ${skillTier} requires Lv${tierReq}, you are Lv${playerLvl}. Locked till you meet requirement!`);
    return false;
  }
  const tierDiff = tierReq - playerLvl;
  let spellSuccessRate = 1.0;
  if (tierDiff >= 50) spellSuccessRate = 0.02;
  else if (tierDiff >= 30) spellSuccessRate = 0.05;
  else if (tierDiff >= 15) spellSuccessRate = 0.25;
  else if (tierDiff >= 5) spellSuccessRate = 0.55;

  // Also check mob rec level vs player for spell
  const mobRec = getEnemyRecLevelForCombat(ev);
  const mobDiff = mobRec - playerLvl;
  if (mobDiff >= 50) spellSuccessRate = Math.min(spellSuccessRate, 0.02);
  else if (mobDiff >= 30) spellSuccessRate = Math.min(spellSuccessRate, 0.05);

  if (spellSuccessRate < 1.0 && Math.random() > spellSuccessRate) {
    pushCombatLog(ev, `🔮 [SPELL LEVEL GAP] ${def.label} (Tier ${skillTier} req Lv${tierReq}) vs you Lv${playerLvl} & Mob Lv${mobRec} - success dropped to ${Math.round(spellSuccessRate*100)}%! Spell fizzles!`);
    // Still spend mana? Make it cost half mana on fail
    const baseCost = 4 + skillTier * 2 + (def.powerful ? 2 : 0);
    const manaCost = Math.max(1, Math.floor(baseCost * 0.5));
    state.mana = Math.max(0, (state.mana||0) - manaCost);
    return true;
  } else if (spellSuccessRate < 1.0) {
    pushCombatLog(ev, `⚠️ ${def.label} hard for your level (Tier ${skillTier} req Lv${tierReq}) - only ${Math.round(spellSuccessRate*100)}% success, you push through!`);
  }


  const tier = Math.max(1, Math.floor(def.tier || 1));
  const pow = def.powerful ? 1 : 0;
  const focus = String(def.focus || "").toLowerCase();
  const eq = totalEquipmentBonuses(state);
  const v = skillVariantForDef(def, 5);
  const dmgScalar = 0.85 + skillRoll01(def, "dmg") * 0.30;

  if (focus === "strength") {
    const plvl = Math.max(1, Math.floor(state?.level || 1));
    const lvlBonus = plvl * 0.6 + (plvl > 100 ? (plvl-100)*0.4 : 0) + (plvl > 300 ? (plvl-300)*0.3 : 0);
    const base = 6 + playerStat("strength") * 1.25 + lvlBonus;
    if (v === 1) {
      const list = aliveEnemies(ev);
      const per = 0.60 + skillRoll01(def, "cleave") * 0.10;
      const dmg = Math.max(2, Math.floor((((base + tier * 4 + pow * 8 + Math.random() * 5 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar * per));
      for (const e of list) {
        e.hp = Math.max(0, (e.hp || 0) - dmg);
      }
      pushCombatLog(ev, `🗡️ ${state.profile} uses ${def.label}. Cleave strikes all enemies (-${dmg} HP each).`);
      return true;
    }
    if (v === 2) {
      const dmg = Math.max(2, Math.floor((((base + tier * 3 + pow * 8 + Math.random() * 5 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      const debuff = -clamp(0.06 + tier * 0.01 + pow * 0.02 + (rank - 1) * 0.01 + skillRoll01(def, "acc") * 0.05, 0.06, 0.22);
      target.accMod = (typeof target.accMod === "number") ? Math.min(target.accMod, debuff) : debuff;
      target.accModTurns = Math.max(target.accModTurns || 0, 1 + Math.floor(tier / 2));
      const boost = clamp(0.08 + tier * 0.02 + pow * 0.04 + (rank - 1) * 0.02 + skillRoll01(def, "boost") * 0.06, 0.08, 0.35);
      ev.partyDmgBoost = Math.max(ev.partyDmgBoost || 0, boost);
      ev.partyDmgBoostTurns = Math.max(ev.partyDmgBoostTurns || 0, 2);
      pushCombatLog(ev, `🔨 ${state.profile} uses ${def.label} on ${target.name} (-${dmg} HP). Armor breaks; aim falters.`);
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
      return true;
    }
    if (v === 3) {
      const per = 0.68 + skillRoll01(def, "rend") * 0.12;
      const dmg = Math.max(2, Math.floor((((base + tier * 3 + pow * 7 + Math.random() * 5 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar * per));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      pushCombatLog(ev, `🩸 ${state.profile} uses ${def.label} on ${target.name} (-${dmg} HP).`);
      const bleedChance = clamp(0.55 + tier * 0.03 + pow * 0.10 + (rank - 1) * 0.04 + skillRoll01(def, "bleed") * 0.10, 0.45, 0.90);
      if (target.hp > 0 && Math.random() < bleedChance) {
        target.bleedTurns = Math.max(target.bleedTurns || 0, 3 + Math.floor(tier / 2) + pow);
        target.bleedDmg = Math.max(target.bleedDmg || 0, 1 + Math.floor(tier / 2) + pow);
        pushCombatLog(ev, `🩸 ${target.name} is rended and bleeds.`);
      }
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
      return true;
    }
    if (v === 4) {
      const thresh = clamp(0.35 + skillRoll01(def, "th") * 0.10, 0.30, 0.50);
      const execMul = 1.45 + skillRoll01(def, "exec") * 0.35 + pow * 0.10;
      const hpPct = (target.maxHp || 1) > 0 ? (target.hp || 0) / (target.maxHp || 1) : 1;
      const burst = (hpPct > 0 && hpPct <= thresh) ? execMul : 1;
      const dmg = Math.max(2, Math.floor((((base + tier * 5 + pow * 12 + Math.random() * 6 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar * burst));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      pushCombatLog(ev, `⚔️ ${state.profile} uses ${def.label} on ${target.name} (-${dmg} HP).`);
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
      return true;
    }

    const dmg = Math.max(2, Math.floor((((base + tier * 4 + pow * 10 + Math.random() * 6 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar));
    target.hp = Math.max(0, (target.hp || 0) - dmg);
    pushCombatLog(ev, `💢 ${state.profile} uses ${def.label} on ${target.name} (-${dmg} HP).`);
    const bleedChance = clamp(0.18 + tier * 0.04 + pow * 0.12 + (rank - 1) * 0.03 + skillRoll01(def, "bleed") * 0.08, 0.1, 0.85);
    if (target.hp > 0 && Math.random() < bleedChance) {
      target.bleedTurns = Math.max(target.bleedTurns || 0, 2 + Math.floor(tier / 2) + pow);
      target.bleedDmg = Math.max(target.bleedDmg || 0, 1 + Math.floor(tier / 2) + pow);
      pushCombatLog(ev, `🩸 ${target.name} starts bleeding.`);
    }
    if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
    return true;
  }

  if (focus === "arcana") {
    const baseCost = 4 + tier * 2 + pow * 2;
    const manaCost = Math.max(2, Math.floor(baseCost * (0.85 + skillRoll01(def, "cost") * 0.35)));
    if ((state.mana || 0) < manaCost) {
      pushCombatLog(ev, `Not enough mana (need ${manaCost}).`);
      return false;
    }
    state.mana -= manaCost;
    const plvlA = Math.max(1, Math.floor(state?.level || 1));
    const lvlBonusA = plvlA * 0.5 + (plvlA > 100 ? (plvlA-100)*0.35 : 0) + (plvlA > 300 ? (plvlA-300)*0.25 : 0);
    const base = 10 + playerStat("arcana") * 1.5 + lvlBonusA;
    if (v === 1) {
      const list = aliveEnemies(ev);
      const per = 0.50 + skillRoll01(def, "chain") * 0.15;
      const dmg = Math.max(3, Math.floor((((base + tier * 4 + pow * 8 + Math.random() * 7 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar * per));
      for (const e of list) e.hp = Math.max(0, (e.hp || 0) - dmg);
      pushCombatLog(ev, `🌩️ ${state.profile} casts ${def.label} (-${manaCost} mana). Chain sparks hit all enemies (-${dmg} HP each).`);
      return true;
    }
    if (v === 2) {
      const dmg = Math.max(3, Math.floor((((base + tier * 4 + pow * 8 + Math.random() * 7 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      const ms = 16000 + tier * 2500;
      addEffect("aether", ms);
      pushCombatLog(ev, `🔮 ${state.profile} casts ${def.label} (-${manaCost} mana, ${target.name} -${dmg} HP). Aether surrounds you.`);
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} disintegrates.`);
      return true;
    }
    if (v === 3) {
      const per = 0.70 + skillRoll01(def, "ward") * 0.10;
      const dmg = Math.max(3, Math.floor((((base + tier * 3 + pow * 6 + Math.random() * 6 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar * per));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      addEffect("hasted", 9000 + tier * 800);
      ev.escapeBoost = Math.max(ev.escapeBoost || 0, clamp(0.08 + tier * 0.02 + pow * 0.05 + (rank - 1) * 0.02 + skillRoll01(def, "esc") * 0.08, 0.08, 0.40));
      ev.escapeBoostTurns = Math.max(ev.escapeBoostTurns || 0, 2);
      pushCombatLog(ev, `🌬️ ${state.profile} casts ${def.label} (-${manaCost} mana, ${target.name} -${dmg} HP). You are hastened.`);
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} disintegrates.`);
      return true;
    }
    if (v === 4) {
      const dmg = Math.max(3, Math.floor((((base + tier * 4 + pow * 9 + Math.random() * 7 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      const boost = clamp(0.10 + tier * 0.03 + pow * 0.06 + (rank - 1) * 0.04 + skillRoll01(def, "boost") * 0.10, 0.10, 0.65);
      ev.partyDmgBoost = Math.max(ev.partyDmgBoost || 0, boost);
      ev.partyDmgBoostTurns = Math.max(ev.partyDmgBoostTurns || 0, 1);
      pushCombatLog(ev, `🕯️ ${state.profile} casts ${def.label} (-${manaCost} mana, ${target.name} -${dmg} HP). Void mark flares.`);
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} disintegrates.`);
      return true;
    }

    const dmg = Math.max(3, Math.floor((((base + tier * 5 + pow * 10 + Math.random() * 8 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar));
    target.hp = Math.max(0, (target.hp || 0) - dmg);
    pushCombatLog(ev, `✨ ${state.profile} casts ${def.label} (-${manaCost} mana, ${target.name} -${dmg} HP).`);
    const debuff = -clamp(0.06 + tier * 0.01 + pow * 0.03 + (rank - 1) * 0.01 + skillRoll01(def, "acc") * 0.04, 0.06, 0.24);
    target.accMod = (typeof target.accMod === "number") ? Math.min(target.accMod, debuff) : debuff;
    target.accModTurns = Math.max(target.accModTurns || 0, 1 + Math.floor(tier / 2));
    if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} disintegrates.`);
    return true;
  }

  if (focus === "cunning") {
    const list = aliveEnemies(ev);
    if (v === 1) {
      const esc = clamp(0.12 + tier * 0.02 + pow * 0.05 + (rank - 1) * 0.03 + skillRoll01(def, "esc") * 0.08, 0.12, 0.45);
      ev.escapeBoost = Math.max(ev.escapeBoost || 0, esc);
      ev.escapeBoostTurns = Math.max(ev.escapeBoostTurns || 0, 2);
      pushCombatLog(ev, `🌫️ ${state.profile} uses ${def.label}. The battlefield blurs; escape is easier.`);
      return true;
    }
    if (v === 2) {
      const base = 5 + playerStat("cunning") * 0.9;
      const per = 0.75 + skillRoll01(def, "pin") * 0.20;
      const dmg = Math.max(2, Math.floor((((base + tier * 3 + pow * 6 + Math.random() * 5 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar * per));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      const debuff = -clamp(0.16 + tier * 0.02 + pow * 0.05 + (rank - 1) * 0.02 + skillRoll01(def, "acc") * 0.08, 0.16, 0.55);
      target.accMod = (typeof target.accMod === "number") ? Math.min(target.accMod, debuff) : debuff;
      target.accModTurns = Math.max(target.accModTurns || 0, 2 + Math.floor(tier / 2));
      pushCombatLog(ev, `🎯 ${state.profile} uses ${def.label} on ${target.name} (-${dmg} HP). Their aim is ruined.`);
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
      return true;
    }
    if (v === 3) {
      const boost = clamp(0.10 + tier * 0.03 + pow * 0.06 + (rank - 1) * 0.03 + skillRoll01(def, "boost") * 0.10, 0.10, 0.55);
      const ms = 9000 + Math.floor(skillRoll01(def, "ms") * 8000) + tier * 1500;
      addEffect("shielded", ms);
      ev.partyDmgBoost = Math.max(ev.partyDmgBoost || 0, boost);
      ev.partyDmgBoostTurns = Math.max(ev.partyDmgBoostTurns || 0, 1);
      pushCombatLog(ev, `🪤 ${state.profile} uses ${def.label}. Your party gains an opening.`);
      return true;
    }
    if (v === 4) {
      const base = 6 + playerStat("cunning") * 1.05;
      const per = 0.95 + skillRoll01(def, "amb") * 0.25;
      const dmg = Math.max(2, Math.floor((((base + tier * 4 + pow * 8 + Math.random() * 6 + (eq.dmgFlat || 0)) * (eq.dmgMult || 1)) * rankMul) * dmgScalar * per));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      pushCombatLog(ev, `🗡️ ${state.profile} uses ${def.label} on ${target.name} (-${dmg} HP).`);
      const bleedChance = clamp(0.12 + tier * 0.03 + pow * 0.08 + (rank - 1) * 0.02 + skillRoll01(def, "bleed") * 0.10, 0.10, 0.60);
      if (target.hp > 0 && Math.random() < bleedChance) {
        target.bleedTurns = Math.max(target.bleedTurns || 0, 2 + Math.floor(tier / 2));
        target.bleedDmg = Math.max(target.bleedDmg || 0, 1 + Math.floor(tier / 3));
        pushCombatLog(ev, `🩸 ${target.name} is cut and bleeds.`);
      }
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
      return true;
    }

    const debuff = -clamp(0.12 + tier * 0.02 + pow * 0.05 + (rank - 1) * 0.02 + skillRoll01(def, "acc") * 0.06, 0.12, 0.45);
    const dur = 1 + Math.floor(tier / 2);
    for (const e of list) {
      e.accMod = (typeof e.accMod === "number") ? Math.min(e.accMod, debuff) : debuff;
      e.accModTurns = Math.max(e.accModTurns || 0, dur);
    }
    ev.partyDmgBoost = Math.max(ev.partyDmgBoost || 0, clamp(0.20 + tier * 0.04 + pow * 0.12 + (rank - 1) * 0.04 + skillRoll01(def, "boost") * 0.10, 0.2, 1.05));
    ev.partyDmgBoostTurns = Math.max(ev.partyDmgBoostTurns || 0, 1);
    pushCombatLog(ev, `🕶️ ${state.profile} uses ${def.label}. Enemies are thrown off-balance.`);
    return true;
  }

  if (focus === "resilience") {
    if (v === 1) {
      const ms = 16000 + tier * 2600;
      addEffect("shielded", ms);
      clearEffect("bleeding");
      const heal = Math.max(2, Math.floor((2 + tier * 1 + pow * 4) * rankMul * (0.9 + skillRoll01(def, "heal") * 0.25)));
      state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
      const ids = alivePartyActorIds(state);
      for (const id of ids) ev.guard[id] = 1;
      pushCombatLog(ev, `🧱 ${state.profile} uses ${def.label}. Fortified (+${heal} HP, Shielded).`);
      return true;
    }
    if (v === 2) {
      const heal = Math.max(2, Math.floor((3 + tier * 2 + pow * 5) * rankMul * (0.9 + skillRoll01(def, "heal") * 0.25)));
      state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
      if (state.party && Array.isArray(state.party.members)) {
        for (const m of state.party.members) {
          if (!m) continue;
          if ((m.hp || 0) <= 0) continue;
          m.hp = Math.min(m.maxHp || 1, (m.hp || 0) + Math.max(1, Math.floor(heal * 0.7)));
        }
      }
      const boost = clamp(0.10 + tier * 0.03 + pow * 0.06 + (rank - 1) * 0.03 + skillRoll01(def, "boost") * 0.10, 0.10, 0.75);
      ev.partyDmgBoost = Math.max(ev.partyDmgBoost || 0, boost);
      ev.partyDmgBoostTurns = Math.max(ev.partyDmgBoostTurns || 0, 2);
      pushCombatLog(ev, `📣 ${state.profile} uses ${def.label}. Rallying surge (+${heal} HP).`);
      return true;
    }
    if (v === 3) {
      const heal = Math.max(2, Math.floor((2 + tier * 2 + pow * 6) * rankMul * (0.9 + skillRoll01(def, "heal") * 0.25)));
      const mana = Math.max(2, Math.floor((2 + tier * 1 + pow * 3) * rankMul * (0.9 + skillRoll01(def, "mana") * 0.25)));
      state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
      state.mana = Math.min(playerMaxMana(), (state.mana || 0) + mana);
      clearEffect("cursed");
      addEffect("rested", 7000 + tier * 1000);
      pushCombatLog(ev, `🌿 ${state.profile} uses ${def.label}. Second wind (+${heal} HP, +${mana} mana).`);
      return true;
    }
    if (v === 4) {
      const ms = 15000 + tier * 2600;
      addEffect("shielded", ms);
      if (skillRoll01(def, "skin") < 0.5) addEffect("ironbark", ms);
      else addEffect("wyrmhide", ms);
      const heal = Math.max(2, Math.floor((2 + tier * 1 + pow * 4) * rankMul));
      state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
      const ids = alivePartyActorIds(state);
      for (const id of ids) ev.guard[id] = 1;
      pushCombatLog(ev, `🛡️ ${state.profile} uses ${def.label}. Bulwark rises (+${heal} HP).`);
      return true;
    }

    const ms = 12000 + tier * 2500;
    addEffect("shielded", ms);
    const heal = Math.max(2, Math.floor((4 + tier * 2 + pow * 6) * rankMul));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    if (state.party && Array.isArray(state.party.members)) {
      for (const m of state.party.members) {
        if (!m) continue;
        if ((m.hp || 0) <= 0) continue;
        m.hp = Math.min(m.maxHp || 1, (m.hp || 0) + Math.max(1, Math.floor(heal * 0.6)));
      }
    }
    const ids = alivePartyActorIds(state);
    for (const id of ids) ev.guard[id] = 1;
    pushCombatLog(ev, `🛡️ ${state.profile} uses ${def.label}. Your party steadies (+${heal} HP, Shielded).`);
    return true;
  }

  pushCombatLog(ev, "Nothing happens.");
  return false;
}

function pushCombatLog(ev, line) {
  if (!ev) return;
  ev.log = Array.isArray(ev.log) ? ev.log : [];
  ev.log.push(String(line));
  if (ev.log.length > 14) ev.log = ev.log.slice(-14);
}

function alivePartyActorIds(s) {
  const list = allPartyActors(s);
  const ids = [];
  for (const a of list) {
    if (!a) continue;
    if ((a.hp || 0) <= 0) continue;
    ids.push(a.id);
  }
  return ids;
}

function aliveEnemies(ev) {
  const enemies = Array.isArray(ev?.enemies) ? ev.enemies : [];
  return enemies.filter((e) => e && (e.hp || 0) > 0);
}

function applyDamageToPartyTarget(targetId, amount, ev) {
  if (!state) return;
  const dmg = Math.max(0, Math.floor(amount || 0));
  const guarded = !!ev?.guard?.[targetId];
  let finalDmg = guarded ? Math.max(1, Math.floor(dmg * 0.55)) : dmg;

  if (targetId === "player") {
    if (hasEffectOnState(state, "shielded")) finalDmg = Math.max(1, Math.floor(finalDmg * 0.55)); // BUFFED
    if (hasEffectOnState(state, "wyrmhide")) finalDmg = Math.max(1, Math.floor(finalDmg * 0.60)); // BUFFED
    if (hasEffectOnState(state, "ironbark")) finalDmg = Math.max(1, Math.floor(finalDmg * 0.68)); // BUFFED
    if (hasEffectOnState(state, "voidsalt")) finalDmg = Math.max(1, Math.floor(finalDmg * 0.75)); // BUFFED
    if (hasEffectOnState(state, "cursed")) finalDmg = Math.max(1, Math.floor(finalDmg * 1.15));
    const eq = totalEquipmentBonuses(state);
    finalDmg = Math.max(1, Math.floor(finalDmg * (eq.damageTakenMult || 1)));
  }

  if (finalDmg > 0) {
    playHitFx();
    if (targetId === "player" && finalDmg >= 8 && Math.random() < 0.35) {
      addEffect("bleeding", 15000);
    }
  }

  if (targetId === "player") {
    state.hp = Math.max(0, (state.hp || 0) - finalDmg);
    return finalDmg;
  }
  const c = findPartyMemberById(state, targetId);
  if (!c) return 0;
  c.hp = Math.max(0, (c.hp || 0) - finalDmg);
  return finalDmg;
}

function clearGuardFlags(ev) {
  if (!ev) return;
  ev.guard = {};
}

function healPartyTarget(targetId, amount) {
  if (!state) return 0;
  const heal = Math.max(0, Math.floor(amount || 0));
  if (heal <= 0) return 0;
  if (targetId === "player") {
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    return heal;
  }
  const c = findPartyMemberById(state, targetId);
  if (!c) return 0;
  c.hp = Math.min(c.maxHp || 1, (c.hp || 0) + heal);
  return heal;
}

function restoreManaPartyTarget(targetId, amount) {
  if (!state) return 0;
  const gain = Math.max(0, Math.floor(amount || 0));
  if (gain <= 0) return 0;
  if (targetId === "player") {
    state.mana = Math.min(playerMaxMana(), (state.mana || 0) + gain);
    return gain;
  }
  const c = findPartyMemberById(state, targetId);
  if (!c) return 0;
  if ((c.maxMana || 0) <= 0) return 0;
  c.mana = Math.min(c.maxMana || 0, (c.mana || 0) + gain);
  return gain;
}

function companionSkillLabel(c, salt) {
  const prof = String(c?.profession || "fighter").trim().toLowerCase() || "fighter";
  const build = String(c?.build || "balanced").trim().toLowerCase() || "balanced";
  const x = hashString(`${String(c?.id || "npc")}:${String(salt || "")}`);
  const idx = (x % SKILLS_PER_COMBO) + 1;
  const def = skillDefFromParts(prof, build, idx);
  return def?.label || "Technique";
}

function companionAiAct(c, ev) {
  if (!state || !ev || !c) return;
  if ((c.hp || 0) <= 0) return;
  const enemies = aliveEnemies(ev);
  if (!enemies.length) return;
  const target = enemies[0];

  const lvl = Math.max(1, Math.floor(c.level || 1));
  const prof = String(c.profession || "fighter").toLowerCase();
  const build = String(c.build || "balanced").toLowerCase();
  const st = c.stats || { strength: 0, cunning: 0, arcana: 0, resilience: 0 };
  const hpPct = (c.maxHp || 1) > 0 ? (c.hp || 0) / (c.maxHp || 1) : 1;
  const manaPct = (c.maxMana || 0) > 0 ? (c.mana || 0) / (c.maxMana || 1) : 1;
  const tier = clamp(1 + Math.floor((lvl - 1) / 2), 1, 5);
  const lvlMul = 1 + clamp((lvl - 1) * 0.05, 0, 0.85);

  if (ev.stage === "combat") {
    const inv = state.inventory || {};
    if (hpPct > 0 && hpPct <= 0.35) {
      if ((inv.health_potion || 0) > 0) {
        useItem("health_potion", ev, c.id);
        return;
      }
      if ((inv.bandage || 0) > 0) {
        useItem("bandage", ev, c.id);
        return;
      }
    }
    if ((c.maxMana || 0) > 0 && manaPct >= 0 && manaPct <= 0.25) {
      if ((inv.mana_potion || 0) > 0) {
        useItem("mana_potion", ev, c.id);
        return;
      }
      if ((inv.tonic || 0) > 0) {
        useItem("tonic", ev, c.id);
        return;
      }
    }
  }

  const allies = allPartyActors(state)
    .filter((a) => a && (a.hp || 0) > 0)
    .map((a) => ({ id: a.id, name: a.name, hp: a.hp || 0, maxHp: a.maxHp || 1, pct: (a.maxHp || 1) > 0 ? (a.hp || 0) / (a.maxHp || 1) : 1 }));
  allies.sort((a, b) => a.pct - b.pct);
  const low = allies[0];

  const spendMana = (cost) => {
    const m = Math.max(0, Math.floor(cost || 0));
    if ((c.mana || 0) < m) return false;
    c.mana = Math.max(0, Math.floor((c.mana || 0) - m));
    return true;
  };

  const learned = c.skills?.learned || {};
  const learnedKeys = Object.keys(learned).filter((k) => !!learned[k]);
  const preferredSkill = (() => {
    if (!learnedKeys.length) return null;
    const focusPrio = (def) => {
      const f = String(def?.focus || "").toLowerCase();
      if (prof === "mage" && f === "arcana") return 5;
      if (prof === "cleric" && (f === "resilience" || f === "arcana")) return 5;
      if ((prof === "rogue" || build === "trickster") && f === "cunning") return 5;
      if (prof === "fighter" && (f === "strength" || f === "resilience")) return 5;
      if (prof === "ranger" && (f === "cunning" || f === "resilience")) return 5;
      return 0;
    };
    const list = learnedKeys
      .map((k) => {
        const def = skillDef(k);
        const rank = Math.max(1, Math.floor(learned[k] || 1));
        return { k, def, rank, prio: focusPrio(def) };
      })
      .sort((a, b) => (b.prio - a.prio) || ((b.def?.tier || 1) - (a.def?.tier || 1)) || ((b.def?.powerful ? 1 : 0) - (a.def?.powerful ? 1 : 0)) || (b.rank - a.rank));
    return list[0] || null;
  })();

  if (preferredSkill && Math.random() < 0.70) {
    const def = preferredSkill.def;
    const focus = String(def?.focus || "").toLowerCase();
    const pow = def?.powerful ? 1 : 0;
    const rank = preferredSkill.rank;
    const tierSkill = Math.max(1, Math.floor(def?.tier || 1));

    if (focus === "resilience") {
      const needHeal = low && low.pct < 0.70;
      const cost = Math.max(3, 4 + tierSkill * 2 + pow * 2);
      if (needHeal && spendMana(cost)) {
        const heal = Math.max(3, Math.floor(((7 + tierSkill * 4 + (st.resilience || 0) * 1.2 + (st.arcana || 0) * 0.6) * lvlMul) * (0.82 + Math.random() * 0.28) * (1 + (rank - 1) * 0.15)));
        const did = healPartyTarget(low.id, heal);
        pushCombatLog(ev, `✨ ${c.name} uses ${def.label} on ${low.id === "player" ? state.profile : low.name} (+${did} HP). (-${cost} mana)`);
        return;
      }
    }

    if (focus === "arcana" && spendMana(Math.max(3, 4 + tierSkill * 2 + pow * 2))) {
      const cost = Math.max(3, 4 + tierSkill * 2 + pow * 2);
      const dmg = Math.max(3, Math.floor(((8 + tierSkill * 4 + pow * 5 + (st.arcana || 0) * 1.4 + (st.cunning || 0) * 0.5) * lvlMul) * (0.82 + Math.random() * 0.35) * (1 + (rank - 1) * 0.15)));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      pushCombatLog(ev, `✨ ${c.name} casts ${def.label} on ${target.name} (-${dmg} HP). (-${cost} mana)`);
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
      return;
    }

    if (focus === "cunning") {
      const debuff = -clamp(0.10 + tierSkill * 0.03 + pow * 0.08 + (rank - 1) * 0.02 + (st.cunning || 0) * 0.003 + Math.random() * 0.06, 0.10, 0.55);
      target.accMod = (typeof target.accMod === "number") ? Math.min(target.accMod, debuff) : debuff;
      target.accModTurns = Math.max(target.accModTurns || 0, 2);
      const dmg = Math.max(1, Math.floor(((4 + tierSkill * 3 + pow * 3 + (st.cunning || 0) * 1.0) * lvlMul) * (0.85 + Math.random() * 0.35) * (1 + (rank - 1) * 0.15)));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      pushCombatLog(ev, `🎯 ${c.name} uses ${def.label} on ${target.name} (-${dmg} HP). Enemy aim falters.`);
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
      return;
    }

    if (focus === "strength") {
      const dmg = Math.max(1, Math.floor(((5 + tierSkill * 4 + pow * 4 + (st.strength || 0) * 1.2) * lvlMul) * (0.85 + Math.random() * 0.35) * (1 + (rank - 1) * 0.15)));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      pushCombatLog(ev, `🗡️ ${c.name} uses ${def.label} on ${target.name} (-${dmg} HP).`);
      if (target.hp > 0 && Math.random() < clamp(0.10 + tierSkill * 0.05 + pow * 0.08, 0.10, 0.65)) {
        target.bleedTurns = Math.max(target.bleedTurns || 0, 2 + Math.floor(tierSkill / 2) + pow);
        target.bleedDmg = Math.max(target.bleedDmg || 0, 1 + Math.floor(tierSkill / 2) + pow);
        pushCombatLog(ev, `🩸 ${target.name} starts bleeding.`);
      }
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
      return;
    }
  }

  // Cleric/healer logic
  if (prof === "cleric") {
    const needHeal = low && low.pct < 0.65;
    const cost = Math.max(4, 5 + tier * 2);
    if (needHeal && spendMana(cost)) {
      const heal = Math.max(4, Math.floor(((8 + tier * 4 + (st.arcana || 0) * 1.2 + (st.resilience || 0) * 0.8) * lvlMul) * (0.85 + Math.random() * 0.25)));
      const did = healPartyTarget(low.id, heal);
      pushCombatLog(ev, `✨ ${c.name} casts ${companionSkillLabel(c, "heal")} on ${low.id === "player" ? state.profile : low.name} (+${did} HP). (-${cost} mana)`);
      return;
    }

    // If no urgent heal, small smite
    const cost2 = Math.max(3, 4 + tier * 2);
    if (spendMana(cost2)) {
      const dmg = Math.max(2, Math.floor(((6 + tier * 3 + (st.arcana || 0) * 1.0) * lvlMul) * (0.85 + Math.random() * 0.35)));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      pushCombatLog(ev, `🔆 ${c.name} casts ${companionSkillLabel(c, "smite")} on ${target.name} (-${dmg} HP). (-${cost2} mana)`);
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
      return;
    }
  }

  // Mage logic
  if (prof === "mage") {
    const cost = Math.max(4, 5 + tier * 2);
    if (spendMana(cost)) {
      const dmg = Math.max(3, Math.floor(((9 + tier * 4 + (st.arcana || 0) * 1.4) * lvlMul) * (0.85 + Math.random() * 0.35)));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      pushCombatLog(ev, `🌩️ ${c.name} casts ${companionSkillLabel(c, "bolt")} on ${target.name} (-${dmg} HP). (-${cost} mana)`);
      if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
      return;
    }
  }

  // Tank build: guard if hurt or team is hurt
  if (build === "tank") {
    const shouldGuard = hpPct < 0.60 || (low && low.pct < 0.50);
    if (shouldGuard) {
      const ids = alivePartyActorIds(state);
      for (const id of ids) ev.guard[id] = 1;
      pushCombatLog(ev, `🛡️ ${c.name} uses ${companionSkillLabel(c, "guard")} — the party braces.`);
      return;
    }
  }

  // Trickster/rogue-ish: debuff enemy accuracy sometimes
  if (build === "trickster" || prof === "rogue") {
    const debuff = -clamp(0.10 + tier * 0.02 + (st.cunning || 0) * 0.003 + Math.random() * 0.05, 0.10, 0.45);
    target.accMod = (typeof target.accMod === "number") ? Math.min(target.accMod, debuff) : debuff;
    target.accModTurns = Math.max(target.accModTurns || 0, 2);
    const dmg = Math.max(1, Math.floor(((4 + tier * 2 + (st.cunning || 0) * 1.0) * lvlMul) * (0.85 + Math.random() * 0.35)));
    target.hp = Math.max(0, (target.hp || 0) - dmg);
    pushCombatLog(ev, `🎯 ${c.name} uses ${companionSkillLabel(c, "debuff")} on ${target.name} (-${dmg} HP). Enemy aim falters.`);
    if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
    return;
  }

  // Default: attack
  let boost = (ev.partyDmgBoostTurns || 0) > 0 ? (1 + (ev.partyDmgBoost || 0)) : 1;
  const base = 2 + (st.strength || 0) * 1.1 + (st.cunning || 0) * 0.4 + tier * 1.5 + Math.random() * 5;
  const dmg = Math.max(1, Math.floor(base * boost * lvlMul));
  target.hp = Math.max(0, (target.hp || 0) - dmg);
  pushCombatLog(ev, `🗡️ ${c.name} strikes ${target.name} (-${dmg} HP).`);
  if (target.hp <= 0) pushCombatLog(ev, `✅ ${target.name} falls.`);
}

function companionsAutoAct(ev) {
  if (!state || !ev) return;
  if (!state.party || !Array.isArray(state.party.members)) return;
  for (const c of state.party.members) {
    if (!c) continue;
    companionAiAct(c, ev);
    if (aliveEnemies(ev).length <= 0) break;
  }
}

function isCrossroadsSiegeCombat(ev) {
  return !!(ev && ev.kind === "combat" && ev.siege && ev.siege.key === "crossroads");
}

function createCrossroadsSiegeCombatEvent(s, phase) {
  if (!s) return null;
  normalizeState(s);
  const ph = String(phase || "horde").trim().toLowerCase() || "horde";

  const day = Math.max(1, Math.floor(s.world?.day || 1));
  const tier = 5;
  const seed = (hashString(`crossroads_siege:${s.profile}:${day}:${ph}`) >>> 0);
  const idxBase = (tier - 1) * 60 + 1;

  const pickTierIdx = (salt) => idxBase + ((seed + Math.imul(salt, 97)) >>> 0) % 60;

  const ev = createCombatEvent(s, "siege", mobDef(pickTierIdx(1)));
  ev.encounterKind = "siege";
  ev.fromNode = "crossroads";
  ev.didLoot = false;
  ev.didSearch = false;
  ev.didReward = false;
  ev.guard = {};
  ev.defeated = {};

  ev.siege = {
    key: "crossroads",
    tier,
    allies: ph === "overlord" ? 60 : 90,
    phase: ph,
    final: ph === "overlord",
    seed,
    round: 0,
    spot: 0,
  };

  if (ph === "horde") {
    // Fixed: horde now has mix of level 60 and 80 monsters (as requested), not just tier 5 random
    // Level 60 = tier ~3-4, Level 80 = tier 4, both scaled to be challenging
    const count = clamp(10 + (seed % 5), 10, 14); // Slightly larger horde
    const enemies = [];
    for (let i = 0; i < count; i++) {
      // Alternate between level 60 and 80 for variety: first half 60, second half 80
      const targetLevel = (i % 2 === 0) ? 60 : 80;
      // Pick tier based on target level: 60 -> tier 3, 80 -> tier 3-4
      const tierForLevel = targetLevel < 70 ? 3 : 4;
      const idxBase = (tierForLevel - 1) * 60 + 1;
      const def = mobDef(idxBase + ((seed + i * 13) % 60));
      const e = { ...def, hp: def.maxHp };
      // Scale to exact level 60 or 80: HP = base * (1 + level*0.12), Atk = base * (1 + level*0.08)
      const levelScale = targetLevel;
      e.maxHp = Math.max(80, Math.floor((e.maxHp || 40) * (1.8 + levelScale * 0.14) + levelScale * 2));
      e.hp = e.maxHp;
      e.atk = Math.max(12, Math.floor((e.atk || 8) * (1.2 + levelScale * 0.09) + levelScale * 0.6));
      e.acc = clamp((e.acc || 0.70) + 0.04 + levelScale * 0.001, 0.60, 0.92);
      e.recLevel = targetLevel;
      e.name = `${targetLevel === 60 ? 'Lvl60' : 'Lvl80'} ${e.name}`;
      if (i === 0 && Math.random() < 0.75) e.powerful = true;
      // Also apply normal scaling for player level if player is higher than 60/80
      scaleEnemyForPlayerLevel(e, s, "siege");
      enemies.push(e);
    }
    ev.enemies = enemies;
    ev.log = [
      "🏰 Crossroads Siege — The Horde (Levels 60 & 80).",
      `A mixed horde crashes in: ${Math.ceil(count/2)} at Level 60 and ${Math.floor(count/2)} at Level 80.`,
      "Dozens of adventurers rally beside you. This will be hard for low levels!",
    ];
    return ev;
  }

  // Boss is now legendary rank level 90 or 100 (as requested), not just 4.6x HP
  const base = mobDef(pickTierIdx(33));
  const boss = { ...base, hp: base.maxHp };
  boss.powerful = true;
  // Legendary rank boss level 90 or 100 (randomly chosen for variety)
  const bossLevel = (seed % 2 === 0) ? 90 : 100;
  boss.recLevel = bossLevel;
  boss.tier = 5;
  boss.legendaryRank = true;
  boss.name = `Overlord ${base.name} [LEGENDARY Lv${bossLevel}]`;
  // Scale boss to legendary level 90/100: massive HP and ATK
  // HP: base 40 * 8.5 + 900 for 90, or *9.5+1100 for 100
  const bossHpMult = bossLevel === 90 ? 8.5 : 9.5;
  const bossAtkMult = bossLevel === 90 ? 3.8 : 4.2;
  boss.maxHp = Math.max(800, Math.floor((boss.maxHp || 40) * bossHpMult + (bossLevel * 18) + 600));
  boss.hp = boss.maxHp;
  boss.atk = Math.max(45, Math.floor((boss.atk || 8) * bossAtkMult + bossLevel * 1.2 + 35));
  boss.acc = clamp((boss.acc || 0.75) + 0.14 + bossLevel * 0.0008, 0.68, 0.96);
  boss.siegeBoss = true;
  boss.siegeBossHealCd = 0;
  // Do NOT scale down for low level players - keep boss hard as level suggests
  // But if player is higher than boss level, scale up slightly
  const playerLvl = Math.max(1, Math.floor(s?.level || 1));
  if (playerLvl > bossLevel) {
    const over = playerLvl - bossLevel;
    boss.maxHp = Math.floor(boss.maxHp * (1 + over * 0.04));
    boss.hp = boss.maxHp;
    boss.atk = Math.floor(boss.atk * (1 + over * 0.03));
  }
  // If player is far below boss level (e.g., level 60 vs boss 90), success rate will be dropped to 2-5% in combat logic

  ev.enemies = [boss];
  ev.log = [
    `🔥 Crossroads Siege — The Overlord [LEGENDARY Lv${bossLevel}].`,
    `A legendary rank boss emerges: Level ${bossLevel}! Its power is overwhelming for low levels.`,
    "This ends here - if you are far below its level, success rate drops to 2-5%.",
  ];
  return ev;
}

function handleCrossroadsSiegeDefeat(ev) {
  if (!state) return;
  normalizeState(state);
  state.flags = state.flags || {};

  const phase = String(ev?.siege?.phase || ev?.siege?.stage || "").toLowerCase() || "siege";
  state.flags["siege:crossroads:completed"] = true;
  state.flags["siege:crossroads:failed"] = phase || true;

  const oldGold = Math.max(0, Math.floor(state.gold || 0));
  const keepGold = Math.min(35, Math.floor(oldGold * 0.06));
  state.gold = keepGold;

  state.inventory = state.inventory || {};
  for (const k of Object.keys(state.inventory)) {
    const kk = String(k || "").trim();
    if (!kk) continue;
    const def = (typeof itemDef === "function") ? itemDef(kk) : null;
    const isConsumable = !!def?.consumable || /^consumable_/i.test(kk);
    if (isConsumable) delete state.inventory[kk];
  }
  state.inventory.bandage = Math.max(1, Math.floor(state.inventory.bandage || 0));

  const factions = (typeof FACTIONS !== "undefined" && Array.isArray(FACTIONS) && FACTIONS.length)
    ? FACTIONS
    : ["Guild", "Rebels", "Crown", "Wilds"];
  for (const f of factions) adjustReputation(f, -3);

  const seed = (hashString(`exile:${state.profile}:${Date.now()}`) >>> 0);
  state.flags["exile:active"] = true;
  state.flags["exile:ever"] = true;
  state.flags["exile:seed"] = seed;
  state.flags["exile:riskMissionsLeft"] = 5;
  // New town ripple: everything from items down to NPC and missions replaced
  state.completed = { missions: {}, side: {} };
  if (typeof genMissions === "function") state.missions = genMissions(MISSION_COUNT, seed);
  if (typeof genSideQuests === "function") state.sideQuests = genSideQuests(SIDE_QUEST_COUNT, seed);
  if (typeof marketStockCache !== "undefined") marketStockCache = null;
  // Reset NPCs and recruits for new town - everything new
  if (state.flags) {
    state.flags.npcAttitudes = {};
    state.flags.consequenceLog = [];
    state.flags.shopPriceMod = 1;
    state.flags.messengerUnlocked = false;
    state.flags.messengerDone = false;
  }
  if (state.party) {
    state.party.recruits = [];
    state.party.recruitsDay = 0;
  }
  // Clear destination found flags so new town has new discoveries
  if (state.flags) {
    const keysToDelete = Object.keys(state.flags).filter(k => k.startsWith("found_dest_") || k.startsWith("found_"));
    for (const k of keysToDelete) delete state.flags[k];
  }

  const maxHp = playerMaxHp();
  const maxMana = playerMaxMana();
  state.hp = Math.max(1, Math.min(maxHp, Math.floor(maxHp * 0.55)));
  state.mana = Math.max(0, Math.min(maxMana, Math.floor(maxMana * 0.55)));
  // FIX: clear lingering negative effects on exile resurrect - bleeding etc should not persist
  try {
    clearEffect("bleeding");
    clearEffect("poisoned");
    clearEffect("cursed");
    if (state.effects) {
      const keep = ["rested","shielded"];
      const toClear = Object.keys(state.effects).filter(k => keep.indexOf(k) === -1);
      for (let i=0;i<toClear.length;i++) clearEffect(toClear[i]);
    }
    addEffect("rested", 15000);
  } catch(e) {}
  if (state.party && Array.isArray(state.party.members)) {
    for (const m of state.party.members) {
      if (!m) continue;
      m.hp = Math.max(1, Math.floor((m.maxHp || 1) * 0.45));
      m.mana = Math.max(0, Math.floor((m.maxMana || 0) * 0.45));
    }
  }

  state.activeQuest = null;
  state.pendingSide = null;
  state.world = state.world || {};
  state.world.pendingEvent = null;

  state.logCarry = [
    "🏚️ Crossroads burns. The line breaks.",
    "You survive — but you are cast out.",
    `You keep your hard-won skills, but lose coin and supplies. (-${oldGold - keepGold} gold)`,
    "A new town takes you in — wary, distant, and dangerous.",
  ];

  autoSave();
  enterNode("exile_town");
}

function siegeSwarmSeed(ev) {
  const n = ev?.siege?.seed;
  if (typeof n === "number" && Number.isFinite(n)) return (n >>> 0);
  const phase = String(ev?.siege?.phase || ev?.siege?.stage || "");
  const tier = Math.max(1, Math.floor(ev?.siege?.tier || 5));
  const day = Math.max(1, Math.floor(state?.world?.day || 1));
  const lvl = Math.max(1, Math.floor(state?.level || 1));
  return (hashString(`siege:crossroads:${state?.profile || ""}:${day}:${lvl}:${tier}:${phase}`) >>> 0);
}

function siegeSwarmNext(x) {
  return (Math.imul((x >>> 0), 1664525) + 1013904223) >>> 0;
}

function siegeSwarmPick01(x) {
  return ((x >>> 0) / 4294967296);
}

function siegeSwarmAdventurerAt(ev, index) {
  const seed = siegeSwarmSeed(ev);
  let x = (hashString(`swarm:${seed}:${Math.max(0, Math.floor(index || 0))}`) >>> 0);
  x = siegeSwarmNext(x);
  const profList = Array.isArray(PROFESSIONS) ? PROFESSIONS : [];
  const buildList = Array.isArray(BUILDS) ? BUILDS : [];

  const idx = Math.max(0, Math.floor(index || 0));
  const profOff = (profList.length ? (seed % profList.length) : 0);
  const buildOff = (buildList.length ? (seed % buildList.length) : 0);

  const prof = profList.length
    ? (profList[(idx + profOff + (x % profList.length)) % profList.length]?.key || "fighter")
    : "fighter";

  x = siegeSwarmNext(x);
  let build = buildList.length
    ? (buildList[(idx + buildOff) % buildList.length]?.key || "balanced")
    : "balanced";

  const playerBuild = String(state?.character?.build || "").toLowerCase();
  if (buildList.length >= 2 && playerBuild && String(build).toLowerCase() === playerBuild) {
    build = buildList[(idx + buildOff + 1) % buildList.length]?.key || build;
  }

  x = siegeSwarmNext(x);
  const name = companionNameFromSeed(x);
  return { name, profession: prof, build, seed: x };
}

function siegeSwarmSkillLine(a, label, targetName, extra) {
  const p = professionDef(a.profession);
  const b = buildDef(a.build);
  const meta = `${p ? p.label : titleCaseWord(a.profession)} / ${b ? b.label : titleCaseWord(a.build)}`;
  const tail = extra ? ` ${extra}` : "";
  return `⚔️ ${a.name} (${meta}) uses ${label}${targetName ? ` on ${targetName}` : ""}.${tail}`;
}

function applySiegeSwarmAction(ev, a, enemies, roll01) {
  const tier = Math.max(1, Math.floor(ev.siege?.tier || 5));
  const lvl = Math.max(1, Math.floor(state.level || 1));
  const phase = String(ev.siege?.phase || "").toLowerCase();
  const powerMul = phase === "overlord" ? 0.12 : 0.24;
  const p = String(a.profession || "fighter").toLowerCase();
  const b = String(a.build || "balanced").toLowerCase();

  const pickEnemy = () => {
    const list = aliveEnemies(ev);
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  };

  const dmgBase = (8 + tier * 5 + lvl * 0.35) * powerMul;
  const healBase = (7 + tier * 3 + lvl * 0.28) * powerMul;

  if (b === "tank" && roll01 < 0.32) {
    const ids = alivePartyActorIds(state);
    for (const id of ids) ev.guard[id] = 1;
    return { dmg: 0, heal: 0, line: siegeSwarmSkillLine(a, "Shield Wall", "", "The line holds."), kind: "guard" };
  }

  if ((p === "cleric" || b === "mystic") && roll01 < 0.38) {
    const heal = Math.max(4, Math.floor((healBase + Math.random() * (8 + tier * 3)) * (b === "mystic" ? 1.15 : 1)));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    if (state.party && Array.isArray(state.party.members) && Math.random() < 0.65) {
      const alive = state.party.members.filter((m) => m && (m.hp || 0) > 0);
      const t = alive.length ? alive[Math.floor(Math.random() * alive.length)] : null;
      if (t) t.hp = Math.min(t.maxHp || 1, (t.hp || 0) + Math.max(1, Math.floor(heal * 0.75)));
    }
    return { dmg: 0, heal, line: siegeSwarmSkillLine(a, "Sanctuary", "", `(+${heal} HP)`), kind: "heal" };
  }

  if ((p === "rogue" || b === "trickster") && roll01 < 0.35) {
    const e = pickEnemy();
    if (!e) return { dmg: 0, heal: 0, line: "", kind: "none" };
    const dmg = Math.max(4, Math.floor((dmgBase * 0.85 + Math.random() * (10 + tier * 3)) * (e.powerful ? 0.92 : 1)));
    e.hp = Math.max(0, (e.hp || 0) - dmg);
    const debuff = -clamp(0.10 + tier * 0.02 + Math.random() * 0.05, 0.10, 0.45);
    e.accMod = (typeof e.accMod === "number") ? Math.min(e.accMod, debuff) : debuff;
    e.accModTurns = Math.max(e.accModTurns || 0, 2);
    if (e.hp > 0 && Math.random() < clamp(0.18 + tier * 0.05, 0.18, 0.65)) {
      e.bleedTurns = Math.max(e.bleedTurns || 0, 2 + Math.floor(tier / 2));
      e.bleedDmg = Math.max(e.bleedDmg || 0, 1 + Math.floor(tier / 2));
    }
    return { dmg, heal: 0, line: siegeSwarmSkillLine(a, "Shadow Cut", e.name, `(-${dmg} HP)`), kind: "strike" };
  }

  if ((p === "mage" || b === "mystic") && roll01 < 0.36) {
    const cleave = Math.random() < 0.55;
    const list = aliveEnemies(ev);
    if (!list.length) return { dmg: 0, heal: 0, line: "", kind: "none" };
    if (cleave) {
      const per = Math.max(4, Math.floor((dmgBase * 0.60 + Math.random() * (8 + tier * 2))));
      let total = 0;
      for (const e of list) {
        const dealt = Math.max(3, Math.floor(per * (e.powerful ? 0.92 : 1)));
        e.hp = Math.max(0, (e.hp || 0) - dealt);
        total += dealt;
      }
      return { dmg: total, heal: 0, line: siegeSwarmSkillLine(a, "Arcane Storm", "", `(-${per} HP each)`), kind: "cleave" };
    }
    const e = list[Math.floor(Math.random() * list.length)];
    const dmg = Math.max(5, Math.floor((dmgBase * 1.05 + Math.random() * (14 + tier * 4)) * (e.powerful ? 0.90 : 1)));
    e.hp = Math.max(0, (e.hp || 0) - dmg);
    ev.partyDmgBoost = Math.max(ev.partyDmgBoost || 0, clamp(0.08 + tier * 0.02 + Math.random() * 0.05, 0.08, 0.40));
    ev.partyDmgBoostTurns = Math.max(ev.partyDmgBoostTurns || 0, 1);
    return { dmg, heal: 0, line: siegeSwarmSkillLine(a, "Void Lance", e.name, `(-${dmg} HP)`), kind: "strike" };
  }

  if ((p === "ranger" || b === "duelist") && roll01 < 0.33) {
    const e = pickEnemy();
    if (!e) return { dmg: 0, heal: 0, line: "", kind: "none" };
    const burst = Math.random() < 0.40;
    const mult = burst ? 1.35 : 1;
    const dmg = Math.max(5, Math.floor(((dmgBase + Math.random() * (12 + tier * 3)) * mult) * (e.powerful ? 0.92 : 1)));
    e.hp = Math.max(0, (e.hp || 0) - dmg);
    return { dmg, heal: 0, line: siegeSwarmSkillLine(a, burst ? "Piercing Volley" : "Aimed Shot", e.name, `(-${dmg} HP)`), kind: "strike" };
  }

  const e = pickEnemy();
  if (!e) return { dmg: 0, heal: 0, line: "", kind: "none" };
  const dmg = Math.max(4, Math.floor((dmgBase + Math.random() * (10 + tier * 3)) * (e.powerful ? 0.92 : 1)));
  e.hp = Math.max(0, (e.hp || 0) - dmg);
  return { dmg, heal: 0, line: siegeSwarmSkillLine(a, "Steel Strike", e.name, `(-${dmg} HP)`), kind: "strike" };
}

function siegeSwarmAlliesAct(ev) {
  if (!state || !ev) return;
  if (!isCrossroadsSiegeCombat(ev)) return;
  const allies = Math.max(0, Math.floor(ev.siege?.allies || 0));
  if (allies <= 0) return;

  const enemies = aliveEnemies(ev);
  if (!enemies.length) return;

  const tier = Math.max(1, Math.floor(ev.siege?.tier || 5));
  const lvl = Math.max(1, Math.floor(state.level || 1));
  const phase = String(ev.siege?.phase || "").toLowerCase();

  ev.siege.round = Math.max(0, Math.floor(ev.siege.round || 0)) + 1;
  ev.siege.spot = Math.max(0, Math.floor(ev.siege.spot || 0));

  const actionCount = clamp(7 + Math.floor(allies / 45), 7, 16);
  const highlightCount = clamp(3 + Math.floor(allies / 120), 3, 5);

  let x = siegeSwarmSeed(ev);
  x = siegeSwarmNext(x ^ (ev.siege.round * 2654435761));

  let totalDmg = 0;
  let totalHeal = 0;
  let lines = 0;

  for (let i = 0; i < actionCount; i++) {
    x = siegeSwarmNext(x);
    const r = siegeSwarmPick01(x);
    const a = siegeSwarmAdventurerAt(ev, ev.siege.spot + i * 7 + (x % 11));
    const out = applySiegeSwarmAction(ev, a, enemies, r);
    totalDmg += Math.max(0, Math.floor(out.dmg || 0));
    totalHeal += Math.max(0, Math.floor(out.heal || 0));
    if (out.line && lines < highlightCount && Math.random() < 0.65) {
      pushCombatLog(ev, out.line);
      lines++;
    }
    if (aliveEnemies(ev).length <= 0) break;
  }
  ev.siege.spot += actionCount;

  if (totalDmg > 0) pushCombatLog(ev, `🧨 The adventurer vanguard hits hard (-${totalDmg} HP across the enemy line).`);

  const giftChance = phase === "overlord" ? clamp(0.08 + tier * 0.01, 0.05, 0.20) : clamp(0.14 + tier * 0.02, 0.12, 0.35);
  if (Math.random() < giftChance) {
    const mul = phase === "overlord" ? 0.55 : 0.80;
    const heal = Math.max(3, Math.floor((8 + tier * 4 + lvl * 0.30) * mul * (0.85 + Math.random() * 0.35)));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    pushCombatLog(ev, `🧪 An ally hands you a potion (+${heal} HP).`);
  }

  const lineHoldChance = phase === "overlord" ? 0.12 : 0.22;
  if (Math.random() < lineHoldChance) {
    pushCombatLog(ev, "🛡️ Wounded adventurers are dragged back and treated; the line does not break." );
  }
}


function getEnemyRecLevelForCombat(ev) {
  if (!ev || !ev.enemies || !ev.enemies.length) return 1;
  let maxRec = 1;
  for (const e of ev.enemies) {
    if (!e) continue;
    // Show mob level - if recLevel set use it, else compute from tier
    const tier = Math.max(1, Math.floor(e.tier || 1));
    const expectedByTier = {1:1, 2:80, 3:200, 4:380, 5:580};
    const rec = e.recLevel || e.level || expectedByTier[tier] || (1 + (tier-1)*140);
    if (rec > maxRec) maxRec = rec;
  }
  return maxRec;
}

function getPlayerSuccessRateVsMobFarAbove() {
  if (!state) return 1.0;
  const playerLvl = Math.max(1, Math.floor(state.level || 1));
  const pending = state.world?.pendingEvent;
  if (!pending || pending.kind !== 'combat') return 1.0;
  const mobRec = getEnemyRecLevelForCombat(pending);
  const diff = mobRec - playerLvl;
  if (diff >= 60) return 0.00; // 0% impossible - level 7 vs 141 (diff 134) impossible
  if (diff >= 50) return 0.02; // 2% success if 50+ levels above
  if (diff >= 30) return 0.05; // 5% success if 30+ levels above
  if (diff >= 20) return 0.15;
  if (diff >= 10) return 0.35;
  return 1.0;
}


function partyAutoAttack(ev) {
  if (!state || !ev) return;
  const enemies = aliveEnemies(ev);
  if (!enemies.length) return;
  const target = enemies[0];

  // If mob far above player level, success rate drops to 5% or 2% - now 0% if 50+ above to make impossible
  const successRate = getPlayerSuccessRateVsMobFarAbove();
  const mobRec = getEnemyRecLevelForCombat(ev);
  const playerLvl = Math.max(1, Math.floor(state.level || 1));
  // Show mob level as requested
  // If mob is 50+ levels above, impossible to beat - 0% success
  if (successRate <= 0.02 && (mobRec - playerLvl) >= 50) {
    pushCombatLog(ev, `💀 [LEVEL GAP] Mob Lv${mobRec} far above you Lv${playerLvl}! You are ${mobRec - playerLvl} levels below - IMPOSSIBLE! Success rate 0% - you cannot damage it! Must flee or get higher level.`);
    return;
  }
  if (successRate < 1.0) {
    if (Math.random() > successRate) {
      pushCombatLog(ev, `💀 [LEVEL GAP] Mob Lv${mobRec} far above you Lv${playerLvl}! Success rate dropped to ${Math.round(successRate*100)}% - attack fumbles! (Lv${mobRec} vs Lv${playerLvl})`);
      return;
    } else if (successRate <= 0.05) {
      pushCombatLog(ev, `⚠️ Far above level! Mob Lv${mobRec} vs you Lv${playerLvl} - Only ${Math.round(successRate*100)}% success chance - you barely manage to strike!`);
    }
  }

  let boost = (ev.partyDmgBoostTurns || 0) > 0 ? (1 + (ev.partyDmgBoost || 0)) : 1;
  // Effects do meaningful combat
  if (hasEffectOnState(state, "stormseed")) boost *= 1.18;
  if (hasEffectOnState(state, "titanblood")) boost *= 1.22;
  if (hasEffectOnState(state, "sunfire")) boost *= 1.14;
  if (hasEffectOnState(state, "hasted")) boost *= 1.15;
  if (hasEffectOnState(state, "mindglass")) boost *= 1.08;
  if (hasEffectOnState(state, "shadowstep")) boost *= 1.10;
  if (hasEffectOnState(state, "smokeveil")) boost *= 1.05;
  if (hasEffectOnState(state, "aether")) boost *= 1.06;
  if (hasEffectOnState(state, "well_fed")) boost *= 1.04;
  if (hasEffectOnState(state, "cursed")) boost *= 0.88;
  // Level scaling for attack power - at 700 cap, add level bonus
  const playerLvl = Math.max(1, Math.floor(state?.level || 1));
  if (playerLvl > 100) boost *= (1 + (playerLvl - 100) * 0.002); // +0.2% per level beyond 100, ~120% extra at 700
  if (playerLvl > 300) boost *= (1 + (playerLvl - 300) * 0.001); // extra
  // New debuffs reduce damage
  if (hasEffectOnState(state, "weak")) boost *= 0.82;
  if (hasEffectOnState(state, "brittle")) boost *= 0.88;
  if (hasEffectOnState(state, "withered")) boost *= 0.75;
  if (hasEffectOnState(state, "soulfractured")) boost *= 0.80;


  const actors = allPartyActors(state);
  for (const a of actors) {
    if (!a || (a.hp || 0) <= 0) continue;
    if (a.id === "player") {
      const str = (a.stats?.strength || 0);
      let base = (2 + str * 1.2 + Math.random() * 5);
      let mult = boost;
      const eq = totalEquipmentBonuses(state);
      base += (eq.dmgFlat || 0);
      mult *= (eq.dmgMult || 1);
      const dmg = Math.max(1, Math.floor(base * mult));
      target.hp = Math.max(0, (target.hp || 0) - dmg);
      pushCombatLog(ev, `🗡️ ${a.name} strikes ${target.name} (-${dmg} HP).`);
      if (target.hp <= 0) {
        pushCombatLog(ev, `✅ ${target.name} falls.`);
        break;
      }
    } else {
      const c = findPartyMemberById(state, a.id);
      if (c) companionAiAct(c, ev);
      if ((target.hp || 0) <= 0) break;
    }
  }
  if ((ev.partyDmgBoostTurns || 0) > 0) {
    ev.partyDmgBoostTurns = Math.max(0, Math.floor(ev.partyDmgBoostTurns - 1));
    if (ev.partyDmgBoostTurns <= 0) ev.partyDmgBoost = 0;
  }
}

function enemiesAttack(ev) {
  if (!state || !ev) return;
  const enemies = aliveEnemies(ev);
  if (!enemies.length) return;
  const targets = alivePartyActorIds(state);
  if (!targets.length) return;

  const isSiege = (typeof isCrossroadsSiegeCombat === "function") ? isCrossroadsSiegeCombat(ev) : false;

  const doOverlordSpell = (e) => {
    if (!isSiege) return false;
    if (!e || !e.siegeBoss) return false;
    const hp = Math.max(0, Math.floor(e.hp || 0));
    const mhp = Math.max(1, Math.floor(e.maxHp || 1));
    const hpPct = hp / mhp;
    const atk = Math.max(1, Math.floor(e.atk || 8));

    if (typeof e.siegeBossHealCd !== "number") e.siegeBossHealCd = 0;
    e.siegeBossHealCd = Math.max(0, Math.floor(e.siegeBossHealCd));

    if (hpPct <= 0.45 && e.siegeBossHealCd <= 0 && Math.random() < 0.55) {
      const heal = Math.max(60, Math.floor(mhp * 0.18 + atk * 3.2 + Math.random() * 90));
      e.hp = Math.min(mhp, hp + heal);
      e.siegeBossHealCd = 3;
      pushCombatLog(ev, `✨ ${e.name} casts Dark Mend (+${heal} HP).`);
      return true;
    }

    if (Math.random() < 0.30) {
      const ids = alivePartyActorIds(state);
      let total = 0;
      for (const id of ids) {
        const dmg = Math.max(8, Math.floor(atk * 0.85 + Math.random() * 18));
        total += applyDamageToPartyTarget(id, dmg, ev);
      }
      if (Math.random() < 0.45 && !hasEffectOnState(state, "cursed")) {
        addEffect("cursed", 12000);
        pushCombatLog(ev, `🕯️ ${e.name} spreads a curse.`);
      }
      pushCombatLog(ev, `💥 ${e.name} unleashes Shadow Nova (-${total} HP across your party).`);
      return true;
    }

    if (Math.random() < 0.26) {
      const tId = targets[Math.floor(Math.random() * targets.length)];
      const dmg = Math.max(10, Math.floor(atk * 1.10 + Math.random() * 26));
      const dealt = applyDamageToPartyTarget(tId, dmg, ev);
      const siphon = Math.max(0, Math.floor(dealt * 0.60));
      if (siphon > 0) e.hp = Math.min(mhp, Math.max(0, Math.floor(e.hp || 0)) + siphon);
      pushCombatLog(ev, `🩸 ${e.name} uses Soul Siphon (-${dealt} HP, +${siphon} HP).`);
      return true;
    }
    return false;
  };

  for (const e of enemies) {
    if (!e || (e.hp || 0) <= 0) continue;

    if (doOverlordSpell(e)) {
      if (typeof e.siegeBossHealCd === "number" && e.siegeBossHealCd > 0) e.siegeBossHealCd -= 1;
      continue;
    }

    const tId = targets[Math.floor(Math.random() * targets.length)];
    const accMod = ((e.accModTurns || 0) > 0 && typeof e.accMod === "number") ? e.accMod : 0;
    let acc = clamp((e.acc || 0.7) + accMod, 0.25, 0.95);
    // Effects now do something - defensive buffs reduce enemy accuracy
    if (tId === "player") {
      if (hasEffectOnState(state, "shadowstep")) acc = clamp(acc - 0.20, 0.15, 0.95);
      if (hasEffectOnState(state, "smokeveil")) acc = clamp(acc - 0.15, 0.15, 0.95);
      if (hasEffectOnState(state, "shielded")) acc = clamp(acc - 0.08, 0.15, 0.95);
      if (hasEffectOnState(state, "hasted")) acc = clamp(acc - 0.10, 0.15, 0.95);
      if (hasEffectOnState(state, "torchlight")) acc = clamp(acc - 0.05, 0.15, 0.95);
      if (hasEffectOnState(state, "mindglass")) acc = clamp(acc - 0.06, 0.15, 0.95);
      if (hasEffectOnState(state, "wyrmhide")) acc = clamp(acc - 0.04, 0.15, 0.95);
      // Ruins darkness: without torchlight effect and without torch item, enemy gets bonus, you get penalty (already logged)
      // With torchlight, you get bonus
      if (state && state.nodeId === "ruins" && hasEffectOnState(state, "torchlight")) {
        acc = clamp(acc - 0.12, 0.15, 0.95); // torchlight makes you harder to hit in ruins
      }
    }
    // Offensive debuffs on player make them easier to hit
    if (hasEffectOnState(state, "cursed")) acc = clamp(acc + 0.08, 0.15, 0.98);
    if (hasEffectOnState(state, "bleeding")) acc = clamp(acc + 0.04, 0.15, 0.98);
    const hit = Math.random() < acc;
    if (!hit) {
      pushCombatLog(ev, `❌ ${e.name} attacks ${tId === "player" ? state.profile : (findPartyMemberById(state, tId)?.name || "a companion")} and misses.`);
      continue;
    }
    const dmg = Math.max(1, Math.floor((e.atk || 6) + Math.random() * 6));
    const dealt = applyDamageToPartyTarget(tId, dmg, ev);
    pushCombatLog(ev, `💥 ${e.name} hits ${tId === "player" ? state.profile : (findPartyMemberById(state, tId)?.name || "a companion")} (-${dealt} HP).`);

    const name = String(e.name || "");
    if (/\bvenom\b/i.test(name) && tId === "player" && dealt > 0) {
      if (!hasEffectOnState(state, "poisoned") && Math.random() < 0.40) {
        addEffect("poisoned", 12000);
        pushCombatLog(ev, "☠️ Venom seeps into your blood (Poisoned)." );
      }
    }

    if (isSiege && e.siegeBoss && typeof e.siegeBossHealCd === "number" && e.siegeBossHealCd > 0) {
      e.siegeBossHealCd -= 1;
    }
  }

  for (const e of enemies) {
    if (!e) continue;
    if ((e.accModTurns || 0) > 0) {
      e.accModTurns = Math.max(0, Math.floor(e.accModTurns - 1));
      if (e.accModTurns <= 0) e.accMod = 0;
    }
  }
}

function endCombatIfNeeded(ev) {
  if (!state || !ev) return;
  const enemiesLeft = aliveEnemies(ev).length;
  const partyLeft = alivePartyActorIds(state).length;

  if ((state.hp || 0) <= 0) {
    if (isCrossroadsSiegeCombat(ev) && typeof handleCrossroadsSiegeDefeat === "function") {
      state.world.pendingEvent = null;
      autoSave();
      handleCrossroadsSiegeDefeat(ev);
      return;
    }
    state.world.pendingEvent = null;
    autoSave();
    enterNode("defeat");
    return;
  }

  if (partyLeft <= 0) {
    if (isCrossroadsSiegeCombat(ev) && typeof handleCrossroadsSiegeDefeat === "function") {
      state.world.pendingEvent = null;
      autoSave();
      handleCrossroadsSiegeDefeat(ev);
      return;
    }
    state.world.pendingEvent = null;
    autoSave();
    enterNode("defeat");
    return;
  }
  if (enemiesLeft <= 0) {
    ev.stage = "victory";
    if (!ev.didReward) {
      ev.didReward = true;
      if (isCrossroadsSiegeCombat(ev)) {
        const phase = String(ev.siege?.phase || ev.siege?.stage || "").toLowerCase();
        const isFinal = !!ev.siege?.final || phase === "overlord" || phase === "boss";
        state.flags = state.flags || {};

        const baseTier = Math.max(1, ...((ev.enemies || []).map((e) => Math.floor(e?.tier || 1))));
        const baseCount = Array.isArray(ev.enemies) ? ev.enemies.length : 1;
        const baseXp = Math.max(8, Math.floor(10 + (state.level || 1) * 2 + baseTier * 10 + baseCount * 6));

        if (!isFinal) {
          const xp = Math.max(baseXp, Math.floor(baseXp * 1.35));
          pushCombatLog(ev, `🏆 Siege reward: +${xp} XP.`);
          gainXp(xp);
          state.flags["siege:crossroads:phaseWon"] = phase || "phase";
        } else {
          if (!state.flags["siege:crossroads:rewarded"]) {
            state.flags["siege:crossroads:rewarded"] = true;
            state.flags["siege:crossroads:completed"] = true;
            state.flags["siege:crossroads:victory"] = true;
            const lvl = Math.max(1, Math.floor(state.level || 1));
            const xp = Math.max(baseXp, Math.floor(xpToNext(lvl) * 0.90) + 800 + baseTier * 120);
            const gold = Math.max(0, Math.floor(2500 + lvl * 40 + baseTier * 250));
            pushCombatLog(ev, `🏰 Crossroads holds. The siege is broken.`);
            pushCombatLog(ev, `🏆 Siege victory reward: +${xp} XP, +${gold} gold.`);
            gainXp(xp);
            state.gold = (state.gold || 0) + gold;
            addInvItem(state, "phoenix_feather", 1);
            addInvItem(state, "elixir", 2);
            addInvItem(state, pickCombatDropKey(5, 0.02), 1);
            addInvItem(state, pickCombatDropKey(5, 0.04), 1);
            pushCombatLog(ev, "🎁 Loot bonus: Phoenix Feather, 2 Elixirs, and rare salvage." );
            // Ripple effect on success: town rebuilds with new everything (mobs, items, quests)
            const victorySeed = (hashString(`victory:${state.profile}:${Date.now()}`) >>> 0);
            state.flags["post_siege_rebuilt"] = true;
            state.flags["post_siege_seed"] = victorySeed;
            state.completed = { missions: {}, side: {} };
            if (typeof genMissions === 'function') state.missions = genMissions(MISSION_COUNT, victorySeed);
            if (typeof genSideQuests === 'function') state.sideQuests = genSideQuests(SIDE_QUEST_COUNT, victorySeed);
            if (typeof marketStockCache !== 'undefined') marketStockCache = null;
            pushCombatLog(ev, "🔄 Ripple Effect: Town rebuilds! New missions, side quests, market stock, and mobs appear. Old items replaced.");
          } else {
            state.flags["siege:crossroads:completed"] = true;
            pushCombatLog(ev, `🏆 Siege reward: +${baseXp} XP.`);
            gainXp(baseXp);
            // Even on repeat victory, refresh town with new content
            if (!state.flags["post_siege_rebuilt"]) {
              const victorySeed = (hashString(`victory:${state.profile}:${Date.now()}`) >>> 0);
              state.flags["post_siege_rebuilt"] = true;
              state.flags["post_siege_seed"] = victorySeed;
              state.completed = { missions: {}, side: {} };
              if (typeof genMissions === 'function') state.missions = genMissions(MISSION_COUNT, victorySeed);
              if (typeof genSideQuests === 'function') state.sideQuests = genSideQuests(SIDE_QUEST_COUNT, victorySeed);
              if (typeof marketStockCache !== 'undefined') marketStockCache = null;
              pushCombatLog(ev, "🔄 Ripple: Town refreshed again with new content.");
            }
          }
        }
      } else {
        const count = Array.isArray(ev.enemies) ? ev.enemies.length : 1;
        const topTier = Math.max(1, ...((ev.enemies || []).map((e) => Math.floor(e?.tier || 1))));
        const xp = Math.max(8, Math.floor(10 + (state.level || 1) * 2 + topTier * 10 + count * 6));
        pushCombatLog(ev, `🏆 Reward: +${xp} XP.`);
        gainXp(xp);
      }
    }
    pushCombatLog(ev, isCrossroadsSiegeCombat(ev) ? "🏁 Victory. Crossroads still stands." : "🏁 Victory. The road is quiet again.");
  }
}

function combatPlayerAction(action) {
  if (!state) return;
  normalizeState(state);
  const ev = state.world?.pendingEvent;
  if (!ev || ev.kind !== "combat") return;
  if (ev.stage !== "combat") return;

  if (typeof action === "string" && action.startsWith("item_target:")) {
    const k = action.slice("item_target:".length);
    ev.uiMode = "item_target";
    ev.uiItemKey = k;
    renderPendingEvent();
    return;
  }

  if (typeof action === "string" && action.startsWith("item_use:")) {
    const rest = action.slice("item_use:".length);
    const parts = rest.split(":");
    const itemKey = String(parts[0] || "").trim();
    const targetId = String(parts[1] || "").trim() || "player";
    ev.uiMode = "main";
    ev.uiItemKey = "";
    if (itemKey) useItem(itemKey, ev, targetId);
    return;
  }

  if (action === "menu_skill") {
    ev.uiMode = "skill";
    renderPendingEvent();
    return;
  }
  if (action === "menu_profession") {
    ev.uiMode = "profession";
    renderPendingEvent();
    return;
  }
  if (action === "menu_back") {
    ev.uiMode = "main";
    renderPendingEvent();
    return;
  }

  clearGuardFlags(ev);
  let partyDidAct = false;

  if (typeof action === "string" && action.startsWith("skill:")) {
    ev.uiMode = "main";
    const k = action.slice("skill:".length);
    executeCombatSkill(k, ev);
  } else if (action === "guard") {
    ev.uiMode = "main";
    const ids = alivePartyActorIds(state);
    for (const id of ids) ev.guard[id] = 1;
    pushCombatLog(ev, "🛡️ Your party braces and guards." );
  } else if (action === "item_bandage") {
    ev.uiMode = "item_target";
    ev.uiItemKey = "bandage";
    renderPendingEvent();
    return;
  } else if (action === "item_health_potion") {
    ev.uiMode = "item_target";
    ev.uiItemKey = "health_potion";
    renderPendingEvent();
    return;
  } else if (action === "item_mana_potion") {
    ev.uiMode = "item_target";
    ev.uiItemKey = "mana_potion";
    renderPendingEvent();
    return;
  } else if (action === "item_tonic") {
    ev.uiMode = "item_target";
    ev.uiItemKey = "tonic";
    renderPendingEvent();
    return;
  } else if (action === "item_phoenix_feather") {
    ev.uiMode = "item_target";
    ev.uiItemKey = "phoenix_feather";
    renderPendingEvent();
    return;
  } else if (action === "item_antidote") {
    ev.uiMode = "main";
    useItem("antidote", ev);
  } else if (action === "item_smoke_bomb") {
    ev.uiMode = "main";
    useItem("smoke_bomb", ev);
  } else if (action === "run") {
    ev.uiMode = "main";
    partyDidAct = true;
    if (isCrossroadsSiegeCombat(ev)) {
      pushCombatLog(ev, "❌ There is no escape — this is your town." );
    } else {
      let extra = (ev.escapeBoostTurns || 0) > 0 ? (ev.escapeBoost || 0) : 0;
      // Effects give escape bonuses - now they do something
      if (hasEffectOnState(state, "hasted")) extra += 0.18;
      if (hasEffectOnState(state, "shadowstep")) extra += 0.25;
      if (hasEffectOnState(state, "smokeveil")) extra += 0.20;
      if (hasEffectOnState(state, "stormseed")) extra += 0.12;
      if (hasEffectOnState(state, "torchlight")) extra += 0.08;
      if (hasEffectOnState(state, "mindglass")) extra += 0.06;
      if (hasEffectOnState(state, "cursed")) extra -= 0.10; // cursed makes escape harder
      if (hasEffectOnState(state, "bleeding")) extra -= 0.05;

      const chance = clamp(0.42 + playerStat("cunning") * 0.03 + extra, 0.25, 0.93);
      const ok = Math.random() < chance;
      if ((ev.escapeBoostTurns || 0) > 0) {
        ev.escapeBoostTurns = Math.max(0, Math.floor(ev.escapeBoostTurns - 1));
        if (ev.escapeBoostTurns <= 0) ev.escapeBoost = 0;
      }
      if (ok) {
        pushCombatLog(ev, "🏃 You escape into the crowd." );
        const back = ev.fromNode || "crossroads";
        state.world.pendingEvent = null;
        autoSave();
        enterNode(back);
        return;
      }
      pushCombatLog(ev, "❌ You try to flee but get boxed in." );
    }
  } else {
    ev.uiMode = "main";
    pushCombatLog(ev, "⚔️ You signal the attack!" );
    partyAutoAttack(ev);
    partyDidAct = true;
  }

  if (ev.stage === "combat" && !partyDidAct) {
    companionsAutoAct(ev);
    endCombatIfNeeded(ev);
  }

  if (ev.stage === "combat") {
    siegeSwarmAlliesAct(ev);
    tickEnemyBleeds(ev);
    endCombatIfNeeded(ev);
  }

  if (ev.stage === "combat") {
    enemiesAttack(ev);
    endCombatIfNeeded(ev);
  }

  autoSave();
  renderPendingEvent();
}

function combatLoot(ev) {
  if (!state || !ev) return;
  if (ev.didLoot) {
    pushCombatLog(ev, "You already looted what was useful.");
    renderPendingEvent();
    return;
  }
  ev.didLoot = true;
  const base = 6 + Math.floor((state.level || 1) * 1.5);
  const bonus = Math.floor(Math.random() * 10);
  const gold = base + bonus;
  state.gold = (state.gold || 0) + gold;
  pushCombatLog(ev, `💰 Loot: +${gold} gold.`);

  const topTier = Math.max(1, ...((ev.enemies || []).map((e) => Math.floor(e?.tier || 1))));
  const itemChance = clamp(0.28 + topTier * 0.06, 0.2, 0.75);
  if (Math.random() < itemChance) {
    const k = pickCombatDropKey(topTier);
    addInvItem(state, k, 1);
    pushCombatLog(ev, `🎒 Loot: ${itemLabel(k)}.`);
  }
  autoSave();
  renderPendingEvent();
}

function combatSearch(ev) {
  if (!state || !ev) return;
  if (ev.didSearch) {
    pushCombatLog(ev, "You search again but find nothing new.");
    renderPendingEvent();
    return;
  }
  ev.didSearch = true;
  const chance = clamp(0.35 + playerStat("cunning") * 0.03, 0.2, 0.85);
  const roll = Math.random();
  if (roll < chance) {
    const extra = 3 + Math.floor(Math.random() * 12);
    state.gold = (state.gold || 0) + extra;
    pushCombatLog(ev, `🔎 Search: you find a hidden pouch (+${extra} gold).`);
    const topTier = Math.max(1, ...((ev.enemies || []).map((e) => Math.floor(e?.tier || 1))));
    if (Math.random() < clamp(0.22 + playerStat("cunning") * 0.02 + topTier * 0.04, 0.15, 0.75)) {
      const k = pickCombatDropKey(topTier);
      addInvItem(state, k, 1);
      pushCombatLog(ev, `🔎 Search: ${itemLabel(k)}.`);
    }
  } else {
    pushCombatLog(ev, "🔎 Search: nothing but dust and bad luck." );
  }
  autoSave();
  renderPendingEvent();
}

function missionPartyRequirement(q) {
  if (!q || q.kind !== "mission") return 1;
  if (q.difficulty === "legendary") return 3;
  if (q.difficulty === "elite") return 2;
  return 1;
}

function genCompanionId() {
  return `npc_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function companionNameFromSeed(seed) {
  const a = ["Kael", "Mira", "Tamsin", "Dorian", "Sable", "Rowan", "Nyx", "Orin", "Lyra", "Bran", "Vessa", "Cyrus", "Eira", "Kestrel", "Juno", "Basil", "Riven", "Selene"];
  const b = ["Ash", "Stone", "Vale", "Wren", "Fox", "Crown", "Hollow", "Reed", "Dusk", "Frost", "Black", "Bright", "Sable", "Gale", "Hearth", "Mist", "Iron", "Lantern"];
  const x = a[Math.abs(seed) % a.length];
  const y = b[Math.abs(seed * 7 + 13) % b.length];
  return `${x} ${y}`;
}

function companionProfessionFocusKey(prof) {
  const p = String(prof || "fighter").trim().toLowerCase();
  if (p === "fighter") return "strength";
  if (p === "rogue") return "cunning";
  if (p === "mage") return "arcana";
  if (p === "cleric") return "resilience";
  if (p === "ranger") return "cunning";
  return "resilience";
}

function companionBuildFocusKey(build) {
  const b = String(build || "balanced").trim().toLowerCase();
  if (b === "tank") return "resilience";
  if (b === "mystic") return "arcana";
  if (b === "trickster") return "cunning";
  if (b === "duelist") return "strength";
  return companionProfessionFocusKey("fighter");
}

function computeCompanionSheet(level, prof, build, seedKey) {
  const lvl = Math.max(1, Math.floor(level || 1));
  const p = professionDef(prof);
  const b = buildDef(build);

  const stats = { strength: 0, cunning: 0, arcana: 0, resilience: 0 };
  for (const [k, v] of Object.entries(p?.bonuses || {})) stats[k] = (stats[k] || 0) + Math.max(0, Math.floor(v || 0));
  for (const [k, v] of Object.entries(b?.bonuses || {})) stats[k] = (stats[k] || 0) + Math.max(0, Math.floor(v || 0));

  // Remoduled for 700 cap: more stats per level after 100, to keep companions relevant
  let extra = 0;
  if (lvl <= 100) {
    extra = Math.max(0, Math.floor((lvl - 1) * 1.15) + Math.floor((lvl - 1) / 2));
  } else if (lvl <= 300) {
    extra = Math.floor(99 * 1.15 + 49) + Math.floor((lvl - 100) * 1.35) + Math.floor((lvl - 100) / 2);
  } else if (lvl <= 500) {
    extra = Math.floor(99 * 1.15 + 49) + Math.floor(200 * 1.35 + 100) + Math.floor((lvl - 300) * 1.55) + Math.floor((lvl - 300) / 2);
  } else {
    extra = Math.floor(99 * 1.15 + 49) + Math.floor(200 * 1.35 + 100) + Math.floor(200 * 1.55 + 100) + Math.floor((lvl - 500) * 1.85) + Math.floor((lvl - 500) / 2);
  }
  extra = Math.max(0, Math.floor(extra));
  const profFocus = companionProfessionFocusKey(prof);
  const buildFocus = companionBuildFocusKey(build);
  const weights = {
    strength: 1,
    cunning: 1,
    arcana: 1,
    resilience: 1,
  };
  weights[profFocus] = (weights[profFocus] || 0) + 4;
  weights[buildFocus] = (weights[buildFocus] || 0) + 2;

  const order = ["strength", "cunning", "arcana", "resilience"];
  const totalW = () => order.reduce((a, k) => a + Math.max(0, weights[k] || 0), 0);
  let x = hashString(`companion:${String(seedKey || "")}:stats`);

  for (let i = 0; i < extra; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    let roll = (totalW() > 0) ? (x % totalW()) : 0;
    for (const k of order) {
      roll -= Math.max(0, weights[k] || 0);
      if (roll < 0) {
        stats[k] = (stats[k] || 0) + 1;
        break;
      }
    }
  }

  // Remoduled HP/Mana for 700 cap: more HP per level after 100
  let hpPerLvl = 6;
  let manaPerLvl = 4;
  if (lvl > 100) hpPerLvl = 7;
  if (lvl > 300) hpPerLvl = 8;
  if (lvl > 500) hpPerLvl = 9;
  if (lvl > 100) manaPerLvl = 5;
  if (lvl > 300) manaPerLvl = 6;
  const baseHp = 35 + (p?.hpBonus || 0) + (b?.hpBonus || 0) + lvl * hpPerLvl + (stats.resilience || 0) * 5 + Math.floor(lvl / 50) * 10;
  const baseMana = 18 + (p?.manaBonus || 0) + (b?.manaBonus || 0) + lvl * manaPerLvl + (stats.arcana || 0) * 5 + Math.floor(lvl / 60) * 8;

  return {
    stats,
    maxHp: Math.max(10, Math.floor(baseHp)),
    maxMana: Math.max(0, Math.floor(baseMana)),
  };
}

function createCompanionForParty(s, seed) {
  const lvl = Math.max(1, Math.floor(s?.level || 1));
  const prof = PROFESSIONS[Math.abs(seed) % PROFESSIONS.length]?.key || "fighter";
  const build = BUILDS[Math.abs(seed * 5 + 3) % BUILDS.length]?.key || "balanced";
  const sheet = computeCompanionSheet(lvl, prof, build, `seed:${seed}`);

  return {
    id: genCompanionId(),
    name: companionNameFromSeed(seed),
    profession: prof,
    build,
    level: lvl,
    stats: sheet.stats,
    maxHp: sheet.maxHp,
    hp: sheet.maxHp,
    maxMana: sheet.maxMana,
    mana: sheet.maxMana,
  };
}

function ensureRecruitOffers(s) {
  if (!s) return;
  s.party = s.party || {};
  if (!Array.isArray(s.party.members)) s.party.members = [];
  if (!Array.isArray(s.party.recruits)) s.party.recruits = [];
  if (typeof s.party.recruitsDay !== "number") s.party.recruitsDay = 0;

  const day = s.world?.day || 1;
  if (s.party.recruits.length && s.party.recruitsDay === day) return;
  s.party.recruitsDay = day;
  s.party.recruits = [];

  const seedBase = hashString(`${s.profile}:${day}:${s.level}`);
  for (let i = 0; i < 3; i++) {
    s.party.recruits.push(createCompanionForParty(s, seedBase + i * 97));
  }
}

function companionHireCost(s, c) {
  const lvl = Math.max(1, Math.floor(s?.level || 1));
  const t = Math.max(1, Math.floor(c?.level || lvl));
  return 25 + lvl * 6 + t * 3;
}

function recruitCompanion(id) {
  if (!state) return;
  normalizeState(state);
  if (isAdminProfile(state.profile)) return;
  ensureRecruitOffers(state);

  state.party.members = Array.isArray(state.party.members) ? state.party.members : [];
  if (state.party.members.length >= 3) {
    appendLog("Your party is full (max 4 including you).");
    enterNode("tavern");
    return;
  }

  const idx = (state.party.recruits || []).findIndex((r) => r && r.id === id);
  if (idx < 0) {
    appendLog("That recruit is no longer available.");
    enterNode("tavern");
    return;
  }
  const c = state.party.recruits[idx];
  const cost = companionHireCost(state, c);
  if (!spendGold(cost)) {
    enterNode("tavern");
    return;
  }
  state.party.recruits.splice(idx, 1);
  state.party.members.push(c);
  appendLog(`🤝 ${c.name} joins your party. (-${cost} gold)`);
  autoSave();
  enterNode("tavern");
}

function dismissCompanion(id) {
  if (!state) return;
  normalizeState(state);
  if (!state.party || !Array.isArray(state.party.members)) return;
  const idx = state.party.members.findIndex((m) => m && m.id === id);
  if (idx < 0) return;
  const c = state.party.members[idx];
  state.party.members.splice(idx, 1);
  appendLog(`👋 ${c.name} leaves your party.`);
  autoSave();
  enterNode("tavern");
}

function renderTavern() {
  if (!state) return;
  normalizeState(state);
  if (isAdminProfile(state.profile)) {
    enterNode("crossroads");
    return;
  }
  ensureRecruitOffers(state);

  const members = Array.isArray(state.party?.members) ? state.party.members : [];
  const recruits = Array.isArray(state.party?.recruits) ? state.party.recruits : [];

  outputEl.innerHTML = "";
  choicesEl.innerHTML = "";
  if (questListEl) questListEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "line";
  header.textContent = "The Tavern";
  outputEl.appendChild(header);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = `Adventurers trade rumors here. Some missions require a party. Party size: ${partySize(state)} (max 4). Gold: ${state.gold}.`;
  outputEl.appendChild(hint);

  const partyTitle = document.createElement("div");
  partyTitle.className = "line";
  partyTitle.textContent = "Your Party";
  outputEl.appendChild(partyTitle);

  if (!members.length) {
    const none = document.createElement("div");
    none.className = "hint";
    none.textContent = "(No companions yet.)";
    outputEl.appendChild(none);
  } else {
    const list = document.createElement("div");
    list.className = "skillList";
    for (const c of members) {
      const p = professionDef(c.profession);
      const b = buildDef(c.build);
      const row = document.createElement("div");
      row.className = "skillRow";

      const left = document.createElement("div");
      left.className = "skillLeft";
      const title = document.createElement("div");
      title.className = "skillTitle";
      title.textContent = c.name;
      const meta = document.createElement("div");
      meta.className = "skillMeta";
      meta.textContent = `${p ? p.label : titleCaseWord(c.profession)} / ${b ? b.label : titleCaseWord(c.build)} • Lv ${c.level} • HP ${c.hp}/${c.maxHp} • Mana ${c.mana}/${c.maxMana}`;
      left.appendChild(title);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.className = "skillActions";
      const kick = document.createElement("button");
      kick.className = "secondary";
      kick.textContent = "Dismiss";
      kick.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dismissCompanion(c.id);
      });
      right.appendChild(kick);

      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    }
    outputEl.appendChild(list);
  }

  const recTitle = document.createElement("div");
  recTitle.className = "line";
  recTitle.textContent = "Available Recruits";
  outputEl.appendChild(recTitle);

  const recList = document.createElement("div");
  recList.className = "skillList";
  for (const c of recruits) {
    const p = professionDef(c.profession);
    const b = buildDef(c.build);
    const cost = companionHireCost(state, c);
    const row = document.createElement("div");
    row.className = "skillRow";

    const left = document.createElement("div");
    left.className = "skillLeft";
    const title = document.createElement("div");
    title.className = "skillTitle";
    title.textContent = c.name;
    const meta = document.createElement("div");
    meta.className = "skillMeta";
    meta.textContent = `${p ? p.label : titleCaseWord(c.profession)} / ${b ? b.label : titleCaseWord(c.build)} • Lv ${c.level} • Hire ${cost}g`;
    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "skillActions";
    const hire = document.createElement("button");
    hire.textContent = "Hire";
    hire.disabled = members.length >= 3 || (state.gold || 0) < cost;
    hire.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      recruitCompanion(c.id);
    });
    right.appendChild(hire);

    row.appendChild(left);
    row.appendChild(right);
    recList.appendChild(row);
  }
  outputEl.appendChild(recList);

  showChoices([
    { label: "Back to Crossroads", className: "secondary", onChoose: () => enterNode("crossroads") },
  ]);

  outputEl.scrollTop = 0;
  renderStats();
}

