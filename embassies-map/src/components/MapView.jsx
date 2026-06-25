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
// multi=true → adds a gold star badge (city has 2+ missions)
function makeFlagIcon(isEmbassy, multi = false) {
  const W = isEmbassy ? 32 : 24;
  const H = isEmbassy ? 21 : 16;
  const tail = isEmbassy ? 9 : 7;
  const stripe = Math.round(H * 0.22);
  const starSize = Math.round(H * 0.44);

  const flagSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" fill="white"/>
      <rect y="0"             width="${W}" height="${stripe}" fill="#0038b8"/>
      <rect y="${H - stripe}" width="${W}" height="${stripe}" fill="#0038b8"/>
      <text
        x="${W / 2}" y="${H / 2 + starSize * 0.38}"
        text-anchor="middle"
        font-size="${starSize}"
        font-family="serif"
        fill="#0038b8"
      >✡</text>
    </svg>`;

  const badge = multi ? `
    <div style="
      position:absolute;top:-6px;right:-6px;
      width:15px;height:15px;
      background:#FFD700;
      border:1.5px solid #fff;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:10px;line-height:1;
      box-shadow:0 1px 4px rgba(0,0,0,.5);
      color:#222;
    ">★</div>` : '';

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
        ${badge}
      </div>`,
    iconSize:    [W, H + tail],
    iconAnchor:  [W / 2, H + tail],
    popupAnchor: [0, -(H + tail + 2)],
  });
}

function makePoiIcon(color, emoji) {
  const S = 34; // circle diameter
  const T = 9;  // tail height
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position:relative;
        width:${S}px;
        height:${S + T}px;
        filter:drop-shadow(0 3px 6px rgba(0,0,0,.5));
      ">
        <div style="
          width:${S}px; height:${S}px;
          background:${color};
          border:2.5px solid rgba(255,255,255,.85);
          border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:17px; line-height:1;
        ">${emoji}</div>
        <div style="
          width:0; height:0;
          border-left:${S / 2}px solid transparent;
          border-right:${S / 2}px solid transparent;
          border-top:${T}px solid ${color};
        "></div>
      </div>`,
    iconSize:    [S, S + T],
    iconAnchor:  [S / 2, S + T],
    popupAnchor: [0, -(S + T + 2)],
  });
}

const MapView = forwardRef(function MapView(
  { layers, missions, pois, onMapClick, pickMode },
  ref,
) {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupsRef = useRef({});

  // missionId → { marker, cat }  (marker may be shared across a group)
  const embMarkersRef = useRef({});
  // groupKey → { marker, cat, members: Mission[] }
  const groupsRef     = useRef({});
  const poiMarkersRef = useRef({});

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom = 16) {
      mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1.5 });
    },
    // Fly to the group marker's actual position, then open popup
    flyToAndOpen(item) {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (item._source === 'poi') {
        map.flyTo([item.lat, item.lng], 16, { duration: 1.5 });
        map.once('moveend', () => {
          clusterGroupsRef.current[item.category]?.eachLayer((layer) => {
            const ll = layer.getLatLng();
            if (Math.abs(ll.lat - item.lat) < 0.001 && Math.abs(ll.lng - item.lng) < 0.001) {
              layer.openPopup();
            }
          });
        });
      } else {
        const entry = embMarkersRef.current[item.id];
        if (!entry) return;
        const { marker } = entry;
        const ll = marker.getLatLng();
        map.flyTo([ll.lat, ll.lng], 16, { duration: 1.5 });
        map.once('moveend', () => { try { marker.openPopup(); } catch {} });
      }
    },
    // Legacy compat — kept for POI path used internally
    openPopupFor(item) {
      this.flyToAndOpen(item);
    },
  }));

  // ── Init map once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { center: [20, 10], zoom: 3 });

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

  // ── Sync embassy/consulate markers — group same-country missions within ~10km ──
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    missions.forEach((emb) => {
      if (!emb.lat || !emb.lng) return;
      if (embMarkersRef.current[emb.id]) return; // already handled

      // Look for an existing group: same country, coordinates within ~0.1° (~11km)
      const existingGroup = Object.values(groupsRef.current).find(
        (g) =>
          g.members[0].country === emb.country &&
          Math.abs(g.members[0].lat - emb.lat) < 0.1 &&
          Math.abs(g.members[0].lng - emb.lng) < 0.1,
      );

      if (existingGroup) {
        // Join existing group: update icon → star, update popup
        existingGroup.members.push(emb);
        const hasEmbassy = existingGroup.members.some((m) => m.type === 'embassy');
        existingGroup.marker.setIcon(makeFlagIcon(hasEmbassy, true));
        existingGroup.marker.setPopupContent(
          makePopupEl(buildGroupPopup(existingGroup.members)),
        );
        existingGroup.marker.setTooltipContent(buildGroupTooltip(existingGroup.members));
        embMarkersRef.current[emb.id] = { marker: existingGroup.marker, cat: existingGroup.cat };
      } else {
        // Create a new single-mission group
        const cat    = emb.type;
        const icon   = makeFlagIcon(cat === 'embassy', false);
        const marker = L.marker([emb.lat, emb.lng], { icon });

        marker.bindTooltip(buildGroupTooltip([emb]), {
          direction: 'top', offset: [0, -6], className: 'map-tooltip',
        });
        marker.bindPopup(makePopupEl(buildGroupPopup([emb])));

        clusterGroupsRef.current[cat]?.addLayer(marker);

        const groupKey = `g_${emb.id}`;
        groupsRef.current[groupKey] = { marker, cat, members: [emb] };
        embMarkersRef.current[emb.id] = { marker, cat };
      }
    });
  }, [missions]);

  // ── Sync POI markers ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;

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
      const catDef = CATEGORIES[cat] ?? CATEGORIES.other;
      const icon   = makePoiIcon(catDef.color, catDef.emoji);
      const marker = L.marker([poi.lat, poi.lng], { icon });
      marker.bindTooltip(
        `<strong>${poi.name}</strong>${poi.address ? `<br/><span style="font-size:11px">${poi.address}</span>` : ''}`,
        { direction: 'top', offset: [0, -4], className: 'map-tooltip' },
      );
      marker.bindPopup(makePopupEl(buildPoiPopup(poi, cat)));
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePopupEl(htmlString) {
  const el = document.createElement('div');
  el.innerHTML = htmlString;
  return el;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

function buildGroupTooltip(members) {
  const primary = members[0];
  const cityLabel    = primary.city_he    ? `${primary.city_he} / ${primary.city}`       : primary.city;
  const countryLabel = primary.country_he ? `${primary.country_he} / ${primary.country}` : primary.country;
  let html = `<strong>${cityLabel}, ${countryLabel}</strong>`;
  if (members.length > 1) {
    html += `<br/><span style="font-size:11px;color:#aaa">${members.length} נציגויות ▼</span>`;
  } else if (primary.address) {
    html += `<br/><span style="font-size:11px">${primary.address}</span>`;
  }
  return html;
}

// ── Popup builders ───────────────────────────────────────────────────────────

function buildMissionBlock(m) {
  const c = CATEGORIES[m.type];
  return `
    <div class="popup-mission">
      <div class="popup-type" style="color:${c.color}">${c.emoji} ${c.label}</div>
      ${m.address ? `<p class="popup-addr">${m.address}</p>` : ''}
      <div class="popup-meta">
        ${m.tel     ? `<span>📞 ${esc(m.tel)}</span>` : ''}
        ${m.email   ? `<span>✉️ <a href="mailto:${esc(m.email)}">${esc(m.email)}</a></span>` : ''}
        ${m.hours   ? `<span>🕐 ${esc(m.hours)}</span>` : ''}
        ${m.website ? `<span>🌐 <a href="${esc(m.website)}" target="_blank" rel="noopener">אתר רשמי ↗</a></span>` : ''}
      </div>
    </div>`;
}

function buildGroupPopup(members) {
  const primary  = members[0];
  const mapsUrl  = `https://www.google.com/maps/search/?api=1&query=${primary.lat},${primary.lng}`;
  const cityTitle = primary.city_he
    ? `${primary.city_he}, ${primary.country_he || primary.country} <span style="color:#607080;font-size:12px">(${primary.city}, ${primary.country})</span>`
    : `${primary.city}, ${primary.country}`;

  const blocksHtml = members
    .map((m, i) =>
      (i > 0 ? '<hr style="border:none;border-top:1px solid #2a3a4a;margin:10px 0">' : '') +
      buildMissionBlock(m),
    )
    .join('');

  return `
    <div class="popup-card">
      <strong class="popup-title">${cityTitle}</strong>
      ${blocksHtml}
      <a href="${mapsUrl}" target="_blank" rel="noopener" class="popup-link popup-maps">📍 Google Maps ↗</a>
    </div>`;
}

function buildPoiPopup(poi, cat) {
  const c = CATEGORIES[cat];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}`;
  return `
    <div class="popup-card">
      <div class="popup-type" style="color:${c.color}">${c.emoji} ${c.label}</div>
      <strong class="popup-title">${poi.name}</strong>
      ${poi.address ? `<p class="popup-addr">${poi.address}</p>`  : ''}
      ${poi.notes   ? `<p class="popup-notes">${poi.notes}</p>`   : ''}
      <a href="${mapsUrl}" target="_blank" rel="noopener" class="popup-link popup-maps">📍 Google Maps ↗</a>
    </div>`;
}
