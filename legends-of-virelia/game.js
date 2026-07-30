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
    bump(primary, 1 + Math.floor(power * 0.7) + (h % 2));
    bump("strength", /(staff|wand)/i.test(kk) ? Math.floor(power * 0.3) : 0);
    bump("cunning", /(dagger|bow|crossbow)/i.test(kk) ? Math.floor(power * 0.3) : (h % 2));
    out.dmgMult = 1 + clamp(0.03 * power + ((h % 7) * 0.01), 0.03, 0.18);
    out.dmgFlat = 1 + power + (h % 3);
    if (/(staff|wand)/i.test(kk)) out.maxMana = 1 + power + (h % 4);
    return out;
  }

  if (group === "armor") {
    bump("resilience", 1 + Math.floor(power * 0.8) + (h % 2));
    out.maxHp = 3 + power * 4 + (h % 7);
    const red = clamp(0.03 * power + ((h % 5) * 0.01), 0.04, 0.22);
    out.damageTakenMult = 1 - red;
    if (/(cloak|boots)/i.test(kk)) bump("cunning", Math.floor(power * 0.4));
    if (/helm/i.test(kk)) bump("arcana", Math.floor(power * 0.3));
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
  if (k === "strength" && hasEffectOnState(s, "titanblood")) bonus += 0.06;
  if (k === "arcana" && hasEffectOnState(s, "sunfire")) bonus += 0.06;
  if (k === "arcana" && hasEffectOnState(s, "mindglass")) bonus += 0.04;
  if (k === "cunning" && hasEffectOnState(s, "shadowstep")) bonus += 0.06;
  if (k === "cunning" && hasEffectOnState(s, "mindglass")) bonus += 0.04;
  if (k === "cunning" && hasEffectOnState(s, "smokeveil")) bonus += 0.04;
  if (k === "resilience" && hasEffectOnState(s, "ironbark")) bonus += 0.06;
  if (k === "resilience" && hasEffectOnState(s, "wyrmhide")) bonus += 0.04;
  if (k === "resilience" && hasEffectOnState(s, "voidsalt")) bonus += 0.03;
  if (k === "cunning" && hasEffectOnState(s, "torchlight")) bonus += 0.02;
  if (k === "cunning" && hasEffectOnState(s, "hasted")) bonus += 0.02;
  if (k === "resilience" && hasEffectOnState(s, "hydrated")) bonus += 0.01;
  if (k === "resilience" && hasEffectOnState(s, "well_fed")) bonus += 0.01;
  if (hasEffectOnState(s, "rested")) bonus += 0.01;
  return clamp(bonus, 0, 0.12);
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
    clearEffect("bleeding");
    addEffect("shielded", 14000);
    logLine(`🩹 You use a bandage (+${heal} HP).`);
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
    clearEffect("poisoned");
    clearEffect("cursed");
    logLine((hadP || hadC) ? "🧴 You take an antidote. The sickness fades." : "🧴 You take an antidote." );
  } else if (k === "elixir") {
    const heal = Math.max(12, Math.floor(18 + res * 1.6));
    const gain = Math.max(10, Math.floor(14 + arc * 1.6));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    state.mana = Math.min(playerMaxMana(), (state.mana || 0) + gain);
    clearEffect("bleeding");
    clearEffect("poisoned");
    clearEffect("cursed");
    addEffect("rested", 10000);
    logLine(`✨ You drink an elixir (+${heal} HP, +${gain} mana).`);
  } else if (k === "ration") {
    const heal = Math.max(2, Math.floor(4 + res * 0.4));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    addEffect("well_fed", 10000);
    logLine(`🍞 You eat rations (+${heal} HP).`);
  } else if (k === "waterskin") {
    addEffect("hydrated", 12000);
    logLine("💧 You drink from the waterskin.");
  } else if (k === "torch") {
    addEffect("torchlight", 12000);
    logLine("🔥 You light a torch. The shadows pull back.");
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
    logLine("🜂 Voidsalt numbs pain and stills fear." );
  } else if (k === "wyrmhide_tonic") {
    addEffect("wyrmhide", 15000);
    clearEffect("bleeding");
    logLine("🐉 Wyrmhide toughens your skin." );
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

﻿function useStoryItem(itemKey, targetId) {
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

function xpToNext(level) {
  return level * 100;
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
  const amt = Math.max(0, Math.floor(amount || 0));
  state.xp += amt;
  while (state.xp >= xpToNext(state.level)) {
    state.xp -= xpToNext(state.level);
    state.level += 1;
    state.skillPoints = (state.skillPoints || 0) + 10;
    state.maxHp += 6;
    state.hp = Math.min(playerMaxHp(), state.hp + 6);
    state.mana = Math.min(playerMaxMana(), state.mana + 4);
    appendLog(`⭐ Level Up! You reached Level ${state.level}.`);
    appendLog("You gained 10 Skill Points.");
    queueLevelUpDraftLevel(state, state.level);
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

  if (!o.fromEffect && amount >= 8 && Math.random() < 0.35) {
    addEffect("bleeding", 15000);
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

  const baseHp = 18 + tier * 14 + (powerful ? 22 : 0) + (seed % 11);
  const atk = 4 + tier * 4 + (powerful ? 4 : 0) + (seed % 5);
  const acc = clamp(0.62 + tier * 0.03 + (powerful ? 0.05 : 0) + ((seed % 7) - 3) * 0.01, 0.55, 0.90);

  const requiresParty = tier >= 5 || (powerful && tier >= 4);
  const requiresPartySize = requiresParty ? 3 : (tier >= 4 ? 2 : 1);

  return {
    key: mobKey(idx),
    index: idx,
    name,
    tier,
    powerful,
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
  const baseTier = clamp(1 + Math.floor((lvl - 1) / 4), 1, 5);
  const bumpChance = lvl >= 16 ? 0.24 : 0.18;
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
  const expected = 1 + (tier - 1) * 4;
  const over = Math.max(0, lvl - expected);
  if (over <= 0) return enemy;

  const kind = String(encounterKind || "").toLowerCase();
  const isQuest = kind === "mission" || kind === "side";

  const hpRate = isQuest ? 0.08 : 0.12;
  const atkRate = isQuest ? 0.06 : 0.08;
  const accRate = isQuest ? 0.008 : 0.010;

  const powerfulBonus = enemy.powerful ? 1 : 0;
  const hpMul = clamp((1 + over * hpRate) * (1 + powerfulBonus * 0.08), 1, isQuest ? 2.30 : 2.80);
  const atkMul = clamp((1 + over * atkRate) * (1 + powerfulBonus * 0.07), 1, isQuest ? 1.85 : 2.00);
  const accAdd = clamp(over * accRate + powerfulBonus * 0.01, 0, isQuest ? 0.10 : 0.12);

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

  const tier = Math.max(1, Math.floor(def.tier || 1));
  const pow = def.powerful ? 1 : 0;
  const focus = String(def.focus || "").toLowerCase();
  const eq = totalEquipmentBonuses(state);
  const v = skillVariantForDef(def, 5);
  const dmgScalar = 0.85 + skillRoll01(def, "dmg") * 0.30;

  if (focus === "strength") {
    const base = 6 + playerStat("strength") * 1.1;
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
    const base = 10 + playerStat("arcana") * 1.4;
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
    const count = clamp(8 + (seed % 4), 8, 11);
    const enemies = [];
    for (let i = 0; i < count; i++) {
      const def = mobDef(pickTierIdx(7 + i * 3));
      const e = { ...def, hp: def.maxHp };
      e.maxHp = Math.max(12, Math.floor((e.maxHp || 10) * 1.10 + 16));
      e.hp = e.maxHp;
      e.atk = Math.max(4, Math.floor((e.atk || 5) * 1.10 + 6));
      e.acc = clamp((e.acc || 0.72) + 0.02, 0.55, 0.93);
      if (i === 0 && Math.random() < 0.65) e.powerful = true;
      scaleEnemyForPlayerLevel(e, s, "siege");
      enemies.push(e);
    }
    ev.enemies = enemies;
    ev.log = [
      "🏰 Crossroads Siege — The Hostel.",
      "A horde crashes into the streets. You brace at the hostel steps.",
      "Dozens of adventurers rally beside you.",
    ];
    return ev;
  }

  const base = mobDef(pickTierIdx(33));
  const boss = { ...base, hp: base.maxHp };
  boss.powerful = true;
  boss.name = `Overlord ${base.name}`;
  boss.maxHp = Math.max(120, Math.floor((boss.maxHp || 40) * 4.6 + 420));
  boss.hp = boss.maxHp;
  boss.atk = Math.max(18, Math.floor((boss.atk || 8) * 2.15 + 22));
  boss.acc = clamp((boss.acc || 0.75) + 0.10, 0.60, 0.95);
  boss.siegeBoss = true;
  boss.siegeBossHealCd = 0;
  scaleEnemyForPlayerLevel(boss, s, "siege");

  ev.enemies = [boss];
  ev.log = [
    "🔥 Crossroads Siege — The Overlord.",
    "The horde breaks… and something larger steps through the smoke.",
    "This ends here.",
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
  state.flags["exile:seed"] = seed;
  state.flags["exile:riskMissionsLeft"] = 5;

  state.completed = { missions: {}, side: {} };
  if (typeof genMissions === "function") state.missions = genMissions(MISSION_COUNT, seed);
  if (typeof genSideQuests === "function") state.sideQuests = genSideQuests(SIDE_QUEST_COUNT, seed);
  if (typeof marketStockCache !== "undefined") marketStockCache = null;

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

function partyAutoAttack(ev) {
  if (!state || !ev) return;
  const enemies = aliveEnemies(ev);
  if (!enemies.length) return;
  const target = enemies[0];

  let boost = (ev.partyDmgBoostTurns || 0) > 0 ? (1 + (ev.partyDmgBoost || 0)) : 1;
  if (hasEffectOnState(state, "stormseed")) boost *= 1.12;

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
    const acc = clamp((e.acc || 0.7) + accMod, 0.25, 0.95);
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
          } else {
            state.flags["siege:crossroads:completed"] = true;
            pushCombatLog(ev, `🏆 Siege reward: +${baseXp} XP.`);
            gainXp(baseXp);
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
      const extra = (ev.escapeBoostTurns || 0) > 0 ? (ev.escapeBoost || 0) : 0;
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

  const extra = Math.max(0, Math.floor((lvl - 1) * 1.15) + Math.floor((lvl - 1) / 2));
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

  const baseHp = 30 + (p?.hpBonus || 0) + (b?.hpBonus || 0) + lvl * 6 + (stats.resilience || 0) * 4;
  const baseMana = 14 + (p?.manaBonus || 0) + (b?.manaBonus || 0) + lvl * 4 + (stats.arcana || 0) * 4;

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

function activeEffects() {
  if (!state || !state.effects) return [];
  const t = nowMs();
  return Object.values(state.effects)
    .filter((e) => e && typeof e.expiresAt === "number" && e.expiresAt > t)
    .sort((a, b) => a.expiresAt - b.expiresAt);
}

let lastEffectsSig = "";
function renderEffectsUi() {
  if (!state) {
    document.body.classList.remove("fx-bleeding", "fx-rested", "fx-cursed", "fx-poisoned", "fx-shielded");
    if (fxBadges) fxBadges.innerHTML = "";
    return;
  }
  normalizeState(state);
  pruneExpiredEffects();
  const list = activeEffects();
  const t = nowMs();

  const has = (k) => list.some((e) => e.key === k);
  document.body.classList.toggle("fx-bleeding", has("bleeding"));
  document.body.classList.toggle("fx-rested", has("rested"));
  document.body.classList.toggle("fx-cursed", has("cursed"));
  document.body.classList.toggle("fx-poisoned", has("poisoned"));
  document.body.classList.toggle("fx-shielded", has("shielded"));

  if (fxBadges) {
    fxBadges.innerHTML = "";
    for (const e of list) {
      const sec = Math.max(0, Math.ceil((e.expiresAt - t) / 1000));
      const div = document.createElement("div");
      div.className = "fxBadge";
      div.textContent = `${e.key} (${sec}s)`;
      fxBadges.appendChild(div);
    }
  }

  const sig = list.map((e) => `${e.key}:${Math.ceil((e.expiresAt - t) / 1000)}`).join("|");
  if (sig !== lastEffectsSig) {
    lastEffectsSig = sig;
    renderStats();
  }
}

function pruneExpiredEffects() {
  if (!state || !state.effects) return;
  const t = nowMs();
  let changed = false;
  const expired = [];
  for (const [k, e] of Object.entries(state.effects)) {
    if (!e || typeof e.expiresAt !== "number" || e.expiresAt <= t) {
      delete state.effects[k];
      changed = true;
      expired.push(k);
    }
  }
  if (expired.length) {
    for (let i = 0; i < expired.length; i++) playEffectSfx(expired[i], "expire", i * 70);
  }
  if (changed) {
    renderEffectsUi();
    renderStats();
    renderLog();
    autoSave();
  }
}

function tickEffects() {
  if (!state || !state.effects) return;
  pruneExpiredEffects();
  const t = nowMs();

  const bleed = state.effects.bleeding;
  if (bleed && typeof bleed.expiresAt === "number" && bleed.expiresAt > t) {
    if (typeof bleed.nextTickAt !== "number") bleed.nextTickAt = t + 5000;
    if (t >= bleed.nextTickAt) {
      const missed = Math.min(3, Math.floor((t - bleed.nextTickAt) / 5000) + 1);
      bleed.nextTickAt = bleed.nextTickAt + missed * 5000;
      const dealt = applyDamage(missed, { fromEffect: true }) || 0;
      playEffectSfx("bleeding", "tick");
      appendLog(`🩸 Bleeding hurts you (-${dealt} HP).`);
      renderStats();
      renderLog();
      autoSave();
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
        renderStats();
        renderLog();
        autoSave();
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
      appendLog(`☠️ Poison burns you (-${dealt} HP).`);
      renderStats();
      renderLog();
      autoSave();
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
    const recLevel = d.recLevel + Math.floor(i / 10);
    const xp = Math.max(1, Math.floor((d.baseXp || 0) + recLevel * (d.xpPerLevel || 0)));
    const gold = Math.max(0, Math.floor((d.baseGold || 0) + recLevel * (d.goldPerLevel || 0)));
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
    const minLevel = 1 + Math.floor(i / 15);
    const faction = FACTIONS[(i + 2) % FACTIONS.length];
    let place = places[i % places.length];
    if (seed) {
      const ha = (hashString(`town:${seed}:place:${i}:a`) >>> 0);
      const hb = (hashString(`town:${seed}:place:${i}:b`) >>> 0);
      place = `${exileA[ha % exileA.length]} ${exileB[hb % exileB.length]}`;
    }
    quests.push({
      id: `s${i + 1}`,
      kind: "side",
      title: `Side Quest ${i + 1}: ${sideQuestTitle(i, seed)}`,
      minLevel,
      faction,
      place,
      xp: 18 + Math.floor(i * 1.7),
      gold: 6 + Math.floor(i * 0.6),
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
    if (state.level + 4 < q.recLevel) return { ok: false, reason: `Too dangerous. ${difficultyGateText(q.recLevel, q.difficulty)}` };
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
  const base = 0.55;
  let chance = base + levelEdge * 0.05 + repEdge;
  if (getFlag("heardRumors")) chance += 0.03;
  if (approach === "scout") chance += 0.08;
  if (approach === "negotiate") chance += clamp(rep * 0.02, -0.08, 0.10);
  if (approach === "charge") chance -= 0.06;
  if (
    state
    && !isAdminProfile(state.profile)
    && !!state.flags?.["exile:active"]
    && Math.max(0, Math.floor(state.flags?.["exile:riskMissionsLeft"] || 0)) > 0
  ) {
    chance -= 0.10;
  }
  return clamp(chance, 0.15, 0.92);
}

function missionTierFromRecLevel(recLevel) {
  const lvl = Math.max(1, Math.floor(recLevel || 1));
  return clamp(1 + Math.floor((lvl - 1) / 4), 1, 5);
}

function missionTierForQuest(q) {
  const baseTier = missionTierFromRecLevel(q?.recLevel || 1);
  const dt = tierForDifficultyKey(q?.difficulty);
  const mod = dt - 2;
  return clamp(baseTier + mod, 1, 5);
}

function pickMissionMobForQuest(s, q) {
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
  const hpMul = dt <= 1 ? 0.95 : (dt === 2 ? 1.00 : (dt === 3 ? 1.18 : (dt === 4 ? 1.38 : 1.65)));
  const atkMul = dt <= 1 ? 0.96 : (dt === 2 ? 1.00 : (dt === 3 ? 1.14 : (dt === 4 ? 1.30 : 1.50)));
  const accAdd = dt <= 1 ? -0.01 : (dt === 2 ? 0.00 : (dt === 3 ? 0.02 : (dt === 4 ? 0.04 : 0.06)));
  for (const e of ev.enemies || []) {
    if (!e) continue;
    if (typeof e.maxHp === "number") e.maxHp = Math.max(1, Math.round(e.maxHp * hpMul));
    if (typeof e.hp === "number" && typeof e.maxHp === "number") e.hp = Math.min(e.maxHp, Math.round(e.hp * hpMul));
    if (typeof e.atk === "number") e.atk = Math.max(1, Math.round(e.atk * atkMul));
    if (typeof e.acc === "number") e.acc = clamp(e.acc + accAdd, 0.50, 0.94);
  }
}

function sideTierFromMinLevel(minLevel) {
  const lvl = Math.max(1, Math.floor(minLevel || 1));
  return clamp(1 + Math.floor((lvl - 1) / 4), 1, 5);
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
  const hpMul = dt <= 1 ? 0.96 : (dt === 2 ? 1.00 : (dt === 3 ? 1.10 : (dt === 4 ? 1.22 : 1.35)));
  const atkMul = dt <= 1 ? 0.97 : (dt === 2 ? 1.00 : (dt === 3 ? 1.08 : (dt === 4 ? 1.18 : 1.28)));
  const accAdd = dt <= 1 ? -0.01 : (dt === 2 ? 0.00 : (dt === 3 ? 0.015 : (dt === 4 ? 0.03 : 0.045)));
  for (const e of ev.enemies || []) {
    if (!e) continue;
    if (typeof e.maxHp === "number") e.maxHp = Math.max(1, Math.round(e.maxHp * hpMul));
    if (typeof e.hp === "number" && typeof e.maxHp === "number") e.hp = Math.min(e.maxHp, Math.round(e.hp * hpMul));
    if (typeof e.atk === "number") e.atk = Math.max(1, Math.round(e.atk * atkMul));
    if (typeof e.acc === "number") e.acc = clamp(e.acc + accAdd, 0.50, 0.94);
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
  const offers = [];
  const offerBases = new Set();
  const learned = s.skills?.learned || {};
  let tries = 0;
  while (offers.length < 6 && tries < 600) {
    tries += 1;
    const idx = 1 + Math.floor(Math.random() * SKILLS_PER_COMBO);
    const k = skillKeyFor(prof, build, idx);
    if (learned[k]) continue;
    if (offers.includes(k)) continue;
    if (typeof canLearnSkillByBaseLabel === "function" && !canLearnSkillByBaseLabel(s, k)) continue;
    const base = (typeof skillFamilyIdForKey === "function") ? String(skillFamilyIdForKey(k) || "").trim() : "";
    if (base && offerBases.has(base)) continue;
    offers.push(k);
    if (base) offerBases.add(base);
  }
  return {
    kind: "skillTrader",
    fromNode: s.nodeId || "crossroads",
    profession: prof,
    build,
    offers,
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
    enemyLine.textContent = enemies.map((e) => `${e.name}: ${Math.max(0, e.hp || 0)}/${e.maxHp}`).join(" | ");
    outputEl.appendChild(enemyLine);

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
        for (let i = 0; i < profSkills.length; i++) {
          const d = profSkills[i];
          buttons.push({
            label: d.label,
            className: d.powerful ? "" : "secondary",
            onChoose: () => combatPlayerAction(`skill:${d.key}`),
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
        for (let i = 0; i < buildSkills.length; i++) {
          const d = buildSkills[i];
          buttons.push({
            label: d.label,
            className: d.powerful ? "" : "secondary",
            onChoose: () => combatPlayerAction(`skill:${d.key}`),
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
  header.textContent = "A Skill Trader appears";
  outputEl.appendChild(header);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = `A masked trader offers techniques suited to your path. You can spend Skill Points to learn them. Skill Points: ${state.skillPoints || 0}`;
  outputEl.appendChild(hint);

  const list = document.createElement("div");
  list.className = "skillList";
  const seenBases = new Set();
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
    meta.textContent = `${titleCaseWord(def.focus)} • Tier ${def.tier}${def.powerful ? " • Powerful" : ""} • Cost ${skillPointCost(def)} SP`;
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
    buy.textContent = "Learn";
    const canLearn = (typeof canLearnSkillByBaseLabel === "function") ? canLearnSkillByBaseLabel(state, def.key) : true;
    buy.disabled = (state.skillPoints || 0) < skillPointCost(def) || !!state.skills.learned[def.key] || !canLearn;
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

function statValue(s, key) {
  if (!s || !s.stats) return 0;
  const k = String(key || "").trim();
  if (!k) return 0;
  if (state && s === state && (k === "strength" || k === "cunning" || k === "arcana" || k === "resilience")) {
    return playerStat(k);
  }

  const v = s.stats[k];
  return (typeof v === "number" && Number.isFinite(v)) ? v : 0;
}

function titleCaseWord(w) {
  const t = String(w || "");
  if (!t) return "";
  return t[0].toUpperCase() + t.slice(1);
}

function resolveChoiceChance(ch, s) {
  if (!ch) return null;

  if (ch.check && ch.check.stat) {
    const stat = statValue(s, ch.check.stat);
    const base = (typeof ch.check.base === "number") ? ch.check.base : 0.5;
    const per = (typeof ch.check.per === "number") ? ch.check.per : 0.04;
    const min = (typeof ch.check.min === "number") ? ch.check.min : 0.15;
    const max = (typeof ch.check.max === "number") ? ch.check.max : 0.92;
    const bonus = (typeof ch.check.bonus === "function") ? ch.check.bonus(s) : ((typeof ch.check.bonus === "number") ? ch.check.bonus : 0);
    const skillBonus = skillChanceBonusForStat(s, ch.check.stat);
    const fxBonus = effectBonusForStat(s, ch.check.stat);
    return clamp(base + stat * per + bonus + skillBonus + fxBonus, min, max);
  }

  const raw = (typeof ch.chance === "function") ? ch.chance(s) : ch.chance;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return clamp(raw, 0, 1);
}

function choiceCheckLabel(ch) {
  if (!ch) return "Risk roll";
  if (typeof ch.rollLabel === "string" && ch.rollLabel.trim()) return ch.rollLabel.trim();
  if (ch.check && ch.check.stat) return `${titleCaseWord(ch.check.stat)} check`;
  return "Risk roll";
}

function runStoryChoice(ch) {
  if (!state) return;
  if (guardLevelUpDraft()) return;
  normalizeState(state);

  const carryIn = Array.isArray(state.logCarry) ? state.logCarry.slice(0) : [];
  const outcomeLines = [];

  if (typeof ch?.require === "function") {
    const ok = ch.require(state);
    if (!ok) {
      render();
      return;
    }
  }

  const chance = resolveChoiceChance(ch, state);
  if (typeof chance === "number") {
    const roll = Math.random();
    const label = choiceCheckLabel(ch);
    const rollLine = `${label}… (Success chance ~${Math.round(chance * 100)}%, roll ${Math.round(roll * 100)})`;
    appendLog(rollLine);
    outcomeLines.push(rollLine);

    const success = roll <= chance;
    const ffRaw = !success
      ? ((typeof ch.failForward === "function") ? ch.failForward(state) : (ch.failForward || null))
      : null;
    const ff = (ffRaw && typeof ffRaw === "object") ? ffRaw : null;
    const outcome = success ? (ch.success || null) : (ff || ch.fail || null);

    const verdict = success ? "✅ Success." : (ff ? "⚠️ Setback." : "❌ Failure.");
    appendLog(verdict);
    outcomeLines.push(verdict);

    if (outcome && typeof outcome.text === "string" && outcome.text.trim()) {
      appendLog(outcome.text);
      outcomeLines.push(outcome.text);
    }
    if (typeof ch.effect === "function") ch.effect(state);
    if (outcome && typeof outcome.effect === "function") outcome.effect(state);

    const next = (outcome && outcome.next) ? outcome.next : ch.next;
    if (next) {
      const cur = Array.isArray(state.log) ? state.log.slice(0) : [];
      state.logCarry = carryIn.concat(cur).slice(-12);
      enterNode(next);
    } else {
      if (carryIn.length) {
        const cur = (state.log || []).slice(0);
        clearLog();
        for (const ln of carryIn) appendLog(ln);
        for (const ln of cur) appendLog(ln);
      }
      render();
    }
    autoSave();
    return;
  }

  if (typeof ch.effect === "function") ch.effect(state);
  if (ch.next) {
    const cur = Array.isArray(state.log) ? state.log.slice(0) : [];
    state.logCarry = carryIn.concat(cur).slice(-12);
    enterNode(ch.next);
  } else {
    if (carryIn.length) {
      const cur = (state.log || []).slice(0);
      clearLog();
      for (const ln of carryIn) appendLog(ln);
      for (const ln of cur) appendLog(ln);
      state.logCarry = [];
    }
    render();
  }
  autoSave();
}

function showChoices(choices) {
  clearChoices();
  const isRested = !!(state && typeof hasEffectOnState === 'function' && hasEffectOnState(state, "rested"));
  const isInCombat = !!(state && typeof isCombatActive === 'function' && isCombatActive(state));
  const isInDraft = !!(state && typeof hasActiveLevelUpDraft === 'function' && hasActiveLevelUpDraft(state));
  
  for (const c of choices) {
    const b = document.createElement("button");
    b.textContent = c.label;
    if (c.className) b.className = c.className;
    // Disable all actions when resting (except back/cancel/close/leave to allow navigation, but main actions blocked)
    if (c.disabled) {
      b.disabled = true;
    } else if (isRested && !isInCombat && !isInDraft) {
      const labelLower = String(c.label||"").toLowerCase();
      const isBack = labelLower.includes("back") || labelLower.includes("cancel") || labelLower.includes("close") || labelLower.includes("leave") || labelLower.includes("town") || labelLower.includes("crossroads") || labelLower.includes("gate");
      // Block main gameplay actions during rest, allow only back/cancel type
      if (!isBack) {
        b.disabled = true;
        b.title = "Resting... All actions paused until rested ends";
      }
    }
    b.addEventListener("click", () => {
      if (guardLevelUpDraft()) return;
      if (state && typeof hasEffectOnState === 'function' && hasEffectOnState(state, "rested") && !isInCombat && !isInDraft) {
        const labelLower = String(c.label||"").toLowerCase();
        const isBack = labelLower.includes("back") || labelLower.includes("cancel") || labelLower.includes("close") || labelLower.includes("leave") || labelLower.includes("town") || labelLower.includes("crossroads") || labelLower.includes("gate");
        if (!isBack && !c.disabled) {
          appendLog("You are resting. All actions paused until rested ends.");
          render();
          return;
        }
      }
      const inEvent = !!(state && state.world && state.world.pendingEvent);
      if (!inEvent) {
        const beforeLen = (state && Array.isArray(state.log)) ? state.log.length : 0;
        worldTick(c.label);
        const after = (state && Array.isArray(state.log)) ? state.log : [];
        const tickLines = after.slice(beforeLen);
        state.logCarry = tickLines.slice(-8);
        clearLog();
      }
      c.onChoose();
      autoSave();
      if (state && state.world && state.world.pendingEvent) render();
    });
    choicesEl.appendChild(b);
  }

  if (isRested && !isInCombat && !isInDraft) {
    const restHint = document.createElement("div");
    restHint.className = "hint";
    restHint.style.marginTop = "10px";
    restHint.style.color = "#2ad37b";
    restHint.style.fontWeight = "700";
    try {
      const eff = state.effects && state.effects.rested;
      const sec = eff && typeof eff.expiresAt === 'number' ? Math.max(0, Math.ceil((eff.expiresAt - Date.now())/1000)) : 0;
      restHint.textContent = "💤 Resting... All actions paused for " + sec + "s. Wait until rested ends to continue.";
    } catch {
      restHint.textContent = "💤 Resting... All actions paused until rested ends.";
    }
    choicesEl.appendChild(restHint);
  }
}

function combatCompleteQuest(ev) {
  if (!state || !ev || !ev.quest) return;
  if (ev.quest.completed) return;
  normalizeState(state);

  ev.quest.completed = true;

  const xp = Math.max(0, Math.floor(ev.quest.rewardXp || 0));
  const gold = Math.max(0, Math.floor(ev.quest.rewardGold || 0));
  const title = ev.quest.title || "Quest";

  if (xp > 0) gainXp(xp);
  if (gold > 0) state.gold = (state.gold || 0) + gold;

  if (ev.quest.kind === "mission") {
    state.completed = state.completed || { missions: {}, side: {} };
    state.completed.missions[ev.quest.id] = true;
    if (ev.quest.faction) adjustReputation(ev.quest.faction, 1);
    appendLog(`✅ Mission completed: ${title}. (+${xp} XP, +${gold} gold)`);
  } else if (ev.quest.kind === "side") {
    state.completed = state.completed || { missions: {}, side: {} };
    state.completed.side[ev.quest.id] = true;
    appendLog(`✅ Side quest resolved: ${title}. (+${xp} XP, +${gold} gold)`);
  }

  state.activeQuest = null;
  state.pendingSide = null;

  const back = ev.quest.returnNode || "crossroads";
  state.world.pendingEvent = null;
  autoSave();
  enterNode(back);
}

function tierForDifficultyKey(diff) {
  const d = String(diff || "").toLowerCase();
  if (d === "easy") return 1;
  if (d === "normal") return 2;
  if (d === "hard") return 3;
  if (d === "elite") return 4;
  if (d === "legendary") return 5;
  return 2;
}

function pickMobForDifficulty(s, tier) {
  const t = clamp(Math.floor(tier || 2), 1, 5);
  const p = partySize(s);
  for (let tries = 0; tries < 80; tries++) {
    const idx = (t - 1) * 60 + 1 + Math.floor(Math.random() * 60);
    const def = mobDef(idx);
    if (def.requiresPartySize > p) continue;
    return def;
  }
  return pickMobForEncounter(s, "quest");
}

function enterNode(id) {
  if (!state) return;
  normalizeState(state);
  if (id === "crossroads" && !isAdminProfile(state.profile) && !!state.flags?.["exile:active"]) id = "exile_town";
  state.nodeId = id;
  if (id === "tavern") {
    renderTavern();
    return;
  }
  if (
    id === "crossroads"
    && !isAdminProfile(state.profile)
    && !(state.world && state.world.pendingEvent)
    && (state.level || 1) >= 60
    && !(state.flags && state.flags["siege:crossroads:completed"])
    && (typeof createCrossroadsSiegeCombatEvent === "function")
  ) {
    state.flags = state.flags || {};
    const started = !!state.flags["siege:crossroads:started"];
    const phaseWon = String(state.flags["siege:crossroads:phaseWon"] || "").toLowerCase();
    const nextPhase = (started && phaseWon === "horde") ? "overlord" : "horde";
    state.flags["siege:crossroads:started"] = true;
    state.world.pendingEvent = createCrossroadsSiegeCombatEvent(state, nextPhase);
    autoSave();
    renderPendingEvent();
    return;
  }
  startNextLevelUpDraftIfNeeded(state);
  if (hasActiveLevelUpDraft(state)) {
    renderLevelUpDraft();
    return; 
  }
  if (state.world && state.world.pendingEvent && !isAdminProfile(state.profile)) {
    renderPendingEvent();
    return;
  }
  render();
  const node = STORY[id];
  if (!node) {
    appendLog(`(Missing story node: ${id})`);
    showChoices([{ label: "Crossroads", className: "secondary", onChoose: () => enterNode("crossroads") }]);
    return;
  }
  clearLog();
  if (Array.isArray(state.logCarry) && state.logCarry.length) {
    for (const ln of state.logCarry) appendLog(ln);
    state.logCarry = [];
  }
  const text = (typeof node.text === "function") ? node.text(state) : node.text;
  appendLog(text);
  renderLog();
  const choices = (typeof node.choices === "function") ? node.choices(state) : node.choices;
  showChoices(
    (choices || []).map((ch) => ({
      label: ch.label,
      className: ch.className,
      disabled: !!ch.disabled,
      onChoose: () => {
        runStoryChoice(ch);
      },
    }))
  );
  render();
}

const STORY = {
  character_create: {
    text: (s) => {
      const cur = characterSummary(s);
      return `Before banners and blades, you choose who you are.\nCurrent: ${cur}\nChoose your profession:`;
    },
    choices: (s) => {
      return [
        ...PROFESSIONS.map((p) => ({
          label: `${p.label} — ${p.desc}`,
          next: "character_build",
          effect: () => {
            s.character.profession = p.key;
            appendLog(`Profession chosen: ${p.label}.`);
          },
        })),
      ];
    },
  },

  travel_destinations: {
    text: (s) => {
      const page = clamp(Math.floor(s.destPage || 0), 0, Math.max(0, Math.ceil(DESTINATION_COUNT / DESTINATIONS_PER_PAGE) - 1));
      s.destPage = page;
      const start = page * DESTINATIONS_PER_PAGE;
      const end = Math.min(DESTINATION_COUNT, start + DESTINATIONS_PER_PAGE);
      return `Travel Destinations\n${partyLine(s)}\nChoose a place to investigate.\nPage: ${page + 1}/${Math.max(1, Math.ceil(DESTINATION_COUNT / DESTINATIONS_PER_PAGE))} • Showing ${start + 1}-${end} of ${DESTINATION_COUNT}`;
    },
    choices: (s) => {
      const page = clamp(Math.floor(s.destPage || 0), 0, Math.max(0, Math.ceil(DESTINATION_COUNT / DESTINATIONS_PER_PAGE) - 1));
      s.destPage = page;
      const start = page * DESTINATIONS_PER_PAGE;
      const end = Math.min(DESTINATION_COUNT, start + DESTINATIONS_PER_PAGE);
      const out = [];
      for (let i = start; i < end; i++) {
        const def = DESTINATIONS[i];
        const found = !!getFlag(destinationFoundFlag(def));
        out.push({
          label: `${found ? "✅ " : ""}${def.name}`,
          next: def.id,
          effect: () => {
            appendLog(`You travel to ${def.name}.`);
          },
        });
      }
      out.push({
        label: "Prev Page",
        className: "secondary",
        disabled: page <= 0,
        next: "travel_destinations",
        effect: () => { s.destPage = Math.max(0, page - 1); },
      });
      out.push({
        label: "Next Page",
        className: "secondary",
        disabled: page >= Math.max(0, Math.ceil(DESTINATION_COUNT / DESTINATIONS_PER_PAGE) - 1),
        next: "travel_destinations",
        effect: () => { s.destPage = page + 1; },
      });
      out.push({ label: "Back to Crossroads", className: "secondary", next: "crossroads" });
      return out;
    },
  },

  free_roam_select: {
    text: (s) => {
      const roam = ensureRoamState(s);
      const cur = roamAreaDef(roam.areaKey);
      const danger = roamDangerLabel(roam.risk);
      return `Free Roam: choose where you drift next.\n${partyLine(s)}\nCurrent: ${cur.label} • Danger: ${danger} (${roam.risk}/100)`;
    },
    choices: (s) => {
      const roam = ensureRoamState(s);
      const keys = ["streets", "docks", "road", "ruins", "marsh"];
      const out = [];
      for (const k of keys) {
        const a = roamAreaDef(k);
        out.push({
          label: `${a.label} — ${a.desc}`,
          next: "free_roam",
          effect: () => {
            roam.areaKey = a.key;
            appendLog(`You head toward ${a.label}.`);
          },
        });
      }
      out.push({ label: "Back to Crossroads", className: "secondary", next: "crossroads" });
      return out;
    },
  },

  free_roam: {
    text: (s) => {
      const roam = ensureRoamState(s);
      const area = roamAreaDef(roam.areaKey);
      const danger = roamDangerLabel(roam.risk);
      return `Free Roam: ${area.label}\n${partyLine(s)}\n${area.desc}\nSteps: ${roam.steps} • Danger: ${danger} (${roam.risk}/100)`;
    },
    choices: (s) => {
      ensureRoamState(s);
      return [
        { label: "Explore", next: "free_roam", effect: () => roamAct(s, "explore") },
        { label: "Scout (rumors)", next: "free_roam", effect: () => roamAct(s, "scout") },
        { label: "Forage (loot)", next: "free_roam", effect: () => roamAct(s, "forage") },
        { label: "Rest (+2 HP, lower danger)", next: "free_roam", effect: () => roamAct(s, "rest") },
        { label: "Change Area", className: "secondary", next: "free_roam_select" },
        { label: "Return to Crossroads", className: "secondary", next: "crossroads", effect: () => { const r = ensureRoamState(s); r.risk = clamp(r.risk - 20, 0, 100); } },
      ];
    },
  },

  character_build: {
    text: (s) => {
      const p = professionDef(s.character?.profession);
      const pLabel = p ? p.label : "Unchosen";
      return `Profession: ${pLabel}\nNow choose your build (stat focus):`;
    },
    choices: (s) => {
      return [
        ...BUILDS.map((b) => ({
          label: `${b.label} — ${b.desc}`,
          next: "intro",
          effect: () => {
            s.character.build = b.key;
            applyCharacterSelections();
            s.character.created = true;
            grantStarterKitIfNeeded(s);
            grantStarterSkillKitIfNeeded(s);
            appendLog(`Build chosen: ${b.label}.`);
            appendLog(`You begin as: ${characterSummary(s)}.`);
          },
        })),
        { label: "Back", className: "secondary", next: "character_create" },
      ];
    },
  },

  intro: {
    text: (s) => `You step through Virelia Gate. A cold wind carries rumors and ash.\nName: ${s.profile}. Class: ${characterSummary(s)}.\nChoose your first allegiance — it will shape what you survive.`,
    choices: [
      {
        label: "Join the Guild (order + coin)",
        next: "crossroads",
        effect: () => {
          setFlag("allegiance", "Guild");
          adjustReputation("Guild", 2);
          adjustReputation("Rebels", -1);
          appendLog("You sign the ledger. A blue seal warms your palm.");
        },
      },
      {
        label: "Aid the Rebels (freedom + risk)",
        next: "crossroads",
        effect: () => {
          setFlag("allegiance", "Rebels");
          adjustReputation("Rebels", 2);
          adjustReputation("Crown", -1);
          appendLog("A hooded scout marks you with charcoal: 'You chose the hard road.'");
        },
      },
      {
        label: "Serve the Crown (law + steel)",
        next: "crossroads",
        effect: () => {
          setFlag("allegiance", "Crown");
          adjustReputation("Crown", 2);
          adjustReputation("Rebels", -1);
          appendLog("A captain nods once. 'Loyalty is paid in blood.'");
        },
      },
      {
        label: "Walk the Wilds (no masters)",
        next: "crossroads",
        effect: () => {
          setFlag("allegiance", "Wilds");
          appendLog("You refuse banners. The road feels wider — and lonelier.");
        },
      },
    ],
  },

  crossroads: {
    text: (s) => {
      const a = getFlag("allegiance") || "None";
      const heat = getFlag("investigationHeat") || 0;
      const inv = s.arcs?.investigation;
      const stage = Math.max(0, Math.floor(inv?.stage || 0));
      const invLine = stage === 1
        ? "The sealed letter sits heavy in your pocket. A lead will surface soon."
        : (stage === 2
          ? "A lead has surfaced: a ledger kept in a lantern-shop cellar."
          : (stage === 3
            ? "You have the ledger. Decide who to trust (Deliver Findings)."
            : ""));
      const heatLine = heat >= 2
        ? "Rumors follow you. A few eyes linger too long."
        : (heat === 1 ? "A whisper trails your name through the stalls." : "The quest board is full.");
      return `Crossroads of Virelia. Allegiance: ${a}.\n${heatLine}${invLine ? "\n" + invLine : ""} Your choices will open paths — or close them forever.`;
    },
    choices: (s) => {
      const c = [
        { label: "Browse Missions", next: "crossroads", effect: () => { activeTab = "missions"; setTabUi(); } },
        { label: "Browse Side Quests", next: "crossroads", effect: () => { activeTab = "side"; setTabUi(); } },
        { label: "Visit the Market", next: "market" },
        { label: "Travel Destinations (50 places)", next: "travel_destinations" },
        { label: "Free Roam (explore)", next: "free_roam_select" },
        { label: "Visit the Tavern (recruit party)", next: "tavern" },
      ];
      const invStage = s.arcs?.investigation?.stage || 0;
      if (getFlag("messengerUnlocked") && !getFlag("messengerDone")) {
        c.unshift({ label: "Meet the Courier", next: "courier" });
      }
      if (invStage === 2) c.unshift({ label: "Follow the Investigation Lead", next: "investigate_lead" });
      if (invStage === 3) c.unshift({ label: "Deliver Findings", next: "investigate_report" });
      if (!getFlag("lanternCellarOpened") && (s.inventory?.lantern_cellar_key || 0) > 0) {
        c.unshift({ label: "Return to the Lantern Cellar", next: "lantern_cellar" });
      }
      if (!getFlag("sunVaultOpened") && (s.inventory?.sun_vault_key || 0) > 0) {
        c.unshift({ label: "Open the Sun Vault", next: "sun_vault" });
      }
      if (!getFlag("guildSealTurnedIn") && (s.inventory?.guild_seal || 0) > 0) {
        c.unshift({ label: "Present the Guild Seal", next: "guild_contact" });
      }
      if (!getFlag("crownWritTurnedIn") && (s.inventory?.crown_writ || 0) > 0) {
        c.unshift({ label: "Present the Crown Writ", next: "crown_contact" });
      }
      if (!getFlag("rebelTokenTurnedIn") && (s.inventory?.rebel_token || 0) > 0) {
        c.unshift({ label: "Present the Rebel Token", next: "rebel_contact" });
      }
      if ((s.gold || 0) >= 30) c.push({ label: "Buy a Charm (+Max HP)", next: "crossroads", effect: () => { s.gold -= 30; s.maxHp += 4; s.hp = Math.min(s.maxHp, s.hp + 4); appendLog("You buy a small charm. Your breath steadies."); } });
      c.push({ label: "Return to Gate", className: "secondary", next: "gate" });
      return c;
    },
  },

  exile_town: {
    text: (s) => {
      const risk = Math.max(0, Math.floor(s.flags?.["exile:riskMissionsLeft"] || 0));
      const riskLine = risk > 0
        ? `The locals warn you: the first jobs here are killers. High risk missions remaining: ${risk}.`
        : "You’re learning the streets. The worst of the risk has passed.";
      return `An exile town huddles under dim lanterns.\n${riskLine}`;
    },
    choices: (s) => {
      const c = [
        { label: "Browse Missions", next: "exile_town", effect: () => { activeTab = "missions"; setTabUi(); } },
        { label: "Browse Side Quests", next: "exile_town", effect: () => { activeTab = "side"; setTabUi(); } },
        { label: "Visit the Market", next: "market" },
        { label: "Travel Destinations (50 places)", next: "travel_destinations" },
        { label: "Free Roam (explore)", next: "free_roam_select" },
        { label: "Visit the Tavern (recruit party)", next: "tavern" },
      ];
      return c;
    },
  },

  courier: {
    text: () => "A courier in soot-stained gloves waits beside the board. 'For you. Sealed.'",
    choices: [
      {
        label: "Take the sealed letter",
        next: "crossroads",
        effect: (s) => {
          setFlag("messengerDone", true);
          s.arcs.investigation = { stage: 1, startedDay: s.world.day };
          addInvItem(s, "sealed_letter", 1);
          appendLog("You take the letter and crack the wax. Inside is a list of names — and a warning: the city is already choosing sides.");
          appendLog("Key item gained: Sealed Letter. Check Inventory (ℹ) for details.");
          openItemModal("sealed_letter");
        },
      },
      {
        label: "Refuse (keep your head down)",
        className: "secondary",
        next: "crossroads",
        effect: () => {
          setFlag("messengerDone", true);
          appendLog("You refuse. The courier shrugs, but the rumor still spreads.");
        },
      },
    ],
  },

  investigate_lead: {
    text: () => "You trail the lead to a lantern-shop cellar. A ledger. Guards. A locked hatch.",
    choices: [
      {
        label: "Stakeout (cunning)",
        next: "crossroads",
        check: { stat: "cunning", base: 0.55, per: 0.04, min: 0.15, max: 0.92 },
        success: {
          text: "You watch for hours, then slip in when the shift changes. You find the ledger and a small oil-scented key on a hook.",
          effect: (s) => {
            s.arcs.investigation.stage = 3;
            const hadLedger = (s.inventory?.ledger || 0) > 0;
            addInvItem(s, "ledger", 1);
            addInvItem(s, "lantern_cellar_key", 1);
            appendLog("Key items gained: Ledger, Lantern Cellar Key. Deliver Findings at Crossroads.");
            if (!hadLedger) openItemModal("ledger");
          },
        },
        failForward: {
          text: "You get what you came for — but a runner spots you leaving the cellar door. You escape with the ledger clutched under your coat.",
          effect: (s) => {
            s.arcs.investigation.stage = 3;
            const hadLedger = (s.inventory?.ledger || 0) > 0;
            addInvItem(s, "ledger", 1);
            setFlag("investigationHeat", (getFlag("investigationHeat") || 0) + 1);
            applyDamage(4);
            appendLog("Key item gained: Ledger. Deliver Findings at Crossroads.");
            if (!hadLedger) openItemModal("ledger");
          },
        },
        fail: {
          text: "A watcher notices you. You retreat, shaken.",
          effect: () => {
            applyDamage(6);
          },
        },
      },
      {
        label: "Break in (strength)",
        next: "crossroads",
        check: { stat: "strength", base: 0.48, per: 0.04, min: 0.15, max: 0.90 },
        success: {
          text: "Wood splinters. You grab the ledger and vanish into shadow.",
          effect: (s) => {
            s.arcs.investigation.stage = 3;
            const hadLedger = (s.inventory?.ledger || 0) > 0;
            addInvItem(s, "ledger", 1);
            appendLog("Key item gained: Ledger. Deliver Findings at Crossroads.");
            if (!hadLedger) openItemModal("ledger");
          },
        },
        failForward: {
          text: "The hatch cracks — loud. You snatch the ledger as boots thunder down the corridor.",
          effect: (s) => {
            s.arcs.investigation.stage = 3;
            const hadLedger = (s.inventory?.ledger || 0) > 0;
            addInvItem(s, "ledger", 1);
            setFlag("investigationHeat", (getFlag("investigationHeat") || 0) + 1);
            addEffect("bleeding", 12000);
            applyDamage(6);
            appendLog("Key item gained: Ledger. Deliver Findings at Crossroads.");
            if (!hadLedger) openItemModal("ledger");
          },
        },
        fail: {
          text: "The hatch holds. A guard clips you with a baton.",
          effect: () => {
            applyDamage(10);
          },
        },
      },
      {
        label: "Scry (arcana, costs mana)",
        next: "crossroads",
        require: (s) => {
          if (s.mana < 6) {
            appendLog("Your mana is too low.");
            return false;
          }
          s.mana -= 6;
          return true;
        },
        check: { stat: "arcana", base: 0.50, per: 0.05, min: 0.18, max: 0.95 },
        success: {
          text: "Ink lifts off the page in your mind. Names, routes, payments. You copy the key entries onto a scrap and pocket the ledger.",
          effect: (s) => {
            s.arcs.investigation.stage = 3;
            const hadLedger = (s.inventory?.ledger || 0) > 0;
            addInvItem(s, "ledger", 1);
            appendLog("Key item gained: Ledger. Deliver Findings at Crossroads.");
            if (!hadLedger) openItemModal("ledger");
          },
        },
        failForward: {
          text: "You see enough — but the vision leaves a trace that someone skilled might follow.",
          effect: (s) => {
            s.arcs.investigation.stage = 3;
            const hadLedger = (s.inventory?.ledger || 0) > 0;
            addInvItem(s, "ledger", 1);
            setFlag("investigationHeat", (getFlag("investigationHeat") || 0) + 1);
            addEffect("cursed", 10000);
            appendLog("Key item gained: Ledger. Deliver Findings at Crossroads.");
            if (!hadLedger) openItemModal("ledger");
          },
        },
        fail: {
          text: "The vision fractures — and bites back.",
          effect: () => {
            addEffect("cursed", 12000);
            applyDamage(8);
          },
        },
      },
    ],
  },

  investigate_report: {
    text: () => "You have the ledger. Who do you trust with it?",
    choices: [
      {
        label: "Report to your Allegiance",
        next: "crossroads",
        require: (s) => {
          if ((s.inventory?.ledger || 0) <= 0) {
            appendLog("You don't have the ledger yet.");
            return false;
          }
          return true;
        },
        effect: (s) => {
          const a = getFlag("allegiance") || "Wilds";
          adjustReputation(a, 2);
          s.gold += 20;
          s.arcs.investigation.stage = 4;
          consumeInvItem(s, "ledger", 1);
          appendLog(`You hand over the ledger. The ${a} reward you — and the city shifts.`);
        },
      },
      {
        label: "Sell it quietly (gold, lose reputation)",
        next: "crossroads",
        require: (s) => {
          if ((s.inventory?.ledger || 0) <= 0) {
            appendLog("You don't have the ledger yet.");
            return false;
          }
          return true;
        },
        effect: (s) => {
          s.gold += 45;
          const a = getFlag("allegiance") || "Wilds";
          adjustReputation(a, -2);
          s.arcs.investigation.stage = 4;
          consumeInvItem(s, "ledger", 1);
          appendLog("Coin changes hands. Loyalty cracks.");
        },
      },
    ],
  },

  guild_contact: {
    text: (s) => `A Guild factor waits in the shade of the quest board.\n"You have something for us?"\nGold: ${s.gold}`,
    choices: [
      {
        label: "Hand over the Guild Seal",
        next: "crossroads",
        require: (s) => {
          if (getFlag("guildSealTurnedIn")) {
            appendLog("You already delivered the seal.");
            return false;
          }
          if ((s.inventory?.guild_seal || 0) <= 0) {
            appendLog("You don't have a Guild Seal.");
            return false;
          }
          return true;
        },
        effect: (s) => {
          consumeInvItem(s, "guild_seal", 1);
          setFlag("guildSealTurnedIn", true);
          adjustReputation("Guild", 2);
          s.gold += 30;
          addInvItem(s, "sigil_of_the_guildmaster", 1);
          appendLog("The factor pockets the seal and slides you a stamped sigil." );
          openItemModal("sigil_of_the_guildmaster");
        },
      },
      { label: "Back", className: "secondary", next: "crossroads" },
    ],
  },

  crown_contact: {
    text: (s) => `A Crown clerk stands crisp and still.\n"Writ?"\nGold: ${s.gold}`,
    choices: [
      {
        label: "Submit the Crown Writ",
        next: "crossroads",
        require: (s) => {
          if (getFlag("crownWritTurnedIn")) {
            appendLog("You already submitted the writ.");
            return false;
          }
          if ((s.inventory?.crown_writ || 0) <= 0) {
            appendLog("You don't have a Crown Writ.");
            return false;
          }
          return true;
        },
        effect: (s) => {
          consumeInvItem(s, "crown_writ", 1);
          setFlag("crownWritTurnedIn", true);
          adjustReputation("Crown", 2);
          s.gold += 28;
          addInvItem(s, "amulet_of_unbroken_oath", 1);
          appendLog("The clerk nods once and returns with an oathbound amulet." );
          openItemModal("amulet_of_unbroken_oath");
        },
      },
      { label: "Back", className: "secondary", next: "crossroads" },
    ],
  },

  rebel_contact: {
    text: (s) => `A Rebel runner appears like a shadow behind the stalls.\n"Token."\nGold: ${s.gold}`,
    choices: [
      {
        label: "Show the Rebel Token",
        next: "crossroads",
        require: (s) => {
          if (getFlag("rebelTokenTurnedIn")) {
            appendLog("You already used that token.");
            return false;
          }
          if ((s.inventory?.rebel_token || 0) <= 0) {
            appendLog("You don't have a Rebel Token.");
            return false;
          }
          return true;
        },
        effect: (s) => {
          consumeInvItem(s, "rebel_token", 1);
          setFlag("rebelTokenTurnedIn", true);
          adjustReputation("Rebels", 2);
          s.gold += 26;
          addInvItem(s, "rebel_commander_band", 1);
          appendLog("The runner grins and presses a worn band into your palm." );
          openItemModal("rebel_commander_band");
        },
      },
      { label: "Back", className: "secondary", next: "crossroads" },
    ],
  },

  sun_vault: {
    text: (s) => `You find a sealed door marked with a sunburst.\nThe key in your pack feels heavy.\nGold: ${s.gold}`,
    choices: [
      {
        label: "Use the Sun Vault Key",
        next: "crossroads",
        require: (s) => {
          if (getFlag("sunVaultOpened")) {
            appendLog("The Sun Vault has already been opened.");
            return false;
          }
          if ((s.inventory?.sun_vault_key || 0) <= 0) {
            appendLog("You don't have the key.");
            return false;
          }
          return true;
        },
        effect: (s) => {
          consumeInvItem(s, "sun_vault_key", 1);
          setFlag("sunVaultOpened", true);
          s.gold += 80;
          gainXp(120);
          addInvItem(s, "crown_of_the_sun_vault", 1);
          appendLog("The vault sighs open. Light spills out like warm water." );
          openItemModal("crown_of_the_sun_vault");
        },
      },
      { label: "Back", className: "secondary", next: "crossroads" },
    ],
  },

  lantern_cellar: {
    text: (s) => `You return to the lantern-shop cellar door. The lock still smells of oil.\nGold: ${s.gold}`,
    choices: [
      {
        label: "Use the Lantern Cellar Key",
        next: "crossroads",
        require: (s) => {
          if (getFlag("lanternCellarOpened")) {
            appendLog("The cellar has already been picked clean.");
            return false;
          }
          if ((s.inventory?.lantern_cellar_key || 0) <= 0) {
            appendLog("You don't have the key.");
            return false;
          }
          return true;
        },
        effect: (s) => {
          consumeInvItem(s, "lantern_cellar_key", 1);
          setFlag("lanternCellarOpened", true);
          s.gold += 24;
          addInvItem(s, "rune_shard", 1);
          addInvItem(s, "ember_gem", 1);
          appendLog("The cellar opens. You find a hidden pouch and two warm stones in the dust." );
        },
      },
      { label: "Back", className: "secondary", next: "crossroads" },
    ],
  },

  market: {
    text: (s) => {
      const keys = marketStockKeys();
      const total = keys.length;
      const maxPage = Math.max(0, Math.ceil(total / MARKET_ITEMS_PER_PAGE) - 1);
      marketPage = clamp(marketPage, 0, maxPage);
      return `High Market glows with lanterns. Wares are listed on the board to your right.\nGold: ${s.gold}.\nShop Page: ${marketPage + 1}/${maxPage + 1}`;
    },
    choices: (s) => {
      const out = [];
      out.push({
        label: "Pay for rumors (15 gold, affects missions)",
        next: "market",
        disabled: !!getFlag("heardRumors") || (!isAdminProfile(s.profile) && (s.gold || 0) < 15),
        effect: () => {
          if (getFlag("heardRumors")) {
            appendLog("You already paid for this whisper. The vendor won’t repeat it.");
            return;
          }
          if (!spendGold(15)) return;
          appendLog("Rumors: patrol routes shift after Stormlight nights — scouting gets easier.");
          setFlag("heardRumors", true);
        },
      });
      out.push({ label: "Visit the Alchemist", next: "alchemist" });
      out.push({ label: "Visit the Enchanter", next: "enchanter" });
      out.push({ label: "Visit the Crafter", next: "crafter" });
      out.push({ label: "Visit the Healer", next: "healer" });
      out.push({ label: "Visit the Blacksmith", next: "blacksmith" });
      out.push({ label: "Ask about mercenaries (Tavern)", next: "tavern" });
      out.push({ label: "Back to Town", className: "secondary", next: (getFlag("exile:active") ? "exile_town" : "crossroads") });
      return out;
    },
  },

  blacksmith: {
    text: (s) => {
      const met = !!getFlag("metBlacksmith");
      return met
        ? `The Blacksmith wipes soot from his hands and eyes your pack.\n"Need something forged?"\nGold: ${s.gold}`
        : `A forge roars behind a half-open shutter.\nA blacksmith looks up as you approach.\nGold: ${s.gold}`;
    },
    choices: (s) => {
      const out = [];
      const met = !!getFlag("metBlacksmith");
      if (!met) {
        out.push({
          label: "Introduce yourself",
          next: "blacksmith",
          effect: () => {
            setFlag("metBlacksmith", true);
            appendLog("The blacksmith nods once. \"Bring ore and coin. I’ll make it worth your while.\"");
          },
        });
      }

      for (const r of BLACKSMITH_RECIPES) {
        const reqLine = Object.entries(r.req || {}).map(([k, v]) => `${itemLabel(k)} x${v}`).join(", ") || "(none)";
        const can = met && canCraftRecipe(s, r);
        out.push({
          label: `${r.label} (${reqLine}${r.gold ? `, ${r.gold}g` : ""})`,
          next: "blacksmith",
          disabled: !can,
          effect: () => {
            craftRecipeAtBlacksmith(r.key);
          },
        });
      }

      out.push({ label: "Back to Market", className: "secondary", next: "market" });
      return out;
    },
  },

  alchemist: {
    text: (s) => {
      const met = !!getFlag("metAlchemist");
      return met
        ? `A brass still bubbles beside bundles of herbs.\n"Need a brew?"\nGold: ${s.gold}`
        : `An alchemist in stained gloves watches you measure the shelves.\n"If you brought herbs, I can make something useful."\nGold: ${s.gold}`;
    },
    choices: (s) => {
      const out = [];
      const met = !!getFlag("metAlchemist");
      if (!met) {
        out.push({
          label: "Introduce yourself",
          next: "alchemist",
          effect: () => {
            setFlag("metAlchemist", true);
            appendLog("The alchemist nods. \"Herbs for coin. Coin for cures. Simple.\"");
          },
        });
      }

      for (const r of ALCHEMIST_RECIPES) {
        const reqLine = Object.entries(r.req || {}).map(([k, v]) => `${itemLabel(k)} x${v}`).join(", ") || "(none)";
        const can = met && canCraftRecipe(s, r);
        out.push({
          label: `${r.label} (${reqLine}${r.gold ? `, ${r.gold}g` : ""})`,
          next: "alchemist",
          disabled: !can,
          effect: () => {
            craftRecipeAtAlchemist(r.key);
          },
        });
      }
      out.push({ label: "Back to Market", className: "secondary", next: "market" });
      return out;
    },
  },

  enchanter: {
    text: (s) => {
      const met = !!getFlag("metEnchanter");
      return met
        ? `An enchanter traces runes in the air that fade like smoke.\n"Show me what you found."\nGold: ${s.gold}`
        : `A hooded enchanter glances at your hands.\n"If you carry shards and ember, I can bind them."\nGold: ${s.gold}`;
    },
    choices: (s) => {
      const out = [];
      const met = !!getFlag("metEnchanter");
      if (!met) {
        out.push({
          label: "Introduce yourself",
          next: "enchanter",
          effect: () => {
            setFlag("metEnchanter", true);
            appendLog("The enchanter inclines their head. \"Ruin becomes craft. Craft becomes power.\"");
          },
        });
      }

      for (const r of ENCHANTER_RECIPES) {
        const reqLine = Object.entries(r.req || {}).map(([k, v]) => `${itemLabel(k)} x${v}`).join(", ") || "(none)";
        const can = met && canCraftRecipe(s, r);
        out.push({
          label: `${r.label} (${reqLine}${r.gold ? `, ${r.gold}g` : ""})`,
          next: "enchanter",
          disabled: !can,
          effect: () => {
            craftRecipeAtEnchanter(r.key);
          },
        });
      }
      out.push({ label: "Back to Market", className: "secondary", next: "market" });
      return out;
    },
  },

  crafter: {
    text: (s) => {
      const met = !!getFlag("metCrafter");
      return met
        ? `A crafter has needle, awl, and fresh-cut timber laid out.\n"What do you need made?"\nGold: ${s.gold}`
        : `A crafter looks up from leatherwork.\n"Bring cloth, leather, lumber. I’ll make it hold."\nGold: ${s.gold}`;
    },
    choices: (s) => {
      const out = [];
      const met = !!getFlag("metCrafter");
      if (!met) {
        out.push({
          label: "Introduce yourself",
          next: "crafter",
          effect: () => {
            setFlag("metCrafter", true);
            appendLog("The crafter grins. \"Materials talk. I just translate.\"");
          },
        });
      }

      for (const r of CRAFTER_RECIPES) {
        const reqLine = Object.entries(r.req || {}).map(([k, v]) => `${itemLabel(k)} x${v}`).join(", ") || "(none)";
        const can = met && canCraftRecipe(s, r);
        out.push({
          label: `${r.label} (${reqLine}${r.gold ? `, ${r.gold}g` : ""})`,
          next: "crafter",
          disabled: !can,
          effect: () => {
            craftRecipeAtCrafter(r.key);
          },
        });
      }
      out.push({ label: "Back to Market", className: "secondary", next: "market" });
      return out;
    },
  },

  healer: {
    text: (s) => {
      const met = !!getFlag("metHealer");
      const fx = activeEffects().map((e) => e.key).join(", ") || "None";
      return met
        ? `A healer washes their hands and studies your breathing.\n"What ails you?"\nEffects: ${fx}\nGold: ${s.gold}`
        : `A quiet shrine smells of herbs and clean water.\nA healer looks up.\n"I can mend you — for a price."\nGold: ${s.gold}`;
    },
    choices: (s) => {
      const out = [];
      const met = !!getFlag("metHealer");
      if (!met) {
        out.push({
          label: "Introduce yourself",
          next: "healer",
          effect: () => {
            setFlag("metHealer", true);
            appendLog("The healer nods. \"Pain is common. Relief costs.\"");
          },
        });
      }

      out.push({
        label: "Cure ailments (12g)",
        next: "healer",
        disabled: !met || (!isAdminProfile(s.profile) && (s.gold || 0) < 12),
        effect: () => {
          if (!spendGold(12)) return;
          clearEffect("bleeding");
          clearEffect("poisoned");
          clearEffect("cursed");
          appendLog("The healer murmurs a prayer. The worst of it fades.");
        },
      });
      out.push({
        label: "Treat wounds (15g)",
        next: "healer",
        disabled: !met || (!isAdminProfile(s.profile) && (s.gold || 0) < 15),
        effect: () => {
          if (!spendGold(15)) return;
          const heal = Math.max(6, Math.floor(playerMaxHp() * 0.35));
          s.hp = Math.min(playerMaxHp(), (s.hp || 0) + heal);
          if (s.party && Array.isArray(s.party.members)) {
            for (const m of s.party.members) {
              if (!m) continue;
              const h = Math.max(4, Math.floor((m.maxHp || 1) * 0.35));
              m.hp = Math.min(m.maxHp || 1, (m.hp || 0) + h);
            }
          }
          appendLog("Bandages, salves, and steady hands." );
        },
      });

      out.push({ label: "Back to Market", className: "secondary", next: "market" });
      return out;
    },
  },

  tavern: {
    text: () => "",
    choices: () => [],
  },

  gate: {
    text: () => "Virelia Gate stands behind you now. The city does not forget those who return.",
    choices: [
      { label: "Crossroads", next: "crossroads" },
    ],
  },

  defeat: {
    text: (s) => `Darkness. Then a faint bell.\nYou wake at a roadside shrine.`,
    choices: (s) => [
      {
        label: "Awaken at Shrine (lose 20 gold)",
        next: "crossroads",
        effect: () => {
          state.gold = Math.max(0, state.gold - 20);
          state.hp = Math.max(1, Math.floor(playerMaxHp() * 0.6));
          state.mana = Math.min(playerMaxMana(), state.mana + 10);
          // FIX: clear all lingering detrimental effects on resurrection
          // Previously bleeding/poisoned/cursed persisted after death
          try {
            clearEffect("bleeding");
            clearEffect("poisoned");
            clearEffect("cursed");
            clearEffect("aether");
            // Clear any other effect that could kill again immediately
            if (state.effects) {
              // Keep rested if you want, but clear others
              const toClear = Object.keys(state.effects).filter(k => !["rested","shielded"].includes(k));
              for (const k of toClear) clearEffect(k);
            }
            addEffect("rested", 15000);
          } catch(e) {}
          appendLog("A priest takes a donation and leaves you with water. The ailments of your fall fade.");
          // Also heal companions partially so they don't stay dead with effects?
          if (state.party && Array.isArray(state.party.members)) {
            for (const m of state.party.members) {
              if (!m) continue;
              // Revive companions at 25% if dead, and clear their debuffs if any (companions don't store effects, but hp)
              if ((m.hp||0) <= 0) {
                m.hp = Math.max(1, Math.floor((m.maxHp||1)*0.25));
                m.mana = Math.max(0, Math.floor((m.maxMana||0)*0.25));
              }
            }
          }
        },
      },
      {
        label: "Restart",
        className: "danger",
        next: "intro",
        effect: () => {
          const p = state.profile;
          state = createNewState(p);
          appendLog("A new thread of fate begins.");
        },
      },
    ],
  },
};

registerDestinations();

let questRankFilter = "all";
let marketRankFilter = "all";
let marketRankSelectEl = null;

function getQuestBoardElements() {
  return {
    title: document.getElementById('questBoardTitle'),
    tabs: document.getElementById('questBoardTabs'),
    panel: document.getElementById('questsPanel')
  };
}

function updateQuestBoardTitle() {
  const els = getQuestBoardElements();
  const isMarket = !!(state && (state.nodeId || "") === "market");
  if (els.title) {
    // SHOP BOARD feature: switch name when in market node
    els.title.textContent = isMarket ? "-- SHOP BOARD --" : "-- QUEST BOARD --";
    // Add visual distinction
    if (isMarket) {
      els.title.setAttribute('data-mode', 'shop');
      els.title.title = 'Shop Board - Rank filter + search active. Use item ranking to find gear.';
    } else {
      els.title.setAttribute('data-mode', 'quest');
      els.title.title = 'Quest Board - filter by difficulty';
    }
  }
  if (els.tabs) {
    els.tabs.style.display = isMarket ? "none" : "flex";
  }
  if (els.panel) {
    if (isMarket) {
      els.panel.classList.add('shop-mode');
      els.panel.classList.remove('quest-mode');
    } else {
      els.panel.classList.add('quest-mode');
      els.panel.classList.remove('shop-mode');
    }
  }
}


function renderQuestList() {
  if (!state) {
    questListEl.innerHTML = "";
    return;
  }

  // Update board title: Quest Board vs Shop Board
  if (typeof updateQuestBoardTitle === 'function') updateQuestBoardTitle();

  if ((state.nodeId || "") === "market") {
    renderMarketList();
    return;
  }

  questListEl.innerHTML = "";

  const filterRow = document.createElement("div");
  filterRow.className = "row";
  filterRow.style.marginTop = "0";
  const filterLabel = document.createElement("div");
  filterLabel.className = "hint";
  filterLabel.style.marginTop = "0";
  filterLabel.textContent = "Rank";
  const filterSel = document.createElement("select");
  const opts = [
    { v: "all", t: "All" },
    { v: "easy", t: "Easy" },
    { v: "normal", t: "Normal" },
    { v: "hard", t: "Hard" },
    { v: "elite", t: "Elite" },
    { v: "legendary", t: "Legendary" },
  ];
  for (const o of opts) {
    const opt = document.createElement("option");
    opt.value = o.v;
    opt.textContent = o.t;
    filterSel.appendChild(opt);
  }
  filterSel.value = String(questRankFilter || "all");
  filterSel.addEventListener("change", () => {
    questRankFilter = String(filterSel.value || "all");
    questPage = 0;
    renderQuestList();
  });
  filterRow.appendChild(filterLabel);
  filterRow.appendChild(filterSel);
  questListEl.appendChild(filterRow);

  const completedM = state.completed?.missions || {};
  const completedS = state.completed?.side || {};

  const list = (activeTab === "missions") ? state.missions : state.sideQuests;
  const filtered = (list || []).filter((q) => {
    if (q.kind === "mission") return !completedM[q.id];
    return !completedS[q.id];
  });

  const toRank = (q) => {
    if (!q) return "";
    if (q.kind === "mission") return String(q.difficulty || "").trim().toLowerCase();
    if (q.kind === "side") {
      const lvl = Math.max(1, Math.floor(q.minLevel || 1));
      const tier = Math.max(1, Math.min(5, 1 + Math.floor((lvl - 1) / 4)));
      if (tier <= 1) return "easy";
      if (tier === 2) return "normal";
      if (tier === 3) return "hard";
      if (tier === 4) return "elite";
      return "legendary";
    }
    return "";
  };
  const rf = String(questRankFilter || "all");
  const filteredByRank = (rf && rf !== "all")
    ? filtered.filter((q) => toRank(q) === rf)
    : filtered;

  const total = filteredByRank.length;
  const maxPage = Math.max(0, Math.ceil(total / QUESTS_PER_PAGE) - 1);
  questPage = clamp(questPage, 0, maxPage);
  const start = questPage * QUESTS_PER_PAGE;
  const end = Math.min(total, start + QUESTS_PER_PAGE);
  const toShow = filteredByRank.slice(start, end);

  if (questPageInfo) {
    const label = (activeTab === "missions") ? "Missions" : "Side Quests";
    questPageInfo.textContent = total === 0 ? `${label}: none available` : `${label}: ${start + 1}-${end} of ${total}`;
  }
  if (btnPrevQuest) btnPrevQuest.disabled = questPage <= 0;
  if (btnNextQuest) btnNextQuest.disabled = questPage >= maxPage;

  const isRested = !!(state && typeof hasEffectOnState === 'function' && hasEffectOnState(state, "rested"));

  for (const q of toShow) {
    const item = document.createElement("div");
    item.className = "questItem";

    const top = document.createElement("div");
    top.className = "questTop";

    const title = document.createElement("div");
    title.className = "questTitle";
    title.textContent = q.title;

    const badgeWrap = document.createElement("div");
    badgeWrap.innerHTML = q.kind === "mission" ? badgeForDifficulty(q.difficulty) : '<span class="badge">Side</span>';
    const done = q.kind === "mission"
      ? !!state.completed?.missions?.[q.id]
      : !!state.completed?.side?.[q.id];
    if (done) badgeWrap.innerHTML += ' <span class="badge done">Done</span>';

    top.appendChild(title);
    top.appendChild(badgeWrap);
    item.appendChild(top);

    const meta = document.createElement("div");
    meta.className = "questMeta";
    if (q.kind === "mission") {
      meta.textContent = `Faction: ${q.faction} | Recommended Level: ${q.recLevel} | Reward: +${q.xp} XP, +${q.gold} gold`;
    } else {
      meta.textContent = `Location: ${q.place} | Requires Level: ${q.minLevel} | Reward: +${q.xp} XP, +${q.gold} gold`;
    }
    item.appendChild(meta);

    const gate = (done && !isAdminProfile(state.profile)) ? { ok: false, reason: "Completed." } : canTakeQuest(q);
    const row = document.createElement("div");
    row.className = "row";

    const btn = document.createElement("button");
    btn.textContent = done ? (isAdminProfile(state.profile) ? "Replay" : "Done") : (gate.ok ? "Accept" : "Locked");
    if (!gate.ok || (done && !isAdminProfile(state.profile))) btn.disabled = true;
    else if (isRested) {
      btn.disabled = true;
      btn.title = "Resting... wait until rested ends";
    }
    btn.addEventListener("click", () => {
      if (isRested) {
        appendLog("You are resting. All actions paused until rested ends.");
        render();
        return;
      }
      startQuest(q);
    });
    row.appendChild(btn);

    if (!gate.ok && !(done && !isAdminProfile(state.profile))) {
      const reason = document.createElement("div");
      reason.className = "hint";
      reason.textContent = gate.reason;
      item.appendChild(reason);
    }

    item.appendChild(row);
    questListEl.appendChild(item);
  }
  if (isRested) {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.style.color = "#2ad37b";
    hint.style.fontWeight = "700";
    hint.style.marginTop = "8px";
    try {
      const eff = state.effects && state.effects.rested;
      const sec = eff && typeof eff.expiresAt === 'number' ? Math.max(0, Math.ceil((eff.expiresAt - Date.now())/1000)) : 0;
      hint.textContent = "💤 Resting... Quest Accept paused for " + sec + "s.";
    } catch { hint.textContent = "💤 Resting..."; }
    questListEl.appendChild(hint);
  }
}

let marketSearchQuery = "";
let marketSearchInputEl = null;
let marketSearchWrapEl = null;
let marketSearchResultsEl = null;
let marketSearchDebounce = null;

function ensureMarketSearchUi() {
  if (!questListEl) return;
  if (marketSearchWrapEl && !marketSearchWrapEl.isConnected) {
    marketSearchWrapEl = null;
    marketSearchInputEl = null;
    marketSearchResultsEl = null;
    marketRankSelectEl = null;
  }
  if (marketSearchWrapEl) return;

  questListEl.innerHTML = "";

  marketSearchWrapEl = document.createElement("div");
  marketSearchWrapEl.id = "marketSearchWrap";
  marketSearchWrapEl.style.display = "flex";
  marketSearchWrapEl.style.flexDirection = "column";
  marketSearchWrapEl.style.gap = "10px";

  const headerHint = document.createElement("div");
  headerHint.className = "hint";
  headerHint.style.marginTop = "0";
  headerHint.style.fontWeight = "600";
  headerHint.textContent = "🛒 Shop Board — Search items + filter by Ranking (Common→Legendary→Curio). Title switches from Quest Board to Shop Board when in Market node.";
  marketSearchWrapEl.appendChild(headerHint);

  const row = document.createElement("div");
  row.className = "row";
  row.style.alignItems = "center";
  row.style.flexWrap = "wrap";

  marketSearchInputEl = document.createElement("input");
  marketSearchInputEl.placeholder = "Search Shop... (name or key)";
  marketSearchInputEl.value = String(marketSearchQuery || "");
  marketSearchInputEl.autocomplete = "off";
  marketSearchInputEl.spellcheck = false;
  marketSearchInputEl.style.flex = "1";
  marketSearchInputEl.style.minWidth = "180px";
  marketSearchInputEl.addEventListener("input", () => {
    marketSearchQuery = String(marketSearchInputEl?.value || "");
    marketPage = 0;
    if (marketSearchDebounce) clearTimeout(marketSearchDebounce);
    marketSearchDebounce = setTimeout(() => {
      renderMarketList();
    }, 90);
  });

  // Rank filter for shop - ensures shop board feature has rank filter
  const rankLabel = document.createElement("div");
  rankLabel.className = "hint";
  rankLabel.textContent = "Rank";
  rankLabel.style.marginLeft = "8px";
  rankLabel.title = "Filter shop items by item ranking";

  marketRankSelectEl = document.createElement("select");
  marketRankSelectEl.title = "Filter by item Rank: Common, Uncommon, Rare, Epic, Legendary, Curio";
  const rankOpts = [
    { v: "all", t: "All Ranks" },
    { v: "common", t: "Common" },
    { v: "uncommon", t: "Uncommon" },
    { v: "rare", t: "Rare" },
    { v: "epic", t: "Epic" },
    { v: "legendary", t: "Legendary" },
    { v: "curio", t: "Curio" }
  ];
  for (const o of rankOpts) {
    const opt = document.createElement("option");
    opt.value = o.v;
    opt.textContent = o.t;
    marketRankSelectEl.appendChild(opt);
  }
  marketRankSelectEl.value = String(marketRankFilter || "all");
  marketRankSelectEl.style.minWidth = "132px";
  marketRankSelectEl.addEventListener("change", () => {
    marketRankFilter = String(marketRankSelectEl.value || "all");
    marketPage = 0;
    renderMarketList();
  });

  row.appendChild(marketSearchInputEl);
  row.appendChild(rankLabel);
  row.appendChild(marketRankSelectEl);
  marketSearchWrapEl.appendChild(row);

  marketSearchResultsEl = document.createElement("div");
  marketSearchResultsEl.id = "marketSearchResults";
  marketSearchResultsEl.style.display = "flex";
  marketSearchResultsEl.style.flexDirection = "column";
  marketSearchResultsEl.style.gap = "10px";
  marketSearchWrapEl.appendChild(marketSearchResultsEl);

  questListEl.appendChild(marketSearchWrapEl);
}

function renderMarketList() {
  if (!state) return;
  normalizeState(state);

  // Ensure board title is Shop Board when in market - core shop board feature
  if (typeof updateQuestBoardTitle === 'function') updateQuestBoardTitle();

  ensureMarketSearchUi();
  if (!marketSearchResultsEl) return;
  if (marketRankSelectEl) marketRankSelectEl.value = String(marketRankFilter || "all");
  marketSearchResultsEl.innerHTML = "";

  const allKeys = marketStockKeys();

  // Filter by rank first - shop rank filter feature
  const rf = String(marketRankFilter || "all").toLowerCase();
  let rankFiltered = allKeys;
  if (rf && rf !== "all") {
    rankFiltered = allKeys.filter((k) => {
      try {
        const r = marketRankForItem(k);
        return String(r.rank || "").toLowerCase() === rf;
      } catch { return false; }
    });
  }

  const q = String(marketSearchQuery || "").trim().toLowerCase();
  const keys = q
    ? rankFiltered.filter((k) => {
      const kk = String(k || "").toLowerCase();
      if (!kk) return false;
      if (kk.includes(q)) return true;
      const label = String(itemLabel(k) || "").toLowerCase();
      return label.includes(q);
    })
    : rankFiltered;

  const total = keys.length;
  const maxPage = Math.max(0, Math.ceil(total / MARKET_ITEMS_PER_PAGE) - 1);
  marketPage = clamp(marketPage, 0, maxPage);

  if (questPageInfo) {
    const start = marketPage * MARKET_ITEMS_PER_PAGE;
    const end = Math.min(total, start + MARKET_ITEMS_PER_PAGE);
    questPageInfo.textContent = total === 0
      ? "Shop: no items (check rank filter)"
      : `Shop: ${start + 1}-${end} of ${total} [${rf === 'all' ? 'All Ranks' : rf}]`;
  }
  if (btnPrevQuest) btnPrevQuest.disabled = marketPage <= 0;
  if (btnNextQuest) btnNextQuest.disabled = marketPage >= maxPage;

  const isRested = !!(state && typeof hasEffectOnState === 'function' && hasEffectOnState(state, "rested"));
  if (isRested) {
    const restHint = document.createElement("div");
    restHint.className = "hint";
    restHint.style.color = "#2ad37b";
    restHint.style.fontWeight = "700";
    try {
      const eff = state.effects && state.effects.rested;
      const sec = eff && typeof eff.expiresAt === 'number' ? Math.max(0, Math.ceil((eff.expiresAt - Date.now())/1000)) : 0;
      restHint.textContent = "💤 Resting... Shop purchases paused for " + sec + "s. Wait to buy.";
    } catch { restHint.textContent = "💤 Resting... Shop paused."; }
    marketSearchResultsEl.appendChild(restHint);
  }

  for (const k of keys.slice(marketPage * MARKET_ITEMS_PER_PAGE, marketPage * MARKET_ITEMS_PER_PAGE + MARKET_ITEMS_PER_PAGE)) {
    const def = itemDef(k);
    const r = marketRankForItem(k);
    const price = marketPriceForItem(k);
    const owned = Math.max(0, Math.floor(state.inventory?.[k] || 0));

    const item = document.createElement("div");
    item.className = "questItem shopItem";
    item.dataset.rank = r.rank;
    item.dataset.key = k;
    item.style.cursor = isRested ? "not-allowed" : "pointer";
    if (isRested) item.style.opacity = "0.55";

    const top = document.createElement("div");
    top.className = "questTop";

    const title = document.createElement("div");
    title.className = "questTitle";
    title.textContent = def.label;

    const badgeWrap = document.createElement("div");
    badgeWrap.innerHTML = `<span class="badge ${r.badge}">${r.rank}</span>`;

    top.appendChild(title);
    top.appendChild(badgeWrap);
    item.appendChild(top);

    const meta = document.createElement("div");
    meta.className = "questMeta";
    meta.textContent = `Price: ${price} gold | Owned: ${owned} | Rank: ${r.rank}`;
    item.appendChild(meta);

    if (!isAdminProfile(state.profile) && (state.gold || 0) < price) {
      item.style.opacity = isRested ? "0.45" : "0.6";
    }

    item.addEventListener("click", () => {
      if (isRested) {
        appendLog("You are resting. Shop purchases paused until rested ends.");
        render();
        return;
      }
      openMarketItemModal(k);
    });

    marketSearchResultsEl.appendChild(item);
  }
  // If no items after filter, show help
  if (marketSearchResultsEl.children.length === 0 || (marketSearchResultsEl.children.length === 1 && isRested)) {
    if (!isRested || marketSearchResultsEl.children.length === 0) {
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.textContent = rf === 'all' && !q ? "No items found." : `No items match: search='${q||''}' rank='${rf}'. Try All Ranks or clear search.`;
      empty.style.marginTop = "8px";
      marketSearchResultsEl.appendChild(empty);
    }
  }
}


function setTabUi() {
  if (activeTab === "missions") {
    tabMissions.classList.add("active");
    tabSideQuests.classList.remove("active");
  } else {
    tabMissions.classList.remove("active");
    tabSideQuests.classList.add("active");
  }
}

function autoSave() {
  if (!state) return;
  if (isAdminProfile(state.profile)) applyAdminGodMode(state);
  state.updatedAt = nowIso();
  safeSave(state.profile, state);
  renderHomeSaves();
}

function render() {
  if (state) normalizeState(state);
  if (state) syncSidebarButtons();
  if (state && isAdminProfile(state.profile)) applyAdminGodMode(state);
  if (state && (!isAdminProfile(state.profile) || !isAdminGodModeActive(state))) startNextLevelUpDraftIfNeeded(state);
  if (state && hasActiveLevelUpDraft(state)) {
    renderLevelUpDraft();
    return;
  }
  if (state && state.world && state.world.pendingEvent && (!isAdminProfile(state.profile) || !isAdminGodModeActive(state))) {
    renderPendingEvent();
    return;
  }
  renderStats();
  renderLog();
  renderQuestList();
}

function clearLog() {
  if (!state) return;
  state.log = [];
}

function normalizeState(s) {
  if (!s) return;
  s.flags = s.flags || {};
  s.reputation = s.reputation || { Guild: 0, Rebels: 0, Crown: 0, Wilds: 0 };
  s.completed = s.completed || { missions: {}, side: {} };
  s.inventory = s.inventory || {};
  s.stats = s.stats || { strength: 0, cunning: 0, arcana: 0, resilience: 0 };
  s.skillPoints = s.skillPoints || 0;
  if (typeof s.destPage !== "number") s.destPage = 0;
  s.party = s.party || {};
  if (!Array.isArray(s.party.members)) s.party.members = [];
  if (!Array.isArray(s.party.recruits)) s.party.recruits = [];
  if (typeof s.party.recruitsDay !== "number") s.party.recruitsDay = 0;
  for (const m of s.party.members) {
    if (!m) continue;
    if (!m.id) continue;
    const lvl = Math.max(1, Math.floor(m.level || s.level || 1));
    m.level = lvl;
    if (!m.profession) m.profession = "fighter";
    if (!m.build) m.build = "balanced";

    if (typeof m.xp !== "number" || !Number.isFinite(m.xp)) m.xp = 0;
    m.skills = m.skills || {};
    m.skills.learned = m.skills.learned || {};
    if (!m.skills.sources || typeof m.skills.sources !== "object") m.skills.sources = {};
    if (!m.flags || typeof m.flags !== "object") m.flags = {};
    if (typeof ensureCompanionStarterSkills === "function") ensureCompanionStarterSkills(m);

    const wasDead = (m.hp || 0) <= 0;
    const hpPct = (m.maxHp || 0) > 0 ? clamp((m.hp || 0) / (m.maxHp || 1), 0, 1) : 1;
    const manaPct = (m.maxMana || 0) > 0 ? clamp((m.mana || 0) / (m.maxMana || 1), 0, 1) : 1;

    const sheet = computeCompanionSheet(lvl, m.profession, m.build, `id:${m.id}`);
    m.stats = sheet.stats;
    m.maxHp = sheet.maxHp;
    m.maxMana = sheet.maxMana;
    m.hp = wasDead ? 0 : Math.max(1, Math.floor(sheet.maxHp * hpPct));
    m.mana = Math.max(0, Math.floor(sheet.maxMana * manaPct));
  }
  s.skills = s.skills || {};
  s.skills.learned = s.skills.learned || {};
  if (!s.skills.sources || typeof s.skills.sources !== "object") s.skills.sources = {};
  for (const k of Object.keys(s.skills.learned)) {
    if (!s.skills.learned[k]) continue;
    s.skills.learned[k] = Math.min(7, Math.max(1, Math.floor(s.skills.learned[k] || 1)));
  }
  if (typeof s.skills.page !== "number") s.skills.page = 0;
  if (!Array.isArray(s.skills.draftQueue)) s.skills.draftQueue = [];
  if (typeof s.skills.draft === "undefined") s.skills.draft = null;

  if (!s.flags.skillDedupe20260120a && typeof dedupeLearnedSkillsByBaseLabel === "function") {
    const did = dedupeLearnedSkillsByBaseLabel(s);
    s.flags.skillDedupe20260120a = true;
    if (did && typeof autoSave === "function" && typeof state !== "undefined" && s === state) autoSave();
  }
  s.world = s.world || { turn: 0, day: 1, weather: "Clear" };
  if (typeof s.world.pendingEvent === "undefined") s.world.pendingEvent = null;
  if (typeof s.world.news === "undefined") s.world.news = null;
  s.arcs = s.arcs || {};
  s.arcs.investigation = s.arcs.investigation || { stage: 0, startedDay: null };
  s.effects = s.effects || {};
  s.character = s.character || { profession: null, build: null, created: false };
  if (typeof s.character.created !== "boolean") s.character.created = false;

  ensureEquipmentState(s);
  clampResourcesForState(s);

  grantStarterKitIfNeeded(s);
  grantStarterSkillKitIfNeeded(s);

  if (isAdminProfile(s.profile)) applyAdminGodMode(s);
}

function createNewState(profile) {
  const s = {
    profile,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    nodeId: "intro",
    level: 1,
    xp: 0,
    hp: 32,
    maxHp: 32,
    mana: 18,
    maxMana: 18,
    gold: 20,
    reputation: { Guild: 0, Rebels: 0, Crown: 0, Wilds: 0 },
    flags: {},
    activeQuest: null,
    pendingSide: null,
    inventory: { bandage: 1 },
    stats: { strength: 0, cunning: 0, arcana: 0, resilience: 0 },
    equipment: { weapon: null, armor1: null, armor2: null, armor3: null, armor4: null, accessory1: null, accessory2: null },
    skillPoints: 0,
    party: { members: [], recruits: [], recruitsDay: 0 },
    character: { profession: null, build: null, created: false },
    completed: { missions: {}, side: {} },
    missions: genMissions(MISSION_COUNT),
    sideQuests: genSideQuests(SIDE_QUEST_COUNT),
    log: [],
  };
  normalizeState(s);
  return s;
}

function setHomeMsg(msg) {
  homeMsg.textContent = msg;
}

function startNewProfile() {
  const profile = (profileNameEl.value || "").trim();
  if (!profile) {
    setHomeMsg("Enter a profile name first.");
    return;
  }
  if (String(profile).trim().toLowerCase() === "admin@") {
    setHomeMsg("admin@ has been retired. Use admin# with password admin12.");
    return;
  }
  if (isAdminProfile(profile)) {
    setHomeMsg("The admin profile is reserved. Use Continue with admin# and the admin password.");
    return;
  }
  state = createNewState(profile);
  state.nodeId = "character_create";
  appendLog("🗺️ New game started.");
  autoSave();
  renderHomeSaves();
  setHomeMsg(`Playing as ${profile}. Saved locally in your browser.`);
  enterNode("character_create");
}

function continueProfile() {
  const profileRaw = (profileNameEl.value || "").trim();
  if (String(profileRaw).trim().toLowerCase() === "admin@") {
    setHomeMsg("admin@ has been retired. Use admin# with password admin12.");
    return;
  }
  const profile = normalizeAdminProfileInput(profileRaw);
  if (!profile) {
    setHomeMsg("Enter the profile name you used before.");
    return;
  }

  if (profile === ADMIN_PROFILE) {
    if (!verifyAdminPassword()) {
      setHomeMsg("Incorrect admin password.");
      adminMode = false;
      adminEditingProfile = null;
      adminShowGame = true;
      setAdminDashboardUi();
      renderHomeSaves();
      return;
    }
    if (typeof ensureAdminAccount === "function") ensureAdminAccount(true);
    try {
      localStorage.removeItem(`virelia_admin_deleted:${ADMIN_PROFILE}`);
    } catch {
    }
    adminMode = true;
    adminEditingProfile = null;
    adminShowGame = true;
    setAdminDashboardUi();
  } else {
    adminMode = false;
    adminEditingProfile = null;
    adminShowGame = true;
    setAdminDashboardUi();
  }

  const loaded = safeLoad(profile);
  if (!loaded) {
    setHomeMsg("No save found for that profile.");
    return;
  }
  state = loaded;
  state.updatedAt = nowIso();
  normalizeState(state);
  const exileSeed = (!!state.flags?.["exile:active"] && typeof state.flags?.["exile:seed"] === "number")
    ? (state.flags["exile:seed"] >>> 0)
    : 0;
  if (!state.missions || state.missions.length !== MISSION_COUNT || exileSeed) state.missions = genMissions(MISSION_COUNT, exileSeed);
  if (!state.sideQuests || state.sideQuests.length !== SIDE_QUEST_COUNT || exileSeed) state.sideQuests = genSideQuests(SIDE_QUEST_COUNT, exileSeed);
  appendLog("⏳ Continued your journey.");
  setHomeMsg(`Continued as ${profile}.`);
  setTabUi();
  render();
  renderHomeSaves();
  let nid = state.nodeId || "crossroads";
  let inCreation = nid === "character_create" || nid === "character_build";
  if (!state.character?.created && !inCreation) {
    if (profile === ADMIN_PROFILE) {
      adminShowGame = true;
      setAdminDashboardUi();
      state.nodeId = "character_create";
      nid = "character_create";
      inCreation = true;
      appendLog("Admin profile setup: choose your profession and build.");
    } else {
      if (!state.character.profession) state.character.profession = "fighter";
      if (!state.character.build) state.character.build = "balanced";
      state.character.created = true;
      appendLog("Your save was from an older version. Assigned a default class/build.");
    }
  }
  enterNode(nid);
}

function resetProfile() {
  const profile = (profileNameEl.value || "").trim();
  if (!profile) {
    setHomeMsg("Enter a profile name to reset.");
    return;
  }
  if (isAdminProfile(profile)) {
    if (!verifyAdminPassword()) {
      setHomeMsg("Incorrect admin password.");
      return;
    }
    const s = createNewState(ADMIN_PROFILE);
    s.nodeId = "character_create";
    s.character = { profession: null, build: null, created: false };
    s.updatedAt = nowIso();
    safeSave(ADMIN_PROFILE, s);
    state = s;
    adminMode = true;
    adminEditingProfile = null;
    adminShowGame = true;
    setAdminDashboardUi();
    setHomeMsg("Admin save reset.");
    setTabUi();
    render();
    renderHomeSaves();
    enterNode("character_create");
    return;
  }
  safeDelete(profile);
  setHomeMsg(`Deleted save for ${profile}.`);
  if (state && state.profile === profile) {
    state = null;
    outputEl.innerHTML = "";
    choicesEl.innerHTML = "";
    statsEl.innerHTML = "";
    questListEl.innerHTML = "";
    renderEffectsUi();
  }
  renderHomeSaves();
}

function purgeAllNonAdminSaves() {
  const profiles = listSaveProfiles();
  for (const p of profiles) {
    if (isAdminProfile(p)) continue;
    safeDelete(p);
  }
  if (state && !isAdminProfile(state.profile)) {
    state = null;
    outputEl.innerHTML = "";
    choicesEl.innerHTML = "";
    statsEl.innerHTML = "";
    questListEl.innerHTML = "";
    renderEffectsUi();
  }
  if (typeof ensureAdminAccount === "function") ensureAdminAccount(true);
  setHomeMsg("Deleted all saves except admin#.");
  renderHomeSaves();
}

function doStatus() {
  if (!state) return;
  if (guardLevelUpDraft()) return;
  worldTick("Status");
  clearLog();
  pruneExpiredEffects();
  const t = nowMs();
  const fx = activeEffects()
    .map((e) => `${e.key} (${Math.max(0, Math.ceil((e.expiresAt - t) / 1000))}s)`)
    .join(", ") || "None";
  appendLog(
    [
      `Status — Level ${state.level}`,
      `Class: ${characterSummary(state)}`,
      `HP: ${state.hp}/${playerMaxHp()} | Mana: ${state.mana}/${playerMaxMana()} | Gold: ${state.gold}`,
      `XP: ${state.xp}/${xpToNext(state.level)}`,
      `Allegiance: ${getFlag("allegiance") || "None"}`,
      `Effects: ${fx}`,
    ].join("\n")
  );
  render();
  autoSave();
}

function isCombatActive(s) {
  const ev = s?.world?.pendingEvent;
  return !!ev && ev.kind === "combat" && ev.stage === "combat";
}

function doRest() {
  if (!state) return;
  if (guardLevelUpDraft()) return;
  normalizeState(state);
  pruneExpiredEffects();
  if (isCombatActive(state)) {
    appendLog("You can't rest during combat.");
    renderPendingEvent();
    return;
  }
  if (hasEffectOnState(state, "rested")) {
    appendLog("You aren't ready to rest again yet.");
    render();
    return;
  }
  worldTick("Rest");
  clearLog();
  const heal = Math.max(8, Math.floor(playerMaxHp() * 0.35));
  state.hp = Math.min(playerMaxHp(), state.hp + heal);
  if (state.party && Array.isArray(state.party.members)) {
    for (const m of state.party.members) {
      if (!m) continue;
      const h = Math.max(4, Math.floor((m.maxHp || 1) * 0.35));
      m.hp = Math.min(m.maxHp || 1, (m.hp || 0) + h);
      const mm = Math.max(0, Math.floor((m.maxMana || 0) * 0.35));
      m.mana = Math.min(m.maxMana || 0, (m.mana || 0) + mm);
    }
  }
  state.mana = Math.min(playerMaxMana(), state.mana + 8);
  clearEffect("bleeding");
  clearEffect("poisoned");
  addEffect("rested", 15000);
  appendLog("You rest. The city noise fades, and your breath steadies.");
  render();
  autoSave();
}

function doSave() {
  if (!state) return;
  if (guardLevelUpDraft()) return;
  worldTick("Save");
  clearLog();
  state.updatedAt = nowIso();
  const ok = safeSave(state.profile, state);
  appendLog(ok ? "💾 Saved." : "❌ Save failed (storage blocked?).");
  render();
}

function showInventory() {
  if (!state) return;
  if (guardLevelUpDraft()) return;
  normalizeState(state);
  syncSidebarButtons();

  const inCombat = isCombatActive(state);

  const renderInventoryView = (msg) => {
    outputEl.innerHTML = "";
    const header = document.createElement("div");
    header.className = "line";
    header.textContent = "Inventory:";
    outputEl.appendChild(header);

    const eq = state.equipment || {};
    const slots = [
      { key: "weapon", label: "Weapon" },
      { key: "armor1", label: "Armor 1" },
      { key: "armor2", label: "Armor 2" },
      { key: "armor3", label: "Armor 3" },
      { key: "armor4", label: "Armor 4" },
      { key: "accessory1", label: "Accessory 1" },
      { key: "accessory2", label: "Accessory 2" },
    ];
    const hasAnyEq = slots.some((s) => !!eq[s.key]);
    if (hasAnyEq) {
      const eqHeader = document.createElement("div");
      eqHeader.className = "line";
      eqHeader.textContent = "Equipped:";
      outputEl.appendChild(eqHeader);

      for (const sl of slots) {
        const k = eq[sl.key];
        if (!k) continue;

        const row = document.createElement("div");
        row.className = "line";
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.gap = "10px";
        row.style.alignItems = "center";

        const left = document.createElement("div");
        left.textContent = `${sl.label}: ${itemLabel(k)}`;

        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.gap = "6px";
        right.style.alignItems = "center";

        const btnUn = document.createElement("button");
        btnUn.className = "secondary";
        btnUn.textContent = "Unequip";
        btnUn.disabled = inCombat;
        btnUn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          unequipSlot(sl.key);
          renderInventoryView("");
        });

        const info = document.createElement("button");
        info.className = "iconBtn";
        info.textContent = "ℹ";
        info.title = "Item details";
        info.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openItemModal(k);
        });

        right.appendChild(btnUn);
        right.appendChild(info);
        row.appendChild(left);
        row.appendChild(right);
        outputEl.appendChild(row);
      }
    }

    if (msg) {
      const m = document.createElement("div");
      m.className = "line";
      m.textContent = msg;
      outputEl.appendChild(m);
    }

    const keys = Object.keys(state.inventory || {}).sort((a, b) => a.localeCompare(b));
    if (keys.length === 0) {
      const empty = document.createElement("div");
      empty.className = "line";
      empty.textContent = "(empty)";
      outputEl.appendChild(empty);
    } else {
      for (const k of keys) {
        const row = document.createElement("div");
        row.className = "line";
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.gap = "10px";
        row.style.alignItems = "center";

        const left = document.createElement("div");
        left.textContent = `${itemLabel(k)}: ${state.inventory[k]}`;

        const info = document.createElement("button");
        info.className = "iconBtn";
        info.textContent = "ℹ";
        info.title = "Item details";
        info.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openItemModal(k);
        });

        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.gap = "6px";
        right.style.alignItems = "center";

        if (isEquippableItem(k)) {
          const btnEq = document.createElement("button");
          btnEq.className = "secondary";
          const slot = equippedSlotForItem(state, k);
          btnEq.textContent = slot ? "Unequip" : "Equip";
          btnEq.disabled = inCombat;
          btnEq.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (slot) unequipItem(k);
            else equipItem(k);
            renderInventoryView("");
          });
          right.appendChild(btnEq);
        }

        right.appendChild(info);

        row.appendChild(left);
        row.appendChild(right);
        outputEl.appendChild(row);
      }
    }
    outputEl.scrollTop = outputEl.scrollHeight;
  };

  renderInventoryView("");

  showChoices([
    {
      label: `Use Bandage (${state.inventory.bandage || 0})`,
      onChoose: () => {
        if ((state.inventory.bandage || 0) <= 0) {
          renderInventoryView("No bandages.");
          return;
        }
        useItem("bandage");
        renderInventoryView("You patch your wounds.");
      },
    },
    {
      label: `Use Mana Tonic (${state.inventory.tonic || 0})`,
      onChoose: () => {
        if ((state.inventory.tonic || 0) <= 0) {
          renderInventoryView("No mana tonics.");
          return;
        }
        useItem("tonic");
        renderInventoryView("Your focus returns.");
      },
    },
    { label: "Back", className: "secondary", onChoose: () => enterNode(state.nodeId || "crossroads") },
  ]);
  renderStats();
  renderQuestList();
}

function showParty(msg) {
  if (!state) return;
  if (guardLevelUpDraft()) return;
  normalizeState(state);
  syncSidebarButtons();

  const members = Array.isArray(state.party?.members) ? state.party.members : [];
  const selectedId = String(state.party?.viewId || "");
  const selected = selectedId ? (members.find((m) => m && m.id === selectedId) || null) : (members[0] || null);
  if (selected && selected.id && state.party) state.party.viewId = selected.id;

  outputEl.innerHTML = "";
  if (questListEl) questListEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "line";
  header.textContent = "Party";
  outputEl.appendChild(header);

  if (msg) {
    const m = document.createElement("div");
    m.className = "line";
    m.textContent = msg;
    outputEl.appendChild(m);
  }

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = `Party size: ${partySize(state)} (max 4). Companions gain XP and can learn more techniques as they level.`;
  outputEl.appendChild(hint);

  if (!members.length) {
    const none = document.createElement("div");
    none.className = "hint";
    none.textContent = "(No companions yet. Visit the Tavern to recruit.)";
    outputEl.appendChild(none);
  } else {
    const list = document.createElement("div");
    list.className = "skillList";
    for (const c of members) {
      if (!c) continue;
      const p = professionDef(c.profession);
      const b = buildDef(c.build);

      const row = document.createElement("div");
      row.className = "skillRow";
      row.style.cursor = "pointer";
      if (selected && selected.id === c.id) row.style.borderColor = "#3a5a86";
      row.addEventListener("click", () => {
        state.party.viewId = c.id;
        showParty();
      });

      const left = document.createElement("div");
      left.className = "skillLeft";
      const title = document.createElement("div");
      title.className = "skillTitle";
      title.textContent = c.name || "Companion";
      const meta = document.createElement("div");
      meta.className = "skillMeta";
      meta.textContent = `${p ? p.label : titleCaseWord(c.profession)} / ${b ? b.label : titleCaseWord(c.build)} • Lv ${c.level} • XP ${c.xp || 0}/${xpToNext(c.level || 1)} • HP ${c.hp}/${c.maxHp} • Mana ${c.mana}/${c.maxMana}`;
      left.appendChild(title);
      left.appendChild(meta);

      const right = document.createElement("div");
      right.className = "skillActions";
      const btnView = document.createElement("button");
      btnView.className = "secondary";
      btnView.textContent = "View";
      btnView.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.party.viewId = c.id;
        showParty();
      });
      right.appendChild(btnView);

      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    }
    outputEl.appendChild(list);

    if (selected) {
      const p = professionDef(selected.profession);
      const b = buildDef(selected.build);
      const st = selected.stats || { strength: 0, cunning: 0, arcana: 0, resilience: 0 };
      const learned = selected.skills?.learned || {};
      const learnedKeys = Object.keys(learned).filter((k) => !!learned[k]);
      learnedKeys.sort((a, bb) => String(skillDef(a)?.label || a).localeCompare(String(skillDef(bb)?.label || bb)));
      const skillsLine = learnedKeys.length
        ? learnedKeys.map((k) => {
          const def = skillDef(k);
          const rank = Math.max(1, Math.floor(learned[k] || 1));
          return `${def.label} (Lv ${rank})`;
        }).join(", ")
        : "None";

      const detailHeader = document.createElement("div");
      detailHeader.className = "line";
      detailHeader.textContent = `Details: ${selected.name}`;
      outputEl.appendChild(detailHeader);

      const detail = document.createElement("div");
      detail.className = "hint";
      detail.style.whiteSpace = "pre-wrap";
      detail.textContent = [
        `Class: ${p ? p.label : titleCaseWord(selected.profession)} / ${b ? b.label : titleCaseWord(selected.build)}`,
        `Level: ${selected.level || 1}`,
        `XP: ${selected.xp || 0}/${xpToNext(selected.level || 1)}`,
        `HP: ${selected.hp}/${selected.maxHp} | Mana: ${selected.mana}/${selected.maxMana}`,
        `Strength: ${st.strength || 0}`,
        `Cunning: ${st.cunning || 0}`,
        `Arcana: ${st.arcana || 0}`,
        `Resilience: ${st.resilience || 0}`,
        `Skills/Spells: ${skillsLine}`,
      ].join("\n");
      outputEl.appendChild(detail);
    }
  }

  showChoices([
    { label: "Back", className: "secondary", onChoose: () => enterNode(state.nodeId || "crossroads") },
  ]);

  outputEl.scrollTop = 0;
  renderStats();
}

function spendSkill(key) {
  if (!state) return;
  normalizeState(state);
  if ((state.skillPoints || 0) <= 0) {
    appendLog("No skill points.");
    showSkills("No skill points.");
    return;
  }
  state.skillPoints -= 1;
  state.stats[key] = (state.stats[key] || 0) + 1;
  if (key === "arcana") state.maxMana += 1;
  if (key === "resilience") state.maxHp += 1;
  autoSave();
  showSkills(`You train ${key}.`);
}

function learnSkill(skillKey) {
  if (!state) return;
  normalizeState(state);
  const k = String(skillKey || "").trim();
  if (!k) return;
  if (state.skills.learned[k]) {
    showSkills("Already learned.");
    return;
  }
  if (typeof canLearnSkillByBaseLabel === "function" && !canLearnSkillByBaseLabel(state, k)) {
    showSkills("You already know a stronger version of that skill.");
    return;
  }
  if ((state.skillPoints || 0) <= 0) {
    showSkills("No skill points.");
    return;
  }
  state.skillPoints -= 1;
  const def = skillDef(k);
  state.skills.sources = (state.skills.sources && typeof state.skills.sources === "object") ? state.skills.sources : {};
  const src = state.skills.sources[k] || skillSourceForKey(state, k, def);
  if (typeof replaceLearnedSkillByBaseLabel === "function") {
    replaceLearnedSkillByBaseLabel(state, k, 1, src);
  } else {
    state.skills.learned[k] = 1;
    if (!state.skills.sources[k]) state.skills.sources[k] = src;
  }
  playChirp([520, 780, 1040], 180, "triangle", 0.055, 0);
  autoSave();
  showSkills(`Learned: ${def.label}.`);
}

function upgradeLearnedSkill(skillKey) {
  if (!state) return false;
  normalizeState(state);
  const k = String(skillKey || "").trim();
  if (!k) return false;
  if (!state.skills?.learned?.[k]) return false;
  const curRank = Math.max(1, Math.floor(state.skills.learned[k] || 1));
  if (curRank >= 7) return false;
  const def = skillDef(k);
  const cost = skillPointCost(def);
  if ((state.skillPoints || 0) < cost) return false;
  state.skillPoints -= cost;
  state.skills.learned[k] = Math.min(7, Math.max(1, Math.floor(state.skills.learned[k] || 1)) + 1);
  autoSave();
  return true;
}

function showSkills(msg) {
  if (!state) return;
  if (guardLevelUpDraft()) return;
  normalizeState(state);
  syncSidebarButtons();

  const wasSkillsView = !!(outputEl && outputEl.querySelector && outputEl.querySelector(".skillList"));
  const prevScrollTop = wasSkillsView ? (outputEl.scrollTop || 0) : 0;

  if (!state.character?.created || !state.character?.profession || !state.character?.build) {
    appendLog("Choose your profession and build first.");
    enterNode("character_create");
    return;
  }

  const profKey = state.character?.profession || "fighter";
  const buildKey = state.character?.build || "balanced";
  const p = professionDef(profKey);
  const b = buildDef(buildKey);
  const pLabel = p ? p.label : titleCaseWord(profKey);
  const bLabel = b ? b.label : titleCaseWord(buildKey);

  const ownedOnly = !!state.skills.ownedOnly;
  const allDefs = [];
  for (let i = 1; i <= SKILLS_PER_COMBO; i++) allDefs.push(skillDefFromParts(profKey, buildKey, i));
  const filteredDefs = ownedOnly
    ? allDefs.filter((d) => !!state.skills.learned[d.key])
    : allDefs;

  const total = filteredDefs.length;
  const maxPage = Math.max(0, Math.ceil(total / SKILLS_PER_PAGE) - 1);
  state.skills.page = clamp(state.skills.page || 0, 0, maxPage);
  const startIdx = state.skills.page * SKILLS_PER_PAGE;
  const endIdx = Math.min(total, startIdx + SKILLS_PER_PAGE);

  outputEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "line";
  header.textContent = `Skills — ${pLabel} / ${bLabel}`;
  outputEl.appendChild(header);

  const meta = document.createElement("div");
  meta.className = "line";
  meta.textContent = `Skill Points: ${state.skillPoints || 0}`;
  outputEl.appendChild(meta);

  const stats = document.createElement("div");
  stats.className = "line";
  const st = effectiveStats(state);
  stats.textContent = `Strength: ${st.strength} | Cunning: ${st.cunning} | Arcana: ${st.arcana} | Resilience: ${st.resilience}`;
  outputEl.appendChild(stats);

  if (msg) {
    const m = document.createElement("div");
    m.className = "line";
    m.textContent = msg;
    outputEl.appendChild(m);
  }

  const learnHint = document.createElement("div");
  learnHint.className = "hint";
  learnHint.textContent = "Skills are learned from Skill Traders you meet from time to time (and from level-up rewards). You can upgrade learned skills using Skill Points.";
  outputEl.appendChild(learnHint);

  const pager = document.createElement("div");
  pager.className = "line";
  pager.textContent = total === 0
    ? (ownedOnly ? "Owned skills: none" : "Skillbook: none")
    : (ownedOnly
      ? `Owned skills: ${startIdx + 1}-${endIdx} of ${total}`
      : `Skillbook: ${startIdx + 1}-${endIdx} of ${total}`);
  outputEl.appendChild(pager);

  const filterRow = document.createElement("div");
  filterRow.className = "row";
  const btnFilter = document.createElement("button");
  btnFilter.className = "secondary";
  btnFilter.textContent = ownedOnly ? "Showing: Owned" : "Showing: All";
  btnFilter.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    state.skills.ownedOnly = !state.skills.ownedOnly;
    state.skills.page = 0;
    autoSave();
    showSkills("", { resetScroll: true });
  });
  filterRow.appendChild(btnFilter);
  outputEl.appendChild(filterRow);

  const list = document.createElement("div");
  list.className = "skillList";
  for (const def of filteredDefs.slice(startIdx, endIdx)) {
    const learned = !!state.skills.learned[def.key];
    const rank = Math.max(0, Math.floor(state.skills.learned[def.key] || 0));

    const row = document.createElement("div");
    row.className = `skillRow${def.powerful ? " powerful" : ""}`;

    const left = document.createElement("div");
    left.className = "skillLeft";
    const title = document.createElement("div");
    title.className = "skillTitle";
    title.textContent = def.label;
    const sub = document.createElement("div");
    sub.className = "skillMeta";
    sub.textContent = `${titleCaseWord(def.focus)} • Tier ${def.tier}${def.powerful ? " • Powerful" : ""}${learned ? ` • Lv ${Math.max(1, rank)}` : ""}`;
    left.appendChild(title);
    left.appendChild(sub);

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

    const btnLearn = document.createElement("button");
    btnLearn.className = "secondary";
    btnLearn.textContent = learned ? "Learned" : "Learn (Trader)";
    btnLearn.disabled = true;
    btnLearn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showSkills("Find a Skill Trader to learn new techniques.");
    });

    const btnUpgrade = document.createElement("button");
    btnUpgrade.textContent = "Upgrade";
    btnUpgrade.style.display = learned ? "inline-block" : "none";
    const upCost = skillPointCost(def);
    const atCap = learned && Math.max(1, rank) >= 7;
    btnUpgrade.title = atCap
      ? "Max level reached (Lv 7). Find a higher-tier version from a Skill Trader or level-up reward."
      : `Upgrade this skill (-${upCost} Skill Points)`;
    btnUpgrade.disabled = !learned || atCap || (state.skillPoints || 0) < upCost;
    btnUpgrade.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (Math.max(1, Math.floor(state.skills.learned[def.key] || 1)) >= 7) {
        showSkills("Max level reached (Lv 7). Find a higher-tier version from a Skill Trader or level-up reward.");
        return;
      }
      const ok = upgradeLearnedSkill(def.key);
      if (!ok) {
        showSkills("Not enough Skill Points.");
        return;
      }
      const nextRank = Math.max(1, Math.floor(state.skills.learned[def.key] || 1));
      showSkills(`Upgraded: ${def.label} (Lv ${nextRank}).`);
    });

    right.appendChild(info);
    right.appendChild(btnLearn);
    right.appendChild(btnUpgrade);

    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  }
  outputEl.appendChild(list);

  showChoices([
    { label: "Prev Page", className: "secondary", onChoose: () => { state.skills.page = Math.max(0, (state.skills.page || 0) - 1); showSkills("", { resetScroll: true }); } },
    { label: "Next Page", className: "secondary", onChoose: () => { state.skills.page = Math.min(maxPage, (state.skills.page || 0) + 1); showSkills("", { resetScroll: true }); } },
    { label: "+ Strength", onChoose: () => spendSkill("strength") },
    { label: "+ Cunning", onChoose: () => spendSkill("cunning") },
    { label: "+ Arcana", onChoose: () => spendSkill("arcana") },
    { label: "+ Resilience", onChoose: () => spendSkill("resilience") },
    { label: "Back", className: "secondary", onChoose: () => enterNode(state.nodeId || "crossroads") },
  ]);

  const resetScroll = !!(arguments.length > 1 && arguments[1] && arguments[1].resetScroll);
  outputEl.scrollTop = resetScroll ? 0 : prevScrollTop;
  renderStats();
  renderQuestList();
}

function showAchievements() {
  if (!state) return;
  if (guardLevelUpDraft()) return;
  const doneM = Object.keys(state.completed?.missions || {}).length;
  const doneS = Object.keys(state.completed?.side || {}).length;
  appendLog("Progress:");
  appendLog(`Missions completed: ${doneM}`);
  appendLog(`Side quests completed: ${doneS}`);
  showChoices([{ label: "Back", className: "secondary", onChoose: () => enterNode(state.nodeId || "crossroads") }]);
  render();
}

function init() {
  if (!btnNew) return;

  if (typeof ensureAdminAccount === "function") ensureAdminAccount();

  const href = document.querySelector('link[href*="style.css"]')?.getAttribute("href") || "";
  const m = /[?&]v=([^&]+)/.exec(href);
  const buildV = m ? m[1] : "dev";
  if (!document.getElementById("buildBadge")) {
    const badge = document.createElement("div");
    badge.id = "buildBadge";
    badge.className = "buildBadge";
    badge.textContent = `Build ${buildV}`;
    document.body.appendChild(badge);
  }
  window.vireliaSanityCheck = () => {
    const s = state;
    const inCombat = !!s?.world?.pendingEvent && s.world.pendingEvent.kind === "combat" && s.world.pendingEvent.stage === "combat";
    const phoenixInCatalog = (() => {
      try {
        const d = itemDef("phoenix_feather");
        return !!d && !!d.consumable;
      } catch {
        return false;
      }
    })();
    const result = {
      build: buildV,
      ui: {
        cssLoaded: /\bstyle\.css\?v=/.test(href),
        hasModalCss: !!document.querySelector(".modalOverlay"),
      },
      features: {
        targetedItemUse: typeof useItem === "function" && useItem.length >= 3,
        restoreManaPartyTarget: typeof restoreManaPartyTarget === "function",
        combatItemTargeting: typeof combatPlayerAction === "function",
        companionScaling: typeof computeCompanionSheet === "function",
        companionAutoUse: typeof companionAiAct === "function",
        phoenixFeather: phoenixInCatalog,
      },
      runtime: {
        profile: s?.profile || null,
        inCombat,
      },
    };
    console.log("Virelia sanity check", result);
    return result;
  };

  btnNew.addEventListener("click", startNewProfile);
  btnContinue.addEventListener("click", continueProfile);
  btnReset.addEventListener("click", resetProfile);
  if (btnPurgeNonAdmin) btnPurgeNonAdmin.addEventListener("click", purgeAllNonAdminSaves);
  if (btnAdminLogout) btnAdminLogout.addEventListener("click", () => {
    adminMode = false;
    adminEditingProfile = null;
    adminShowGame = true;
    if (adminPassEl) adminPassEl.value = "";
    setHomeMsg("Admin logged out.");
    renderHomeSaves();
  });
  if (btnAdminToggleGame) btnAdminToggleGame.addEventListener("click", () => {
    if (!isAdminSessionActive()) return;
    adminShowGame = !adminShowGame;
    setAdminDashboardUi();
  });
  if (btnAdminCreateUser) btnAdminCreateUser.addEventListener("click", adminCreateUserSave);

  btnRest.addEventListener("click", doRest);
  btnStatus.addEventListener("click", doStatus);
  if (btnInventory) btnInventory.addEventListener("click", () => { worldTick("Inventory"); clearLog(); showInventory(); autoSave(); });
  if (btnSkills) btnSkills.addEventListener("click", () => { worldTick("Skills"); clearLog(); showSkills(); autoSave(); });
  if (typeof btnParty !== "undefined" && btnParty) btnParty.addEventListener("click", () => { worldTick("Party"); clearLog(); showParty(); autoSave(); });
  if (btnAchievements) btnAchievements.addEventListener("click", () => { worldTick("Achievements"); clearLog(); showAchievements(); autoSave(); });
  btnSave.addEventListener("click", doSave);

  tabMissions.addEventListener("click", () => { worldTick("Tab: Missions"); clearLog(); activeTab = "missions"; questPage = 0; setTabUi(); render(); });
  tabSideQuests.addEventListener("click", () => { worldTick("Tab: Side Quests"); clearLog(); activeTab = "side"; questPage = 0; setTabUi(); render(); });

  if (btnPrevQuest) btnPrevQuest.addEventListener("click", () => {
    const inMarket = !!state && (state.nodeId || "") === "market";
    worldTick(inMarket ? "Market: Prev" : "Quest Board: Prev");
    clearLog();
    if (inMarket) marketPage = Math.max(0, marketPage - 1);
    else questPage = Math.max(0, questPage - 1);
    render();
  });
  if (btnNextQuest) btnNextQuest.addEventListener("click", () => {
    const inMarket = !!state && (state.nodeId || "") === "market";
    worldTick(inMarket ? "Market: Next" : "Quest Board: Next");
    clearLog();
    if (inMarket) marketPage = marketPage + 1;
    else questPage = questPage + 1;
    render();
  });

  setHomeMsg("Enter a profile name, then Start New or Continue.");
  setTabUi();

  renderHomeSaves();

  renderEffectsUi();
  setInterval(() => {
    if (!state) return;
    pruneExpiredEffects();
    tickEffects();
    renderEffectsUi();
  }, 500);
}

init();
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
  streets: { label:'Low Streets', danger:1, cost:{}, connects:['docks','market','gate','ruins'], desc:'Crowded, watchful. Rumors.' },
  docks: { label:'Dock Warrens', danger:2, cost:{ waterskin:1 }, connects:['streets','marsh','market'], desc:'Salt, knives. Smugglers offer mushroom.' },
  market: { label:'High Market', danger:0, cost:{}, connects:['streets','docks','gate','crossroads'], desc:'Safe-ish. Korg forge.' },
  gate: { label:'Virelia Gate', danger:1, cost:{ waterskin:1 }, connects:['streets','road','market'], desc:'Leaving costs water. Guards if watchHeat>30.' },
  road: { label:'Open Road', danger:2, cost:{ ration:1, waterskin:1 }, connects:['gate','ruins','marsh'], desc:'Ambush chance danger+risk+watchHeat.' },
  ruins: { label:'Old Ruins', danger:3, cost:{ torch:1, ration:1 }, connects:['road','streets','vault'], desc:'Needs torch else -20% accuracy. Hollow child.' },
  marsh: { label:'Fog Marsh', danger:3, cost:{ ration:1, waterskin:1 }, connects:['road','docks','wilds'], desc:'High wilds. Forage herbs poison risk 15%.' },
  vault: { label:'Sun Vault Approach', danger:4, cost:{ torch:1, waterskin:1 }, connects:['ruins'], desc:'Shard may be found. Looking flags you.' },
  wilds: { label:'Deep Wilds', danger:5, cost:{ ration:2, waterskin:2, torch:1 }, connects:['marsh'], desc:'Most dangerous. Rare loot. Wilds+1 if camp no ritual.' },
  crossroads: { label:'Crossroads', danger:0, cost:{}, connects:['market','streets','road'], desc:'Hub. Mara judges.' }
};

function ensureV2Roam(s) {
  if (!s) return null;
  s.roam = s.roam || {};
  if (!s.roam.v2) s.roam.v2 = { current:'crossroads', visited:{}, risk:0, steps:0 };
  return s.roam.v2;
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
            const cost = targetArea.cost || {};
            for (const k in cost) {
              if ((s.inventory && s.inventory[k] || 0) < cost[k]) { appendLog('Need: ' + k + 'x' + cost[k]); return; }
            }
            for (const k in cost) { if (cost[k]>0) consumeInvItem(s,k,cost[k]); }
            v2.current = targetKey;
            v2.visited[targetKey]=true;
            appendLog('Traveled to ' + targetArea.label);
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
/* VIRELIA V2 - LORE CODEX - Full World Building
   Adds deep lore for every system so game feels like real RPG
*/

console.log('[VIRELIA LORE] Loading codex...');

const LORE_CODEX = {
  world: {
    virelia_founded: {
      title: 'Foundation of Virelia',
      category: 'world',
      unlock: 'always',
      text: `Virelia was not built — it was carved. Three hundred years ago, miners chasing a vein of sun-ore broke into a cavern of pure light. The Sun Vault. Light that burned without fuel, that made crops grow in winter, that kept the Fog Marsh from swallowing roads.

A city grew around it like infection around a wound. Walls of black basalt, streets angled to catch light. The Guild claimed the weighing houses. The Crown claimed the gate. The Wilds — old things that lived before men cut trees — were pushed back by lanterns.

The Vault was never infinite. It cracked three years ago, on a night the moons overlapped. No one saw it crack. They only saw the light stutter. Then the fog came back.`
    },
    sun_vault: {
      title: 'The Sun Vault',
      category: 'world',
      unlock: 'vault',
      text: `The Vault is not a mine. It is a heart. A lattice of crystalized sunlight, humming at a frequency that makes teeth ache. Scholars say it is a fallen star, caught. Priests say it is a god's eye, left open.

When it cracked, it did not shatter. It wept. Light leaks in thin threads that dance in dust. Where light touches wild ground, things grow wrong — mushrooms that whisper, vines that write.

Staring into it directly is forbidden by Crown law. Those who did report seeing themselves, older, standing behind them. Consequence: flag looked_into_vault unlocks Void Sight.

Mechanic: sunVault % tracks seal. 100% = contained. 0% = wilds consume city. Rest in Deep Wilds without ward = -1% vault. Crown of Thorns equipped = -1/day.`
    },
    wilds: {
      title: 'The Wilds & Fog Marsh',
      category: 'world',
      unlock: 'wilds',
      text: `Before streets, there were roots. The Wilds is not forest. It is memory of forest — what forest thinks it used to be. It remembers when Virelia was marsh and stone, and it wants to remember again.

Fog Marsh is its mouth. Travelers say fog has weight. It clings to ration packs, makes waterskins taste of iron. The deeper you go, the more herbs you find — sageleaf that has never seen sun, nightbloom that only opens when you are afraid.

The Hollow Child lives there. Some say child is bait. Some say child is what Wilds does when it tries to be human and fails.

Mechanic: wildsSpread % rises with every wilds_mushroom eaten, every rest in wilds unwarded, every failed seal. >50% = Hollow Child vanishes, plague +1 per day, shop prices +40%.`
    },
    plague: {
      title: 'The Lantern Cough',
      category: 'world',
      unlock: 'plague',
      text: `Cough that comes from ashfall nights. Children first. Old miners second. Healers call it ash lung. Lys the Alchemist says it's not lung at all — it's light starvation.

When vault leaks, it leaks not only light but absence of light. A hole in air where light should be. Breathing that hole makes you cough light.

Mechanic: plague stat 0-100. >30 = mild poison on rest in wilds/ruins. >60 = -1 HP per day. Managed by sealing breaches with Sun Vault Shards.`
    },
    doppelganger: {
      title: 'The Doppelganger Rumor',
      category: 'mystery',
      unlock: 'letter_to_self',
      text: `Four people have reported seeing themselves this year. Not reflection. A second self walking Low Streets, buying bread, paying with coin that turns to ash in morning.

You found a letter in YOUR handwriting, dated two years before you arrived. It says: 'Don't trust the lantern shop.'

Either you have been here before and forgot, or something is wearing your face to learn how to be you. The Doppel Smoke item is distilled from trying to catch it — it clones your shape for escape, but rumor spreads copy was seen robbing.

Weird Mystery tone: Never fully explain. Let it be consequence of Void Sight and Sun Vault staring. Flag doppelgangerRumor = true adds random market encounter where stallholder says 'You were here yesterday.'`
    }
  },
  factions: {
    guild: {
      title: 'The Guild - Order & Coin',
      category: 'factions',
      unlock: 'Guild',
      text: `Blue seal, black ledger. Guild does not rule — it weighs. Everything has price, including forgiveness. They built Virelia's weighing houses, then decided what could be weighed.

Power: Controls market. When guildPower <30, economy crashes, prices +60%, Korg blacksmith refuses credit. When >70, rare items appear in market but Rebels ambush more.

Leader: Factor Brine. Never seen without gloves. Says gloves keep coin from staining hands. If you bring Guild Seal, he gives Sigil of Guildmaster. If you betray Guild (steal ledger, sell fake), economy -20%, he sends debt collectors after you hold debt_marker_guild.

Moral: Guild promises stability. Stability means some people are always crushed underneath.`
    },
    crown: {
      title: 'The Crown - Law & Steel',
      category: 'factions',
      unlock: 'Crown',
      text: `Captain Varric's men hold Gate in polished plate that hasn't seen battle in years. Crown law is simple: Pay tax, don't look in vault, don't harbor rebels, die quietly if told.

Power: watchHeat stat. When Crown power >60, guard checkpoints at market/gate, random papers check, +8 gold bribe or -1 rep. When <30, rebels control dock at night.

You can turn in Crown Writ for Amulet of Unbroken Oath. If you break oath (kill innocent after taking writ), amulet cracks and Crown rep -5, unlocks Oathbreaker mix skill.

Moral: Law without mercy becomes another gang.`
    },
    rebels: {
      title: 'Rebels - Freedom & Risk',
      category: 'factions',
      unlock: 'Rebels',
      text: `They live in dock warrens, mark doors with charcoal. No leader, only runner with token. They say: 'We don't want to rule. We want to stop being ruled.'

Power: rebelPower high = cheaper tavern recruits, more wilds_mushroom in market, but Crown checkpoints increase. Low = they are hunted, side quests force you to choose: hide them (watchHeat+5) or give them up (Rebels-5 guilt flag).

Blood Oath item: Sign in blood, get Rebels +3 Crown -2, but if you later betray rebels, you unlock Oathbreaker and they send ambush at night.

Moral: Freedom is expensive. Someone always pays.`
    },
    wilds_faction: {
      title: 'The Wilds - The Fourth Faction',
      category: 'factions',
      unlock: 'Wilds',
      text: `Wilds is not people. But city treats it as faction because it acts like one. It takes. It gives. It remembers.

Reputation with Wilds rises when you keep Hollow Child Doll, eat wilds mushrooms, rest without fire. Falls when you sell sun vault shards, kill in ruins, burn marsh.

Wilds rep >=5 unlocks Wild Hunt Calling mix skill. Rep <= -5 makes forage in marsh poison you 30% time.

The wilds does not hate you. It just thinks you are a temporary shape that will become soil soon.`
    }
  },
  locations: {
    crossroads: {
      title: 'Crossroads - The City Heart',
      category: 'locations',
      unlock: 'always',
      text: `Four roads meet at a cracked bell. No bellringer — bell rings when vault flickers. Elder Mara sits on crate that has been there since before she was born.

Mara remembers: If you left party member to die, affinity -5. If you gave to beggars, +2. If you returned ledger to rightful faction, +3.

This is hub. Missions board nailed to old shrine. Every nail hole is a promise someone did not keep. From here you can reach Market (safe-ish), Low Streets (rumors), Gate (exit), Tavern (recruits), Free Roam map (10 regions).

World state visible here: SunVault %, powers, watchHeat. City whispers on walls change based on powers.`
    },
    low_streets: {
      title: 'Low Streets',
      category: 'locations',
      unlock: 'streets',
      text: `Lanterns here burn with oil cut with water to save coin. Light is yellow and lies. Children know which puddles reflect true and which show other streets that don't exist.

Danger 1. Encounters 10% + risk. Mostly pickpockets (steal 2-8 gold, consequence steal flag) and rumor mongers. If you have debt_marker_guild, debt collectors (Bandit tier 2) appear here.

Connects to Docks, Market, Gate, Ruins. Discovering connection to Ruins unlocks lore: Ruins are older than Virelia, pre-light city.

If you forage here, you find bandages, cheap tonics. Rarely find letter_to_self if doppelganger rumor active.`
    },
    docks: {
      title: 'Dock Warrens',
      category: 'locations',
      unlock: 'docks',
      text: `Salt rots rope and promises. Smugglers trade wilds_mushroom for waterskins because mushroom makes you not need water for a night — but you dream of roots.

Danger 2, cost waterskin 1. Smugglers: If you have Wilds rep >=3, they sell sun_vault_shard for 80g instead of 150g. If you betrayed rebels before, they attack.

Story hook: A boat that left 3 years ago returned empty last week. Its log shows it reached a place where sun never sets, even at night. Crew gone. Log ends mid-word.

Forage finds herb_nightbloom, rune_shard rarely. Scout may meet Jun tavernkeep's sister who tells you tavern recruit was Crown informant.`
    },
    market: {
      title: 'High Market',
      category: 'locations',
      unlock: 'market',
      text: `Lanterns here are real. Glass, oil, honest wick. Prices are not honest. They breathe with economy stat.

When economy 50 = normal. 10 = +80% price (Guild weak, scarcity). 100 = -30% price (Guild strong, surplus). Korg blacksmith, Lys alchemist, Vael enchanter, crafter, healer all here. Their attitudes affect costs:

Korg: If you bring ore, price -10%. If you stole from Guild, +25% and dialogue: 'I heard about that ledger. Get out.'
Lys: If you used her brews to poison innocents (use smoke_bomb on beggars), she refuses you and applies antidote costs double.
Vael: If looked_into_vault, he trades rare rune lore: ring_of_true_sight.

Market is only place where watchHeat checkpoint triggers if >60. Guards may ask papers. Pay 8g or lose Crown rep.`
    },
    ruins: {
      title: 'Old Ruins - Pre-Light City',
      category: 'locations',
      unlock: 'ruins',
      text: `Under Virelia, there is another city that did not need light. Its stones are smooth where hands have never been. It has no windows because it did not want to see sky.

Danger 3, cost torch 1 ration 1. Without torch, accuracy -20% and you stumble HP-4 50% time. With torch, you may see Hollow Child.

Hollow Child: Appears if wildsSpread <50 and you have not sold doll. Offers doll. If you keep, night whispers restore +1 mana but plague +1 per long rest. If you sell for 40g, Wilds rep -5, Mara affinity -3, and you hear crying on rest for 3 days.

Ruins contain loc_XX items (unique finds). Finding all 50 unlocks Chronicle of Ashes. In ruins you can find sun_vault_shard rarely (5%) and crown_of_thorns (1% cursed).

Lore: This city fell because they looked too long into something like vault, before vault.`
    },
    marsh: {
      title: 'Fog Marsh',
      category: 'locations',
      unlock: 'marsh',
      text: `Fog is not weather here. It is slow water. It has taste of iron. You walk through it and it walks through you.

Danger 3, cost ration+water. High wilds encounters. Forage 70% finds something, but 15% poison (if you fail resilience check). Herbs here are stronger: sageleaf heals +2 more.

Traveling through marsh without torch has 30% chance to trigger 'A Pair of Eyes' mystery event — choice to investigate (cunning) for gold or raise torch.

If Wilds rep <= -5, forage poisons you 30% not 15%. If rep >=5, forage may give wilds_mushroom which counts for Gutter Saint unlock.

Connects to road, docks, deep wilds. Deep wilds path discovered only if visited marsh 3+ times — gatekept by experience.`
    },
    vault: {
      title: 'Sun Vault Approach',
      category: 'locations',
      unlock: 'vault',
      text: `Light gets heavy near vault. Air hums. Your teeth ache. Guards are gone — Crown abandoned this post when first guard came back with eyes burned white.

Danger 4, cost torch+water. Contains vault. Looking inside is action with consequence:

Choice 1: Stare — gain sun_vault_shard +1, wilds+1, flag looked_into_vault true, unlocks Void Sight mix skill, doppelganger rumor may start, Vael will trade true sight.
Choice 2: Place shard to seal — consumes shard, sunVault +5, wilds -5, plague -2, Crown rep +1 (if you do), economy +3.
Choice 3: Leave — nothing, but you hear vault humming your name later when you rest.

Vault is why classes exist: Fighter learns to guard eyes, Rogue to move without seeing, Mage to read light, Cleric to pray against it, Ranger to track where light does not go.

If sunVault <30%, approach spawns Wraiths (tier 4) — lore: those who stared too long.`
    },
    wilds_deep: {
      title: 'Deep Wilds',
      category: 'locations',
      unlock: 'wilds',
      text: `Trees here are not trees. They are attempts at trees by something that saw tree once and tried to remember. They have too many branches, wrong bark.

Danger 5, cost 2 ration 2 waterskin 1 torch + ritual ward needed. Most dangerous region. Resting without ritual_ward (crafted from rune_shard+ember_gem) triggers wilds_deal +1 and you get cursed 30% chance.

Loot rare: aegis_plate, crown_of_sun_vault 2% each, sun_vault_shard 10%, hollow_child_doll 5% if you lost previous.

Mechanic: If you camp 3 times here, you get flag wilds_touched — unlocks Wild Hunt Calling easier, but Hollow Child vanishes and Mara says 'You smell like wet bark now.'

This is endgame explore area. Free roam steps here increase risk 18 per explore vs 12 elsewhere.`
    }
  },
  people: {
    mara: {
      title: 'Elder Mara - Crossroads Keeper',
      category: 'people',
      unlock: 'mara_crossroads',
      text: `Seventy, bent, unkillable. She was here when vault was whole. Says she remembers foundation stone being laid, but stone says it was laid 300 years ago. Either she lies or stone does.

Affinity tracked:
- Left party member behind to die: -5, dialogue changes: 'You left them. I remember.'
- Gave to beggars (bowl): +2 per give, after 3 gives she tells you about Gutter Saint skill.
- Returned ledger to correct faction: +3, gives beggars_bowl item.
- Sold Hollow Child Doll: -3, rest dialog adds crying.
- Looked into vault: +1 but worried: 'Now you have two shadows.'

She knows consequence system: She can tell you world state if you ask, and gives rumor about next twist if affinity >=5.

Memories stored in flags.npcMemories.mara_crossroads array with day.`
    },
    korg: {
      title: 'Korg - Blacksmith',
      category: 'people',
      unlock: 'korg_blacksmith',
      text: `Forearms like hams, burns that look like maps. Korg forges what city needs, not what it wants.

Mechanics:
- Bring ore_iron: forge dagger cost -5g
- Bring ore_silver: forge steel sword -20g
- If you stole from Guild (consequence:steal + economy <30), his prices +25% and says 'I heard about that ledger.'
- If you bring sun_vault_shard, he can forge Lantern of Silent Paths (not just enchanter).
- Attitude negative if you sold hollow doll? He has child.

Backstory: His daughter died of Lantern Cough last winter. He blames vault crack. If you seal vault +10% total, he gives discount -15% permanently and teaches you Ironbark Gauntlets recipe.

He is the only one who can reforge Crown of Thorns into Crown of Sun Vault, but requires 1 shard + 200g + guilt flag.`
    },
    lys: {
      title: 'Lys - Alchemist',
      category: 'people',
      unlock: 'lys_alchemist',
      text: `Stained gloves, eyes that water from fumes. She grows nightbloom in boxes that have no light inside. How? She won't say.

If you poisoned innocents using her brews (story: use smoke_bomb on beggars event), she refuses service and antidote costs double, says 'My craft is not murder.'

If Wilds rep >=5, she teaches you wilds_mushroom safe preparation (removes poison chance).

She knows plague lore: Bring her 3 sageleaf + 1 nightbloom, she gives antidote recipe that also cures plague -1.

If you bring hollow_child_doll, she says 'This is not doll. This is root wrapped in cloth to look like doll.' and offers to burn it for wilds -2 but doll gone. Moral choice.`
    },
    vael: {
      title: 'Vael - Enchanter',
      category: 'people',
      unlock: 'vael_enchanter',
      text: `Hooded, voice like paper tearing. Enchanter who claims vault is eye, not star.

Unlocks:
- If looked_into_vault flag true: Trades rune lore, sells ring_of_true_sight for 2 rune_shard + ember_gem (normally 4 shards 2 gems). Also tells you about doppelganger — says vault creates copies when it tries to remember people.

- If you bring letter_to_self: He reads and says 'You wrote this. Then you forgot. Then you will write again. Cycle.' Gives void_sight skill discount -1 SP.

- He can uncurse crown_of_thorns but needs 2 ember_gem + guilt flag cleared via helping Hollow Child.

He is not human? If wildsSpread >70, his dialogue changes to include root metaphors, suggests he is wilds trying to be human — parallel to Hollow Child.`
    },
    jun: {
      title: 'Jun - Tavernkeep',
      category: 'people',
      unlock: 'jun_tavern',
      text: `Tavernkeep who never drinks. Recruits change daily. Recruit cost = 25 + level*6 + recruit.level*3, but modified by Jun affinity:

Affinity +5: -10g discount
Affinity -5: +15g surcharge
Affinity -10 (you abandoned party): Refuses recruits, says 'You leave people. Why would they follow you?'

How affinity changes:
- Hire recruit +1
- Dismiss recruit -1 (unless low HP dismiss for healing then +0)
- Leave party member dead (not revive) -5
- Give gold to tavern (buy round 10g) +2

He knows rumors: If you ask, he tells next day's weather + if siege at Crossroads imminent (requires level 60).`
    },
    hollow_child: {
      title: 'Hollow Child - Mystery',
      category: 'people',
      unlock: 'child_ruins',
      text: `No one agrees what child looks like. Some say boy 8, barefoot. Some say girl with ash hair. Always holds doll.

Lore: Wilds trying to understand child shape. It gives doll because wilds thinks children give dolls. If you keep doll, wilds thinks its attempt worked, stays curious and whispers mana. If you sell doll, wilds thinks attempt failed, withdraws — Wilds rep -5, child vanishes until wildsSpread <50 again.

Child is key to Gutter Saint and Wild Hunt. Giving doll to Lys to burn ends child questline but reduces wilds threat. Keeping doll for 7 days unlocks hollow_child_doll lore where doll talks: says 'Vault is mouth, we are food.'

If you have crown_of_thorns equipped when meeting child, child cries and runs — affinity check.`
    }
  },
  monsters: {
    bandit: {
      title: 'Bandits & Thugs',
      category: 'monsters',
      unlock: 'always',
      text: `Not monsters, just hungry. Bandits spawn more when economy <30. They have surrender mechanic at <25% HP — 60% chance they beg mercy. Capturing them gives choice: Crown (+2 Crown 20g) or Rebels (+2 Rebels 10g Guild-1).

Lore: Many bandits are former Guild caravan guards laid off after vault crack. If you have Guild rep >=5, some bandits don't attack, say 'Not worth my contract.'

Twist: 20% of bandits carry sealed_letter? No, only courier. But they may carry debt_marker_guild if they were debt collectors.`
    },
    wolf_boar: {
      title: 'Wolves & Boars',
      category: 'monsters',
      unlock: 'always',
      text: `Wilds animals. Spawn more in marsh/road/ruins. Wolves hunt in packs — extra enemy if more than 1 wolf. Boars charge first round + accuracy.

Consequence: Killing wolves in wilds reduces Wilds rep -0.5 per kill (hidden). Killing them when you have hollow doll makes doll cry and lose 1 mana that day.

If you have Wild Hunt skill, you can call wolves as allies once per free roam explore in wilds — they fight for you one combat then leave, but wilds+1.`
    },
    ghoul_wraith: {
      title: 'Ghouls, Wraiths, Hollow',
      category: 'monsters',
      unlock: 'ruins',
      text: `Those who stared too long into vault. Ghouls are failed enchanter experiments. Wraiths are guards who went blind from light.

Spawn mostly in ruins/vault. Wraith accuracy high (0.75+), but low HP. Ghoul poison chance 40% (venom name). Hollow are ruins attempt at human.

Lore: Vael says 'We tried to bottle light. Light bottled us.'

Twist: 10% chance a wraith is recognizable — former companion from tavern who you dismissed? If so, affinity check, and you can try to talk (Cunning) instead of fight. Success = monster becomes soul thread and you gain sun_vault_shard but take curse.

Mechanic: Without torch in ruins, wraith gets +0.15 accuracy, you get -0.20. With torchlight effect, reverse.`
    },
    goblin_raider: {
      title: 'Goblins & Raiders',
      category: 'monsters',
      unlock: 'always',
      text: `Small, clever, cruel when numerous. Goblins call reinforcements 30% per round if more than 2 goblins alive — spawns extra goblin 0.8 HP.

Raiders are organized bandits with sellsword (tier 4) leader if legendary mission.

Lore: Goblins live in old cisterns under Low Streets. They worship vault crack as mouth of god. If you bring sun_vault_shard to cistern (random travel event), they trade rare ore_silver for it.

Consequence: Killing goblin leader in docks reduces economy +5% (they were smugglers keeping trade moving).`
    },
    cultist_hex: {
      title: 'Cultists & Hex Adepts',
      category: 'monsters',
      unlock: 'vault',
      text: `Cult of Ashen Eye thinks crack is blessing — light should spill, world should burn to see true stars.

Hex Adepts curse on hit 30% — cursed effect small + damage up. They can summon Mire Leech.

Lore: Leader is former Crown archivist who read letter_to_self and went mad. If you have letter, cultist may steal it during combat (10% chance) and try to flee with it.

Twist: If you have Void Sight skill, you see their ritual is actually sealing attempt, but backwards. You can choose to help seal correctly (arcana check): success = sunVault+2 wilds-2 but cultist dies and you lose Crown rep -1 because Crown wanted cult alive for questioning.`
    },
    siege_horde: {
      title: 'Siege Horde & Overlord',
      category: 'monsters',
      unlock: 'siege',
      text: `At level 60+, Crossroads siege triggers. Not random — consequence of world powers imbalance. If Guild+Crown+Rebels total <100, wildsSpread triggers siege.

Horde: 8-11 enemies tier5, 10% HP +16 buff, atk +6. Allies system: adventurer swarm acts with you, dealing damage, healing, guarding.

Overlord: Boss stats 4.6x normal HP, 2.15x atk. Abilities: Dark Mend heals 18% HP when <45%, Shadow Nova AoE all party, Soul Siphon steals dealt damage as heal. Heal cooldown 3.

Lore: Overlord is what happens when someone wears Crown of Thorns too long in vault. Is it you from future? Some dialog hints.

Reward: XP = 90% of xpToNext(level)+800+tier*120, gold 2500+level*40, phoenix_feather, elixirs, rare loot.

Fail consequence: town burns, you exiled, lose save? No, you go to exile_town, keep skills, lose coin supplies, completed missions reset, genMissions seeded with exile seed, market stock shuffled, HP/Mana 55%. Exile risk: first 5 missions -10% outcome.`
    }
  },
  items: {
    crown_thorns: {
      title: 'Crown of Thorns - Cursed Relic',
      category: 'items',
      unlock: 'crown_of_thorns',
      text: `Made of bramble that never dies, even cut. Whispers promises: +5 all stats, see hidden options in quests. But:

- sunVault -1 per day equipped
- wildsSpread +2 while equipped
- When you sleep, dream of vault as mouth
- Plague +1 per week

Korg can reforge into Crown of Sun Vault with shard +200g + guilt cleared, turning curse into blessing: +3 stats, no decay, +2 vault.

Vael can uncurse with 2 ember_gem but requires you to help Hollow Child first (keep doll 3 days).

Lore: First worn by mayor who tried to carry vault light in head. Mayor vanished. Crown remained.`
    },
    doll: {
      title: 'Hollow Child Doll',
      category: 'items',
      unlock: 'hollow_child_doll',
      text: `Cloth doll with root hair. Child gave it in ruins.

Keep: Night whispers restore +1 mana on rest, but +1 plague per 3 rests, wilds thinks attempt to be human worked, stays. Child appears more.

Sell: 40g, Wilds rep -5, Mara -3, Korg -2, you hear crying on rest for 3 days (hint text only, no debuff but unsettling).

Give to Lys: She says 'This is root wrapped as doll.' Burns it for wilds -2 but doll gone, Hollow Child quest ends, child vanishes, you gain Sageleaf x2.

Burn yourself: At vault, burns with blue flame, reveals path to sun shard, but wilds -3 and doll gone + guilt flag.

This is moral choice with no right answer — core of RPG mix tone.`
    },
    shard: {
      title: 'Sun Vault Shard',
      category: 'items',
      unlock: 'sun_vault_shard',
      text: `Fragment pure light, warm even through gloves. Smells like summer noon.

Uses:
- Seal: At vault approach, consume shard: sunVault +5, wilds -5, plague -2, Crown +1, economy +3. Stacks.
- Sell: 150g to market, but wilds +3, sunVault -1 (you let light leak to wrong hands)
- Forge: Korg + Enchanter need shard for Lantern of Silent Paths, Crown of Sun Vault, True Sight ring
- Trade with goblins in cistern for 2 ore_silver + 1 ember_gem (secret market event)

Lore: Shards are what vault weeps. Each shard is a second of future light that will never happen because you took it. That's why sealing with them heals — you return stolen future.

Found: 5% forage ruins, 10% deep wilds, vault stare 100% first time, Wraiths drop 2%.

Consequence: Collecting 5 shards and sealing all at once gives achievement 'Light Keeper' + 500 XP and unlocks aegis_plate lore.`
    },
    debt_marker: {
      title: 'Guild Debt Marker',
      category: 'items',
      unlock: 'debt_marker_guild',
      text: `Blue wax seal pressed onto cheap tin. You got 100g for signing. Fine print in language you don't read.

Debt markers are how Guild controls adventurers who need gold fast. They don't want gold back. They want favor.

Consequence system:
- Day 10-15 after acquisition: Factor Brine appears at crossroads, says 'Time.' Choice: Pay 150g OR do job: steal ledger from Rebels (betray_guild consequence) OR refuse: Guild -5, economy -10%, Korg +25% prices, bandits spawn as collectors in Low Streets until debt paid.

- If you keep marker for 30 days without paying, Mara says 'Guild mark still on you. They will collect with interest.' At day 35, ambush by 2 sellswords tier 3 in streets.

- Burning marker (at vault with ember_gem): Debt gone, but Guild -3, Crown +1 (Crown likes those who defy Guild).

It is tempting gold early game, but designed to bite. That's consequence design."
`
    }
  },
  classes: {
    fighter: {
      title: 'Fighter - Weapons & Armor',
      category: 'classes',
      unlock: 'always',
      text: `Bonuses: Str2 Res1 HP+8. Starts iron_sword chainmail.

Fighter learns Iron, Steel, War pillars — Guard, Cleave, Stance. Their powerful skills are Titan prefixes: Apex Guard, Dominion Break.

Solo: Reliable. Party: Tank, guard shares with guard action.

Mix paths: Shadowsteel (Rogue), Arcane Warden (Mage), Oathbreaker (Crown).

Lore: Fighters in Virelia are mostly former watch who quit after vault crack because Crown ordered them to stand guard over light that burns eyes.

Twist: If you have Guild debt marker, fighters get dialogue 'Another one who sold sword for coin.'

Endgame: Juggernaut build at 50+ Str — can solo siege horde with Aegis Plate.`
    },
    rogue: {
      title: 'Rogue - Stealth & Precision',
      category: 'classes',
      unlock: 'always',
      text: `Bonuses: Cun2 Str1 Gold+15. Starts dagger cloak lockpick smoke bomb.

Rogue pillars: Shadow, Silent, Viper — Ambush, Feint, Trick. Focus cunning, quick.

Mechanic: Scout gives +0.08 success, smoke_bomb blinds enemies -22% acc 2 turns, escape +22%.

Mix: Shadowsteel (Fighter), Plague Doctor (Cleric), Gutter Saint (Rebel).

Lore: Rogues are lantern-shop kids who learned to move when light flickers. They know Low Streets puddles show other streets.

Skill twist: Some rogue tricks leave you exposed if fail — high risk/high twist like Fallen London's nightmares.

Endgame: Umbral build — 100% escape in Low Streets, can rob Market with consequence watchHeat+10 but gain 50g.`
    },
    mage: {
      title: 'Mage - Arcane & Rituals',
      category: 'classes',
      unlock: 'always',
      text: `Bonuses: Arc2 Cun1 Mana+10. Starts staff tonic mana potion.

Mage pillars: Arcane, Astral, Void — Sigil, Bolt, Weave. Costs mana. Can clear cursed with Voidsalt.

Mana is arcane focus: maxMana = 18 + build + gear + stats.

Mix: Arcane Warden (Fighter), Soul Weaver (Cleric), Void Sight (Vault).

Lore: Mages were archivists who catalogued vault light. When vault cracked, their books wrote themselves backwards. Some learned to read backwards language — that's where Void Sight comes from.

Consequence: Casting in Deep Wilds without ward raises wilds +0.5. Casting near Hollow Child makes child cry and vanish.

Endgame: Eldritch mystic — can cast Chain spell hitting all enemies -4 mana each extra.`
    },
    cleric: {
      title: 'Cleric - Blessings & Wards',
      category: 'classes',
      unlock: 'always',
      text: `Bonuses: Res2 Arc1 HP6 Mana4. Starts health potions amulet.

Cleric pillars: Sacred, Dawn, Hallowed — Ward, Benediction, Prayer. Heal party, clear bleeding/poison/curse.

Mechanic: Heal scales Res + Arc. Party heal kits: Cleric can heal companions well, and companions auto-use potions at low HP if Cleric in party.

Mix: Plague Doctor (Rogue), Soul Weaver (Mage), Gutter Saint? Actually.

Lore: Clerics are not priests of god but of light — they pray to vault like vault is god. When vault cracked, some lost faith, became Oathbreakers. Some doubled faith, became Soil Weavers who think wilds is punishment.

Twist: If plague >50, cleric prayers have 10% chance to fail and trigger cursed. If sunVault >80, prayers +20% heal.`
    },
    ranger: {
      title: 'Ranger - Tracks & Wild Edges',
      category: 'classes',
      unlock: 'always',
      text: `Bonuses: Cun2 Res1 HP4 Gold5. Starts longbow dagger leather.

Ranger pillars: Wild, Hawkeye, Thorn — Mark, Volley, Path, Snare. Scouting, forage better.

Mechanic: Forage in marsh/wilds finds extra herb. Scout reduces danger. Can track: If you scout 3 times in same area, next forage guarantees rare loot.

Mix: Wild Hunt (Wilds), Gutter Saint (Rebels), Shadowsteel? Actually ranger+rogue = Path cutter.

Lore: Rangers were gate watch who left gate to see what beyond map does. They know ruin city older than Virelia.

Endgame: Horizon build — can travel to any area without cost if risk <30, knows hidden cistern path to goblin market.`
    }
  }
};

const LORE_STATE = {
  unlocked: {},
  unlock(key) {
    if (!state) return;
    state.flags = state.flags || {};
    state.flags.loreUnlocked = state.flags.loreUnlocked || {};
    if (state.flags.loreUnlocked[key]) return false;
    state.flags.loreUnlocked[key] = true;
    LORE_STATE.unlocked[key] = true;
    appendLog('[LORE UNLOCKED] ' + (LORE_CODEX[key] && LORE_CODEX[key].title || key));
    return true;
  },
  has(key) {
    if (state && state.flags && state.flags.loreUnlocked && state.flags.loreUnlocked[key]) return true;
    return !!LORE_STATE.unlocked[key];
  }
};

// Flatten codex lookup
const LORE_FLAT = {};
for (const cat in LORE_CODEX) {
  for (const id in LORE_CODEX[cat]) {
    LORE_FLAT[id] = LORE_CODEX[cat][id];
  }
}

function unlockLore(key) {
  key = (key||'').toLowerCase();
  // map item keys to lore
  const mapping = {
    streets: 'low_streets',
    docks: 'docks',
    market: 'market',
    ruins: 'ruins',
    marsh: 'marsh',
    vault: 'vault',
    wilds: 'wilds_deep',
    crossroads: 'crossroads',
    crown_of_thorns: 'crown_thorns',
    hollow_child_doll: 'doll',
    sun_vault_shard: 'shard',
    debt_marker_guild: 'debt_marker',
    mara_crossroads: 'mara',
    korg_blacksmith: 'korg',
    lys_alchemist: 'lys',
    vael_enchanter: 'vael',
    jun_tavern: 'jun',
    child_ruins: 'hollow_child',
    fighter: 'fighter',
    rogue: 'rogue',
    mage: 'mage',
    cleric: 'cleric',
    ranger: 'ranger'
  };
  const mapped = mapping[key] || key;
  // try direct and category searches
  if (LORE_FLAT[mapped]) return LORE_STATE.unlock(mapped);
  if (LORE_FLAT[key]) return LORE_STATE.unlock(key);
  // faction
  if (key==='guild' || key==='crown' || key==='rebels' || key.indexOf('wilds')>=0) {
    // try find
    for (const k in LORE_FLAT) {
      if (k.indexOf(key)>=0) {
        LORE_STATE.unlock(k);
      }
    }
  }
  return false;
}

// Hook item pick up
const _origAddInvItem = typeof addInvItem === 'function' ? addInvItem : null;
function addInvItemV2(s, key, amt) {
  if (_origAddInvItem) _origAddInvItem(s,key,amt);
  else {
    if (!s) return;
    s.inventory = s.inventory || {};
    s.inventory[key] = (s.inventory[key]||0) + (amt||0);
  }
  unlockLore(key);
}
try { addInvItem = addInvItemV2; } catch(e){}
if (typeof window !== 'undefined') window.addInvItem = addInvItemV2;

// Hook travel and areas
function unlockAreaLore(areaKey) {
  unlockLore(areaKey);
  if (areaKey==='ruins') unlockLore('ghoul_wraith');
  if (areaKey==='vault') unlockLore('sun_vault');
  if (areaKey==='marsh') unlockLore('wilds');
  if (areaKey==='wilds') unlockLore('wilds_deep');
  if (areaKey==='docks') unlockLore('goblin_raider');
  if (areaKey==='streets') unlockLore('bandit');
}

// Hook combat
const _origCreateCombat = typeof createCombatEvent === 'function' ? createCombatEvent : null;
function createCombatEventV2(s, kind, mob) {
  let ev = null;
  if (_origCreateCombat) ev = _origCreateCombat(s,kind,mob);
  else ev = { kind:'combat', fromNode: s.nodeId||'crossroads', stage:'combat', enemies: [mobDef(1)], log:[] };
  // unlock monster lore based on enemies
  if (ev && ev.enemies) {
    for (let i=0;i<ev.enemies.length;i++) {
      const e = ev.enemies[i];
      if (!e) continue;
      const name = (e.name||'').toLowerCase();
      if (name.indexOf('bandit')>=0 || name.indexOf('thug')>=0) unlockLore('bandit');
      if (name.indexOf('wolf')>=0 || name.indexOf('boar')>=0) unlockLore('wolf_boar');
      if (name.indexOf('ghoul')>=0 || name.indexOf('wraith')>=0) unlockLore('ghoul_wraith');
      if (name.indexOf('goblin')>=0 || name.indexOf('raider')>=0) unlockLore('goblin_raider');
      if (name.indexOf('cultist')>=0 || name.indexOf('hex')>=0) unlockLore('cultist_hex');
      if (e.siegeBoss) unlockLore('siege_horde');
    }
  }
  return ev;
}
try { createCombatEvent = createCombatEventV2; } catch(e){}
if (typeof window !== 'undefined') window.createCombatEvent = createCombatEventV2;

// Story nodes for lore codex
function injectLoreNodes() {
  if (typeof STORY === 'undefined') return;

  STORY.lore_codex = {
    text: function(s) {
      const unlocked = s.flags && s.flags.loreUnlocked || {};
      let count = 0;
      for (const k in unlocked) if (unlocked[k]) count++;
      let t = 'LORE CODEX - Virelia Archives\nUnlocked: ' + count + '/' + Object.keys(LORE_FLAT).length + '\n\nCategories: world, factions, locations, people, monsters, items, classes\n\nRecent unlocks:\n';
      const log = [];
      for (const k in unlocked) {
        if (LORE_FLAT[k]) log.push(k);
      }
      const recent = log.slice(-8);
      if (recent.length===0) t+='(none - explore, pick items, fight, talk, stare into vault)\n';
      else {
        for (let i=0;i<recent.length;i++) {
          const entry = LORE_FLAT[recent[i]];
          if (entry) t+= '- ' + entry.title + ' [' + entry.category + ']\n';
        }
      }
      t+='\nUse search in quest board? No - use buttons below to browse.\n';
      return t;
    },
    choices: function(s) {
      const cats = ['world','factions','locations','people','monsters','items','classes','mystery'];
      const out = [];
      for (let i=0;i<cats.length;i++) {
        const cat = cats[i];
        out.push({
          label: 'Browse ' + cat + ' (' + Object.keys(LORE_CODEX[cat]||{}).length + ')',
          next: 'lore_codex_' + cat
        });
      }
      out.push({ label:'Back to Crossroads', className:'secondary', next:'crossroads' });
      return out;
    }
  };

  const categories = ['world','factions','locations','people','monsters','items','classes','mystery'];
  for (let ci=0; ci<categories.length; ci++) {
    const cat = categories[ci];
    const entries = LORE_CODEX[cat] || {};
    STORY['lore_codex_' + cat] = {
      text: function(s) {
        const unlocked = s.flags && s.flags.loreUnlocked || {};
        let t = 'LORE - ' + cat.toUpperCase() + '\n\n';
        let shown = 0;
        for (const id in entries) {
          if (unlocked[id] || unlocked[LORE_FLAT[id] && LORE_FLAT[id].title] || cat==='classes') {
            // classes always visible? Actually show all classes but lock text maybe
            const e = entries[id];
            if (s.flags && s.flags.loreUnlocked && s.flags.loreUnlocked[id] || cat==='classes' || cat==='world') {
              t += '--- ' + e.title + ' ---\n' + e.text + '\n\n';
              shown++;
            } else {
              t += '--- ' + e.title + ' [LOCKED - explore to unlock] ---\n';
            }
          } else {
            // still show locked title
            const e = entries[id];
            t += '??? [LOCKED] - hint: ' + (e.unlock || 'explore') + '\n';
          }
        }
        if (shown===0) t+='Nothing unlocked yet. Explore areas, pick items, talk to NPCs, fight monsters.';
        return t;
      },
      choices: [{ label:'Back to Codex', className:'secondary', next:'lore_codex' }]
    };
  }

  // Expand item modal to show lore if unlocked
  const _origOpenItemModal = typeof openItemModal === 'function' ? openItemModal : null;
  if (_origOpenItemModal) {
    // Wrap later - we patch updateItemModal instead
  }

  // Inject lore into crossroads
  if (STORY.crossroads && STORY.crossroads.choices) {
    const orig = STORY.crossroads.choices;
    STORY.crossroads.choices = function(s) {
      const base = orig(s);
      const extra = [{ label:'Lore Codex - Archives', next:'lore_codex', effect:function(){ unlockLore('virelia_founded'); } }];
      return extra.concat(base);
    };
  }

  // Hook travel to unlock
  const origFreeRoamSelectChoices = STORY.free_roam_select && STORY.free_roam_select.choices;
  if (origFreeRoamSelectChoices) {
    const origFn = origFreeRoamSelectChoices;
    STORY.free_roam_select.choices = function(s) {
      const out = origFn(s);
      // after original, we already unlock in travel effect, but also unlock area on entry text
      return out;
    };
  }
}

injectLoreNodes();

// Also expand existing ITEM_CATALOG descriptions with lore tags
function expandItemDescWithLore() {
  // Add lore snippets to existing items
  const expansions = {
    bandage: ' Used by Lys the Alchemist. If you use 10+ in Ruins, Lys affinity +1.',
    torch: ' Ruins needs 1 per explore. Vault approach needs 1. Without, -20% accuracy. Lore: Low Streets lantern oil is cut with water.',
    waterskin: ' Gate and Marsh cost 1 to travel. Docks smugglers trade mushroom for waterskin.',
    ration: ' Road, Ruins, Marsh, Wilds cost. Forage can find.',
    lockpick: ' Low Streets mystery door, cache. 35% success without cunning check. Korg hates lockpicks? No, loves them.',
    rune_shard: ' Enchanter Vael trades. Forge needs. Lore: Shards are vault attempts to write. Reading backwards unlocks Void Sight.',
    ember_gem: ' Warm. Forge embercore warhammer. Lore: Ember is solidified cough from plague — miners coughed light.',
    sealed_letter: ' Starts investigation. Contains names of people who disappeared after vault crack. Lore: Courier who gave it disappeared next day.',
    ledger: ' Evidence. Deliver to allegiance for reward but loses other faction -2. Lore: Ledger page for Copper Row shows payments for silence after child vanished.'
  };
  for (const k in expansions) {
    if (ITEM_CATALOG[k]) {
      if (ITEM_CATALOG[k].desc.indexOf('Lore:') <0) {
        ITEM_CATALOG[k].desc += ' ' + expansions[k];
      }
    }
  }
}
expandItemDescWithLore();

// Initialize lore unlocked based on state
function initLoreState(s) {
  if (!s) return;
  s.flags = s.flags || {};
  s.flags.loreUnlocked = s.flags.loreUnlocked || {};
  // Always unlock foundation
  s.flags.loreUnlocked['virelia_founded'] = true;
  s.flags.loreUnlocked['crossroads'] = true;
  s.flags.loreUnlocked['bandit'] = true;
  s.flags.loreUnlocked['fighter'] = true;
  s.flags.loreUnlocked['rogue'] = true;
  s.flags.loreUnlocked['mage'] = true;
  s.flags.loreUnlocked['cleric'] = true;
  s.flags.loreUnlocked['ranger'] = true;
}

// Hook normalize
const _origNormLore = typeof normalizeState === 'function' ? normalizeState : null;
function normalizeStateLore(s) {
  if (_origNormLore) _origNormLore(s);
  if (!s) return;
  initLoreState(s);
  // Unlock based on flags
  if (s.flags && s.flags.worldState) {
    const ws = s.flags.worldState;
    if (ws.sunVault < 80) unlockLore('sun_vault');
    if (ws.wildsSpread > 30) unlockLore('wilds');
    if (ws.plague > 0) unlockLore('plague');
    if (ws.doppelgangerRumor) unlockLore('doppelganger');
  }
  if (s.inventory) {
    for (const k in s.inventory) unlockLore(k);
  }
  if (s.roam && s.roam.v2 && s.roam.v2.current) unlockAreaLore(s.roam.v2.current);
}
try { normalizeState = normalizeStateLore; } catch(e){}
if (typeof window !== 'undefined') window.normalizeState = normalizeStateLore;

console.log('[VIRELIA LORE] Loaded. Codex entries:', Object.keys(LORE_FLAT).length);
function loreSanity() {
  return {
    total: Object.keys(LORE_FLAT).length,
    unlocked: state && state.flags && state.flags.loreUnlocked && Object.keys(state.flags.loreUnlocked).length || 0,
    categories: Object.keys(LORE_CODEX).length
  };
}
if (typeof window !== 'undefined') window.loreSanity = loreSanity;
/* VIRELIA V2 - 3-ACT MAIN STORYLINE
   Act 1: The Sealed Letter (Arrival, Investigation, First Betrayal)
   Act 2: The Crack Widens (Vault, Factions, Doppelganger, Hollow Child)
   Act 3: The Siege (Overlord reveal, 4 endings)
   Tone: Mix - Dark Gritty + Heroic + Weird Mystery
   Every choice has consequence, twist table used
*/

console.log('[VIRELIA STORY] Loading 3-act main storyline...');

const ACT_FLAGS = {
  act1_letter_done: 'act1:letter_done',
  act1_cellar_done: 'act1:cellar_done',
  act1_ledger_faction: 'act1:ledger_faction',
  act1_betrayed: 'act1:betrayed',
  act2_vault_stared: 'act2:vault_stared',
  act2_vault_sealed_once: 'act2:vault_sealed_once',
  act2_debt_taken: 'act2:debt_taken',
  act2_debt_paid: 'act2:debt_paid',
  act2_doppel_found: 'act2:doppel_found',
  act2_hollow_met: 'act2:hollow_met',
  act3_siege_omen: 'act3:siege_omen',
  act3_keeper_offer: 'act3:keeper_offer'
};

function setActFlag(key, value) {
  if (!state) return;
  state.flags = state.flags || {};
  state.flags[key] = (typeof value === 'undefined') ? true : value;
}
function getActFlag(key) {
  if (!state || !state.flags) return undefined;
  return state.flags[key];
}

function actLogConsequence(text, severity) {
  ConsequenceEngine.logConsequence('act_' + Date.now(), text, severity || 'major');
}

/* ACT 1 EXPANDED NODES */
function injectAct1() {
  if (typeof STORY === 'undefined') return;

  // Override courier to start Act 1 properly with lore
  STORY.courier.text = function(s) {
    unlockLore('virelia_founded');
    return `A courier in soot-stained gloves waits beside the board. His left hand is wrapped — burn from vault light, you recognize from Lys's warnings.\n\n"For you. Sealed. Don't open near lanterns. Light reads ink."\n\nThe wax seal is blue, but someone pressed a thumb into it — rebel sign? Or warning?\n\nGold: ${s.gold} | Reputation Guild ${s.reputation.Guild} Crown ${s.reputation.Crown} Rebels ${s.reputation.Rebels}`;
  };
  STORY.courier.choices = function(s) {
    return [
      {
        label: "Take the sealed letter (investigate)",
        next: "act1_letter_open",
        effect: function() {
          setActFlag(ACT_FLAGS.act1_letter_done, true);
          s.arcs.investigation = { stage: 1, startedDay: s.world.day };
          addInvItem(s, "sealed_letter", 1);
          unlockLore('sealed_letter');
          appendLog("You take letter. Wax still warm. Inside list of names — people paid to disappear. Last name is yours, but crossed out.");
          appendLog("Key item: Sealed Letter. [LORE UNLOCKED] Foundation");
          openItemModal("sealed_letter");
          setActFlag('heardRumors', true);
          adjustNpc('mara_crossroads', 1, 'Took the letter others refused');
        }
      },
      {
        label: "Ask who sent it (Cunning check)",
        next: "act1_letter_ask",
        check: { stat: "cunning", base: 0.45, per: 0.05 },
        success: {
          text: "Courier flinches: 'Factor Brine. But not Guild coin. Debt coin. He owes someone who owns vault.' That is worse than Guild.",
          effect: function() {
            adjustReputation("Guild", -1);
            s.gold += 3;
            appendLog("You get 3 gold for reading his fear, but Guild -1. He whispers: cellar under lantern shop has real ledger, not copy.");
            setActFlag("lantern_hint", true);
          }
        },
        fail: {
          text: "'Don't. You don't want to know who writes with that ink.' He leaves, but you feel watched.",
          effect: function() {
            ConsequenceEngine.applyConsequence(s, 'steal', 0.5);
            setActFlag("watchHeat", (s.flags.worldState && s.flags.worldState.watchHeat || 0) + 2);
          }
        }
      },
      {
        label: "Refuse (keep head down)",
        className: "secondary",
        next: "crossroads",
        effect: function() {
          setActFlag("messengerDone", true);
          actLogConsequence("Refused sealed letter. Courier disappeared next day. WatchHeat+2", "info");
          ConsequenceEngine.worldState(s).watchHeat = Math.min(100, ConsequenceEngine.worldState(s).watchHeat + 2);
          appendLog("You refuse. Courier shrugs, but rumor spreads you were afraid. Mara notes it.");
          adjustNpc('mara_crossroads', -1, 'Refused courier task');
        }
      }
    ];
  };

  STORY.act1_letter_open = {
    text: function(s) {
      return `You open letter away from lanterns as warned. In daylight ink is brown list. In shadow, second ink appears — written with ember_gem dust, only visible in dark.\n\nBrown ink: 7 names, amounts paid, dates. All disappeared last year. Third name: Korg's daughter.\n\nHidden ink: 'They pay to make people who saw vault crack forget. The vault didn't crack. It was cut. Bring this to Crossroads at midnight. Burn after.'\n\nThe letter is addressed to you, but you have never been to Virelia before today. Or have you? A memory itch — you recall lantern shop smell, but you have never entered.\n\n${state.flags.lanternhint ? "\nCourier hint: Real ledger in lantern-shop cellar, not this copy." : ""}`;
    },
    choices: function(s) {
      return [
        { label: "Go to lantern-shop cellar (Follow hidden ink)", next: "act1_cellar" },
        { label: "Show letter to Mara", next: "act1_mara_letter", effect: function(){ unlockLore('mara'); } },
        { label: "Show letter to Korg (his daughter listed)", next: "act1_korg_letter", effect: function(){ unlockLore('korg_blacksmith'); } },
        { label: "Burn letter as instructed", next: "crossroads", effect: function(){
          consumeInvItem(s,"sealed_letter",1);
          setActFlag("act1:burned_letter", true);
          ConsequenceEngine.applyConsequence(s, 'show_mercy', 1);
          appendLog("You burn letter. Ash smells like hair. That night you dream of writing it, 2 years ago. Unlocks Lore: Doppelganger Rumor.");
          unlockLore('doppelganger');
          s.flags.worldState.doppelgangerRumor = true;
          addInvItem(s, "letter_to_self", 1);
        }},
        { label: "Keep letter, return later", className:"secondary", next:"crossroads" }
      ];
    }
  };

  STORY.act1_letter_ask = {
    text: function(s){ return "The courier is gone. Low Streets feel tighter. A child watches you from roof, holding doll."; },
    choices: [{ label:"Back to Crossroads", next:"crossroads" }]
  };

  STORY.act1_mara_letter = {
    text: function(s){
      return `Mara reads brown ink, not hidden. Says: "Third name is Korg's girl. She coughed light. He blames vault. But this ledger — payments from Guild weighing house. Someone paid to forget her. Not Guild coin though. Debt coin. Blue wax with thumb. That's debt marker."

She looks at hidden ink under table shadow, pales: "This second handwriting is yours. I saw you write like this two winters ago, when you stayed at shrine and said you were leaving and never returning. You did return. You just don't remember."

Consequence: Mara affinity -1 if you doubt her, +2 if you believe.`;
    },
    choices: function(s){
      return [
        { label:"Believe Mara (Weird Mystery)", next:"act1_cellar", effect:function(){ adjustNpc('mara_crossroads',2,'Believed her about past life'); setActFlag('believed_mara',true); unlockLore('doppelganger'); s.flags.worldState.doppelgangerRumor=true; }},
        { label:"Doubt Mara (Guild logic)", next:"act1_cellar", effect:function(){ adjustNpc('mara_crossroads',-1,'Doubted her memory'); ConsequenceEngine.applyConsequence(s,'betray_guild',0.5); }},
        { label:"Ask about thumb seal", next:"act1_debt_lore", effect:function(){ unlockLore('debt_marker'); } }
      ];
    }
  };

  STORY.act1_korg_letter = {
    text: function(s){
      return `Korg reads daughter's name, hammer drops. Forge goes quiet.

"She coughed. Said light hurt. Then men in blue gloves came, weighed her cough like grain. Paid me 20 gold. Debt marker. Said forget."

He shows you tin with blue wax — debt_marker_guild. Same wax as letter.

"I signed. I took gold. I bought her medicine that didn't work. You want ledger? In lantern shop cellar. I tried to get. Locked. Key with lantern keeper who disappeared."

He looks at you: "If you find who cut vault, you bring me hammer."

If you have debt_marker_guild, he spits: "You signed too?"

Affinity: Korg +3 if you promise revenge, -2 if you say gold was right.`;
    },
    choices: function(s){
      return [
        { label:"Promise revenge (Fighter path)", next:"act1_cellar", effect:function(){ adjustNpc('korg_blacksmith',3,'Promised revenge for daughter'); setActFlag('korg_promise',true); s.flags.korgPromise=true; }},
        { label:"Say coin was survival (Guild path)", next:"act1_cellar", effect:function(){ adjustNpc('korg_blacksmith',-2,'Said gold was right choice'); adjustReputation('Guild',1); }},
        { label:"Give him 10 gold for forgiveness", next:"act1_cellar", disabled: (s.gold||0)<10, effect:function(){ spendGold(10); adjustNpc('korg_blacksmith',2,'Gave 10g for daughter'); ConsequenceEngine.applyConsequence(s,'show_mercy',1); }},
        { label:"Back", className:"secondary", next:"crossroads" }
      ];
    }
  };

  STORY.act1_debt_lore = {
    text: function(s){
      return `Debt markers: Guild gives 100g now, collects favor later. Always worse than gold. Factor Brine collects.

Mechanics in Act 2 will trigger: Day 10-15 after taking, Brine appears, demands 150g or steal from Rebels or refuse (Guild -5 economy -10% bandits spawn). Day 35 ambush 2 sellswords in Low Streets.

Mara: "If you have marker, you already in Act 2."

You don't have one yet — unless Korg gave you his.`;
    },
    choices: [{ label:"Back", next:"act1_mara_letter" }]
  };

  // Enhanced cellar with consequence and hollow child cameo
  STORY.act1_cellar = {
    text: function(s){
      return `Lantern-shop cellar. Oil smell, wet stone. Locked hatch, second door behind crates. Ledger on table, quill still wet. Small oil-scented key on hook — lantern_cellar_key.

But also: child's doll on floor, same as hollow_child_doll. And fresh footprints size yours, exiting.

Someone was here minutes ago, writing ledger you came to steal. Twist: ledger is fake? Or you wrote it?

You hear boots above — guard shift change in 2 minutes.`;
    },
    choices: function(s){
      return [
        {
          label: "Stakeout (Cunning safer)",
          check: { stat:"cunning", base:0.55, per:0.04 },
          success: {
            text: "You wait, slip in shift change, find ledger + key + doll. Also find scrap in YOUR handwriting: 'Don't let them seal. Let it crack, let it remember.' You pocket it, confused.",
            effect: function(){
              s.arcs.investigation.stage=3;
              addInvItem(s,"ledger",1); addInvItem(s,"lantern_cellar_key",1); addInvItem(s,"hollow_child_doll",1);
              setActFlag(ACT_FLAGS.act1_cellar_done,true);
              unlockLore('ruins'); unlockLore('doll'); setActFlag('act1:found_self_scrap',true);
              appendLog("Gained Ledger, Key, Doll. Also scrap hints you sabotaged vault before? Lore: Doppelganger");
              openItemModal("ledger");
              adjustNpc('mara_crossroads',1,'Found cellar ledger quietly');
            }
          },
          failForward: {
            text: "You get ledger but runner spots you. You escape with ledger under coat, doll falls — you grab it anyway. Guard yells your name, but wrong name — name you used 2 years ago, according to Mara.",
            effect: function(){
              s.arcs.investigation.stage=3;
              addInvItem(s,"ledger",1); addInvItem(s,"hollow_child_doll",1);
              setActFlag("investigationHeat", (getActFlag("investigationHeat")||0)+1);
              applyDamage(4);
              ConsequenceEngine.worldState(s).watchHeat+=3;
            }
          },
          fail: { text:"Watcher spots you, you retreat.", effect:function(){ applyDamage(6); } },
          next: "act1_ledger_decision"
        },
        {
          label: "Break in (Strength risky)",
          check: { stat:"strength", base:0.48, per:0.04 },
          success: {
            text:"Wood splinters. You grab ledger + key. Doll's eyes follow you.",
            effect: function(){ s.arcs.investigation.stage=3; addInvItem(s,"ledger",1); addInvItem(s,"lantern_cellar_key",1); setActFlag(ACT_FLAGS.act1_cellar_done,true); unlockLore('doll'); }
          },
          failForward: {
            text:"Hatch cracks loud. You snatch ledger as boots thunder.",
            effect: function(){ s.arcs.investigation.stage=3; addInvItem(s,"ledger",1); setActFlag("investigationHeat",(getActFlag("investigationHeat")||0)+1); addEffect("bleeding", 12000); applyDamage(6); }
          },
          fail: { text:"Hatch holds, guard clips you.", effect:function(){ applyDamage(10); } },
          next: "act1_ledger_decision"
        },
        {
          label: "Scry (Arcana costs 6 mana)",
          require: function(s){ if(s.mana<6){ appendLog("Low mana"); return false;} s.mana-=6; return true; },
          check: { stat:"arcana", base:0.50, per:0.05 },
          success: {
            text:"Ink lifts in mind. Names, routes, payments. You copy key entries and pocket ledger. You also see who cut vault — silhouette wearing your cloak.",
            effect: function(){ s.arcs.investigation.stage=3; addInvItem(s,"ledger",1); setActFlag('act2:stared_vault_silhouette',true); unlockLore('sun_vault'); }
          },
          failForward: {
            text:"Vision shows enough but leaves trace someone skilled might follow. Vael will know you scried.",
            effect: function(){ s.arcs.investigation.stage=3; addInvItem(s,"ledger",1); setActFlag("investigationHeat",(getActFlag("investigationHeat")||0)+1); addEffect("cursed", 10000); adjustNpc('vael_enchanter',1,'Scried cellar'); }
          },
          fail: { text:"Vision fractures and bites.", effect:function(){ addEffect("cursed", 12000); applyDamage(8); } },
          next: "act1_ledger_decision"
        },
        { label:"Leave (too risky)", className:"secondary", next:"crossroads" }
      ];
    }
  };

  STORY.act1_ledger_decision = {
    text: function(s){
      return `You have ledger. Real one, not copy courier gave? Pages show payments for forgetting:

- Korg's daughter: 20g debt marker
- Gate guard: 15g
- Weaver who saw light stutter: 30g + threat
- You: 0g? Entry crossed out "Did not take gold. Will remember. Must cut again if needed."

Last entry is your name, with note: "Will remember." Means you refused payment before to forget vault cut. So you chose to remember and they tried to make you forget, but you remembered again?

Who do you trust ledger with? Choice will change economy, powers, and unlock Act 2 debt.

Your current rep: Guild ${s.reputation.Guild} Rebels ${s.reputation.Rebels} Crown ${s.reputation.Crown}`;
    },
    choices: function(s){
      return [
        {
          label:"Deliver to Guild (order + coin) - Guild+2 Rebels-1",
          next:"act1_ledger_guild",
          effect: function(){
            // already handled in original investigate_report but expand
          }
        },
        {
          label:"Deliver to Rebels (freedom + risk) - Rebels+2 Crown-1",
          next:"act1_ledger_rebels"
        },
        {
          label:"Deliver to Crown (law) - Crown+2 Rebels-1 + watchHeat",
          next:"act1_ledger_crown"
        },
        {
          label:"Burn ledger, keep truth (Wilds+1, economy stable, but all factions -1, unlocks weird path)",
          next:"crossroads",
          effect: function(){
            consumeInvItem(s,"ledger",1);
            setActFlag(ACT_FLAGS.act1_ledger_faction,'burned');
            adjustReputation('Guild',-1); adjustReputation('Rebels',-1); adjustReputation('Crown',-1);
            ConsequenceEngine.worldState(s).wildsSpread+=1;
            ConsequenceEngine.worldState(s).economy=Math.min(100, ConsequenceEngine.worldState(s).economy+2);
            actLogConsequence("Burned ledger. No faction trusted. Wilds+1 economy+2. You chose no masters. Act1 burned path.",'major');
            addInvItem(s,"debt_marker_guild",1); // you get debt marker as ash that is still readable? twist: burning creates marker
            s.arcs.investigation.stage=4;
            appendLog("Ledger burns with blue flame. Ash forms debt marker tin. You now owe Guild 100g you didn't take.");
          }
        }
      ];
    }
  };

  STORY.act1_ledger_guild = {
    text: function(s){ return `Factor Brine weighs ledger, nods. "Order kept." He slides 30g + Sigil, but his gloves leave ash on your hand.\n\n"Debt marker we gave Korg is now yours too, because you brought proof we paid. Fair?" He presses tin into palm — you didn't agree but you have debt_marker_guild now.\n\nMara later: "You gave truth to those who sell it. City will pay."`; },
    choices: function(s){
      return [{
        label:"Accept (Act1 ends, Act2 debt begins)",
        next:"crossroads",
        effect:function(){
          setActFlag(ACT_FLAGS.act1_ledger_faction,'Guild');
          adjustReputation('Guild',2); adjustReputation('Rebels',-1);
          s.gold+=30; addInvItem(s,'sigil_of_the_guildmaster',1); addInvItem(s,'debt_marker_guild',1);
          s.arcs.investigation.stage=4;
          setActFlag(ACT_FLAGS.act2_debt_taken,true);
          setActFlag('debt_taken_day', s.world.day);
          ConsequenceEngine.applyConsequence(s,'betray_guild',1);
          actLogConsequence('Gave ledger to Guild. Got sigil + debt marker. Economy -10% in 5 days.','major');
          openItemModal('sigil_of_the_guildmaster');
        }
      }];
    }
  };

  STORY.act1_ledger_rebels = {
    text: function(s){ return `Rebel runner in dock shadow reads ledger, grins with too many teeth. "Guild paid to make us forget our dead. Good."

He gives 26g + commander band, but says: "Now you are marked. Guild will send collectors. Also — that last entry, you refusing gold? That was you, two years ago. You were one of us, then you left. We wondered where you went."

He presses blood oath tin: sign in blood, Rebels+3 Crown-2, unlocks Oathbreaker if you later betray.

Mara: "Freedom is expensive, you just bought some."`; },
    choices: function(s){
      return [{
        label:"Sign Blood Oath (Act1 ends, Rebels path)",
        next:"crossroads",
        effect:function(){
          setActFlag(ACT_FLAGS.act1_ledger_faction,'Rebels');
          adjustReputation('Rebels',2); adjustReputation('Crown',-1);
          s.gold+=26; addInvItem(s,'rebel_commander_band',1); addInvItem(s,'rebels_blood_oath',1);
          s.arcs.investigation.stage=4;
          ConsequenceEngine.applyConsequence(s,'show_mercy',1);
          actLogConsequence('Gave ledger to Rebels. Got band + blood oath. WatchHeat+2','major');
          ConsequenceEngine.worldState(s).watchHeat+=2;
          openItemModal('rebel_commander_band');
        }
      },{
        label:"Take band but refuse oath (neutral)",
        next:"crossroads",
        effect:function(){
          setActFlag(ACT_FLAGS.act1_ledger_faction,'Rebels');
          adjustReputation('Rebels',1);
          s.gold+=26; addInvItem(s,'rebel_commander_band',1);
          s.arcs.investigation.stage=4;
        }
      }];
    }
  };

  STORY.act1_ledger_crown = {
    text: function(s){ return `Crown clerk reads, crisp nod. "Writ filed." Gives 28g + amulet, but also says: "You are now witness. If vault case goes trial, you testify. Refuse = Crown -5."

Clerk adds: "Entry with your name crossed out — we have record you were paid 0g to forget, but you didn't forget. That makes you unreliable witness. We will watch."

WatchHeat+5 immediately. Crown likes law, not truth.

Mara: "Law without mercy is another gang."`; },
    choices: function(s){
      return [{
        label:"Accept witness duty (Crown path)",
        next:"crossroads",
        effect:function(){
          setActFlag(ACT_FLAGS.act1_ledger_faction,'Crown');
          adjustReputation('Crown',2); adjustReputation('Rebels',-1);
          s.gold+=28; addInvItem(s,'amulet_of_unbroken_oath',1);
          s.arcs.investigation.stage=4;
          ConsequenceEngine.worldState(s).watchHeat+=5;
          actLogConsequence('Gave ledger to Crown. Now witness, watchHeat+5.','major');
          openItemModal('amulet_of_unbroken_oath');
        }
      }];
    }
  };
}

function injectAct2() {
  if (typeof STORY === 'undefined') return;

  STORY.act2_vault_entrance = {
    text: function(s){
      const ws = ConsequenceEngine.worldState(s);
      return `Vault Approach: Light heavy, teeth ache. Air hums. Guards gone — Crown abandoned post when first guard eyes burned white.\n\nWorld: SunVault ${ws.sunVault}% Wilds ${ws.wildsSpread}% Plague ${ws.plague}\n\nYou have ${s.inventory && s.inventory.sun_vault_shard || 0} shards. At vault you can:\n- Stare (gain shard + Void Sight but wilds+1, flag looked_into_vault, doppel rumor)\n- Seal with shard (consume: vault+5 wilds-5 plague-2 Crown+1 economy+3)\n- Leave\n\nDecision echoes. Korg's hammer if promised still waits.`;
    },
    choices: function(s){
      return [
        {
          label:"Stare into Vault (weird mystery)",
          next:"act2_vault_stare",
          effect: function(){}
        },
        {
          label:"Seal breach with shard (requires shard)",
          disabled: !(s.inventory && s.inventory.sun_vault_shard),
          next:"crossroads",
          effect:function(){
            if (!consumeInvItem(s,"sun_vault_shard",1)) { appendLog("No shard"); return; }
            ConsequenceEngine.applyConsequence(s,'seal_vault',1);
            adjustReputation('Crown',1);
            s.gold+=5;
            setActFlag(ACT_FLAGS.act2_vault_sealed_once,true);
            unlockLore('sun_vault');
            actLogConsequence('Sealed breach with shard. Vault+5 wilds-5','major');
            appendLog("Light steadies. For now.");
            if ((s.flags.worldState.sunVault||0) >= 85) {
              adjustNpc('korg_blacksmith',2,'Sealed vault');
            }
          }
        },
        {
          label:"Leave",
          className:"secondary",
          next:"crossroads"
        }
      ];
    }
  };

  STORY.act2_vault_stare = {
    text: function(s){
      return `You stare. Light is not light. It is lattice of second hands, all ticking different times. In lattice you see:

- Yourself, older, wearing Crown of Thorns, sitting on bell at Crossroads, watching yourself now.
- Korg's daughter, coughing, but cough spells word in light language: "CUT"
- Mara's crate, but crate is open, inside another city's bell
- The hollow child, but child is you, age 8

Light burns memory. You get shard + Void Sight mix skill unlock, but:

- Wilds+1, plague+1
- Flag looked_into_vault true
- Doppelganger rumor true
- Vael will now trade True Sight

You also find scrap: "Don't let them seal. Let it remember." Same handwriting as letter to self. Means you previously wanted vault to stay cracked?

Twist: Are you trying to seal or keep open?`;
    },
    choices: function(s){
      return [
        {
          label:"Accept vision, take shard (Void Sight unlocks)",
          next:"crossroads",
          effect:function(){
            if (!s.flags['consequence:looked_into_vault']) {
              addInvItem(s,'sun_vault_shard',1);
              ConsequenceEngine.applyConsequence(s,'wilds_deal',1);
              ConsequenceEngine.worldState(s).plague+=1;
              s.flags['consequence:looked_into_vault']=true;
              s.flags.worldState.doppelgangerRumor=true;
              s.flags.doppelgangerRumor=true;
              setActFlag(ACT_FLAGS.act2_vault_stared,true);
              unlockLore('sun_vault'); unlockLore('doppelganger'); unlockLore('void_sight');
              addInvItem(s,'letter_to_self',1);
              actLogConsequence('Stared into Vault. Shard+ Void Sight. Doppelganger rumor.','major');
              s.mana = Math.max(0, (s.mana||0)-2);
              s.hp = Math.max(1, (s.hp||0)-2);
              appendLog("HP-2 Mana-2 from light burn. Void Sight mix skill now available if Lv6.");
            }
          }
        },
        {
          label:"Look away, refuse knowledge (Resilience check)",
          check:{ stat:"resilience", base:0.5, per:0.04 },
          success:{
            text:"You look away, eyes watering. You keep some self.",
            effect:function(){ addEffect('shielded',15000); appendLog("Shielded 15s for resisting."); },
            next:"crossroads"
          },
          fail:{
            text:"You try to look away but light holds eyes. Same as above, but cursed 20s.",
            effect:function(){ addEffect('cursed',20000); if (!s.flags['consequence:looked_into_vault']) { addInvItem(s,'sun_vault_shard',1); ConsequenceEngine.applyConsequence(s,'wilds_deal',1); s.flags['consequence:looked_into_vault']=true; } },
            next:"crossroads"
          },
          next:"crossroads"
        }
      ];
    }
  };

  STORY.act2_debt_collector = {
    text: function(s){
      const dayTaken = getActFlag('debt_taken_day') || s.world.day;
      const days = s.world.day - dayTaken;
      return `Factor Brine, blue gloves, stands at Crossroads bell where Mara usually sits. Mara not here — moved, says city not safe for old keepers when debt unpaid.\n\n"Time," Brine says. "100 gold became 150. Or favor. Or I take something you like."

Days since debt: ${days}. Guild Power ${ConsequenceEngine.worldState(s).guildPower}.

If you have debt_marker_guild, you owe.

Choices have consequence: Pay, steal from Rebels, refuse.

Refuse = Guild -5 economy -10% bandits spawn as collectors in Low Streets until paid. Also Korg +25% prices until debt cleared, because Guild tells smiths not to serve debtors.

This is Act 2 debt consequence.`;
    },
    choices: function(s){
      return [
        {
          label:"Pay 150g (if have)",
          disabled: (s.gold||0)<150,
          next:"crossroads",
          effect:function(){
            spendGold(150); consumeInvItem(s,"debt_marker_guild",1);
            setActFlag(ACT_FLAGS.act2_debt_paid,true);
            adjustReputation('Guild',1);
            ConsequenceEngine.worldState(s).economy = Math.min(100, ConsequenceEngine.worldState(s).economy+5);
            actLogConsequence('Paid Guild debt 150g. Economy+5 Guild+1.','major');
            appendLog("Brine nods, leaves. Mara returns next day.");
          }
        },
        {
          label:"Do favor: Steal ledger from Rebels (betray Rebel path)",
          next:"crossroads",
          effect:function(){
            // Give mission to steal
            setActFlag('debt_favor_rebels',true);
            addInvItem(s,"rebel_token",1); // fake token to trick rebels
            adjustReputation('Rebels',-2); adjustReputation('Guild',1);
            ConsequenceEngine.applyConsequence(s,'betray_guild',0.5); // ironically betray rebels = help guild
            actLogConsequence('Took Guild favor: steal from Rebels. Rebels -2 Guild+1. Must deliver fake token.','major');
            s.flags.debtFavor = 'rebels';
            appendLog("Brine gives fake rebel token to plant. If caught, Rebels -5.");
          }
        },
        {
          label:"Refuse (Guild -5 economy -10% collectors spawn)",
          next:"crossroads",
          effect:function(){
            adjustReputation('Guild',-5);
            ConsequenceEngine.worldState(s).economy = Math.max(5, ConsequenceEngine.worldState(s).economy-10);
            ConsequenceEngine.worldState(s).watchHeat = Math.min(100, ConsequenceEngine.worldState(s).watchHeat+5);
            setActFlag('debt_refused',true);
            actLogConsequence('Refused Guild debt. Guild -5 economy -10% Low Streets now has collectors (Bandits tier3).','major');
            // Spawn collectors via flag handled in roamMaybeEncounter
            s.flags.guildCollectors=true;
          }
        },
        {
          label:"Burn marker at vault with ember_gem (Debt gone Guild-3 Crown+1)",
          disabled: !(s.inventory && s.inventory.ember_gem && s.inventory.debt_marker_guild),
          next:"crossroads",
          effect:function(){
            consumeInvItem(s,"ember_gem",1); consumeInvItem(s,"debt_marker_guild",1);
            adjustReputation('Guild',-3); adjustReputation('Crown',1);
            setActFlag(ACT_FLAGS.act2_debt_paid,true);
            actLogConsequence('Burned debt marker at vault. Guild -3 Crown+1. Debt gone.','major');
            appendLog("Marker burns blue. Ash spells 'paid' then 'not paid' then 'paid' flickering.");
          }
        }
      ];
    }
  };

  // Hook to trigger debt collector day 10-15
  const _origWorldTick = typeof worldTick === 'function' ? worldTick : null;
  function worldTickAct2(actionLabel) {
    if (_origWorldTick) _origWorldTick(actionLabel);
    if (!state) return;
    const takenDay = getActFlag('debt_taken_day');
    if (takenDay && !getActFlag(ACT_FLAGS.act2_debt_paid) && !getActFlag('debt_refused')) {
      const days = (state.world.day||1) - takenDay;
      if (days >=10 && days <=15 && !state.world.pendingEvent && Math.random()<0.35) {
        state.world.pendingEvent = {
          kind: 'debt',
          fromNode: state.nodeId||'crossroads',
          title: 'Debt Collector',
          text: 'Factor Brine wants debt. Go to Crossroads.'
        };
        // Force enter debt node via crossroads check? We'll make crossroads detect
        appendLog('[EVENT] Debt collector at Crossroads. Check Crossroads.');
      }
    }
    // Hollow child vanishes if wilds>50
    if (state.flags && state.flags.worldState && state.flags.worldState.wildsSpread>50 && Math.random()<0.05) {
      if (!state.flags.hollow_vanished) {
        state.flags.hollow_vanished=true;
        appendLog('[WORLD] Wilds 50%+: Hollow Child vanishes from ruins. Doll cries at night.');
      }
    }
  }
  try { worldTick = worldTickAct2; } catch(e){}
  if (typeof window !== 'undefined') window.worldTick = worldTickAct2;

  // Add debt collector detection in crossroads
  if (STORY.crossroads && STORY.crossroads.choices) {
    const origCrossChoices = STORY.crossroads.choices;
    STORY.crossroads.choices = function(s){
      const base = origCrossChoices(s);
      const takenDay = getActFlag('debt_taken_day');
      if (takenDay && !getActFlag(ACT_FLAGS.act2_debt_paid)) {
        const days = (s.world.day||1) - takenDay;
        if (days>=10) {
          base.unshift({ label:'[DEBT] Face Factor Brine (Guild debt '+days+' days overdue)', next:'act2_debt_collector' });
        }
      }
      // Add vault entrance if not yet stared
      if (!getActFlag(ACT_FLAGS.act2_vault_stared)) {
        base.unshift({ label:'Go to Sun Vault Approach (Act2)', next:'act2_vault_entrance' });
      } else {
        base.unshift({ label:'Return to Vault (seal/stare)', next:'act2_vault_entrance' });
      }
      return base;
    };
  }

  // Hollow Child expanded Act2
  STORY.act2_hollow_meet = {
    text: function(s){
      return `Ruins. Child sits where doll was. Same height as you at 8? Face blank like uncarved wood.

"Did you keep doll?"

You have doll? ${s.inventory && s.inventory.hollow_child_doll ? 'Yes' : 'No'}

WildsSpread ${ConsequenceEngine.worldState(s).wildsSpread}%.

Child says: "We tried to be you but made child shape wrong. Vault is mouth. We are food? Or you are food and we are mouth?"

Choice: Give doll back, keep, burn, or ask Vael.

This is Act2 hollow arc. Consequence: keeping teaches Wild Hunt skill easier, but plague+.

Mara says child is bait. Lys says doll is root wrapped cloth. Vael says child is wilds attempt at human.

Who do you believe?`;
    },
    choices: function(s){
      return [
        { label:"Give doll back (Wilds -2, child stays)", next:"crossroads", effect:function(){
          if (consumeInvItem(s,"hollow_child_doll",1)) {
            ConsequenceEngine.worldState(s).wildsSpread = Math.max(0, ConsequenceEngine.worldState(s).wildsSpread-2);
            adjustReputation('Wilds',2);
            actLogConsequence('Returned doll to Hollow Child. Wilds -2 Wilds+2. Child says thank you and vanishes for 3 days.','major');
            setActFlag('hollow_returned',true);
          }
        }},
        { label:"Keep doll (Wilds thinks success, whispers)", next:"crossroads", effect:function(){
          adjustReputation('Wilds',1);
          addEffect('cursed',10000); // whisper
          actLogConsequence('Kept doll. Wilds+1? Actually Wilds thinks success, stays curious. +1 mana on rest but plague+1 per 3 rests.','info');
        }},
        { label:"Give to Lys to burn (wilds -2 doll gone, ends quest, Sageleaf x2)", next:"crossroads", disabled: (s.nodeId!=='market' && s.nodeId!=='alchemist'), effect:function(){
          // Actually Lys is at market->alchemist, handle there, but allow here too
          if (consumeInvItem(s,"hollow_child_doll",1)) {
            ConsequenceEngine.worldState(s).wildsSpread=Math.max(0,ConsequenceEngine.worldState(s).wildsSpread-2);
            addInvItem(s,'herb_sageleaf',2);
            actLogConsequence('Gave doll to Lys to burn. Wilds -2, sageleaf+2, child quest ends.','major');
            setActFlag('hollow_burned_by_lys',true);
          }
        }},
        { label:"Burn at vault blue flame (wilds -3 + guilt, path to shard)", next:"act2_vault_entrance", effect:function(){
          if (consumeInvItem(s,"hollow_child_doll",1)) {
            ConsequenceEngine.worldState(s).wildsSpread=Math.max(0,ConsequenceEngine.worldState(s).wildsSpread-3);
            setActFlag('hollow_burned_vault',true);
            actLogConsequence('Burned doll at vault blue flame. Wilds -3 + guilt flag. Path to shard revealed.','major');
            addInvItem(s,'sun_vault_shard',1);
          }
        }}
      ];
    }
  };
}

function injectAct3() {
  if (typeof STORY === 'undefined') return;

  STORY.act3_omen = {
    text: function(s){
      const ws = ConsequenceEngine.worldState(s);
      return `Act 3 Omen: Day ${s.world.day}. World total power Guild${ws.guildPower}+Crown${ws.crownPower}+Rebels${ws.rebelPower}=${ws.guildPower+ws.crownPower+ws.rebelPower}. Wilds ${ws.wildsSpread}%.

Mara at Crossroads, crate empty: "Bell will ring without ringer. Means siege. When city powers fight each other more than wilds, wilds walks in."

She shows you old bell rope: "Overlord comes from those who wore Crown of Thorns too long. Or from you, if you stared too long. Same thing maybe."

Check: If wilds>40 or total powers<100 and level>=50, siege soon. Level 60+ triggers even if high powers (final test).

You have choice: Prepare (buy charms, recruit party 3+ required for legendary), or Let it happen to see what city becomes (exile path).

Siege is not failure — it's ending. How you face it determines ending.`;
    },
    choices: function(s){
      return [
        { label:"Prepare - Go to Market buy charms, Tavern recruit", next:"market" },
        { label:"Scout siege area (Cunning check, reveals Overlord is you?)", next:"act3_omen_scout", check:{ stat:"cunning", base:0.5, per:0.04 },
          success:{ text:"You scout. Overlord's banner is same as your cloak pattern, but older. Doppelganger? Or future you wearing Crown of Thorns?", effect:function(){ unlockLore('doppelganger'); setActFlag(ACT_FLAGS.act3_siege_omen,true); }, next:"crossroads" },
          fail:{ text:"You see horde, not banner.", effect:function(){}, next:"crossroads" }
        },
        { label:"Back to Crossroads", className:"secondary", next:"crossroads" }
      ];
    }
  };

  STORY.act3_omen_scout = { text:function(s){ return "You scouted."; }, choices:[{ label:"Back", next:"crossroads"}] };

  STORY.act3_endings = {
    text: function(s){
      const ws = ConsequenceEngine.worldState(s);
      const lvl = s.level||1;
      return `ACT 3 ENDINGS — Siege aftermath, Day ${s.world.day}\n\nWorld: Vault ${ws.sunVault}% Wilds ${ws.wildsSpread}% Plague ${ws.plague}\nFactions: G${ws.guildPower} C${ws.crownPower} R${ws.rebelPower}\nYour Rep: Guild ${s.reputation.Guild} Crown ${s.reputation.Crown} Rebels ${s.reputation.Rebels} Wilds ${s.reputation.Wilds}\n\nConsequence log entries: ${ (s.flags.consequenceLog||[]).length }\n\nTwist reveal: Overlord was ${ getActFlag('believed_mara') ? "former you who refused to forget, wearing Crown of Thorns for 2 years" : "Korg's daughter, grown, wearing Crown because she thought it would stop cough"}? Both can be true in wilds logic.\n\nChoose ending:`;
    },
    choices: function(s){
      return [
        {
          label:"Ending SEAL: Use 3 shards to seal vault (requires 3 shards, sunVault+15 wilds-15, but you lose memory of Act1 - flags reset?)",
          disabled: (s.inventory && s.inventory.sun_vault_shard || 0) <3,
          next:"act3_ending_seal",
        },
        {
          label:"Ending CRACK: Let vault crack fully, let wilds remember city (wildsSpread 100%, sunVault 0%, but plague ends, economy 100%, weird: city becomes forest with lanterns in trees)",
          next:"act3_ending_crack"
        },
        {
          label:"Ending KEEPER: Wear Crown of Thorns permanently, become new keeper, watchHeat 0, vault 100% but you can't leave Crossroads (game ends with you as NPC for next player? meta)",
          disabled: !(s.inventory && (s.inventory.crown_of_thorns || s.equipment && (s.equipment.accessory1==='crown_of_thorns' || s.equipment.accessory2==='crown_of_thorns'))),
          next:"act3_ending_keeper"
        },
        {
          label:"Ending EXILE: Fail siege intentionally, go to exile_town keep skills lose coin (existing exile mechanic)",
          next:"exile_town",
          effect:function(){ actLogConsequence('Chose exile ending. Keep skills lose coin supplies.','major'); }
        }
      ];
    }
  };

  STORY.act3_ending_seal = {
    text: function(s){
      return `You place 3 shards into crack. Light screams then steadies. Wilds recedes like tide.

SunVault 100%? Let's see: ${ConsequenceEngine.worldState(s).sunVault}% -> should be +15.

But: shards were futures that will never happen. By returning them, you return futures you stole. One of those futures was you remembering this moment. So you forget?

Mechanic: Sealing costs memory. We will clear act1 flags (letter, cellar) but keep skills, keep world improved.

Mara: "You sealed. City lives. You won't remember why it was worth it. That's keeper's price."

Do you seal?`;
    },
    choices: function(s){
      return [
        {
          label:"Seal (cost 3 shards, lose Act1 memory flags, vault+15 wilds-15 plague-5)",
          next:"crossroads",
          effect:function(){
            if (!consumeInvItem(s,"sun_vault_shard",3)) { appendLog("Need 3 shards"); return; }
            ConsequenceEngine.applyConsequence(s,'seal_vault',2);
            s.flags.worldState.plague = Math.max(0, s.flags.worldState.plague-5);
            // Clear some act1 flags to simulate memory loss
            setActFlag(ACT_FLAGS.act1_letter_done,false);
            setActFlag(ACT_FLAGS.act1_cellar_done,false);
            setActFlag('act1:burned_letter',false);
            actLogConsequence('ENDING SEAL: Vault sealed +15 wilds -15 plague -5. Lost memory of Act1 (flags cleared). Economy +10.','major');
            s.flags.worldState.economy = Math.min(100, s.flags.worldState.economy+10);
            gainXp(500);
            addInvItem(s,'crown_of_the_sun_vault',1);
            appendLog("Achievement: Light Keeper. Gain Crown of Sun Vault. You forget why you cried, but city breathes.");
            unlockLore('sun_vault');
          }
        },
        { label:"Don't seal (back)", className:"secondary", next:"act3_endings" }
      ];
    }
  };

  STORY.act3_ending_crack = {
    text: function(s){
      return `You step back. Let vault crack fully. Light spills like water breaking dam.

Wilds does not consume city. It remembers city. Trees grow through market stalls, lanterns hang from branches. Plague ends because light no longer half — it's gone, so absence gone too.

Mechanic: wildsSpread 100%, sunVault 0%, plague 0, economy 100% (new trade: herbs, root), watchHeat 0 (no Crown, no law).

Mara: "We became forest with streets. Children will not cough, but they will not know stone either."

Ending is weird, not good not bad. You become ranger path forever, unlock Wild Hunt easier. Twist: Hollow Child becomes permanent companion?`;
    },
    choices: function(s){
      return [
        {
          label:"Let it crack (wilds 100% vault 0% plague 0% economy 100%)",
          next:"crossroads",
          effect:function(){
            const ws = ConsequenceEngine.worldState(s);
            ws.wildsSpread=100; ws.sunVault=0; ws.plague=0; ws.economy=100; ws.watchHeat=0;
            ws.guildPower=20; ws.crownPower=10; ws.rebelPower=40; // new balance forest
            actLogConsequence('ENDING CRACK: Let vault crack. Wilds 100 vault 0 plague 0 economy 100. City becomes forest with lanterns.','major');
            addInvItem(s,'wilds_totem',1);
            gainXp(500);
            unlockLore('wilds');
            appendLog("Achievement: Forest With Streets. Gain Wilds Totem. Ranger skills +20% forage.");
          }
        },
        { label:"Back", className:"secondary", next:"act3_endings" }
      ];
    }
  };

  STORY.act3_ending_keeper = {
    text: function(s){
      return `You put Crown of Thorns on for good. Thorns grow inward, not outward. Whispers become voice you recognize — yours, older.

You see all moments at once: You writing letter to self 2 years ago, you cutting vault, you being courier who gave letter to you. Cycle.

Mechanic: Become keeper. WatchHeat 0 (guards fear you), vault 100% permanently, but you cannot leave Crossroads — every other location choice returns to Crossroads after 1 step. Game loops.

Mara: "Now you are crate. People will sit on you and say you were always here."

Ending is meta: Next player who creates profile with same name as you will find your keeper ghost? Could store ghost in localStorage?

If you have Hollow Child Doll, child sits with you and stops crying.

Do you keep crown on?`;
    },
    choices: function(s){
      return [
        {
          label:"Become Keeper (vault 100% watch 0, stuck at Crossroads, but unlock Keeper for next playthrough)",
          next:"crossroads",
          effect:function(){
            const ws = ConsequenceEngine.worldState(s);
            ws.sunVault=100; ws.watchHeat=0; ws.plague=0;
            setActFlag('keeper_ending',true);
            actLogConsequence('ENDING KEEPER: Became keeper, vault 100% watch 0. Stuck at Crossroads loop. Meta: next profile same name sees ghost.','major');
            // Store ghost
            try {
              const ghosts = JSON.parse(localStorage.getItem('virelia_keepers')||'[]');
              ghosts.push({ name:s.profile, day:s.world.day, vault:100, text:'Keeper who chose thorns' });
              localStorage.setItem('virelia_keepers', JSON.stringify(ghosts.slice(-10)));
            } catch(e){}
            gainXp(600);
            addInvItem(s,'crown_of_the_sun_vault',1);
            appendLog("Achievement: Keeper. You are now part of Crossroads. When new player uses same name, they get +5 vault start.");
          }
        },
        { label:"Take crown off (back)", className:"secondary", next:"act3_endings" }
      ];
    }
  };

  // Inject siege omen & endings into crossroads when appropriate
  if (STORY.crossroads && STORY.crossroads.choices) {
    const origCross = STORY.crossroads.choices;
    STORY.crossroads.choices = function(s){
      let base = origCross(s);
      const lvl = s.level||1;
      const ws = ConsequenceEngine.worldState(s);
      if (lvl>=45 && !getActFlag(ACT_FLAGS.act3_siege_omen)) {
        base.unshift({ label:'[ACT3] Omen - Siege coming', next:'act3_omen', effect:function(){ setActFlag(ACT_FLAGS.act3_siege_omen,true); unlockLore('siege_horde'); } });
      }
      if ((lvl>=50 || ws.wildsSpread>40) && ws.sunVault<60) {
        // show endings board early as teaser
        base.unshift({ label:'[ACT3] Endings Board - Choose fate', next:'act3_endings' });
      }
      return base;
    };
  }
}

injectAct1();
injectAct2();
injectAct3();

/* Patch normalize to trigger act checks */
const _origNormAct = typeof normalizeState === 'function' ? normalizeState : null;
function normalizeStateAct(s){
  if (_origNormAct) _origNormAct(s);
  if (!s) return;
  // Act1 check: if investigation stage 2 but not yet cellar, remind
  // Act2 check: vault approach already handled
  // Act3: if level>=60 and not completed siege, ensure siege can trigger
}
try { normalizeState = normalizeStateAct; } catch(e){}
if (typeof window !== 'undefined') window.normalizeState = normalizeStateAct;

console.log('[VIRELIA STORY] 3-act storyline injected. Nodes: courier расширен, letter_open, mara_letter, korg_letter, cellar enhanced, ledger decision 4 paths, vault entrance/seal/stare, debt collector, hollow meet, omen, endings 4.');

function storySanity(){
  return {
    actFlags: state && state.flags ? Object.keys(state.flags).filter(k=>k.indexOf('act')===0).length : 0,
    conseq: state && state.flags && state.flags.consequenceLog && state.flags.consequenceLog.length || 0,
    vaultShard: state && state.inventory && state.inventory.sun_vault_shard || 0,
    hasDebt: state && state.inventory && state.inventory.debt_marker_guild || 0
  };
}
if (typeof window !== 'undefined') window.storySanity = storySanity;
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
