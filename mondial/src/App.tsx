import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Trophy, ListOrdered, Star } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import MatchesPage from './pages/MatchesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import OutrightPage from './pages/OutrightPage';
import AdminPage from './pages/AdminPage';

function Layout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow">
        <span className="font-bold text-lg tracking-tight">⚽ MONDIAL 2026</span>
        <button onClick={signOut} className="text-sm text-green-200 hover:text-white transition">
          {profile?.display_name} · Sign out
        </button>
      </header>

      <main className="pt-4">
        <Routes>
          <Route path="/" element={<Navigate to="/matches" replace />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/outright" element={<OutrightPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg flex z-40">
        {[
          { to: '/matches', icon: <ListOrdered size={22} />, label: 'Matches' },
          { to: '/leaderboard', icon: <Trophy size={22} />, label: 'Leaderboard' },
          { to: '/outright', icon: <Star size={22} />, label: 'Tournament' },
        ].map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-1 transition ${
                isActive ? 'text-green-700 font-semibold' : 'text-gray-400'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
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
