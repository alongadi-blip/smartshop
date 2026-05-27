import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, getDocs, getDoc, setDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, query, orderBy, where, runTransaction,
} from 'firebase/firestore';
import { PRODUCTS } from './products';

const ADMIN_PASSWORD = 'NevoAdmin2025';

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
const IcRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
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
const IcPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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

// ─── CATEGORY ORDER ───────────────────────────────────────────────────────────
const CATEGORY_ORDER = ['חולצות', 'גופיות', 'מכנסיים', "ג'קטים", 'אקססוריז'];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]             = useState(window.location.hash === '#admin' ? 'admin' : 'home');
  const [cart, setCart]             = useState([]);
  const [sizeModal, setSizeModal]   = useState(null);
  const [adminAuth, setAdminAuth]   = useState(false);
  const [orders, setOrders]         = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [prices, setPrices]         = useState({});
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    getDoc(doc(db, 'settings', 'prices')).then(snap => {
      if (snap.exists()) setPrices(snap.data());
    }).catch(() => {});
  }, []);

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

  const addToCart = (product, size, quantity = 1) => {
    setCart(c => [...c, {
      key: Date.now() + Math.random(),
      productId: product.id, productName: product.name,
      size, quantity, price: product.price,
      imageUrl: product.imageUrl, color1: product.color1,
      color2: product.color2, letter: product.letter,
    }]);
    setSizeModal(null);
  };

  const removeFromCart = (key) => setCart(c => c.filter(i => i.key !== key));
  const changeQty = (key, qty) => setCart(c => c.map(i => i.key === key ? { ...i, quantity: qty } : i));

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoadingOrders(false);
  };

  const cartCount = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const cartTotal = cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

  // ── Admin page ──
  if (page === 'admin') {
    if (!adminAuth) return (
      <AdminLogin
        onLogin={pwd => {
          if (pwd === ADMIN_PASSWORD) { setAdminAuth(true); loadOrders(); }
          else alert('סיסמה שגויה');
        }}
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
      />
    );
  }

  // ── Cart page ──
  if (page === 'cart') {
    return (
      <CartPage
        cart={cart}
        onRemove={removeFromCart}
        onChangeQty={changeQty}
        onBack={goHome}
        onOrderDone={(orderNumber) => { setOrderSuccess({ orderNumber }); goHome(); }}
      />
    );
  }

  // ── Home page ──
  const categories = ['all', ...CATEGORY_ORDER.filter(cat =>
    products.some(p => p.category === cat)
  )];
  const catCount = (cat) => cat === 'all' ? products.length : products.filter(p => p.category === cat).length;
  const filtered  = activeCategory === 'all' ? products : products.filter(p => p.category === activeCategory);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header
        cartCount={cartCount}
        cartTotal={cartTotal}
        onCart={goCart}
        onAdmin={goAdmin}
        onMyOrders={() => setShowMyOrders(true)}
      />

      <Hero productCount={products.length} />

      {/* Category filter */}
      <nav className="nt-filter-bar" aria-label="סינון קטגוריות">
        {categories.map(cat => (
          <button
            key={cat}
            className={`nt-filter-btn${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
          >
            {cat === 'all' ? 'הכל' : cat}
            <span className="nt-filter-count">{catCount(cat)}</span>
          </button>
        ))}
      </nav>

      {/* Product grid */}
      <main className="nt-shop">
        <div className="nt-section-header">
          <span className="nt-section-label">
            {activeCategory === 'all' ? `קולקציה — ${filtered.length} פריטים` : `${activeCategory} — ${filtered.length} פריטים`}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="nt-empty">
            <div className="nt-empty-icon">NT</div>
            <p className="nt-empty-title">אין פריטים בקטגוריה זו</p>
          </div>
        ) : (
          <div className="nt-grid" role="list">
            {filtered.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                onClick={() => setSizeModal(p)}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {sizeModal && (
        <SizeModal
          key={sizeModal.id}
          product={sizeModal}
          onAdd={addToCart}
          onClose={() => setSizeModal(null)}
        />
      )}

      {orderSuccess && (
        <OrderSuccessOverlay
          orderNumber={orderSuccess.orderNumber}
          onClose={() => { setOrderSuccess(null); setCart([]); }}
        />
      )}

      {showMyOrders && (
        <MyOrdersModal
          products={products}
          onAddToCart={(items) => {
            items.forEach(i => setCart(c => [...c, { key: Date.now() + Math.random(), ...i }]));
            setShowMyOrders(false);
          }}
          onClose={() => setShowMyOrders(false)}
        />
      )}
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ cartCount, cartTotal, onCart, onAdmin, onMyOrders }) {
  return (
    <header className="nt-header">
      <a href="#" className="nt-logo" onClick={e => { e.preventDefault(); window.location.hash = ''; }} aria-label="Nevo Tactical — דף הבית">
        <div className="nt-logo-mark" aria-hidden="true">NT</div>
        <span className="nt-logo-name">NEVO TACTICAL</span>
      </a>

      <div className="nt-header-actions">
        <button
          onClick={onMyOrders}
          className="btn btn-ghost btn-sm hide-mobile"
          aria-label="ההזמנות שלי"
        >
          הזמנות שלי
        </button>

        <button
          onClick={onAdmin}
          className="btn btn-ghost btn-sm"
          style={{ letterSpacing: '2px', fontSize: '10px' }}
          aria-label="כניסה לניהול"
        >
          ADMIN
        </button>

        <button
          onClick={onCart}
          className={`btn-cart ${cartCount > 0 ? 'has-items' : 'empty'}`}
          aria-label={`סל קניות${cartCount > 0 ? `, ${cartCount} פריטים, ₪${cartTotal}` : ', ריק'}`}
        >
          <IcCart />
          <span>סל</span>
          {cartCount > 0 && (
            <>
              <span className="cart-badge" aria-hidden="true">{cartCount}</span>
              <span className="cart-price" aria-hidden="true">₪{cartTotal}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero({ productCount }) {
  return (
    <section className="nt-hero" aria-label="באנר ראשי">
      <div className="nt-hero-inner">
        <span className="nt-hero-eyebrow">ציוד טקטי מקצועי</span>
        <h1 className="nt-hero-title">NEVO<br />TACTICAL</h1>
        <p className="nt-hero-sub">
          ביגוד ואקססוריז טקטיים לשטח, אימון ויומיום.<br />
          חומרים מהשורה הראשונה. עיצוב שנבנה לפעולה.
        </p>
        <div className="nt-hero-cta">
          <a
            href="#products"
            className="btn btn-primary"
            onClick={e => { e.preventDefault(); document.querySelector('.nt-shop')?.scrollIntoView({ behavior: 'smooth' }); }}
          >
            לקולקציה
          </a>
        </div>
        <div className="nt-hero-stat" aria-label="מספרים">
          <div className="nt-hero-stat-item">
            <div className="nt-hero-stat-num">{productCount}</div>
            <div className="nt-hero-stat-label">מוצרים</div>
          </div>
          <div className="nt-hero-stat-item">
            <div className="nt-hero-stat-num">IL</div>
            <div className="nt-hero-stat-label">משלוח לכל הארץ</div>
          </div>
          <div className="nt-hero-stat-item">
            <div className="nt-hero-stat-num">PRO</div>
            <div className="nt-hero-stat-label">ציוד מקצועי</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product: p, index, onClick }) {
  return (
    <article
      className="nt-card"
      onClick={onClick}
      role="listitem"
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      aria-label={`${p.name}${p.price ? `, ₪${p.price}` : ''}`}
      style={{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}
    >
      {/* Image */}
      <div className="nt-card-image">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} loading="lazy" />
        ) : (
          <div
            className="nt-card-placeholder"
            style={{ background: `linear-gradient(145deg, ${p.color1}, ${p.color2})`, width: '100%', height: '100%' }}
            aria-hidden="true"
          >
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>{p.letter}</span>
          </div>
        )}
        <span className="nt-card-cat-tag" aria-label={`קטגוריה: ${p.category}`}>
          {p.category}
        </span>
      </div>

      {/* Body */}
      <div className="nt-card-body">
        <h3 className="nt-card-name">{p.name}</h3>
        <p className="nt-card-desc">{p.description}</p>

        <div className="nt-card-sizes" aria-label="מידות זמינות">
          {p.sizes.slice(0, 5).map(s => (
            <span key={s} className="nt-size-pip">{s}</span>
          ))}
          {p.sizes.length > 5 && <span className="nt-size-pip">+{p.sizes.length - 5}</span>}
        </div>

        <div className="nt-card-footer">
          {p.price
            ? <span className="nt-card-price" aria-label={`מחיר: ₪${p.price}`}>₪{p.price}</span>
            : <span className="nt-card-no-price">מחיר לפי פנייה</span>
          }
          <button
            className="btn btn-primary btn-sm"
            onClick={e => { e.stopPropagation(); onClick(); }}
            aria-label={`הוסף ${p.name} לסל`}
          >
            הוסף לסל
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── SIZE MODAL ───────────────────────────────────────────────────────────────
function SizeModal({ product: p, onAdd, onClose }) {
  const [size, setSize]   = useState('');
  const [qty, setQty]     = useState(1);
  const [added, setAdded] = useState(false);
  const firstBtn = useRef(null);

  useEffect(() => {
    firstBtn.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleAdd = () => {
    if (!size) return;
    onAdd(p, size, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div
      className="nt-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`בחירת מידה עבור ${p.name}`}
    >
      <div className="nt-modal" style={{ maxWidth: '390px' }}>
        {/* Close */}
        <button
          className="nt-modal-close"
          onClick={onClose}
          aria-label="סגור"
          style={{ position: 'absolute', top: '12px', left: '14px', zIndex: 1 }}
          ref={firstBtn}
        >
          <IcClose />
        </button>

        {/* Banner */}
        <div className="nt-size-banner">
          <div className="nt-size-thumb">
            {p.imageUrl
              ? <img src={p.imageUrl} alt={p.name} />
              : (
                <div
                  style={{ width: '100%', height: '100%', background: `linear-gradient(145deg, ${p.color1}, ${p.color2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-hidden="true"
                >
                  <span style={{ fontFamily: 'var(--font-brand)', fontSize: '22px', color: 'rgba(255,255,255,0.4)' }}>{p.letter}</span>
                </div>
              )
            }
          </div>
          <div style={{ direction: 'rtl' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>{p.name}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.55 }}>{p.description}</p>
            {p.price && <p style={{ fontFamily: 'var(--font-brand)', fontSize: '20px', color: 'var(--gold)', marginTop: '4px', letterSpacing: '1px' }}>₪{p.price}</p>}
          </div>
        </div>

        {/* Body */}
        <div className="nt-size-body">
          <label className={`nt-field-label${!size ? ' err' : ''}`} id="size-label">
            בחר מידה {!size && <span aria-hidden="true">— חובה</span>}
          </label>
          <div className="nt-size-grid" role="group" aria-labelledby="size-label">
            {p.sizes.map(s => (
              <button
                key={s}
                className={`nt-size-opt${size === s ? ' sel' : ''}`}
                onClick={() => setSize(s)}
                aria-pressed={size === s}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="nt-field-label" id="qty-label">כמות</label>
          <div className="nt-qty" role="group" aria-labelledby="qty-label" style={{ marginBottom: '22px' }}>
            <button
              className="nt-qty-btn"
              onClick={() => setQty(q => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="הפחת כמות"
            >−</button>
            <div className="nt-qty-val" aria-live="polite" aria-label={`כמות: ${qty}`}>{qty}</div>
            <button
              className="nt-qty-btn"
              onClick={() => setQty(q => q + 1)}
              aria-label="הגדל כמות"
            >+</button>
          </div>

          <button
            className="btn btn-full"
            onClick={handleAdd}
            disabled={!size}
            style={{
              padding: '14px',
              fontSize: '14px',
              letterSpacing: '2px',
              fontWeight: 800,
              background: !size ? 'var(--surface-3)' : added ? 'var(--success)' : 'var(--accent)',
              color: !size ? 'var(--text-faint)' : '#fff',
              border: '1px solid',
              borderColor: !size ? 'var(--border)' : added ? 'var(--success)' : 'var(--accent)',
              transition: 'all 0.2s',
              cursor: !size ? 'not-allowed' : 'pointer',
              pointerEvents: !size ? 'none' : 'auto',
            }}
            aria-label={added ? 'נוסף לסל' : `הוסף לסל${qty > 1 ? ` (${qty})` : ''}`}
          >
            {added ? '✓  נוסף לסל!' : `הוסף לסל${qty > 1 ? ` (${qty})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CART PAGE ────────────────────────────────────────────────────────────────
function CartPage({ cart, onRemove, onChangeQty, onBack, onOrderDone }) {
  const [mode, setMode]             = useState('delivery');
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [email, setEmail]           = useState('');
  const [addressData, setAddressData] = useState(null);
  const [building, setBuilding]     = useState('');
  const [apartment, setApartment]   = useState('');
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);

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

      const items      = cart.map(i => ({ productId: i.productId, productName: i.productName, size: i.size, quantity: i.quantity || 1, price: i.price || 0 }));
      const itemsTotal = cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
      const totalQty   = cart.reduce((s, i) => s + (i.quantity || 1), 0);
      const shipping   = mode === 'delivery' ? (totalQty <= 2 ? 50 : null) : 0;
      const total      = itemsTotal + (shipping || 0);
      const city       = mode === 'delivery' ? (addressData?.city || '') : 'איסוף עצמי';
      const address    = mode === 'delivery'
        ? [addressData?.address, building ? 'בניין ' + building : '', apartment ? 'דירה ' + apartment : ''].filter(Boolean).join(', ')
        : '';
      const zip        = mode === 'delivery' ? (addressData?.zip || '') : '';

      await addDoc(collection(db, 'orders'), {
        orderNumber, items, total,
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

  const itemsTotal = cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const totalQty   = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const shipping   = mode === 'delivery' ? (totalQty <= 2 ? 50 : null) : 0;

  return (
    <div className="nt-page">
      <header className="nt-page-header">
        <span className="nt-page-title">הסל שלך</span>
        <button onClick={onBack} className="btn btn-ghost btn-sm" aria-label="חזרה לחנות">
          ← המשך קנייה
        </button>
      </header>

      <div className="nt-cart-container">

        {cart.length === 0 ? (
          <div className="nt-empty" style={{ paddingTop: 80 }}>
            <div className="nt-empty-icon">
              <IcBox />
            </div>
            <h2 className="nt-empty-title">הסל ריק</h2>
            <p className="nt-empty-desc">לא הוספת פריטים עדיין.<br />חזור לחנות ובחר מה שאתה צריך.</p>
            <button onClick={onBack} className="btn btn-primary">חזרה לחנות</button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div style={{ marginBottom: '24px' }}>
              <p className="nt-cart-section-title">פריטים בסל ({totalQty})</p>
              <div className="nt-cart-items">
                {cart.map(item => {
                  const qty     = item.quantity || 1;
                  const subtotal = (item.price || 0) * qty;
                  return (
                    <div key={item.key} className="nt-cart-item">
                      <div className="nt-cart-thumb">
                        {item.imageUrl
                          ? <img src={item.imageUrl} alt={item.productName} />
                          : <span style={{ fontFamily: 'var(--font-brand)', fontSize: '18px', color: 'var(--text-faint)' }}>{item.letter}</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="nt-cart-item-name">{item.productName}</p>
                        <p className="nt-cart-item-size">
                          מידה: <span className="nt-cart-size-val">{item.size}</span>
                        </p>
                        <div className="nt-qty nt-cart-qty">
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
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        {qty > 1 && <span className="nt-cart-item-unit">₪{item.price} × {qty}</span>}
                        <span className="nt-cart-item-price">₪{subtotal}</span>
                        <button
                          className="nt-cart-remove"
                          onClick={() => onRemove(item.key)}
                          aria-label={`הסר ${item.productName} מהסל`}
                        >
                          <IcClose />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="nt-total-block" role="region" aria-label="סיכום מחירים">
                <div className="nt-total-row">
                  <span className="nt-total-label">סכום פריטים</span>
                  <span style={{ fontWeight: 700 }}>₪{itemsTotal}</span>
                </div>
                {mode === 'delivery' && (
                  <div className="nt-total-row">
                    <span className="nt-total-label">דמי משלוח</span>
                    {totalQty <= 2
                      ? <span style={{ fontWeight: 700, color: 'var(--info)' }}>₪50</span>
                      : <span style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 700 }}>הצעה טלפונית</span>
                    }
                  </div>
                )}
                <div className="nt-total-grand">
                  <span className="nt-total-grand-label">סה"כ לתשלום</span>
                  {mode === 'delivery' && totalQty > 2
                    ? <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>יחושב טלפונית</span>
                    : <span className="nt-total-grand-val">₪{itemsTotal + (mode === 'delivery' ? 50 : 0)}</span>
                  }
                </div>
              </div>
            </div>

            {/* Delivery mode */}
            <div style={{ marginBottom: '20px' }}>
              <p className="nt-cart-section-title">אופן קבלה</p>
              <div className="nt-delivery-toggle" role="group" aria-label="אופן קבלת ההזמנה">
                {[['delivery', 'משלוח לבית'], ['pickup', 'איסוף עצמי']].map(([v, label]) => (
                  <button
                    key={v}
                    className={`nt-delivery-opt${mode === v ? ' active' : ''}`}
                    onClick={() => setMode(v)}
                    aria-pressed={mode === v}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div style={{ marginBottom: '20px' }}>
              <p className="nt-cart-section-title">פרטי קשר</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label className={`nt-field-label${errors.name ? ' err' : ''}`} htmlFor="contact-name">
                    שם מלא{errors.name && ' — שדה חובה'}
                  </label>
                  <input
                    id="contact-name"
                    className={`nt-input${errors.name ? ' err' : ''}`}
                    placeholder="שם מלא"
                    value={name}
                    onChange={e => { setName(e.target.value); setErrors(x => ({ ...x, name: false })); }}
                    autoComplete="name"
                    aria-required="true"
                    aria-invalid={errors.name ? 'true' : 'false'}
                  />
                </div>
                <div>
                  <label className={`nt-field-label${errors.phone ? ' err' : ''}`} htmlFor="contact-phone">
                    טלפון{errors.phone && ' — שדה חובה'}
                  </label>
                  <input
                    id="contact-phone"
                    className={`nt-input${errors.phone ? ' err' : ''}`}
                    placeholder="05X-XXXXXXX"
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setErrors(x => ({ ...x, phone: false })); }}
                    autoComplete="tel"
                    aria-required="true"
                    aria-invalid={errors.phone ? 'true' : 'false'}
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                </div>
                <div>
                  <label className={`nt-field-label${errors.email ? ' err' : ''}`} htmlFor="contact-email">
                    כתובת מייל{errors.email && ' — שדה לא תקין'}
                  </label>
                  <input
                    id="contact-email"
                    className={`nt-input${errors.email ? ' err' : ''}`}
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrors(x => ({ ...x, email: false })); }}
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={errors.email ? 'true' : 'false'}
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            {mode === 'delivery' && (
              <div style={{ marginBottom: '24px' }}>
                <p className={`nt-cart-section-title${errors.address ? '' : ''}`} style={errors.address ? { color: 'var(--danger)' } : {}}>
                  כתובת למשלוח{errors.address && ' — שדה חובה'}
                </p>
                <AddressSearch
                  error={errors.address}
                  onSelect={data => { setAddressData(data); setErrors(x => ({ ...x, address: false })); }}
                />
                {addressData && (
                  <div className="nt-address-confirmed" aria-live="polite">
                    <IcCheck size={12} /> {addressData.address}{addressData.city ? `, ${addressData.city}` : ''}{addressData.zip ? ` ${addressData.zip}` : ''}
                  </div>
                )}
                {addressData && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label className="nt-field-label" htmlFor="building-num">מספר בניין</label>
                      <input
                        id="building-num"
                        className="nt-input nt-input-sm"
                        placeholder="1"
                        value={building}
                        onChange={e => setBuilding(e.target.value)}
                        style={{ textAlign: 'center' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="nt-field-label" htmlFor="apt-num">
                        מספר דירה <span style={{ opacity: 0.5, fontWeight: 400 }}>(אופציונלי)</span>
                      </label>
                      <input
                        id="apt-num"
                        className="nt-input nt-input-sm"
                        placeholder="5"
                        value={apartment}
                        onChange={e => setApartment(e.target.value)}
                        style={{ textAlign: 'center' }}
                      />
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
              style={{ padding: '16px', fontSize: '15px', letterSpacing: '2px', fontWeight: 800, marginBottom: 32 }}
              aria-busy={submitting}
            >
              {submitting
                ? <><span className="spinner" aria-hidden="true" /><span>שולח...</span></>
                : `אישור הזמנה (${totalQty} פריטים)`
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
        <div className="nt-success-check" aria-hidden="true">
          <IcCheck />
        </div>
        <h2 className="nt-success-title">ההזמנה נקלטה!</h2>
        {orderNumber && (
          <div className="nt-order-num-block" aria-label={`מספר הזמנה: ${orderNumber}`}>
            <span className="nt-order-num-label">מספר הזמנה</span>
            <span className="nt-order-num-val">#{orderNumber}</span>
          </div>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
          נחזור אליך בקרוב לאישור ותיאום המשלוח.
        </p>
        <button
          className="btn btn-primary"
          onClick={onClose}
          style={{ padding: '13px 36px', letterSpacing: '2px', fontSize: 14 }}
        >
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
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=il&format=json&addressdetails=1&limit=7&accept-language=he`;
      const res  = await fetch(url);
      const data = await res.json();
      const filtered = data.filter(r => r.address && (r.address.road || r.address.pedestrian || r.address.suburb));
      setResults(filtered);
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
    setInput(display);
    setConfirmed(true);
    setResults([]);
    onSelect({ city, address: road + (house ? ' ' + house : ''), zip, display });
  };

  return (
    <div className="nt-address-wrap" role="combobox" aria-expanded={!confirmed && results.length > 0} aria-haspopup="listbox">
      <div style={{ position: 'relative' }}>
        <input
          className={`nt-input${error ? ' err' : confirmed ? '' : ''}`}
          style={confirmed ? { borderColor: 'var(--accent)' } : {}}
          value={input}
          onChange={e => { setInput(e.target.value); setConfirmed(false); onSelect(null); }}
          placeholder="הקלד כתובת ובחר מהרשימה..."
          aria-label="חיפוש כתובת"
          aria-autocomplete="list"
          autoComplete="off"
        />
        {loading && (
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} aria-live="polite" aria-label="מחפש...">
            <span className="spinner" style={{ width: 14, height: 14 }} />
          </div>
        )}
      </div>

      {!confirmed && results.length > 0 && (
        <div className="nt-address-dropdown" role="listbox" aria-label="תוצאות חיפוש כתובת">
          {results.map(r => {
            const a    = r.address;
            const city = a.city || a.town || a.village || a.municipality || '';
            const road = a.road || a.pedestrian || a.suburb || '';
            const house = a.house_number || '';
            const line1 = road + (house ? ' ' + house : '');
            return (
              <div
                key={r.place_id}
                className="nt-address-item"
                onClick={() => select(r)}
                role="option"
                tabIndex={0}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && select(r)}
                aria-label={[line1, city].filter(Boolean).join(', ')}
              >
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                  {line1 || r.display_name.split(',')[0]}
                </div>
                {city && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{city}</div>}
              </div>
            );
          })}
          <div className="nt-address-osm">© OpenStreetMap contributors</div>
        </div>
      )}

      {!confirmed && input.length >= 3 && !loading && results.length === 0 && (
        <div
          className="nt-address-dropdown"
          style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}
          role="status"
          aria-live="polite"
        >
          לא נמצאו תוצאות — נסה כתובת מלאה יותר
        </div>
      )}
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    new:       'חדשה',
    sent:      'נשלחה',
    cancelled: 'בוטלה',
  };
  const cls = {
    new:       'nt-badge nt-badge-new',
    sent:      'nt-badge nt-badge-sent',
    cancelled: 'nt-badge nt-badge-cancelled',
  };
  const s = status || 'new';
  return <span className={cls[s] || cls.new}>{map[s] || 'חדשה'}</span>;
}

// ─── ORDER DETAIL MODAL ───────────────────────────────────────────────────────
function OrderDetailModal({ order: o, onClose, onUpdateStatus, onDelete, onUpdateItems, products }) {
  const status  = o.status || 'new';
  const [items, setItems]         = useState(o.items || [{ productName: o.productName, size: o.size, price: o.price, quantity: 1 }]);
  const total                     = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0) || o.total || 0;
  const [editingIdx, setEditingIdx]   = useState(null);
  const [editingSize, setEditingSize] = useState('');
  const [editingQty, setEditingQty]   = useState(1);
  const [savingIdx, setSavingIdx]     = useState(null);
  const [addingItem, setAddingItem]   = useState(false);
  const [newProduct, setNewProduct]   = useState(null);
  const [newSize, setNewSize]         = useState('');
  const [savingAdd, setSavingAdd]     = useState(false);

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saveSize = async (idx) => {
    if (!editingSize) return;
    setSavingIdx(idx);
    try {
      const newItems = items.map((item, i) => i === idx ? { ...item, size: editingSize, quantity: editingQty } : item);
      await onUpdateItems(o.id, newItems);
      setItems(newItems);
      setEditingIdx(null);
    } catch (err) { console.error(err); alert('שגיאה בשמירה: ' + err.message); }
    setSavingIdx(null);
  };

  const saveNewItem = async () => {
    if (!newProduct || !newSize) return;
    setSavingAdd(true);
    try {
      const newItems = [...items, { productId: newProduct.id, productName: newProduct.name, size: newSize, price: newProduct.price || 0 }];
      await onUpdateItems(o.id, newItems);
      setItems(newItems);
      setAddingItem(false);
      setNewProduct(null);
      setNewSize('');
    } catch (err) { console.error(err); alert('שגיאה בשמירה: ' + err.message); }
    setSavingAdd(false);
  };

  const removeItem = async (idx) => {
    if (items.length === 1) { alert('לא ניתן למחוק את הפריט האחרון בהזמנה'); return; }
    try {
      const newItems = items.filter((_, i) => i !== idx);
      await onUpdateItems(o.id, newItems);
      setItems(newItems);
    } catch (err) { console.error(err); alert('שגיאה במחיקה: ' + err.message); }
  };

  return (
    <div
      className="nt-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`פרטי הזמנה #${o.orderNumber || ''}`}
    >
      <div className="nt-modal nt-order-modal">
        {/* Header */}
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
                <span style={{ background: 'var(--accent)', color: '#fff', padding: '2px 10px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-brand)', letterSpacing: 1 }}>
                  #{o.orderNumber}
                </span>
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

          {/* Items */}
          <div style={{ border: '1px solid var(--border)', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-3)' }}>
              <p className="nt-detail-section-label" style={{ margin: 0 }}>פריטים</p>
              <button
                className="btn btn-primary btn-xs"
                onClick={() => { setAddingItem(true); setNewProduct(null); setNewSize(''); }}
              >
                <IcPlus /> הוסף פריט
              </button>
            </div>

            {items.map((item, i) => {
              const matchedProduct  = products?.find(p => p.name === item.productName);
              const availableSizes  = matchedProduct?.sizes || ['XS','S','M','L','XL','XXL','One Size'];
              const isEditing       = editingIdx === i;
              return (
                <div key={i} style={{ padding: '12px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{item.productName}</span>
                      {!isEditing && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}> / {item.size}</span>}
                      {!isEditing && (item.quantity || 1) > 1 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> × {item.quantity}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.price > 0 && !isEditing && <span style={{ color: 'var(--gold)', fontWeight: 700, fontFamily: 'var(--font-brand)', fontSize: 16 }}>₪{(item.price || 0) * (item.quantity || 1)}</span>}
                      {!isEditing && (
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => { setEditingIdx(i); setEditingSize(item.size); setEditingQty(item.quantity || 1); }}
                          aria-label={`ערוך ${item.productName}`}
                        >
                          <IcEdit />
                        </button>
                      )}
                      {!isEditing && items.length > 1 && (
                        <button
                          className="btn btn-xs"
                          onClick={() => removeItem(i)}
                          style={{ background: 'transparent', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                          aria-label={`הסר ${item.productName}`}
                        >
                          <IcTrash />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{ marginTop: 10, padding: 14, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                      <p className="nt-field-label">מידה</p>
                      <div className="nt-size-grid" style={{ marginBottom: 14 }}>
                        {availableSizes.map(s => (
                          <button
                            key={s}
                            className={`nt-size-opt${editingSize === s ? ' sel' : ''}`}
                            onClick={() => setEditingSize(s)}
                            aria-pressed={editingSize === s}
                          >{s}</button>
                        ))}
                      </div>
                      <p className="nt-field-label">כמות</p>
                      <div className="nt-qty" style={{ marginBottom: 14 }}>
                        <button className="nt-qty-btn" style={{ width: 32, height: 32, fontSize: 15 }} onClick={() => setEditingQty(q => Math.max(1, q - 1))} aria-label="הפחת כמות">−</button>
                        <div className="nt-qty-val" style={{ width: 42, height: 32, fontSize: 14 }}>{editingQty}</div>
                        <button className="nt-qty-btn" style={{ width: 32, height: 32, fontSize: 15 }} onClick={() => setEditingQty(q => q + 1)} aria-label="הגדל כמות">+</button>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => saveSize(i)}
                          disabled={savingIdx === i || !editingSize}
                        >
                          {savingIdx === i ? <><span className="spinner" aria-hidden="true" /> שומר...</> : 'שמור'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingIdx(null)}>ביטול</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add item form */}
            {addingItem && (
              <div style={{ padding: '14px 16px', background: 'var(--accent-dim)', borderTop: '1px solid var(--border)' }}>
                <p className="nt-field-label">הוסף פריט — מוצר</p>
                <div className="nt-size-grid" style={{ marginBottom: 12 }}>
                  {(products || []).map(p => (
                    <button
                      key={p.id}
                      className={`nt-size-opt${newProduct?.id === p.id ? ' sel' : ''}`}
                      onClick={() => { setNewProduct(p); setNewSize(''); }}
                      style={{ fontSize: 11 }}
                      aria-pressed={newProduct?.id === p.id}
                    >{p.name}</button>
                  ))}
                </div>
                {newProduct && (
                  <>
                    <p className="nt-field-label">מידה</p>
                    <div className="nt-size-grid" style={{ marginBottom: 12 }}>
                      {newProduct.sizes.map(s => (
                        <button
                          key={s}
                          className={`nt-size-opt${newSize === s ? ' sel' : ''}`}
                          onClick={() => setNewSize(s)}
                          aria-pressed={newSize === s}
                        >{s}</button>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={saveNewItem}
                    disabled={!newProduct || !newSize || savingAdd}
                  >
                    {savingAdd ? <><span className="spinner" aria-hidden="true" /> מוסיף...</> : <><IcPlus /> הוסף</>}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAddingItem(false)}>ביטול</button>
                </div>
              </div>
            )}

            {(total > 0 || o.shipping) && (
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
                  <span style={{ fontFamily: 'var(--font-brand)', fontSize: 20, color: 'var(--gold)', letterSpacing: 1 }}>₪{total}</span>
                </div>
              </div>
            )}
          </div>

          {/* Date */}
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 20 }}>
            תאריך: {o.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '—'}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {status !== 'sent' && (
              <button className="btn btn-success" style={{ flex: 1, padding: '12px', letterSpacing: 1, fontWeight: 800 }} onClick={() => onUpdateStatus(o.id, 'sent')}>
                ✓ סמן כנשלח
              </button>
            )}
            {status !== 'cancelled' && (
              <button className="btn btn-danger" style={{ flex: 1, padding: '12px', letterSpacing: 1, fontWeight: 800 }} onClick={() => onUpdateStatus(o.id, 'cancelled')}>
                סמן כבוטל
              </button>
            )}
            {status !== 'new' && (
              <button
                className="btn btn-ghost"
                style={{ flex: 1, padding: '12px' }}
                onClick={() => onUpdateStatus(o.id, 'new')}
              >
                החזר לפתוחות
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>חזרה לרשימה</button>
            <button
              className="btn"
              style={{ background: 'transparent', borderColor: 'var(--danger)', color: 'var(--danger)', padding: '10px 16px' }}
              onClick={() => { if (window.confirm('למחוק הזמנה זו לצמיתות?')) { onDelete(o.id); onClose(); } }}
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
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="nt-login-wrap">
      <div className="nt-login-card">
        <div className="nt-login-mark" aria-hidden="true">NT</div>
        <h1 className="nt-login-title">ADMIN PANEL</h1>
        <label className="nt-field-label" htmlFor="admin-pwd" style={{ marginBottom: 10 }}>סיסמה</label>
        <input
          id="admin-pwd"
          ref={inputRef}
          type="password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onLogin(pwd)}
          className="nt-input"
          style={{ textAlign: 'center', letterSpacing: 6, marginBottom: 12, direction: 'ltr' }}
          aria-required="true"
          autoComplete="current-password"
        />
        <button
          className="btn btn-primary btn-full"
          onClick={() => onLogin(pwd)}
          style={{ marginBottom: 12, letterSpacing: 2, fontWeight: 800 }}
        >
          כניסה
        </button>
        <button className="btn btn-ghost btn-sm btn-full" onClick={onBack}>
          חזרה לחנות
        </button>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({ orders, loading, onBack, onRefresh, products, prices, onSavePrices, onUpdateStatus, onDeleteOrder, onDeleteAll }) {
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
    const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
    return order.indexOf(a) - order.indexOf(b);
  });

  const sortedCities  = Object.entries(cityMap).filter(([c]) => c !== 'איסוף עצמי').sort((a, b) => b[1] - a[1]);
  const deliveryCount = orders.filter(o => o.deliveryType === 'delivery').length;
  const pickupCount   = orders.filter(o => o.deliveryType === 'pickup').length;
  const revenue       = orders.reduce((s, o) => s + (o.total || 0), 0);

  const exportCSV = () => {
    const headers = ['#', 'שם', 'טלפון', 'מייל', 'סוג', 'עיר', 'כתובת', 'מיקוד', 'מוצר', 'גודל', 'תאריך'];
    const rows = orders.flatMap(o =>
      (o.items || [{ productName: o.productName, size: o.size }]).map(item => [
        o.orderNumber || '', o.name, o.phone, o.email || '',
        o.deliveryType === 'delivery' ? 'משלוח' : 'איסוף עצמי',
        o.city, o.address, o.zip,
        item.productName, item.size,
        o.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '',
      ])
    );
    const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'nevotactical_orders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const [editPrices, setEditPrices]   = useState(() => Object.fromEntries(products.map(p => [p.id, p.price ?? ''])));
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

  const updateOrderItems = async (orderId, newItems) => {
    const newTotal = newItems.reduce((s, i) => s + (i.price || 0), 0);
    await updateDoc(doc(db, 'orders', orderId), { items: newItems, total: newTotal });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: newItems, total: newTotal } : o));
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

  return (
    <div className="nt-admin-page">
      {/* Header */}
      <header className="nt-page-header">
        <span className="nt-page-title" style={{ fontFamily: 'var(--font-brand)', letterSpacing: 3, fontSize: 16 }}>
          NT — ADMIN
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onRefresh} aria-label="רענן נתונים">
            <IcRefresh /> רענן
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onBack} aria-label="צא מהניהול">
            <IcLogout /> יציאה
          </button>
        </div>
      </header>

      <div className="nt-admin-content">

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', direction: 'rtl' }}>
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} aria-label="טוען הזמנות..." />
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
            <div className="nt-stat-row" role="region" aria-label="סטטיסטיקות">
              {[
                { label: 'הזמנות',    value: orders.length,  color: 'var(--accent)' },
                { label: 'פריטים',    value: allItems.length, color: 'var(--success)' },
                { label: 'משלוח',     value: deliveryCount,  color: 'var(--info)' },
                { label: 'איסוף',     value: pickupCount,    color: 'var(--purple)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="nt-stat-card">
                  <div className="nt-stat-label">{label}</div>
                  <div className="nt-stat-val" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Prices panel */}
            <section className="nt-section-collapse" aria-label="ניהול מחירים">
              <button
                className="nt-section-collapse-header"
                onClick={() => setPricesOpen(o => !o)}
                aria-expanded={pricesOpen}
              >
                <span className="nt-section-collapse-title">ניהול מחירים</span>
                <span className={`nt-chevron${pricesOpen ? ' open' : ''}`}><IcChevron /></span>
              </button>

              {pricesOpen && (
                <div className="nt-section-collapse-body">
                  <div className="nt-table-wrap">
                    <table className="nt-table" aria-label="טבלת מחירים">
                      <thead>
                        <tr>
                          <th>מוצר</th>
                          <th>קטגוריה</th>
                          <th style={{ textAlign: 'center' }}>מחיר (₪)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id} style={{ cursor: 'default' }}>
                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.category}</td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                value={editPrices[p.id] ?? ''}
                                placeholder="לא מוגדר"
                                onChange={e => setEditPrices(prev => ({ ...prev, [p.id]: e.target.value }))}
                                className="nt-price-input"
                                aria-label={`מחיר ${p.name}`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className={`btn ${pricesSaved ? 'btn-success' : 'btn-primary'} btn-sm`}
                      onClick={handleSavePrices}
                      disabled={savingPrices}
                    >
                      {pricesSaved ? '✓ נשמר' : savingPrices ? <><span className="spinner" aria-hidden="true" /> שומר...</> : 'שמור שינויים'}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Product × Size table */}
            <section style={{ marginBottom: 24 }} aria-label="פריטים לפי מוצר וגודל">
              <p className="nt-cart-section-title" style={{ marginBottom: 10 }}>פריטים לפי מוצר וגודל</p>
              <div className="nt-table-wrap">
                <table className="nt-table" aria-label="פריטים לפי מוצר וגודל">
                  <thead>
                    <tr>
                      <th>מוצר</th>
                      {allSizes.map(s => <th key={s} style={{ textAlign: 'center' }}>{s}</th>)}
                      <th style={{ textAlign: 'center' }}>סה"כ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(bySizeProduct).map(([pname, sizes]) => {
                      const rowTotal = Object.values(sizes).reduce((a, b) => a + b, 0);
                      return (
                        <tr key={pname} style={{ cursor: 'default' }}>
                          <td style={{ fontWeight: 600 }}>{pname}</td>
                          {allSizes.map(s => (
                            <td key={s} style={{ textAlign: 'center', color: sizes[s] ? 'var(--accent)' : 'var(--text-faint)', fontWeight: sizes[s] ? 700 : 400 }}>
                              {sizes[s] || '—'}
                            </td>
                          ))}
                          <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-brand)', fontSize: 18 }}>{rowTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* City filter */}
            {sortedCities.length > 0 && (
              <section style={{ marginBottom: 24 }} aria-label="ריכוז לפי עיר">
                <p className="nt-cart-section-title" style={{ marginBottom: 10 }}>ריכוז לפי עיר (משלוחים)</p>
                <div className="nt-city-chips">
                  {sortedCities.map(([city, count]) => (
                    <button
                      key={city}
                      className={`nt-city-chip${selectedCity === city ? ' active' : ''}`}
                      onClick={() => setSelectedCity(city === selectedCity ? null : city)}
                      aria-pressed={selectedCity === city}
                    >
                      <span className="nt-city-chip-name">{city}</span>
                      <span className="nt-city-chip-count" aria-label={`${count} הזמנות`}>{count}</span>
                    </button>
                  ))}
                </div>

                {selectedCity && (() => {
                  const cityOrders = orders.filter(o => (o.city || '').trim() === selectedCity);
                  return (
                    <div style={{ marginTop: 12, border: '1px solid var(--accent)', background: 'var(--surface-2)', animation: 'fadeUp 0.2s ease' }}>
                      <div style={{ padding: '10px 16px', background: 'var(--accent-dim)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>הזמנות מ{selectedCity} ({cityOrders.length})</span>
                        <button className="nt-modal-close" onClick={() => setSelectedCity(null)} aria-label="סגור"><IcClose /></button>
                      </div>
                      {cityOrders.map(o => (
                        <div
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          role="button"
                          tabIndex={0}
                          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelectedOrder(o)}
                          aria-label={`פרטי הזמנה של ${o.name}`}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{o.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 3, direction: 'ltr', textAlign: 'right' }}>{o.phone}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{o.address}</div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                              {(o.items || [{ productName: o.productName, size: o.size }]).map((item, i) => (
                                <span key={i} className="nt-item-chip">{item.productName} / {item.size}</span>
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

            {/* Orders section */}
            <section aria-label="הזמנות">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div className="nt-tabs" role="tablist" aria-label="סינון הזמנות">
                  {[['open', `פתוחות (${openOrders.length})`], ['closed', `סגורות (${closedOrders.length})`]].map(([key, label]) => (
                    <button
                      key={key}
                      className={`nt-tab${tab === key ? ' active' : ''}`}
                      onClick={() => setTab(key)}
                      role="tab"
                      aria-selected={tab === key}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={exportCSV} aria-label="ייצוא לקובץ CSV">
                    <IcDownload /> CSV
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => { if (window.confirm(`למחוק את כל ${orders.length} ההזמנות? פעולה זו אינה הפיכה.`)) onDeleteAll(); }}
                    aria-label="מחק את כל ההזמנות"
                  >
                    <IcTrash /> מחק הכל
                  </button>
                </div>
              </div>

              {displayed.length === 0 ? (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '40px 20px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: 1 }}>
                    {tab === 'open' ? 'אין הזמנות פתוחות' : 'אין הזמנות סגורות'}
                  </p>
                </div>
              ) : (
                <div className="nt-table-wrap" role="tabpanel">
                  <table className="nt-table" aria-label={tab === 'open' ? 'הזמנות פתוחות' : 'הזמנות סגורות'}>
                    <thead>
                      <tr>
                        {['#', 'שם', 'טלפון', 'מייל', 'סוג', 'עיר', 'פריטים', 'תאריך', 'סטטוס', 'פעולות'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map(o => {
                        const s = o.status || 'new';
                        return (
                          <tr
                            key={o.id}
                            onClick={() => setSelectedOrder(o)}
                            tabIndex={0}
                            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelectedOrder(o)}
                            aria-label={`הזמנה #${o.orderNumber || ''} של ${o.name}`}
                          >
                            <td style={{ fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-brand)', fontSize: 15 }}>
                              {o.orderNumber ? '#' + o.orderNumber : '—'}
                            </td>
                            <td style={{ fontWeight: 600 }}>{o.name}</td>
                            <td style={{ direction: 'ltr', textAlign: 'right', fontSize: 12 }}>{o.phone}</td>
                            <td style={{ direction: 'ltr', textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>{o.email || '—'}</td>
                            <td style={{ color: o.deliveryType === 'delivery' ? 'var(--info)' : 'var(--purple)', fontWeight: 600, fontSize: 12 }}>
                              {o.deliveryType === 'delivery' ? 'משלוח' : 'איסוף'}
                            </td>
                            <td style={{ fontSize: 12 }}>{o.city}</td>
                            <td>
                              {(o.items || [{ productName: o.productName, size: o.size, quantity: 1 }]).map((item, i) => (
                                <span key={i} className="nt-item-chip">
                                  {item.productName} / {item.size}{(item.quantity || 1) > 1 ? ` ×${item.quantity}` : ''}
                                </span>
                              ))}
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                              {o.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '—'}
                            </td>
                            <td><StatusBadge status={s} /></td>
                            <td onClick={e => e.stopPropagation()}>
                              <div className="nt-action-btns">
                                {s !== 'sent' && (
                                  <button className="btn btn-success btn-xs" onClick={() => updateStatus(o.id, 'sent')}>נשלח</button>
                                )}
                                {s !== 'cancelled' && (
                                  <button className="btn btn-danger btn-xs" onClick={() => updateStatus(o.id, 'cancelled')}>בוטל</button>
                                )}
                                {s !== 'new' && (
                                  <button className="btn btn-ghost btn-xs" onClick={() => updateStatus(o.id, 'new')}>פתח</button>
                                )}
                                <button
                                  className="btn btn-xs"
                                  style={{ background: 'transparent', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                  onClick={() => { if (window.confirm('למחוק הזמנה זו?')) onDeleteOrder(o.id); }}
                                  aria-label={`מחק הזמנה #${o.orderNumber || ''}`}
                                >
                                  <IcTrash />
                                </button>
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
                onUpdateItems={updateOrderItems}
                products={products}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── MY ORDERS MODAL ─────────────────────────────────────────────────────────
function MyOrdersModal({ products, onAddToCart, onClose }) {
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
      const found = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setOrders(found);
      if (found.length === 0) setError('לא נמצאו הזמנות למספר זה');
    } catch { setError('שגיאה בחיפוש'); }
    setLoading(false);
  };

  const reorder = (order) => {
    const items = (order.items || [{ productName: order.productName, size: order.size, price: order.price, quantity: 1 }])
      .map(item => {
        const product = products.find(p => p.name === item.productName);
        return {
          productId:   product?.id || item.productId || '',
          productName: item.productName,
          size:        item.size,
          quantity:    item.quantity || 1,
          price:       product?.price ?? item.price ?? 0,
          imageUrl:    product?.imageUrl || null,
          color1:      product?.color1 || '#333',
          color2:      product?.color2 || '#666',
          letter:      product?.letter || item.productName?.[0] || '?',
        };
      });
    onAddToCart(items);
  };

  const statusLabel = { new: 'חדשה', sent: 'נשלחה', cancelled: 'בוטלה' };
  const statusCls   = { new: 'nt-badge nt-badge-new', sent: 'nt-badge nt-badge-sent', cancelled: 'nt-badge nt-badge-cancelled' };

  return (
    <div
      className="nt-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="ההזמנות שלי"
    >
      <div className="nt-modal nt-my-orders-modal">
        <div className="nt-modal-header">
          <span className="nt-modal-title">ההזמנות שלי</span>
          <button className="nt-modal-close" onClick={onClose} aria-label="סגור"><IcClose /></button>
        </div>

        <div style={{ padding: 20, direction: 'rtl' }}>
          {/* Search */}
          <div style={{ marginBottom: 20 }}>
            <label className="nt-field-label" htmlFor="my-orders-phone">מספר טלפון</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="my-orders-phone"
                className={`nt-input${error ? ' err' : ''}`}
                type="tel"
                placeholder="05X-XXXXXXX"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && search()}
                dir="ltr"
                style={{ flex: 1, textAlign: 'right' }}
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? 'my-orders-error' : undefined}
              />
              <button
                className="btn btn-primary"
                onClick={search}
                disabled={loading}
                style={{ padding: '10px 18px', letterSpacing: 1 }}
                aria-label="חפש הזמנות"
              >
                {loading ? <span className="spinner" aria-hidden="true" /> : <IcSearch />}
              </button>
            </div>
            {error && (
              <p id="my-orders-error" role="alert" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>
                {error}
              </p>
            )}
          </div>

          {/* Results */}
          {orders && orders.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-live="polite">
              {orders.map(order => {
                const s      = order.status || 'new';
                const items  = order.items || [{ productName: order.productName, size: order.size, price: order.price, quantity: 1 }];
                const total  = order.total || items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
                const date   = order.timestamp?.toDate?.()?.toLocaleDateString('he-IL') || '—';
                return (
                  <div key={order.id} className="nt-order-card">
                    <div className="nt-order-card-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {order.orderNumber && (
                          <span style={{ background: 'var(--accent)', color: '#fff', padding: '2px 10px', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-brand)', letterSpacing: 1 }}>
                            #{order.orderNumber}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{date}</span>
                      </div>
                      <span className={statusCls[s] || statusCls.new}>{statusLabel[s] || 'חדשה'}</span>
                    </div>
                    <div className="nt-order-card-body">
                      {items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: i < items.length - 1 ? 4 : 0 }}>
                          <span>
                            {item.productName} / <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{item.size}</span>
                            {(item.quantity || 1) > 1 && <span style={{ color: 'var(--text-muted)' }}> × {item.quantity}</span>}
                          </span>
                          {item.price > 0 && (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>₪{(item.price || 0) * (item.quantity || 1)}</span>
                          )}
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontFamily: 'var(--font-brand)', fontSize: 20, color: 'var(--gold)', letterSpacing: 1 }}>₪{total}</span>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => reorder(order)}
                          aria-label={`הזמן שוב את הזמנה #${order.orderNumber || ''}`}
                        >
                          הזמן שוב
                        </button>
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
