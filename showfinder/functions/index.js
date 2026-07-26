const https = require('https');
const cheerio = require('cheerio');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const MAX_REDIRECTS = 5;
// Events older than this are removed on each scrape run.
const STALE_EVENT_MS = 24 * 60 * 60 * 1000;

const CATEGORY_KEYWORDS = [
  ['standup', /סטנד\s*אפ/],
  ['theater', /(תיאטרון|הצגה|הצגות|מחזה|קאמרי|הבימה)/],
  ['music', /(מוזיקה|קונצרט|זמר|זמרת|להקה|תזמורת|ג'אז|אופרה|פילהרמונית|נגן|שירה)/],
  ['kids', /(ילדים|משפחות|משפחה)/],
];

function guessCategory(text) {
  for (const [category, re] of CATEGORY_KEYWORDS) {
    if (re.test(text)) return category;
  }
  return 'other';
}

function fetchHtml(url, redirectsLeft = MAX_REDIRECTS, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': USER_AGENT, ...extraHeaders } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          resolve(fetchHtml(new URL(res.headers.location, url).toString(), redirectsLeft - 1, extraHeaders));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve(body));
      })
      .on('error', reject);
  });
}

async function mapWithConcurrency(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Converts Asia/Jerusalem wall-clock components to a correct UTC ISO string, DST-aware.
function israelWallTimeToIso(year, month, day, hour, minute) {
  const asUtcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(asUtcGuess)).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const hourPart = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
  const zoneInterpretedAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day), hourPart, Number(parts.minute), Number(parts.second)
  );
  const offset = asUtcGuess - zoneInterpretedAsUtc;
  return new Date(asUtcGuess + offset).toISOString();
}

// ─── Source 1: Tickchak (per-city pages, schema.org Event JSON-LD) ─────────

const TICKCHAK_SOURCES = [
  { city: 'jerusalem', cityLabel: 'ירושלים', url: 'https://live.tickchak.co.il/jeruslem' },
  { city: 'modiin', cityLabel: 'מודיעין', url: 'https://live.tickchak.co.il/modiin-culture-hall', defaultVenue: 'היכל התרבות מודיעין' },
  { city: 'mevaseret', cityLabel: 'מבשרת ציון', url: 'https://live.tickchak.co.il/mevaseretzion' },
];

const TICKCHAK_TYPE_TO_CATEGORY = {
  MusicEvent: 'music',
  TheaterEvent: 'theater',
  ComedyEvent: 'standup',
  ChildrensEvent: 'kids',
  EducationEvent: 'other',
  Event: 'other',
};

function extractTickchakEventNodes(html) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) return [];
  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }
  const graph = data['@graph'] || [];
  return graph.filter((node) => typeof node['@type'] === 'string' && node['@type'].endsWith('Event'));
}

function tickchakEventIdFromUrl(url) {
  const match = url.match(/event\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  return Buffer.from(url).toString('base64url').slice(0, 24);
}

async function scrapeTickchakSource(source) {
  const html = await fetchHtml(source.url);
  const nodes = extractTickchakEventNodes(html);
  const items = [];

  for (const node of nodes) {
    const ticketUrl = node.offers?.url || (node['@id'] || '').replace('#event', '');
    if (!ticketUrl || !node.name || !node.startDate) continue;

    const eventId = tickchakEventIdFromUrl(ticketUrl);
    const image = Array.isArray(node.image) ? node.image[0] : node.image || null;

    items.push({
      docId: `tickchak_${eventId}`,
      title: node.name,
      city: source.city,
      cityLabel: source.cityLabel,
      venue: node.location?.name || source.defaultVenue || source.cityLabel,
      category: TICKCHAK_TYPE_TO_CATEGORY[node['@type']] || 'other',
      date: node.startDate,
      imageUrl: image,
      price: typeof node.offers?.price === 'number' ? node.offers.price : null,
      description: node.description || null,
      ticketUrl,
      source: 'tickchak',
    });
  }

  return items;
}

async function scrapeTickchak() {
  const items = [];
  for (const source of TICKCHAK_SOURCES) {
    try {
      items.push(...(await scrapeTickchakSource(source)));
    } catch (err) {
      console.error(`tickchak ${source.city}:`, err.message);
    }
  }
  return items;
}

// ─── Source 2: FRIENDS (Histadrut culture club halls, server-rendered HTML) ─

const FRIENDS_SOURCES = [
  { city: 'jerusalem', cityLabel: 'ירושלים', url: 'https://friends-hist.co.il/hall/friends-%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D/', defaultVenue: 'FRIENDS ירושלים (תיאטרון הירש)' },
  { city: 'modiin', cityLabel: 'מודיעין', url: 'https://friends-hist.co.il/hall/%D7%94%D7%99%D7%9B%D7%9C-%D7%94%D7%AA%D7%A8%D7%91%D7%95%D7%AA-%D7%9E%D7%95%D7%93%D7%99%D7%A2%D7%99%D7%9F/', defaultVenue: 'היכל התרבות מודיעין' },
  { city: 'modiin', cityLabel: 'מודיעין', url: 'https://friends-hist.co.il/hall/%D7%9E%D7%95%D7%A2%D7%93%D7%95%D7%9F-%D7%94%D7%92%D7%A8%D7%99%D7%99-%D7%9E%D7%95%D7%93%D7%99%D7%A2%D7%99%D7%9F/', defaultVenue: 'מועדון הגריי מודיעין' },
];

function friendsDateToIso(ddmmyy, hhmm) {
  const [d, m, yy] = ddmmyy.split('.').map(Number);
  const year = 2000 + yy;
  let hour = 20, minute = 0;
  if (hhmm) {
    const [h, mi] = hhmm.split(':').map(Number);
    hour = h;
    minute = mi;
  }
  return israelWallTimeToIso(year, m, d, hour, minute);
}

async function scrapeFriendsSource(source) {
  const html = await fetchHtml(source.url);
  const $ = cheerio.load(html);
  const items = [];

  $('.wrap_shows > .search_show_row').each((_, row) => {
    const $row = $(row);
    const showLink = $row.find('a.btn_info[href*="/show/"]').first();
    const title = $row.find('.wrap_title.desktop_only h3').first().text().trim() || showLink.attr('title')?.trim();
    const showUrl = showLink.attr('href');
    const image = $row.find('.wrap_img img').first().attr('src') || null;
    const priceText = $row.find('.tooptip-regular-price').first().text();
    const priceMatch = priceText.match(/(\d+)\s*₪/);
    const price = priceMatch ? Number(priceMatch[1]) : null;

    if (!title || !showUrl) return;
    const category = guessCategory(title);

    $row.find('.events_list .wrap_item').each((__, item) => {
      const $item = $(item);
      const eventId = $item.find('.load_event_data').attr('data-event_id');
      const venue = $item.find('.hall-name-wrap span').first().text().trim() || source.defaultVenue;
      const spans = $item.find('.wrap_event > span').map((___, s) => $(s).text().trim()).get();
      const dateStr = spans.find((s) => /^\d{2}\.\d{2}\.\d{2}$/.test(s));
      const timeStr = spans.find((s) => /^\d{2}:\d{2}$/.test(s));
      if (!eventId || !dateStr) return;

      items.push({
        docId: `friends_${eventId}`,
        title,
        city: source.city,
        cityLabel: source.cityLabel,
        venue,
        category,
        date: friendsDateToIso(dateStr, timeStr),
        imageUrl: image,
        price,
        description: null,
        ticketUrl: showUrl,
        source: 'friends',
      });
    });
  });

  return items;
}

async function scrapeFriends() {
  const items = [];
  for (const source of FRIENDS_SOURCES) {
    try {
      items.push(...(await scrapeFriendsSource(source)));
    } catch (err) {
      console.error(`friends ${source.url}:`, err.message);
    }
  }
  return items;
}

// ─── Source 3: itraveljerusalem.com (Jerusalem tourism events, Next.js data)

const ITJ_SITEMAP_URL = 'https://www.itraveljerusalem.com/sitemap.xml';
const ITJ_PERFORMANCE_KEYWORDS = /(הופע|מוזיקה|קונצרט|מופע|סטנד\s*אפ|תזמורת|זמר|זמרת|להקה|מחול|ג'אז|שירה|נגן|הרכב|פילהרמונית|אופרה|תיאטרון|הצגה|פסטיבל)/;
const ITJ_HEBREW_HEADERS = { 'Accept-Language': 'he-IL,he;q=0.9' };
// itraveljerusalem rate-limits aggressively (HTTP 429 after ~15 rapid requests),
// so fetches are paced through a shared throttle rather than raw concurrency.
const ITJ_FETCH_CONCURRENCY = 3;
const ITJ_MIN_GAP_MS = 450;
const ITJ_MAX_RETRIES = 3;

function createThrottle(minGapMs) {
  let nextTime = 0;
  return async function wait() {
    const now = Date.now();
    const target = Math.max(now, nextTime);
    nextTime = target + minGapMs;
    const delay = target - now;
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  };
}

const itjThrottle = createThrottle(ITJ_MIN_GAP_MS);

async function fetchItjPage(url) {
  for (let attempt = 0; attempt <= ITJ_MAX_RETRIES; attempt++) {
    await itjThrottle();
    try {
      return await fetchHtml(url, MAX_REDIRECTS, ITJ_HEBREW_HEADERS);
    } catch (err) {
      const is429 = /HTTP 429/.test(err.message);
      if (!is429 || attempt === ITJ_MAX_RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

async function fetchItjSitemapEntries() {
  const xml = await fetchHtml(ITJ_SITEMAP_URL);
  const re = /<url>\s*<loc>(https?:\/\/itraveljerusalem\.com\/he\/event\/([^<]+))<\/loc>\s*<lastmod>([^<]*)<\/lastmod>/g;
  const entries = [];
  let match;
  while ((match = re.exec(xml))) {
    entries.push({ slug: match[2], url: match[1], lastmod: match[3] });
  }
  return entries;
}

function extractNextDataEvent(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    return data?.props?.pageProps?.event || null;
  } catch {
    return null;
  }
}

function nextItjOccurrenceIso(ev) {
  const now = Date.now();
  const upcoming = (ev.event_dates || [])
    .map((d) => d.date)
    .filter(Boolean)
    .map((iso) => new Date(iso))
    .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() > now)
    .sort((a, b) => a - b);
  if (upcoming.length) return upcoming[0].toISOString();

  const rec = ev.date?.[0];
  if (rec?.startDate && rec?.startTime) {
    if (rec.endDate) {
      const end = new Date(`${rec.endDate}T23:59:59+03:00`);
      if (end.getTime() < now) return null;
    }
    const [y, m, d] = rec.startDate.split('-').map(Number);
    const [hh, mm] = rec.startTime.split(':').map(Number);
    return israelWallTimeToIso(y, m, d, hh, mm);
  }
  return null;
}

async function scrapeItraveljerusalem() {
  const entries = await fetchItjSitemapEntries();
  const stateRef = db.collection('scrapeState').doc('itraveljerusalem');
  const stateSnap = await stateRef.get();
  const checked = stateSnap.exists ? stateSnap.data().checked || {} : {};
  const newChecked = { ...checked };

  const todo = entries.filter((e) => checked[e.slug] !== e.lastmod);
  const items = [];

  await mapWithConcurrency(todo, ITJ_FETCH_CONCURRENCY, async (entry) => {
    try {
      const html = await fetchItjPage(entry.url);
      const ev = extractNextDataEvent(html);
      newChecked[entry.slug] = entry.lastmod;
      if (!ev || !ev.name) return;

      const haystack = `${ev.name} ${ev.excerpt || ''} ${ev.subtitle || ''}`;
      if (!ITJ_PERFORMANCE_KEYWORDS.test(haystack)) return;

      const date = nextItjOccurrenceIso(ev);
      if (!date) return;

      const image = ev.gallery?.[0]?.image?.formats?.large?.url || ev.gallery?.[0]?.image?.url || null;
      const price = typeof ev.minPrice === 'number' ? ev.minPrice : (typeof ev.priceAmount === 'number' ? ev.priceAmount : null);

      items.push({
        docId: `itj_${entry.slug}`,
        title: ev.name,
        city: 'jerusalem',
        cityLabel: 'ירושלים',
        venue: ev.address || 'ירושלים',
        category: guessCategory(haystack),
        date,
        imageUrl: image,
        price,
        description: ev.excerpt || ev.subtitle || null,
        ticketUrl: ev.getTickets_url || entry.url,
        source: 'itraveljerusalem',
      });
    } catch (err) {
      console.error(`itraveljerusalem ${entry.slug}:`, err.message);
    }
  });

  await stateRef.set({ checked: newChecked, updatedAt: FieldValue.serverTimestamp() });
  return items;
}

// ─── Persistence + orchestration ────────────────────────────────────────────

async function commitInChunks(items, now) {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const batch = db.batch();
    for (const item of items.slice(i, i + CHUNK_SIZE)) {
      const ref = db.collection('events').doc(item.docId);
      batch.set(ref, { ...item, lastSeenAt: now }, { merge: true });
    }
    await batch.commit();
  }
}

async function deleteStaleEvents() {
  const cutoff = new Date(Date.now() - STALE_EVENT_MS).toISOString();
  const snapshot = await db.collection('events').where('date', '<', cutoff).get();
  if (snapshot.empty) return 0;
  const docs = snapshot.docs;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + CHUNK_SIZE)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
  return docs.length;
}

const SCRAPERS = {
  tickchak: scrapeTickchak,
  friends: scrapeFriends,
  itraveljerusalem: scrapeItraveljerusalem,
};

async function runScrape() {
  const now = FieldValue.serverTimestamp();
  const summary = {};

  for (const [name, scraper] of Object.entries(SCRAPERS)) {
    try {
      const items = await scraper();
      await commitInChunks(items, now);
      summary[name] = items.length;
    } catch (err) {
      console.error(`Failed to scrape ${name}:`, err.message);
      summary[name] = `error: ${err.message}`;
    }
  }

  summary.removedStale = await deleteStaleEvents();
  return summary;
}

exports.scrapeEventsScheduled = onSchedule(
  { schedule: 'every 6 hours', timeZone: 'Asia/Jerusalem', region: 'me-west1', timeoutSeconds: 540, memory: '256MiB' },
  async () => {
    const summary = await runScrape();
    console.log('Scrape summary:', summary);
  }
);

exports.scrapeEventsNow = onRequest({ region: 'me-west1', timeoutSeconds: 540, memory: '256MiB' }, async (req, res) => {
  if (!process.env.SCRAPE_TOKEN || req.query.token !== process.env.SCRAPE_TOKEN) {
    res.status(403).send('Forbidden');
    return;
  }
  const summary = await runScrape();
  res.status(200).json(summary);
});
