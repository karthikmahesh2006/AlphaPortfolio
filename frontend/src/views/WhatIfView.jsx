import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  TrendingDown,
  Activity,
  DollarSign,
  Sliders,
  RefreshCw,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { runWhatIf, fetchDatasetOverview } from '../services/api';

export default function WhatIfView() {
  const [stocks, setStocks] = useState([]);
  const [targetStock, setTargetStock] = useState('');
  const [stockDrop, setStockDrop] = useState(-25);
  const [removedStock, setRemovedStock] = useState('');
  const [volMultiplier, setVolMultiplier] = useState(1.0);
  const [capitalMultiplier, setCapitalMultiplier] = useState(1.0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
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

  const handleSimulateWhatIf = async () => {
    if (stocks.length === 0) return;

    // Guard: can't remove all stocks
    const remainingStocks = removedStock ? stocks.filter(s => s !== removedStock) : stocks;
    if (remainingStocks.length === 0) {
      setError('Cannot remove all stocks from the portfolio. Please keep at least one asset.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const baseWeights = {};
      stocks.forEach((s) => (baseWeights[s] = 1.0 / stocks.length));

      const res = await runWhatIf({
        base_weights: baseWeights,
        shocked_stock: targetStock || null,
        stock_drop_pct: parseFloat(stockDrop),
        removed_stock: removedStock || null,
        volatility_multiplier: parseFloat(volMultiplier),
        capital_multiplier: parseFloat(capitalMultiplier)
      });
      setResult(res);
    } catch (err) {
      setError(err.message || 'Failed to evaluate What-If scenario');
    } finally {
      setLoading(false);
    }
  };

  // Auto-run only when dataset loads or stock dropdown changes (not slider moves)
  useEffect(() => {
    if (hasLoaded && stocks.length > 0) {
      handleSimulateWhatIf();
    }
  }, [hasLoaded, targetStock, removedStock]);

  const newMetrics = result?.new_metrics || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-400" /> "What If?" Scenario Sandbox
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Explore hypothetical counterfactual market events: asset shocks, asset exclusion, volatility doubling, and capital scaling.
        </p>
      </div>

      {/* Preset Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <button
          onClick={() => {
            setStockDrop(-25);
            setVolMultiplier(1.0);
            setRemovedStock('');
          }}
          className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-emerald-500/50 text-left transition"
        >
          <div className="text-xs font-bold text-gray-200">What if Stock drops 25%?</div>
          <p className="text-[11px] text-gray-400 mt-1">Single asset sudden drop</p>
        </button>

        <button
          onClick={() => {
            setVolMultiplier(2.0);
            setStockDrop(0);
            setRemovedStock('');
          }}
          className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-emerald-500/50 text-left transition"
        >
          <div className="text-xs font-bold text-gray-200">What if Market Volatility Doubles?</div>
          <p className="text-[11px] text-gray-400 mt-1">2.0x variance surge across all assets</p>
        </button>

        <button
          onClick={() => {
            if (stocks.length > 0) setRemovedStock(stocks[0]);
            setVolMultiplier(1.0);
            setStockDrop(0);
          }}
          className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-emerald-500/50 text-left transition"
        >
          <div className="text-xs font-bold text-gray-200">What if I remove high-beta Stock?</div>
          <p className="text-[11px] text-gray-400 mt-1">Recalculate weights without holding</p>
        </button>

        <button
          onClick={() => {
            setCapitalMultiplier(2.0);
            setVolMultiplier(1.0);
            setStockDrop(0);
            setRemovedStock('');
          }}
          className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-emerald-500/50 text-left transition"
        >
          <div className="text-xs font-bold text-gray-200">What if Capital Doubles?</div>
          <p className="text-[11px] text-gray-400 mt-1">Scale portfolio investment $200k</p>
        </button>
      </div>

      {/* Interactive Sliders Form */}
      <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300 font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Interactive Counterfactual Controls
          </span>
          <button
            onClick={handleSimulateWhatIf}
            disabled={loading}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            <span>Run Scenario</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          {/* Target Stock Drop */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Target Asset:</span>
              <select
                value={targetStock}
                onChange={(e) => setTargetStock(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded px-2 py-0.5 text-emerald-400"
              >
                {stocks.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-between text-gray-400 mt-2">
              <span>Drop Magnitude:</span>
              <span className="text-rose-400 font-bold">{stockDrop}%</span>
            </div>
            <input
              type="range"
              min="-50"
              max="0"
              value={stockDrop}
              onChange={(e) => setStockDrop(Number(e.target.value))}
              onMouseUp={handleSimulateWhatIf}
              onTouchEnd={handleSimulateWhatIf}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Remove Asset */}
          <div className="space-y-1">
            <label className="text-gray-400 block mb-1">Exclude Asset from Portfolio</label>
            <select
              value={removedStock}
              onChange={(e) => setRemovedStock(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-gray-200"
            >
              <option value="">-- None (Keep All) --</option>
              {stocks.map((s) => (
                <option key={s} value={s}>Remove {s}</option>
              ))}
            </select>
            <span className="text-[10px] text-gray-400 block mt-1">Capital automatically redistributes</span>
          </div>

          {/* Volatility Multiplier */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Volatility Regime:</span>
              <span className="text-amber-400 font-bold">{volMultiplier}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.25"
              value={volMultiplier}
              onChange={(e) => setVolMultiplier(parseFloat(e.target.value))}
              onMouseUp={handleSimulateWhatIf}
              onTouchEnd={handleSimulateWhatIf}
              className="w-full accent-amber-500 cursor-pointer mt-2"
            />
            <span className="text-[10px] text-gray-400 block">Simulate low or heightened market turbulence</span>
          </div>

          {/* Capital Multiplier */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Investment Scale:</span>
              <span className="text-cyan-400 font-bold">{capitalMultiplier}x (${(100000 * capitalMultiplier).toLocaleString()})</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={capitalMultiplier}
              onChange={(e) => setCapitalMultiplier(parseFloat(e.target.value))}
              onMouseUp={handleSimulateWhatIf}
              onTouchEnd={handleSimulateWhatIf}
              className="w-full accent-cyan-400 cursor-pointer mt-2"
            />
            <span className="text-[10px] text-gray-400 block">Scale budget up or down</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Recalculated Results */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Recalculated Return</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">
                {newMetrics.expected_return}%
              </span>
              <span className="text-[10px] text-gray-400">Post-scenario expectation</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Adjusted Volatility</span>
              <span className="text-xl font-bold text-amber-400 mt-1 block">
                {newMetrics.volatility}%
              </span>
              <span className="text-[10px] text-gray-400">Standard deviation</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Recalculated Sharpe</span>
              <span className="text-xl font-bold text-cyan-400 mt-1 block">
                {newMetrics.sharpe_ratio}
              </span>
              <span className="text-[10px] text-gray-400">Risk-adjusted return</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Diversification Ratio</span>
              <span className="text-xl font-bold text-indigo-300 mt-1 block">
                {newMetrics.diversification_ratio}x
              </span>
              <span className="text-[10px] text-gray-400">Choueifaty ratio</span>
            </div>
          </div>

          {/* Asset Allocations Breakdown */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono">
              Adjusted Asset Capital Allocation ($)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs">
              {(result.new_attribution || []).map((a) => (
                <div key={a.ticker} className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                  <div className="flex justify-between items-center text-gray-200 font-bold">
                    <span>{a.ticker}</span>
                    <span className="text-emerald-400">{a.allocation_pct}%</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    ${a.investment_amount?.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Ret Contrib: {a.return_contribution_pct}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
