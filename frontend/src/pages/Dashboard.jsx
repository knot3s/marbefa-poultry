import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import client from '../api/client';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from 'recharts';

export default function Dashboard() {
  const [kpis, setKpis] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [batchId, setBatchId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [kpiRes, alertRes] = await Promise.all([
          client.get('/kpis/'),
          client.get('/alerts/?unacknowledged=true'),
        ]);
        setKpis(kpiRes.data);
        setAlerts(alertRes.data);
        if (kpiRes.data.length > 0) {
          setBatchId(kpiRes.data[0].batch_id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!batchId) return;
    client.get(`/daily-logs/by_batch/?batch=${batchId}`).then((res) => {
      setLogs(res.data.slice(-14));
    });
  }, [batchId]);

  if (loading) return <div className="p-6 text-slate-500">Loading dashboard...</div>;

  const chartData = logs.map((l) => ({
    date: l.record_date.slice(5),
    eggs: l.total_eggs,
    feed: l.feed_consumed_kg,
    mortality: l.mortality_count,
  }));

  const severityColor = (s) => ({
    Critical: 'bg-red-100 text-red-700',
    High: 'bg-orange-100 text-orange-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-blue-100 text-blue-700',
  }[s] || 'bg-slate-100 text-slate-700');

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        {kpis.length > 0 && (
          <select
            value={batchId || ''}
            onChange={(e) => setBatchId(Number(e.target.value))}
            className="input-field w-auto"
          >
            {kpis.map((k) => (
              <option key={k.batch_id} value={k.batch_id}>
                Batch #{k.batch_id} — {k.breed_type}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((k) => (
          <div key={k.batch_id} className="card p-4">
            <div className="text-xs text-slate-500 font-medium">
              Batch #{k.batch_id} · {k.breed_type}
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">HDEP</span>
                <span className="text-sm font-bold text-primary">{k.hdep_percent ?? '—'}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">FCR (7d)</span>
                <span className="text-sm font-bold text-primary">{k.fcr_7d ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Live Birds</span>
                <span className="text-sm font-bold text-slate-700">{k.live_birds ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Today's Eggs</span>
                <span className="text-sm font-bold text-accent">{k.latest_eggs ?? '—'}</span>
              </div>
            </div>
          </div>
        ))}
        {kpis.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-8">
            No batch data available.
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-slate-700 mb-3">Egg Production (14 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="eggGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0056D2" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0056D2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="eggs" stroke="#0056D2" fill="url(#eggGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-slate-700 mb-3">Feed Consumption (kg)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="feed" fill="#FF9F1C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700">Recent Alerts</h3>
          <Link to="/alerts" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center flex items-center justify-center gap-2">
            <FontAwesomeIcon icon={faCircleCheck} className="text-green-500" />
            No active alerts
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <div key={a.alert_id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-md">
                <span className={`badge ${severityColor(a.severity_level)}`}>
                  {a.severity_level}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700">{a.anomaly_type.replace('_', ' ')}</div>
                  <div className="text-xs text-slate-500 truncate">{a.description}</div>
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(a.trigger_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
