import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { updateVoucher, uploadImage } from '../api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .ev-root { min-height: 100vh; background: #0F0F14; font-family: 'DM Sans', sans-serif; direction: rtl; color: #fff; padding-bottom: 40px; }
  .ev-header { padding: 52px 20px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 12px; }
  .ev-back { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.08); border: none; color: rgba(255,255,255,0.7); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ev-back:hover { background: rgba(255,255,255,0.14); }
  .ev-header-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
  .ev-header-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }
  .ev-content { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .ev-block { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 18px; padding: 18px; }
  .ev-block-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
  .ev-input { width: 100%; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 14px; color: #fff; font-size: 15px; font-family: 'DM Sans', sans-serif; outline: none; direction: rtl; transition: border-color 0.2s; }
  .ev-input:focus { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.09); }
  .ev-input::placeholder { color: rgba(255,255,255,0.25); }
  .ev-input + .ev-input { margin-top: 10px; }
  .ev-seg { display: flex; gap: 8px; }
  .ev-seg-btn { flex: 1; padding: 10px 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.45); font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; text-align: center; }
  .ev-seg-btn.active { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.3); color: #fff; }
  .ev-upload-zone { border: 2px dashed rgba(255,255,255,0.15); border-radius: 14px; padding: 28px 20px; text-align: center; cursor: pointer; transition: all 0.2s; }
  .ev-upload-zone:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.04); }
  .ev-preview { width: 100%; border-radius: 12px; max-height: 180px; object-fit: cover; margin-top: 12px; }
  .ev-error { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #FCA5A5; text-align: center; }
  .ev-submit { width: 100%; padding: 16px; background: linear-gradient(135deg, #fff 0%, #e8e8e8 100%); color: #0F0F14; font-size: 16px; font-weight: 700; border: none; border-radius: 16px; cursor: pointer; font-family: 'Syne', sans-serif; letter-spacing: 0.3px; transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 8px 30px rgba(0,0,0,0.4); }
  .ev-submit:hover { transform: translateY(-1px); box-shadow: 0 12px 36px rgba(0,0,0,0.5); }
`;

export default function EditVoucher() {
  const navigate = useNavigate();
  const location = useLocation();
  const voucher = location.state?.voucher;

  const [balance, setBalance] = useState(voucher?.balance || '');
  const [expiry, setExpiry] = useState(voucher?.expiry_date || '');
  const [mediaType, setMediaType] = useState(voucher?.media_type || 'link');
  const [mediaValue, setMediaValue] = useState(voucher?.media_value || '');
  const [notes, setNotes] = useState(voucher?.notes || '');
  const FIXED_CATS = ['שובר כספי', 'זיכויים', 'שובר אחר'];
  const initCat = voucher?.category || '';
  const [category, setCategory] = useState(FIXED_CATS.includes(initCat) ? initCat : 'שובר אחר');
  const [customCategory, setCustomCategory] = useState(FIXED_CATS.includes(initCat) ? '' : (initCat || ''));
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(voucher?.media_type === 'image' ? voucher.media_value : null);
  const [error, setError] = useState('');

  const isMonetary = category === 'שובר כספי' || category === 'זיכויים';

  if (!voucher) { navigate('/'); return null; }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const handleMediaTypeChange = (val) => { setMediaType(val); setImageFile(null); };

  const handleSubmit = async () => {
    try {
      let finalMediaValue = mediaValue;
      let finalMediaType = mediaType;
      if (mediaType === 'upload' && imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const res = await uploadImage(formData);
        finalMediaValue = res.data.url;
        finalMediaType = 'image';
      }
      await updateVoucher(voucher.id, {
        balance: parseFloat(balance) || 0,
        expiry_date: expiry || null,
        media_type: finalMediaType || null,
        media_value: finalMediaValue || null,
        notes: notes || null,
        category: category === 'שובר אחר' ? (customCategory || 'כללי') : category
      });
      navigate('/');
    } catch (e) { setError(e.response?.data?.detail || 'שגיאה'); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="ev-root">
        <div className="ev-header">
          <button className="ev-back" onClick={() => navigate('/')}>→</button>
          <div>
            <div className="ev-header-title">עריכת שובר</div>
            <div className="ev-header-sub">{voucher.brand_name}</div>
          </div>
        </div>

        <div className="ev-content">
          {/* Category */}
          <div className="ev-block">
            <div className="ev-block-label">קטגוריה</div>
            <div className="ev-seg">
              {['שובר כספי', 'זיכויים', 'שובר אחר'].map(cat => (
                <button key={cat} className={`ev-seg-btn${category === cat ? ' active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
              ))}
            </div>
            {category === 'שובר אחר' && (
              <input className="ev-input" style={{ marginTop: 10 }} placeholder="תיאור הקטגוריה..." value={customCategory} onChange={e => setCustomCategory(e.target.value)} />
            )}
          </div>

          <div className="ev-block">
            <div className="ev-block-label">פרטים</div>
            {isMonetary ? (
              <input className="ev-input" type="number" placeholder="יתרה (₪)" value={balance} onChange={e => setBalance(e.target.value)} style={{ direction: 'ltr' }} />
            ) : (
              <input className="ev-input" placeholder="שם השובר / תיאור" value={notes} onChange={e => setNotes(e.target.value)} />
            )}
            <input className="ev-input" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} style={{ direction: 'ltr', colorScheme: 'dark', marginTop: 10 }} />
          </div>

          <div className="ev-block">
            <div className="ev-block-label">סוג מדיה</div>
            <div className="ev-seg" style={{ marginBottom: 14 }}>
              {[['link', '🔗 לינק'], ['image', '🖼 URL תמונה'], ['upload', '📤 העלאה']].map(([val, label]) => (
                <button key={val} className={`ev-seg-btn${mediaType === val ? ' active' : ''}`} onClick={() => handleMediaTypeChange(val)}>{label}</button>
              ))}
            </div>
            {mediaType === 'upload' ? (
              <>
                {isMonetary && (
                  <input className="ev-input" placeholder="שם המוצר / תיאור" value={notes} onChange={e => setNotes(e.target.value)} style={{ marginBottom: 12 }} />
                )}
                <label style={{ display: 'block' }}>
                  <div className="ev-upload-zone">
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>לחץ לבחירת תמונה</div>
                    <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                  </div>
                </label>
                {imagePreview && <img src={imagePreview} className="ev-preview" alt="" />}
              </>
            ) : (
              <input className="ev-input" placeholder={mediaType === 'link' ? 'לינק לשובר' : 'URL של תמונה'} value={mediaValue} onChange={e => setMediaValue(e.target.value)} style={{ direction: 'ltr' }} />
            )}
          </div>

          {error && <div className="ev-error">{error}</div>}
          <button className="ev-submit" onClick={handleSubmit}>שמור שינויים</button>
        </div>
      </div>
    </>
  );
}
