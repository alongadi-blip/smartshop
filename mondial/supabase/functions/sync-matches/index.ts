// Supabase Edge Function — syncs group stage matches from API-Football
// Deploy: supabase functions deploy sync-matches
// Run manually: supabase functions invoke sync-matches

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')!;
const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;

async function apiFetch(endpoint: string) {
  const res = await fetch(`https://api-football-v1.p.rapidapi.com/v3${endpoint}`, {
    headers: {
      'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
      'x-rapidapi-key': RAPIDAPI_KEY,
    },
  });
  return res.json();
}

Deno.serve(async () => {
  // Sync group stage fixtures
  const fixturesData = await apiFetch(
    `/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`
  );

  let upserted = 0;

  for (const fixture of fixturesData.response ?? []) {
    const f = fixture.fixture;
    const teams = fixture.teams;
    const goals = fixture.goals;
    const league = fixture.league;

    const statusMap: Record<string, string> = {
      'NS': 'scheduled', 'TBD': 'scheduled',
      '1H': 'live', 'HT': 'live', '2H': 'live', 'ET': 'live', 'P': 'live',
      'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
      'PST': 'postponed', 'CANC': 'postponed',
    };

    const row = {
      api_match_id: String(f.id),
      home_team: teams.home.name,
      away_team: teams.away.name,
      home_team_flag: teams.home.logo,
      away_team_flag: teams.away.logo,
      group_name: league.round,
      stage: league.round?.toLowerCase().includes('group') ? 'group' : 'group',
      match_time: f.date,
      home_score: goals.home,
      away_score: goals.away,
      status: statusMap[f.status?.short] ?? 'scheduled',
      updated_at: new Date().toISOString(),
    };

    await supabase.from('matches').upsert(row, { onConflict: 'api_match_id' });
    upserted++;
  }

  // Sync top scorers into players table
  const scorersData = await apiFetch(
    `/players/topscorers?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`
  );

  for (const item of scorersData.response ?? []) {
    const p = item.player;
    const stats = item.statistics[0];
    await supabase.from('players').upsert({
      api_player_id: String(p.id),
      name: p.name,
      team: stats?.team?.name ?? '',
      photo_url: p.photo,
      goals: stats?.goals?.total ?? 0,
    }, { onConflict: 'api_player_id' });
  }

  return new Response(JSON.stringify({ ok: true, fixtures: upserted }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
