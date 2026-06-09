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
    background: '#131C2E',
    border: '1px solid #1E2D45',
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
    borderBottom: '1px solid #1E2D45',
  },
  title: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 800,
    fontSize: '20px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#F1F5F9',
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
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    color: '#475569',
    marginBottom: '10px',
  },
  card: {
    background: '#0E1828',
    border: '1px solid #182333',
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
          <span style={S.title}>How to Play</span>
          <button onClick={onClose} className="cursor-pointer transition-colors duration-200"
            style={{ color: '#334155', padding: '4px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#334155')}>
            <X size={20} />
          </button>
        </div>

        <div style={S.body}>

          {/* Match predictions */}
          <Section label="Match Predictions">
            <div style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
              Predict the exact score for every group stage match. Each match locks <strong style={{ color: '#F1F5F9' }}>5 minutes before kickoff</strong> — no changes after that.
            </div>
            <div>
              <ScoreRow pts="+3" label="Exact Score" sub="Correct home & away goals" color="#22C55E" />
              <ScoreRow pts="+1" label="Correct Result" sub="Right winner or draw, wrong scoreline" color="#EAB308" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 0' }}>
                <div style={{ minWidth: '52px', textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', color: '#EF4444', lineHeight: 1 }}>
                  0
                </div>
                <div>
                  <p style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 600 }}>Wrong Prediction</p>
                  <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>Wrong result direction</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Tournament picks */}
          <Section label="Tournament Picks">
            <div style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
              Pick the <strong style={{ color: '#F59E0B' }}>World Cup Winner</strong> and <strong style={{ color: '#3B82F6' }}>Golden Boot</strong> (top scorer). Both lock permanently when the <strong style={{ color: '#F1F5F9' }}>first match kicks off</strong>.
            </div>
            <div>
              <ScoreRow pts="+10" label="World Cup Winner" sub="Your team lifts the trophy" color="#F59E0B" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 0' }}>
                <div style={{ minWidth: '52px', textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', color: '#3B82F6', lineHeight: 1 }}>
                  +10
                </div>
                <div>
                  <p style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 600 }}>Golden Boot</p>
                  <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>Your player finishes top scorer</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Timeline */}
          <Section label="Key Dates">
            {[
              { date: 'Jun 11 · 22:00 IL', label: 'First match — Mexico vs South Africa', color: '#22C55E' },
              { date: 'Jun 11 · 21:55 IL', label: 'Tournament picks lock', color: '#EF4444' },
              { date: 'Jul 19', label: 'Final — WC 2026 ends', color: '#F59E0B' },
            ].map(({ date, label, color }, i, arr) => (
              <div key={date} style={{
                display: 'flex', gap: '14px', alignItems: 'flex-start',
                padding: '9px 0',
                borderBottom: i < arr.length - 1 ? '1px solid #0A1020' : 'none',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, marginTop: '6px', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#F1F5F9', fontSize: '13px', fontWeight: 600 }}>{label}</p>
                  <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>{date}</p>
                </div>
              </div>
            ))}
          </Section>

          {/* Leaderboard */}
          <Section label="Leaderboard">
            <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.6 }}>
              Rankings update live after every match. Go to <strong style={{ color: '#F1F5F9' }}>All Predictions</strong> to see what everyone bet on each match. Tap any player to see their full history.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
