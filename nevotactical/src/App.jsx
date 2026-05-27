import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, getDocs, getDoc, setDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, query, orderBy, where, runTransaction,
} from 'firebase/firestore';
import { PRODUCTS } from './products';

const ADMIN_PASSWORD = 'NevoAdmin2025';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const shirt = (products) => products.find(p => p.role === 'shirt');
const pants = (products) => products.find(p => p.role === 'pants');

// ─── THEME UTILS ─────────────────────────────────────────────────────────────
function getInitialTheme() {
  try {
    return localStorage.getItem('nt-theme') || 'dark';
  } catch { return 'dark'; }
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : '');
  try { localStorage.setItem('nt-theme', t); } catch {}
}

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const IcCart = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IcClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcCheck = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IcMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IcRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const IcLogout = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IcSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcDownload = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IcTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IcEdit = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcChevron = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IcBox = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const ShipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{display:'inline',verticalAlign:'middle',marginInlineEnd:'4px'}}>
    <rect x="1" y="3" width="15" height="13"/>
    <path d="M16 8h4l3 3v5h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{display:'inline',verticalAlign:'middle',marginInlineEnd:'4px'}}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]           = useState(window.location.hash === '#admin' ? 'admin' : 'home');
  const [cart, setCart]           = useState([]); // [{key, shirtSize, pantsSize, setPrice, quantity}]
  const [adminAuth, setAdminAuth] = useState(false);
  const [orders, setOrders]       = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [prices, setPrices]       = useState({});
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [theme, setTheme]         = useState(getInitialTheme);

  // Apply theme to <html>
  useEffect(() => { applyTheme(theme); }, [theme]);

  // Load prices from Firestore
  useEffect(() => {
    getDoc(doc(db, 'settings', 'prices')).then(snap => {
      if (snap.exists()) setPrices(snap.data());
    }).catch(() => {});
  }, []);

  // Products (no individual price)
  const products = PRODUCTS;

  const shirtProduct = shirt(products);
  const pantsProduct = pants(products);
  // Single set price: from Firestore key 'set', default ₪400
  const setPrice = prices['set'] ?? 450;

  // Hash routing
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

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Cart actions
  const addSet = (shirtSize, pantsSize, quantity) => {
    setCart(c => [...c, {
      key:       Date.now() + Math.random(),
      shirtSize, pantsSize, setPrice, quantity,
    }]);
  };
  const removeFromCart = (key)      => setCart(c => c.filter(i => i.key !== key));
  const changeQty      = (key, qty) => setCart(c => c.map(i => i.key === key ? { ...i, quantity: qty } : i));

  const cartSets  = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const cartTotal = cart.reduce((s, i) => s + (i.setPrice || 0) * (i.quantity || 1), 0);

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const q    = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoadingOrders(false);
  };

  // ── Admin page ──
  if (page === 'admin') {
    if (!adminAuth) return (
      <AdminLogin
        onLogin={pwd => { if (pwd === ADMIN_PASSWORD) { setAdminAuth(true); loadOrders(); } else alert('סיסמה שגויה'); }}
        onBack={goHome}
      />
    );
    const savePrices = async (newPrices) => {
      await setDoc(doc(db, 'settings', 'prices'), newPrices);
      setPrices(newPrices);
    };
    const updateOrderStatus = async (orderId, status) => {
      await updateDoc(doc(db, 'orders', orderId), { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    };
    const deleteOrder = async (orderId) => {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prev => prev.filter(o => o.id !== orderId));
    };
    const deleteAllOrders = async () => {
      await Promise.all(orders.map(o => deleteDoc(doc(db, 'orders', o.id))));
      setOrders([]);
    };
    return (
      <AdminDashboard
        orders={orders} loading={loadingOrders}
        onBack={goHome} onRefresh={loadOrders}
        products={products} prices={prices}
        onSavePrices={savePrices}
        onUpdateStatus={updateOrderStatus}
        onDeleteOrder={deleteOrder}
        onDeleteAll={deleteAllOrders}
        theme={theme} onToggleTheme={toggleTheme}
      />
    );
  }

  // ── Cart page ──
  if (page === 'cart') {
    return (
      <CartPage
        cart={cart}
        shirtProduct={shirtProduct}
        pantsProduct={pantsProduct}
        onRemove={removeFromCart}
        onChangeQty={changeQty}
        onBack={goHome}
        onOrderDone={(orderNumber) => { setOrderSuccess({ orderNumber }); goHome(); }}
        theme={theme} onToggleTheme={toggleTheme}
      />
    );
  }

  // ── Home page ──
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header
        cartSets={cartSets} cartTotal={cartTotal}
        onCart={goCart} onAdmin={goAdmin}
        onMyOrders={() => setShowMyOrders(true)}
        theme={theme} onToggleTheme={toggleTheme}
      />

      <Hero />

      <main>
        <SetConfigurator
          shirtProduct={shirtProduct}
          pantsProduct={pantsProduct}
          setPrice={setPrice}
          onAddSet={addSet}
          onGoCart={goCart}
        />
      </main>

      <Footer />

      {orderSuccess && (
        <OrderSuccessOverlay
          orderNumber={orderSuccess.orderNumber}
          onClose={() => { setOrderSuccess(null); setCart([]); }}
        />
      )}

      {showMyOrders && (
        <MyOrdersModal
          shirtProduct={shirtProduct}
          pantsProduct={pantsProduct}
          setPrice={setPrice}
          onAddToCart={(sets) => {
            sets.forEach(s => setCart(c => [...c, { key: Date.now() + Math.random(), ...s }]));
            setShowMyOrders(false);
            goCart();
          }}
          onClose={() => setShowMyOrders(false)}
        />
      )}
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ cartSets, cartTotal, onCart, onAdmin, onMyOrders, theme, onToggleTheme }) {
  return (
    <header className="nt-header">
      <a
        href="#"
        className="nt-logo"
        onClick={e => { e.preventDefault(); window.location.hash = ''; }}
        aria-label="Nevo Tactical — דף הבית"
      >
        <div className="nt-logo-mark" aria-hidden="true">NT</div>
        <span className="nt-logo-name">NEVO TACTICAL</span>
      </a>

      <div className="nt-header-actions">
        <button className="btn btn-ghost btn-sm hide-mobile" onClick={onMyOrders} aria-label="ההזמנות שלי">
          הזמנות שלי
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onAdmin} style={{ fontSize: 10, letterSpacing: 2 }} aria-label="כניסה לניהול">
          ADMIN
        </button>

        {/* Theme toggle — skill: icon-only button needs aria-label */}
        <button
          className="nt-theme-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
          title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
        >
          {theme === 'dark' ? <IcSun /> : <IcMoon />}
        </button>

        <button
          className={`btn-cart ${cartSets > 0 ? 'has-items' : 'empty'}`}
          onClick={onCart}
          aria-label={`סל קניות${cartSets > 0 ? `, ${cartSets} סטים, ₪${cartTotal}` : ', ריק'}`}
        >
          <IcCart />
          <span>סל</span>
          {cartSets > 0 && (
            <>
              <span className="cart-badge" aria-hidden="true">{cartSets}</span>
              <span className="cart-price" aria-hidden="true">₪{cartTotal}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="nt-hero" aria-label="באנר ראשי">
      <div className="nt-hero-inner">
        <span className="nt-hero-eyebrow">הסט הטקטי המקצועי</span>
        <h1 className="nt-hero-title">NEVO TACTICAL</h1>
        <p className="nt-hero-sub">
          חולצה + מכנסיים. בד מקצועי לשטח ולאימון.<br />
          נמכר כסט בלבד — בוחרים מידה לכל פריט.
        </p>
      </div>
    </section>
  );
}

// ─── SET CONFIGURATOR ────────────────────────────────────────────────────────
function SetConfigurator({ shirtProduct: sh, pantsProduct: pa, setPrice, onAddSet, onGoCart }) {
  const [shirtSize, setShirtSize] = useState('');
  const [pantsSize, setPantsSize] = useState('');
  const [qty, setQty]             = useState(1);
  const [added, setAdded]         = useState(false);
  const [tried, setTried]         = useState(false); // show validation after first attempt

  const isReady   = shirtSize && pantsSize;
  const shirtLabel = shirtSize ? `מידה ${shirtSize}` : '';
  const pantsLabel = pantsSize ? `מידה ${pantsSize}` : '';

  const handleAdd = () => {
    setTried(true);
    if (!isReady) return;
    onAddSet(shirtSize, pantsSize, qty);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setTried(false);
      setShirtSize('');
      setPantsSize('');
      setQty(1);
    }, 1800);
  };

  if (!sh || !pa) return null;

  return (
    <div className="nt-configurator-section">
      <div className="nt-set-header">
        <span className="nt-set-label">הסט הטקטי</span>
        <span className="nt-set-sub">חולצה + מכנסיים | בחר מידה לכל פריט</span>
      </div>

      {/* Two-panel split */}
      <div className="nt-product-split" role="group" aria-label="הגדרת סט">

        {/* Shirt panel */}
        <div className={`nt-product-panel${shirtSize ? ' has-selection' : ''}`}>
          <div className="nt-product-panel-image">
            <span className="nt-product-panel-tag">חולצה</span>
            <img src={sh.imageUrl} alt={sh.name} loading="eager" />
            {/* Selected size badge */}
            <span className={`nt-size-badge${shirtSize ? ' visible' : ''}`} aria-live="polite">
              {shirtSize}
            </span>
          </div>
          <div className="nt-product-panel-body">
            <h2 className="nt-product-panel-name">{sh.name}</h2>
            <p className="nt-product-panel-desc">{sh.description}</p>
            <label
              className={`nt-size-label${tried && !shirtSize ? ' err' : ''}`}
              id="shirt-size-label"
            >
              {tried && !shirtSize ? 'בחר מידת חולצה — חובה' : 'מידת חולצה'}
            </label>
            <div className="nt-size-grid" role="group" aria-labelledby="shirt-size-label">
              {sh.sizes.map(s => (
                <button
                  key={s}
                  className={`nt-size-opt${shirtSize === s ? ' sel' : ''}`}
                  onClick={() => setShirtSize(s)}
                  aria-pressed={shirtSize === s}
                  aria-label={`מידת חולצה ${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pants panel */}
        <div className={`nt-product-panel${pantsSize ? ' has-selection' : ''}`}>
          <div className="nt-product-panel-image">
            <span className="nt-product-panel-tag">מכנסיים</span>
            <img src={pa.imageUrl} alt={pa.name} loading="eager" />
            <span className={`nt-size-badge${pantsSize ? ' visible' : ''}`} aria-live="polite">
              {pantsSize}
            </span>
          </div>
          <div className="nt-product-panel-body">
            <h2 className="nt-product-panel-name">{pa.name}</h2>
            <p className="nt-product-panel-desc">{pa.description}</p>
            <label
              className={`nt-size-label${tried && !pantsSize ? ' err' : ''}`}
              id="pants-size-label"
            >
              {tried && !pantsSize ? 'בחר מידת מכנסיים — חובה' : 'מידת מכנסיים'}
            </label>
            <div className="nt-size-grid" role="group" aria-labelledby="pants-size-label">
              {pa.sizes.map(s => (
                <button
                  key={s}
                  className={`nt-size-opt${pantsSize === s ? ' sel' : ''}`}
                  onClick={() => setPantsSize(s)}
                  aria-pressed={pantsSize === s}
                  aria-label={`מידת מכנסיים ${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA bar */}
      <div className="nt-set-cta" role="region" aria-label="הוספה לסל">
        <div className="nt-set-cta-left">

          {/* Price */}
          {setPrice > 0 && (
            <div className="nt-set-total">
              <span className="nt-set-total-label">מחיר הסט</span>
              <span className="nt-set-total-val" aria-label={`מחיר סט: ₪${setPrice * qty}`}>
                ₪{setPrice * qty}
              </span>
            </div>
          )}

          {/* Qty */}
          <div>
            <span className="nt-size-label" id="set-qty-label" style={{ marginBottom: 8 }}>כמות סטים</span>
            <div className="nt-qty" role="group" aria-labelledby="set-qty-label">
              <button className="nt-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="הפחת כמות">−</button>
              <div className="nt-qty-val" aria-live="polite" aria-label={`${qty} סטים`}>{qty}</div>
              <button className="nt-qty-btn" onClick={() => setQty(q => q + 1)} aria-label="הגדל כמות">+</button>
            </div>
          </div>

          {/* Shipping note */}
          <p className="nt-set-shipping-note" aria-label="מידע משלוח">
            {qty === 1
              ? <><ShipIcon /> משלוח: +₪50</>
              : <><PhoneIcon /> 2 סטים ומעלה — תיאום טלפוני</>
            }
          </p>
        </div>

        {/* Add button */}
        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={added}
          style={{
            padding: '14px 32px',
            fontSize: '14px',
            letterSpacing: '2px',
            fontWeight: 800,
            minWidth: 200,
            background: added ? 'var(--success)' : (!isReady && tried) ? 'var(--danger)' : 'var(--accent)',
            borderColor: added ? 'var(--success)' : (!isReady && tried) ? 'var(--danger)' : 'var(--accent)',
          }}
          aria-label={added ? 'הסט נוסף לסל' : `הוסף ${qty} סט${qty > 1 ? 'ים' : ''} לסל`}
          aria-busy={added}
        >
          {added
            ? '✓  נוסף לסל!'
            : isReady
              ? `הוסף לסל${qty > 1 ? ` (${qty})` : ''}`
              : tried ? 'בחר מידות קודם' : 'הוסף לסל'
          }
        </button>
      </div>

      {/* Summary below CTA */}
      {isReady && (
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)', animation: 'fadeUp 0.2s ease' }} aria-live="polite">
          הסט שבחרת: חולצה {shirtSize} + מכנסיים {pantsSize}
        </p>
      )}
    </div>
  );
}

// ─── CART PAGE ────────────────────────────────────────────────────────────────
function CartPage({ cart, shirtProduct: sh, pantsProduct: pa, onRemove, onChangeQty, onBack, onOrderDone, theme, onToggleTheme }) {
  const [mode, setMode]               = useState('delivery');
  const [name, setName]               = useState('');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [addressData, setAddressData] = useState(null);
  const [building, setBuilding]       = useState('');
  const [apartment, setApartment]     = useState('');
  const [errors, setErrors]           = useState({});
  const [submitting, setSubmitting]   = useState(false);

  const totalSets  = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const itemsTotal = cart.reduce((s, i) => s + (i.setPrice || 0) * (i.quantity || 1), 0);
  const shipping   = mode === 'delivery' ? (totalSets <= 1 ? 50 : null) : 0;

  const validate = () => {
    const e = {};
    if (!name.trim())  e.name  = true;
    if (!phone.trim()) e.phone = true;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = true;
    if (mode === 'delivery' && !addressData) e.address = true;
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const counterRef = doc(db, 'settings', 'orderCounter');
      let orderNumber;
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        orderNumber = (snap.exists() ? snap.data().count : 0) + 1;
        tx.set(counterRef, { count: orderNumber });
      });

      const sets = cart.map(i => ({
        shirtSize: i.shirtSize, pantsSize: i.pantsSize,
        quantity:  i.quantity || 1, setPrice: i.setPrice || 0,
      }));
      const total   = itemsTotal + (shipping || 0);
      const city    = mode === 'delivery' ? (addressData?.city || '') : 'איסוף עצמי';
      const address = mode === 'delivery'
        ? [addressData?.address, building ? 'בניין ' + building : '', apartment ? 'דירה ' + apartment : ''].filter(Boolean).join(', ')
        : '';
      const zip = mode === 'delivery' ? (addressData?.zip || '') : '';

      await addDoc(collection(db, 'orders'), {
        orderNumber, sets, total,
        shipping: shipping ?? 'הצעה טלפונית',
        deliveryType: mode,
        name: name.trim(), phone: phone.trim(), email: email.trim(),
        city, address, zip,
        timestamp: serverTimestamp(),
      });

      onOrderDone(orderNumber);
    } catch (err) {
      console.error(err);
      alert('שגיאה בשמירה. נסה שוב.');
    }
    setSubmitting(false);
  };

  return (
    <div className="nt-page">
      <header className="nt-page-header">
        <span className="nt-page-title">הסל שלך</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="nt-theme-btn" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'עבור למצב בהיר' : 'עבור למצב כהה'}>
            {theme === 'dark' ? <IcSun /> : <IcMoon />}
          </button>
          <button onClick={onBack} className="btn btn-ghost btn-sm" aria-label="חזרה לחנות">← המשך קנייה</button>
        </div>
      </header>

      <div className="nt-cart-container">

        {cart.length === 0 ? (
          <div className="nt-empty" style={{ paddingTop: 80 }}>
            <div className="nt-empty-icon"><IcBox /></div>
            <h2 className="nt-empty-title">הסל ריק</h2>
            <p className="nt-empty-desc">לא הוספת סטים עדיין.<br />חזור לחנות ובחר מידות.</p>
            <button onClick={onBack} className="btn btn-primary">חזרה לחנות</button>
          </div>
        ) : (
          <>
            {/* Sets list */}
            <div style={{ marginBottom: 24 }}>
              <p className="nt-cart-section-title">סטים בסל ({totalSets} סט{totalSets !== 1 ? 'ים' : ''})</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
                {cart.map(item => {
                  const qty      = item.quantity || 1;
                  const subtotal = (item.setPrice || 0) * qty;
                  return (
                    <div key={item.key} className="nt-cart-set">
                      {/* Thumbnails */}
                      <div className="nt-cart-set-thumbs">
                        <div className="nt-cart-thumb">
                          {sh?.imageUrl ? <img src={sh.imageUrl} alt={sh.name} /> : <span style={{ fontFamily: 'var(--font-brand)', fontSize: 16, color: 'var(--text-faint)' }}>T</span>}
                        </div>
                        <span className="nt-cart-set-connector">+</span>
                        <div className="nt-cart-thumb">
                          {pa?.imageUrl ? <img src={pa.imageUrl} alt={pa.name} /> : <span style={{ fontFamily: 'var(--font-brand)', fontSize: 16, color: 'var(--text-faint)' }}>K</span>}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>
                          סט טקטי
                        </span>
                      </div>

                      {/* Info row */}
                      <div className="nt-cart-set-info">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div className="nt-cart-set-sizes">
                            <span className="nt-cart-set-size-item">חולצה: <span className="nt-cart-set-size-val">{item.shirtSize}</span></span>
                            <span style={{ color: 'var(--text-faint)' }}>·</span>
                            <span className="nt-cart-set-size-item">מכנסיים: <span className="nt-cart-set-size-val">{item.pantsSize}</span></span>
                          </div>
                          {/* Inline qty */}
                          <div className="nt-qty" style={{ marginTop: 4 }}>
                            <button
                              className="nt-qty-btn"
                              style={{ width: 28, height: 28, fontSize: 14 }}
                              onClick={() => qty > 1 ? onChangeQty(item.key, qty - 1) : onRemove(item.key)}
                              aria-label={qty > 1 ? 'הפחת כמות' : 'הסר מהסל'}
                            >−</button>
                            <div className="nt-qty-val" style={{ width: 36, height: 28, fontSize: 13 }}>{qty}</div>
                            <button
                              className="nt-qty-btn"
                              style={{ width: 28, height: 28, fontSize: 14 }}
                              onClick={() => onChangeQty(item.key, qty + 1)}
                              aria-label="הגדל כמות"
                            >+</button>
                          </div>
                        </div>

                        <div className="nt-cart-set-right">
                          <div style={{ textAlign: 'left' }}>
                            {qty > 1 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>₪{item.setPrice} × {qty}</div>}
                            <span className="nt-cart-set-price">₪{subtotal}</span>
                          </div>
                          <button className="nt-cart-remove" onClick={() => onRemove(item.key)} aria-label="הסר סט מהסל"><IcClose /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="nt-total-block" role="region" aria-label="סיכום מחירים">
                <div className="nt-total-row">
                  <span className="nt-total-label">סכום סטים</span>
                  <span style={{ fontWeight: 700 }}>₪{itemsTotal}</span>
                </div>
                {mode === 'delivery' && (
                  <div className="nt-total-row">
                    <span className="nt-total-label">דמי משלוח</span>
                    {totalSets <= 1
                      ? <span style={{ fontWeight: 700, color: 'var(--info)' }}>₪50</span>
                      : <span style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 700 }}>הצעה טלפונית</span>
                    }
                  </div>
                )}
                <div className="nt-total-grand">
                  <span className="nt-total-grand-label">סה"כ לתשלום</span>
                  {mode === 'delivery' && totalSets > 1
                    ? <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>יחושב טלפונית</span>
                    : <span className="nt-total-grand-val">₪{itemsTotal + (mode === 'delivery' ? 50 : 0)}</span>
                  }
                </div>
              </div>
            </div>

            {/* Delivery mode */}
            <div style={{ marginBottom: 20 }}>
              <p className="nt-cart-section-title">אופן קבלה</p>
              <div className="nt-delivery-toggle" role="group" aria-label="אופן קבלת ההזמנה">
                {[['delivery', 'משלוח לבית'], ['pickup', 'איסוף עצמי']].map(([v, label]) => (
                  <button key={v} className={`nt-delivery-opt${mode === v ? ' active' : ''}`} onClick={() => setMode(v)} aria-pressed={mode === v}>{label}</button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div style={{ marginBottom: 20 }}>
              <p className="nt-cart-section-title">פרטי קשר</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label className={`nt-field-label${errors.name ? ' err' : ''}`} htmlFor="c-name">שם מלא{errors.name && ' — שדה חובה'}</label>
                  <input id="c-name" className={`nt-input${errors.name ? ' err' : ''}`} placeholder="שם מלא" value={name} onChange={e => { setName(e.target.value); setErrors(x => ({ ...x, name: false })); }} autoComplete="name" aria-required="true" aria-invalid={errors.name ? 'true' : 'false'} />
                </div>
                <div>
                  <label className={`nt-field-label${errors.phone ? ' err' : ''}`} htmlFor="c-phone">טלפון{errors.phone && ' — שדה חובה'}</label>
                  <input id="c-phone" className={`nt-input${errors.phone ? ' err' : ''}`} placeholder="05X-XXXXXXX" type="tel" value={phone} onChange={e => { setPhone(e.target.value); setErrors(x => ({ ...x, phone: false })); }} autoComplete="tel" aria-required="true" aria-invalid={errors.phone ? 'true' : 'false'} dir="ltr" style={{ textAlign: 'right' }} />
                </div>
                <div>
                  <label className={`nt-field-label${errors.email ? ' err' : ''}`} htmlFor="c-email">מייל{errors.email && ' — שדה לא תקין'}</label>
                  <input id="c-email" className={`nt-input${errors.email ? ' err' : ''}`} placeholder="name@example.com" type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(x => ({ ...x, email: false })); }} autoComplete="email" aria-required="true" aria-invalid={errors.email ? 'true' : 'false'} dir="ltr" style={{ textAlign: 'right' }} />
                </div>
              </div>
            </div>

            {/* Address */}
            {mode === 'delivery' && (
              <div style={{ marginBottom: 24 }}>
                <p className="nt-cart-section-title" style={errors.address ? { color: 'var(--danger)' } : {}}>
                  כתובת למשלוח{errors.address && ' — שדה חובה'}
                </p>
                <AddressSearch error={errors.address} onSelect={data => { setAddressData(data); setErrors(x => ({ ...x, address: false })); }} />
                {addressData && (
                  <div className="nt-address-confirmed" aria-live="polite">
                    ✓ {addressData.address}{addressData.city ? `, ${addressData.city}` : ''}{addressData.zip ? ` ${addressData.zip}` : ''}
                  </div>
                )}
                {addressData && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label className="nt-field-label" htmlFor="b-num">מספר בניין</label>
                      <input id="b-num" className="nt-input nt-input-sm" placeholder="1" value={building} onChange={e => setBuilding(e.target.value)} style={{ textAlign: 'center' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="nt-field-label" htmlFor="a-num">דירה <span style={{ opacity: 0.5, fontWeight: 400 }}>(אופציונלי)</span></label>
                      <input id="a-num" className="nt-input nt-input-sm" placeholder="5" value={apartment} onChange={e => setApartment(e.target.value)} style={{ textAlign: 'center' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              className="btn btn-primary btn-full"
              onClick={submit}
              disabled={submitting}
              style={{ padding: 16, fontSize: 15, letterSpacing: 2, fontWeight: 800, marginBottom: 32 }}
              aria-busy={submitting}
            >
              {submitting
                ? <><span className="spinner" aria-hidden="true" /><span>שולח...</span></>
                : `אישור הזמנה (${totalSets} סט${totalSets !== 1 ? 'ים' : ''})`
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ORDER SUCCESS OVERLAY ────────────────────────────────────────────────────
function OrderSuccessOverlay({ orderNumber, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="nt-overlay" role="dialog" aria-modal="true" aria-label="הזמנה התקבלה">
      <div className="nt-success-modal">
        <div className="nt-success-check" aria-hidden="true"><IcCheck /></div>
        <h2 className="nt-success-title">ההזמנה נקלטה!</h2>
        {orderNumber && (
          <div className="nt-order-num-block" aria-label={`מספר הזמנה: ${orderNumber}`}>
            <span className="nt-order-num-label">מספר הזמנה</span>
            <span className="nt-order-num-val">#{orderNumber}</span>
          </div>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
          נחזור אליך בקרוב לאישור ותיאום משלוח.
        </p>
        <button className="btn btn-primary" onClick={onClose} style={{ padding: '13px 36px', letterSpacing: 2, fontSize: 14 }}>
          המשך קנייה
        </button>
      </div>
    </div>
  );
}

// ─── ADDRESS SEARCH ───────────────────────────────────────────────────────────
function AddressSearch({ onSelect, error }) {
  const [input, setInput]         = useState('');
  const [results, setResults]     = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading]     = useState(false);
  const timer = useRef(null);

  const search = async (q) => {
    if (q.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const url  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=il&format=json&addressdetails=1&limit=7&accept-language=he`;
      const res  = await fetch(url);
      const data = await res.json();
      setResults(data.filter(r => r.address && (r.address.road || r.address.pedestrian || r.address.suburb)));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    clearTimeout(timer.current);
    if (!confirmed) timer.current = setTimeout(() => search(input), 500);
    return () => clearTimeout(timer.current);
  }, [input, confirmed]);

  const select = (item) => {
    const a    = item.address;
    const city = a.city || a.town || a.village || a.municipality || a.county || '';
    const road = a.road || a.pedestrian || a.suburb || '';
    const house   = a.house_number || '';
    const zip     = a.postcode || '';
    const display = [road + (house ? ' ' + house : ''), city].filter(Boolean).join(', ');
    setInput(display); setConfirmed(true); setResults([]);
    onSelect({ city, address: road + (house ? ' ' + house : ''), zip, display });
  };

  return (
    <div className="nt-address-wrap">
      <div style={{ position: 'relative' }}>
        <input
          className={`nt-input${error ? ' err' : ''}`}
          style={confirmed ? { borderColor: 'var(--accent)' } : {}}
          value={input}
          onChange={e => { setInput(e.target.value); setConfirmed(false); onSelect(null); }}
          placeholder="הקלד כתובת ובחר מהרשימה..."
          aria-label="חיפוש כתובת"
          autoComplete="off"
        />
        {loading && (
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <span className="spinner" style={{ width: 14, height: 14 }} aria-label="מחפש..." />
          </div>
        )}
      </div>
      {!confirmed && results.length > 0 && (
        <div className="nt-address-dropdown" role="listbox">
          {results.map(r => {
            const a    = r.address;
            const city = a.city || a.town || a.village || a.municipality || '';
            const road = a.road || a.pedestrian || a.suburb || '';
            const house = a.house_number || '';
            const line1 = road + (house ? ' ' + house : '');
            return (
              <div key={r.place_id} className="nt-address-item" onClick={() => select(r)} role="option" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && select(r)}>
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{line1 || r.display_name.split(',')[0]}</div>
                {city && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{city}</div>}
              </div>
            );
          })}
          <div className="nt-address-osm">© OpenStreetMap contributors</div>
        </div>
      )}
      {!confirmed && input.length >= 3 && !loading && results.length === 0 && (
        <div className="nt-address-dropdown" style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }} role="status" aria-live="polite">
          לא נמצאו תוצאות — נסה כתובת מלאה יותר
        </div>
      )}
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = { new: 'חדשה', sent: 'נשלחה', cancelled: 'בוטלה' };
  const cls = { new: 'nt-badge nt-badge-new', sent: 'nt-badge nt-badge-sent', cancelled: 'nt-badge nt-badge-cancelled' };
  const s = status || 'new';
  return <span className={cls[s] || cls.new}>{map[s] || 'חדשה'}</span>;
}

// ─── ORDER DETAIL MODAL ───────────────────────────────────────────────────────
function OrderDetailModal({ order: o, onClose, onUpdateStatus, onDelete }) {
  const status = o.status || 'new';
  const sets   = o.sets || [];

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const total = sets.reduce((s, i) => s + (i.setPrice || 0) * (i.quantity || 1), 0) || o.total || 0;

  return (
    <div className="nt-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={`פרטי הזמנה #${o.orderNumber || ''}`}>
      <div className="nt-modal nt-order-modal">
        <div className="nt-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="nt-modal-title">פרטי הזמנה</span>
            <StatusBadge status={status} />
          </div>
          <button className="nt-modal-close" onClick={onClose} aria-label="סגור"><IcClose /></button>
        </div>

        <div style={{ padding: '18px 18px 24px', direction: 'rtl' }}>
          {/* Customer */}
          <div className="nt-detail-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <p className="nt-detail-section-label">פרטי לקוח</p>
              {o.orderNumber && (
                <span style={{ background: 'var(--accent)', color: '#fff', padding: '2px 10px', fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-brand)', letterSpacing: 1 }}>#{o.orderNumber}</span>
              )}
            </div>
            <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{o.name}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, direction: 'ltr', textAlign: 'right', marginBottom: 2 }}>{o.phone}</p>
            {o.email && <p style={{ color: 'var(--text-muted)', fontSize: 13, direction: 'ltr', textAlign: 'right' }}>{o.email}</p>}
          </div>

          {/* Delivery */}
          <div className="nt-detail-section">
            <p className="nt-detail-section-label">אופן קבלה</p>
            <p style={{ fontWeight: 700, color: o.deliveryType === 'delivery' ? 'var(--info)' : 'var(--purple)', marginBottom: 4, fontSize: 14 }}>
              {o.deliveryType === 'delivery' ? 'משלוח לבית' : 'איסוף עצמי'}
            </p>
            {o.deliveryType === 'delivery' && (
              <>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{o.address}</p>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{o.city}{o.zip ? ' ' + o.zip : ''}</p>
              </>
            )}
          </div>

          {/* Sets */}
          <div style={{ border: '1px solid var(--border)', marginBottom: 10 }}>
            <div style={{ padding: '10px 16px', background: 'var(--surface-3)', borderBottom: '1px solid var(--border)' }}>
              <p className="nt-detail-section-label" style={{ margin: 0 }}>סטים שהוזמנו</p>
            </div>
            {sets.length === 0 ? (
              <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                — (הזמנה ישנה, אין נתוני סטים)
              </div>
            ) : sets.map((set, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: i < sets.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>סט #{i + 1}</span>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                    חולצה: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{set.shirtSize}</span>
                    {' · '}
                    מכנסיים: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{set.pantsSize}</span>
                    {(set.quantity || 1) > 1 && <span style={{ color: 'var(--text-muted)' }}> × {set.quantity}</span>}
                  </div>
                </div>
                {set.setPrice > 0 && (
                  <span style={{ fontFamily: 'var(--font-brand)', fontSize: 18, color: 'var(--gold)', letterSpacing: 1 }}>
                    ₪{(set.setPrice || 0) * (set.quantity || 1)}
                  </span>
                )}
              </div>
            ))}

            {/* Shipping + total */}
            <div style={{ background: 'var(--surface-3)', borderTop: '2px solid var(--accent)' }}>
              {o.deliveryType === 'delivery' && o.shipping != null && (
                <div className="nt-total-row" style={{ padding: '8px 16px' }}>
                  <span className="nt-total-label" style={{ fontSize: 12 }}>דמי משלוח</span>
                  <span style={{ fontWeight: 700, color: typeof o.shipping === 'number' ? 'var(--info)' : 'var(--danger)', fontSize: 13 }}>
                    {typeof o.shipping === 'number' ? `₪${o.shipping}` : o.shipping}
                  </span>
                </div>
              )}
              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>סה"כ</span>
                <span style={{ fontFamily: 'var(--font-brand)', fontSize: 22, color: 'var(--gold)', letterSpacing: 1 }}>₪{total}</span>
              </div>
            </div>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 20 }}>
            תאריך: {o.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '—'}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {status !== 'sent' && (
              <button className="btn btn-success" style={{ flex: 1, padding: 12, letterSpacing: 1, fontWeight: 800 }} onClick={() => onUpdateStatus(o.id, 'sent')}>✓ סמן כנשלח</button>
            )}
            {status !== 'cancelled' && (
              <button className="btn btn-danger" style={{ flex: 1, padding: 12, letterSpacing: 1, fontWeight: 800 }} onClick={() => onUpdateStatus(o.id, 'cancelled')}>סמן כבוטל</button>
            )}
            {status !== 'new' && (
              <button className="btn btn-ghost" style={{ flex: 1, padding: 12 }} onClick={() => onUpdateStatus(o.id, 'new')}>החזר לפתוחות</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>חזרה לרשימה</button>
            <button
              className="btn"
              style={{ background: 'transparent', borderColor: 'var(--danger)', color: 'var(--danger)', padding: '10px 16px' }}
              onClick={() => { if (window.confirm('למחוק הזמנה זו לצמיתות?')) { onDelete(o.id); onClose(); } }}
              aria-label="מחק הזמנה"
            >
              <IcTrash />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin, onBack }) {
  const [pwd, setPwd] = useState('');
  const inputRef      = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="nt-login-wrap">
      <div className="nt-login-card">
        <div className="nt-login-mark" aria-hidden="true">NT</div>
        <h1 className="nt-login-title">ADMIN PANEL</h1>
        <label className="nt-field-label" htmlFor="admin-pwd" style={{ marginBottom: 10 }}>סיסמה</label>
        <input
          id="admin-pwd" ref={inputRef}
          type="password" value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onLogin(pwd)}
          className="nt-input"
          style={{ textAlign: 'center', letterSpacing: 6, marginBottom: 12, direction: 'ltr' }}
          aria-required="true" autoComplete="current-password"
        />
        <button className="btn btn-primary btn-full" onClick={() => onLogin(pwd)} style={{ marginBottom: 12, letterSpacing: 2, fontWeight: 800 }}>כניסה</button>
        <button className="btn btn-ghost btn-sm btn-full" onClick={onBack}>חזרה לחנות</button>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({ orders, loading, onBack, onRefresh, products, prices, onSavePrices, onUpdateStatus, onDeleteOrder, onDeleteAll, theme, onToggleTheme }) {
  // Aggregate sets from all orders
  const allSets = orders.flatMap(o =>
    (o.sets || []).flatMap(s => Array(s.quantity || 1).fill({ shirtSize: s.shirtSize, pantsSize: s.pantsSize }))
  );
  const totalSetCount = allSets.length;

  // Shirt/pants size counts
  const shirtCounts = {}; const pantsCounts = {};
  allSets.forEach(s => {
    if (s.shirtSize) shirtCounts[s.shirtSize] = (shirtCounts[s.shirtSize] || 0) + 1;
    if (s.pantsSize) pantsCounts[s.pantsSize] = (pantsCounts[s.pantsSize] || 0) + 1;
  });

  const SIZE_ORDER = ['XS','S','M','L','XL','XXL'];
  const sortedSizes = (obj) => Object.entries(obj).sort((a, b) => SIZE_ORDER.indexOf(a[0]) - SIZE_ORDER.indexOf(b[0]));

  const cityMap = {};
  orders.forEach(o => {
    const city = (o.city || '').trim() || 'לא צוין';
    cityMap[city] = (cityMap[city] || 0) + 1;
  });
  const sortedCities  = Object.entries(cityMap).filter(([c]) => c !== 'איסוף עצמי').sort((a, b) => b[1] - a[1]);
  const deliveryCount = orders.filter(o => o.deliveryType === 'delivery').length;
  const pickupCount   = orders.filter(o => o.deliveryType === 'pickup').length;
  const revenue       = orders.reduce((s, o) => s + (o.total || 0), 0);

  const exportCSV = () => {
    const headers = ['#','שם','טלפון','מייל','סוג','עיר','כתובת','מיקוד','מידת חולצה','מידת מכנסיים','כמות','מחיר סט','תאריך'];
    const rows = orders.flatMap(o =>
      (o.sets || []).map(s => [
        o.orderNumber || '', o.name, o.phone, o.email || '',
        o.deliveryType === 'delivery' ? 'משלוח' : 'איסוף עצמי',
        o.city, o.address || '', o.zip || '',
        s.shirtSize, s.pantsSize, s.quantity || 1, s.setPrice || '',
        o.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '',
      ])
    );
    const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'nevotactical_orders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const [editPrices, setEditPrices]     = useState(() => ({ set: prices['set'] ?? 450 }));
  const [savingPrices, setSavingPrices] = useState(false);
  const [pricesSaved, setPricesSaved]   = useState(false);
  const [pricesOpen, setPricesOpen]     = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [tab, setTab]                   = useState('open');
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
    setSavingPrices(false); setPricesSaved(true);
    setTimeout(() => setPricesSaved(false), 2000);
  };

  return (
    <div className="nt-admin-page">
      <header className="nt-page-header">
        <span className="nt-page-title" style={{ fontFamily: 'var(--font-brand)', letterSpacing: 3, fontSize: 16 }}>NT — ADMIN</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="nt-theme-btn" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'עבור למצב בהיר' : 'עבור למצב כהה'}>
            {theme === 'dark' ? <IcSun /> : <IcMoon />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onRefresh} aria-label="רענן"><IcRefresh /> רענן</button>
          <button className="btn btn-ghost btn-sm" onClick={onBack} aria-label="יציאה"><IcLogout /> יציאה</button>
        </div>
      </header>

      <div className="nt-admin-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', direction: 'rtl' }}>
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} aria-label="טוען..." />
            <p style={{ color: 'var(--text-muted)', marginTop: 16, letterSpacing: 2, fontSize: 12 }}>טוען נתונים...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="nt-empty" style={{ direction: 'rtl' }}>
            <div className="nt-empty-icon"><IcBox /></div>
            <h2 className="nt-empty-title">אין הזמנות עדיין</h2>
            <p className="nt-empty-desc">הזמנות שיתקבלו יופיעו כאן.</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="nt-stat-row">
              {[
                { label: 'הזמנות',  value: orders.length,  color: 'var(--accent)' },
                { label: 'סטים',    value: totalSetCount,   color: 'var(--success)' },
                { label: 'משלוח',   value: deliveryCount,  color: 'var(--info)' },
                { label: 'איסוף',   value: pickupCount,    color: 'var(--purple)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="nt-stat-card">
                  <div className="nt-stat-label">{label}</div>
                  <div className="nt-stat-val" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Size breakdown */}
            {totalSetCount > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'חולצות לפי מידה', counts: shirtCounts },
                  { label: 'מכנסיים לפי מידה', counts: pantsCounts },
                ].map(({ label, counts }) => (
                  <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px 18px' }}>
                    <p className="nt-cart-section-title" style={{ marginBottom: 12 }}>{label}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {sortedSizes(counts).map(([size, count]) => (
                        <div key={size} style={{ textAlign: 'center', background: 'var(--surface-3)', border: '1px solid var(--border)', padding: '8px 14px', minWidth: 52 }}>
                          <div style={{ fontFamily: 'var(--font-brand)', fontSize: 22, color: 'var(--accent)', letterSpacing: 1 }}>{count}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>{size}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Prices */}
            <section className="nt-section-collapse">
              <button className="nt-section-collapse-header" onClick={() => setPricesOpen(o => !o)} aria-expanded={pricesOpen}>
                <span className="nt-section-collapse-title">ניהול מחירים</span>
                <span className={`nt-chevron${pricesOpen ? ' open' : ''}`}><IcChevron /></span>
              </button>
              {pricesOpen && (
                <div className="nt-section-collapse-body">
                  <div className="nt-table-wrap">
                    <table className="nt-table">
                      <thead><tr><th>מוצר</th><th style={{ textAlign: 'center' }}>מחיר (₪)</th></tr></thead>
                      <tbody>
                        <tr style={{ cursor: 'default' }}>
                          <td style={{ fontWeight: 700 }}>סט (חולצה + מכנסיים)</td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number" min="0"
                              value={editPrices['set'] ?? ''}
                              placeholder="450"
                              onChange={e => setEditPrices({ set: e.target.value })}
                              className="nt-price-input"
                              aria-label="מחיר סט"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className={`btn ${pricesSaved ? 'btn-success' : 'btn-primary'} btn-sm`} onClick={handleSavePrices} disabled={savingPrices}>
                      {pricesSaved ? '✓ נשמר' : savingPrices ? <><span className="spinner" aria-hidden="true" /> שומר...</> : 'שמור שינויים'}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* City chips */}
            {sortedCities.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <p className="nt-cart-section-title" style={{ marginBottom: 10 }}>ריכוז לפי עיר</p>
                <div className="nt-city-chips">
                  {sortedCities.map(([city, count]) => (
                    <button key={city} className={`nt-city-chip${selectedCity === city ? ' active' : ''}`} onClick={() => setSelectedCity(city === selectedCity ? null : city)} aria-pressed={selectedCity === city}>
                      <span className="nt-city-chip-name">{city}</span>
                      <span className="nt-city-chip-count">{count}</span>
                    </button>
                  ))}
                </div>
                {selectedCity && (() => {
                  const cityOrders = orders.filter(o => (o.city || '').trim() === selectedCity);
                  return (
                    <div style={{ marginTop: 12, border: '1px solid var(--accent)', background: 'var(--surface-2)', animation: 'fadeUp 0.2s ease' }}>
                      <div style={{ padding: '10px 16px', background: 'var(--accent-dim)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent)' }}>הזמנות מ{selectedCity} ({cityOrders.length})</span>
                        <button className="nt-modal-close" onClick={() => setSelectedCity(null)} aria-label="סגור"><IcClose /></button>
                      </div>
                      {cityOrders.map(o => (
                        <div key={o.id} onClick={() => setSelectedOrder(o)} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelectedOrder(o)} role="button">
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{o.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12, direction: 'ltr', textAlign: 'right' }}>{o.phone}</div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                              {(o.sets || []).map((s, i) => (
                                <span key={i} className="nt-item-chip">חולצה {s.shirtSize} + מכנסיים {s.pantsSize}{(s.quantity||1)>1?` ×${s.quantity}`:''}</span>
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

            {/* Orders table */}
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div className="nt-tabs">
                  {[['open', `פתוחות (${openOrders.length})`], ['closed', `סגורות (${closedOrders.length})`]].map(([key, label]) => (
                    <button key={key} className={`nt-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)} role="tab" aria-selected={tab === key}>{label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={exportCSV}><IcDownload /> CSV</button>
                  <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm(`למחוק את כל ${orders.length} ההזמנות?`)) onDeleteAll(); }}><IcTrash /> מחק הכל</button>
                </div>
              </div>

              {displayed.length === 0 ? (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '40px 20px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: 1 }}>{tab === 'open' ? 'אין הזמנות פתוחות' : 'אין הזמנות סגורות'}</p>
                </div>
              ) : (
                <div className="nt-table-wrap">
                  <table className="nt-table">
                    <thead>
                      <tr>
                        {['#','שם','טלפון','סוג','עיר','סטים','מחיר','תאריך','סטטוס','פעולות'].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map(o => {
                        const s = o.status || 'new';
                        return (
                          <tr key={o.id} onClick={() => setSelectedOrder(o)} tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelectedOrder(o)}>
                            <td style={{ fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-brand)', fontSize: 15 }}>{o.orderNumber ? '#' + o.orderNumber : '—'}</td>
                            <td style={{ fontWeight: 600 }}>{o.name}</td>
                            <td style={{ direction: 'ltr', textAlign: 'right', fontSize: 12 }}>{o.phone}</td>
                            <td style={{ color: o.deliveryType === 'delivery' ? 'var(--info)' : 'var(--purple)', fontWeight: 600, fontSize: 12 }}>{o.deliveryType === 'delivery' ? 'משלוח' : 'איסוף'}</td>
                            <td style={{ fontSize: 12 }}>{o.city}</td>
                            <td>
                              {(o.sets || []).map((set, i) => (
                                <span key={i} className="nt-item-chip">חולצה {set.shirtSize} + מכנסיים {set.pantsSize}{(set.quantity||1)>1?` ×${set.quantity}`:''}</span>
                              ))}
                            </td>
                            <td style={{ fontFamily: 'var(--font-brand)', fontSize: 16, color: 'var(--gold)' }}>{o.total ? `₪${o.total}` : '—'}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{o.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '—'}</td>
                            <td><StatusBadge status={s} /></td>
                            <td onClick={e => e.stopPropagation()}>
                              <div className="nt-action-btns">
                                {s !== 'sent'      && <button className="btn btn-success btn-xs" onClick={() => updateStatus(o.id, 'sent')}>נשלח</button>}
                                {s !== 'cancelled' && <button className="btn btn-danger  btn-xs" onClick={() => updateStatus(o.id, 'cancelled')}>בוטל</button>}
                                {s !== 'new'       && <button className="btn btn-ghost   btn-xs" onClick={() => updateStatus(o.id, 'new')}>פתח</button>}
                                <button className="btn btn-xs" style={{ background: 'transparent', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => { if (window.confirm('למחוק הזמנה זו?')) onDeleteOrder(o.id); }}><IcTrash /></button>
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
                onDelete={orderId => { onDeleteOrder(orderId); setSelectedOrder(null); }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── MY ORDERS MODAL ─────────────────────────────────────────────────────────
function MyOrdersModal({ shirtProduct, pantsProduct, setPrice, onAddToCart, onClose }) {
  const [phone, setPhone]   = useState('');
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const search = async () => {
    const p = phone.trim();
    if (!p) { setError('נא להזין מספר טלפון'); return; }
    setLoading(true); setError(''); setOrders(null);
    try {
      const snap  = await getDocs(query(collection(db, 'orders'), where('phone', '==', p)));
      const found = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setOrders(found);
      if (found.length === 0) setError('לא נמצאו הזמנות למספר זה');
    } catch { setError('שגיאה בחיפוש'); }
    setLoading(false);
  };

  const reorder = (order) => {
    const sets = (order.sets || []).map(s => ({
      shirtSize: s.shirtSize, pantsSize: s.pantsSize,
      quantity:  s.quantity || 1, setPrice: setPrice,
    }));
    if (sets.length === 0) return;
    onAddToCart(sets);
  };

  const statusLabel = { new: 'חדשה', sent: 'נשלחה', cancelled: 'בוטלה' };
  const statusCls   = { new: 'nt-badge nt-badge-new', sent: 'nt-badge nt-badge-sent', cancelled: 'nt-badge nt-badge-cancelled' };

  return (
    <div className="nt-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="ההזמנות שלי">
      <div className="nt-modal nt-my-orders-modal">
        <div className="nt-modal-header">
          <span className="nt-modal-title">ההזמנות שלי</span>
          <button className="nt-modal-close" onClick={onClose} aria-label="סגור"><IcClose /></button>
        </div>

        <div style={{ padding: 20, direction: 'rtl' }}>
          <div style={{ marginBottom: 20 }}>
            <label className="nt-field-label" htmlFor="mo-phone">מספר טלפון</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="mo-phone" className={`nt-input${error ? ' err' : ''}`}
                type="tel" placeholder="05X-XXXXXXX"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && search()}
                dir="ltr" style={{ flex: 1, textAlign: 'right' }}
                aria-required="true" aria-invalid={!!error}
              />
              <button className="btn btn-primary" onClick={search} disabled={loading} style={{ padding: '10px 18px' }}>
                {loading ? <span className="spinner" aria-hidden="true" /> : <IcSearch />}
              </button>
            </div>
            {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{error}</p>}
          </div>

          {orders && orders.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-live="polite">
              {orders.map(order => {
                const s     = order.status || 'new';
                const sets  = order.sets || [];
                const total = order.total || 0;
                const date  = order.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '—';
                return (
                  <div key={order.id} className="nt-order-card">
                    <div className="nt-order-card-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {order.orderNumber && (
                          <span style={{ background: 'var(--accent)', color: '#fff', padding: '2px 10px', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-brand)', letterSpacing: 1 }}>#{order.orderNumber}</span>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{date}</span>
                      </div>
                      <span className={statusCls[s] || statusCls.new}>{statusLabel[s] || 'חדשה'}</span>
                    </div>
                    <div className="nt-order-card-body">
                      {sets.map((set, i) => (
                        <div key={i} style={{ fontSize: 13, marginBottom: i < sets.length - 1 ? 4 : 0 }}>
                          חולצה <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{set.shirtSize}</span>
                          {' + '}
                          מכנסיים <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{set.pantsSize}</span>
                          {(set.quantity || 1) > 1 && <span style={{ color: 'var(--text-muted)' }}> × {set.quantity}</span>}
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontFamily: 'var(--font-brand)', fontSize: 20, color: 'var(--gold)', letterSpacing: 1 }}>₪{total}</span>
                        {sets.length > 0 && (
                          <button className="btn btn-primary btn-sm" onClick={() => reorder(order)}>הזמן שוב</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="nt-footer" role="contentinfo">
      <div className="nt-footer-brand">NEVO TACTICAL</div>
      <div className="nt-footer-copy">כל הזכויות שמורות — 2025</div>
    </footer>
  );
}
