import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api.js';
import PageHeader from '../components/PageHeader.jsx';
import { MapPin } from 'lucide-react';

const OWN = '#22c55e';
const OUTSIDE = '#f59e0b';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function pinIcon(color, inactive) {
  return L.divIcon({
    className: '',
    iconSize: [26, 36],
    iconAnchor: [13, 36],
    tooltipAnchor: [0, -32],
    html: `<svg width="26" height="36" viewBox="0 0 26 36" style="opacity:${inactive ? 0.55 : 1};filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">
      <path d="M13 1C6.4 1 1 6.3 1 12.9 1 22 13 35 13 35s12-13 12-22.1C25 6.3 19.6 1 13 1z" fill="${color}" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="13" cy="13" r="4.5" fill="#0f172a"/></svg>`,
  });
}

// Every field with a readable Google Maps pin, on a satellite map.
// Click a pin to open that field.
export default function FieldMap() {
  const navigate = useNavigate();
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [fields, setFields] = useState(null);
  const [error, setError] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    api.fields.map().then(setFields).catch(err => setError(err.message));
  }, []);

  // Create the map once
  useEffect(() => {
    const map = L.map(mapEl.current, { zoomControl: true }).setView([38.5, -98], 5);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Imagery © Esri',
    }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const visible = useMemo(
    () => (fields || []).filter(f => showInactive || f.is_active !== false),
    [fields, showInactive]
  );
  const placed = visible.filter(f => f.coords);
  const missing = visible.filter(f => !f.coords);

  // Draw pins whenever the visible set changes
  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current;
    if (!map || !fields) return;
    layer.clearLayers();
    const bounds = [];
    for (const f of placed) {
      const ll = [f.coords.lat, f.coords.lng];
      bounds.push(ll);
      const label = `<b>${esc(f.field_name)}</b>${f.acres ? ` · ${esc(Number(f.acres))} ac` : ''}${f.shipper_name ? `<br><span style="color:#b45309">${esc(f.shipper_name)}</span>` : ''}`;
      L.marker(ll, { icon: pinIcon(f.shipper_id ? OUTSIDE : OWN, f.is_active === false), title: f.field_name })
        .bindTooltip(label, { direction: 'top' })
        .on('click', () => navigate(`/fields?field=${f.id}`))
        .addTo(layer);
    }
    if (bounds.length === 1) map.setView(bounds[0], 15);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [fields, showInactive]);

  const focus = (f) => mapRef.current?.setView([f.coords.lat, f.coords.lng], 16);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Field Map" subtitle="Every field with a map pin. Hover a pin for its name, click it to open the field." />

      <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: OWN }} /> My fields</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: OUTSIDE }} /> Outside shippers</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> Show inactive fields
        </label>
        {fields && <span className="ml-auto">{placed.length} of {visible.length} fields on the map</span>}
      </div>

      {error && <div className="card text-red-400 text-sm mb-4">Couldn't load fields: {error}</div>}

      <div className="relative">
        <div ref={mapEl} className="relative isolate h-[60vh] min-h-[360px] rounded-xl overflow-hidden border border-slate-800" />
        {!fields && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-slate-300 text-sm rounded-xl z-[500]">Finding field pins…</div>
        )}
      </div>

      {placed.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Fields</h2>
          <div className="flex flex-wrap gap-2">
            {placed.map(f => (
              <button key={f.id} onClick={() => focus(f)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-200 hover:border-slate-500">
                <MapPin size={12} style={{ color: f.shipper_id ? OUTSIDE : OWN }} /> {f.field_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className="mt-6 card">
          <h2 className="text-sm font-semibold text-slate-300 mb-1">Not on the map ({missing.length})</h2>
          <p className="text-xs text-slate-500 mb-3">These fields have no pin, or a pin link that doesn't contain a location. Open one and paste a Google Maps link to the field.</p>
          <div className="flex flex-wrap gap-2">
            {missing.map(f => (
              <button key={f.id} onClick={() => navigate(`/fields?field=${f.id}`)} className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-400 hover:text-slate-200">
                {f.field_name}{f.google_pin ? '' : ' · no pin'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
