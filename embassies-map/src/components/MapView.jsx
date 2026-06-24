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

// Israeli flag SVG — works on all OS (no emoji dependency)
function makeFlagIcon(isEmbassy) {
  const W = isEmbassy ? 32 : 24;   // flag width
  const H = isEmbassy ? 21 : 16;   // flag height  (≈ 3:2 ratio)
  const tail = isEmbassy ? 9 : 7;  // pin tail height
  const stripe = Math.round(H * 0.22);
  const starSize = Math.round(H * 0.44);

  const flagSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" fill="white"/>
      <rect y="0"                  width="${W}" height="${stripe}" fill="#0038b8"/>
      <rect y="${H - stripe}"      width="${W}" height="${stripe}" fill="#0038b8"/>
      <text
        x="${W / 2}" y="${H / 2 + starSize * 0.38}"
        text-anchor="middle"
        font-size="${starSize}"
        font-family="serif"
        fill="#0038b8"
      >✡</text>
    </svg>`;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        position:relative;
        width:${W}px;
        height:${H + tail}px;
        filter:drop-shadow(0 3px 6px rgba(0,0,0,.45));
      ">
        <div style="
          width:${W}px; height:${H}px;
          border:1.5px solid #8899aa;
          border-radius:3px;
          overflow:hidden;
          line-height:0;
        ">${flagSvg}</div>
        <div style="
          width:0; height:0;
          border-left:${W / 2}px solid transparent;
          border-right:${W / 2}px solid transparent;
          border-top:${tail}px solid #8899aa;
        "></div>
      </div>`,
    iconSize:    [W, H + tail],
    iconAnchor:  [W / 2, H + tail],
    popupAnchor: [0, -(H + tail + 2)],
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

    // Esri World Street Map — always in English, colorful, no API key required
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles © <a href="https://www.esri.com/">Esri</a> — ' +
          'Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, ' +
          'Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, © OpenStreetMap contributors',
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
