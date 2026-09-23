import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Sliders,
  AlertCircle,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { evaluateRebalance, fetchDatasetOverview } from '../services/api';

export default function RebalancingView() {
  const [driftThreshold, setDriftThreshold] = useState(5);
  const [volSurgeThreshold, setVolSurgeThreshold] = useState(30);
  const [drawdownLimit, setDrawdownLimit] = useState(12);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleEvaluate = async () => {
    try {
      setLoading(true);
      setError(null);
      const ds = await fetchDatasetOverview();
      const stocks = ds.stocks || [];
      const weights = {};
      stocks.forEach((s) => (weights[s] = 1.0 / stocks.length));

      const res = await evaluateRebalance({
        target_weights: weights,
        drift_threshold: driftThreshold / 100.0,
        vol_surge_threshold: volSurgeThreshold / 100.0,
        drawdown_limit: drawdownLimit / 100.0
      });
      setResult(res);
    } catch (err) {
      setError(err.message || 'Failed to evaluate dynamic rebalancing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleEvaluate();
  }, [driftThreshold, volSurgeThreshold, drawdownLimit]);

  const events = result?.events || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-emerald-400" /> Dynamic Adaptive Portfolio Rebalancing
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Adaptive rebalancing triggered by allocation drift, volatility spikes, trend reversals, or drawdown breaches with explicit algorithmic audit trails.
        </p>
      </div>

      {/* Trigger Threshold Controls */}
      <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300 font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Adaptive Trigger Thresholds
          </span>
          <button
            onClick={handleEvaluate}
            disabled={loading}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span>Re-evaluate Triggers</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-mono">
          <div>
            <div className="flex justify-between text-gray-300">
              <span>Max Allocation Drift:</span>
              <span className="text-emerald-400 font-bold">{driftThreshold}%</span>
            </div>
            <input
              type="range"
              min="2"
              max="15"
              step="1"
              value={driftThreshold}
              onChange={(e) => setDriftThreshold(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer mt-2"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Triggers when any asset deviates &gt; {driftThreshold}% from target weight.
            </span>
          </div>

          <div>
            <div className="flex justify-between text-gray-300">
              <span>Volatility Surge Limit:</span>
              <span className="text-amber-400 font-bold">+{volSurgeThreshold}%</span>
            </div>
            <input
              type="range"
              min="15"
              max="60"
              step="5"
              value={volSurgeThreshold}
              onChange={(e) => setVolSurgeThreshold(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer mt-2"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Triggers when rolling 21d volatility surges &gt; {volSurgeThreshold}% above baseline.
            </span>
          </div>

          <div>
            <div className="flex justify-between text-gray-300">
              <span>Interim Drawdown Ceiling:</span>
              <span className="text-rose-400 font-bold">{drawdownLimit}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={drawdownLimit}
              onChange={(e) => setDrawdownLimit(parseInt(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer mt-2"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Triggers risk reduction if drawdown breaches {drawdownLimit}%.
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
            <span className="text-[10px] text-gray-400 uppercase block">Total Rebalances Triggered</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {result.total_rebalance_events} Events
            </span>
            <span className="text-[10px] text-gray-400">Across entire historical timeline</span>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
            <span className="text-[10px] text-gray-400 uppercase block">Triggered Action Frequency</span>
            <span className="text-2xl font-bold text-cyan-400 mt-1 block">
              ~{(result.total_rebalance_events / 3).toFixed(1)} / Year
            </span>
            <span className="text-[10px] text-gray-400">Disciplined turnover frequency</span>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
            <span className="text-[10px] text-gray-400 uppercase block">Turnover Cost Protection</span>
            <span className="text-2xl font-bold text-amber-300 mt-1 block">
              Optimal
            </span>
            <span className="text-[10px] text-gray-400">Minimizes unnecessary fee friction</span>
          </div>
        </div>
      )}

      {/* Rebalance Event Audit Timeline */}
      {events.length > 0 ? (
        <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Algorithmic Rebalancing Audit Trail
          </h3>

          <div className="space-y-3">
            {events.map((ev, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-gray-950 border border-gray-800/80 space-y-3 hover:border-gray-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800/60 pb-2.5">
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      EVENT #{idx + 1}
                    </span>
                    <span className="text-gray-300 font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" /> {ev.date}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-gray-400">
                    Portfolio Capital: <strong className="text-gray-200">${ev.portfolio_value.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Primary Reason Callout */}
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-xs text-emerald-300 space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 block font-semibold">
                    Causal Trigger Rationale:
                  </span>
                  {(ev.all_reasons || [ev.primary_reason]).map((r, rIdx) => (
                    <div key={rIdx} className="flex items-start space-x-2 font-mono text-[11px]">
                      <span className="text-emerald-400 font-bold">→</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>

                {/* Weight Changes Sample */}
                <div className="pt-1">
                  <span className="text-[10px] text-gray-400 font-mono uppercase block mb-1.5">
                    Selected Allocation Adjustments:
                  </span>
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    {Object.keys(ev.new_weights).slice(0, 6).map((s) => {
                      const oldW = ev.previous_weights[s];
                      const newW = ev.new_weights[s];
                      const diff = newW - oldW;
                      return (
                        <div key={s} className="px-2.5 py-1 rounded bg-gray-900 border border-gray-800 text-[11px] flex items-center space-x-1.5">
                          <span className="text-gray-300 font-bold">{s}:</span>
                          <span className="text-gray-400">{oldW}%</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className={diff > 0 ? 'text-emerald-400 font-bold' : (diff < 0 ? 'text-rose-400 font-bold' : 'text-gray-200')}>
                            {newW}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-gray-900/60 border border-gray-800 text-center text-xs text-gray-400">
          No rebalancing thresholds crossed under current sensitivity parameters.
        </div>
      )}
    </div>
  );
}
