import React, { useState, useEffect } from 'react';
import {
  History,
  TrendingUp,
  Activity,
  Shield,
  RefreshCw,
  Sliders,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { runBacktest, fetchDatasetOverview } from '../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export default function BacktestingView() {
  const [initialInvestment, setInitialInvestment] = useState(100000);
  const [rebalFreq, setRebalFreq] = useState('Monthly'); // 'Monthly', 'Quarterly', 'None'
  const [feeBps, setFeeBps] = useState(10); // 10 bps

  const [loading, setLoading] = useState(false);
  const [backtestResult, setBacktestResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRunBacktest = async () => {
    try {
      setLoading(true);
      setError(null);
      const ds = await fetchDatasetOverview();
      const stocks = ds.stocks || [];
      const weights = {};
      stocks.forEach((s) => (weights[s] = 1.0 / stocks.length));

      const res = await runBacktest({
        weights,
        initial_investment: parseFloat(initialInvestment),
        rebalance_frequency: rebalFreq,
        transaction_cost_bps: parseFloat(feeBps)
      });
      setBacktestResult(res);
    } catch (err) {
      setError(err.message || 'Failed to execute backtest');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRunBacktest();
  }, [rebalFreq, feeBps]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" /> Walk-Forward Historical Backtesting Engine
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Backtest algorithmic portfolio allocations against historical daily market series with realistic transaction fees and slippage modeling.
        </p>
      </div>

      {/* Quantitative Execution Notice */}
      <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs text-indigo-200 flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>
          <strong>Methodological Notice:</strong> Historical backtesting reflects past algorithmic performance under simulated market constraints; it does not constitute deterministic future financial prediction.
        </span>
      </div>

      {/* Backtest Parameters */}
      <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300 font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Execution Parameters
          </span>
          <button
            onClick={handleRunBacktest}
            disabled={loading}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span>Run Backtest</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <label className="text-gray-400 block mb-1">Initial Capital ($)</label>
            <input
              type="number"
              value={initialInvestment}
              onChange={(e) => setInitialInvestment(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Rebalance Cadence</label>
            <select
              value={rebalFreq}
              onChange={(e) => setRebalFreq(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="Monthly">Monthly (21 Days)</option>
              <option value="Quarterly">Quarterly (63 Days)</option>
              <option value="None">Buy & Hold (No Rebalance)</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Transaction Cost: {feeBps} bps</label>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={feeBps}
              onChange={(e) => setFeeBps(parseInt(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer mt-2"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">{(feeBps / 100).toFixed(2)}% slippage & broker fee</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      )}

      {backtestResult && !loading && (
        <>
          {/* Comparative Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 font-mono">
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Final Capital</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">
                ${backtestResult.final_value?.toLocaleString()}
              </span>
              <span className="text-[10px] text-gray-400">Benchmark: ${backtestResult.benchmark_final_value?.toLocaleString()}</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Total Return</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">
                +{backtestResult.total_return_pct}%
              </span>
              <span className="text-[10px] text-gray-400">Benchmark: +{backtestResult.benchmark_total_return_pct}%</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">CAGR (Annualized)</span>
              <span className="text-xl font-bold text-cyan-400 mt-1 block">
                {backtestResult.cagr_pct}%
              </span>
              <span className="text-[10px] text-gray-400">Benchmark: {backtestResult.benchmark_cagr_pct}%</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Sharpe Ratio</span>
              <span className="text-xl font-bold text-indigo-300 mt-1 block">
                {backtestResult.sharpe_ratio}
              </span>
              <span className="text-[10px] text-gray-400">Benchmark: {backtestResult.benchmark_sharpe}</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Max Drawdown</span>
              <span className="text-xl font-bold text-rose-400 mt-1 block">
                {backtestResult.max_drawdown_pct}%
              </span>
              <span className="text-[10px] text-gray-400">Peak-to-Trough</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Fees & Rebalances</span>
              <span className="text-xl font-bold text-amber-300 mt-1 block">
                {backtestResult.rebalance_count} Rebal
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">${backtestResult.total_fees_paid} Fees</span>
            </div>
          </div>

          {/* Equity Curves Comparison */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Historical Equity Curves: Portfolio vs Benchmark
            </h3>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={backtestResult.equity_curve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="$" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="portfolio" name="Optimized Portfolio ($)" stroke="#10B981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="benchmark" name="Equal-Weight Baseline ($)" stroke="#6B7280" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
