# Legends of Virelia

A browser-based text RPG that runs entirely in the browser.

This is a **static site** (no build step). You just need to serve the folder and open `http://localhost:<port>/`.

## Run locally (recommended)

Opening `index.html` via `file://` may work, but using a local server is more reliable (caching, asset loading, and browser security rules).

### Option A: Python (easy)

1. Open PowerShell in this folder.
2. Run:

   - If you have Python:
     - `python -m http.server 8000`
   - If you use the Python launcher:
     - `py -m http.server 8000`

3. Open:

   - `http://localhost:8000/`

### Option B: Node (no install, via npx)

1. Install Node.js (if you don’t already have it).
2. From this folder, run:

   - `npx http-server -p 8000`

3. Open:

   - `http://localhost:8000/`

### Option C: VS Code “Live Server”

1. Install the VS Code extension **Live Server**.
2. Right-click `index.html` -> **Open with Live Server**.

## How to play

### Starting a run

- **New Game** to create a fresh profile/run.
- **Load** to continue an existing profile.

### Making choices

- The game is choice-driven. Read the prompt and click the option you want.
- The same action can lead to different results depending on stats, skills, items, and random rolls.

### Missions, side quests, and travel

- Use **Crossroads** and location choices to move between hubs.
- Missions/side tasks scale based on your level and difficulty.

### Combat

- Combat is turn-based.
- Use:
  - **Attack** for basic damage.
  - **Skills** for techniques/spells/prayers/tricks/maneuvers.
  - **Items** to heal or restore mana (and other effects).

### Skills (tiers vs levels)

- Each skill has a **Tier** (I–VII) that represents the strength/rarity band.
- When you learn a skill, it also has an upgrade **Lv** (rank) which can be increased using Skill Points.
- Higher-tier versions of the “same” technique are obtained through level-up rewards or Skill Traders.

### Saving

- The game saves to your browser storage (local save). Clearing browser data will remove saves.
- If you play in a private/incognito window, saves may not persist.

## Admin Tools (optional)

There is an in-game admin panel for testing.

- **Login**: `admin#`
- **Password**: `admin12`

## Troubleshooting

### I don’t see the latest changes

- Do a hard refresh:
  - `Ctrl+Shift+R`

### Port already in use

- Use a different port, e.g. `8001`:
  - `python -m http.server 8001`

### It opens but looks broken

- Make sure you opened the site via `http://localhost:...` (server) rather than `file://`.
