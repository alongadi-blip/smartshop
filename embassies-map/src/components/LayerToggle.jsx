import { CATEGORIES } from '../data/embassies';

export default function LayerToggle({ layers, onChange, pois = [] }) {
  // Count POIs per non-embassy category
  const poiCounts = {};
  pois.forEach((p) => {
    poiCounts[p.category] = (poiCounts[p.category] || 0) + 1;
  });

  return (
    <div className="layer-panel">
      <h3 className="panel-title">שכבות</h3>
      {Object.entries(CATEGORIES).map(([key, { label, color, emoji }]) => {
        const isApiLayer = key === 'embassy' || key === 'consulate';
        const count = isApiLayer ? null : (poiCounts[key] ?? 0);

        return (
          <label key={key} className="layer-row">
            <input
              type="checkbox"
              checked={layers[key] ?? true}
              onChange={(e) => onChange(key, e.target.checked)}
            />
            <span className="layer-dot" style={{ background: color }} />
            <span className="layer-label">{emoji} {label}</span>
            {count !== null && (
              <span className={`layer-count${count === 0 ? ' layer-count--empty' : ''}`}>
                {count === 0 ? 'אין' : count}
              </span>
            )}
          </label>
        );
      })}
      <p className="layer-hint-admin">
        💡 הוסף בתי חולים, משטרה ועוד בלשונית Admin
      </p>
    </div>
  );
}
