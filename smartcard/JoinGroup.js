import { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CircularProgress } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate, useParams } from 'react-router-dom';
import { previewInvite, joinGroup } from '../api';

export default function JoinGroup() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    previewInvite(code)
      .then(res => setInfo(res.data))
      .catch(() => setError('קישור לא תקין או פג תוקף'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinGroup(code);
      setJoined(true);
      setTimeout(() => navigate('/groups'), 1500);
    } catch (e) {
      setError(e.response?.data?.detail || 'שגיאה בהצטרפות');
    }
    setJoining(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Card sx={{ p: 4, borderRadius: 3, textAlign: 'center', maxWidth: 360, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        {loading ? (
          <CircularProgress sx={{ color: '#00897B' }} />
        ) : error ? (
          <>
            <Typography color='error' fontWeight='700' fontSize={16} mb={1}>{error}</Typography>
            <Button onClick={() => navigate('/')} sx={{ color: '#00897B' }}>חזור לדף הראשי</Button>
          </>
        ) : joined ? (
          <>
            <CheckCircleIcon sx={{ fontSize: 56, color: '#43A047', mb: 1 }} />
            <Typography fontWeight='700' fontSize={18} color='#1A1D23'>הצטרפת בהצלחה!</Typography>
          </>
        ) : (
          <>
            <GroupIcon sx={{ fontSize: 56, color: '#00897B', mb: 2 }} />
            <Typography fontWeight='800' fontSize={20} color='#1A1D23' mb={0.5}>{info?.group_name}</Typography>
            <Typography color='#9196A6' fontSize={14} mb={0.5}>
              {info?.member_count} חברים
            </Typography>
            <Typography color='#9196A6' fontSize={13} mb={3}>
              הוזמנת להצטרף לקבוצת שיתוף
            </Typography>
            <Button fullWidth variant='contained' size='large' onClick={handleJoin} disabled={joining}
              sx={{
                py: 1.5, borderRadius: 2, fontWeight: 700,
                background: 'linear-gradient(145deg,#00ACC1,#00897B)',
                '&:hover': { background: 'linear-gradient(145deg,#0097A7,#00796B)' }
              }}>
              {joining ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'הצטרף לקבוצה'}
            </Button>
            <Button fullWidth onClick={() => navigate('/')} sx={{ mt: 1, color: '#9196A6' }}>
              ביטול
            </Button>
          </>
        )}
      </Card>
    </Box>
  );
}
