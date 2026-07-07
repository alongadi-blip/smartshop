import { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { CATEGORIES } from '../data/embassies';

// Authorization is enforced server-side in firestore.rules;
// this email is only used to show a friendly message to non-admins.
const ADMIN_EMAIL = 'alon.gadi@gmail.com';

const BLANK = { name: '', category: 'hospital', lat: '', lng: '', address: '', notes: '' };

export default function AdminPanel({ pois, onAdd, onDelete, onPickLocation, pendingLatLng }) {
  const [user, setUser]         = useState(null);
  const [authErr, setAuthErr]   = useState('');
  const [form, setForm]         = useState(BLANK);
  const [saving, setSaving]     = useState(false);
  const [saveOk, setSaveOk]     = useState(false);
  const [saveErr, setSaveErr]   = useState('');
  const [pickMode, setPickMode] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const login = async () => {
    setAuthErr('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthErr('שגיאה בהתחברות: ' + (err.message || 'נסה שנית'));
      }
    }
  };

  if (pendingLatLng && (form.lat !== String(pendingLatLng.lat) || form.lng !== String(pendingLatLng.lng))) {
    setForm((f) => ({ ...f, lat: String(pendingLatLng.lat.toFixed(6)), lng: String(pendingLatLng.lng.toFixed(6)) }));
    setPickMode(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.lat || !form.lng) return;
    setSaving(true);
    setSaveOk(false);
    setSaveErr('');
    try {
      await onAdd({
        name:     form.name,
        category: form.category,
        lat:      parseFloat(form.lat),
        lng:      parseFloat(form.lng),
        address:  form.address,
        notes:    form.notes,
      });
      setForm(BLANK);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setSaveErr('שגיאה בשמירה: ' + (err.message || 'נסה שנית'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="admin-panel">
        <h3 className="panel-title">🔐 Admin</h3>
        <button className="btn-primary" onClick={login}>התחבר עם Google</button>
        {authErr && <p className="error-text">{authErr}</p>}
      </div>
    );
  }

  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="admin-panel">
        <h3 className="panel-title">🔐 Admin</h3>
        <p className="error-text">אין הרשאת ניהול לחשבון {user.email}</p>
        <button className="btn-secondary" onClick={() => signOut(auth)}>התנתק</button>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h3 className="panel-title">✏️ הוסף נקודת עניין</h3>
      <p className="admin-user">מחובר כ-{user.email} · <button type="button" className="btn-link" onClick={() => signOut(auth)}>התנתק</button></p>
      <form onSubmit={handleSubmit} dir="rtl">
        <input
          className="admin-input"
          placeholder="שם (לדוגמה: בית חולים Mount Sinai)"
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
          placeholder="כתובת (אופציונלי)"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <textarea
          className="admin-input"
          placeholder="הערות (אופציונלי)"
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
          {pickMode ? '⌛ לחץ על המפה…' : '📌 בחר מיקום על המפה'}
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'שומר…' : '➕ הוסף נקודה'}
        </button>
        {saveOk  && <p className="success-text">✅ נשמר בהצלחה!</p>}
        {saveErr && <p className="error-text">{saveErr}</p>}
      </form>

      {pois.length > 0 && (
        <>
          <hr className="divider" />
          <h4 className="panel-subtitle">נקודות קיימות ({pois.length})</h4>
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
