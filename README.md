# Legends of Virelia — Text-Only Browser RPG

**One-sentence:** A browser-based, pure-text RPG where every choice has a consequence and the city remembers.

**Run:**
```bash
python -m http.server 8000
# open http://localhost:8000
```

**Core:** Text-only, no build, 100% client-side. Consequence Engine, 40+ Lore Codex, 3-Act story with 4 endings, 10 free-roam regions, 8 hybrid mix-skills, 600 missions/side, 300 mobs, bosses up to Lv900.

**Themes:** Text Mode (Mono), Colorful RPG (Vibrant), Parchment (Light) — switch in Settings.

**Saves:** LocalStorage. Admin login `admin#` / `admin12`.

**Files:** `index.html` + `style.css` + `game.*.js` (modular). `game.js` is combined build.

**Quick Features:**
- Side-by-side panels (280px | 1fr | 340px), sticky, no scroll hell
- FX: hit flash, bleeding pulse, rested glow, cursed scanline, etc.
- World State: sunVault%, guild/crown/rebel/wilds power, economy, watchHeat, plague
- Mix Skills: Shadowsteel, Arcane Warden, Plague Doctor, Soul Weaver, etc.
- Free Roam: 10 areas + 8 boss/mini-boss lairs (Lv70-900) with costs, discovery
- Combat twists: surrender, reinforcements, darkness
- Effects: 34 with visuals, 17 permanent debuffs with cures (Healer, Alchemist, Enchanter)
- Shop Board: Rank filter (Common→Legendary→Curio) + search, title switches Quest↔Shop
- Level caps: Player 700, Admin 999, mobs scale to 700, spells locked till level req
- Skills: 700 per combo, rank up to 15, tier filter 1-7 in player & admin panels

<details><summary>Full Changelog (V2+)</summary>

See `FEATURES.md` for full 160-line V2 changelog.

Main: Consequence Board, Mix Skills, 9 new items (Crown of Thorns, Debt Marker, Letter to Self, Doll, Shard...), Living NPCs (Mara, Korg, Lys, Vael...), 10+8 boss lairs, siege Lv60 horde (Lv60/80) + overlord Lv90/100 legendary, exile new town with all new content, old town hostile with permanent bleeding at 1HP + 2M gold forgiveness, 3 random town attacks, level-gated content.

</details>

**Debug:** `vireliaSanityCheck()`, `v2Sanity()`, `loreSanity()`, `storySanity()` in console.

**License:** Personal project, work in progress.
