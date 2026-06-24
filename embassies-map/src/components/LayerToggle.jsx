import { CATEGORIES } from '../data/embassies';

export default function LayerToggle({ layers, onChange }) {
  return (
    <div className="layer-panel">
      <h3 className="panel-title">שכבות</h3>
      {Object.entries(CATEGORIES).map(([key, { label, color, emoji }]) => (
        <label key={key} className="layer-row">
          <input
            type="checkbox"
            checked={layers[key] ?? true}
            onChange={(e) => onChange(key, e.target.checked)}
          />
          <span
            className="layer-dot"
            style={{ background: color }}
          />
          <span>{emoji} {label}</span>
        </label>
      ))}
    </div>
  );
}
