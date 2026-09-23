import React, { useState, useEffect } from 'react';
import {
  PieChart as PieIcon,
  Sliders,
  DollarSign,
  Shield,
  TrendingUp,
  Activity,
  Layers,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { constructPortfolio, blendWithBenchmark } from '../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

const PALETTE = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', 
  '#06B6D4', '#14B8A6', '#6366F1', '#F97316', '#84CC16'
];

export default function PortfolioConstructionView({ onOpenDAAWithAlgo }) {
  const algorithm = 'hrp';
  const [investmentAmount, setInvestmentAmount] = useState(100000);
  const [riskProfile, setRiskProfile] = useState('Moderate');
  const [maxStocks, setMaxStocks] = useState(8);
  const [minAlloc, setMinAlloc] = useState(2);
  const [maxAlloc, setMaxAlloc] = useState(35);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await constructPortfolio({
        algorithm,
        investment_amount: parseFloat(investmentAmount),
        risk_profile: riskProfile,
        max_stocks: parseInt(maxStocks),
        min_allocation: minAlloc / 100.0,
        max_allocation: maxAlloc / 100.0
      });
      setResult(res);
    } catch (err) {
      setError(err.message || 'Failed to construct portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, [riskProfile]);

  const pMetrics = result?.portfolio_metrics || {};
  const attribution = result?.attribution || [];
  const chartData = attribution
    .filter((a) => a.allocation_pct > 0)
    .sort((a, b) => b.allocation_pct - a.allocation_pct);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-emerald-400" /> Multi-Objective Portfolio Construction
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Construct mathematically optimal portfolios accounting for expected returns, covariance risk, diversification ratio, and asset concentration constraints.
          </p>
        </div>
      </div>

      {/* Constraints & Parameters Card */}
      <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300 font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Optimization Parameters & Risk Constraints
          </span>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span>Recalculate</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          {/* Algorithm Indicator (Locked to Divide & Conquer HRP) */}
          <div>
            <label className="text-gray-400 font-mono block mb-1">Algorithm (DAA Paradigm)</label>
            <div className="w-full bg-gray-950 border border-emerald-500/30 rounded-lg p-2 text-emerald-400 font-mono text-xs flex items-center justify-between">
              <span className="font-semibold">HRP (Divide & Conquer)</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                Active
              </span>
            </div>
          </div>

          {/* Investment Capital */}
          <div>
            <label className="text-gray-400 font-mono block mb-1">Capital ($)</label>
            <input
              type="number"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Risk Profile */}
          <div>
            <label className="text-gray-400 font-mono block mb-1">Risk Appetite</label>
            <select
              value={riskProfile}
              onChange={(e) => setRiskProfile(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="Conservative">Conservative</option>
              <option value="Moderate">Moderate</option>
              <option value="Aggressive">Aggressive</option>
            </select>
          </div>

          {/* Max Stocks */}
          <div>
            <label className="text-gray-400 font-mono block mb-1">Max Stocks: {maxStocks}</label>
            <input
              type="range"
              min="3"
              max="15"
              value={maxStocks}
              onChange={(e) => setMaxStocks(e.target.value)}
              className="w-full accent-emerald-500 cursor-pointer mt-2"
            />
          </div>

          {/* Min Allocation */}
          <div>
            <label className="text-gray-400 font-mono block mb-1">Min Alloc: {minAlloc}%</label>
            <input
              type="range"
              min="0"
              max="10"
              value={minAlloc}
              onChange={(e) => setMinAlloc(e.target.value)}
              className="w-full accent-emerald-500 cursor-pointer mt-2"
            />
          </div>

          {/* Max Allocation */}
          <div>
            <label className="text-gray-400 font-mono block mb-1">Max Alloc: {maxAlloc}%</label>
            <input
              type="range"
              min="15"
              max="60"
              value={maxAlloc}
              onChange={(e) => setMaxAlloc(e.target.value)}
              className="w-full accent-emerald-500 cursor-pointer mt-2"
            />
          </div>
        </div>
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
                handleGenerate();
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shrink-0 transition"
            >
              Blend with Benchmark Basket
            </button>
          )}
        </div>
      )}

      {result && (
        <>
          {/* Portfolio-Level Objective Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Expected Return</span>
              <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                {pMetrics.expected_return}%
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Annualized μ</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Volatility</span>
              <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">
                {pMetrics.volatility}%
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Annualized σ</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Sharpe Ratio</span>
              <span className="text-xl font-bold text-cyan-400 font-mono mt-1 block">
                {pMetrics.sharpe_ratio}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Rf = 3.0%</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Diversification</span>
              <span className="text-xl font-bold text-indigo-300 font-mono mt-1 block">
                {pMetrics.diversification_ratio}x
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Choueifaty Ratio</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Concentration (HHI)</span>
              <span className="text-xl font-bold text-gray-200 font-mono mt-1 block">
                {pMetrics.concentration_hhi}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Eff. N = {pMetrics.effective_n_assets}</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Daily VaR 95%</span>
              <span className="text-xl font-bold text-rose-400 font-mono mt-1 block">
                {pMetrics.var_95_daily}%
              </span>
              <span className="text-[10px] text-gray-400 font-mono">CVaR = {pMetrics.cvar_95_daily}%</span>
            </div>
          </div>

          {/* Allocation Weights Bar Chart */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" /> Optimal Capital Allocation Weights ({result.algorithm_name})
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                Total Budget: ${investmentAmount.toLocaleString()}
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="ticker" stroke="#6B7280" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 11 }}
                    formatter={(val, name, item) => [`${val}% ($${item.payload.investment_amount.toLocaleString()})`, 'Allocation']}
                  />
                  <Bar dataKey="allocation_pct" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Asset-Level Risk Attribution Table */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono">
              Granular Asset Risk & Return Attribution
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Stock</th>
                    <th className="p-2.5">Weight %</th>
                    <th className="p-2.5">Capital ($)</th>
                    <th className="p-2.5">Expected Return</th>
                    <th className="p-2.5">Volatility</th>
                    <th className="p-2.5">Marginal Risk Contrib</th>
                    <th className="p-2.5">Risk Contrib %</th>
                    <th className="p-2.5">Return Contrib %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {attribution.map((row) => (
                    <tr key={row.ticker} className="hover:bg-gray-800/30 transition">
                      <td className="p-2.5 font-bold text-gray-200">{row.ticker}</td>
                      <td className="p-2.5 text-emerald-400 font-semibold">{row.allocation_pct}%</td>
                      <td className="p-2.5 text-gray-300">${row.investment_amount?.toLocaleString()}</td>
                      <td className="p-2.5 text-gray-300">{row.expected_return}%</td>
                      <td className="p-2.5 text-amber-400">{row.volatility}%</td>
                      <td className="p-2.5 text-gray-400">{row.marginal_risk_contribution}%</td>
                      <td className="p-2.5 text-cyan-400 font-semibold">{row.risk_contribution_pct}%</td>
                      <td className="p-2.5 text-emerald-400 font-semibold">{row.return_contribution_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
