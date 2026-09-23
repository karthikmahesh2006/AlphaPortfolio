import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  Zap,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { fetchDatasetOverview, fetchMarketOverview } from '../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function DashboardView({ setTab, onSelectStock }) {
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState(null);
  const [market, setMarket] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ds, mk] = await Promise.all([
        fetchDatasetOverview(),
        fetchMarketOverview()
      ]);
      setDataset(ds);
      setMarket(mk);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-xs text-gray-400 font-mono">Loading financial market analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-xl text-red-300 text-xs">
        <p className="font-semibold">Dashboard Notice:</p>
        <p className="mt-1">{error}</p>
        <button
          onClick={loadData}
          className="mt-3 px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 rounded text-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  const qualityAudit = dataset?.quality_audit || {};
  const qualityScore = qualityAudit.quality_score || 95;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-gray-900 to-indigo-950/40 border border-gray-800 p-6">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Live Analytical Terminal
            </span>
            <h1 className="text-xl font-bold text-gray-100 mt-2">
              AlphaPortfolio Analytics Terminal
            </h1>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Algorithmic asset evaluation, graph relationship discovery, portfolio optimization, market stress simulation, and counterfactual scenario analysis.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setTab('portfolio')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 transition flex items-center space-x-2"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Optimize Portfolio</span>
            </button>
            <button
              onClick={() => setTab('upload')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg border border-gray-700 transition"
            >
              Change Dataset
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800/80">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>Total Universe</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-gray-100">{dataset?.num_stocks || 0}</span>
            <span className="text-xs text-gray-400 font-mono">Equities</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between font-mono">
            <span>Records: {dataset?.num_rows?.toLocaleString()}</span>
            <span className="text-cyan-400 font-semibold">{dataset?.format?.toUpperCase()}</span>
          </div>
        </div>

        {/* Market Trend */}
        <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800/80">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>Market Regime</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-400">
              {market?.market_return_pct >= 0 ? `+${market?.market_return_pct}%` : `${market?.market_return_pct}%`}
            </span>
            <span className="text-xs text-gray-400 font-mono">Index Return</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{market?.overall_trend || 'Bullish / Expansion'}</span>
          </div>
        </div>

        {/* Date Coverage */}
        <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800/80">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>Date Range</span>
            <BarChart3 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-sm font-bold text-gray-100 font-mono">
            {dataset?.date_range?.[0]} → {dataset?.date_range?.[1]}
          </div>
          <div className="mt-3 text-[11px] text-gray-400 font-mono flex items-center justify-between">
            <span>Continuous Timeline</span>
            <span className="text-indigo-400">Trading Days</span>
          </div>
        </div>

        {/* Data Quality Score */}
        <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800/80">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>Data Quality Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-300">{qualityScore}/100</span>
            <span className="text-xs text-emerald-400 font-mono">
              ({qualityAudit.quality_rating || 'Excellent'})
            </span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400 font-mono flex items-center justify-between">
            <span>Missing: {qualityAudit.missing_percentage || 0}%</span>
            <span>Outliers: {qualityAudit.total_outliers || 0}</span>
          </div>
        </div>
      </div>

      {/* Chart: Market Trajectory */}
      <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Market Trajectory (Equal-Weight Synthetic Index)
            </h3>
            <p className="text-xs text-gray-400">Aggregated historical baseline performance of loaded equities</p>
          </div>
          <div className="text-xs font-mono px-2.5 py-1 bg-gray-800 rounded border border-gray-700 text-gray-300">
            {market?.market_trajectory?.length || 0} Data Points
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={market?.market_trajectory || []}>
              <defs>
                <linearGradient id="marketGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 11 }}
                formatter={(val) => [`${val}%`, 'Return']}
              />
              <Area
                type="monotone"
                dataKey="return_pct"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#marketGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Market Leaders & Movers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers */}
        <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
              <TrendingUp className="w-3.5 h-3.5" /> Best Performers
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">Total Return</span>
          </div>
          <div className="divide-y divide-gray-800/60">
            {(market?.best_performing || []).map((s) => (
              <div
                key={s.ticker}
                onClick={() => {
                  onSelectStock && onSelectStock(s.ticker);
                  setTab('trends');
                }}
                className="py-2.5 flex items-center justify-between hover:bg-gray-800/40 px-2 rounded-lg cursor-pointer transition"
              >
                <div>
                  <span className="font-bold text-xs text-gray-200">{s.ticker}</span>
                  <div className="text-[10px] text-gray-400 font-mono">${s.latest_price}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400 font-mono flex items-center justify-end">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" /> +{s.total_return}%
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Vol: {s.annualized_vol}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worst Performers */}
        <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-mono">
              <TrendingDown className="w-3.5 h-3.5" /> Worst Performers
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">Total Return</span>
          </div>
          <div className="divide-y divide-gray-800/60">
            {(market?.worst_performing || []).map((s) => (
              <div
                key={s.ticker}
                onClick={() => {
                  onSelectStock && onSelectStock(s.ticker);
                  setTab('trends');
                }}
                className="py-2.5 flex items-center justify-between hover:bg-gray-800/40 px-2 rounded-lg cursor-pointer transition"
              >
                <div>
                  <span className="font-bold text-xs text-gray-200">{s.ticker}</span>
                  <div className="text-[10px] text-gray-400 font-mono">${s.latest_price}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-400 font-mono flex items-center justify-end">
                    <ArrowDownRight className="w-3 h-3 mr-0.5" /> {s.total_return}%
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Vol: {s.annualized_vol}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Volatile */}
        <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-mono">
              <Activity className="w-3.5 h-3.5" /> Most Volatile
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">Annualized Vol</span>
          </div>
          <div className="divide-y divide-gray-800/60">
            {(market?.most_volatile || []).map((s) => (
              <div
                key={s.ticker}
                onClick={() => {
                  onSelectStock && onSelectStock(s.ticker);
                  setTab('trends');
                }}
                className="py-2.5 flex items-center justify-between hover:bg-gray-800/40 px-2 rounded-lg cursor-pointer transition"
              >
                <div>
                  <span className="font-bold text-xs text-gray-200">{s.ticker}</span>
                  <div className="text-[10px] text-gray-400 font-mono">${s.latest_price}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {s.annualized_vol}%
                  </span>
                  <div className="text-[10px] text-gray-400 font-mono">Ret: {s.total_return}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
