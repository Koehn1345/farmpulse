import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { Plus, Pencil, Trash2, Wheat, Layers } from 'lucide-react';

const emptyForage = {
  type: 'Forage', fieldId: '', stackNumber: '', typeOfForage: '', cutting: '1st',
  baleCount: '', avgBaleWeightLbs: '', actualStackTonnage: '',
};
const emptyGrain = {
  type: 'Grain', fieldId: '', typeCrop: '', seedDetails: '', estimatedTonsPerAcre: '', actualTons: '',
};

const CUTTINGS = ['1st', '2nd', '3rd', '4th', '5th'];

export default function Commodities() {
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState([]);
  const [tab, setTab] = useState('Forage');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForage);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [c, f] = await Promise.all([api.commodities.list(), api.fields.list()]);
    setRows(c); setFields(f);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(tab === 'Forage' ? emptyForage : emptyGrain); setModal('add'); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ edit: row }); };
  const closeModal = () => setModal(null);
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form };
    if (form.type === 'Forage') {
      payload.baleCount = parseInt(form.baleCount) || null;
      payload.avgBaleWeightLbs = parseFloat(form.avgBaleWeightLbs) || null;
      payload.actualStackTonnage = form.actualStackTonnage ? parseFloat(form.actualStackTonnage) : null;
      if (payload.baleCount && payload.avgBaleWeightLbs) {
        payload.estimatedStackTonnage = (payload.baleCount * payload.avgBaleWeightLbs) / 2000;
      }
    } else {
      payload.estimatedTonsPerAcre = parseFloat(form.estimatedTonsPerAcre) || null;
      payload.actualTons = form.actualTons ? parseFloat(form.actualTons) : null;
      const field = fields.find(f => f.id === form.fieldId);
      if (field && payload.estimatedTonsPerAcre) {
        payload.estimatedTotalTons = field.acres * payload.estimatedTonsPerAcre;
      }
      if (payload.actualTons && field) {
        payload.actualTonsPerAcre = payload.actualTons / field.acres;
      }
    }
    try {
      if (modal === 'add') await api.commodities.create(payload);
      else await api.commodities.update(modal.edit.id, payload);
      await load(); closeModal();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this commodity?')) return;
    await api.commodities.delete(id);
    setRows(r => r.filter(x => x.id !== id));
  };

  const fieldName = (id) => fields.find(f => f.id === id)?.fieldName || '—';
  const filtered = rows.filter(r => r.type === tab);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Commodities"
        subtitle="Forage stacks and grain fields"
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={15} /> Add {tab}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['Forage', 'Grain'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === t
                ? t === 'Forage' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-amber-900/50 text-amber-300 border border-amber-700'
                : 'text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
            }`}
          >
            {t === 'Forage' ? <Layers size={14} /> : <Wheat size={14} />}
            {t}
            <span className="ml-1 bg-slate-800 text-slate-400 text-xs px-1.5 py-0.5 rounded-full">
              {rows.filter(r => r.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : tab === 'Forage' ? (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Stack #', 'Field', 'Forage Type', 'Cutting', 'Bales', 'Est. Tons', 'Actual Tons', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="table-row">
                  <td className="px-5 py-3 font-mono text-xs text-slate-300">{row.stackNumber || '—'}</td>
                  <td className="px-5 py-3 text-slate-200">{fieldName(row.fieldId)}</td>
                  <td className="px-5 py-3 text-slate-200">{row.typeOfForage}</td>
                  <td className="px-5 py-3"><span className="badge-forage">{row.cutting}</span></td>
                  <td className="px-5 py-3 text-slate-300 font-mono">{row.baleCount?.toLocaleString() || '—'}</td>
                  <td className="px-5 py-3 text-slate-300 font-mono">{row.estimatedStackTonnage?.toFixed(1) || '—'}</td>
                  <td className="px-5 py-3">
                    {row.actualStackTonnage
                      ? <span className="text-emerald-400 font-mono">{row.actualStackTonnage.toFixed(1)}</span>
                      : <span className="text-slate-600 text-xs">Pending</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button className="btn-secondary !px-2 !py-1" onClick={() => openEdit(row)}><Pencil size={12} /></button>
                      <button className="btn-danger" onClick={() => handleDelete(row.id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">No forage stacks yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Crop', 'Field', 'Seed', 'Est. Tons/Ac', 'Est. Total', 'Actual Tons', 'Act. Tons/Ac', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="table-row">
                  <td className="px-5 py-3 font-medium text-slate-100">{row.typeCrop}</td>
                  <td className="px-5 py-3 text-slate-200">{fieldName(row.fieldId)}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{row.seedDetails || '—'}</td>
                  <td className="px-5 py-3 font-mono text-slate-300">{row.estimatedTonsPerAcre?.toFixed(2) || '—'}</td>
                  <td className="px-5 py-3 font-mono text-slate-300">{row.estimatedTotalTons?.toFixed(1) || '—'}</td>
                  <td className="px-5 py-3">
                    {row.actualTons
                      ? <span className="text-amber-400 font-mono">{row.actualTons.toFixed(1)}</span>
                      : <span className="text-slate-600 text-xs">Pending</span>}
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-400">{row.actualTonsPerAcre?.toFixed(2) || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button className="btn-secondary !px-2 !py-1" onClick={() => openEdit(row)}><Pencil size={12} /></button>
                      <button className="btn-danger" onClick={() => handleDelete(row.id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">No grain fields yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={`${modal === 'add' ? 'Add' : 'Edit'} ${form.type}`} onClose={closeModal} wide>
          {form.type === 'Forage' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Stack Number</label>
                  <input className="input" name="stackNumber" value={form.stackNumber} onChange={handleChange} placeholder="STK-001" />
                </div>
                <div>
                  <label className="label">Field</label>
                  <select className="input" name="fieldId" value={form.fieldId} onChange={handleChange}>
                    <option value="">Select field…</option>
                    {fields.map(f => <option key={f.id} value={f.id}>{f.fieldName}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type of Forage</label>
                  <input className="input" name="typeOfForage" value={form.typeOfForage} onChange={handleChange} placeholder="Alfalfa, Timothy…" />
                </div>
                <div>
                  <label className="label">Cutting</label>
                  <select className="input" name="cutting" value={form.cutting} onChange={handleChange}>
                    {CUTTINGS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Bale Count</label>
                  <input className="input" type="number" name="baleCount" value={form.baleCount} onChange={handleChange} placeholder="240" />
                </div>
                <div>
                  <label className="label">Avg Bale Weight (lbs)</label>
                  <input className="input" type="number" name="avgBaleWeightLbs" value={form.avgBaleWeightLbs} onChange={handleChange} placeholder="1200" />
                </div>
              </div>
              <div>
                <label className="label">Actual Stack Tonnage (auto-calculates from loads)</label>
                <input className="input" type="number" name="actualStackTonnage" value={form.actualStackTonnage} onChange={handleChange} placeholder="Will auto-update when loads are added" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Crop Type</label>
                  <input className="input" name="typeCrop" value={form.typeCrop} onChange={handleChange} placeholder="Winter Wheat, Barley…" />
                </div>
                <div>
                  <label className="label">Field</label>
                  <select className="input" name="fieldId" value={form.fieldId} onChange={handleChange}>
                    <option value="">Select field…</option>
                    {fields.map(f => <option key={f.id} value={f.id}>{f.fieldName} ({f.acres} ac)</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Seed Details / Variety</label>
                  <input className="input" name="seedDetails" value={form.seedDetails} onChange={handleChange} placeholder="WA8108, Thoroughbred…" />
                </div>
                <div>
                  <label className="label">Est. Tons Per Acre</label>
                  <input className="input" type="number" name="estimatedTonsPerAcre" value={form.estimatedTonsPerAcre} onChange={handleChange} placeholder="2.8" step="0.1" />
                </div>
              </div>
              <div>
                <label className="label">Actual Tons (auto-calculates from loads)</label>
                <input className="input" type="number" name="actualTons" value={form.actualTons} onChange={handleChange} placeholder="Will auto-update from haul tickets" />
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : `Save ${form.type}`}
            </button>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
