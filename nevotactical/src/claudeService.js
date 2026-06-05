const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

function apiKey() {
  return import.meta.env.VITE_GROQ_API_KEY;
}

const STORE_CONTEXT = `אתה עוזר לקוחות של NEVO TACTICAL, חנות ציוד טקטי ישראלית.
הם מוכרים סט טקטי מקצועי: חולצה ארוכה טקטית + מכנסי קרגו. מחיר: ₪450 בערך.
מידות זמינות: S, M, L, XL, XXL, 3XL, 4XL, 5XL.
משלוח: ₪50 להזמנה אחת. 2+ סטים — תיאום טלפוני. ניתן לאסוף עצמאית ללא עלות.
ניתן לבחור מידה שונה לחולצה ולמכנסיים.`;

async function groqPost(messages, stream = false) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      stream,
      max_tokens: stream ? 1024 : 512,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error('Groq error', res.status, errBody);
    throw new Error(`API error ${res.status}`);
  }
  return res;
}

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];

function calcSize(weight, build) {
  // weight is the primary factor
  let idx;
  if (weight < 65)       idx = 0; // S
  else if (weight < 76)  idx = 1; // M
  else if (weight < 88)  idx = 2; // L
  else if (weight < 100) idx = 3; // XL
  else if (weight < 115) idx = 4; // XXL
  else if (weight < 132) idx = 5; // 3XL
  else if (weight < 152) idx = 6; // 4XL
  else                   idx = 7; // 5XL

  if (build === 'גדול/שרירי') idx = Math.min(idx + 1, 7);
  if (build === 'קטן/רזה')    idx = Math.max(idx - 1, 0);
  return SIZES[idx];
}

export async function getSizeRecommendation({ height, weight, build }) {
  const h = Number(height), w = Number(weight);
  const size = calcSize(w, build);

  const res = await groqPost([
    { role: 'system', content: 'אתה עוזר קצר ומדויק. ענה במשפט אחד בלבד בעברית.' },
    {
      role: 'user',
      content: `לקוח בגובה ${h} ס"מ, משקל ${w} ק"ג, מבנה ${build} — קיבל מידה ${size}. כתוב משפט הסבר קצר ומשכנע אחד בלבד (ללא פסיקים מיותרים, ללא חזרה על המידה).`,
    },
  ]);
  const data = await res.json();
  const explanation = data.choices[0].message.content.trim();
  return `חולצה: ${size}\nמכנסיים: ${size}\nהסבר: ${explanation}`;
}

export async function streamChatMessage(messages, onToken) {
  const groqMessages = [
    { role: 'system', content: `${STORE_CONTEXT}\nענה בעברית בצורה קצרה, ברורה וידידותית.` },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const res = await groqPost(groqMessages, true);

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
      if (payload === '[DONE]') continue;
      try {
        const event = JSON.parse(payload);
        const text = event.choices?.[0]?.delta?.content;
        if (text) onToken(text);
      } catch { /* ignore */ }
    }
  }
}

export async function askAdminQuestion(question, orders) {
  const allSets = orders.flatMap(o =>
    (o.sets || []).flatMap(s => Array(s.quantity || 1).fill(s))
  );
  const shirtCounts = {}, pantsCounts = {};
  allSets.forEach(s => {
    if (s.shirtSize) shirtCounts[s.shirtSize] = (shirtCounts[s.shirtSize] || 0) + 1;
    if (s.pantsSize) pantsCounts[s.pantsSize] = (pantsCounts[s.pantsSize] || 0) + 1;
  });
  const statusCounts = {};
  orders.forEach(o => { const st = o.status || 'new'; statusCounts[st] = (statusCounts[st] || 0) + 1; });

  const summary = {
    סה_כ_הזמנות: orders.length,
    סה_כ_סטים: allSets.length,
    הכנסות_כולל: orders.reduce((s, o) => s + (o.total || 0), 0),
    שולם: orders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.total || 0), 0),
    סטטוסים: statusCounts,
    מידות_חולצות: shirtCounts,
    מידות_מכנסיים: pantsCounts,
    הזמנות_פירוט: orders.map(o => ({
      מספר: o.orderNumber,
      שם: o.name,
      עיר: o.city,
      סטטוס: o.status || 'new',
      סכום: o.total || 0,
      סטים: (o.sets || []).map(s => `חולצה ${s.shirtSize} מכנסיים ${s.pantsSize} ×${s.quantity || 1}`),
      תאריך: o.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '',
    })),
  };

  const res = await groqPost([
    { role: 'system', content: `אתה מנהל נתונים חכם של NEVO TACTICAL. ענה בעברית בצורה קצרה וממוקדת. הנה נתוני ההזמנות:\n${JSON.stringify(summary, null, 2)}` },
    { role: 'user', content: question },
  ]);
  const data = await res.json();
  return data.choices[0].message.content;
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

  const res = await groqPost([
    { role: 'system', content: STORE_CONTEXT },
    {
      role: 'user',
      content: `נתח את נתוני ההזמנות של NEVO TACTICAL ותן תובנות עסקיות מעשיות בעברית:

${JSON.stringify(data, null, 2)}

ענה בנקודות קצרות עם אמוג'י. כלול: מצב עסקי כללי, מידות פופולריות ומשמעותן למלאי, תובנה על משלוח/איסוף, והמלצה אחת לפעולה מיידית.`,
    },
  ]);
  const data2 = await res.json();
  return data2.choices[0].message.content;
}
