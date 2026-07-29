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
