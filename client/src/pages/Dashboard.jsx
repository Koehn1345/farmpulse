import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, Truck, Weight, TrendingUp } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtNum = (n) => new Intl.NumberFormat('en-US').format(n);
const typeLabel = (t) => t === 'Forage' ? 'Stacks' : 'Grain';

function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${accent}`}>
          <Icon size={14} />
        </div>
      </div>
      <div className="text-2xl font-semibold text-slate-100 mt-2">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
        <div className="font-medium text-slate-200">{label}</div>
        <div className="text-soil-300">{fmt(payload[0].value)}</div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 flex items-center justify-center text-slate-500">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-soil-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading dashboard…
      </div>
    </div>
  );

  if (!data) return <div className="p-8 text-red-400">Failed to load dashboard.</div>;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-slate-100">Dashboard</h1>
        <p className="text-slate-400 mt-1 text-sm">Season overview and recent activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Income"
          value={fmt(data.totalIncome)}
          sub="This season"
          icon={DollarSign}
          accent="bg-emerald-900/50 text-emerald-400"
        />
        <StatCard
          label="Net Profit"
          value={fmt(data.netProfit)}
          sub={`${fmt(data.totalExpenses)} expenses`}
          icon={TrendingUp}
          accent="bg-soil-900/50 text-soil-400"
        />
        <StatCard
          label="Total Loads"
          value={fmtNum(data.totalLoads)}
          sub={`${data.forageLoads} stacks · ${data.grainLoads} grain`}
          icon={Truck}
          accent="bg-blue-900/50 text-blue-400"
        />
        <StatCard
          label="Net Tons Hauled"
          value={fmtNum(data.totalNetTons)}
          sub="All commodities"
          icon={Weight}
          accent="bg-violet-900/50 text-violet-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Income by Field chart */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Income by Field</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.incomeByField} barSize={32}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.incomeByField.map((_, i) => (
                  <Cell key={i} fill={`hsl(${30 + i * 40}, 60%, ${45 + i * 5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* P&L Summary */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">P&amp;L Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-sm text-slate-400">Gross Income</span>
              <span className="text-sm font-medium text-emerald-400">{fmt(data.totalIncome)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-sm text-slate-400">Total Expenses</span>
              <span className="text-sm font-medium text-red-400">- {fmt(data.totalExpenses)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-semibold text-slate-200">Net Profit</span>
              <span className={`text-sm font-bold ${data.netProfit >= 0 ? 'text-soil-300' : 'text-red-400'}`}>{fmt(data.netProfit)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-500 mb-2">Margin</div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-soil-400 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, (data.netProfit / data.totalIncome) * 100))}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {data.totalIncome > 0 ? ((data.netProfit / data.totalIncome) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Recent Loads */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Recent Loads</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left pb-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Date</th>
                <th className="text-left pb-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Customer</th>
                <th className="text-left pb-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Field</th>
                <th className="text-left pb-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Type</th>
                <th className="text-right pb-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Net (lbs)</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLoads.map((load) => (
                <tr key={load.id} className="table-row">
                  <td className="py-3 text-slate-400 font-mono text-xs">{load.date}</td>
                  <td className="py-3 text-slate-200">{load.customerName}</td>
                  <td className="py-3 text-slate-400">{load.fieldName}</td>
                  <td className="py-3">
                    <span className={load.type === 'Forage' ? 'badge-forage' : 'badge-grain'}>
                      {typeLabel(load.type)}
                    </span>
                  </td>
                  <td className="py-3 text-right text-slate-200 font-mono">{fmtNum(load.netWeight)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
