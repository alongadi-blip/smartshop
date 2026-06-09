import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hhziivwvwifuukcdwmmz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhoemlpdnd2d2lmdXVrY2R3bW16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTAxOTk2OSwiZXhwIjoyMDk2NTk1OTY5fQ.Pa6Ou49yD1nSU7tuhPYq7M3qN2MT4geiWKxcwnyHMV8'
);

const flags = {
  'Mexico':                 'https://flagcdn.com/w40/mx.png',
  'South Korea':            'https://flagcdn.com/w40/kr.png',
  'South Africa':           'https://flagcdn.com/w40/za.png',
  'Czechia':                'https://flagcdn.com/w40/cz.png',
  'Canada':                 'https://flagcdn.com/w40/ca.png',
  'Switzerland':            'https://flagcdn.com/w40/ch.png',
  'Qatar':                  'https://flagcdn.com/w40/qa.png',
  'Bosnia and Herzegovina': 'https://flagcdn.com/w40/ba.png',
  'Brazil':                 'https://flagcdn.com/w40/br.png',
  'Morocco':                'https://flagcdn.com/w40/ma.png',
  'Scotland':               'https://flagcdn.com/w40/gb-sct.png',
  'Haiti':                  'https://flagcdn.com/w40/ht.png',
  'United States':          'https://flagcdn.com/w40/us.png',
  'Australia':              'https://flagcdn.com/w40/au.png',
  'Paraguay':               'https://flagcdn.com/w40/py.png',
  'Turkey':                 'https://flagcdn.com/w40/tr.png',
  'Germany':                'https://flagcdn.com/w40/de.png',
  'Ecuador':                'https://flagcdn.com/w40/ec.png',
  'Ivory Coast':            'https://flagcdn.com/w40/ci.png',
  'Curacao':                'https://flagcdn.com/w40/cw.png',
  'Netherlands':            'https://flagcdn.com/w40/nl.png',
  'Japan':                  'https://flagcdn.com/w40/jp.png',
  'Tunisia':                'https://flagcdn.com/w40/tn.png',
  'Sweden':                 'https://flagcdn.com/w40/se.png',
  'Belgium':                'https://flagcdn.com/w40/be.png',
  'Iran':                   'https://flagcdn.com/w40/ir.png',
  'Egypt':                  'https://flagcdn.com/w40/eg.png',
  'New Zealand':            'https://flagcdn.com/w40/nz.png',
  'Spain':                  'https://flagcdn.com/w40/es.png',
  'Uruguay':                'https://flagcdn.com/w40/uy.png',
  'Saudi Arabia':           'https://flagcdn.com/w40/sa.png',
  'Cape Verde':             'https://flagcdn.com/w40/cv.png',
  'France':                 'https://flagcdn.com/w40/fr.png',
  'Senegal':                'https://flagcdn.com/w40/sn.png',
  'Norway':                 'https://flagcdn.com/w40/no.png',
  'Iraq':                   'https://flagcdn.com/w40/iq.png',
  'Argentina':              'https://flagcdn.com/w40/ar.png',
  'Austria':                'https://flagcdn.com/w40/at.png',
  'Algeria':                'https://flagcdn.com/w40/dz.png',
  'Jordan':                 'https://flagcdn.com/w40/jo.png',
  'Portugal':               'https://flagcdn.com/w40/pt.png',
  'Colombia':               'https://flagcdn.com/w40/co.png',
  'Uzbekistan':             'https://flagcdn.com/w40/uz.png',
  'DR Congo':               'https://flagcdn.com/w40/cd.png',
  'England':                'https://flagcdn.com/w40/gb-eng.png',
  'Croatia':                'https://flagcdn.com/w40/hr.png',
  'Panama':                 'https://flagcdn.com/w40/pa.png',
  'Ghana':                  'https://flagcdn.com/w40/gh.png',
};

const { data: matches, error } = await supabase.from('matches').select('id, home_team, away_team');
if (error) { console.error(error); process.exit(1); }
if (!matches?.length) { console.log('No matches found'); process.exit(0); }

let updated = 0;
for (const match of matches) {
  const homeFlag = flags[match.home_team];
  const awayFlag = flags[match.away_team];
  if (homeFlag || awayFlag) {
    await supabase.from('matches').update({
      ...(homeFlag && { home_team_flag: homeFlag }),
      ...(awayFlag && { away_team_flag: awayFlag }),
    }).eq('id', match.id);
    updated++;
  }
}

console.log(`Updated ${updated} matches with flags.`);
