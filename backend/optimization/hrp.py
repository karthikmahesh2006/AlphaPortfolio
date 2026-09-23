import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import linkage, to_tree
from scipy.spatial.distance import squareform
from typing import Dict, Any, List

class HRPOptimizer:
    METADATA = {
        "id": "hrp",
        "name": "Hierarchical Risk Parity (HRP - Correlation/Diversification-Aware)",
        "category": "Divide-and-Conquer / Graph Tree Traversal",
        "problem": "Allocate weights without matrix inversion (avoiding Markowitz instability due to multicollinear condition numbers) by leveraging hierarchical cluster structures.",
        "idea": "Operates in three stages: (1) Tree Clustering on correlation metric d_ij = sqrt(0.5*(1 - rho_ij)); (2) Quasi-Diagonalization to reorder covariance matrix via tree leaf traversal; (3) Recursive Bisection allocating risk inversely between sibling sub-clusters.",
        "input": "Covariance and correlation matrices of asset returns, max/min allocation constraints.",
        "output": "Diversification-optimized weight vector w in R^N summing to 1.0.",
        "time_complexity": "O(N^2 log N) - Tree construction takes O(N^2), quasi-diagonalization is O(N), recursive bisection is O(N log N).",
        "space_complexity": "O(N^2) - Required for condensed distance matrix and cluster linkage tree.",
        "why_appropriate": "Does not require inverting a singular or ill-conditioned covariance matrix. Highly resilient to asset collinearity and market regimes.",
        "pseudocode": """ALGORITHM HierarchicalRiskParity(Cov, Corr):
    // Stage 1: Distance matrix & Hierarchical Clustering
    Dist = sqrt(0.5 * (1 - Corr))
    Tree = HierarchicalClustering(Dist, method='single')
    // Stage 2: Quasi-Diagonalization (Tree Traversal)
    OrderedIndices = GetQuasiDiagLeaves(Tree)
    // Stage 3: Recursive Bisection
    Weights = RecursiveBisection(Cov, OrderedIndices)
    Return Weights"""
    }

    @staticmethod
    def _get_quasi_diag(link):
        """Recursively traverses hierarchical tree to order leaf indices."""
        tree = to_tree(link, rd=False)
        
        def traverse(node):
            if node.is_leaf():
                return [node.id]
            return traverse(node.left) + traverse(node.right)
            
        return traverse(tree)

    @staticmethod
    def _get_cluster_var(cov, cluster_items):
        sub_cov = cov[np.ix_(cluster_items, cluster_items)]
        # Inverse variance allocation within cluster
        inv_diag = 1.0 / np.diag(sub_cov)
        w = inv_diag / np.sum(inv_diag)
        c_var = float(w.T @ sub_cov @ w)
        return max(1e-8, c_var)

    @classmethod
    def _recursive_bisection(cls, cov, ordered_indices):
        w = pd.Series(1.0, index=ordered_indices)
        clusters = [ordered_indices]
        
        while len(clusters) > 0:
            new_clusters = []
            for c in clusters:
                if len(c) > 1:
                    mid = len(c) // 2
                    c1 = c[:mid]
                    c2 = c[mid:]
                    
                    var1 = cls._get_cluster_var(cov, c1)
                    var2 = cls._get_cluster_var(cov, c2)
                    
                    alpha = 1.0 - var1 / (var1 + var2)
                    w[c1] *= alpha
                    w[c2] *= (1.0 - alpha)
                    
                    new_clusters.append(c1)
                    new_clusters.append(c2)
            clusters = new_clusters
        return w

    @classmethod
    def optimize(
        cls, 
        returns_df: pd.DataFrame, 
        max_stocks: int = 10,
        min_alloc: float = 0.02,
        max_alloc: float = 0.40
    ) -> Dict[str, Any]:
        stocks = list(returns_df.columns)
        n_total = len(stocks)

        if n_total > max_stocks:
            # Pick top max_stocks with highest Sharpe
            mu = returns_df.mean().values * 252.0
            stds = returns_df.std().values * np.sqrt(252.0)
            sharpes = (mu - 0.03) / np.maximum(stds, 1e-4)
            top_idx = np.argsort(-sharpes)[:max_stocks]
            sub_stocks = [stocks[i] for i in top_idx]
            sub_returns = returns_df[sub_stocks]
        else:
            sub_stocks = stocks
            sub_returns = returns_df

        corr = sub_returns.corr().values
        cov = sub_returns.cov().values * 252.0
        n = len(sub_stocks)

        # Distance matrix d_ij = sqrt(0.5 * (1 - rho_ij))
        dist = np.sqrt(np.clip(0.5 * (1.0 - corr), 0.0, 1.0))
        np.fill_diagonal(dist, 0.0)

        # Condensed distance matrix for scipy linkage
        condensed_dist = squareform(dist, checks=False)
        link = linkage(condensed_dist, method="single")

        # Quasi-diagonalization
        ordered_leaves = cls._get_quasi_diag(link)

        # Recursive Bisection
        hrp_weights = cls._recursive_bisection(cov, ordered_leaves)
        raw_w = np.array([hrp_weights[i] for i in range(n)])

        # Apply bounds clipping
        w = np.clip(raw_w, min_alloc, max_alloc)
        for _ in range(10):
            w = w / np.sum(w)
            w = np.clip(w, min_alloc, max_alloc)
        w = w / np.sum(w)

        weights_dict = {s: 0.0 for s in stocks}
        for i, s in enumerate(sub_stocks):
            weights_dict[s] = float(w[i])

        return {
            "algorithm": cls.METADATA["name"],
            "metadata": cls.METADATA,
            "weights": weights_dict,
            "selected_stocks": sub_stocks
        }
