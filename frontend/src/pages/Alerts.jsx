import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faBolt } from '@fortawesome/free-solid-svg-icons';
import client from '../api/client';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');

  const load = () => {
    const url = filter === 'unack' ? '/alerts/?unacknowledged=true' : '/alerts/';
    client.get(url).then((r) => setAlerts(r.data));
  };
  useEffect(() => { load(); }, [filter]);

  const acknowledge = async (id) => {
    await client.post(`/alerts/${id}/acknowledge/`);
    load();
  };

  const runDetection = async () => {
    await client.post('/anomaly/run/');
    load();
  };

  const sevColor = (s) => ({
    Critical: 'bg-red-100 text-red-700 border-red-200',
    High: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-blue-100 text-blue-700 border-blue-200',
  }[s] || 'bg-slate-100 text-slate-700 border-slate-200');

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Anomaly Alerts</h1>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field w-auto text-sm">
            <option value="all">All alerts</option>
            <option value="unack">Unacknowledged</option>
          </select>
          <button onClick={runDetection} className="btn-accent text-sm flex items-center gap-1.5">
            <FontAwesomeIcon icon={faBolt} /> Run Detection
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((a) => (
          <div key={a.alert_id} className={`card p-4 border-l-4 ${sevColor(a.severity_level)}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${sevColor(a.severity_level)} border`}>{a.severity_level}</span>
                  <span className="text-sm font-medium text-slate-700">{a.anomaly_type.replace('_', ' ')}</span>
                  <span className="text-xs text-slate-400">Batch #{a.batch} — {a.batch_breed}</span>
                </div>
                <p className="text-sm text-slate-600">{a.description}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(a.trigger_date).toLocaleString()}</p>
              </div>
              {!a.acknowledged_status ? (
                <button onClick={() => acknowledge(a.alert_id)} className="btn-ghost text-sm whitespace-nowrap">
                  Acknowledge
                </button>
              ) : (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <FontAwesomeIcon icon={faCircleCheck} /> Acknowledged
                </span>
              )}
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="card p-8 text-center text-slate-500">No alerts found.</div>
        )}
      </div>
    </div>
  );
}
