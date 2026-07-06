import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useFarm } from '../context/FarmContext.jsx';
import { Plus, Pencil, Trash2, MapPin, Ruler } from 'lucide-react';

const emptyCrop = { year: String(new Date().getFullYear()), crop: '', notes: '' };

const empty = { field_name: '', acres: '', google_pin: '' };
const typeLabel = (t) => t === 'Forage' ? 'Stack' : 'Grain';

export default function Fields() {
  const { isAdmin } = useFarm();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [cropHistory, setCropHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [viewField, setViewField] = useState(null);
  const [yearFilter, setYearFilter] = useState('All');
  const [cropForm, setCropForm] = useState(null);
  const [savingCrop, setSavingCrop] = useState(false);

  const load = async () => {
    const [f, c, ch] = await Promise.all([api.fields.list(), api.commodities.list(), api.cropHistory.list()]);
    setRows(f); setCommodities(c); setCropHistory(ch); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAddCrop = () => setCropForm(emptyCrop);
  const openEditCrop = (entry) => setCropForm({ id: entry.id, year: String(entry.year), crop: entry.crop, notes: entry.notes || '' });
  const closeCropForm = () => setCropForm(null);
  const handleCropChange = (e) => setCropForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const saveCrop = async () => {
    if (!cropForm.year || !cropForm.crop) return;
    setSavingCrop(true);
    const payload = { field_id: viewField.id, year: parseInt(cropForm.year), crop: cropForm.crop, notes: cropForm.notes || null };
    try {
      if (cropForm.id) await api.cropHistory.update(cropForm.id, payload);
      else await api.cropHistory.create(payload);
      setCropHistory(await api.cropHistory.list());
      closeCropForm();
    } finally { setSavingCrop(false); }
  };

  const deleteCrop = async (id) => {
    if (!confirm('Delete this crop history entry?')) return;
    await api.cropHistory.delete(id);
    setCropHistory(h => h.filter(x => x.id !== id));
  };

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (row) => { setForm({ field_name: row.field_name, acres: String(row.acres || ''), google_pin: row.google_pin || '' }); setModal({ edit: row }); };
  const closeModal = () => setModal(null);
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.field_name) return;
    setSaving(true);
    const payload = { field_name: form.field_name, acres: parseFloat(form.acres) || null, google_pin: form.google_pin || null };
    try {
      if (modal === 'add') await api.fields.create(payload);
      else await api.fields.update(modal.edit.id, payload);
      await load(); closeModal();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this field?')) return;
    await api.fields.delete(id);
    setRows(r => r.filter(x => x.id !== id));
    setViewField(null);
  };

  const totalAcres = rows.reduce((s, r) => s + (parseFloat(r.acres) || 0), 0);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Fields"
        subtitle={`${rows.length} fields · ${totalAcres.toFixed(1)} total acres`}
        action={
          isAdmin && (
            <button className="btn-primary" onClick={openAdd}>
              <Plus size={15} /> Add Field
            </button>
          )
        }
      />

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="text-left px-6 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Field Name</th>
                <th className="text-right px-6 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Acres</th>
                <th className="text-left px-6 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Google Pin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="table-row cursor-pointer" onClick={() => { setViewField(row); setYearFilter('All'); setCropForm(null); }}>
                  <td className="px-6 py-4 font-medium text-slate-100 flex items-center gap-2">
                    <MapPin size={13} className="text-soil-400 shrink-0" />
                    {row.field_name}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-200">
                    <span className="flex items-center justify-end gap-1.5">
                      <Ruler size={12} className="text-slate-500" />
                      {row.acres ? parseFloat(row.acres).toFixed(1) : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {row.google_pin
                      ? <a href={row.google_pin} target="_blank" rel="noreferrer" className="text-soil-400 hover:text-soil-300 text-xs underline underline-offset-2" onClick={(e) => e.stopPropagation()}>View on map</a>
                      : <span className="text-slate-600 text-xs">—</span>
                    }
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">No fields yet. Add your first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Field' : 'Edit Field'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="label">Field Name *</label>
              <input className="input" name="field_name" value={form.field_name} onChange={handleChange} placeholder="North 40" />
            </div>
            <div>
              <label className="label">Acres</label>
              <input className="input" type="number" name="acres" value={form.acres} onChange={handleChange} placeholder="42.5" step="0.1" />
            </div>
            <div>
              <label className="label">Google Maps Pin URL</label>
              <input className="input" name="google_pin" value={form.google_pin} onChange={handleChange} placeholder="https://maps.google.com/..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Field'}
              </button>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {viewField && (() => {
        const fieldCommodities = commodities.filter(c => c.field_id === viewField.id);
        const years = [...new Set(fieldCommodities.map(c => c.year))].sort((a, b) => b - a);
        const filtered = yearFilter === 'All' ? fieldCommodities : fieldCommodities.filter(c => c.year === yearFilter);
        const fieldCropHistory = cropHistory.filter(h => h.field_id === viewField.id).sort((a, b) => b.year - a.year);
        return (
          <Modal title={viewField.field_name} onClose={() => setViewField(null)} wide>
            <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-800">
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Ruler size={13} className="text-slate-500" />
                  {viewField.acres ? `${parseFloat(viewField.acres).toFixed(1)} acres` : 'No acreage set'}
                </div>
                {viewField.google_pin ? (
                  <a href={viewField.google_pin} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-soil-400 hover:text-soil-300 text-xs underline underline-offset-2">
                    <MapPin size={13} /> View on map
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <MapPin size={13} /> No map pin set
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button className="btn-secondary !px-2 !py-1" onClick={() => { openEdit(viewField); setViewField(null); }}><Pencil size={13} /></button>
                  <button className="btn-danger" onClick={() => handleDelete(viewField.id)}><Trash2 size={13} /></button>
                </div>
              )}
            </div>

            <div className="mb-5 pb-4 border-b border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Crop History</div>
                {isAdmin && !cropForm && (
                  <button className="text-xs text-soil-400 hover:text-soil-300" onClick={openAddCrop}>+ Add Crop</button>
                )}
              </div>

              {cropForm && (
                <div className="mb-3 p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" type="number" name="year" value={cropForm.year} onChange={handleCropChange} placeholder="2024" />
                    <input className="input" name="crop" value={cropForm.crop} onChange={handleCropChange} placeholder="Corn, Soybeans…" autoFocus />
                  </div>
                  <input className="input" name="notes" value={cropForm.notes} onChange={handleCropChange} placeholder="Notes (optional)" />
                  <div className="flex gap-2">
                    <button className="btn-primary !py-1 text-xs" onClick={saveCrop} disabled={savingCrop}>{savingCrop ? 'Saving…' : 'Save'}</button>
                    <button className="btn-secondary !py-1 text-xs" onClick={closeCropForm}>Cancel</button>
                  </div>
                </div>
              )}

              {fieldCropHistory.length > 0 ? (
                <div className="space-y-1.5">
                  {fieldCropHistory.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-mono text-xs text-slate-500 mr-2">{entry.year}</span>
                        <span className="text-slate-200">{entry.crop}</span>
                        {entry.notes && <span className="text-slate-500 text-xs ml-2">— {entry.notes}</span>}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button className="text-slate-500 hover:text-slate-300" onClick={() => openEditCrop(entry)}><Pencil size={12} /></button>
                          <button className="text-slate-500 hover:text-red-400" onClick={() => deleteCrop(entry.id)}><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                !cropForm && <div className="text-xs text-slate-500">No crop history logged for this field.</div>
              )}
            </div>

            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Stacks & Grain</div>
            {years.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setYearFilter('All')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    yearFilter === 'All' ? 'bg-soil-500/30 text-soil-300 border border-soil-600' : 'text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  All Years
                </button>
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => setYearFilter(y)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      yearFilter === y ? 'bg-soil-500/30 text-soil-300 border border-soil-600' : 'text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Year', 'Type', 'Name', 'Tons', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const tons = c.type === 'Forage'
                    ? (c.actual_stack_tonnage ?? c.estimated_stack_tonnage)
                    : (c.actual_tons ?? c.estimated_total_tons);
                  return (
                    <tr key={c.id} className="table-row cursor-pointer" onClick={() => navigate('/commodities', { state: { openCommodityId: c.id } })}>
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">{c.year || '—'}</td>
                      <td className="px-3 py-2"><span className={c.type === 'Forage' ? 'badge-forage' : 'badge-grain'}>{typeLabel(c.type)}</span></td>
                      <td className="px-3 py-2 text-slate-200">{c.type === 'Forage' ? (c.stack_number || c.type_of_forage) : c.type_crop}</td>
                      <td className="px-3 py-2 font-mono text-slate-100">{tons ? parseFloat(tons).toFixed(1) : '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{c.actual_stack_tonnage || c.actual_tons ? 'Actual' : 'Est.'}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No stacks or grain logged for this field{yearFilter !== 'All' ? ` in ${yearFilter}` : ''} yet.</td></tr>
                )}
              </tbody>
            </table>
          </Modal>
        );
      })()}
    </div>
  );
}
