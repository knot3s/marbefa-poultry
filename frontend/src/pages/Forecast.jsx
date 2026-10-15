import { useEffect, useState } from 'react';
import client from '../api/client';
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
    client.get('/batches/').then((r) => {
      setBatches(r.data);
      if (r.data.length) setBatchId(r.data[0].batch_id);
    });
  }, []);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    Promise.all([
      client.get(`/forecast/${batchId}/`),
      client.get(`/daily-logs/by_batch/?batch=${batchId}`),
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
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Yield Forecast</h1>
        <select value={batchId || ''} onChange={(e) => setBatchId(Number(e.target.value))} className="input-field w-auto">
          {batches.map((b) => (
            <option key={b.batch_id} value={b.batch_id}>#{b.batch_id} — {b.breed_type}</option>
          ))}
        </select>
      </div>

      {forecast?.model_info && (
        <div className="card p-4 flex flex-wrap gap-6 text-sm">
          <div><span className="text-slate-500">Model:</span> <span className="font-medium">{forecast.model_info.model}</span></div>
          <div><span className="text-slate-500">Training samples:</span> <span className="font-medium">{forecast.model_info.training_samples}</span></div>
          <div><span className="text-slate-500">R²:</span> <span className="font-medium text-primary">{forecast.model_info.r_squared}</span></div>
          <div><span className="text-slate-500">Horizon:</span> <span className="font-medium">{forecast.model_info.horizon_days} days</span></div>
        </div>
      )}

      <div className="card p-4">
        <h3 className="font-semibold text-slate-700 mb-3">Egg Production — Actual vs Forecast</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="eggs" stroke="#0056D2" strokeWidth={2} name="Actual" dot={{ r: 2 }} connectNulls />
              <Line type="monotone" dataKey="forecast" stroke="#FF9F1C" strokeWidth={2} strokeDasharray="5 5" name="Forecast" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-slate-700 mb-3">7-Day Forecast Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">Predicted Eggs</th>
              </tr>
            </thead>
            <tbody>
              {forecast?.forecast?.map((f) => (
                <tr key={f.date} className="border-t border-slate-100">
                  <td className="px-4 py-2">{f.date}</td>
                  <td className="px-4 py-2 text-right font-medium text-accent">{f.predicted_eggs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
