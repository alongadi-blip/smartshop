// API-Football via RapidAPI
// Get your key at: https://rapidapi.com/api-sports/api/api-football
const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';
const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY;

// FIFA World Cup 2026 — league ID (update once confirmed on API-Football)
// For testing: use league 1 (World Cup) season 2026
export const WC_LEAGUE_ID = 1;
export const WC_SEASON = 2026;

async function apiFetch(endpoint: string) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
      'x-rapidapi-key': API_KEY,
    },
  });
  if (!res.ok) throw new Error(`API-Football error: ${res.status}`);
  return res.json();
}

export async function fetchGroupStageMatches() {
  const data = await apiFetch(
    `/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}&round=Group Stage`
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
