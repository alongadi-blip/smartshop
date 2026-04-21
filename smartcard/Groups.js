import { useState, useEffect } from 'react';
import { Box, Typography, Card, IconButton, TextField, Button, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LinkIcon from '@mui/icons-material/Link';
import { useNavigate } from 'react-router-dom';
import { getGroups, createGroup, getGroup, createInvite, deleteGroup, removeMember, getGroupVouchers } from '../api';

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

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [groupVouchers, setGroupVouchers] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [tab, setTab] = useState('vouchers'); // 'vouchers' | 'members'
  const navigate = useNavigate();

  useEffect(() => { loadGroups(); }, []);

  const loadGroups = async () => {
    const res = await getGroups();
    setGroups(res.data);
  };

  const openGroup = async (g) => {
    setSelected(g);
    setTab('vouchers');
    const [detailRes, vouchersRes] = await Promise.all([
      getGroup(g.id),
      getGroupVouchers(g.id)
    ]);
    setDetail(detailRes.data);
    setGroupVouchers(vouchersRes.data);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createGroup(newName.trim());
    setNewName('');
    setCreating(false);
    loadGroups();
  };

  const handleInvite = async () => {
    await createInvite(selected.id);
    const res2 = await getGroup(selected.id);
    setDetail(res2.data);
  };

  const handleCopy = (code) => {
    const link = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    await deleteGroup(confirmDelete);
    setConfirmDelete(null);
    setSelected(null);
    setDetail(null);
    setGroupVouchers([]);
    loadGroups();
  };

  const handleRemoveMember = async (userId) => {
    await removeMember(selected.id, userId);
    const res = await getGroup(selected.id);
    setDetail(res.data);
  };

  const myEmail = (() => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub;
    } catch { return ''; }
  })();

  const isOwner = detail?.owner_id === detail?.members?.find(m => m.email === myEmail)?.user_id;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F6FA', pb: 8 }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', boxShadow: '0 1px 0 #E8E8EE, 0 2px 12px rgba(0,0,0,0.06)', px: 3, pt: 5, pb: 2.5 }}>
        <Box display='flex' alignItems='center' gap={1} mb={1}>
          <IconButton onClick={() => selected ? (setSelected(null), setDetail(null), setGroupVouchers([])) : navigate('/')} sx={{ color: '#9196A6' }}>
            <ArrowForwardIcon />
          </IconButton>
          <Typography variant='h6' fontWeight='800' color='#1A1D23'>
            {selected ? selected.name : 'קבוצות שיתוף'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pt: 2.5 }}>
        {!selected ? (
          <>
            {groups.length === 0 && !creating && (
              <Box textAlign='center' mt={6}>
                <GroupIcon sx={{ fontSize: 56, color: '#DADEEA', mb: 1 }} />
                <Typography color='#9196A6' fontSize={14}>אין קבוצות עדיין</Typography>
              </Box>
            )}

            {groups.map(g => (
              <Card key={g.id} onClick={() => openGroup(g)} sx={{
                mb: 1.5, borderRadius: 2, border: '1px solid #ECEDF5',
                boxShadow: '0 1px 6px rgba(0,0,0,0.06)', cursor: 'pointer', p: 2,
                '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }
              }}>
                <Box display='flex' justifyContent='space-between' alignItems='center'>
                  <Box display='flex' alignItems='center' gap={1}>
                    <Chip size='small' label={g.my_role === 'owner' ? 'בעלים' : 'חבר'}
                      sx={{ bgcolor: g.my_role === 'owner' ? '#E3F2FD' : '#E0F2F1', color: g.my_role === 'owner' ? '#1565C0' : '#00695C', fontSize: 11 }} />
                    <Typography fontSize={13} color='#9196A6'>{g.member_count} חברים</Typography>
                  </Box>
                  <Typography fontWeight='700' fontSize={16} color='#1A1D23'>{g.name}</Typography>
                </Box>
              </Card>
            ))}

            {creating ? (
              <Card sx={{ p: 2.5, borderRadius: 2, border: '2px solid #1565C0', mt: 1 }}>
                <TextField fullWidth label='שם הקבוצה' value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus inputProps={{ dir: 'rtl' }}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <Box display='flex' gap={1}>
                  <Button variant='outlined' fullWidth onClick={() => setCreating(false)}
                    sx={{ borderRadius: 2 }}>ביטול</Button>
                  <Button variant='contained' fullWidth onClick={handleCreate}
                    sx={{ borderRadius: 2, background: 'linear-gradient(145deg,#00ACC1,#00897B)' }}>
                    צור קבוצה
                  </Button>
                </Box>
              </Card>
            ) : (
              <Button fullWidth startIcon={<AddIcon />} onClick={() => setCreating(true)}
                sx={{ mt: 1, borderRadius: 2, border: '2px dashed #B2EBF2', color: '#00897B', py: 1.5,
                  '&:hover': { bgcolor: '#E0F7FA' } }}>
                צור קבוצה חדשה
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Group actions row */}
            <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
              {isOwner ? (
                <IconButton size='small' onClick={() => setConfirmDelete(selected.id)}
                  sx={{ color: '#E53935', bgcolor: '#FFEBEE' }}>
                  <DeleteIcon fontSize='small' />
                </IconButton>
              ) : <Box />}
              <Chip size='small' label={`${detail?.members?.length || 0} חברים`}
                icon={<GroupIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ bgcolor: '#F0F4FF', color: '#1565C0', fontWeight: 600 }}
                onClick={() => setTab(tab === 'members' ? 'vouchers' : 'members')}
              />
            </Box>

            {/* Invite card */}
            <Card sx={{ p: 2, borderRadius: 2, border: '1px solid #ECEDF5', mb: 2 }}>
              <Typography fontWeight='700' fontSize={13} color='#1A1D23' textAlign='right' mb={1}>
                קישור הזמנה
              </Typography>
              {detail?.invite_code ? (
                <Box>
                  <Box sx={{ bgcolor: '#F5F6FA', borderRadius: 1.5, p: 1.25, mb: 1, fontFamily: 'monospace', fontSize: 13, textAlign: 'center', color: '#1565C0', letterSpacing: 2, fontWeight: 700 }}>
                    {detail.invite_code}
                  </Box>
                  <Button fullWidth startIcon={<ContentCopyIcon />} variant='contained' size='small'
                    onClick={() => handleCopy(detail.invite_code)}
                    sx={{ borderRadius: 2, background: copied ? '#43A047' : 'linear-gradient(145deg,#00ACC1,#00897B)' }}>
                    {copied ? 'הועתק!' : 'העתק קישור'}
                  </Button>
                </Box>
              ) : (
                <Button fullWidth startIcon={<RefreshIcon />} variant='outlined' size='small'
                  onClick={handleInvite}
                  sx={{ borderRadius: 2, borderColor: '#00897B', color: '#00897B' }}>
                  צור קישור הזמנה
                </Button>
              )}
            </Card>

            {/* Members tab */}
            {tab === 'members' && (
              <Card sx={{ p: 2, borderRadius: 2, border: '1px solid #ECEDF5', mb: 2 }}>
                <Typography fontWeight='700' fontSize={13} color='#1A1D23' textAlign='right' mb={1}>
                  חברים
                </Typography>
                {detail?.members?.map(m => (
                  <Box key={m.user_id} display='flex' justifyContent='space-between' alignItems='center'
                    sx={{ py: 1, borderBottom: '1px solid #F5F6FA' }}>
                    <Box display='flex' alignItems='center' gap={1}>
                      {m.role !== 'owner' && m.email !== myEmail && isOwner && (
                        <IconButton size='small' onClick={() => handleRemoveMember(m.user_id)}
                          sx={{ color: '#E53935', width: 26, height: 26 }}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      )}
                      <Chip size='small' label={m.role === 'owner' ? 'בעלים' : 'עורך'}
                        sx={{ bgcolor: m.role === 'owner' ? '#E3F2FD' : '#F3E5F5', fontSize: 10,
                          color: m.role === 'owner' ? '#1565C0' : '#7B1FA2' }} />
                    </Box>
                    <Box display='flex' alignItems='center' gap={1}>
                      <Typography fontSize={13} color='#5C6678'>{m.email}</Typography>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#E0F2F1', color: '#00695C', fontSize: 12, fontWeight: 700 }}>
                        {m.email[0].toUpperCase()}
                      </Avatar>
                    </Box>
                  </Box>
                ))}
              </Card>
            )}

            {/* Vouchers tab */}
            {tab === 'vouchers' && (
              <>
                <Box display='flex' justifyContent='space-between' alignItems='center' mb={1.5}>
                  <Button startIcon={<AddIcon />} size='small' variant='contained'
                    onClick={() => navigate('/add', { state: { groupId: selected.id, groupName: selected.name } })}
                    sx={{ borderRadius: 2, background: 'linear-gradient(145deg,#00ACC1,#00897B)', fontSize: 12 }}>
                    הוסף שובר לקבוצה
                  </Button>
                  <Typography fontWeight='700' fontSize={14} color='#1A1D23'>
                    שוברים ({groupVouchers.length})
                  </Typography>
                </Box>

                {groupVouchers.length === 0 ? (
                  <Box textAlign='center' py={4}>
                    <Typography color='#9196A6' fontSize={14}>אין שוברים בקבוצה עדיין</Typography>
                  </Box>
                ) : (
                  groupVouchers.map(v => {
                    const days = getDaysLeft(v.expiry_date);
                    const expiry = getExpiryInfo(days);
                    return (
                      <Card key={v.id} sx={{ mb: 1.5, borderRadius: 2, border: '1px solid #ECEDF5', p: 2 }}>
                        <Box display='flex' justifyContent='space-between' alignItems='flex-start'>
                          <Box>
                            {expiry && (
                              <Chip icon={<AccessTimeIcon sx={{ fontSize: '11px !important', color: `${expiry.color} !important` }} />}
                                label={expiry.label} size='small'
                                sx={{ bgcolor: expiry.bg, color: expiry.color, fontWeight: 600, fontSize: 10, height: 20 }} />
                            )}
                            {v.media_value && v.media_type === 'link' && (
                              <IconButton size='small' onClick={() => window.open(v.media_value, '_blank')}
                                sx={{ color: '#00897B', width: 26, height: 26 }}>
                                <LinkIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            )}
                          </Box>
                          <Box textAlign='right'>
                            <Typography fontWeight='700' fontSize={14} color='#1A1D23'>{v.brand_name}</Typography>
                            {v.notes ? (
                              <Typography fontSize={13} color='#5C6678'>{v.notes}</Typography>
                            ) : (
                              <Typography fontSize={22} fontWeight='800' color='#00897B'>₪{Number(v.balance).toLocaleString()}</Typography>
                            )}
                            <Typography fontSize={11} color='#9196A6'>נוסף ע"י {v.added_by}</Typography>
                          </Box>
                        </Box>
                      </Card>
                    );
                  })
                )}
              </>
            )}
          </>
        )}
      </Box>

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>מחיקת קבוצה</DialogTitle>
        <DialogContent>
          <Typography>האם למחוק את הקבוצה? פעולה זו בלתי הפיכה.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>ביטול</Button>
          <Button onClick={handleDelete} color='error'>מחק</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
