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

export async function getSizeRecommendation({ height, weight, build }) {
  const res = await groqPost([
    { role: 'system', content: STORE_CONTEXT },
    {
      role: 'user',
      content: `המלץ על מידת חולצה ומכנסיים לפי:
גובה: ${height} ס"מ | משקל: ${weight} ק"ג | מבנה: ${build}

ענה בדיוק בפורמט הזה (שלוש שורות בלבד):
חולצה: [S/M/L/XL/XXL/3XL/4XL/5XL]
מכנסיים: [S/M/L/XL/XXL/3XL/4XL/5XL]
הסבר: [משפט קצר אחד]`,
    },
  ]);
  const data = await res.json();
  return data.choices[0].message.content;
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
