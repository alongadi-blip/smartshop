import type { Match, Prediction } from '../types';

// Group stage (90-min only)
export function calculateMatchPoints(match: Match, prediction: Prediction): number {
  if (match.home_score === undefined || match.away_score === undefined) return 0;
  const { home_score: ah, away_score: aa } = match;
  const { predicted_home_score: ph, predicted_away_score: pa } = prediction;
  if (ph === ah && pa === aa) return 3;
  if (Math.sign(ah - aa) === Math.sign(ph - pa)) return 1;
  return 0;
}

// Knockout: returns points for each segment separately
export function calculateKnockoutPoints(
  match: Match,
  pred: Prediction
): { base: number; et: number; penalty: number } {
  const base = calculateMatchPoints(match, pred);

  if (!match.went_to_et) return { base, et: 0, penalty: 0 };

  // Extra-time scoring
  let et = 0;
  const aeH = match.et_home_score;
  const aeA = match.et_away_score;
  const peH = pred.predicted_et_home_score;
  const peA = pred.predicted_et_away_score;

  if (aeH !== undefined && aeH !== null && aeA !== undefined && aeA !== null &&
      peH !== undefined && peH !== null && peA !== undefined && peA !== null) {
    if (peH === aeH && peA === aeA) {
      // 2pts if the ET ended in a draw (then went to penalties), 3pts if decisive
      et = (aeH === aeA) ? 2 : 3;
    }
  }

  if (!match.penalty_winner) return { base, et, penalty: 0 };

  const penalty = pred.predicted_penalty_winner === match.penalty_winner ? 1 : 0;
  return { base, et, penalty };
}

export function isMatchLocked(matchTime: string): boolean {
  const kickoff = new Date(matchTime);
  const lockTime = new Date(kickoff.getTime() - 5 * 60 * 1000);
  return new Date() >= lockTime;
}

export function isTournamentStarted(matches: Match[]): boolean {
  if (matches.length === 0) return false;
  const first = matches.reduce((a, b) =>
    new Date(a.match_time) < new Date(b.match_time) ? a : b
  );
  const lockTime = new Date(new Date(first.match_time).getTime() - 5 * 60 * 1000);
  return new Date() >= lockTime;
}

export function isOutrightLocked(matches: Match[]): boolean {
  const knockoutMatches = matches.filter(m => m.stage !== 'group');
  if (knockoutMatches.length === 0) return false;
  const firstKnockout = knockoutMatches.reduce((a, b) =>
    new Date(a.match_time) < new Date(b.match_time) ? a : b
  );
  const lockTime = new Date(new Date(firstKnockout.match_time).getTime() - 5 * 60 * 1000);
  return new Date() >= lockTime;
}

export function isKnockoutStage(stage: Match['stage']): boolean {
  return stage !== 'group';
}

export const STAGE_HE: Record<string, string> = {
  group: 'שלב הבתים',
  round_of_32: 'סיבוב 32',
  round_of_16: 'שמינית גמר',
  quarter_final: 'רבע גמר',
  semi_final: 'חצי גמר',
  third_place: 'מקום שלישי',
  final: 'גמר',
};
