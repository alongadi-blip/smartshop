import type { Sender } from './types';

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function gFetch(url: string, token: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string) {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;
}

function parseListUnsubscribe(header: string): { url?: string; email?: string } {
  const result: { url?: string; email?: string } = {};
  const matches = [...header.matchAll(/<([^>]+)>/g)];
  for (const [, value] of matches) {
    if (value.startsWith('mailto:') && !result.email) result.email = value;
    else if ((value.startsWith('https://') || value.startsWith('http://')) && !result.url)
      result.url = value;
  }
  return result;
}

async function listMessageIds(token: string, maxResults = 500): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${BASE}/messages`);
    url.searchParams.set('q', 'category:promotions');
    url.searchParams.set('maxResults', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const data = await gFetch(url.toString(), token);
    if (data.messages) ids.push(...data.messages.map((m: { id: string }) => m.id));
    pageToken = data.nextPageToken;
  } while (pageToken && ids.length < maxResults);

  return ids.slice(0, maxResults);
}

async function fetchMetadataBatch(token: string, ids: string[]) {
  return Promise.all(
    ids.map(id =>
      gFetch(
        `${BASE}/messages/${id}?format=metadata` +
          `&metadataHeaders=From` +
          `&metadataHeaders=List-Unsubscribe` +
          `&metadataHeaders=List-Unsubscribe-Post`,
        token
      )
    )
  );
}

export async function fetchPromotionalSenders(
  token: string,
  onProgress: (loaded: number, total: number) => void
): Promise<Sender[]> {
  const ids = await listMessageIds(token);
  const total = ids.length;
  const batchSize = 20;
  const messages: any[] = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = await fetchMetadataBatch(token, ids.slice(i, i + batchSize));
    messages.push(...batch);
    onProgress(Math.min(i + batchSize, total), total);
  }

  const senderMap = new Map<string, Sender>();

  for (const msg of messages) {
    const headers: Array<{ name: string; value: string }> = msg.payload?.headers || [];
    const from = getHeader(headers, 'From') || '';
    const listUnsub = getHeader(headers, 'List-Unsubscribe');
    const listUnsubPost = getHeader(headers, 'List-Unsubscribe-Post');

    const nameMatch = from.match(/^(.+?)\s*<(.+?)>$/);
    const senderName = nameMatch ? nameMatch[1].replace(/^"|"$/g, '').trim() : from;
    const senderEmail = (nameMatch ? nameMatch[2] : from).toLowerCase().trim();

    if (!senderEmail) continue;

    if (!senderMap.has(senderEmail)) {
      const unsubInfo = listUnsub ? parseListUnsubscribe(listUnsub) : {};
      senderMap.set(senderEmail, {
        email: senderEmail,
        name: senderName || senderEmail,
        count: 1,
        latestMessageId: msg.id,
        unsubscribeUrl: unsubInfo.url,
        unsubscribeEmail: unsubInfo.email,
        supportsOneClick: !!listUnsubPost,
        status: 'idle',
      });
    } else {
      const s = senderMap.get(senderEmail)!;
      s.count++;
      if (!s.unsubscribeUrl && !s.unsubscribeEmail && listUnsub) {
        const unsubInfo = parseListUnsubscribe(listUnsub);
        s.unsubscribeUrl = unsubInfo.url;
        s.unsubscribeEmail = unsubInfo.email;
        s.supportsOneClick = !!listUnsubPost;
      }
    }
  }

  return Array.from(senderMap.values()).sort((a, b) => b.count - a.count);
}

function encodeEmail(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const EMAIL_RE = /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/;

function stripHeaderInjection(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export async function sendUnsubscribeEmail(token: string, mailtoUrl: string): Promise<void> {
  const withoutScheme = mailtoUrl.replace(/^mailto:/i, '');
  const [toRaw, queryRaw] = withoutScheme.split('?');
  const to = stripHeaderInjection(decodeURIComponent(toRaw));
  if (!EMAIL_RE.test(to)) throw new Error('Invalid unsubscribe address');

  const params = new URLSearchParams(queryRaw || '');
  const subject = stripHeaderInjection(params.get('subject') || 'unsubscribe');

  const raw = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    'Please unsubscribe me from this mailing list.',
  ].join('\r\n');

  await gFetch(`${BASE}/messages/send`, token, {
    method: 'POST',
    body: JSON.stringify({ raw: encodeEmail(raw) }),
  });
}
