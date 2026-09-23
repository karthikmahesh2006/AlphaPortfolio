import React from 'react';
import { Activity, Database, BookOpen, Layers, PlusCircle, RefreshCw } from 'lucide-react';

export default function Navbar({ activeDataset, datasetMeta, onBlendBenchmark }) {
  const isSingleStock = datasetMeta?.is_single_stock || (datasetMeta?.num_stocks === 1);

  return (
    <header className="h-16 border-b border-gray-800 bg-[#0F172A]/80 backdrop-blur sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-gray-100 tracking-tight text-base flex items-center gap-2">
            AlphaPortfolio <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">Analytics</span>
          </h1>
          <p className="text-xs text-gray-400">Quantitative Trends, Optimization & Market Simulation</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Active dataset badge */}
        <div className="flex items-center space-x-2 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-xs">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-400">Dataset:</span>
          <span className="font-mono text-cyan-300 font-medium truncate max-w-[180px]">
            {activeDataset || 'sp500_sample_long.csv'}
          </span>
          {datasetMeta && (
            <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-mono">
              {datasetMeta.num_stocks || 1} {datasetMeta.num_stocks === 1 ? 'Asset' : 'Assets'}
            </span>
          )}
        </div>

        {/* Blend with Benchmark Button if single stock */}
        {isSingleStock && (
          <button
            onClick={onBlendBenchmark}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-mono transition"
            title="Blend with S&P 500 benchmark basket to enable multi-asset portfolio algorithms"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Blend for Portfolio</span>
          </button>
        )}
      </div>
    </header>
  );
}
