import numpy as np
import pandas as pd
from scipy.optimize import minimize
from typing import Dict, Any, List

class MarkowitzOptimizer:
    METADATA = {
        "id": "markowitz_mvo",
        "name": "Mean-Variance Portfolio (Markowitz Modern Portfolio Theory)",
        "category": "Convex Quadratic Optimization (QP / SLSQP)",
        "problem": "Maximize expected portfolio return for a given level of portfolio risk, or conversely minimize portfolio variance subject to return and budget constraints.",
        "idea": "Solve the mathematical quadratic program: min_w (0.5 * w^T Sigma w - lambda * mu^T w) subject to sum(w_i) = 1 and min_alloc <= w_i <= max_alloc, where lambda is risk tolerance (derived from Conservative, Moderate, or Aggressive profile).",
        "input": "Expected asset returns vector mu, annualized covariance matrix Sigma, risk appetite lambda, asset bounds.",
        "output": "Optimum allocation vector w* lying on the Efficient Frontier.",
        "time_complexity": "O(N^3) per SQP iteration; overall O(K * N^3) where K is number of interior-point or SLSQP iterations.",
        "space_complexity": "O(N^2) - Required for the N x N covariance matrix and Hessian approximations.",
        "why_appropriate": "Nobel-prize winning foundational portfolio algorithm. Rigorously balances risk-reward trade-off accounting for inter-asset covariances.",
        "pseudocode": """ALGORITHM MarkowitzMeanVariance(mu[1..N], Sigma[1..N, 1..N], lambda, min_w, max_w):
    Objective(w) = 0.5 * (w^T * Sigma * w) - lambda * (mu^T * w)
    Constraint: Sum(w) - 1.0 = 0
    Bounds: min_w <= w[i] <= max_w for all i
    w_init = [1/N, 1/N, ..., 1/N]
    w* = SLSQP_Minimize(Objective, w_init, constraints, bounds)
    Return w*"""
    }

    @classmethod
    def optimize(
        cls, 
        returns_df: pd.DataFrame, 
        risk_profile: str = "Moderate",
        max_stocks: int = 10,
        min_alloc: float = 0.0,
        max_alloc: float = 0.40
    ) -> Dict[str, Any]:
        stocks = list(returns_df.columns)
        mu = returns_df.mean().values * 252.0
        cov = returns_df.cov().values * 252.0
        n_total = len(stocks)

        # Risk tolerance parameter lambda
        # Conservative: penalty on variance is high (lambda low, focus on minimum variance)
        # Moderate: balanced Sharpe maximization
        # Aggressive: lambda high, focus on expected returns
        lambda_map = {
            "Conservative": 0.05,
            "Moderate": 0.25,
            "Aggressive": 0.60
        }
        lam = lambda_map.get(risk_profile, 0.25)

        # Pre-select top candidates if n_total > max_stocks
        if n_total > max_stocks:
            stds = np.sqrt(np.diag(cov))
            sharpes = (mu - 0.03) / np.maximum(stds, 1e-4)
            top_idx = np.argsort(-sharpes)[:max_stocks]
            sub_stocks = [stocks[i] for i in top_idx]
            mu = mu[top_idx]
            cov = cov[np.ix_(top_idx, top_idx)]
            n = max_stocks
        else:
            sub_stocks = stocks
            n = n_total

        # Objective function
        def objective(w):
            port_var = w.T @ cov @ w
            port_ret = mu.T @ w
            return 0.5 * port_var - lam * port_ret

        # Gradient for fast numerical convergence
        def gradient(w):
            return cov @ w - lam * mu

        # Constraints & Bounds
        constraints = ({'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0})
        bounds = tuple((min_alloc, max_alloc) for _ in range(n))
        w0 = np.full(n, 1.0 / n)

        try:
            res = minimize(
                objective, 
                w0, 
                jac=gradient, 
                method='SLSQP', 
                bounds=bounds, 
                constraints=constraints,
                options={'maxiter': 500, 'ftol': 1e-7}
            )
            if res.success:
                opt_w = np.clip(res.x, 0.0, 1.0)
                opt_w = opt_w / np.sum(opt_w)
            else:
                opt_w = w0
        except Exception:
            opt_w = w0

        weights_dict = {s: 0.0 for s in stocks}
        for i, s in enumerate(sub_stocks):
            weights_dict[s] = float(opt_w[i])

        return {
            "algorithm": cls.METADATA["name"],
            "metadata": cls.METADATA,
            "weights": weights_dict,
            "selected_stocks": sub_stocks
        }
