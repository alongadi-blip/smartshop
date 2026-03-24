import { useState, useEffect } from 'react';
import { Box, Typography, Card, TextField, Chip, IconButton, InputAdornment, Fab } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import { useNavigate } from 'react-router-dom';
import { getVouchers, deleteVoucher, searchStores } from '../api';

const BRAND_ICONS = {
  'נופשונית': { emoji: '🌴', color: '#00897B', bg: '#E0F2F1' },
  'swish':    { emoji: '💳', color: '#5C6BC0', bg: '#E8EAF6' },
  'buyme':    { emoji: '🛍️', color: '#E91E8C', bg: '#FCE4EC' },
  'ביי מי':   { emoji: '🛍️', color: '#E91E8C', bg: '#FCE4EC' },
  'פמינה':    { emoji: '💄', color: '#AB47BC', bg: '#F3E5F5' },
  'גוד פארם': { emoji: '💊', color: '#26A69A', bg: '#E0F2F1' },
  'golf':     { emoji: '👕', color: '#1565C0', bg: '#E3F2FD' },
  'רמי לוי':  { emoji: '🛒', color: '#F57C00', bg: '#FFF3E0' },
  'שופרסל':   { emoji: '🛒', color: '#E53935', bg: '#FFEBEE' },
};

const getBrandIcon = (name) => {
  if (!name) return { emoji: '🎫', color: '#78909C', bg: '#ECEFF1' };
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(BRAND_ICONS)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  // Generic - color based on first char
  const colors = [
    { color: '#5C6BC0', bg: '#E8EAF6' }, { color: '#00897B', bg: '#E0F2F1' },
    { color: '#E53935', bg: '#FFEBEE' }, { color: '#F57C00', bg: '#FFF3E0' },
    { color: '#43A047', bg: '#E8F5E9' }, { color: '#8E24AA', bg: '#F3E5F5' },
  ];
  return { emoji: name[0].toUpperCase(), color: colors[name.charCodeAt(0) % colors.length].color, bg: colors[name.charCodeAt(0) % colors.length].bg, isLetter: true };
};

export default function Dashboard({ onLogout }) {
  const [vouchers, setVouchers] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadVouchers(); }, []);

  const loadVouchers = async () => {
    const res = await getVouchers();
    setVouchers(res.data);
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    const res = await searchStores(search);
    setSearchResults(res.data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('למחוק את השובר?')) return;
    await deleteVoucher(id);
    loadVouchers();
  };

  const getDaysLeft = (expiry) => {
    if (!expiry) return null;
    return Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryInfo = (days) => {
    if (days === null) return null;
    if (days <= 0)  return { color: '#E53935', bg: '#FFEBEE', label: 'פג תוקף' };
    if (days <= 7)  return { color: '#E53935', bg: '#FFEBEE', label: `עוד ${days} ימים` };
    if (days <= 30) return { color: '#F57C00', bg: '#FFF3E0', label: `עוד ${days} ימים` };
    return { color: '#00897B', bg: '#E0F2F1', label: `עוד ${days} ימים` };
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F6FA', pb: 12 }}>

      {/* Lightbox */}
      {expandedImage && (
        <Box onClick={() => setExpandedImage(null)} sx={{
          position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.88)', zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2
        }}>
          <IconButton sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.12)' }}>
            <CloseIcon />
          </IconButton>
          <Box component='img' src={expandedImage}
            sx={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: 2 }} />
        </Box>
      )}

      {/* Header */}
      <Box sx={{
        bgcolor: 'white',
        boxShadow: '0 1px 0 #E8E8EE, 0 2px 12px rgba(0,0,0,0.06)',
        px: 3, pt: 5, pb: 2.5,
        position: 'relative'
      }}>
        {/* Left actions: logout + groups */}
        <Box sx={{ position: 'absolute', top: 44, left: 16, display: 'flex', gap: 0.5 }}>
          <IconButton onClick={onLogout} size='small' sx={{
            color: '#9196A6', bgcolor: '#F5F6FA',
            '&:hover': { bgcolor: '#ECEDF5' }
          }}>
            <LogoutIcon fontSize='small' />
          </IconButton>
          <IconButton onClick={() => navigate('/groups')} size='small' sx={{
            color: '#9196A6', bgcolor: '#F5F6FA',
            '&:hover': { bgcolor: '#ECEDF5' }
          }}>
            <GroupIcon fontSize='small' />
          </IconButton>
        </Box>

        {/* Centered title */}
        <Box textAlign='center' mb={2.5}>
          <Typography variant='h5' fontWeight='800' color='#1A1D23' letterSpacing={0.3}>
            SmartCard
          </Typography>
          <Typography color='#9196A6' fontSize={13} mt={0.2}>
            {vouchers.length > 0 ? `${vouchers.length} שוברים פעילים` : 'אין שוברים עדיין'}
          </Typography>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          placeholder='חפש חנות... (ספא, פיצה, נייקי)'
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#F5F6FA', borderRadius: 2,
              '& fieldset': { borderColor: '#E8E8EE' },
              '&:hover fieldset': { borderColor: '#00897B' },
              '&.Mui-focused fieldset': { borderColor: '#00897B', borderWidth: 1.5 },
              '& input': { fontSize: 14, color: '#1A1D23', textAlign: 'right' }
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position='end'>
                <IconButton onClick={handleSearch} sx={{ color: '#00897B' }}>
                  <SearchIcon fontSize='small' />
                </IconButton>
              </InputAdornment>
            )
          }}
          inputProps={{ dir: 'rtl' }}
        />
      </Box>

      <Box sx={{ px: 2, pt: 2.5 }}>

        {/* Search Results */}
        {searchResults && (
          <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #F0F0F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <IconButton size='small' onClick={() => setSearchResults(null)} sx={{ color: '#9196A6' }}>
                <CloseIcon fontSize='small' />
              </IconButton>
              <Typography fontWeight='700' color='#1A1D23' fontSize={14}>תוצאות חיפוש</Typography>
            </Box>
            <Box sx={{ px: 2.5, py: 2 }}>
              {Object.keys(searchResults).length === 0 ? (
                <Typography color='#9196A6' fontSize={14} textAlign='right'>לא נמצאו שוברים תואמים</Typography>
              ) : (
                Object.entries(searchResults).map(([brand, data]) => (
                  <Box key={brand} sx={{ mb: 1.5, p: 1.5, bgcolor: '#F5F6FA', borderRadius: 1.5 }}>
                    <Typography fontWeight='700' color='#00897B' fontSize={13} mb={0.75} textAlign='right'>{brand}</Typography>
                    <Box display='flex' flexWrap='wrap' gap={0.5} justifyContent='flex-end'>
                      {data.stores.slice(0, 5).map(s => (
                        <Chip key={s} label={s} size='small' variant='outlined'
                          sx={{ color: '#5C6678', borderColor: '#DDE0E8', fontSize: 11, height: 24 }} />
                      ))}
                      {data.stores.length > 5 && (
                        <Chip label={`+${data.stores.length - 5}`} size='small'
                          sx={{ bgcolor: '#ECEDF5', color: '#5C6678', fontSize: 11, height: 24 }} />
                      )}
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Card>
        )}

        {/* Empty State */}
        {vouchers.length === 0 ? (
          <Box textAlign='center' mt={8}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#ECEDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <Typography fontSize={36}>🎫</Typography>
            </Box>
            <Typography variant='h6' fontWeight='700' color='#1A1D23'>אין שוברים עדיין</Typography>
            <Typography color='#9196A6' fontSize={14} mt={0.5}>לחץ על + כדי להוסיף שובר ראשון</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          {vouchers.map(v => {
            const days = getDaysLeft(v.expiry_date);
            const expiry = getExpiryInfo(days);
            const isImageVoucher = v.media_type === 'image' && v.notes;
            const icon = getBrandIcon(v.brand_name);

            return (
              <Card key={v.id} sx={{
                mb: 1.5, borderRadius: 2,
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                border: '1px solid #ECEDF5',
                bgcolor: '#F5F6FA',
                overflow: 'hidden'
              }}>
                <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>

                  {/* Inner blue-bordered frame */}
                  <Box sx={{
                    border: '2px solid #1565C0',
                    borderRadius: 2,
                    bgcolor: 'white',
                    p: 1.25,
                    width: '100%',
                    minWidth: 0,
                  }}>
                    {/* Top: icon + brand + edit/delete */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 0.5 }}>

                      {/* Edit/delete - left */}
                      <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                        <IconButton size='small'
                          onClick={() => navigate('/edit', { state: { voucher: v } })}
                          sx={{ color: '#9196A6', width: 22, height: 22, '&:hover': { color: '#1565C0', bgcolor: '#E3F2FD' } }}>
                          <EditIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                        <IconButton size='small'
                          onClick={() => handleDelete(v.id)}
                          sx={{ color: '#9196A6', width: 22, height: 22, '&:hover': { color: '#E53935', bgcolor: '#FFEBEE' } }}>
                          <DeleteIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Box>

                      {/* Brand icon + name - right */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#1A1D23', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.brand_name}
                        </Typography>
                        <Box sx={{
                          width: 24, height: 24, borderRadius: 1,
                          bgcolor: icon.bg, border: `1.5px solid ${icon.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: icon.isLetter ? 10 : 13, fontWeight: 700, color: icon.color, flexShrink: 0
                        }}>
                          {icon.emoji}
                        </Box>
                      </Box>
                    </Box>

                    {/* Amount */}
                    {!isImageVoucher && (
                      <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#00897B', lineHeight: 1, textAlign: 'right', mb: 0.75 }}>
                        ₪{Number(v.balance).toLocaleString()}
                      </Typography>
                    )}
                    {isImageVoucher && (
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1A1D23', textAlign: 'right', mb: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.notes}
                      </Typography>
                    )}

                    {/* Expiry */}
                    {expiry && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.75 }}>
                        <Chip
                          icon={<AccessTimeIcon sx={{ fontSize: '10px !important', color: `${expiry.color} !important` }} />}
                          label={expiry.label} size='small'
                          sx={{ bgcolor: expiry.bg, color: expiry.color, fontWeight: 600, fontSize: 10, height: 18, border: 'none', maxWidth: '100%' }}
                        />
                      </Box>
                    )}

                    {/* Image thumbnail */}
                    {v.media_value && v.media_type === 'image' && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Box component='img' src={v.media_value}
                          onClick={() => setExpandedImage(v.media_value)}
                          sx={{ width: '100%', maxHeight: 60, borderRadius: 1.5, cursor: 'pointer', objectFit: 'cover', border: '1px solid #ECEDF5' }} />
                      </Box>
                    )}

                    {/* Open link */}
                    {v.media_value && v.media_type === 'link' && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                        <Chip
                          icon={<LinkIcon sx={{ fontSize: '14px !important' }} />}
                          label='פתח שובר' size='small'
                          onClick={() => window.open(v.media_value, '_blank')} clickable
                          sx={{ bgcolor: '#00897B', color: 'white', fontWeight: 600, fontSize: 12, height: 28, '&:hover': { bgcolor: '#00796B' } }}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>
              </Card>
            );
          })}
          </Box>
        )}
      </Box>

      {/* FAB */}
      <Fab sx={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        bgcolor: '#00897B', color: 'white',
        boxShadow: '0 6px 24px rgba(0,137,123,0.45)',
        width: 58, height: 58,
        '&:hover': { bgcolor: '#00796B' }
      }} onClick={() => navigate('/add')}>
        <AddIcon sx={{ fontSize: 26 }} />
      </Fab>
    </Box>
  );
}
