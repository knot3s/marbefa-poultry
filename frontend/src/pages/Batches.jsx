import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes, faPen, faTrash, faDrumstickBite, faXmark } from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const emptyForm = { breed_type: '', arrival_date: '', initial_population: '' };

export default function Batches() {
  const { isManager } = useAuth();
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => api.batches().then((r) => setBatches(r.data));
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        breed_type: form.breed_type,
        arrival_date: form.arrival_date,
        initial_population: Number(form.initial_population),
      };
      if (editingId) {
        await api.updateBatch(editingId, payload);
      } else {
        await api.createBatch(payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (err) {
      alert(editingId ? 'Failed to update batch' : 'Failed to create batch');
    }
  };

  const startEdit = (b) => {
    setForm({ breed_type: b.breed_type, arrival_date: b.arrival_date, initial_population: b.initial_population });
    setEditingId(b.batch_id);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteBatch(id);
      setConfirmDelete(null);
      load();
    } catch (err) {
      alert('Failed to delete batch');
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flock Batches</h1>
          <p className="text-sm text-slate-500">Manage your poultry flock batches</p>
        </div>
        {isManager && (
          <button onClick={() => showForm ? cancelEdit() : setShowForm(true)} className="btn-primary">
            {showForm ? <><FontAwesomeIcon icon={faXmark} /> Cancel</> : <><FontAwesomeIcon icon={faPlus} /> New Batch</>}
          </button>
        )}
      </div>

      {showForm && isManager && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <h3 className="font-semibold text-slate-800">
            {editingId ? `Edit Batch #${editingId}` : 'Create New Batch'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Breed Type</label>
              <input name="breed_type" placeholder="e.g. Hy-Line Brown" value={form.breed_type} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Arrival Date</label>
              <input type="date" name="arrival_date" value={form.arrival_date} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Initial Population</label>
              <input type="number" name="initial_population" placeholder="e.g. 3000" value={form.initial_population} onChange={handleChange} className="input-field" required min="1" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-accent">
              <FontAwesomeIcon icon={faPlus} /> {editingId ? 'Update Batch' : 'Create Batch'}
            </button>
            <button type="button" onClick={cancelEdit} className="btn-outline">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-th">Batch ID</th>
                <th className="table-th">Breed</th>
                <th className="table-th">Arrival Date</th>
                <th className="table-th text-right">Population</th>
                {isManager && <th className="table-th text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batch_id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-td font-mono text-primary font-semibold">#{b.batch_id}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faDrumstickBite} className="text-slate-400" />
                      {b.breed_type}
                    </div>
                  </td>
                  <td className="table-td">{b.arrival_date}</td>
                  <td className="table-td text-right font-medium">{b.initial_population.toLocaleString()}</td>
                  {isManager && (
                    <td className="table-td text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startEdit(b)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg" title="Edit">
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button onClick={() => setConfirmDelete(b)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {batches.length === 0 && (
                <tr><td colSpan={isManager ? 5 : 4} className="text-center text-slate-400 py-12">No batches yet. Create one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <FontAwesomeIcon icon={faTrash} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Delete Batch?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete batch <strong>#{confirmDelete.batch_id}</strong> ({confirmDelete.breed_type})?
              This will also delete all associated daily logs and alerts. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-outline">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.batch_id)} className="btn-danger">
                <FontAwesomeIcon icon={faTrash} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
