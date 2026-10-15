import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faPen, faTrash, faEgg, faSearch, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client';

export default function DailyLogs() {
  const [batches, setBatches] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchFilter, setBatchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({});

  const loadBatches = () => api.batches().then((r) => setBatches(r.data));

  const loadLogs = () => {
    setLoading(true);
    const params = {};
    if (batchFilter) params.batch = batchFilter;
    api.dailyLogs(params)
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBatches(); }, []);
  useEffect(() => { loadLogs(); }, [batchFilter]);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    return l.record_date.includes(search) || String(l.batch).includes(search);
  });

  const startEdit = (log) => {
    setEditing(log.log_id);
    setForm({
      batch: log.batch,
      record_date: log.record_date,
      feed_consumed_kg: log.feed_consumed_kg,
      water_consumed_l: log.water_consumed_l,
      mortality_count: log.mortality_count,
      eggs_small: log.eggs_small,
      eggs_medium: log.eggs_medium,
      eggs_large: log.eggs_large,
      eggs_xl: log.eggs_xl,
      eggs_reject: log.eggs_reject,
    });
  };

  const handleEditChange = (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const saveEdit = async () => {
    try {
      await api.updateDailyLog(editing, form);
      setEditing(null);
      setForm({});
      loadLogs();
    } catch (e) {
      alert('Failed to update log');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteDailyLog(id);
      setConfirmDelete(null);
      loadLogs();
    } catch (e) {
      alert('Failed to delete log');
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Logs</h1>
          <p className="text-sm text-slate-500">View and manage daily production records</p>
        </div>
        <Link to="/daily-log" className="btn-primary">
          <FontAwesomeIcon icon={faPlus} /> New Log
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="">All Batches</option>
          {batches.map((b) => (
            <option key={b.batch_id} value={b.batch_id}>Batch #{b.batch_id} — {b.breed_type}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Batch</th>
                <th className="table-th text-right">Feed (kg)</th>
                <th className="table-th text-right">Water (L)</th>
                <th className="table-th text-right">Mortality</th>
                <th className="table-th text-right">Total Eggs</th>
                <th className="table-th text-right">Rejects</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => editing === l.log_id ? (
                <tr key={l.log_id} className="bg-primary/5">
                  <td className="table-td"><input type="date" name="record_date" value={form.record_date || ''} onChange={handleEditChange} className="input-field" /></td>
                  <td className="table-td">
                    <select name="batch" value={form.batch || ''} onChange={handleEditChange} className="input-field">
                      {batches.map((b) => <option key={b.batch_id} value={b.batch_id}>#{b.batch_id}</option>)}
                    </select>
                  </td>
                  <td className="table-td"><input type="number" name="feed_consumed_kg" value={form.feed_consumed_kg ?? 0} onChange={handleEditChange} className="input-field w-20 text-right" /></td>
                  <td className="table-td"><input type="number" name="water_consumed_l" value={form.water_consumed_l ?? 0} onChange={handleEditChange} className="input-field w-20 text-right" /></td>
                  <td className="table-td"><input type="number" name="mortality_count" value={form.mortality_count ?? 0} onChange={handleEditChange} className="input-field w-16 text-right" /></td>
                  <td className="table-td"><input type="number" name="eggs_large" value={form.eggs_large ?? 0} onChange={handleEditChange} className="input-field w-16 text-right" /></td>
                  <td className="table-td"><input type="number" name="eggs_reject" value={form.eggs_reject ?? 0} onChange={handleEditChange} className="input-field w-16 text-right" /></td>
                  <td className="table-td text-right">
                    <button onClick={saveEdit} className="btn-primary !px-2.5 !py-1.5 text-xs mr-1">Save</button>
                    <button onClick={() => setEditing(null)} className="btn-outline !px-2.5 !py-1.5 text-xs"><FontAwesomeIcon icon={faXmark} /></button>
                  </td>
                </tr>
              ) : (
                <tr key={l.log_id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-td font-medium">{l.record_date}</td>
                  <td className="table-td"><span className="badge bg-primary/10 text-primary">#{l.batch}</span></td>
                  <td className="table-td text-right">{l.feed_consumed_kg}</td>
                  <td className="table-td text-right">{l.water_consumed_l}</td>
                  <td className="table-td text-right">{l.mortality_count}</td>
                  <td className="table-td text-right font-semibold text-primary">{l.total_eggs?.toLocaleString()}</td>
                  <td className="table-td text-right text-slate-500">{l.eggs_reject}</td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => startEdit(l)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg" title="Edit">
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button onClick={() => setConfirmDelete(l)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={8} className="text-center text-slate-400 py-12">
                  <FontAwesomeIcon icon={faEgg} className="text-3xl mb-2 block mx-auto opacity-40" />
                  No logs found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <FontAwesomeIcon icon={faTrash} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Delete Log?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Delete log for <strong>{confirmDelete.record_date}</strong> (Batch #{confirmDelete.batch})?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-outline">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.log_id)} className="btn-danger">
                <FontAwesomeIcon icon={faTrash} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
