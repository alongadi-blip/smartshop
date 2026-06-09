// Supabase Edge Function — triggered manually or via pg_cron
// Deploy: supabase functions deploy calculate-scores
// Schedule via Supabase Dashboard → Database → Extensions → pg_cron:
//   SELECT cron.schedule('score-calc', '*/5 * * * *', $$
//     SELECT net.http_post('https://<PROJECT_REF>.supabase.co/functions/v1/calculate-scores',
//       '{}', 'application/json',
//       '{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}');
//   $$);

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async () => {
  // Fetch all finished matches with no NULL scores
  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'finished')
    .not('home_score', 'is', null);

  if (mErr) return new Response(mErr.message, { status: 500 });

  const { data: config } = await supabase.from('scoring_config').select('*');
  const score = (key: string) => config?.find((c: any) => c.key === key)?.value ?? 0;

  let updated = 0;

  for (const match of matches ?? []) {
    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', match.id)
      .is('points_earned', null);

    for (const pred of predictions ?? []) {
      const ah = match.home_score, aa = match.away_score;
      const ph = pred.predicted_home_score, pa = pred.predicted_away_score;

      let points = score('wrong_prediction');
      if (ph === ah && pa === aa) {
        points = score('exact_score');
      } else if (Math.sign(ph - pa) === Math.sign(ah - aa)) {
        points = score('correct_outcome');
      }

      await supabase
        .from('predictions')
        .update({ points_earned: points, updated_at: new Date().toISOString() })
        .eq('id', pred.id);

      updated++;
    }
  }

  return new Response(JSON.stringify({ ok: true, updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
