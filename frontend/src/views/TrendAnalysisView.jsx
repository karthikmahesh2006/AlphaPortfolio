import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { fetchDatasetOverview, fetchStockTrend } from '../services/api';
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

export default function TrendAnalysisView({ initialStock = null }) {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(initialStock || '');
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeChartTab, setActiveChartTab] = useState('price'); // 'price', 'returns', 'volatility', 'drawdown'

  useEffect(() => {
    async function loadStocksList() {
      try {
        const ds = await fetchDatasetOverview();
        if (ds.stocks && ds.stocks.length > 0) {
          setStocks(ds.stocks);
          if (!selectedStock || !ds.stocks.includes(selectedStock)) {
            setSelectedStock(ds.stocks[0]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadStocksList();
  }, []);

  useEffect(() => {
    if (!selectedStock) return;
    async function loadTrend() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchStockTrend(selectedStock);
        setTrendData(res);
      } catch (err) {
        setError(err.message || 'Failed to fetch trend data');
      } finally {
        setLoading(false);
      }
    }
    loadTrend();
  }, [selectedStock]);

  const metrics = trendData?.metrics || {};
  const classification = trendData?.classification || {};

  const CLASSIFICATION_TIERS = [
    {
      id: 'Strong Uptrend',
      label: 'Strong Uptrend',
      badgeColor: 'emerald',
      signal: 'BUY / OVERWEIGHT',
      range: 'Score ≥ +3.5',
      desc: 'Price well above key SMAs, Golden Cross, strong RSI expansion, positive price slope.'
    },
    {
      id: 'Uptrend',
      label: 'Uptrend',
      badgeColor: 'teal',
      signal: 'MOMENTUM ACCUMULATE',
      range: '+1.0 to +3.5',
      desc: 'General positive momentum, favorable intermediate moving average alignment.'
    },
    {
      id: 'Neutral',
      label: 'Neutral',
      badgeColor: 'amber',
      signal: 'HOLD / CONSOLIDATION',
      range: '-1.0 to +1.0',
      desc: 'Horizontal consolidation or mixed indicator signals across technical metrics.'
    },
    {
      id: 'Downtrend',
      label: 'Downtrend',
      badgeColor: 'orange',
      signal: 'REDUCE / CAUTION',
      range: '-3.5 to -1.0',
      desc: 'Price below moving averages, deteriorating momentum, negative slope.'
    },
    {
      id: 'Strong Downtrend',
      label: 'Strong Downtrend',
      badgeColor: 'rose',
      signal: 'AVOID / HEDGE',
      range: 'Score < -3.5',
      desc: 'Severe contraction, Death Cross regime, oversold/bearish downward pressure.'
    }
  ];

  const getBadgeStyle = (badgeColor) => {
    switch (badgeColor) {
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10';
      case 'teal':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm shadow-teal-500/10';
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10';
      case 'orange':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm shadow-orange-500/10';
      case 'rose':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 1.0) return 'text-emerald-400';
    if (score > -1.0) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getBadgeIcon = (category) => {
    if (category === 'Strong Uptrend' || category === 'Uptrend') {
      return <TrendingUp className="w-3.5 h-3.5 mr-1 shrink-0" />;
    }
    if (category === 'Downtrend' || category === 'Strong Downtrend') {
      return <TrendingDown className="w-3.5 h-3.5 mr-1 shrink-0" />;
    }
    return <Activity className="w-3.5 h-3.5 mr-1 shrink-0" />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Stock Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> Stock Trend Analysis & Classification
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Algorithmic trend identification using moving averages, volatility regime, RSI, and cumulative drawdown tracking.
          </p>
        </div>

        {/* Stock Selector Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto max-w-xl pb-1">
          {stocks.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStock(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition shrink-0 ${
                selectedStock === s
                  ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {trendData && !loading && (
        <>
          {/* Trend Classification Banner */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="p-3.5 rounded-xl bg-gray-800/90 border border-gray-700 font-mono text-2xl font-bold text-gray-100 flex items-center justify-center min-w-[90px]">
                {selectedStock}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center text-xs font-bold font-mono px-3 py-1 rounded-lg border ${getBadgeStyle(classification.badge_color)}`}>
                    {getBadgeIcon(classification.classification)}
                    <span>{classification.classification}</span>
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    Signal: <strong className="text-gray-100 font-semibold">{classification.signal}</strong>
                  </span>
                </div>

                {/* Score and Visual Meter */}
                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="text-gray-400">Composite Score:</span>
                  <span className={`font-bold text-sm ${getScoreColor(classification.trend_score)}`}>
                    {classification.trend_score > 0 ? `+${classification.trend_score}` : classification.trend_score}
                  </span>
                  <span className="text-[11px] text-gray-400">[-6.5 to +6.5]</span>

                  {/* Mini Meter */}
                  <div className="hidden sm:flex items-center w-28 h-2 bg-gray-950 rounded-full overflow-hidden border border-gray-800 relative">
                    <div
                      className={`h-full transition-all duration-500 ${
                        classification.trend_score >= 1.0
                          ? 'bg-emerald-500'
                          : classification.trend_score > -1.0
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(5, ((classification.trend_score + 6.5) / 13) * 100))}%`
                      }}
                    />
                  </div>
                </div>

                {classification.description && (
                  <p className="text-[11px] text-gray-400 max-w-md italic">
                    {classification.description}
                  </p>
                )}
              </div>
            </div>

            {/* Rationale List */}
            <div className="space-y-1.5 text-[11px] text-gray-300 max-w-md w-full bg-gray-950/60 p-3.5 rounded-lg border border-gray-800/80">
              <span className="text-gray-400 font-mono block text-[10px] uppercase tracking-wider font-semibold">
                Multi-Factor Algorithmic Evidence:
              </span>
              {(classification.reasons || []).map((r, idx) => {
                const isNeg = r.includes('below') || r.includes('Death Cross') || r.includes('Downward') || r.includes('bearish') || r.includes('Contraction');
                const isPos = r.includes('above') || r.includes('Golden Cross') || r.includes('Upward') || r.includes('bullish') || r.includes('Expansion');
                return (
                  <div key={idx} className="flex items-start space-x-1.5 leading-snug">
                    <span className={`font-bold mt-0.5 shrink-0 ${isPos ? 'text-emerald-400' : (isNeg ? 'text-rose-400' : 'text-amber-400')}`}>
                      {isPos ? '✓' : (isNeg ? '✕' : '•')}
                    </span>
                    <span className="text-gray-300">{r}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Classification Tiers Reference / Legend */}
          <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 font-semibold">
                Classification Framework Reference (Multi-Factor Scoring):
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                Active Category: <strong className="text-gray-200">{classification.classification}</strong>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs font-mono">
              {CLASSIFICATION_TIERS.map((tier) => {
                const isActive = classification.classification === tier.id;
                return (
                  <div
                    key={tier.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isActive
                        ? `${getBadgeStyle(tier.badgeColor)} ring-1 ring-emerald-500/50 scale-[1.02]`
                        : 'bg-gray-950/40 border-gray-800/70 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center">
                        {getBadgeIcon(tier.id)}
                        {tier.label}
                      </span>
                      {isActive && (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500 text-black font-bold">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 mb-1">{tier.signal}</div>
                    <div className="text-[9px] text-gray-400 leading-tight line-clamp-2">{tier.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metric KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-lg bg-gray-900/50 border border-gray-800/80">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Latest Price</span>
              <span className="text-base font-bold text-gray-100 font-mono mt-1 block">
                ${metrics.latest_price}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-gray-900/50 border border-gray-800/80">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Total Return</span>
              <span className={`text-base font-bold font-mono mt-1 block ${metrics.total_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {metrics.total_return >= 0 ? `+${metrics.total_return}%` : `${metrics.total_return}%`}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-gray-900/50 border border-gray-800/80">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Annualized Vol</span>
              <span className="text-base font-bold text-amber-300 font-mono mt-1 block">
                {metrics.annualized_volatility}%
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-gray-900/50 border border-gray-800/80">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Sharpe Ratio</span>
              <span className="text-base font-bold text-cyan-300 font-mono mt-1 block">
                {metrics.sharpe_ratio}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-gray-900/50 border border-gray-800/80">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Max Drawdown</span>
              <span className="text-base font-bold text-rose-400 font-mono mt-1 block">
                {metrics.max_drawdown}%
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-gray-900/50 border border-gray-800/80">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">14-Day RSI</span>
              <span className="text-base font-bold text-indigo-300 font-mono mt-1 block">
                {metrics.latest_rsi}
              </span>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono">
                  Technical Indicator Series ({selectedStock})
                </span>
              </div>

              {/* Chart Switcher Buttons */}
              <div className="flex items-center space-x-1.5 bg-gray-950 p-1 rounded-lg border border-gray-800 text-xs font-mono">
                <button
                  onClick={() => setActiveChartTab('price')}
                  className={`px-3 py-1 rounded transition ${activeChartTab === 'price' ? 'bg-emerald-500 text-black font-semibold' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Price & MAs
                </button>
                <button
                  onClick={() => setActiveChartTab('returns')}
                  className={`px-3 py-1 rounded transition ${activeChartTab === 'returns' ? 'bg-emerald-500 text-black font-semibold' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Cumulative Return
                </button>
                <button
                  onClick={() => setActiveChartTab('volatility')}
                  className={`px-3 py-1 rounded transition ${activeChartTab === 'volatility' ? 'bg-emerald-500 text-black font-semibold' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Rolling Volatility
                </button>
                <button
                  onClick={() => setActiveChartTab('drawdown')}
                  className={`px-3 py-1 rounded transition ${activeChartTab === 'drawdown' ? 'bg-emerald-500 text-black font-semibold' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Drawdown
                </button>
              </div>
            </div>

            {/* Dynamic Recharts View */}
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === 'price' && (
                  <LineChart data={trendData.timeseries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} domain={['auto', 'auto']} unit="$" />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="price" name="Close Price" stroke="#10B981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sma_20" name="SMA 20" stroke="#60A5FA" strokeWidth={1.5} dot={false} strokeDasharray="2 2" />
                    <Line type="monotone" dataKey="sma_50" name="SMA 50" stroke="#FBBF24" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="sma_200" name="SMA 200" stroke="#F43F5E" strokeWidth={1.5} dot={false} />
                  </LineChart>
                )}

                {activeChartTab === 'returns' && (
                  <AreaChart data={trendData.timeseries}>
                    <defs>
                      <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 11 }} />
                    <Area type="monotone" dataKey="cumulative_return" name="Cumulative Return %" stroke="#3B82F6" strokeWidth={2} fill="url(#retGrad)" />
                  </AreaChart>
                )}

                {activeChartTab === 'volatility' && (
                  <AreaChart data={trendData.timeseries}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 11 }} />
                    <Area type="monotone" dataKey="rolling_vol" name="21-Day Annualized Vol %" stroke="#F59E0B" strokeWidth={2} fill="url(#volGrad)" />
                  </AreaChart>
                )}

                {activeChartTab === 'drawdown' && (
                  <AreaChart data={trendData.timeseries}>
                    <defs>
                      <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 11 }} />
                    <Area type="monotone" dataKey="drawdown" name="Drawdown %" stroke="#EF4444" strokeWidth={2} fill="url(#ddGrad)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
