// API-Football via api-sports.io (direct, not RapidAPI)
// Docs: https://www.api-football.com/documentation-v3
const BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = import.meta.env.VITE_APISPORTS_KEY;

export const WC_LEAGUE_ID = 1;
export const WC_SEASON = 2026;

async function apiFetch(endpoint: string) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'x-apisports-key': API_KEY,
    },
  });
  if (!res.ok) throw new Error(`API-Football error: ${res.status}`);
  return res.json();
}

export async function fetchGroupStageMatches() {
  const data = await apiFetch(
    `/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`
  );
  return data.response;
}

export async function fetchMatchResult(fixtureId: string) {
  const data = await apiFetch(`/fixtures?id=${fixtureId}`);
  return data.response[0];
}

export async function fetchTopScorers() {
  const data = await apiFetch(
    `/players/topscorers?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`
  );
  return data.response;
}

export async function fetchTeams() {
  const data = await apiFetch(
    `/teams?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`
  );
  return data.response;
}
