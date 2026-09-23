import numpy as np
import pandas as pd
from typing import Dict, Any, List

class PortfolioObjectives:
    @staticmethod
    def calculate_metrics(
        weights: np.ndarray, 
        returns_df: pd.DataFrame, 
        risk_free_rate: float = 0.03
    ) -> Dict[str, Any]:
        """
        Computes portfolio expected return, volatility, Sharpe, Sortino, Diversification Ratio,
        HHI concentration, VaR, and CVaR.
        """
        weights = np.array(weights, dtype=float)
        # Normalize weights to exactly 1.0 if not empty
        if np.sum(weights) > 0:
            weights = weights / np.sum(weights)
        else:
            weights = np.ones(len(weights)) / len(weights)

        mean_daily_returns = returns_df.mean().values
        cov_matrix = returns_df.cov().values * 252.0  # Annualized covariance
        individual_vols = returns_df.std().values * np.sqrt(252.0)

        # 1. Expected Annual Return & Volatility
        expected_annual_return = float(np.sum(mean_daily_returns * weights) * 252.0)
        port_variance = float(weights.T @ cov_matrix @ weights)
        annualized_vol = float(np.sqrt(max(1e-8, port_variance)))

        # 2. Sharpe Ratio
        sharpe_ratio = float((expected_annual_return - risk_free_rate) / max(annualized_vol, 1e-4))

        # 3. Portfolio Daily Return Series
        port_daily_returns = returns_df.values @ weights

        # 4. Sortino Ratio (Downside deviation)
        downside_returns = port_daily_returns[port_daily_returns < 0.0]
        downside_std = float(np.std(downside_returns) * np.sqrt(252.0)) if len(downside_returns) > 0 else annualized_vol
        sortino_ratio = float((expected_annual_return - risk_free_rate) / max(downside_std, 1e-4))

        # 5. Diversification Ratio: (Sum of weighted asset vols) / (Portfolio vol)
        weighted_vol_sum = float(np.sum(weights * individual_vols))
        diversification_ratio = float(weighted_vol_sum / max(annualized_vol, 1e-4))

        # 6. Concentration Index (Herfindahl-Hirschman Index HHI)
        hhi = float(np.sum(weights ** 2))
        effective_n = float(1.0 / max(hhi, 1e-4))

        # 7. Historical Value-at-Risk (VaR 95%) and Conditional VaR (CVaR 95%)
        var_95 = float(np.percentile(port_daily_returns, 5))
        cvar_95 = float(port_daily_returns[port_daily_returns <= var_95].mean()) if any(port_daily_returns <= var_95) else var_95

        # 8. Maximum Historical Drawdown of portfolio
        cum_ret = np.cumprod(1.0 + port_daily_returns)
        peak = np.maximum.accumulate(cum_ret)
        drawdowns = (cum_ret - peak) / peak
        max_drawdown = float(np.min(drawdowns))

        return {
            "expected_return": round(expected_annual_return * 100.0, 2),
            "volatility": round(annualized_vol * 100.0, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "sortino_ratio": round(sortino_ratio, 2),
            "diversification_ratio": round(diversification_ratio, 2),
            "concentration_hhi": round(hhi, 4),
            "effective_n_assets": round(effective_n, 1),
            "var_95_daily": round(abs(var_95) * 100.0, 2),
            "cvar_95_daily": round(abs(cvar_95) * 100.0, 2),
            "max_drawdown": round(max_drawdown * 100.0, 2)
        }
