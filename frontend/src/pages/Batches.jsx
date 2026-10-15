import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const emptyForm = { breed_type: '', arrival_date: '', initial_population: '' };

export default function Batches() {
  const { isManager } = useAuth();
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const load = () => client.get('/batches/').then((r) => setBatches(r.data));
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await client.post('/batches/', {
        breed_type: form.breed_type,
        arrival_date: form.arrival_date,
        initial_population: Number(form.initial_population),
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      alert('Failed to create batch');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Flock Batches</h1>
        {isManager && (
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary flex items-center gap-1.5">
            {showForm ? <><FontAwesomeIcon icon={faTimes} /> Cancel</> : <><FontAwesomeIcon icon={faPlus} /> New Batch</>}
          </button>
        )}
      </div>

      {showForm && isManager && (
        <form onSubmit={handleSubmit} className="card p-4 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input name="breed_type" placeholder="Breed type" value={form.breed_type} onChange={handleChange} className="input-field" required />
            <input type="date" name="arrival_date" value={form.arrival_date} onChange={handleChange} className="input-field" required />
            <input type="number" name="initial_population" placeholder="Initial population" value={form.initial_population} onChange={handleChange} className="input-field" required />
          </div>
          <button type="submit" className="btn-accent flex items-center gap-1.5">
            <FontAwesomeIcon icon={faPlus} /> Create Batch
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Breed</th>
              <th className="text-left px-4 py-3">Arrival</th>
              <th className="text-right px-4 py-3">Population</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.batch_id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono">#{b.batch_id}</td>
                <td className="px-4 py-3">{b.breed_type}</td>
                <td className="px-4 py-3">{b.arrival_date}</td>
                <td className="px-4 py-3 text-right">{b.initial_population.toLocaleString()}</td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr><td colSpan={4} className="text-center text-slate-400 py-8">No batches yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
