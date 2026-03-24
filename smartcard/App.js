import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddVoucher from './pages/AddVoucher';
import EditVoucher from './pages/EditVoucher';
import Groups from './pages/Groups';
import JoinGroup from './pages/JoinGroup';

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

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

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
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
