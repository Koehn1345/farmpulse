import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import { Plus, CheckCircle } from 'lucide-react';

export default function EmployeeLoads() {
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
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    const [l, c, f, co] = await Promise.all([
      api.loads.list(), api.customers.list(), api.fields.list(), api.commodities.list()
    ]);
    setRecentLoads(l.slice(0, 10));
    setCustomers(c); setFields(f); setCommodities(co);
  };

  useEffect(() => { load(); }, []);

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
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setModal(false);
      setForm(f => ({ ...f, baleCount: '', grossWeight: '', tareWeight: '', netWeight: '', driver: '', truckNumber: '' }));
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-slate-100">Log a Load</h1>
        <p className="text-slate-400 mt-1 text-sm">Record your haul tickets here</p>
      </div>

      {saved && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-900/40 border border-emerald-700 rounded-lg px-4 py-3 text-emerald-300 text-sm">
          <CheckCircle size={16} />
          Load logged successfully!
        </div>
      )}

      <button className="btn-primary w-full justify-center py-4 text-base mb-8" onClick={() => setModal(true)}>
        <Plus size={18} /> Log New Load
      </button>

      {/* Recent loads - read only for employee */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Your Recent Loads</h2>
        <div className="space-y-2">
          {recentLoads.map(load => (
            <div key={load.id} className="card-sm flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-200">{load.customer_name || '—'}</div>
                <div className="text-xs text-slate-500 mt-0.5">{load.field_name} · {load.date} · {load.type}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-slate-200">{load.net_weight?.toLocaleString()} lbs</div>
                <span className={load.type === 'Forage' ? 'badge-forage' : 'badge-grain'}>{load.type}</span>
              </div>
            </div>
          ))}
          {recentLoads.length === 0 && (
            <div className="text-slate-500 text-sm text-center py-8">No loads logged yet.</div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title="Log Load" onClose={() => setModal(false)} wide>
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
            <div>
              <label className="label">Customer *</label>
              <select className="input" name="customerId" value={form.customerId} onChange={handleChange}>
                <option value="">Select…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Field</label>
                <select className="input" name="fieldId" value={form.fieldId} onChange={handleChange}>
                  <option value="">Select…</option>
                  {fields.map(f => <option key={f.id} value={f.id}>{f.field_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Commodity</label>
                <select className="input" name="commodityId" value={form.commodityId} onChange={handleChange}>
                  <option value="">Select…</option>
                  {commodities.filter(c => c.type === form.type).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.type === 'Forage' ? `${c.stack_number || c.type_of_forage}` : c.type_crop}
                    </option>
                  ))}
                </select>
              </div>
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
            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Log Load'}
              </button>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
