import pandas as pd
import numpy as np
from typing import Dict, Any, List

class DynamicRebalancingEngine:
    @classmethod
    def evaluate_and_rebalance(
        cls,
        price_df: pd.DataFrame,
        target_weights: Dict[str, float],
        drift_threshold: float = 0.05,
        vol_surge_threshold: float = 0.30,
        drawdown_limit: float = 0.15
    ) -> Dict[str, Any]:
        """
        Monitors portfolio drift, volatility surges, and trend status across historical timeline,
        identifying dates where rebalancing was algorithmically triggered and why.
        """
        stocks = list(target_weights.keys())
        sub_prices = price_df[stocks].dropna()
        n_days = len(sub_prices)
        dates = list(sub_prices.index)

        # Baseline volatilities
        daily_rets = sub_prices.pct_change().dropna()
        baseline_vols = daily_rets.iloc[:min(60, len(daily_rets))].std() * np.sqrt(252.0)

        # Simulate holdings progression
        units = {}
        total_capital = 100000.0
        first_prices = sub_prices.iloc[0]
        for s in stocks:
            w = target_weights.get(s, 0.0)
            allocated_dollars = total_capital * w
            units[s] = allocated_dollars / max(0.01, first_prices[s])

        rebalance_events = []
        last_rebalance_idx = 0

        # Scan every 21 trading days (~monthly) to check trigger rules
        for idx in range(21, n_days, 21):
            cur_date = dates[idx]
            cur_prices = sub_prices.iloc[idx]
            
            # Compute current market value of holdings
            holdings_val = {s: units[s] * cur_prices[s] for s in stocks}
            cur_total_val = sum(holdings_val.values())
            current_weights = {s: holdings_val[s] / max(1.0, cur_total_val) for s in stocks}

            # Check Trigger 1: Allocation Drift
            drift_detected = False
            max_drift = 0.0
            drift_stock = None
            for s in stocks:
                d = abs(current_weights[s] - target_weights[s])
                if d > max_drift:
                    max_drift = d
                    drift_stock = s
            if max_drift >= drift_threshold:
                drift_detected = True

            # Check Trigger 2: Volatility Surge (recent 21-day rolling vol vs baseline)
            recent_vols = daily_rets.iloc[max(0, idx-21):idx].std() * np.sqrt(252.0)
            vol_surge_stock = None
            vol_surge_pct = 0.0
            for s in stocks:
                base_v = baseline_vols.get(s, 0.20)
                rec_v = recent_vols.get(s, 0.20)
                if base_v > 0 and (rec_v - base_v) / base_v > vol_surge_threshold:
                    vol_surge_pct = ((rec_v - base_v) / base_v) * 100.0
                    vol_surge_stock = s
                    break

            # Check Trigger 3: Drawdown Breach
            window_prices = sub_prices.iloc[last_rebalance_idx:idx+1]
            window_ret = (window_prices @ np.array([target_weights[s] for s in stocks]))
            peak_val = window_ret.max()
            cur_port_val = window_ret.iloc[-1]
            drawdown = (cur_port_val - peak_val) / max(1e-4, peak_val)
            drawdown_breach = abs(drawdown) > drawdown_limit

            # Evaluate decision
            should_rebalance = drift_detected or (vol_surge_stock is not None) or drawdown_breach

            if should_rebalance:
                # Build comprehensive rationale
                reasons = []
                if drift_detected:
                    reasons.append(f"Allocation drift on {drift_stock} reached {max_drift*100.0:.1f}% (threshold {drift_threshold*100.0:.1f}%)")
                if vol_surge_stock:
                    reasons.append(f"Rolling volatility on {vol_surge_stock} surged +{vol_surge_pct:.1f}% over baseline")
                if drawdown_breach:
                    reasons.append(f"Interim drawdown breached risk ceiling at {abs(drawdown)*100.0:.1f}% (limit {drawdown_limit*100.0:.1f}%)")

                # Compute new rebalanced weights (trimming high vol stock if surge occurred)
                new_weights = dict(target_weights)
                if vol_surge_stock and new_weights[vol_surge_stock] > 0.08:
                    trimmed = new_weights[vol_surge_stock] * 0.70
                    diff = new_weights[vol_surge_stock] - trimmed
                    new_weights[vol_surge_stock] = trimmed
                    other_stocks = [s for s in stocks if s != vol_surge_stock]
                    for os in other_stocks:
                        new_weights[os] += diff / len(other_stocks)

                # Reset units
                for s in stocks:
                    units[s] = (cur_total_val * new_weights[s]) / cur_prices[s]

                rebalance_events.append({
                    "date": cur_date,
                    "portfolio_value": round(cur_total_val, 2),
                    "primary_reason": reasons[0] if reasons else "Scheduled periodic drift realignment",
                    "all_reasons": reasons,
                    "previous_weights": {s: round(current_weights[s] * 100.0, 1) for s in stocks},
                    "new_weights": {s: round(new_weights[s] * 100.0, 1) for s in stocks},
                    "capital_reallocated": round(cur_total_val * max_drift, 2)
                })
                last_rebalance_idx = idx

        return {
            "total_rebalance_events": len(rebalance_events),
            "drift_threshold_pct": drift_threshold * 100.0,
            "vol_surge_threshold_pct": vol_surge_threshold * 100.0,
            "drawdown_limit_pct": drawdown_limit * 100.0,
            "events": rebalance_events
        }
