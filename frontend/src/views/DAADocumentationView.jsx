import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Code2,
  Clock,
  Cpu,
  Layers,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Share2,
  Zap
} from 'lucide-react';
import { fetchDAAGuide } from '../services/api';

export default function DAADocumentationView({ onOpenInspectorWithAlgo }) {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetchDAAGuide();
        setGuide(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const algorithms = guide?.algorithms || [];

  return (
    <div className="space-y-8 pb-16 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            Quantitative Architecture Reference
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-100 mt-2 flex items-center gap-2.5">
          <Code2 className="w-7 h-7 text-indigo-400" />
          Quantitative Optimization Algorithms & Complexity Specifications
        </h2>
        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
          Detailed mathematical formulation, asymptotic complexity analysis (Big-O), design paradigms, and pseudocode specifications for all algorithmic modules in the platform.
        </p>
      </div>

      {/* Novelty Section: How this project differs from normal stock prediction dashboards */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950/40 border border-indigo-900/50 space-y-4">
        <div className="flex items-center space-x-2 text-indigo-300 font-bold text-sm">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>How This Project is Different from a Normal Stock Prediction Dashboard</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
          <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-1">
            <strong className="text-emerald-400 block font-mono">1. Graph-Based Network Discovery:</strong>
            <p className="text-gray-400 leading-relaxed">
              Instead of isolated asset views, models the entire market as a weighted undirected graph G=(V,E) and runs greedy modularity community detection to discover co-movement clusters.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-1">
            <strong className="text-cyan-400 block font-mono">2. Multi-Objective Portfolio Formulation:</strong>
            <p className="text-gray-400 leading-relaxed">
              Balances expected return against covariance risk, Choueifaty diversification ratio, and Herfindahl-Hirschman concentration bounds using quadratic programming and tree bisection.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-1">
            <strong className="text-amber-400 block font-mono">3. Chronological Historical Replay:</strong>
            <p className="text-gray-400 leading-relaxed">
              Provides step-by-step chronological animation walking through historical timelines with weight drift tracking and periodic rebalancing events.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-1">
            <strong className="text-rose-400 block font-mono">4. Stress Simulation & Dynamic Rebalancing:</strong>
            <p className="text-gray-400 leading-relaxed">
              Stress tests portfolios non-destructively under 6 historical-type crash scenarios and logs transparent causal explanations for every rebalancing action.
            </p>
          </div>
        </div>
      </div>

      {/* Algorithmic Complexity Master Table */}
      <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 font-mono">
          Asymptotic Time & Space Complexity Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-gray-950 text-gray-400 border-b border-gray-800 uppercase text-[10px]">
              <tr>
                <th className="p-3">Algorithm</th>
                <th className="p-3">Algorithmic Paradigm</th>
                <th className="p-3">Time Complexity</th>
                <th className="p-3">Space Complexity</th>
                <th className="p-3">Optimization Objective</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              <tr className="hover:bg-gray-800/30">
                <td className="p-3 font-bold text-gray-200">Equal Weight (1/N)</td>
                <td className="p-3 text-gray-400">Uniform / Baseline Heuristic</td>
                <td className="p-3 text-emerald-400 font-bold">O(N)</td>
                <td className="p-3 text-gray-300">O(N)</td>
                <td className="p-3 text-gray-400">w_i = 1/N</td>
              </tr>
              <tr className="hover:bg-gray-800/30">
                <td className="p-3 font-bold text-gray-200">Inverse Volatility Parity</td>
                <td className="p-3 text-gray-400">Greedy Risk-Budgeting</td>
                <td className="p-3 text-cyan-400 font-bold">O(N * T + N log N)</td>
                <td className="p-3 text-gray-300">O(N)</td>
                <td className="p-3 text-gray-400">w_i proportional to 1 / sigma_i</td>
              </tr>
              <tr className="hover:bg-gray-800/30">
                <td className="p-3 font-bold text-gray-200">Markowitz Mean-Variance (MVO)</td>
                <td className="p-3 text-gray-400">Convex Quadratic Programming (SLSQP)</td>
                <td className="p-3 text-amber-400 font-bold">O(K * N^3)</td>
                <td className="p-3 text-gray-300">O(N^2)</td>
                <td className="p-3 text-gray-400">min 0.5 w^T Sigma w - lambda mu^T w</td>
              </tr>
              <tr className="hover:bg-gray-800/30">
                <td className="p-3 font-bold text-gray-200">Hierarchical Risk Parity (HRP)</td>
                <td className="p-3 text-gray-400">Divide-and-Conquer / Tree Traversal</td>
                <td className="p-3 text-indigo-300 font-bold">O(N^2 log N)</td>
                <td className="p-3 text-gray-300">O(N^2)</td>
                <td className="p-3 text-gray-400">Quasi-Diag + Recursive Bisection</td>
              </tr>
              <tr className="hover:bg-gray-800/30">
                <td className="p-3 font-bold text-gray-200">Multi-Objective Genetic Algorithm</td>
                <td className="p-3 text-gray-400">Evolutionary Metaheuristic</td>
                <td className="p-3 text-purple-400 font-bold">O(G * P * N)</td>
                <td className="p-3 text-gray-300">O(P * N)</td>
                <td className="p-3 text-gray-400">Pareto Multi-Objective Simplex</td>
              </tr>
              <tr className="hover:bg-gray-800/30">
                <td className="p-3 font-bold text-gray-200">Greedy Modularity Community Detection</td>
                <td className="p-3 text-gray-400">Agglomerative Graph Clustering</td>
                <td className="p-3 text-cyan-400 font-bold">O(|E| * d * log |V|)</td>
                <td className="p-3 text-gray-300">O(|V| + |E|)</td>
                <td className="p-3 text-gray-400">max Modularity Q</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Algorithm Detailed Profiles */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-100 font-mono flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-400" /> Algorithmic Profiles & Pseudocode
        </h3>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : (
          algorithms.map((algo) => (
            <div
              key={algo.id}
              className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block">
                    {algo.category}
                  </span>
                  <h4 className="text-base font-bold text-gray-100 mt-0.5">{algo.name}</h4>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Time: {algo.time_complexity}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Space: {algo.space_complexity}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
                  <span className="text-gray-400 font-mono uppercase block text-[10px]">Problem Formulation:</span>
                  <p className="text-gray-300 leading-relaxed">{algo.problem}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
                  <span className="text-gray-400 font-mono uppercase block text-[10px]">Algorithmic Idea:</span>
                  <p className="text-gray-300 leading-relaxed">{algo.idea}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-gray-400 block">Pseudocode:</span>
                <pre className="p-4 rounded-xl bg-black/70 border border-gray-800 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
                  {algo.pseudocode}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs text-indigo-200">
                <strong className="text-indigo-300">Quantitative Engineering Rationale: </strong>
                {algo.why_appropriate}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
