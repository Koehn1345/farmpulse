import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import { useFarm } from '../context/FarmContext.jsx';
import { Plus, CheckCircle } from 'lucide-react';
import ImageUpload from '../components/ImageUpload.jsx';

function QuickAddCustomer({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!name) return;
    setSaving(true);
    try { const c = await api.customers.create({ company_name: name }); onSave(c); }
    finally { setSaving(false); }
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
    try { const f = await api.fields.create({ field_name: form.field_name, acres: parseFloat(form.acres) || null }); onSave(f); }
    finally { setSaving(false); }
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
  const [form, setForm] = useState({ type, field_id: '', type_of_forage: '', cutting: '1st', stack_number: '', bale_count: '', avg_bale_weight_lbs: '', type_crop: '', seed_details: '' });
  const [saving, setSaving] = useState(false);
  const displayType = type === 'Forage' ? 'Stacks' : type;
  const handleSave = async () => {
    setSaving(true);
    try { const c = await api.commodities.create(form); onSave(c); }
    finally { setSaving(false); }
  };
  return (
    <div className="mt-2 p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
      <div className="text-xs text-slate-400 font-medium">New {displayType} Commodity</div>
      <select className="input" value={form.field_id} onChange={e => setForm(f => ({ ...f, field_id: e.target.value }))}>
        <option value="">Field (optional)</option>
        {fields.map(f => <option key={f.id} value={f.id}>{f.field_name}</option>)}
      </select>
      {type === 'Forage' ? <>
        <input className="input" placeholder="Stack type (Alfalfa…)" value={form.type_of_forage} onChange={e => setForm(f => ({ ...f, type_of_forage: e.target.value }))} autoFocus />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Stack #" value={form.stack_number} onChange={e => setForm(f => ({ ...f, stack_number: e.target.value }))} />
          <select className="input" value={form.cutting} onChange={e => setForm(f => ({ ...f, cutting: e.target.value }))}>
            {['1st','2nd','3rd','4th','5th'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </> : <>
        <input className="input" placeholder="Crop type (Wheat…)" value={form.type_crop} onChange={e => setForm(f => ({ ...f, type_crop: e.target.value }))} autoFocus />
      </>}
      <div className="flex gap-2">
        <button className="btn-primary !py-1 text-xs" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
        <button className="btn-secondary !py-1 text-xs" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function EmployeeLoads() {
  const { farm } = useFarm();
  const [recentLoads, setRecentLoads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [fields, setFields] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'Forage', customerId: '', fieldId: '', commodityId: '',
    shipper: '', baleCount: '', grossWeight: '', tareWeight: '', netWeight: '',
    driver: '', truckNumber: '',
    bol_url: '', scale_ticket_url: '', misc_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [quickAdd, setQuickAdd] = useState(null);

  const loadData = async () => {
    const [l, c, f, co] = await Promise.all([
      api.loads.list(), api.customers.list(), api.fields.list(), api.commodities.list()
    ]);
    setRecentLoads(l.slice(0, 10));
    setCustomers(c); setFields(f); setCommodities(co);
  };

  useEffect(() => { loadData(); }, []);

  // Default shipper to farm name when farm loads
  useEffect(() => {
    if (farm?.name) setForm(f => ({ ...f, shipper: farm.name }));
  }, [farm?.name]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      if (['grossWeight', 'tareWeight'].includes(name)) {
        const gross = parseFloat(name === 'grossWeight' ? value : f.grossWeight) || 0;
        const tare = parseFloat(name === 'tareWeight' ? value : f.tareWeight) || 0;
        if (gross && tare) next.netWeight = String(gross - tare);
      }
      return next;
    });
  };

  const onCustomerAdded = (c) => { setCustomers(prev => [...prev, c]); setForm(f => ({ ...f, customerId: c.id })); setQuickAdd(null); };
  const onFieldAdded = (f) => { setFields(prev => [...prev, f]); setForm(frm => ({ ...frm, fieldId: f.id })); setQuickAdd(null); };
  const onCommodityAdded = (c) => { setCommodities(prev => [...prev, c]); setForm(f => ({ ...f, commodityId: c.id })); setQuickAdd(null); };

  const handleSave = async () => {
    if (!form.date || !form.customerId) return;
    setSaving(true);
    try {
      await api.loads.create({
        date: form.date,
        customer_id: form.customerId,
        field_id: form.fieldId || null,
        commodity_id: form.commodityId || null,
        shipper: form.shipper,
        type: form.type,
        bale_count: form.baleCount ? parseInt(form.baleCount) : null,
        gross_weight: parseFloat(form.grossWeight) || null,
        tare_weight: parseFloat(form.tareWeight) || null,
        net_weight: parseFloat(form.netWeight) || null,
        driver: form.driver,
        truck_number: form.truckNumber,
        bol_url: form.bol_url || null,
        scale_ticket_url: form.scale_ticket_url || null,
        misc_url: form.misc_url || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setModal(false);
      setQuickAdd(null);
      setForm(f => ({ ...f, customerId: '', fieldId: '', commodityId: '', baleCount: '', grossWeight: '', tareWeight: '', netWeight: '', driver: '', truckNumber: '', bol_url: '', scale_ticket_url: '', misc_url: '' }));
      await loadData();
    } finally { setSaving(false); }
  };

  const filteredCommodities = commodities.filter(c => c.type === form.type);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-slate-100">Log a Load</h1>
        <p className="text-slate-400 mt-1 text-sm">Record your haul tickets here</p>
      </div>

      {saved && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-900/40 border border-emerald-700 rounded-lg px-4 py-3 text-emerald-300 text-sm">
          <CheckCircle size={16} /> Load logged successfully!
        </div>
      )}

      <button className="btn-primary w-full justify-center py-4 text-base mb-8" onClick={() => setModal(true)}>
        <Plus size={18} /> Log New Load
      </button>

      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Loads</h2>
        <div className="space-y-2">
          {recentLoads.map(load => (
            <div key={load.id} className="card-sm flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-200">{load.customer_name || '—'}</div>
                <div className="text-xs text-slate-500 mt-0.5">{load.field_name || '—'} · {load.date} · {load.type === 'Forage' ? 'Stacks' : 'Grain'}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-slate-200">{load.net_weight?.toLocaleString()} lbs</div>
                <span className={load.type === 'Forage' ? 'badge-forage' : 'badge-grain'}>{load.type === 'Forage' ? 'Stacks' : 'Grain'}</span>
              </div>
            </div>
          ))}
          {recentLoads.length === 0 && <div className="text-slate-500 text-sm text-center py-8">No loads logged yet.</div>}
        </div>
      </div>

      {modal && (
        <Modal title="Log Load" onClose={() => { setModal(false); setQuickAdd(null); }} wide>
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Customer *</label>
                {quickAdd !== 'customer' && <button className="text-xs text-soil-400 hover:text-soil-300" onClick={() => setQuickAdd('customer')}>+ New Customer</button>}
              </div>
              <select className="input" name="customerId" value={form.customerId} onChange={handleChange}>
                <option value="">Select…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
              {quickAdd === 'customer' && <QuickAddCustomer onSave={onCustomerAdded} onCancel={() => setQuickAdd(null)} />}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Field</label>
                {quickAdd !== 'field' && <button className="text-xs text-soil-400 hover:text-soil-300" onClick={() => setQuickAdd('field')}>+ New Field</button>}
              </div>
              <select className="input" name="fieldId" value={form.fieldId} onChange={handleChange}>
                <option value="">Select…</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.field_name}</option>)}
              </select>
              {quickAdd === 'field' && <QuickAddField onSave={onFieldAdded} onCancel={() => setQuickAdd(null)} />}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Commodity</label>
                {quickAdd !== 'commodity' && <button className="text-xs text-soil-400 hover:text-soil-300" onClick={() => setQuickAdd('commodity')}>+ New Commodity</button>}
              </div>
              <select className="input" name="commodityId" value={form.commodityId} onChange={handleChange}>
                <option value="">Select…</option>
                {filteredCommodities.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.type === 'Forage' ? `${c.stack_number || c.type_of_forage}` : c.type_crop}
                  </option>
                ))}
              </select>
              {quickAdd === 'commodity' && <QuickAddCommodity type={form.type} fields={fields} onSave={onCommodityAdded} onCancel={() => setQuickAdd(null)} />}
            </div>

            <div>
              <label className="label">Shipper</label>
              <input className="input" name="shipper" value={form.shipper} onChange={handleChange} />
            </div>

            {form.type === 'Forage' && (
              <div>
                <label className="label">Bale Count</label>
                <input className="input" type="number" name="baleCount" value={form.baleCount} onChange={handleChange} placeholder="24" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Gross (lbs)</label>
                <input className="input" type="number" name="grossWeight" value={form.grossWeight} onChange={handleChange} placeholder="54000" />
              </div>
              <div>
                <label className="label">Tare (lbs)</label>
                <input className="input" type="number" name="tareWeight" value={form.tareWeight} onChange={handleChange} placeholder="14000" />
              </div>
              <div>
                <label className="label">Net (auto)</label>
                <input className="input font-mono bg-slate-700" type="number" name="netWeight" value={form.netWeight} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Driver</label>
                <input className="input" name="driver" value={form.driver} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Truck #</label>
                <input className="input" name="truckNumber" value={form.truckNumber} onChange={handleChange} />
              </div>
            </div>

            {/* Document uploads */}
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

            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Log Load'}
              </button>
              <button className="btn-secondary" onClick={() => { setModal(false); setQuickAdd(null); }}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
