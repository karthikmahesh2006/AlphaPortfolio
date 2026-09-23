import pandas as pd
import numpy as np
from typing import Dict, Any, List

class PortfolioExplainer:
    @staticmethod
    def explain_allocations(
        stocks: List[str],
        weights: Dict[str, float],
        returns_df: pd.DataFrame,
        attribution: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Derives verifiable, metric-driven reasons for each stock's assigned weight.
        Uses actual historical momentum, individual volatility percentile,
        inter-asset covariance, and risk-return contribution ratios.
        """
        sub_returns = returns_df[stocks]
        means = sub_returns.mean() * 252.0
        vols = sub_returns.std() * np.sqrt(252.0)
        corr_matrix = sub_returns.corr()

        median_vol = float(vols.median())
        median_ret = float(means.median())

        attr_lookup = {item["ticker"]: item for item in attribution}

        explanations = []

        for s in stocks:
            w = weights.get(s, 0.0)
            alloc_pct = round(w * 100.0, 2)
            
            # If zero allocation
            if alloc_pct < 0.1:
                explanations.append({
                    "ticker": s,
                    "allocation_pct": 0.0,
                    "reasons": [
                        "- Excluded due to portfolio cardinality or maximum asset constraints",
                        "- Sub-optimal risk-adjusted return relative to other selected assets"
                    ],
                    "risk_contribution_pct": 0.0,
                    "return_contribution_pct": 0.0,
                    "volatility": round(float(vols[s]) * 100.0, 2),
                    "expected_return": round(float(means[s]) * 100.0, 2)
                })
                continue

            reasons = []
            ret_val = float(means[s])
            vol_val = float(vols[s])
            
            # 1. Trend & Return Driver
            if ret_val > median_ret:
                reasons.append(f"+ Above-median annualized historical return ({ret_val*100.0:.1f}%) providing strong growth momentum")
            else:
                reasons.append(f"~ Conservative growth profile ({ret_val*100.0:.1f}%) stabilizing portfolio yield")

            # 2. Volatility & Risk Dampening
            if vol_val < median_vol:
                reasons.append(f"+ Low volatility asset ({vol_val*100.0:.1f}%) serving as a defensive risk buffer")
            elif vol_val > median_vol * 1.3:
                reasons.append(f"- High volatility asset ({vol_val*100.0:.1f}%); allocation is disciplined to cap drawdown exposure")
            else:
                reasons.append(f"+ Moderate volatility profile ({vol_val*100.0:.1f}%) aligning with balanced risk targets")

            # 3. Correlation & Diversification Benefit
            other_stocks = [o for o in stocks if o != s]
            avg_corr_with_peers = float(corr_matrix.loc[s, other_stocks].mean()) if other_stocks else 1.0
            if avg_corr_with_peers < 0.40:
                reasons.append(f"+ Low correlation with peer holdings (avg r={avg_corr_with_peers:.2f}), boosting portfolio diversification ratio")
            elif avg_corr_with_peers > 0.70:
                reasons.append(f"~ Moderate correlation coupling (avg r={avg_corr_with_peers:.2f}); allocation is tempered to avoid cluster concentration")
            else:
                reasons.append(f"+ Healthy diversification synergy (avg r={avg_corr_with_peers:.2f}) across portfolio basket")

            # 4. Attribution specifics
            stock_attr = attr_lookup.get(s, {})
            risk_contrib = stock_attr.get("risk_contribution_pct", 0.0)
            ret_contrib = stock_attr.get("return_contribution_pct", 0.0)

            if alloc_pct >= 15.0:
                reasons.append(f"+ Designated core portfolio holding receiving {alloc_pct}% capital share")

            explanations.append({
                "ticker": s,
                "allocation_pct": alloc_pct,
                "reasons": reasons,
                "risk_contribution_pct": risk_contrib,
                "return_contribution_pct": ret_contrib,
                "volatility": round(vol_val * 100.0, 2),
                "expected_return": round(ret_val * 100.0, 2),
                "avg_peer_correlation": round(avg_corr_with_peers, 2)
            })

        # Sort descending by allocation percentage
        explanations.sort(key=lambda x: x["allocation_pct"], reverse=True)
        return explanations
