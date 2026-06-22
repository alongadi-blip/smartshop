import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function NicknameSetup() {
  const { updateProfile } = useAuth();
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length < 2) { setError('כינוי חייב להכיל לפחות 2 תווים'); return; }
    if (trimmed.length > 20) { setError('כינוי ארוך מדי (מקסימום 20 תווים)'); return; }
    setSaving(true);
    setError('');
    const err = await updateProfile({ nickname: trimmed, display_name: trimmed });
    setSaving(false);
    if (err) setError(`שגיאה: ${err}`);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-app)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '24px',
        padding: '36px 28px',
        maxWidth: '360px',
        width: '100%',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800, fontSize: '22px', color: '#22C55E',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: '6px',
        }}>
          MONDIAL 2026
        </div>

        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700, fontSize: '20px', color: '#F1F5F9',
          letterSpacing: '0.03em', marginBottom: '8px',
        }}>
          ברוך הבא!
        </div>
        <div style={{
          color: '#475569', fontSize: '14px',
          fontFamily: "'Barlow', sans-serif", lineHeight: 1.6,
          marginBottom: '28px',
        }}>
          בחר כינוי שיופיע ללוח הניקוד ולחברי הליגה
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="הכינוי שלך…"
            maxLength={20}
            autoFocus
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              borderRadius: '12px',
              padding: '13px 16px',
              color: 'var(--text-1)',
              fontSize: '16px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.04em',
              outline: 'none',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
            onBlur={e => (e.currentTarget.style.border = '1px solid var(--border-input)')}
          />

          {error && (
            <p style={{ color: '#EF4444', fontSize: '12px', fontFamily: "'Barlow', sans-serif" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !nickname.trim()}
            className="cursor-pointer disabled:opacity-40 transition-all duration-200"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #16A34A, #22C55E)',
              border: 'none',
              borderRadius: '12px',
              padding: '13px',
              color: 'white',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '16px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
              cursor: 'pointer',
            }}
          >
            {saving ? 'שומר…' : 'המשך'}
          </button>
        </form>
      </div>
    </div>
  );
}
