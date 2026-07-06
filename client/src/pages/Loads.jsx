import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useFarm } from '../context/FarmContext.jsx';
import { Plus, Pencil, Trash2, Filter, FileImage, Calendar, CheckCircle } from 'lucide-react';
import ImageUpload from '../components/ImageUpload.jsx';
import { formatDate } from '../lib/format.js';

const emptyLoad = {
  date: '', customerId: '', commodityId: '', fieldId: '', shipper: '',
  type: 'Forage', baleCount: '', grossWeight: '', tareWeight: '', netWeight: '',
  driver: '', truckNumber: '', bolNumber: '',
  bol_url: '', scale_ticket_url: '', misc_url: '',
};

// Inline quick-add sub-forms
function QuickAddCustomer({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const c = await api.customers.create({ company_name: name });
      onSave(c);
    } finally { setSaving(false); }
  };
  return (
    <div className="mt-2 p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
      <div className="text-xs text-slate-400 font-medium">New Customer</div>
      <input className="input" placeholder="Company name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <div className="flex gap-2">
        <button className="btn-primary !py-1 text-xs" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
        <button className="btn-secondary !py-1 text-xs" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function QuickAddField({ onSave, onCancel }) {
  const [form, setForm] = useState({ field_name: '', acres: '' });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!form.field_name) return;
    setSaving(true);
    try {
      const f = await api.fields.create({ field_name: form.field_name, acres: parseFloat(form.acres) || null });
      onSave(f);
    } finally { setSaving(false); }
  };
  return (
    <div className="mt-2 p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
      <div className="text-xs text-slate-400 font-medium">New Field</div>
      <input className="input" placeholder="Field name" value={form.field_name} onChange={e => setForm(f => ({ ...f, field_name: e.target.value }))} autoFocus />
      <input className="input" placeholder="Acres (optional)" type="number" value={form.acres} onChange={e => setForm(f => ({ ...f, acres: e.target.value }))} />
      <div className="flex gap-2">
        <button className="btn-primary !py-1 text-xs" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
        <button className="btn-secondary !py-1 text-xs" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function QuickAddCommodity({ type, fields, onSave, onCancel }) {
  const [form, setForm] = useState({ type, field_id: '', type_of_forage: '', cutting: '1st', stack_number: '', bale_count: '', avg_bale_weight_lbs: '', type_crop: '', seed_details: '', estimated_total_tons: '' });
  const [saving, setSaving] = useState(false);
  const displayType = type === 'Forage' ? 'Stack' : type;
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (type === 'Forage' && payload.bale_count && payload.avg_bale_weight_lbs) {
        payload.estimated_stack_tonnage = (parseInt(payload.bale_count) * parseFloat(payload.avg_bale_weight_lbs)) / 2000;
      }
      const c = await api.commodities.create(payload);
      onSave(c);
    } finally { setSaving(false); }
  };
  return (
    <div className="mt-2 p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
      <div className="text-xs text-slate-400 font-medium">New {displayType} Commodity</div>
      <select className="input" value={form.field_id} onChange={e => setForm(f => ({ ...f, field_id: e.target.value }))}>
        <option value="">Field (optional)</option>
        {fields.map(f => <option key={f.id} value={f.id}>{f.field_name}</option>)}
      </select>
      {type === 'Forage' ? <>
        <input className="input" placeholder="Stack type (Alfalfa, Timothy…)" value={form.type_of_forage} onChange={e => setForm(f => ({ ...f, type_of_forage: e.target.value }))} autoFocus />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Stack # (optional)" value={form.stack_number} onChange={e => setForm(f => ({ ...f, stack_number: e.target.value }))} />
          <select className="input" value={form.cutting} onChange={e => setForm(f => ({ ...f, cutting: e.target.value }))}>
            {['1st','2nd','3rd','4th','5th'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Bale count" type="number" value={form.bale_count} onChange={e => setForm(f => ({ ...f, bale_count: e.target.value }))} />
          <input className="input" placeholder="Avg bale wt (lbs)" type="number" value={form.avg_bale_weight_lbs} onChange={e => setForm(f => ({ ...f, avg_bale_weight_lbs: e.target.value }))} />
        </div>
      </> : <>
        <input className="input" placeholder="Crop type (Wheat, Barley…)" value={form.type_crop} onChange={e => setForm(f => ({ ...f, type_crop: e.target.value }))} autoFocus />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Seed variety (optional)" value={form.seed_details} onChange={e => setForm(f => ({ ...f, seed_details: e.target.value }))} />
          <input className="input" placeholder="Estimated tons" type="number" value={form.estimated_total_tons} onChange={e => setForm(f => ({ ...f, estimated_total_tons: e.target.value }))} />
        </div>
      </>}
      <div className="flex gap-2">
        <button className="btn-primary !py-1 text-xs" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
        <button className="btn-secondary !py-1 text-xs" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function Loads() {
  const { farm, role } = useFarm();
  const isAdmin = role === 'admin';
  const canManageSupportingRecords = role !== 'trucker';
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [fields, setFields] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyLoad);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [quickAdd, setQuickAdd] = useState(null); // 'customer' | 'field' | 'commodity'
  const [viewRow, setViewRow] = useState(null);

  const loadData = async () => {
    const [l, c, f, co] = await Promise.all([
      api.loads.list(), api.customers.list(), api.fields.list(), api.commodities.list()
    ]);
    setRows(l); setCustomers(c); setFields(f); setCommodities(co);
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const openAdd = () => {
    setForm({
      ...emptyLoad,
      date: new Date().toISOString().slice(0, 10),
      shipper: farm?.name || '',
    });
    setQuickAdd(null);
    setModal('add');
  };
  const openEdit = (row) => {
    setForm({
      date: row.date ? row.date.slice(0, 10) : '',
      customerId: row.customer_id || '',
      commodityId: row.commodity_id || '',
      fieldId: row.field_id || '',
      shipper: row.shipper || '',
      type: row.type || 'Forage',
      baleCount: row.bale_count ?? '',
      grossWeight: row.gross_weight ?? '',
      tareWeight: row.tare_weight ?? '',
      netWeight: row.net_weight ?? '',
      driver: row.driver || '',
      truckNumber: row.truck_number || '',
      bolNumber: row.bol_number || '',
      bol_url: row.bol_url || '',
      scale_ticket_url: row.scale_ticket_url || '',
      misc_url: row.misc_url || '',
    });
    setQuickAdd(null);
    setModal({ edit: row });
  };
  const closeModal = () => { setModal(null); setQuickAdd(null); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      if (['grossWeight', 'tareWeight'].includes(name)) {
        const gross = parseFloat(name === 'grossWeight' ? value : f.grossWeight) || 0;
        const tare = parseFloat(name === 'tareWeight' ? value : f.tareWeight) || 0;
        next.netWeight = gross > 0 && tare > 0 ? String(gross - tare) : f.netWeight;
      }
      return next;
    });
  };

  const typeLabel = (t) => t === 'Forage' ? 'Stacks' : 'Grain';

  const handleSave = async () => {
    if (!form.date || !form.customerId) return;
    setSaving(true);
    const payload = {
      date: form.date,
      customer_id: form.customerId || null,
      commodity_id: form.commodityId || null,
      field_id: form.fieldId || null,
      shipper: form.shipper,
      type: form.type,
      bale_count: form.baleCount ? parseInt(form.baleCount) : null,
      gross_weight: parseFloat(form.grossWeight) || null,
      tare_weight: parseFloat(form.tareWeight) || null,
      net_weight: parseFloat(form.netWeight) || null,
      driver: form.driver,
      truck_number: form.truckNumber,
      bol_number: form.bolNumber || null,
      bol_url: form.bol_url || null,
      scale_ticket_url: form.scale_ticket_url || null,
      misc_url: form.misc_url || null,
    };
    try {
      if (modal === 'add') await api.loads.create(payload);
      else await api.loads.update(modal.edit.id, payload);
      await loadData(); closeModal();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this load?')) return;
    await api.loads.delete(id);
    setRows(r => r.filter(x => x.id !== id));
    setViewRow(null);
  };

  // Quick-add callbacks
  const onCustomerAdded = (c) => {
    setCustomers(prev => [...prev, c]);
    setForm(f => ({ ...f, customerId: c.id }));
    setQuickAdd(null);
  };
  const onFieldAdded = (f) => {
    setFields(prev => [...prev, f]);
    setForm(frm => ({ ...frm, fieldId: f.id }));
    setQuickAdd(null);
  };
  const onCommodityAdded = (c) => {
    setCommodities(prev => [...prev, c]);
    setForm(f => ({ ...f, commodityId: c.id }));
    setQuickAdd(null);
  };

  const filtered = rows.filter(r => {
    if (filterType !== 'All' && r.type !== filterType) return false;
    if (filterStatus === 'New' && r.net_weight) return false;
    if (filterStatus === 'Complete' && !r.net_weight) return false;
    const rowDate = r.date ? r.date.slice(0, 10) : '';
    if (dateFrom && rowDate < dateFrom) return false;
    if (dateTo && rowDate > dateTo) return false;
    return true;
  });
  const sortedRows = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  const filteredCommodities = commodities.filter(c => c.type === form.type);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Loads"
        subtitle={`${rows.length} total haul tickets`}
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={15} /> New Load
          </button>
        }
      />

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Filter size={14} className="text-slate-500" />
        {['All', 'Forage', 'Grain'].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === t ? 'bg-soil-500/30 text-soil-300 border border-soil-600' : 'text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            {t === 'All' ? 'All' : typeLabel(t)} {t !== 'All' && `(${rows.filter(r => r.type === t).length})`}
          </button>
        ))}

        <span className="w-px h-5 bg-slate-800 mx-1" />

        {['All', 'New', 'Complete'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === s
                ? s === 'New'
                  ? 'bg-amber-900/40 text-amber-400 border border-amber-700'
                  : s === 'Complete'
                    ? 'bg-green-900/40 text-green-400 border border-green-700'
                    : 'bg-soil-500/30 text-soil-300 border border-soil-600'
                : 'text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            {s} {s !== 'All' && `(${rows.filter(r => s === 'New' ? !r.net_weight : r.net_weight).length})`}
          </button>
        ))}

        <span className="w-px h-5 bg-slate-800 mx-1" />

        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-slate-500 shrink-0" />
          <input
            type="date"
            className="input !w-auto !py-1.5 text-xs"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-slate-600 text-xs">to</span>
          <input
            type="date"
            className="input !w-auto !py-1.5 text-xs"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
          {(dateFrom || dateTo) && (
            <button
              className="text-xs text-slate-500 hover:text-slate-300"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800">
                  {['', 'Status', 'Date', 'Customer', 'Field', 'Type', 'Bales', 'BOL #', 'Shipper', 'Driver / Truck', 'Gross', 'Tare', 'Net (lbs)', 'Tons'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(row => (
                  <tr key={row.id} className="table-row cursor-pointer" onClick={() => setViewRow(row)}>
                    <td className="px-4 py-3">
                      {!row.net_weight && (
                        <button
                          className="text-slate-500 hover:text-green-400 transition-colors"
                          title="Complete this load"
                          onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.net_weight
                        ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-900/40 text-green-400 border border-green-800/50">Complete</span>
                        : <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-900/40 text-amber-400 border border-amber-800/50">New</span>
                      }
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 text-slate-200">{row.customer_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{row.field_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{typeLabel(row.type)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{row.type === 'Forage' ? (row.bale_count ?? '—') : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{row.bol_number || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{row.shipper || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {row.driver && <span>{row.driver}</span>}
                      {row.truck_number && <span className="ml-1 font-mono text-slate-500">#{row.truck_number}</span>}
                      {!row.driver && !row.truck_number && '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">{row.gross_weight?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">{row.tare_weight?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-100">{row.net_weight?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">{row.net_weight ? (row.net_weight / 2000).toFixed(2) : '—'}</td>
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr><td colSpan={14} className="px-4 py-12 text-center text-slate-500">No loads logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Create Load' : 'Edit Load'} onClose={closeModal} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date *</label>
                <input className="input" type="date" name="date" value={form.date} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" name="type" value={form.type} onChange={handleChange}>
                  <option value="Forage">Stacks</option>
                  <option value="Grain">Grain</option>
                </select>
              </div>
            </div>

            {/* Customer with quick-add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Customer *</label>
                {quickAdd !== 'customer' && canManageSupportingRecords && (
                  <button className="text-xs text-soil-400 hover:text-soil-300" onClick={() => setQuickAdd('customer')}>
                    + New Customer
                  </button>
                )}
              </div>
              <select className="input" name="customerId" value={form.customerId} onChange={handleChange}>
                <option value="">Select…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
              {quickAdd === 'customer' && (
                <QuickAddCustomer onSave={onCustomerAdded} onCancel={() => setQuickAdd(null)} />
              )}
            </div>

            {/* Field with quick-add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Field</label>
                {quickAdd !== 'field' && isAdmin && (
                  <button className="text-xs text-soil-400 hover:text-soil-300" onClick={() => setQuickAdd('field')}>
                    + New Field
                  </button>
                )}
              </div>
              <select className="input" name="fieldId" value={form.fieldId} onChange={handleChange}>
                <option value="">Select…</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.field_name}</option>)}
              </select>
              {quickAdd === 'field' && (
                <QuickAddField onSave={onFieldAdded} onCancel={() => setQuickAdd(null)} />
              )}
            </div>

            {/* Commodity with quick-add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Commodity</label>
                {quickAdd !== 'commodity' && canManageSupportingRecords && (
                  <button className="text-xs text-soil-400 hover:text-soil-300" onClick={() => setQuickAdd('commodity')}>
                    + New Commodity
                  </button>
                )}
              </div>
              <select className="input" name="commodityId" value={form.commodityId} onChange={handleChange}>
                <option value="">Select…</option>
                {filteredCommodities.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.type === 'Forage'
                      ? `${c.stack_number || c.type_of_forage} (${c.type_of_forage || ''})`
                      : c.type_crop}
                  </option>
                ))}
              </select>
              {quickAdd === 'commodity' && (
                <QuickAddCommodity
                  type={form.type}
                  fields={fields}
                  onSave={onCommodityAdded}
                  onCancel={() => setQuickAdd(null)}
                />
              )}
            </div>

            {/* Shipper - defaults to farm name */}
            <div>
              <label className="label">Shipper</label>
              <input className="input" name="shipper" value={form.shipper} onChange={handleChange} placeholder="Trucking company" />
              {form.shipper === farm?.name && (
                <div className="text-xs text-slate-500 mt-1">Defaulted to your farm name</div>
              )}
            </div>

            {/* Additional fields only shown when editing */}
            {modal !== 'add' && <>
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Driver</label>
                  <input className="input" name="driver" value={form.driver} onChange={handleChange} placeholder="Driver name" />
                </div>
                <div>
                  <label className="label">Truck #</label>
                  <input className="input" name="truckNumber" value={form.truckNumber} onChange={handleChange} placeholder="T-44" />
                </div>
                <div>
                  <label className="label">BOL #</label>
                  <input className="input" name="bolNumber" value={form.bolNumber} onChange={handleChange} placeholder="BOL-1234" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Paperwork</div>
                <div className="grid grid-cols-3 gap-3">
                  <ImageUpload
                    label="BOL"
                    value={form.bol_url}
                    onChange={url => setForm(f => ({ ...f, bol_url: url }))}
                  />
                  <ImageUpload
                    label="Scale Ticket"
                    value={form.scale_ticket_url}
                    onChange={url => setForm(f => ({ ...f, scale_ticket_url: url }))}
                  />
                  <ImageUpload
                    label="Misc Paperwork"
                    value={form.misc_url}
                    onChange={url => setForm(f => ({ ...f, misc_url: url }))}
                  />
                </div>
              </div>
            </>}

            {modal === 'add' && (
              <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700">
                Weight, driver, and paperwork can be added later when the driver completes the load.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Create Load' : 'Save Load'}
              </button>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {viewRow && (
        <Modal title={`Load — ${formatDate(viewRow.date)}`} onClose={() => setViewRow(null)} wide>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              {viewRow.net_weight
                ? <span className="px-2.5 py-1 rounded text-xs font-semibold bg-green-900/40 text-green-400 border border-green-800/50">Complete</span>
                : <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-900/40 text-amber-400 border border-amber-800/50">New — awaiting delivery info</span>
              }
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="label">Customer</div><div className="text-slate-100">{viewRow.customer_name || '—'}</div></div>
              <div><div className="label">Field</div><div className="text-slate-100">{viewRow.field_name || '—'}</div></div>
              <div><div className="label">Type</div><div className="text-slate-100">{typeLabel(viewRow.type)}</div></div>
              <div><div className="label">Bales</div><div className="font-mono text-slate-100">{viewRow.type === 'Forage' ? (viewRow.bale_count ?? '—') : '—'}</div></div>
              <div><div className="label">Shipper</div><div className="text-slate-100">{viewRow.shipper || '—'}</div></div>
              <div><div className="label">Driver</div><div className="text-slate-100">{viewRow.driver || '—'}</div></div>
              <div><div className="label">Truck #</div><div className="text-slate-100">{viewRow.truck_number || '—'}</div></div>
              <div><div className="label">BOL #</div><div className="font-mono text-slate-100">{viewRow.bol_number || '—'}</div></div>
            </div>

            <div className="grid grid-cols-4 gap-4 text-sm pt-2 border-t border-slate-800">
              <div><div className="label">Gross</div><div className="font-mono text-slate-100">{viewRow.gross_weight?.toLocaleString() || '—'}</div></div>
              <div><div className="label">Tare</div><div className="font-mono text-slate-100">{viewRow.tare_weight?.toLocaleString() || '—'}</div></div>
              <div><div className="label">Net (lbs)</div><div className="font-mono text-slate-100 font-medium">{viewRow.net_weight?.toLocaleString() || '—'}</div></div>
              <div><div className="label">Tons</div><div className="font-mono text-slate-100">{viewRow.net_weight ? (viewRow.net_weight / 2000).toFixed(2) : '—'}</div></div>
            </div>

            {(viewRow.bol_url || viewRow.scale_ticket_url || viewRow.misc_url) && (
              <div className="pt-2 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Paperwork</div>
                <div className="grid grid-cols-3 gap-3">
                  {[['BOL', viewRow.bol_url], ['Scale Ticket', viewRow.scale_ticket_url], ['Misc', viewRow.misc_url]].map(([label, url]) => (
                    url ? (
                      <a key={label} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors text-xs text-slate-300">
                        <FileImage size={16} className="text-soil-400 shrink-0" /> {label}
                      </a>
                    ) : null
                  ))}
                </div>
              </div>
            )}

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
