import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck, faEgg, faWheatAwn, faSkull, faTemperatureHigh,
} from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client';
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
          api.kpis(),
          api.alerts({ unacknowledged: true }),
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
    api.dailyLogsByBatch(batchId).then((res) => {
      setLogs(res.data.slice(-14));
    });
  }, [batchId]);

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

  const selected = kpis.find((k) => k.batch_id === batchId);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time flock performance overview</p>
        </div>
        {kpis.length > 0 && (
          <select
            value={batchId || ''}
            onChange={(e) => setBatchId(Number(e.target.value))}
            className="input-field w-auto min-w-[200px]"
          >
            {kpis.map((k) => (
              <option key={k.batch_id} value={k.batch_id}>
                Batch #{k.batch_id} — {k.breed_type}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading dashboard...</div>
      ) : selected ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FontAwesomeIcon icon={faEgg} />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">HDEP %</div>
                  <div className="text-2xl font-bold text-slate-900">{selected.hdep_percent ?? '—'}%</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">Hen-Day Egg Production</div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <FontAwesomeIcon icon={faWheatAwn} />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">FCR (7d)</div>
                  <div className="text-2xl font-bold text-slate-900">{selected.fcr_7d ?? '—'}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">Feed Conversion Ratio</div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                  <FontAwesomeIcon icon={faTemperatureHigh} />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Live Birds</div>
                  <div className="text-2xl font-bold text-slate-900">{selected.live_birds ?? '—'}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">Initial: {selected.initial_population ?? '—'}</div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FontAwesomeIcon icon={faEgg} />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Today's Eggs</div>
                  <div className="text-2xl font-bold text-slate-900">{selected.latest_eggs ?? '—'}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">Rejects: {selected.latest_rejects ?? 0}</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-1">Egg Production</h3>
              <p className="text-xs text-slate-500 mb-3">Last 14 days</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eggGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0056D2" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0056D2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Area type="monotone" dataKey="eggs" stroke="#0056D2" fill="url(#eggGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-1">Feed Consumption</h3>
              <p className="text-xs text-slate-500 mb-3">Kilograms per day</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="feed" fill="#FF9F1C" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Alerts + Quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">Recent Alerts</h3>
                <Link to="/alerts" className="text-sm text-primary hover:underline font-medium">View all →</Link>
              </div>
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-green-500" />
                  No active alerts — all systems normal
                </p>
              ) : (
                <div className="space-y-2">
                  {alerts.slice(0, 5).map((a) => (
                    <div key={a.alert_id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className={`badge ${severityColor(a.severity_level)} whitespace-nowrap`}>
                        {a.severity_level}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700">{a.anomaly_type.replaceAll('_', ' ')}</div>
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
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link to="/daily-log" className="btn-primary w-full justify-center">+ New Daily Log</Link>
                <Link to="/reports" className="btn-outline w-full justify-center">Generate Report</Link>
                <Link to="/forecast" className="btn-outline w-full justify-center">View Forecast</Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-12 text-center">
          <FontAwesomeIcon icon={faEgg} className="text-4xl text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">No batch data yet</h3>
          <p className="text-sm text-slate-500 mt-1">Create a batch and start logging daily records.</p>
          <Link to="/batches" className="btn-primary mt-4">Create Batch</Link>
        </div>
      )}
    </div>
  );
}
