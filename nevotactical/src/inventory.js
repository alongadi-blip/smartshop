// ─── ניהול מלאי ──────────────────────────────────────────────────────────────
// המלאי כולו יושב במסמך אחד: settings/inventory
//
//   {
//     shirt: { total: { S: 50, ... }, ordered: { S: 3, ... } },
//     pants: { total: { ... },        ordered: { ... } },
//     updatedAt
//   }
//
//   total   — מה שנקלט למלאי הכללי. נערך רק מהאדמין.
//   ordered — כמה יחידות כבר תפוסות בהזמנות שלא בוטלו (הוזמן / שולם / נשלח).
//   זמין    — total פחות ordered. מחושב ולא נשמר, כדי שלא ייווצר סחף בין שני מספרים.
//
// כל הזמנה חדשה מגדילה את ordered באותה טרנזקציה שבה נוצרת ההזמנה, כך שאי אפשר
// למכור יחידה שאין לה כיסוי. ביטול, מחיקה או עריכה של הזמנה מחזירים את ההפרש.

import { db } from './firebase';
import {
  doc, collection, addDoc, getDoc, getDocs, runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

export const ROLES = ['shirt', 'pants'];
export const ROLE_LABELS = { shirt: 'חולצה ארוכה טקטית', pants: 'מכנסי קרגו' };

const invRef = () => doc(db, 'settings', 'inventory');

// הזמנה שבוטלה משחררת את היחידות שלה; כל שאר הסטטוסים תופסים מלאי.
export const holdsStock = (status) => (status || 'new') !== 'cancelled';

// ─── ספירת יחידות ────────────────────────────────────────────────────────────

// כמה יחידות מכל מוצר/מידה יש ברשימת סטים: { shirt: { M: 2 }, pants: { L: 2 } }
export function countUnits(sets = []) {
  const units = { shirt: {}, pants: {} };
  for (const s of sets || []) {
    const qty = Number(s?.quantity) || 1;
    if (s?.shirtSize) units.shirt[s.shirtSize] = (units.shirt[s.shirtSize] || 0) + qty;
    if (s?.pantsSize) units.pants[s.pantsSize] = (units.pants[s.pantsSize] || 0) + qty;
  }
  return units;
}

export function addUnits(...maps) {
  const out = { shirt: {}, pants: {} };
  for (const m of maps) {
    for (const role of ROLES) {
      for (const [size, qty] of Object.entries(m?.[role] || {})) {
        out[role][size] = (out[role][size] || 0) + qty;
      }
    }
  }
  return out;
}

export function negateUnits(units) {
  const out = { shirt: {}, pants: {} };
  for (const role of ROLES) {
    for (const [size, qty] of Object.entries(units?.[role] || {})) out[role][size] = -qty;
  }
  return out;
}

export const hasUnits = (units) =>
  ROLES.some(role => Object.values(units?.[role] || {}).some(v => v));

// סך היחידות התפוסות בכל ההזמנות שלא בוטלו
export const orderedFromOrders = (orders = []) =>
  addUnits(...orders.filter(o => holdsStock(o.status)).map(o => countUnits(o.sets)));

// ─── קריאה ───────────────────────────────────────────────────────────────────

export const emptyInventory = () => ({
  shirt: { total: {}, ordered: {} },
  pants: { total: {}, ordered: {} },
});

export function normalizeInventory(data) {
  const inv = emptyInventory();
  for (const role of ROLES) {
    inv[role] = {
      total:   { ...(data?.[role]?.total   || {}) },
      ordered: { ...(data?.[role]?.ordered || {}) },
    };
  }
  return inv;
}

export async function loadInventory() {
  const snap = await getDoc(invRef());
  return normalizeInventory(snap.exists() ? snap.data() : null);
}

export const totalOf     = (inv, role, size) => Number(inv?.[role]?.total?.[size])   || 0;
export const orderedOf   = (inv, role, size) => Number(inv?.[role]?.ordered?.[size]) || 0;
export const availableOf = (inv, role, size) => totalOf(inv, role, size) - orderedOf(inv, role, size);

// האם נקלט מלאי בכלל. עד שהאדמין קולט מלאי ראשון אין טעם לחסום הזמנות.
export const isTracked = (inv) =>
  ROLES.some(role => Object.values(inv?.[role]?.total || {}).some(v => Number(v) > 0));

// ─── כתיבה ───────────────────────────────────────────────────────────────────

function applyDelta(current, delta) {
  const next = normalizeInventory(current);
  for (const role of ROLES) {
    for (const [size, d] of Object.entries(delta?.[role] || {})) {
      if (!d) continue;
      next[role].ordered[size] = (Number(next[role].ordered[size]) || 0) + d;
    }
  }
  return next;
}

export class OutOfStockError extends Error {
  constructor(shortages) {
    super('out of stock');
    this.name = 'OutOfStockError';
    this.shortages = shortages; // [{ role, size, requested, available }]
  }
}

// אילו פריטים מתוך units אין להם כיסוי במלאי
function shortagesFor(inv, units) {
  const out = [];
  for (const role of ROLES) {
    for (const [size, qty] of Object.entries(units?.[role] || {})) {
      if (qty <= 0) continue;
      const available = availableOf(inv, role, size);
      if (qty > available) out.push({ role, size, requested: qty, available: Math.max(0, available) });
    }
  }
  return out;
}

export const shortageText = (shortages) =>
  (shortages || [])
    .map(s => `${ROLE_LABELS[s.role]} מידה ${s.size} — ${s.available > 0 ? `נשארו ${s.available} בלבד` : 'אזל מהמלאי'}`)
    .join('\n');

// יוצר הזמנה ותופס את היחידות שלה במלאי באותה טרנזקציה.
// נכשל עם OutOfStockError אם אין כיסוי — כך שלא נוצרת הזמנה שאי אפשר לספק.
export async function createOrderWithStock(orderData, sets) {
  const units = countUnits(sets);
  let orderNumber;

  const nextInv = await runTransaction(db, async (tx) => {
    const counterRef  = doc(db, 'settings', 'orderCounter');
    const counterSnap = await tx.get(counterRef);
    const invSnap     = await tx.get(invRef());

    const inv = normalizeInventory(invSnap.exists() ? invSnap.data() : null);
    if (isTracked(inv)) {
      const short = shortagesFor(inv, units);
      if (short.length) throw new OutOfStockError(short);
    }

    orderNumber = (counterSnap.exists() ? counterSnap.data().count : 0) + 1;
    tx.set(counterRef, { count: orderNumber });

    const updated = applyDelta(inv, units);
    // כל עוד האדמין לא קלט מלאי אין מסמך מלאי, ואין מה לעדכן —
    // יצירת המסמך שמורה לאדמין בלבד (ראה firestore.rules).
    if (invSnap.exists()) {
      tx.set(invRef(), { ...updated, updatedAt: serverTimestamp() }, { merge: true });
    }
    return updated;
  });

  // ההזמנה נכתבת רק אחרי שהיחידות נתפסו, כדי שלא תיווצר הזמנה בלי כיסוי במלאי.
  await addDoc(collection(db, 'orders'), { ...orderData, orderNumber });
  return { orderNumber, inventory: nextInv };
}

// משנה את ordered בהפרש נתון (חיובי = תופס, שלילי = משחרר). לשימוש האדמין.
export async function adjustOrdered(delta) {
  if (!hasUnits(delta)) return null;
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(invRef());
    const next = applyDelta(snap.exists() ? snap.data() : null, delta);
    tx.set(invRef(), { ...next, updatedAt: serverTimestamp() }, { merge: true });
    return next;
  });
}

// קליטת מלאי: שומר את הכמויות שהאדמין הזין ומיד מוריד מהן את כל ההזמנות
// שלא בוטלו — נשלחו, שולמו וממתינות לתשלום כאחד.
export async function saveTotals(totals) {
  const snap    = await getDocs(collection(db, 'orders'));
  const ordered = orderedFromOrders(snap.docs.map(d => d.data()));

  const next = emptyInventory();
  for (const role of ROLES) {
    next[role] = {
      total:   { ...(totals?.[role] || {}) },
      ordered: { ...(ordered[role]  || {}) },
    };
  }
  await runTransaction(db, async (tx) => {
    await tx.get(invRef());
    tx.set(invRef(), { ...next, updatedAt: serverTimestamp() }, { merge: true });
  });
  return next;
}

// מסנכרן מחדש את ordered מכל ההזמנות שבמסד, בלי לגעת בכמויות שנקלטו.
export async function resyncOrdered() {
  const snap    = await getDocs(collection(db, 'orders'));
  const ordered = orderedFromOrders(snap.docs.map(d => d.data()));

  return runTransaction(db, async (tx) => {
    const invSnap = await tx.get(invRef());
    const next = normalizeInventory(invSnap.exists() ? invSnap.data() : null);
    for (const role of ROLES) next[role].ordered = { ...(ordered[role] || {}) };
    tx.set(invRef(), { ...next, updatedAt: serverTimestamp() }, { merge: true });
    return next;
  });
}
