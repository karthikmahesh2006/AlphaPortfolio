import numpy as np
from typing import Dict, Any, List

class EqualWeightOptimizer:
    METADATA = {
        "id": "equal_weight",
        "name": "Equal Weight Portfolio (1/N)",
        "category": "Baseline / Uniform Heuristic",
        "problem": "Allocate investment capital uniformly across N selected candidate assets without relying on parameter estimation or covariance matrices.",
        "idea": "Assign each eligible asset identical allocation w_i = 1/N. Eliminates estimation risk and avoids overfitting historical sample covariance.",
        "input": "List of N asset identifiers, capital amount.",
        "output": "Vector of weights w in R^N where w_i = 1/N.",
        "time_complexity": "O(N) - Linear single-pass assignment.",
        "space_complexity": "O(N) - Storage for weight vector.",
        "why_appropriate": "Acts as the golden academic baseline (DeMiguel et al. 2009). Often outperforms complex optimization out-of-sample when estimation error is large.",
        "pseudocode": """ALGORITHM EqualWeightPortfolio(Assets[1..N], MaxStocks):
    If N > MaxStocks:
        Rank assets by Sharpe ratio or momentum descending
        Assets = Top MaxStocks
        N = MaxStocks
    For i = 1 to N:
        w[i] = 1.0 / N
    Return w"""
    }

    @classmethod
    def optimize(
        cls, 
        stocks: List[str], 
        max_stocks: int = 10, 
        min_alloc: float = 0.0, 
        max_alloc: float = 1.0
    ) -> Dict[str, Any]:
        n = min(len(stocks), max_stocks)
        selected_stocks = stocks[:n]
        w = np.full(n, 1.0 / n)
        
        weights_dict = {s: float(w[i]) for i, s in enumerate(selected_stocks)}
        for s in stocks[n:]:
            weights_dict[s] = 0.0

        return {
            "algorithm": cls.METADATA["name"],
            "metadata": cls.METADATA,
            "weights": weights_dict,
            "selected_stocks": selected_stocks
        }
