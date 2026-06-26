import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { CATEGORIES, OSM_CATS } from '../data/embassies';
import chabadHouses from '../data/chabad-houses.json';

// Fix Leaflet's broken default icon URLs when bundled with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── OSM config ───────────────────────────────────────────────────────────────
const OSM_AMENITY = {
  hospital: 'amenity=hospital',
  police:   'amenity=police',
  school:   'amenity=school',
};
const MIN_ZOOM_OSM = 11;   // don't query at world/continent zoom
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const DEBOUNCE_MS  = 700;

// ── Israeli flag icon ────────────────────────────────────────────────────────
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
  const S = 34;
  const T = 9;
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
          font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif;
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

// ── OSM fetch helper ─────────────────────────────────────────────────────────
async function refreshOsmLayer(cat, map, refs) {
  const { osmMarkersRef, osmCacheRef, osmFetchingRef, clusterGroupsRef } = refs;

  if (osmFetchingRef.current[cat]) return;
  const zoom = map.getZoom();
  if (zoom < MIN_ZOOM_OSM) {
    console.log(`[OSM] skip ${cat} — zoom ${zoom} < ${MIN_ZOOM_OSM}`);
    return;
  }

  const b   = map.getBounds();
  const sw  = b.getSouthWest();
  const ne  = b.getNorthEast();
  const key = `${cat}:${sw.lat.toFixed(1)},${sw.lng.toFixed(1)},${ne.lat.toFixed(1)},${ne.lng.toFixed(1)}`;

  let items = osmCacheRef.current[key];
  if (!items) {
    osmFetchingRef.current[cat] = true;
    try {
      const bbox  = `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;
      const tag   = OSM_AMENITY[cat];
      const query = `[out:json][timeout:25];(node[${tag}](${bbox});way[${tag}](${bbox}););out center tags;`;
      const url   = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`;
      console.log(`[OSM] fetching ${cat} zoom=${zoom}`, url.slice(0, 120));
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log(`[OSM] ${cat} → ${data.elements.length} results`);
      items = data.elements
        .map((el) => ({
          id:      `${el.type}_${el.id}`,
          lat:     el.type === 'node' ? el.lat : el.center?.lat,
          lng:     el.type === 'node' ? el.lon : el.center?.lon,
          name:    el.tags?.name || el.tags?.['name:he'] || el.tags?.['name:en'] || cat,
          address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber']].filter(Boolean).join(' '),
          phone:   el.tags?.phone || el.tags?.['contact:phone'] || '',
          website: el.tags?.website || el.tags?.['contact:website'] || '',
          hours:   el.tags?.opening_hours || '',
        }))
        .filter((el) => el.lat && el.lng);
      osmCacheRef.current[key] = items;
    } catch (err) {
      console.error(`[OSM] ${cat} fetch failed:`, err);
      osmFetchingRef.current[cat] = false;
      return;
    }
    osmFetchingRef.current[cat] = false;
  }

  // Sync markers: add new, remove stale
  const existing = osmMarkersRef.current[cat] ?? {};
  const newIds   = new Set(items.map((i) => i.id));

  Object.entries(existing).forEach(([id, marker]) => {
    if (!newIds.has(id)) {
      clusterGroupsRef.current[cat]?.removeLayer(marker);
      delete existing[id];
    }
  });

  const catDef = CATEGORIES[cat] ?? CATEGORIES.other;
  items.forEach((item) => {
    if (existing[item.id]) return;
    const icon   = makePoiIcon(catDef.color, catDef.emoji);
    const marker = L.marker([item.lat, item.lng], { icon });
    marker.bindTooltip(
      `<strong>${item.name}</strong>${item.address ? `<br/><span style="font-size:11px">${item.address}</span>` : ''}`,
      { direction: 'top', offset: [0, -4], className: 'map-tooltip' },
    );
    marker.bindPopup(makePopupEl(buildOsmPoiPopup(item, cat)));
    clusterGroupsRef.current[cat]?.addLayer(marker);
    existing[item.id] = marker;
  });

  osmMarkersRef.current[cat] = existing;
}

// ── Component ────────────────────────────────────────────────────────────────
const MapView = forwardRef(function MapView(
  { layers, missions, pois, onMapClick, pickMode },
  ref,
) {
  const mapRef            = useRef(null);
  const mapInstanceRef    = useRef(null);
  const clusterGroupsRef  = useRef({});
  const embMarkersRef     = useRef({});
  const groupsRef         = useRef({});
  const poiMarkersRef     = useRef({});

  // OSM refs
  const osmMarkersRef  = useRef({});  // { [cat]: { [osmId]: marker } }
  const osmCacheRef    = useRef({});  // { [cacheKey]: items[] }
  const osmFetchingRef = useRef({});  // { [cat]: bool } — prevent concurrent fetches
  const osmActiveCats  = useRef(new Set());
  const osmDebounceRef = useRef(null);

  const osmRefs = { osmMarkersRef, osmCacheRef, osmFetchingRef, clusterGroupsRef };

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom = 16) {
      mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1.5 });
    },
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
        const tryFly = () => {
          const entry = embMarkersRef.current[item.id];
          if (entry) {
            const ll = entry.marker.getLatLng();
            map.flyTo([ll.lat, ll.lng], 16, { duration: 1.5 });
            map.once('moveend', () => { try { entry.marker.openPopup(); } catch {} });
          } else if (item.lat && item.lng) {
            // marker not yet created (geocoding in progress) — fly to mission coords
            map.flyTo([item.lat, item.lng], 14, { duration: 1.5 });
          }
        };
        tryFly();
      }
    },
    openPopupFor(item) { this.flyToAndOpen(item); },
  }));

  // ── Init map once ─────────────────────────────────────────────────────────
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

    // Refresh active OSM layers after every map move (debounced)
    map.on('moveend', () => {
      console.log('[OSM] moveend z=' + map.getZoom() + ' active=' + [...osmActiveCats.current]);
      clearTimeout(osmDebounceRef.current);
      osmDebounceRef.current = setTimeout(() => {
        osmActiveCats.current.forEach((cat) => {
          refreshOsmLayer(cat, map, osmRefs);
        });
      }, DEBOUNCE_MS);
    });

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Embassy / consulate markers ───────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    missions.forEach((emb) => {
      if (!emb.lat || !emb.lng) return;
      if (embMarkersRef.current[emb.id]) return;

      const existingGroup = Object.values(groupsRef.current).find(
        (g) =>
          g.members[0].country === emb.country &&
          Math.abs(g.members[0].lat - emb.lat) < 0.1 &&
          Math.abs(g.members[0].lng - emb.lng) < 0.1,
      );

      if (existingGroup) {
        existingGroup.members.push(emb);
        const hasEmbassy = existingGroup.members.some((m) => m.type === 'embassy');
        existingGroup.marker.setIcon(makeFlagIcon(hasEmbassy, true));
        existingGroup.marker.setPopupContent(makePopupEl(buildGroupPopup(existingGroup.members)));
        existingGroup.marker.setTooltipContent(buildGroupTooltip(existingGroup.members));
        embMarkersRef.current[emb.id] = { marker: existingGroup.marker, cat: existingGroup.cat };
      } else {
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

  // ── Chabad houses (static dataset, loaded once) ───────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const catDef = CATEGORIES.chabad;
    const icon   = makePoiIcon(catDef.color, catDef.emoji);

    chabadHouses.forEach((house) => {
      const marker = L.marker([house.lat, house.lng], { icon });
      marker.bindTooltip(
        `<strong>${house.name}</strong>${house.address ? `<br/><span style="font-size:11px">${house.address}</span>` : ''}`,
        { direction: 'top', offset: [0, -4], className: 'map-tooltip' },
      );
      marker.bindPopup(makePopupEl(buildChabadPopup(house)));
      clusterGroupsRef.current.chabad?.addLayer(marker);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual POI markers (Firestore) ────────────────────────────────────────
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

  // ── Layer visibility + trigger OSM fetch on enable ────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    Object.entries(layers).forEach(([cat, visible]) => {
      const group = clusterGroupsRef.current[cat];
      if (!group) return;
      if (visible  && !map.hasLayer(group)) map.addLayer(group);
      if (!visible &&  map.hasLayer(group)) map.removeLayer(group);

      if (OSM_CATS.has(cat)) {
        if (visible) {
          osmActiveCats.current.add(cat);
          console.log('[OSM] layer ON:', cat, 'zoom:', map.getZoom());
          refreshOsmLayer(cat, map, osmRefs);
        } else {
          osmActiveCats.current.delete(cat);
          console.log('[OSM] layer OFF:', cat);
        }
      }
    });
  }, [layers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pick-mode click ───────────────────────────────────────────────────────
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
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// data.gov.il's "Atar" (website) field sometimes already contains a full
// <a href="...">...</a> tag instead of a plain URL — pull the real URL out.
function cleanUrl(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  const hrefMatch = str.match(/href\s*=\s*["']([^"']+)["']/i);
  let url = hrefMatch ? hrefMatch[1] : str.replace(/<[^>]+>/g, '').trim();
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

function buildGroupTooltip(members) {
  const primary      = members[0];
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

function buildMissionBlock(m) {
  const c         = CATEGORIES[m.type];
  const websiteUrl = cleanUrl(m.website);
  return `
    <div class="popup-mission">
      <div class="popup-type" style="color:${c.color}">${c.emoji} ${c.label}</div>
      ${m.address ? `<p class="popup-addr">${m.address}</p>` : ''}
      <div class="popup-meta">
        ${m.tel       ? `<span>📞 ${esc(m.tel)}</span>`                                                                    : ''}
        ${m.email     ? `<span>✉️ <a href="mailto:${esc(m.email)}">${esc(m.email)}</a></span>`                            : ''}
        ${m.hours     ? `<span>🕐 ${esc(m.hours)}</span>`                                                                  : ''}
        ${websiteUrl  ? `<span>🌐 <a href="${esc(websiteUrl)}" target="_blank" rel="noopener">אתר רשמי ↗</a></span>`       : ''}
      </div>
    </div>`;
}

function buildGroupPopup(members) {
  const primary   = members[0];
  const mapsUrl   = `https://www.google.com/maps/search/?api=1&query=${primary.lat},${primary.lng}`;
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

function buildChabadPopup(house) {
  const c = CATEGORIES.chabad;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${house.lat},${house.lng}`;
  return `
    <div class="popup-card">
      <div class="popup-type" style="color:${c.color}">${c.emoji} ${c.label}</div>
      <strong class="popup-title">${house.name}</strong>
      ${house.address ? `<p class="popup-addr">${house.address}</p>` : ''}
      <div class="popup-meta">
        ${house.phone ? `<span>📞 ${esc(house.phone)}</span>` : ''}
        ${house.url   ? `<span>🌐 <a href="${esc(house.url)}" target="_blank" rel="noopener">אתר ↗</a></span>` : ''}
      </div>
      <a href="${mapsUrl}" target="_blank" rel="noopener" class="popup-link popup-maps">📍 Google Maps ↗</a>
    </div>`;
}

function buildOsmPoiPopup(item, cat) {
  const c = CATEGORIES[cat] ?? CATEGORIES.other;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
  return `
    <div class="popup-card">
      <div class="popup-type" style="color:${c.color}">${c.emoji} ${c.label} <span style="color:#4080c0;font-size:10px">OSM</span></div>
      <strong class="popup-title">${item.name}</strong>
      ${item.address ? `<p class="popup-addr">${item.address}</p>` : ''}
      <div class="popup-meta">
        ${item.phone   ? `<span>📞 ${esc(item.phone)}</span>`                                                             : ''}
        ${item.website ? `<span>🌐 <a href="${esc(item.website)}" target="_blank" rel="noopener">אתר ↗</a></span>`        : ''}
        ${item.hours   ? `<span>🕐 ${esc(item.hours)}</span>`                                                             : ''}
      </div>
      <a href="${mapsUrl}" target="_blank" rel="noopener" class="popup-link popup-maps">📍 Google Maps ↗</a>
    </div>`;
}
