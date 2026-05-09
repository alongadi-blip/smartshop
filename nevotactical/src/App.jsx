import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, getDoc, setDoc, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
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
  const [sizeModal, setSizeModal] = useState(null);
  const [adminAuth, setAdminAuth] = useState(false);
  const [orders, setOrders]     = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [prices, setPrices]     = useState({});
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Load prices from Firestore on mount
  useEffect(() => {
    getDoc(doc(db, 'settings', 'prices')).then(snap => {
      if (snap.exists()) setPrices(snap.data());
    }).catch(() => {});
  }, []);

  // Merge Firestore prices with products (Firestore overrides default)
  const products = PRODUCTS.map(p => ({
    ...p,
    price: prices[p.id] ?? p.price,
  }));

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
    setCart(c => [...c, { key: Date.now() + Math.random(), productId: product.id, productName: product.name, size, price: product.price, imageUrl: product.imageUrl, color1: product.color1, color2: product.color2, letter: product.letter }]);
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
    const savePrices = async (newPrices) => {
      await setDoc(doc(db, 'settings', 'prices'), newPrices);
      setPrices(newPrices);
    };
    const updateOrderStatus = async (orderId, status) => {
      await updateDoc(doc(db, 'orders', orderId), { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    };
    return <AdminDashboard orders={orders} loading={loadingOrders} onBack={goHome} onRefresh={loadOrders} products={products} prices={prices} onSavePrices={savePrices} onUpdateStatus={updateOrderStatus} />;
  }

  if (page === 'cart') {
    return <CartPage cart={cart} onRemove={removeFromCart} onBack={goHome} onOrderDone={() => { setOrderSuccess(true); goHome(); }} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Assistant', sans-serif" }}>
      <Header cartCount={cart.length} cartTotal={cart.reduce((s, i) => s + (i.price || 0), 0)} onCart={goCart} onAdmin={goAdmin} />
      <ProductGrid products={products} onSelect={p => setSizeModal(p)} />
      <Footer />
      {sizeModal && <SizeModal key={sizeModal.id} product={sizeModal} onAdd={addToCart} onClose={() => setSizeModal(null)} />}
      {orderSuccess && <OrderSuccessOverlay onClose={() => { setOrderSuccess(false); setCart([]); }} />}
    </div>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function Header({ cartCount, cartTotal, onCart, onAdmin }) {
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
          {cartTotal > 0 && <span style={{ fontSize: '12px', opacity: 0.85 }}>₪{cartTotal}</span>}
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
      <div style={{ height: '220px', background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${C.border}` }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px', transition: 'transform 0.3s', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
        ) : (
          <div style={{ width: '72px', height: '72px', background: `linear-gradient(145deg, ${p.color1}, ${p.color2})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>{p.letter}</div>
        )}
        <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '3px 10px', fontSize: '10px', letterSpacing: '2px' }}>{p.category.toUpperCase()}</div>
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 0 6px' }}>
          <h3 style={{ color: C.text, margin: 0, fontSize: '15px', fontWeight: '600' }}>{p.name}</h3>
          {p.price && <span style={{ color: C.accent, fontWeight: '700', fontSize: '15px' }}>₪{p.price}</span>}
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '16px', borderBottom: `1px solid ${C.border}`, background: '#fff' }}>
          <div style={{ width: '72px', height: '72px', flexShrink: 0, background: '#f8f9f6', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {p.imageUrl
              ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
              : <div style={{ width: '40px', height: '40px', background: `linear-gradient(145deg, ${p.color1}, ${p.color2})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>{p.letter}</div>
            }
          </div>
          <div>
            <h2 style={{ color: C.text, margin: 0, fontSize: '16px', fontWeight: '700' }}>{p.name}</h2>
            <p style={{ color: C.muted, margin: '4px 0 0', fontSize: '12px' }}>{p.description}</p>
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
  const [mode, setMode]         = useState('delivery');
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [addressData, setAddressData] = useState(null); // { city, address, zip }
  const [building, setBuilding]     = useState('');
  const [apartment, setApartment]   = useState('');
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!name.trim())  e.name  = true;
    if (!phone.trim()) e.phone = true;
    if (mode === 'delivery' && !addressData) e.address = true;
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'orders'), {
        items: cart.map(i => ({ productId: i.productId, productName: i.productName, size: i.size, price: i.price || 0 })),
        total: cart.reduce((s, i) => s + (i.price || 0), 0),
        deliveryType: mode,
        name: name.trim(),
        phone: phone.trim(),
        city: mode === 'delivery' ? (addressData?.city || '') : 'איסוף עצמי',
        address: mode === 'delivery' ? [addressData?.address, building ? 'בניין ' + building : '', apartment ? 'דירה ' + apartment : ''].filter(Boolean).join(', ') : '',
        zip: mode === 'delivery' ? (addressData?.zip || '') : '',
        timestamp: serverTimestamp(),
      });
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

        {cart.length === 0 ? (
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
                  <div style={{ width: '52px', height: '52px', background: '#fff', border: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '3px' }} />
                      : <span style={{ color: C.muted, fontSize: '16px', fontWeight: '700' }}>{item.letter}</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.productName}</div>
                    <div style={{ color: C.muted, fontSize: '12px' }}>גודל: <span style={{ color: C.accent, fontWeight: '700' }}>{item.size}</span></div>
                  </div>
                  <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ color: C.accent, fontWeight: '700', fontSize: '15px' }}>₪{item.price}</span>
                    <button onClick={() => onRemove(item.key)} style={{ background: 'transparent', border: 'none', color: C.danger, cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.accent}`, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ color: C.muted, fontSize: '12px', letterSpacing: '1px' }}>סה"כ לתשלום</span>
              <span style={{ color: C.accent, fontWeight: '700', fontSize: '20px' }}>₪{cart.reduce((sum, i) => sum + (i.price || 0), 0)}</span>
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
            <div style={{ marginBottom: '20px' }}>
              {lbl('כתובת למשלוח', errors.address)}
              <AddressSearch
                error={errors.address}
                onSelect={data => {
                  setAddressData(data);
                  setErrors(x => ({ ...x, address: false }));
                }}
              />
              {addressData && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f0f4eb', border: `1px solid ${C.accent}`, fontSize: '12px', color: C.accent, direction: 'rtl' }}>
                  {addressData.address}{addressData.city ? ', ' + addressData.city : ''}{addressData.zip ? ' ' + addressData.zip : ''}
                </div>
              )}
              {addressData && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: C.muted, fontSize: '10px', letterSpacing: '1px', marginBottom: '5px' }}>מספר בניין</label>
                    <input
                      placeholder="1"
                      value={building}
                      onChange={e => setBuilding(e.target.value)}
                      style={{ width: '100%', background: '#f8f9f6', border: `1px solid ${C.border}`, color: C.text, padding: '9px 10px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: C.muted, fontSize: '10px', letterSpacing: '1px', marginBottom: '5px' }}>מספר דירה <span style={{ opacity: 0.6 }}>(אופציונלי)</span></label>
                    <input
                      placeholder="5"
                      value={apartment}
                      onChange={e => setApartment(e.target.value)}
                      style={{ width: '100%', background: '#f8f9f6', border: `1px solid ${C.border}`, color: C.text, padding: '9px 10px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', textAlign: 'center' }}
                    />
                  </div>
                </div>
              )}
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

// ─── ORDER SUCCESS OVERLAY ────────────────────────────────────────────────────
function OrderSuccessOverlay({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: '#fff', border: `1px solid ${C.border}`,
        padding: '48px 36px', maxWidth: '380px', width: '100%',
        textAlign: 'center', direction: 'rtl',
        boxShadow: '0 12px 48px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          width: '68px', height: '68px', background: C.success, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '30px', color: '#fff', fontWeight: '700',
        }}>✓</div>
        <h2 style={{ color: C.text, fontSize: '22px', marginBottom: '10px' }}>ההזמנה נקלטה בהצלחה!</h2>
        <p style={{ color: C.muted, fontSize: '14px', marginBottom: '28px' }}>נחזור אליך בקרוב לאישור.</p>
        <button onClick={onClose} style={{
          background: C.accent, color: '#fff', border: 'none',
          padding: '13px 36px', cursor: 'pointer', fontSize: '14px',
          letterSpacing: '2px', fontFamily: 'inherit', fontWeight: '700',
        }}>
          המשך קנייה
        </button>
      </div>
    </div>
  );
}

// ─── ADDRESS SEARCH (Nominatim / OpenStreetMap) ───────────────────────────────
function AddressSearch({ onSelect, error }) {
  const [input, setInput]       = useState('');
  const [results, setResults]   = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading]   = useState(false);
  const timer = useRef(null);

  const search = async (q) => {
    if (q.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=il&format=json&addressdetails=1&limit=7&accept-language=he`;
      const res = await fetch(url);
      const data = await res.json();
      const filtered = data.filter(r => r.address && (r.address.road || r.address.pedestrian || r.address.suburb));
      setResults(filtered);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    clearTimeout(timer.current);
    if (!confirmed) timer.current = setTimeout(() => search(input), 500);
    return () => clearTimeout(timer.current);
  }, [input, confirmed]);

  const select = (item) => {
    const a = item.address;
    const city    = a.city || a.town || a.village || a.municipality || a.county || '';
    const road    = a.road || a.pedestrian || a.suburb || '';
    const house   = a.house_number || '';
    const zip     = a.postcode || '';
    const display = [road + (house ? ' ' + house : ''), city].filter(Boolean).join(', ');

    setInput(display);
    setConfirmed(true);
    setResults([]);
    onSelect({ city, address: road + (house ? ' ' + house : ''), zip, display });
  };

  return (
    <div style={{ position: 'relative', direction: 'rtl' }}>
      <input
        value={input}
        onChange={e => { setInput(e.target.value); setConfirmed(false); onSelect(null); }}
        placeholder="הקלד כתובת ובחר מהרשימה..."
        style={{
          width: '100%', background: '#f8f9f6',
          border: `1px solid ${error ? C.danger : confirmed ? C.accent : C.border}`,
          color: C.text, padding: '10px 12px', fontSize: '14px',
          boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', direction: 'rtl',
        }}
      />
      {loading && (
        <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: '12px' }}>מחפש...</div>
      )}
      {!confirmed && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 200,
          background: '#fff', border: `1px solid ${C.border}`, borderTop: 'none',
          boxShadow: '0 6px 16px rgba(0,0,0,0.12)', maxHeight: '220px', overflowY: 'auto',
        }}>
          {results.map(r => {
            const a = r.address;
            const city = a.city || a.town || a.village || a.municipality || '';
            const road = a.road || a.pedestrian || a.suburb || '';
            const house = a.house_number || '';
            const line1 = road + (house ? ' ' + house : '');
            const line2 = city;
            return (
              <div key={r.place_id} onClick={() => select(r)}
                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, direction: 'rtl' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f7f2'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontSize: '13px', color: C.text, fontWeight: '500' }}>{line1 || r.display_name.split(',')[0]}</div>
                {line2 && <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{line2}</div>}
              </div>
            );
          })}
          <div style={{ padding: '6px 14px', fontSize: '10px', color: C.muted, background: '#fafafa' }}>
            © OpenStreetMap contributors
          </div>
        </div>
      )}
      {!confirmed && input.length >= 3 && !loading && results.length === 0 && (
        <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 200, background: '#fff', border: `1px solid ${C.border}`, borderTop: 'none', padding: '10px 14px', fontSize: '12px', color: C.muted }}>
          לא נמצאו תוצאות — נסה כתובת מלאה יותר
        </div>
      )}
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    new:       { label: 'חדשה',  bg: '#e8f4fd', color: C.blue },
    sent:      { label: 'נשלחה', bg: '#eafaf1', color: C.success },
    cancelled: { label: 'בוטלה', bg: '#fdf0ee', color: C.danger },
  };
  const s = map[status] || map.new;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', fontSize: '11px', fontWeight: '600', border: `1px solid ${s.color}22` }}>
      {s.label}
    </span>
  );
}

// ─── ORDER DETAIL MODAL ────────────────────────────────────────────────────────
function OrderDetailModal({ order: o, onClose, onUpdateStatus }) {
  const status = o.status || 'new';
  const items  = o.items || [{ productName: o.productName, size: o.size, price: o.price }];
  const total  = o.total || items.reduce((s, i) => s + (i.price || 0), 0);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', direction: 'rtl', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: '700', fontSize: '15px' }}>פרטי הזמנה</span>
            <StatusBadge status={status} />
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Customer */}
          <div style={{ background: '#f8f9f6', border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: '14px' }}>
            <p style={{ color: C.muted, fontSize: '10px', letterSpacing: '2px', marginBottom: '8px' }}>פרטי לקוח</p>
            <p style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{o.name}</p>
            <p style={{ color: C.muted, fontSize: '14px', direction: 'ltr', textAlign: 'right' }}>{o.phone}</p>
          </div>

          {/* Delivery */}
          <div style={{ background: '#f8f9f6', border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: '14px' }}>
            <p style={{ color: C.muted, fontSize: '10px', letterSpacing: '2px', marginBottom: '8px' }}>אופן קבלה</p>
            <p style={{ fontWeight: '600', color: o.deliveryType === 'delivery' ? C.blue : C.purple, marginBottom: '4px' }}>
              {o.deliveryType === 'delivery' ? 'משלוח לבית' : 'איסוף עצמי'}
            </p>
            {o.deliveryType === 'delivery' && (
              <>
                <p style={{ fontSize: '14px' }}>{o.address}</p>
                <p style={{ fontSize: '14px' }}>{o.city}{o.zip ? ' ' + o.zip : ''}</p>
              </>
            )}
          </div>

          {/* Items */}
          <div style={{ border: `1px solid ${C.border}`, marginBottom: '14px' }}>
            <p style={{ color: C.muted, fontSize: '10px', letterSpacing: '2px', padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: '#f8f9f6' }}>פריטים</p>
            {items.map((item, i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{item.productName}</span>
                  <span style={{ color: C.accent, fontWeight: '700', fontSize: '13px', marginright: '8px' }}> / {item.size}</span>
                </div>
                {item.price > 0 && <span style={{ color: C.accent, fontWeight: '700' }}>₪{item.price}</span>}
              </div>
            ))}
            {total > 0 && (
              <div style={{ padding: '10px 16px', background: '#f0f4eb', display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${C.accent}` }}>
                <span style={{ fontWeight: '700' }}>סה"כ</span>
                <span style={{ color: C.accent, fontWeight: '700', fontSize: '16px' }}>₪{total}</span>
              </div>
            )}
          </div>

          {/* Date */}
          <p style={{ color: C.muted, fontSize: '12px', marginBottom: '20px' }}>
            תאריך: {o.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '—'}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {status !== 'sent' && (
              <button onClick={() => onUpdateStatus(o.id, 'sent')} style={{ flex: 1, background: C.success, color: '#fff', border: 'none', padding: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', letterSpacing: '1px' }}>
                סמן כנשלח
              </button>
            )}
            {status !== 'cancelled' && (
              <button onClick={() => onUpdateStatus(o.id, 'cancelled')} style={{ flex: 1, background: C.danger, color: '#fff', border: 'none', padding: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', letterSpacing: '1px' }}>
                סמן כבוטל
              </button>
            )}
            {status !== 'new' && (
              <button onClick={() => onUpdateStatus(o.id, 'new')} style={{ flex: 1, background: '#aaa', color: '#fff', border: 'none', padding: '12px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                החזר לפתוחות
              </button>
            )}
          </div>
          <button onClick={onClose} style={{ width: '100%', marginTop: '8px', background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '10px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
            חזרה לרשימה
          </button>
        </div>
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
function AdminDashboard({ orders, loading, onBack, onRefresh, products, prices, onSavePrices, onUpdateStatus }) {
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

  const [editPrices, setEditPrices] = useState(() =>
    Object.fromEntries(products.map(p => [p.id, p.price ?? '']))
  );
  const [savingPrices, setSavingPrices] = useState(false);
  const [pricesSaved, setPricesSaved]   = useState(false);
  const [pricesOpen, setPricesOpen]     = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [tab, setTab] = useState('open');
  const [selectedCity, setSelectedCity] = useState(null);

  const updateStatus = async (orderId, status) => {
    await onUpdateStatus(orderId, status);
    if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, status }));
  };

  const openOrders   = orders.filter(o => !o.status || o.status === 'new');
  const closedOrders = orders.filter(o => o.status === 'sent' || o.status === 'cancelled');
  const displayed    = tab === 'open' ? openOrders : closedOrders;

  const handleSavePrices = async () => {
    setSavingPrices(true);
    const toSave = Object.fromEntries(
      Object.entries(editPrices).filter(([, v]) => v !== '' && !isNaN(Number(v))).map(([k, v]) => [k, Number(v)])
    );
    await onSavePrices(toSave);
    setSavingPrices(false);
    setPricesSaved(true);
    setTimeout(() => setPricesSaved(false), 2000);
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

          {/* Prices table */}
          <section style={{ marginBottom: '28px', border: `1px solid ${C.border}`, background: C.card }}>
            <div
              onClick={() => setPricesOpen(o => !o)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', cursor: 'pointer', userSelect: 'none' }}
            >
              <h3 style={{ color: C.text, fontSize: '13px', fontWeight: '600', margin: 0 }}>ניהול מחירים</h3>
              <span style={{ color: C.muted, fontSize: '18px', lineHeight: 1, transition: 'transform 0.2s', display: 'inline-block', transform: pricesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            </div>

            {pricesOpen && (
              <div style={{ borderTop: `1px solid ${C.border}` }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>
                      <th style={th}>מוצר</th>
                      <th style={th}>קטגוריה</th>
                      <th style={{ ...th, textAlign: 'center' }}>מחיר (₪)</th>
                    </tr></thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td style={td}>{p.name}</td>
                          <td style={{ ...td, color: C.muted, fontSize: '12px' }}>{p.category}</td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            <input
                              type="number" min="0"
                              value={editPrices[p.id] ?? ''}
                              placeholder="לא מוגדר"
                              onChange={e => setEditPrices(prev => ({ ...prev, [p.id]: e.target.value }))}
                              style={{ width: '90px', padding: '6px 10px', textAlign: 'center', background: '#f8f9f6', border: `1px solid ${C.border}`, color: C.text, fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', outline: 'none' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleSavePrices} disabled={savingPrices} style={{
                    background: pricesSaved ? C.success : C.accent, color: '#fff', border: 'none',
                    padding: '8px 22px', cursor: 'pointer', fontSize: '12px',
                    letterSpacing: '1px', fontFamily: 'inherit', transition: 'background 0.2s',
                  }}>
                    {pricesSaved ? 'נשמר!' : savingPrices ? 'שומר...' : 'שמור שינויים'}
                  </button>
                </div>
              </div>
            )}
          </section>

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
                  <div key={city} onClick={() => setSelectedCity(city === selectedCity ? null : city)}
                    style={{
                      background: selectedCity === city ? C.accent : C.card,
                      border: `1px solid ${selectedCity === city ? C.accent : C.border}`,
                      padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <span style={{ color: selectedCity === city ? '#fff' : C.text, fontSize: '14px' }}>{city}</span>
                    <span style={{
                      background: selectedCity === city ? 'rgba(255,255,255,0.3)' : C.accent,
                      color: '#fff', borderRadius: '50%', width: '26px', height: '26px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700',
                    }}>{count}</span>
                  </div>
                ))}
              </div>

              {/* City orders list */}
              {selectedCity && (() => {
                const cityOrders = orders.filter(o => (o.city || '').trim() === selectedCity);
                return (
                  <div style={{ marginTop: '12px', border: `1px solid ${C.accent}`, background: C.card }}>
                    <div style={{ padding: '10px 16px', background: '#f0f4eb', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: C.accent }}>הזמנות מ{selectedCity} ({cityOrders.length})</span>
                      <button onClick={() => setSelectedCity(null)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
                    </div>
                    {cityOrders.map(o => (
                      <div key={o.id} onClick={() => setSelectedOrder(o)}
                        style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8f9f6'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '3px' }}>{o.name}</div>
                          <div style={{ color: C.muted, fontSize: '12px', marginBottom: '3px', direction: 'ltr', textAlign: 'right' }}>{o.phone}</div>
                          <div style={{ color: C.muted, fontSize: '12px' }}>{o.address}</div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
                            {(o.items || [{ productName: o.productName, size: o.size }]).map((item, i) => (
                              <span key={i} style={{ background: '#f0f2ee', border: `1px solid ${C.border}`, padding: '1px 8px', fontSize: '11px' }}>
                                {item.productName} / {item.size}
                              </span>
                            ))}
                          </div>
                        </div>
                        <StatusBadge status={o.status || 'new'} />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>
          )}

          {/* Orders tabs */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '0' }}>
                {[['open', `פתוחות (${openOrders.length})`], ['closed', `סגורות (${closedOrders.length})`]].map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)} style={{
                    padding: '8px 20px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', letterSpacing: '1px',
                    background: tab === key ? C.accent : C.card,
                    color: tab === key ? '#fff' : C.muted,
                    border: `1px solid ${tab === key ? C.accent : C.border}`,
                    marginLeft: key === 'closed' ? '-1px' : 0,
                  }}>{label}</button>
                ))}
              </div>
              <button onClick={exportCSV} style={{ background: C.accent, color: '#fff', border: 'none', padding: '7px 16px', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', fontFamily: 'inherit' }}>ייצוא CSV</button>
            </div>

            {displayed.length === 0 ? (
              <p style={{ color: C.muted, textAlign: 'center', padding: '30px 0', background: C.card, border: `1px solid ${C.border}` }}>אין הזמנות</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: C.card, border: `1px solid ${C.border}` }}>
                  <thead><tr>
                    {['שם','טלפון','סוג','עיר','פריטים','תאריך','סטטוס','פעולות'].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {displayed.map(o => {
                      const status = o.status || 'new';
                      return (
                        <tr key={o.id} onClick={() => setSelectedOrder(o)}
                          style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8f9f6'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={td}>{o.name}</td>
                          <td style={{ ...td, direction: 'ltr', textAlign: 'right' }}>{o.phone}</td>
                          <td style={{ ...td, color: o.deliveryType === 'delivery' ? C.blue : C.purple }}>{o.deliveryType === 'delivery' ? 'משלוח' : 'איסוף'}</td>
                          <td style={td}>{o.city}</td>
                          <td style={td}>
                            {(o.items || [{ productName: o.productName, size: o.size }]).map((item, i) => (
                              <span key={i} style={{ display: 'inline-block', background: '#f0f2ee', border: `1px solid ${C.border}`, padding: '1px 8px', fontSize: '11px', marginLeft: '4px', marginBottom: '2px' }}>
                                {item.productName} / {item.size}
                              </span>
                            ))}
                          </td>
                          <td style={{ ...td, color: C.muted, fontSize: '11px' }}>{o.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '—'}</td>
                          <td style={td}>
                            <StatusBadge status={status} />
                          </td>
                          <td style={td} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              {status !== 'sent' && (
                                <button onClick={() => updateStatus(o.id, 'sent')} style={{ background: C.success, color: '#fff', border: 'none', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', borderRadius: '2px' }}>נשלח</button>
                              )}
                              {status !== 'cancelled' && (
                                <button onClick={() => updateStatus(o.id, 'cancelled')} style={{ background: C.danger, color: '#fff', border: 'none', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', borderRadius: '2px' }}>בוטל</button>
                              )}
                              {status !== 'new' && (
                                <button onClick={() => updateStatus(o.id, 'new')} style={{ background: C.muted, color: '#fff', border: 'none', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', borderRadius: '2px' }}>פתח</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {selectedOrder && (
            <OrderDetailModal
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onUpdateStatus={updateStatus}
            />
          )}

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
