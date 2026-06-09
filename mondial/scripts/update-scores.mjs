// Automated score updater — runs via GitHub Actions every 4 hours
// Fetches results from api-sports.io, updates Supabase, calculates points

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APISPORTS_KEY = process.env.APISPORTS_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !APISPORTS_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, APISPORTS_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const STATUS_MAP = {
  'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
  '1H': 'live', 'HT': 'live', '2H': 'live', 'ET': 'live', 'P': 'live',
  'NS': 'scheduled', 'TBD': 'scheduled',
  'PST': 'postponed', 'CANC': 'postponed',
};

function calcPoints(homeScore, awayScore, predHome, predAway) {
  if (predHome === homeScore && predAway === awayScore) return 3;
  if (Math.sign(homeScore - awayScore) === Math.sign(predHome - predAway)) return 1;
  return 0;
}

async function fetchFixture(apiMatchId) {
  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?id=${apiMatchId}`,
    { headers: { 'x-apisports-key': APISPORTS_KEY } }
  );
  const data = await res.json();
  return data.response?.[0] ?? null;
}

async function run() {
  console.log(`[${new Date().toISOString()}] Starting score update...`);

  // Get all non-finished WC matches
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team')
    .neq('status', 'finished')
    .not('api_match_id', 'like', 'manual-%');

  if (error) { console.error('Failed to fetch matches:', error); process.exit(1); }

  console.log(`Found ${matches.length} non-finished matches to check`);

  let matchesUpdated = 0;
  let pointsCalculated = 0;

  for (const match of matches) {
    const fixture = await fetchFixture(match.api_match_id);
    if (!fixture) { console.log(`  No data for ${match.api_match_id}`); continue; }

    const newStatus = STATUS_MAP[fixture.fixture.status?.short];
    if (!newStatus) continue;

    const homeScore = fixture.goals.home;
    const awayScore = fixture.goals.away;

    // Update match
    const { error: matchErr } = await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', match.id);

    if (matchErr) { console.error(`  Failed to update match ${match.id}:`, matchErr); continue; }

    matchesUpdated++;
    console.log(`  ${match.home_team} ${homeScore ?? '?'}-${awayScore ?? '?'} ${match.away_team} [${newStatus}]`);

    // Calculate points for finished matches
    if (newStatus === 'finished' && homeScore !== null && awayScore !== null) {
      const { data: preds } = await supabase
        .from('predictions')
        .select('id, predicted_home_score, predicted_away_score')
        .eq('match_id', match.id);

      for (const pred of preds ?? []) {
        const pts = calcPoints(homeScore, awayScore, pred.predicted_home_score, pred.predicted_away_score);
        await supabase.from('predictions').update({ points_earned: pts }).eq('id', pred.id);
        pointsCalculated++;
      }
    }
  }

  console.log(`Done. Updated ${matchesUpdated} matches, calculated points for ${pointsCalculated} predictions.`);
}

run().catch(err => { console.error('Fatal error:', err); process.exit(1); });
