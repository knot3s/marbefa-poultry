import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines, faDownload, faPrint, faEgg, faWheatAwn, faDroplet, faSkull, faChartPie,
} from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const PIE_COLORS = ['#0056D2', '#FF9F1C', '#22C55E', '#A855F7'];

export default function Reports() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.batches().then((r) => {
      setBatches(r.data);
      if (r.data.length > 0) setBatchId(r.data[0].batch_id);
    });
  }, []);

  const generate = () => {
    if (!batchId) return;
    setLoading(true);
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    api.reportSummary(Number(batchId), params)
      .then((r) => setSummary(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (batchId) generate();
    // eslint-disable-next-line
  }, [batchId]);

  const downloadCsv = () => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const url = api.reportCsvUrl(Number(batchId), params);
    const token = localStorage.getItem('access_token');
    // Use fetch with auth header then trigger download
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `batch_${batchId}_daily_logs.csv`;
        link.click();
      });
  };

  const pieData = summary ? [
    { name: 'Small', value: summary.breakdown?.small || 0 },
    { name: 'Medium', value: summary.breakdown?.medium || 0 },
    { name: 'Large', value: summary.breakdown?.large || 0 },
    { name: 'XL', value: summary.breakdown?.xl || 0 },
  ] : [];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Generate production reports and export data</p>
        </div>
      </div>

      {/* Report configurator */}
      <div className="card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Batch</label>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="input-field">
              {batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>Batch #{b.batch_id} — {b.breed_type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
          </div>
          <div className="flex gap-2">
            <button onClick={generate} disabled={loading || !batchId} className="btn-primary flex-1 justify-center">
              <FontAwesomeIcon icon={faFileLines} /> {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {summary && summary.days > 0 ? (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <FontAwesomeIcon icon={faEgg} className="text-primary" /> Total Eggs
              </div>
              <div className="text-2xl font-bold text-slate-900">{summary.total_eggs?.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">Avg {summary.avg_daily_eggs}/day · {summary.days} days</div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <FontAwesomeIcon icon={faWheatAwn} className="text-accent" /> Feed (kg)
              </div>
              <div className="text-2xl font-bold text-slate-900">{summary.total_feed_kg?.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">FCR: <span className="font-semibold text-accent">{summary.fcr}</span></div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <FontAwesomeIcon icon={faDroplet} className="text-blue-500" /> Water (L)
              </div>
              <div className="text-2xl font-bold text-slate-900">{summary.total_water_l?.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">Egg mass: {summary.egg_mass_kg} kg</div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <FontAwesomeIcon icon={faSkull} className="text-red-500" /> Mortality
              </div>
              <div className="text-2xl font-bold text-slate-900">{summary.total_mortality}</div>
              <div className="text-xs text-slate-400 mt-1">Live birds: {summary.live_birds?.toLocaleString()}</div>
            </div>
          </div>

          {/* Breakdown + actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faChartPie} className="text-primary" /> Egg Size Breakdown
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-semibold text-slate-800 mb-3">Report Summary</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Batch ID</dt>
                  <dd className="font-medium">#{summary.batch_id}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Breed</dt>
                  <dd className="font-medium">{summary.breed_type}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Period From</dt>
                  <dd className="font-medium">{summary.start_date}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Period To</dt>
                  <dd className="font-medium">{summary.end_date}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Total Rejects</dt>
                  <dd className="font-medium">{summary.total_eggs_reject}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Eggs + Rejects</dt>
                  <dd className="font-medium">{summary.total_eggs_with_reject?.toLocaleString()}</dd>
                </div>
              </dl>
              <div className="flex gap-2 mt-5 no-print">
                <button onClick={downloadCsv} className="btn-accent">
                  <FontAwesomeIcon icon={faDownload} /> Export CSV
                </button>
                <button onClick={() => window.print()} className="btn-outline">
                  <FontAwesomeIcon icon={faPrint} /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : summary && summary.days === 0 ? (
        <div className="card p-12 text-center text-slate-500">No data for the selected period.</div>
      ) : null}
    </div>
  );
}
