# Legends of Virelia — Text RPG V2 + Lore Codex + 3-Act Story

A browser-based **text-only** RPG that runs entirely in the browser. No build step. **Every action has a consequence. The city remembers.**

This is now a full RPG overhaul (reference: Fallen London + Disco Elysium + Planescape + Wildermyth).

## Run locally

```bash
cd legends-of-virelia
python -m http.server 8000
# or py -m http.server 8000 on Windows
# open http://localhost:8000/
```

Favicon 404 is harmless — fixed with data URI 📜 in v2.

## What's New in V2

### Panels Side-by-Side
- Layout: 280px Adventurer | 1fr Story | 340px Quest Board, sticky, no scrolling hell
- Terminal mono style, FX restored (hit flash + shake, bleeding pulse, rested green glow, cursed scanline, poisoned drip, shielded blue border)
- Badges top-right `[BLEEDING]`, modals as `[ SYSTEM WINDOW ]`

### Consequence Engine & World State
- State: `sunVault%`, `guildPower`, `crownPower`, `rebelPower`, `wildsSpread%`, `plague`, `economy`, `watchHeat`
- Every rep change moves powers, shopPriceMod = 1 + (50-economy)*0.016 (10 = +80% price, 100 = -30%)
- WatchHeat >40 triggers guard checkpoints, >60 market checkpoint 25% chance: pay 8g or Crown -1
- Daily decay: vault <80 loses 1% → wilds+1, plague>20 spreads -1 HP/day, Crown of Thorns equipped -1 vault/day
- **Consequence Board** at Crossroads shows last 12 actions + world bars

### Mix Skills — Hybrid Classes
Learn 2+ skills from other profession to unlock:
- `Shadowsteel Dance` F+R Str5 Cun5 Lv6
- `Arcane Warden` F+M Str4 Arc5 Lv7 (6 mana, may curse if vault<50)
- `Plague Doctor` C+R Res4 Cun4 Lv6
- `Soul Weaver` M+C Arc6 Res4 Lv8 (revive without feather, max HP -10% until rest)
- `Wild Hunt` R+Wilds Cun5 Res5 Wilds rep5 Lv7 (wilds+1)
- `Oathbreaker` F+Crown Str6 Lv9 (Crown-2 Rebels+1 guilt)
- `Gutter Saint` Any+Rebel (gave to beggars 3x)
- `Void Sight` Vault stare

Check **Crossroads → Mix Skills** board.

### Expanded Items (9 new)
- `Crown of Thorns` +5 all stats but -1 vault/day wilds+2, can be reforged by Korg into Crown of Sun Vault
- `Guild Debt Marker` 100g now, Factor demands 150g Day10-15 or favor steal from Rebels or refuse → Guild-5 economy-10% collectors spawn
- `Letter To Yourself` handwriting 2 years before arrival, doppelganger rumor
- `Hollow Child Doll` keep = +1 mana whisper plague+1 vs sell 40g Wilds-5 vs give Lys burn wilds-2
- `Sun Vault Shard` seal +5/-5/-2 vs sell 150g +3 wilds, 5 shards = Light Keeper 500XP
- `Rebels Blood Oath`, `Beggars Bowl`, `Wilds Mushroom`, `Doppel Smoke` (+50% escape but watchHeat rumor)

### Living NPCs
- Mara Crossroads: remembers abandoned party, beggars, ledger return
- Korg Blacksmith: discount if bring ore, +25% if stole from Guild, daughter died cough, reforges thorns
- Lys Alchemist: refuses if poisoned innocents, burns doll
- Vael Enchanter: trades True Sight if looked_into_vault, not human if wilds>70
- Jun Tavernkeep: recruit cost modified by affinity
- Hollow Child: Wilds attempt at human, vanishes if wilds>50

### Free Roam V2 — 10 Interconnected Areas
```
Low Streets(1) → Docks,Market,Gate,Ruins
Docks(2) cost water → Marsh,Market (mushroom trade Wilds rep>=3)
Market(0) safe but watchHeat checkpoint
Gate(1) cost water → Road,Market (guards if watchHeat>30)
Road(2) ration+water → Ruins,Marsh (ambush = danger+risk+watchHeat)
Ruins(3) torch+ration → Vault (needs torch else -20% acc, hollow child, crown_of_thorns 1%)
Marsh(3) → Wilds (poison 15% forage, 30% if Wilds rep -5)
Vault Approach(4) torch+water → Shard 100% first stare, choice seal/stare/leave
Deep Wilds(5) 2 ration 2 water 1 torch + ward needed → rare aegis 2%, forage mushroom
Crossroads(0) hub
```
Costs enforced, discovers [KNOWN]/[???] paths, forage/scout/rest with risk.

### Combat Twists
18% twist per round:
- Surrender at <25% HP — capture choice Crown+2 20g vs Rebels+2 10g Guild-1
- Reinforcements — horn, extra mob up to 5 enemies
- Darkness — ruins no torch -25% acc
- No longer just death — capture, debt, plague

### Lore Codex — 40+ Entries
New node **Lore Codex** at Crossroads:
- World: Foundation (city carved around light), Sun Vault (heart weeps), Wilds (memory of forest), Plague (light starvation), Doppelganger
- Factions: Guild (weighing houses), Crown (plates never battled), Rebels (charcoal marks), Wilds as 4th faction
- Locations: Each area with danger, cost, secret
- People: Full backstories + affinity rules
- Monsters: Bandits (economy<30 spawn more), Wolves pack, Ghoul/Wraith recognizable former companions, Goblins cistern trade, Cultists steal letter, Siege Horde/Overlord 4.6x HP Dark Mend/Shadow Nova/Soul Siphon
- Items: Crown lore mayor vanished, Doll moral no right answer, Shard future light stolen, Debt collector Day10-35 ambush
- Classes: Fighter/Rogue/Mage/Cleric/Ranger endgame builds

Unlocks by exploring, picking items, fighting, talking, staring into vault.

### 3-Act Main Storyline — 4 Endings

**Act 1: The Sealed Letter**
- Courier gives sealed letter: brown ink 7 names including Korg's daughter + your name crossed out "Did not take gold. Will remember. Must cut again"
- Hidden ink (ember_gem dust only in shadow): "Vault didn't crack. It was cut. Bring to Crossroads midnight. Burn after."
- Mara reveals second handwriting is yours from 2 winters ago, you stayed at shrine saying never returning — believed +2 affinity doppelganger rumor, doubt -1
- Korg: daughter payments 20g debt marker, shows his tin same wax, promise revenge +3
- Lantern-shop cellar: doll on floor same as hollow_child_doll, fresh footprints size yours, scrap "Don't let them seal. Let it crack, let it remember." — you sabotaged vault before?
- Ledger decision: Guild (sigil + debt marker, economy -10% in 5 days), Rebels (band + blood oath + runner says you were one of us 2 years ago), Crown (witness watchHeat+5), Burn (Wilds+1 economy+2 creates debt marker ash)

**Act 2: The Crack Widens**
- Vault Approach: Stare vs Seal vs Leave — stare gives shard + Void Sight + letter_to_self + HP-2 Mana-2 wilds+1 plague+1, look away Resilience check shielded/cursed
- Debt Collector: Factor Brine Day10-15 demands 150g or favor steal from Rebels or refuse Guild-5 economy-10% collectors spawn Low Streets, or burn at vault with ember_gem Guild-3 Crown+1. Hook in worldTick 35% chance.
- Hollow Child arc: Give back Wilds-2, Keep +1 mana whispers plague, Lys burn sageleaf x2 ends quest, Burn at vault blue flame shard wilds-3 guilt

**Act 3: Omen & Siege**
- Omen at level 45+: Mara bell without ringer, Overlord from thorns or you
- Scout Cunning check: banner same as your cloak pattern older = doppelganger/future you
- Siege triggers level 60+ or powers<100 wildsSpread>40: Horde 8-11 tier5, Overlord boss 4.6x HP 2.15x atk abilities Dark Mend 18% heal, Shadow Nova AoE, Soul Siphon steal
- Endings Board:
  - SEAL: Use 3 shards vault+15 wilds-15 plague-5 economy+10, gain Crown of Sun Vault, clear Act1 memory flags (forget why cried) — Light Keeper
  - CRACK: Let vault crack fully wilds100 vault0 plague0 economy100, city becomes forest with lanterns, gain Wilds Totem, ranger +20% forage — Forest With Streets
  - KEEPER: Wear Crown permanently vault100 watch0 but stuck Crossroads loop, store ghost in localStorage virelia_keepers for next playthrough same name +5 vault start — Keeper
  - EXILE: Fail intentionally, existing exile_town keep skills lose coin

### How to Play New Content

1. New Game → choose class/build
2. Crossroads → check WORLD STATE bars
3. Take courier letter → follow Act1 chain (letter_open → mara/korg → cellar → ledger decision)
4. Free Roam → explore 10 areas, watch costs, risk, find doll, stare vault Day? 
5. Collect debt marker → wait Day10-15 → face Brine at Crossroads
6. Lore Codex unlocks as you explore — aim for 40/40
7. Mix Skills board — learn cross-class 2+ to unlock hybrids
8. Level 45+ omen, 60+ siege, choose ending

### Skills Tiers
- Tier I-VII strength/rarity + Lv rank 1-7 upgrade via Skill Points
- Higher tiers via level-up rewards or Skill Traders

### Saving
- Browser storage. Clear data = loss. Private window = may not persist.

### Admin Tools
- Login `admin#` Password `admin12`
- Can edit saves, give items/skills, search items

### Troubleshooting
- Hard refresh Ctrl+Shift+R
- If port in use: `python -m http.server 8001`
- Must use http://localhost: not file://
- Favicon 404 fixed with data URI

### Files
- `index.html` + `style.css` (side-by-side terminal)
- `game.part1.js` professions/items/equipment/market/crafting
- `game.part2.js` saves/skills/builds/character
- `game.part3.js` companions/party/tavern
- `game.part4.js` missions/side/free roam/destinations/combat base
- `game.part5.js` STORY nodes crossroads/market/etc + quest rendering
- `game.v2.js` consequence engine, mix skills, free roam V2 map, combat twists, world state
- `game.lore.js` 40+ lore codex + unlock hooks
- `game.story.js` 3-act main story 4 endings branching

### Debug
- Console: `v2Sanity()`, `loreSanity()`, `storySanity()`, `vireliaSanityCheck()`
