import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faTrash, faUserShield, faUser, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client';

const emptyForm = { username: '', password: '', role: 'Staff' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => api.users().then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.username ? 'Username already exists' : 'Failed to create user');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteUser(id);
      setConfirmDelete(null);
      load();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">Manage system users and roles</p>
        </div>
        <button
          onClick={() => showForm ? setShowForm(false) : setShowForm(true)}
          className="btn-primary"
        >
          {showForm ? <><FontAwesomeIcon icon={faXmark} /> Cancel</> : <><FontAwesomeIcon icon={faPlus} /> Add User</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <h3 className="font-semibold text-slate-800">Create New User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input name="username" value={form.username} onChange={handleChange} className="input-field" required placeholder="e.g. john" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} className="input-field" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
              <select name="role" value={form.role} onChange={handleChange} className="input-field">
                <option value="Staff">Staff</option>
                <option value="Manager">Manager</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-accent">
            <FontAwesomeIcon icon={faPlus} /> Create User
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-th">User</th>
                <th className="table-th">Role</th>
                <th className="table-th">Username</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                        u.role === 'Manager' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium capitalize">{u.username}</span>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${
                      u.role === 'Manager' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <FontAwesomeIcon icon={u.role === 'Manager' ? faUserShield : faUser} className="mr-1" />
                      {u.role}
                    </span>
                  </td>
                  <td className="table-td text-slate-600">{u.username}</td>
                  <td className="table-td text-right">
                    <button
                      onClick={() => setConfirmDelete(u)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="text-center text-slate-400 py-12">No users found.</td></tr>
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
              <h3 className="text-lg font-semibold text-slate-900">Delete User?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete user <strong>{confirmDelete.username}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-outline">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="btn-danger">
                <FontAwesomeIcon icon={faTrash} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
