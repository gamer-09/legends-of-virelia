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
const btnAchievements = el("btnAchievements");
const btnDesign = el("btnDesign");
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

  if (btnRest) btnRest.disabled = inCombat || restCd || inDraft;
  if (btnStatus) btnStatus.disabled = inDraft;
  if (btnInventory) btnInventory.disabled = inDraft;
  if (btnSkills) btnSkills.disabled = inDraft;
  if (btnAchievements) btnAchievements.disabled = inDraft;
  if (btnDesign) btnDesign.disabled = inDraft;
  if (btnSave) btnSave.disabled = inDraft;
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
  return { tier: 0, rank: "Common", badge: "easy", mult: 1.1 };
}

let marketStockCache = null;
function marketStockKeys() {
  if (Array.isArray(marketStockCache) && marketStockCache.length) return marketStockCache;
  const keys = Object.keys(ITEM_CATALOG || {});
  const out = [];
  for (const k of keys) {
    const kk = String(k || "").trim();
    if (!kk) continue;
    if (MARKET_EXCLUDE_KEYS.has(kk)) continue;
    if (kk.startsWith("loc_")) continue;
    out.push(kk);
  }
  out.sort((a, b) => {
    const ra = marketRankForItem(a);
    const rb = marketRankForItem(b);
    if (rb.tier !== ra.tier) return rb.tier - ra.tier;
    const pa = marketPriceForItem(a);
    const pb = marketPriceForItem(b);
    if (pb !== pa) return pb - pa;
    return itemLabel(a).localeCompare(itemLabel(b));
  });
  marketStockCache = out;
  return out;
}

function marketPriceForItem(key) {
  const k = String(key || "").trim();
  const p = {
    bandage: 10,
    health_potion: 18,
    mana_potion: 15,
    tonic: 12,
    smoke_bomb: 22,
    antidote: 16,
    ration: 5,
    torch: 4,
    lockpick: 8,
    dagger: 25,
    short_sword: 45,
    iron_sword: 70,
    staff: 55,
    leather_armor: 60,
    chainmail: 110,
    cloak: 35,
    boots: 28,
    ring_of_focus: 85,
    amulet_of_vigor: 95,
    charm: 30,
  };
  const def = itemDef(k);
  const rank = marketRankForItem(k);
  const base = (typeof p[k] === "number")
    ? p[k]
    : ((def.consumable ? 14 : 60));

  const kk = k.toLowerCase();
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
  if (k.startsWith("loc_")) return false;
  return true;
}

function marketSellPriceForItem(key) {
  const k = String(key || "").trim();
  if (!k) return 0;
  const buy = marketPriceForItem(k);
  return Math.max(1, Math.floor(buy * 0.6));
}

const BLACKSMITH_RECIPES = [
  { key: "forge_iron_sword", label: "Forge Iron Sword", out: "iron_sword", outQty: 1, gold: 40, req: { ore_iron: 2 } },
  { key: "forge_chainmail", label: "Forge Chainmail", out: "chainmail", outQty: 1, gold: 75, req: { ore_iron: 3, leather: 1 } },
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

let advModalEl = null;
let advModalTitleEl = null;
let advModalBodyEl = null;

function ensureItemModal() {
  if (itemModalEl) return;

  itemModalEl = document.createElement("div");
  itemModalEl.style.position = "fixed";
  itemModalEl.style.inset = "0";
  itemModalEl.style.background = "rgba(0,0,0,0.6)";
  itemModalEl.style.display = "none";
  itemModalEl.style.alignItems = "center";
  itemModalEl.style.justifyContent = "center";
  itemModalEl.style.zIndex = "2000";

  const card = document.createElement("div");
  card.style.width = "min(520px, calc(100vw - 28px))";
  card.style.background = "#121a24";
  card.style.border = "1px solid #203044";
  card.style.borderRadius = "14px";
  card.style.padding = "14px";
  card.style.boxShadow = "0 0 18px rgba(0,0,0,0.35)";

  const top = document.createElement("div");
  top.style.display = "flex";
  top.style.justifyContent = "space-between";
  top.style.gap = "10px";
  top.style.alignItems = "center";

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
  itemModalBodyEl.className = "hint";

  card.appendChild(top);
  card.appendChild(itemModalBodyEl);

  itemModalFooterEl = document.createElement("div");
  itemModalFooterEl.className = "row";
  itemModalFooterEl.style.justifyContent = "flex-end";
  itemModalFooterEl.style.marginTop = "12px";
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
  if (itemModalEl) itemModalEl.style.display = "flex";
}

function openMarketItemModal(itemKey) {
  ensureItemModal();
  itemModalMode = "market";
  itemModalKey = String(itemKey || "").trim();
  updateItemModal();
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
      itemModalUseBtn.style.display = (owned > 0) ? "inline-block" : "none";
      itemModalUseBtn.disabled = !(owned > 0);
      itemModalUseBtn.textContent = `Use (${owned})`;
    } else {
      itemModalUseBtn.style.display = "none";
      itemModalUseBtn.disabled = true;
      itemModalUseBtn.textContent = "Use";
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
  if (itemModalEl) itemModalEl.style.display = "none";
  itemModalMode = null;
  itemModalKey = null;
}

function ensureAdvModal() {
  if (advModalEl) return;

  advModalEl = document.createElement("div");
  advModalEl.className = "modalOverlay";
  advModalEl.style.position = "fixed";
  advModalEl.style.inset = "0";
  advModalEl.style.display = "none";
  advModalEl.style.alignItems = "center";
  advModalEl.style.justifyContent = "center";
  advModalEl.style.padding = "18px";
  advModalEl.style.background = "rgba(0,0,0,0.6)";
  advModalEl.style.zIndex = "2100";

  const card = document.createElement("div");
  card.className = "modalCard";
  card.style.width = "min(720px, calc(100vw - 28px))";
  card.style.background = "#121a24";
  card.style.border = "1px solid #203044";
  card.style.borderRadius = "16px";
  card.style.boxShadow = "0 0 22px rgba(0,0,0,0.55)";
  card.style.overflow = "hidden";

  const top = document.createElement("div");
  top.className = "modalHeader";
  top.style.display = "flex";
  top.style.justifyContent = "space-between";
  top.style.gap = "10px";
  top.style.alignItems = "center";
  top.style.padding = "12px 14px";
  top.style.background = "#0e1520";
  top.style.borderBottom = "1px solid #203044";

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
  advModalBodyEl.style.padding = "12px 14px 14px";
  advModalBodyEl.style.maxHeight = "min(72vh, 720px)";
  advModalBodyEl.style.overflow = "auto";

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

function useItem(itemKey, ev) {
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

  if (!consumeInvItem(state, k, 1)) {
    logLine("You don't have that item.");
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
    addEffect("shielded", 30000);
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
    addEffect("hasted", 25000);
    if (inCombat) {
      combatEv.escapeBoost = Math.max(combatEv.escapeBoost || 0, 0.12 + cun * 0.004);
      combatEv.escapeBoostTurns = Math.max(combatEv.escapeBoostTurns || 0, 2);
      combatEv.partyDmgBoost = Math.max(combatEv.partyDmgBoost || 0, 0.10 + str * 0.004);
      combatEv.partyDmgBoostTurns = Math.max(combatEv.partyDmgBoostTurns || 0, 2);
    }
    logLine(`⚡ You drink a stamina draught. You feel faster.`);
  } else if (k === "antidote") {
    const hadC = hasEffectOnState(state, "cursed");
    clearEffect("cursed");
    logLine(hadC ? "🧴 You take an antidote. The foul feeling fades." : "🧴 You take an antidote." );
  } else if (k === "elixir") {
    const heal = Math.max(12, Math.floor(18 + res * 1.6));
    const gain = Math.max(10, Math.floor(14 + arc * 1.6));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    state.mana = Math.min(playerMaxMana(), (state.mana || 0) + gain);
    clearEffect("bleeding");
    clearEffect("cursed");
    addEffect("rested", 20000);
    logLine(`✨ You drink an elixir (+${heal} HP, +${gain} mana).`);
  } else if (k === "ration") {
    const heal = Math.max(2, Math.floor(4 + res * 0.4));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    addEffect("well_fed", 20000);
    logLine(`🍞 You eat rations (+${heal} HP).`);
  } else if (k === "waterskin") {
    addEffect("hydrated", 25000);
    logLine("💧 You drink from the waterskin.");
  } else if (k === "torch") {
    addEffect("torchlight", 25000);
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
      addEffect("smokeveil", 16000);
      logLine("💨 Smoke clings to you, dulling footsteps." );
    }
  } else if (k === "phoenix_draught") {
    state.hp = playerMaxHp();
    clearEffect("bleeding");
    addEffect("shielded", 45000);
    addEffect("rested", 45000);
    logLine("🔥 Phoenix Draught surges through you. Wounds refuse to linger." );
  } else if (k === "titanblood_elixir") {
    const heal = Math.max(8, Math.floor(14 + res * 1.2));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    addEffect("titanblood", 35000);
    logLine(`🩸 Titanblood hardens your will (+${heal} HP).`);
  } else if (k === "sunfire_serum") {
    state.mana = playerMaxMana();
    addEffect("sunfire", 30000);
    logLine("☀️ Sunfire floods your reserves. Magic feels clean." );
  } else if (k === "voidsalt_ampoule") {
    addEffect("voidsalt", 30000);
    clearEffect("cursed");
    logLine("🜂 Voidsalt numbs pain and stills fear." );
  } else if (k === "wyrmhide_tonic") {
    addEffect("wyrmhide", 35000);
    clearEffect("bleeding");
    logLine("🐉 Wyrmhide toughens your skin." );
  } else if (k === "aether_salve") {
    const heal = Math.max(6, Math.floor(12 + res * 1.0));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    addEffect("aether", 30000);
    logLine(`✨ Aether salve stings clean (+${heal} HP).`);
  } else if (k === "stormseed_powder") {
    addEffect("stormseed", 25000);
    logLine("⚡ Stormseed sparks in your veins. Reflexes sharpen." );
  } else if (k === "mindglass_vial") {
    addEffect("mindglass", 25000);
    logLine("🔍 Mindglass clears your thoughts. The world feels slow." );
  } else if (k === "shadowstep_incense") {
    addEffect("shadowstep", 25000);
    logLine("🕯️ Shadowstep incense wraps you in hush." );
  } else if (k === "ironbark_poultice") {
    const heal = Math.max(6, Math.floor(10 + res * 1.1));
    state.hp = Math.min(playerMaxHp(), (state.hp || 0) + heal);
    addEffect("ironbark", 35000);
    logLine(`🌿 Ironbark poultice steadies you (+${heal} HP).`);
  } else {
    logLine(`You use ${itemLabel(k)}.`);
  }

  autoSave();
  if (inCombat) renderPendingEvent();
  else render();
  return false;
}

function useStoryItem(itemKey) {
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
    return useItem(k);
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
    const def = skillDefFromParts(profKey, buildKey, idx);
    const score = focusScoreForDef(def) + (def.powerful ? 1 : 0);
    let accept = 25 + score * 20;
    if (guard > 1200) accept = 100;
    const roll = (x >>> 24) % 100;
    if (roll < accept) options.push(key);
    guard += 1;
  }

  while (options.length < 5) {
    const idx = ((options.length + 1) * 97) % SKILLS_PER_COMBO;
    const key = skillKeyFor(profKey, buildKey, idx + 1);
    if (!options.includes(key)) options.push(key);
    else options.push(skillKeyFor(profKey, buildKey, ((idx + 13) % SKILLS_PER_COMBO) + 1));
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
        const candDef = skillDefFromParts(profKey, buildKey, idx);
        const f = String(candDef?.focus || "").toLowerCase();
        if (f !== String(profPrimary).toLowerCase()) {
          tries += 1;
          continue;
        }
        options[options.indexOf(scored[rep].k)] = candKey;
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

  state.skills.learned[k] = 1;
  const def = skillDef(k);
  state.skills.sources = (state.skills.sources && typeof state.skills.sources === "object") ? state.skills.sources : {};
  if (!state.skills.sources[k]) state.skills.sources[k] = skillSourceForKey(state, k, def);
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

  const focus = skillFocusFor(prof, build, i);
  const focusLabel = titleCaseWord(focus);
  const label = powerful
    ? `${pick(POWER_SKILL_WORDS.prefixes, i + tier * 5)} ${pillar} ${pick(POWER_SKILL_WORDS.suffixes, i + tier * 9)}`
    : `${a} ${pillar} ${form} ${roman(tier)}`;

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

function skillTierForKey(skillKey) {
  const parsed = parseSkillKey(skillKey);
  if (!parsed) return 1;
  const i = Math.max(1, Math.floor(parsed.index || 1));
  return 1 + Math.floor((i - 1) / SKILLS_PER_TIER);
}

function skillDef(skillKey) {
  const parsed = parseSkillKey(skillKey);
  if (!parsed) {
    const k = String(skillKey || "").trim();
    return { key: k || "(unknown)", label: k || "(unknown)", desc: "No details available.", profession: "unknown", build: "unknown", focus: "balanced", tier: 1 };
  }
  return skillDefFromParts(parsed.profession, parsed.build, parsed.index);
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
  skillModalEl.style.position = "fixed";
  skillModalEl.style.inset = "0";
  skillModalEl.style.background = "rgba(0,0,0,0.6)";
  skillModalEl.style.display = "none";
  skillModalEl.style.alignItems = "center";
  skillModalEl.style.justifyContent = "center";
  skillModalEl.style.zIndex = "2000";

  const card = document.createElement("div");
  card.style.width = "min(560px, calc(100vw - 28px))";
  card.style.background = "#121a24";
  card.style.border = "1px solid #203044";
  card.style.borderRadius = "14px";
  card.style.padding = "14px";
  card.style.boxShadow = "0 0 18px rgba(0,0,0,0.35)";

  const top = document.createElement("div");
  top.style.display = "flex";
  top.style.justifyContent = "space-between";
  top.style.gap = "10px";
  top.style.alignItems = "center";

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
  skillModalBodyEl.className = "hint";

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
  if (skillModalEl) skillModalEl.style.display = "flex";
}

function closeSkillModal() {
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
  easy: { label: "Easy", className: "easy", recLevel: 1, baseXp: 25, baseGold: 8, baseDmg: 6 },
  normal: { label: "Normal", className: "normal", recLevel: 4, baseXp: 40, baseGold: 14, baseDmg: 10 },
  hard: { label: "Hard", className: "hard", recLevel: 8, baseXp: 65, baseGold: 22, baseDmg: 16 },
  elite: { label: "Elite", className: "elite", recLevel: 12, baseXp: 90, baseGold: 32, baseDmg: 24 },
  legendary: { label: "Legendary", className: "legendary", recLevel: 16, baseXp: 130, baseGold: 48, baseDmg: 36 },
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
    return;
  }

  const known = knownItemKeys();
  const expanded = adminToolsEl.dataset.knownItemsExpanded === "1";

  const knownWrap = document.createElement("div");
  knownWrap.className = "hint";
  knownWrap.style.marginTop = "0";

  const knownTop = document.createElement("div");
  knownTop.className = "row";
  knownTop.style.marginTop = "0";

  const knownLabel = document.createElement("div");
  knownLabel.className = "hint";
  knownLabel.style.marginTop = "0";
  knownLabel.textContent = `Known items: ${known.length}`;

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
    for (const k of known) {
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

  if (!adminEditingProfile) return;

  const loaded = safeLoad(adminEditingProfile);
  if (!loaded) {
    adminEditingProfile = null;
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
  invKeySel.style.padding = "10px 12px";
  invKeySel.style.borderRadius = "12px";
  invKeySel.style.border = "1px solid #2b3c55";
  invKeySel.style.background = "#0e1520";
  invKeySel.style.color = "#e9eef7";
  for (const k of known) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${itemLabel(k)} (${k})`;
    invKeySel.appendChild(opt);
  }

  const invKeyCustom = document.createElement("input");
  invKeyCustom.placeholder = "or type item key";
  invKeyCustom.style.width = "180px";

  const invQty = document.createElement("input");
  invQty.value = "1";
  invQty.style.width = "96px";

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
  profSel.style.padding = "10px 12px";
  profSel.style.borderRadius = "12px";
  profSel.style.border = "1px solid #2b3c55";
  profSel.style.background = "#0e1520";
  profSel.style.color = "#e9eef7";
  for (const p of PROFESSIONS) {
    const opt = document.createElement("option");
    opt.value = p.key;
    opt.textContent = p.label;
    profSel.appendChild(opt);
  }

  const buildSel = document.createElement("select");
  buildSel.style.padding = "10px 12px";
  buildSel.style.borderRadius = "12px";
  buildSel.style.border = "1px solid #2b3c55";
  buildSel.style.background = "#0e1520";
  buildSel.style.color = "#e9eef7";
  for (const b of BUILDS) {
    const opt = document.createElement("option");
    opt.value = b.key;
    opt.textContent = b.label;
    buildSel.appendChild(opt);
  }

  const skillKeyCustom = document.createElement("input");
  skillKeyCustom.placeholder = "or type skill key";
  skillKeyCustom.style.width = "220px";

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

  btnPrevSkillPage.addEventListener("click", () => {
    adminSkillPage = Math.max(0, adminSkillPage - 1);
    renderAdminTools();
  });
  btnNextSkillPage.addEventListener("click", () => {
    adminSkillPage = adminSkillPage + 1;
    renderAdminTools();
  });
  profSel.addEventListener("change", () => {
    adminSkillPage = 0;
    renderAdminTools();
  });
  buildSel.addEventListener("change", () => {
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
  flagsWrap.style.flexWrap = "wrap";

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
  allegSel.style.padding = "10px 12px";
  allegSel.style.borderRadius = "12px";
  allegSel.style.border = "1px solid #2b3c55";
  allegSel.style.background = "#0e1520";
  allegSel.style.color = "#e9eef7";
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

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "10px";
  container.appendChild(left);
  container.appendChild(fields);
  container.appendChild(invWrap);
  container.appendChild(skillWrap);
  container.appendChild(flagsWrap);

  form.appendChild(container);
  form.appendChild(right);
  adminToolsEl.appendChild(form);
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

function gainXp(amount) {
  if (!state) return;
  if (isAdminGodModeActive(state)) {
    applyAdminGodMode(state);
    return;
  }
  state.xp += amount;
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
  if (has("shielded")) amount = Math.max(1, Math.floor(amount * 0.75));
  if (has("wyrmhide")) amount = Math.max(1, Math.floor(amount * 0.78));
  if (has("ironbark")) amount = Math.max(1, Math.floor(amount * 0.82));
  if (has("voidsalt")) amount = Math.max(1, Math.floor(amount * 0.88));
  if (has("cursed")) amount = Math.max(1, Math.floor(amount * 1.15));

  const eq = totalEquipmentBonuses(state);
  amount = Math.max(1, Math.floor(amount * (eq.damageTakenMult || 1)));

  const res = playerStat("resilience");
  amount = Math.max(1, Math.floor(amount - res * 1.0));

  if (fx) playHitFx();
  state.hp -= amount;

  if (!o.fromEffect && amount >= 8 && Math.random() < 0.35) {
    addEffect("bleeding", 30000);
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
  const bump = Math.random() < 0.18 ? 1 : 0;
  const tier = clamp(baseTier + bump, 1, 5);

  let tries = 0;
  while (tries < 80) {
    tries += 1;
    const idx = 1 + Math.floor(Math.random() * MOB_COUNT);
    const def = mobDef(idx);
    if (def.tier !== tier && Math.random() < 0.75) continue;
    if (def.requiresPartySize > p) continue;
    if (kind === "ambush" && def.requiresParty && Math.random() < 0.9) continue;
    return def;
  }
  return mobDef(1 + Math.floor(Math.random() * 60));
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
  const rankMul = 1 + (rank - 1) * 0.12;
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
      addEffect("hasted", 18000 + tier * 1500);
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
      addEffect("rested", 14000 + tier * 2200);
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
    if (hasEffectOnState(state, "shielded")) finalDmg = Math.max(1, Math.floor(finalDmg * 0.75));
    if (hasEffectOnState(state, "wyrmhide")) finalDmg = Math.max(1, Math.floor(finalDmg * 0.78));
    if (hasEffectOnState(state, "ironbark")) finalDmg = Math.max(1, Math.floor(finalDmg * 0.82));
    if (hasEffectOnState(state, "voidsalt")) finalDmg = Math.max(1, Math.floor(finalDmg * 0.88));
    if (hasEffectOnState(state, "cursed")) finalDmg = Math.max(1, Math.floor(finalDmg * 1.15));
    const eq = totalEquipmentBonuses(state);
    finalDmg = Math.max(1, Math.floor(finalDmg * (eq.damageTakenMult || 1)));
  }

  if (finalDmg > 0) {
    playHitFx();
    if (targetId === "player" && finalDmg >= 8 && Math.random() < 0.35) {
      addEffect("bleeding", 30000);
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
  const tier = clamp(1 + Math.floor((lvl - 1) / 2), 1, 5);
  const lvlMul = 1 + clamp((lvl - 1) * 0.05, 0, 0.85);

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

  for (const e of enemies) {
    if (!e || (e.hp || 0) <= 0) continue;
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
    state.world.pendingEvent = null;
    autoSave();
    enterNode("defeat");
    return;
  }

  if (partyLeft <= 0) {
    state.world.pendingEvent = null;
    autoSave();
    enterNode("defeat");
    return;
  }
  if (enemiesLeft <= 0) {
    ev.stage = "victory";
    if (!ev.didReward) {
      ev.didReward = true;
      const count = Array.isArray(ev.enemies) ? ev.enemies.length : 1;
      const topTier = Math.max(1, ...((ev.enemies || []).map((e) => Math.floor(e?.tier || 1))));
      const xp = Math.max(8, Math.floor(10 + (state.level || 1) * 2 + topTier * 10 + count * 6));
      pushCombatLog(ev, `🏆 Reward: +${xp} XP.`);
      gainXp(xp);
    }
    pushCombatLog(ev, "🏁 Victory. The road is quiet again.");
  }
}

function combatPlayerAction(action) {
  if (!state) return;
  normalizeState(state);
  const ev = state.world?.pendingEvent;
  if (!ev || ev.kind !== "combat") return;
  if (ev.stage !== "combat") return;

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
    ev.uiMode = "main";
    useItem("bandage", ev);
  } else if (action === "item_health_potion") {
    ev.uiMode = "main";
    useItem("health_potion", ev);
  } else if (action === "item_mana_potion") {
    ev.uiMode = "main";
    useItem("mana_potion", ev);
  } else if (action === "item_tonic") {
    ev.uiMode = "main";
    useItem("tonic", ev);
  } else if (action === "item_smoke_bomb") {
    ev.uiMode = "main";
    useItem("smoke_bomb", ev);
  } else if (action === "run") {
    ev.uiMode = "main";
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

  const extra = Math.max(0, Math.floor((lvl - 1) * 0.8) + Math.floor((lvl - 1) / 3));
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

  const baseHp = 24 + (p?.hpBonus || 0) + (b?.hpBonus || 0) + lvl * 4 + (stats.resilience || 0) * 3;
  const baseMana = 12 + (p?.manaBonus || 0) + (b?.manaBonus || 0) + lvl * 3 + (stats.arcana || 0) * 3;

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
    document.body.classList.remove("fx-bleeding", "fx-rested", "fx-cursed", "fx-shielded");
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
}

function badgeForDifficulty(diffKey) {
  const d = DIFFICULTY[diffKey] || DIFFICULTY.normal;
  return `<span class="badge ${d.className}">${d.label}</span>`;
}

function missionTitle(i) {
  const verbs = ["Recover", "Escort", "Investigate", "Hunt", "Guard", "Deliver", "Explore", "Breach", "Rescue", "Map"];
  const nouns = ["the Ruins", "the Wildwood", "the Old Road", "a Relic", "a Caravan", "a Beacon", "a Lost Mage", "a Smuggler Ring", "the Shadow Cell", "the Sun Vault"];
  return `${verbs[i % verbs.length]} ${nouns[i % nouns.length]}`;
}

function sideQuestTitle(i) {
  const a = ["Whispers", "Ashes", "Lanterns", "Oaths", "Crows", "Mist", "Coins", "Runes", "Fires", "Echoes"];
  const b = ["in the Market", "by Moonlight", "of the Marsh", "of the Fallen", "at the Shrine", "under Stone", "of the River", "of the Watch", "of the Hollow", "at Dawn"];
  return `${a[i % a.length]} ${b[i % b.length]}`;
}

function pickDifficultyByIndex(i) {
  if (i < 200) return "easy";
  if (i < 350) return "normal";
  if (i < 480) return "hard";
  if (i < 560) return "elite";
  return "legendary";
}

function genMissions(count) {
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
      title: `#${i + 1} ${missionTitle(i)}`,
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
  const quests = [];
  const places = ["Virelia Gate", "Old Harbor", "Moonwell", "High Market", "Wind Shrine", "Blackwood Edge", "Stonebridge", "Glass Marsh"];
  for (let i = 0; i < count; i++) {
    const minLevel = 1 + Math.floor(i / 15);
    const faction = FACTIONS[(i + 2) % FACTIONS.length];
    quests.push({
      id: `s${i + 1}`,
      kind: "side",
      title: `Side Quest ${i + 1}: ${sideQuestTitle(i)}`,
      minLevel,
      faction,
      place: places[i % places.length],
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
        onChoose: () => enterNode("crossroads"),
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
      returnNode: "crossroads",
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
          { label: "Return to Crossroads", className: "secondary", onChoose: () => enterNode("crossroads") },
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
        returnNode: "crossroads",
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
      returnNode: "crossroads",
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
    const chance = clamp(base + stat * perStat + rep * repMul - pressure * 0.04 - Math.max(0, dt - 2) * 0.03, 0.10, 0.92);
    return { chance, ok: roll < chance };
  };

  if (phase === 0) {
    if (a === "bribe") {
      const cost = Math.max(1, Math.floor(ev.goldCost || 10));
      if ((state.gold || 0) < cost) {
        lines.push("You reach for coin — but you don't have enough.");
      } else {
        state.gold -= cost;
        const c = clamp(0.62 + rep * 0.05 - pressure * 0.03 - Math.max(0, dt - 2) * 0.04, 0.18, 0.90);
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
        const c = clamp(0.66 + rep * 0.04 - pressure * 0.03 - Math.max(0, dt - 2) * 0.04, 0.20, 0.92);
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
      0.34 + (ev.edge || 0) * 0.16 - (ev.heat || 0) * 0.10 + rep * 0.02 + playerStat("cunning") * 0.02 - pressure * 0.05 - Math.max(0, dt - 2) * 0.03,
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
        { label: "Return to Crossroads", className: "secondary", onChoose: () => enterNode("crossroads") },
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
      returnNode: "crossroads",
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

  if (approach === "scout") {
    appendLog("You move quietly: counting patrols, measuring distances, reading footprints.");
  } else if (approach === "negotiate") {
    appendLog("You seek a soft door: names, favors, and quiet bargains in back rooms.");
  } else {
    appendLog("You go in loud. Sometimes the world moves for the brave.");
  }

  if (approach === "negotiate") {
    const nev = createMissionNegotiationEvent(state, q);
    state.world.pendingEvent = nev;
    autoSave();
    renderPendingEvent();
    return;
  }

  const mob = pickMissionMobForQuest(state, q);
  const ev = createCombatEvent(state, "mission", mob);
  tuneMissionCombatEvent(ev, q);
  ev.quest = {
    kind: "mission",
    id: q.id,
    title: q.title,
    rewardXp: q.xp,
    rewardGold: q.gold,
    faction: q.faction,
    returnNode: "crossroads",
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
  if (choice === "refuse") {
    appendLog("You turn away. In Virelia, every refusal becomes a rumor.");
    adjustReputation(q.faction, -1);
    state.activeQuest = null;
    state.pendingSide = null;
    autoSave();
    render();
    showChoices([
      { label: "Back to Quest Board", className: "secondary", onChoose: () => render() },
      { label: "Crossroads", className: "secondary", onChoose: () => enterNode("crossroads") },
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
        addEffect("torchlight", 25000);
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
          addEffect("torchlight", 25000);
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
  const roam = ensureRoamState(s);
  const area = roamAreaDef(roam.areaKey);
  roam.steps += 1;

  if (kind === "rest") {
    roam.risk = clamp(roam.risk - 30, 0, 100);
    s.hp = Math.min(s.maxHp || 1, (s.hp || 0) + 2);
    appendLog("You slow your breathing and let the noise pass. (+2 HP)");
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
    appendLog("You take a breath and let the crowd swallow your presence. (+2 HP)");
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
  const learned = s.skills?.learned || {};
  let tries = 0;
  while (offers.length < 6 && tries < 600) {
    tries += 1;
    const idx = 1 + Math.floor(Math.random() * SKILLS_PER_COMBO);
    const k = skillKeyFor(prof, build, idx);
    if (learned[k]) continue;
    if (offers.includes(k)) continue;
    offers.push(k);
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

  const def = skillDef(k);
  const cost = skillPointCost(def);
  if ((state.skillPoints || 0) < cost) {
    appendLog(`Not enough Skill Points. Need ${cost}.`);
    renderPendingEvent();
    return;
  }

  state.skillPoints -= cost;
  state.skills.learned[k] = 1;
  state.skills.sources = (state.skills.sources && typeof state.skills.sources === "object") ? state.skills.sources : {};
  if (!state.skills.sources[k]) state.skills.sources[k] = skillSourceForKey(state, k, def);
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
      const bribeCost = Math.max(1, Math.floor(ev.goldCost || 10));
      showChoices([
        { label: "Scout Contacts (Cunning)", onChoose: () => missionNegotiateResolve("contacts") },
        { label: "Call in a Favor", className: "secondary", onChoose: () => missionNegotiateResolve("favor") },
        { label: `Bribe (${bribeCost} gold)`, className: "secondary", disabled: (state.gold || 0) < bribeCost, onChoose: () => missionNegotiateResolve("bribe") },
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
      const hasQuest = !!ev.quest && !ev.quest.completed;
      showChoices([
        { label: ev.didLoot ? "Looted" : "Loot", className: ev.didLoot ? "secondary" : "", onChoose: () => combatLoot(ev) },
        { label: ev.didSearch ? "Searched" : "Search", className: ev.didSearch ? "secondary" : "", onChoose: () => combatSearch(ev) },
        ...(hasQuest ? [{ label: "Complete Quest", onChoose: () => combatCompleteQuest(ev) }] : []),
        {
          label: "Leave",
          className: "secondary",
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
  for (const k of ev.offers || []) {
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
    buy.disabled = (state.skillPoints || 0) < skillPointCost(def) || !!state.skills.learned[def.key];
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
  for (const c of choices) {
    const b = document.createElement("button");
    b.textContent = c.label;
    if (c.className) b.className = c.className;
    if (c.disabled) b.disabled = true;
    b.addEventListener("click", () => {
      if (guardLevelUpDraft()) return;
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
  state.nodeId = id;
  startNextLevelUpDraftIfNeeded(state);
  if (hasActiveLevelUpDraft(state)) {
    renderLevelUpDraft();
    return;
  }
  if (id === "tavern") {
    renderTavern();
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
      if ((s.gold || 0) >= 30) c.push({ label: "Buy a Charm (+Max HP)", next: "crossroads", effect: () => { s.gold -= 30; s.maxHp += 4; s.hp = Math.min(s.maxHp, s.hp + 4); appendLog("You buy a small charm. Your breath steadies."); } });
      c.push({ label: "Return to Gate", className: "secondary", next: "gate" });
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
            addEffect("bleeding", 20000);
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
            addEffect("cursed", 20000);
            appendLog("Key item gained: Ledger. Deliver Findings at Crossroads.");
            if (!hadLedger) openItemModal("ledger");
          },
        },
        fail: {
          text: "The vision fractures — and bites back.",
          effect: () => {
            addEffect("cursed", 30000);
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
      out.push({ label: "Visit the Blacksmith", next: "blacksmith" });
      out.push({ label: "Ask about mercenaries (Tavern)", next: "tavern" });
      out.push({ label: "Back to Crossroads", className: "secondary", next: "crossroads" });
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
          appendLog("A priest takes a donation and leaves you with water.");
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

function renderQuestList() {
  questListEl.innerHTML = "";
  if (!state) return;

  if ((state.nodeId || "") === "market") {
    renderMarketList();
    return;
  }

  const completedM = state.completed?.missions || {};
  const completedS = state.completed?.side || {};

  const list = (activeTab === "missions") ? state.missions : state.sideQuests;
  const filtered = (list || []).filter((q) => {
    if (q.kind === "mission") return !completedM[q.id];
    return !completedS[q.id];
  });

  const total = filtered.length;
  const maxPage = Math.max(0, Math.ceil(total / QUESTS_PER_PAGE) - 1);
  questPage = clamp(questPage, 0, maxPage);
  const start = questPage * QUESTS_PER_PAGE;
  const end = Math.min(total, start + QUESTS_PER_PAGE);
  const toShow = filtered.slice(start, end);

  if (questPageInfo) {
    const label = (activeTab === "missions") ? "Missions" : "Side Quests";
    questPageInfo.textContent = total === 0 ? `${label}: none available` : `${label}: ${start + 1}-${end} of ${total}`;
  }
  if (btnPrevQuest) btnPrevQuest.disabled = questPage <= 0;
  if (btnNextQuest) btnNextQuest.disabled = questPage >= maxPage;

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
    btn.addEventListener("click", () => startQuest(q));
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
}

function renderMarketList() {
  questListEl.innerHTML = "";
  if (!state) return;
  normalizeState(state);

  const keys = marketStockKeys();
  const total = keys.length;
  const maxPage = Math.max(0, Math.ceil(total / MARKET_ITEMS_PER_PAGE) - 1);
  marketPage = clamp(marketPage, 0, maxPage);

  if (questPageInfo) {
    const start = marketPage * MARKET_ITEMS_PER_PAGE;
    const end = Math.min(total, start + MARKET_ITEMS_PER_PAGE);
    questPageInfo.textContent = total === 0
      ? "Market: no items"
      : `Market: ${start + 1}-${end} of ${total}`;
  }
  if (btnPrevQuest) btnPrevQuest.disabled = marketPage <= 0;
  if (btnNextQuest) btnNextQuest.disabled = marketPage >= maxPage;

  for (const k of keys.slice(marketPage * MARKET_ITEMS_PER_PAGE, marketPage * MARKET_ITEMS_PER_PAGE + MARKET_ITEMS_PER_PAGE)) {
    const def = itemDef(k);
    const r = marketRankForItem(k);
    const price = marketPriceForItem(k);
    const owned = Math.max(0, Math.floor(state.inventory?.[k] || 0));

    const item = document.createElement("div");
    item.className = "questItem";
    item.style.cursor = "pointer";

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
    meta.textContent = `Price: ${price} gold | Owned: ${owned}`;
    item.appendChild(meta);

    if (!isAdminProfile(state.profile) && (state.gold || 0) < price) {
      item.style.opacity = "0.6";
    }

    item.addEventListener("click", () => {
      openMarketItemModal(k);
    });

    questListEl.appendChild(item);
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
  if (typeof s.skills.page !== "number") s.skills.page = 0;
  if (!Array.isArray(s.skills.draftQueue)) s.skills.draftQueue = [];
  if (typeof s.skills.draft === "undefined") s.skills.draft = null;
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
    ensureAdminAccount(true);
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
  if (!state.missions || state.missions.length !== MISSION_COUNT) state.missions = genMissions(MISSION_COUNT);
  if (!state.sideQuests || state.sideQuests.length !== SIDE_QUEST_COUNT) state.sideQuests = genSideQuests(SIDE_QUEST_COUNT);
  appendLog("⏳ Continued your journey.");
  setHomeMsg(`Continued as ${profile}.`);
  setTabUi();
  render();
  renderHomeSaves();
  const nid = state.nodeId || "crossroads";
  const inCreation = nid === "character_create" || nid === "character_build";
  if (!state.character?.created && !inCreation) {
    if (!state.character.profession) state.character.profession = "fighter";
    if (!state.character.build) state.character.build = "balanced";
    state.character.created = true;
    appendLog("Your save was from an older version. Assigned a default class/build.");
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
    try {
      localStorage.removeItem(saveKey(ADMIN_PROFILE));
      localStorage.setItem(`virelia_admin_deleted:${ADMIN_PROFILE}`, "1");
    } catch {
    }
    if (state && state.profile === ADMIN_PROFILE) state = null;
    adminMode = false;
    adminEditingProfile = null;
    adminShowGame = true;
    setAdminDashboardUi();
    setHomeMsg("Admin profile deleted.");
    renderHomeSaves();
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
  ensureAdminAccount(true);
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
  addEffect("rested", 30000);
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
  if ((state.skillPoints || 0) <= 0) {
    showSkills("No skill points.");
    return;
  }
  state.skillPoints -= 1;
  state.skills.learned[k] = 1;
  const def = skillDef(k);
  state.skills.sources = (state.skills.sources && typeof state.skills.sources === "object") ? state.skills.sources : {};
  if (!state.skills.sources[k]) state.skills.sources[k] = skillSourceForKey(state, k, def);
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
  const def = skillDef(k);
  const cost = skillPointCost(def);
  if ((state.skillPoints || 0) < cost) return false;
  state.skillPoints -= cost;
  state.skills.learned[k] = Math.max(1, Math.floor(state.skills.learned[k] || 1)) + 1;
  autoSave();
  return true;
}

function showSkills(msg) {
  if (!state) return;
  if (guardLevelUpDraft()) return;
  normalizeState(state);
  syncSidebarButtons();

  const profKey = state.character?.profession || "fighter";
  const buildKey = state.character?.build || "balanced";
  const p = professionDef(profKey);
  const b = buildDef(buildKey);
  const pLabel = p ? p.label : titleCaseWord(profKey);
  const bLabel = b ? b.label : titleCaseWord(buildKey);

  const total = SKILLS_PER_COMBO;
  const maxPage = Math.max(0, Math.ceil(total / SKILLS_PER_PAGE) - 1);
  state.skills.page = clamp(state.skills.page || 0, 0, maxPage);
  const start = state.skills.page * SKILLS_PER_PAGE + 1;
  const end = Math.min(total, start + SKILLS_PER_PAGE - 1);

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
  pager.textContent = `Skillbook: ${start}-${end} of ${total}`;
  outputEl.appendChild(pager);

  const list = document.createElement("div");
  list.className = "skillList";
  for (let i = start; i <= end; i++) {
    const def = skillDefFromParts(profKey, buildKey, i);
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
    btnUpgrade.title = `Upgrade this skill (-${upCost} Skill Points)`;
    btnUpgrade.disabled = !learned || (state.skillPoints || 0) < upCost;
    btnUpgrade.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
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
    { label: "Prev Page", className: "secondary", onChoose: () => { state.skills.page = Math.max(0, (state.skills.page || 0) - 1); showSkills(); } },
    { label: "Next Page", className: "secondary", onChoose: () => { state.skills.page = Math.min(maxPage, (state.skills.page || 0) + 1); showSkills(); } },
    { label: "+ Strength", onChoose: () => spendSkill("strength") },
    { label: "+ Cunning", onChoose: () => spendSkill("cunning") },
    { label: "+ Arcana", onChoose: () => spendSkill("arcana") },
    { label: "+ Resilience", onChoose: () => spendSkill("resilience") },
    { label: "Back", className: "secondary", onChoose: () => enterNode(state.nodeId || "crossroads") },
  ]);

  outputEl.scrollTop = 0;
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

  ensureAdminAccount();

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
  if (btnAchievements) btnAchievements.addEventListener("click", () => { worldTick("Achievements"); clearLog(); showAchievements(); autoSave(); });
  if (btnDesign) btnDesign.addEventListener("click", () => { worldTick("Design"); clearLog(); showDesign(); autoSave(); });
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

function showDesign() {
  if (!state) return;
  if (guardLevelUpDraft()) return;
  normalizeState(state);
  syncSidebarButtons();

  // Clear the output and choices panels like dialog panel
  outputEl.innerHTML = "";
  choicesEl.innerHTML = "";
  if (questListEl) questListEl.innerHTML = "";

  // Add header
  const header = document.createElement("div");
  header.className = "line";
  header.textContent = "Design Actions";
  outputEl.appendChild(header);

  // Add description
  const body = document.createElement("div");
  body.className = "hint";
  body.style.whiteSpace = "pre-wrap";
  body.textContent = "Choose an action to modify your character design and appearance.";
  outputEl.appendChild(body);

  // Show action choices like dialog panel
  showChoices([
    { label: "Change Character Name", onChoose: () => designAction("changeName") },
    { label: "Customize Appearance", className: "secondary", onChoose: () => designAction("customizeAppearance") },
    { label: "Select Title", className: "secondary", onChoose: () => designAction("selectTitle") },
    { label: "Modify Background", className: "secondary", onChoose: () => designAction("modifyBackground") },
    { label: "Reset Design", className: "danger", onChoose: () => designAction("resetDesign") },
    { label: "Back", className: "secondary", onChoose: () => { render(); } }
  ]);

  outputEl.scrollTop = 0;
  renderStats();
}

function designAction(action) {
  if (!state) return;
  
  // Clear and show action-specific content
  outputEl.innerHTML = "";
  choicesEl.innerHTML = "";
  if (questListEl) questListEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "line";
  
  let actionChoices = [];

  switch(action) {
    case "changeName":
      header.textContent = "Change Character Name";
      
      const nameBody = document.createElement("div");
      nameBody.className = "hint";
      nameBody.style.whiteSpace = "pre-wrap";
      nameBody.textContent = `Current name: ${state.profile || "Unknown"}\n\nChoose a new name for your character:`;
      outputEl.appendChild(nameBody);
      
      actionChoices = [
        { label: "Enter Custom Name", onChoose: () => promptForName() },
        { label: "Random Name", className: "secondary", onChoose: () => generateRandomName() },
        { label: "Back", className: "secondary", onChoose: () => showDesign() }
      ];
      break;
      
    case "customizeAppearance":
      header.textContent = "Customize Appearance";
      
      const appearanceBody = document.createElement("div");
      appearanceBody.className = "hint";
      appearanceBody.style.whiteSpace = "pre-wrap";
      appearanceBody.textContent = "Customize your character's visual appearance and style.";
      outputEl.appendChild(appearanceBody);
      
      actionChoices = [
        { label: "Change Hair Style", onChoose: () => designAction("changeHair") },
        { label: "Change Eye Color", className: "secondary", onChoose: () => designAction("changeEyes") },
        { label: "Change Skin Tone", className: "secondary", onChoose: () => designAction("changeSkin") },
        { label: "Change Outfit", className: "secondary", onChoose: () => designAction("changeOutfit") },
        { label: "Back", className: "secondary", onChoose: () => showDesign() }
      ];
      break;
      
    case "selectTitle":
      header.textContent = "Select Title";
      
      const titleBody = document.createElement("div");
      titleBody.className = "hint";
      titleBody.style.whiteSpace = "pre-wrap";
      titleBody.textContent = "Choose a title to display before your character's name.";
      outputEl.appendChild(titleBody);
      
      actionChoices = [
        { label: "Novice", onChoose: () => setTitle("Novice") },
        { label: "Adventurer", className: "secondary", onChoose: () => setTitle("Adventurer") },
        { label: "Hero", className: "secondary", onChoose: () => setTitle("Hero") },
        { label: "Legend", className: "secondary", onChoose: () => setTitle("Legend") },
        { label: "No Title", className: "secondary", onChoose: () => setTitle("") },
        { label: "Back", className: "secondary", onChoose: () => showDesign() }
      ];
      break;
      
    case "modifyBackground":
      header.textContent = "Modify Background";
      
      const bgBody = document.createElement("div");
      bgBody.className = "hint";
      bgBody.style.whiteSpace = "pre-wrap";
      bgBody.textContent = "Change your character's backstory and origin.";
      outputEl.appendChild(bgBody);
      
      actionChoices = [
        { label: "Noble Birth", onChoose: () => setBackground("noble") },
        { label: "Commoner", className: "secondary", onChoose: () => setBackground("commoner") },
        { label: "Orphan", className: "secondary", onChoose: () => setBackground("orphan") },
        { label: "Mysterious", className: "secondary", onChoose: () => setBackground("mysterious") },
        { label: "Back", className: "secondary", onChoose: () => showDesign() }
      ];
      break;
      
    case "resetDesign":
      header.textContent = "Reset Design";
      
      const resetBody = document.createElement("div");
      resetBody.className = "hint";
      resetBody.style.whiteSpace = "pre-wrap";
      resetBody.textContent = "Are you sure you want to reset all design customizations to default?";
      outputEl.appendChild(resetBody);
      
      actionChoices = [
        { label: "Yes, Reset Design", className: "danger", onChoose: () => doResetDesign() },
        { label: "No, Cancel", className: "secondary", onChoose: () => showDesign() }
      ];
      break;
      
    default:
      showDesign();
      return;
  }
  
  outputEl.appendChild(header);
  showChoices(actionChoices);
  outputEl.scrollTop = 0;
  renderStats();
}

function promptForName() {
  const newName = prompt("Enter new character name:", state.profile || "");
  if (newName && newName.trim()) {
    state.profile = newName.trim();
    state.design = state.design || {};
    state.design.customName = true;
    
    const message = document.createElement("div");
    message.className = "hint";
    message.style.whiteSpace = "pre-wrap";
    message.textContent = `Character name changed to: ${newName.trim()}`;
    outputEl.appendChild(message);
    
    setTimeout(() => showDesign(), 1500);
  }
}

function generateRandomName() {
  const names = ["Aldric", "Brenna", "Caelan", "Daria", "Eamon", "Fiona", "Gareth", "Hazel", "Ivor", "Jocelyn"];
  const randomName = names[Math.floor(Math.random() * names.length)];
  
  state.profile = randomName;
  state.design = state.design || {};
  state.design.customName = true;
  
  const message = document.createElement("div");
  message.className = "hint";
  message.style.whiteSpace = "pre-wrap";
  message.textContent = `Character name changed to: ${randomName}`;
  outputEl.appendChild(message);
  
  setTimeout(() => showDesign(), 1500);
}

function setTitle(title) {
  state.design = state.design || {};
  state.design.title = title;
  
  const message = document.createElement("div");
  message.className = "hint";
  message.style.whiteSpace = "pre-wrap";
  message.textContent = `Title set to: ${title || "None"}`;
  outputEl.appendChild(message);
  
  setTimeout(() => showDesign(), 1500);
}

function setBackground(background) {
  state.design = state.design || {};
  state.design.background = background;
  
  const message = document.createElement("div");
  message.className = "hint";
  message.style.whiteSpace = "pre-wrap";
  message.textContent = `Background set to: ${background}`;
  outputEl.appendChild(message);
  
  setTimeout(() => showDesign(), 1500);
}

function doResetDesign() {
  state.design = {};
  
  const message = document.createElement("div");
  message.className = "hint";
  message.style.whiteSpace = "pre-wrap";
  message.textContent = "Design has been reset to default values.";
  outputEl.appendChild(message);
  
  setTimeout(() => showDesign(), 1500);
}

init();
