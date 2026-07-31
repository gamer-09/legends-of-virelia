const el = (id) => document.getElementById(id);

const profileNameEl = el("profileName");
const btnNew = el("btnNew");
const btnContinue = el("btnContinue");
const btnReset = el("btnReset");
const homeMsg = el("homeMsg");

const homeSavesEl = el("homeSaves");
const btnPurgeNonAdmin = el("btnPurgeNonAdmin");

const adminPassEl = el("adminPass");
const adminToolsEl = el("adminTools");

const userHomeViewEl = el("userHomeView");
const adminHomeViewEl = el("adminHomeView");
const btnAdminLogout = el("btnAdminLogout");
const homeSavesTitleUser = el("homeSavesTitleUser");
const homeSavesTitleAdmin = el("homeSavesTitleAdmin");

const gameMainEl = el("gameMain");
const btnAdminToggleGame = el("btnAdminToggleGame");
const adminNewUserEl = el("adminNewUser");
const btnAdminCreateUser = el("btnAdminCreateUser");

const statsEl = el("stats");
const outputEl = el("output");
const choicesEl = el("choices");
const questListEl = el("questList");
const btnPrevQuest = el("btnPrevQuest");
const btnNextQuest = el("btnNextQuest");
const questPageInfo = el("questPageInfo");

const btnRest = el("btnRest");
const btnStatus = el("btnStatus");
const btnInventory = el("btnInventory");
const btnSkills = el("btnSkills");
const btnParty = el("btnParty");
const btnAchievements = el("btnAchievements");
const btnSave = el("btnSave");

const fxOverlay = el("fxOverlay");
const fxBadges = el("fxBadges");
const appEl = document.querySelector(".app");

const tabMissions = el("tabMissions");
const tabSideQuests = el("tabSideQuests");

let activeTab = "missions";
let state = null;
let questPage = 0;
let marketPage = 0;

function syncSidebarButtons() {
  const s = state;
  if (!s) return;
  normalizeState(s);
  pruneExpiredEffects();
  const inCombat = isCombatActive(s);
  const restCd = hasEffectOnState(s, "rested");
  const inDraft = hasActiveLevelUpDraft(s);

  // Rest now stops all actions: when rested active, block everything except Save/Logout/Settings
  const restBlocking = !!restCd;

  if (btnRest) btnRest.disabled = inCombat || restCd || inDraft;
  if (btnStatus) btnStatus.disabled = inDraft || restBlocking || inCombat;
  if (btnInventory) btnInventory.disabled = inDraft || restBlocking || inCombat;
  if (btnSkills) btnSkills.disabled = inDraft || restBlocking || inCombat;
  if (btnParty) btnParty.disabled = inDraft || restBlocking || inCombat;
  if (btnAchievements) btnAchievements.disabled = inDraft || restBlocking || inCombat;
  if (btnSave) btnSave.disabled = inDraft; // save always allowed even during rest
  const btnDesignEl = document.getElementById('btnDesign');
  if (btnDesignEl) btnDesignEl.disabled = false; // settings always allowed
  const btnLogoutEl = document.getElementById('btnLogout');
  if (btnLogoutEl) btnLogoutEl.disabled = inDraft; // allow logout even during rest? keep enabled unless draft
  // Also disable quest board interactions via visual cue - handled in renderQuestList via check
}

const LOG_MAX = 600;
const MISSION_COUNT = 600;
const SIDE_QUEST_COUNT = 600;
const QUESTS_PER_PAGE = 6;

const MOB_COUNT = 300;

const PROFESSIONS = [
  {
    key: "fighter",
    label: "Fighter",
    desc: "Weapons and armor. Reliable in direct conflict.",
    bonuses: { strength: 2, resilience: 1 },
    hpBonus: 8,
    manaBonus: 0,
    goldBonus: 5,
    items: { iron_sword: 1, chainmail: 1, bandage: 2, ration: 2, torch: 1, waterskin: 1 },
  },
  {
    key: "rogue",
    label: "Rogue",
    desc: "Stealth, speed, and precision.",
    bonuses: { cunning: 2, strength: 1 },
    hpBonus: 2,
    manaBonus: 0,
    goldBonus: 15,
    items: { dagger: 1, cloak: 1, lockpick: 2, smoke_bomb: 1, bandage: 1, ration: 1, torch: 1, waterskin: 1 },
  },
  {
    key: "mage",
    label: "Mage",
    desc: "Arcane knowledge and dangerous rituals.",
    bonuses: { arcana: 2, cunning: 1 },
    hpBonus: 0,
    manaBonus: 10,
    goldBonus: 0,
    items: { staff: 1, tonic: 1, mana_potion: 1, bandage: 1, torch: 1, waterskin: 1 },
  },
  {
    key: "cleric",
    label: "Cleric",
    desc: "Blessings, wards, and survival.",
    bonuses: { resilience: 2, arcana: 1 },
    hpBonus: 6,
    manaBonus: 4,
    goldBonus: 0,
    items: { staff: 1, bandage: 3, health_potion: 1, amulet_of_vigor: 1, torch: 1, waterskin: 1 },
  },
  {
    key: "ranger",
    label: "Ranger",
    desc: "Tracks routes, reads signs, survives the wild edges.",
    bonuses: { cunning: 2, resilience: 1 },
    hpBonus: 4,
    manaBonus: 0,
    goldBonus: 5,
    items: { longbow: 1, dagger: 1, leather_armor: 1, bandage: 1, ration: 2, torch: 1, waterskin: 1 },
  },
];

const ITEM_CATALOG = {
  bandage: { label: "Bandage", consumable: true, desc: "Clean wraps and herbs. Restores HP and can stop bleeding." },
  tonic: { label: "Mana Tonic", consumable: true, desc: "Bitter blue liquid that sharpens focus. Restores mana." },
  health_potion: { label: "Health Potion", consumable: true, desc: "A red draught that quickly mends wounds." },
  mana_potion: { label: "Mana Potion", consumable: true, desc: "A violet draught that replenishes arcane reserves." },
  phoenix_feather: { label: "Phoenix Feather", consumable: true, desc: "A legendary feather that reignites a fading spark. Revives a fallen companion and fully restores their HP and mana." },
  stamina_draught: { label: "Stamina Draught", consumable: true, desc: "A harsh brew that pushes your body past fatigue." },
  antidote: { label: "Antidote", consumable: true, desc: "Neutralizes common poisons and venoms." },
  elixir: { label: "Elixir", consumable: true, desc: "Rare mixture said to restore both body and mind." },
  smoke_bomb: { label: "Smoke Bomb", consumable: true, desc: "A palm-sized bomb that floods the area with smoke." },
  lockpick: { label: "Lockpick", consumable: true, desc: "Thin steel tools for difficult locks. They can bend or snap." },
  torch: { label: "Torch", consumable: true, desc: "A simple torch that burns down over time." },
  ration: { label: "Rations", consumable: true, desc: "Dried food for travel. Keeps you moving." },
  waterskin: { label: "Waterskin", consumable: true, desc: "Water for long roads. A necessity in the Wilds." },

  dagger: { label: "Dagger", consumable: false, desc: "A quick blade for close work." },
  short_sword: { label: "Short Sword", consumable: false, desc: "A reliable sword favored by guards and travelers." },
  iron_sword: { label: "Iron Sword", consumable: false, desc: "A sturdy iron blade." },
  steel_sword: { label: "Steel Sword", consumable: false, desc: "A well-balanced steel sword." },
  longbow: { label: "Longbow", consumable: false, desc: "A tall bow with long reach." },
  crossbow: { label: "Crossbow", consumable: false, desc: "A mechanical bow with powerful shots." },
  staff: { label: "Mage Staff", consumable: false, desc: "A staff that channels arcane force." },
  wand: { label: "Wand", consumable: false, desc: "A slim wand for precise spellwork." },

  leather_armor: { label: "Leather Armor", consumable: false, desc: "Light armor made from treated hide." },
  chainmail: { label: "Chainmail", consumable: false, desc: "Linked rings that blunt blades." },
  plate_armor: { label: "Plate Armor", consumable: false, desc: "Heavy steel plates for serious protection." },
  cloak: { label: "Cloak", consumable: false, desc: "A travel cloak that hides you from wind and eyes." },
  boots: { label: "Boots", consumable: false, desc: "Hard-worn boots built for long roads." },
  gloves: { label: "Gloves", consumable: false, desc: "Leather gloves to protect your hands." },

  ring_of_focus: { label: "Ring of Focus", consumable: false, desc: "A simple ring that steadies concentration." },
  amulet_of_vigor: { label: "Amulet of Vigor", consumable: false, desc: "A small charm that strengthens the body." },
  charm: { label: "Charm", consumable: false, desc: "A trinket said to tilt luck." },

  herb_sageleaf: { label: "Sageleaf", consumable: false, desc: "A common herb used in poultices." },
  herb_nightbloom: { label: "Nightbloom", consumable: false, desc: "A dark flower prized by alchemists." },
  ore_iron: { label: "Iron Ore", consumable: false, desc: "Raw iron ore for forging." },
  ore_silver: { label: "Silver Ore", consumable: false, desc: "Raw silver ore for crafting and trade." },
  cloth: { label: "Cloth", consumable: false, desc: "Cloth for bandages, garments, and repairs." },
  leather: { label: "Leather", consumable: false, desc: "Treated hide for armor and travel goods." },
  lumber: { label: "Lumber", consumable: false, desc: "Cut timber for building and crafting." },
  rune_shard: { label: "Rune Shard", consumable: false, desc: "A fragment etched with faint runes." },
  ember_gem: { label: "Ember Gem", consumable: false, desc: "A gem that holds warmth like a coal." },

  sealed_letter: { label: "Sealed Letter", consumable: false, desc: "A sealed message bound in wax. Key item: it points you toward a lantern-shop cellar and an investigation lead." },
  ledger: { label: "Ledger", consumable: false, desc: "A ledger of names and payments. Key item: bring it to your Allegiance (Deliver Findings) for a reward." },
  guild_seal: { label: "Guild Seal", consumable: false, desc: "A blue seal marking Guild authority." },
  rebel_token: { label: "Rebel Token", consumable: false, desc: "A small token used to identify Rebel allies." },
  crown_writ: { label: "Crown Writ", consumable: false, desc: "A writ bearing the authority of the Crown." },
  sun_vault_key: { label: "Sun Vault Key", consumable: false, desc: "A heavy key marked with a sunburst." },
  lantern_cellar_key: { label: "Lantern Cellar Key", consumable: false, desc: "A small key that smells faintly of oil. Key item: it opens a lantern-shop cellar lock connected to the investigation." },

  phoenix_draught: { label: "Phoenix Draught", consumable: true, desc: "A legendary draught that floods the body with heat and refuses to let wounds linger." },
  titanblood_elixir: { label: "Titanblood Elixir", consumable: true, desc: "Thick, metallic elixir that makes your heart thunder with impossible strength." },
  sunfire_serum: { label: "Sunfire Serum", consumable: true, desc: "Liquid sunlight in a sealed ampoule. Burns away fatigue and steadies your aim." },
  voidsalt_ampoule: { label: "Voidsalt Ampoule", consumable: true, desc: "A crackling pinch of dark salt suspended in glass. Silences fear and numbs pain." },
  wyrmhide_tonic: { label: "Wyrmhide Tonic", consumable: true, desc: "Bitter tonic that hardens skin like scaled leather for a short time." },
  aether_salve: { label: "Aether Salve", consumable: true, desc: "Luminous salve that closes cuts with a cool, clean sting." },
  stormseed_powder: { label: "Stormseed Powder", consumable: true, desc: "A sparking powder that makes your limbs quick and your reflexes cruelly sharp." },
  mindglass_vial: { label: "Mindglass Vial", consumable: true, desc: "Clear solution that sharpens thought until the world feels slow." },
  shadowstep_incense: { label: "Shadowstep Incense", consumable: true, desc: "Smoldering incense that dulls footsteps and wraps you in hush." },
  ironbark_poultice: { label: "Ironbark Poultice", consumable: true, desc: "A heavy herbal poultice that knits bruises and stiffens resolve." },

  sunstorm_greatsword: { label: "Sunstorm Greatsword", consumable: false, desc: "A two-handed blade etched with storm runes. It hums when danger nears." },
  moonlit_katana: { label: "Moonlit Katana", consumable: false, desc: "A thin, flawless edge that seems to drink in light and return it as cold clarity." },
  starfall_spear: { label: "Starfall Spear", consumable: false, desc: "A long spearhead forged from sky-iron. It strikes with a clean, ringing bite." },
  embercore_warhammer: { label: "Embercore Warhammer", consumable: false, desc: "A hammer with a coal-red core. The head stays warm even in rain." },
  whispersteel_dagger: { label: "Whispersteel Dagger", consumable: false, desc: "A balanced dagger that cuts quietly and leaves no scream in the air." },
  reaver_crossbow: { label: "Reaver Crossbow", consumable: false, desc: "A compact crossbow built for brutal efficiency and quick reloads." },
  wyrmfang_halberd: { label: "Wyrmfang Halberd", consumable: false, desc: "A polearm tipped with a pale fang. It bites deep and refuses to snag." },
  frostbite_longbow: { label: "Frostbite Longbow", consumable: false, desc: "A longbow strung with white cord. Its shots feel colder than the wind." },
  arcane_focus_staff: { label: "Arcane Focus Staff", consumable: false, desc: "A staff inlaid with a focusing lattice. Spells feel cleaner in your hands." },
  runebound_wand: { label: "Runebound Wand", consumable: false, desc: "A wand bound in silver runes that answer quickly to practiced intent." },

  aegis_plate: { label: "Aegis Plate", consumable: false, desc: "Masterwork plate armor that turns hard hits into dull thuds." },
  shadowweave_cloak: { label: "Shadowweave Cloak", consumable: false, desc: "A cloak woven from dark thread that blurs your outline in low light." },
  dragonscale_vest: { label: "Dragonscale Vest", consumable: false, desc: "Scaled vest that flexes like leather and shrugs off heat." },
  stormguard_chainmail: { label: "Stormguard Chainmail", consumable: false, desc: "A dense mail shirt that sits heavy and comforting, like distant thunder." },
  dawnspire_helm: { label: "Dawnspire Helm", consumable: false, desc: "A polished helm that keeps your senses clear when chaos blooms." },
  gravewarden_greaves: { label: "Gravewarden Greaves", consumable: false, desc: "Greaves with warding marks. They steady your stance on broken ground." },
  ironbark_gauntlets: { label: "Ironbark Gauntlets", consumable: false, desc: "Gauntlets reinforced with barksteel ribs. Your grip becomes unyielding." },
  moonstone_boots: { label: "Moonstone Boots", consumable: false, desc: "Boots set with pale stone. They land soft and leave light prints." },

  crown_of_the_sun_vault: { label: "Crown of the Sun Vault", consumable: false, desc: "A relic crown that radiates authority. Doors feel easier to open around it." },
  ring_of_true_sight: { label: "Ring of True Sight", consumable: false, desc: "A ring that makes lies taste like ash. Hidden seams stand out." },
  amulet_of_unbroken_oath: { label: "Amulet of the Unbroken Oath", consumable: false, desc: "A heavy amulet that refuses to warm to treachery." },
  sigil_of_the_guildmaster: { label: "Sigil of the Guildmaster", consumable: false, desc: "A stamped sigil that commands respect in Guild halls and backrooms." },
  rebel_commander_band: { label: "Rebel Commander Band", consumable: false, desc: "A worn armband that speaks of survival, strategy, and hard choices." },
  wilds_totem: { label: "Wilds Totem", consumable: false, desc: "A carved totem that smells of pine resin and distant rain." },
  ember_gem_circlet: { label: "Ember Gem Circlet", consumable: false, desc: "A circlet set with a warm gem. It steadies your breath under pressure." },
  runeheart_pendant: { label: "Runeheart Pendant", consumable: false, desc: "A pendant with a pulsing rune core. It answers quietly to courage." },
  mirror_charm: { label: "Mirror Charm", consumable: false, desc: "A small mirrored charm that catches odd angles and reveals subtle movement." },
  oathkeeper_medallion: { label: "Oathkeeper Medallion", consumable: false, desc: "A medallion given to those who keep their word when it costs." },
  chronicle_of_ashes: { label: "Chronicle of Ashes", consumable: false, desc: "A sealed black book filled with battlefield notes and forbidden tactics." },
  lantern_of_silent_paths: { label: "Lantern of Silent Paths", consumable: false, desc: "A hooded lantern whose flame refuses to flicker. It makes the road feel safer." },
};

function addGeneratedConsumables() {
  const namesA = [
    "Sageleaf",
    "Nightbloom",
    "Stormroot",
    "Ember",
    "Moonwell",
    "Sunfire",
    "Ironbark",
    "Whispermint",
    "Glassmoss",
    "Riverstone",
    "Cinderpetal",
    "Frostberry",
    "Thornrose",
    "Starflower",
    "Ashsalt",
    "Mistcap",
    "Dawnroot",
    "Gravebloom",
    "Brightseed",
    "Shadowleaf",
  ];
  const namesB = [
    "Tonic",
    "Draught",
    "Elixir",
    "Salve",
    "Poultice",
    "Tea",
    "Vial",
    "Powder",
    "Incense",
    "Ampoule",
  ];

  const descForIndex = (idx) => {
    const n = Math.max(1, Math.floor(idx || 1));
    const ingredient = (n - 1) % namesA.length;
    const form = Math.floor((n - 1) / namesA.length) % namesB.length;
    const variant = ingredient % 3;
    if (form === 0) {
      if (variant === 0) return "A tonic that restores mana and stokes Sunfire.";
      if (variant === 1) return "A tonic that restores mana and clarifies the mind.";
      return "A tonic that restores mana and refreshes the body.";
    }
    if (form === 1) {
      if (variant === 0) return "A draught that hastes your steps and helps you escape.";
      if (variant === 1) return "A draught that hastes your steps and sharpens offense.";
      return "A draught that hastes you and steadies your breath.";
    }
    if (form === 2) {
      if (variant === 0) return "An elixir that restores health, clears bleeding, and fortifies you.";
      if (variant === 1) return "An elixir that restores health, restores mana, and helps you recover.";
      return "An elixir that restores health and helps resist curses.";
    }
    if (form === 3) {
      if (variant === 0) return "A salve that heals and grants Aether for a short time.";
      if (variant === 1) return "A salve that heals and briefly shields you.";
      return "A salve that heals and calms pain.";
    }
    if (form === 4) {
      if (variant === 0) return "A poultice that heals and hardens skin like Ironbark.";
      if (variant === 1) return "A poultice that heals and hardens skin like Wyrmhide.";
      return "A poultice that heals and steadies your stance.";
    }
    if (form === 5) {
      if (variant === 0) return "A tea that grants Rested and clears the mind.";
      if (variant === 1) return "A tea that grants Rested and warms the blood.";
      return "A tea that grants Rested and settles nausea.";
    }
    if (form === 6) {
      if (variant === 0) return "A vial that grants Mindglass and weakens enemy aim.";
      if (variant === 1) return "A vial that grants Mindglass and sharpens cunning.";
      return "A vial that grants Mindglass and steadies arcane focus.";
    }
    if (form === 7) {
      if (variant === 0) return "A powder that sparks Stormseed and boosts damage briefly.";
      if (variant === 1) return "A powder that sparks Stormseed and helps you flee.";
      return "A powder that sparks Stormseed and quickens reactions.";
    }
    if (form === 8) {
      if (variant === 0) return "An incense that grants Shadowstep and muffles movement.";
      if (variant === 1) return "An incense that grants Shadowstep and clouds enemy aim.";
      return "An incense that grants Shadowstep and sharpens scouting.";
    }
    if (variant === 0) return "An ampoule that grants Voidsalt and breaks curses.";
    if (variant === 1) return "An ampoule that grants Voidsalt and hardens resolve.";
    return "An ampoule that grants Voidsalt and dulls pain.";
  };

  for (let i = 1; i <= 200; i++) {
    const id = String(i).padStart(3, "0");
    const key = `consumable_${id}`;
    const existing = ITEM_CATALOG[key];
    const shouldOverwrite = !existing
      || (typeof existing.label === "string" && /^Consumable\s*#?\d+/i.test(existing.label.trim()));

    const a = namesA[(i - 1) % namesA.length];
    const b = namesB[Math.floor((i - 1) / namesA.length) % namesB.length];

    if (shouldOverwrite) {
      ITEM_CATALOG[key] = {
        label: `${a} ${b}`,
        consumable: true,
        desc: descForIndex(i),
      };
    }
  }
}

addGeneratedConsumables();

function itemLabel(key) {
  const k = String(key || "").trim();
  return ITEM_CATALOG[k]?.label || k;
}

function itemDef(key) {
  const k = String(key || "").trim();
  return ITEM_CATALOG[k] || { label: k || "(unknown)", consumable: false, desc: "No details available." };
}

function ensureEquipmentState(s) {
  if (!s) return;
  if (!s.equipment || typeof s.equipment !== "object") {
    s.equipment = { weapon: null, armor1: null, armor2: null, armor3: null, armor4: null, accessory1: null, accessory2: null };
  }
  if (typeof s.equipment.weapon === "undefined") s.equipment.weapon = null;
  if (typeof s.equipment.armor1 === "undefined") s.equipment.armor1 = null;
  if (typeof s.equipment.armor2 === "undefined") s.equipment.armor2 = null;
  if (typeof s.equipment.armor3 === "undefined") s.equipment.armor3 = null;
  if (typeof s.equipment.armor4 === "undefined") s.equipment.armor4 = null;
  if (typeof s.equipment.accessory1 === "undefined") s.equipment.accessory1 = null;
  if (typeof s.equipment.accessory2 === "undefined") s.equipment.accessory2 = null;

  // migrate legacy single armor slot
  if (typeof s.equipment.armor !== "undefined" && s.equipment.armor && !s.equipment.armor1) {
    s.equipment.armor1 = s.equipment.armor;
  }
}

function equipmentSlotGroupForItem(key) {
  const k = String(key || "").trim();
  if (!k) return "";
  const def = itemDef(k);
  if (def.consumable) return "";
  const kk = k.toLowerCase();
  if (/(sword|katana|spear|hammer|dagger|crossbow|halberd|longbow|staff|wand)/i.test(kk)) return "weapon";
  if (/(plate|chainmail|armor|vest|cloak|helm|greaves|gauntlets|boots)/i.test(kk)) return "armor";
  if (/(^ring_|^amulet_|^sigil_|^crown_|chronicle|lantern_of_|_totem$|_pendant$|_circlet$|_medallion$|_band$|mirror_charm|charm)/i.test(kk)) {
    return "accessory";
  }
  return "";
}

function isEquippableItem(key) {
  const k = String(key || "").trim();
  if (!k) return false;
  return !!equipmentSlotGroupForItem(k);
}

function equippedSlotForItem(s, key) {
  if (!s) return "";
  ensureEquipmentState(s);
  const k = String(key || "").trim();
  if (!k) return "";
  const slots = ["weapon", "armor1", "armor2", "armor3", "armor4", "accessory1", "accessory2"];
  for (const slot of slots) {
    if (s.equipment?.[slot] === k) return slot;
  }
  return "";
}

function equipmentBonusForItem(key) {
  const k = String(key || "").trim();
  const empty = {
    stats: { strength: 0, cunning: 0, arcana: 0, resilience: 0 },
    maxHp: 0,
    maxMana: 0,
    dmgMult: 1,
    dmgFlat: 0,
    damageTakenMult: 1,
  };
  if (!k) return empty;
  const group = equipmentSlotGroupForItem(k);
  if (!group) return empty;

  const rank = marketRankForItem(k);
  const tier = clamp(Math.floor(rank?.tier || 0), 0, 4);
  const power = 1 + tier;
  const h = hashString(k);

  const out = JSON.parse(JSON.stringify(empty));
  const bump = (stat, amt) => {
    out.stats[stat] = (out.stats[stat] || 0) + Math.max(0, Math.floor(amt || 0));
  };

  const kk = k.toLowerCase();
  if (group === "weapon") {
    const primary = /(staff|wand)/i.test(kk) ? "arcana" : (/(dagger|bow|crossbow)/i.test(kk) ? "cunning" : "strength");
    // Remoduled for 700 cap: weapon gives more stats and damage
    bump(primary, 1 + Math.floor(power * 0.9) + (h % 3) + Math.floor(power / 2));
    bump("strength", /(staff|wand)/i.test(kk) ? Math.floor(power * 0.4) : Math.floor(power * 0.2));
    bump("cunning", /(dagger|bow|crossbow)/i.test(kk) ? Math.floor(power * 0.4) : (h % 2));
    // Higher damage multipliers for high tier (power 0-4, but for 700 cap we want up to 0.45)
    out.dmgMult = 1 + clamp(0.05 * power + ((h % 7) * 0.015) + power * 0.02, 0.05, 0.48);
    out.dmgFlat = 2 + power * 2 + (h % 5) + Math.floor(power * 1.2);
    if (/(staff|wand)/i.test(kk)) {
      out.maxMana = 2 + power * 2 + (h % 6);
      // Magic damage bonus for staff/wand
      out.dmgMult += 0.03 * power;
    }
    return out;
  }

  if (group === "armor") {
    bump("resilience", 2 + Math.floor(power * 1.1) + (h % 3));
    out.maxHp = 5 + power * 8 + (h % 12) + Math.floor(power * 1.5);
    const red = clamp(0.05 * power + ((h % 5) * 0.015) + power * 0.015, 0.06, 0.38);
    out.damageTakenMult = 1 - red;
    if (/(cloak|boots)/i.test(kk)) bump("cunning", Math.floor(power * 0.6));
    if (/helm/i.test(kk)) bump("arcana", Math.floor(power * 0.5));
    return out;
  }

  const pool = ["strength", "cunning", "arcana", "resilience"];
  const a = pool[h % pool.length];
  const b = pool[(h >>> 3) % pool.length];
  bump(a, 1 + Math.floor(power * 0.6));
  if (b !== a) bump(b, Math.floor(power * 0.45));
  if (/(ring_|pendant|circlet|sigil|chronicle|lantern_of_)/i.test(kk)) out.maxMana = 1 + power * 2 + (h % 5);
  else if (/(amulet_|medallion|totem|band|crown_)/i.test(kk)) out.maxHp = 1 + power * 2 + (h % 5);
  if (/(amulet_|medallion|totem|crown_)/i.test(kk)) {
    out.damageTakenMult = 1 - clamp(0.01 * power + ((h % 3) * 0.005), 0.01, 0.06);
  }
  if (/(ring_|sigil|chronicle)/i.test(kk)) out.dmgMult = 1 + clamp(0.01 * power + ((h % 3) * 0.01), 0.01, 0.06);
  return out;
}

function totalEquipmentBonuses(s) {
  const base = {
    stats: { strength: 0, cunning: 0, arcana: 0, resilience: 0 },
    maxHp: 0,
    maxMana: 0,
    dmgMult: 1,
    dmgFlat: 0,
    damageTakenMult: 1,
  };
  if (!s) return base;
  ensureEquipmentState(s);

  const keys = [
    s.equipment.weapon,
    s.equipment.armor1,
    s.equipment.armor2,
    s.equipment.armor3,
    s.equipment.armor4,
    s.equipment.accessory1,
    s.equipment.accessory2,
  ]
    .filter((k) => typeof k === "string" && k.trim());

  for (const k of keys) {
    const b = equipmentBonusForItem(k);
    for (const sk of Object.keys(base.stats)) base.stats[sk] += Math.max(0, Math.floor(b.stats?.[sk] || 0));
    base.maxHp += Math.max(0, Math.floor(b.maxHp || 0));
    base.maxMana += Math.max(0, Math.floor(b.maxMana || 0));
    base.dmgMult *= (typeof b.dmgMult === "number" && Number.isFinite(b.dmgMult)) ? b.dmgMult : 1;
    base.dmgFlat += Math.max(0, Math.floor(b.dmgFlat || 0));
    base.damageTakenMult *= (typeof b.damageTakenMult === "number" && Number.isFinite(b.damageTakenMult)) ? b.damageTakenMult : 1;
  }

  base.dmgMult = clamp(base.dmgMult, 0.75, 2.2);
  base.damageTakenMult = clamp(base.damageTakenMult, 0.55, 1.25);
  return base;
}

function effectiveStats(s) {
  const base = { strength: 0, cunning: 0, arcana: 0, resilience: 0 };
  if (!s) return base;
  const raw = s.stats || base;
  base.strength = Math.max(0, Math.floor(raw.strength || 0));
  base.cunning = Math.max(0, Math.floor(raw.cunning || 0));
  base.arcana = Math.max(0, Math.floor(raw.arcana || 0));
  base.resilience = Math.max(0, Math.floor(raw.resilience || 0));
  const b = totalEquipmentBonuses(s);
  base.strength += b.stats.strength || 0;
  base.cunning += b.stats.cunning || 0;
  base.arcana += b.stats.arcana || 0;
  base.resilience += b.stats.resilience || 0;
  return base;
}

function playerStat(key) {
  if (!state) return 0;
  const k = String(key || "").trim().toLowerCase();
  const st = effectiveStats(state);
  return Math.max(0, Math.floor(st?.[k] || 0));
}

function playerMaxHp() {
  if (!state) return 0;
  return maxHpForState(state);
}

function playerMaxMana() {
  if (!state) return 0;
  return maxManaForState(state);
}

function clampPlayerResources() {
  if (!state) return;
  clampResourcesForState(state);
}

function maxHpForState(s) {
  if (!s) return 0;
  const b = totalEquipmentBonuses(s);
  return Math.max(1, Math.floor((s.maxHp || 1) + (b.maxHp || 0)));
}

function maxManaForState(s) {
  if (!s) return 0;
  const b = totalEquipmentBonuses(s);
  return Math.max(0, Math.floor((s.maxMana || 0) + (b.maxMana || 0)));
}

function clampResourcesForState(s) {
  if (!s) return;
  const mhp = maxHpForState(s);
  const mm = maxManaForState(s);
  s.hp = Math.min(mhp, Math.max(0, Math.floor(s.hp || 0)));
  s.mana = Math.min(mm, Math.max(0, Math.floor(s.mana || 0)));
}

function equipItem(key) {
  if (!state) return false;
  normalizeState(state);
  if (isCombatActive(state)) {
    appendLog("You can't change equipment during combat.");
    return false;
  }
  ensureEquipmentState(state);
  const k = String(key || "").trim();
  if (!k) return false;
  if (!isEquippableItem(k)) {
    appendLog("That item can't be equipped.");
    return false;
  }
  const owned = Math.max(0, Math.floor(state.inventory?.[k] || 0));
  if (owned <= 0) {
    appendLog("You don't own that item.");
    return false;
  }

  const group = equipmentSlotGroupForItem(k);
  let slot = group;
  if (group === "accessory") {
    slot = !state.equipment.accessory1 ? "accessory1" : (!state.equipment.accessory2 ? "accessory2" : "accessory1");
  } else if (group === "armor") {
    slot = !state.equipment.armor1
      ? "armor1"
      : (!state.equipment.armor2
        ? "armor2"
        : (!state.equipment.armor3
          ? "armor3"
          : (!state.equipment.armor4 ? "armor4" : "armor1")));
  }

  const already = equippedSlotForItem(state, k);
  if (already) {
    appendLog("Don't equip twice.");
    return false;
  }

  const prev = state.equipment[slot];
  if (prev) {
    addInvItem(state, prev, 1);
  }

  consumeInvItem(state, k, 1);
  state.equipment[slot] = k;
  clampPlayerResources();
  appendLog(`Equipped: ${itemLabel(k)} (${slot}).`);
  autoSave();
  render();
  return true;
}

function unequipSlot(slot) {
  if (!state) return false;
  normalizeState(state);
  if (isCombatActive(state)) {
    appendLog("You can't change equipment during combat.");
    return false;
  }
  ensureEquipmentState(state);
  const s = String(slot || "").trim();
  if (!s) return false;
  const k = state.equipment[s];
  if (!k) return false;
  state.equipment[s] = null;
  addInvItem(state, k, 1);
  clampPlayerResources();
  appendLog(`Unequipped: ${itemLabel(k)}.`);
  autoSave();
  render();
  return true;
}

function unequipItem(key) {
  if (!state) return false;
  normalizeState(state);
  if (isCombatActive(state)) {
    appendLog("You can't change equipment during combat.");
    return false;
  }
  ensureEquipmentState(state);
  const k = String(key || "").trim();
  if (!k) return false;
  const slot = equippedSlotForItem(state, k);
  if (!slot) return false;
  return unequipSlot(slot);
}

function itemBonusSummary(key) {
  const k = String(key || "").trim();
  if (!k) return "";
  if (!isEquippableItem(k)) return "";
  const b = equipmentBonusForItem(k);
  const parts = [];
  const s = b.stats || {};
  if (s.strength) parts.push(`+${s.strength} Strength`);
  if (s.cunning) parts.push(`+${s.cunning} Cunning`);
  if (s.arcana) parts.push(`+${s.arcana} Arcana`);
  if (s.resilience) parts.push(`+${s.resilience} Resilience`);
  if (b.maxHp) parts.push(`+${b.maxHp} Max HP`);
  if (b.maxMana) parts.push(`+${b.maxMana} Max Mana`);
  if (b.dmgFlat) parts.push(`+${b.dmgFlat} Damage`);
  if (b.dmgMult && b.dmgMult !== 1) parts.push(`Damage x${b.dmgMult.toFixed(2)}`);
  if (b.damageTakenMult && b.damageTakenMult !== 1) parts.push(`Damage Taken x${b.damageTakenMult.toFixed(2)}`);
  return parts.length ? parts.join(" • ") : "";
}

function partyLine(s) {
  if (!s) return "Party: (unknown)";
  const members = Array.isArray(s.party?.members) ? s.party.members : [];
  if (!members.length) return "Party: Solo";
  const names = members
    .map((m) => (m && m.name) ? String(m.name) : "Companion")
    .filter((n) => n && String(n).trim())
    .slice(0, 4);
  return `Party: ${partySize(s)} (${names.join(", ")})`;
}

const MARKET_ITEMS_PER_PAGE = 8;

const MARKET_EXCLUDE_KEYS = new Set([
  "sealed_letter",
  "ledger",
  "guild_seal",
  "rebel_token",
  "crown_writ",
  "sun_vault_key",
  "lantern_cellar_key",
]);

const MARKET_LEGENDARY_KEYS = new Set([
  "phoenix_feather",
  "phoenix_draught",
  "titanblood_elixir",
  "sunfire_serum",
  "voidsalt_ampoule",
  "wyrmhide_tonic",
  "aether_salve",
  "stormseed_powder",
  "mindglass_vial",
  "shadowstep_incense",
  "ironbark_poultice",

  "sunstorm_greatsword",
  "moonlit_katana",
  "starfall_spear",
  "embercore_warhammer",
  "whispersteel_dagger",
  "reaver_crossbow",
  "wyrmfang_halberd",
  "frostbite_longbow",
  "arcane_focus_staff",
  "runebound_wand",

  "aegis_plate",
  "shadowweave_cloak",
  "dragonscale_vest",
  "stormguard_chainmail",
  "dawnspire_helm",
  "gravewarden_greaves",
  "ironbark_gauntlets",
  "moonstone_boots",

  "crown_of_the_sun_vault",
  "ring_of_true_sight",
  "amulet_of_unbroken_oath",
  "sigil_of_the_guildmaster",
  "rebel_commander_band",
  "wilds_totem",
  "ember_gem_circlet",
  "runeheart_pendant",
  "mirror_charm",
  "oathkeeper_medallion",
  "chronicle_of_ashes",
  "lantern_of_silent_paths",
]);

function marketRankForItem(key) {
  const k = String(key || "").trim();
  if (!k) return { tier: 0, rank: "Common", badge: "easy", mult: 1 };
  if (MARKET_LEGENDARY_KEYS.has(k)) return { tier: 4, rank: "Legendary", badge: "legendary", mult: 8.8 };
  const def = itemDef(k);
  const kk = k.toLowerCase();

  if (kk.startsWith("loc_")) {
    return { tier: 1, rank: "Curio", badge: "normal", mult: 1.6 };
  }

  if (def.consumable) {
    if (kk.startsWith("consumable_")) return { tier: 0, rank: "Common", badge: "easy", mult: 1.0 };
    if (/(phoenix|titanblood|sunfire|voidsalt|wyrmhide|aether|stormseed|mindglass|shadowstep|ironbark)/i.test(kk)) {
      return { tier: 3, rank: "Epic", badge: "elite", mult: 4.6 };
    }
    return { tier: 1, rank: "Uncommon", badge: "normal", mult: 1.4 };
  }

  if (/(^ring_|^amulet_|^sigil_|^crown_|chronicle|lantern_of_|_totem$|_pendant$|_circlet$|_medallion$|_band$|mirror_charm)/i.test(kk)) {
    return { tier: 3, rank: "Epic", badge: "elite", mult: 4.6 };
  }
  if (/(plate|dragonscale|stormguard|shadowweave|runebound|arcane_focus|sunstorm|moonlit|starfall|embercore|wyrmfang|reaver|frostbite|whispersteel)/i.test(kk)) {
    return { tier: 2, rank: "Rare", badge: "hard", mult: 3.6 };
  }
  if (equipmentSlotGroupForItem(k)) {
    return { tier: 1, rank: "Uncommon", badge: "normal", mult: 1.6 };
  }
  return { tier: 0, rank: "Common", badge: "easy", mult: 1.1 };
}

let marketStockCache = null;
let marketStockCacheKey = "";
function marketStockKeys() {
  const seed = (!isAdminProfile(state?.profile) && !!state?.flags?.["exile:active"] && typeof state?.flags?.["exile:seed"] === "number")
    ? (state.flags["exile:seed"] >>> 0)
    : 0;
  const cacheKey = String(seed);
  if (Array.isArray(marketStockCache) && marketStockCache.length && marketStockCacheKey === cacheKey) return marketStockCache;
  const keys = Object.keys(ITEM_CATALOG || {});
  const out = [];
  for (const k of keys) {
    const kk = String(k || "").trim();
    if (!kk) continue;
    if (MARKET_EXCLUDE_KEYS.has(kk)) continue;
    if (kk.startsWith("loc_")) continue;
    out.push(kk);
  }
  if (!seed) {
    out.sort((a, b) => {
      const ra = marketRankForItem(a);
      const rb = marketRankForItem(b);
      if (rb.tier !== ra.tier) return rb.tier - ra.tier;
      const pa = marketPriceForItem(a);
      const pb = marketPriceForItem(b);
      if (pb !== pa) return pb - pa;
      return itemLabel(a).localeCompare(itemLabel(b));
    });
  } else {
    out.sort((a, b) => {
      const ha = (hashString(`market:${seed}:${a}`) >>> 0);
      const hb = (hashString(`market:${seed}:${b}`) >>> 0);
      if (ha !== hb) return ha < hb ? -1 : 1;
      return a.localeCompare(b);
    });
  }
  marketStockCache = out;
  marketStockCacheKey = cacheKey;
  return out;
}

function marketPriceForItem(key) {
  const k = String(key || "").trim();
  if (k === "phoenix_feather") return 5000;
  const p = {
    bandage: 10,
    health_potion: 18,
    mana_potion: 15,
    tonic: 12,
    stamina_draught: 18,
    smoke_bomb: 22,
    antidote: 16,
    ration: 5,
    torch: 4,
    waterskin: 8,
    lockpick: 8,

    herb_sageleaf: 12,
    herb_nightbloom: 16,
    ore_iron: 30,
    ore_silver: 60,
    cloth: 18,
    leather: 22,
    lumber: 16,
    rune_shard: 90,
    ember_gem: 120,

    dagger: 25,
    short_sword: 45,
    iron_sword: 70,
    steel_sword: 95,
    longbow: 75,
    crossbow: 95,
    staff: 55,
    wand: 60,
    leather_armor: 60,
    chainmail: 110,
    plate_armor: 160,
    cloak: 35,
    boots: 28,
    gloves: 22,
    ring_of_focus: 85,
    amulet_of_vigor: 95,
    charm: 30,
  };
  const def = itemDef(k);
  const rank = marketRankForItem(k);
  const kk = k.toLowerCase();
  const base = (typeof p[k] === "number")
    ? p[k]
    : (kk.startsWith("loc_") ? 40 : (def.consumable ? 14 : 60));

  let kindMult = 1.0;
  if (!def.consumable) {
    if (/(sword|katana|spear|hammer|dagger|crossbow|halberd|longbow|staff|wand)/i.test(kk)) kindMult = 1.35;
    else if (/(plate|chainmail|armor|vest|cloak|helm|greaves|gauntlets|boots)/i.test(kk)) kindMult = 1.45;
    else if (/(^ring_|^amulet_|^sigil_|^crown_|chronicle|lantern_of_|_totem$|_pendant$|_circlet$|_medallion$|_band$|mirror_charm|charm)/i.test(kk)) kindMult = 1.25;
    else kindMult = 1.15;
  } else if ((rank.tier || 0) >= 3) {
    kindMult = 1.15;
  }

  const minByTier = { 0: 3, 1: 12, 2: 160, 3: 260, 4: 450 };
  const maxByTier = { 0: 200, 1: 260, 2: 520, 3: 820, 4: 1000 };
  const min = (typeof minByTier[rank.tier] === "number") ? minByTier[rank.tier] : 3;
  const max = (typeof maxByTier[rank.tier] === "number") ? maxByTier[rank.tier] : 1000;

  const raw = base * (rank.mult || 1) * kindMult;
  return Math.max(3, Math.round(clamp(raw, min, max)));
}

function canSellItemInMarket(key) {
  const k = String(key || "").trim();
  if (!k) return false;
  if (MARKET_EXCLUDE_KEYS.has(k)) return false;
  return true;
}

function marketSellPriceForItem(key) {
  const k = String(key || "").trim();
  if (!k) return 0;
  const buy = marketPriceForItem(k);
  const tier = clamp(Math.floor(marketRankForItem(k)?.tier || 0), 0, 4);
  const rateByTier = { 0: 0.65, 1: 0.68, 2: 0.70, 3: 0.72, 4: 0.74 };
  const rate = (typeof rateByTier[tier] === "number") ? rateByTier[tier] : 0.65;
  return Math.max(1, Math.floor(buy * rate));
}

const BLACKSMITH_RECIPES = [
  { key: "forge_dagger", label: "Forge Dagger", out: "dagger", outQty: 1, gold: 22, req: { ore_iron: 1 } },
  { key: "forge_short_sword", label: "Forge Short Sword", out: "short_sword", outQty: 1, gold: 34, req: { ore_iron: 1, leather: 1 } },
  { key: "forge_iron_sword", label: "Forge Iron Sword", out: "iron_sword", outQty: 1, gold: 40, req: { ore_iron: 2 } },
  { key: "forge_steel_sword", label: "Forge Steel Sword", out: "steel_sword", outQty: 1, gold: 90, req: { ore_iron: 2, ore_silver: 1 } },
  { key: "forge_chainmail", label: "Forge Chainmail", out: "chainmail", outQty: 1, gold: 75, req: { ore_iron: 3, leather: 1 } },
  { key: "forge_plate_armor", label: "Forge Plate Armor", out: "plate_armor", outQty: 1, gold: 140, req: { ore_iron: 4, ore_silver: 1, leather: 1 } },
  { key: "forge_crossbow", label: "Forge Crossbow", out: "crossbow", outQty: 1, gold: 95, req: { ore_iron: 2, lumber: 1 } },
  { key: "forge_arcane_staff", label: "Forge Arcane Focus Staff", out: "arcane_focus_staff", outQty: 1, gold: 180, req: { ore_silver: 2, rune_shard: 1, lumber: 1 } },
  { key: "forge_ember_warhammer", label: "Forge Embercore Warhammer", out: "embercore_warhammer", outQty: 1, gold: 210, req: { ore_iron: 3, ember_gem: 1 } },
  { key: "forge_reaver_crossbow", label: "Forge Reaver Crossbow", out: "reaver_crossbow", outQty: 1, gold: 240, req: { ore_iron: 3, ore_silver: 1, lumber: 2 } },
];

const ALCHEMIST_RECIPES = [
  { key: "brew_health_potion", label: "Brew Health Potion", out: "health_potion", outQty: 1, gold: 12, req: { herb_sageleaf: 1 } },
  { key: "brew_mana_potion", label: "Brew Mana Potion", out: "mana_potion", outQty: 1, gold: 14, req: { herb_nightbloom: 1, herb_sageleaf: 1 } },
  { key: "brew_tonic", label: "Brew Mana Tonic", out: "tonic", outQty: 1, gold: 10, req: { herb_nightbloom: 1 } },
  { key: "brew_antidote", label: "Brew Antidote", out: "antidote", outQty: 1, gold: 10, req: { herb_nightbloom: 1 } },
  { key: "brew_smoke", label: "Pack Smoke Bomb", out: "smoke_bomb", outQty: 1, gold: 14, req: { herb_nightbloom: 1, cloth: 1 } },
  { key: "brew_stamina", label: "Distill Stamina Draught", out: "stamina_draught", outQty: 1, gold: 16, req: { herb_sageleaf: 1, herb_nightbloom: 1 } },
  { key: "brew_ironbark", label: "Mix Ironbark Poultice", out: "ironbark_poultice", outQty: 1, gold: 16, req: { herb_sageleaf: 2 } },
  { key: "brew_aether_salve", label: "Blend Aether Salve", out: "aether_salve", outQty: 1, gold: 22, req: { herb_sageleaf: 1, herb_nightbloom: 1 } },
  { key: "brew_stormseed", label: "Grind Stormseed Powder", out: "stormseed_powder", outQty: 1, gold: 55, req: { herb_nightbloom: 2, ember_gem: 1 } },
  { key: "brew_mindglass", label: "Distill Mindglass Vial", out: "mindglass_vial", outQty: 1, gold: 55, req: { herb_sageleaf: 1, rune_shard: 1 } },
];

const ENCHANTER_RECIPES = [
  { key: "inscribe_ring_focus", label: "Inscribe Ring of Focus", out: "ring_of_focus", outQty: 1, gold: 45, req: { rune_shard: 2 } },
  { key: "inscribe_amulet_vigor", label: "Inscribe Amulet of Vigor", out: "amulet_of_vigor", outQty: 1, gold: 65, req: { rune_shard: 2, ember_gem: 1 } },
  { key: "set_charm", label: "Set a Charm", out: "charm", outQty: 1, gold: 40, req: { rune_shard: 1, ember_gem: 1 } },
  { key: "bind_runebound_wand", label: "Bind Runebound Wand", out: "runebound_wand", outQty: 1, gold: 90, req: { rune_shard: 3, ember_gem: 1 } },
  { key: "craft_mirror_charm", label: "Craft Mirror Charm", out: "mirror_charm", outQty: 1, gold: 60, req: { rune_shard: 1, ember_gem: 1 } },
  { key: "craft_ember_circlet", label: "Set Ember Gem Circlet", out: "ember_gem_circlet", outQty: 1, gold: 75, req: { ember_gem: 2, rune_shard: 1 } },
  { key: "craft_runeheart", label: "Forge Runeheart Pendant", out: "runeheart_pendant", outQty: 1, gold: 85, req: { rune_shard: 2, ember_gem: 1 } },
  { key: "craft_lantern_silent", label: "Bind Lantern of Silent Paths", out: "lantern_of_silent_paths", outQty: 1, gold: 110, req: { rune_shard: 2, ember_gem: 1, lumber: 1 } },
  { key: "craft_true_sight", label: "Inscribe Ring of True Sight", out: "ring_of_true_sight", outQty: 1, gold: 150, req: { rune_shard: 4, ember_gem: 2 } },
];

const CRAFTER_RECIPES = [
  { key: "craft_bandages", label: "Cut Bandages", out: "bandage", outQty: 2, gold: 2, req: { cloth: 1 } },
  { key: "craft_waterskin", label: "Stitch Waterskin", out: "waterskin", outQty: 1, gold: 4, req: { leather: 1 } },
  { key: "craft_leather_armor", label: "Craft Leather Armor", out: "leather_armor", outQty: 1, gold: 35, req: { leather: 3 } },
  { key: "sew_cloak", label: "Sew Cloak", out: "cloak", outQty: 1, gold: 25, req: { cloth: 2, leather: 1 } },
  { key: "craft_boots", label: "Craft Boots", out: "boots", outQty: 1, gold: 22, req: { leather: 2, cloth: 1 } },
  { key: "stitch_gloves", label: "Stitch Gloves", out: "gloves", outQty: 1, gold: 18, req: { leather: 2 } },
  { key: "craft_longbow", label: "Craft Longbow", out: "longbow", outQty: 1, gold: 40, req: { lumber: 2, leather: 1 } },
  { key: "make_torches", label: "Make Torches", out: "torch", outQty: 2, gold: 4, req: { lumber: 1 } },
  { key: "craft_lockpick", label: "Make Lockpicks", out: "lockpick", outQty: 1, gold: 8, req: { ore_iron: 1 } },
];

function canCraftRecipe(s, recipe) {
  if (!s || !recipe) return false;
  const inv = s.inventory || {};
  for (const [k, v] of Object.entries(recipe.req || {})) {
    const need = Math.max(0, Math.floor(v || 0));
    if (need <= 0) continue;
    if (Math.max(0, Math.floor(inv[k] || 0)) < need) return false;
  }
  const goldNeed = Math.max(0, Math.floor(recipe.gold || 0));
  return isAdminProfile(s.profile) || (s.gold || 0) >= goldNeed;
}

function craftRecipeAtBlacksmith(recipeKey) {
  if (!state) return false;
  normalizeState(state);
  const rk = String(recipeKey || "").trim();
  const recipe = BLACKSMITH_RECIPES.find((r) => r.key === rk);
  if (!recipe) return false;
  if (!canCraftRecipe(state, recipe)) {
    appendLog("You lack the materials (or gold)." );
    render();
    return false;
  }

  const goldNeed = Math.max(0, Math.floor(recipe.gold || 0));
  if (goldNeed > 0 && !spendGold(goldNeed)) {
    render();
    return false;
  }
  for (const [k, v] of Object.entries(recipe.req || {})) {
    const need = Math.max(0, Math.floor(v || 0));
    if (need <= 0) continue;
    consumeInvItem(state, k, need);
  }
  addInvItem(state, recipe.out, Math.max(1, Math.floor(recipe.outQty || 1)));
  appendLog(`🔨 Crafted: ${itemLabel(recipe.out)}.`);
  autoSave();
  render();
  return true;
}

function craftRecipeAtAlchemist(recipeKey) {
  if (!state) return false;
  normalizeState(state);
  const rk = String(recipeKey || "").trim();
  const recipe = ALCHEMIST_RECIPES.find((r) => r.key === rk);
  if (!recipe) return false;
  if (!canCraftRecipe(state, recipe)) {
    appendLog("You lack the materials (or gold)." );
    render();
    return false;
  }

  const goldNeed = Math.max(0, Math.floor(recipe.gold || 0));
  if (goldNeed > 0 && !spendGold(goldNeed)) {
    render();
    return false;
  }
  for (const [k, v] of Object.entries(recipe.req || {})) {
    const need = Math.max(0, Math.floor(v || 0));
    if (need <= 0) continue;
    consumeInvItem(state, k, need);
  }
  addInvItem(state, recipe.out, Math.max(1, Math.floor(recipe.outQty || 1)));
  appendLog(`🧪 Crafted: ${itemLabel(recipe.out)}.`);
  autoSave();
  render();
  return true;
}

function craftRecipeAtEnchanter(recipeKey) {
  if (!state) return false;
  normalizeState(state);
  const rk = String(recipeKey || "").trim();
  const recipe = ENCHANTER_RECIPES.find((r) => r.key === rk);
  if (!recipe) return false;
  if (!canCraftRecipe(state, recipe)) {
    appendLog("You lack the materials (or gold)." );
    render();
    return false;
  }

  const goldNeed = Math.max(0, Math.floor(recipe.gold || 0));
  if (goldNeed > 0 && !spendGold(goldNeed)) {
    render();
    return false;
  }
  for (const [k, v] of Object.entries(recipe.req || {})) {
    const need = Math.max(0, Math.floor(v || 0));
    if (need <= 0) continue;
    consumeInvItem(state, k, need);
  }
  addInvItem(state, recipe.out, Math.max(1, Math.floor(recipe.outQty || 1)));
  appendLog(`✨ Crafted: ${itemLabel(recipe.out)}.`);
  autoSave();
  render();
  return true;
}

function craftRecipeAtCrafter(recipeKey) {
  if (!state) return false;
  normalizeState(state);
  const rk = String(recipeKey || "").trim();
  const recipe = CRAFTER_RECIPES.find((r) => r.key === rk);
  if (!recipe) return false;
  if (!canCraftRecipe(state, recipe)) {
    appendLog("You lack the materials (or gold)." );
    render();
    return false;
  }

  const goldNeed = Math.max(0, Math.floor(recipe.gold || 0));
  if (goldNeed > 0 && !spendGold(goldNeed)) {
    render();
    return false;
  }
  for (const [k, v] of Object.entries(recipe.req || {})) {
    const need = Math.max(0, Math.floor(v || 0));
    if (need <= 0) continue;
    consumeInvItem(state, k, need);
  }
  addInvItem(state, recipe.out, Math.max(1, Math.floor(recipe.outQty || 1)));
  appendLog(`🧵 Crafted: ${itemLabel(recipe.out)}.`);
  autoSave();
  render();
  return true;
}

let itemModalEl = null;
let itemModalTitleEl = null;
let itemModalBodyEl = null;
let itemModalFooterEl = null;
let itemModalBuyBtn = null;
let itemModalSellBtn = null;
let itemModalUseBtn = null;
let itemModalEquipBtn = null;
let itemModalUnequipBtn = null;
let itemModalMode = null;
let itemModalKey = null;
let itemModalTargetBtns = [];

let advModalEl = null;
let advModalTitleEl = null;
let advModalBodyEl = null;

function ensureItemModal() {
  if (itemModalEl) return;

  itemModalEl = document.createElement("div");
  itemModalEl.className = "modalOverlay";
  itemModalEl.style.display = "none";

  const card = document.createElement("div");
  card.className = "modalCard";
  card.style.width = "min(560px, calc(100vw - 28px))";

  const top = document.createElement("div");
  top.className = "modalHeader";

  itemModalTitleEl = document.createElement("div");
  itemModalTitleEl.className = "panelTitle";
  itemModalTitleEl.style.marginBottom = "0";

  const btnClose = document.createElement("button");
  btnClose.className = "secondary";
  btnClose.textContent = "Close";
  btnClose.addEventListener("click", () => closeItemModal());

  top.appendChild(itemModalTitleEl);
  top.appendChild(btnClose);

  itemModalBodyEl = document.createElement("div");
  itemModalBodyEl.className = "modalBody";

  card.appendChild(top);
  card.appendChild(itemModalBodyEl);

  itemModalFooterEl = document.createElement("div");
  itemModalFooterEl.className = "modalFooter";
  itemModalFooterEl.style.display = "none";

  itemModalBuyBtn = document.createElement("button");
  itemModalBuyBtn.textContent = "Buy";
  itemModalBuyBtn.addEventListener("click", () => {
    if (!state) return;
    normalizeState(state);
    if (itemModalMode !== "market") return;
    const k = String(itemModalKey || "").trim();
    if (!k) return;
    const price = marketPriceForItem(k);
    if (!spendGold(price)) {
      updateItemModal();
      render();
      return;
    }
    addInvItem(state, k, 1);
    appendLog(`Purchased: ${itemLabel(k)} (-${price} gold).`);
    autoSave();
    render();
    updateItemModal();
  });

  itemModalSellBtn = document.createElement("button");
  itemModalSellBtn.textContent = "Sell";
  itemModalSellBtn.className = "secondary";
  itemModalSellBtn.addEventListener("click", () => {
    if (!state) return;
    normalizeState(state);
    const k = String(itemModalKey || "").trim();
    if (!k) return;
    if ((state.nodeId || "") !== "market") return;
    if (!canSellItemInMarket(k)) return;
    const owned = Math.max(0, Math.floor(state.inventory?.[k] || 0));
    if (owned <= 0) return;
    const slot = equippedSlotForItem(state, k);
    if (slot) {
      appendLog("Unequip it before selling.");
      updateItemModal();
      render();
      return;
    }
    const price = marketSellPriceForItem(k);
    if (!consumeInvItem(state, k, 1)) {
      updateItemModal();
      render();
      return;
    }
    state.gold = (state.gold || 0) + Math.max(0, Math.floor(price || 0));
    appendLog(`Sold: ${itemLabel(k)} (+${price} gold).`);
    autoSave();
    render();
    updateItemModal();
  });

  itemModalUseBtn = document.createElement("button");
  itemModalUseBtn.textContent = "Use";
  itemModalUseBtn.className = "secondary";
  itemModalUseBtn.addEventListener("click", () => {
    if (!state) return;
    normalizeState(state);
    if (!itemModalKey) return;
    const k = String(itemModalKey || "").trim();
    if (!k) return;
    useStoryItem(k);
    updateItemModal();
  });

  itemModalEquipBtn = document.createElement("button");
  itemModalEquipBtn.textContent = "Equip";
  itemModalEquipBtn.className = "secondary";
  itemModalEquipBtn.addEventListener("click", () => {
    if (!state) return;
    normalizeState(state);
    if (!itemModalKey) return;
    const k = String(itemModalKey || "").trim();
    if (!k) return;
    equipItem(k);
    updateItemModal();
  });

  itemModalUnequipBtn = document.createElement("button");
  itemModalUnequipBtn.textContent = "Unequip";
  itemModalUnequipBtn.className = "secondary";
  itemModalUnequipBtn.addEventListener("click", () => {
    if (!state) return;
    normalizeState(state);
    if (!itemModalKey) return;
    const k = String(itemModalKey || "").trim();
    if (!k) return;
    unequipItem(k);
    updateItemModal();
  });

  itemModalFooterEl.appendChild(itemModalBuyBtn);
  itemModalFooterEl.appendChild(itemModalSellBtn);
  itemModalFooterEl.appendChild(itemModalUseBtn);
  itemModalFooterEl.appendChild(itemModalEquipBtn);
  itemModalFooterEl.appendChild(itemModalUnequipBtn);
  card.appendChild(itemModalFooterEl);

  itemModalEl.appendChild(card);
  itemModalEl.addEventListener("click", (e) => {
    if (e.target === itemModalEl) closeItemModal();
  });
  document.body.appendChild(itemModalEl);
}

function openItemModal(itemKey) {
  ensureItemModal();
  const k = String(itemKey || "").trim();
  itemModalMode = null;
  itemModalKey = k;
  updateItemModal();
  if (itemModalEl) itemModalEl.classList.add("open");
  if (itemModalEl) itemModalEl.style.display = "flex";
}

function openMarketItemModal(itemKey) {
  ensureItemModal();
  itemModalMode = "market";
  itemModalKey = String(itemKey || "").trim();
  updateItemModal();
  if (itemModalEl) itemModalEl.classList.add("open");
  if (itemModalEl) itemModalEl.style.display = "flex";
}

function updateItemModal() {
  if (!itemModalKey) return;
  const k = String(itemModalKey || "").trim();
  if (!k) return;
  const def = itemDef(k);
  const type = def.consumable ? "Consumable" : "Non-consumable";
  const isEquip = !!equipmentSlotGroupForItem(k);
  const bonusLine = isEquip ? itemBonusSummary(k) : "";
  const inCombat = !!state && isCombatActive(state);
  if (itemModalTitleEl) itemModalTitleEl.textContent = `${def.label}`;

  const inMarketNode = !!state && (state.nodeId || "") === "market";
  const ownedNow = state ? Math.max(0, Math.floor(state.inventory?.[k] || 0)) : 0;
  const canSell = !!state && inMarketNode && ownedNow > 0 && canSellItemInMarket(k) && !equippedSlotForItem(state, k);

  if (itemModalBodyEl) {
    if (itemModalMode === "market" && state) {
      normalizeState(state);
      const price = marketPriceForItem(k);
      const rank = marketRankForItem(k);
      const owned = Math.max(0, Math.floor(state.inventory?.[k] || 0));
      const sellLine = canSell ? `\nSell: ${marketSellPriceForItem(k)} gold` : "";
      itemModalBodyEl.textContent = `Type: ${type}\nRank: ${rank.rank}\nKey: ${k}\nOwned: ${owned}\nPrice: ${price} gold${sellLine}${bonusLine ? `\nBonuses: ${bonusLine}` : ""}\n\n${def.desc || "No details available."}`;
    } else {
      const owned = state ? Math.max(0, Math.floor(state.inventory?.[k] || 0)) : 0;
      const sellLine = canSell ? `\nSell: ${marketSellPriceForItem(k)} gold` : "";
      const hint = (!def.consumable && /^ore_/.test(k))
        ? `\n\nHint: Ore is used by the Blacksmith at the Market.`
        : "";
      itemModalBodyEl.textContent = `Type: ${type}\nKey: ${k}${state ? `\nOwned: ${owned}` : ""}${sellLine}${bonusLine ? `\nBonuses: ${bonusLine}` : ""}\n\n${def.desc || "No details available."}${hint}`;
    }
    itemModalBodyEl.style.whiteSpace = "pre-wrap";
  }
  if (itemModalFooterEl) {
    const showBuy = itemModalMode === "market";
    const owned = ownedNow;
    const showUse = !showBuy && !!state && owned > 0;
    const showEquip = !showBuy && !!state && isEquip;
    const showSell = canSell;
    itemModalFooterEl.style.display = (showBuy || showSell || showUse || showEquip) ? "flex" : "none";
  }
  if (itemModalBuyBtn) {
    if (itemModalMode === "market" && state) {
      const price = marketPriceForItem(k);
      itemModalBuyBtn.disabled = !isAdminProfile(state.profile) && (state.gold || 0) < price;
      itemModalBuyBtn.textContent = `Buy (${price} gold)`;
      itemModalBuyBtn.style.display = "inline-block";
    } else {
      itemModalBuyBtn.disabled = true;
      itemModalBuyBtn.textContent = "Buy";
      itemModalBuyBtn.style.display = "none";
    }
  }
  if (itemModalSellBtn) {
    if (canSell) {
      const price = marketSellPriceForItem(k);
      itemModalSellBtn.disabled = false;
      itemModalSellBtn.textContent = `Sell (+${price}g)`;
      itemModalSellBtn.style.display = "inline-block";
    } else {
      itemModalSellBtn.disabled = true;
      itemModalSellBtn.textContent = "Sell";
      itemModalSellBtn.style.display = "none";
    }
  }
  if (itemModalUseBtn) {
    if (itemModalMode !== "market" && state) {
      const owned = ownedNow;
      const kk = String(k || "").trim().toLowerCase();
      const isPhoenixFeather = kk === "phoenix_feather";
      const inCombat = !!state?.world?.pendingEvent && state.world.pendingEvent.kind === "combat" && state.world.pendingEvent.stage === "combat";
      if (isPhoenixFeather) {
        itemModalUseBtn.style.display = "none";
        itemModalUseBtn.disabled = true;
        itemModalUseBtn.textContent = "Use";
      } else {
        itemModalUseBtn.style.display = (owned > 0) ? "inline-block" : "none";
        itemModalUseBtn.disabled = !(owned > 0);
        itemModalUseBtn.textContent = `Use (${owned})`;
      }
    } else {
      itemModalUseBtn.style.display = "none";
      itemModalUseBtn.disabled = true;
      itemModalUseBtn.textContent = "Use";
    }
  }

  if (itemModalFooterEl) {
    if (Array.isArray(itemModalTargetBtns) && itemModalTargetBtns.length) {
      for (const b of itemModalTargetBtns) {
        if (b && b.parentNode) b.parentNode.removeChild(b);
      }
    }
    itemModalTargetBtns = [];

    const kk = String(k || "").trim().toLowerCase();
    const targetable = def.consumable && (
      kk.startsWith("consumable_") ||
      kk === "bandage" ||
      kk === "health_potion" ||
      kk === "mana_potion" ||
      kk === "phoenix_feather" ||
      kk === "tonic" ||
      kk === "elixir" ||
      kk === "ration" ||
      kk === "phoenix_draught" ||
      kk === "titanblood_elixir" ||
      kk === "sunfire_serum" ||
      kk === "aether_salve" ||
      kk === "ironbark_poultice"
    );

    const inCombat = !!state?.world?.pendingEvent && state.world.pendingEvent.kind === "combat" && state.world.pendingEvent.stage === "combat";
    let members = (itemModalMode !== "market" && targetable && state && ownedNow > 0)
      ? (Array.isArray(state.party?.members) ? state.party.members : [])
      : [];
    if (kk === "phoenix_feather") {
      members = inCombat ? members.filter((m) => m && m.id && (m.hp || 0) <= 0) : [];
    }

    for (const m of members) {
      if (!m || !m.id) continue;
      const btn = document.createElement("button");
      btn.className = "secondary";
      btn.textContent = `Use on ${m.name || "Companion"}`;
      btn.addEventListener("click", () => {
        if (!state) return;
        normalizeState(state);
        useStoryItem(k, m.id);
        updateItemModal();
      });
      itemModalFooterEl.appendChild(btn);
      itemModalTargetBtns.push(btn);
    }
  }

  if (itemModalEquipBtn) itemModalEquipBtn.style.display = "none";
  if (itemModalUnequipBtn) itemModalUnequipBtn.style.display = "none";
  if (itemModalMode !== "market" && state && isEquip) {
    normalizeState(state);
    const owned = ownedNow;
    const slot = equippedSlotForItem(state, k);
    if (slot) {
      if (itemModalUnequipBtn) {
        itemModalUnequipBtn.style.display = "inline-block";
        itemModalUnequipBtn.textContent = "Unequip";
        itemModalUnequipBtn.disabled = inCombat;
      }
    } else if (owned > 0) {
      if (itemModalEquipBtn) {
        itemModalEquipBtn.style.display = "inline-block";
        itemModalEquipBtn.textContent = "Equip";
        itemModalEquipBtn.disabled = inCombat;
      }
    }
  }
  syncSidebarButtons();
}

function closeItemModal() {
  if (itemModalEl) itemModalEl.classList.remove("open");
  if (itemModalEl) itemModalEl.style.display = "none";
  itemModalMode = null;
  itemModalKey = null;
}

function ensureAdvModal() {
  if (advModalEl) return;

  advModalEl = document.createElement("div");
  advModalEl.className = "modalOverlay";
  advModalEl.style.display = "none";

  const card = document.createElement("div");
  card.className = "modalCard";

  const top = document.createElement("div");
  top.className = "modalHeader";

  advModalTitleEl = document.createElement("div");
  advModalTitleEl.className = "panelTitle";
  advModalTitleEl.style.marginBottom = "0";

  const btnClose = document.createElement("button");
  btnClose.className = "secondary";
  btnClose.textContent = "Close";
  btnClose.addEventListener("click", () => closeAdvModal());

  top.appendChild(advModalTitleEl);
  top.appendChild(btnClose);

  advModalBodyEl = document.createElement("div");
  advModalBodyEl.className = "modalBody";

  card.appendChild(top);
  card.appendChild(advModalBodyEl);

  advModalEl.appendChild(card);
  advModalEl.addEventListener("click", (e) => {
    if (e.target === advModalEl) closeAdvModal();
  });
  document.body.appendChild(advModalEl);
}

function closeAdvModal() {
  if (advModalEl) advModalEl.classList.remove("open");
  if (advModalEl) advModalEl.style.display = "none";
}

function renderAdvModalBody(s) {
  if (!advModalBodyEl || !s) return;
  normalizeState(s);
  const t = nowMs();
  const day = s.world?.day || 1;
  const weather = s.world?.weather || "Clear";
  const char = characterSummary(s);
  const pSize = partySize(s);
  const st = effectiveStats(s);
  const eq = totalEquipmentBonuses(s);

  const repGuild = s.reputation?.Guild || 0;
  const repRebels = s.reputation?.Rebels || 0;
  const repCrown = s.reputation?.Crown || 0;
  const repWilds = s.reputation?.Wilds || 0;

  const effects = activeEffects().map((e) => {
    const left = Math.max(0, Math.ceil((e.expiresAt - t) / 1000));
    return { key: e.key, left };
  });

  const learned = s.skills?.learned || {};
  const learnedKeys = Object.keys(learned).filter((k) => !!learned[k]);
  learnedKeys.sort((a, b) => {
    const da = skillDef(a);
    const db = skillDef(b);
    return String(da.label || da.key).localeCompare(String(db.label || db.key));
  });
  const skillCount = learnedKeys.length;
  const skillPreview = learnedKeys.slice(0, 28).map((k) => {
    const def = skillDef(k);
    const rank = Math.max(1, Math.floor(learned[k] || 1));
    return `${def.label} (Lv ${rank})`;
  });

  const eqLine = (slotKey) => {
    const k = s.equipment?.[slotKey];
    if (!k) return "(none)";
    const b = itemBonusSummary(k);
    return `${itemLabel(k)}${b ? ` (${b})` : ""}`;
  };

  advModalBodyEl.innerHTML = "";

  const hero = document.createElement("div");
  hero.className = "advHero";
  const title = document.createElement("div");
  title.className = "advHeadline";
  title.textContent = `${s.profile} — ${char}`;
  const sub = document.createElement("div");
  sub.className = "advSub";
  sub.textContent = `Level ${s.level} • XP ${s.xp}/${xpToNext(s.level)} • Day ${day} (${weather}) • Party ${pSize}`;
  const pills = document.createElement("div");
  pills.className = "advPills";
  const pill = (txt) => {
    const d = document.createElement("div");
    d.className = "pill";
    d.textContent = txt;
    return d;
  };
  pills.appendChild(pill(`XP ${s.xp}/${xpToNext(s.level)}`));
  pills.appendChild(pill(`HP ${s.hp}/${playerMaxHp()}`));
  pills.appendChild(pill(`Mana ${s.mana}/${playerMaxMana()}`));
  pills.appendChild(pill(`Gold ${s.gold}`));
  pills.appendChild(pill(`Skill Pts ${s.skillPoints || 0}`));
  pills.appendChild(pill(`Skills ${skillCount}`));
  pills.appendChild(pill(`Effects ${effects.length}`));
  hero.appendChild(title);
  hero.appendChild(sub);
  hero.appendChild(pills);
  advModalBodyEl.appendChild(hero);

  const grid = document.createElement("div");
  grid.className = "advGrid";
  const section = (label) => {
    const wrap = document.createElement("div");
    wrap.className = "advSection";
    const h = document.createElement("div");
    h.className = "advSectionTitle";
    h.textContent = label;
    wrap.appendChild(h);
    return wrap;
  };
  const line = (k, v) => {
    const row = document.createElement("div");
    row.className = "advLine";
    const kk = document.createElement("div");
    kk.className = "advKey";
    kk.textContent = k;
    const vv = document.createElement("div");
    vv.className = "advValue";
    vv.textContent = v;
    row.appendChild(kk);
    row.appendChild(vv);
    return row;
  };

  const sStats = section("Stats");
  sStats.appendChild(line("Strength", String(st.strength || 0)));
  sStats.appendChild(line("Cunning", String(st.cunning || 0)));
  sStats.appendChild(line("Arcana", String(st.arcana || 0)));
  sStats.appendChild(line("Resilience", String(st.resilience || 0)));
  grid.appendChild(sStats);

  const sCombat = section("Combat");
  sCombat.appendChild(line("Dmg Bonus", `+${eq.dmgFlat || 0}, x${(eq.dmgMult || 1).toFixed(2)}`));
  sCombat.appendChild(line("Dmg Taken", `x${(eq.damageTakenMult || 1).toFixed(2)}`));
  grid.appendChild(sCombat);

  const sRep = section("Reputation");
  sRep.appendChild(line("Guild", String(repGuild)));
  sRep.appendChild(line("Rebels", String(repRebels)));
  sRep.appendChild(line("Crown", String(repCrown)));
  sRep.appendChild(line("Wilds", String(repWilds)));
  grid.appendChild(sRep);

  const sEquip = section("Equipment");
  sEquip.appendChild(line("Weapon", eqLine("weapon")));
  sEquip.appendChild(line("Armor 1", eqLine("armor1")));
  sEquip.appendChild(line("Armor 2", eqLine("armor2")));
  sEquip.appendChild(line("Armor 3", eqLine("armor3")));
  sEquip.appendChild(line("Armor 4", eqLine("armor4")));
  sEquip.appendChild(line("Accessory 1", eqLine("accessory1")));
  sEquip.appendChild(line("Accessory 2", eqLine("accessory2")));
  grid.appendChild(sEquip);

  const sEffects = section("Effects");
  if (!effects.length) {
    sEffects.appendChild(line("Active", "None"));
  } else {
    const wrap = document.createElement("div");
    wrap.className = "advWrap";
    wrap.textContent = effects.map((e) => `${e.key} (${e.left}s)`).join(", ");
    sEffects.appendChild(wrap);
  }
  grid.appendChild(sEffects);

  advModalBodyEl.appendChild(grid);

  const sSkills = document.createElement("div");
  sSkills.className = "advSection";
  const sSkillsTitle = document.createElement("div");
  sSkillsTitle.className = "advSectionTitle";
  sSkillsTitle.textContent = "Skills";
  const sSkillsBody = document.createElement("div");
  sSkillsBody.className = "advWrap";
  if (!skillCount) {
    sSkillsBody.textContent = "None";
  } else {
    const more = skillCount - skillPreview.length;
    sSkillsBody.textContent = more > 0
      ? `${skillPreview.join(", ")} … (+${more} more)`
      : skillPreview.join(", ");
  }
  sSkills.appendChild(sSkillsTitle);
  sSkills.appendChild(sSkillsBody);
  advModalBodyEl.appendChild(sSkills);
}

function adventurerDetailsText(s) {
  if (!s) return "";
  normalizeState(s);
  const day = s.world?.day || 1;
  const weather = s.world?.weather || "Clear";
  const effects = activeEffects().map((e) => e.key).join(", ") || "None";
  const char = characterSummary(s);
  const repGuild = s.reputation?.Guild || 0;
  const repRebels = s.reputation?.Rebels || 0;
  const repCrown = s.reputation?.Crown || 0;
  const pSize = partySize(s);
  const st = effectiveStats(s);
  const eq = totalEquipmentBonuses(s);
  const eqWeapon = s.equipment?.weapon ? `${itemLabel(s.equipment.weapon)}${itemBonusSummary(s.equipment.weapon) ? ` (${itemBonusSummary(s.equipment.weapon)})` : ""}` : "(none)";
  const armorKeys = [s.equipment?.armor1, s.equipment?.armor2, s.equipment?.armor3, s.equipment?.armor4]
    .filter((k) => typeof k === "string" && k.trim());
  const eqArmor = armorKeys.length
    ? armorKeys.map((k) => `${itemLabel(k)}${itemBonusSummary(k) ? ` (${itemBonusSummary(k)})` : ""}`).join(" | ")
    : "(none)";
  const eqA1 = s.equipment?.accessory1 ? `${itemLabel(s.equipment.accessory1)}${itemBonusSummary(s.equipment.accessory1) ? ` (${itemBonusSummary(s.equipment.accessory1)})` : ""}` : "(none)";
  const eqA2 = s.equipment?.accessory2 ? `${itemLabel(s.equipment.accessory2)}${itemBonusSummary(s.equipment.accessory2) ? ` (${itemBonusSummary(s.equipment.accessory2)})` : ""}` : "(none)";
  const learned = s.skills?.learned || {};
  const learnedKeys = Object.keys(learned).filter((k) => !!learned[k]);
  learnedKeys.sort((a, b) => {
    const da = skillDef(a);
    const db = skillDef(b);
    return String(da.label || da.key).localeCompare(String(db.label || db.key));
  });
  const skillsLine = learnedKeys.length
    ? learnedKeys.map((k) => {
      const def = skillDef(k);
      const rank = Math.max(1, Math.floor(learned[k] || 1));
      return `${def.label} (Lv ${rank})`;
    }).join(", ")
    : "None";
  return [
    `Profile: ${s.profile}`,
    `Class: ${char}`,
    `Party: ${pSize}`,
    `Level: ${s.level}`,
    `XP: ${s.xp}/${xpToNext(s.level)}`,
    `HP: ${s.hp}/${maxHpForState(s)}`,
    `Mana: ${s.mana}/${maxManaForState(s)}`,
    `Gold: ${s.gold}`,
    `Strength: ${st.strength || 0}`,
    `Cunning: ${st.cunning || 0}`,
    `Arcana: ${st.arcana || 0}`,
    `Resilience: ${st.resilience || 0}`,
    `Weapon: ${eqWeapon}`,
    `Armor: ${eqArmor}`,
    `Accessory 1: ${eqA1}`,
    `Accessory 2: ${eqA2}`,
    `Dmg Bonus: +${eq.dmgFlat || 0}, x${(eq.dmgMult || 1).toFixed(2)}`,
    `Dmg Taken: x${(eq.damageTakenMult || 1).toFixed(2)}`,
    `Day: ${day} (${weather})`,
    `Effects: ${effects}`,
    `Skill Pts: ${s.skillPoints || 0}`,
    `Skills: ${skillsLine}`,
    `Guild: ${repGuild}`,
    `Rebels: ${repRebels}`,
    `Crown: ${repCrown}`,
  ].join("\n");
}

function openAdvModal() {
  if (!state) return;
  normalizeState(state);
  ensureAdvModal();
  if (advModalTitleEl) advModalTitleEl.textContent = "Adventurer Details";
  renderAdvModalBody(state);
  if (advModalEl) advModalEl.classList.add("open");
  if (advModalEl) advModalEl.style.display = "flex";
}

function hasEffectOnState(s, key) {
  if (!s || !s.effects) return false;
  const e = s.effects[key];
  if (!e || typeof e.expiresAt !== "number") return false;
  return e.expiresAt > nowMs();
}

function effectBonusForStat(s, statKey) {
  if (!s) return 0;
  const k = String(statKey || "").trim().toLowerCase();
  if (!k) return 0;
  let bonus = 0;
  // Strong impactful bonuses - each effect now does something noticeable
  if (k === "strength" && hasEffectOnState(s, "titanblood")) bonus += 0.14; // +14% str checks, + damage
  if (k === "strength" && hasEffectOnState(s, "rested")) bonus += 0.03;
  if (k === "cunning" && hasEffectOnState(s, "rested")) bonus += 0.03;
  if (k === "arcana" && hasEffectOnState(s, "rested")) bonus += 0.03;
  if (k === "resilience" && hasEffectOnState(s, "rested")) bonus += 0.03;

  if (k === "arcana" && hasEffectOnState(s, "sunfire")) bonus += 0.12;
  if (k === "arcana" && hasEffectOnState(s, "mindglass")) bonus += 0.10;
  if (k === "cunning" && hasEffectOnState(s, "shadowstep")) bonus += 0.14;
  if (k === "cunning" && hasEffectOnState(s, "mindglass")) bonus += 0.08;
  if (k === "cunning" && hasEffectOnState(s, "smokeveil")) bonus += 0.08;
  if (k === "resilience" && hasEffectOnState(s, "ironbark")) bonus += 0.12;
  if (k === "resilience" && hasEffectOnState(s, "wyrmhide")) bonus += 0.10;
  if (k === "resilience" && hasEffectOnState(s, "voidsalt")) bonus += 0.08;
  if (k === "cunning" && hasEffectOnState(s, "torchlight")) bonus += 0.08;
  if (k === "cunning" && hasEffectOnState(s, "hasted")) bonus += 0.12;
  if (k === "strength" && hasEffectOnState(s, "hasted")) bonus += 0.05;
  if (k === "resilience" && hasEffectOnState(s, "hydrated")) bonus += 0.06;
  if (k === "resilience" && hasEffectOnState(s, "well_fed")) bonus += 0.06;
  if (k === "cunning" && hasEffectOnState(s, "stormseed")) bonus += 0.06;
  if (k === "strength" && hasEffectOnState(s, "stormseed")) bonus += 0.08;
  if (k === "arcana" && hasEffectOnState(s, "aether")) bonus += 0.04;

  // Debuffs reduce stats - each debuff now does something meaningful
  if (k === "strength" && hasEffectOnState(s, "bleeding")) bonus -= 0.05;
  if (k === "resilience" && hasEffectOnState(s, "poisoned")) bonus -= 0.06;
  if (k === "arcana" && hasEffectOnState(s, "cursed")) bonus -= 0.10;
  if (k === "cunning" && hasEffectOnState(s, "cursed")) bonus -= 0.05;

  // New debuffs with situations
  if (k === "strength" && hasEffectOnState(s, "weak")) bonus -= 0.12; // weak: overexertion, titanblood crash, bleeding long
  if (k === "cunning" && hasEffectOnState(s, "dazed")) bonus -= 0.12; // dazed: failed cunning check, heavy hit, mindglass overdose
  if (k === "arcana" && hasEffectOnState(s, "drained")) bonus -= 0.12; // drained: low mana, sunfire/aether expiry, cursed
  if (k === "resilience" && hasEffectOnState(s, "brittle")) bonus -= 0.10; // brittle: shield breaks, heavy damage >30% HP
  if (k === "cunning" && hasEffectOnState(s, "brittle")) bonus -= 0.04;
  if (k === "strength" && hasEffectOnState(s, "frostbitten")) bonus -= 0.06; // frostbitten: wilds/marsh/ruins without torch/warm
  if (k === "cunning" && hasEffectOnState(s, "frostbitten")) bonus -= 0.06;
  if (k === "resilience" && hasEffectOnState(s, "scorched")) bonus -= 0.07; // scorched: vault fire, sunfire overuse, fire trap
  if (k === "strength" && hasEffectOnState(s, "scorched")) bonus -= 0.05;
  if (k === "cunning" && hasEffectOnState(s, "entangled")) bonus -= 0.10; // entangled: marsh foraging fail, wilds
  if (k === "strength" && hasEffectOnState(s, "entangled")) bonus -= 0.06;
  if (k === "cunning" && hasEffectOnState(s, "fear")) bonus -= 0.08; // fear: hollow child, ruins/vault fail, omen
  if (k === "resilience" && hasEffectOnState(s, "fear")) bonus -= 0.06;
  if (k === "arcana" && hasEffectOnState(s, "fear")) bonus -= 0.06;

  // New permanent debuffs - stronger penalties, no timer, stays until cured by specific person/item
  if (hasEffectOnState(s, "withered")) {
    if (k === "strength") bonus -= 0.15;
    if (k === "resilience") bonus -= 0.10;
    if (k === "cunning") bonus -= 0.05;
  }
  if (hasEffectOnState(s, "hollowed")) {
    if (k === "arcana") bonus -= 0.14;
    if (k === "cunning") bonus -= 0.10;
    if (k === "resilience") bonus -= 0.04;
  }
  if (hasEffectOnState(s, "branded")) {
    if (k === "cunning") bonus -= 0.08;
    if (k === "resilience") bonus -= 0.08;
    if (k === "strength") bonus -= 0.04;
  }
  if (hasEffectOnState(s, "shadowbound")) {
    if (k === "arcana") bonus -= 0.12;
    if (k === "cunning") bonus -= 0.08;
    if (k === "resilience") bonus -= 0.06;
  }
  if (hasEffectOnState(s, "soulfractured")) {
    if (k === "arcana") bonus -= 0.10;
    if (k === "resilience") bonus -= 0.12;
    if (k === "strength") bonus -= 0.06;
  }
  if (hasEffectOnState(s, "rusted")) {
    if (k === "resilience") bonus -= 0.14;
    if (k === "strength") bonus -= 0.06;
  }

  return clamp(bonus, -0.55, 0.30);
}

function useItem(itemKey, ev, targetId) {
  if (!state) return false;
  normalizeState(state);
  const k = String(itemKey || "").trim();
  if (!k) return false;
  const def = itemDef(k);
  if (!def.consumable) {
    appendLog("That item can't be used.");
    render();
    return false;
  }

  const combatEv = (ev && ev.kind === "combat") ? ev : (state.world?.pendingEvent?.kind === "combat" ? state.world.pendingEvent : null);
  const inCombat = !!combatEv && combatEv.stage === "combat";

  const logLine = (line) => {
    if (inCombat) pushCombatLog(combatEv, line);
    else appendLog(line);
  };

  const desiredTargetId = String(targetId || "").trim();
  const targetIsCompanion = desiredTargetId && desiredTargetId !== "player";

  if (!consumeInvItem(state, k, 1)) {
    logLine("You don't have that item.");
    if (inCombat) renderPendingEvent();
    else render();
    return false;
  }

  if (k === "phoenix_feather") {
    if (!inCombat) {
      addInvItem(state, k, 1);
      logLine("You can only use that in battle.");
      render();
      return false;
    }
    if (!targetIsCompanion) {
      addInvItem(state, k, 1);
      logLine("You can only revive a fallen companion.");
      renderPendingEvent();
      return false;
    }
    const c = (typeof findPartyMemberById === "function") ? findPartyMemberById(state, desiredTargetId) : null;
    if (!c) {
      addInvItem(state, k, 1);
      logLine("No such companion.");
      renderPendingEvent();
      return false;
    }
    if ((c.hp || 0) > 0) {
      addInvItem(state, k, 1);
      logLine("That companion is not down.");
      renderPendingEvent();
      return false;
    }
    const reviveHp = Math.max(1, Math.floor(c.maxHp || 1));
    c.hp = reviveHp;
    if ((c.maxMana || 0) > 0) c.mana = Math.max(0, Math.floor(c.maxMana || 0));
    logLine(`🔥 You use a Phoenix Feather on ${c.name || "Companion"}. They rise again fully restored.`);
    autoSave();
    renderPendingEvent();
    return true;
  }

  if (targetIsCompanion && typeof healPartyTarget === "function") {
    const companion = (typeof findPartyMemberById === "function") ? findPartyMemberById(state, desiredTargetId) : null;
    const targetName = companion?.name || "Companion";
    const kk = k.toLowerCase();

    const res = playerStat("resilience");
    const arc = playerStat("arcana");

    if (kk.startsWith("consumable_")) {
      const m = /^consumable_(\d\d\d)$/i.exec(kk);
      const n = m ? clamp(parseInt(m[1], 10), 1, 200) : (1 + (hashString(kk) % 200));
      const ingredient = (n - 1) % 20;
      const form = Math.floor((n - 1) / 20) % 10;
      const roll01 = (salt) => ((hashString(`${kk}:${String(salt || "")}`) >>> 0) / 4294967295);

      if (form === 0) {
        const gain = Math.max(4, Math.floor(6 + arc * 0.7 + ingredient * 0.25 + roll01("mana") * 3));
        const did = (typeof restoreManaPartyTarget === "function") ? restoreManaPartyTarget(desiredTargetId, gain) : 0;
        logLine(`🧪 You use ${itemLabel(k)} on ${targetName} (+${did} mana).`);
      } else if (form === 1) {
        const heal = Math.max(1, Math.floor(2 + res * 0.25 + ingredient * 0.08 + roll01("heal") * 3));
        const did = healPartyTarget(desiredTargetId, heal);
        logLine(`🥃 You use ${itemLabel(k)} on ${targetName} (+${did} HP).`);
      } else if (form === 2) {
        const heal = Math.max(6, Math.floor(10 + res * 0.9 + ingredient * 0.35 + roll01("heal") * 6));
        const gain = Math.max(4, Math.floor(7 + arc * 0.7 + ingredient * 0.25 + roll01("mana") * 5));
        const didHp = healPartyTarget(desiredTargetId, heal);
        const didMana = (typeof restoreManaPartyTarget === "function") ? restoreManaPartyTarget(desiredTargetId, gain) : 0;
        logLine(`✨ You use ${itemLabel(k)} on ${targetName} (+${didHp} HP, +${didMana} mana).`);
      } else if (form === 3 || form === 4) {
        const heal = (form === 3)
          ? Math.max(4, Math.floor(7 + res * 0.7 + ingredient * 0.28 + roll01("heal") * 5))
          : Math.max(5, Math.floor(8 + res * 0.8 + ingredient * 0.30 + roll01("heal") * 5));
        const did = healPartyTarget(desiredTargetId, heal);
        logLine(`🧴 You use ${itemLabel(k)} on ${targetName} (+${did} HP).`);
      } else if (form === 5) {
        const gain = Math.max(2, Math.floor(3 + arc * 0.35 + ingredient * 0.12 + roll01("mana") * 3));
        const did = (typeof restoreManaPartyTarget === "function") ? restoreManaPartyTarget(desiredTargetId, gain) : 0;
        logLine(`🍵 You use ${itemLabel(k)} on ${targetName} (+${did} mana).`);
      } else {
        addInvItem(state, k, 1);
        logLine("That item can't be used on a companion.");
        if (inCombat) renderPendingEvent();
        else render();
        return false;
      }

      autoSave();
      if (inCombat) renderPendingEvent();
      else render();
      return true;
    }

    if (kk === "bandage") {
      const heal = 18 + res * 2;
      const did = healPartyTarget(desiredTargetId, heal);
      logLine(`🩹 You use a bandage on ${targetName} (+${did} HP).`);
      autoSave();
      if (inCombat) renderPendingEvent();
      else render();
      return true;
    }
    if (kk === "health_potion") {
      const heal = 26 + res * 3;
      const did = healPartyTarget(desiredTargetId, heal);
      logLine(`🧪 You use a health potion on ${targetName} (+${did} HP).`);
      autoSave();
      if (inCombat) renderPendingEvent();
      else render();
      return true;
    }
    if (kk === "mana_potion") {
      const gain = 18 + arc * 3;
      const did = (typeof restoreManaPartyTarget === "function") ? restoreManaPartyTarget(desiredTargetId, gain) : 0;
      logLine(`🟣 You use a mana potion on ${targetName} (+${did} mana).`);
      autoSave();
      if (inCombat) renderPendingEvent();
      else render();
      return true;
    }
    if (kk === "tonic") {
      const gain = 12 + arc * 2;
      const did = (typeof restoreManaPartyTarget === "function") ? restoreManaPartyTarget(desiredTargetId, gain) : 0;
      logLine(`🔹 You use a mana tonic on ${targetName} (+${did} mana).`);
      autoSave();
      if (inCombat) renderPendingEvent();
      else render();
      return true;
    }

    addInvItem(state, k, 1);
    logLine("That item can't be used on a companion.");
    if (inCombat) renderPendingEvent();
    else render();
    return false;
  }

  const res = playerStat("resilience");
  const arc = playerStat("arcana");
  const str = playerStat("strength");
  const cun = playerStat("cunning");

  const kk = k.toLowerCase();
  if (kk.startsWith("consumable_")) {
    const m = /^consumable_(\d\d\d)$/i.exec(kk);
    const n = m ? clamp(parseInt(m[1], 10), 1, 200) : (1 + (hashString(kk) % 200));
    const ingredient = (n - 1) % 20;
    const form = Math.floor((n - 1) / 20) % 10;
    const variant = ingredient % 3;
    const roll01 = (salt) => ((hashString(`${kk}:${String(salt || "")}`) >>> 0) / 4294967295);
    const dur = 14000 + ingredient * 650 + Math.floor(roll01("dur") * 5000);

    if (form === 0) {
      const gain = Math.max(4, Math.floor(6 + arc * 0.7 + ingredient * 0.25 + roll01("mana") * 3));
      state.mana = Math.min(playerMaxMana(), (state.mana || 0) + gain);
      if (variant === 0) addEffect("sunfire", dur);
      else if (variant === 1) addEffect("mindglass", dur);
      else addEffect("hydrated", dur);
      logLine(`🧪 You drink ${itemLabel(k)} (+${gain} mana).`);
    } else if (form === 1) {
      addEffect("hasted", dur);
      const heal = Math.max(1, Math.floor(2 + res * 0.25 + ingredient * 0.08 + roll01("heal") * 3));
      state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
      if (inCombat) {
        if (variant === 0) {
          combatEv.escapeBoost = Math.max(combatEv.escapeBoost || 0, clamp(0.10 + cun * 0.002 + ingredient * 0.0015 + roll01("esc") * 0.06, 0.08, 0.45));
          combatEv.escapeBoostTurns = Math.max(combatEv.escapeBoostTurns || 0, 2);
        } else if (variant === 1) {
          combatEv.partyDmgBoost = Math.max(combatEv.partyDmgBoost || 0, clamp(0.08 + str * 0.002 + ingredient * 0.0015 + roll01("boost") * 0.06, 0.06, 0.45));
          combatEv.partyDmgBoostTurns = Math.max(combatEv.partyDmgBoostTurns || 0, 2);
        } else {
          combatEv.escapeBoost = Math.max(combatEv.escapeBoost || 0, clamp(0.08 + cun * 0.0015 + roll01("esc") * 0.05, 0.06, 0.35));
          combatEv.escapeBoostTurns = Math.max(combatEv.escapeBoostTurns || 0, 2);
          combatEv.partyDmgBoost = Math.max(combatEv.partyDmgBoost || 0, clamp(0.06 + str * 0.0015 + roll01("boost") * 0.05, 0.05, 0.35));
          combatEv.partyDmgBoostTurns = Math.max(combatEv.partyDmgBoostTurns || 0, 2);
        }
      }
      logLine(`🥃 You drink ${itemLabel(k)} (+${heal} HP, Hasted).`);
    } else if (form === 2) {
      const heal = Math.max(6, Math.floor(10 + res * 0.9 + ingredient * 0.35 + roll01("heal") * 6));
      const gain = Math.max(4, Math.floor(7 + arc * 0.7 + ingredient * 0.25 + roll01("mana") * 5));
      state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
      state.mana = Math.min(playerMaxMana(), (state.mana || 0) + gain);
      if (variant === 0) {
        clearEffect("bleeding");
        addEffect("titanblood", dur);
      } else if (variant === 1) {
        clearEffect("bleeding");
        addEffect("rested", dur);
      } else {
        clearEffect("cursed");
        addEffect("well_fed", dur);
      }
      logLine(`✨ You drink ${itemLabel(k)} (+${heal} HP, +${gain} mana).`);
    } else if (form === 3) {
      const heal = Math.max(4, Math.floor(7 + res * 0.7 + ingredient * 0.28 + roll01("heal") * 5));
      state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
      if (variant === 0) addEffect("aether", dur + 4000);
      else if (variant === 1) addEffect("shielded", dur);
      else addEffect("voidsalt", Math.max(14000, dur - 2500));
      logLine(`🧴 You apply ${itemLabel(k)} (+${heal} HP).`);
    } else if (form === 4) {
      const heal = Math.max(5, Math.floor(8 + res * 0.8 + ingredient * 0.30 + roll01("heal") * 5));
      state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
      addEffect("shielded", dur);
      if (variant === 0) addEffect("ironbark", dur + 4000);
      else if (variant === 1) addEffect("wyrmhide", dur + 4000);
      else addEffect("rested", Math.max(12000, dur - 2000));
      logLine(`🌿 You use ${itemLabel(k)} (+${heal} HP).`);
    } else if (form === 5) {
      const gain = Math.max(2, Math.floor(3 + arc * 0.35 + ingredient * 0.12 + roll01("mana") * 3));
      state.mana = Math.min(playerMaxMana(), (state.mana || 0) + gain);
      addEffect("rested", dur + 4000);
      if (variant === 0) addEffect("mindglass", Math.max(12000, dur - 2000));
      else if (variant === 1) addEffect("sunfire", Math.max(12000, dur - 2000));
      else clearEffect("cursed");
      logLine(`🍵 You drink ${itemLabel(k)} (+${gain} mana, Rested).`);
    } else if (form === 6) {
      addEffect("mindglass", dur + 2000);
      if (inCombat) {
        const list = aliveEnemies(combatEv);
        const debuff = -clamp(0.10 + ingredient * 0.002 + roll01("acc") * 0.10, 0.10, 0.35);
        const turns = 1 + Math.floor(ingredient / 8);
        for (const e of list) {
          if (!e) continue;
          e.accMod = (typeof e.accMod === "number") ? Math.min(e.accMod, debuff) : debuff;
          e.accModTurns = Math.max(e.accModTurns || 0, turns);
        }
      }
      if (variant === 1) addEffect("shadowstep", Math.max(12000, dur - 2500));
      else if (variant === 2) addEffect("sunfire", Math.max(12000, dur - 2500));
      logLine(`🔍 You use ${itemLabel(k)} (Mindglass).`);
    } else if (form === 7) {
      addEffect("stormseed", dur + 2000);
      if (inCombat) {
        if (variant === 0) {
          combatEv.partyDmgBoost = Math.max(combatEv.partyDmgBoost || 0, clamp(0.10 + ingredient * 0.003 + roll01("boost") * 0.10, 0.10, 0.70));
          combatEv.partyDmgBoostTurns = Math.max(combatEv.partyDmgBoostTurns || 0, 1);
        } else if (variant === 1) {
          combatEv.escapeBoost = Math.max(combatEv.escapeBoost || 0, clamp(0.10 + ingredient * 0.003 + roll01("esc") * 0.10, 0.10, 0.70));
          combatEv.escapeBoostTurns = Math.max(combatEv.escapeBoostTurns || 0, 1);
        } else {
          combatEv.partyDmgBoost = Math.max(combatEv.partyDmgBoost || 0, clamp(0.06 + ingredient * 0.002 + roll01("boost") * 0.08, 0.06, 0.55));
          combatEv.partyDmgBoostTurns = Math.max(combatEv.partyDmgBoostTurns || 0, 1);
          combatEv.escapeBoost = Math.max(combatEv.escapeBoost || 0, clamp(0.06 + ingredient * 0.002 + roll01("esc") * 0.08, 0.06, 0.55));
          combatEv.escapeBoostTurns = Math.max(combatEv.escapeBoostTurns || 0, 1);
        }
      }
      logLine(`⚡ You use ${itemLabel(k)} (Stormseed).`);
    } else if (form === 8) {
      addEffect("shadowstep", dur + 2000);
      if (variant === 0) addEffect("smokeveil", Math.max(12000, dur - 2000));
      else if (variant === 1) {
        if (inCombat) {
          const list = aliveEnemies(combatEv);
          const debuff = -clamp(0.08 + ingredient * 0.002 + roll01("acc") * 0.08, 0.08, 0.28);
          const turns = 1 + Math.floor(ingredient / 10);
          for (const e of list) {
            if (!e) continue;
            e.accMod = (typeof e.accMod === "number") ? Math.min(e.accMod, debuff) : debuff;
            e.accModTurns = Math.max(e.accModTurns || 0, turns);
          }
        }
      } else {
        addEffect("torchlight", Math.max(12000, dur - 2000));
      }
      logLine(`🕯️ You burn ${itemLabel(k)} (Shadowstep).`);
    } else {
      addEffect("voidsalt", dur + 2000);
      if (variant === 0) clearEffect("cursed");
      else if (variant === 1) addEffect("ironbark", Math.max(12000, dur - 2000));
      else addEffect("shielded", Math.max(12000, dur - 2000));
      logLine(`🜂 You use ${itemLabel(k)} (Voidsalt).`);
    }
    autoSave();
    if (inCombat) renderPendingEvent();
    else render();
    return true;
  }

  if (k === "bandage") {
    const heal = 18 + res * 2;
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    const hadBleedPerm = !!(state.effects && state.effects["bleeding"]?.permanent);
    if (hadBleedPerm && Math.random() < 0.5) {
      // 50% chance bandage fails on permanent
      logLine(`🩹 Bandage (+${heal} HP) but deep bleeding persists - need Healer or Wyrmhide/Elixir!`);
    } else {
      clearEffect("bleeding");
      if (state.effects) delete state.effects["bleeding"];
      addEffect("shielded", 14000);
      logLine(hadBleedPerm ? `🩹 Bandage (+${heal} HP) miraculously stops PERMANENT bleeding! + Shielded.` : `🩹 You use a bandage (+${heal} HP) + Shielded.`);
    }
  } else if (k === "health_potion") {
    const heal = 26 + res * 3;
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    clearEffect("bleeding");
    logLine(`🧪 You drink a health potion (+${heal} HP).`);
  } else if (k === "mana_potion") {
    const gain = 18 + arc * 3;
    state.mana = Math.min(playerMaxMana(), (state.mana || 0) + gain);
    logLine(`🟣 You drink a mana potion (+${gain} mana).`);
  } else if (k === "tonic") {
    const gain = 12 + arc * 2;
    state.mana = Math.min(playerMaxMana(), (state.mana || 0) + gain);
    logLine(`🔹 You drink a mana tonic (+${gain} mana).`);
  } else if (k === "stamina_draught") {
    addEffect("hasted", 12000);
    if (inCombat) {
      combatEv.escapeBoost = Math.max(combatEv.escapeBoost || 0, 0.12 + cun * 0.004);
      combatEv.escapeBoostTurns = Math.max(combatEv.escapeBoostTurns || 0, 2);
      combatEv.partyDmgBoost = Math.max(combatEv.partyDmgBoost || 0, 0.10 + str * 0.004);
      combatEv.partyDmgBoostTurns = Math.max(combatEv.partyDmgBoostTurns || 0, 2);
    }
    logLine(`⚡ You drink a stamina draught. You feel faster.`);
  } else if (k === "antidote") {
    const hadP = hasEffectOnState(state, "poisoned");
    const hadC = hasEffectOnState(state, "cursed");
    const hadB = hasEffectOnState(state, "bleeding");
    const hadAny = hadP || hadC || hadB;
    clearEffect("poisoned");
    clearEffect("cursed");
    // Antidote now also helps bleeding slightly and can cure permanent if used twice
    if (hadB && Math.random() < 0.6) clearEffect("bleeding");
    // Clear paused versions too
    if (state.effects) {
      for (const kk of ["poisoned","cursed"]) if (state.effects[kk]?.pausedRemaining) delete state.effects[kk];
    }
    logLine(hadAny ? "🧴 You take an antidote. Ailments fade - poisoned/cursed cleared, bleeding may stop." : "🧴 You take an antidote - you feel clearer." );
  } else if (k === "elixir") {
    const heal = Math.max(12, Math.floor(18 + res * 1.6));
    const gain = Math.max(10, Math.floor(14 + arc * 1.6));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    state.mana = Math.min(playerMaxMana(), (state.mana || 0) + gain);
    // Elixir now cures ALL negative effects and can cure permanent cursed
    const cured = [];
    for (const deb of ["bleeding","poisoned","cursed"]) {
      if (hasEffectOnState(state, deb) || (state.effects && state.effects[deb])) { clearEffect(deb); if (state.effects) delete state.effects[deb]; cured.push(deb); }
    }
    // Also clear any permanent flag
    if (state.effects) {
      for (const kk of Object.keys(state.effects)) {
        if (state.effects[kk]?.permanent) { delete state.effects[kk]; cured.push(kk+"(perm)"); }
      }
    }
    addEffect("rested", 10000);
    addEffect("aether", 8000);
    logLine(cured.length ? `✨ You drink an elixir (+${heal} HP, +${gain} mana). Cured: ${cured.join(", ")} + Rested + Aether.` : `✨ You drink an elixir (+${heal} HP, +${gain} mana) + Rested.`);
  } else if (k === "ration") {
    const heal = Math.max(2, Math.floor(4 + res * 0.4));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    addEffect("well_fed", 10000);
    // Ration cures weak - situation: weak from overexertion/bleeding long
    if (hasEffectOnState(state, "weak")) { clearEffect("weak"); if (state.effects) delete state.effects["weak"]; logLine(`🍞 Rations cure Weak! (+${heal} HP) + Well Fed.`); }
    else logLine(`🍞 You eat rations (+${heal} HP) + Well Fed.`);
  } else if (k === "waterskin") {
    addEffect("hydrated", 12000);
    // Waterskin cures drained and scorched - situation: drained from low mana, scorched from vault heat
    let cured = [];
    if (hasEffectOnState(state, "drained")) { clearEffect("drained"); if (state.effects) delete state.effects["drained"]; cured.push("drained"); }
    if (hasEffectOnState(state, "scorched") && Math.random() < 0.6) { clearEffect("scorched"); if (state.effects) delete state.effects["scorched"]; cured.push("scorched"); }
    if (cured.length) logLine(`💧 Waterskin cures ${cured.join(", ")} + Hydrated.`);
    else logLine("💧 You drink from the waterskin + Hydrated.");
  } else if (k === "torch") {
    addEffect("torchlight", 12000);
    // Torch cures frostbitten, fear, entangled, dazed - situation: ruins_no_torch, marsh, wilds
    let cured = [];
    if (hasEffectOnState(state, "frostbitten")) { clearEffect("frostbitten"); if (state.effects) delete state.effects["frostbitten"]; cured.push("frostbitten"); }
    if (hasEffectOnState(state, "fear") && Math.random() < 0.7) { clearEffect("fear"); if (state.effects) delete state.effects["fear"]; cured.push("fear"); }
    if (hasEffectOnState(state, "entangled") && Math.random() < 0.6) { clearEffect("entangled"); if (state.effects) delete state.effects["entangled"]; cured.push("entangled"); }
    if (hasEffectOnState(state, "dazed") && Math.random() < 0.5) { clearEffect("dazed"); if (state.effects) delete state.effects["dazed"]; cured.push("dazed"); }
    if (cured.length) logLine(`🔥 Torch light cures ${cured.join(", ")} + Torchlight! Shadows pull back.`);
    else logLine("🔥 You light a torch. The shadows pull back + Torchlight.");

  } else if (k === "smoke_bomb") {
    if (inCombat) {
      const list = aliveEnemies(combatEv);
      for (const e of list) {
        e.accMod = (typeof e.accMod === "number") ? Math.min(e.accMod, -0.22) : -0.22;
        e.accModTurns = Math.max(e.accModTurns || 0, 2);
      }
      combatEv.escapeBoost = Math.max(combatEv.escapeBoost || 0, 0.22);
      combatEv.escapeBoostTurns = Math.max(combatEv.escapeBoostTurns || 0, 2);
      logLine("💨 Smoke blooms. Enemy aim falters." );
    } else {
      addEffect("smokeveil", 8000);
      logLine("💨 Smoke clings to you, dulling footsteps." );
    }
  } else if (k === "phoenix_draught") {
    state.hp = playerMaxHp();
    clearEffect("bleeding");
    addEffect("shielded", 18000);
    addEffect("rested", 10000);
    logLine("🔥 Phoenix Draught surges through you. Wounds refuse to linger." );
  } else if (k === "titanblood_elixir") {
    const heal = Math.max(8, Math.floor(14 + res * 1.2));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    addEffect("titanblood", 18000);
    logLine(`🩸 Titanblood hardens your will (+${heal} HP).`);
  } else if (k === "sunfire_serum") {
    state.mana = playerMaxMana();
    addEffect("sunfire", 14000);
    logLine("☀️ Sunfire floods your reserves. Magic feels clean." );
  } else if (k === "voidsalt_ampoule") {
    addEffect("voidsalt", 14000);
    clearEffect("cursed");
    if (state.effects && state.effects["cursed"]?.permanent) { delete state.effects["cursed"]; logLine("🜂 Voidsalt shatters a PERMANENT curse!"); }
    logLine("🜂 Voidsalt numbs pain and stills fear - cures cursed." );
  } else if (k === "wyrmhide_tonic") {
    addEffect("wyrmhide", 15000);
    // Wyrmhide can cure even permanent bleeding
    if (state.effects && state.effects["bleeding"]) {
      const wasPerm = !!state.effects["bleeding"].permanent;
      clearEffect("bleeding");
      delete state.effects["bleeding"];
      logLine(wasPerm ? "🐉 Wyrmhide heals DEEP permanent bleeding! Skin hardens." : "🐉 Wyrmhide toughens your skin - bleeding stopped.");
    } else {
      logLine("🐉 Wyrmhide toughens your skin.");
    }
  } else if (k === "aether_salve") {
    const heal = Math.max(6, Math.floor(12 + res * 1.0));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    addEffect("aether", 14000);
    logLine(`✨ Aether salve stings clean (+${heal} HP).`);
  } else if (k === "stormseed_powder") {
    addEffect("stormseed", 12000);
    logLine("⚡ Stormseed sparks in your veins. Reflexes sharpen." );
  } else if (k === "mindglass_vial") {
    addEffect("mindglass", 12000);
    logLine("🔍 Mindglass clears your thoughts. The world feels slow." );
  } else if (k === "shadowstep_incense") {
    addEffect("shadowstep", 12000);
    logLine("🕯️ Shadowstep incense wraps you in hush." );
  } else if (k === "ironbark_poultice") {
    const heal = Math.max(6, Math.floor(10 + res * 1.1));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    addEffect("ironbark", 15000);
    logLine(`🌿 Ironbark poultice steadies you (+${heal} HP).`);
  } else {
    logLine(`You use ${itemLabel(k)}.`);
  }

  autoSave();
  if (inCombat) renderPendingEvent();
  else render();
  return false;
}

