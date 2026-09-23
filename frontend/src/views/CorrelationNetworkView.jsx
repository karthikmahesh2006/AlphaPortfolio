import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  Sliders,
  Layers,
  Info,
  Maximize2,
  RefreshCw,
  Search,
  CheckCircle2
} from 'lucide-react';
import { fetchCorrelationNetwork, blendWithBenchmark } from '../services/api';

const CLUSTER_COLORS = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EC4899', // pink
  '#06B6D4'  // cyan
];

export default function CorrelationNetworkView() {
  const [threshold, setThreshold] = useState(0.45);
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [method, setMethod] = useState('pearson');
  const [viewMode, setViewMode] = useState('graph'); // 'graph' or 'matrix'
  const canvasRef = useRef(null);

  const loadNetwork = async () => {
    try {
      setLoading(true);
      const res = await fetchCorrelationNetwork(threshold, method);
      setNetworkData(res);
      if (res.nodes && res.nodes.length > 0 && !selectedNode) {
        setSelectedNode(res.nodes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetwork();
  }, [threshold, method]);

  // Interactive Canvas Renderer for Network Graph
  useEffect(() => {
    if (!networkData || !canvasRef.current || viewMode !== 'graph') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const nodes = networkData.nodes || [];
    const edges = networkData.edges || [];
    const radius = 22;

    // Map coordinates from [-1, 1] to canvas pixels
    const nodeCoords = {};
    nodes.forEach((n, i) => {
      // If spring layout coords exist
      const px = ((n.x + 1.2) / 2.4) * (width - 100) + 50;
      const py = ((n.y + 1.2) / 2.4) * (height - 100) + 50;
      nodeCoords[n.id] = { x: px, y: py, cluster: n.cluster_id };
    });

    // 1. Draw Edges
    edges.forEach((e) => {
      const p1 = nodeCoords[e.source];
      const p2 = nodeCoords[e.target];
      if (!p1 || !p2) return;

      const isConnectedToSelected = selectedNode && (e.source === selectedNode || e.target === selectedNode);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);

      if (isConnectedToSelected) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = Math.max(2, e.abs_correlation * 4.5);
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(75, 85, 99, 0.35)';
        ctx.lineWidth = Math.max(1, e.abs_correlation * 2.5);
        ctx.setLineDash([]);
      }
      ctx.stroke();

      // Draw correlation badge on edge midpoint if selected
      if (isConnectedToSelected) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(midX - 16, midY - 9, 32, 18);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - 16, midY - 9, 32, 18);
        ctx.fillStyle = '#E5E7EB';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.correlation.toFixed(2), midX, midY);
      }
    });

    // 2. Draw Nodes
    nodes.forEach((n) => {
      const pos = nodeCoords[n.id];
      const isSelected = selectedNode === n.id;
      const color = CLUSTER_COLORS[(n.cluster_id - 1) % CLUSTER_COLORS.length] || '#10B981';

      // Outer glow for selected
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.fill();
      }

      // Main circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = isSelected ? '#10B981' : color;
      ctx.stroke();

      // Node Label
      ctx.fillStyle = isSelected ? '#FFFFFF' : '#E5E7EB';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.id, pos.x, pos.y);
    });
  }, [networkData, selectedNode, viewMode]);

  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !networkData) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    for (const n of networkData.nodes) {
      const px = ((n.x + 1.2) / 2.4) * (width - 100) + 50;
      const py = ((n.y + 1.2) / 2.4) * (height - 100) + 50;
      const dist = Math.hypot(clickX - px, clickY - py);
      if (dist <= 26) {
        setSelectedNode(n.id);
        return;
      }
    }
  };

  const selectedNodeObj = networkData?.nodes?.find((n) => n.id === selectedNode);
  const connectedEdges = (networkData?.edges || []).filter(
    (e) => e.source === selectedNode || e.target === selectedNode
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-400" /> Stock Correlation & Relationship Network
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Graph formulation: Stocks are vertices V, edge weights are correlation strengths |r_ij|. Graph community detection partitions assets into market clusters.
          </p>
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800">
            <span className="text-xs text-gray-400 font-mono">Threshold (θ):</span>
            <input
              type="range"
              min="0.1"
              max="0.85"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-24 accent-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-emerald-400">{threshold.toFixed(2)}</span>
          </div>

          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800 text-xs font-mono">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1 rounded transition ${viewMode === 'graph' ? 'bg-emerald-500 text-black font-semibold' : 'text-gray-400'}`}
            >
              Graph View
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded transition ${viewMode === 'matrix' ? 'bg-emerald-500 text-black font-semibold' : 'text-gray-400'}`}
            >
              Heatmap Matrix
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      )}

      {networkData?.error === 'single_stock_limitation' && (
        <div className="p-8 rounded-2xl bg-gray-900/60 border border-gray-800 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-100">Correlation Network Requires ≥ 2 Stocks</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            The active dataset contains only 1 stock (<strong>{networkData.stocks?.[0]}</strong>). Correlation metrics measure relative co-movements between multiple equities.
          </p>
          <button
            onClick={async () => {
              const res = await blendWithBenchmark();
              loadNetwork();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
          >
            Blend '{networkData.stocks?.[0]}' with Benchmark Basket
          </button>
        </div>
      )}

      {networkData && !networkData.error && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visualizer Panel */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-3 text-xs font-mono text-gray-300">
                <span>Vertices |V|: <strong className="text-emerald-400">{networkData.stocks?.length}</strong></span>
                <span>•</span>
                <span>Active Edges |E|: <strong className="text-cyan-400">{networkData.total_edges}</strong></span>
                <span>•</span>
                <span>Graph Density: <strong className="text-amber-400">{networkData.density}</strong></span>
              </div>
              <span className="text-[11px] text-gray-400 font-mono">Click node to inspect neighborhood</span>
            </div>

            {viewMode === 'graph' ? (
              <div className="relative flex items-center justify-center bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={680}
                  height={440}
                  onClick={handleCanvasClick}
                  className="cursor-pointer max-w-full"
                />
              </div>
            ) : (
              /* Heatmap Matrix View */
              <div className="overflow-x-auto max-h-[440px] p-2 bg-gray-950 rounded-xl border border-gray-800 font-mono text-[10px]">
                <table className="w-full text-center">
                  <thead>
                    <tr>
                      <th className="p-1.5 text-gray-400"></th>
                      {networkData.stocks.map((s) => (
                        <th key={s} className="p-1.5 text-gray-300 font-semibold">{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {networkData.stocks.map((s1) => (
                      <tr key={s1} className="border-t border-gray-900">
                        <td className="p-1.5 font-bold text-gray-300 text-left">{s1}</td>
                        {networkData.stocks.map((s2) => {
                          const val = networkData.correlation_matrix[s1]?.[s2] || 0;
                          const isHigh = val >= threshold;
                          const bg = val > 0.7 ? 'bg-emerald-950 text-emerald-400' : (val > 0.4 ? 'bg-cyan-950/60 text-cyan-300' : 'text-gray-400');
                          return (
                            <td key={s2} className={`p-1.5 ${bg} ${isHigh ? 'font-bold' : ''}`}>
                              {val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Clusters Legend */}
            <div className="pt-2 border-t border-gray-800/80">
              <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block mb-2">
                Clauset-Newman-Moore Community Clusters:
              </span>
              <div className="flex flex-wrap gap-2">
                {(networkData.communities || []).map((c, i) => (
                  <div
                    key={c.id}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-950 border border-gray-800 text-xs font-mono"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}
                    />
                    <span className="text-gray-200">{c.label}</span>
                    <span className="text-gray-400">({c.size} assets)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Inspector & Centrality Panel */}
          <div className="space-y-4">
            {/* Selected Node Details */}
            {selectedNodeObj ? (
              <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-gray-400">Selected Vertex</span>
                    <h3 className="text-lg font-bold text-gray-100 font-mono mt-0.5">{selectedNodeObj.id}</h3>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded text-xs font-mono text-white font-semibold"
                    style={{ backgroundColor: CLUSTER_COLORS[(selectedNodeObj.cluster_id - 1) % CLUSTER_COLORS.length] }}
                  >
                    Cluster {selectedNodeObj.cluster_id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-gray-950 border border-gray-800">
                    <span className="text-gray-400 block text-[10px] uppercase">Degree Centrality</span>
                    <span className="text-emerald-400 font-bold text-sm mt-1 block">
                      {selectedNodeObj.degree_centrality}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-gray-950 border border-gray-800">
                    <span className="text-gray-400 block text-[10px] uppercase">Betweenness</span>
                    <span className="text-cyan-400 font-bold text-sm mt-1 block">
                      {selectedNodeObj.betweenness_centrality}
                    </span>
                  </div>
                </div>

                {/* Connected Neighbors List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-gray-300 font-mono block">
                    Strongly Correlated Neighbors (|r| ≥ {threshold}):
                  </span>
                  {connectedEdges.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No connections above threshold.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {connectedEdges.map((e, idx) => {
                        const neighbor = e.source === selectedNode ? e.target : e.source;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedNode(neighbor)}
                            className="flex items-center justify-between p-2 rounded-lg bg-gray-950/60 border border-gray-800/80 hover:bg-gray-800/60 cursor-pointer transition text-xs font-mono"
                          >
                            <span className="text-gray-200 font-bold">{neighbor}</span>
                            <span className="text-emerald-400 font-semibold">r = {e.correlation.toFixed(3)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 text-xs text-gray-400">
                Select a stock node to inspect centrality and neighbor relationships.
              </div>
            )}

            {/* Semantic Cluster Interpretations */}
            <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Cluster Interpretations
              </h3>
              <div className="space-y-3 text-xs text-gray-300 max-h-56 overflow-y-auto pr-1">
                {(networkData.communities || []).map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-gray-950 border border-gray-800/80 space-y-1">
                    <div className="font-semibold text-gray-200 flex items-center justify-between">
                      <span>{c.label}</span>
                      <span className="text-[10px] text-gray-400 font-mono">r_avg: {c.avg_correlation}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 leading-relaxed">{c.description}</div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.members.map((m) => (
                        <span key={m} className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px] font-mono text-gray-300">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
