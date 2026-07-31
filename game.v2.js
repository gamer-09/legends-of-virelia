/* VIRELIA V2 - Full RPG Overhaul - Text Only + Consequences
   Tone: Mix - Dark Gritty + Heroic + Weird Mystery
   Systems: Consequence Engine, World State, Mix Skills, Free Roam Map, Twists, Living NPCs
*/

console.log('[VIRELIA V2] Loading overhaul...');

const VIRELIA_LORE = {
  twistTable: [
    'The client lied. The target protects innocents.',
    'Treasure is cursed - wilds spread +1 if taken.',
    'Rival faction offers double gold to betray mid-mission.',
    'Monster was once human - mentor recognizes them.',
    'Rain reveals hidden door under evidence.',
    'Party member has history with target.',
    'Success brings guilt - wronged NPC appears later.',
    'Reward is debt marker that will be called in.',
    'Location already burning - someone beat you.',
    'You find a letter in YOUR name, dated 2 years ago.'
  ]
};

const ConsequenceEngine = {
  log: [],
  logConsequence(flag, text, severity) {
    if (!state) return;
    severity = severity || 'info';
    state.flags = state.flags || {};
    state.flags['consequence:' + flag] = true;
    state.flags.consequenceLog = state.flags.consequenceLog || [];
    state.flags.consequenceLog.push({ flag: flag, text: text, severity: severity, day: (state.world && state.world.day) || 1, ts: Date.now() });
    if (state.flags.consequenceLog.length > 200) state.flags.consequenceLog = state.flags.consequenceLog.slice(-200);
    this.log.push(text);
    appendLog('[CONSEQUENCE] ' + text);
    if (severity === 'major') appendLog('The city will remember this.');
  },
  worldState(s) {
    if (!s) return null;
    s.flags = s.flags || {};
    s.flags.worldState = s.flags.worldState || {
      sunVault: 70,
      guildPower: 50,
      crownPower: 50,
      rebelPower: 30,
      wildsSpread: 20,
      plague: 0,
      economy: 50,
      watchHeat: 0,
      doppelgangerRumor: false
    };
    return s.flags.worldState;
  },
  applyConsequence(s, type, value) {
    if (!s) return;
    value = value || 1;
    const ws = this.worldState(s);
    if (!ws) return;
    if (type === 'betray_guild') {
      ws.guildPower = Math.max(0, ws.guildPower - 5 * value);
      ws.rebelPower = Math.min(100, ws.rebelPower + 3 * value);
      ws.economy = Math.max(10, ws.economy - 2 * value);
      this.logConsequence('betray_guild_' + Date.now(), 'Guild loses power. Merchants raise prices.', 'major');
    } else if (type === 'aid_crown') {
      ws.crownPower = Math.min(100, ws.crownPower + 4 * value);
      ws.watchHeat = Math.min(100, ws.watchHeat + 2 * value);
    } else if (type === 'wilds_deal') {
      ws.wildsSpread = Math.min(100, ws.wildsSpread + 6 * value);
      ws.sunVault = Math.max(0, ws.sunVault - 3 * value);
      ws.plague = Math.min(100, ws.plague + 2 * value);
      this.logConsequence('wilds_deal_' + Date.now(), 'Wilds spread. Torches burn shorter.', 'major');
    } else if (type === 'seal_vault') {
      ws.sunVault = Math.min(100, ws.sunVault + 8 * value);
      ws.wildsSpread = Math.max(0, ws.wildsSpread - 5 * value);
      ws.economy = Math.min(100, ws.economy + 3 * value);
    } else if (type === 'kill_innocent') {
      ws.watchHeat = Math.min(100, ws.watchHeat + 8 * value);
      this.logConsequence('kill_innocent_' + Date.now(), 'Innocent blood. Guards watch closer.', 'major');
    } else if (type === 'show_mercy') {
      ws.rebelPower = Math.min(100, ws.rebelPower + 2 * value);
    } else if (type === 'steal') {
      ws.economy = Math.max(5, ws.economy - 1 * value);
      ws.watchHeat = Math.min(100, ws.watchHeat + 3 * value);
    }
    this.updateShopModifiers(s);
  },
  updateShopModifiers(s) {
    const ws = this.worldState(s);
    s.flags.shopPriceMod = 1 + (50 - ws.economy) * 0.016;
    s.flags.ambushMod = ws.watchHeat / 100;
  },
  pickTwist() {
    const list = VIRELIA_LORE.twistTable;
    return list[Math.floor(Math.random() * list.length)];
  }
};

const _origAdjustReputation = typeof adjustReputation === 'function' ? adjustReputation : null;
function adjustReputationV2(faction, delta) {
  if (_origAdjustReputation) {
    _origAdjustReputation(faction, delta);
  } else if (state) {
    state.reputation = state.reputation || {};
    state.reputation[faction] = (state.reputation[faction] || 0) + delta;
  }
  if (delta < 0) {
    ConsequenceEngine.logConsequence('rep_' + faction + '_down_' + Date.now(), faction + ' reputation fell (' + delta + ').', 'info');
  }
  if (state) {
    const ws = ConsequenceEngine.worldState(state);
    if (!ws) return;
    if (faction === 'Guild') ws.guildPower = Math.max(0, Math.min(100, ws.guildPower + delta * 2));
    if (faction === 'Crown') ws.crownPower = Math.max(0, Math.min(100, ws.crownPower + delta * 2));
    if (faction === 'Rebels') ws.rebelPower = Math.max(0, Math.min(100, ws.rebelPower + delta * 2));
    if (faction === 'Wilds') ws.wildsSpread = Math.max(0, Math.min(100, ws.wildsSpread + delta * 1.5));
  }
}
try { adjustReputation = adjustReputationV2; } catch (e) {}
if (typeof window !== 'undefined') window.adjustReputation = adjustReputationV2;

/* 2. MIX SKILLS */
const MIX_SKILLS = [
  {
    key: 'mix_shadowsteel_dance',
    label: 'Shadowsteel Dance',
    desc: 'Hybrid Fighter+Rogue. Requires Str5 Cun5 Lv6. Hit 2 enemies, bleed chance. Consequence: leaves exposed.',
    req: { stats: { strength:5, cunning:5 }, level:6 },
    tier: 3, focus: 'strength', powerful: true, mixOf: ['fighter','rogue']
  },
  {
    key: 'mix_arcane_warden',
    label: 'Arcane Warden',
    desc: 'Hybrid Fighter+Mage. Str4 Arc5 Lv7. Blade of light shields party. Costs 6 mana. If sunVault<50 may curse.',
    req: { stats: { strength:4, arcana:5 }, level:7 },
    tier: 4, focus: 'arcana', powerful: true, mixOf: ['fighter','mage']
  },
  {
    key: 'mix_plague_doctor',
    label: 'Plague Doctor Mercy',
    desc: 'Hybrid Cleric+Rogue. Res4 Cun4 Lv6. Heal + cure poison/curse for 2 allies. Risk infection if plague>30.',
    req: { stats: { resilience:4, cunning:4 }, level:6 },
    tier: 3, focus: 'resilience', powerful: true, mixOf: ['cleric','rogue']
  },
  {
    key: 'mix_soul_weaver',
    label: 'Soul Weaver',
    desc: 'Hybrid Mage+Cleric. Arc6 Res4 Lv8. Revive ally at 30% without feather. Max HP -10% until rested.',
    req: { stats: { arcana:6, resilience:4 }, level:8 },
    tier: 4, focus: 'arcana', powerful: true, mixOf: ['mage','cleric']
  },
  {
    key: 'mix_wild_hunt',
    label: 'Wild Hunt Calling',
    desc: 'Hybrid Ranger+Wilds. Cun5 Res5 Wilds rep>=5 Lv7. Summon spirits +escape +dmg but wilds+1. May attack if you wronged Wilds.',
    req: { stats: { cunning:5, resilience:5 }, factions: { Wilds:5 }, level:7 },
    tier: 4, focus: 'cunning', powerful: true, mixOf: ['ranger','wilds']
  },
  {
    key: 'mix_oathbreaker',
    label: 'Oathbreaker Judgment',
    desc: 'Fighter+Crown. Massive execute. Consequence: Crown-2 Rebels+1 guilt flag.',
    req: { stats: { strength:6 }, level:9 },
    tier: 5, focus: 'strength', powerful: true, mixOf: ['fighter','crown']
  },
  {
    key: 'mix_gutter_saint',
    label: 'Gutter Saint Coin',
    desc: 'Any+Rebel. If gave to beggars 3 times, unlock. Steal 15g from rich enemy. Consequence Guild-1 watchHeat+3.',
    req: { level:5, consequenceFlags: ['gave_to_beggars_3'] },
    tier: 2, focus: 'cunning', powerful: false, mixOf: ['rebel']
  },
  {
    key: 'mix_void_sight',
    label: 'Void Sight',
    desc: 'Weird skill. Triggered if stared into Vault. See hidden intents. Costs 4 mana 2 HP. May trigger doppelganger rumor.',
    req: { level:6, consequenceFlags: ['looked_into_vault'] },
    tier: 3, focus: 'arcana', powerful: true
  }
];

function meetsMixSkillReq(s, def) {
  if (!s) return false;
  if (def.req.level && (s.level || 1) < def.req.level) return false;
  if (def.req.stats) {
    for (const k in def.req.stats) {
      if ((s.stats && s.stats[k] || 0) < def.req.stats[k]) return false;
    }
  }
  if (def.req.factions) {
    for (const f in def.req.factions) {
      if ((s.reputation && s.reputation[f] || 0) < def.req.factions[f]) return false;
    }
  }
  if (def.req.consequenceFlags) {
    for (let i=0; i<def.req.consequenceFlags.length; i++) {
      const flag = def.req.consequenceFlags[i];
      if (!s.flags) return false;
      if (!s.flags['consequence:' + flag] && !s.flags[flag]) return false;
    }
  }
  if (def.mixOf && def.mixOf.length) {
    const prof = s.character && s.character.profession;
    for (let i=0; i<def.mixOf.length; i++) {
      const needProf = def.mixOf[i];
      if (needProf === prof) continue;
      if (['fighter','rogue','mage','cleric','ranger'].indexOf(needProf) >=0) {
        let count = 0;
        const learned = s.skills && s.skills.learned || {};
        for (const k in learned) {
          if (k.indexOf('_' + needProf + '_') >=0) count++;
        }
        if (count < 2) return false;
      }
    }
  }
  return true;
}

function availableMixSkills(s) {
  const out = [];
  for (let i=0; i<MIX_SKILLS.length; i++) {
    const def = MIX_SKILLS[i];
    if (s.skills && s.skills.learned && s.skills.learned[def.key]) continue;
    if (meetsMixSkillReq(s, def)) out.push(def);
  }
  return out;
}

function injectMixSkillsIntoCatalog() {
  for (let i=0; i<MIX_SKILLS.length; i++) {
    const def = MIX_SKILLS[i];
    if (!ITEM_CATALOG[def.key]) {
      ITEM_CATALOG[def.key] = { label: def.label, consumable: false, desc: def.desc + ' [MIX SKILL]' };
    }
  }
}
injectMixSkillsIntoCatalog();

const _origSkillDef = typeof skillDef === 'function' ? skillDef : null;
function skillDefV2(key) {
  for (let i=0; i<MIX_SKILLS.length; i++) {
    if (MIX_SKILLS[i].key === key) {
      const m = MIX_SKILLS[i];
      return { key: m.key, label: m.label, desc: m.desc, profession: 'mix', build: 'hybrid', focus: m.focus, tier: m.tier, powerful: !!m.powerful, isMix: true };
    }
  }
  if (_origSkillDef) return _origSkillDef(key);
  return { key: key, label: key, desc: '', profession: 'unknown', build: 'unknown', focus: 'balanced', tier:1 };
}
try { skillDef = skillDefV2; } catch (e) {}
if (typeof window !== 'undefined') window.skillDef = skillDefV2;

/* 3. EXPANDED ITEMS */
const V2_ITEMS = {
  crown_of_thorns: { label: 'Crown of Thorns', consumable:false, desc: 'Whispers promises. +5 all stats but sunVault -1 per day. wilds +2 while equipped.' },
  debt_marker_guild: { label: 'Guild Debt Marker', consumable:false, desc: 'Got 100g. Guild WILL collect later. Consequence major.' },
  letter_to_self: { label: 'Letter To Yourself', consumable:false, desc: 'Your handwriting dated 2 years ago: Dont trust lantern shop. Doppelganger rumor.' },
  hollow_child_doll: { label: 'Hollow Child Doll', consumable:false, desc: 'Child gave it. Sell = Wilds -5. Keep = whispers restore 1 mana but plague+1.' },
  sun_vault_shard: { label: 'Sun Vault Shard', consumable:false, desc: 'Fragment light. Seal breach sunVault+5 wilds-5 OR sell 150g but wilds+3.' },
  rebels_blood_oath: { label: 'Rebels Blood Oath', consumable:false, desc: 'Sign blood Crown-2 Rebels+3 unlocks Oathbreaker if betray.' },
  beggars_bowl: { label: 'Beggars Bowl', consumable:false, desc: 'Tracks gives. After 3 unlocks Gutter Saint. Party heals +2 on rest.' },
  wilds_mushroom: { label: 'Wilds Mushroom', consumable:true, desc: 'Heal 12 HP restore 6 mana 20% poison wilds+1. Forest remembers.' },
  doppel_smoke: { label: 'Doppel Smoke', consumable:true, desc: 'Clone +50% escape. Rumor copy robbing stall +watchHeat.' }
};
for (const k in V2_ITEMS) {
  if (!ITEM_CATALOG[k]) ITEM_CATALOG[k] = V2_ITEMS[k];
}

/* 4. NPCS */
const V2_NPCS = {
  mara_crossroads: { name: 'Elder Mara', role: 'Crossroads keeper', desc: 'Remembers every time you left someone behind.' },
  korg_blacksmith: { name: 'Korg', role: 'Blacksmith', desc: 'Charges less if bring ore, more if stole from Guild.' },
  lys_alchemist: { name: 'Lys', role: 'Alchemist', desc: 'Refuses if poisoned innocents.' },
  vael_enchanter: { name: 'Vael', role: 'Enchanter', desc: 'Vault lore if looked into vault.' },
  jun_tavern: { name: 'Jun', role: 'Tavernkeep', desc: 'Recruit costs depend affinity.' },
  child_ruins: { name: 'Hollow Child', role: 'Mystery', desc: 'Gives doll. Vanishes if wilds>50.' }
};
function npcAttitude(npcId) {
  if (!state) return 0;
  state.flags = state.flags || {};
  state.flags.npcAttitudes = state.flags.npcAttitudes || {};
  return state.flags.npcAttitudes[npcId] || 0;
}
function adjustNpc(npcId, delta, memoryText) {
  if (!state) return;
  state.flags = state.flags || {};
  state.flags.npcAttitudes = state.flags.npcAttitudes || {};
  state.flags.npcAttitudes[npcId] = (state.flags.npcAttitudes[npcId] || 0) + delta;
  if (memoryText) {
    state.flags.npcMemories = state.flags.npcMemories || {};
    state.flags.npcMemories[npcId] = state.flags.npcMemories[npcId] || [];
    state.flags.npcMemories[npcId].push({ text: memoryText, day: (state.world && state.world.day) || 1 });
  }
}

/* 5. MISSIONS WITH TWISTS */
const V2_MISSION_TEMPLATES = [
  { hook: 'Vault light flickers. Curator offers gold.', twist: function(){ return ConsequenceEngine.pickTwist(); } },
  { hook: 'Ledger shows payments to disappear people.', twist: function(){ return 'Ledger is fake planted by Rebels to frame Guild'; } },
  { hook: 'Child in ruins holds doll.', twist: function(){ return 'Doll whispers your name. Keep = whispers. Sell = Wilds-5'; } }
];

function genMissionsV2(count, seed) {
  seed = seed || 0;
  let base = [];
  try {
    if (typeof genMissions === 'function' && genMissions !== genMissionsV2) {
      // avoid recursion
      base = [];
    }
  } catch(e) {}
  // Generate fresh if base empty - use old logic simplified
  if (base.length === 0) {
    for (let i=0; i<count; i++) {
      const diffs = ['easy','normal','hard','elite','legendary'];
      const diff = diffs[Math.min(4, Math.floor(i/120))];
      const factions = ['Guild','Rebels','Crown','Wilds'];
      base.push({
        id: 'm' + (i+1),
        kind: 'mission',
        title: '#' + (i+1) + ' ' + V2_MISSION_TEMPLATES[i % V2_MISSION_TEMPLATES.length].hook,
        difficulty: diff,
        recLevel: 1 + Math.floor(i/10),
        faction: factions[i % 4],
        xp: 30 + i,
        gold: 10 + Math.floor(i/2)
      });
    }
  }
  const missions = [];
  for (let i=0; i<count; i++) {
    const orig = base[i] || { id:'m'+(i+1), kind:'mission', title:'Mission '+(i+1), difficulty:'normal', recLevel:1, faction:'Guild', xp:30, gold:10 };
    const hasTwist = Math.random() < 0.35;
    missions.push({
      id: orig.id,
      kind: orig.kind,
      title: orig.title,
      difficulty: orig.difficulty,
      recLevel: orig.recLevel,
      faction: orig.faction,
      xp: orig.xp,
      gold: orig.gold,
      v2: true,
      hook: V2_MISSION_TEMPLATES[i % V2_MISSION_TEMPLATES.length].hook,
      twist: hasTwist ? V2_MISSION_TEMPLATES[i % V2_MISSION_TEMPLATES.length].twist() : null
    });
  }
  return missions;
}

function genSideQuestsV2(count, seed) {
  seed = seed || 0;
  const quests = [];
  for (let i=0; i<count; i++) {
    const hasMoral = Math.random() < 0.45;
    quests.push({
      id: 's' + (i+1),
      kind: 'side',
      title: 'Side ' + (i+1) + ' Whispers ' + (i%10),
      minLevel: 1 + Math.floor(i/15),
      faction: ['Guild','Rebels','Crown','Wilds'][i%4],
      place: ['Market','Gate','Marsh','Ruins'][i%4],
      xp: 18 + Math.floor(i*1.7),
      gold: 6 + Math.floor(i*0.6),
      v2: true,
      moralChoice: hasMoral
    });
  }
  return quests;
}

let _origGenMissionsRef = null;
let _origGenSideRef = null;
try {
  // Save originals if not yet saved
  if (typeof window !== 'undefined') {
    if (window._v2OrigGenMissions) _origGenMissionsRef = window._v2OrigGenMissions;
  }
} catch(e){}
try {
  _origGenMissionsRef = genMissions;
  _origGenSideRef = genSideQuests;
  genMissions = function(count, seed) { return genMissionsV2(count, seed); };
  genSideQuests = function(count, seed) { return genSideQuestsV2(count, seed); };
  if (typeof window !== 'undefined') {
    window.genMissions = genMissions;
    window.genSideQuests = genSideQuests;
    window._v2OrigGenMissions = _origGenMissionsRef;
    window._v2OrigGenSide = _origGenSideRef;
  }
} catch(e) { console.warn('override failed', e); }

/* 6. FREE ROAM MAP */
const V2_AREAS = {
  streets: { label:'Low Streets', danger:1, minLevel:1, cost:{}, connects:['docks','market','gate','ruins'], desc:'Crowded, watchful. Rumors. Level 1+' },
  docks: { label:'Dock Warrens', danger:2, minLevel:15, cost:{ waterskin:1 }, connects:['streets','marsh','market'], desc:'Salt, knives. Level 15+ recommended.' },
  market: { label:'High Market', danger:0, minLevel:1, cost:{}, connects:['streets','docks','gate','crossroads'], desc:'Safe-ish. Korg forge. Level 1+' },
  gate: { label:'Virelia Gate', danger:1, minLevel:10, cost:{ waterskin:1 }, connects:['streets','road','market'], desc:'Leaving costs water. Level 10+ recommended.' },
  road: { label:'Open Road', danger:2, minLevel:40, cost:{ ration:1, waterskin:1 }, connects:['gate','ruins','marsh'], desc:'Ambush chance. Level 40+ recommended.' },
  ruins: { label:'Old Ruins', danger:3, minLevel:80, cost:{ torch:1, ration:1 }, connects:['road','streets','vault'], desc:'Needs torch else -20% accuracy. Hollow child. Level 80+ (Hard).' },
  marsh: { label:'Fog Marsh', danger:3, minLevel:120, cost:{ ration:1, waterskin:1 }, connects:['road','docks','wilds'], desc:'High wilds. Level 120+ (Hard+).' },
  vault: { label:'Sun Vault Approach', danger:4, minLevel:250, cost:{ torch:1, waterskin:1 }, connects:['ruins'], desc:'Shard may be found. Level 250+ (Elite).' },
  wilds: { label:'Deep Wilds', danger:5, minLevel:400, cost:{ ration:2, waterskin:2, torch:1 }, connects:['marsh'], desc:'Most dangerous. Level 400+ (Legendary). Wilds+1 if camp no ritual.' },
  crossroads: { label:'Crossroads', danger:0, minLevel:1, cost:{}, connects:['market','streets','road'], desc:'Hub. Level 1+' }
};

function ensureV2Roam(s) {
  if (!s) return null;
  s.roam = s.roam || {};
  if (!s.roam.v2) s.roam.v2 = { current:'crossroads', visited:{}, risk:0, steps:0 };
  return s.roam.v2;
}


function maybeApplyDebuffFromSituation(s, situation) {
  if (!s || typeof addEffect !== 'function') return;
  if (isAdminProfile && isAdminProfile(s.profile)) return; // admin immune
  const roll = Math.random();
  // Each situation has chance to apply specific debuffs
  if (situation === "ruins_no_torch") {
    if (roll < 0.35) { addEffect("frostbitten", 18000); appendLog("❄️ Cold bites without torch - Frostbitten! Seek warmth or Healer."); }
    if (Math.random() < 0.25) { addEffect("fear", 15000); appendLog("😱 Darkness whispers - Fear! Healer or torchlight cures."); }
    if (Math.random() < 0.15) { addEffect("dazed", 12000); appendLog("💫 You stumble in dark - Dazed!"); }
  } else if (situation === "marsh_forage_fail") {
    if (roll < 0.40) { addEffect("entangled", 15000); appendLog("🌿 Marsh vines entangle - Entangled! -10% cunning. Use torch or Healer."); }
    if (Math.random() < 0.20) { addEffect("frostbitten", 12000); }
  } else if (situation === "wilds_explore") {
    if (roll < 0.30) { addEffect("entangled", 12000); appendLog("🌲 Wilds roots grab - Entangled!"); }
    if (Math.random() < 0.20) { addEffect("fear", 12000); appendLog("😱 Wilds howl - Fear!"); }
    if (Math.random() < 0.15) { addEffect("frostbitten", 10000); }
  } else if (situation === "vault_explore") {
    if (roll < 0.30) { addEffect("scorched", 15000); appendLog("🔥 Vault heat scalds - Scorched! -7% resilience. Waterskin or Healer cures."); }
    if (Math.random() < 0.20) { addEffect("drained", 15000); appendLog("💧 Vault drains your mana - Drained! Waterskin or rest cures."); }
    if (Math.random() < 0.20) { addEffect("fear", 12000); }
  } else if (situation === "heavy_damage") {
    if (roll < 0.35) { addEffect("brittle", 18000); appendLog("💔 Heavy blow - Brittle! Armor weakened, +damage taken. Ironbark or Healer cures."); }
    if (Math.random() < 0.25) { addEffect("dazed", 12000); }
    if (Math.random() < 0.20) { addEffect("weak", 15000); }
  } else if (situation === "titanblood_end") {
    if (roll < 0.60) { addEffect("weak", 20000); appendLog("💪 Titanblood crashes - Weak! -12% strength. Ration or Healer cures."); }
  } else if (situation === "sunfire_overuse") {
    if (roll < 0.40) { addEffect("scorched", 15000); appendLog("☀️ Sunfire burns too hot - Scorched!"); }
  } else if (situation === "low_mana") {
    if (roll < 0.40) { addEffect("drained", 15000); appendLog("🌀 Mana exhausted - Drained! -12% arcana. Waterskin or rest."); }
  } else if (situation === "bleeding_long") {
    if (roll < 0.40) { addEffect("weak", 15000); appendLog("🩸 Long bleeding weakens you - Weak!"); }
  } else if (situation === "cursed_long") {
    if (roll < 0.30) { addEffect("fear", 12000); appendLog("👁️ Curse brings fear..."); }
    if (Math.random() < 0.20) { addEffect("drained", 12000); }
  } else if (situation === "failed_cunning") {
    if (roll < 0.30) { addEffect("dazed", 12000); appendLog("💫 Failed cunning check - Dazed!"); }
  } else if (situation === "failed_strength") {
    if (roll < 0.25) { addEffect("weak", 12000); }
    if (Math.random() < 0.20) { addEffect("brittle", 12000); }
  } else if (situation === "withered") {
    // Withered: permanent, from marsh/wilds long, poisoned long, bad mushroom
    if (roll < 0.5) {
      if (typeof addEffect === 'function') {
        // 30% chance to be permanent directly for withered
        if (Math.random() < 0.3) {
          state.effects = state.effects || {};
          state.effects["withered"] = { key: "withered", permanent: true, appliedAt: Date.now(), isPermanentAdmin: false };
          appendLog("🥀 You feel withered - PERMANENT! Max HP -10% & strength -15%. Need Aether + Healer Soul Restoration 30g + Purification Draught.");
        } else {
          addEffect("withered", 12000);
          appendLog("🥀 Withering starts - withered! Seek cure before permanent.");
        }
      }
    }
  } else if (situation === "hollowed") {
    if (roll < 0.5) {
      if (Math.random() < 0.35) {
        state.effects = state.effects || {};
        state.effects["hollowed"] = { key: "hollowed", permanent: true, appliedAt: Date.now() };
        appendLog("👻 Hollowed - PERMANENT! -14% arcana & whispers. Need Lys burn doll + Healer + Enchanter Blessing.");
      } else {
        addEffect("hollowed", 15000);
      }
    }
  } else if (situation === "branded") {
    if (roll < 0.5) {
      state.effects = state.effects || {};
      state.effects["branded"] = { key: "branded", permanent: true, appliedAt: Date.now() };
      appendLog("🔖 Branded by Crown/Guild - PERMANENT! Need Healer Purify 20g + pay 30g at Market + Crown contact to cure.");
    }
  } else if (situation === "shadowbound") {
    if (roll < 0.45) {
      state.effects = state.effects || {};
      state.effects["shadowbound"] = { key: "shadowbound", permanent: true, appliedAt: Date.now() };
      appendLog("🌑 Shadowbound - PERMANENT! Shadows cling, -12% arcana. Need Torchlight + Sunfire + Healer + Enchanter ritual.");
    }
  } else if (situation === "soulfractured") {
    if (roll < 0.4) {
      state.effects = state.effects || {};
      state.effects["soulfractured"] = { key: "soulfractured", permanent: true, appliedAt: Date.now() };
      appendLog("💔 Soulfractured - PERMANENT! Soul cracked -12% res & arcana. Need Aether + Rested + Healer Soul Restoration + Enchanter.");
    }
  } else if (situation === "rusted") {
    if (roll < 0.4) {
      state.effects = state.effects || {};
      state.effects["rusted"] = { key: "rusted", permanent: true, appliedAt: Date.now() };
      appendLog("🔩 Rusted - PERMANENT! Armor degraded -14% res. Need Blacksmith + oil + Healer Soul Restoration.");
    }
  }
}


function roamActV2(s, kind) {
  if (!s) return;
  normalizeState(s);
  if (typeof isCombatActive === 'function' && isCombatActive(s)) {
    appendLog("You can't rest during combat.");
    return;
  }
  if (typeof hasEffectOnState === 'function' && hasEffectOnState(s, 'rested')) {
    appendLog("You aren't ready to rest again yet. (Rested cooldown active)");
    return;
  }
  const v2 = ensureV2Roam(s);
  const area = V2_AREAS[v2.current] || V2_AREAS.streets;
  if (kind === 'rest') {
    if (v2.current === 'wilds' && !s.flags['ritual_ward']) {
      ConsequenceEngine.applyConsequence(s, 'wilds_deal', 1);
      appendLog('You camp in Deep Wilds without ward. Wilds+1');
    }
    v2.risk = Math.max(0, v2.risk - 25);
    s.hp = Math.min(playerMaxHp(), (s.hp||0) + 3);
    if (s.party && Array.isArray(s.party.members)) {
      for (let i=0; i<s.party.members.length; i++) {
        const m = s.party.members[i];
        if (!m) continue;
        const h = Math.max(1, Math.floor((m.maxHp||1)*0.25));
        m.hp = Math.min(m.maxHp||1, (m.hp||0)+h);
      }
    }
    s.mana = Math.min(playerMaxMana(), (s.mana||0)+2);
    appendLog('Rest in ' + area.label + ' (+3 HP, +2 mana, party +25%). Risk lowered.');
    if (area.label.indexOf('Ruins') >=0 && s.inventory && s.inventory.hollow_child_doll) {
      appendLog('Doll whispers: You left before. +1 mana +1 plague');
      s.mana = Math.min(playerMaxMana(), (s.mana||0)+1);
      ConsequenceEngine.worldState(s).plague++;
    }
    if (typeof addEffect === 'function') addEffect('rested', 30000);
    if (typeof autoSave === 'function') autoSave();
    if (typeof render === 'function') render();
    return;
  }
  if (kind === 'forage') {
    const inv = s.inventory || {};
    if (area.cost.ration && (inv.ration||0) < area.cost.ration) { appendLog('Lack rations'); return; }
    if (area.cost.torch && (inv.torch||0) < 1) {
      appendLog('Needs torch. -20% accuracy risk.');
      if (Math.random()<0.5) { appendLog('Stumble dark HP-4'); applyDamage(4); }
      maybeApplyDebuffFromSituation(s, "ruins_no_torch");
      if (area.key === 'ruins' || area.key === 'vault' || area.key === 'wilds' || area.key === 'marsh') {
        if (Math.random()<0.4) maybeApplyDebuffFromSituation(s, area.key === 'marsh' ? "marsh_forage_fail" : (area.key === 'wilds' ? "wilds_explore" : "vault_explore"));
      }
    } else if (area.key === 'marsh' && Math.random() < 0.25) {
      maybeApplyDebuffFromSituation(s, "marsh_forage_fail");
    } else if (area.key === 'wilds' && Math.random() < 0.3) {
      maybeApplyDebuffFromSituation(s, "wilds_explore");
    } else if (area.key === 'vault' && Math.random() < 0.25) {
      maybeApplyDebuffFromSituation(s, "vault_explore");
    }
    v2.risk = Math.min(100, v2.risk + 10 + area.danger*4);
    if (Math.random() < 0.6) {
      const lootTable = ['herb_sageleaf','herb_nightbloom','rune_shard','wilds_mushroom','sun_vault_shard'];
      const k = lootTable[Math.floor(Math.random()*lootTable.length)];
      if (Math.random()<0.8 || k==='herb_sageleaf') {
        addInvItem(s, k, 1);
        appendLog('Foraged: ' + itemLabel(k) + ' in ' + area.label);
        if (k==='wilds_mushroom') ConsequenceEngine.applyConsequence(s,'wilds_deal',0.5);
      }
    }
    if (Math.random() < (0.08 + area.danger*0.04 + v2.risk*0.002)) {
      appendLog('Encounter!');
      s.world.pendingEvent = createCombatEvent(s, 'ambush');
    }
    return;
  }
  if (kind === 'scout') {
    v2.risk = Math.min(100, v2.risk + 5);
    const rumor = (typeof roamRumor === 'function') ? roamRumor() : 'You hear whispers';
    appendLog('Scout in ' + area.label + ': ' + rumor);
    return;
  }
  v2.risk = Math.min(100, v2.risk + 12 + area.danger*3);
  v2.steps++;
  if (Math.random()<0.25) {
    appendLog('Explore ' + area.label + ': ' + area.desc);
    if (Math.random()<0.3) {
      const conn = area.connects[Math.floor(Math.random()*area.connects.length)];
      if (!v2.visited[conn]) {
        v2.visited[conn]=true;
        appendLog('Discovered path to ' + (V2_AREAS[conn] && V2_AREAS[conn].label || conn));
      }
    }
  }
  if (typeof roamMaybeEncounter === 'function' && roamMaybeEncounter(s, area.label)) return;
  if (Math.random() < 0.2 + area.danger*0.05) {
    const gold = 2+Math.floor(Math.random()*10);
    s.gold += gold;
    appendLog('Found ' + gold + ' gold in ' + area.label);
  }
}
try { roamAct = roamActV2; } catch(e){}
if (typeof window !== 'undefined') window.roamAct = roamActV2;

/* 7. COMBAT TWISTS */
const _origEnemiesAttack = typeof enemiesAttack === 'function' ? enemiesAttack : null;
function enemiesAttackV2(ev) {
  if (_origEnemiesAttack) _origEnemiesAttack(ev);
  if (!ev) return;
  if (Math.random() < 0.18) {
    const twistRoll = Math.random();
    if (twistRoll < 0.33) {
      const low = ev.enemies.filter(function(e){ return e && (e.hp||0)>0 && (e.hp/e.maxHp)<0.25; });
      if (low.length && Math.random()<0.6) {
        const en = low[0];
        pushCombatLog(ev, 'SURRENDER: ' + en.name + ' begs mercy. Capture for consequence!');
        ev.surrender = { enemy: en.key, name: en.name };
      }
    } else if (twistRoll < 0.66) {
      if (Math.random()<0.3 && ev.enemies.length < 5) {
        const mob = mobDef(1+Math.floor(Math.random()*MOB_COUNT));
        mob.hp = Math.floor(mob.maxHp*0.8);
        ev.enemies.push(mob);
        pushCombatLog(ev, 'Reinforcement! ' + mob.name + ' joins, drawn by noise.');
      }
    } else {
      if (state && state.nodeId === 'ruins' && !(state.inventory && state.inventory.torch)) {
        pushCombatLog(ev, 'Darkness: No torch, accuracy -25% this round!');
      }
    }
  }
}
try { enemiesAttack = enemiesAttackV2; } catch(e){}
if (typeof window !== 'undefined') window.enemiesAttack = enemiesAttackV2;

/* 8. STORY NODES */
function injectV2StoryNodes() {
  if (typeof STORY === 'undefined') return;

  // Crossroads extra
  const origCross = STORY.crossroads;
  if (origCross && origCross.text) {
    const origFn = origCross.text;
    if (typeof origFn === 'function') {
      STORY.crossroads.text = function(s) {
        const base = origFn(s);
        const ws = ConsequenceEngine.worldState(s);
        if (!ws) return base;
        const recent = (s.flags.consequenceLog||[]).slice(-2).map(function(c){ return c.text; }).join(' ; ') || 'None yet';
        const extra = '\n\n-- WORLD STATE --\nSunVault: ' + ws.sunVault + '% Guild:' + ws.guildPower + ' Crown:' + ws.crownPower + ' Rebels:' + ws.rebelPower + ' Wilds:' + ws.wildsSpread + '% Watch:' + ws.watchHeat + ' Plague:' + ws.plague + '\nShopMod x' + (s.flags.shopPriceMod||1).toFixed(2) + ' | Recent: ' + recent;
        return base + extra;
      };
    }
  }

  // Free roam map
  STORY.free_roam_select.text = function(s) {
    const v2 = ensureV2Roam(s);
    const cur = V2_AREAS[v2.current];
    let map = 'FREE ROAM MAP\n';
    for (const k in V2_AREAS) {
      const area = V2_AREAS[k];
      const conn = area.connects.join(',');
      const visitedMark = (v2.visited[k] || k===v2.current) ? '[KNOWN]' : '[???]';
      map += visitedMark + ' ' + area.label + ' (danger ' + area.danger + ') -> ' + conn + '\n';
    }
    map += '\nCurrent: ' + cur.label + ' | Risk: ' + v2.risk + '/100 | Steps: ' + v2.steps + '\n' + cur.desc;
    return map;
  };
  STORY.free_roam_select.choices = function(s) {
    const v2 = ensureV2Roam(s);
    const cur = V2_AREAS[v2.current];
    const out = [];
    for (let i=0; i<cur.connects.length; i++) {
      const connKey = cur.connects[i];
      const area = V2_AREAS[connKey];
      if (!area) continue;
      out.push({
        label: 'Travel to ' + area.label + ' (cost: ' + Object.keys(area.cost).map(function(k){ return k+'x'+area.cost[k]; }).join(',') + ' ' + ')',
        next: 'free_roam',
        effect: (function(targetKey, targetArea){
          return function() {
            // Level gate: as hard as level suggests - block low level from high danger area
            const reqLevel = targetArea.minLevel || 1;
            const playerLvl = Math.max(1, Math.floor(s.level || 1));
            if (playerLvl < reqLevel && !(typeof isAdminProfile === 'function' && isAdminProfile(s.profile))) {
              appendLog(`Too dangerous! ${targetArea.label} requires Level ${reqLevel}. You are Level ${playerLvl}. Train, get party, or do lower quests.`);
              // Apply fear debuff for attempting too hard area
              if (typeof addEffect === 'function' && Math.random() < 0.6) {
                addEffect("fear", 12000);
              }
              return;
            }
            const cost = targetArea.cost || {};
            for (const k in cost) {
              if ((s.inventory && s.inventory[k] || 0) < cost[k]) { appendLog('Need: ' + k + 'x' + cost[k]); return; }
            }
            for (const k in cost) { if (cost[k]>0) consumeInvItem(s,k,cost[k]); }
            v2.current = targetKey;
            v2.visited[targetKey]=true;
            appendLog('Traveled to ' + targetArea.label + ` (Level ${reqLevel}+)`);
            const ws = ConsequenceEngine.worldState(s);
            if (ws.watchHeat > 40 && Math.random()<0.2) {
              appendLog('Guards stop you. Pay 5g or lose Crown rep.');
              if ((s.gold||0)>=5) { s.gold-=5; appendLog('-5 gold'); } else { adjustReputation('Crown',-1); }
            }
            if (targetKey==='vault' && !s.flags['consequence:looked_into_vault']) {
              s.flags['consequence:looked_into_vault']=true;
              addInvItem(s,'sun_vault_shard',1);
              ConsequenceEngine.applyConsequence(s,'wilds_deal',1);
              appendLog('Stare into Vault. Gain shard, wilds+1, unlocks Void Sight.');
            }
          };
        })(connKey, area)
      });
    }
    out.push({ label:'Explore Here', next:'free_roam', effect:function(){ roamActV2(s,'explore'); } });
    out.push({ label:'Scout rumors', next:'free_roam', effect:function(){ roamActV2(s,'scout'); } });
    out.push({ label:'Forage loot', next:'free_roam', effect:function(){ roamActV2(s,'forage'); } });
    out.push({ label:'Rest -risk +HP', next:'free_roam', effect:function(){ roamActV2(s,'rest'); } });
    out.push({ label:'Back to Crossroads', className:'secondary', next:'crossroads' });
    return out;
  };

  STORY.free_roam.text = function(s) {
    const v2 = ensureV2Roam(s);
    const area = V2_AREAS[v2.current];
    return 'FREE ROAM: ' + area.label + '\nDanger:' + area.danger + ' Risk:' + v2.risk + '/100 Steps:' + v2.steps + '\n' + area.desc;
  };
  STORY.free_roam.choices = function(s) {
    return [
      { label:'Explore', next:'free_roam', effect:function(){ roamActV2(s,'explore'); } },
      { label:'Forage', next:'free_roam', effect:function(){ roamActV2(s,'forage'); } },
      { label:'Scout', next:'free_roam', effect:function(){ roamActV2(s,'scout'); } },
      { label:'Rest', next:'free_roam', effect:function(){ roamActV2(s,'rest'); } },
      { label:'Change Area (Map)', className:'secondary', next:'free_roam_select' },
      { label:'Return to Crossroads', className:'secondary', next:'crossroads' }
    ];
  };

  STORY.consequence_board = {
    text: function(s) {
      const log = s.flags && s.flags.consequenceLog || [];
      const ws = ConsequenceEngine.worldState(s);
      let t = 'CONSEQUENCE BOARD - City Remembers\n\nWorld: SunVault ' + ws.sunVault + '% Guild ' + ws.guildPower + ' Crown ' + ws.crownPower + ' Rebels ' + ws.rebelPower + ' Wilds ' + ws.wildsSpread + '% Watch ' + ws.watchHeat + ' Plague ' + ws.plague + '\n\nRecent:\n';
      const recent = log.slice(-12);
      if (recent.length===0) t+='(none yet)';
      else {
        for (let i=0;i<recent.length;i++) {
          t+='- [Day ' + recent[i].day + '] ' + recent[i].text + ' [' + recent[i].severity + ']\n';
        }
      }
      t+='\nNPC Attitudes:\n';
      const attitudes = s.flags && s.flags.npcAttitudes || {};
      for (const id in attitudes) {
        t+='- ' + (V2_NPCS[id] && V2_NPCS[id].name || id) + ': ' + attitudes[id] + '\n';
      }
      return t;
    },
    choices: [{ label:'Back to Crossroads', className:'secondary', next:'crossroads' }]
  };

  STORY.mix_skills_board = {
    text: function(s) {
      const avail = availableMixSkills(s);
      let t = 'MIX SKILLS - Hybrid Paths\nYou can blend professions. Learn 2+ skills from other profession to unlock.\n\nAvailable:\n';
      if (avail.length===0) t+='(none - keep learning cross-class!)\n';
      else {
        for (let i=0;i<avail.length;i++) t+='- ' + avail[i].label + ': ' + avail[i].desc + '\n';
      }
      t+='\nLearned:\n';
      const learnedMix = [];
      for (let i=0;i<MIX_SKILLS.length;i++) if (s.skills && s.skills.learned && s.skills.learned[MIX_SKILLS[i].key]) learnedMix.push(MIX_SKILLS[i]);
      if (learnedMix.length===0) t+='(none)';
      else { for (let i=0;i<learnedMix.length;i++) t+='- ' + learnedMix[i].label + '\n'; }
      return t;
    },
    choices: function(s) {
      const avail = availableMixSkills(s);
      const out = [];
      for (let i=0;i<avail.length;i++) {
        const m = avail[i];
        out.push({
          label: 'Learn ' + m.label + ' (cost ' + m.tier + ' SP)',
          next: 'mix_skills_board',
          disabled: (s.skillPoints||0) < m.tier,
          effect: (function(mix){
            return function(){
              if ((s.skillPoints||0) < mix.tier) { appendLog('Not enough SP'); return; }
              s.skillPoints -= mix.tier;
              s.skills.learned[mix.key]=1;
              appendLog('Learned mix skill: ' + mix.label);
              if (mix.key==='mix_oathbreaker') ConsequenceEngine.logConsequence('learned_oathbreaker','Learned Oathbreaker - Crown watches.','major');
            };
          })(m)
        });
      }
      out.push({ label:'Back', className:'secondary', next:'crossroads' });
      return out;
    }
  };

  if (STORY.crossroads && STORY.crossroads.choices) {
    const origChoicesFn = STORY.crossroads.choices;
    STORY.crossroads.choices = function(s) {
      const orig = origChoicesFn(s);
      const extra = [
        { label:'Consequence Board (city remembers)', next:'consequence_board', effect:function(){ appendLog('Check whispers board'); } },
        { label:'Mix Skills - Hybrid Paths', next:'mix_skills_board' }
      ];
      return extra.concat(orig);
    };
  }
}
injectV2StoryNodes();

function initializeV2(s) {
  if (!s) return;
  ConsequenceEngine.worldState(s);
  ensureV2Roam(s);
  s.flags = s.flags || {};
  s.flags.npcAttitudes = s.flags.npcAttitudes || {};
  s.flags.npcMemories = s.flags.npcMemories || {};
  s.flags.consequenceLog = s.flags.consequenceLog || [];
}

const _origNormalize = typeof normalizeState === 'function' ? normalizeState : null;
function normalizeStateV2(s) {
  if (_origNormalize) _origNormalize(s);
  if (!s) return;
  initializeV2(s);
  const day = s.world && s.world.day || 1;
  const lastDay = s.flags.v2LastDay || 0;
  if (day > lastDay) {
    s.flags.v2LastDay = day;
    const ws = ConsequenceEngine.worldState(s);
    if (ws.sunVault < 80 && Math.random()<0.15) {
      ws.sunVault = Math.max(0, ws.sunVault -1);
      ws.wildsSpread = Math.min(100, ws.wildsSpread+1);
    }
    if (ws.plague>20 && Math.random()<0.1) {
      ws.plague = Math.min(100, ws.plague+1);
      if ((s.hp||0)>0) { appendLog('Plague cough -1 HP'); s.hp = Math.max(1, (s.hp||0)-1); }
    }
    if ((s.equipment && s.equipment.accessory1==='crown_of_thorns') || (s.equipment && s.equipment.accessory2==='crown_of_thorns')) {
      ws.sunVault = Math.max(0, ws.sunVault-1);
      appendLog('Crown of Thorns whispers. Sun Vault -1');
    }
  }
}
try { normalizeState = normalizeStateV2; } catch(e){}
if (typeof window !== 'undefined') window.normalizeState = normalizeStateV2;

const _origEnterNode = typeof enterNode === 'function' ? enterNode : null;
function enterNodeV2(id) {
  if (_origEnterNode) {
    if (state && id==='market' && state.flags && state.flags.worldState && state.flags.worldState.watchHeat>60 && Math.random()<0.25) {
      appendLog('Guard checkpoint at market. High watchHeat.');
      if (Math.random()<0.4) {
        if ((state.gold||0)>=8) { state.gold-=8; appendLog('-8 gold bribe'); } else { adjustReputation('Crown',-1); }
      }
    }
    return _origEnterNode(id);
  }
}
try { enterNode = enterNodeV2; } catch(e){}
if (typeof window !== 'undefined') window.enterNode = enterNodeV2;

function v2Sanity() {
  return {
    worldState: state ? ConsequenceEngine.worldState(state) : null,
    consequences: state && state.flags && state.flags.consequenceLog && state.flags.consequenceLog.length || 0,
    mixSkillsAvailable: state ? availableMixSkills(state).length : 0,
    areas: Object.keys(V2_AREAS).length,
    npcs: Object.keys(V2_NPCS).length
  };
}
if (typeof window !== 'undefined') window.v2Sanity = v2Sanity;

console.log('[VIRELIA V2] Loaded. Systems: consequence, worldState, mixSkills, free roam v2, twists, living NPCs');
