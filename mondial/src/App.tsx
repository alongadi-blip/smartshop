import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { Trophy, LayoutList, Star, Sun, Moon, Grid2X2, ChevronDown, Swords } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './lib/theme';
import { LeagueProvider, useLeagueContext } from './contexts/LeagueContext';
import LoginPage from './pages/LoginPage';
import MatchesPage from './pages/MatchesPage';
import KnockoutPage from './pages/KnockoutPage';
import LeaderboardPage from './pages/LeaderboardPage';
import OutrightPage from './pages/OutrightPage';
import AdminPage from './pages/AdminPage';
import GroupsPage from './pages/GroupsPage';
import JoinLeaguePage from './pages/JoinLeaguePage';
import LeagueSelectorPage from './pages/LeagueSelectorPage';
import RulesModal from './components/RulesModal';
import NicknameSetup from './components/NicknameSetup';

// League picker in the header
function LeaguePicker() {
  const { selectedLeague, userLeagues, setSelectedLeague } = useLeagueContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (userLeagues.length === 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="cursor-pointer flex items-center gap-1.5 transition-all duration-200"
        style={{
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '999px',
          padding: '5px 10px',
          color: '#818CF8',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 600,
          fontSize: '12px',
          letterSpacing: '0.03em',
          maxWidth: '120px',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedLeague?.name ?? 'ליגה'}
        </span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: '160px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 50,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {userLeagues.map((league, idx) => (
              <button
                key={league.id}
                onClick={() => { setSelectedLeague(league); setOpen(false); }}
                className="w-full text-right cursor-pointer transition-colors duration-150"
                style={{
                  padding: '10px 14px',
                  borderBottom: idx < userLeagues.length - 1 ? '1px solid var(--border-2)' : 'none',
                  background: selectedLeague?.id === league.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: selectedLeague?.id === league.id ? '#818CF8' : '#94A3B8',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600,
                  fontSize: '13px',
                  letterSpacing: '0.03em',
                  direction: 'rtl',
                }}
              >
                {league.name}
              </button>
            ))}
            <button
              onClick={() => { setOpen(false); navigate('/league-select'); }}
              className="w-full cursor-pointer"
              style={{ padding: '9px 14px', color: '#475569', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', borderTop: '1px solid var(--border-2)', background: 'transparent', direction: 'rtl', letterSpacing: '0.03em' }}
            >
              ניהול ליגות / הצטרף
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const ADMIN_EMAIL = 'alon.gadi@gmail.com';

function Layout() {
  const { user, profile, signOut } = useAuth();
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
          <LeaguePicker />

          <button
            onClick={() => setShowRules(true)}
            className="cursor-pointer transition-all duration-200"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
              borderRadius: '999px', padding: '5px 12px',
              color: '#22C55E', fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: '13px', letterSpacing: '0.03em',
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
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--text-5)' }}
            aria-label="החלף ערכת נושא"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {user?.email === ADMIN_EMAIL && (
            <NavLink to="/admin"
              style={({ isActive }) => ({ color: isActive ? '#818CF8' : '#334155', fontSize: '13px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.05em' })}
            >
              ADMIN
            </NavLink>
          )}

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
          <Route path="/knockout" element={<KnockoutPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/outright" element={<OutrightPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/join/:code" element={<JoinLeaguePage />} />
          <Route path="/league-select" element={<LeagueSelectorPage />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 inset-x-0 flex z-40"
        style={{ background: 'var(--bg-nav)', borderTop: '1px solid var(--border-card)' }}>
        {[
          { to: '/matches', icon: <LayoutList size={20} />, label: 'משחקים' },
          { to: '/knockout', icon: <Swords size={20} />, label: 'נוקאוט' },
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
  const { user, profile, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
      <div style={{ color: '#22C55E', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', letterSpacing: '0.1em' }}>
        טוען…
      </div>
    </div>
  );
  if (!user) return <LoginPage />;
  // Block access until nickname is chosen
  if (profile && !profile.nickname) return <NicknameSetup />;
  return <>{children}</>;
}

function AppWithLeague() {
  const { user } = useAuth();
  return (
    <LeagueProvider userId={user?.id}>
      <Layout />
    </LeagueProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <AppWithLeague />
      </AuthGuard>
    </BrowserRouter>
  );
}
