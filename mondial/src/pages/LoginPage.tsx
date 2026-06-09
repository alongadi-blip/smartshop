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
    } catch (err) {
      alert('Error sending link. Check the email and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-green-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">⚽</div>
          <h1 className="text-3xl font-bold text-gray-900">MONDIAL 2026</h1>
          <p className="text-gray-500 mt-1">Predict. Compete. Celebrate.</p>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">📧</div>
            <p className="text-gray-700 font-medium">Check your inbox!</p>
            <p className="text-gray-500 text-sm mt-1">We sent a magic link to <strong>{email}</strong></p>
          </div>
        ) : (
          <>
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-4 hover:bg-gray-50 transition font-medium mb-4"
            >
              <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-4">
              <hr className="flex-1 border-gray-200" />
              <span className="text-gray-400 text-sm">or</span>
              <hr className="flex-1 border-gray-200" />
            </div>

            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
