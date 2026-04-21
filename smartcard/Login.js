import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api';
import axios from 'axios';

const API_BASE = 'http://138.2.162.153:8000/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .lg-root {
    min-height: 100vh; background: #0F0F14;
    font-family: 'DM Sans', sans-serif; direction: rtl; color: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px;
  }
  .lg-logo { font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800; letter-spacing: -1px; margin-bottom: 6px; }
  .lg-tagline { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 36px; }
  .lg-card { width: 100%; max-width: 360px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 28px; }
  .lg-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
  .lg-tab { flex: 1; padding: 10px; border-radius: 12px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
  .lg-tab-active { background: rgba(255,255,255,0.14); color: #fff; }
  .lg-tab-inactive { background: transparent; color: rgba(255,255,255,0.35); }
  .lg-input { width: 100%; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 13px 16px; color: #fff; font-size: 15px; font-family: 'DM Sans', sans-serif; outline: none; margin-bottom: 12px; direction: ltr; }
  .lg-input:focus { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.09); }
  .lg-input::placeholder { color: rgba(255,255,255,0.25); }
  .lg-submit { width: 100%; padding: 15px; background: linear-gradient(135deg, #fff 0%, #e0e0e0 100%); color: #0F0F14; font-size: 16px; font-weight: 700; border: none; border-radius: 14px; cursor: pointer; font-family: 'Syne', sans-serif; margin-top: 4px; transition: transform 0.15s; }
  .lg-submit:hover { transform: translateY(-1px); }
  .lg-error { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #FCA5A5; text-align: center; margin-bottom: 12px; }
  .lg-dots { display: flex; gap: 6px; justify-content: center; margin-top: 24px; }
  .lg-dot { width: 6px; height: 6px; border-radius: 50%; }
  .lg-totp { font-size: 13px; color: rgba(255,255,255,0.5); text-align: center; margin-bottom: 12px; }
`;

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setError(''); setLoading(true);
    try {
      if (tempToken) {
        // TOTP step
        const res = await axios.post(`${API_BASE}/auth/totp/verify-login`, { temp_token: tempToken, code: totpCode });
        onLogin(res.data.access_token);
      } else if (mode === 'login') {
        const res = await login(email, password);
        if (res.data.requires_2fa) {
          setTempToken(res.data.temp_token);
        } else {
          onLogin(res.data.access_token);
        }
      } else {
        const res = await register(email, password);
        onLogin(res.data.access_token);
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'שגיאה, נסה שוב');
    }
    setLoading(false);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="lg-root">
        <div className="lg-logo">SmartCard</div>
        <div className="lg-tagline">ניהול חכם של שוברים</div>

        <div className="lg-card">
          <div className="lg-tabs">
            <button className={`lg-tab ${mode === 'login' ? 'lg-tab-active' : 'lg-tab-inactive'}`} onClick={() => setMode('login')}>כניסה</button>
            <button className={`lg-tab ${mode === 'register' ? 'lg-tab-active' : 'lg-tab-inactive'}`} onClick={() => setMode('register')}>הרשמה</button>
          </div>

          {error && <div className="lg-error">{error}</div>}

          {tempToken ? (
            <>
              <div className="lg-totp">הזן קוד מאפליקציית האימות (Google Authenticator)</div>
              <input className="lg-input" type="text" inputMode="numeric" placeholder="קוד 6 ספרות" value={totpCode} onChange={e => setTotpCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} autoFocus />
            </>
          ) : (
            <>
              <input className="lg-input" type="email" placeholder="כתובת אימייל" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
              <input className="lg-input" type="password" placeholder="סיסמה" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
            </>
          )}

          <button className="lg-submit" onClick={handle} disabled={loading}>
            {loading ? '...' : tempToken ? 'אמת' : mode === 'login' ? 'כניסה' : 'צור חשבון'}
          </button>
        </div>

        <div className="lg-dots" style={{ marginTop: 24 }}>
          {['#5B5EF4', '#22C55E', '#EC4899', '#F59E0B'].map(c => (
            <div key={c} className="lg-dot" style={{ background: c }} />
          ))}
        </div>
      </div>
    </>
  );
}
