import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Tabs, Tab } from '@mui/material';
import { login, register } from '../api';

export default function Login({ onLogin }) {
  const isInvite = sessionStorage.getItem('redirectAfterLogin')?.startsWith('/join/');
  const [tab, setTab] = useState(isInvite ? 1 : 0); // default to register tab when joining
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const fn = tab === 0 ? login : register;
      const res = await fn(email, password);
      sessionStorage.removeItem('redirectAfterLogin');
      onLogin(res.data.access_token);
    } catch (e) {
      setError(e.response?.data?.detail || 'שגיאה, נסה שוב');
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #00ACC1 0%, #00897B 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2
    }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant='h4' fontWeight='800' color='white' letterSpacing={1}>
          SmartCard
        </Typography>
        {isInvite ? (
          <Typography variant='body1' fontWeight='500' color='rgba(255,255,255,0.9)' mt={0.5}>
            הוזמנת לקבוצת שיתוף — הירשם להצטרף
          </Typography>
        ) : (
          <Typography variant='h6' fontWeight='400' color='rgba(255,255,255,0.8)'>
            האינדקס החכם לשוברים שלך
          </Typography>
        )}
      </Box>

      <Box sx={{
        bgcolor: 'white', borderRadius: 4, p: 4, width: '100%', maxWidth: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} centered
          sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700, fontSize: 15 } }}>
          <Tab label='התחברות' />
          <Tab label='הרשמה' />
        </Tabs>

        <form onSubmit={handleSubmit} autoComplete='on'>
          <TextField fullWidth label='אימייל' type='email' name='email' value={email}
            onChange={e => setEmail(e.target.value)} sx={{ mb: 2 }}
            autoComplete='email' inputProps={{ dir: 'ltr' }} />
          <TextField fullWidth label='סיסמה' type='password' name='password' value={password}
            onChange={e => setPassword(e.target.value)} sx={{ mb: 2 }}
            autoComplete='current-password' inputProps={{ dir: 'ltr' }} />
          {error && (
            <Typography color='error' mb={2} textAlign='center' fontSize={14}>{error}</Typography>
          )}
          <Button fullWidth variant='contained' size='large' type='submit' sx={{ py: 1.5 }}>
            {tab === 0 ? 'התחבר' : 'הירשם'}
          </Button>
        </form>

        {tab === 0 && (
          <Typography textAlign='center' fontSize={13} color='#9196A6' mt={2}>
            משתמש חדש?{' '}
            <Box component='span' onClick={() => setTab(1)}
              sx={{ color: '#00897B', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
              הירשם כאן
            </Box>
          </Typography>
        )}
      </Box>
    </Box>
  );
}
