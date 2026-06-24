/**
 * Run once: node scripts/geocode-all.mjs
 * Fetches all missions from data.gov.il, geocodes via Nominatim,
 * writes src/data/coords.json — eliminates all runtime geocoding.
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT   = join(__dir, '../src/data/coords.json');

const EN_RESOURCE = '6fc859cb-8a6f-458b-bd5a-9bd0cfbfce11';
const API_URL     = `https://data.gov.il/api/3/action/datastore_search?resource_id=${EN_RESOURCE}&limit=300`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeKey(country, city) {
  const clean = (s) =>
    s.toLowerCase()
      .replace(/embassy|consulate|mission|delegation|permanent|honorary|general/g, '')
      .replace(/[^a-z0-9]/g, '');
  return `${clean(country)}|${clean(city)}`;
}

function extractCity(rawCity = '') {
  return rawCity
    .replace(/^(embassy|consulate|mission|delegation|permanent mission to.*?)\s+/i, '')
    .replace(/[-–].*(mission|embassy|consulate|delegation|un|united nations).*/i, '')
    .trim();
}

async function geocode(city, country) {
  const q   = encodeURIComponent(`${city}, ${country}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'EmbassiesMap/1.0 build-script (educational)' },
  });
  const data = await res.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

async function main() {
  // Load existing coords so we can resume if interrupted
  const existing = existsSync(OUT)
    ? JSON.parse(readFileSync(OUT, 'utf8'))
    : {};

  console.log(`📡 Fetching missions from data.gov.il…`);
  const res     = await fetch(API_URL);
  const json    = await res.json();
  const records = json?.result?.records ?? [];
  console.log(`✅ Got ${records.length} missions\n`);

  let added = 0, skipped = 0, failed = 0;

  for (let i = 0; i < records.length; i++) {
    const r       = records[i];
    const country = r.shem_mdn_a || '';
    const rawCity = r.shem_ntz_a || '';
    const city    = extractCity(rawCity);
    const key     = normalizeKey(country, city);

    if (existing[key]) {
      skipped++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${records.length}] ${city}, ${country} … `);

    const coords = await geocode(city, country);
    if (coords) {
      existing[key] = coords;
      added++;
      console.log(`✅ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      // Save after every hit so we can resume on interruption
      writeFileSync(OUT, JSON.stringify(existing, null, 2));
    } else {
      failed++;
      console.log(`❌ not found`);
    }

    // Nominatim: max 1 req/sec
    await sleep(1200);
  }

  console.log(`\n🏁 Done — added: ${added}, skipped: ${skipped}, failed: ${failed}`);
  console.log(`💾 Saved to ${OUT}`);
}

main().catch(console.error);
