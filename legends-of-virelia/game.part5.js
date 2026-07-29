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

let questRankFilter = "all";

function renderQuestList() {
  if (!state) {
    questListEl.innerHTML = "";
    return;
  }

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
  }
  if (marketSearchWrapEl) return;

  questListEl.innerHTML = "";

  marketSearchWrapEl = document.createElement("div");
  marketSearchWrapEl.style.display = "flex";
  marketSearchWrapEl.style.flexDirection = "column";
  marketSearchWrapEl.style.gap = "10px";

  const row = document.createElement("div");
  row.className = "row";

  marketSearchInputEl = document.createElement("input");
  marketSearchInputEl.placeholder = "Search items...";
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

  row.appendChild(marketSearchInputEl);
  marketSearchWrapEl.appendChild(row);

  marketSearchResultsEl = document.createElement("div");
  marketSearchResultsEl.style.display = "flex";
  marketSearchResultsEl.style.flexDirection = "column";
  marketSearchResultsEl.style.gap = "10px";
  marketSearchWrapEl.appendChild(marketSearchResultsEl);

  questListEl.appendChild(marketSearchWrapEl);
}

function renderMarketList() {
  if (!state) return;
  normalizeState(state);

  ensureMarketSearchUi();
  if (!marketSearchResultsEl) return;
  marketSearchResultsEl.innerHTML = "";

  const allKeys = marketStockKeys();
  const q = String(marketSearchQuery || "").trim().toLowerCase();
  const keys = q
    ? allKeys.filter((k) => {
      const kk = String(k || "").toLowerCase();
      if (!kk) return false;
      if (kk.includes(q)) return true;
      const label = String(itemLabel(k) || "").toLowerCase();
      return label.includes(q);
    })
    : allKeys;

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

    marketSearchResultsEl.appendChild(item);
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
