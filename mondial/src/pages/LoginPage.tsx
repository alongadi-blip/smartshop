import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { signInWithGoogle, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithMagicLink(email);
      setSent(true);
    } catch {
      alert('Error sending link. Check the email and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #0A0F1E 0%, #0D1A2B 50%, #071210 100%)' }}>

      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)', boxShadow: '0 0 40px rgba(34,197,94,0.35)' }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10">
              <circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="1.5"/>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', color: '#F1F5F9', fontSize: '36px', fontWeight: 800, lineHeight: 1 }}
            className="uppercase mb-2">
            MONDIAL 2026
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px' }}>Predict. Compete. Celebrate.</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: '#131C2E', border: '1px solid #1E2D45' }}>
          {sent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.3)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" className="w-8 h-8">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <p style={{ color: '#F1F5F9', fontWeight: 600 }}>Check your inbox!</p>
              <p style={{ color: '#64748B', fontSize: '13px', marginTop: '4px' }}>
                Magic link sent to <span style={{ color: '#94A3B8' }}>{email}</span>
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 rounded-xl py-3 px-4 transition-colors duration-200 cursor-pointer mb-4"
                style={{ background: '#1E2D45', border: '1px solid #2A3F5F', color: '#F1F5F9', fontWeight: 500, fontSize: '15px' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#243550')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1E2D45')}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
                <span style={{ color: '#475569', fontSize: '12px' }}>or</span>
                <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl py-3 px-4 outline-none transition-all duration-200"
                  style={{
                    background: '#1E2D45',
                    border: '1px solid #2A3F5F',
                    color: '#F1F5F9',
                    fontSize: '15px',
                  }}
                  onFocus={e => (e.currentTarget.style.border = '1px solid #22C55E')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid #2A3F5F')}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-3 font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #16A34A, #22C55E)',
                    color: 'white',
                    fontSize: '15px',
                    boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                    fontFamily: "'Barlow', sans-serif",
                  }}
                >
                  {loading ? 'Sending…' : 'Send Magic Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
