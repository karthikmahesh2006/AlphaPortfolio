const API_BASE = '/api';

async function handleResponse(res) {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || err.error || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function uploadDataset(file, columnMapping = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (columnMapping) {
    formData.append('column_mapping', JSON.stringify(columnMapping));
  }
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  return handleResponse(res);
}

export async function loadSampleDataset(sampleName = 'sp500_sample_long.csv') {
  const res = await fetch(`${API_BASE}/load-sample?sample_name=${encodeURIComponent(sampleName)}`, {
    method: 'POST'
  });
  return handleResponse(res);
}

export async function blendWithBenchmark() {
  const res = await fetch(`${API_BASE}/dataset/blend-with-benchmark`, {
    method: 'POST'
  });
  return handleResponse(res);
}

export async function fetchDatasetOverview() {
  const res = await fetch(`${API_BASE}/dataset/overview`);
  return handleResponse(res);
}

export async function fetchMarketOverview() {
  const res = await fetch(`${API_BASE}/market/overview`);
  return handleResponse(res);
}

export async function fetchStockTrend(ticker) {
  const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}/trend`);
  return handleResponse(res);
}

export async function fetchCorrelationNetwork(threshold = 0.5, method = 'pearson') {
  const res = await fetch(`${API_BASE}/correlation/network?threshold=${threshold}&method=${method}`);
  return handleResponse(res);
}

export async function constructPortfolio(params) {
  const res = await fetch(`${API_BASE}/portfolio/construct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return handleResponse(res);
}

export async function compareAllAlgorithms(params) {
  const res = await fetch(`${API_BASE}/portfolio/compare-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return handleResponse(res);
}

export async function simulateShock(params) {
  const res = await fetch(`${API_BASE}/simulation/shock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return handleResponse(res);
}

export async function runHistoricalReplay(params) {
  const res = await fetch(`${API_BASE}/simulation/replay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return handleResponse(res);
}

export async function evaluateRebalance(params) {
  const res = await fetch(`${API_BASE}/rebalancing/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return handleResponse(res);
}

export async function runBacktest(params) {
  const res = await fetch(`${API_BASE}/backtest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return handleResponse(res);
}

export async function runWhatIf(params) {
  const res = await fetch(`${API_BASE}/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return handleResponse(res);
}

export async function fetchDAAGuide() {
  const res = await fetch(`${API_BASE}/algorithms/daa-guide`);
  return handleResponse(res);
}

export async function exportReportCSV(reportData) {
  const res = await fetch(`${API_BASE}/reports/export-csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData)
  });
  if (!res.ok) throw new Error('Failed to export CSV');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'portfolio_analysis_report.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
