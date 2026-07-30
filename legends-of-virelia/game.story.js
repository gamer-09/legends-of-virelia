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
