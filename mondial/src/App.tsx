import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Trophy, LayoutList, Star, Sun, Moon, Grid2X2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './lib/theme';
import LoginPage from './pages/LoginPage';
import MatchesPage from './pages/MatchesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import OutrightPage from './pages/OutrightPage';
import AdminPage from './pages/AdminPage';
import GroupsPage from './pages/GroupsPage';
import RulesModal from './components/RulesModal';

function Layout() {
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <header
        style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-card)' }}
        className="px-4 py-3 flex items-center justify-between sticky top-0 z-40"
      >
        <span
          style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em', color: '#22C55E' }}
          className="font-bold text-xl uppercase tracking-wider"
        >
          MONDIAL 2026
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRules(true)}
            className="cursor-pointer transition-all duration-200"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.35)',
              borderRadius: '999px',
              padding: '5px 12px',
              color: '#22C55E',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.03em',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.12)')}
            aria-label="כיצד משחקים"
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>?</span>
            <span>כיצד משחקים</span>
          </button>

          <button
            onClick={toggle}
            className="cursor-pointer transition-all duration-200"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-5)',
            }}
            aria-label="החלף ערכת נושא"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={signOut}
            style={{ color: 'var(--text-5)', fontSize: '13px' }}
            className="transition-colors duration-200 cursor-pointer"
          >
            {profile?.display_name} · יציאה
          </button>
        </div>
      </header>

      <main className="pt-2 pb-24">
        <Routes>
          <Route path="/" element={<Navigate to="/matches" replace />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/outright" element={<OutrightPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 inset-x-0 flex z-40"
        style={{ background: 'var(--bg-nav)', borderTop: '1px solid var(--border-card)' }}>
        {[
          { to: '/matches', icon: <LayoutList size={20} />, label: 'משחקים' },
          { to: '/groups', icon: <Grid2X2 size={20} />, label: 'בתים' },
          { to: '/leaderboard', icon: <Trophy size={20} />, label: 'טבלה' },
          { to: '/outright', icon: <Star size={20} />, label: 'טורניר' },
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
      <div style={{ color: '#22C55E', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', letterSpacing: '0.1em' }}>
        טוען…
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
