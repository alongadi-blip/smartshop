const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

function getHeaders() {
  return {
    'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
    'content-type': 'application/json',
  };
}

const STORE_CONTEXT = `NEVO TACTICAL מוכרת סט טקטי מקצועי: חולצה ארוכה טקטית + מכנסי קרגו.
מחיר הסט: ₪450 בערך. מידות זמינות: S, M, L, XL, XXL, 3XL, 4XL, 5XL.
משלוח: ₪50 להזמנה אחת. 2+ סטים — תיאום טלפוני. ניתן לאסוף עצמאית ללא עלות.
ניתן לבחור מידה שונה לחולצה ולמכנסיים.`;

export async function getSizeRecommendation({ height, weight, build }) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: STORE_CONTEXT,
      messages: [{
        role: 'user',
        content: `המלץ על מידת חולצה ומכנסיים לפי:
גובה: ${height} ס"מ | משקל: ${weight} ק"ג | מבנה: ${build}

ענה בדיוק בפורמט הזה (שלושה שורות בלבד):
חולצה: [S/M/L/XL/XXL/3XL/4XL/5XL]
מכנסיים: [S/M/L/XL/XXL/3XL/4XL/5XL]
הסבר: [משפט קצר אחד]`,
      }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

export async function streamChatMessage(messages, onToken) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      stream: true,
      system: `אתה עוזר לקוחות ידידותי של NEVO TACTICAL. ${STORE_CONTEXT}
ענה בעברית בצורה קצרה, ברורה וידידותית. אל תמציא מידע שאינו ידוע לך.`,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      try {
        const event = JSON.parse(payload);
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          onToken(event.delta.text);
        }
      } catch { /* ignore malformed SSE lines */ }
    }
  }
}

export async function getOrderInsights(orders) {
  const allSets = orders.flatMap(o =>
    (o.sets || []).flatMap(s => Array(s.quantity || 1).fill(s))
  );
  const shirtCounts = {}, pantsCounts = {};
  allSets.forEach(s => {
    if (s.shirtSize) shirtCounts[s.shirtSize] = (shirtCounts[s.shirtSize] || 0) + 1;
    if (s.pantsSize) pantsCounts[s.pantsSize] = (pantsCounts[s.pantsSize] || 0) + 1;
  });

  const cityMap = {};
  orders.forEach(o => {
    const city = (o.city || '').trim();
    if (city && city !== 'איסוף עצמי') cityMap[city] = (cityMap[city] || 0) + 1;
  });

  const statusCounts = {};
  orders.forEach(o => {
    const s = o.status || 'new';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const data = {
    הזמנות: orders.length,
    סטים: allSets.length,
    הכנסות_כולל: orders.reduce((s, o) => s + (o.total || 0), 0),
    שולם: orders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.total || 0), 0),
    ממתין: orders.filter(o => !o.status || o.status === 'new').reduce((s, o) => s + (o.total || 0), 0),
    משלוח: orders.filter(o => o.deliveryType === 'delivery').length,
    איסוף: orders.filter(o => o.deliveryType === 'pickup').length,
    סטטוסים: statusCounts,
    מידות_חולצות: shirtCounts,
    מידות_מכנסיים: pantsCounts,
    ערים_מובילות: Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5),
  };

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `נתח את נתוני ההזמנות של NEVO TACTICAL ותן תובנות עסקיות מעשיות בעברית:

${JSON.stringify(data, null, 2)}

ענה בנקודות קצרות עם אמוג'י. כלול: מצב עסקי כללי, מידות פופולריות ומשמעותן למלאי, תובנה על משלוח/איסוף, והמלצה אחת לפעולה מיידית.`,
      }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data2 = await res.json();
  return data2.content[0].text;
}
