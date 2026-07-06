import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useFarm } from '../context/FarmContext.jsx';
import { Plus, Pencil, Trash2, Fuel as FuelIcon } from 'lucide-react';
import { formatDate } from '../lib/format.js';

const FUEL_TYPES = ['Diesel', 'Gasoline', 'Propane', 'Other'];

const emptyEntry = { date: '', vehicle_id: '', fuel_type: 'Diesel', fuel_location: '', gallons: '' };
const emptyVehicle = { name_number: '', make: '', fuel_type: 'Diesel' };

function QuickAddVehicle({ onSave, onCancel }) {
  const [form, setForm] = useState(emptyVehicle);
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!form.name_number) return;
    setSaving(true);
    try { const v = await api.vehicles.create(form); onSave(v); }
    finally { setSaving(false); }
  };
  return (
    <div className="mt-2 p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
      <div className="text-xs text-slate-400 font-medium">New Vehicle</div>
      <input className="input" placeholder="Name / Number" value={form.name_number} onChange={e => setForm(f => ({ ...f, name_number: e.target.value }))} autoFocus />
      <input className="input" placeholder="Make (optional)" value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} />
      <select className="input" value={form.fuel_type} onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value }))}>
        {FUEL_TYPES.map(t => <option key={t}>{t}</option>)}
      </select>
      <div className="flex gap-2">
        <button className="btn-primary !py-1 text-xs" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
        <button className="btn-secondary !py-1 text-xs" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function Fuel() {
  const { isAdmin } = useFarm();
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyEntry);
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [quickAddVehicle, setQuickAddVehicle] = useState(false);
  const [addingLocation, setAddingLocation] = useState(false);

  const load = async () => {
    setLoadError(null);
    try {
      const [f, v] = await Promise.all([api.fuelEntries.list(), api.vehicles.list()]);
      setRows(f); setVehicles(v);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const locations = [...new Set(rows.filter(r => r.fuel_location).map(r => r.fuel_location))].sort();

  const openAdd = () => {
    setForm({ ...emptyEntry, date: new Date().toISOString().slice(0, 10) });
    setQuickAddVehicle(false);
    setAddingLocation(false);
    setModal('add');
  };
  const openEdit = (row) => {
    setForm({
      date: row.date ? row.date.slice(0, 10) : '',
      vehicle_id: row.vehicle_id || '',
      fuel_type: row.fuel_type || 'Diesel',
      fuel_location: row.fuel_location || '',
      gallons: row.gallons ?? '',
    });
    setQuickAddVehicle(false);
    setAddingLocation(false);
    setModal({ edit: row });
  };
  const closeModal = () => { setModal(null); setQuickAddVehicle(false); setAddingLocation(false); };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      if (name === 'vehicle_id') {
        const v = vehicles.find(v => v.id === value);
        if (v?.fuel_type) next.fuel_type = v.fuel_type;
      }
      return next;
    });
  };

  const onVehicleAdded = (v) => {
    setVehicles(prev => [...prev, v]);
    setForm(f => ({ ...f, vehicle_id: v.id, fuel_type: v.fuel_type || f.fuel_type }));
    setQuickAddVehicle(false);
  };

  const handleSave = async () => {
    if (!form.date || !form.vehicle_id) return;
    setSaving(true);
    const payload = {
      date: form.date,
      vehicle_id: form.vehicle_id,
      fuel_type: form.fuel_type,
      fuel_location: form.fuel_location || null,
      gallons: parseFloat(form.gallons) || null,
    };
    try {
      if (modal === 'add') await api.fuelEntries.create(payload);
      else await api.fuelEntries.update(modal.edit.id, payload);
      await load(); closeModal();
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this fuel entry?')) return;
    await api.fuelEntries.delete(id);
    setRows(r => r.filter(x => x.id !== id));
    setViewRow(null);
  };

  const sortedRows = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Fuel"
        subtitle={`${rows.length} fuel entries`}
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={15} /> Log Fuel
          </button>
        }
      />

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : loadError ? (
        <div className="text-center py-8">
          <div className="text-red-400 text-sm mb-2">Failed to load fuel entries: {loadError}</div>
          <button className="btn-secondary" onClick={() => { setLoading(true); load(); }}>Retry</button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Date', 'Vehicle', 'Fuel Type', 'Location', 'Gallons'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(row => (
                  <tr key={row.id} className="table-row cursor-pointer" onClick={() => setViewRow(row)}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 text-slate-200 flex items-center gap-2">
                      <FuelIcon size={13} className="text-soil-400 shrink-0" />
                      {row.vehicle_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{row.fuel_type || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{row.fuel_location || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-100">{row.gallons ? parseFloat(row.gallons).toFixed(1) : '—'}</td>
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No fuel entries logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Log Fuel' : 'Edit Fuel Entry'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" name="date" value={form.date} onChange={handleChange} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Vehicle *</label>
                {isAdmin && !quickAddVehicle && (
                  <button className="text-xs text-soil-400 hover:text-soil-300" onClick={() => setQuickAddVehicle(true)}>
                    + New Vehicle
                  </button>
                )}
              </div>
              <select className="input" name="vehicle_id" value={form.vehicle_id} onChange={handleChange}>
                <option value="">Select…</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name_number}</option>)}
              </select>
              {quickAddVehicle && (
                <QuickAddVehicle onSave={onVehicleAdded} onCancel={() => setQuickAddVehicle(false)} />
              )}
            </div>

            <div>
              <label className="label">Fuel Type</label>
              <select className="input" name="fuel_type" value={form.fuel_type} onChange={handleChange}>
                {FUEL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Fuel Location</label>
              {addingLocation ? (
                <div className="space-y-1">
                  <input className="input" name="fuel_location" value={form.fuel_location} onChange={handleChange} placeholder="Farm Tank, Shell - Main St…" autoFocus />
                  {locations.length > 0 && (
                    <button type="button" className="text-xs text-soil-400 hover:text-soil-300" onClick={() => { setAddingLocation(false); setForm(f => ({ ...f, fuel_location: '' })); }}>
                      Choose existing
                    </button>
                  )}
                </div>
              ) : (
                <select
                  className="input"
                  value={form.fuel_location}
                  onChange={e => {
                    if (e.target.value === '__new__') { setAddingLocation(true); setForm(f => ({ ...f, fuel_location: '' })); }
                    else setForm(f => ({ ...f, fuel_location: e.target.value }));
                  }}
                >
                  <option value="">Select location…</option>
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                  <option value="__new__">+ Add new location…</option>
                </select>
              )}
            </div>

            <div>
              <label className="label">Gallons</label>
              <input className="input" type="number" name="gallons" value={form.gallons} onChange={handleChange} placeholder="45.2" step="0.1" />
            </div>

            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {viewRow && (
        <Modal title={`Fuel — ${formatDate(viewRow.date)}`} onClose={() => setViewRow(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="label">Vehicle</div><div className="text-slate-100">{viewRow.vehicle_name || '—'}</div></div>
              <div><div className="label">Fuel Type</div><div className="text-slate-100">{viewRow.fuel_type || '—'}</div></div>
              <div><div className="label">Location</div><div className="text-slate-100">{viewRow.fuel_location || '—'}</div></div>
              <div><div className="label">Gallons</div><div className="font-mono text-slate-100">{viewRow.gallons ? parseFloat(viewRow.gallons).toFixed(1) : '—'}</div></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1 justify-center" onClick={() => { openEdit(viewRow); setViewRow(null); }}>
                <Pencil size={13} /> Edit
              </button>
              {isAdmin && (
                <button className="btn-danger flex-1 justify-center" onClick={() => handleDelete(viewRow.id)}>
                  <Trash2 size={13} /> Delete
                </button>
              )}
              <button className="btn-secondary" onClick={() => setViewRow(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
