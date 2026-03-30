'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';

interface RepData {
  name: string;
  dealsClosed: number;
  pipelineValue: number;
  winRate: number;
  avgDealSize: number;
  activitiesLogged: number;
}

const sampleReps: RepData[] = [
  { name: 'Sarah K.', dealsClosed: 14, pipelineValue: 420000, winRate: 38, avgDealSize: 30000, activitiesLogged: 87 },
  { name: 'Mike R.', dealsClosed: 11, pipelineValue: 385000, winRate: 32, avgDealSize: 35000, activitiesLogged: 72 },
  { name: 'Jessica L.', dealsClosed: 18, pipelineValue: 510000, winRate: 42, avgDealSize: 28333, activitiesLogged: 104 },
  { name: 'David T.', dealsClosed: 9, pipelineValue: 290000, winRate: 28, avgDealSize: 32222, activitiesLogged: 65 },
  { name: 'Emily W.', dealsClosed: 16, pipelineValue: 465000, winRate: 36, avgDealSize: 29063, activitiesLogged: 93 },
];

export default function RepPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof RepData>('dealsClosed');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    );
  }

  const sortedReps = [...sampleReps].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const dir = sortDir === 'asc' ? 1 : -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
    return String(aVal).localeCompare(String(bVal)) * dir;
  });

  const handleSort = (col: keyof RepData) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const sortIcon = (col: keyof RepData) =>
    sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  const totalDeals = sampleReps.reduce((s, r) => s + r.dealsClosed, 0);
  const totalPipeline = sampleReps.reduce((s, r) => s + r.pipelineValue, 0);
  const avgWinRate = Math.round(sampleReps.reduce((s, r) => s + r.winRate, 0) / sampleReps.length);
  const topRep = sampleReps.reduce((best, r) => r.dealsClosed > best.dealsClosed ? r : best);

  const radarData = sampleReps.map((r) => ({
    name: r.name,
    deals: Math.round((r.dealsClosed / 20) * 100),
    winRate: r.winRate,
    activities: Math.round((r.activitiesLogged / 120) * 100),
    avgSize: Math.round((r.avgDealSize / 40000) * 100),
  }));

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Rep Performance</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Individual sales rep metrics and comparative analytics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card-glow">
          <p className="text-[11px] uppercase tracking-widest mb-2">Total Deals Closed</p>
          <p className="text-3xl font-bold text-gray-900 font-mono tabular-nums">{totalDeals}</p>
        </div>
        <div className="card-glow" style={{ borderTopColor: "#10b981" }}>
          <p className="text-[11px] uppercase tracking-widest mb-2">Total Pipeline</p>
          <p className="text-3xl font-bold text-green-600 font-mono tabular-nums">
            ${(totalPipeline / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="card-glow" style={{ borderTopColor: "#0891b2" }}>
          <p className="text-[11px] uppercase tracking-widest mb-2">Avg Win Rate</p>
          <p className="text-3xl font-bold text-teal-600 font-mono tabular-nums">{avgWinRate}%</p>
        </div>
        <div className="card-glow" style={{ borderTopColor: "#8b5cf6" }}>
          <p className="text-[11px] uppercase tracking-widest mb-2">Top Performer</p>
          <p className="text-2xl font-bold text-purple-600">{topRep.name}</p>
          <p className="text-[11px] mt-1.5">{topRep.dealsClosed} deals closed</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-1">Deals Closed by Rep</h3>
          <p className="text-sm mb-4">Number of deals closed per sales representative</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sampleReps} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis type="number" tick={{ fontFamily: 'var(--font-fira-code)', fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontFamily: 'var(--font-fira-sans)', fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="dealsClosed" name="Deals" fill="#22d3ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-1">Performance Radar</h3>
          <p className="text-sm mb-4">Normalized score (0-100) across key metrics</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" tick={{ fontFamily: 'var(--font-fira-sans)', fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Deals" dataKey="deals" stroke="#1e40af" fill="#22d3ee" fillOpacity={0.2} />
              <Radar name="Win Rate" dataKey="winRate" stroke="#059669" fill="#059669" fillOpacity={0.15} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rep Table */}
      <div className="card overflow-hidden">
        <h3 className="text-lg font-semibold mb-4">
          Rep Details ({sampleReps.length} reps)
        </h3>
        <div className="overflow-x-auto">
          <table className="dashboard-table">
            <thead className="">
              <tr>
                <th
                  className=""
                  onClick={() => handleSort('name')}
                >
                  Rep{sortIcon('name')}
                </th>
                <th
                  className="" style={{ textAlign: "right" }}
                  onClick={() => handleSort('dealsClosed')}
                >
                  Deals{sortIcon('dealsClosed')}
                </th>
                <th
                  className="" style={{ textAlign: "right" }}
                  onClick={() => handleSort('pipelineValue')}
                >
                  Pipeline{sortIcon('pipelineValue')}
                </th>
                <th
                  className="" style={{ textAlign: "right" }}
                  onClick={() => handleSort('winRate')}
                >
                  Win Rate{sortIcon('winRate')}
                </th>
                <th
                  className="" style={{ textAlign: "right" }}
                  onClick={() => handleSort('avgDealSize')}
                >
                  Avg Deal{sortIcon('avgDealSize')}
                </th>
                <th
                  className="" style={{ textAlign: "right" }}
                  onClick={() => handleSort('activitiesLogged')}
                >
                  Activities{sortIcon('activitiesLogged')}
                </th>
              </tr>
            </thead>
            <tbody >
              {sortedReps.map((rep) => (
                <tr key={rep.name} >
                  <td className="" style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                    {rep.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono tabular-nums">
                    {rep.dealsClosed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono tabular-nums">
                    ${(rep.pipelineValue / 1000).toFixed(0)}K
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      rep.winRate >= 35 ? 'bg-green-100 text-green-800' :
                      rep.winRate >= 25 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {rep.winRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono tabular-nums">
                    ${rep.avgDealSize.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono tabular-nums">
                    {rep.activitiesLogged}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data source notice */}
      <div className="card mt-6">
        <div className="text-center py-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Sample data shown. Connect a CRM or BigQuery data source for live rep performance metrics.
          </p>
        </div>
      </div>
    </div>
  );
}
