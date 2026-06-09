import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const S = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(4px)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '16px',
  },
  sheet: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-card)',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px 14px',
    borderBottom: '1px solid var(--border-card)',
  },
  title: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 800,
    fontSize: '20px',
    letterSpacing: '0.04em',
    color: 'var(--text-1)',
  },
  body: {
    overflowY: 'auto' as const,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  sectionLabel: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.08em',
    color: '#475569',
    marginBottom: '10px',
  },
  card: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border-2)',
    borderRadius: '14px',
    padding: '14px 16px',
  },
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={S.sectionLabel}>{label}</p>
      <div style={S.card}>{children}</div>
    </div>
  );
}

function ScoreRow({ pts, label, sub, color }: { pts: string; label: string; sub?: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 0', borderBottom: '1px solid #0A1020' }}>
      <div style={{
        minWidth: '52px', textAlign: 'center',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800, fontSize: '22px', color, lineHeight: 1,
      }}>
        {pts}
      </div>
      <div>
        <p style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 600 }}>{label}</p>
        {sub && <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function RulesModal({ onClose }: Props) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>

        <div style={S.header}>
          <span style={S.title}>כיצד משחקים?</span>
          <button onClick={onClose} className="cursor-pointer transition-colors duration-200"
            style={{ color: '#334155', padding: '4px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#334155')}>
            <X size={20} />
          </button>
        </div>

        <div style={S.body}>

          <Section label="ניחושי משחקים">
            <div style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.7, marginBottom: '12px' }}>
              נחש את התוצאה המדויקת לכל משחק בשלב הבתים. כל משחק ננעל <strong style={{ color: '#F1F5F9' }}>5 דקות לפני הקיקאוף</strong> — אין שינויים אחרי זה.
            </div>
            <div>
              <ScoreRow pts="+3" label="תוצאה מדויקת" sub="ניחשת נכון את מספר השערים לכל קבוצה" color="#22C55E" />
              <ScoreRow pts="+1" label="תוצאה נכונה" sub="ניחשת את הניצחון / התיקו, אבל לא את הסקור המדויק" color="#EAB308" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 0' }}>
                <div style={{ minWidth: '52px', textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', color: '#EF4444', lineHeight: 1 }}>
                  0
                </div>
                <div>
                  <p style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 600 }}>ניחוש שגוי</p>
                  <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>ניחשת את הכיוון הלא נכון</p>
                </div>
              </div>
            </div>
          </Section>

          <Section label="בחירות טורניר">
            <div style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.7, marginBottom: '12px' }}>
              בחר את <strong style={{ color: '#F59E0B' }}>מנצח הגביע</strong> ואת <strong style={{ color: '#3B82F6' }}>מלך השערים</strong> (מבקיע השערים הרב ביותר). שניהם ננעלים לצמיתות ברגע שה<strong style={{ color: '#F1F5F9' }}>משחק הראשון מתחיל</strong>.
            </div>
            <div>
              <ScoreRow pts="+10" label="מנצח הגביע" sub="הקבוצה שבחרת מרימה את הגביע" color="#F59E0B" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 0' }}>
                <div style={{ minWidth: '52px', textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', color: '#3B82F6', lineHeight: 1 }}>
                  +10
                </div>
                <div>
                  <p style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 600 }}>מלך השערים</p>
                  <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>השחקן שבחרת מסיים כמבקיע השערים המוביל</p>
                </div>
              </div>
            </div>
          </Section>

          <Section label="תאריכים חשובים">
            {[
              { date: '11.6 · 22:00', label: 'משחק פתיחה — מקסיקו נגד דרום אפריקה', color: '#22C55E' },
              { date: '11.6 · 21:55', label: 'נעילת בחירות הטורניר', color: '#EF4444' },
              { date: '19.7', label: 'הגמר — סוף מונדיאל 2026', color: '#F59E0B' },
            ].map(({ date, label, color }, i, arr) => (
              <div key={date} style={{
                display: 'flex', gap: '14px', alignItems: 'flex-start',
                padding: '9px 0',
                borderBottom: i < arr.length - 1 ? '1px solid #0A1020' : 'none',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, marginTop: '6px', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#F1F5F9', fontSize: '13px', fontWeight: 600 }}>{label}</p>
                  <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px', direction: 'ltr', textAlign: 'right' }}>{date}</p>
                </div>
              </div>
            ))}
          </Section>

          <Section label="טבלת ניקוד">
            <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.7 }}>
              הדירוג מתעדכן בזמן אמת לאחר כל משחק. עבור ל<strong style={{ color: '#F1F5F9' }}>כל הניחושים</strong> כדי לראות מה כולם הימרו על כל משחק. לחץ על שחקן כלשהו כדי לראות את ההיסטוריה המלאה שלו.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
