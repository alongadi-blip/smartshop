import { useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('הסיסמאות אינן תואמות'); return; }
    if (password.length < 6) { setError('סיסמה חייבת להכיל לפחות 6 תווים'); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.detail || 'שגיאה, נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #00ACC1 0%, #00897B 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2
    }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant='h4' fontWeight='800' color='white' letterSpacing={1}>SmartCard</Typography>
      </Box>
      <Box sx={{ bgcolor: 'white', borderRadius: 4, p: 4, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {done ? (
          <Box textAlign='center'>
            <Typography fontSize={44} mb={1}>✅</Typography>
            <Typography fontWeight='700' fontSize={16} mb={1}>הסיסמה עודכנה!</Typography>
            <Typography fontSize={14} color='#9196A6' mb={3}>כעת תוכל להתחבר עם הסיסמה החדשה.</Typography>
            <Button fullWidth variant='contained' onClick={() => navigate('/login')}>
              עבור להתחברות
            </Button>
          </Box>
        ) : (
          <>
            <Typography fontWeight='700' fontSize={18} mb={0.5}>הגדר סיסמה חדשה</Typography>
            <Typography fontSize={13} color='#9196A6' mb={3}>הזן סיסמה חדשה לחשבון שלך</Typography>
            {!token && (
              <Typography color='error' fontSize={14} mb={2}>הקישור לא תקין. בקש קישור חדש.</Typography>
            )}
            <form onSubmit={handleSubmit}>
              <TextField fullWidth label='סיסמה חדשה' type='password' value={password}
                onChange={e => setPassword(e.target.value)} sx={{ mb: 2 }}
                inputProps={{ dir: 'ltr' }} disabled={!token} />
              <TextField fullWidth label='אימות סיסמה' type='password' value={confirm}
                onChange={e => setConfirm(e.target.value)} sx={{ mb: 2 }}
                inputProps={{ dir: 'ltr' }} disabled={!token} />
              {error && <Typography color='error' fontSize={14} mb={2}>{error}</Typography>}
              <Button fullWidth variant='contained' size='large' type='submit'
                disabled={loading || !token} sx={{ py: 1.5 }}>
                {loading ? <CircularProgress size={22} color='inherit' /> : 'עדכן סיסמה'}
              </Button>
            </form>
          </>
        )}
      </Box>
    </Box>
  );
}
