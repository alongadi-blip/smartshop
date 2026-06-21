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
    marginBottom: '10px',
  },
  card: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border-2)',
    borderRadius: '14px',
    padding: '14px 16px',
  },
};

function Section({ label, labelColor = '#475569', children }: { label: string; labelColor?: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ ...S.sectionLabel, color: labelColor }}>{label}</p>
      <div style={S.card}>{children}</div>
    </div>
  );
}

function ScoreRow({ pts, label, sub, color, last }: { pts: string; label: string; sub?: string; color: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 0', borderBottom: last ? 'none' : '1px solid #0A1020' }}>
      <div style={{ minWidth: '52px', textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', color, lineHeight: 1 }}>
        {pts}
      </div>
      <div>
        <p style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 600 }}>{label}</p>
        {sub && <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>{sub}</p>}
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, marginTop: '6px', flexShrink: 0 }} />;
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

          {/* ── שלב הבתים ── */}
          <Section label="שלב הבתים — ניחושי משחקים" labelColor="#22C55E">
            <div style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.7, marginBottom: '12px' }}>
              נחש את התוצאה המדויקת לכל משחק. כל משחק ננעל{' '}
              <strong style={{ color: '#F1F5F9' }}>5 דקות לפני הקיקאוף</strong> — אין שינויים אחרי זה.
            </div>
            <ScoreRow pts="+3" label="תוצאה מדויקת" sub="ניחשת נכון את מספר השערים לכל קבוצה" color="#22C55E" />
            <ScoreRow pts="+1" label="כיוון נכון" sub="ניחשת ניצחון / תיקו, אבל לא את הסקור המדויק" color="#EAB308" />
            <ScoreRow pts="0" label="ניחוש שגוי" sub="ניחשת את הכיוון הלא נכון" color="#EF4444" last />
          </Section>

          {/* ── שלב הנוקאוט ── */}
          <Section label="שלב הנוקאוט — מסיבוב 32 עד הגמר" labelColor="#818CF8">
            <div style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.7, marginBottom: '14px' }}>
              לכל משחק נוקאוט יש <strong style={{ color: '#F1F5F9' }}>3 שדות ניחוש</strong> שמופיעים מהרגע הראשון:
            </div>

            {/* 90 דקות */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', color: '#22C55E', marginBottom: '6px' }}>
                90 דקות
              </p>
              <ScoreRow pts="+3" label="תוצאה מדויקת אחרי 90 דקות" color="#22C55E" />
              <ScoreRow pts="+1" label="כיוון נכון אחרי 90 דקות" color="#EAB308" last />
            </div>

            {/* הארכה */}
            <div style={{ marginBottom: '12px', paddingTop: '10px', borderTop: '1px solid #0A1020' }}>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', color: '#818CF8', marginBottom: '6px' }}>
                הארכה (אם יגיע להארכה)
              </p>
              <ScoreRow pts="+3" label="תוצאה מדויקת — מכריע בהארכה" sub="ניחשת נכון את הסקור הסופי אחרי 120 דקות" color="#818CF8" />
              <ScoreRow pts="+2" label="תיקו מדויק בהארכה" sub="ניחשת נכון את הסקור שהוביל לפנדלים" color="#A78BFA" last />
            </div>

            {/* פנדלים */}
            <div style={{ paddingTop: '10px', borderTop: '1px solid #0A1020' }}>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', color: '#F59E0B', marginBottom: '6px' }}>
                פנדלים (אם יגיע לפנדלים)
              </p>
              <ScoreRow pts="+1" label="ניחשת את המנצחת בפנדלים" color="#F59E0B" last />
            </div>
          </Section>

          {/* ── בחירות טורניר ── */}
          <Section label="בחירות טורניר" labelColor="#F59E0B">
            <div style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.7, marginBottom: '12px' }}>
              בחר <strong style={{ color: '#F59E0B' }}>מנצח הגביע</strong> ו<strong style={{ color: '#3B82F6' }}>מלך השערים</strong>.
              ניתן לשנות עד סיום שלב הבתים (<strong style={{ color: '#F1F5F9' }}>29.6</strong>).
            </div>
            <ScoreRow pts="+10" label="מנצח הגביע" sub="הקבוצה שבחרת מרימה את הגביע" color="#F59E0B" />
            <ScoreRow pts="+10" label="מלך השערים" sub="השחקן שבחרת מסיים כמבקיע השערים המוביל" color="#3B82F6" last />
          </Section>

          {/* ── תאריכים ── */}
          <Section label="תאריכים חשובים" labelColor="#475569">
            {[
              { date: '11.6.2026', label: 'פתיחה — מקסיקו נגד דרום אפריקה', color: '#22C55E' },
              { date: '29.6.2026', label: 'סיום שלב הבתים · נעילת בחירות הטורניר', color: '#EF4444' },
              { date: '4.7.2026', label: 'פתיחת שלב הנוקאוט — סיבוב 32', color: '#818CF8' },
              { date: '19.7.2026', label: 'הגמר — סוף מונדיאל 2026', color: '#F59E0B' },
            ].map(({ date, label, color }, i, arr) => (
              <div key={date} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid #0A1020' : 'none' }}>
                <Dot color={color} />
                <div>
                  <p style={{ color: '#F1F5F9', fontSize: '13px', fontWeight: 600 }}>{label}</p>
                  <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px', direction: 'ltr', textAlign: 'right' }}>{date}</p>
                </div>
              </div>
            ))}
          </Section>

          {/* ── ליגות ── */}
          <Section label="ליגות" labelColor="#475569">
            <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.7 }}>
              התחרות מתנהלת <strong style={{ color: '#F1F5F9' }}>בתוך ליגות פרטיות</strong>. הצטרף דרך לינק הזמנה שקיבלת. טבלת הניקוד, הניחושים וכל הנתונים — גלויים <strong style={{ color: '#F1F5F9' }}>רק לחברי הליגה שלך</strong>.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
