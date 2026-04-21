import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { previewInvite, joinGroup } from '../api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .jg-root { min-height: 100vh; background: #0F0F14; font-family: 'DM Sans', sans-serif; direction: rtl; color: #fff; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .jg-card { width: 100%; max-width: 340px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px 24px; text-align: center; }
  .jg-icon { font-size: 52px; margin-bottom: 16px; }
  .jg-group-name { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; }
  .jg-meta { font-size: 13px; color: rgba(255,255,255,0.45); margin-bottom: 4px; }
  .jg-desc { font-size: 12px; color: rgba(255,255,255,0.3); margin-bottom: 28px; }
  .jg-join-btn { width: 100%; padding: 15px; background: linear-gradient(135deg, #5B5EF4, #8B5CF6); color: #fff; font-size: 16px; font-weight: 700; border: none; border-radius: 14px; cursor: pointer; font-family: 'Syne', sans-serif; margin-bottom: 10px; transition: opacity 0.2s; }
  .jg-join-btn:hover { opacity: 0.88; }
  .jg-join-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .jg-cancel-btn { width: 100%; padding: 12px; background: transparent; color: rgba(255,255,255,0.4); font-size: 14px; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .jg-error { font-size: 14px; color: #FCA5A5; margin-bottom: 16px; }
  .jg-success-icon { font-size: 52px; margin-bottom: 16px; }
  .jg-success-text { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; }
`;

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
    } catch (e) { setError(e.response?.data?.detail || 'שגיאה בהצטרפות'); }
    setJoining(false);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="jg-root">
        <div className="jg-card">
          {loading ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>טוען...</div>
          ) : joined ? (
            <>
              <div className="jg-success-icon">✅</div>
              <div className="jg-success-text">הצטרפת בהצלחה!</div>
            </>
          ) : error && !info ? (
            <>
              <div style={{ fontSize: 14, color: '#FCA5A5', marginBottom: 16 }}>{error}</div>
              <button className="jg-cancel-btn" onClick={() => navigate('/')}>חזור לדף הראשי</button>
            </>
          ) : (
            <>
              <div className="jg-icon">👥</div>
              <div className="jg-group-name">{info?.group_name}</div>
              <div className="jg-meta">{info?.member_count} חברים</div>
              <div className="jg-desc">הוזמנת להצטרף לקבוצת שיתוף</div>
              {error && <div className="jg-error">{error}</div>}
              <button className="jg-join-btn" onClick={handleJoin} disabled={joining}>
                {joining ? '...' : 'הצטרף לקבוצה'}
              </button>
              <button className="jg-cancel-btn" onClick={() => navigate('/')}>ביטול</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
