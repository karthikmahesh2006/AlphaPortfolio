import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  FastForward,
  RefreshCw,
  Calendar,
  Layers,
  Activity
} from 'lucide-react';
import { runHistoricalReplay, fetchDatasetOverview } from '../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function HistoricalReplayView() {
  const [replayData, setReplayData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Player state
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(300); // ms per frame
  const timerRef = useRef(null);

  const [initialCapital, setInitialCapital] = useState(100000);
  const [rebalFreq, setRebalFreq] = useState('Quarterly');

  const loadReplay = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsPlaying(false);
      const ds = await fetchDatasetOverview();
      const stocks = ds.stocks || [];
      const weights = {};
      stocks.forEach((s) => (weights[s] = 1.0 / stocks.length));

      const res = await runHistoricalReplay({
        weights,
        initial_capital: parseFloat(initialCapital),
        rebalance_frequency: rebalFreq
      });
      setReplayData(res);
      setCurrentFrameIdx(0);
    } catch (err) {
      setError(err.message || 'Failed to load historical replay');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReplay();
  }, []);

  // Playback loop
  useEffect(() => {
    if (isPlaying && replayData?.frames) {
      timerRef.current = setInterval(() => {
        setCurrentFrameIdx((prev) => {
          if (prev >= replayData.frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, replayData, playSpeed]);

  const frames = replayData?.frames || [];
  const currentFrame = frames[currentFrameIdx] || {};
  const currentWeights = currentFrame.weights || {};

  // Trajectory up to current frame
  const historicalTrajectory = frames.slice(0, currentFrameIdx + 1).map((f) => ({
    date: f.date,
    value: f.portfolio_value,
    pnl: f.pnl_pct
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-cyan-400" /> Chronological Historical Replay Mode
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Walk step-by-step through market history observing asset drift, dynamic rebalances, and equity progression in real time.
          </p>
        </div>

        <button
          onClick={loadReplay}
          disabled={loading}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg border border-gray-700 flex items-center space-x-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reset Simulation</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      )}

      {replayData && !loading && (
        <>
          {/* Player Controls Bar */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Play/Pause & Step Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-md shadow-cyan-500/20 transition"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentFrameIdx((prev) => Math.min(frames.length - 1, prev + 1));
                  }}
                  className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
                  title="Step Next"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentFrameIdx(0);
                  }}
                  className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
                  title="Rewind to Start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Speed Selector */}
                <div className="flex items-center space-x-1 bg-gray-950 p-1 rounded-lg border border-gray-800 text-xs font-mono ml-3">
                  <span className="text-gray-400 px-1 text-[10px]">Speed:</span>
                  {[
                    { label: '1x', val: 500 },
                    { label: '2x', val: 250 },
                    { label: '4x', val: 100 }
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setPlaySpeed(s.val)}
                      className={`px-2 py-0.5 rounded transition ${playSpeed === s.val ? 'bg-cyan-500 text-black font-bold' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Date Badge */}
              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="text-gray-400">Current Date:</span>
                <span className="px-3 py-1.5 rounded-lg bg-gray-950 border border-gray-800 font-bold text-cyan-300 text-sm">
                  {currentFrame.date || '---'}
                </span>
                {currentFrame.is_rebalance && (
                  <span className="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold animate-pulse">
                    REBALANCE APPLIED
                  </span>
                )}
              </div>
            </div>

            {/* Timeline Scrubber Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={frames.length - 1}
                value={currentFrameIdx}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentFrameIdx(parseInt(e.target.value));
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>Start: {replayData.start_date}</span>
                <span>Frame {currentFrameIdx + 1} / {frames.length}</span>
                <span>End: {replayData.end_date}</span>
              </div>
            </div>
          </div>

          {/* Current State KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Initial Capital</span>
              <span className="text-xl font-bold text-gray-100 mt-1 block">
                ${replayData.initial_capital?.toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Simulated Portfolio Value</span>
              <span className="text-xl font-bold text-cyan-400 mt-1 block">
                ${currentFrame.portfolio_value?.toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Total Return (PnL)</span>
              <span className={`text-xl font-bold mt-1 block ${currentFrame.pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentFrame.pnl_pct >= 0 ? `+${currentFrame.pnl_pct}%` : `${currentFrame.pnl_pct}%`}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase block">Rebalance Frequency</span>
              <span className="text-xl font-bold text-amber-300 mt-1 block">
                {rebalFreq}
              </span>
            </div>
          </div>

          {/* Replay Trajectory Chart */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Historical Replay Equity Curve
            </h3>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalTrajectory}>
                  <defs>
                    <linearGradient id="replayGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="$" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 11 }} />
                  <Area type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={2} fill="url(#replayGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Asset Weight Drift Snapshot at Current Frame */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono">
              Live Holdings & Asset Weights at Date ({currentFrame.date})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs">
              {Object.entries(currentWeights).map(([s, w]) => (
                <div key={s} className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                  <div className="flex justify-between items-center text-gray-300 font-bold">
                    <span>{s}</span>
                    <span className="text-cyan-400">{w}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
                    <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, w * 3)}%` }}></div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1.5">
                    Val: ${currentFrame.holdings_value?.[s]?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
