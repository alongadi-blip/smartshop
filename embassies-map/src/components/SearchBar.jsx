import { useState, useRef, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { CATEGORIES } from '../data/embassies';

export default function SearchBar({ missions, pois, onSelect }) {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen]     = useState(false);
  const ref                 = useRef(null);

  const fuseMissions = useMemo(() => new Fuse(missions, {
    keys: ['country', 'city', 'address'],
    threshold: 0.35,
    includeScore: true,
  }), [missions]);

  const fusePois = useMemo(() => new Fuse(pois, {
    keys: ['name', 'address', 'notes'],
    threshold: 0.35,
  }), [pois]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }

    const embRes = fuseMissions.search(query).slice(0, 6).map((r) => ({
      ...r.item,
      _source: 'embassy',
      _label:  `${r.item.city}, ${r.item.country}`,
    }));

    const poiRes = fusePois.search(query).slice(0, 4).map((r) => ({
      ...r.item,
      _source: 'poi',
      _label:  r.item.name,
    }));

    setResults([...embRes, ...poiRes]);
    setOpen(true);
  }, [query, fuseMissions, fusePois]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item) => {
    setQuery(item._label);
    setOpen(false);
    onSelect(item);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        className="search-input"
        placeholder="חפש מדינה, עיר, נציגות…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        dir="rtl"
      />
      {open && results.length > 0 && (
        <ul className="search-dropdown">
          {results.map((item) => {
            const cat = item._source === 'poi' ? CATEGORIES[item.category] : CATEGORIES[item.type];
            return (
              <li key={`${item._source}-${item.id}`} onClick={() => handleSelect(item)}>
                <span className="result-emoji">{cat?.emoji ?? '📍'}</span>
                <span className="result-text">
                  <strong>{item._label}</strong>
                  <small>{item.address}</small>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
