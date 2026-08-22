import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useFarm } from '../context/FarmContext.jsx';
import { Plus, Pencil, Trash2, Wheat, Layers, Lock, Unlock } from 'lucide-react';
import { formatDate } from '../lib/format.js';

const currentYear = new Date().getFullYear();
const emptyForage = { type: 'Forage', field_id: '', year: String(currentYear), price_per_ton: '', buyer_customer_id: '', stack_number: '', type_of_forage: '', forage_grade: '', cutting: '1st', tarp: 'No Tarp', bale_count: '', avg_bale_weight_lbs: '', actual_stack_tonnage: '', notes: '' };
const emptyGrain = { type: 'Grain', field_id: '', year: String(currentYear), price_per_ton: '', buyer_customer_id: '', type_crop: '', seed_details: '', estimated_total_tons: '', actual_tons: '' };
const emptyPriceForm = { price_per_ton: '', buyer_customer_id: '', effective_date: '', note: '' };
const TARP_OPTIONS = ['No Tarp', 'Top Tarp', 'Full Wrap'];
const CUTTINGS = ['1st', '2nd', '3rd', '4th', '5th'];
const typeLabel = (t) => t === 'Forage' ? 'Stacks' : 'Grain';
const fmtMoney = (n) => {
  if (n == null) return '—';
  const v = parseFloat(n);
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `-$${abs}` : `$${abs}`;
};

export default function Commodities() {
  const { isAdmin } = useFarm();
  const location = useLocation();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState([]);
  const [loads, setLoads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tab, setTab] = useState('Forage');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForage);
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [addingCropType, setAddingCropType] = useState(false);
  const [addingForageCommodity, setAddingForageCommodity] = useState(false);
  const [addingForageGrade, setAddingForageGrade] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [changingPrice, setChangingPrice] = useState(false);
  const [priceForm, setPriceForm] = useState(emptyPriceForm);
  const [savingPrice, setSavingPrice] = useState(false);

  const load = async () => {
    const [c, f, l, cust] = await Promise.all([api.commodities.list(), api.fields.list(), api.loads.list(), api.customers.list()]);
    setRows(c); setFields(f); setLoads(l); setCustomers(cust); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Deep-link support: opened from a Field's "Stacks & Grain" list
  useEffect(() => {
    const openId = location.state?.openCommodityId;
    if (!openId || rows.length === 0) return;
    const match = rows.find(r => r.id === openId);
    if (match) {
      setTab(match.type);
      setViewRow(match);
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [rows, location.state]);

  // Load price history whenever the detail view opens on a different row.
  // Clear synchronously first so a still-loading fetch for the new row
  // never renders against the previous row's stale history.
  useEffect(() => {
    setPriceHistory([]);
    if (!viewRow || !isAdmin) return;
    api.commodities.priceHistory(viewRow.id).then(setPriceHistory);
  }, [viewRow?.id, isAdmin]);

  const cropTypes = [...new Set(rows.filter(r => r.type === 'Grain' && r.type_crop).map(r => r.type_crop))].sort();
  const forageCommodities = [...new Set(rows.filter(r => r.type === 'Forage' && r.type_of_forage).map(r => r.type_of_forage))].sort();
  const forageGrades = [...new Set(rows.filter(r => r.type === 'Forage' && r.forage_grade).map(r => r.forage_grade))].sort();

  const openAdd = () => { setForm(tab === 'Forage' ? emptyForage : emptyGrain); setAddingCropType(false); setAddingForageCommodity(false); setAddingForageGrade(false); setModal('add'); };
  const openEdit = (row) => { setForm({ ...row, year: String(row.year || currentYear), price_per_ton: String(row.price_per_ton || ''), bale_count: String(row.bale_count || ''), avg_bale_weight_lbs: String(row.avg_bale_weight_lbs || ''), actual_stack_tonnage: String(row.actual_stack_tonnage || ''), estimated_total_tons: String(row.estimated_total_tons || ''), actual_tons: String(row.actual_tons || ''), tarp: row.tarp || 'No Tarp', notes: row.notes || '', forage_grade: row.forage_grade || '' }); setAddingCropType(false); setAddingForageCommodity(false); setAddingForageGrade(false); setModal({ edit: row }); };
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
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this commodity?')) return;
    await api.commodities.delete(id);
    setRows(r => r.filter(x => x.id !== id));
    setViewRow(null);
  };

  const openChangePrice = (row) => {
    setPriceForm({
      price_per_ton: String(row.price_per_ton || ''),
      buyer_customer_id: row.buyer_customer_id || '',
      effective_date: new Date().toISOString().slice(0, 10),
      note: '',
    });
    setChangingPrice(true);
  };

  const handleSavePrice = async () => {
    if (!priceForm.price_per_ton || !priceForm.effective_date) return;
    setSavingPrice(true);
    try {
      const updated = await api.commodities.setPrice(viewRow.id, {
        price_per_ton: parseFloat(priceForm.price_per_ton),
        buyer_customer_id: priceForm.buyer_customer_id || null,
        effective_date: priceForm.effective_date,
        note: priceForm.note || null,
      });
      setRows(rs => rs.map(r => r.id === updated.id ? updated : r));
      setViewRow(updated);
      setChangingPrice(false);
      api.commodities.priceHistory(updated.id).then(setPriceHistory);
    } catch (err) {
      alert(`Failed to save price: ${err.message}`);
    } finally { setSavingPrice(false); }
  };

  const toggleClosed = async () => {
    try {
      const updated = await api.commodities.setClosed(viewRow.id, !viewRow.is_closed);
      setRows(rs => rs.map(r => r.id === updated.id ? updated : r));
      setViewRow(updated);
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Resolves the price effective on a given load date from the currently
  // loaded price history - mirrors the server's fallback-to-earliest
  // logic so the per-load figures below always agree with the totals.
  const priceAtDate = (dateStr) => {
    if (!priceHistory.length) return null;
    const target = dateStr.slice(0, 10);
    const match = priceHistory.find(h => h.effective_date.slice(0, 10) <= target);
    return match ? parseFloat(match.price_per_ton) : parseFloat(priceHistory[priceHistory.length - 1].price_per_ton);
  };

  const fieldName = (id) => fields.find(f => f.id === id)?.field_name || '—';
  const customerName = (id) => customers.find(c => c.id === id)?.company_name || '—';
  const filtered = rows.filter(r => r.type === tab);
  const balesHauled = (id) => loads.filter(l => l.commodity_id === id).reduce((s, l) => s + (l.bale_count || 0), 0);
  const balesLeft = (row) => row.bale_count != null ? row.bale_count - balesHauled(row.id) : null;
  const tonsHauled = (id) => loads.filter(l => l.commodity_id === id).reduce((s, l) => s + (l.net_weight ? l.net_weight / 2000 : 0), 0);
  const tonsLeft = (row) => row.estimated_total_tons != null ? row.estimated_total_tons - tonsHauled(row.id) : null;

  const financialHeaders = ['Buyer', 'Price/Ton', 'Est. Value', 'Actual Value', 'Variance'];

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800">
                  {[...['Year', 'Stack #', 'Field', 'Commodity', 'Type', 'Cutting', 'Tarp', 'Bales', 'Est. Tons', 'Bales Left', 'Actual Tons'], ...(isAdmin ? financialHeaders : [])].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id} className={`table-row cursor-pointer ${row.is_closed ? 'opacity-60' : ''}`} onClick={() => setViewRow(row)}>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{row.year || '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-300">{row.stack_number || '—'}</td>
                    <td className="px-5 py-3 text-slate-200">{fieldName(row.field_id)}</td>
                    <td className="px-5 py-3 text-slate-200">
                      {row.type_of_forage}
                      {row.is_closed && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">Closed</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-300 text-xs">{row.forage_grade || '—'}</td>
                    <td className="px-5 py-3 text-slate-300 text-xs">{row.cutting}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{row.tarp || 'No Tarp'}</td>
                    <td className="px-5 py-3 text-slate-300 font-mono">{row.bale_count?.toLocaleString() || '—'}</td>
                    <td className="px-5 py-3 text-slate-300 font-mono">{row.estimated_stack_tonnage ? parseFloat(row.estimated_stack_tonnage).toFixed(1) : '—'}</td>
                    <td className="px-5 py-3 font-mono">{row.bale_count != null ? balesLeft(row).toLocaleString() : '—'}</td>
                    <td className="px-5 py-3">{row.actual_stack_tonnage ? <span className="text-emerald-400 font-mono">{parseFloat(row.actual_stack_tonnage).toFixed(1)}</span> : <span className="text-slate-600 text-xs">Pending</span>}</td>
                    {isAdmin && <>
                      <td className="px-5 py-3 text-slate-400 text-xs">{customerName(row.buyer_customer_id)}</td>
                      <td className="px-5 py-3 font-mono text-slate-300">
                        {row.price_per_ton ? `$${parseFloat(row.price_per_ton).toFixed(2)}` : '—'}
                        {row.price_changed && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 ml-1.5 align-middle" title="Price has changed since it was first set" />}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-300">{fmtMoney(row.estimated_value)}</td>
                      <td className="px-5 py-3 font-mono text-emerald-400">{fmtMoney(row.actual_value)}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{fmtMoney((parseFloat(row.estimated_value) || 0) - (parseFloat(row.actual_value) || 0))}</td>
                    </>}
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={isAdmin ? 16 : 11} className="px-5 py-12 text-center text-slate-500">No stacks yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800">
                  {[...['Year', 'Crop', 'Field', 'Seed', 'Est. Tons', 'Tons Left', 'Actual Tons'], ...(isAdmin ? financialHeaders : [])].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id} className={`table-row cursor-pointer ${row.is_closed ? 'opacity-60' : ''}`} onClick={() => setViewRow(row)}>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{row.year || '—'}</td>
                    <td className="px-5 py-3 font-medium text-slate-100">
                      {row.type_crop}
                      {row.is_closed && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">Closed</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-200">{fieldName(row.field_id)}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{row.seed_details || '—'}</td>
                    <td className="px-5 py-3 font-mono text-slate-300">{row.estimated_total_tons ? parseFloat(row.estimated_total_tons).toFixed(1) : '—'}</td>
                    <td className="px-5 py-3 font-mono">{row.estimated_total_tons != null ? tonsLeft(row).toFixed(1) : '—'}</td>
                    <td className="px-5 py-3">{row.actual_tons ? <span className="text-amber-400 font-mono">{parseFloat(row.actual_tons).toFixed(1)}</span> : <span className="text-slate-600 text-xs">Pending</span>}</td>
                    {isAdmin && <>
                      <td className="px-5 py-3 text-slate-400 text-xs">{customerName(row.buyer_customer_id)}</td>
                      <td className="px-5 py-3 font-mono text-slate-300">
                        {row.price_per_ton ? `$${parseFloat(row.price_per_ton).toFixed(2)}` : '—'}
                        {row.price_changed && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 ml-1.5 align-middle" title="Price has changed since it was first set" />}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-300">{fmtMoney(row.estimated_value)}</td>
                      <td className="px-5 py-3 font-mono text-emerald-400">{fmtMoney(row.actual_value)}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{fmtMoney((parseFloat(row.estimated_value) || 0) - (parseFloat(row.actual_value) || 0))}</td>
                    </>}
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={isAdmin ? 12 : 7} className="px-5 py-12 text-center text-slate-500">No grain fields yet.</td></tr>}
              </tbody>
            </table>
          </div>
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
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">Commodity</label>
                  {addingForageCommodity ? (
                    <div className="space-y-1">
                      <input className="input" name="type_of_forage" value={form.type_of_forage} onChange={handleChange} placeholder="Alfalfa, Timothy…" autoFocus />
                      {forageCommodities.length > 0 && (
                        <button type="button" className="text-xs text-soil-400 hover:text-soil-300" onClick={() => { setAddingForageCommodity(false); setForm(f => ({ ...f, type_of_forage: '' })); }}>
                          Choose existing
                        </button>
                      )}
                    </div>
                  ) : (
                    <select
                      className="input"
                      value={form.type_of_forage}
                      onChange={e => {
                        if (e.target.value === '__new__') { setAddingForageCommodity(true); setForm(f => ({ ...f, type_of_forage: '' })); }
                        else setForm(f => ({ ...f, type_of_forage: e.target.value }));
                      }}
                    >
                      <option value="">Select commodity…</option>
                      {forageCommodities.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__new__">+ Add new commodity…</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="label">Type</label>
                  {addingForageGrade ? (
                    <div className="space-y-1">
                      <input className="input" name="forage_grade" value={form.forage_grade} onChange={handleChange} placeholder="Premium, Dairy Quality…" autoFocus />
                      {forageGrades.length > 0 && (
                        <button type="button" className="text-xs text-soil-400 hover:text-soil-300" onClick={() => { setAddingForageGrade(false); setForm(f => ({ ...f, forage_grade: '' })); }}>
                          Choose existing
                        </button>
                      )}
                    </div>
                  ) : (
                    <select
                      className="input"
                      value={form.forage_grade}
                      onChange={e => {
                        if (e.target.value === '__new__') { setAddingForageGrade(true); setForm(f => ({ ...f, forage_grade: '' })); }
                        else setForm(f => ({ ...f, forage_grade: e.target.value }));
                      }}
                    >
                      <option value="">Select type…</option>
                      {forageGrades.map(g => <option key={g} value={g}>{g}</option>)}
                      <option value="__new__">+ Add new type…</option>
                    </select>
                  )}
                </div>
                <div><label className="label">Cutting</label>
                  <select className="input" name="cutting" value={form.cutting} onChange={handleChange}>
                    {CUTTINGS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">Tarp</label>
                  <select className="input" name="tarp" value={form.tarp} onChange={handleChange}>
                    {TARP_OPTIONS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Bale Count</label><input className="input" type="number" name="bale_count" value={form.bale_count} onChange={handleChange} placeholder="240" /></div>
                <div><label className="label">Avg Bale Weight (lbs)</label><input className="input" type="number" name="avg_bale_weight_lbs" value={form.avg_bale_weight_lbs} onChange={handleChange} placeholder="1200" /></div>
              </div>
              <div>
                <label className="label">Actual Stack Tonnage</label>
                <input className="input" type="number" name="actual_stack_tonnage" value={form.actual_stack_tonnage} onChange={handleChange} placeholder="Auto-updates from loads" />
              </div>
              {isAdmin && modal === 'add' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <div><label className="label">Initial Price per Ton ($)</label><input className="input" type="number" name="price_per_ton" value={form.price_per_ton} onChange={handleChange} placeholder="180.00" step="0.01" /></div>
                  <div><label className="label">Buyer</label>
                    <select className="input" name="buyer_customer_id" value={form.buyer_customer_id} onChange={handleChange}>
                      <option value="">Select buyer (optional)…</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {isAdmin && modal !== 'add' && (
                <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700">
                  Price and buyer are changed from the stack's detail view, not here — every change is logged with an effective date.
                </div>
              )}
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={3} name="notes" value={form.notes} onChange={handleChange} placeholder="Anything worth noting about this stack…" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Year</label><input className="input" type="number" name="year" value={form.year} onChange={handleChange} placeholder={String(currentYear)} /></div>
                <div>
                  <label className="label">Crop Type</label>
                  {addingCropType ? (
                    <div className="space-y-1">
                      <input className="input" name="type_crop" value={form.type_crop} onChange={handleChange} placeholder="Winter Wheat, Barley…" autoFocus />
                      {cropTypes.length > 0 && (
                        <button type="button" className="text-xs text-soil-400 hover:text-soil-300" onClick={() => { setAddingCropType(false); setForm(f => ({ ...f, type_crop: '' })); }}>
                          Choose existing
                        </button>
                      )}
                    </div>
                  ) : (
                    <select
                      className="input"
                      value={form.type_crop}
                      onChange={e => {
                        if (e.target.value === '__new__') { setAddingCropType(true); setForm(f => ({ ...f, type_crop: '' })); }
                        else setForm(f => ({ ...f, type_crop: e.target.value }));
                      }}
                    >
                      <option value="">Select crop…</option>
                      {cropTypes.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__new__">+ Add new crop type…</option>
                    </select>
                  )}
                </div>
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
              <div>
                <label className="label">Actual Tons</label>
                <input className="input" type="number" name="actual_tons" value={form.actual_tons} onChange={handleChange} placeholder="Auto-updates from loads" />
              </div>
              {isAdmin && modal === 'add' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <div><label className="label">Initial Price per Ton ($)</label><input className="input" type="number" name="price_per_ton" value={form.price_per_ton} onChange={handleChange} placeholder="280.00" step="0.01" /></div>
                  <div><label className="label">Buyer</label>
                    <select className="input" name="buyer_customer_id" value={form.buyer_customer_id} onChange={handleChange}>
                      <option value="">Select buyer (optional)…</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {isAdmin && modal !== 'add' && (
                <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700">
                  Price and buyer are changed from the crop's detail view, not here — every change is logged with an effective date.
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : `Save ${form.type === 'Forage' ? 'Stack' : 'Grain'}`}</button>
            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
          </div>
        </Modal>
      )}

      {viewRow && (() => {
        const matchingLoads = loads.filter(l => l.commodity_id === viewRow.id).sort((a, b) => new Date(b.date) - new Date(a.date));
        const cols = (viewRow.type === 'Forage' ? 4 : 3) + (isAdmin ? 1 : 0);
        const variance = (parseFloat(viewRow.estimated_value) || 0) - (parseFloat(viewRow.actual_value) || 0);
        return (
          <Modal
            title={viewRow.type === 'Forage' ? (viewRow.stack_number || viewRow.type_of_forage) : viewRow.type_crop}
            onClose={() => setViewRow(null)}
            wide
          >
            <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className={viewRow.type === 'Forage' ? 'badge-forage' : 'badge-grain'}>{typeLabel(viewRow.type)}</span>
                <span className="text-slate-400">{viewRow.year}</span>
                {viewRow.is_closed && <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">Closed</span>}
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <button className="btn-secondary !px-2 !py-1" onClick={toggleClosed} title={viewRow.is_closed ? 'Reopen' : 'Mark Closed'}>
                    {viewRow.is_closed ? <Unlock size={13} /> : <Lock size={13} />}
                  </button>
                )}
                <button className="btn-secondary !px-2 !py-1" onClick={() => { openEdit(viewRow); setViewRow(null); }}><Pencil size={13} /></button>
                {isAdmin && <button className="btn-danger" onClick={() => handleDelete(viewRow.id)}><Trash2 size={13} /></button>}
              </div>
            </div>

            {viewRow.type === 'Forage' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-5 pb-4 border-b border-slate-800">
                <div><div className="label">Field</div><div className="text-slate-100">{fieldName(viewRow.field_id)}</div></div>
                <div><div className="label">Stack #</div><div className="text-slate-100">{viewRow.stack_number || '—'}</div></div>
                <div><div className="label">Commodity</div><div className="text-slate-100">{viewRow.type_of_forage || '—'}</div></div>
                <div><div className="label">Type</div><div className="text-slate-100">{viewRow.forage_grade || '—'}</div></div>
                <div><div className="label">Cutting</div><div className="text-slate-100">{viewRow.cutting || '—'}</div></div>
                <div><div className="label">Tarp</div><div className="text-slate-100">{viewRow.tarp || 'No Tarp'}</div></div>
                <div><div className="label">Bale Count</div><div className="font-mono text-slate-100">{viewRow.bale_count?.toLocaleString() ?? '—'}</div></div>
                <div><div className="label">Bales Left</div><div className="font-mono text-slate-100">{viewRow.bale_count != null ? balesLeft(viewRow).toLocaleString() : '—'}</div></div>
                <div><div className="label">Est. Tons</div><div className="font-mono text-slate-100">{viewRow.estimated_stack_tonnage ? parseFloat(viewRow.estimated_stack_tonnage).toFixed(1) : '—'}</div></div>
                <div><div className="label">Actual Tons</div><div className="font-mono text-slate-100">{viewRow.actual_stack_tonnage ? parseFloat(viewRow.actual_stack_tonnage).toFixed(1) : '—'}</div></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-5 pb-4 border-b border-slate-800">
                <div><div className="label">Field</div><div className="text-slate-100">{fieldName(viewRow.field_id)}</div></div>
                <div><div className="label">Crop Type</div><div className="text-slate-100">{viewRow.type_crop || '—'}</div></div>
                <div><div className="label">Seed Variety</div><div className="text-slate-100">{viewRow.seed_details || '—'}</div></div>
                <div><div className="label">Est. Tons</div><div className="font-mono text-slate-100">{viewRow.estimated_total_tons ? parseFloat(viewRow.estimated_total_tons).toFixed(1) : '—'}</div></div>
                <div><div className="label">Tons Left</div><div className="font-mono text-slate-100">{viewRow.estimated_total_tons != null ? tonsLeft(viewRow).toFixed(1) : '—'}</div></div>
                <div><div className="label">Actual Tons</div><div className="font-mono text-slate-100">{viewRow.actual_tons ? parseFloat(viewRow.actual_tons).toFixed(1) : '—'}</div></div>
              </div>
            )}

            {viewRow.type === 'Forage' && (
              <div className="mb-5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</div>
                <div className="text-sm text-slate-300 whitespace-pre-wrap">{viewRow.notes || 'No notes.'}</div>
              </div>
            )}

            {isAdmin && (
              <div className="mb-5 pb-5 border-b border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contracted Value</div>
                  {!changingPrice && (
                    <button className="text-xs text-soil-400 hover:text-soil-300" onClick={() => openChangePrice(viewRow)}>Change Price</button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><div className="label">Buyer</div><div className="text-slate-100">{customerName(viewRow.buyer_customer_id)}</div></div>
                  <div><div className="label">Current Price/Ton</div><div className="font-mono text-slate-100">{viewRow.price_per_ton ? `$${parseFloat(viewRow.price_per_ton).toFixed(2)}` : '—'}</div></div>
                  <div><div className="label">Estimated Value</div><div className="font-mono text-slate-100 font-medium">{fmtMoney(viewRow.estimated_value)}</div></div>
                  <div><div className="label">Actual Value</div><div className="font-mono text-emerald-400 font-medium">{fmtMoney(viewRow.actual_value)}</div></div>
                </div>
                <div className="text-xs text-slate-500 mt-2">Variance (unshipped tonnage at current price): <span className="font-mono text-slate-300">{fmtMoney(variance)}</span></div>

                {changingPrice && (
                  <div className="mt-4 p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
                    <div className="text-xs text-slate-400 font-medium">New Price / Buyer</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className="input" type="number" step="0.01" placeholder="Price per ton" value={priceForm.price_per_ton} onChange={e => setPriceForm(f => ({ ...f, price_per_ton: e.target.value }))} autoFocus />
                      <input className="input" type="date" value={priceForm.effective_date} onChange={e => setPriceForm(f => ({ ...f, effective_date: e.target.value }))} />
                    </div>
                    <select className="input" value={priceForm.buyer_customer_id} onChange={e => setPriceForm(f => ({ ...f, buyer_customer_id: e.target.value }))}>
                      <option value="">Select buyer (optional)…</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                    <input className="input" placeholder="Note (optional) — e.g. renegotiated after harvest" value={priceForm.note} onChange={e => setPriceForm(f => ({ ...f, note: e.target.value }))} />
                    <div className="flex gap-2">
                      <button className="btn-primary !py-1 text-xs" onClick={handleSavePrice} disabled={savingPrice}>{savingPrice ? 'Saving…' : 'Save Price Change'}</button>
                      <button className="btn-secondary !py-1 text-xs" onClick={() => setChangingPrice(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                {priceHistory.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Price History</div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800">
                          {['Effective', 'Price/Ton', 'Buyer', 'Note'].map(h => (
                            <th key={h} className="text-left px-2 py-1.5 text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistory.map(h => (
                          <tr key={h.id} className="border-b border-slate-800/50 last:border-0">
                            <td className="px-2 py-1.5 font-mono text-slate-400">{formatDate(h.effective_date)}</td>
                            <td className="px-2 py-1.5 font-mono text-slate-200">${parseFloat(h.price_per_ton).toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-slate-300">{h.buyer_name || '—'}</td>
                            <td className="px-2 py-1.5 text-slate-400">{h.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Loads</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {[
                    ...(viewRow.type === 'Forage' ? ['Date', 'Customer', 'Bales', 'Tons'] : ['Date', 'Customer', 'Tons']),
                    ...(isAdmin ? ['Value'] : []),
                  ].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matchingLoads.map(l => {
                  const tons = l.net_weight ? l.net_weight / 2000 : null;
                  const historicalPrice = tons ? priceAtDate(l.date) : null;
                  const value = tons && historicalPrice != null ? tons * historicalPrice : null;
                  return (
                    <tr key={l.id} className="table-row">
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">{formatDate(l.date)}</td>
                      <td className="px-3 py-2 text-slate-200">{l.customer_name || '—'}</td>
                      {viewRow.type === 'Forage' && (
                        <td className="px-3 py-2 font-mono text-slate-300">{l.bale_count?.toLocaleString() || '—'}</td>
                      )}
                      <td className="px-3 py-2 font-mono text-slate-100">{tons ? tons.toFixed(2) : '—'}</td>
                      {isAdmin && <td className="px-3 py-2 font-mono text-emerald-400">{value != null ? `$${value.toFixed(2)}` : '—'}</td>}
                    </tr>
                  );
                })}
                {matchingLoads.length === 0 && (
                  <tr><td colSpan={cols} className="px-3 py-8 text-center text-slate-500">No loads logged against this {viewRow.type === 'Forage' ? 'stack' : 'crop'} yet.</td></tr>
                )}
              </tbody>
              {isAdmin && matchingLoads.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-700 bg-slate-900/50">
                    <td colSpan={cols - 1} className="px-3 py-2 text-xs text-slate-400 font-medium text-right">Actual Value</td>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-300">{fmtMoney(viewRow.actual_value)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
            {isAdmin && !viewRow.price_per_ton && (
              <div className="text-xs text-slate-500 mt-3">Set a Price per Ton on this {viewRow.type === 'Forage' ? 'stack' : 'crop'} to calculate value automatically.</div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}
