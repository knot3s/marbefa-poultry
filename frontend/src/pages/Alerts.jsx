import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faBolt, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = filter === 'unack' ? { unacknowledged: true } : {};
    api.alerts(params).then((r) => setAlerts(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter]);

  const acknowledge = async (id) => {
    await api.acknowledgeAlert(id);
    load();
  };

  const runDetection = async () => {
    await api.runAnomaly();
    load();
  };

  const sevColor = (s) => ({
    Critical: 'bg-red-100 text-red-700',
    High: 'bg-orange-100 text-orange-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-blue-100 text-blue-700',
  }[s] || 'bg-slate-100 text-slate-700');

  const sevBorder = (s) => ({
    Critical: 'border-l-red-500',
    High: 'border-l-orange-500',
    Medium: 'border-l-yellow-500',
    Low: 'border-l-blue-500',
  }[s] || 'border-l-slate-400');

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Anomaly Alerts</h1>
          <p className="text-sm text-slate-500">System-generated production anomalies</p>
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field w-auto">
            <option value="all">All alerts</option>
            <option value="unack">Unacknowledged</option>
          </select>
          <button onClick={runDetection} className="btn-accent">
            <FontAwesomeIcon icon={faBolt} /> Run Detection
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="card p-12 text-center">
          <FontAwesomeIcon icon={faCircleCheck} className="text-4xl text-green-500 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">All clear</h3>
          <p className="text-sm text-slate-500 mt-1">No anomalies detected.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.alert_id} className={`card p-4 border-l-4 ${sevBorder(a.severity_level)}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`badge ${sevColor(a.severity_level)}`}>{a.severity_level}</span>
                    <span className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="text-slate-400" />
                      {a.anomaly_type.replaceAll('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400">Batch #{a.batch} — {a.batch_breed}</span>
                  </div>
                  <p className="text-sm text-slate-600">{a.description}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{new Date(a.trigger_date).toLocaleString()}</p>
                </div>
                {!a.acknowledged_status ? (
                  <button onClick={() => acknowledge(a.alert_id)} className="btn-ghost whitespace-nowrap">
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
        </div>
      )}
    </div>
  );
}
