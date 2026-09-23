import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import DashboardView from './views/DashboardView';
import UploadView from './views/UploadView';
import TrendAnalysisView from './views/TrendAnalysisView';
import CorrelationNetworkView from './views/CorrelationNetworkView';
import PortfolioConstructionView from './views/PortfolioConstructionView';
import MarketShockView from './views/MarketShockView';
import WhatIfView from './views/WhatIfView';

import { fetchHealth, fetchDatasetOverview, blendWithBenchmark } from './services/api';

export default function App() {
  const [currentTab, setTab] = useState('dashboard');
  const [activeDataset, setActiveDataset] = useState('sp500_sample_long.csv');
  const [datasetMeta, setDatasetMeta] = useState(null);
  const [selectedStockForTrend, setSelectedStockForTrend] = useState(null);

  const handleSelectStock = (ticker) => {
    setSelectedStockForTrend(ticker);
  };

  const refreshMeta = async () => {
    try {
      const h = await fetchHealth();
      if (h.active_dataset) {
        setActiveDataset(h.active_dataset);
      }
      const ds = await fetchDatasetOverview();
      setDatasetMeta(ds);
    } catch (err) {
      console.warn('Backend sync in progress:', err);
    }
  };

  useEffect(() => {
    refreshMeta();
  }, []);

  const handleDatasetUpdated = (meta) => {
    if (meta.filename) setActiveDataset(meta.filename);
    setDatasetMeta(meta);
  };

  const handleBlendBenchmark = async () => {
    try {
      const res = await blendWithBenchmark();
      handleDatasetUpdated(res);
      await refreshMeta();
    } catch (err) {
      alert('Error blending benchmark: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeDataset={activeDataset}
        datasetMeta={datasetMeta}
        onBlendBenchmark={handleBlendBenchmark}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar currentTab={currentTab} setTab={setTab} />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {currentTab === 'dashboard' && (
            <DashboardView setTab={setTab} onSelectStock={handleSelectStock} />
          )}
          {currentTab === 'upload' && (
            <UploadView onDatasetUpdated={handleDatasetUpdated} setTab={setTab} />
          )}
          {currentTab === 'trends' && (
            <TrendAnalysisView initialStock={selectedStockForTrend} />
          )}
          {currentTab === 'network' && (
            <CorrelationNetworkView />
          )}
          {currentTab === 'portfolio' && (
            <PortfolioConstructionView />
          )}
          {currentTab === 'shock' && (
            <MarketShockView />
          )}
          {currentTab === 'whatif' && (
            <WhatIfView />
          )}
        </main>
      </div>
    </div>
  );
}
