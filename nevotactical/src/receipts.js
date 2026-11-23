// ─── קבלות לעוסק פטור ─────────────────────────────────────────────────────────
// כל קבלה מתעדת תשלום אחד מתוך order.payments[].
//
//   settings/receiptCounter = { next }    — המספר הבא. מתחיל ב-100001, רץ ללא דילוגים.
//   settings/business       = פרטי העסק שמודפסים בראש הקבלה (נערכים באדמין).
//   receipts/{number}       = תמונת מצב של הקבלה כפי שהופקה. לא נערכת ולא נמחקת,
//                             כך שהפקה חוזרת של ה-PDF תמיד זהה למקור ("העתק נאמן למקור").
//
// הקצאת המספר, כתיבת הקבלה וסימון התשלום (payment.receiptNumber) קורים בטרנזקציה אחת,
// כדי שלא ייווצר מספר בלי קבלה או תשלום שקיבל שתי קבלות.

import { db } from './firebase';
import { doc, getDoc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

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

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatISODate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// שורות הטובין מתוך ההזמנה — סט אחד לכל צירוף מידות, ודמי משלוח אם נגבו.
function goodsOf(order) {
  const lines = (order.sets || []).map(s => {
    const qty = s.quantity || 1;
    const unit = s.setPrice || 0;
    return {
      description: `סט טקטי — חולצה ארוכה מידה ${s.shirtSize || '—'}, מכנסי קרגו מידה ${s.pantsSize || '—'}`,
      quantity: qty,
      unitPrice: unit,
      total: unit * qty,
    };
  });
  if (order.deliveryType === 'delivery' && typeof order.shipping === 'number' && order.shipping > 0) {
    lines.push({ description: 'דמי משלוח', quantity: 1, unitPrice: order.shipping, total: order.shipping });
  }
  return lines;
}

/**
 * מפיק קבלה לתשלום שמזוהה לפי ts. מחזיר את הקבלה ואת מערך התשלומים המעודכן.
 */
export async function issueReceipt(orderId, paymentTs, business) {
  return runTransaction(db, async (tx) => {
    const counterRef = doc(db, 'settings', 'receiptCounter');
    const orderRef   = doc(db, 'orders', orderId);
    const [counterSnap, orderSnap] = await Promise.all([tx.get(counterRef), tx.get(orderRef)]);
    if (!orderSnap.exists()) throw new Error('ההזמנה לא נמצאה');

    const order    = orderSnap.data();
    const payments = order.payments || [];
    const idx      = payments.findIndex(p => p.ts === paymentTs);
    if (idx === -1) throw new Error('התשלום לא נמצא — ייתכן שנערך. רענן ונסה שוב.');
    if (payments[idx].receiptNumber) throw new Error(`לתשלום הזה כבר הופקה קבלה מס' ${payments[idx].receiptNumber}`);

    const number  = Math.max(FIRST_RECEIPT_NUMBER, counterSnap.exists() ? counterSnap.data().next || 0 : 0);
    const payment = payments[idx];
    const receipt = {
      number,
      issueDate: todayISO(),
      business: {
        name: business.name || '', owner: business.owner || '', taxId: business.taxId || '',
        address: business.address || '', phone: business.phone || '', email: business.email || '',
      },
      customer: { name: order.name || '', phone: order.phone || '', email: order.email || '' },
      orderId,
      orderNumber: order.orderNumber || null,
      orderTotal: order.total || 0,
      goods: goodsOf(order),
      payment: {
        amount: Number(payment.amount) || 0,
        method: payment.method || '',
        date: payment.date || '',
        note: payment.note || '',
        ts: payment.ts,
      },
      createdAt: serverTimestamp(),
    };

    const nextPayments = payments.map((p, i) => i === idx ? { ...p, receiptNumber: number } : p);
    tx.set(doc(db, 'receipts', String(number)), receipt);
    tx.set(counterRef, { next: number + 1 });
    tx.update(orderRef, { payments: nextPayments });
    return { receipt, payments: nextPayments };
  });
}

export async function loadReceipt(number) {
  const snap = await getDoc(doc(db, 'receipts', String(number)));
  if (!snap.exists()) throw new Error(`קבלה ${number} לא נמצאה`);
  return snap.data();
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = n => `₪${Number(n || 0).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function receiptHtml(r, isCopy) {
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
  const goodsTotal = r.goods.reduce((s, g) => s + g.total, 0);
  const p = r.payment;

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
        <div class="doc-kind">${isCopy ? 'העתק נאמן למקור' : 'מקור'}</div>
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
      <tbody><tr>
        <td>${esc(PAYMENT_METHODS[p.method] || p.method || '—')}</td>
        <td class="c">${formatISODate(p.date) || '—'}</td>
        <td class="c">${money(p.amount)}</td>
      </tr></tbody>
    </table>

    <div class="sum"><span>סה"כ התקבל</span><span>${money(p.amount)}</span></div>

    <div class="foot">עוסק פטור — המסמך אינו חשבונית מס. המסמך הופק באופן ממוחשב.</div>
  </div>`;
}

const RECEIPT_CSS = `
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

/**
 * שולח את ה-PDF בוואטסאפ. בטלפון (ובדפדפנים שתומכים בשיתוף קבצים) נפתח חלון השיתוף
 * עם הקובץ מצורף — בוחרים וואטסאפ ואת הלקוח. אחרת: הקובץ יורד, ונפתח צ'אט עם הלקוח
 * כדי לצרף אותו ידנית. מחזיר 'shared' | 'fallback' | 'cancelled'.
 */
export async function shareReceiptWhatsApp(blob, receipt) {
  const name = receiptFileName(receipt);
  const text = `שלום ${receipt.customer.name}, מצורפת קבלה מס' ${receipt.number} על סך ${money(receipt.payment.amount)}. תודה, ${receipt.business.name}`;
  const file = new File([blob], name, { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `קבלה ${receipt.number}`, text });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, name);
  const num = waNumber(receipt.customer.phone);
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  return 'fallback';
}
