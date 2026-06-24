import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { CATEGORIES } from '../data/embassies';

// Fix Leaflet's broken default icon URLs when bundled with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeFlagIcon(isEmbassy) {
  const outer = isEmbassy ? 36 : 28;
  const emoji = isEmbassy ? '20' : '15';
  const color = isEmbassy ? '#1565C0' : '#1976D2';
  // teardrop pin: circle on top, pointed bottom
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position:relative;
        width:${outer}px;
        height:${outer + outer * 0.4}px;
      ">
        <div style="
          width:${outer}px; height:${outer}px;
          background:${color};
          border:2.5px solid #fff;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 3px 10px rgba(0,0,0,.45);
          display:flex; align-items:center; justify-content:center;
        ">
          <span style="transform:rotate(45deg); font-size:${emoji}px; line-height:1;">🇮🇱</span>
        </div>
      </div>`,
    iconSize:   [outer, outer + outer * 0.4],
    iconAnchor: [outer / 2, outer + outer * 0.4],
    popupAnchor:[0, -(outer + outer * 0.4)],
  });
}

function makePoiIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:13px;height:13px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [13, 13],
    iconAnchor: [6, 6],
  });
}

const MapView = forwardRef(function MapView(
  { layers, missions, pois, onMapClick, pickMode },
  ref,
) {
  const mapRef           = useRef(null);
  const mapInstanceRef   = useRef(null);
  const clusterGroupsRef = useRef({});
  // Track rendered embassy markers by mission id
  const embMarkersRef    = useRef({});
  const poiMarkersRef    = useRef({});

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom = 16) {
      mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1.5 });
    },
    openPopupFor(item) {
      const cat   = item._source === 'poi' ? item.category : item.type;
      const group = clusterGroupsRef.current[cat];
      if (!group) return;
      group.eachLayer((layer) => {
        const ll = layer.getLatLng();
        if (Math.abs(ll.lat - item.lat) < 0.001 && Math.abs(ll.lng - item.lng) < 0.001) {
          mapInstanceRef.current?.once('moveend', () => layer.openPopup());
        }
      });
    },
  }));

  // ── Init map once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { center: [20, 10], zoom: 3 });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
          '© <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      },
    ).addTo(map);

    mapInstanceRef.current = map;

    Object.keys(CATEGORIES).forEach((cat) => {
      const cg = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 40 });
      cg.addTo(map);
      clusterGroupsRef.current[cat] = cg;
    });

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // ── Sync embassy/consulate markers as missions arrive or get geocoded ────
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    missions.forEach((emb) => {
      if (!emb.lat || !emb.lng) return; // wait until geocoded

      if (embMarkersRef.current[emb.id]) return; // already added

      const cat    = emb.type;
      const icon   = makeFlagIcon(cat === 'embassy');
      const marker = L.marker([emb.lat, emb.lng], { icon });

      const cityLabel = emb.city_he
        ? `${emb.city_he} / ${emb.city}`
        : emb.city;
      const countryLabel = emb.country_he
        ? `${emb.country_he} / ${emb.country}`
        : emb.country;
      const tooltipHtml =
        `<strong>${cityLabel}, ${countryLabel}</strong>` +
        (emb.address ? `<br/><span style="font-size:11px">${emb.address}</span>` : '');
      marker.bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -6], className: 'map-tooltip' });
      marker.bindPopup(buildPopup(emb, cat));

      clusterGroupsRef.current[cat]?.addLayer(marker);
      embMarkersRef.current[emb.id] = { marker, cat };
    });
  }, [missions]);

  // ── Sync POI markers ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove stale POI markers
    const currentIds = new Set(pois.map((p) => p.id));
    Object.entries(poiMarkersRef.current).forEach(([id, { marker, cat }]) => {
      if (!currentIds.has(id)) {
        clusterGroupsRef.current[cat]?.removeLayer(marker);
        delete poiMarkersRef.current[id];
      }
    });

    pois.forEach((poi) => {
      if (poiMarkersRef.current[poi.id]) return;
      const cat    = poi.category || 'other';
      const icon   = makePoiIcon(CATEGORIES[cat]?.color ?? '#546E7A');
      const marker = L.marker([poi.lat, poi.lng], { icon });
      marker.bindTooltip(
        `<strong>${poi.name}</strong>${poi.address ? `<br/><span style="font-size:11px">${poi.address}</span>` : ''}`,
        { direction: 'top', offset: [0, -4], className: 'map-tooltip' },
      );
      marker.bindPopup(buildPoiPopup(poi, cat));
      clusterGroupsRef.current[cat]?.addLayer(marker);
      poiMarkersRef.current[poi.id] = { marker, cat };
    });
  }, [pois]);

  // ── Toggle layer visibility ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    Object.entries(layers).forEach(([cat, visible]) => {
      const group = clusterGroupsRef.current[cat];
      if (!group) return;
      if (visible  && !map.hasLayer(group)) map.addLayer(group);
      if (!visible &&  map.hasLayer(group)) map.removeLayer(group);
    });
  }, [layers]);

  // ── Pick-mode click ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !pickMode) return;
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

// ── Popup builders ───────────────────────────────────────────────────────────

function buildPopup(emb, cat) {
  const c = CATEGORIES[cat];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${emb.lat},${emb.lng}`;
  const title = emb.city_he
    ? `${emb.city_he}, ${emb.country_he || emb.country} <span style="color:#607080;font-size:12px">(${emb.city}, ${emb.country})</span>`
    : `${emb.city}, ${emb.country}`;
  return `
    <div class="popup-card">
      <div class="popup-type" style="color:${c.color}">${c.emoji} ${c.label}</div>
      <strong class="popup-title">${title}</strong>
      ${emb.address ? `<p class="popup-addr">${emb.address}</p>` : ''}
      <div class="popup-meta">
        ${emb.tel     ? `<span>📞 ${emb.tel}</span>`                            : ''}
        ${emb.email   ? `<span>✉️ <a href="mailto:${emb.email}" class="popup-link">${emb.email}</a></span>` : ''}
        ${emb.hours   ? `<span>🕐 ${emb.hours}</span>`                          : ''}
        ${emb.website ? `<span>🌐 <a href="${emb.website}" target="_blank" rel="noopener" class="popup-link">אתר רשמי ↗</a></span>` : ''}
      </div>
      <a href="${mapsUrl}" target="_blank" rel="noopener" class="popup-link popup-maps">📍 Google Maps ↗</a>
    </div>
  `;
}

function buildPoiPopup(poi, cat) {
  const c = CATEGORIES[cat];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}`;
  return `
    <div class="popup-card">
      <div class="popup-type" style="color:${c.color}">${c.emoji} ${c.label}</div>
      <strong class="popup-title">${poi.name}</strong>
      ${poi.address ? `<p class="popup-addr">${poi.address}</p>`      : ''}
      ${poi.notes   ? `<p class="popup-notes">${poi.notes}</p>`       : ''}
      <a href="${mapsUrl}" target="_blank" rel="noopener" class="popup-link popup-maps">📍 Google Maps ↗</a>
    </div>
  `;
}
