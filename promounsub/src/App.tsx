import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, gmailProvider } from './firebase';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    return onAuthStateChanged(auth, firebaseUser => {
      setUser(firebaseUser);
      setAuthLoading(false);
      // Token is not persisted — user must sign in each session to get Gmail access
      if (!firebaseUser) setToken('');
    });
  }, []);

  async function handleLogin() {
    setLoginError('');
    try {
      const result = await signInWithPopup(auth, gmailProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setToken(credential.accessToken);
      } else {
        setLoginError('Could not get Gmail access token. Please try again.');
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setLoginError(err.message || 'Sign-in failed');
      }
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setToken('');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading…</div>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        {loginError && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-900 border border-red-700 text-red-200 text-sm px-4 py-2 rounded-lg">
            {loginError}
          </div>
        )}
        {user && !token && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-slate-200 text-sm px-4 py-2 rounded-lg">
            Session expired — please sign in again to access Gmail.
          </div>
        )}
      </>
    );
  }

  return <Dashboard user={user} token={token} onLogout={handleLogout} />;
}
