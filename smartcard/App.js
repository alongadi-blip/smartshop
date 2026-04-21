import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { getMe, logout as apiLogout } from './api';
import AddVoucher from './pages/AddVoucher';
import EditVoucher from './pages/EditVoucher';
import Groups from './pages/Groups';
import JoinGroup from './pages/JoinGroup';
import Help from './pages/Help';
import ResetPassword from './pages/ResetPassword';

const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: { main: '#00ACC1', light: '#4DD0E1', dark: '#00838F' },
    secondary: { main: '#00897B', light: '#4DB6AC', dark: '#00695C' },
    background: { default: '#E0F7FA', paper: '#ffffff' },
    success: { main: '#26A69A' },
    error: { main: '#EF5350' },
  },
  typography: {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, textTransform: 'none', fontWeight: 600, fontSize: 16 },
        contained: {
          background: 'linear-gradient(135deg, #00ACC1, #00897B)',
          boxShadow: '0 4px 15px rgba(0,172,193,0.4)',
          '&:hover': { background: 'linear-gradient(135deg, #00838F, #00695C)' }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 20, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 12 } }
      }
    }
  }
});

// Saves current path before redirecting to login
function RequireAuth({ token, children }) {
  const location = useLocation();
  if (!token) {
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to='/login' />;
  }
  return children;
}

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function App() {
  const [token, setToken] = useState(null); // null=loading, false=logged out, true=logged in
  const timerRef = useRef(null);

  useEffect(() => {
    getMe().then(() => setToken(true)).catch(() => setToken(false));
  }, []);

  const handleLogin = () => setToken(true);

  const handleLogout = () => {
    apiLogout().finally(() => setToken(false));
  };

  useEffect(() => {
    if (!token) return;

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [token]);

  if (token === null) return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #00ACC1 0%, #00897B 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center', color: 'white', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 1, marginBottom: 16 }}>SmartCard</div>
        <div style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.3)',
          borderTop: '4px solid white', borderRadius: '50%',
          animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path='/login' element={!token ? <Login onLogin={handleLogin} /> : <Navigate to={sessionStorage.getItem('redirectAfterLogin') || '/'} replace />} />
          <Route path='/' element={<RequireAuth token={token}><Dashboard onLogout={handleLogout} /></RequireAuth>} />
          <Route path='/add' element={<RequireAuth token={token}><AddVoucher /></RequireAuth>} />
          <Route path='/edit' element={<RequireAuth token={token}><EditVoucher /></RequireAuth>} />
          <Route path='/groups' element={<RequireAuth token={token}><Groups /></RequireAuth>} />
          <Route path='/join/:code' element={<RequireAuth token={token}><JoinGroup /></RequireAuth>} />
          <Route path='/help' element={<RequireAuth token={token}><Help /></RequireAuth>} />
          <Route path='/reset-password' element={<ResetPassword />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
