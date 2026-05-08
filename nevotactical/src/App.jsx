import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { PRODUCTS } from './products';

const ADMIN_PASSWORD = 'NevoAdmin2025';

const C = {
  bg: '#f2f4f0',
  card: '#ffffff',
  cardHover: '#f8f9f6',
  accent: '#4a6b1e',
  accentHover: '#5a8025',
  text: '#1a1a1a',
  muted: '#888',
  border: '#dde0d8',
  danger: '#c0392b',
  success: '#27ae60',
  overlay: 'rgba(0,0,0,0.6)',
  blue: '#2980b9',
  purple: '#7d5fa5',
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]         = useState(window.location.hash === '#admin' ? 'admin' : 'home');
  const [cart, setCart]         = useState([]);
  const [sizeModal, setSizeModal] = useState(null); // product to add
  const [adminAuth, setAdminAuth] = useState(false);
  const [orders, setOrders]     = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash;
      if (h === '#admin') setPage('admin');
      else if (h === '#cart') setPage('cart');
      else setPage('home');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goHome  = () => { window.location.hash = '';      setPage('home');  setAdminAuth(false); };
  const goCart  = () => { window.location.hash = 'cart';  setPage('cart');  };
  const goAdmin = () => { window.location.hash = 'admin'; setPage('admin'); };

  const addToCart = (product, size) => {
    setCart(c => [...c, { key: Date.now() + Math.random(), productId: product.id, productName: product.name, size, imageUrl: product.imageUrl, color1: product.color1, color2: product.color2, letter: product.letter }]);
    setSizeModal(null);
  };

  const removeFromCart = (key) => setCart(c => c.filter(i => i.key !== key));

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoadingOrders(false);
  };

  if (page === 'admin') {
    if (!adminAuth) return <AdminLogin onLogin={pwd => { if (pwd === ADMIN_PASSWORD) { setAdminAuth(true); loadOrders(); } else alert('סיסמה שגויה'); }} onBack={goHome} />;
    return <AdminDashboard orders={orders} loading={loadingOrders} onBack={goHome} onRefresh={loadOrders} />;
  }

  if (page === 'cart') {
    return <CartPage cart={cart} onRemove={removeFromCart} onBack={goHome} onOrderDone={() => { setCart([]); }} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Assistant', sans-serif" }}>
      <Header cartCount={cart.length} onCart={goCart} onAdmin={goAdmin} />
      <ProductGrid products={PRODUCTS} onSelect={p => setSizeModal(p)} />
      <Footer />
      {sizeModal && <SizeModal product={sizeModal} onAdd={addToCart} onClose={() => setSizeModal(null)} />}
    </div>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function Header({ cartCount, onCart, onAdmin }) {
  return (
    <header style={{
      background: '#fff', borderBottom: `1px solid ${C.border}`,
      padding: '0 24px', height: '58px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '34px', height: '34px', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#fff', fontSize: '13px', letterSpacing: '1px' }}>NT</div>
        <span style={{ color: C.text, fontWeight: '700', fontSize: '17px', letterSpacing: '3px' }}>NEVO TACTICAL</span>
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={onCart} style={{
          background: cartCount > 0 ? C.accent : 'transparent',
          border: `1px solid ${cartCount > 0 ? C.accent : C.border}`,
          color: cartCount > 0 ? '#fff' : C.muted,
          padding: '6px 16px', cursor: 'pointer', fontSize: '13px',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '7px',
          transition: 'all 0.2s',
        }}>
          סל
          {cartCount > 0 && (
            <span style={{ background: '#fff', color: C.accent, borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>{cartCount}</span>
          )}
        </button>
        <button onClick={onAdmin} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '6px 14px', cursor: 'pointer', fontSize: '11px', letterSpacing: '2px', fontFamily: 'inherit' }}>ADMIN</button>
      </div>
    </header>
  );
}

// ─── PRODUCT GRID ─────────────────────────────────────────────────────────────
function ProductGrid({ products, onSelect }) {
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
      <p style={{ color: C.muted, fontSize: '11px', letterSpacing: '3px', marginBottom: '24px' }}>קולקציה — {products.length} פריטים</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
        {products.map(p => <ProductCard key={p.id} product={p} onClick={() => onSelect(p)} />)}
      </div>
    </main>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product: p, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? C.cardHover : C.card, border: `1px solid ${hovered ? C.accent : C.border}`, cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden', boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.08)' : 'none' }}>
      <div style={{ height: '220px', background: `linear-gradient(145deg, ${p.color1} 0%, ${p.color2} 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px', transition: 'transform 0.3s', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
        ) : (
          <div style={{ width: '72px', height: '72px', border: '2px solid rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: 'rgba(255,255,255,0.4)' }}>{p.letter}</div>
        )}
        <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', padding: '3px 10px', fontSize: '10px', letterSpacing: '2px' }}>{p.category.toUpperCase()}</div>
      </div>
      <div style={{ padding: '16px' }}>
        <h3 style={{ color: C.text, margin: '0 0 6px', fontSize: '15px', fontWeight: '600' }}>{p.name}</h3>
        <p style={{ color: C.muted, margin: '0 0 12px', fontSize: '12px', lineHeight: '1.6' }}>{p.description}</p>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {p.sizes.map(s => <span key={s} style={{ border: `1px solid ${C.border}`, color: C.muted, padding: '2px 8px', fontSize: '10px', letterSpacing: '1px' }}>{s}</span>)}
        </div>
        <button style={{ width: '100%', background: hovered ? C.accentHover : C.accent, color: '#fff', border: 'none', padding: '9px', cursor: 'pointer', fontSize: '12px', letterSpacing: '2px', fontWeight: '700', transition: 'background 0.2s', fontFamily: 'inherit' }}>
          הוסף לסל
        </button>
      </div>
    </div>
  );
}

// ─── SIZE MODAL ───────────────────────────────────────────────────────────────
function SizeModal({ product: p, onAdd, onClose }) {
  const [size, setSize] = useState('');
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!size) return;
    onAdd(p, size);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: C.overlay, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, width: '100%', maxWidth: '380px', position: 'relative', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', left: '12px', background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '22px', zIndex: 1, lineHeight: 1 }}>×</button>

        {/* Banner */}
        <div style={{ height: '100px', background: `linear-gradient(135deg, ${p.color1} 0%, ${p.color2} 100%)`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: '14px', overflow: 'hidden', position: 'relative' }}>
          {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />}
          <div style={{ width: '50px', height: '50px', flexShrink: 0, border: '2px solid rgba(255,255,255,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', position: 'relative', zIndex: 1 }}>{p.letter}</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>{p.name}</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: '3px 0 0', fontSize: '12px' }}>{p.description}</p>
          </div>
        </div>

        <div style={{ padding: '24px', direction: 'rtl' }}>
          <label style={{ display: 'block', color: C.muted, fontSize: '11px', letterSpacing: '2px', marginBottom: '12px' }}>
            בחר גודל {!size && <span style={{ color: C.danger }}>*</span>}
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {p.sizes.map(s => (
              <button key={s} onClick={() => setSize(s)} style={{
                padding: '10px 18px', minWidth: '54px',
                background: size === s ? C.accent : '#f8f9f6',
                border: `1px solid ${size === s ? C.accent : C.border}`,
                color: size === s ? '#fff' : C.text,
                cursor: 'pointer', fontSize: '13px', letterSpacing: '1px',
                transition: 'all 0.15s', fontFamily: 'inherit', fontWeight: size === s ? '700' : '400',
              }}>{s}</button>
            ))}
          </div>
          <button onClick={handleAdd} disabled={!size} style={{
            width: '100%', background: !size ? '#ccc' : (added ? C.success : C.accent),
            color: '#fff', border: 'none', padding: '14px',
            cursor: !size ? 'not-allowed' : 'pointer',
            fontSize: '14px', letterSpacing: '2px', fontWeight: '700',
            transition: 'background 0.2s', fontFamily: 'inherit',
          }}>
            {added ? 'נוסף לסל!' : 'הוסף לסל'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CART PAGE ────────────────────────────────────────────────────────────────
function CartPage({ cart, onRemove, onBack, onOrderDone }) {
  const [mode, setMode]     = useState('delivery');
  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');
  const [city, setCity]     = useState('');
  const [address, setAddress] = useState('');
  const [zip, setZip]       = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]     = useState(false);

  const validate = () => {
    const e = {};
    if (!name.trim())  e.name  = true;
    if (!phone.trim()) e.phone = true;
    if (mode === 'delivery') {
      if (!city.trim())    e.city    = true;
      if (!address.trim()) e.address = true;
    }
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'orders'), {
        items: cart.map(i => ({ productId: i.productId, productName: i.productName, size: i.size })),
        deliveryType: mode,
        name: name.trim(),
        phone: phone.trim(),
        city: mode === 'delivery' ? city.trim() : 'איסוף עצמי',
        address: mode === 'delivery' ? address.trim() : '',
        zip: mode === 'delivery' ? zip.trim() : '',
        timestamp: serverTimestamp(),
      });
      setDone(true);
      onOrderDone();
    } catch (err) {
      console.error(err);
      alert('שגיאה בשמירה. נסה שוב.');
    }
    setSubmitting(false);
  };

  const inp = (err) => ({
    width: '100%', background: '#f8f9f6',
    border: `1px solid ${err ? C.danger : C.border}`,
    color: C.text, padding: '10px 12px', fontSize: '14px',
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', direction: 'rtl',
  });

  const lbl = (text, err) => (
    <label style={{ display: 'block', color: err ? C.danger : C.muted, fontSize: '11px', letterSpacing: '2px', marginBottom: '8px' }}>
      {text}{err ? ' — שדה חובה' : ''}
    </label>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Assistant', sans-serif", color: C.text }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '0 24px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '2px' }}>הסל שלך</span>
        <button onClick={onBack} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>המשך קנייה</button>
      </header>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '28px 20px', direction: 'rtl' }}>

        {done ? (
          /* ── Success ── */
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '64px', height: '64px', background: C.success, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px', color: '#fff', fontWeight: '700' }}>✓</div>
            <h2 style={{ marginBottom: '10px', fontSize: '22px' }}>ההזמנה נשלחה!</h2>
            <p style={{ color: C.muted, marginBottom: '8px' }}>
              {mode === 'delivery' ? `משלוח: ${address}, ${city}` : 'איסוף עצמי'}
            </p>
            <p style={{ color: C.muted, fontSize: '13px', marginBottom: '28px' }}>נחזור אליך בקרוב.</p>
            <button onClick={onBack} style={{ background: C.accent, color: '#fff', border: 'none', padding: '12px 32px', cursor: 'pointer', fontSize: '14px', letterSpacing: '2px', fontFamily: 'inherit' }}>
              חזרה לחנות
            </button>
          </div>

        ) : cart.length === 0 ? (
          /* ── Empty cart ── */
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ color: C.muted, fontSize: '16px', marginBottom: '20px' }}>הסל ריק</p>
            <button onClick={onBack} style={{ background: C.accent, color: '#fff', border: 'none', padding: '12px 28px', cursor: 'pointer', fontSize: '13px', letterSpacing: '2px', fontFamily: 'inherit' }}>חזרה לחנות</button>
          </div>

        ) : (<>

          {/* Cart items */}
          <div style={{ marginBottom: '28px' }}>
            <p style={{ color: C.muted, fontSize: '11px', letterSpacing: '2px', marginBottom: '12px' }}>פריטים בסל ({cart.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cart.map(item => (
                <div key={item.key} style={{ background: C.card, border: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', background: `linear-gradient(145deg, ${item.color1}, ${item.color2})`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontWeight: '700' }}>{item.letter}</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.productName}</div>
                    <div style={{ color: C.muted, fontSize: '12px' }}>גודל: <span style={{ color: C.accent, fontWeight: '700' }}>{item.size}</span></div>
                  </div>
                  <button onClick={() => onRemove(item.key)} style={{ background: 'transparent', border: 'none', color: C.danger, cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '4px' }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery type */}
          <div style={{ marginBottom: '20px' }}>
            {lbl('אופן קבלה', false)}
            <div style={{ display: 'flex', gap: '8px' }}>
              {[['delivery', 'משלוח לבית'], ['pickup', 'איסוף עצמי']].map(([v, label]) => (
                <button key={v} onClick={() => setMode(v)} style={{ flex: 1, padding: '10px', background: mode === v ? C.accent : '#f8f9f6', border: `1px solid ${mode === v ? C.accent : C.border}`, color: mode === v ? '#fff' : C.text, cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s', fontFamily: 'inherit' }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lbl('פרטי קשר', errors.name || errors.phone)}
            <input placeholder="שם מלא" value={name} onChange={e => { setName(e.target.value); setErrors(x => ({ ...x, name: false })); }} style={inp(errors.name)} />
            <input placeholder="טלפון" type="tel" value={phone} onChange={e => { setPhone(e.target.value); setErrors(x => ({ ...x, phone: false })); }} style={inp(errors.phone)} />
          </div>

          {/* Address */}
          {mode === 'delivery' && (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lbl('כתובת למשלוח', errors.city || errors.address)}
              <input placeholder="עיר" value={city} onChange={e => { setCity(e.target.value); setErrors(x => ({ ...x, city: false })); }} style={inp(errors.city)} />
              <input placeholder="רחוב ומספר" value={address} onChange={e => { setAddress(e.target.value); setErrors(x => ({ ...x, address: false })); }} style={inp(errors.address)} />
              <input placeholder="מיקוד (אופציונלי)" value={zip} onChange={e => setZip(e.target.value)} style={inp(false)} />
            </div>
          )}

          <button onClick={submit} disabled={submitting} style={{
            width: '100%', background: submitting ? '#aaa' : C.accent,
            color: '#fff', border: 'none', padding: '16px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: '15px', letterSpacing: '2px', fontWeight: '700',
            fontFamily: 'inherit', marginBottom: '32px',
          }}>
            {submitting ? 'שולח...' : `אישור הזמנה (${cart.length} פריטים)`}
          </button>

        </>)}
      </div>
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin, onBack }) {
  const [pwd, setPwd] = useState('');
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Assistant', sans-serif" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '44px 36px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
        <div style={{ width: '44px', height: '44px', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontWeight: '700', color: '#fff', fontSize: '13px' }}>NT</div>
        <h2 style={{ color: C.text, marginBottom: '28px', fontSize: '15px', letterSpacing: '3px', fontWeight: '600' }}>ADMIN PANEL</h2>
        <input type="password" placeholder="סיסמה" value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onLogin(pwd)}
          style={{ width: '100%', background: '#f8f9f6', border: `1px solid ${C.border}`, color: C.text, padding: '11px', fontSize: '16px', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '6px', fontFamily: 'inherit', outline: 'none', marginBottom: '10px', direction: 'ltr' }}
        />
        <button onClick={() => onLogin(pwd)} style={{ width: '100%', background: C.accent, color: '#fff', border: 'none', padding: '11px', cursor: 'pointer', fontSize: '13px', letterSpacing: '2px', fontFamily: 'inherit', marginBottom: '12px' }}>כניסה</button>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>חזרה לחנות</button>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({ orders, loading, onBack, onRefresh }) {
  // Flatten items from all orders
  const allItems = orders.flatMap(o =>
    (o.items || [{ productName: o.productName, size: o.size }]).map(item => ({
      ...item, deliveryType: o.deliveryType, city: o.city,
    }))
  );

  const bySizeProduct = {};
  const cityMap = {};

  allItems.forEach(item => {
    if (!bySizeProduct[item.productName]) bySizeProduct[item.productName] = {};
    bySizeProduct[item.productName][item.size] = (bySizeProduct[item.productName][item.size] || 0) + 1;
  });

  orders.forEach(o => {
    const city = (o.city || '').trim() || 'לא צוין';
    cityMap[city] = (cityMap[city] || 0) + 1;
  });

  const allSizes = [...new Set(allItems.map(i => i.size))].sort((a, b) => {
    const order = ['XS','S','M','L','XL','XXL','One Size'];
    return order.indexOf(a) - order.indexOf(b);
  });

  const sortedCities = Object.entries(cityMap).filter(([c]) => c !== 'איסוף עצמי').sort((a, b) => b[1] - a[1]);
  const deliveryCount = orders.filter(o => o.deliveryType === 'delivery').length;
  const pickupCount   = orders.filter(o => o.deliveryType === 'pickup').length;

  const exportCSV = () => {
    const headers = ['שם','טלפון','סוג','עיר','כתובת','מיקוד','מוצר','גודל','תאריך'];
    const rows = orders.flatMap(o =>
      (o.items || [{ productName: o.productName, size: o.size }]).map(item => [
        o.name, o.phone,
        o.deliveryType === 'delivery' ? 'משלוח' : 'איסוף עצמי',
        o.city, o.address, o.zip,
        item.productName, item.size,
        o.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '',
      ])
    );
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nevotactical_orders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const th = { padding: '9px 14px', background: '#f0f2ee', borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: '10px', letterSpacing: '1px', fontWeight: '400', textAlign: 'right', whiteSpace: 'nowrap' };
  const td = { padding: '10px 14px', borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: '13px', textAlign: 'right' };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, direction: 'rtl', fontFamily: "'Assistant', sans-serif" }}>
      <header style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '0 24px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontWeight: '700', letterSpacing: '2px', fontSize: '14px' }}>NT — ADMIN DASHBOARD</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onRefresh} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '5px 14px', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', fontFamily: 'inherit' }}>רענן</button>
          <button onClick={onBack} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '5px 14px', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', fontFamily: 'inherit' }}>יציאה</button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 20px' }}>
        {loading ? (
          <p style={{ color: C.muted, textAlign: 'center', padding: '60px 0' }}>טוען הזמנות...</p>
        ) : orders.length === 0 ? (
          <p style={{ color: C.muted, textAlign: 'center', padding: '60px 0' }}>אין הזמנות עדיין.</p>
        ) : (<>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
            {[['הזמנות', orders.length, C.accent], ['פריטים', allItems.length, '#5a6e3a'], ['משלוח', deliveryCount, C.blue], ['איסוף', pickupCount, C.purple]].map(([label, value, color]) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, padding: '18px 22px', flex: '1', minWidth: '110px' }}>
                <div style={{ color: C.muted, fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}>{label}</div>
                <div style={{ color, fontSize: '30px', fontWeight: '700' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Product × Size */}
          <section style={{ marginBottom: '28px' }}>
            <h3 style={{ color: C.muted, fontSize: '11px', letterSpacing: '2px', marginBottom: '10px', fontWeight: '400' }}>פריטים לפי מוצר וגודל</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: C.card, border: `1px solid ${C.border}` }}>
                <thead><tr>
                  <th style={th}>מוצר</th>
                  {allSizes.map(s => <th key={s} style={{ ...th, textAlign: 'center' }}>{s}</th>)}
                  <th style={{ ...th, textAlign: 'center' }}>סה"כ</th>
                </tr></thead>
                <tbody>
                  {Object.entries(bySizeProduct).map(([pname, sizes]) => {
                    const total = Object.values(sizes).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={pname}>
                        <td style={td}>{pname}</td>
                        {allSizes.map(s => <td key={s} style={{ ...td, textAlign: 'center', color: sizes[s] ? C.accent : C.border, fontWeight: sizes[s] ? '600' : '400' }}>{sizes[s] || '—'}</td>)}
                        <td style={{ ...td, textAlign: 'center', fontWeight: '700', color: C.accent }}>{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* City summary */}
          {sortedCities.length > 0 && (
            <section style={{ marginBottom: '28px' }}>
              <h3 style={{ color: C.muted, fontSize: '11px', letterSpacing: '2px', marginBottom: '10px', fontWeight: '400' }}>ריכוז לפי עיר (משלוחים)</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {sortedCities.map(([city, count]) => (
                  <div key={city} style={{ background: C.card, border: `1px solid ${C.border}`, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: C.text, fontSize: '14px' }}>{city}</span>
                    <span style={{ background: C.accent, color: '#fff', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>{count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Orders table */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ color: C.muted, fontSize: '11px', letterSpacing: '2px', fontWeight: '400', margin: 0 }}>כל ההזמנות ({orders.length})</h3>
              <button onClick={exportCSV} style={{ background: C.accent, color: '#fff', border: 'none', padding: '7px 16px', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', fontFamily: 'inherit' }}>ייצוא CSV</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: C.card, border: `1px solid ${C.border}` }}>
                <thead><tr>
                  {['שם','טלפון','סוג','עיר','כתובת','פריטים','תאריך'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={td}>{o.name}</td>
                      <td style={{ ...td, direction: 'ltr', textAlign: 'right' }}>{o.phone}</td>
                      <td style={{ ...td, color: o.deliveryType === 'delivery' ? C.blue : C.purple }}>{o.deliveryType === 'delivery' ? 'משלוח' : 'איסוף'}</td>
                      <td style={td}>{o.city}</td>
                      <td style={td}>{o.address}</td>
                      <td style={td}>
                        {(o.items || [{ productName: o.productName, size: o.size }]).map((item, i) => (
                          <span key={i} style={{ display: 'inline-block', background: '#f0f2ee', border: `1px solid ${C.border}`, padding: '1px 8px', fontSize: '11px', marginLeft: '4px', marginBottom: '2px' }}>
                            {item.productName} / {item.size}
                          </span>
                        ))}
                      </td>
                      <td style={{ ...td, color: C.muted, fontSize: '11px' }}>{o.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </>)}
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: '22px', textAlign: 'center', color: C.muted, fontSize: '11px', letterSpacing: '2px' }}>
      NEVO TACTICAL — 2025
    </footer>
  );
}
