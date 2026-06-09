// Automated score updater — runs via GitHub Actions every 4 hours
// Uses native fetch (no supabase-js, no WebSocket dependency)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APISPORTS_KEY = process.env.APISPORTS_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !APISPORTS_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function dbGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers });
  return res.json();
}

async function dbPatch(table, filter, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH', headers, body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`  PATCH ${table} failed:`, err);
  }
}

const STATUS_MAP = {
  'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
  '1H': 'live', 'HT': 'live', '2H': 'live', 'ET': 'live', 'P': 'live',
  'NS': 'scheduled', 'TBD': 'scheduled',
  'PST': 'postponed', 'CANC': 'postponed',
};

function calcPoints(hs, as, ph, pa) {
  if (ph === hs && pa === as) return 3;
  if (Math.sign(hs - as) === Math.sign(ph - pa)) return 1;
  return 0;
}

async function run() {
  console.log(`[${new Date().toISOString()}] Starting score update...`);

  const matches = await dbGet('matches',
    'status=neq.finished&api_match_id=not.like.manual-%&select=id,api_match_id,home_team,away_team,status'
  );

  if (!Array.isArray(matches)) {
    console.error('Failed to fetch matches:', matches);
    process.exit(1);
  }

  console.log(`Checking ${matches.length} non-finished matches`);

  let matchesUpdated = 0, pointsCalculated = 0;

  for (const match of matches) {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?id=${match.api_match_id}`,
      { headers: { 'x-apisports-key': APISPORTS_KEY } }
    );
    const data = await res.json();
    const fixture = data.response?.[0];
    if (!fixture) continue;

    const newStatus = STATUS_MAP[fixture.fixture.status?.short];
    if (!newStatus) continue;

    const homeScore = fixture.goals.home;
    const awayScore = fixture.goals.away;

    await dbPatch('matches', `id=eq.${match.id}`, {
      home_score: homeScore,
      away_score: awayScore,
      status: newStatus,
      updated_at: new Date().toISOString(),
    });
    matchesUpdated++;
    console.log(`  ${match.home_team} ${homeScore ?? '?'}-${awayScore ?? '?'} ${match.away_team} [${newStatus}]`);

    if (newStatus === 'finished' && homeScore !== null && awayScore !== null) {
      const preds = await dbGet('predictions',
        `match_id=eq.${match.id}&select=id,predicted_home_score,predicted_away_score`
      );
      for (const pred of preds ?? []) {
        const pts = calcPoints(homeScore, awayScore, pred.predicted_home_score, pred.predicted_away_score);
        await dbPatch('predictions', `id=eq.${pred.id}`, { points_earned: pts });
        pointsCalculated++;
      }
      console.log(`    → scored ${preds?.length ?? 0} predictions`);
    }
  }

  console.log(`Done. ${matchesUpdated} matches updated, ${pointsCalculated} predictions scored.`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
