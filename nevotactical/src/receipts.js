// ─── קבלות לעוסק פטור ─────────────────────────────────────────────────────────
// קבלה אחת מתעדת תשלום אחד או כמה (פיצול: למשל ₪500 בביט + ₪400 במזומן).
//
//   settings/receiptCounter = { next }    — המספר הבא. מתחיל ב-100001, רץ ללא דילוגים.
//   settings/business       = פרטי העסק שמודפסים בראש הקבלה (נערכים באדמין).
//   receipts/{number}       = הקבלה: פרטי עסק, לקוח, טובין ושורות תשלום. ניתנת לעריכה, לא למחיקה.
//   receiptLinks/{token}    = עותק ציבורי של הקבלה, נקרא רק לפי token אקראי — זה הקישור
//                             שנשלח ללקוח בוואטסאפ (nevotactical.web.app/?r=token).
//
// התשלומים בהזמנה (order.payments[]) ושורות התשלום בקבלה הם אותו מידע: כל תשלום שנכלל
// בקבלה מסומן ב-receiptNumber, ועריכת הקבלה מעדכנת גם אותם — באותה טרנזקציה.

import { db } from './firebase';
import { doc, getDoc, getDocs, collection, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

export const FIRST_RECEIPT_NUMBER = 100001;

export const PAYMENT_METHODS = { cash: 'מזומן', bank: 'העברה בנקאית', bit: 'ביט', paybox: 'פייבוקס' };

export const DEFAULT_BUSINESS = {
  name: 'נבו טקטיקל',
  owner: '',
  taxId: '',
  address: '',
  phone: '',
  email: '',
};

export async function loadBusiness() {
  const snap = await getDoc(doc(db, 'settings', 'business'));
  return { ...DEFAULT_BUSINESS, ...(snap.exists() ? snap.data() : {}) };
}

export async function saveBusiness(data) {
  await setDoc(doc(db, 'settings', 'business'), { ...data, updatedAt: serverTimestamp() });
}

export function businessMissing(b) {
  const missing = [];
  if (!b.name?.trim())  missing.push('שם העסק');
  if (!b.taxId?.trim()) missing.push('מספר עוסק פטור');
  return missing;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatISODate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export const money = n => `₪${Number(n || 0).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// קבלות מהגרסה הראשונה שמרו תשלום יחיד בשדה payment.
export function normalizeReceipt(r) {
  if (!r) return r;
  const payments = r.payments || (r.payment ? [r.payment] : []);
  const { payment, ...rest } = r;
  return { ...rest, payments };
}

export const receiptTotal = r => (r.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

function newToken() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

// שורות הטובין מתוך ההזמנה — סט אחד לכל צירוף מידות. דמי משלוח לא מפורטים בקבלה.
function goodsOf(order) {
  return (order.sets || []).map(s => {
    const qty = s.quantity || 1;
    const unit = s.setPrice || 0;
    return {
      description: `סט טקטי — חולצה ארוכה מידה ${s.shirtSize || '—'}, מכנסי קרגו מידה ${s.pantsSize || '—'}`,
      quantity: qty,
      unitPrice: unit,
      total: unit * qty,
    };
  });
}

const paymentLine = p => ({
  amount: Number(p.amount) || 0,
  method: p.method || '',
  date: p.date || '',
  ts: p.ts,
});

// מה שנחשף בקישור הציבורי — בלי מזהים פנימיים.
const publicCopy = r => ({
  number: r.number, issueDate: r.issueDate, business: r.business, customer: r.customer,
  orderNumber: r.orderNumber ?? null, goods: r.goods, payments: r.payments,
});

/**
 * מפיק קבלה אחת לתשלומים שמזוהים לפי ts. מחזיר את הקבלה ואת מערך התשלומים המעודכן של ההזמנה.
 */
export async function issueReceipt(orderId, paymentTsList, business) {
  return runTransaction(db, async (tx) => {
    const counterRef = doc(db, 'settings', 'receiptCounter');
    const orderRef   = doc(db, 'orders', orderId);
    const [counterSnap, orderSnap] = await Promise.all([tx.get(counterRef), tx.get(orderRef)]);
    if (!orderSnap.exists()) throw new Error('ההזמנה לא נמצאה');

    const order    = orderSnap.data();
    const payments = order.payments || [];
    const chosen   = payments.filter(p => paymentTsList.includes(p.ts));
    if (chosen.length !== paymentTsList.length) throw new Error('חלק מהתשלומים לא נמצאו — ייתכן שנערכו. רענן ונסה שוב.');
    const taken = chosen.find(p => p.receiptNumber);
    if (taken) throw new Error(`לתשלום על ₪${taken.amount} כבר הופקה קבלה מס' ${taken.receiptNumber}`);

    const number  = Math.max(FIRST_RECEIPT_NUMBER, counterSnap.exists() ? counterSnap.data().next || 0 : 0);
    const receipt = {
      number,
      issueDate: todayISO(),
      business: {
        name: business.name || '', owner: business.owner || '', taxId: business.taxId || '',
        address: business.address || '', phone: business.phone || '', email: business.email || '',
      },
      customer: { name: order.name || '', phone: order.phone || '' },
      orderId,
      orderNumber: order.orderNumber || null,
      goods: goodsOf(order),
      payments: chosen.map(paymentLine),
      linkToken: newToken(),
    };

    const nextPayments = payments.map(p => paymentTsList.includes(p.ts) ? { ...p, receiptNumber: number } : p);
    tx.set(doc(db, 'receipts', String(number)), { ...receipt, createdAt: serverTimestamp() });
    tx.set(doc(db, 'receiptLinks', receipt.linkToken), publicCopy(receipt));
    tx.set(counterRef, { next: number + 1 });
    tx.update(orderRef, { payments: nextPayments });
    return { receipt, payments: nextPayments };
  });
}

/**
 * שומר קבלה ערוכה (המספר לא משתנה) ומסנכרן את תשלומי ההזמנה לשורות התשלום שבה:
 * שורה קיימת מעדכנת את התשלום שלה, שורה חדשה נוספת כתשלום, ושורה שנמחקה משתחררת מהקבלה.
 */
export async function updateReceipt(edited) {
  return runTransaction(db, async (tx) => {
    const receiptRef = doc(db, 'receipts', String(edited.number));
    const receiptSnap = await tx.get(receiptRef);
    if (!receiptSnap.exists()) throw new Error(`קבלה ${edited.number} לא נמצאה`);
    const current = normalizeReceipt(receiptSnap.data());
    const orderRef = current.orderId ? doc(db, 'orders', current.orderId) : null;
    const orderSnap = orderRef ? await tx.get(orderRef) : null;

    const baseTs = Date.now();
    const lines = edited.payments.map((p, i) => ({ ...paymentLine(p), ts: p.ts ?? baseTs + i }));
    const receipt = {
      ...current,
      issueDate: edited.issueDate,
      customer: { ...current.customer, ...edited.customer },
      goods: edited.goods.map(g => {
        const quantity = Number(g.quantity) || 0, unitPrice = Number(g.unitPrice) || 0;
        return { description: g.description, quantity, unitPrice, total: quantity * unitPrice };
      }),
      payments: lines,
      linkToken: current.linkToken || newToken(),
    };

    let nextPayments = null;
    if (orderSnap?.exists()) {
      const old = orderSnap.data().payments || [];
      const byTs = Object.fromEntries(old.map(p => [p.ts, p]));
      const others = old
        .filter(p => p.receiptNumber !== receipt.number)
        .filter(p => !lines.some(l => l.ts === p.ts));
      const mine = lines.map(l => ({ note: byTs[l.ts]?.note || '', ...l, receiptNumber: receipt.number }));
      // תשלום שהוסר מהקבלה נשאר בהזמנה, רק בלי שיוך לקבלה
      const released = old
        .filter(p => p.receiptNumber === receipt.number && !lines.some(l => l.ts === p.ts))
        .map(({ receiptNumber, ...p }) => p);
      nextPayments = [...others, ...released, ...mine]
        .sort((a, b) => (a.ts || 0) - (b.ts || 0));
      tx.update(orderRef, { payments: nextPayments });
    }

    tx.set(receiptRef, { ...receipt, editedAt: serverTimestamp() });
    tx.set(doc(db, 'receiptLinks', receipt.linkToken), publicCopy(receipt));
    return { receipt, payments: nextPayments };
  });
}

export async function loadReceipt(number) {
  const snap = await getDoc(doc(db, 'receipts', String(number)));
  if (!snap.exists()) throw new Error(`קבלה ${number} לא נמצאה`);
  return normalizeReceipt(snap.data());
}

// לקבלות שהופקו לפני שהיה קישור ציבורי.
export async function ensureReceiptLink(receipt) {
  if (receipt.linkToken) return receipt;
  const linkToken = newToken();
  const next = { ...receipt, linkToken };
  await setDoc(doc(db, 'receiptLinks', linkToken), publicCopy(next));
  await setDoc(doc(db, 'receipts', String(receipt.number)), { linkToken }, { merge: true });
  return next;
}

export async function loadPublicReceipt(token) {
  const snap = await getDoc(doc(db, 'receiptLinks', token));
  return snap.exists() ? normalizeReceipt(snap.data()) : null;
}

export const receiptUrl = r => `${window.location.origin}/?r=${r.linkToken}`;

// ─── HTML + PDF ──────────────────────────────────────────────────────────────

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function receiptHtml(r, isCopy) {
  const b = r.business;
  const bizLines = [
    b.owner && esc(b.owner),
    `עוסק פטור מס' ${esc(b.taxId)}`,
    b.address && esc(b.address),
    [b.phone && `טל' ${esc(b.phone)}`, b.email && esc(b.email)].filter(Boolean).join(' · '),
  ].filter(Boolean).map(l => `<div>${l}</div>`).join('');

  const goodsRows = r.goods.map(g => `
    <tr>
      <td>${esc(g.description)}</td>
      <td class="c">${g.quantity}</td>
      <td class="c">${money(g.unitPrice)}</td>
      <td class="c">${money(g.total)}</td>
    </tr>`).join('');
  const goodsTotal = r.goods.reduce((s, g) => s + (g.total || 0), 0);
  const payRows = r.payments.map(p => `
    <tr>
      <td>${esc(PAYMENT_METHODS[p.method] || p.method || '—')}</td>
      <td class="c">${formatISODate(p.date) || '—'}</td>
      <td class="c">${money(p.amount)}</td>
    </tr>`).join('');

  return `
  <div class="rc">
    <div class="head">
      <div>
        <div class="biz">${esc(b.name)}</div>
        <div class="biz-lines">${bizLines}</div>
      </div>
      <div class="doc">
        <div class="doc-title">קבלה</div>
        <div class="doc-num">מס' ${r.number}</div>
        ${isCopy == null ? '' : `<div class="doc-kind">${isCopy ? 'העתק נאמן למקור' : 'מקור'}</div>`}
      </div>
    </div>

    <div class="meta">
      <div><span>תאריך המסמך:</span> ${formatISODate(r.issueDate)}</div>
      ${r.orderNumber ? `<div><span>הזמנה:</span> #${esc(r.orderNumber)}</div>` : ''}
    </div>

    <div class="box">
      <div class="lbl">לכבוד</div>
      <div class="cust">${esc(r.customer.name)}</div>
      ${r.customer.phone ? `<div dir="ltr" style="text-align:right">${esc(r.customer.phone)}</div>` : ''}
    </div>

    <div class="lbl">פרטי הטובין</div>
    <table>
      <thead><tr><th>תיאור</th><th class="c">כמות</th><th class="c">מחיר יחידה</th><th class="c">סה"כ</th></tr></thead>
      <tbody>${goodsRows}</tbody>
      <tfoot><tr><td colspan="3">סה"כ הזמנה</td><td class="c">${money(goodsTotal)}</td></tr></tfoot>
    </table>

    <div class="lbl">פרטי התשלום</div>
    <table>
      <thead><tr><th>אמצעי תשלום</th><th class="c">תאריך תשלום</th><th class="c">סכום</th></tr></thead>
      <tbody>${payRows}</tbody>
    </table>

    <div class="sum"><span>סה"כ התקבל</span><span>${money(receiptTotal(r))}</span></div>

    <div class="foot">עוסק פטור — המסמך אינו חשבונית מס. המסמך הופק באופן ממוחשב.</div>
  </div>`;
}

export const RECEIPT_CSS = `
  .rc { width: 794px; min-height: 1123px; box-sizing: border-box; padding: 56px 60px; direction: rtl;
        font-family: Arial, 'Segoe UI', sans-serif; color: #1a1a1a; background: #fff; font-size: 15px; line-height: 1.5; }
  .rc .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4a5d23; padding-bottom: 18px; }
  .rc .biz { font-size: 28px; font-weight: 800; color: #4a5d23; }
  .rc .biz-lines { font-size: 13px; color: #444; margin-top: 4px; }
  .rc .doc { text-align: left; }
  .rc .doc-title { font-size: 30px; font-weight: 800; }
  .rc .doc-num { font-size: 18px; font-weight: 700; }
  .rc .doc-kind { display: inline-block; margin-top: 6px; padding: 2px 10px; border: 1px solid #4a5d23; color: #4a5d23; font-size: 12px; font-weight: 700; }
  .rc .meta { display: flex; gap: 28px; margin: 18px 0; font-size: 14px; }
  .rc .meta span, .rc .lbl { color: #666; }
  .rc .lbl { font-size: 12px; font-weight: 700; letter-spacing: 1px; margin: 18px 0 6px; }
  .rc .box { border: 1px solid #ddd; padding: 12px 16px; }
  .rc .box .lbl { margin-top: 0; }
  .rc .cust { font-size: 17px; font-weight: 700; }
  .rc table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .rc th { background: #eef0e6; text-align: right; padding: 8px 10px; font-weight: 700; border: 1px solid #d6d9c8; }
  .rc td { padding: 8px 10px; border: 1px solid #e2e2e2; }
  .rc tfoot td { font-weight: 700; background: #fafafa; }
  .rc .c { text-align: center; }
  .rc .sum { display: flex; justify-content: space-between; margin-top: 22px; padding: 14px 18px; background: #4a5d23; color: #fff; font-size: 20px; font-weight: 800; }
  .rc .foot { margin-top: 40px; font-size: 11px; color: #888; text-align: center; }
`;

/** copy: true = "העתק נאמן למקור", false = "מקור", null = בלי סימון (הקישור ללקוח). */
export async function buildReceiptPdf(receipt, { copy = false } = {}) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;';
  host.innerHTML = `<style>${RECEIPT_CSS}</style>${receiptHtml(receipt, copy)}`;
  document.body.appendChild(host);
  try {
    const canvas = await html2canvas(host.querySelector('.rc'), { scale: 2, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const w = 210;
    const h = Math.min(297, (canvas.height * w) / canvas.width);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h);
    return pdf.output('blob');
  } finally {
    host.remove();
  }
}

/**
 * פותח חלון הדפסה עם כל הקבלות, ממוינות לפי מספר — קבלה בכל עמוד A4.
 * החלון נפתח מיד (לפני הטעינה) כדי שחוסם החלונות הקופצים לא יחסום אותו.
 */
export async function printAllReceipts() {
  const win = window.open('', '_blank');
  if (!win) throw new Error('הדפדפן חסם את חלון ההדפסה — אפשר חלונות קופצים לאתר ונסה שוב.');
  win.document.write('<p dir="rtl" style="font-family:Arial;padding:24px">טוען קבלות...</p>');
  try {
    const snap = await getDocs(collection(db, 'receipts'));
    const receipts = snap.docs.map(d => normalizeReceipt(d.data())).sort((a, b) => a.number - b.number);
    if (!receipts.length) {
      win.close();
      throw new Error('עדיין לא הופקו קבלות.');
    }
    const first = receipts[0].number, last = receipts[receipts.length - 1].number;
    win.document.open();
    win.document.write(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
      <title>קבלות ${first}–${last}</title>
      <style>
        ${RECEIPT_CSS}
        @page { size: A4; margin: 0; }
        body { margin: 0; background: #888; }
        .rc { margin: 16px auto; break-after: page; }
        @media print {
          body { background: #fff; }
          .rc { margin: 0; width: 210mm; min-height: 0; height: 296mm; overflow: hidden; }
        }
      </style></head><body>
      ${receipts.map(r => receiptHtml(r, true)).join('')}
      <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
      </body></html>`);
    win.document.close();
    return receipts.length;
  } catch (e) {
    if (!win.closed) win.close();
    throw e;
  }
}

export function receiptFileName(r) {
  return `קבלה-${r.number}.pdf`;
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '972' + d.slice(1);
  return d;
}

function waText(r) {
  return `שלום ${r.customer.name}, מצורפת קבלה מס' ${r.number} על סך ${money(receiptTotal(r))}:\n${receiptUrl(r)}\n\nתודה, ${r.business.name}`;
}

/**
 * פותח צ'אט וואטסאפ עם הלקוח, עם הודעה מוכנה שמכילה קישור ל-PDF של הקבלה — נשאר רק ללחוץ "שלח".
 * החלון נפתח מיד (לפני ה-await) כדי שחוסם החלונות הקופצים לא יחסום אותו.
 */
export async function sendReceiptWhatsApp(receipt) {
  const win = window.open('', '_blank');
  try {
    const r = await ensureReceiptLink(receipt);
    const url = `https://wa.me/${waNumber(r.customer.phone)}?text=${encodeURIComponent(waText(r))}`;
    if (win) win.location.href = url; else window.location.href = url;
    return r;
  } catch (e) {
    win?.close();
    throw e;
  }
}

/** שיתוף הקובץ עצמו (בטלפון): פותח את חלון השיתוף של המכשיר עם ה-PDF מצורף. */
export const canShareFiles = () => {
  try {
    return !!navigator.canShare?.({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] });
  } catch { return false; }
};

export async function sharePdfFile(blob, receipt) {
  const file = new File([blob], receiptFileName(receipt), { type: 'application/pdf' });
  try {
    await navigator.share({ files: [file], title: `קבלה ${receipt.number}` });
  } catch (e) {
    if (e?.name !== 'AbortError') throw e;
  }
}
