// Automated score updater + new-match syncer — GitHub Actions, every 4 hours
// Strategy: one API call per run (all fixtures) instead of N individual calls.
// Group stage matches already in DB → update score/status only.
// Knockout stage matches not yet in DB → insert automatically.

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

async function sbInsert(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`INSERT ${table} → ${res.status}: ${await res.text()}`);
}

const STATUS_MAP = {
  'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
  '1H': 'live', 'HT': 'live', '2H': 'live', 'ET': 'live', 'P': 'live',
  'NS': 'scheduled', 'TBD': 'scheduled',
  'PST': 'postponed', 'CANC': 'postponed',
};

// Maps api-sports league.round strings → our stage enum
const ROUND_TO_STAGE = {
  'Round of 16': 'round_of_16',
  'Quarter-finals': 'quarter_final',
  'Semi-finals': 'semi_final',
  '3rd Place For 3rd Place': 'third_place',
  'Final': 'final',
};

function calcPoints(hs, as_, ph, pa) {
  if (ph === hs && pa === as_) return 3;
  if (Math.sign(hs - as_) === Math.sign(ph - pa)) return 1;
  return 0;
}

async function run() {
  console.log(`[${new Date().toISOString()}] Starting sync...`);

  // 1 API request for the entire run
  const apiRes = await fetch(
    'https://v3.football.api-sports.io/fixtures?league=1&season=2026',
    { headers: { 'x-apisports-key': APISPORTS_KEY } }
  );
  const apiData = await apiRes.json();
  const fixtures = apiData.response ?? [];
  console.log(`Fetched ${fixtures.length} fixtures from API`);

  if (fixtures.length === 0) { console.log('No fixtures returned. Done.'); return; }

  // Load all current DB matches keyed by api_match_id
  const dbMatches = await sbGet('matches?select=id,api_match_id,status,home_score,away_score');
  const dbMap = new Map(dbMatches.map(m => [m.api_match_id, m]));

  let newMatches = 0, updatedMatches = 0, pointsCalculated = 0;

  for (const fixture of fixtures) {
    const { fixture: f, teams, goals, league } = fixture;
    const apiId = String(f.id);
    const newStatus = STATUS_MAP[f.status?.short] ?? 'scheduled';
    const homeScore = goals.home;
    const awayScore = goals.away;

    const existing = dbMap.get(apiId);

    if (!existing) {
      // New match — knockout stage (group stage was pre-seeded)
      const stage = ROUND_TO_STAGE[league.round] ?? 'group';
      try {
        await sbInsert('matches', {
          api_match_id: apiId,
          home_team: teams.home.name,
          away_team: teams.away.name,
          home_team_flag: teams.home.logo,
          away_team_flag: teams.away.logo,
          group_name: league.round,
          stage,
          match_time: f.date,
          home_score: homeScore,
          away_score: awayScore,
          status: newStatus,
          updated_at: new Date().toISOString(),
        });
        newMatches++;
        console.log(`  + ${league.round}: ${teams.home.name} vs ${teams.away.name}`);
      } catch (e) {
        console.error(`  ✗ Insert failed: ${e.message}`);
      }
      continue;
    }

    // Existing match — only update if score/status changed
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
      updatedMatches++;
      console.log(`  ✓ ${teams.home.name} ${homeScore ?? '?'}-${awayScore ?? '?'} ${teams.away.name} [${newStatus}]`);
    } catch (e) {
      console.error(`  ✗ Update failed: ${e.message}`);
      continue;
    }

    // Calculate points for matches that just finished
    if (newStatus === 'finished' && existing.status !== 'finished' && homeScore !== null && awayScore !== null) {
      try {
        const preds = await sbGet(`predictions?match_id=eq.${existing.id}&select=id,predicted_home_score,predicted_away_score`);
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

  console.log(`\nDone. ${newMatches} new matches added, ${updatedMatches} scores updated, ${pointsCalculated} predictions scored.`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
