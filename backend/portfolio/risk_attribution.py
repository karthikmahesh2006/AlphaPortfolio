import numpy as np
import pandas as pd
from typing import Dict, Any, List

class RiskAttribution:
    @staticmethod
    def compute_attribution(
        stocks: List[str], 
        weights: np.ndarray, 
        returns_df: pd.DataFrame,
        total_investment: float = 10000.0
    ) -> List[Dict[str, Any]]:
        """
        Computes granular asset-level contributions:
        - Allocation Percentage & Dollar Amount
        - Individual Expected Return & Volatility
        - Marginal Risk Contribution (MRC)
        - Percentage Risk Contribution (PRC)
        - Return Contribution
        """
        weights = np.array(weights, dtype=float)
        total_w = np.sum(weights)
        if total_w > 0:
            weights = weights / total_w
        else:
            weights = np.ones(len(stocks)) / len(stocks)

        mean_returns = returns_df[stocks].mean().values * 252.0
        cov_matrix = returns_df[stocks].cov().values * 252.0
        stds = returns_df[stocks].std().values * np.sqrt(252.0)

        # Portfolio total variance and volatility
        port_variance = float(weights.T @ cov_matrix @ weights)
        port_vol = float(np.sqrt(max(1e-8, port_variance)))
        port_ret = float(np.sum(weights * mean_returns))

        # Marginal Risk Contribution: MRC = (Cov @ w) / port_vol
        cov_w = cov_matrix @ weights
        mrc = cov_w / port_vol

        # Percentage Risk Contribution: PRC = w * MRC / port_vol
        prc = (weights * mrc) / port_vol

        results = []
        for i, s in enumerate(stocks):
            alloc_pct = float(weights[i]) * 100.0
            dollar_val = float(weights[i]) * total_investment
            asset_ret = float(mean_returns[i]) * 100.0
            asset_vol = float(stds[i]) * 100.0
            risk_contrib_pct = float(prc[i]) * 100.0
            ret_contrib_pct = (float(weights[i] * mean_returns[i]) / max(abs(port_ret), 1e-4)) * 100.0

            results.append({
                "ticker": s,
                "allocation_pct": round(alloc_pct, 2),
                "investment_amount": round(dollar_val, 2),
                "expected_return": round(asset_ret, 2),
                "volatility": round(asset_vol, 2),
                "marginal_risk_contribution": round(float(mrc[i]) * 100.0, 2),
                "risk_contribution_pct": round(risk_contrib_pct, 2),
                "return_contribution_pct": round(ret_contrib_pct, 2)
            })

        return results
