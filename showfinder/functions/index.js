const https = require('https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const SOURCES = [
  { city: 'jerusalem', cityLabel: 'ירושלים', url: 'https://live.tickchak.co.il/jeruslem' },
  { city: 'modiin', cityLabel: 'מודיעין', url: 'https://live.tickchak.co.il/modiin-culture-hall', defaultVenue: 'היכל התרבות מודיעין' },
  { city: 'mevaseret', cityLabel: 'מבשרת ציון', url: 'https://live.tickchak.co.il/mevaseretzion' },
];

const TYPE_TO_CATEGORY = {
  MusicEvent: 'music',
  TheaterEvent: 'theater',
  ComedyEvent: 'standup',
  ChildrensEvent: 'kids',
  EducationEvent: 'other',
  Event: 'other',
};

// Events older than this are removed on each scrape run.
const STALE_EVENT_MS = 24 * 60 * 60 * 1000;
const MAX_REDIRECTS = 5;

function fetchHtml(url, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          resolve(fetchHtml(new URL(res.headers.location, url).toString(), redirectsLeft - 1));
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

function extractEventNodes(html) {
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

function eventIdFromUrl(url) {
  const match = url.match(/event\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  return Buffer.from(url).toString('base64url').slice(0, 24);
}

async function scrapeSource(source) {
  const html = await fetchHtml(source.url);
  const nodes = extractEventNodes(html);
  const items = [];

  for (const node of nodes) {
    const ticketUrl = node.offers?.url || (node['@id'] || '').replace('#event', '');
    if (!ticketUrl || !node.name || !node.startDate) continue;

    const eventId = eventIdFromUrl(ticketUrl);
    const image = Array.isArray(node.image) ? node.image[0] : node.image || null;

    items.push({
      docId: `tickchak_${eventId}`,
      title: node.name,
      city: source.city,
      cityLabel: source.cityLabel,
      venue: node.location?.name || source.defaultVenue || source.cityLabel,
      category: TYPE_TO_CATEGORY[node['@type']] || 'other',
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

async function runScrape() {
  const now = FieldValue.serverTimestamp();
  const summary = {};

  for (const source of SOURCES) {
    try {
      const items = await scrapeSource(source);
      await commitInChunks(items, now);
      summary[source.city] = items.length;
    } catch (err) {
      console.error(`Failed to scrape ${source.city}:`, err.message);
      summary[source.city] = `error: ${err.message}`;
    }
  }

  const removed = await deleteStaleEvents();
  summary.removedStale = removed;
  return summary;
}

exports.scrapeEventsScheduled = onSchedule(
  { schedule: 'every 6 hours', timeZone: 'Asia/Jerusalem', region: 'me-west1' },
  async () => {
    const summary = await runScrape();
    console.log('Scrape summary:', summary);
  }
);

exports.scrapeEventsNow = onRequest({ region: 'me-west1' }, async (req, res) => {
  if (!process.env.SCRAPE_TOKEN || req.query.token !== process.env.SCRAPE_TOKEN) {
    res.status(403).send('Forbidden');
    return;
  }
  const summary = await runScrape();
  res.status(200).json(summary);
});
