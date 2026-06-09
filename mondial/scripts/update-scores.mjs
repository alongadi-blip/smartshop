// Automated score updater — GitHub Actions, every 4 hours

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APISPORTS_KEY = process.env.APISPORTS_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !APISPORTS_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, APISPORTS_KEY');
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

const STATUS_MAP = {
  'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
  '1H': 'live', 'HT': 'live', '2H': 'live', 'ET': 'live', 'P': 'live',
  'NS': 'scheduled', 'TBD': 'scheduled',
  'PST': 'postponed', 'CANC': 'postponed',
};

function calcPoints(hs, as_, ph, pa) {
  if (ph === hs && pa === as_) return 3;
  if (Math.sign(hs - as_) === Math.sign(ph - pa)) return 1;
  return 0;
}

async function run() {
  console.log(`[${new Date().toISOString()}] Starting score update...`);

  // Fetch all non-finished matches, filter manual ones in JS
  const matches = await sbGet('matches?status=neq.finished&select=id,api_match_id,home_team,away_team');
  const toCheck = matches.filter(m => !m.api_match_id.startsWith('manual-'));

  console.log(`Checking ${toCheck.length} matches`);

  let matchesUpdated = 0, pointsCalculated = 0;

  for (const match of toCheck) {
    let fixture;
    try {
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?id=${match.api_match_id}`,
        { headers: { 'x-apisports-key': APISPORTS_KEY } }
      );
      const data = await res.json();
      fixture = data.response?.[0];
    } catch (e) {
      console.log(`  Skip ${match.api_match_id}: ${e.message}`);
      continue;
    }

    if (!fixture) continue;

    const newStatus = STATUS_MAP[fixture.fixture.status?.short];
    if (!newStatus || newStatus === 'scheduled') continue;

    const homeScore = fixture.goals.home;
    const awayScore = fixture.goals.away;

    try {
      await sbPatch('matches', match.id, {
        home_score: homeScore,
        away_score: awayScore,
        status: newStatus,
        updated_at: new Date().toISOString(),
      });
      matchesUpdated++;
      console.log(`  ✓ ${match.home_team} ${homeScore ?? '?'}-${awayScore ?? '?'} ${match.away_team} [${newStatus}]`);
    } catch (e) {
      console.error(`  ✗ Failed to update match: ${e.message}`);
      continue;
    }

    // Calculate points for finished matches
    if (newStatus === 'finished' && homeScore !== null && awayScore !== null) {
      try {
        const preds = await sbGet(`predictions?match_id=eq.${match.id}&select=id,predicted_home_score,predicted_away_score`);
        for (const pred of preds) {
          const pts = calcPoints(homeScore, awayScore, pred.predicted_home_score, pred.predicted_away_score);
          await sbPatch('predictions', pred.id, { points_earned: pts });
          pointsCalculated++;
        }
        console.log(`    → scored ${preds.length} predictions`);
      } catch (e) {
        console.error(`    ✗ Points calc failed: ${e.message}`);
      }
    }
  }

  console.log(`\nDone. ${matchesUpdated} matches updated, ${pointsCalculated} predictions scored.`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
