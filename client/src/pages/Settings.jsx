import { useState } from 'react';
import { useFarm } from '../context/FarmContext.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function Settings() {
  const { farm, updateFarm } = useFarm();
  const [name, setName] = useState(farm?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name === farm?.name) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateFarm({ name: name.trim() });
      setSaved(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your farm's details" />

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Farm name</h2>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="My Farm"
            value={name}
            onChange={e => { setName(e.target.value); setSaved(false); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !name.trim() || name === farm?.name}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {saved && <p className="text-xs text-emerald-400 mt-2">Farm name updated.</p>}
        <p className="text-xs text-slate-500 mt-2">This is used as your farm's name throughout FarmPulse, including as the default shipper on loads.</p>
      </div>
    </div>
  );
}
