import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBrands, createVoucher, createGroupVoucher, uploadImage, createBrand } from '../api';
import axios from 'axios';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .av-root {
    min-height: 100vh;
    background: #0F0F14;
    font-family: 'DM Sans', sans-serif;
    direction: rtl;
    color: #fff;
    padding-bottom: 40px;
  }

  /* Header */
  .av-header {
    padding: 52px 20px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; gap: 12px;
  }
  .av-back {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.08); border: none;
    color: rgba(255,255,255,0.7); font-size: 18px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .av-back:hover { background: rgba(255,255,255,0.14); }
  .av-header-title {
    font-family: 'Syne', sans-serif;
    font-size: 20px; font-weight: 800; letter-spacing: -0.5px;
  }
  .av-header-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }

  /* Content */
  .av-content { padding: 20px; display: flex; flex-direction: column; gap: 14px; }

  /* Section block */
  .av-block {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 18px;
    padding: 18px;
  }
  .av-block-label {
    font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4);
    letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;
  }

  /* Inputs */
  .av-input {
    width: 100%; background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 12px 14px;
    color: #fff; font-size: 15px; font-family: 'DM Sans', sans-serif;
    outline: none; direction: rtl;
    transition: border-color 0.2s;
  }
  .av-input:focus { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.09); }
  .av-input::placeholder { color: rgba(255,255,255,0.25); }
  .av-input + .av-input { margin-top: 10px; }

  /* Select */
  .av-select {
    width: 100%; background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 12px 14px;
    color: #fff; font-size: 15px; font-family: 'DM Sans', sans-serif;
    outline: none; direction: rtl; cursor: pointer;
    appearance: none;
  }
  .av-select option { background: #1a1a2e; color: #fff; }

  /* Segmented control for media type */
  .av-seg { display: flex; gap: 8px; }
  .av-seg-btn {
    flex: 1; padding: 10px 6px; border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    background: transparent; color: rgba(255,255,255,0.45);
    font-size: 12px; font-weight: 600; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.2s; text-align: center;
  }
  .av-seg-btn:hover { background: rgba(255,255,255,0.07); }
  .av-seg-btn.active {
    background: rgba(255,255,255,0.14);
    border-color: rgba(255,255,255,0.3);
    color: #fff;
  }

  /* Upload zone */
  .av-upload-zone {
    border: 2px dashed rgba(255,255,255,0.15);
    border-radius: 14px; padding: 28px 20px;
    text-align: center; cursor: pointer;
    transition: all 0.2s;
  }
  .av-upload-zone:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.04); }
  .av-upload-icon { font-size: 28px; margin-bottom: 8px; }
  .av-upload-text { font-size: 14px; color: rgba(255,255,255,0.6); font-weight: 500; }
  .av-upload-hint { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 4px; }
  .av-preview { width: 100%; border-radius: 12px; max-height: 180px; object-fit: cover; margin-top: 12px; }

  /* OCR scanning */
  .av-scanning {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    padding: 16px; border-radius: 14px;
    background: rgba(91,94,244,0.15); border: 1px solid rgba(91,94,244,0.3);
  }
  .av-scan-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #5B5EF4;
    animation: pulse 1s infinite;
  }
  @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.8); } }
  .av-scanning-text { font-size: 14px; color: rgba(255,255,255,0.8); font-weight: 500; }

  /* OCR result */
  .av-ocr-result {
    background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25);
    border-radius: 14px; padding: 14px;
  }
  .av-ocr-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  .av-ocr-head-icon { font-size: 14px; }
  .av-ocr-head-text { font-size: 12px; font-weight: 600; color: #4ADE80; }
  .av-ocr-item { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; }

  /* Scan buttons */
  .av-scan-btns { display: flex; gap: 10px; }
  .av-scan-btn {
    flex: 1; padding: 12px; border-radius: 14px;
    border: none; cursor: pointer;
    font-size: 13px; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: opacity 0.2s;
  }
  .av-scan-btn:hover { opacity: 0.88; }
  .av-scan-btn-primary { background: #5B5EF4; color: #fff; }
  .av-scan-btn-outline {
    background: transparent; color: rgba(255,255,255,0.7);
    border: 1px solid rgba(255,255,255,0.15) !important;
  }

  /* Error */
  .av-error {
    background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
    border-radius: 12px; padding: 12px 16px;
    font-size: 13px; color: #FCA5A5; text-align: center;
  }

  /* Submit */
  .av-submit {
    width: 100%; padding: 16px;
    background: linear-gradient(135deg, #fff 0%, #e8e8e8 100%);
    color: #0F0F14; font-size: 16px; font-weight: 700;
    border: none; border-radius: 16px; cursor: pointer;
    font-family: 'Syne', sans-serif; letter-spacing: 0.3px;
    transition: transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
  }
  .av-submit:hover { transform: translateY(-1px); box-shadow: 0 12px 36px rgba(0,0,0,0.5); }
  .av-submit:active { transform: translateY(0); }
`;

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
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [expiry, setExpiry] = useState('');
  const [mediaType, setMediaType] = useState('link');
  const [mediaValue, setMediaValue] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  useEffect(() => { getBrands().then(res => setBrands(res.data)); }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const handleMediaTypeChange = (val) => {
    setMediaType(val); setImageFile(null); setImagePreview(null); setMediaValue('');
  };

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true); setOcrResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/vouchers/ocr', formData);
      const data = res.data;
      setOcrResult(data);
      if (data.balance) setBalance(String(data.balance));
      if (data.expiry_date) setExpiry(data.expiry_date);
      if (data.brand_guess) {
        const lower = data.brand_guess.toLowerCase();
        const matched = brands.find(b => lower.includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(lower));
        if (matched) setBrandId(matched.id);
        else { setBrandId('custom'); setCustomBrand(data.brand_guess); }
      }
    } catch { setError('שגיאה בסריקה, נסה שוב'); }
    setScanning(false);
  };

  const isMonetary = category === 'שובר כספי' || category === 'זיכויים';

  const handleSubmit = async () => {
    if (!brandId && !customBrand) { setError('נא לבחור מותג'); return; }
    if (isMonetary && mediaType !== 'upload' && !balance) { setError('נא למלא יתרה'); return; }
    try {
      let finalBrandId = brandId;
      if (brandId === 'custom') {
        const res = await createBrand(customBrand);
        finalBrandId = res.data.id;
      }
      let finalMediaValue = mediaValue;
      let finalMediaType = mediaType;
      if (mediaType === 'upload' && imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const res = await uploadImage(formData);
        finalMediaValue = res.data.url;
        finalMediaType = 'image';
      }
      const voucherData = {
        brand_id: parseInt(finalBrandId),
        balance: mediaType === 'upload' ? 0 : parseFloat(balance),
        expiry_date: expiry || null,
        media_type: finalMediaValue ? finalMediaType : null,
        media_value: finalMediaValue || null,
        notes: notes || null,
        category: !category ? 'כללי' : category === 'שובר אחר' ? (customCategory || 'כללי') : category,
      };
      if (groupId) { await createGroupVoucher(groupId, voucherData); navigate('/groups'); }
      else { await createVoucher(voucherData); navigate('/'); }
    } catch (e) { setError(e.response?.data?.detail || 'שגיאה'); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="av-root">
        <div className="av-header">
          <button className="av-back" onClick={() => groupId ? navigate('/groups') : navigate('/')}>→</button>
          <div>
            <div className="av-header-title">הוספת שובר</div>
            <div className="av-header-sub">{groupName ? `לקבוצה: ${groupName}` : 'מלא את הפרטים להלן'}</div>
          </div>
        </div>

        <div className="av-content">

          {/* Scan */}
          <div className="av-block">
            <div className="av-block-label">סריקה מהירה</div>
            {scanning ? (
              <div className="av-scanning">
                <div className="av-scan-dot" />
                <span className="av-scanning-text">מנתח תמונה...</span>
              </div>
            ) : (
              <div className="av-scan-btns">
                <label className="av-scan-btn av-scan-btn-primary">
                  📷 צלם כרטיס
                  <input type="file" accept="image/*" capture="environment" hidden onChange={handleScan} />
                </label>
                <label className="av-scan-btn av-scan-btn-outline">
                  🖼 מהגלריה
                  <input type="file" accept="image/*" hidden onChange={handleScan} />
                </label>
              </div>
            )}
            {ocrResult && (
              <div className="av-ocr-result" style={{ marginTop: 12 }}>
                <div className="av-ocr-head">
                  <span className="av-ocr-head-icon">✅</span>
                  <span className="av-ocr-head-text">זוהו נתונים — ניתן לערוך</span>
                </div>
                {ocrResult.balance && <div className="av-ocr-item">💰 יתרה: ₪{ocrResult.balance}</div>}
                {ocrResult.expiry_date && <div className="av-ocr-item">📅 תוקף: {ocrResult.expiry_date}</div>}
                {ocrResult.brand_guess && <div className="av-ocr-item">🏷 מותג: {ocrResult.brand_guess}</div>}
                {!ocrResult.balance && !ocrResult.expiry_date && !ocrResult.brand_guess && (
                  <div style={{ fontSize: 12, color: '#FCD34D', marginTop: 4 }}>לא זוהו נתונים, מלא ידנית</div>
                )}
              </div>
            )}
          </div>

          {/* Category */}
          <div className="av-block">
            <div className="av-block-label">קטגוריה</div>
            <div className="av-seg">
              {['שובר כספי', 'זיכויים', 'שובר אחר'].map(cat => (
                <button key={cat} className={`av-seg-btn${category === cat ? ' active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
              ))}
            </div>
            {category === 'שובר אחר' && (
              <input className="av-input" style={{ marginTop: 10 }} placeholder="תיאור הקטגוריה..." value={customCategory} onChange={e => setCustomCategory(e.target.value)} />
            )}
          </div>

          {/* Brand */}
          <div className="av-block">
            <div className="av-block-label">מותג</div>
            <select className="av-select" value={brandId} onChange={e => setBrandId(e.target.value)}>
              <option value="">בחר מותג...</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              <option value="custom">+ הוסף מותג חדש</option>
            </select>
            {brandId === 'custom' && (
              <input className="av-input" style={{ marginTop: 10 }} placeholder="שם המותג" value={customBrand} onChange={e => setCustomBrand(e.target.value)} />
            )}
          </div>

          {/* Media type */}
          <div className="av-block">
            <div className="av-block-label">סוג שובר</div>
            <div className="av-seg">
              {[['link', '🔗 לינק'], ['image', '🖼 URL תמונה'], ['upload', '📤 העלאה']].map(([val, label]) => (
                <button key={val} className={`av-seg-btn${mediaType === val ? ' active' : ''}`} onClick={() => handleMediaTypeChange(val)}>{label}</button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="av-block">
            <div className="av-block-label">פרטי שובר</div>
            {mediaType === 'upload' ? (
              <>
                <input className="av-input" placeholder="שם המוצר / תיאור" value={notes} onChange={e => setNotes(e.target.value)} />
                <label style={{ display: 'block', marginTop: 12 }}>
                  <div className="av-upload-zone">
                    <div className="av-upload-icon">📁</div>
                    <div className="av-upload-text">לחץ לבחירת תמונה</div>
                    <div className="av-upload-hint">PNG, JPG עד 10MB</div>
                    <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                  </div>
                </label>
                {imagePreview && <img src={imagePreview} className="av-preview" alt="" />}
              </>
            ) : isMonetary ? (
              <>
                <input className="av-input" type="number" placeholder="יתרה (₪)" value={balance} onChange={e => setBalance(e.target.value)} style={{ direction: 'ltr' }} />
                <input className="av-input" placeholder={mediaType === 'link' ? 'לינק לשובר' : 'URL של תמונה'} value={mediaValue} onChange={e => setMediaValue(e.target.value)} style={{ direction: 'ltr' }} />
              </>
            ) : (
              <>
                <input className="av-input" placeholder="שם השובר / תיאור" value={notes} onChange={e => setNotes(e.target.value)} />
                <input className="av-input" placeholder={mediaType === 'link' ? 'לינק לשובר (אופציונלי)' : 'URL של תמונה (אופציונלי)'} value={mediaValue} onChange={e => setMediaValue(e.target.value)} style={{ direction: 'ltr', marginTop: 10 }} />
              </>
            )}
          </div>

          {/* Expiry */}
          <div className="av-block">
            <div className="av-block-label">תאריך תוקף</div>
            <input className="av-input" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} style={{ direction: 'ltr', colorScheme: 'dark' }} />
          </div>

          {error && <div className="av-error">{error}</div>}

          <button className="av-submit" onClick={handleSubmit}>הוסף שובר</button>
        </div>
      </div>
    </>
  );
}
