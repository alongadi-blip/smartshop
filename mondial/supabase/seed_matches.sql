-- FIFA World Cup 2026 — Group Stage Seed Data (72 matches)
-- Times in UTC. ET = UTC-4 in June.
-- Run in: Supabase Dashboard → SQL Editor

INSERT INTO public.matches (api_match_id, home_team, away_team, group_name, stage, match_time, status) VALUES

-- ===================== GROUP A: Mexico, South Korea, South Africa, Czechia =====================
-- Round 1
('wc26-a1', 'Mexico',      'South Africa', 'Group A', 'group', '2026-06-11T19:00:00Z', 'scheduled'),
('wc26-a2', 'South Korea', 'Czechia',       'Group A', 'group', '2026-06-12T02:00:00Z', 'scheduled'),
-- Round 2
('wc26-a3', 'Mexico',      'South Korea',  'Group A', 'group', '2026-06-18T19:00:00Z', 'scheduled'),
('wc26-a4', 'South Africa','Czechia',       'Group A', 'group', '2026-06-18T22:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-a5', 'Mexico',      'Czechia',      'Group A', 'group', '2026-06-25T16:00:00Z', 'scheduled'),
('wc26-a6', 'South Korea', 'South Africa', 'Group A', 'group', '2026-06-25T16:00:00Z', 'scheduled'),

-- ===================== GROUP B: Canada, Switzerland, Qatar, Bosnia =====================
-- Round 1
('wc26-b1', 'Canada',      'Bosnia and Herzegovina', 'Group B', 'group', '2026-06-12T19:00:00Z', 'scheduled'),
('wc26-b2', 'Qatar',       'Switzerland',            'Group B', 'group', '2026-06-13T19:00:00Z', 'scheduled'),
-- Round 2
('wc26-b3', 'Canada',      'Qatar',                  'Group B', 'group', '2026-06-19T22:00:00Z', 'scheduled'),
('wc26-b4', 'Switzerland', 'Bosnia and Herzegovina', 'Group B', 'group', '2026-06-19T19:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-b5', 'Canada',      'Switzerland',            'Group B', 'group', '2026-06-25T20:00:00Z', 'scheduled'),
('wc26-b6', 'Qatar',       'Bosnia and Herzegovina', 'Group B', 'group', '2026-06-25T20:00:00Z', 'scheduled'),

-- ===================== GROUP C: Brazil, Morocco, Scotland, Haiti =====================
-- Round 1
('wc26-c1', 'Brazil',   'Morocco',  'Group C', 'group', '2026-06-13T22:00:00Z', 'scheduled'),
('wc26-c2', 'Scotland', 'Haiti',    'Group C', 'group', '2026-06-14T01:00:00Z', 'scheduled'),
-- Round 2
('wc26-c3', 'Brazil',   'Scotland', 'Group C', 'group', '2026-06-20T22:00:00Z', 'scheduled'),
('wc26-c4', 'Morocco',  'Haiti',    'Group C', 'group', '2026-06-20T19:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-c5', 'Brazil',   'Haiti',    'Group C', 'group', '2026-06-26T16:00:00Z', 'scheduled'),
('wc26-c6', 'Morocco',  'Scotland', 'Group C', 'group', '2026-06-26T16:00:00Z', 'scheduled'),

-- ===================== GROUP D: USA, Australia, Paraguay, Turkey =====================
-- Round 1
('wc26-d1', 'United States', 'Paraguay',  'Group D', 'group', '2026-06-13T01:00:00Z', 'scheduled'),
('wc26-d2', 'Australia',     'Turkey',    'Group D', 'group', '2026-06-14T19:00:00Z', 'scheduled'),
-- Round 2
('wc26-d3', 'United States', 'Australia', 'Group D', 'group', '2026-06-20T01:00:00Z', 'scheduled'),
('wc26-d4', 'Paraguay',      'Turkey',    'Group D', 'group', '2026-06-21T16:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-d5', 'United States', 'Turkey',   'Group D', 'group', '2026-06-26T19:00:00Z', 'scheduled'),
('wc26-d6', 'Australia',     'Paraguay', 'Group D', 'group', '2026-06-26T19:00:00Z', 'scheduled'),

-- ===================== GROUP E: Germany, Ecuador, Ivory Coast, Curacao =====================
-- Round 1
('wc26-e1', 'Germany',     'Ivory Coast', 'Group E', 'group', '2026-06-14T22:00:00Z', 'scheduled'),
('wc26-e2', 'Ecuador',     'Curacao',     'Group E', 'group', '2026-06-15T16:00:00Z', 'scheduled'),
-- Round 2
('wc26-e3', 'Germany',     'Ecuador',     'Group E', 'group', '2026-06-21T22:00:00Z', 'scheduled'),
('wc26-e4', 'Ivory Coast', 'Curacao',     'Group E', 'group', '2026-06-21T19:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-e5', 'Germany',     'Curacao',     'Group E', 'group', '2026-06-26T22:00:00Z', 'scheduled'),
('wc26-e6', 'Ecuador',     'Ivory Coast', 'Group E', 'group', '2026-06-26T22:00:00Z', 'scheduled'),

-- ===================== GROUP F: Netherlands, Japan, Tunisia, Sweden =====================
-- Round 1
('wc26-f1', 'Netherlands', 'Tunisia', 'Group F', 'group', '2026-06-15T19:00:00Z', 'scheduled'),
('wc26-f2', 'Japan',       'Sweden',  'Group F', 'group', '2026-06-15T22:00:00Z', 'scheduled'),
-- Round 2
('wc26-f3', 'Netherlands', 'Japan',   'Group F', 'group', '2026-06-22T22:00:00Z', 'scheduled'),
('wc26-f4', 'Tunisia',     'Sweden',  'Group F', 'group', '2026-06-22T19:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-f5', 'Netherlands', 'Sweden',  'Group F', 'group', '2026-06-27T16:00:00Z', 'scheduled'),
('wc26-f6', 'Japan',       'Tunisia', 'Group F', 'group', '2026-06-27T16:00:00Z', 'scheduled'),

-- ===================== GROUP G: Belgium, Iran, Egypt, New Zealand =====================
-- Round 1
('wc26-g1', 'Belgium', 'Egypt',       'Group G', 'group', '2026-06-16T19:00:00Z', 'scheduled'),
('wc26-g2', 'Iran',    'New Zealand', 'Group G', 'group', '2026-06-16T22:00:00Z', 'scheduled'),
-- Round 2
('wc26-g3', 'Belgium', 'Iran',        'Group G', 'group', '2026-06-23T22:00:00Z', 'scheduled'),
('wc26-g4', 'Egypt',   'New Zealand', 'Group G', 'group', '2026-06-23T19:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-g5', 'Belgium', 'New Zealand', 'Group G', 'group', '2026-06-27T19:00:00Z', 'scheduled'),
('wc26-g6', 'Iran',    'Egypt',       'Group G', 'group', '2026-06-27T19:00:00Z', 'scheduled'),

-- ===================== GROUP H: Spain, Uruguay, Saudi Arabia, Cape Verde =====================
-- Round 1
('wc26-h1', 'Spain',        'Saudi Arabia', 'Group H', 'group', '2026-06-17T01:00:00Z', 'scheduled'),
('wc26-h2', 'Uruguay',      'Cape Verde',   'Group H', 'group', '2026-06-17T19:00:00Z', 'scheduled'),
-- Round 2
('wc26-h3', 'Spain',        'Uruguay',      'Group H', 'group', '2026-06-23T01:00:00Z', 'scheduled'),
('wc26-h4', 'Saudi Arabia', 'Cape Verde',   'Group H', 'group', '2026-06-24T16:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-h5', 'Spain',        'Cape Verde',   'Group H', 'group', '2026-06-27T22:00:00Z', 'scheduled'),
('wc26-h6', 'Uruguay',      'Saudi Arabia', 'Group H', 'group', '2026-06-27T22:00:00Z', 'scheduled'),

-- ===================== GROUP I: France, Senegal, Norway, Iraq =====================
-- Round 1
('wc26-i1', 'France',  'Senegal', 'Group I', 'group', '2026-06-17T22:00:00Z', 'scheduled'),
('wc26-i2', 'Norway',  'Iraq',    'Group I', 'group', '2026-06-18T16:00:00Z', 'scheduled'),
-- Round 2
('wc26-i3', 'France',  'Norway',  'Group I', 'group', '2026-06-24T22:00:00Z', 'scheduled'),
('wc26-i4', 'Senegal', 'Iraq',    'Group I', 'group', '2026-06-24T19:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-i5', 'France',  'Iraq',    'Group I', 'group', '2026-06-28T16:00:00Z', 'scheduled'),
('wc26-i6', 'Norway',  'Senegal', 'Group I', 'group', '2026-06-28T16:00:00Z', 'scheduled'),

-- ===================== GROUP J: Argentina, Austria, Algeria, Jordan =====================
-- Round 1
('wc26-j1', 'Argentina', 'Algeria', 'Group J', 'group', '2026-06-18T22:00:00Z', 'scheduled'),
('wc26-j2', 'Austria',   'Jordan',  'Group J', 'group', '2026-06-19T16:00:00Z', 'scheduled'),
-- Round 2
('wc26-j3', 'Argentina', 'Austria', 'Group J', 'group', '2026-06-25T22:00:00Z', 'scheduled'),
('wc26-j4', 'Algeria',   'Jordan',  'Group J', 'group', '2026-06-25T19:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-j5', 'Argentina', 'Jordan',  'Group J', 'group', '2026-06-28T19:00:00Z', 'scheduled'),
('wc26-j6', 'Algeria',   'Austria', 'Group J', 'group', '2026-06-28T19:00:00Z', 'scheduled'),

-- ===================== GROUP K: Portugal, Colombia, Uzbekistan, DR Congo =====================
-- Round 1
('wc26-k1', 'Portugal',   'Uzbekistan', 'Group K', 'group', '2026-06-19T22:00:00Z', 'scheduled'),
('wc26-k2', 'Colombia',   'DR Congo',   'Group K', 'group', '2026-06-20T16:00:00Z', 'scheduled'),
-- Round 2
('wc26-k3', 'Portugal',   'Colombia',   'Group K', 'group', '2026-06-26T01:00:00Z', 'scheduled'),
('wc26-k4', 'Uzbekistan', 'DR Congo',   'Group K', 'group', '2026-06-26T01:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-k5', 'Portugal',   'DR Congo',   'Group K', 'group', '2026-06-28T22:00:00Z', 'scheduled'),
('wc26-k6', 'Colombia',   'Uzbekistan', 'Group K', 'group', '2026-06-28T22:00:00Z', 'scheduled'),

-- ===================== GROUP L: England, Croatia, Panama, Ghana =====================
-- Round 1
('wc26-l1', 'England', 'Panama',  'Group L', 'group', '2026-06-20T22:00:00Z', 'scheduled'),
('wc26-l2', 'Croatia', 'Ghana',   'Group L', 'group', '2026-06-21T01:00:00Z', 'scheduled'),
-- Round 2
('wc26-l3', 'England', 'Croatia', 'Group L', 'group', '2026-06-27T01:00:00Z', 'scheduled'),
('wc26-l4', 'Panama',  'Ghana',   'Group L', 'group', '2026-06-27T01:00:00Z', 'scheduled'),
-- Round 3 (simultaneous)
('wc26-l5', 'England', 'Ghana',   'Group L', 'group', '2026-06-29T19:00:00Z', 'scheduled'),
('wc26-l6', 'Croatia', 'Panama',  'Group L', 'group', '2026-06-29T19:00:00Z', 'scheduled');
