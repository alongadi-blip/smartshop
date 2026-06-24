import { useState, useEffect, useRef } from 'react';
import staticEmbassies from '../data/embassies';

// English resource — fields: shem_mdn_a, shem_ntz_a, maamad_a, Addrs, Kabala, email, tel, Atar
const RESOURCE_ID = '6fc859cb-8a6f-458b-bd5a-9bd0cfbfce11';
const API_URL = `https://data.gov.il/api/3/action/datastore_search?resource_id=${RESOURCE_ID}&limit=300`;

const CACHE_KEY  = 'govil_embassies_v2';
const COORDS_KEY = 'govil_embassy_coords_v2';
const TTL        = 24 * 60 * 60 * 1000; // 24 hours

// ── Normalize city+country into a stable cache key ────────────────────────
function normalizeKey(country, city) {
  const clean = (s) =>
    s.toLowerCase()
      .replace(/embassy|consulate|mission|delegation|permanent|honorary|general/g, '')
      .replace(/[^a-z0-9]/g, '');
  return `${clean(country)}|${clean(city)}`;
}

// ── Build coordinate lookup from static seed data ─────────────────────────
const seedCoords = {};
staticEmbassies.forEach((e) => {
  seedCoords[normalizeKey(e.country, e.city)] = { lat: e.lat, lng: e.lng };
});

// ── Map API maamad_a field to our category system ─────────────────────────
function parseType(maamad = '') {
  const m = maamad.toLowerCase();
  if (m.includes('consulate') || m.includes('consul')) return 'consulate';
  return 'embassy'; // covers embassy, mission, delegation, permanent mission…
}

// ── Strip mission-type prefix from city name for geocoding ────────────────
function extractCity(rawCity = '') {
  return rawCity
    .replace(/^(embassy|consulate|mission|delegation|permanent mission to.*?)\s+/i, '')
    .replace(/[-–].*(mission|embassy|consulate|delegation|un|united nations).*/i, '')
    .trim();
}

export function useEmbassyData() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocodingLeft, setGeocodingLeft] = useState(0);
  const geocodeQueueRef = useRef([]);
  const geocodingRef = useRef(false);

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
    } catch { /* ignore corrupt cache */ }

    // 2 — Fetch from data.gov.il
    try {
      const res  = await fetch(API_URL);
      const json = await res.json();
      const records = json?.result?.records ?? [];

      const coordsCache = readCoordsCache();
      const mapped = records.map((r) => {
        const country = r.shem_mdn_a || '';
        const rawCity = r.shem_ntz_a || '';
        const city    = extractCity(rawCity);
        const key     = normalizeKey(country, city);
        const coords  = seedCoords[key] ?? coordsCache[key] ?? null;

        return {
          id:      String(r._id),
          country,
          city,
          address: r.Addrs    || '',
          type:    parseType(r.maamad_a),
          email:   r.email    || '',
          tel:     r.tel      || '',
          website: r.Atar     || '',
          hours:   r.Kabala   || '',
          lat:     coords?.lat ?? null,
          lng:     coords?.lng ?? null,
          _key:    key,
        };
      });

      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: mapped }));
      setMissions(mapped);
      setLoading(false);
      scheduleGeocode(mapped);
    } catch (err) {
      console.error('[EmbassyData] fetch failed, using static fallback', err);
      const fallback = staticEmbassies.map((e) => ({
        ...e,
        id:      String(e.id),
        email:   '', tel: '', website: '', hours: '',
        _key:    normalizeKey(e.country, e.city),
      }));
      setMissions(fallback);
      setLoading(false);
    }
  }

  // ── Queue Nominatim geocoding for missions with no coordinates ────────────
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

      // Skip if another render already filled it
      if (coordsCache[mission._key]) {
        setMissions((prev) =>
          prev.map((m) =>
            m._key === mission._key
              ? { ...m, ...coordsCache[m._key] }
              : m,
          ),
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
            prev.map((m) => (m._key === mission._key ? { ...m, ...coords } : m)),
          );

          // Also refresh the API cache so lat/lng is persisted
          try {
            const stored = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            if (stored) {
              stored.data = stored.data.map((m) =>
                m._key === mission._key ? { ...m, ...coords } : m,
              );
              localStorage.setItem(CACHE_KEY, JSON.stringify(stored));
            }
          } catch { /* not critical */ }
        }
      } catch (err) {
        console.warn('[Geocode] failed for', mission.city, err);
      }

      setGeocodingLeft((n) => Math.max(0, n - 1));
      // Nominatim rate limit: 1 req/sec
      await sleep(1200);
    }

    geocodingRef.current = false;
  }

  return { missions, loading, geocodingLeft };
}

// ── Helpers ───────────────────────────────────────────────────────────────
function readCoordsCache()           { try { return JSON.parse(localStorage.getItem(COORDS_KEY) || '{}'); } catch { return {}; } }
function writeCoordsCache(cache)     { try { localStorage.setItem(COORDS_KEY, JSON.stringify(cache)); } catch {} }
function sleep(ms)                   { return new Promise((r) => setTimeout(r, ms)); }
