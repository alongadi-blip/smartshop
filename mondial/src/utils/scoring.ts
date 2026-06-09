import type { Match, Prediction } from '../types';

export function calculateMatchPoints(match: Match, prediction: Prediction): number {
  if (match.home_score === undefined || match.away_score === undefined) return 0;

  const { home_score: ah, away_score: aa } = match;
  const { predicted_home_score: ph, predicted_away_score: pa } = prediction;

  // Exact score
  if (ph === ah && pa === aa) return 3;

  // Correct outcome (win/draw direction)
  const actualOutcome = Math.sign(ah - aa);
  const predictedOutcome = Math.sign(ph - pa);
  if (actualOutcome === predictedOutcome) return 1;

  return 0;
}

export function isMatchLocked(matchTime: string): boolean {
  const kickoff = new Date(matchTime);
  const lockTime = new Date(kickoff.getTime() - 5 * 60 * 1000); // -5 min
  return new Date() >= lockTime;
}

export function isTournamentStarted(matches: Match[]): boolean {
  if (matches.length === 0) return false;
  const firstMatch = matches.reduce((a, b) =>
    new Date(a.match_time) < new Date(b.match_time) ? a : b
  );
  return new Date() >= new Date(firstMatch.match_time);
}
