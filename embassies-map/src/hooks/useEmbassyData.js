import { useState, useEffect, useRef } from 'react';
import staticEmbassies from '../data/embassies';
import prebuiltCoords from '../data/coords.json';

// English resource — shem_mdn_a, shem_ntz_a, maamad_a, Addrs, Kabala, email, tel, Atar, k_ntz
const EN_RESOURCE = '6fc859cb-8a6f-458b-bd5a-9bd0cfbfce11';
// Hebrew resource  — shem_mdn,   shem_ntz,   maamad,   Address,  Kabala, email, tel, Atar, k_ntz
const HE_RESOURCE = '4d1ce6f0-08d9-4294-a7ae-aae1b29bb769';

const API = (id) =>
  `https://data.gov.il/api/3/action/datastore_search?resource_id=${id}&limit=300`;

const CACHE_KEY  = 'govil_embassies_v4'; // bumped: filters non-resident missions
const COORDS_KEY = 'govil_embassy_coords_v2';
const TTL        = 24 * 60 * 60 * 1000;

function normalizeKey(country, city) {
  const clean = (s) =>
    s.toLowerCase()
      .replace(/embassy|consulate|mission|delegation|permanent|honorary|general/g, '')
      .replace(/[^a-z0-9]/g, '');
  return `${clean(country)}|${clean(city)}`;
}

// Merge static hand-coded coords + pre-built Nominatim coords
const seedCoords = { ...prebuiltCoords };
staticEmbassies.forEach((e) => {
  const k = normalizeKey(e.country, e.city);
  if (!seedCoords[k]) seedCoords[k] = { lat: e.lat, lng: e.lng };
});

// Cities used as diplomatic hubs → the country that city actually belongs to.
// Non-resident missions (e.g. New Delhi ambassador also accredited to Sri Lanka)
// are filtered out so we show only physically-present missions.
const CITY_HOME = {
  // Americas
  mexicocity: 'mexico',
  panamacity: 'panama',
  sanjose: 'costarica',
  lima: 'peru',
  buenosaires: 'argentina',
  santodomingo: 'dominicanrepublic',
  guatemalacity: 'guatemala',
  // Africa
  addisababa: 'ethiopia',
  nairobi: 'kenya',
  pretoria: 'southafrica',
  luanda: 'angola',
  lusaka: 'zambia',
  dakar: 'senegal',
  accra: 'ghana',
  yaounde: 'cameroon',
  abidjan: 'cotedivoire',
  abuja: 'nigeria',
  kigali: 'rwanda',
  // Asia / Pacific
  newdelhi: 'india',
  bangkok: 'thailand',
  singapore: 'singapore',
  tashkent: 'uzbekistan',
  astana: 'kazakhstan',
  hanoi: 'vietnam',
  beijing: 'china',
  // Europe
  rome: 'italy',
  bern: 'switzerland',
  brussels: 'belgium',
  oslo: 'norway',
  tirana: 'albania',
  belgrade: 'serbia',
  madrid: 'spain',
  paris: 'france',
  // Oceania
  wellington: 'newzealand',
};

function normStr(s) {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

/** Returns false for non-resident missions (ambassador based in a different country). */
function isResidentMission(city, country) {
  const nc = normStr(city);
  const home = CITY_HOME[nc];
  if (!home) return true; // city not in hub list → assume physically present
  const nd = normStr(country);
  // Allow if stated country matches (or starts with) the city's home country
  return nd.startsWith(home.slice(0, 7)) || home.startsWith(nd.slice(0, 7));
}

function parseType(maamad = '') {
  const m = maamad.toLowerCase();
  if (m.includes('consulate') || m.includes('consul') ||
      m.includes('קונסוליה') || m.includes('קונסול')) return 'consulate';
  return 'embassy';
}

function extractCity(rawCity = '') {
  return rawCity
    .replace(/^(embassy|consulate|mission|delegation|permanent mission to.*?)\s+/i, '')
    .replace(/[-–].*(mission|embassy|consulate|delegation|un|united nations).*/i, '')
    .trim();
}

export function useEmbassyData() {
  const [missions, setMissions]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [geocodingLeft, setGeocodingLeft] = useState(0);
  const geocodeQueueRef = useRef([]);
  const geocodingRef    = useRef(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    // 1 — Try fresh cache
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.ts < TTL) {
        setMissions(cached.data);
        setLoading(false);
        scheduleGeocode(cached.data);
        return;
      }
    } catch {}

    // 2 — Fetch BOTH resources in parallel
    try {
      const [enJson, heJson] = await Promise.all([
        fetch(API(EN_RESOURCE)).then((r) => r.json()),
        fetch(API(HE_RESOURCE)).then((r) => r.json()),
      ]);

      const enRecords = enJson?.result?.records ?? [];
      const heRecords = heJson?.result?.records ?? [];

      // Build Hebrew lookup by k_ntz (shared mission code)
      const heLookup = {};
      heRecords.forEach((r) => {
        if (r.k_ntz) heLookup[String(r.k_ntz)] = r;
      });

      const coordsCache = readCoordsCache();

      const mapped = enRecords.map((r) => {
        const country = r.shem_mdn_a || '';
        const rawCity = r.shem_ntz_a || '';
        const city    = extractCity(rawCity);
        const key     = normalizeKey(country, city);
        const coords  = seedCoords[key] ?? coordsCache[key] ?? null;

        // Hebrew counterpart (same k_ntz)
        const he = r.k_ntz ? heLookup[String(r.k_ntz)] : null;

        return {
          id:         String(r._id),
          country,
          city,
          country_he: he?.shem_mdn  || '',
          city_he:    he?.shem_ntz  ? extractCityHe(he.shem_ntz) : '',
          address:    r.Addrs       || '',
          type:       parseType(r.maamad_a || he?.maamad || ''),
          email:      r.email       || '',
          tel:        r.tel         || '',
          website:    r.Atar        || '',
          hours:      r.Kabala      || '',
          lat:        coords?.lat   ?? null,
          lng:        coords?.lng   ?? null,
          _key:       key,
        };
      });

      const resident = mapped.filter((m) => isResidentMission(m.city, m.country));

      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: resident }));
      setMissions(resident);
      setLoading(false);
      scheduleGeocode(resident);
    } catch (err) {
      console.error('[EmbassyData] fetch failed, using static fallback', err);
      const fallback = staticEmbassies.map((e) => ({
        ...e,
        id: String(e.id), email: '', tel: '', website: '', hours: '',
        country_he: '', city_he: '',
        _key: normalizeKey(e.country, e.city),
      }));
      setMissions(fallback);
      setLoading(false);
    }
  }

  function scheduleGeocode(data) {
    const coordsCache = readCoordsCache();
    const queue = data.filter((m) => !m.lat && !m.lng && !coordsCache[m._key]);
    setGeocodingLeft(queue.length);
    geocodeQueueRef.current = queue;
    if (!geocodingRef.current) processQueue();
  }

  async function processQueue() {
    geocodingRef.current = true;
    const coordsCache = readCoordsCache();

    while (geocodeQueueRef.current.length > 0) {
      const mission = geocodeQueueRef.current.shift();

      if (coordsCache[mission._key]) {
        setMissions((prev) =>
          prev.map((m) => m._key === mission._key ? { ...m, ...coordsCache[m._key] } : m),
        );
        setGeocodingLeft((n) => Math.max(0, n - 1));
        continue;
      }

      try {
        const query = encodeURIComponent(`${mission.city}, ${mission.country}`);
        const res   = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
          { headers: { 'User-Agent': 'EmbassiesMap/1.0 (educational project)' } },
        );
        const data = await res.json();

        if (data.length > 0) {
          const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          coordsCache[mission._key] = coords;
          writeCoordsCache(coordsCache);

          setMissions((prev) =>
            prev.map((m) => m._key === mission._key ? { ...m, ...coords } : m),
          );

          try {
            const stored = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            if (stored) {
              stored.data = stored.data.map((m) =>
                m._key === mission._key ? { ...m, ...coords } : m,
              );
              localStorage.setItem(CACHE_KEY, JSON.stringify(stored));
            }
          } catch {}
        }
      } catch (err) {
        console.warn('[Geocode] failed for', mission.city, err);
      }

      setGeocodingLeft((n) => Math.max(0, n - 1));
      await sleep(1200);
    }

    geocodingRef.current = false;
  }

  return { missions, loading, geocodingLeft };
}

// Strip Hebrew type prefixes like "שגרירות " or "קונסוליה " from city name
function extractCityHe(rawCity = '') {
  return rawCity
    .replace(/^(שגרירות|קונסוליה|משלחת|נציגות|משרד)\s+/u, '')
    .trim();
}

function readCoordsCache()       { try { return JSON.parse(localStorage.getItem(COORDS_KEY) || '{}'); } catch { return {}; } }
function writeCoordsCache(cache) { try { localStorage.setItem(COORDS_KEY, JSON.stringify(cache)); } catch {} }
function sleep(ms)               { return new Promise((r) => setTimeout(r, ms)); }
