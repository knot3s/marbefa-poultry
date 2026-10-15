import { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

export default function Forecast() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.batches().then((r) => {
      setBatches(r.data);
      if (r.data.length) setBatchId(r.data[0].batch_id);
    });
  }, []);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    Promise.all([
      api.forecast(batchId),
      api.dailyLogsByBatch(batchId),
    ]).then(([fc, lg]) => {
      setForecast(fc.data);
      setLogs(lg.data.slice(-14));
    }).finally(() => setLoading(false));
  }, [batchId]);

  const combined = [
    ...logs.map((l) => ({ date: l.record_date.slice(5), eggs: l.total_eggs, forecast: null })),
    ...(forecast?.forecast || []).map((f) => ({ date: f.date.slice(5), eggs: null, forecast: f.predicted_eggs })),
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Yield Forecast</h1>
          <p className="text-sm text-slate-500">Machine learning egg production predictions</p>
        </div>
        <select value={batchId || ''} onChange={(e) => setBatchId(Number(e.target.value))} className="input-field w-auto">
          {batches.map((b) => (
            <option key={b.batch_id} value={b.batch_id}>#{b.batch_id} — {b.breed_type}</option>
          ))}
        </select>
      </div>

      {forecast?.model_info && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="text-xs text-slate-500">Model</div>
            <div className="text-lg font-bold text-primary">{forecast.model_info.model}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">Training Samples</div>
            <div className="text-lg font-bold text-slate-900">{forecast.model_info.training_samples}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">R² Score</div>
            <div className="text-lg font-bold text-accent">{forecast.model_info.r_squared}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">Forecast Horizon</div>
            <div className="text-lg font-bold text-slate-900">{forecast.model_info.horizon_days} days</div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-1">Egg Production — Actual vs Forecast</h3>
        <p className="text-xs text-slate-500 mb-3">Historical actuals (blue) and predicted values (orange)</p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combined} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="eggs" stroke="#0056D2" strokeWidth={2.5} name="Actual" dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="forecast" stroke="#FF9F1C" strokeWidth={2.5} strokeDasharray="5 5" name="Forecast" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">7-Day Forecast Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th text-right">Predicted Eggs</th>
              </tr>
            </thead>
            <tbody>
              {forecast?.forecast?.map((f) => (
                <tr key={f.date} className="hover:bg-slate-50">
                  <td className="table-td font-medium">{f.date}</td>
                  <td className="table-td text-right font-bold text-accent">{f.predicted_eggs.toLocaleString()}</td>
                </tr>
              ))}
              {!forecast?.forecast?.length && (
                <tr><td colSpan={2} className="text-center text-slate-400 py-8">No forecast data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
