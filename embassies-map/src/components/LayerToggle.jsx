import { CATEGORIES, OSM_CATS, STATIC_CATS } from '../data/embassies';
import chabadHouses from '../data/chabad-houses.json';

export default function LayerToggle({ layers, onChange, pois = [] }) {
  // Count manually-added POIs per non-OSM, non-embassy category
  const poiCounts = { chabad: chabadHouses.length };
  pois.forEach((p) => {
    if (!OSM_CATS.has(p.category)) {
      poiCounts[p.category] = (poiCounts[p.category] || 0) + 1;
    }
  });

  return (
    <div className="layer-panel">
      <h3 className="panel-title">שכבות</h3>
      {Object.entries(CATEGORIES).map(([key, { label, color, emoji }]) => {
        const isApiLayer = key === 'embassy' || key === 'consulate';
        const isOsmLayer = OSM_CATS.has(key);
        const isStatic   = STATIC_CATS.has(key);
        const count      = !isApiLayer && !isOsmLayer ? (poiCounts[key] ?? 0) : null;

        return (
          <label key={key} className="layer-row">
            <input
              type="checkbox"
              checked={layers[key] ?? true}
              onChange={(e) => onChange(key, e.target.checked)}
            />
            <span className="layer-dot" style={{ background: color }} />
            <span className="layer-label">{emoji} {label}</span>
            {isOsmLayer && (
              <span className="layer-osm-badge">🌍 OSM</span>
            )}
            {isStatic && (
              <span className="layer-osm-badge">📦 Chabad.org</span>
            )}
            {count !== null && (
              <span className={`layer-count${count === 0 ? ' layer-count--empty' : ''}`}>
                {count === 0 ? 'אין' : count}
              </span>
            )}
          </label>
        );
      })}
      <p className="layer-hint-admin">
        🔍 זום-אין (רחוב/שכונה) לטעינת OSM אוטומטית<br/>
        💡 אזורים מאובטחים ועוד — הוסף בלשונית Admin
      </p>
    </div>
  );
}
