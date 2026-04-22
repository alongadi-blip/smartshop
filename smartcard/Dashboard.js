import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVouchers, deleteVoucher, searchStores } from '../api';

// Bold color palette per brand
const BRAND_COLORS = {
  'נופשונית': { bg: '#5B5EF4', text: '#fff', accent: '#8B8EF8' },
  'swish':    { bg: '#0EA5E9', text: '#fff', accent: '#38BDF8' },
  'buyme':    { bg: '#EC4899', text: '#fff', accent: '#F472B6' },
  'ביי מי':   { bg: '#EC4899', text: '#fff', accent: '#F472B6' },
  'פמינה':    { bg: '#A855F7', text: '#fff', accent: '#C084FC' },
  'גוד פארם': { bg: '#14B8A6', text: '#fff', accent: '#2DD4BF' },
  'golf':     { bg: '#3B82F6', text: '#fff', accent: '#60A5FA' },
  'רמי לוי':  { bg: '#F97316', text: '#fff', accent: '#FB923C' },
  'שופרסל':   { bg: '#EF4444', text: '#fff', accent: '#F87171' },
};

const COLOR_POOL = [
  { bg: '#5B5EF4', text: '#fff', accent: '#8B8EF8' },
  { bg: '#22C55E', text: '#fff', accent: '#4ADE80' },
  { bg: '#F59E0B', text: '#fff', accent: '#FCD34D' },
  { bg: '#EF4444', text: '#fff', accent: '#F87171' },
  { bg: '#8B5CF6', text: '#fff', accent: '#A78BFA' },
  { bg: '#06B6D4', text: '#fff', accent: '#22D3EE' },
  { bg: '#EC4899', text: '#fff', accent: '#F472B6' },
  { bg: '#10B981', text: '#fff', accent: '#34D399' },
];

const getBrandColor = (name) => {
  if (!name) return COLOR_POOL[0];
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(BRAND_COLORS)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return COLOR_POOL[name.charCodeAt(0) % COLOR_POOL.length];
};

const getDaysLeft = (expiry) => {
  if (!expiry) return null;
  return Math.ceil((new Date(expiry) - new Date()) / 86400000);
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .sc-root {
    min-height: 100vh;
    background: #0F0F14;
    font-family: 'DM Sans', sans-serif;
    direction: rtl;
    color: #fff;
    padding-bottom: 100px;
  }

  /* Header */
  .sc-header {
    padding: 52px 20px 20px;
    background: #0F0F14;
    position: sticky;
    top: 0;
    z-index: 100;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .sc-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .sc-logo {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 800;
    background: linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.6) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
  }
  .sc-header-actions { display: flex; gap: 8px; }
  .sc-icon-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: none; color: rgba(255,255,255,0.6);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 16px; transition: all 0.2s;
  }
  .sc-icon-btn:hover { background: rgba(255,255,255,0.14); color: #fff; }

  /* Balance summary pill */
  .sc-balance-pill {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sc-balance-label { font-size: 12px; color: rgba(255,255,255,0.5); }
  .sc-balance-amount {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -1px;
  }
  .sc-balance-count { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }

  /* Search */
  .sc-search-wrap { padding: 14px 20px 0; }
  .sc-search {
    width: 100%; background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 10px 14px;
    color: #fff; font-size: 14px; font-family: 'DM Sans', sans-serif;
    outline: none; direction: rtl;
  }
  .sc-search::placeholder { color: rgba(255,255,255,0.3); }
  .sc-search:focus { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.09); }

  /* Main content */
  .sc-content { padding: 20px 20px 0; }

  /* Section heading */
  .sc-section-head {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 14px;
  }
  .sc-section-title { font-size: 12px; color: rgba(255,255,255,0.4); letter-spacing: 1px; text-transform: uppercase; }
  .sc-section-count {
    font-size: 11px; background: rgba(255,255,255,0.1);
    border-radius: 20px; padding: 2px 8px; color: rgba(255,255,255,0.5);
  }

  /* Featured card (first voucher, full width) */
  .sc-card-featured {
    border-radius: 20px;
    padding: 22px;
    margin-bottom: 12px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .sc-card-featured:hover { transform: scale(1.01); }
  .sc-card-featured::after {
    content: '';
    position: absolute; top: -30px; left: -30px;
    width: 120px; height: 120px;
    border-radius: 50%;
    background: rgba(255,255,255,0.07);
    pointer-events: none;
  }

  /* Small card grid */
  .sc-cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .sc-card {
    border-radius: 18px;
    padding: 18px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .sc-card:hover { transform: scale(1.02); }
  .sc-card::before {
    content: '';
    position: absolute; bottom: -20px; right: -20px;
    width: 80px; height: 80px;
    border-radius: 50%;
    background: rgba(255,255,255,0.07);
    pointer-events: none;
  }

  .sc-card-brand { font-size: 11px; opacity: 0.75; margin-bottom: 4px; font-weight: 500; }
  .sc-card-amount {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1;
  }
  .sc-card-featured .sc-card-amount { font-size: 38px; margin-bottom: 8px; }
  .sc-card .sc-card-amount { font-size: 24px; margin-bottom: 6px; }

  .sc-card-note { font-size: 13px; opacity: 0.8; font-weight: 500; margin-bottom: 6px; }
  .sc-card-featured .sc-card-note { font-size: 15px; margin-bottom: 10px; }

  /* Expiry badge */
  .sc-expiry {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 600;
    padding: 3px 8px; border-radius: 20px;
  }
  .sc-expiry-ok   { background: rgba(0,0,0,0.2); color: rgba(255,255,255,0.85); }
  .sc-expiry-warn { background: rgba(255,200,0,0.25); color: #FFD700; }
  .sc-expiry-dead { background: rgba(255,80,80,0.3); color: #FF8080; }

  /* Card actions */
  .sc-card-actions {
    position: absolute; top: 10px; left: 10px;
    display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;
  }
  .sc-card:hover .sc-card-actions,
  .sc-card-featured:hover .sc-card-actions { opacity: 1; }
  .sc-card-action {
    width: 26px; height: 26px; border-radius: 50%;
    background: rgba(0,0,0,0.35); backdrop-filter: blur(4px);
    border: none; color: rgba(255,255,255,0.9);
    cursor: pointer; font-size: 12px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .sc-card-action:hover { background: rgba(0,0,0,0.6); }
  .sc-card-action.delete:hover { background: rgba(220,50,50,0.7); }

  /* Link chip */
  .sc-link-chip {
    display: inline-flex; align-items: center; gap: 4px;
    margin-top: 8px; padding: 4px 10px;
    background: rgba(0,0,0,0.25); border-radius: 20px;
    font-size: 11px; color: rgba(255,255,255,0.9);
    text-decoration: none; cursor: pointer; border: none;
    font-family: 'DM Sans', sans-serif; font-weight: 500;
  }
  .sc-link-chip:hover { background: rgba(0,0,0,0.4); }

  /* Image thumb */
  .sc-thumb {
    width: 100%; border-radius: 10px; max-height: 70px;
    object-fit: cover; margin-top: 8px;
    cursor: pointer; border: 1.5px solid rgba(255,255,255,0.15);
  }
  .sc-card-featured .sc-thumb { max-height: 100px; }

  /* Empty state */
  .sc-empty {
    text-align: center; padding: 60px 20px;
  }
  .sc-empty-icon {
    width: 72px; height: 72px; border-radius: 50%;
    background: rgba(255,255,255,0.07);
    display: flex; align-items: center; justify-content: center;
    font-size: 32px; margin: 0 auto 16px;
  }
  .sc-empty h3 { font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.7); }
  .sc-empty p { font-size: 13px; color: rgba(255,255,255,0.35); margin-top: 6px; }

  /* FAB */
  .sc-fab {
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
    width: 60px; height: 60px; border-radius: 50%;
    background: linear-gradient(145deg, #fff 0%, #e0e0e0 100%);
    color: #0F0F14; font-size: 28px; font-weight: 300;
    border: none; cursor: pointer;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
    z-index: 200;
  }
  .sc-fab:hover { transform: translateX(-50%) scale(1.08); box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
  .sc-fab:active { transform: translateX(-50%) scale(0.96); }

  /* Lightbox */
  .sc-lightbox {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(0,0,0,0.92);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .sc-lightbox img { max-width: 100%; max-height: 85vh; border-radius: 12px; }
  .sc-lightbox-close {
    position: absolute; top: 16px; right: 16px;
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.15); border: none;
    color: #fff; font-size: 18px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }

  /* Search results */
  .sc-search-results {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px; padding: 16px;
    margin-bottom: 16px;
  }
  .sc-search-results-head {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
  }
  .sc-search-results-title { font-size: 13px; font-weight: 600; }
  .sc-search-results-close {
    background: none; border: none; color: rgba(255,255,255,0.4);
    cursor: pointer; font-size: 16px;
  }
  .sc-brand-result { margin-bottom: 10px; }
  .sc-brand-result-name { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 6px; }
  .sc-store-chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .sc-store-chip {
    font-size: 11px; padding: 3px 9px; border-radius: 20px;
    background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.7);
  }

  /* Nav bar */
  .sc-navbar {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: rgba(15,15,20,0.95);
    backdrop-filter: blur(12px);
    border-top: 1px solid rgba(255,255,255,0.07);
    padding: 10px 0 20px;
    display: flex; justify-content: space-around; align-items: center;
    z-index: 150;
  }
  .sc-nav-btn {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: none; border: none; cursor: pointer; padding: 4px 20px;
    color: rgba(255,255,255,0.4); transition: color 0.2s;
  }
  .sc-nav-btn:hover { color: rgba(255,255,255,0.8); }
  .sc-nav-btn.active { color: #fff; }
  .sc-nav-icon { font-size: 20px; }
  .sc-nav-label { font-size: 10px; font-weight: 500; font-family: 'DM Sans', sans-serif; }
`;

export default function Dashboard({ onLogout }) {
  const [vouchers, setVouchers] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const [sortBy, setSortBy] = useState('category');
  const navigate = useNavigate();

  useEffect(() => { loadVouchers(); }, []);

  const loadVouchers = async () => {
    try {
      const res = await getVouchers();
      setVouchers(res.data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  };

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && search.trim()) {
      const res = await searchStores(search);
      setSearchResults(res.data);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('למחוק את השובר?')) return;
    await deleteVoucher(id);
    loadVouchers();
  };

  const totalBalance = vouchers
    .filter(v => v.media_type !== 'image' || !v.notes)
    .reduce((sum, v) => sum + (Number(v.balance) || 0), 0);

  const ExpiryBadge = ({ expiry_date }) => {
    const days = getDaysLeft(expiry_date);
    if (days === null) return null;
    const cls = days <= 0 ? 'sc-expiry sc-expiry-dead' : days <= 14 ? 'sc-expiry sc-expiry-warn' : 'sc-expiry sc-expiry-ok';
    const label = days <= 0 ? 'פג תוקף' : `עוד ${days} ימים`;
    return <span className={cls}>⏱ {label}</span>;
  };

  const CardInner = ({ v, featured }) => {
    const color = getBrandColor(v.brand_name);
    const isImg = v.media_type === 'image' && v.notes;
    return (
      <div
        className={featured ? 'sc-card-featured' : 'sc-card'}
        style={{ background: color.bg, color: color.text }}
      >
        {/* decoration circle top-left */}
        <div style={{
          position: 'absolute', top: featured ? -40 : -30,
          right: featured ? -40 : -30,
          width: featured ? 130 : 90, height: featured ? 130 : 90,
          borderRadius: '50%', background: 'rgba(255,255,255,0.09)', pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="sc-card-brand">{v.brand_name}</div>

          {isImg
            ? <div className="sc-card-note">{v.notes}</div>
            : <div className="sc-card-amount">₪{Number(v.balance).toLocaleString()}</div>
          }

          <ExpiryBadge expiry_date={v.expiry_date} />

          {v.media_value && v.media_type === 'image' && (
            <img
              className="sc-thumb"
              src={v.media_value}
              alt=""
              onClick={(e) => { e.stopPropagation(); setExpandedImage(v.media_value); }}
            />
          )}

          {v.media_value && v.media_type === 'link' && (
            <button className="sc-link-chip" onClick={(e) => { e.stopPropagation(); window.open(v.media_value, '_blank'); }}>
              🔗 פתח שובר
            </button>
          )}
        </div>

        {/* actions */}
        <div className="sc-card-actions">
          <button className="sc-card-action" onClick={(e) => { e.stopPropagation(); navigate('/edit', { state: { voucher: v } }); }} title="עריכה">✏️</button>
          <button className="sc-card-action delete" onClick={(e) => handleDelete(v.id, e)} title="מחיקה">🗑</button>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <div className="sc-root">

        {expandedImage && (
          <div className="sc-lightbox" onClick={() => setExpandedImage(null)}>
            <button className="sc-lightbox-close">✕</button>
            <img src={expandedImage} alt="" onClick={e => e.stopPropagation()} />
          </div>
        )}

        {/* Header */}
        <div className="sc-header">
          <div className="sc-header-top">
            <span className="sc-logo">SmartCard</span>
            <div className="sc-header-actions">
              <button className="sc-icon-btn" onClick={() => navigate('/groups')} title="קבוצות">👥</button>
              <button className="sc-icon-btn" onClick={onLogout} title="יציאה">↩</button>
            </div>
          </div>

          <div className="sc-balance-pill">
            <div>
              <div className="sc-balance-label">סה״כ יתרה</div>
              <div className="sc-balance-amount">₪{totalBalance.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div className="sc-balance-label">שוברים פעילים</div>
              <div style={{ fontSize: 22, fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#fff' }}>{vouchers.length}</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="sc-search-wrap">
          <input
            className="sc-search"
            placeholder="🔍  חפש חנות... (ספא, פיצה, נייקי)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', direction: 'rtl' }}>
          {[['category', 'לפי קטגוריה'], ['brand', 'לפי מותג']].map(([val, label]) => (
            <button key={val} onClick={() => setSortBy(val)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.15)',
              background: sortBy === val ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: sortBy === val ? '#fff' : 'rgba(255,255,255,0.45)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
            }}>{label}</button>
          ))}
        </div>

        {/* Content */}
        <div className="sc-content">

          {searchResults && (
            <div className="sc-search-results">
              <div className="sc-search-results-head">
                <span className="sc-search-results-title">תוצאות חיפוש</span>
                <button className="sc-search-results-close" onClick={() => setSearchResults(null)}>✕</button>
              </div>
              {Object.keys(searchResults).length === 0 ? (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>לא נמצאו שוברים תואמים</div>
              ) : Object.entries(searchResults).map(([brand, data]) => (
                <div key={brand} className="sc-brand-result">
                  <div className="sc-brand-result-name">{brand}</div>
                  <div className="sc-store-chips">
                    {data.stores.slice(0, 5).map(s => <span key={s} className="sc-store-chip">{s}</span>)}
                    {data.stores.length > 5 && <span className="sc-store-chip">+{data.stores.length - 5}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {vouchers.length === 0 ? (
            <div className="sc-empty">
              <div className="sc-empty-icon">🎫</div>
              <h3>אין שוברים עדיין</h3>
              <p>לחץ על + כדי להוסיף שובר ראשון</p>
            </div>
          ) : sortBy === 'brand' ? (
            <>
              <div className="sc-section-head">
                <span className="sc-section-count">{vouchers.length}</span>
                <span className="sc-section-title">לפי מותג</span>
              </div>
              <div className="sc-cards-grid" style={{ gridTemplateColumns: '1fr' }}>
                {[...vouchers].sort((a, b) => (a.brand_name || '').localeCompare(b.brand_name || '', 'he')).map(v => (
                  <CardInner key={v.id} v={v} featured={false} />
                ))}
              </div>
            </>
          ) : (
            <>
              {Object.entries(
                vouchers.reduce((acc, v) => {
                  const cat = v.category || 'כללי';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(v);
                  return acc;
                }, {})
              ).map(([category, catVouchers]) => (
                <div key={category}>
                  <div className="sc-section-head">
                    <span className="sc-section-count">{catVouchers.length}</span>
                    <span className="sc-section-title">{category}</span>
                  </div>
                  <CardInner v={catVouchers[0]} featured={true} />
                  {catVouchers.length > 1 && (
                    <div className="sc-cards-grid">
                      {catVouchers.slice(1).map(v => <CardInner key={v.id} v={v} featured={false} />)}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* FAB */}
        <button className="sc-fab" onClick={() => navigate('/add')}>+</button>

        {/* Bottom nav */}
        <nav className="sc-navbar">
          <button className="sc-nav-btn active">
            <span className="sc-nav-icon">🎫</span>
            <span className="sc-nav-label">שוברים</span>
          </button>
          <button className="sc-nav-btn" onClick={() => navigate('/groups')}>
            <span className="sc-nav-icon">👥</span>
            <span className="sc-nav-label">קבוצות</span>
          </button>
          <button className="sc-nav-btn" onClick={onLogout}>
            <span className="sc-nav-icon">↩</span>
            <span className="sc-nav-label">יציאה</span>
          </button>
        </nav>
      </div>
    </>
  );
}
