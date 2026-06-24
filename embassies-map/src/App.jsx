import { useRef, useState, useCallback } from 'react';
import MapView from './components/MapView';
import SearchBar from './components/SearchBar';
import LayerToggle from './components/LayerToggle';
import AdminPanel from './components/AdminPanel';
import { usePois } from './hooks/useFirestore';
import { CATEGORIES } from './data/embassies';
import './App.css';

const DEFAULT_LAYERS = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, true]));

export default function App() {
  const mapRef = useRef(null);
  const { pois, addPoi, deletePoi } = usePois();
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [pickMode, setPickMode] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('search');

  const handleSearch = useCallback((item) => {
    const { lat, lng } = item;
    if (lat == null || lng == null) return;
    mapRef.current?.flyTo(lat, lng, 16);
    setTimeout(() => mapRef.current?.openPopupFor(item), 1600);
  }, []);

  const handleLayerChange = useCallback((cat, visible) => {
    setLayers((prev) => ({ ...prev, [cat]: visible }));
  }, []);

  const handlePickLocation = useCallback(() => {
    setPickMode(true);
    setPendingLatLng(null);
  }, []);

  const handleMapClick = useCallback((latlng) => {
    setPendingLatLng(latlng);
    setPickMode(false);
  }, []);

  return (
    <div className="app-container">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="flag-emoji">🇮🇱</span>
          <h1 className="sidebar-title">נציגויות ישראל בעולם</h1>
        </div>

        <div className="tab-bar">
          {[
            { id: 'search', label: '🔍 חיפוש' },
            { id: 'layers', label: '🗂 שכבות' },
            { id: 'admin',  label: '🔐 Admin' },
          ].map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${sidebarTab === t.id ? 'active' : ''}`}
              onClick={() => setSidebarTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="sidebar-content">
          {sidebarTab === 'search' && (
            <>
              <SearchBar pois={pois} onSelect={handleSearch} />
              <p className="search-hint">בחר תוצאה כדי לקפוץ ישירות לנציגות</p>
              <p className="stats">🏛️ 102 נציגויות{pois.length > 0 ? ` · ${pois.length} POIs` : ''}</p>
            </>
          )}

          {sidebarTab === 'layers' && (
            <LayerToggle layers={layers} onChange={handleLayerChange} />
          )}

          {sidebarTab === 'admin' && (
            <AdminPanel
              pois={pois}
              onAdd={addPoi}
              onDelete={deletePoi}
              onPickLocation={handlePickLocation}
              pendingLatLng={pendingLatLng}
            />
          )}
        </div>

        <div className="sidebar-footer">
          נתונים: משרד החוץ · מפה: OpenStreetMap
        </div>
      </aside>

      {/* ── Map ── */}
      <main className="map-container">
        {pickMode && (
          <div className="pick-banner">📌 לחץ על המפה לבחירת מיקום</div>
        )}
        <MapView
          ref={mapRef}
          layers={layers}
          pois={pois}
          pickMode={pickMode}
          onMapClick={handleMapClick}
        />
      </main>
    </div>
  );
}
