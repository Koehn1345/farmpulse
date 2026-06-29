import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { Plus, Pencil, Trash2, Building2, Phone, Mail, MapPin } from 'lucide-react';

const empty = { companyName: '', contactName: '', phone: '', email: '', mailingAddress: '' };

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | {edit: row}
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = () => api.customers.list().then(setRows).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ edit: row }); };
  const closeModal = () => setModal(null);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.companyName) return;
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.customers.create(form);
      } else {
        await api.customers.update(modal.edit.id, form);
      }
      await load();
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    await api.customers.delete(id);
    setRows(r => r.filter(x => x.id !== id));
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Customers"
        subtitle={`${rows.length} customer${rows.length !== 1 ? 's' : ''}`}
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={15} /> Add Customer
          </button>
        }
      />

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map(row => (
            <div key={row.id} className="card-sm flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-100 flex items-center gap-2">
                    <Building2 size={14} className="text-soil-400" />
                    {row.companyName}
                  </div>
                  <div className="text-sm text-slate-400 mt-0.5">{row.contactName}</div>
                </div>
                <div className="flex gap-1">
                  <button className="btn-secondary !px-2 !py-1" onClick={() => openEdit(row)}><Pencil size={13} /></button>
                  <button className="btn-danger" onClick={() => handleDelete(row.id)}><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                {row.phone && <div className="flex items-center gap-2"><Phone size={12} />{row.phone}</div>}
                {row.email && <div className="flex items-center gap-2"><Mail size={12} />{row.email}</div>}
                {row.mailingAddress && <div className="flex items-center gap-2"><MapPin size={12} />{row.mailingAddress}</div>}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-500">
              No customers yet. Add your first one.
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Customer' : 'Edit Customer'} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="label">Company Name *</label>
              <input className="input" name="companyName" value={form.companyName} onChange={handleChange} placeholder="Valley Grain Co." />
            </div>
            <div>
              <label className="label">Contact Name</label>
              <input className="input" name="contactName" value={form.contactName} onChange={handleChange} placeholder="John Smith" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone</label>
                <input className="input" name="phone" value={form.phone} onChange={handleChange} placeholder="509-555-0100" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" name="email" value={form.email} onChange={handleChange} placeholder="name@company.com" />
              </div>
            </div>
            <div>
              <label className="label">Mailing Address</label>
              <input className="input" name="mailingAddress" value={form.mailingAddress} onChange={handleChange} placeholder="123 Farm Rd, Ritzville, WA" />
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Customer'}
              </button>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
