import React, { useState, useEffect } from 'react';
import {
  Zap,
  AlertTriangle,
  TrendingDown,
  Activity,
  ArrowDownRight,
  RefreshCw,
  Sliders,
  DollarSign
} from 'lucide-react';
import { simulateShock, fetchDatasetOverview } from '../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function MarketShockView() {
  const [scenario, setScenario] = useState('Market-Wide Crash');
  const [magnitude, setMagnitude] = useState(-25);
  const [duration, setDuration] = useState(15);
  const [recovery, setRecovery] = useState(40);
  const [capital, setCapital] = useState(100000);
  const [stocks, setStocks] = useState([]);
  const [targetStock, setTargetStock] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  const [shockResult, setShockResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStocks() {
      try {
        const ds = await fetchDatasetOverview();
        if (ds.stocks && ds.stocks.length > 0) {
          setStocks(ds.stocks);
          setTargetStock(ds.stocks[0]);
          setHasLoaded(true);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadStocks();
  }, []);

  const handleSimulate = async () => {
    if (stocks.length === 0) return;
    try {
      setLoading(true);
      setError(null);
      // Equal weights as baseline for shock test
      const weights = {};
      stocks.forEach((s) => (weights[s] = 1.0 / stocks.length));

      const res = await simulateShock({
        weights,
        scenario_type: scenario,
        magnitude_pct: parseFloat(magnitude),
        target_stocks: targetStock ? [targetStock] : null,
        duration_days: parseInt(duration),
        recovery_pct: parseFloat(recovery),
        initial_portfolio_value: parseFloat(capital)
      });
      setShockResult(res);
    } catch (err) {
      setError(err.message || 'Failed to simulate shock');
    } finally {
      setLoading(false);
    }
  };

  // Auto-run when scenario or targetStock changes (not on slider drag)
  useEffect(() => {
    if (hasLoaded && stocks.length > 0) {
      handleSimulate();
    }
  }, [scenario, targetStock, hasLoaded]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" /> Market Shock & Stress Testing Simulator
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Simulate black swan events, severe drawdowns, sector panics, and volatile recovery trajectories on non-destructive copies of historical price series.
        </p>
      </div>

      {/* Scenario Control Panel */}
      <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300 font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" /> Stress Scenario Configuration
          </span>
          <button
            onClick={handleSimulate}
            disabled={loading}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg shadow-md shadow-amber-600/20 flex items-center space-x-1.5 transition"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            <span>Execute Shock Simulation</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-mono">
          {/* Scenario Type */}
          <div>
            <label className="text-gray-400 block mb-1">Scenario Type</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-200 text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="Market-Wide Crash">Market-Wide Crash</option>
              <option value="Single Stock Crash">Single Stock Crash</option>
              <option value="Sector Crash">Sector Crash</option>
              <option value="High Volatility">High Volatility Spike</option>
              <option value="Sudden Recovery">Sudden V-Recovery</option>
              <option value="Random Shock">Random Black Swan</option>
            </select>
          </div>

          {/* Magnitude Slider */}
          <div>
            <label className="text-gray-400 block mb-1">Shock Magnitude: {magnitude}%</label>
            <input
              type="range"
              min="-60"
              max="-5"
              step="5"
              value={magnitude}
              onChange={(e) => setMagnitude(Number(e.target.value))}
              onMouseUp={handleSimulate}
              onTouchEnd={handleSimulate}
              className="w-full accent-amber-500 cursor-pointer mt-2"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-gray-400 block mb-1">Duration: {duration} Days</label>
            <input
              type="range"
              min="5"
              max="45"
              step="5"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              onMouseUp={handleSimulate}
              onTouchEnd={handleSimulate}
              className="w-full accent-amber-500 cursor-pointer mt-2"
            />
          </div>

          {/* Recovery % */}
          <div>
            <label className="text-gray-400 block mb-1">Recovery Bounce: {recovery}%</label>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={recovery}
              onChange={(e) => setRecovery(Number(e.target.value))}
              onMouseUp={handleSimulate}
              onTouchEnd={handleSimulate}
              className="w-full accent-amber-500 cursor-pointer mt-2"
            />
          </div>

          {/* Target Stock (if single crash) */}
          <div>
            <label className="text-gray-400 block mb-1">Primary Target</label>
            <select
              value={targetStock}
              onChange={(e) => setTargetStock(e.target.value)}
              disabled={scenario !== 'Single Stock Crash' && scenario !== 'Sector Crash'}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-200 text-xs focus:outline-none disabled:opacity-40"
            >
              {stocks.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {shockResult && (
        <>
          {/* Stress KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Pre-Shock Value</span>
              <span className="text-lg font-bold text-gray-100 font-mono mt-1 block">
                ${shockResult.initial_value?.toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Post-Shock Value</span>
              <span className="text-lg font-bold text-rose-400 font-mono mt-1 block">
                ${shockResult.post_shock_value?.toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Portfolio Loss</span>
              <span className="text-lg font-bold text-rose-400 font-mono mt-1 block">
                {shockResult.loss_pct}%
              </span>
              <span className="text-[10px] text-rose-400/80 font-mono">-${Math.abs(shockResult.dollar_loss).toLocaleString()}</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Max Stress Drawdown</span>
              <span className="text-lg font-bold text-rose-300 font-mono mt-1 block">
                {shockResult.max_drawdown}%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Baseline Volatility</span>
              <span className="text-lg font-bold text-gray-300 font-mono mt-1 block">
                {shockResult.baseline_volatility}%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Stressed Volatility</span>
              <span className="text-lg font-bold text-amber-400 font-mono mt-1 block">
                {shockResult.stressed_volatility}%
              </span>
            </div>
          </div>

          {/* Trajectory Curve */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" /> Simulated Portfolio Trajectory ({scenario})
            </h3>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={shockResult.trajectory}>
                  <defs>
                    <linearGradient id="shockGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="day" stroke="#6B7280" tick={{ fontSize: 10 }} label={{ value: 'Simulation Day', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#6B7280' }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="$" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 11 }} />
                  <Area type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} fill="url(#shockGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stock Level Damage Table */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono">
              Stock-Level Impact Attribution
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Stock</th>
                    <th className="p-2.5">Weight %</th>
                    <th className="p-2.5">Initial Value ($)</th>
                    <th className="p-2.5">Shock Return %</th>
                    <th className="p-2.5">PnL Dollar Impact</th>
                    <th className="p-2.5">Post-Shock Value ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {shockResult.stock_impacts.map((row) => (
                    <tr key={row.ticker} className="hover:bg-gray-800/30 transition">
                      <td className="p-2.5 font-bold text-gray-200">{row.ticker}</td>
                      <td className="p-2.5 text-gray-300">{row.weight_pct}%</td>
                      <td className="p-2.5 text-gray-300">${row.initial_value?.toLocaleString()}</td>
                      <td className={`p-2.5 font-bold ${row.shock_return_pct < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {row.shock_return_pct}%
                      </td>
                      <td className={`p-2.5 font-semibold ${row.pnl_impact < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ${row.pnl_impact?.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-gray-200 font-bold">${row.post_shock_value?.toLocaleString()}</td>
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
