import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const empty = { date: '', vendor: '', fieldId: '', amount: '', notes: '' };
const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [e, f] = await Promise.all([api.expenses.list(), api.fields.list()]);
    setRows(e); setFields(f);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ ...empty, date: new Date().toISOString().slice(0, 10) }); setModal('add'); };
  const openEdit = (row) => { setForm({ ...row, amount: String(row.amount) }); setModal({ edit: row }); };
  const closeModal = () => setModal(null);
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.date || !form.amount) return;
    setSaving(true);
    const payload = { ...form, amount: parseFloat(form.amount) };
    try {
      if (modal === 'add') await api.expenses.create(payload);
      else await api.expenses.update(modal.edit.id, payload);
      await load(); closeModal();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await api.expenses.delete(id);
    setRows(r => r.filter(x => x.id !== id));
  };

  const lookup = (arr, id, key) => arr.find(x => x.id === id)?.[key] || '—';
  const sorted = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);

  // Group by vendor for summary
  const byVendor = rows.reduce((acc, r) => {
    acc[r.vendor] = (acc[r.vendor] || 0) + r.amount;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Expenses"
        subtitle={`${rows.length} entries · ${fmt(total)} total`}
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={15} /> Add Expense
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="p-4 bg-red-900/20 border border-red-800/40 rounded-xl flex items-center justify-between lg:col-span-2">
          <span className="text-sm text-red-300 font-medium">Total Season Expenses</span>
          <span className="text-2xl font-semibold text-red-300">{fmt(total)}</span>
        </div>
        <div className="card-sm">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">By Vendor</div>
          {Object.entries(byVendor).slice(0, 4).map(([v, amt]) => (
            <div key={v} className="flex justify-between text-xs py-1 border-b border-slate-800 last:border-0">
              <span className="text-slate-400 truncate mr-2">{v}</span>
              <span className="text-red-400 font-mono shrink-0">{fmt(amt)}</span>
            </div>
          ))}
          {Object.keys(byVendor).length === 0 && <div className="text-xs text-slate-600">No data yet</div>}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Date', 'Vendor', 'Field', 'Notes', 'Amount', ''].map(h => (
                  <th key={h} className={`px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => (
                <tr key={row.id} className="table-row">
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{row.date}</td>
                  <td className="px-5 py-3 text-slate-200 font-medium">{row.vendor}</td>
                  <td className="px-5 py-3 text-slate-400">{lookup(fields, row.fieldId, 'fieldName')}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs max-w-xs truncate">{row.notes || '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-red-400">{fmt(row.amount)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2 justify-end">
                      <button className="btn-secondary !px-2 !py-1" onClick={() => openEdit(row)}><Pencil size={12} /></button>
                      <button className="btn-danger" onClick={() => handleDelete(row.id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No expenses yet.</td></tr>
              )}
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-700 bg-slate-900/50">
                  <td colSpan={4} className="px-5 py-3 text-xs text-slate-400 font-medium">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-red-300 text-base">{fmt(total)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Expense' : 'Edit Expense'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" name="date" value={form.date} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Vendor *</label>
              <input className="input" name="vendor" value={form.vendor} onChange={handleChange} placeholder="AgriSupply Co." />
            </div>
            <div>
              <label className="label">Field</label>
              <select className="input" name="fieldId" value={form.fieldId} onChange={handleChange}>
                <option value="">Select…</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.fieldName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount ($) *</label>
              <input className="input" type="number" name="amount" value={form.amount} onChange={handleChange} placeholder="0.00" step="0.01" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" name="notes" value={form.notes} onChange={handleChange} placeholder="Fertilizer - North 40…" />
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Expense'}
              </button>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
