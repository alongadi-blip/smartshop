const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
const SENDER_EMAIL    = defineSecret('SENDER_EMAIL');   // e.g. alon.gadi@gmail.com
const SENDER_NAME     = defineSecret('SENDER_NAME');    // e.g. נבו טקטיקל

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

function buildHtml({ title, preheader, bodyHtml }) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  body{margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;color:#e5e5e5;direction:rtl}
  .wrap{max-width:560px;margin:32px auto;background:#141414;border:1px solid #2a2a2a;border-radius:4px;overflow:hidden}
  .header{background:#1a1a1a;padding:24px 32px;border-bottom:2px solid #c8a96e;text-align:center}
  .brand{font-size:22px;font-weight:900;letter-spacing:4px;color:#c8a96e;text-transform:uppercase}
  .tagline{font-size:10px;color:#888;letter-spacing:3px;margin-top:4px;text-transform:uppercase}
  .body{padding:28px 32px}
  .status-badge{display:inline-block;padding:6px 18px;border-radius:2px;font-weight:800;font-size:13px;letter-spacing:1px;margin-bottom:20px}
  .status-sent{background:#16a34a22;color:#4ade80;border:1px solid #16a34a55}
  .status-paid{background:#1d4ed822;color:#60a5fa;border:1px solid #1d4ed855}
  .status-new{background:#92400e22;color:#fbbf24;border:1px solid #92400e55}
  h2{margin:0 0 6px;font-size:17px;font-weight:800;color:#fff}
  p{margin:0 0 12px;font-size:14px;color:#aaa;line-height:1.6}
  .order-box{background:#1e1e1e;border:1px solid #2a2a2a;border-radius:4px;padding:16px;margin:20px 0}
  .order-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #2a2a2a;font-size:13px}
  .order-row:last-child{border-bottom:none}
  .order-label{color:#888}
  .order-value{color:#e5e5e5;font-weight:600}
  .sets-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
  .sets-table th{text-align:right;color:#888;font-weight:600;padding:6px 8px;border-bottom:1px solid #2a2a2a}
  .sets-table td{padding:6px 8px;border-bottom:1px solid #1e1e1e;color:#ccc}
  .total-row{margin-top:12px;padding:10px 0 0;border-top:1px solid #c8a96e33;display:flex;justify-content:space-between;align-items:center}
  .total-label{font-size:13px;color:#888}
  .total-value{font-size:17px;font-weight:900;color:#c8a96e}
  .footer{padding:18px 32px;text-align:center;border-top:1px solid #2a2a2a}
  .footer p{font-size:11px;color:#555;margin:0}
</style>
</head>
<body>
<span style="display:none;max-height:0;overflow:hidden">${preheader}</span>
<div class="wrap">
  <div class="header">
    <div class="brand">NEVO TACTICAL</div>
    <div class="tagline">Combat Ready Apparel</div>
  </div>
  <div class="body">${bodyHtml}</div>
  <div class="footer"><p>נבו טקטיקל &mdash; לכל שאלה השב למייל זה</p></div>
</div>
</body>
</html>`;
}

function setsTable(sets) {
  if (!sets || sets.length === 0) return '';
  const rows = sets.map(s =>
    `<tr>
      <td>${s.shirtSize || '—'}</td>
      <td>${s.pantsSize || '—'}</td>
      <td>${s.quantity || 1}</td>
      <td>₪${s.setPrice || 0}</td>
    </tr>`
  ).join('');
  return `
  <table class="sets-table">
    <thead><tr><th>חולצה</th><th>מכנסיים</th><th>כמות</th><th>מחיר</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function deliveryInfo(order) {
  if (order.deliveryType === 'pickup') return 'איסוף עצמי';
  const parts = [order.city, order.address, order.zip].filter(Boolean);
  return parts.join(', ') || '—';
}

function newOrderEmail(order) {
  const body = `
    <span class="status-badge status-new">✓ הזמנה התקבלה</span>
    <h2>שלום ${order.name},</h2>
    <p>קיבלנו את הזמנתך. נצור קשר בהקדם לאישור תשלום ופרטי משלוח.</p>
    <div class="order-box">
      <div class="order-row"><span class="order-label">מספר הזמנה</span><span class="order-value">#${order.orderNumber}</span></div>
      <div class="order-row"><span class="order-label">טלפון</span><span class="order-value" dir="ltr">${order.phone}</span></div>
      <div class="order-row"><span class="order-label">משלוח</span><span class="order-value">${deliveryInfo(order)}</span></div>
      ${setsTable(order.sets)}
      <div class="total-row"><span class="total-label">סה"כ</span><span class="total-value">₪${order.total || 0}</span></div>
    </div>
    <p style="font-size:12px;color:#666">קיבלת מייל זה כי מסרת כתובת זו בטופס ההזמנה באתר נבו טקטיקל.</p>`;
  return {
    subject: `הזמנה #${order.orderNumber} התקבלה — נבו טקטיקל`,
    preheader: `קיבלנו את הזמנתך #${order.orderNumber}`,
    body,
  };
}

function paidOrderEmail(order) {
  const body = `
    <span class="status-badge status-paid">₪ תשלום אושר</span>
    <h2>שלום ${order.name},</h2>
    <p>התשלום עבור הזמנתך אושר. ההזמנה בהכנה לשליחה.</p>
    <div class="order-box">
      <div class="order-row"><span class="order-label">מספר הזמנה</span><span class="order-value">#${order.orderNumber}</span></div>
      <div class="order-row"><span class="order-label">סכום ששולם</span><span class="order-value">₪${order.total || 0}</span></div>
      <div class="order-row"><span class="order-label">משלוח</span><span class="order-value">${deliveryInfo(order)}</span></div>
    </div>`;
  return {
    subject: `הזמנה #${order.orderNumber} — תשלום אושר`,
    preheader: `התשלום עבור הזמנה #${order.orderNumber} אושר`,
    body,
  };
}

function sentOrderEmail(order) {
  const isPickup = order.deliveryType === 'pickup';
  const body = `
    <span class="status-badge status-sent">✓ ${isPickup ? 'מוכן לאיסוף' : 'נשלח'}</span>
    <h2>שלום ${order.name},</h2>
    <p>${isPickup
      ? 'הזמנתך מוכנה לאיסוף. נשמח לתאם זמן נוח.'
      : 'הזמנתך יצאה לדרך! הציוד שלך בדרך אליך.'
    }</p>
    <div class="order-box">
      <div class="order-row"><span class="order-label">מספר הזמנה</span><span class="order-value">#${order.orderNumber}</span></div>
      ${isPickup ? '' : `<div class="order-row"><span class="order-label">כתובת משלוח</span><span class="order-value">${deliveryInfo(order)}</span></div>`}
      ${setsTable(order.sets)}
      <div class="total-row"><span class="total-label">סה"כ</span><span class="total-value">₪${order.total || 0}</span></div>
    </div>
    <p>לשאלות — השב למייל זה או פנה אלינו ישירות.</p>`;
  return {
    subject: `הזמנה #${order.orderNumber} ${isPickup ? '— מוכנה לאיסוף' : 'נשלחה!'}`,
    preheader: isPickup ? `הזמנה #${order.orderNumber} מוכנה לאיסוף` : `הזמנה #${order.orderNumber} יצאה לדרך`,
    body,
  };
}

// ─── CLOUD FUNCTION ───────────────────────────────────────────────────────────

exports.sendOrderEmail = onCall({
  secrets: [SENDGRID_API_KEY, SENDER_EMAIL, SENDER_NAME],
  region: 'europe-west1',
}, async (request) => {
  const { order, trigger } = request.data; // trigger: 'new' | 'paid' | 'sent'

  if (!order?.email) throw new HttpsError('invalid-argument', 'Missing order email');
  if (!['new', 'paid', 'sent'].includes(trigger)) throw new HttpsError('invalid-argument', 'Invalid trigger');

  sgMail.setApiKey(SENDGRID_API_KEY.value());

  const builders = { new: newOrderEmail, paid: paidOrderEmail, sent: sentOrderEmail };
  const { subject, preheader, body } = builders[trigger](order);

  const msg = {
    to: order.email,
    from: { email: SENDER_EMAIL.value(), name: SENDER_NAME.value() },
    subject,
    html: buildHtml({ title: subject, preheader, bodyHtml: body }),
  };

  await sgMail.send(msg);
  return { success: true };
});
