import { useState } from 'react';
import { Box, Typography, Button, TextField, Card, IconButton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LinkIcon from '@mui/icons-material/Link';
import ImageIcon from '@mui/icons-material/Image';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API = 'http://138.2.162.153:8000';

export default function EditVoucher() {
  const navigate = useNavigate();
  const location = useLocation();
  const voucher = location.state?.voucher;

  const [balance, setBalance] = useState(voucher?.balance || '');
  const [expiry, setExpiry] = useState(voucher?.expiry_date || '');
  const [mediaType, setMediaType] = useState(voucher?.media_type || 'link');
  const [mediaValue, setMediaValue] = useState(voucher?.media_value || '');
  const [notes, setNotes] = useState(voucher?.notes || '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(voucher?.media_type === 'image' ? voucher.media_value : null);
  const [error, setError] = useState('');

  if (!voucher) { navigate('/'); return null; }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleMediaTypeChange = (val) => {
    setMediaType(val);
    setImageFile(null);
  };

  const handleSubmit = async () => {
    try {
      let finalMediaValue = mediaValue;
      let finalMediaType = mediaType;

      if (mediaType === 'upload' && imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const res = await axios.post(`${API}/api/vouchers/upload-image`, formData, {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        });
        finalMediaValue = 'http://138.2.162.153' + res.data.url;
        finalMediaType = 'image';
      }

      await axios.patch(
        `${API}/api/vouchers/${voucher.id}`,
        {
          balance: parseFloat(balance) || 0,
          expiry_date: expiry || null,
          media_type: finalMediaType || null,
          media_value: finalMediaValue || null,
          notes: notes || null
        },
        { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }
      );
      navigate('/');
    } catch (e) {
      setError(e.response?.data?.detail || 'שגיאה');
    }
  };

  const mediaOptions = [
    { value: 'link', label: 'לינק', icon: <LinkIcon fontSize='small' /> },
    { value: 'image', label: 'URL תמונה', icon: <ImageIcon fontSize='small' /> },
    { value: 'upload', label: 'העלאה', icon: <CameraAltIcon fontSize='small' /> },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F0F4F8' }}>

      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(145deg, #006D6D 0%, #00897B 50%, #00ACC1 100%)',
        px: 2, pt: 5, pb: 3, display: 'flex', alignItems: 'center', gap: 1
      }}>
        <IconButton onClick={() => navigate('/')} sx={{
          color: 'white', bgcolor: 'rgba(255,255,255,0.15)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
        }}>
          <ArrowForwardIcon />
        </IconButton>
        <Box>
          <Typography variant='h6' fontWeight='700' color='white'>עריכת שובר</Typography>
          <Typography fontSize={13} color='rgba(255,255,255,0.75)'>{voucher.brand_name}</Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pt: 3 }}>

        {/* Balance & Expiry */}
        <Card sx={{ p: 2.5, borderRadius: 3, mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <Typography fontSize={12} fontWeight={700} color='text.secondary' letterSpacing={0.5} mb={1.5}>
            פרטים
          </Typography>
          <TextField fullWidth label='יתרה (₪)' type='number' value={balance}
            onChange={e => setBalance(e.target.value)}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            inputProps={{ dir: 'ltr' }} />
          <TextField fullWidth type='date' value={expiry}
            onChange={e => setExpiry(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputLabelProps={{ shrink: true }}
            label='תאריך תוקף' />
        </Card>

        {/* Media Type */}
        <Card sx={{ p: 2.5, borderRadius: 3, mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <Typography fontSize={12} fontWeight={700} color='text.secondary' letterSpacing={0.5} mb={1.5}>
            סוג מדיה
          </Typography>
          <Box display='flex' gap={1} mb={2}>
            {mediaOptions.map(opt => (
              <Box key={opt.value} flex={1}
                onClick={() => handleMediaTypeChange(opt.value)}
                sx={{
                  p: 1.5, borderRadius: 2, cursor: 'pointer', textAlign: 'center',
                  border: '2px solid',
                  borderColor: mediaType === opt.value ? '#00897B' : '#E0E0E0',
                  bgcolor: mediaType === opt.value ? '#E0F7FA' : 'white',
                  transition: '0.2s',
                }}>
                <Box sx={{ color: mediaType === opt.value ? '#00897B' : '#999', mb: 0.5 }}>{opt.icon}</Box>
                <Typography fontSize={11} fontWeight={600}
                  color={mediaType === opt.value ? '#00695C' : 'text.secondary'}>
                  {opt.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {mediaType === 'upload' ? (
            <>
              <TextField fullWidth label='שם המוצר / תיאור' value={notes}
                onChange={e => setNotes(e.target.value)}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                inputProps={{ dir: 'rtl' }} />
              <Box component='label' sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                p: 3, borderRadius: 2, border: '2px dashed #B2EBF2',
                bgcolor: '#F0FDFD', cursor: 'pointer', mb: imagePreview ? 1.5 : 0,
                '&:hover': { bgcolor: '#E0F7FA', borderColor: '#00ACC1' }, transition: '0.2s'
              }}>
                <CameraAltIcon sx={{ fontSize: 32, color: '#00ACC1', mb: 1 }} />
                <Typography fontSize={14} color='#00838F' fontWeight={600}>לחץ לבחירת תמונה חדשה</Typography>
                <input type='file' accept='image/*' hidden onChange={handleImageChange} />
              </Box>
              {imagePreview && (
                <Box component='img' src={imagePreview}
                  sx={{ width: '100%', borderRadius: 2, maxHeight: 200, objectFit: 'cover' }} />
              )}
            </>
          ) : (
            <TextField fullWidth
              label={mediaType === 'link' ? 'לינק לשובר' : 'URL של תמונה'}
              value={mediaValue} onChange={e => setMediaValue(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              inputProps={{ dir: 'ltr' }} />
          )}
        </Card>

        {error && (
          <Box sx={{ p: 2, bgcolor: '#FFEBEE', borderRadius: 2, mb: 2 }}>
            <Typography color='error' fontSize={14} textAlign='center'>{error}</Typography>
          </Box>
        )}

        <Button fullWidth variant='contained' size='large' onClick={handleSubmit}
          sx={{
            py: 1.75, borderRadius: 3, fontSize: 16, fontWeight: 700,
            background: 'linear-gradient(145deg, #00ACC1, #00897B)',
            boxShadow: '0 6px 20px rgba(0,137,123,0.4)',
            '&:hover': { background: 'linear-gradient(145deg, #0097A7, #00796B)' }
          }}>
          שמור שינויים
        </Button>
      </Box>
    </Box>
  );
}
