import numpy as np
import pandas as pd
from typing import Dict, Any, List

class RiskParityOptimizer:
    METADATA = {
        "id": "risk_parity",
        "name": "Risk-Based / Inverse Volatility Portfolio",
        "category": "Greedy Risk Budgeting",
        "problem": "Equalize risk contribution across assets so higher-volatility stocks receive proportionally smaller capital allocations.",
        "idea": "Compute standard deviation sigma_i for each asset. Allocate inversely proportional to volatility: w_i proportional to 1 / sigma_i. Clip weights within [min_alloc, max_alloc] and re-normalize iteratively.",
        "input": "Return series for N assets, constraints: [min_alloc, max_alloc], max_stocks.",
        "output": "Risk-balanced weight vector w in R^N summing to 1.0.",
        "time_complexity": "O(N * T + N log N) where T is time periods (covariance computation) and N log N is sorting/clipping passes.",
        "space_complexity": "O(N) - Storage for volatility array and weights.",
        "why_appropriate": "Prevents single volatile stocks (e.g. meme stocks, high-beta tech) from dominating portfolio risk, producing superior drawdown resistance.",
        "pseudocode": """ALGORITHM InverseVolatilityPortfolio(Returns[1..T, 1..N], min_w, max_w):
    For i = 1 to N:
        sigma[i] = StandardDeviation(Returns[:, i]) * sqrt(252)
        inv_vol[i] = 1.0 / max(sigma[i], 1e-4)
    w = inv_vol / Sum(inv_vol)
    Repeat until convergence:
        w = Clip(w, min_w, max_w)
        w = w / Sum(w)
    Return w"""
    }

    @classmethod
    def optimize(
        cls, 
        returns_df: pd.DataFrame, 
        max_stocks: int = 10,
        min_alloc: float = 0.02,
        max_alloc: float = 0.40
    ) -> Dict[str, Any]:
        stocks = list(returns_df.columns)
        vols = returns_df.std().values * np.sqrt(252.0)
        
        # Sort stocks by Sharpe ratio or inverse volatility to pick top max_stocks
        means = returns_df.mean().values * 252.0
        sharpes = (means - 0.03) / np.maximum(vols, 1e-4)
        
        top_indices = np.argsort(-sharpes)[:max_stocks]
        selected_stocks = [stocks[i] for i in top_indices]
        sub_vols = vols[top_indices]

        # Inverse volatility
        inv_v = 1.0 / np.maximum(sub_vols, 1e-4)
        raw_w = inv_v / np.sum(inv_v)

        # Iterative projection onto box constraints [min_alloc, max_alloc]
        w = np.clip(raw_w, min_alloc, max_alloc)
        for _ in range(20):
            s = np.sum(w)
            if abs(s - 1.0) < 1e-5:
                break
            w = w / s
            w = np.clip(w, min_alloc, max_alloc)
        w = w / np.sum(w)

        weights_dict = {s: 0.0 for s in stocks}
        for i, s in enumerate(selected_stocks):
            weights_dict[s] = float(w[i])

        return {
            "algorithm": cls.METADATA["name"],
            "metadata": cls.METADATA,
            "weights": weights_dict,
            "selected_stocks": selected_stocks
        }
