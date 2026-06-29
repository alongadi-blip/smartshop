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
    // league_members.user_id references auth.users, not public.profiles, so
    // PostgREST can't embed profiles directly — fetch and merge manually.
    const { data: members } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', leagueId)
      .order('joined_at', { ascending: true });
    if (!members || members.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', members.map(m => m.user_id));
    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    return members.map(m => ({ ...m, profiles: profileMap.get(m.user_id) })) as LeagueMember[];
  }

  async function leaveLeague(leagueId: string): Promise<{ error: string | null }> {
    if (!profile?.id) return { error: 'לא מחובר' };

    const { error } = await supabase
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', profile.id);

    if (error) return { error: error.message };

    if (ctx.selectedLeague?.id === leagueId) ctx.setSelectedLeague(null);
    await ctx.refreshLeagues();
    return { error: null };
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
    leaveLeague,
    fetchLeagueMembers,
    fetchLeagueByCode,
  };
}
