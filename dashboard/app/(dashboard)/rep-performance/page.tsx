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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-covr-blue"></div>
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
        <h1 className="text-2xl font-bold text-gray-900">Rep Performance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Individual sales rep metrics and comparative analytics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card border-l-4 border-l-covr-blue">
          <p className="text-sm text-gray-600 mb-1">Total Deals Closed</p>
          <p className="text-3xl font-bold text-gray-900 font-mono tabular-nums">{totalDeals}</p>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <p className="text-sm text-gray-600 mb-1">Total Pipeline</p>
          <p className="text-3xl font-bold text-green-600 font-mono tabular-nums">
            ${(totalPipeline / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="card border-l-4 border-l-covr-teal">
          <p className="text-sm text-gray-600 mb-1">Avg Win Rate</p>
          <p className="text-3xl font-bold text-teal-600 font-mono tabular-nums">{avgWinRate}%</p>
        </div>
        <div className="card border-l-4 border-l-purple-500">
          <p className="text-sm text-gray-600 mb-1">Top Performer</p>
          <p className="text-2xl font-bold text-purple-600">{topRep.name}</p>
          <p className="text-xs text-gray-400 mt-1">{topRep.dealsClosed} deals closed</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Deals Closed by Rep</h3>
          <p className="text-sm text-gray-500 mb-4">Number of deals closed per sales representative</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sampleReps} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontFamily: 'var(--font-fira-code)' }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontFamily: 'var(--font-fira-sans)', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="dealsClosed" name="Deals" fill="#1e40af" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Performance Radar</h3>
          <p className="text-sm text-gray-500 mb-4">Normalized score (0-100) across key metrics</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" tick={{ fontFamily: 'var(--font-fira-sans)', fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Deals" dataKey="deals" stroke="#1e40af" fill="#1e40af" fillOpacity={0.2} />
              <Radar name="Win Rate" dataKey="winRate" stroke="#059669" fill="#059669" fillOpacity={0.15} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rep Table */}
      <div className="card overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Rep Details ({sampleReps.length} reps)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  onClick={() => handleSort('name')}
                >
                  Rep{sortIcon('name')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  onClick={() => handleSort('dealsClosed')}
                >
                  Deals{sortIcon('dealsClosed')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  onClick={() => handleSort('pipelineValue')}
                >
                  Pipeline{sortIcon('pipelineValue')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  onClick={() => handleSort('winRate')}
                >
                  Win Rate{sortIcon('winRate')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  onClick={() => handleSort('avgDealSize')}
                >
                  Avg Deal{sortIcon('avgDealSize')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  onClick={() => handleSort('activitiesLogged')}
                >
                  Activities{sortIcon('activitiesLogged')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedReps.map((rep) => (
                <tr key={rep.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
          <p className="text-xs text-gray-400">
            Sample data shown. Connect a CRM or BigQuery data source for live rep performance metrics.
          </p>
        </div>
      </div>
    </div>
  );
}
