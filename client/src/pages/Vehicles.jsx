import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useFarm } from '../context/FarmContext.jsx';
import { Plus, Pencil, Trash2, Car } from 'lucide-react';
import { formatDate } from '../lib/format.js';

const FUEL_TYPES = ['On Road Diesel', 'Off Road Diesel', 'Gasolene'];
const empty = { name_number: '', make: '', fuel_type: 'On Road Diesel' };

export default function Vehicles() {
  const { isAdmin } = useFarm();
  const [rows, setRows] = useState([]);
  const [fuelEntries, setFuelEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [viewVehicle, setViewVehicle] = useState(null);

  const load = async () => {
    setLoadError(null);
    try {
      const [v, f] = await Promise.all([api.vehicles.list(), api.fuelEntries.list()]);
      setRows(v); setFuelEntries(f);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (row) => { setForm({ name_number: row.name_number, make: row.make || '', fuel_type: row.fuel_type || 'On Road Diesel' }); setModal({ edit: row }); };
  const closeModal = () => setModal(null);
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.name_number) return;
    setSaving(true);
    try {
      if (modal === 'add') await api.vehicles.create(form);
      else await api.vehicles.update(modal.edit.id, form);
      await load(); closeModal();
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vehicle?')) return;
    await api.vehicles.delete(id);
    setRows(r => r.filter(x => x.id !== id));
    setViewVehicle(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Vehicles"
        subtitle={`${rows.length} vehicles`}
        action={
          isAdmin && (
            <button className="btn-primary" onClick={openAdd}>
              <Plus size={15} /> Add Vehicle
            </button>
          )
        }
      />

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : loadError ? (
        <div className="text-center py-8">
          <div className="text-red-400 text-sm mb-2">Failed to load vehicles: {loadError}</div>
          <button className="btn-secondary" onClick={() => { setLoading(true); load(); }}>Retry</button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Name / Number</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Make</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Fuel Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="table-row cursor-pointer" onClick={() => setViewVehicle(row)}>
                    <td className="px-6 py-4 font-medium text-slate-100 flex items-center gap-2">
                      <Car size={13} className="text-soil-400 shrink-0" />
                      {row.name_number}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{row.make || '—'}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{row.fuel_type || '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">No vehicles yet. Add your first one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Vehicle' : 'Edit Vehicle'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="label">Name / Number *</label>
              <input className="input" name="name_number" value={form.name_number} onChange={handleChange} placeholder="Truck 1, T-44…" />
            </div>
            <div>
              <label className="label">Make</label>
              <input className="input" name="make" value={form.make} onChange={handleChange} placeholder="Ford, Kenworth…" />
            </div>
            <div>
              <label className="label">Fuel Type</label>
              <select className="input" name="fuel_type" value={form.fuel_type} onChange={handleChange}>
                {FUEL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Vehicle'}
              </button>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {viewVehicle && (() => {
        const history = fuelEntries.filter(f => f.vehicle_id === viewVehicle.id).sort((a, b) => new Date(b.date) - new Date(a.date));
        const totalGallons = history.reduce((s, f) => s + (parseFloat(f.gallons) || 0), 0);
        return (
          <Modal title={viewVehicle.name_number} onClose={() => setViewVehicle(null)} wide>
            <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-800">
              <div className="space-y-1.5 text-sm text-slate-300">
                <div>{viewVehicle.make || 'No make set'}</div>
                <div className="text-xs text-slate-400">{viewVehicle.fuel_type || 'No fuel type set'}</div>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button className="btn-secondary !px-2 !py-1" onClick={() => { openEdit(viewVehicle); setViewVehicle(null); }}><Pencil size={13} /></button>
                  <button className="btn-danger" onClick={() => handleDelete(viewVehicle.id)}><Trash2 size={13} /></button>
                </div>
              )}
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Fuel History</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Date', 'Fuel Type', 'Location', 'Gallons'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(f => (
                  <tr key={f.id} className="table-row">
                    <td className="px-3 py-2 font-mono text-xs text-slate-400">{formatDate(f.date)}</td>
                    <td className="px-3 py-2 text-slate-200">{f.fuel_type || '—'}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs">{f.fuel_location || '—'}</td>
                    <td className="px-3 py-2 font-mono text-slate-100">{f.gallons ? parseFloat(f.gallons).toFixed(1) : '—'}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No fuel entries logged for this vehicle yet.</td></tr>
                )}
              </tbody>
              {history.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-700 bg-slate-900/50">
                    <td colSpan={3} className="px-3 py-2 text-xs text-slate-400 font-medium text-right">Total Gallons</td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-100">{totalGallons.toFixed(1)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </Modal>
        );
      })()}
    </div>
  );
}
