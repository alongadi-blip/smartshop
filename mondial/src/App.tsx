import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Trophy, LayoutList, Star, HelpCircle } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import MatchesPage from './pages/MatchesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import OutrightPage from './pages/OutrightPage';
import AdminPage from './pages/AdminPage';
import RulesModal from './components/RulesModal';

function Layout() {
  const { profile, signOut } = useAuth();
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: '#0A0F1E' }}>
      <header
        style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #0D1A2B 100%)', borderBottom: '1px solid #1E2D45' }}
        className="px-4 py-3 flex items-center justify-between sticky top-0 z-40"
      >
        <span
          style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em', color: '#22C55E' }}
          className="font-bold text-xl uppercase tracking-wider"
        >
          MONDIAL 2026
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRules(true)}
            className="cursor-pointer transition-colors duration-200"
            style={{ color: '#334155' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#64748B')}
            onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
            aria-label="How to play"
          >
            <HelpCircle size={18} />
          </button>

          <button
            onClick={signOut}
            style={{ color: '#64748B', fontSize: '13px' }}
            className="hover:text-slate-300 transition-colors duration-200 cursor-pointer"
          >
            {profile?.display_name} · Sign out
          </button>
        </div>
      </header>

      <main className="pt-2 pb-24">
        <Routes>
          <Route path="/" element={<Navigate to="/matches" replace />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/outright" element={<OutrightPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 inset-x-0 flex z-40"
        style={{ background: '#0D1525', borderTop: '1px solid #1E2D45' }}>
        {[
          { to: '/matches', icon: <LayoutList size={20} />, label: 'Matches' },
          { to: '/leaderboard', icon: <Trophy size={20} />, label: 'Leaderboard' },
          { to: '/outright', icon: <Star size={20} />, label: 'Tournament' },
        ].map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center py-3 gap-1 transition-colors duration-200 cursor-pointer"
            style={({ isActive }) => ({
              color: isActive ? '#22C55E' : '#475569',
              fontSize: '11px',
              fontWeight: isActive ? 600 : 400,
              fontFamily: "'Barlow', sans-serif",
            })}
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div style={{ color: '#22C55E', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', letterSpacing: '0.1em' }}>
        LOADING…
      </div>
    </div>
  );
  if (!user) return <LoginPage />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <Layout />
      </AuthGuard>
    </BrowserRouter>
  );
}
