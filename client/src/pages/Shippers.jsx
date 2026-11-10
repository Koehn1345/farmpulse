import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { InventoryPanels } from '../components/TonsPillGrid.jsx';
import { Plus, Pencil, Trash2, Warehouse, Phone, MapPin } from 'lucide-react';

const empty = { name: '', contact_name: '', phone: '', notes: '' };
const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const currentYear = String(new Date().getFullYear());

// Outside shippers (e.g. a brother's farm). Their fields, stacks and loads
// live in the app but never count toward this farm's income or expenses -
// the only money tracked is the trucking charge on each load.
export default function Shippers() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(currentYear);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const [selectedId, setSelectedId] = useState('');
  const [inventory, setInventory] = useState(null);

  const load = () => api.shippers.list(year || null).then(setRows).finally(() => setLoading(false));
  useEffect(() => { load(); }, [year]);

  // Default the inventory view to the first shipper once they load
  useEffect(() => {
    if (rows.length && !rows.some(r => r.id === selectedId)) setSelectedId(rows[0].id);
  }, [rows]);

  useEffect(() => {
    if (!selectedId) { setInventory(null); return; }
    let stale = false;
    api.shippers.inventory(selectedId, year || null)
      .then(d => { if (!stale) setInventory(d); })
      .catch(() => { if (!stale) setInventory(null); });
    return () => { stale = true; };
  }, [selectedId, year]);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (row) => { setForm({ name: row.name, contact_name: row.contact_name || '', phone: row.phone || '', notes: row.notes || '' }); setModal({ edit: row }); };
  const closeModal = () => setModal(null);
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (modal === 'add') await api.shippers.create(form);
      else await api.shippers.update(modal.edit.id, form);
      await load(); closeModal();
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Delete ${row.name}?`)) return;
    try {
      await api.shippers.delete(row.id);
      setRows(r => r.filter(x => x.id !== row.id));
    } catch (err) {
      alert(err.message);
    }
  };

  const totals = rows.reduce((t, r) => ({ loads: t.loads + r.loads, tons: t.tons + r.tons, income: t.income + r.trucking_income }), { loads: 0, tons: 0, income: 0 });
  const yearOptions = [...new Set([currentYear, String(Number(currentYear) - 1), String(Number(currentYear) - 2), year])].filter(Boolean);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Outside Shippers"
        subtitle="Other farms you haul for. Their fields and stacks don't count toward your farm's income or expenses."
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={15} /> Add Shipper
          </button>
        }
      />

      <div className="mb-6 p-4 bg-amber-900/20 border border-amber-800/50 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm text-amber-300 font-medium">Trucking Income{year ? ` (${year})` : ' (All Years)'}</div>
          <div className="text-xs text-slate-500">Freight charged on loads hauled off outside shippers' fields. Kept separate from your farm income.</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-semibold text-amber-300">{fmt(totals.income)}</div>
            <div className="text-xs text-slate-500">{totals.loads} loads · {totals.tons.toFixed(1)} tons</div>
          </div>
          <select className="input w-auto" value={year} onChange={e => setYear(e.target.value)}>
            {yearOptions.sort((a, b) => b - a).map(y => <option key={y} value={y}>{y}</option>)}
            <option value="">All Years</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card text-center py-12 text-slate-500 text-sm">
          No outside shippers yet. Add one (for example a brother's farm), then attach fields to it from the Fields page.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map(row => (
            <div
              key={row.id}
              onClick={() => setSelectedId(row.id)}
              className={`card-sm flex flex-col gap-3 cursor-pointer ${selectedId === row.id ? 'ring-1 ring-amber-500/60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-100 flex items-center gap-2">
                    <Warehouse size={14} className="text-amber-400" /> {row.name}
                  </div>
                  {row.contact_name && <div className="text-xs text-slate-400 mt-0.5">{row.contact_name}</div>}
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button className="text-slate-500 hover:text-slate-300 p-1" onClick={() => openEdit(row)}><Pencil size={13} /></button>
                  <button className="text-slate-500 hover:text-red-400 p-1" onClick={() => handleDelete(row)}><Trash2 size={13} /></button>
                </div>
              </div>
              {row.phone && <div className="text-xs text-slate-400 flex items-center gap-2"><Phone size={12} /> {row.phone}</div>}
              <button className="text-xs text-soil-400 hover:text-soil-300 flex items-center gap-2 w-fit" onClick={(e) => { e.stopPropagation(); navigate('/fields'); }}>
                <MapPin size={12} /> {row.field_count} field{row.field_count !== 1 ? 's' : ''}
              </button>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center">
                <div><div className="text-xs text-slate-500">Loads</div><div className="font-mono text-slate-200">{row.loads}</div></div>
                <div><div className="text-xs text-slate-500">Tons</div><div className="font-mono text-slate-200">{row.tons.toFixed(1)}</div></div>
                <div><div className="text-xs text-slate-500">Trucking</div><div className="font-mono text-amber-300">{fmt(row.trucking_income)}</div></div>
              </div>
              {row.notes && <div className="text-xs text-slate-500">{row.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Shipper Inventory</h2>
              <p className="text-xs text-slate-500">Stacks and bags on the selected shipper's fields{year ? ` for ${year}` : ', all years'}.</p>
            </div>
            <select className="input w-auto" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              {rows.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {inventory ? <InventoryPanels data={inventory} /> : <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Shipper' : 'Edit Shipper'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" name="name" value={form.name} onChange={handleChange} placeholder="Dave's Farm" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Contact</label>
                <input className="input" name="contact_name" value={form.contact_name} onChange={handleChange} placeholder="Dave Koehn" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" name="phone" value={form.phone} onChange={handleChange} placeholder="555-555-5555" />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" name="notes" value={form.notes} onChange={handleChange} placeholder="Optional" />
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Shipper'}
              </button>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
