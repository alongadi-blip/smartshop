import { useState } from 'react';
import { CATEGORIES } from '../data/embassies';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

const BLANK = { name: '', category: 'hospital', lat: '', lng: '', address: '', notes: '' };

export default function AdminPanel({ pois, onAdd, onDelete, onPickLocation, pendingLatLng }) {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [pickMode, setPickMode] = useState(false);

  const login = () => {
    if (pwInput === ADMIN_PASSWORD) { setAuthed(true); setPwError(false); }
    else { setPwError(true); }
  };

  // When the user has picked a location on the map, fill lat/lng in the form
  if (pendingLatLng && (form.lat !== String(pendingLatLng.lat) || form.lng !== String(pendingLatLng.lng))) {
    setForm((f) => ({ ...f, lat: String(pendingLatLng.lat.toFixed(6)), lng: String(pendingLatLng.lng.toFixed(6)) }));
    setPickMode(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.lat || !form.lng) return;
    setSaving(true);
    try {
      await onAdd({
        name: form.name,
        category: form.category,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        address: form.address,
        notes: form.notes,
      });
      setForm(BLANK);
    } finally {
      setSaving(false);
    }
  };

  if (!authed) {
    return (
      <div className="admin-panel">
        <h3 className="panel-title">🔐 Admin</h3>
        <input
          type="password"
          placeholder="סיסמה"
          value={pwInput}
          onChange={(e) => setPwInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && login()}
          className="admin-input"
          dir="rtl"
        />
        {pwError && <p className="error-text">סיסמה שגויה</p>}
        <button className="btn-primary" onClick={login}>כניסה</button>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h3 className="panel-title">✏️ הוסף נקודת עניין</h3>
      <form onSubmit={handleSubmit} dir="rtl">
        <input
          className="admin-input"
          placeholder="שם"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select
          className="admin-input"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {Object.entries(CATEGORIES)
            .filter(([k]) => !['embassy', 'consulate'].includes(k))
            .map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>
        <input
          className="admin-input"
          placeholder="כתובת"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <textarea
          className="admin-input"
          placeholder="הערות"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div className="lat-lng-row">
          <input
            className="admin-input half"
            placeholder="Lat"
            value={form.lat}
            onChange={(e) => setForm({ ...form, lat: e.target.value })}
            required
          />
          <input
            className="admin-input half"
            placeholder="Lng"
            value={form.lng}
            onChange={(e) => setForm({ ...form, lng: e.target.value })}
            required
          />
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => { setPickMode(true); onPickLocation(); }}
        >
          {pickMode ? '⌛ לחץ על המפה…' : '📌 בחר על המפה'}
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'שומר…' : 'הוסף'}
        </button>
      </form>

      {pois.length > 0 && (
        <>
          <hr className="divider" />
          <h4 className="panel-subtitle">נקודות קיימות</h4>
          <ul className="poi-list">
            {pois.map((p) => (
              <li key={p.id} className="poi-item">
                <span>{CATEGORIES[p.category]?.emoji} {p.name}</span>
                <button className="btn-delete" onClick={() => onDelete(p.id)}>🗑</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
