import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups, createGroup, getGroup, createInvite, deleteGroup, removeMember, getGroupVouchers } from '../api';

const getDaysLeft = (expiry) => {
  if (!expiry) return null;
  return Math.ceil((new Date(expiry) - new Date()) / 86400000);
};

const GROUP_COLORS = ['#5B5EF4', '#22C55E', '#EC4899', '#F59E0B', '#06B6D4', '#8B5CF6'];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .gr-root { min-height: 100vh; background: #0F0F14; font-family: 'DM Sans', sans-serif; direction: rtl; color: #fff; padding-bottom: 40px; }
  .gr-header { padding: 52px 20px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 12px; }
  .gr-back { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.08); border: none; color: rgba(255,255,255,0.7); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .gr-back:hover { background: rgba(255,255,255,0.14); }
  .gr-header-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
  .gr-content { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
  .gr-group-card { border-radius: 18px; padding: 18px; cursor: pointer; transition: transform 0.2s; position: relative; overflow: hidden; }
  .gr-group-card:hover { transform: scale(1.01); }
  .gr-group-card::after { content: ''; position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.08); pointer-events: none; }
  .gr-group-name { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 800; margin-bottom: 6px; }
  .gr-group-meta { display: flex; gap: 8px; align-items: center; }
  .gr-badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; background: rgba(0,0,0,0.25); }
  .gr-create-btn { width: 100%; padding: 14px; border-radius: 16px; border: 2px dashed rgba(255,255,255,0.15); background: transparent; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
  .gr-create-btn:hover { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.04); }
  .gr-block { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 18px; padding: 18px; }
  .gr-block-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
  .gr-input { width: 100%; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 14px; color: #fff; font-size: 15px; font-family: 'DM Sans', sans-serif; outline: none; direction: rtl; }
  .gr-input:focus { border-color: rgba(255,255,255,0.3); }
  .gr-input::placeholder { color: rgba(255,255,255,0.25); }
  .gr-btn-row { display: flex; gap: 10px; margin-top: 10px; }
  .gr-btn { flex: 1; padding: 12px; border-radius: 12px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; font-family: 'DM Sans', sans-serif; transition: opacity 0.2s; }
  .gr-btn:hover { opacity: 0.85; }
  .gr-btn-primary { background: linear-gradient(135deg, #fff, #e0e0e0); color: #0F0F14; }
  .gr-btn-ghost { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
  .gr-invite-code { background: rgba(255,255,255,0.07); border-radius: 12px; padding: 12px 16px; font-family: monospace; font-size: 15px; text-align: center; color: #fff; letter-spacing: 3px; font-weight: 700; margin-bottom: 10px; }
  .gr-copy-btn { width: 100%; padding: 12px; border-radius: 12px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
  .gr-copy-btn-default { background: #5B5EF4; color: #fff; }
  .gr-copy-btn-success { background: #22C55E; color: #fff; }
  .gr-gen-invite-btn { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .gr-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
  .gr-tab { flex: 1; padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.45); font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
  .gr-tab.active { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); color: #fff; }
  .gr-voucher-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 14px; padding: 14px; display: flex; justify-content: space-between; align-items: flex-start; }
  .gr-voucher-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
  .gr-voucher-amount { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #22C55E; }
  .gr-voucher-note { font-size: 13px; color: rgba(255,255,255,0.6); }
  .gr-voucher-by { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 4px; }
  .gr-expiry { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
  .gr-expiry-ok { background: rgba(34,197,94,0.15); color: #4ADE80; }
  .gr-expiry-warn { background: rgba(245,158,11,0.15); color: #FCD34D; }
  .gr-expiry-dead { background: rgba(239,68,68,0.15); color: #FCA5A5; }
  .gr-member-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .gr-member-email { font-size: 13px; color: rgba(255,255,255,0.7); }
  .gr-role-badge { font-size: 10px; padding: 3px 8px; border-radius: 20px; font-weight: 600; }
  .gr-role-owner { background: rgba(91,94,244,0.2); color: #8B8EF8; }
  .gr-role-member { background: rgba(139,92,246,0.2); color: #C084FC; }
  .gr-remove-btn { width: 26px; height: 26px; border-radius: 50%; background: rgba(239,68,68,0.15); border: none; color: #FCA5A5; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .gr-actions-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .gr-delete-btn { padding: 8px 14px; border-radius: 10px; background: rgba(239,68,68,0.15); border: none; color: #FCA5A5; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .gr-add-voucher-btn { padding: 8px 14px; border-radius: 10px; background: #5B5EF4; border: none; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .gr-empty { text-align: center; padding: 40px 20px; color: rgba(255,255,255,0.3); font-size: 13px; }
  .gr-dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .gr-dialog { background: #1A1A2E; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 24px; max-width: 320px; width: 100%; }
  .gr-dialog-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; margin-bottom: 10px; }
  .gr-dialog-text { font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 20px; }
  .gr-dialog-btns { display: flex; gap: 10px; }
`;

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [groupVouchers, setGroupVouchers] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [tab, setTab] = useState('vouchers');
  const navigate = useNavigate();

  useEffect(() => { loadGroups(); }, []);

  const loadGroups = async () => { const res = await getGroups(); setGroups(res.data); };

  const openGroup = async (g) => {
    setSelected(g); setTab('vouchers');
    const [detailRes, vouchersRes] = await Promise.all([getGroup(g.id), getGroupVouchers(g.id)]);
    setDetail(detailRes.data); setGroupVouchers(vouchersRes.data);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createGroup(newName.trim()); setNewName(''); setCreating(false); loadGroups();
  };

  const handleInvite = async () => {
    await createInvite(selected.id);
    const res2 = await getGroup(selected.id); setDetail(res2.data);
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    await deleteGroup(confirmDelete);
    setConfirmDelete(null); setSelected(null); setDetail(null); setGroupVouchers([]); loadGroups();
  };

  const handleRemoveMember = async (userId) => {
    await removeMember(selected.id, userId);
    const res = await getGroup(selected.id); setDetail(res.data);
  };

  const myEmail = (() => {
    try { const t = localStorage.getItem('token'); return JSON.parse(atob(t.split('.')[1])).sub; } catch { return ''; }
  })();
  const isOwner = detail?.owner_id === detail?.members?.find(m => m.email === myEmail)?.user_id;

  const ExpiryChip = ({ expiry_date }) => {
    const days = getDaysLeft(expiry_date);
    if (days === null) return null;
    const cls = days <= 0 ? 'gr-expiry gr-expiry-dead' : days <= 14 ? 'gr-expiry gr-expiry-warn' : 'gr-expiry gr-expiry-ok';
    return <span className={cls}>⏱ {days <= 0 ? 'פג תוקף' : `עוד ${days} ימים`}</span>;
  };

  return (
    <>
      <style>{styles}</style>
      <div className="gr-root">
        <div className="gr-header">
          <button className="gr-back" onClick={() => selected ? (setSelected(null), setDetail(null), setGroupVouchers([])) : navigate('/')}>→</button>
          <div className="gr-header-title">{selected ? selected.name : 'קבוצות שיתוף'}</div>
        </div>

        <div className="gr-content">
          {!selected ? (
            <>
              {groups.length === 0 && !creating && (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                  <div style={{ fontSize: 14 }}>אין קבוצות עדיין</div>
                </div>
              )}

              {groups.map((g, i) => (
                <div key={g.id} className="gr-group-card" style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }} onClick={() => openGroup(g)}>
                  <div className="gr-group-name">{g.name}</div>
                  <div className="gr-group-meta">
                    <span className="gr-badge">{g.my_role === 'owner' ? '👑 בעלים' : '👤 חבר'}</span>
                    <span className="gr-badge">{g.member_count} חברים</span>
                  </div>
                </div>
              ))}

              {creating ? (
                <div className="gr-block">
                  <div className="gr-block-label">קבוצה חדשה</div>
                  <input className="gr-input" placeholder="שם הקבוצה" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
                  <div className="gr-btn-row">
                    <button className="gr-btn gr-btn-ghost" onClick={() => setCreating(false)}>ביטול</button>
                    <button className="gr-btn gr-btn-primary" onClick={handleCreate}>צור קבוצה</button>
                  </div>
                </div>
              ) : (
                <button className="gr-create-btn" onClick={() => setCreating(true)}>+ צור קבוצה חדשה</button>
              )}
            </>
          ) : (
            <>
              {/* actions row */}
              <div className="gr-actions-row">
                {isOwner
                  ? <button className="gr-delete-btn" onClick={() => setConfirmDelete(selected.id)}>🗑 מחק קבוצה</button>
                  : <div />}
                <button className="gr-add-voucher-btn" onClick={() => navigate('/add', { state: { groupId: selected.id, groupName: selected.name } })}>+ הוסף שובר</button>
              </div>

              {/* invite */}
              <div className="gr-block">
                <div className="gr-block-label">קישור הזמנה</div>
                {detail?.invite_code ? (
                  <>
                    <div className="gr-invite-code">{detail.invite_code}</div>
                    <button className={`gr-copy-btn ${copied ? 'gr-copy-btn-success' : 'gr-copy-btn-default'}`} onClick={() => handleCopy(detail.invite_code)}>
                      {copied ? '✅ הועתק!' : '📋 העתק קישור'}
                    </button>
                  </>
                ) : (
                  <button className="gr-gen-invite-btn" onClick={handleInvite}>🔗 צור קישור הזמנה</button>
                )}
              </div>

              {/* tabs */}
              <div className="gr-tabs">
                <button className={`gr-tab${tab === 'vouchers' ? ' active' : ''}`} onClick={() => setTab('vouchers')}>🎫 שוברים ({groupVouchers.length})</button>
                <button className={`gr-tab${tab === 'members' ? ' active' : ''}`} onClick={() => setTab('members')}>👥 חברים ({detail?.members?.length || 0})</button>
              </div>

              {tab === 'vouchers' && (
                groupVouchers.length === 0
                  ? <div className="gr-empty">אין שוברים בקבוצה עדיין</div>
                  : groupVouchers.map(v => (
                    <div key={v.id} className="gr-voucher-card">
                      <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                        <ExpiryChip expiry_date={v.expiry_date} />
                        {v.media_value && v.media_type === 'link' && (
                          <button style={{ background: 'rgba(91,94,244,0.2)', border: 'none', color: '#8B8EF8', fontSize: 11, padding: '3px 8px', borderRadius: 20, cursor: 'pointer' }} onClick={() => window.open(v.media_value, '_blank')}>🔗 פתח</button>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="gr-voucher-name">{v.brand_name}</div>
                        {v.notes
                          ? <div className="gr-voucher-note">{v.notes}</div>
                          : <div className="gr-voucher-amount">₪{Number(v.balance).toLocaleString()}</div>}
                        <div className="gr-voucher-by">נוסף ע״י {v.added_by}</div>
                      </div>
                    </div>
                  ))
              )}

              {tab === 'members' && (
                <div className="gr-block">
                  {detail?.members?.map(m => (
                    <div key={m.user_id} className="gr-member-row">
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {m.role !== 'owner' && m.email !== myEmail && isOwner && (
                          <button className="gr-remove-btn" onClick={() => handleRemoveMember(m.user_id)}>✕</button>
                        )}
                        <span className={`gr-role-badge ${m.role === 'owner' ? 'gr-role-owner' : 'gr-role-member'}`}>
                          {m.role === 'owner' ? 'בעלים' : 'עורך'}
                        </span>
                      </div>
                      <span className="gr-member-email">{m.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Confirm delete dialog */}
        {confirmDelete && (
          <div className="gr-dialog-overlay" onClick={() => setConfirmDelete(null)}>
            <div className="gr-dialog" onClick={e => e.stopPropagation()}>
              <div className="gr-dialog-title">מחיקת קבוצה</div>
              <div className="gr-dialog-text">האם למחוק את הקבוצה? פעולה זו בלתי הפיכה.</div>
              <div className="gr-dialog-btns">
                <button className="gr-btn gr-btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>ביטול</button>
                <button style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'rgba(239,68,68,0.8)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }} onClick={handleDelete}>מחק</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
