import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  TrendingUp,
  Share2,
  PieChart,
  Zap,
  HelpCircle
} from 'lucide-react';

export default function Sidebar({ currentTab, setTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Terminal Dashboard', icon: LayoutDashboard, desc: 'Market overview & green chart' },
    { id: 'upload', label: 'Dataset Upload', icon: UploadCloud, desc: 'Upload CSV & manage data' },
    { id: 'trends', label: 'Stock Trends', icon: TrendingUp, desc: 'Price action & technicals' },
    { id: 'network', label: 'Correlation Analysis', icon: Share2, desc: 'Cross-asset relationships' },
    { id: 'portfolio', label: 'Portfolio Optimizer', icon: PieChart, desc: 'Risk & weight optimization' },
    { id: 'shock', label: 'Market Simulation', icon: Zap, desc: 'Stress test crash scenarios' },
    { id: 'whatif', label: 'What-If Sandbox', icon: HelpCircle, desc: 'Scenario & shock modeling' }
  ];

  return (
    <aside className="w-64 border-r border-gray-800 bg-[#0B0F19] flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="p-4 space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-3 mb-2 font-mono">
          Core Analytics
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-start space-x-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold leading-tight">{item.label}</div>
                <div className="text-[10px] text-gray-400 truncate mt-0.5 font-normal">{item.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-800/80 bg-gray-950/40">
        <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-[11px] text-gray-400 space-y-1">
          <p className="font-semibold text-gray-300">AlphaPortfolio</p>
          <p className="text-[10px] leading-relaxed text-gray-400">
            Trends, Optimization & Simulations
          </p>
          <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-emerald-400">
            <span>FastAPI • React</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>
      </div>
    </aside>
  );
}
