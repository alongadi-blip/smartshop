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

// ESPN season slug → our DB stage enum
const SLUG_TO_STAGE = {
  'group-stage': 'group',
  'round-of-32': 'round_of_16',
  'round-of-16': 'quarter_final',
  'quarterfinals': 'quarter_final',
  'semifinals': 'semi_final',
  'third-place': 'third_place',
  'final': 'final',
};

// Placeholder patterns — teams not yet determined
const TBD_PATTERN = /Winner|Place|Loser|Runner|Group [A-L] |Round of|Quarterfinal|Semifinal/;

function calcPoints(hs, as_, ph, pa) {
  if (ph === hs && pa === as_) return 3;
  if (Math.sign(hs - as_) === Math.sign(ph - pa)) return 1;
  return 0;
}

async function run() {
  console.log(`[${new Date().toISOString()}] Starting sync...`);

  // One API call: all WC 2026 matches
  const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260611-20260720';
  const apiRes = await fetch(espnUrl);
  if (!apiRes.ok) throw new Error(`ESPN API error: ${apiRes.status}`);
  const apiData = await apiRes.json();
  const events = apiData.events ?? [];
  console.log(`Fetched ${events.length} events from ESPN`);

  if (events.length === 0) { console.log('No events returned. Done.'); return; }

  // Load all DB matches
  const dbMatches = await sbGet('matches?select=id,home_team,away_team,status,home_score,away_score,stage');
  // Key: sorted team names joined — order-independent lookup
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

    // Skip TBD knockout matches
    if (TBD_PATTERN.test(espnHome) || TBD_PATTERN.test(espnAway)) continue;

    const dbHome = norm(espnHome);
    const dbAway = norm(espnAway);
    const newStatus = toStatus(comp.status.type.name);

    // Scores only meaningful when live/finished (scheduled shows 0-0 in ESPN)
    const hasScore = newStatus !== 'scheduled';
    const espnHomeScore = hasScore ? parseInt(homeComp.score, 10) : null;
    const espnAwayScore = hasScore ? parseInt(awayComp.score, 10) : null;

    // Order-independent lookup
    const pairKey = [dbHome, dbAway].sort().join('|||');
    const existing = dbByPair.get(pairKey);

    if (!existing) {
      // New knockout match — insert
      const slug = event.season?.slug ?? '';
      const stage = SLUG_TO_STAGE[slug] ?? 'round_of_16';
      try {
        await sbInsert('matches', {
          home_team: dbHome,
          away_team: dbAway,
          stage,
          match_time: event.date,
          home_score: espnHomeScore,
          away_score: espnAwayScore,
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

    // Determine correct score orientation relative to the DB record
    // ESPN home team might differ from DB home team
    const isReversed = existing.home_team !== dbHome;
    const homeScore = isReversed ? espnAwayScore : espnHomeScore;
    const awayScore = isReversed ? espnHomeScore : espnAwayScore;

    const scoreChanged = homeScore !== existing.home_score || awayScore !== existing.away_score;
    const statusChanged = newStatus !== existing.status;
    if (!scoreChanged && !statusChanged) continue;

    try {
      await sbPatch('matches', existing.id, {
        home_score: homeScore,
        away_score: awayScore,
        status: newStatus,
        updated_at: new Date().toISOString(),
      });
      updatedCount++;
      console.log(`  ✓ ${existing.home_team} ${homeScore ?? '?'}–${awayScore ?? '?'} ${existing.away_team} [${newStatus}]`);
    } catch (e) {
      console.error(`  ✗ Update failed for ${existing.home_team} vs ${existing.away_team}: ${e.message}`);
      continue;
    }

    // Calculate points when match just finished
    if (newStatus === 'finished' && existing.status !== 'finished' && homeScore !== null && awayScore !== null) {
      try {
        const preds = await sbGet(`predictions?match_id=eq.${existing.id}&select=id,predicted_home_score,predicted_away_score`);
        for (const pred of preds) {
          const pts = calcPoints(homeScore, awayScore, pred.predicted_home_score, pred.predicted_away_score);
          await sbPatch('predictions', pred.id, { points_earned: pts });
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
