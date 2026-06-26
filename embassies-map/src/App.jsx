import { useRef, useState, useCallback } from 'react';
import MapView from './components/MapView';
import SearchBar from './components/SearchBar';
import LayerToggle from './components/LayerToggle';
import AdminPanel from './components/AdminPanel';
import { usePois } from './hooks/useFirestore';
import { useEmbassyData } from './hooks/useEmbassyData';
import { CATEGORIES } from './data/embassies';
import './App.css';

const OPEN_BY_DEFAULT = new Set(['embassy', 'consulate']);
const DEFAULT_LAYERS  = Object.fromEntries(
  Object.keys(CATEGORIES).map((k) => [k, OPEN_BY_DEFAULT.has(k)]),
);
const isMobile = () => window.innerWidth <= 768;

export default function App() {
  const mapRef = useRef(null);
  const { pois, addPoi, deletePoi }         = usePois();
  const { missions, loading, geocodingLeft } = useEmbassyData();
  const [layers, setLayers]                  = useState(DEFAULT_LAYERS);
  const [pickMode, setPickMode]              = useState(false);
  const [pendingLatLng, setPendingLatLng]    = useState(null);
  const [sidebarTab, setSidebarTab]          = useState('search');
  const [sidebarVisible, setSidebarVisible]  = useState(!isMobile());

  const toggleSidebar = useCallback(() => setSidebarVisible((v) => !v), []);

  const handleSearch = useCallback((item) => {
    if (!item.lat && !item.lng) return;
    mapRef.current?.flyToAndOpen(item);
    // Close sidebar on mobile after selecting a result so the map is visible
    if (isMobile()) setSidebarVisible(false);
  }, []);

  const handleLayerChange = useCallback((cat, visible) => {
    setLayers((prev) => ({ ...prev, [cat]: visible }));
  }, []);

  const handlePickLocation = useCallback(() => {
    setPickMode(true);
    setPendingLatLng(null);
    if (isMobile()) setSidebarVisible(false);
  }, []);

  const handleMapClick = useCallback((latlng) => {
    setPendingLatLng(latlng);
    setPickMode(false);
  }, []);

  const missionsWithCoords = missions.filter((m) => m.lat && m.lng);

  return (
    <div className="app-container">
      {/* ── FAB — reopen sidebar when hidden on mobile ── */}
      {!sidebarVisible && (
        <button className="mobile-fab" onClick={toggleSidebar}>
          🔍 חיפוש וסינון
        </button>
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar${sidebarVisible ? '' : ' sidebar--hidden'}`}>
        {/* Drag handle — tap to close on mobile */}
        <div className="sidebar-drag-handle" onClick={toggleSidebar}>
          <div className="drag-bar" />
        </div>

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
              <SearchBar missions={missions} pois={pois} onSelect={handleSearch} />
              <p className="search-hint">בחר תוצאה כדי לקפוץ ישירות לנציגות</p>

              {loading ? (
                <p className="status-msg">⏳ טוען נתונים מ-data.gov.il…</p>
              ) : (
                <p className="stats">
                  🏛️ {missionsWithCoords.length} / {missions.length} נציגויות על המפה
                  {geocodingLeft > 0 && (
                    <span className="geocoding-badge"> · ממקם {geocodingLeft}…</span>
                  )}
                </p>
              )}
              {pois.length > 0 && (
                <p className="stats">📍 {pois.length} נקודות עניין אישיות</p>
              )}
            </>
          )}

          {sidebarTab === 'layers' && (
            <LayerToggle layers={layers} onChange={handleLayerChange} pois={pois} />
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
          נתונים: data.gov.il · מפה: OpenStreetMap
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
          missions={missions}
          pois={pois}
          pickMode={pickMode}
          onMapClick={handleMapClick}
        />
      </main>
    </div>
  );
}
