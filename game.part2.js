function useStoryItem(itemKey, targetId) {
  if (!state) return false;
  normalizeState(state);
  const k = String(itemKey || "").trim();
  if (!k) return false;
  const def = itemDef(k);
  const owned = Math.max(0, Math.floor(state.inventory?.[k] || 0));
  if (owned <= 0) {
    appendLog("You don't have that item.");
    render();
    return false;
  }

  if (def.consumable) {
    return useItem(k, null, targetId);
  }

  if (/^ore_/.test(k)) {
    if ((state.nodeId || "") === "blacksmith") {
      appendLog("Talk to the blacksmith and choose a recipe to forge gear from ore.");
    } else {
      appendLog("You need a blacksmith to work this ore. Find one at the Market.");
    }
    render();
    return true;
  }

  if (/^herb_/.test(k)) {
    if ((state.nodeId || "") === "alchemist") {
      appendLog("Talk to the alchemist and choose a recipe to brew something from herbs.");
    } else {
      appendLog("You need an alchemist to work these herbs. Find one at the Market.");
    }
    render();
    return true;
  }

  if (k === "rune_shard" || k === "ember_gem") {
    if ((state.nodeId || "") === "enchanter") {
      appendLog("Talk to the enchanter and choose an inscription.");
    } else {
      appendLog("You need an enchanter to work this. Find one at the Market.");
    }
    render();
    return true;
  }

  if (k === "cloth" || k === "leather" || k === "lumber") {
    if ((state.nodeId || "") === "crafter") {
      appendLog("Talk to the crafter and choose what to make.");
    } else {
      appendLog("You need a crafter to work these materials. Find one at the Market.");
    }
    render();
    return true;
  }

  if (k === "sealed_letter") {
    const stage = Math.max(0, Math.floor(state.arcs?.investigation?.stage || 0));
    if (stage <= 0) appendLog("This letter looks important, but you have no lead yet.");
    else if (stage === 1) appendLog("A lead will surface soon. Keep the letter close.");
    else if (stage === 2) appendLog("A lead has surfaced. Go to Crossroads and follow it.");
    else appendLog("The letter has served its purpose. Your next step is at Crossroads.");
    render();
    return true;
  }

  if (k === "ledger") {
    const stage = Math.max(0, Math.floor(state.arcs?.investigation?.stage || 0));
    if (stage === 3) appendLog("Deliver Findings at Crossroads.");
    else appendLog("The ledger is evidence. Decide who to trust at Crossroads.");
    render();
    return true;
  }

  if (k === "lantern_cellar_key") {
    appendLog("Return to Crossroads and choose 'Return to the Lantern Cellar'.");
    render();
    return true;
  }

  if (k === "sun_vault_key") {
    appendLog("Return to Crossroads and choose 'Open the Sun Vault'.");
    render();
    return true;
  }

  if (k === "guild_seal") {
    appendLog("Return to Crossroads and choose 'Present the Guild Seal'.");
    render();
    return true;
  }

  if (k === "crown_writ") {
    appendLog("Return to Crossroads and choose 'Present the Crown Writ'.");
    render();
    return true;
  }

  if (k === "rebel_token") {
    appendLog("Return to Crossroads and choose 'Present the Rebel Token'.");
    render();
    return true;
  }

  appendLog("You can't find a use for that right now.");
  render();
  return true;
}

const SKILLS_PER_TIER = 100;
const MAX_SKILL_TIER = 7;
const SKILLS_PER_COMBO = SKILLS_PER_TIER * MAX_SKILL_TIER;
const SKILLS_PER_PAGE = 20;
const POWER_SKILLS_PER_COMBO = 30;

const PROF_SKILL = {
  fighter: {
    pillars: ["Iron", "Steel", "War", "Vanguard", "Bastion", "Crimson", "Lion", "Dread", "Oath", "Sun"],
    forms: ["Guard", "Cleave", "Strike", "Stance", "Charge", "Rampart", "Break", "Barrage", "Grit", "Discipline"],
    focuses: ["strength", "resilience"],
  },
  rogue: {
    pillars: ["Shadow", "Silent", "Night", "Viper", "Ghost", "Velvet", "Ash", "Keen", "Dagger", "Umbral"],
    forms: ["Ambush", "Feint", "Step", "Cut", "Flourish", "Decoy", "Gambit", "Slip", "Trick", "Needle"],
    focuses: ["cunning", "strength"],
  },
  mage: {
    pillars: ["Arcane", "Astral", "Void", "Aether", "Runic", "Sapphire", "Ember", "Mirror", "Storm", "Moon"],
    forms: ["Sigil", "Bolt", "Weave", "Surge", "Rite", "Lattice", "Channel", "Glyph", "Mantra", "Spiral"],
    focuses: ["arcana", "cunning"],
  },
  cleric: {
    pillars: ["Sacred", "Dawn", "Hallowed", "Radiant", "Mercy", "Vigil", "Sanctum", "Oath", "Ivory", "Beacon"],
    forms: ["Ward", "Benediction", "Prayer", "Seal", "Renewal", "Sanctuary", "Litany", "Pledge", "Vow", "Aegis"],
    focuses: ["resilience", "arcana"],
  },
  ranger: {
    pillars: ["Wild", "Hawkeye", "Thorn", "Timber", "Gale", "River", "Frost", "Trail", "Wolf", "Cinder"],
    forms: ["Mark", "Volley", "Path", "Snare", "Stalk", "Draw", "Stride", "Focus", "Hunt", "Skirmish"],
    focuses: ["cunning", "resilience"],
  },
};

const BUILD_SKILL = {
  balanced: {
    styles: ["Measured", "Steady", "Practical", "Disciplined", "Even", "Grounded", "Wary"],
    accents: ["Method", "Form", "Routine", "Pattern", "Cadence"],
  },
  tank: {
    styles: ["Unyielding", "Stone", "Bulwark", "Fortified", "Immovable", "Stalwart", "Ironbound"],
    accents: ["Wall", "Bastion", "Guard", "Hold", "Anchor"],
  },
  duelist: {
    styles: ["Swift", "Keen", "Predatory", "Piercing", "Razor", "Relentless", "Daring"],
    accents: ["Riposte", "Lunge", "Flourish", "Edge", "Tempo"],
  },
  trickster: {
    styles: ["Devious", "Laughing", "Shifting", "Hidden", "Twisting", "Crooked", "Slippery"],
    accents: ["Ruse", "Misdirection", "Mask", "Bait", "Shuffle"],
  },
  mystic: {
    styles: ["Eldritch", "Sublime", "Deep", "Luminous", "Otherworldly", "Veiled", "Resonant"],
    accents: ["Conduit", "Chorus", "Lens", "Harmonic", "Vortex"],
  },
};

function buildFocusForBuild(build) {
  const bb = String(build || "").trim().toLowerCase();
  if (bb === "tank") return "resilience";
  if (bb === "mystic") return "arcana";
  if (bb === "duelist") return "strength";
  if (bb === "trickster") return "cunning";
  return "";
}

function roman(n) {
  const map = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let x = Math.max(1, Math.floor(n));
  let out = "";
  for (const [v, s] of map) {
    while (x >= v) {
      out += s;
      x -= v;
    }
  }
  return out;
}

function pick(arr, i) {
  if (!arr || arr.length === 0) return "";
  const idx = Math.abs(i) % arr.length;
  return arr[idx];
}

const POWER_SKILL_WORDS = {
  prefixes: ["Ascendant", "Sovereign", "Cataclysm", "Eclipse", "Starforged", "Apex", "Dominion", "Titan", "Seraph", "Voidcrowned"],
  suffixes: ["Judgment", "Annihilation", "Sanction", "Crownfall", "Oathbreak", "Stormreign", "Sunburst", "Nightrend", "Worldsplit", "Finale"],
};

const powerSkillSetCache = {};

function powerSkillSet(prof, build) {
  const p = String(prof || "").trim().toLowerCase() || "unknown";
  const b = String(build || "").trim().toLowerCase() || "unknown";
  const k = `${p}:${b}`;
  if (powerSkillSetCache[k]) return powerSkillSetCache[k];
  const set = new Set();
  let x = hashString(`${k}:power`);
  while (set.size < POWER_SKILLS_PER_COMBO) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    const idx = (x % SKILLS_PER_TIER) + 1;
    set.add(idx);
  }
  powerSkillSetCache[k] = set;
  return set;
}

function isPowerSkill(prof, build, index) {
  const i = Math.max(1, Math.floor(index));
  const baseIndex = ((i - 1) % SKILLS_PER_TIER) + 1;
  return powerSkillSet(prof, build).has(baseIndex);
}

function createLevelUpSkillDraft(s, level) {
  const lvl = Math.max(1, Math.floor(level || 1));
  const profKey = s?.character?.profession || "fighter";
  const buildKey = s?.character?.build || "balanced";
  const learned = s?.skills?.learned || {};

  const usedBases = new Set();
  const baseForKey = (k) => String(skillFamilyIdForKey(k) || "").trim();
  const tierForKey = (k) => Math.max(1, Math.floor(skillTierForKey(k) || 1));

  const bestTierByBase = new Map();
  for (const kk of Object.keys(learned || {})) {
    if (!learned[kk]) continue;
    const base = baseForKey(kk);
    if (!base) continue;
    const t = tierForKey(kk);
    const prev = bestTierByBase.get(base) || 0;
    if (t > prev) bestTierByBase.set(base, t);
  }

  const profDef = PROF_SKILL[String(profKey || "").toLowerCase()] || PROF_SKILL.fighter;
  const profFocuses = (Array.isArray(profDef.focuses) && profDef.focuses.length)
    ? profDef.focuses.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean)
    : ["strength", "cunning", "arcana", "resilience"];
  const profPrimary = profFocuses[0] || "strength";
  const profSecondary = profFocuses.find((x) => String(x).toLowerCase() !== String(profPrimary).toLowerCase()) || profPrimary;

  const focusScoreForDef = (def) => {
    const f = String(def?.focus || "").toLowerCase();
    if (!f) return 0;
    if (f === String(profPrimary).toLowerCase()) return 3;
    if (f === String(profSecondary).toLowerCase()) return 2;
    return 0;
  };

  const options = [];
  const used = new Set();
  let x = hashString(`${s?.profile || "player"}:${profKey}:${buildKey}:draft:${lvl}`);
  let guard = 0;
  while (options.length < 5 && guard < 5000) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    const idx = (x % SKILLS_PER_COMBO) + 1;
    if (used.has(idx)) {
      guard += 1;
      continue;
    }
    used.add(idx);
    const key = skillKeyFor(profKey, buildKey, idx);
    if (learned[key]) {
      guard += 1;
      continue;
    }
    const base = baseForKey(key);
    const candTier = tierForKey(key);
    const learnedTier = base ? (bestTierByBase.get(base) || 0) : 0;
    if (base && learnedTier >= candTier) {
      guard += 1;
      continue;
    }
    if (base && usedBases.has(base)) {
      guard += 1;
      continue;
    }
    const def = skillDefFromParts(profKey, buildKey, idx);
    const score = focusScoreForDef(def) + (def.powerful ? 1 : 0);
    let accept = 25 + score * 20;
    if (guard > 1200) accept = 100;
    const roll = (x >>> 24) % 100;
    if (roll < accept) {
      options.push(key);
      if (base) usedBases.add(base);
    }
    guard += 1;
  }

  while (options.length < 5) {
    const idx = ((options.length + 1) * 97) % SKILLS_PER_COMBO;
    const keyA = skillKeyFor(profKey, buildKey, idx + 1);
    const keyB = skillKeyFor(profKey, buildKey, ((idx + 13) % SKILLS_PER_COMBO) + 1);
    const baseA = baseForKey(keyA);
    const tierA = tierForKey(keyA);
    const okA = !options.includes(keyA) && (!baseA || (!usedBases.has(baseA) && (bestTierByBase.get(baseA) || 0) < tierA));
    const pickKey = okA ? keyA : keyB;
    const base = baseForKey(pickKey);
    options.push(pickKey);
    if (base) usedBases.add(base);
  }

  const countPrimary = () => options.filter((k) => String(skillDef(k)?.focus || "").toLowerCase() === String(profPrimary).toLowerCase()).length;
  if (countPrimary() < 2) {
    const scored = options
      .map((k) => ({ k, s: focusScoreForDef(skillDef(k)) }))
      .sort((a, b) => a.s - b.s);
    let rep = 0;
    let y = hashString(`${s?.profile || "player"}:${profKey}:${buildKey}:draftfix:${lvl}`) >>> 0;
    while (countPrimary() < 2 && rep < scored.length && rep < 5) {
      let tries = 0;
      while (tries < 800) {
        y = (Math.imul(y, 22695477) + 1) >>> 0;
        const idx = (y % SKILLS_PER_COMBO) + 1;
        const candKey = skillKeyFor(profKey, buildKey, idx);
        if (learned[candKey]) {
          tries += 1;
          continue;
        }
        if (options.includes(candKey)) {
          tries += 1;
          continue;
        }
        const candBase = baseForKey(candKey);
        const candTier = tierForKey(candKey);
        const learnedTier = candBase ? (bestTierByBase.get(candBase) || 0) : 0;
        if (candBase && learnedTier >= candTier) {
          tries += 1;
          continue;
        }
        if (candBase && usedBases.has(candBase)) {
          tries += 1;
          continue;
        }
        const candDef = skillDefFromParts(profKey, buildKey, idx);
        const f = String(candDef?.focus || "").toLowerCase();
        if (f !== String(profPrimary).toLowerCase()) {
          tries += 1;
          continue;
        }
        const repIdx = options.indexOf(scored[rep].k);
        if (repIdx >= 0) {
          const oldBase = baseForKey(options[repIdx]);
          if (oldBase) usedBases.delete(oldBase);
          options[repIdx] = candKey;
          if (candBase) usedBases.add(candBase);
        }
        break;
      }
      rep += 1;
    }
  }

  return { level: lvl, profession: profKey, build: buildKey, options, picksTotal: 2, picksLeft: 2 };
}

function hasActiveLevelUpDraft(s) {
  return !!s?.skills?.draft;
}

function queueLevelUpDraftLevel(s, level) {
  if (!s) return;
  s.skills = s.skills || {};
  const lvl = Math.max(1, Math.floor(level || 1));
  if (lvl % 2 !== 0) return;
  s.skills.draftQueue = Array.isArray(s.skills.draftQueue) ? s.skills.draftQueue : [];
  if (s.skills.draftQueue.includes(lvl)) return;
  s.skills.draftQueue.push(lvl);
  s.skills.draftQueue.sort((a, b) => a - b);
}

function startNextLevelUpDraftIfNeeded(s) {
  if (!s) return false;
  s.skills = s.skills || {};
  s.skills.learned = s.skills.learned || {};
  if (s.skills.draft) return false;
  s.skills.draftQueue = Array.isArray(s.skills.draftQueue) ? s.skills.draftQueue : [];
  if (s.skills.draftQueue.length === 0) return false;
  const lvl = s.skills.draftQueue.shift();
  s.skills.draft = createLevelUpSkillDraft(s, lvl);
  return true;
}

function chooseLevelUpDraftSkill(skillKey) {
  if (!state) return;
  normalizeState(state);
  const d = state.skills?.draft;
  if (!d) return;
  const k = String(skillKey || "").trim();
  if (!k) return;
  const picksTotal = Math.max(1, Math.floor(d.picksTotal || 1));
  if (typeof d.picksLeft !== "number") d.picksLeft = picksTotal;
  d.picksLeft = Math.max(0, Math.floor(d.picksLeft));
  if (d.picksLeft <= 0) return;
  if (state.skills?.learned?.[k]) return;

  const def = skillDef(k);
  state.skills.sources = (state.skills.sources && typeof state.skills.sources === "object") ? state.skills.sources : {};
  const src = state.skills.sources[k] || skillSourceForKey(state, k, def);

  let ok = true;
  if (typeof replaceLearnedSkillByBaseLabel === "function") {
    ok = replaceLearnedSkillByBaseLabel(state, k, 1, src);
  } else {
    state.skills.learned[k] = 1;
    if (!state.skills.sources[k]) state.skills.sources[k] = src;
  }
  if (!ok) {
    appendLog("You already know a stronger version of that skill.");
    autoSave();
    renderLevelUpDraft();
    return;
  }

  playChirp([600, 900, 1200], 200, "triangle", 0.06, 0);
  appendLog(`✨ New skill learned: ${def.label}.`);

  d.picksLeft = Math.max(0, Math.floor(d.picksLeft - 1));

  if (d.picksLeft > 0) {
    autoSave();
    renderLevelUpDraft();
    return;
  }

  state.skills.draft = null;
  startNextLevelUpDraftIfNeeded(state);
  autoSave();
  if (hasActiveLevelUpDraft(state)) {
    renderLevelUpDraft();
    return;
  }
  render();
  refreshCurrentNodeChoices();
}

function refreshCurrentNodeChoices() {
  if (!state) return;
  normalizeState(state);
  const id = state.nodeId || "crossroads";
  const node = STORY[id];
  if (!node) {
    showChoices([{ label: "Crossroads", className: "secondary", onChoose: () => enterNode("crossroads") }]);
    return;
  }
  const choices = (typeof node.choices === "function") ? node.choices(state) : node.choices;
  showChoices(
    (choices || []).map((ch) => ({
      label: ch.label,
      className: ch.className,
      onChoose: () => {
        runStoryChoice(ch);
      },
    }))
  );
}

function guardLevelUpDraft() {
  if (!state) return false;
  if (isAdminProfile(state.profile) && isAdminGodModeActive(state)) return false;
  normalizeState(state);
  if (!state.skills) return false;
  if (!state.skills.draft) startNextLevelUpDraftIfNeeded(state);
  if (!state.skills.draft) return false;
  renderLevelUpDraft();
  return true;
}

function renderLevelUpDraft() {
  if (!state) return;
  normalizeState(state);
  const d = state.skills?.draft;
  if (!d || !Array.isArray(d.options)) return;

  outputEl.innerHTML = "";
  choicesEl.innerHTML = "";
  if (questListEl) questListEl.innerHTML = "";

  const p = professionDef(d.profession);
  const b = buildDef(d.build);
  const pLabel = p ? p.label : titleCaseWord(d.profession);
  const bLabel = b ? b.label : titleCaseWord(d.build);

  const picksTotal = Math.max(1, Math.floor(d.picksTotal || 1));
  const picksLeft = (typeof d.picksLeft === "number") ? Math.max(0, Math.floor(d.picksLeft)) : picksTotal;
  const picked = picksTotal - picksLeft;

  const h = document.createElement("div");
  h.className = "line";
  h.textContent = `Level ${d.level} Reward — Choose ${picksTotal} Skills (${pLabel} / ${bLabel})`;
  outputEl.appendChild(h);

  const sub = document.createElement("div");
  sub.className = "hint";
  sub.textContent = `Pick ${picksTotal} of the ${d.options.length} skills below. Picks made: ${picked}/${picksTotal}. Use ℹ to read details.`;
  outputEl.appendChild(sub);

  const list = document.createElement("div");
  list.className = "skillList";
  for (const k of d.options) {
    const def = skillDef(k);
    const learned = !!state.skills.learned[k];

    const row = document.createElement("div");
    row.className = `skillRow${def.powerful ? " powerful" : ""}`;

    const left = document.createElement("div");
    left.className = "skillLeft";
    const title = document.createElement("div");
    title.className = "skillTitle";
    title.textContent = def.label;
    const meta = document.createElement("div");
    meta.className = "skillMeta";
    meta.textContent = `${titleCaseWord(def.focus)} • Tier ${def.tier}${def.powerful ? " • Powerful" : ""}${learned ? " • Learned" : ""}`;
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

    const pickBtn = document.createElement("button");
    pickBtn.className = learned ? "secondary" : "";
    pickBtn.textContent = learned ? "Learned" : "Choose";
    pickBtn.disabled = learned;
    pickBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      chooseLevelUpDraftSkill(def.key);
    });

    right.appendChild(info);
    right.appendChild(pickBtn);
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  }
  outputEl.appendChild(list);

  outputEl.scrollTop = 0;
  renderStats();
}

function skillKeyFor(prof, build, index) {
  const p = String(prof || "").trim().toLowerCase() || "unknown";
  const b = String(build || "").trim().toLowerCase() || "unknown";
  const id = String(Math.max(1, Math.floor(index))).padStart(3, "0");
  return `skill_${p}_${b}_${id}`;
}

function parseSkillKey(k) {
  const m = String(k || "").trim().match(/^skill_([^_]+)_([^_]+)_(\d+)$/i);
  if (!m) return null;
  return { profession: m[1].toLowerCase(), build: m[2].toLowerCase(), index: parseInt(m[3], 10) };
}

function skillFocusFor(prof, build, i) {
  const p = PROF_SKILL[prof] || PROF_SKILL.fighter;
  const b = BUILD_SKILL[build] || BUILD_SKILL.balanced;
  const focusPool = (p.focuses && p.focuses.length) ? p.focuses : ["strength", "cunning", "arcana", "resilience"];
  const ii = Math.max(1, Math.floor(i || 1));
  const baseIndex = ((ii - 1) % SKILLS_PER_TIER) + 1;
  const mix = (hashString(`${prof}:${build}:${baseIndex}`) + baseIndex * 17) >>> 0;
  const primary = focusPool[mix % focusPool.length];
  let buildFocus = "";
  if (build === "tank") buildFocus = "resilience";
  else if (build === "mystic") buildFocus = "arcana";
  else if (build === "duelist") buildFocus = "strength";
  else if (build === "trickster") buildFocus = "cunning";

  if (!buildFocus) return primary;

  const r = (hashString(`${prof}:${build}:${baseIndex}:buildfocus`) + baseIndex * 31) >>> 0;
  const pct = r % 100;
  const weight = (build === "tank") ? 55 : 45;
  return (pct < weight) ? buildFocus : primary;
}

function skillDefFromParts(prof, build, index) {
  const p = PROF_SKILL[prof] || PROF_SKILL.fighter;
  const b = BUILD_SKILL[build] || BUILD_SKILL.balanced;
  const i = Math.max(1, Math.floor(index));
  const tier = 1 + Math.floor((i - 1) / SKILLS_PER_TIER);

  const baseIndex = ((i - 1) % SKILLS_PER_TIER) + 1;

  const powerful = isPowerSkill(prof, build, baseIndex);

  const a = pick(b.styles, baseIndex + 3);
  const pillar = pick(p.pillars, baseIndex + 7);
  const form = pick(p.forms, baseIndex + 11);
  const accent = pick(b.accents, baseIndex + 13);

  const focus = skillFocusFor(prof, build, baseIndex);
  const focusLabel = titleCaseWord(focus);
  const label = powerful
    ? `${pick(POWER_SKILL_WORDS.prefixes, baseIndex + 5)} ${accent} ${pillar} ${pick(POWER_SKILL_WORDS.suffixes, baseIndex + 9)}`
    : `${a} ${accent} ${pillar} ${form} ${roman(tier)}`;

  const profLower = String(prof || "").toLowerCase();
  let noun = "technique";
  if (profLower === "mage") noun = "spell";
  else if (profLower === "cleric") noun = "prayer";
  else if (profLower === "rogue") noun = "trick";
  else if (profLower === "ranger") noun = "maneuver";

  const desc = powerful
    ? `A powerful signature technique of the ${prof} — perfected along the ${build} path. Focus: ${focusLabel}.

It is whispered as a trump-card discipline: dangerous, decisive, and remembered by witnesses.`
    : `A ${prof} ${noun} refined for the ${build} path. Focus: ${focusLabel}.

This discipline is recorded in the ${accent} tradition — practiced until it becomes instinct.`;
  return {
    key: skillKeyFor(prof, build, i),
    label,
    desc,
    profession: prof,
    build,
    focus,
    tier,
    powerful,
  };
}

function skillDef(skillKey) {
  const parsed = parseSkillKey(skillKey);
  if (!parsed) {
    const k = String(skillKey || "").trim();
    return { key: k || "(unknown)", label: k || "(unknown)", desc: "No details available.", profession: "unknown", build: "unknown", focus: "balanced", tier: 1 };
  }
  return skillDefFromParts(parsed.profession, parsed.build, parsed.index);
}

function skillTierForKey(skillKey) {
  const parsed = parseSkillKey(skillKey);
  if (!parsed) return 1;
  const i = Math.max(1, Math.floor(parsed.index || 1));
  return 1 + Math.floor((i - 1) / SKILLS_PER_TIER);
}

function skillFamilyIdForKey(skillKey) {
  const parsed = parseSkillKey(skillKey);
  if (!parsed) return String(skillKey || "").trim();
  const i = Math.max(1, Math.floor(parsed.index || 1));
  const baseIndex = ((i - 1) % SKILLS_PER_TIER) + 1;
  return `${parsed.profession}:${parsed.build}:${baseIndex}`;
}

function skillBaseLabel(def) {
  const label = String(def?.label || "").trim();
  if (!label) return "";
  if (def?.powerful) return label;
  return label.replace(/\s+[IVX]+$/i, "").trim();
}

function skillBaseLabelForKey(skillKey) {
  const def = skillDef(skillKey);
  return skillBaseLabel(def);
}

function dedupeLearnedSkillsByBaseLabel(s) {
  if (!s) return false;
  s.skills = s.skills || {};
  s.skills.learned = s.skills.learned || {};
  if (!s.skills.sources || typeof s.skills.sources !== "object") s.skills.sources = {};
  const learned = s.skills.learned;
  const sources = s.skills.sources;
  const keys = Object.keys(learned).filter((k) => !!learned[k]);
  if (keys.length <= 1) return false;

  const tierFor = (k) => Math.max(1, Math.floor(skillTierForKey(k) || 1));
  const rankFor = (k) => Math.max(1, Math.floor(learned[k] || 1));
  const betterKey = (a, b) => {
    if (!a) return b;
    if (!b) return a;
    const ta = tierFor(a);
    const tb = tierFor(b);
    if (ta !== tb) return ta > tb ? a : b;
    const ra = rankFor(a);
    const rb = rankFor(b);
    if (ra !== rb) return ra > rb ? a : b;
    return a;
  };

  const keepByBase = new Map();
  for (const k of keys) {
    const fam = String(skillFamilyIdForKey(k) || "").trim();
    const lbl = String(skillBaseLabelForKey(k) || "").trim();
    if (fam) keepByBase.set(`fam:${fam}`, betterKey(keepByBase.get(`fam:${fam}`), k));
    if (lbl) keepByBase.set(`lbl:${lbl}`, betterKey(keepByBase.get(`lbl:${lbl}`), k));
  }

  let changed = false;
  for (const k of keys) {
    const fam = String(skillFamilyIdForKey(k) || "").trim();
    const lbl = String(skillBaseLabelForKey(k) || "").trim();
    const keepFam = fam ? keepByBase.get(`fam:${fam}`) : k;
    const keepLbl = lbl ? keepByBase.get(`lbl:${lbl}`) : k;
    const keep = betterKey(keepFam, keepLbl);
    if (keep !== k) {
      delete learned[k];
      delete sources[k];
      changed = true;
    }
  }
  return changed;
}

function replaceLearnedSkillByBaseLabel(s, newSkillKey, rank, source) {
  if (!s) return false;
  const k = String(newSkillKey || "").trim();
  if (!k) return false;
  s.skills = s.skills || {};
  s.skills.learned = s.skills.learned || {};
  if (!s.skills.sources || typeof s.skills.sources !== "object") s.skills.sources = {};

  const learned = s.skills.learned;
  const sources = s.skills.sources;
  const base = String(skillFamilyIdForKey(k) || "").trim();
  const lblBase = String(skillBaseLabelForKey(k) || "").trim();
  const newTier = Math.max(1, Math.floor(skillTierForKey(k) || 1));

  let bestTier = 0;
  for (const kk of Object.keys(learned)) {
    if (!learned[kk]) continue;
    const fam = String(skillFamilyIdForKey(kk) || "").trim();
    const lbl = String(skillBaseLabelForKey(kk) || "").trim();
    const isSame = (base && fam === base) || (lblBase && lbl === lblBase);
    if (!isSame) continue;
    bestTier = Math.max(bestTier, Math.max(1, Math.floor(skillTierForKey(kk) || 1)));
  }

  if ((base || lblBase) && bestTier >= newTier) return false;

  for (const kk of Object.keys(learned)) {
    if (!learned[kk]) continue;
    const fam = String(skillFamilyIdForKey(kk) || "").trim();
    const lbl = String(skillBaseLabelForKey(kk) || "").trim();
    const isSame = (base && fam === base) || (lblBase && lbl === lblBase);
    if (!isSame) continue;
    delete learned[kk];
    delete sources[kk];
  }

  learned[k] = Math.max(1, Math.floor(rank || 1));
  if (source && !sources[k]) sources[k] = source;
  return true;
}

function canLearnSkillByBaseLabel(s, newSkillKey) {
  if (!s) return false;
  const k = String(newSkillKey || "").trim();
  if (!k) return false;
  const base = String(skillFamilyIdForKey(k) || "").trim();
  const lblBase = String(skillBaseLabelForKey(k) || "").trim();
  const newTier = Math.max(1, Math.floor(skillTierForKey(k) || 1));

  if (!base && !lblBase) return true;

  const learned = s.skills?.learned || {};
  let bestTier = 0;
  for (const kk of Object.keys(learned)) {
    if (!learned[kk]) continue;
    const fam = String(skillFamilyIdForKey(kk) || "").trim();
    const lbl = String(skillBaseLabelForKey(kk) || "").trim();
    const isSame = (base && fam === base) || (lblBase && lbl === lblBase);
    if (!isSame) continue;
    bestTier = Math.max(bestTier, Math.max(1, Math.floor(skillTierForKey(kk) || 1)));
  }
  return bestTier < newTier;
}

function skillPointCost(def) {
  const tier = Math.max(1, Math.floor(def?.tier || 1));
  const base = tier;
  return def?.powerful ? Math.min(12, base + 3) : base;
}

function skillRoll01(def, salt) {
  const k = String(def?.key || "");
  const s = String(salt || "");
  const h = hashString(`skill:${k}:${s}`) >>> 0;
  return h / 4294967295;
}

function skillVariantForDef(def, variants) {
  const v = Math.max(2, Math.floor(variants || 5));
  const k = String(def?.key || "");
  return (hashString(`variant:${k}`) >>> 0) % v;
}

function skillEffectText(def) {
  const tier = Math.max(1, Math.floor(def?.tier || 1));
  const focus = String(def?.focus || "balanced");
  const pow = def?.powerful ? 1 : 0;
  const checkBonusPct = Math.round((skillChanceBonusFromSkill(def) || 0) * 100);
  const cost = skillPointCost(def);
  const v = skillVariantForDef(def, 5);
  if (focus === "strength") {
    const dmgPct = Math.round((0.85 + skillRoll01(def, "dmg") * 0.30) * 100);
    if (v === 1) {
      return `Passive: +${checkBonusPct}% to Strength checks.
Combat: Cleave through all enemies for ~${Math.round(dmgPct * 0.62)}% damage (rank 1).`;
    }
    if (v === 2) {
      const acc = -clamp(0.06 + tier * 0.01 + pow * 0.02 + skillRoll01(def, "acc") * 0.05, 0.06, 0.22);
      const boost = clamp(0.08 + tier * 0.02 + pow * 0.04 + skillRoll01(def, "boost") * 0.06, 0.08, 0.35);
      return `Passive: +${checkBonusPct}% to Strength checks.
Combat: Sunder a target (Accuracy ${Math.round(acc * 100)}%) and open them up (+${Math.round(boost * 100)}% party damage for 2 turns).`;
    }
    if (v === 3) {
      const bleedChance = clamp(0.55 + tier * 0.03 + pow * 0.10 + skillRoll01(def, "bleed") * 0.10, 0.45, 0.90);
      return `Passive: +${checkBonusPct}% to Strength checks.
Combat: Rend a target; lower damage but high Bleeding chance (~${Math.round(bleedChance * 100)}% at rank 1).`;
    }
    if (v === 4) {
      const thresh = clamp(0.35 + skillRoll01(def, "th") * 0.10, 0.30, 0.50);
      return `Passive: +${checkBonusPct}% to Strength checks.
Combat: Execute — deals extra damage when the target is below ${Math.round(thresh * 100)}% HP.`;
    }
    const bleedChance = clamp(0.18 + tier * 0.04 + pow * 0.12 + skillRoll01(def, "bleed") * 0.08, 0.1, 0.85);
    return `Passive: +${checkBonusPct}% to Strength checks.
Combat: Heavy strike (~${dmgPct}% damage) with Bleeding chance (~${Math.round(bleedChance * 100)}% at rank 1).`;
  }
  if (focus === "cunning") {
    if (v === 1) {
      const esc = clamp(0.12 + tier * 0.02 + pow * 0.05 + skillRoll01(def, "esc") * 0.08, 0.12, 0.45);
      return `Passive: +${checkBonusPct}% to Cunning checks.
Combat: Fade and reposition (+${Math.round(esc * 100)}% escape chance for 2 turns).`;
    }
    if (v === 2) {
      const accDebuff = -clamp(0.16 + tier * 0.02 + pow * 0.05 + skillRoll01(def, "acc") * 0.08, 0.16, 0.55);
      return `Passive: +${checkBonusPct}% to Cunning checks.
Combat: Pinpoint disruption (single target Accuracy ${Math.round(accDebuff * 100)}%).`;
    }
    if (v === 3) {
      const boost = clamp(0.10 + tier * 0.03 + pow * 0.06 + skillRoll01(def, "boost") * 0.10, 0.10, 0.55);
      const ms = 9000 + Math.floor(skillRoll01(def, "ms") * 8000) + tier * 1500;
      return `Passive: +${checkBonusPct}% to Cunning checks.
Combat: Battle trick — Shielded for ${Math.round(ms / 1000)}s and +${Math.round(boost * 100)}% party damage (1 turn).`;
    }
    if (v === 4) {
      const bleedChance = clamp(0.12 + tier * 0.03 + pow * 0.08 + skillRoll01(def, "bleed") * 0.10, 0.10, 0.60);
      return `Passive: +${checkBonusPct}% to Cunning checks.
Combat: Ambush strike with a chance to inflict Bleeding (~${Math.round(bleedChance * 100)}% at rank 1).`;
    }
    const accDebuff = -clamp(0.12 + tier * 0.02 + pow * 0.05 + skillRoll01(def, "acc") * 0.06, 0.12, 0.45);
    const partyBoost = clamp(0.20 + tier * 0.04 + pow * 0.12 + skillRoll01(def, "boost") * 0.10, 0.2, 1.05);
    return `Passive: +${checkBonusPct}% to Cunning checks.
Combat: Off-balance (Accuracy ${Math.round(accDebuff * 100)}%) and +${Math.round(partyBoost * 100)}% party damage.`;
  }
  if (focus === "arcana") {
    const baseCost = 4 + tier * 2 + pow * 2;
    if (v === 1) {
      const manaCost = Math.max(2, Math.floor(baseCost * (0.85 + skillRoll01(def, "cost") * 0.35)));
      return `Passive: +${checkBonusPct}% to Arcana checks.
Combat: Chain spell (-${manaCost} mana) that hits all enemies.`;
    }
    if (v === 2) {
      const manaCost = Math.max(2, Math.floor(baseCost * (0.85 + skillRoll01(def, "cost") * 0.35)));
      const ms = 16000 + tier * 2500;
      return `Passive: +${checkBonusPct}% to Arcana checks.
Combat: Aether siphon (-${manaCost} mana) that wounds the target and grants Aether for ${Math.round(ms / 1000)}s.`;
    }
    if (v === 3) {
      const manaCost = Math.max(2, Math.floor(baseCost * (0.75 + skillRoll01(def, "cost") * 0.35)));
      const esc = clamp(0.08 + tier * 0.02 + pow * 0.05 + skillRoll01(def, "esc") * 0.08, 0.08, 0.40);
      return `Passive: +${checkBonusPct}% to Arcana checks.
Combat: Storm ward (-${manaCost} mana) that hastes you and boosts escape (+${Math.round(esc * 100)}% for 2 turns).`;
    }
    if (v === 4) {
      const manaCost = Math.max(2, Math.floor(baseCost * (0.9 + skillRoll01(def, "cost") * 0.3)));
      const boost = clamp(0.10 + tier * 0.03 + pow * 0.06 + skillRoll01(def, "boost") * 0.10, 0.10, 0.65);
      return `Passive: +${checkBonusPct}% to Arcana checks.
Combat: Void mark (-${manaCost} mana): damage + +${Math.round(boost * 100)}% party damage (1 turn).`;
    }
    const manaCost = Math.max(2, Math.floor(baseCost * (0.9 + skillRoll01(def, "cost") * 0.25)));
    const accDebuff = -clamp(0.06 + tier * 0.01 + pow * 0.03 + skillRoll01(def, "acc") * 0.04, 0.06, 0.24);
    return `Passive: +${checkBonusPct}% to Arcana checks.
Combat: Arcane bolt (-${manaCost} mana) that destabilizes the target (Accuracy ${Math.round(accDebuff * 100)}%).`;
  }
  if (focus === "resilience") {
    if (v === 1) {
      const ms = 16000 + tier * 2600;
      const heal = Math.max(2, Math.floor((2 + tier * 1 + pow * 4)));
      return `Passive: +${checkBonusPct}% to Resilience checks.
Combat: Fortify (+${heal} HP at rank 1), clear Bleeding, Shielded for ${Math.round(ms / 1000)}s.`;
    }
    if (v === 2) {
      const heal = Math.max(2, Math.floor((3 + tier * 2 + pow * 5)));
      const boost = clamp(0.10 + tier * 0.03 + pow * 0.06 + skillRoll01(def, "boost") * 0.10, 0.10, 0.75);
      return `Passive: +${checkBonusPct}% to Resilience checks.
Combat: Rally (+${heal} HP at rank 1) and +${Math.round(boost * 100)}% party damage (2 turns).`;
    }
    if (v === 3) {
      const heal = Math.max(2, Math.floor((2 + tier * 2 + pow * 6)));
      const mana = Math.max(2, Math.floor((2 + tier * 1 + pow * 3)));
      const ms = 14000 + tier * 2200;
      return `Passive: +${checkBonusPct}% to Resilience checks.
Combat: Second wind (+${heal} HP, +${mana} mana at rank 1) and Rested for ${Math.round(ms / 1000)}s.`;
    }
    if (v === 4) {
      const ms = 15000 + tier * 2600;
      return `Passive: +${checkBonusPct}% to Resilience checks.
Combat: Bulwark — gain Ironbark/Wyrmhide protection and Shielded for ${Math.round(ms / 1000)}s.`;
    }
    const ms = 12000 + tier * 2500;
    const heal = Math.max(2, Math.floor((4 + tier * 2 + pow * 6)));
    return `Passive: +${checkBonusPct}% to Resilience checks.
Combat: Guard the party and recover (+${heal} HP at rank 1). Shielded lasts ${Math.round(ms / 1000)}s.`;
  }
  return `Passive: Improves general outcomes.
Cost: ${cost} skill points.`;
}

function skillChanceBonusFromSkill(def) {
  const tier = Math.max(1, Math.floor(def?.tier || 1));
  const mul = def?.powerful ? 2.0 : 1.0;
  const jitter = 0.85 + skillRoll01(def, "passive") * 0.30;
  return 0.0035 * tier * mul * jitter;
}

function skillChanceBonusForStat(s, statKey) {
  if (!s) return 0;
  const wanted = String(statKey || "").trim().toLowerCase();
  if (!wanted) return 0;
  const learned = s.skills?.learned || {};
  const keys = Object.keys(learned);
  if (!keys.length) return 0;

  let bonus = 0;
  let counted = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!learned[k]) continue;
    const def = skillDef(k);
    if (String(def.focus || "").toLowerCase() !== wanted) continue;
    const rank = Math.max(1, Math.floor(learned[k] || 1));
    bonus += skillChanceBonusFromSkill(def) * rank;
    counted += 1;
    if (counted >= 18) break;
    if (bonus >= 0.08) break;
  }
  return clamp(bonus, 0, 0.08);
}

let skillModalEl = null;
let skillModalTitleEl = null;
let skillModalBodyEl = null;

function ensureSkillModal() {
  if (skillModalEl) return;

  skillModalEl = document.createElement("div");
  skillModalEl.style.display = "none";
  skillModalEl.className = "modalOverlay";

  const card = document.createElement("div");
  card.className = "modalCard";
  card.style.width = "min(560px, calc(100vw - 28px))";

  const top = document.createElement("div");
  top.className = "modalHeader";

  skillModalTitleEl = document.createElement("div");
  skillModalTitleEl.className = "panelTitle";
  skillModalTitleEl.style.marginBottom = "0";

  const btnClose = document.createElement("button");
  btnClose.className = "secondary";
  btnClose.textContent = "Close";
  btnClose.addEventListener("click", () => closeSkillModal());

  top.appendChild(skillModalTitleEl);
  top.appendChild(btnClose);

  skillModalBodyEl = document.createElement("div");
  skillModalBodyEl.className = "modalBody";

  card.appendChild(top);
  card.appendChild(skillModalBodyEl);

  skillModalEl.appendChild(card);
  skillModalEl.addEventListener("click", (e) => {
    if (e.target === skillModalEl) closeSkillModal();
  });
  document.body.appendChild(skillModalEl);
}

function openSkillModal(skillKey) {
  ensureSkillModal();
  const def = skillDef(skillKey);
  const p = professionDef(def.profession);
  const b = buildDef(def.build);
  const pLabel = p ? p.label : titleCaseWord(def.profession);
  const bLabel = b ? b.label : titleCaseWord(def.build);
  if (skillModalTitleEl) skillModalTitleEl.textContent = def.label;
  if (skillModalBodyEl) {
    const rarity = def.powerful ? "Powerful" : "Standard";
    const cost = skillPointCost(def);
    const effect = skillEffectText(def);
    skillModalBodyEl.textContent = `Class: ${pLabel} / ${bLabel}\nRarity: ${rarity}\nFocus: ${titleCaseWord(def.focus)}\nTier: ${def.tier}\nCost: ${cost} Skill Points\nKey: ${def.key}\n\nWhat it does:\n${effect}\n\nLore:\n${def.desc || "No details available."}`;
    skillModalBodyEl.style.whiteSpace = "pre-wrap";
  }
  if (skillModalEl) skillModalEl.classList.add("open");
  if (skillModalEl) skillModalEl.style.display = "flex";
}

function closeSkillModal() {
  if (skillModalEl) skillModalEl.classList.remove("open");
  if (skillModalEl) skillModalEl.style.display = "none";
}

const BUILDS = [
  {
    key: "balanced",
    label: "Balanced",
    desc: "No extremes. Consistent progress.",
    bonuses: { strength: 1, cunning: 1, arcana: 1, resilience: 1 },
    hpBonus: 0,
    manaBonus: 0,
  },
  {
    key: "tank",
    label: "Tank",
    desc: "Endure hits and keep going.",
    bonuses: { resilience: 3 },
    hpBonus: 10,
    manaBonus: 0,
  },
  {
    key: "duelist",
    label: "Duelist",
    desc: "Aggressive damage and decisive pushes.",
    bonuses: { strength: 3, cunning: 1 },
    hpBonus: 2,
    manaBonus: 0,
  },
  {
    key: "trickster",
    label: "Trickster",
    desc: "Outplay threats with timing and misdirection.",
    bonuses: { cunning: 3, arcana: 1 },
    hpBonus: 0,
    manaBonus: 2,
  },
  {
    key: "mystic",
    label: "Mystic",
    desc: "Powerful magic and long-term mana sustain.",
    bonuses: { arcana: 3, cunning: 1 },
    hpBonus: 0,
    manaBonus: 8,
  },
];

function professionDef(key) {
  return PROFESSIONS.find((p) => p.key === key) || null;
}

function buildDef(key) {
  return BUILDS.find((b) => b.key === key) || null;
}

function characterSummary(s) {
  const p = professionDef(s.character?.profession);
  const b = buildDef(s.character?.build);
  const pLabel = p ? p.label : "Unchosen";
  const bLabel = b ? b.label : "Unchosen";
  return `${pLabel} / ${bLabel}`;
}

function applyCharacterSelections() {
  if (!state) return;
  normalizeState(state);
  if (state.character?.created) return;
  if (isAdminProfile(state.profile)) return;

  const p = professionDef(state.character.profession);
  const b = buildDef(state.character.build);
  if (!p || !b) return;

  state.level = 1;
  state.xp = 0;
  state.hp = 32;
  state.maxHp = 32;
  state.mana = 18;
  state.maxMana = 18;
  state.gold = 20;
  state.inventory = { bandage: 1 };
  state.stats = { strength: 0, cunning: 0, arcana: 0, resilience: 0 };
  state.equipment = { weapon: null, armor1: null, armor2: null, armor3: null, armor4: null, accessory1: null, accessory2: null };
  state.skillPoints = 0;
  state.effects = {};

  for (const [k, v] of Object.entries(p.bonuses || {})) state.stats[k] = (state.stats[k] || 0) + v;
  state.maxHp += p.hpBonus || 0;
  state.maxMana += p.manaBonus || 0;
  state.gold += p.goldBonus || 0;
  for (const [k, v] of Object.entries(p.items || {})) state.inventory[k] = (state.inventory[k] || 0) + v;

  for (const [k, v] of Object.entries(b.bonuses || {})) state.stats[k] = (state.stats[k] || 0) + v;
  state.maxHp += b.hpBonus || 0;
  state.maxMana += b.manaBonus || 0;

  state.hp = maxHpForState(state);
  state.mana = maxManaForState(state);

  state.flags = state.flags || {};
  state.flags.starterKitGranted = true;
}

function grantStarterKitIfNeeded(s) {
  if (!s) return;
  if (!s.character?.created) return;
  if (s.flags?.starterKitGranted) return;

  if (!s.character.profession) s.character.profession = "fighter";
  const p = professionDef(s.character.profession);
  if (!p) return;

  s.inventory = s.inventory || {};
  for (const [k, v] of Object.entries(p.items || {})) {
    s.inventory[k] = (s.inventory[k] || 0) + (v || 0);
  }

  s.flags = s.flags || {};
  s.flags.starterKitGranted = true;
  if (state === s) appendLog("🎒 Beginner kit granted for your profession.");
}

function findStarterSkillKeyForFocus(prof, build, focus, learned) {
  const p = String(prof || "").trim().toLowerCase() || "fighter";
  const b = String(build || "").trim().toLowerCase() || "balanced";
  const f = String(focus || "").trim().toLowerCase();
  const used = learned || {};

  let start = (hashString(`${p}:${b}:${f}:starter`) % 100) + 1;
  for (let t = 0; t < 100; t++) {
    const idx = ((start + t - 1) % 100) + 1;
    const def = skillDefFromParts(p, b, idx);
    if (!def) continue;
    if (def.tier !== 1) continue;
    if (def.powerful) continue;
    if (f && String(def.focus || "").toLowerCase() !== f) continue;
    if (used[def.key]) continue;
    return def.key;
  }
  return null;
}

function grantStarterSkillKitIfNeeded(s) {
  if (!s) return;
  if (!s.character?.created) return;

  s.skills = s.skills || {};
  s.skills.learned = s.skills.learned || {};
  s.skills.sources = (s.skills.sources && typeof s.skills.sources === "object") ? s.skills.sources : {};

  const learnedKeys = Object.keys(s.skills.learned || {}).filter((k) => !!s.skills.learned[k]);
  const learnedExisting = learnedKeys.length;
  const isFresh = (Math.floor(s.level || 1) === 1) && (Math.floor(s.xp || 0) === 0) && (Math.floor(s.skillPoints || 0) === 0);
  const allRank1 = learnedKeys.every((k) => Math.floor(s.skills.learned[k] || 0) === 1);
  const shouldRepair = !!s.flags?.starterSkillKitGranted && !s.flags?.starterSkillKitRepaired && isFresh && learnedExisting >= 8 && allRank1;
  if (shouldRepair) {
    s.skills.learned = {};
    s.skills.sources = {};
  }

  const learnedNow = Object.keys(s.skills.learned || {}).filter((k) => !!s.skills.learned[k]).length;
  const targetTotal = 8;
  const maxNew = Math.max(0, targetTotal - learnedNow);
  if (!s.flags?.starterSkillKitGranted && learnedNow >= targetTotal && !shouldRepair) {
    s.flags = s.flags || {};
    s.flags.starterSkillKitGranted = true;
    return;
  }
  if (s.flags?.starterSkillKitGranted && maxNew <= 0 && !shouldRepair) return;
  if (maxNew <= 0) return;

  const prof = s.character?.profession || "fighter";
  const build = s.character?.build || "balanced";
  const profDef = PROF_SKILL[String(prof || "").toLowerCase()] || PROF_SKILL.fighter;

  let buildFocus = buildFocusForBuild(build);
  const profFocuses = (Array.isArray(profDef.focuses) && profDef.focuses.length)
    ? profDef.focuses.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean)
    : ["strength", "cunning", "arcana", "resilience"];
  const profPrimary = profFocuses[0] || "strength";
  const profSecondary = profFocuses.find((x) => String(x).toLowerCase() !== String(profPrimary).toLowerCase()) || profPrimary;
  if (!buildFocus) buildFocus = profSecondary;

  const gained = [];
  const max = maxNew;
  const take = (focus, source) => {
    const key = findStarterSkillKeyForFocus(prof, build, focus, s.skills.learned);
    if (!key) return false;
    s.skills.learned[key] = 1;
    if (source) s.skills.sources[key] = source;
    gained.push(skillDef(key).label);
    return true;
  };

  const desiredBuild = Math.min(4, max);
  for (let i = 0; i < desiredBuild && gained.length < max; i++) {
    if (!take(buildFocus, "build")) break;
  }

  const desiredProf = Math.min(4, max - gained.length);
  for (let i = 0; i < desiredProf && gained.length < max; i++) {
    if (!take(profPrimary, "profession")) break;
  }

  for (let i = 0; i < profFocuses.length && gained.length < max; i++) {
    take(profFocuses[i], "profession");
  }
  while (gained.length < max) {
    if (!take("", "build")) break;
  }

  s.flags = s.flags || {};
  s.flags.starterSkillKitGranted = true;
  if (shouldRepair) s.flags.starterSkillKitRepaired = true;
  if (state === s) {
    if (gained.length) appendLog(`✨ Starter techniques learned: ${gained.join(", ")}.`);
    else appendLog("✨ Starter techniques prepared.");
  }
}

const DIFFICULTY = {
  easy: { label: "Easy", className: "easy", recLevel: 1, baseXp: 35, baseGold: 10, xpPerLevel: 22, goldPerLevel: 4, baseDmg: 6 },
  normal: { label: "Normal", className: "normal", recLevel: 4, baseXp: 70, baseGold: 20, xpPerLevel: 35, goldPerLevel: 7, baseDmg: 10 },
  hard: { label: "Hard", className: "hard", recLevel: 8, baseXp: 120, baseGold: 32, xpPerLevel: 55, goldPerLevel: 12, baseDmg: 16 },
  elite: { label: "Elite", className: "elite", recLevel: 12, baseXp: 180, baseGold: 48, xpPerLevel: 80, goldPerLevel: 18, baseDmg: 24 },
  legendary: { label: "Legendary", className: "legendary", recLevel: 16, baseXp: 260, baseGold: 70, xpPerLevel: 115, goldPerLevel: 28, baseDmg: 36 },
};

const FACTIONS = ["Guild", "Rebels", "Crown", "Wilds"];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function saveKey(profile) {
  return `virelia_save:${profile}`;
}

function isAdminProfile(profile) {
  const p = String(profile || "").trim().toLowerCase();
  return p === "admin#";
}

function normalizeAdminProfileInput(profile) {
  const p = String(profile || "").trim().toLowerCase();
  if (p === "admin#") return ADMIN_PROFILE;
  return String(profile || "").trim();
}

const ADMIN_PROFILE = "admin#";
const ADMIN_PASSWORD = "admin12";

const ADMIN_GOD_LEVEL = 999;
const ADMIN_GOD_VALUE = 999999;

let adminMode = false;
let adminEditingProfile = null;

let adminShowGame = true;

let adminSkillProf = "fighter";
let adminSkillBuild = "balanced";
let adminSkillPage = 0;

function isAdminSessionActive() {
  return !!adminMode && !!state && state.profile === ADMIN_PROFILE;
}

function setAdminDashboardUi() {
  const on = isAdminSessionActive();
  if (userHomeViewEl) userHomeViewEl.style.display = on ? "none" : "block";
  if (adminHomeViewEl) adminHomeViewEl.style.display = on ? "block" : "none";
  if (homeSavesTitleUser) homeSavesTitleUser.style.display = on ? "none" : "block";
  if (homeSavesTitleAdmin) homeSavesTitleAdmin.style.display = on ? "block" : "none";

  if (gameMainEl) gameMainEl.style.display = (on && !adminShowGame) ? "none" : "grid";
  if (btnAdminToggleGame) btnAdminToggleGame.textContent = (on && !adminShowGame) ? "Show Game" : "Hide Game";
}

function adminCreateUserSave() {
  if (!isAdminSessionActive()) return;
  const profile = String(adminNewUserEl?.value || "").trim();
  if (!profile) {
    setHomeMsg("Enter a user profile name to create.");
    return;
  }
  if (isAdminProfile(profile)) {
    setHomeMsg("That name is reserved for admin.");
    return;
  }
  if (safeLoad(profile)) {
    setHomeMsg("That user already exists.");
    return;
  }
  const s = createNewState(profile);
  s.nodeId = "character_create";
  s.updatedAt = nowIso();
  safeSave(profile, s);
  if (adminNewUserEl) adminNewUserEl.value = "";
  setHomeMsg(`Created user save: ${profile}.`);
  renderHomeSaves();
}

function applyAdminGodMode(s) {
  if (!s) return;
  if (!isAdminProfile(s.profile)) return;

  const on = (typeof s.flags?.adminGodMode === "undefined") ? true : !!s.flags.adminGodMode;
  if (!on) return;

  s.level = Math.max(ADMIN_GOD_LEVEL, Math.floor(s.level || 1));
  s.xp = 0;
  s.gold = ADMIN_GOD_VALUE;
  s.skillPoints = ADMIN_GOD_VALUE;

  s.stats = s.stats || { strength: 0, cunning: 0, arcana: 0, resilience: 0 };
  s.stats.strength = ADMIN_GOD_VALUE;
  s.stats.cunning = ADMIN_GOD_VALUE;
  s.stats.arcana = ADMIN_GOD_VALUE;
  s.stats.resilience = ADMIN_GOD_VALUE;

  s.maxHp = ADMIN_GOD_VALUE;
  s.hp = ADMIN_GOD_VALUE;
  s.maxMana = ADMIN_GOD_VALUE;
  s.mana = ADMIN_GOD_VALUE;

  s.reputation = s.reputation || { Guild: 0, Rebels: 0, Crown: 0, Wilds: 0 };
  s.reputation.Guild = ADMIN_GOD_VALUE;
  s.reputation.Rebels = ADMIN_GOD_VALUE;
  s.reputation.Crown = ADMIN_GOD_VALUE;
  s.reputation.Wilds = ADMIN_GOD_VALUE;
}

function isAdminGodModeActive(s) {
  if (!s) return false;
  if (!isAdminProfile(s.profile)) return false;
  const on = (typeof s.flags?.adminGodMode === "undefined") ? true : !!s.flags.adminGodMode;
  return !!on;
}

function verifyAdminPassword() {
  const pass = (adminPassEl && typeof adminPassEl.value === "string") ? adminPassEl.value : "";
  return pass === ADMIN_PASSWORD;
}

function renderAdminTools() {
  if (!adminToolsEl) return;
  const prevActive = document.activeElement;
  const prevFocusId = (prevActive && prevActive.id) ? String(prevActive.id) : "";
  const prevSelStart = (prevActive && typeof prevActive.selectionStart === "number") ? prevActive.selectionStart : null;
  const prevSelEnd = (prevActive && typeof prevActive.selectionEnd === "number") ? prevActive.selectionEnd : null;
  const scheduleRestoreFocus = () => {
    if (!prevFocusId) return;
    const restore = () => {
      const el = document.getElementById(prevFocusId);
      if (!el || typeof el.focus !== "function") return;
      el.focus();
      if (prevSelStart !== null && prevSelEnd !== null && typeof el.setSelectionRange === "function") {
        try { el.setSelectionRange(prevSelStart, prevSelEnd); } catch (_) {}
      }
    };
    setTimeout(restore, 0);
  };
  adminToolsEl.innerHTML = "";

  const title = document.createElement("div");
  title.className = "panelTitle";
  title.textContent = "Admin Tools";
  adminToolsEl.appendChild(title);

  if (!adminMode) {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Log in as admin# with the admin password to unlock admin tools.";
    adminToolsEl.appendChild(hint);
    scheduleRestoreFocus();
    return;
  }

  const buildHref = document.querySelector('link[href*="style.css"]')?.getAttribute("href") || "";
  const buildMatch = /[?&]v=([^&]+)/.exec(buildHref);
  const buildV = buildMatch ? buildMatch[1] : "dev";

  const changesWrap = document.createElement("div");
  changesWrap.className = "advSection";
  changesWrap.style.marginTop = "0";
  const changesTitle = document.createElement("div");
  changesTitle.className = "advSectionTitle";
  changesTitle.textContent = `Recent changes (Build ${buildV})`;
  const changesBody = document.createElement("div");
  changesBody.className = "advWrap";
  changesBody.textContent =
`- Skill families: duplicates cleaned up and only higher-tier upgrades offered.
- Skill Lv cap: upgrades stop at Lv 7; wait for higher-tier versions.
- Skill power scaling: Lv 1..7 now meaningfully scales damage/heal effectiveness.
- Targeted items: HP/Mana recovery can be used on party members (incl. in combat).
- Companions: improved stat scaling and auto-use of recovery items at low HP/mana.
- Legendary revive: Phoenix Feather (very expensive) revives a dead teammate to full HP/mana and only appears when someone is down.
- UI: build badge + sanity check helper (vireliaSanityCheck()).`;

  const changesBtns = document.createElement("div");
  changesBtns.className = "row";
  changesBtns.style.marginTop = "10px";
  const btnSanity = document.createElement("button");
  btnSanity.className = "secondary";
  btnSanity.textContent = "Run sanity check";
  btnSanity.addEventListener("click", () => {
    if (typeof window.vireliaSanityCheck === "function") {
      const res = window.vireliaSanityCheck();
      setHomeMsg(`Sanity check ran (see console). Build ${res?.build || buildV}.`);
    } else {
      setHomeMsg("Sanity check not available in this build.");
    }
  });
  changesBtns.appendChild(btnSanity);

  changesWrap.appendChild(changesTitle);
  changesWrap.appendChild(changesBody);
  changesWrap.appendChild(changesBtns);
  adminToolsEl.appendChild(changesWrap);

  const known = knownItemKeys();
  const expanded = adminToolsEl.dataset.knownItemsExpanded === "1";
  const knownQuery = String(adminToolsEl.dataset.knownItemsQuery || "");
  const knownQueryLower = String(knownQuery || "").trim().toLowerCase();
  const knownFiltered = knownQueryLower
    ? known.filter((k) => {
      const kk = String(k || "").toLowerCase();
      const lbl = String(itemLabel(k) || "").toLowerCase();
      return kk.includes(knownQueryLower) || lbl.includes(knownQueryLower);
    })
    : known;

  const knownWrap = document.createElement("div");
  knownWrap.className = "hint";
  knownWrap.style.marginTop = "0";

  const knownTop = document.createElement("div");
  knownTop.className = "row";
  knownTop.style.marginTop = "0";

  const knownLabel = document.createElement("div");
  knownLabel.className = "hint";
  knownLabel.style.marginTop = "0";
  knownLabel.textContent = knownQueryLower ? `Known items: ${knownFiltered.length}/${known.length}` : `Known items: ${known.length}`;

  const knownSearch = document.createElement("input");
  knownSearch.id = "adminKnownSearch";
  knownSearch.placeholder = "Search items (name or key)";
  knownSearch.value = knownQuery;
  knownSearch.style.width = "240px";
  knownSearch.addEventListener("input", () => {
    adminToolsEl.dataset.knownItemsQuery = String(knownSearch.value || "");
    const q = String(knownSearch.value || "").trim();
    if (q) adminToolsEl.dataset.knownItemsExpanded = "1";
    renderAdminTools();
  });

  const btnToggleKnown = document.createElement("button");
  btnToggleKnown.className = "secondary";
  btnToggleKnown.textContent = expanded ? "Hide List" : "Show List";

  const list = document.createElement("div");
  list.className = "adminItemList";
  list.style.display = expanded ? "block" : "none";

  if (known.length === 0) {
    const none = document.createElement("div");
    none.className = "hint";
    none.style.marginTop = "0";
    none.textContent = "(none)";
    list.appendChild(none);
  } else {
    for (const k of knownFiltered) {
      const row = document.createElement("div");
      row.className = "adminItemRow";
      row.textContent = `${itemLabel(k)} (${k})`;
      row.addEventListener("click", () => openItemModal(k));
      list.appendChild(row);
    }
  }

  btnToggleKnown.addEventListener("click", () => {
    const nextExpanded = adminToolsEl.dataset.knownItemsExpanded !== "1";
    adminToolsEl.dataset.knownItemsExpanded = nextExpanded ? "1" : "0";
    renderAdminTools();
  });

  knownTop.appendChild(knownLabel);
  knownTop.appendChild(knownSearch);
  knownTop.appendChild(btnToggleKnown);
  knownWrap.appendChild(knownTop);
  knownWrap.appendChild(list);
  adminToolsEl.appendChild(knownWrap);

  const rowTop = document.createElement("div");
  rowTop.className = "row";
  const on = document.createElement("div");
  on.className = "hint";
  on.style.marginTop = "0";
  on.textContent = "Admin mode: ON";
  const btnLogout = document.createElement("button");
  btnLogout.className = "secondary";
  btnLogout.textContent = "Logout Admin";
  btnLogout.addEventListener("click", () => {
    adminMode = false;
    adminEditingProfile = null;
    adminShowGame = true;
    if (adminPassEl) adminPassEl.value = "";
    renderHomeSaves();
    setHomeMsg("Admin mode disabled.");
  });
  rowTop.appendChild(on);
  rowTop.appendChild(btnLogout);
  adminToolsEl.appendChild(rowTop);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = "Click Edit on a save above to modify it.";
  adminToolsEl.appendChild(hint);

  if (!adminEditingProfile) {
    scheduleRestoreFocus();
    return;
  }

  const loaded = safeLoad(adminEditingProfile);
  if (!loaded) {
    adminEditingProfile = null;
    scheduleRestoreFocus();
    return;
  }
  normalizeState(loaded);

  const form = document.createElement("div");
  form.className = "saveRow";

  const left = document.createElement("div");
  left.className = "saveMeta";
  left.textContent = `Editing: ${adminEditingProfile}`;

  const right = document.createElement("div");
  right.className = "saveActions";

  const mkNum = (label, value) => {
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "8px";
    wrap.style.alignItems = "center";
    const l = document.createElement("div");
    l.className = "hint";
    l.style.marginTop = "0";
    l.textContent = label;
    const i = document.createElement("input");
    i.value = String(value ?? 0);
    i.style.width = "96px";
    wrap.appendChild(l);
    wrap.appendChild(i);
    return { wrap, input: i };
  };

  const lvl = mkNum("Level", loaded.level);
  const gold = mkNum("Gold", loaded.gold);
  const maxHp = mkNum("Max HP", loaded.maxHp);
  const maxMana = mkNum("Max Mana", loaded.maxMana);
  const sp = mkNum("Skill Pts", loaded.skillPoints || 0);
  const str = mkNum("Str", loaded.stats?.strength || 0);
  const cun = mkNum("Cun", loaded.stats?.cunning || 0);
  const arc = mkNum("Arc", loaded.stats?.arcana || 0);
  const res = mkNum("Res", loaded.stats?.resilience || 0);

  const invWrap = document.createElement("div");
  invWrap.style.display = "flex";
  invWrap.style.flexDirection = "column";
  invWrap.style.gap = "10px";

  const invTitle = document.createElement("div");
  invTitle.className = "hint";
  invTitle.style.marginTop = "0";
  invTitle.textContent = "Inventory (admin can give/take any item):";
  invWrap.appendChild(invTitle);

  const invRow = document.createElement("div");
  invRow.style.display = "flex";
  invRow.style.gap = "10px";
  invRow.style.flexWrap = "wrap";
  invRow.style.alignItems = "center";

  const invKeySel = document.createElement("select");
  for (const k of known) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${itemLabel(k)} (${k})`;
    invKeySel.appendChild(opt);
  }

  const invKeyCustom = document.createElement("input");
  invKeyCustom.id = "adminInvKeyCustom";
  invKeyCustom.placeholder = "or type item key";
  invKeyCustom.style.width = "180px";
  invKeyCustom.value = String(adminToolsEl.dataset.adminInvKeyCustom || "");
  invKeyCustom.addEventListener("input", () => {
    adminToolsEl.dataset.adminInvKeyCustom = String(invKeyCustom.value || "");
  });

  const itemKeyListId = "adminItemKeyList";
  let itemKeyList = document.getElementById(itemKeyListId);
  if (!itemKeyList) {
    itemKeyList = document.createElement("datalist");
    itemKeyList.id = itemKeyListId;
    document.body.appendChild(itemKeyList);
  }
  itemKeyList.innerHTML = "";
  for (const k of known) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = itemLabel(k);
    itemKeyList.appendChild(opt);
  }
  invKeyCustom.setAttribute("list", itemKeyListId);

  const invQty = document.createElement("input");
  invQty.id = "adminInvQty";
  invQty.value = String(adminToolsEl.dataset.adminInvQty || "1");
  invQty.style.width = "96px";
  invQty.addEventListener("input", () => {
    adminToolsEl.dataset.adminInvQty = String(invQty.value || "");
  });

  const getInvKey = () => {
    const typed = String(invKeyCustom.value || "").trim();
    return typed || String(invKeySel.value || "").trim();
  };

  const giveItem = (delta) => {
    const key = getInvKey();
    const n = parseInt(String(invQty.value || "0"), 10);
    const amt = Number.isFinite(n) ? n : 0;
    if (!key) return;
    if (amt <= 0) return;
    loaded.inventory = loaded.inventory || {};
    const cur = parseInt(String(loaded.inventory[key] || 0), 10) || 0;
    const next = Math.max(0, cur + delta * amt);
    if (next <= 0) {
      delete loaded.inventory[key];
    } else {
      loaded.inventory[key] = next;
    }
    loaded.updatedAt = nowIso();
    safeSave(adminEditingProfile, loaded);
    renderHomeSaves();
    adminEditingProfile = adminEditingProfile;
    renderAdminTools();
    setHomeMsg(`${delta > 0 ? "Gave" : "Took"} ${amt} ${key} ${delta > 0 ? "to" : "from"} ${adminEditingProfile}.`);
  };

  const btnGive = document.createElement("button");
  btnGive.textContent = "Give";
  btnGive.addEventListener("click", () => giveItem(1));

  const btnTake = document.createElement("button");
  btnTake.className = "secondary";
  btnTake.textContent = "Take";
  btnTake.addEventListener("click", () => giveItem(-1));

  invKeyCustom.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const key = getInvKey();
    const keyValid = !!key && known.includes(key);
    if (!keyValid) return;
    e.preventDefault();
    if (e.shiftKey) giveItem(-1);
    else giveItem(1);
  });
  invQty.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const key = getInvKey();
    const keyValid = !!key && known.includes(key);
    if (!keyValid) return;
    e.preventDefault();
    if (e.shiftKey) giveItem(-1);
    else giveItem(1);
  });

  invRow.appendChild(invKeySel);
  invRow.appendChild(invKeyCustom);
  invRow.appendChild(invQty);
  invRow.appendChild(btnGive);
  invRow.appendChild(btnTake);
  invWrap.appendChild(invRow);

  const curList = document.createElement("div");
  curList.className = "saveMeta";
  const invKeys = Object.keys(loaded.inventory || {}).sort((a, b) => a.localeCompare(b));
  curList.textContent = invKeys.length
    ? `Current inventory: ${invKeys.map((k) => `${itemLabel(k)}=${loaded.inventory[k]}`).join(", ")}`
    : "Current inventory: (empty)";
  invWrap.appendChild(curList);

  const skillWrap = document.createElement("div");
  skillWrap.style.display = "flex";
  skillWrap.style.flexDirection = "column";
  skillWrap.style.gap = "10px";

  const skillTitle = document.createElement("div");
  skillTitle.className = "hint";
  skillTitle.style.marginTop = "0";
  skillTitle.textContent = "Skills (admin can give/take any skill):";
  skillWrap.appendChild(skillTitle);

  const profSel = document.createElement("select");
  for (const p of PROFESSIONS) {
    const opt = document.createElement("option");
    opt.value = p.key;
    opt.textContent = p.label;
    profSel.appendChild(opt);
  }

  const buildSel = document.createElement("select");
  for (const b of BUILDS) {
    const opt = document.createElement("option");
    opt.value = b.key;
    opt.textContent = b.label;
    buildSel.appendChild(opt);
  }

  const skillKeyCustom = document.createElement("input");
  skillKeyCustom.id = "adminSkillKeyCustom";
  skillKeyCustom.placeholder = "or type skill key";
  skillKeyCustom.style.width = "220px";
  skillKeyCustom.value = String(adminToolsEl.dataset.adminSkillKeyCustom || "");
  skillKeyCustom.addEventListener("input", () => {
    adminToolsEl.dataset.adminSkillKeyCustom = String(skillKeyCustom.value || "");
  });

  const skillKeyListId = "adminSkillKeyList";
  let skillKeyList = document.getElementById(skillKeyListId);
  if (!skillKeyList) {
    skillKeyList = document.createElement("datalist");
    skillKeyList.id = skillKeyListId;
    document.body.appendChild(skillKeyList);
  }
  skillKeyList.innerHTML = "";
  {
    const p0 = String(profSel.value || "fighter").trim().toLowerCase() || "fighter";
    const b0 = String(buildSel.value || "balanced").trim().toLowerCase() || "balanced";
    for (let i = 1; i <= SKILLS_PER_COMBO; i++) {
      const def = skillDefFromParts(p0, b0, i);
      if (!def || !def.key) continue;
      const opt = document.createElement("option");
      opt.value = def.key;
      opt.textContent = def.label;
      skillKeyList.appendChild(opt);
    }
  }
  skillKeyCustom.setAttribute("list", skillKeyListId);

  const btnPrevSkillPage = document.createElement("button");
  btnPrevSkillPage.className = "secondary";
  btnPrevSkillPage.textContent = "Prev";

  const btnNextSkillPage = document.createElement("button");
  btnNextSkillPage.className = "secondary";
  btnNextSkillPage.textContent = "Next";

  const skillPageInfo = document.createElement("div");
  skillPageInfo.className = "hint";
  skillPageInfo.style.marginTop = "0";

  const skillRowTop = document.createElement("div");
  skillRowTop.className = "row";
  skillRowTop.style.marginTop = "0";

  profSel.value = PROF_SKILL[adminSkillProf] ? adminSkillProf : "fighter";
  buildSel.value = BUILD_SKILL[adminSkillBuild] ? adminSkillBuild : "balanced";

  const updateAdminSkillUi = () => {
    adminSkillProf = String(profSel.value || "fighter").trim();
    adminSkillBuild = String(buildSel.value || "balanced").trim();
    const maxPage = Math.max(0, Math.ceil(SKILLS_PER_COMBO / SKILLS_PER_PAGE) - 1);
    adminSkillPage = clamp(adminSkillPage, 0, maxPage);
    const start = adminSkillPage * SKILLS_PER_PAGE + 1;
    const end = Math.min(SKILLS_PER_COMBO, start + SKILLS_PER_PAGE - 1);
    const p = professionDef(adminSkillProf);
    const b = buildDef(adminSkillBuild);
    const pLabel = p ? p.label : adminSkillProf;
    const bLabel = b ? b.label : adminSkillBuild;
    skillPageInfo.textContent = `Browsing: ${pLabel} / ${bLabel} — ${start}-${end} of ${SKILLS_PER_COMBO}`;
    btnPrevSkillPage.disabled = adminSkillPage <= 0;
    btnNextSkillPage.disabled = adminSkillPage >= maxPage;
  };

  const giveSkillKey = (delta) => {
    loaded.skills = loaded.skills || {};
    loaded.skills.learned = loaded.skills.learned || {};
    const typed = String(skillKeyCustom.value || "").trim();
    const k = typed || "";
    if (!k) return;
    if (delta > 0) {
      loaded.skills.learned[k] = 1;
    } else {
      delete loaded.skills.learned[k];
    }
    loaded.updatedAt = nowIso();
    safeSave(adminEditingProfile, loaded);
    renderHomeSaves();
    renderAdminTools();
    setHomeMsg(`${delta > 0 ? "Gave" : "Took"} skill ${k} ${delta > 0 ? "to" : "from"} ${adminEditingProfile}.`);
  };

  const btnGiveSkill = document.createElement("button");
  btnGiveSkill.textContent = "Give Skill";
  btnGiveSkill.addEventListener("click", () => giveSkillKey(1));

  const btnTakeSkill = document.createElement("button");
  btnTakeSkill.className = "secondary";
  btnTakeSkill.textContent = "Take Skill";
  btnTakeSkill.addEventListener("click", () => giveSkillKey(-1));

  skillKeyCustom.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const typed = String(skillKeyCustom.value || "").trim();
    const keyValid = !!typed && !!parseSkillKey(typed);
    if (!keyValid) return;
    e.preventDefault();
    if (e.shiftKey) giveSkillKey(-1);
    else giveSkillKey(1);
  });

  btnPrevSkillPage.addEventListener("click", () => {
    adminSkillPage = Math.max(0, adminSkillPage - 1);
    renderAdminTools();
  });
  btnNextSkillPage.addEventListener("click", () => {
    adminSkillPage = adminSkillPage + 1;
    renderAdminTools();
  });
  profSel.addEventListener("change", () => {
    adminSkillProf = String(profSel.value || "fighter").trim();
    adminSkillPage = 0;
    renderAdminTools();
  });
  buildSel.addEventListener("change", () => {
    adminSkillBuild = String(buildSel.value || "balanced").trim();
    adminSkillPage = 0;
    renderAdminTools();
  });

  skillRowTop.appendChild(profSel);
  skillRowTop.appendChild(buildSel);
  skillRowTop.appendChild(btnPrevSkillPage);
  skillRowTop.appendChild(btnNextSkillPage);
  skillRowTop.appendChild(skillPageInfo);
  skillWrap.appendChild(skillRowTop);

  const skillRowControls = document.createElement("div");
  skillRowControls.className = "row";
  skillRowControls.style.marginTop = "0";
  skillRowControls.appendChild(skillKeyCustom);
  skillRowControls.appendChild(btnGiveSkill);
  skillRowControls.appendChild(btnTakeSkill);
  skillWrap.appendChild(skillRowControls);

  updateAdminSkillUi();

  const skillList = document.createElement("div");
  skillList.className = "skillList";
  loaded.skills = loaded.skills || {};
  loaded.skills.learned = loaded.skills.learned || {};
  const maxPage = Math.max(0, Math.ceil(SKILLS_PER_COMBO / SKILLS_PER_PAGE) - 1);
  adminSkillPage = clamp(adminSkillPage, 0, maxPage);
  const start = adminSkillPage * SKILLS_PER_PAGE + 1;
  const end = Math.min(SKILLS_PER_COMBO, start + SKILLS_PER_PAGE - 1);
  for (let i = start; i <= end; i++) {
    const def = skillDefFromParts(adminSkillProf, adminSkillBuild, i);
    const learned = !!loaded.skills.learned[def.key];

    const row = document.createElement("div");
    row.className = `skillRow${def.powerful ? " powerful" : ""}`;

    const sLeft = document.createElement("div");
    sLeft.className = "skillLeft";
    const sTitle = document.createElement("div");
    sTitle.className = "skillTitle";
    sTitle.textContent = def.label;
    const sMeta = document.createElement("div");
    sMeta.className = "skillMeta";
    sMeta.textContent = `${titleCaseWord(def.focus)} • Tier ${def.tier}${def.powerful ? " • Powerful" : ""}${learned ? " • Owned" : ""}`;
    sLeft.appendChild(sTitle);
    sLeft.appendChild(sMeta);

    const sRight = document.createElement("div");
    sRight.className = "skillActions";
    const info = document.createElement("button");
    info.className = "iconBtn";
    info.textContent = "ℹ";
    info.title = "Skill details";
    info.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSkillModal(def.key);
    });

    const g = document.createElement("button");
    g.textContent = learned ? "Owned" : "Give";
    g.disabled = learned;
    g.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      loaded.skills.learned[def.key] = 1;
      loaded.updatedAt = nowIso();
      safeSave(adminEditingProfile, loaded);
      renderHomeSaves();
      renderAdminTools();
      setHomeMsg(`Gave skill ${def.key} to ${adminEditingProfile}.`);
    });

    const t = document.createElement("button");
    t.className = "secondary";
    t.textContent = "Take";
    t.disabled = !learned;
    t.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      delete loaded.skills.learned[def.key];
      loaded.updatedAt = nowIso();
      safeSave(adminEditingProfile, loaded);
      renderHomeSaves();
      renderAdminTools();
      setHomeMsg(`Took skill ${def.key} from ${adminEditingProfile}.`);
    });

    sRight.appendChild(info);
    sRight.appendChild(g);
    sRight.appendChild(t);
    row.appendChild(sLeft);
    row.appendChild(sRight);
    skillList.appendChild(row);
  }
  skillWrap.appendChild(skillList);

  const flagsWrap = document.createElement("div");
  flagsWrap.style.display = "flex";
  flagsWrap.style.gap = "10px";

  const heardWrap = document.createElement("label");
  heardWrap.className = "hint";
  heardWrap.style.marginTop = "0";
  heardWrap.style.display = "flex";
  heardWrap.style.gap = "8px";
  heardWrap.style.alignItems = "center";
  const heardCb = document.createElement("input");
  heardCb.type = "checkbox";
  heardCb.checked = !!loaded.flags?.heardRumors;
  const heardTxt = document.createElement("span");
  heardTxt.textContent = "heardRumors";
  heardWrap.appendChild(heardCb);
  heardWrap.appendChild(heardTxt);

  const allegWrap = document.createElement("div");
  allegWrap.style.display = "flex";
  allegWrap.style.gap = "8px";
  allegWrap.style.alignItems = "center";
  const allegLabel = document.createElement("div");
  allegLabel.className = "hint";
  allegLabel.style.marginTop = "0";
  allegLabel.textContent = "Allegiance";
  const allegSel = document.createElement("select");
  const allegOptions = ["None", ...FACTIONS];
  for (const o of allegOptions) {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    allegSel.appendChild(opt);
  }
  allegSel.value = loaded.flags?.allegiance || "None";
  allegWrap.appendChild(allegLabel);
  allegWrap.appendChild(allegSel);

  let godWrap = null;
  let godCb = null;
  if (isAdminProfile(adminEditingProfile)) {
    godWrap = document.createElement("label");
    godWrap.className = "hint";
    godWrap.style.marginTop = "0";
    godWrap.style.display = "flex";
    godWrap.style.gap = "8px";
    godWrap.style.alignItems = "center";
    godCb = document.createElement("input");
    godCb.type = "checkbox";
    godCb.checked = (typeof loaded.flags?.adminGodMode === "undefined") ? true : !!loaded.flags.adminGodMode;
    const godTxt = document.createElement("span");
    godTxt.textContent = "adminGodMode";
    godWrap.appendChild(godCb);
    godWrap.appendChild(godTxt);
  }

  flagsWrap.appendChild(heardWrap);
  flagsWrap.appendChild(allegWrap);
  if (godWrap) flagsWrap.appendChild(godWrap);

  const fields = document.createElement("div");
  fields.style.display = "flex";
  fields.style.flexWrap = "wrap";
  fields.style.gap = "10px";
  fields.style.marginTop = "10px";
  fields.appendChild(lvl.wrap);
  fields.appendChild(gold.wrap);
  fields.appendChild(maxHp.wrap);
  fields.appendChild(maxMana.wrap);
  fields.appendChild(sp.wrap);
  fields.appendChild(str.wrap);
  fields.appendChild(cun.wrap);
  fields.appendChild(arc.wrap);
  fields.appendChild(res.wrap);

  const xpWrap = document.createElement("div");
  xpWrap.style.display = "flex";
  xpWrap.style.flexDirection = "column";
  xpWrap.style.gap = "10px";

  const xpTitle = document.createElement("div");
  xpTitle.className = "hint";
  xpTitle.style.marginTop = "0";
  const xpNeedNow = (typeof xpToNext === "function") ? xpToNext(loaded.level || 1) : ((loaded.level || 1) * 100);
  xpTitle.textContent = `XP: ${loaded.xp || 0}/${xpNeedNow}`;
  xpWrap.appendChild(xpTitle);

  const xpRow = document.createElement("div");
  xpRow.className = "row";
  xpRow.style.marginTop = "0";
  const xpAmt = document.createElement("input");
  xpAmt.id = "adminGrantXp";
  xpAmt.placeholder = "XP (+/-)";
  xpAmt.style.width = "140px";
  xpAmt.value = String(adminToolsEl.dataset.adminGrantXp || "100");
  xpAmt.addEventListener("input", () => {
    adminToolsEl.dataset.adminGrantXp = String(xpAmt.value || "");
  });

  const btnGiveXp = document.createElement("button");
  btnGiveXp.textContent = "Apply XP";
  btnGiveXp.addEventListener("click", () => {
    try {
      const n = parseInt(String(xpAmt.value || "0"), 10);
      const delta = Number.isFinite(n) ? n : 0;
      if (delta === 0) return;

      loaded.level = Math.max(1, Math.floor(loaded.level || 1));
      if (typeof loaded.xp !== "number" || !Number.isFinite(loaded.xp)) loaded.xp = 0;
      loaded.xp = Math.floor(loaded.xp);
      loaded.skills = loaded.skills || {};
      loaded.skills.learned = loaded.skills.learned || {};

      const xpNeed = (lvl) => (typeof xpToNext === "function") ? xpToNext(lvl) : (Math.max(1, Math.floor(lvl || 1)) * 100);
      if (delta > 0) {
        loaded.xp += delta;
        while (loaded.xp >= xpNeed(loaded.level)) {
          loaded.xp -= xpNeed(loaded.level);
          loaded.level = Math.max(1, Math.floor((loaded.level || 1) + 1));
          loaded.skillPoints = (loaded.skillPoints || 0) + 10;
          loaded.maxHp = Math.max(1, Math.floor((loaded.maxHp || 1) + 6));
          loaded.hp = Math.min(maxHpForState(loaded), Math.floor((loaded.hp || 0) + 6));
          loaded.mana = Math.min(maxManaForState(loaded), Math.floor((loaded.mana || 0) + 4));
          queueLevelUpDraftLevel(loaded, loaded.level);
        }
      } else {
        let d = delta;
        while (d < 0) {
          if (loaded.xp + d >= 0) {
            loaded.xp = Math.max(0, Math.floor(loaded.xp + d));
            d = 0;
            break;
          }
          if (loaded.level <= 1) {
            loaded.level = 1;
            loaded.xp = 0;
            d = 0;
            break;
          }
          d += loaded.xp;
          loaded.level = Math.max(1, Math.floor((loaded.level || 1) - 1));
          loaded.skillPoints = Math.max(0, Math.floor((loaded.skillPoints || 0) - 10));
          loaded.maxHp = Math.max(1, Math.floor((loaded.maxHp || 1) - 6));
          loaded.xp = Math.max(0, xpNeed(loaded.level) - 1);
        }
      }
      if (typeof clampResourcesForState === "function") clampResourcesForState(loaded);

      loaded.updatedAt = nowIso();
      const saved = safeSave(adminEditingProfile, loaded);
      if (!saved) {
        setHomeMsg(`Failed to save XP change for ${adminEditingProfile}.`);
        return;
      }
      if (state && state.profile === adminEditingProfile) {
        state.level = loaded.level;
        state.xp = loaded.xp;
        state.skillPoints = loaded.skillPoints;
        state.maxHp = loaded.maxHp;
        state.hp = loaded.hp;
        state.maxMana = loaded.maxMana;
        state.mana = loaded.mana;
        if (typeof normalizeState === "function") normalizeState(state);
      }
      renderHomeSaves();
      renderAdminTools();
      const amt = Math.abs(delta);
      setHomeMsg(`${delta > 0 ? "Gave" : "Took"} ${amt} XP ${delta > 0 ? "to" : "from"} ${adminEditingProfile}.`);
    } catch (e) {
      try { console.error(e); } catch (_) {}
      setHomeMsg(`XP change failed for ${adminEditingProfile}. See console.`);
    }
  });

  xpRow.appendChild(xpAmt);
  xpRow.appendChild(btnGiveXp);
  xpWrap.appendChild(xpRow);

  const btnSaveUser = document.createElement("button");
  btnSaveUser.textContent = "Save Changes";
  btnSaveUser.addEventListener("click", () => {
    const toInt = (x) => {
      const n = parseInt(String(x), 10);
      return Number.isFinite(n) ? n : 0;
    };
    loaded.level = Math.max(1, toInt(lvl.input.value));
    loaded.gold = Math.max(0, toInt(gold.input.value));
    loaded.maxHp = Math.max(1, toInt(maxHp.input.value));
    loaded.maxMana = Math.max(0, toInt(maxMana.input.value));
    loaded.skillPoints = Math.max(0, toInt(sp.input.value));
    loaded.stats = loaded.stats || { strength: 0, cunning: 0, arcana: 0, resilience: 0 };
    loaded.stats.strength = Math.max(0, toInt(str.input.value));
    loaded.stats.cunning = Math.max(0, toInt(cun.input.value));
    loaded.stats.arcana = Math.max(0, toInt(arc.input.value));
    loaded.stats.resilience = Math.max(0, toInt(res.input.value));
    loaded.hp = Math.min(loaded.maxHp, Math.max(0, loaded.hp || loaded.maxHp));
    loaded.mana = Math.min(loaded.maxMana, Math.max(0, loaded.mana || loaded.maxMana));

    loaded.flags = loaded.flags || {};
    loaded.flags.heardRumors = !!heardCb.checked;
    if (isAdminProfile(adminEditingProfile)) {
      if (typeof godCb?.checked === "boolean") loaded.flags.adminGodMode = !!godCb.checked;
    }
    const selA = allegSel.value;
    if (!selA || selA === "None") {
      delete loaded.flags.allegiance;
    } else {
      loaded.flags.allegiance = selA;
    }

    loaded.updatedAt = nowIso();
    safeSave(adminEditingProfile, loaded);
    renderHomeSaves();
    setHomeMsg(`Saved changes for ${adminEditingProfile}.`);
  });

  const btnDeleteUser = document.createElement("button");
  btnDeleteUser.className = "danger";
  btnDeleteUser.textContent = "Delete User";
  btnDeleteUser.disabled = isAdminProfile(adminEditingProfile);
  btnDeleteUser.addEventListener("click", () => {
    safeDelete(adminEditingProfile);
    adminEditingProfile = null;
    renderHomeSaves();
    renderAdminTools();
    setHomeMsg("User deleted.");
  });

  right.appendChild(btnSaveUser);
  right.appendChild(btnDeleteUser);

  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export JSON";
  exportBtn.addEventListener("click", () => {
    downloadJson(`${adminEditingProfile}.json`, loaded);
  });

  right.appendChild(exportBtn);

  form.appendChild(left);
  form.appendChild(right);

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "10px";
  container.appendChild(form);
  container.appendChild(flagsWrap);
  container.appendChild(fields);
  container.appendChild(xpWrap);
  container.appendChild(invWrap);
  container.appendChild(skillWrap);
  adminToolsEl.appendChild(container);
  scheduleRestoreFocus();
}
