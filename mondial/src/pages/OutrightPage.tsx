import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useMatches } from '../hooks/useMatches';
import { isTournamentStarted } from '../utils/scoring';
import type { Player, OutrightPrediction } from '../types';

export default function OutrightPage() {
  const { profile } = useAuth();
  const { matches } = useMatches();
  const [teams, setTeams] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [outright, setOutright] = useState<Partial<OutrightPrediction>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const locked = isTournamentStarted(matches);

  useEffect(() => {
    // Load unique teams from matches
    supabase.from('matches').select('home_team, away_team').then(({ data }) => {
      const all = new Set<string>();
      (data ?? []).forEach((m) => { all.add(m.home_team); all.add(m.away_team); });
      setTeams([...all].sort());
    });

    // Load players
    supabase.from('players').select('*').order('goals', { ascending: false }).then(({ data }) => {
      setPlayers(data ?? []);
    });

    // Load existing outright prediction
    if (profile?.id) {
      supabase.from('outright_predictions').select('*').eq('user_id', profile.id).single()
        .then(({ data }) => { if (data) setOutright(data); });
    }
  }, [profile?.id]);

  async function handleSave() {
    if (!profile?.id || locked) return;
    setSaving(true);
    await supabase.from('outright_predictions').upsert({
      user_id: profile.id,
      predicted_winner_team: outright.predicted_winner_team,
      predicted_top_scorer_id: outright.predicted_top_scorer_id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Tournament Predictions</h1>
      <p className="text-sm text-gray-500 mb-6">
        {locked
          ? 'Locked — tournament has started.'
          : 'These lock permanently when the first match kicks off. +10 pts each if correct.'}
      </p>

      <div className="space-y-4">
        {/* Winner */}
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🏆 World Cup Winner
          </label>
          <select
            disabled={locked}
            value={outright.predicted_winner_team ?? ''}
            onChange={(e) => setOutright((o) => ({ ...o, predicted_winner_team: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">Select a team…</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Top Scorer */}
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            👟 Golden Boot (Top Scorer)
          </label>
          <select
            disabled={locked}
            value={outright.predicted_top_scorer_id ?? ''}
            onChange={(e) => setOutright((o) => ({ ...o, predicted_top_scorer_id: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">Select a player…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.team})</option>
            ))}
          </select>
          {players.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">Players will appear once the squad data is synced.</p>
          )}
        </div>

        {!locked && (
          <button
            onClick={handleSave}
            disabled={saving || (!outright.predicted_winner_team && !outright.predicted_top_scorer_id)}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold rounded-xl py-3 transition"
          >
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Tournament Picks'}
          </button>
        )}
      </div>
    </div>
  );
}
