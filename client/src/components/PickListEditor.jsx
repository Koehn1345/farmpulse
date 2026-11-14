import { useEffect, useState } from 'react';
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react';

// Add / rename / remove entries in a simple load pick list (Products,
// Delivery Locations). Removing an entry hides it from the load form;
// loads that already use it keep showing its name.
export default function PickListEditor({ title, description, service, withAddress = false, placeholder }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState({ name: '', address: '' });
  const [editing, setEditing] = useState(null); // { id, name, address }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    service.list().then(setRows).catch(err => setError(err.message));
  }, []);

  const sortRows = (list) => [...list].sort((a, b) => a.name.localeCompare(b.name));

  const add = async () => {
    if (!adding.name.trim()) return;
    setBusy(true);
    try {
      const row = await service.create({ name: adding.name.trim(), address: adding.address.trim() || null });
      setRows(r => r.some(x => x.id === row.id) ? r : sortRows([...r, row]));
      setAdding({ name: '', address: '' });
    } catch (err) { alert(`Failed to add: ${err.message}`); }
    finally { setBusy(false); }
  };

  const saveEdit = async () => {
    if (!editing.name.trim()) return;
    setBusy(true);
    try {
      const row = await service.update(editing.id, { name: editing.name.trim(), address: (editing.address || '').trim() || null });
      setRows(r => sortRows(r.map(x => x.id === row.id ? row : x)));
      setEditing(null);
    } catch (err) { alert(`Failed to save: ${err.message}`); }
    finally { setBusy(false); }
  };

  const remove = async (row) => {
    if (!confirm(`Remove "${row.name}"? Loads that already use it will keep showing it.`)) return;
    try {
      await service.delete(row.id);
      setRows(r => r.filter(x => x.id !== row.id));
    } catch (err) { alert(`Failed to remove: ${err.message}`); }
  };

  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-slate-300 mb-1">{title}</h2>
      <p className="text-xs text-slate-500 mb-4">{description}</p>

      {error && <p className="text-xs text-red-400 mb-3">Couldn't load: {error}</p>}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input className="input flex-1" placeholder={placeholder} value={adding.name}
          onChange={e => setAdding(a => ({ ...a, name: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && add()} />
        {withAddress && (
          <input className="input flex-1" placeholder="Address (optional)" value={adding.address}
            onChange={e => setAdding(a => ({ ...a, address: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && add()} />
        )}
        <button className="btn-primary justify-center" onClick={add} disabled={busy || !adding.name.trim()}>
          <Plus size={15} /> Add
        </button>
      </div>

      {rows === null ? (
        <div className="text-xs text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-slate-600">None yet.</div>
      ) : (
        <ul className="divide-y divide-slate-800">
          {rows.map(row => (
            <li key={row.id} className="py-2">
              {editing?.id === row.id ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input className="input flex-1" value={editing.name} autoFocus
                    onChange={e => setEditing(x => ({ ...x, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }} />
                  {withAddress && (
                    <input className="input flex-1" placeholder="Address (optional)" value={editing.address || ''}
                      onChange={e => setEditing(x => ({ ...x, address: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }} />
                  )}
                  <div className="flex gap-1">
                    <button className="btn-primary !px-2" onClick={saveEdit} disabled={busy}><Check size={15} /></button>
                    <button className="btn-secondary !px-2" onClick={() => setEditing(null)}><X size={15} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-200 truncate">{row.name}</div>
                    {withAddress && row.address && <div className="text-xs text-slate-500 truncate">{row.address}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button className="text-slate-500 hover:text-slate-300 p-1.5" title="Rename"
                      onClick={() => setEditing({ id: row.id, name: row.name, address: row.address || '' })}><Pencil size={14} /></button>
                    <button className="text-slate-500 hover:text-red-400 p-1.5" title="Remove"
                      onClick={() => remove(row)}><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
