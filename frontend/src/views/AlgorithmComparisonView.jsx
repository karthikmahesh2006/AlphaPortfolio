import React, { useState, useEffect } from 'react';
import {
  Scale,
  RefreshCw,
  Zap,
  TrendingUp,
  Activity,
  Shield,
  Layers,
  BookOpen
} from 'lucide-react';
import { compareAllAlgorithms, blendWithBenchmark } from '../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export default function AlgorithmComparisonView({ onOpenDAAWithAlgo }) {
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState(null);
  const [metricChoice, setMetricChoice] = useState('sharpe_ratio'); // 'sharpe_ratio', 'expected_return', 'volatility', 'diversification_ratio'

  const loadComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await compareAllAlgorithms({
        investment_amount: 100000,
        risk_profile: 'Moderate',
        max_stocks: 8,
        min_allocation: 0.02,
        max_allocation: 0.40
      });
      setComparison(res);
    } catch (err) {
      setError(err.message || 'Failed to compare algorithms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, []);

  const algos = comparison?.comparison || [];

  const chartData = algos.map((a) => ({
    name: a.name.split(' (')[0],
    sharpe: a.metrics.sharpe_ratio,
    return: a.metrics.expected_return,
    volatility: a.metrics.volatility,
    diversification: a.metrics.diversification_ratio,
    drawdown: Math.abs(a.metrics.max_drawdown)
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-400" /> Multi-Algorithm Portfolio Benchmark
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Simultaneous comparative execution of 5 optimization paradigms on identical dataset constraints.
          </p>
        </div>

        <button
          onClick={loadComparison}
          disabled={loading}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg border border-gray-700 flex items-center space-x-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Rerun Benchmark</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-800/50 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold block text-amber-300 font-mono">Notice:</span>
            <span>{error}</span>
          </div>
          {error.includes('requires at least 2 stocks') && (
            <button
              onClick={async () => {
                await blendWithBenchmark();
                loadComparison();
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shrink-0 transition"
            >
              Blend with Benchmark Basket
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      )}

      {comparison && !loading && (
        <>
          {/* Comparative Chart Panel */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono">
                Cross-Algorithm Performance Metrics
              </span>
              <div className="flex items-center space-x-1.5 bg-gray-950 p-1 rounded-lg border border-gray-800 text-xs font-mono">
                {[
                  { id: 'sharpe_ratio', label: 'Sharpe Ratio' },
                  { id: 'expected_return', label: 'Expected Return %' },
                  { id: 'volatility', label: 'Volatility %' },
                  { id: 'diversification_ratio', label: 'Diversification' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMetricChoice(m.id)}
                    className={`px-3 py-1 rounded transition ${
                      metricChoice === m.id ? 'bg-emerald-500 text-black font-semibold' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 11 }} />
                  {metricChoice === 'sharpe_ratio' && (
                    <Bar dataKey="sharpe" name="Sharpe Ratio" fill="#10B981" radius={[6, 6, 0, 0]} />
                  )}
                  {metricChoice === 'expected_return' && (
                    <Bar dataKey="return" name="Expected Return %" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  )}
                  {metricChoice === 'volatility' && (
                    <Bar dataKey="volatility" name="Volatility %" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  )}
                  {metricChoice === 'diversification_ratio' && (
                    <Bar dataKey="diversification" name="Diversification Ratio" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Master Side-by-Side Algorithm Comparison Table */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono">
              Empirical Results & Complexity Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Algorithm</th>
                    <th className="p-3">Paradigm</th>
                    <th className="p-3">Expected Return</th>
                    <th className="p-3">Volatility</th>
                    <th className="p-3">Sharpe Ratio</th>
                    <th className="p-3">Sortino</th>
                    <th className="p-3">Diversification</th>
                    <th className="p-3">HHI Concentration</th>
                    <th className="p-3">Complexity (Time)</th>
                    <th className="p-3">DAA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {algos.map((a) => {
                    const m = a.metrics;
                    return (
                      <tr key={a.id} className="hover:bg-gray-800/30 transition">
                        <td className="p-3 font-bold text-gray-200">{a.name}</td>
                        <td className="p-3 text-gray-400">{a.metadata?.category || 'Optimization'}</td>
                        <td className="p-3 text-emerald-400 font-semibold">{m.expected_return}%</td>
                        <td className="p-3 text-amber-400">{m.volatility}%</td>
                        <td className="p-3 text-cyan-400 font-bold text-sm">{m.sharpe_ratio}</td>
                        <td className="p-3 text-gray-300">{m.sortino_ratio}</td>
                        <td className="p-3 text-indigo-300">{m.diversification_ratio}x</td>
                        <td className="p-3 text-gray-400">{m.concentration_hhi}</td>
                        <td className="p-3 text-amber-300 font-mono">{a.metadata?.time_complexity?.split(' ')[0]}</td>
                        <td className="p-3">
                          <button
                            onClick={() => onOpenDAAWithAlgo && onOpenDAAWithAlgo(a.id)}
                            className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded text-[10px] transition flex items-center space-x-1"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
