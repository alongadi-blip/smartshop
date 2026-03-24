import { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, MenuItem, Select, FormControl, InputLabel, Card, IconButton, CircularProgress, Collapse } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LinkIcon from '@mui/icons-material/Link';
import ImageIcon from '@mui/icons-material/Image';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBrands, createVoucher, createGroupVoucher } from '../api';
import axios from 'axios';

const API = 'http://138.2.162.153:8000';

export default function AddVoucher() {
  const navigate = useNavigate();
  const location = useLocation();
  const groupId = location.state?.groupId || null;
  const groupName = location.state?.groupName || null;

  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [expiry, setExpiry] = useState('');
  const [mediaType, setMediaType] = useState('link');
  const [mediaValue, setMediaValue] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');

  // OCR state
  const [scanning, setScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  useEffect(() => {
    getBrands().then(res => setBrands(res.data));
  }, []);

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
    setImagePreview(null);
    setMediaValue('');
  };

  // OCR scan handler
  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    setOcrResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API}/api/vouchers/ocr`, formData, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      const data = res.data;
      setOcrResult(data);

      // Auto-fill fields from OCR
      if (data.balance) setBalance(String(data.balance));
      if (data.expiry_date) setExpiry(data.expiry_date);
      if (data.brand_guess) {
        // Try to match brand_guess to existing brands
        const lower = data.brand_guess.toLowerCase();
        const matched = brands.find(b => lower.includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(lower));
        if (matched) {
          setBrandId(matched.id);
        } else {
          setBrandId('custom');
          setCustomBrand(data.brand_guess);
        }
      }
    } catch {
      setError('שגיאה בסריקה, נסה שוב');
    }
    setScanning(false);
  };

  const handleSubmit = async () => {
    if (!brandId && !customBrand) { setError('נא לבחור מותג'); return; }
    if (mediaType !== 'upload' && !balance) { setError('נא למלא יתרה'); return; }
    try {
      let finalBrandId = brandId;
      if (brandId === 'custom') {
        const res = await fetch(`${API}/api/brands/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
          body: JSON.stringify({ name: customBrand })
        });
        const data = await res.json();
        finalBrandId = data.id;
      }

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

      const voucherData = {
        brand_id: parseInt(finalBrandId),
        balance: mediaType === 'upload' ? 0 : parseFloat(balance),
        expiry_date: expiry || null,
        media_type: finalMediaValue ? finalMediaType : null,
        media_value: finalMediaValue || null,
        notes: notes || null,
      };
      if (groupId) {
        await createGroupVoucher(groupId, voucherData);
        navigate('/groups');
      } else {
        await createVoucher(voucherData);
        navigate('/');
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'שגיאה');
    }
  };

  const mediaOptions = [
    { value: 'link', label: 'לינק לשובר', icon: <LinkIcon fontSize='small' /> },
    { value: 'image', label: 'תמונה (URL)', icon: <ImageIcon fontSize='small' /> },
    { value: 'upload', label: 'העלאת תמונה', icon: <CameraAltIcon fontSize='small' /> },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F0F4F8' }}>

      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(145deg, #006D6D 0%, #00897B 50%, #00ACC1 100%)',
        px: 2, pt: 5, pb: 3, display: 'flex', alignItems: 'center', gap: 1
      }}>
        <IconButton onClick={() => groupId ? navigate('/groups') : navigate('/')} sx={{
          color: 'white', bgcolor: 'rgba(255,255,255,0.15)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
        }}>
          <ArrowForwardIcon />
        </IconButton>
        <Box>
          <Typography variant='h6' fontWeight='700' color='white'>הוספת שובר</Typography>
          <Typography fontSize={12} color='rgba(255,255,255,0.7)'>
            {groupName ? `לקבוצה: ${groupName}` : 'מלא את הפרטים להלן'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pt: 3 }}>

        {/* OCR Scan Buttons */}
        {scanning ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5,
            p: 2, mb: 2, borderRadius: 3, bgcolor: '#E3F2FD' }}>
            <CircularProgress size={20} sx={{ color: '#1565C0' }} />
            <Typography fontWeight='700' fontSize={15} color='#1565C0'>מנתח תמונה...</Typography>
          </Box>
        ) : (
          <Box display='flex' gap={1} mb={2}>
            <Box component='label' flex={1} sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
              p: 1.75, borderRadius: 3, cursor: 'pointer',
              background: 'linear-gradient(145deg, #1565C0, #1976D2)',
              boxShadow: '0 4px 16px rgba(21,101,192,0.35)',
              '&:active': { opacity: 0.9 }
            }}>
              <DocumentScannerIcon sx={{ color: 'white', fontSize: 20 }} />
              <Typography fontWeight='700' fontSize={13} color='white'>צלם כרטיס</Typography>
              <input type='file' accept='image/*' capture='environment' hidden onChange={handleScan} />
            </Box>
            <Box component='label' flex={1} sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
              p: 1.75, borderRadius: 3, cursor: 'pointer',
              border: '2px solid #1565C0', bgcolor: 'white',
              '&:active': { bgcolor: '#E3F2FD' }
            }}>
              <ImageIcon sx={{ color: '#1565C0', fontSize: 20 }} />
              <Typography fontWeight='700' fontSize={13} color='#1565C0'>תמונה מהמסך</Typography>
              <input type='file' accept='image/*' hidden onChange={handleScan} />
            </Box>
          </Box>
        )}

        {/* OCR result summary */}
        <Collapse in={!!ocrResult}>
          {ocrResult && (
            <Card sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid #C8E6C9', bgcolor: '#F1F8E9' }}>
              <Box display='flex' alignItems='center' gap={1} mb={1}>
                <CheckCircleOutlineIcon sx={{ color: '#43A047', fontSize: 18 }} />
                <Typography fontWeight='700' fontSize={13} color='#2E7D32'>זוהו הנתונים הבאים — ניתן לערוך:</Typography>
              </Box>
              {ocrResult.balance && <Typography fontSize={12} color='#388E3C'>💰 יתרה: ₪{ocrResult.balance}</Typography>}
              {ocrResult.expiry_date && <Typography fontSize={12} color='#388E3C'>📅 תוקף: {ocrResult.expiry_date}</Typography>}
              {ocrResult.brand_guess && <Typography fontSize={12} color='#388E3C'>🏷️ מותג: {ocrResult.brand_guess}</Typography>}
              {!ocrResult.balance && !ocrResult.expiry_date && !ocrResult.brand_guess && (
                <Typography fontSize={12} color='#F57C00'>לא זוהו נתונים, מלא ידנית</Typography>
              )}
            </Card>
          )}
        </Collapse>

        {/* Brand Section */}
        <Card sx={{ p: 2.5, borderRadius: 3, mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <Typography fontSize={12} fontWeight={700} color='text.secondary' letterSpacing={0.5} mb={1.5}>
            מותג
          </Typography>
          <FormControl fullWidth>
            <InputLabel>בחר מותג</InputLabel>
            <Select value={brandId} onChange={e => setBrandId(e.target.value)} label='בחר מותג'
              sx={{ borderRadius: 2 }}>
              {brands.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              <MenuItem value='custom'>
                <Box display='flex' alignItems='center' gap={1} color='primary.main'>
                  <Typography fontSize={18} lineHeight={1}>+</Typography>
                  <Typography fontSize={14}>הוסף מותג חדש</Typography>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          {brandId === 'custom' && (
            <TextField fullWidth label='שם המותג' value={customBrand}
              onChange={e => setCustomBrand(e.target.value)}
              sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              inputProps={{ dir: 'rtl' }} />
          )}
        </Card>

        {/* Media Type Selector */}
        <Card sx={{ p: 2.5, borderRadius: 3, mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <Typography fontSize={12} fontWeight={700} color='text.secondary' letterSpacing={0.5} mb={1.5}>
            סוג שובר
          </Typography>
          <Box display='flex' gap={1}>
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
        </Card>

        {/* Details Section */}
        <Card sx={{ p: 2.5, borderRadius: 3, mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <Typography fontSize={12} fontWeight={700} color='text.secondary' letterSpacing={0.5} mb={1.5}>
            פרטי שובר
          </Typography>

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
                <Typography fontSize={14} color='#00838F' fontWeight={600}>לחץ לבחירת תמונה</Typography>
                <Typography fontSize={12} color='text.secondary' mt={0.3}>PNG, JPG עד 10MB</Typography>
                <input type='file' accept='image/*' hidden onChange={handleImageChange} />
              </Box>
              {imagePreview && (
                <Box component='img' src={imagePreview}
                  sx={{ width: '100%', borderRadius: 2, maxHeight: 200, objectFit: 'cover' }} />
              )}
            </>
          ) : (
            <>
              <TextField fullWidth label='יתרה (₪)' type='number' value={balance}
                onChange={e => setBalance(e.target.value)}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                inputProps={{ dir: 'ltr' }} />
              <TextField fullWidth
                label={mediaType === 'link' ? 'לינק לשובר' : 'URL של תמונה'}
                value={mediaValue} onChange={e => setMediaValue(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                inputProps={{ dir: 'ltr' }} />
            </>
          )}
        </Card>

        {/* Expiry */}
        <Card sx={{ p: 2.5, borderRadius: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <Typography fontSize={12} fontWeight={700} color='text.secondary' letterSpacing={0.5} mb={1.5}>
            תאריך תוקף
          </Typography>
          <TextField fullWidth type='date' value={expiry}
            onChange={e => setExpiry(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputLabelProps={{ shrink: true }} />
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
          הוסף שובר
        </Button>
      </Box>
    </Box>
  );
}
