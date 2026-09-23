import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Database,
  ArrowRight,
  PlusCircle,
  TrendingUp,
  PieChart,
  Share2,
  Zap,
  HelpCircle
} from 'lucide-react';
import { uploadDataset, loadSampleDataset, fetchDatasetOverview, blendWithBenchmark } from '../services/api';

export default function UploadView({ onDatasetUpdated, setTab }) {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Column mapping modal state
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [availableCols, setAvailableCols] = useState([]);
  const [mappingState, setMappingState] = useState({
    date: '',
    ticker: '',
    close: '',
    open: '',
    high: '',
    low: '',
    volume: ''
  });

  const loadCurrentOverview = async () => {
    try {
      const data = await fetchDatasetOverview();
      setOverview(data);
    } catch (err) {
      console.warn('Overview not loaded yet:', err);
    }
  };

  useEffect(() => {
    loadCurrentOverview();
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setSuccessMsg('');

    try {
      const res = await uploadDataset(file);
      if (res.needs_mapping) {
        setPendingFile(file);
        setAvailableCols(res.available_columns || []);
        setShowMappingModal(true);
      } else if (res.success) {
        setSuccessMsg(`Dataset "${res.filename}" loaded successfully with ${res.num_stocks} stock(s)!`);
        await loadCurrentOverview();
        onDatasetUpdated && onDatasetUpdated(res);
      } else {
        setError(res.error || 'Failed to process file');
      }
    } catch (err) {
      setError(err.message || 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleSelect = async (sampleName) => {
    setLoading(true);
    setError(null);
    setSuccessMsg('');
    try {
      const res = await loadSampleDataset(sampleName);
      setSuccessMsg(`Sample dataset "${sampleName}" loaded successfully!`);
      await loadCurrentOverview();
      onDatasetUpdated && onDatasetUpdated(res);
    } catch (err) {
      setError(err.message || 'Failed to load sample dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleBlendWithBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await blendWithBenchmark();
      setSuccessMsg(`Blended '${overview?.stocks?.[0]}' with benchmark equities! Full portfolio optimization and correlation graphs are now active.`);
      await loadCurrentOverview();
      onDatasetUpdated && onDatasetUpdated(res);
    } catch (err) {
      setError(err.message || 'Failed to blend with benchmark.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMapping = async () => {
    if (!pendingFile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await uploadDataset(pendingFile, mappingState);
      if (res.success) {
        setShowMappingModal(false);
        setSuccessMsg(`Dataset parsed successfully with custom column mappings!`);
        await loadCurrentOverview();
        onDatasetUpdated && onDatasetUpdated(res);
      } else {
        setError(res.error || 'Failed with provided mappings.');
      }
    } catch (err) {
      setError(err.message || 'Mapping application failed');
    } finally {
      setLoading(false);
    }
  };

  const audit = overview?.quality_audit || {};
  const isSingleStock = overview?.is_single_stock || (overview?.num_stocks === 1);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-emerald-400" /> Dataset Ingestion & Validation
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Upload any market dataset in CSV or XLSX format. Supports standard OHLCV, Yahoo Finance multi-level exports, single-stock price histories, and multi-asset price matrices.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Single Stock Notice Banner */}
      {isSingleStock && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/40 via-gray-900 to-gray-900 border border-amber-800/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-100 uppercase tracking-wider font-mono">
                  Single Stock Loaded: <span className="text-amber-400 font-bold">{overview?.stocks?.[0]}</span>
                </h4>
                <p className="text-xs text-gray-300 mt-0.5 leading-relaxed max-w-2xl">
                  Full Technical Trend Analysis, Moving Averages (SMA 20/50/200, EMA 12/26), RSI, Volatility, and Drawdowns are available in the <strong>Stock Trends</strong> tab. To run multi-asset portfolio optimization and correlation graphs, you can blend this stock with benchmark market equities.
                </p>
              </div>
            </div>
            <button
              onClick={handleBlendWithBenchmark}
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg shadow-md shadow-amber-500/20 flex items-center space-x-2 shrink-0 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Blend with Benchmark Basket</span>
            </button>
          </div>
        </div>
      )}

      {/* Upload Zone & Samples Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drag and Drop Zone */}
        <div
          className={`lg:col-span-2 p-6 rounded-xl bg-gray-900/60 border-2 border-dashed transition flex flex-col items-center justify-center text-center group ${
            isDragging ? 'border-emerald-400 bg-emerald-500/5' : 'border-gray-700 hover:border-emerald-500/60'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileUpload(file);
          }}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-400 transition shadow-inner ${isDragging ? 'bg-emerald-500/20 scale-110' : 'bg-gray-800 group-hover:scale-110'}`}>
            <UploadCloud className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-gray-200 mt-4">
            {isDragging ? 'Drop your file here!' : 'Upload Custom Market Dataset'}
          </h3>
          <p className="text-xs text-gray-400 max-w-md mt-1">
            Drag & drop or click to browse. Accepts CSV and XLSX — Yahoo Finance exports, Kaggle datasets, single-stock or wide price tables.
          </p>

          <label className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition shadow-md shadow-emerald-600/20 flex items-center space-x-2">
            <span>Choose File</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
          </label>
          <span className="text-[10px] text-gray-400 font-mono mt-2">Max file size: 50MB</span>
        </div>

        {/* Pre-packaged Benchmark Datasets */}
        <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 font-mono flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-cyan-400" /> Benchmark Datasets
            </h3>
            <span className="text-[10px] text-cyan-400 font-mono">1-Click Load</span>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => handleSampleSelect('sp500_sample_long.csv')}
              disabled={loading}
              className="w-full text-left p-3 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">S&P 500 Diverse Equities</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-400 transition" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Standard long format: 10 multi-sector stocks (AAPL, MSFT, NVDA, XOM, JNJ...) with OHLCV data.
              </p>
            </button>

            <button
              onClick={() => handleSampleSelect('tech_etf_wide.csv')}
              disabled={loading}
              className="w-full text-left p-3 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">Tech Equities (Wide Format)</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-400 transition" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Wide format matrix where each ticker is its own price column.
              </p>
            </button>

            <button
              onClick={() => handleSampleSelect('global_assets_sample.csv')}
              disabled={loading}
              className="w-full text-left p-3 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">Global Macro Assets</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-400 transition" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Crude Oil, Gold, US Bonds, Global REIT, and Crypto.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Dataset Health & Quality Audit Panel */}
      {overview && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Active Dataset Health & Schema
                </h3>
                <p className="text-xs text-gray-400">Validated metadata and data-hygiene diagnostics</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  Score: {audit.quality_score}/100 ({audit.quality_rating})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800/80">
                <span className="text-gray-400 block font-mono">File Name</span>
                <span className="text-gray-200 font-semibold font-mono truncate block mt-1">
                  {overview.filename}
                </span>
              </div>
              <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800/80">
                <span className="text-gray-400 block font-mono">Format Detected</span>
                <span className="text-cyan-400 font-semibold font-mono block mt-1 uppercase">
                  {overview.format} Table
                </span>
              </div>
              <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800/80">
                <span className="text-gray-400 block font-mono">Stocks Count</span>
                <span className="text-emerald-400 font-semibold font-mono block mt-1">
                  {overview.num_stocks} {overview.num_stocks === 1 ? 'Asset (Single-Stock)' : 'Assets'}
                </span>
              </div>
              <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800/80">
                <span className="text-gray-400 block font-mono">Total Records</span>
                <span className="text-gray-200 font-semibold font-mono block mt-1">
                  {overview.num_rows?.toLocaleString()} Rows
                </span>
              </div>
            </div>

            {/* Quality Scoring Breakdown */}
            <div className="p-4 rounded-lg bg-gray-950/40 border border-gray-800/80 space-y-2">
              <div className="text-xs font-semibold text-gray-300">Data Quality Score Factors</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-gray-900 border border-gray-800">
                  <span className="text-gray-400">Completeness:</span>
                  <span className="text-emerald-400">{audit.scoring_breakdown?.completeness} / 40 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-gray-900 border border-gray-800">
                  <span className="text-gray-400">Outlier Hygiene:</span>
                  <span className="text-emerald-400">{audit.scoring_breakdown?.outlier_hygiene} / 30 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-gray-900 border border-gray-800">
                  <span className="text-gray-400">Continuity:</span>
                  <span className="text-emerald-400">{audit.scoring_breakdown?.continuity} / 30 pts</span>
                </div>
              </div>
            </div>

            {/* Stocks Pill List */}
            <div>
              <span className="text-xs text-gray-400 block mb-2 font-mono">Recognized Stocks:</span>
              <div className="flex flex-wrap gap-1.5">
                {(overview.stocks || []).map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-xs font-mono text-gray-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Navigation Launchpad */}
            <div className="pt-4 border-t border-gray-800/80">
              <span className="text-xs font-semibold text-gray-300 block mb-3 font-mono uppercase tracking-wider">
                Direct Analytics Launchpad
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <button
                  onClick={() => setTab && setTab('trends')}
                  className="p-3.5 rounded-xl bg-gray-900 hover:bg-gray-800/80 border border-gray-800 hover:border-emerald-500/40 text-left transition group"
                >
                  <TrendingUp className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition" />
                  <div className="text-xs font-bold text-gray-200">Stock Trends</div>
                  <div className="text-[10px] text-gray-400 mt-1">Charts, moving averages & RSI</div>
                </button>

                <button
                  onClick={() => setTab && setTab('network')}
                  className="p-3.5 rounded-xl bg-gray-900 hover:bg-gray-800/80 border border-gray-800 hover:border-cyan-500/40 text-left transition group"
                >
                  <Share2 className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition" />
                  <div className="text-xs font-bold text-gray-200">Correlation Network</div>
                  <div className="text-[10px] text-gray-400 mt-1">Cross-stock relationships</div>
                </button>

                <button
                  onClick={() => setTab && setTab('portfolio')}
                  className="p-3.5 rounded-xl bg-gray-900 hover:bg-gray-800/80 border border-gray-800 hover:border-purple-500/40 text-left transition group"
                >
                  <PieChart className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition" />
                  <div className="text-xs font-bold text-gray-200">Portfolio Optimizer</div>
                  <div className="text-[10px] text-gray-400 mt-1">Markowitz, Risk Parity & HRP</div>
                </button>

                <button
                  onClick={() => setTab && setTab('shock')}
                  className="p-3.5 rounded-xl bg-gray-900 hover:bg-gray-800/80 border border-gray-800 hover:border-amber-500/40 text-left transition group"
                >
                  <Zap className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition" />
                  <div className="text-xs font-bold text-gray-200">Market Simulation</div>
                  <div className="text-[10px] text-gray-400 mt-1">Stress-test market shocks</div>
                </button>

                <button
                  onClick={() => setTab && setTab('whatif')}
                  className="p-3.5 rounded-xl bg-gray-900 hover:bg-gray-800/80 border border-gray-800 hover:border-indigo-500/40 text-left transition group"
                >
                  <HelpCircle className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition" />
                  <div className="text-xs font-bold text-gray-200">What-If Sandbox</div>
                  <div className="text-[10px] text-gray-400 mt-1">Simulate asset drops & shocks</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Column Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-gray-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3">
              <Sliders className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-gray-100">Manual Column Schema Mapping</h3>
                <p className="text-xs text-gray-400">
                  Match the required financial fields to the columns in your uploaded file.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {['date', 'ticker', 'close', 'volume'].map((field) => (
                <div key={field} className="flex items-center justify-between p-2 rounded-lg bg-gray-900 border border-gray-800">
                  <label className="font-semibold uppercase tracking-wider text-gray-300 font-mono w-28">
                    {field} {field !== 'volume' && <span className="text-rose-400">*</span>}
                  </label>
                  <select
                    value={mappingState[field] || ''}
                    onChange={(e) => setMappingState({ ...mappingState, [field]: e.target.value })}
                    className="flex-1 bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select Column --</option>
                    {availableCols.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowMappingModal(false)}
                className="px-4 py-2 rounded-lg text-xs bg-gray-800 hover:bg-gray-700 text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyMapping}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center space-x-2"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Apply & Load Dataset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
