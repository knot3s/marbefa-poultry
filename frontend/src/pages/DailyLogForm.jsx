import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import client from '../api/client';

const emptyForm = {
  batch: '',
  record_date: new Date().toISOString().slice(0, 10),
  feed_consumed_kg: '',
  water_consumed_l: '',
  mortality_count: 0,
  eggs_small: 0,
  eggs_medium: 0,
  eggs_large: 0,
  eggs_xl: 0,
  eggs_reject: 0,
};

export default function DailyLogForm() {
  const [form, setForm] = useState(emptyForm);
  const [batches, setBatches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    client.get('/batches/').then((res) => setBatches(res.data));
  }, []);

  const totalEggs =
    Number(form.eggs_small) + Number(form.eggs_medium) +
    Number(form.eggs_large) + Number(form.eggs_xl);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'batch' ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const payload = {
        ...form,
        feed_consumed_kg: Number(form.feed_consumed_kg),
        water_consumed_l: Number(form.water_consumed_l),
        mortality_count: Number(form.mortality_count),
        eggs_small: Number(form.eggs_small),
        eggs_medium: Number(form.eggs_medium),
        eggs_large: Number(form.eggs_large),
        eggs_xl: Number(form.eggs_xl),
        eggs_reject: Number(form.eggs_reject),
      };
      await client.post('/daily-logs/', payload);
      setResult({ type: 'success', msg: `Daily log saved. Total eggs: ${totalEggs}. Anomaly check ran automatically.` });
      setForm({ ...emptyForm, batch: form.batch });
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data || 'Failed to save log.';
      setResult({ type: 'error', msg: JSON.stringify(msg) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Daily Log Entry</h1>

      {result && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {result.msg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Batch</label>
            <select name="batch" value={form.batch} onChange={handleChange} className="input-field" required>
              <option value="">Select batch...</option>
              {batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  #{b.batch_id} — {b.breed_type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Record Date</label>
            <input type="date" name="record_date" value={form.record_date} onChange={handleChange} className="input-field" required />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Feed (kg)</label>
            <input type="number" step="0.1" name="feed_consumed_kg" value={form.feed_consumed_kg} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Water (L)</label>
            <input type="number" step="0.1" name="water_consumed_l" value={form.water_consumed_l} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mortality</label>
            <input type="number" name="mortality_count" value={form.mortality_count} onChange={handleChange} className="input-field" required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Egg Production by Size</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { name: 'eggs_small', label: 'Small' },
              { name: 'eggs_medium', label: 'Medium' },
              { name: 'eggs_large', label: 'Large' },
              { name: 'eggs_xl', label: 'X-Large' },
              { name: 'eggs_reject', label: 'Rejects' },
            ].map((f) => (
              <div key={f.name}>
                <input
                  type="number"
                  name={f.name}
                  value={form[f.name]}
                  onChange={handleChange}
                  className="input-field"
                  min="0"
                />
                <span className="text-xs text-slate-500 mt-1 block">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-slate-600">
            Total Eggs (excl. rejects): <span className="font-bold text-primary text-lg">{totalEggs}</span>
          </div>
          <button type="submit" disabled={submitting || !form.batch} className="btn-accent flex items-center gap-1.5">
            <FontAwesomeIcon icon={faFloppyDisk} />
            {submitting ? 'Saving...' : 'Save Daily Log'}
          </button>
        </div>
      </form>
    </div>
  );
}
