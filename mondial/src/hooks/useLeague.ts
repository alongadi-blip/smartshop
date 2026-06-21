import { supabase } from '../lib/supabase';
import { useLeagueContext } from '../contexts/LeagueContext';
import { useAuth } from './useAuth';
import type { League, LeagueMember } from '../types';

export function useLeague() {
  const { profile } = useAuth();
  const ctx = useLeagueContext();

  async function joinLeague(code: string): Promise<{ league: League | null; error: string | null }> {
    if (!profile?.id) return { league: null, error: 'לא מחובר' };

    const { data: league, error: findErr } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', code.trim().toLowerCase())
      .single();

    if (findErr || !league) return { league: null, error: 'קוד הזמנה לא נמצא' };

    const { error: joinErr } = await supabase
      .from('league_members')
      .insert({ league_id: league.id, user_id: profile.id });

    if (joinErr) {
      if (joinErr.code === '23505') return { league, error: 'כבר חבר בליגה זו' };
      return { league: null, error: joinErr.message };
    }

    await ctx.refreshLeagues();
    ctx.setSelectedLeague(league);
    return { league, error: null };
  }

  async function createLeague(name: string): Promise<{ league: League | null; error: string | null }> {
    if (!profile?.id) return { league: null, error: 'לא מחובר' };

    const trimmed = name.trim();
    const { data: existing } = await supabase
      .from('leagues')
      .select('id')
      .ilike('name', trimmed)
      .limit(1)
      .single();
    if (existing) return { league: null, error: `ליגה בשם "${trimmed}" כבר קיימת` };

    const { data: league, error } = await supabase
      .from('leagues')
      .insert({ name: trimmed, created_by: profile.id })
      .select()
      .single();

    if (error) return { league: null, error: error.message };

    await ctx.refreshLeagues();
    ctx.setSelectedLeague(league);
    return { league, error: null };
  }

  async function fetchLeagueMembers(leagueId: string): Promise<LeagueMember[]> {
    const { data } = await supabase
      .from('league_members')
      .select('*, profiles(display_name, avatar_url)')
      .eq('league_id', leagueId)
      .order('joined_at', { ascending: true });
    return (data ?? []) as LeagueMember[];
  }

  async function fetchLeagueByCode(code: string): Promise<League | null> {
    const { data } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', code.trim().toLowerCase())
      .single();
    return data ?? null;
  }

  return {
    ...ctx,
    joinLeague,
    createLeague,
    fetchLeagueMembers,
    fetchLeagueByCode,
  };
}
