import os
import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import json

from data_processing.loader import DatasetLoader
from data_processing.cleaner import DataCleaner
from trend_analysis.metrics import TrendMetrics
from trend_analysis.classifier import TrendClassifier
from correlation.network import CorrelationNetworkEngine
from portfolio.objectives import PortfolioObjectives
from portfolio.risk_attribution import RiskAttribution
from optimization.equal_weight import EqualWeightOptimizer
from optimization.risk_parity import RiskParityOptimizer
from optimization.markowitz_mvo import MarkowitzOptimizer
from optimization.hrp import HRPOptimizer
from optimization.genetic_algorithm import GeneticAlgorithmOptimizer
from simulation.market_shock import MarketShockSimulator
from rebalancing.dynamic_rebalancer import DynamicRebalancingEngine
from backtesting.engine import BacktestingEngine
from backtesting.historical_replay import HistoricalReplayEngine
from explainability.explainer import PortfolioExplainer
from reports.exporter import ReportExporter

app = FastAPI(
    title="AlphaPortfolio - Quantitative Portfolio Construction & Risk Optimization Platform",
    description="Professional Platform for Quantitative Portfolio Construction, Risk Modeling, and Market Simulation",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory dataset state
STATE = {
    "is_loaded": False,
    "filename": "sp500_sample_long.csv",
    "dataset_meta": {},
    "price_df": None,        # pd.DataFrame: index=Date_Str, columns=Stocks
    "volume_df": None,       # optional volume dataframe
    "quality_audit": {},
    "raw_df": None
}

def load_dataset_into_state(df: pd.DataFrame, filename: str, custom_mapping: dict = None) -> Dict[str, Any]:
    meta = DatasetLoader.inspect_and_load(df, custom_mapping)
    if not meta.get("success"):
        return meta

    price_matrix_dict = meta["price_matrix"]
    price_df = pd.DataFrame.from_dict(price_matrix_dict, orient="index")
    price_df.index.name = "Date"

    audit = DataCleaner.audit_quality(price_df, df)

    STATE["is_loaded"] = True
    STATE["filename"] = filename
    STATE["dataset_meta"] = meta
    STATE["price_df"] = price_df
    STATE["quality_audit"] = audit
    STATE["raw_df"] = df

    return {
        "success": True,
        "filename": filename,
        "num_stocks": meta["num_stocks"],
        "stocks": meta["stocks"],
        "is_single_stock": meta.get("is_single_stock", len(meta["stocks"]) == 1),
        "num_rows": meta["num_rows"],
        "date_range": meta["date_range"],
        "quality_score": audit["quality_score"],
        "quality_rating": audit["quality_rating"],
        "has_ohlcv": meta.get("has_ohlcv", False)
    }

# Preload default sample dataset if available
sample_path = os.path.join(os.path.dirname(__file__), "..", "datasets", "sp500_sample_long.csv")
if os.path.exists(sample_path):
    try:
        sample_df = pd.read_csv(sample_path)
        load_dataset_into_state(sample_df, "sp500_sample_long.csv")
    except Exception as e:
        print(f"Notice: Initial dataset loading deferred: {e}")

@app.get("/api/health")
def health():
    stocks = STATE["dataset_meta"].get("stocks", []) if STATE["is_loaded"] else []
    return {
        "status": "healthy",
        "dataset_loaded": STATE["is_loaded"],
        "active_dataset": STATE["filename"],
        "stocks_count": len(stocks),
        "is_single_stock": len(stocks) == 1,
        "stocks": stocks
    }

@app.post("/api/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    column_mapping: Optional[str] = Form(None)
):
    try:
        contents = await file.read()
        df = DatasetLoader.read_file(contents, file.filename)
        
        custom_map = None
        if column_mapping:
            try:
                custom_map = json.loads(column_mapping)
            except Exception:
                pass

        result = load_dataset_into_state(df, file.filename, custom_map)
        if not result.get("success"):
            return result

        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing uploaded file: {str(e)}")

@app.post("/api/load-sample")
def load_sample(sample_name: str = Query("sp500_sample_long.csv")):
    base_dir = os.path.join(os.path.dirname(__file__), "..", "datasets")
    target_path = os.path.join(base_dir, sample_name)
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"Sample dataset '{sample_name}' not found.")
    
    df = pd.read_csv(target_path)
    result = load_dataset_into_state(df, sample_name)
    return result

@app.post("/api/dataset/blend-with-benchmark")
def blend_with_benchmark():
    """
    Blends single-stock or custom uploaded series with benchmark equities
    so multi-asset portfolio algorithms and correlation networks can run seamlessly.
    """
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset loaded.")

    current_price_df = STATE["price_df"]
    uploaded_stocks = list(current_price_df.columns)

    sample_path = os.path.join(os.path.dirname(__file__), "..", "datasets", "sp500_sample_long.csv")
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Benchmark dataset not found.")

    bench_df = pd.read_csv(sample_path)
    bench_pivot = bench_df.pivot(index="Date", columns="Ticker", values="Close")

    # Combine with benchmark assets
    # Outer join to preserve dates, then fill missing prices
    merged = pd.concat([current_price_df, bench_pivot], axis=1)
    merged = merged.loc[:, ~merged.columns.duplicated()]
    merged = merged.ffill().bfill().dropna()

    if len(merged) < 20:
        raise HTTPException(status_code=400, detail="Insufficient overlapping dates between uploaded asset and benchmark.")

    meta = {
        "success": True,
        "format": "long",
        "stocks": list(merged.columns),
        "num_stocks": len(merged.columns),
        "is_single_stock": False,
        "num_rows": len(merged),
        "date_range": [str(merged.index.min()), str(merged.index.max())],
        "price_matrix": merged.to_dict(orient="index"),
        "dates": list(merged.index),
        "available_columns": list(merged.columns),
        "sample_records": [],
        "has_ohlcv": False
    }
    audit = DataCleaner.audit_quality(merged)

    STATE["is_loaded"] = True
    clean_orig_name = STATE["filename"].replace(" + S&P 500 Benchmarks", "")
    STATE["filename"] = f"{clean_orig_name} + S&P 500 Benchmarks"
    STATE["dataset_meta"] = meta
    STATE["price_df"] = merged
    STATE["quality_audit"] = audit

    return {
        "success": True,
        "filename": STATE["filename"],
        "num_stocks": meta["num_stocks"],
        "stocks": meta["stocks"],
        "is_single_stock": False,
        "num_rows": meta["num_rows"],
        "date_range": meta["date_range"],
        "quality_score": audit["quality_score"],
        "quality_rating": audit["quality_rating"],
        "has_ohlcv": False
    }

@app.get("/api/dataset/overview")
def get_dataset_overview():
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset currently loaded.")
    
    meta = STATE["dataset_meta"]
    audit = STATE["quality_audit"]
    return {
        "filename": STATE["filename"],
        "format": meta.get("format"),
        "num_stocks": meta.get("num_stocks"),
        "stocks": meta.get("stocks"),
        "is_single_stock": meta.get("is_single_stock", len(meta.get("stocks", [])) == 1),
        "num_rows": meta.get("num_rows"),
        "date_range": meta.get("date_range"),
        "available_columns": meta.get("available_columns"),
        "detected_roles": meta.get("detected_roles"),
        "quality_audit": audit,
        "sample_records": meta.get("sample_records", [])[:15]
    }

@app.get("/api/market/overview")
def get_market_overview():
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset loaded.")

    price_df = STATE["price_df"]
    stocks = list(price_df.columns)
    ret_df = price_df.pct_change().dropna()
    
    stock_stats = []
    for s in stocks:
        s_prices = price_df[s]
        s_rets = ret_df[s] if s in ret_df.columns else pd.Series([0.0])
        tot_ret = (s_prices.iloc[-1] - s_prices.iloc[0]) / max(0.001, s_prices.iloc[0])
        ann_vol = s_rets.std() * np.sqrt(252.0) if len(s_rets) > 1 else 0.0
        stock_stats.append({
            "ticker": s,
            "latest_price": round(float(s_prices.iloc[-1]), 2),
            "total_return": round(float(tot_ret) * 100.0, 2),
            "annualized_vol": round(float(ann_vol) * 100.0, 2)
        })

    best_performers = sorted(stock_stats, key=lambda x: x["total_return"], reverse=True)[:5]
    worst_performers = sorted(stock_stats, key=lambda x: x["total_return"])[:5]
    most_volatile = sorted(stock_stats, key=lambda x: x["annualized_vol"], reverse=True)[:5]

    market_index = price_df.mean(axis=1)
    cum_market_ret = (market_index / market_index.iloc[0] - 1.0) * 100.0
    overall_trend = "Bullish / Expansion" if cum_market_ret.iloc[-1] > 5.0 else ("Bearish / Contraction" if cum_market_ret.iloc[-1] < -5.0 else "Neutral / Consolidation")

    step = max(1, len(price_df) // 100)
    market_trajectory = [
        {"date": str(price_df.index[i]), "index_value": round(float(market_index.iloc[i]), 2), "return_pct": round(float(cum_market_ret.iloc[i]), 2)}
        for i in range(0, len(price_df), step)
    ]

    return {
        "overall_trend": overall_trend,
        "market_return_pct": round(float(cum_market_ret.iloc[-1]), 2),
        "total_stocks": len(stocks),
        "is_single_stock": len(stocks) == 1,
        "best_performing": best_performers,
        "worst_performing": worst_performers,
        "most_volatile": most_volatile,
        "market_trajectory": market_trajectory
    }

@app.get("/api/stocks/{ticker}/trend")
def get_stock_trend(ticker: str):
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset loaded.")

    price_df = STATE["price_df"]
    ticker = ticker.upper()
    if ticker not in price_df.columns:
        raise HTTPException(status_code=404, detail=f"Stock '{ticker}' not found in dataset.")

    series = price_df[ticker]
    dates = list(price_df.index)
    metrics_payload = TrendMetrics.calculate_stock_metrics(series, dates)
    classification_payload = TrendClassifier.classify(metrics_payload["summary"], list(series.values[-40:]))

    return {
        "ticker": ticker,
        "metrics": metrics_payload["summary"],
        "classification": classification_payload,
        "timeseries": metrics_payload["timeseries"]
    }

@app.get("/api/correlation/network")
def get_correlation_network(threshold: float = Query(0.5, ge=0.0, le=1.0), method: str = Query("pearson")):
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset loaded.")

    price_df = STATE["price_df"]
    if len(price_df.columns) < 2:
        return {
            "error": "single_stock_limitation",
            "message": f"Correlation network requires at least 2 stocks. Currently loaded dataset has 1 stock ('{price_df.columns[0]}'). Please click 'Blend with Benchmark Equities' on the upload tab or top banner.",
            "stocks": list(price_df.columns)
        }

    network_data = CorrelationNetworkEngine.build_network(price_df, threshold=threshold, method=method)
    return network_data

class PortfolioConstructRequest(BaseModel):
    algorithm: str = "hrp"
    investment_amount: float = 100000.0
    risk_profile: str = "Moderate"
    max_stocks: int = 10
    min_allocation: float = 0.02
    max_allocation: float = 0.40

@app.post("/api/portfolio/construct")
def construct_portfolio(req: PortfolioConstructRequest):
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset loaded.")

    price_df = STATE["price_df"]
    if len(price_df.columns) < 2:
        raise HTTPException(
            status_code=400, 
            detail=f"Portfolio construction requires at least 2 stocks to optimize diversification and covariance. Current dataset contains 1 stock ('{price_df.columns[0]}'). Click 'Blend with Benchmark Equities' to enable portfolio optimization."
        )

    ret_df = price_df.pct_change().dropna()
    stocks = list(price_df.columns)

    if req.algorithm == "equal_weight":
        opt_res = EqualWeightOptimizer.optimize(stocks, req.max_stocks, req.min_allocation, req.max_allocation)
    elif req.algorithm == "risk_parity":
        opt_res = RiskParityOptimizer.optimize(ret_df, req.max_stocks, req.min_allocation, req.max_allocation)
    elif req.algorithm == "markowitz_mvo":
        opt_res = MarkowitzOptimizer.optimize(ret_df, req.risk_profile, req.max_stocks, req.min_allocation, req.max_allocation)
    elif req.algorithm == "hrp":
        opt_res = HRPOptimizer.optimize(ret_df, req.max_stocks, req.min_allocation, req.max_allocation)
    elif req.algorithm == "genetic_algorithm":
        opt_res = GeneticAlgorithmOptimizer.optimize(ret_df, req.max_stocks, req.min_allocation, req.max_allocation)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown algorithm '{req.algorithm}'.")

    weights_dict = opt_res["weights"]
    weights_vector = np.array([weights_dict.get(s, 0.0) for s in stocks])

    port_metrics = PortfolioObjectives.calculate_metrics(weights_vector, ret_df)
    attribution = RiskAttribution.compute_attribution(stocks, weights_vector, ret_df, req.investment_amount)
    explanations = PortfolioExplainer.explain_allocations(stocks, weights_dict, ret_df, attribution)

    return {
        "algorithm_id": req.algorithm,
        "algorithm_name": opt_res["algorithm"],
        "metadata": opt_res["metadata"],
        "weights": weights_dict,
        "selected_stocks": opt_res["selected_stocks"],
        "portfolio_metrics": port_metrics,
        "attribution": attribution,
        "explanations": explanations
    }

@app.post("/api/portfolio/compare-all")
def compare_all_algorithms(
    investment_amount: float = 100000.0,
    risk_profile: str = "Moderate",
    max_stocks: int = 10,
    min_allocation: float = 0.02,
    max_allocation: float = 0.40
):
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset loaded.")

    price_df = STATE["price_df"]
    if len(price_df.columns) < 2:
        raise HTTPException(
            status_code=400, 
            detail=f"Algorithm comparison requires at least 2 stocks. Current dataset contains 1 stock ('{price_df.columns[0]}'). Click 'Blend with Benchmark Equities' to compare models."
        )

    ret_df = price_df.pct_change().dropna()
    stocks = list(price_df.columns)

    algos = [
        ("equal_weight", EqualWeightOptimizer.optimize(stocks, max_stocks, min_allocation, max_allocation)),
        ("risk_parity", RiskParityOptimizer.optimize(ret_df, max_stocks, min_allocation, max_allocation)),
        ("markowitz_mvo", MarkowitzOptimizer.optimize(ret_df, risk_profile, max_stocks, min_allocation, max_allocation)),
        ("hrp", HRPOptimizer.optimize(ret_df, max_stocks, min_allocation, max_allocation)),
        ("genetic_algorithm", GeneticAlgorithmOptimizer.optimize(ret_df, max_stocks, min_allocation, max_allocation))
    ]

    results = []
    for algo_id, opt_res in algos:
        w_dict = opt_res["weights"]
        w_vec = np.array([w_dict.get(s, 0.0) for s in stocks])
        metrics = PortfolioObjectives.calculate_metrics(w_vec, ret_df)
        results.append({
            "id": algo_id,
            "name": opt_res["algorithm"],
            "metadata": opt_res["metadata"],
            "weights": w_dict,
            "metrics": metrics
        })

    return {
        "comparison": results,
        "stocks": stocks
    }

class ShockRequest(BaseModel):
    weights: Dict[str, float]
    scenario_type: str = "Market-Wide Crash"
    magnitude_pct: float = -20.0
    target_stocks: Optional[List[str]] = None
    duration_days: int = 15
    recovery_pct: float = 50.0
    initial_portfolio_value: float = 100000.0

@app.post("/api/simulation/shock")
def simulate_shock(req: ShockRequest):
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset loaded.")

    res = MarketShockSimulator.simulate_shock(
        price_df=STATE["price_df"],
        weights=req.weights,
        scenario_type=req.scenario_type,
        magnitude_pct=req.magnitude_pct,
        target_stocks=req.target_stocks,
        duration_days=req.duration_days,
        recovery_pct=req.recovery_pct,
        initial_portfolio_value=req.initial_portfolio_value
    )
    return res

class ReplayRequest(BaseModel):
    weights: Dict[str, float]
    initial_capital: float = 100000.0
    rebalance_frequency: str = "Quarterly"

@app.post("/api/simulation/replay")
def run_historical_replay(req: ReplayRequest):
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset loaded.")

    return HistoricalReplayEngine.generate_replay(
        price_df=STATE["price_df"],
        weights=req.weights,
        initial_capital=req.initial_capital,
        rebal_frequency=req.rebalance_frequency
    )

class RebalanceEvaluateRequest(BaseModel):
    target_weights: Dict[str, float]
    drift_threshold: float = 0.05
    vol_surge_threshold: float = 0.30
    drawdown_limit: float = 0.15

@app.post("/api/rebalancing/evaluate")
def evaluate_rebalance(req: RebalanceEvaluateRequest):
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset loaded.")

    return DynamicRebalancingEngine.evaluate_and_rebalance(
        price_df=STATE["price_df"],
        target_weights=req.target_weights,
        drift_threshold=req.drift_threshold,
        vol_surge_threshold=req.vol_surge_threshold,
        drawdown_limit=req.drawdown_limit
    )

class BacktestRequest(BaseModel):
    weights: Dict[str, float]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    initial_investment: float = 100000.0
    rebalance_frequency: str = "Monthly"
    transaction_cost_bps: float = 10.0

@app.post("/api/backtest")
def run_backtest(req: BacktestRequest):
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset loaded.")

    return BacktestingEngine.run_backtest(
        price_df=STATE["price_df"],
        weights=req.weights,
        start_date=req.start_date,
        end_date=req.end_date,
        initial_investment=req.initial_investment,
        rebalance_frequency=req.rebalance_frequency,
        transaction_cost_bps=req.transaction_cost_bps
    )

class WhatIfRequest(BaseModel):
    base_weights: Dict[str, float]
    shocked_stock: Optional[str] = None
    stock_drop_pct: Optional[float] = 0.0
    removed_stock: Optional[str] = None
    volatility_multiplier: Optional[float] = 1.0
    capital_multiplier: Optional[float] = 1.0

@app.post("/api/what-if")
def run_what_if(req: WhatIfRequest):
    if not STATE["is_loaded"]:
        raise HTTPException(status_code=400, detail="No dataset loaded.")

    price_df = STATE["price_df"].copy()
    stocks = list(req.base_weights.keys())
    
    adjusted_weights = dict(req.base_weights)
    if req.removed_stock and req.removed_stock in adjusted_weights:
        del adjusted_weights[req.removed_stock]
        stocks = [s for s in stocks if s != req.removed_stock]
        s_sum = sum(adjusted_weights.values())
        if s_sum > 0:
            adjusted_weights = {s: adjusted_weights[s] / s_sum for s in stocks}

    if len(stocks) == 0:
        raise HTTPException(status_code=400, detail="Cannot remove all stocks from the portfolio. At least one asset must remain.")

    if req.shocked_stock and req.shocked_stock in price_df.columns:
        drop_factor = (1.0 + (req.stock_drop_pct / 100.0))
        price_df[req.shocked_stock] = price_df[req.shocked_stock] * drop_factor

    ret_df = price_df[stocks].pct_change().dropna()
    if req.volatility_multiplier and req.volatility_multiplier != 1.0:
        ret_df = ret_df * req.volatility_multiplier

    w_vec = np.array([adjusted_weights.get(s, 0.0) for s in stocks])
    new_metrics = PortfolioObjectives.calculate_metrics(w_vec, ret_df)
    new_attr = RiskAttribution.compute_attribution(stocks, w_vec, ret_df, 100000.0 * req.capital_multiplier)

    return {
        "adjusted_weights": adjusted_weights,
        "new_metrics": new_metrics,
        "new_attribution": new_attr,
        "scenario_applied": {
            "shocked_stock": req.shocked_stock,
            "drop_pct": req.stock_drop_pct,
            "removed_stock": req.removed_stock,
            "volatility_multiplier": req.volatility_multiplier,
            "capital_multiplier": req.capital_multiplier
        }
    }

@app.get("/api/algorithms/guide")
@app.get("/api/algorithms/daa-guide")
def get_algorithm_guide():
    return {
        "algorithms": [
            EqualWeightOptimizer.METADATA,
            RiskParityOptimizer.METADATA,
            MarkowitzOptimizer.METADATA,
            HRPOptimizer.METADATA,
            GeneticAlgorithmOptimizer.METADATA
        ],
        "graph_algorithms": [
            {
                "id": "correlation_graph",
                "name": "Correlation Network Construction & Thresholding",
                "category": "Graph Theory",
                "problem": "Represent cross-asset dependencies as a weighted undirected graph G=(V, E).",
                "time_complexity": "O(N^2 * T) for covariance matrix, O(N^2) for threshold edge filtering.",
                "space_complexity": "O(N^2) for adjacency matrix / edge lists."
            },
            {
                "id": "greedy_modularity",
                "name": "Clauset-Newman-Moore Community Detection",
                "category": "Graph Clustering",
                "problem": "Detect natural market clusters and sector co-movements maximizing network modularity Q.",
                "time_complexity": "O(|E| * d * log |V|) where d is max degree.",
                "space_complexity": "O(|V| + |E|)."
            }
        ]
    }

@app.post("/api/reports/export-csv")
def export_report_csv(report_data: Dict[str, Any]):
    csv_text = ReportExporter.generate_csv_summary(report_data)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=portfolio_report.csv"}
    )
