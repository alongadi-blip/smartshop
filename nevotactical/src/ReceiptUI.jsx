import React, { useState, useEffect } from 'react';
import {
  PAYMENT_METHODS, loadBusiness, businessMissing, issueReceipt, updateReceipt, loadReceipt,
  loadPublicReceipt, buildReceiptPdf, receiptFileName, downloadBlob, sendReceiptWhatsApp,
  canShareFiles, sharePdfFile, receiptHtml, RECEIPT_CSS, receiptTotal, money, todayISO,
} from './receipts';

const IcWhatsApp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const Spinner = () => <span className="spinner" aria-hidden="true" />;
const dangerBtn = { background: 'transparent', borderColor: 'var(--danger)', color: 'var(--danger)' };

/**
 * קבלות של הזמנה: הפקת קבלה על תשלום אחד או כמה (פיצול), צפייה, עריכה ושליחה בוואטסאפ.
 * onPaymentsChanged(payments) — לעדכון ההזמנה במסך אחרי שהקבלה שינתה את התשלומים.
 */
export function OrderReceipts({ order, onPaymentsChanged }) {
  const payments    = order.payments || [];
  const open        = payments.filter(p => !p.receiptNumber && p.ts);
  const numbers     = [...new Set(payments.map(p => p.receiptNumber).filter(Boolean))].sort((a, b) => a - b);

  const [picking, setPicking]   = useState(false);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy]         = useState(null);
  const [view, setView]         = useState(null); // { receipt, blob, copy }
  const [editing, setEditing]   = useState(false);
  const [msg, setMsg]           = useState('');

  const startPick = () => { setSelected(open.map(p => p.ts)); setPicking(true); setView(null); };
  const toggle = ts => setSelected(s => s.includes(ts) ? s.filter(x => x !== ts) : [...s, ts]);
  const selectedSum = open.filter(p => selected.includes(p.ts)).reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const issue = async () => {
    setBusy('issue');
    try {
      const business = await loadBusiness();
      const missing = businessMissing(business);
      if (missing.length) {
        alert(`לפני הפקת קבלה צריך למלא בממשק הניהול ב"פרטי העסק לקבלות": ${missing.join(', ')}`);
        return;
      }
      const { receipt, payments: next } = await issueReceipt(order.id, selected, business);
      onPaymentsChanged(next);
      const blob = await buildReceiptPdf(receipt);
      downloadBlob(blob, receiptFileName(receipt));
      setPicking(false);
      setMsg('');
      setView({ receipt, blob, copy: false });
    } catch (e) {
      alert(e?.message || 'שגיאה בהפקת הקבלה');
    } finally {
      setBusy(null);
    }
  };

  const openReceipt = async (number) => {
    setBusy(number);
    try {
      const receipt = await loadReceipt(number);
      const blob = await buildReceiptPdf(receipt, { copy: true });
      setPicking(false); setEditing(false); setMsg('');
      setView({ receipt, blob, copy: true });
    } catch (e) {
      alert(e?.message || 'שגיאה בטעינת הקבלה');
    } finally {
      setBusy(null);
    }
  };

  const sendWa = async () => {
    try {
      const r = await sendReceiptWhatsApp(view.receipt);
      if (r !== view.receipt) setView(v => ({ ...v, receipt: r }));
      setMsg('נפתח צ׳אט עם הלקוח והקבלה בהודעה — נשאר ללחוץ "שלח".');
    } catch (e) {
      alert(e?.message || 'שגיאה בשליחה');
    }
  };

  const saveEdit = async (edited) => {
    const { receipt, payments: next } = await updateReceipt(edited);
    if (next) onPaymentsChanged(next);
    const blob = await buildReceiptPdf(receipt, { copy: true });
    setEditing(false);
    setMsg('✓ הקבלה עודכנה. הקישור שנשלח ללקוח מציג את הגרסה המעודכנת.');
    setView({ receipt, blob, copy: true });
  };

  return (
    <div style={{ marginTop: 10 }}>
      {(numbers.length > 0 || open.length > 0) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {numbers.map(n => (
            <button key={n} className="btn btn-ghost btn-xs" onClick={() => openReceipt(n)} disabled={busy != null}>
              {busy === n ? <Spinner /> : `קבלה ${n}`}
            </button>
          ))}
          {open.length > 0 && !picking && (
            <button className="btn btn-primary btn-xs" onClick={startPick} disabled={busy != null}>+ הפק קבלה</button>
          )}
        </div>
      )}

      {picking && (
        <div style={{ marginTop: 10, padding: 12, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <p style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>אילו תשלומים ייכללו בקבלה?</p>
          {open.map(p => (
            <label key={p.ts} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.includes(p.ts)} onChange={() => toggle(p.ts)} />
              <span style={{ fontWeight: 700 }}>₪{p.amount}</span>
              <span style={{ color: 'var(--text-muted)' }}>{PAYMENT_METHODS[p.method] || 'סוג לא צוין'}</span>
            </label>
          ))}
          {open.length > 1 && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 8px' }}>
              סמן כמה תשלומים כדי להוציא קבלה אחת על תשלום מפוצל.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={issue} disabled={!selected.length || busy != null}>
              {busy === 'issue' ? <><Spinner /> מפיק...</> : `הפק קבלה על ₪${selectedSum}`}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPicking(false)}>ביטול</button>
          </div>
        </div>
      )}

      {view && !editing && (
        <div style={{ marginTop: 10, padding: 12, border: '1px solid var(--accent)', background: 'var(--accent-dim)' }} role="status">
          <p style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
            {view.copy
              ? `קבלה מס' ${view.receipt.number} · ${money(receiptTotal(view.receipt))}`
              : `✓ קבלה מס' ${view.receipt.number} הופקה ונשמרה כ-PDF`}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-sm" style={{ borderColor: '#25d366', background: '#25d366', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}
              onClick={sendWa} disabled={!view.receipt.customer?.phone} title={view.receipt.customer?.phone ? undefined : 'אין טלפון ללקוח'}>
              <IcWhatsApp /> שלח ללקוח בוואטסאפ
            </button>
            {canShareFiles() && (
              <button className="btn btn-ghost btn-sm" onClick={() => sharePdfFile(view.blob, view.receipt).catch(() => {})}>שתף קובץ PDF</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => downloadBlob(view.blob, receiptFileName(view.receipt))}>הורד PDF</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(true); setMsg(''); }}>ערוך קבלה</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setView(null); setMsg(''); }}>סגור</button>
          </div>
          {msg && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{msg}</p>}
        </div>
      )}

      {view && editing && (
        <ReceiptEditor receipt={view.receipt} onSave={saveEdit} onCancel={() => setEditing(false)} />
      )}
    </div>
  );
}

function ReceiptEditor({ receipt, onSave, onCancel }) {
  const [d, setD] = useState(() => ({
    number: receipt.number,
    issueDate: receipt.issueDate || todayISO(),
    customer: { name: receipt.customer?.name || '', phone: receipt.customer?.phone || '' },
    goods: receipt.goods.map(g => ({ ...g })),
    payments: receipt.payments.map(p => ({ ...p })),
  }));
  const [saving, setSaving] = useState(false);

  const setList = (key, i, field, val) => setD(x => ({ ...x, [key]: x[key].map((it, idx) => idx === i ? { ...it, [field]: val } : it) }));
  const removeAt = (key, i) => setD(x => ({ ...x, [key]: x[key].filter((_, idx) => idx !== i) }));
  const total = d.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const save = async () => {
    if (!d.payments.length) return alert('בקבלה חייב להיות לפחות תשלום אחד.');
    if (d.payments.some(p => !(Number(p.amount) > 0) || !p.date)) return alert('בכל שורת תשלום חייבים סכום חיובי ומועד.');
    if (!d.goods.length || d.goods.some(g => !g.description.trim())) return alert('בכל שורת טובין חייב להיות תיאור.');
    setSaving(true);
    try { await onSave(d); }
    catch (e) { alert(e?.message || 'שגיאה בשמירה'); }
    setSaving(false);
  };

  return (
    <div style={{ marginTop: 10, padding: 12, border: '1px solid var(--accent)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontWeight: 800, fontSize: 13 }}>עריכת קבלה מס' {d.number}</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 130 }}>
          <label className="nt-field-label">תאריך המסמך</label>
          <input className="nt-input" type="date" value={d.issueDate} onChange={e => setD(x => ({ ...x, issueDate: e.target.value }))} />
        </div>
        <div style={{ flex: 2, minWidth: 150 }}>
          <label className="nt-field-label">שם הלקוח</label>
          <input className="nt-input" value={d.customer.name} onChange={e => setD(x => ({ ...x, customer: { ...x.customer, name: e.target.value } }))} />
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <label className="nt-field-label">טלפון</label>
          <input className="nt-input" type="tel" dir="ltr" style={{ textAlign: 'right' }} value={d.customer.phone} onChange={e => setD(x => ({ ...x, customer: { ...x.customer, phone: e.target.value } }))} />
        </div>
      </div>

      <div>
        <p className="nt-field-label">פרטי הטובין</p>
        {d.goods.map((g, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <input className="nt-input" style={{ flex: 3, minWidth: 180 }} value={g.description} placeholder="תיאור" onChange={e => setList('goods', i, 'description', e.target.value)} />
            <input className="nt-input" style={{ width: 64, textAlign: 'center' }} type="number" min="1" value={g.quantity} aria-label="כמות" onChange={e => setList('goods', i, 'quantity', e.target.value)} />
            <input className="nt-input" style={{ width: 90, textAlign: 'center' }} type="number" min="0" value={g.unitPrice} aria-label="מחיר יחידה" onChange={e => setList('goods', i, 'unitPrice', e.target.value)} />
            <button className="btn btn-xs" style={dangerBtn} onClick={() => removeAt('goods', i)} aria-label="מחק שורה">✕</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-xs" onClick={() => setD(x => ({ ...x, goods: [...x.goods, { description: '', quantity: 1, unitPrice: 0 }] }))}>+ שורת טובין</button>
      </div>

      <div>
        <p className="nt-field-label">פרטי התשלום</p>
        {d.payments.map((p, i) => (
          <div key={p.ts ?? `n${i}`} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <select className="nt-input" style={{ flex: 1, minWidth: 120 }} value={p.method || ''} onChange={e => setList('payments', i, 'method', e.target.value)}>
              <option value="">— סוג —</option>
              {Object.entries(PAYMENT_METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input className="nt-input" style={{ flex: 1, minWidth: 130 }} type="date" value={p.date || ''} onChange={e => setList('payments', i, 'date', e.target.value)} />
            <input className="nt-input" style={{ width: 90, textAlign: 'center' }} type="number" min="1" value={p.amount} aria-label="סכום" onChange={e => setList('payments', i, 'amount', e.target.value)} />
            <button className="btn btn-xs" style={dangerBtn} onClick={() => removeAt('payments', i)} aria-label="מחק תשלום">✕</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-xs" onClick={() => setD(x => ({ ...x, payments: [...x.payments, { method: '', date: todayISO(), amount: '' }] }))}>+ פיצול — תשלום נוסף</button>
        <p style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>סה"כ התקבל: {money(total)}</p>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>שינויי התשלום יעודכנו גם בתשלומי ההזמנה.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? <><Spinner /> שומר...</> : '✓ שמור קבלה'}</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>ביטול</button>
      </div>
    </div>
  );
}

/** הדף שהלקוח רואה כשהוא פותח את הקישור מהוואטסאפ: nevotactical.web.app/?r=token */
export function PublicReceiptPage({ token }) {
  const [state, setState] = useState({ status: 'loading' });
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadPublicReceipt(token)
      .then(r => setState(r ? { status: 'ok', receipt: r } : { status: 'missing' }))
      .catch(() => setState({ status: 'missing' }));
  }, [token]);

  useEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 24) / 794));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const download = async () => {
    setBusy(true);
    try {
      const blob = await buildReceiptPdf(state.receipt, { copy: null });
      downloadBlob(blob, receiptFileName(state.receipt));
    } finally { setBusy(false); }
  };

  if (state.status === 'loading') return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  if (state.status === 'missing') return <div style={{ padding: 40, textAlign: 'center', direction: 'rtl' }}>הקבלה לא נמצאה.</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#e9e9e4', padding: '16px 12px 40px', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={download} disabled={busy} style={{ padding: '12px 22px', fontWeight: 800 }}>
          {busy ? <><Spinner /> מכין...</> : `הורד קבלה ${state.receipt.number} (PDF)`}
        </button>
      </div>
      <style>{RECEIPT_CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ zoom, boxShadow: '0 2px 12px rgba(0,0,0,.15)' }}
          dangerouslySetInnerHTML={{ __html: receiptHtml(state.receipt, null) }} />
      </div>
    </div>
  );
}
