import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { Plus, Pencil, Trash2, Filter } from 'lucide-react';

const emptyLoad = {
  date: '', customerId: '', commodityId: '', fieldId: '', shipper: '',
  type: 'Forage', baleCount: '', grossWeight: '', tareWeight: '', netWeight: '',
  driver: '', truckNumber: '',
};

export default function Loads() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [fields, setFields] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyLoad);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('All');

  const load = async () => {
    const [l, c, f, co] = await Promise.all([
      api.loads.list(), api.customers.list(), api.fields.list(), api.commodities.list()
    ]);
    setRows(l); setCustomers(c); setFields(f); setCommodities(co);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ ...emptyLoad, date: new Date().toISOString().slice(0, 10) }); setModal('add'); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ edit: row }); };
  const closeModal = () => setModal(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      // Auto-calc net weight
      if (['grossWeight', 'tareWeight'].includes(name)) {
        const gross = parseFloat(name === 'grossWeight' ? value : f.grossWeight) || 0;
        const tare = parseFloat(name === 'tareWeight' ? value : f.tareWeight) || 0;
        next.netWeight = gross > 0 && tare > 0 ? String(gross - tare) : f.netWeight;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.date || !form.customerId) return;
    setSaving(true);
    const payload = {
      ...form,
      baleCount: form.baleCount ? parseInt(form.baleCount) : null,
      grossWeight: parseFloat(form.grossWeight) || null,
      tareWeight: parseFloat(form.tareWeight) || null,
      netWeight: parseFloat(form.netWeight) || null,
    };
    try {
      if (modal === 'add') await api.loads.create(payload);
      else await api.loads.update(modal.edit.id, payload);
      await load(); closeModal();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this load?')) return;
    await api.loads.delete(id);
    setRows(r => r.filter(x => x.id !== id));
  };

  const lookup = (arr, id, key) => arr.find(x => x.id === id)?.[key] || '—';
  const filtered = filterType === 'All' ? rows : rows.filter(r => r.type === filterType);
  const sortedRows = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  const filteredCommodities = commodities.filter(c => c.type === form.type);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Loads"
        subtitle={`${rows.length} total haul tickets`}
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={15} /> Log Load
          </button>
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-2 mb-5">
        <Filter size={14} className="text-slate-500" />
        {['All', 'Forage', 'Grain'].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === t ? 'bg-soil-500/30 text-soil-300 border border-soil-600' : 'text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            {t} {t !== 'All' && `(${rows.filter(r => r.type === t).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Date', 'Customer', 'Field', 'Type', 'Shipper', 'Driver / Truck', 'Gross', 'Tare', 'Net (lbs)', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(row => (
                  <tr key={row.id} className="table-row">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{row.date}</td>
                    <td className="px-4 py-3 text-slate-200">{lookup(customers, row.customerId, 'companyName')}</td>
                    <td className="px-4 py-3 text-slate-400">{lookup(fields, row.fieldId, 'fieldName')}</td>
                    <td className="px-4 py-3">
                      <span className={row.type === 'Forage' ? 'badge-forage' : 'badge-grain'}>{row.type}</span>
                      {row.type === 'Forage' && row.baleCount && (
                        <span className="ml-1.5 text-xs text-slate-500">{row.baleCount} bales</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{row.shipper || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {row.driver && <span>{row.driver}</span>}
                      {row.truckNumber && <span className="ml-1 font-mono text-slate-500">#{row.truckNumber}</span>}
                      {!row.driver && !row.truckNumber && '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">{row.grossWeight?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">{row.tareWeight?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-100">{row.netWeight?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="btn-secondary !px-2 !py-1" onClick={() => openEdit(row)}><Pencil size={12} /></button>
                        <button className="btn-danger" onClick={() => handleDelete(row.id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-500">No loads logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Log Load' : 'Edit Load'} onClose={closeModal} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date *</label>
                <input className="input" type="date" name="date" value={form.date} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" name="type" value={form.type} onChange={handleChange}>
                  <option>Forage</option>
                  <option>Grain</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Customer *</label>
                <select className="input" name="customerId" value={form.customerId} onChange={handleChange}>
                  <option value="">Select…</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Field</label>
                <select className="input" name="fieldId" value={form.fieldId} onChange={handleChange}>
                  <option value="">Select…</option>
                  {fields.map(f => <option key={f.id} value={f.id}>{f.fieldName}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Commodity</label>
                <select className="input" name="commodityId" value={form.commodityId} onChange={handleChange}>
                  <option value="">Select…</option>
                  {filteredCommodities.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.type === 'Forage' ? `${c.stackNumber || c.typeOfForage} (${c.typeOfForage})` : `${c.typeCrop}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Shipper</label>
                <input className="input" name="shipper" value={form.shipper} onChange={handleChange} placeholder="Trucking company" />
              </div>
            </div>

            {form.type === 'Forage' && (
              <div>
                <label className="label">Bale Count</label>
                <input className="input" type="number" name="baleCount" value={form.baleCount} onChange={handleChange} placeholder="24" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Gross Weight (lbs)</label>
                <input className="input" type="number" name="grossWeight" value={form.grossWeight} onChange={handleChange} placeholder="54000" />
              </div>
              <div>
                <label className="label">Tare Weight (lbs)</label>
                <input className="input" type="number" name="tareWeight" value={form.tareWeight} onChange={handleChange} placeholder="14000" />
              </div>
              <div>
                <label className="label">Net Weight (auto)</label>
                <input className="input font-mono bg-slate-700" type="number" name="netWeight" value={form.netWeight} onChange={handleChange} placeholder="40000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Driver</label>
                <input className="input" name="driver" value={form.driver} onChange={handleChange} placeholder="Driver name" />
              </div>
              <div>
                <label className="label">Truck #</label>
                <input className="input" name="truckNumber" value={form.truckNumber} onChange={handleChange} placeholder="T-44" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Load'}
              </button>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
