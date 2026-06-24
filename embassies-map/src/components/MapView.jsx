import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import embassies, { CATEGORIES } from '../data/embassies';

// Fix Leaflet's broken default icon URLs when bundled with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeFlagIcon(isEmbassy) {
  const size = isEmbassy ? 22 : 18;
  return L.divIcon({
    className: '',
    html: `<div style="
      font-size:${size}px;
      line-height:1;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,.6));
      cursor:pointer;
    ">🇮🇱</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makePoiIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:13px; height:13px;
      background:${color};
      border:2px solid #fff;
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
    "></div>`,
    iconSize: [13, 13],
    iconAnchor: [6, 6],
  });
}

const MapView = forwardRef(function MapView(
  { layers, pois, onMapClick, pickMode },
  ref,
) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupsRef = useRef({});
  const clusterGroupsRef = useRef({});

  // Expose flyTo so App.jsx can call it via ref
  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom = 16) {
      mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1.5 });
    },
    openPopupFor(item) {
      // Find marker in the right layer group and open its popup
      const key = item._source === 'poi' ? item.category : item.type;
      const group = clusterGroupsRef.current[key];
      if (!group) return;
      group.eachLayer((layer) => {
        const ll = layer.getLatLng();
        if (
          Math.abs(ll.lat - item.lat) < 0.001 &&
          Math.abs(ll.lng - item.lng) < 0.001
        ) {
          // Ensure the cluster is zoomed in before opening
          mapInstanceRef.current?.once('moveend', () => layer.openPopup());
        }
      });
    },
  }));

  // Init map once
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [20, 10],
      zoom: 3,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Build a cluster group per category
    Object.keys(CATEGORIES).forEach((cat) => {
      const cg = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 40,
      });
      cg.addTo(map);
      clusterGroupsRef.current[cat] = cg;
      layerGroupsRef.current[cat] = cg; // same ref
    });

    // Add embassy/consulate markers
    embassies.forEach((emb) => {
      const cat = emb.type;
      const icon = makeFlagIcon(cat === 'embassy');
      const marker = L.marker([emb.lat, emb.lng], { icon });
      marker.bindTooltip(
        `<strong>${emb.city}, ${emb.country}</strong><br/><span style="font-size:11px">${emb.address}</span>`,
        { direction: 'top', offset: [0, -6], className: 'map-tooltip' }
      );
      marker.bindPopup(buildPopup(emb, cat));
      clusterGroupsRef.current[cat]?.addLayer(marker);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync POI markers whenever `pois` changes
  const poiMarkersRef = useRef({});
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove all old POI markers
    Object.values(poiMarkersRef.current).forEach((m) => {
      const cat = m._poiCategory;
      clusterGroupsRef.current[cat]?.removeLayer(m);
    });
    poiMarkersRef.current = {};

    pois.forEach((poi) => {
      const cat = poi.category || 'other';
      const icon = makePoiIcon(CATEGORIES[cat]?.color ?? '#546E7A');
      const marker = L.marker([poi.lat, poi.lng], { icon });
      marker._poiCategory = cat;
      marker._poiId = poi.id;
      marker.bindTooltip(
        `<strong>${poi.name}</strong>${poi.address ? `<br/><span style="font-size:11px">${poi.address}</span>` : ''}`,
        { direction: 'top', offset: [0, -4], className: 'map-tooltip' }
      );
      marker.bindPopup(buildPoiPopup(poi, cat));
      clusterGroupsRef.current[cat]?.addLayer(marker);
      poiMarkersRef.current[poi.id] = marker;
    });
  }, [pois]);

  // Toggle layer visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    Object.entries(layers).forEach(([cat, visible]) => {
      const group = clusterGroupsRef.current[cat];
      if (!group) return;
      if (visible && !map.hasLayer(group)) map.addLayer(group);
      if (!visible && map.hasLayer(group)) map.removeLayer(group);
    });
  }, [layers]);

  // Pick-mode click handler
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (!pickMode) return;

    const handler = (e) => onMapClick(e.latlng);
    map.once('click', handler);
    return () => map.off('click', handler);
  }, [pickMode, onMapClick]);

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100%', cursor: pickMode ? 'crosshair' : 'grab' }}
    />
  );
});

export default MapView;

function buildPopup(emb, cat) {
  const c = CATEGORIES[cat];
  return `
    <div class="popup-card">
      <div class="popup-type" style="color:${c.color}">${c.emoji} ${c.label}</div>
      <strong class="popup-title">${emb.city}, ${emb.country}</strong>
      <p class="popup-addr">${emb.address}</p>
      <a
        href="https://www.google.com/maps/search/?api=1&query=${emb.lat},${emb.lng}"
        target="_blank" rel="noopener"
        class="popup-link"
      >פתח ב-Google Maps ↗</a>
    </div>
  `;
}

function buildPoiPopup(poi, cat) {
  const c = CATEGORIES[cat];
  return `
    <div class="popup-card">
      <div class="popup-type" style="color:${c.color}">${c.emoji} ${c.label}</div>
      <strong class="popup-title">${poi.name}</strong>
      ${poi.address ? `<p class="popup-addr">${poi.address}</p>` : ''}
      ${poi.notes   ? `<p class="popup-notes">${poi.notes}</p>` : ''}
      <a
        href="https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}"
        target="_blank" rel="noopener"
        class="popup-link"
      >פתח ב-Google Maps ↗</a>
    </div>
  `;
}
