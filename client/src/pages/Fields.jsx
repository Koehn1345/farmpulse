import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { Plus, Pencil, Trash2, MapPin, Ruler } from 'lucide-react';

const empty = { fieldName: '', acres: '', googlePin: '' };

export default function Fields() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = () => api.fields.list().then(setRows).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (row) => { setForm({ ...row, acres: String(row.acres) }); setModal({ edit: row }); };
  const closeModal = () => setModal(null);
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.fieldName || !form.acres) return;
    setSaving(true);
    const payload = { ...form, acres: parseFloat(form.acres) };
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
  };

  const totalAcres = rows.reduce((s, r) => s + (r.acres || 0), 0);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Fields"
        subtitle={`${rows.length} fields · ${totalAcres.toFixed(1)} total acres`}
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={15} /> Add Field
          </button>
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
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="table-row">
                  <td className="px-6 py-4 font-medium text-slate-100 flex items-center gap-2">
                    <MapPin size={13} className="text-soil-400 shrink-0" />
                    {row.fieldName}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-200">
                    <span className="flex items-center justify-end gap-1.5">
                      <Ruler size={12} className="text-slate-500" />
                      {row.acres?.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {row.googlePin
                      ? <a href={row.googlePin} target="_blank" rel="noreferrer" className="text-soil-400 hover:text-soil-300 text-xs underline underline-offset-2">View on map</a>
                      : <span className="text-slate-600 text-xs">—</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      <button className="btn-secondary !px-2 !py-1" onClick={() => openEdit(row)}><Pencil size={13} /></button>
                      <button className="btn-danger" onClick={() => handleDelete(row.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No fields yet.</td></tr>
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
              <input className="input" name="fieldName" value={form.fieldName} onChange={handleChange} placeholder="North 40" />
            </div>
            <div>
              <label className="label">Acres *</label>
              <input className="input" type="number" name="acres" value={form.acres} onChange={handleChange} placeholder="42.5" step="0.1" />
            </div>
            <div>
              <label className="label">Google Maps Pin URL</label>
              <input className="input" name="googlePin" value={form.googlePin} onChange={handleChange} placeholder="https://maps.google.com/..." />
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
    </div>
  );
}
