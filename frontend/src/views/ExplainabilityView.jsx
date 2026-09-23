import React, { useState, useEffect } from 'react';
import {
  Eye,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  RefreshCw,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { constructPortfolio, fetchDatasetOverview } from '../services/api';

export default function ExplainabilityView() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const selectedAlgo = 'hrp';

  const loadExplanations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await constructPortfolio({
        algorithm: selectedAlgo,
        investment_amount: 100000,
        risk_profile: 'Moderate',
        max_stocks: 8,
        min_allocation: 0.02,
        max_allocation: 0.35
      });
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load explainability data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExplanations();
  }, []);

  const explanations = data?.explanations || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-400" /> Transparent & Explainable Allocation Decisions
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Algorithmic attribution rules explaining why each stock received its capital share based on empirical return momentum, covariance dampening, and risk budgets.
          </p>
        </div>

        {/* Model Indicator (Locked to Divide & Conquer HRP) */}
        <div className="flex items-center space-x-2 bg-gray-900/90 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-xs font-mono">
          <span className="text-gray-400">Model:</span>
          <span className="text-emerald-400 font-bold">HRP (Divide & Conquer)</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {explanations.map((item) => (
            <div
              key={item.ticker}
              className={`p-5 rounded-xl border transition-all ${
                item.allocation_pct > 0
                  ? 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                  : 'bg-gray-950/40 border-gray-900 opacity-60'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-gray-800 font-mono text-base font-bold text-gray-100">
                    {item.ticker}
                  </div>
                  <div>
                    <span className="text-xs font-mono text-gray-400">Allocated Share</span>
                    <div className="text-lg font-bold text-emerald-400 font-mono">
                      {item.allocation_pct}%
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs font-mono">
                  <span className="text-gray-400">Risk Contrib: </span>
                  <strong className="text-cyan-400">{item.risk_contribution_pct}%</strong>
                  <div className="text-gray-400 mt-0.5">
                    Return Contrib: <strong className="text-emerald-400">{item.return_contribution_pct}%</strong>
                  </div>
                </div>
              </div>

              {/* Rationale Bullets */}
              <div className="mt-4 space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block">
                  Algorithmic Attribution Factors:
                </span>
                <div className="space-y-1.5">
                  {item.reasons.map((r, rIdx) => {
                    const isPositive = r.startsWith('+');
                    const isNegative = r.startsWith('-');
                    return (
                      <div
                        key={rIdx}
                        className={`text-xs flex items-start space-x-2 font-mono leading-relaxed p-2 rounded-lg ${
                          isPositive
                            ? 'bg-emerald-950/20 text-emerald-300 border border-emerald-900/30'
                            : isNegative
                            ? 'bg-rose-950/20 text-rose-300 border border-rose-900/30'
                            : 'bg-gray-950 text-gray-300 border border-gray-800'
                        }`}
                      >
                        <span className="font-bold">{isPositive ? '✓' : (isNegative ? '✕' : '•')}</span>
                        <span>{r.replace(/^[\+\-\~]\s*/, '')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Underlying Computed Statistics */}
              <div className="mt-4 pt-3 border-t border-gray-800/80 grid grid-cols-3 gap-2 text-[11px] font-mono text-gray-400">
                <div>
                  <span>Ann. Return: </span>
                  <strong className="text-gray-200">{item.expected_return}%</strong>
                </div>
                <div>
                  <span>Volatility: </span>
                  <strong className="text-amber-300">{item.volatility}%</strong>
                </div>
                <div>
                  <span>Avg Peer Corr: </span>
                  <strong className="text-indigo-300">{item.avg_peer_correlation}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
