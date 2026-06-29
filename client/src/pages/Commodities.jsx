import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { Plus, Pencil, Trash2, Wheat, Layers } from 'lucide-react';
import { formatDate } from '../lib/format.js';

const currentYear = new Date().getFullYear();
const emptyForage = { type: 'Forage', field_id: '', year: String(currentYear), price_per_ton: '', stack_number: '', type_of_forage: '', cutting: '1st', bale_count: '', avg_bale_weight_lbs: '', actual_stack_tonnage: '' };
const emptyGrain = { type: 'Grain', field_id: '', year: String(currentYear), price_per_ton: '', type_crop: '', seed_details: '', estimated_total_tons: '', actual_tons: '' };
const CUTTINGS = ['1st', '2nd', '3rd', '4th', '5th'];
const typeLabel = (t) => t === 'Forage' ? 'Stacks' : 'Grain';

export default function Commodities() {
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState([]);
  const [loads, setLoads] = useState([]);
  const [tab, setTab] = useState('Forage');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForage);
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  const load = async () => {
    const [c, f, l] = await Promise.all([api.commodities.list(), api.fields.list(), api.loads.list()]);
    setRows(c); setFields(f); setLoads(l); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(tab === 'Forage' ? emptyForage : emptyGrain); setModal('add'); };
  const openEdit = (row) => { setForm({ ...row, year: String(row.year || currentYear), price_per_ton: String(row.price_per_ton || ''), bale_count: String(row.bale_count || ''), avg_bale_weight_lbs: String(row.avg_bale_weight_lbs || ''), actual_stack_tonnage: String(row.actual_stack_tonnage || ''), estimated_total_tons: String(row.estimated_total_tons || ''), actual_tons: String(row.actual_tons || '') }); setModal({ edit: row }); };
  const closeModal = () => setModal(null);
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, year: parseInt(form.year) || currentYear, price_per_ton: parseFloat(form.price_per_ton) || null };
    if (form.type === 'Forage') {
      payload.bale_count = parseInt(form.bale_count) || null;
      payload.avg_bale_weight_lbs = parseFloat(form.avg_bale_weight_lbs) || null;
      payload.actual_stack_tonnage = form.actual_stack_tonnage ? parseFloat(form.actual_stack_tonnage) : null;
      if (payload.bale_count && payload.avg_bale_weight_lbs) {
        payload.estimated_stack_tonnage = (payload.bale_count * payload.avg_bale_weight_lbs) / 2000;
      }
    } else {
      payload.estimated_total_tons = parseFloat(form.estimated_total_tons) || null;
      payload.actual_tons = form.actual_tons ? parseFloat(form.actual_tons) : null;
      payload.actual_tons_per_acre = null;
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
    setViewRow(null);
  };

  const fieldName = (id) => fields.find(f => f.id === id)?.field_name || '—';
  const filtered = rows.filter(r => r.type === tab);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Commodities"
        subtitle="Stacks and grain fields"
        action={<button className="btn-primary" onClick={openAdd}><Plus size={15} /> Add {typeLabel(tab)}</button>}
      />

      <div className="flex gap-2 mb-6">
        {['Forage', 'Grain'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === t
                ? t === 'Forage' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-amber-900/50 text-amber-300 border border-amber-700'
                : 'text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {t === 'Forage' ? <Layers size={14} /> : <Wheat size={14} />}
            {typeLabel(t)}
            <span className="ml-1 bg-slate-800 text-slate-400 text-xs px-1.5 py-0.5 rounded-full">{rows.filter(r => r.type === t).length}</span>
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
                {['Year', 'Stack #', 'Field', 'Commodity', 'Cutting', 'Bales', 'Est. Tons', 'Actual Tons', '$/Ton'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="table-row cursor-pointer" onClick={() => setViewRow(row)}>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{row.year || '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-300">{row.stack_number || '—'}</td>
                  <td className="px-5 py-3 text-slate-200">{fieldName(row.field_id)}</td>
                  <td className="px-5 py-3 text-slate-200">{row.type_of_forage}</td>
                  <td className="px-5 py-3"><span className="badge-forage">{row.cutting}</span></td>
                  <td className="px-5 py-3 text-slate-300 font-mono">{row.bale_count?.toLocaleString() || '—'}</td>
                  <td className="px-5 py-3 text-slate-300 font-mono">{row.estimated_stack_tonnage ? parseFloat(row.estimated_stack_tonnage).toFixed(1) : '—'}</td>
                  <td className="px-5 py-3">{row.actual_stack_tonnage ? <span className="text-emerald-400 font-mono">{parseFloat(row.actual_stack_tonnage).toFixed(1)}</span> : <span className="text-slate-600 text-xs">Pending</span>}</td>
                  <td className="px-5 py-3 font-mono text-slate-300">{row.price_per_ton ? `$${parseFloat(row.price_per_ton).toFixed(2)}` : '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">No stacks yet.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Year', 'Crop', 'Field', 'Seed', 'Est. Tons', 'Actual Tons', '$/Ton'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="table-row cursor-pointer" onClick={() => setViewRow(row)}>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{row.year || '—'}</td>
                  <td className="px-5 py-3 font-medium text-slate-100">{row.type_crop}</td>
                  <td className="px-5 py-3 text-slate-200">{fieldName(row.field_id)}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{row.seed_details || '—'}</td>
                  <td className="px-5 py-3 font-mono text-slate-300">{row.estimated_total_tons ? parseFloat(row.estimated_total_tons).toFixed(1) : '—'}</td>
                  <td className="px-5 py-3">{row.actual_tons ? <span className="text-amber-400 font-mono">{parseFloat(row.actual_tons).toFixed(1)}</span> : <span className="text-slate-600 text-xs">Pending</span>}</td>
                  <td className="px-5 py-3 font-mono text-slate-300">{row.price_per_ton ? `$${parseFloat(row.price_per_ton).toFixed(2)}` : '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No grain fields yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={`${modal === 'add' ? 'Add' : 'Edit'} ${typeLabel(form.type)}`} onClose={closeModal} wide>
          {form.type === 'Forage' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Year</label><input className="input" type="number" name="year" value={form.year} onChange={handleChange} placeholder={String(currentYear)} /></div>
                <div><label className="label">Stack Number</label><input className="input" name="stack_number" value={form.stack_number} onChange={handleChange} placeholder="STK-001" /></div>
                <div><label className="label">Field</label>
                  <select className="input" name="field_id" value={form.field_id} onChange={handleChange}>
                    <option value="">Select field…</option>
                    {fields.map(f => <option key={f.id} value={f.id}>{f.field_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Commodity</label><input className="input" name="type_of_forage" value={form.type_of_forage} onChange={handleChange} placeholder="Alfalfa, Timothy…" /></div>
                <div><label className="label">Cutting</label>
                  <select className="input" name="cutting" value={form.cutting} onChange={handleChange}>
                    {CUTTINGS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Bale Count</label><input className="input" type="number" name="bale_count" value={form.bale_count} onChange={handleChange} placeholder="240" /></div>
                <div><label className="label">Avg Bale Weight (lbs)</label><input className="input" type="number" name="avg_bale_weight_lbs" value={form.avg_bale_weight_lbs} onChange={handleChange} placeholder="1200" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Actual Stack Tonnage</label><input className="input" type="number" name="actual_stack_tonnage" value={form.actual_stack_tonnage} onChange={handleChange} placeholder="Auto-updates from loads" /></div>
                <div><label className="label">Price per Ton ($)</label><input className="input" type="number" name="price_per_ton" value={form.price_per_ton} onChange={handleChange} placeholder="180.00" step="0.01" /></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Year</label><input className="input" type="number" name="year" value={form.year} onChange={handleChange} placeholder={String(currentYear)} /></div>
                <div><label className="label">Crop Type</label><input className="input" name="type_crop" value={form.type_crop} onChange={handleChange} placeholder="Winter Wheat, Barley…" /></div>
                <div><label className="label">Field</label>
                  <select className="input" name="field_id" value={form.field_id} onChange={handleChange}>
                    <option value="">Select field…</option>
                    {fields.map(f => <option key={f.id} value={f.id}>{f.field_name} ({f.acres} ac)</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Seed Variety</label><input className="input" name="seed_details" value={form.seed_details} onChange={handleChange} placeholder="WA8108…" /></div>
                <div><label className="label">Estimated Tons</label><input className="input" type="number" name="estimated_total_tons" value={form.estimated_total_tons} onChange={handleChange} placeholder="250" step="0.1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Actual Tons</label><input className="input" type="number" name="actual_tons" value={form.actual_tons} onChange={handleChange} placeholder="Auto-updates from loads" /></div>
                <div><label className="label">Price per Ton ($)</label><input className="input" type="number" name="price_per_ton" value={form.price_per_ton} onChange={handleChange} placeholder="280.00" step="0.01" /></div>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : `Save ${form.type}`}</button>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
          </div>
        </Modal>
      )}

      {viewRow && (() => {
        const matchingLoads = loads.filter(l => l.commodity_id === viewRow.id).sort((a, b) => new Date(b.date) - new Date(a.date));
        const totalIncome = matchingLoads.reduce((s, l) => s + (l.net_weight && viewRow.price_per_ton ? (l.net_weight / 2000) * viewRow.price_per_ton : 0), 0);
        const cols = viewRow.type === 'Forage' ? 5 : 4;
        return (
          <Modal
            title={viewRow.type === 'Forage' ? (viewRow.stack_number || viewRow.type_of_forage) : viewRow.type_crop}
            onClose={() => setViewRow(null)}
            wide
          >
            <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-800">
              <div className="space-y-1.5 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <span className={viewRow.type === 'Forage' ? 'badge-forage' : 'badge-grain'}>{typeLabel(viewRow.type)}</span>
                  <span className="text-slate-400">{viewRow.year}</span>
                </div>
                <div>{fieldName(viewRow.field_id)}</div>
                <div className="text-xs text-slate-400">{viewRow.price_per_ton ? `$${parseFloat(viewRow.price_per_ton).toFixed(2)}/ton` : 'No price set'}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary !px-2 !py-1" onClick={() => { openEdit(viewRow); setViewRow(null); }}><Pencil size={13} /></button>
                <button className="btn-danger" onClick={() => handleDelete(viewRow.id)}><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Loads</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {(viewRow.type === 'Forage' ? ['Date', 'Customer', 'Bales', 'Tons', 'Income'] : ['Date', 'Customer', 'Tons', 'Income']).map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matchingLoads.map(l => {
                  const tons = l.net_weight ? l.net_weight / 2000 : null;
                  const income = tons && viewRow.price_per_ton ? tons * viewRow.price_per_ton : null;
                  return (
                    <tr key={l.id} className="table-row">
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">{formatDate(l.date)}</td>
                      <td className="px-3 py-2 text-slate-200">{l.customer_name || '—'}</td>
                      {viewRow.type === 'Forage' && (
                        <td className="px-3 py-2 font-mono text-slate-300">{l.bale_count?.toLocaleString() || '—'}</td>
                      )}
                      <td className="px-3 py-2 font-mono text-slate-100">{tons ? tons.toFixed(2) : '—'}</td>
                      <td className="px-3 py-2 font-mono text-emerald-400">{income ? `$${income.toFixed(2)}` : '—'}</td>
                    </tr>
                  );
                })}
                {matchingLoads.length === 0 && (
                  <tr><td colSpan={cols} className="px-3 py-8 text-center text-slate-500">No loads logged against this {viewRow.type === 'Forage' ? 'stack' : 'crop'} yet.</td></tr>
                )}
              </tbody>
              {matchingLoads.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-700 bg-slate-900/50">
                    <td colSpan={cols - 1} className="px-3 py-2 text-xs text-slate-400 font-medium text-right">Total Income</td>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-300">{viewRow.price_per_ton ? `$${totalIncome.toFixed(2)}` : '—'}</td>
                  </tr>
                </tfoot>
              )}
            </table>
            {!viewRow.price_per_ton && (
              <div className="text-xs text-slate-500 mt-3">Set a Price per Ton on this {viewRow.type === 'Forage' ? 'stack' : 'crop'} to calculate income automatically.</div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}
