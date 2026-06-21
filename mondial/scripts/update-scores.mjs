// Automated score updater — GitHub Actions, every 4 hours
// Data source: ESPN public API (no auth required)
// Strategy: fetch all WC 2026 fixtures in one call, match to DB by team pair (order-independent).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbPatch(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${table}/${id} → ${res.status}: ${await res.text()}`);
}

async function sbInsert(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`INSERT ${table} → ${res.status}: ${await res.text()}`);
}

// ESPN team name → our DB team name
const ESPN_TO_DB = {
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Congo DR': 'DR Congo',
  'Curaçao': 'Curacao',
  'Türkiye': 'Turkey',
};
function norm(name) { return ESPN_TO_DB[name] ?? name; }

// ESPN status string → our DB status
function toStatus(espnName) {
  if (['STATUS_FULL_TIME', 'STATUS_FINAL_AET', 'STATUS_FINAL_PEN', 'STATUS_FULL_PEN'].includes(espnName)) return 'finished';
  if (['STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_EXTRA_TIME', 'STATUS_SHOOTOUT'].includes(espnName)) return 'live';
  return 'scheduled';
}

// ESPN season slug → our DB stage enum (WC 2026 has Round of 32 first)
const SLUG_TO_STAGE = {
  'group-stage':    'group',
  'round-of-32':   'round_of_32',
  'round-of-16':   'round_of_16',
  'quarterfinals':  'quarter_final',
  'semifinals':     'semi_final',
  'third-place':    'third_place',
  'final':          'final',
};

// Placeholder patterns — teams not yet determined
const TBD_PATTERN = /Winner|Place|Loser|Runner|Group [A-L] |Round of|Quarterfinal|Semifinal/;

// Group stage scoring (90-min only)
function calcPoints(hs, as_, ph, pa) {
  if (ph === hs && pa === as_) return 3;
  if (Math.sign(hs - as_) === Math.sign(ph - pa)) return 1;
  return 0;
}

// Knockout ET scoring
function calcEtPoints(etH, etA, predEtH, predEtA) {
  if (predEtH === undefined || predEtH === null || predEtA === undefined || predEtA === null) return 0;
  if (predEtH === etH && predEtA === etA) {
    // 2pts if ET draw (went to penalties), 3pts if decisive in ET
    return (etH === etA) ? 2 : 3;
  }
  return 0;
}

// Penalty scoring
function calcPenPoints(penWinner, predPenWinner) {
  if (!penWinner || !predPenWinner) return 0;
  return penWinner === predPenWinner ? 1 : 0;
}

// Extract 90-min score from ESPN linescores
// ESPN provides period data: P1 (0-45), P2 (45-90), P3 (ET1), P4 (ET2)
// Periods are per-competitor: homeTeam.linescores, awayTeam.linescores
function get90minScore(homeComp, awayComp) {
  const hLines = homeComp.linescores ?? [];
  const aLines = awayComp.linescores ?? [];
  // Sum periods 1 and 2 only
  const hReg = hLines.slice(0, 2).reduce((s, p) => s + (parseInt(p.value, 10) || 0), 0);
  const aReg = aLines.slice(0, 2).reduce((s, p) => s + (parseInt(p.value, 10) || 0), 0);
  return { hReg, aReg };
}

async function run() {
  console.log(`[${new Date().toISOString()}] Starting sync...`);

  const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260611-20260730';
  const apiRes = await fetch(espnUrl);
  if (!apiRes.ok) throw new Error(`ESPN API error: ${apiRes.status}`);
  const apiData = await apiRes.json();
  const events = apiData.events ?? [];
  console.log(`Fetched ${events.length} events from ESPN`);

  if (events.length === 0) { console.log('No events returned. Done.'); return; }

  // Load all DB matches
  const dbMatches = await sbGet('matches?select=id,home_team,away_team,status,home_score,away_score,stage,went_to_et,et_home_score,et_away_score,penalty_winner');
  const dbByPair = new Map(
    dbMatches.map(m => [[m.home_team, m.away_team].sort().join('|||'), m])
  );
  console.log(`Loaded ${dbMatches.length} matches from DB`);

  let newCount = 0, updatedCount = 0, pointsCount = 0;

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp) continue;

    const homeComp = comp.competitors.find(c => c.homeAway === 'home');
    const awayComp = comp.competitors.find(c => c.homeAway === 'away');
    if (!homeComp || !awayComp) continue;

    const espnHome = homeComp.team.displayName;
    const espnAway = awayComp.team.displayName;

    if (TBD_PATTERN.test(espnHome) || TBD_PATTERN.test(espnAway)) continue;

    const dbHome = norm(espnHome);
    const dbAway = norm(espnAway);
    const newStatus = toStatus(comp.status.type.name);
    const espnStatusName = comp.status.type.name;

    const hasScore = newStatus !== 'scheduled';

    const pairKey = [dbHome, dbAway].sort().join('|||');
    const existing = dbByPair.get(pairKey);
    const isKnockout = existing?.stage !== 'group' || SLUG_TO_STAGE[event.season?.slug ?? ''] !== 'group';

    if (!existing) {
      // New knockout match — insert
      const slug = event.season?.slug ?? '';
      const stage = SLUG_TO_STAGE[slug] ?? 'round_of_32';
      try {
        await sbInsert('matches', {
          home_team: dbHome,
          away_team: dbAway,
          stage,
          match_time: event.date,
          home_score: hasScore ? parseInt(homeComp.score, 10) : null,
          away_score: hasScore ? parseInt(awayComp.score, 10) : null,
          status: newStatus,
          updated_at: new Date().toISOString(),
        });
        newCount++;
        console.log(`  + [${stage}] ${dbHome} vs ${dbAway}`);
      } catch (e) {
        console.error(`  ✗ Insert failed for ${dbHome} vs ${dbAway}: ${e.message}`);
      }
      continue;
    }

    const isReversed = existing.home_team !== dbHome;

    // Determine scores based on match situation
    let homeScore, awayScore, wentToEt = false, etHomeScore = null, etAwayScore = null, penWinner = null;

    if (!hasScore) {
      // Scheduled — skip score update
      if (existing.status === newStatus) continue;
      homeScore = existing.home_score;
      awayScore = existing.away_score;
    } else if (isKnockout && (espnStatusName === 'STATUS_FINAL_AET' || espnStatusName === 'STATUS_FINAL_PEN')) {
      // Knockout match that went to ET
      wentToEt = true;

      // Try to get 90-min score from linescores
      const { hReg, aReg } = get90minScore(homeComp, awayComp);
      const espnFinalH = parseInt(homeComp.score, 10);
      const espnFinalA = parseInt(awayComp.score, 10);

      // ESPN final score = score after ET (or after pens which doesn't change goal tally)
      const finalEtH = isReversed ? espnFinalA : espnFinalH;
      const finalEtA = isReversed ? espnFinalH : espnFinalA;
      etHomeScore = finalEtH;
      etAwayScore = finalEtA;

      // If linescores available, use 90min; otherwise assume the ET total is the final score after ET
      if (homeComp.linescores?.length >= 2) {
        homeScore = isReversed ? aReg : hReg;
        awayScore = isReversed ? hReg : aReg;
      } else {
        // Fallback: use ESPN's final score as 90min (will be corrected if linescores not available)
        homeScore = finalEtH;
        awayScore = finalEtA;
      }

      // Penalty winner: find winner flag on competitors
      if (espnStatusName === 'STATUS_FINAL_PEN') {
        const winner = comp.competitors.find(c => c.winner === true);
        if (winner) {
          penWinner = norm(winner.team.displayName);
        }
      }
    } else {
      // Regular finish or live match
      const espnHomeScore = parseInt(homeComp.score, 10);
      const espnAwayScore = parseInt(awayComp.score, 10);
      homeScore = isReversed ? espnAwayScore : espnHomeScore;
      awayScore = isReversed ? espnHomeScore : espnAwayScore;
    }

    const scoreChanged = homeScore !== existing.home_score || awayScore !== existing.away_score;
    const statusChanged = newStatus !== existing.status;
    const etChanged = wentToEt !== existing.went_to_et || etHomeScore !== existing.et_home_score || etAwayScore !== existing.et_away_score;
    const penChanged = penWinner !== existing.penalty_winner;

    if (!scoreChanged && !statusChanged && !etChanged && !penChanged) continue;

    try {
      const updateBody = {
        home_score: homeScore,
        away_score: awayScore,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (isKnockout) {
        updateBody.went_to_et = wentToEt;
        updateBody.et_home_score = etHomeScore;
        updateBody.et_away_score = etAwayScore;
        updateBody.penalty_winner = penWinner;
      }
      await sbPatch('matches', existing.id, updateBody);
      updatedCount++;
      console.log(`  ✓ ${existing.home_team} ${homeScore ?? '?'}–${awayScore ?? '?'} ${existing.away_team} [${newStatus}]${wentToEt ? ` AET ${etHomeScore}-${etAwayScore}` : ''}${penWinner ? ` PEN:${penWinner}` : ''}`);
    } catch (e) {
      console.error(`  ✗ Update failed for ${existing.home_team} vs ${existing.away_team}: ${e.message}`);
      continue;
    }

    // Calculate points when match just finished
    if (newStatus === 'finished' && existing.status !== 'finished' && homeScore !== null && awayScore !== null) {
      try {
        const preds = await sbGet(`predictions?match_id=eq.${existing.id}&select=id,predicted_home_score,predicted_away_score,predicted_et_home_score,predicted_et_away_score,predicted_penalty_winner,league_id`);
        for (const pred of preds) {
          const pts = calcPoints(homeScore, awayScore, pred.predicted_home_score, pred.predicted_away_score);
          const updatePred = { points_earned: pts };

          if (isKnockout && wentToEt && etHomeScore !== null && etAwayScore !== null) {
            updatePred.et_points_earned = calcEtPoints(etHomeScore, etAwayScore, pred.predicted_et_home_score, pred.predicted_et_away_score);
          }

          if (isKnockout && penWinner) {
            updatePred.penalty_points_earned = calcPenPoints(penWinner, pred.predicted_penalty_winner);
          }

          await sbPatch('predictions', pred.id, updatePred);
          pointsCount++;
        }
        if (preds.length > 0) console.log(`    → scored ${preds.length} predictions`);
      } catch (e) {
        console.error(`    ✗ Points calc failed: ${e.message}`);
      }
    }
  }

  console.log(`\nDone. ${newCount} new matches added, ${updatedCount} scores updated, ${pointsCount} predictions scored.`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
