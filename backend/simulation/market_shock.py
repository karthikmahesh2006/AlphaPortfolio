import numpy as np
import pandas as pd
from typing import Dict, Any, List

class MarketShockSimulator:
    SCENARIO_TYPES = [
        "Single Stock Crash",
        "Sector Crash",
        "Market-Wide Crash",
        "High Volatility",
        "Sudden Recovery",
        "Random Shock"
    ]

    @classmethod
    def simulate_shock(
        cls,
        price_df: pd.DataFrame,
        weights: Dict[str, float],
        scenario_type: str = "Market-Wide Crash",
        magnitude_pct: float = -20.0,
        target_stocks: List[str] = None,
        duration_days: int = 15,
        recovery_pct: float = 50.0,
        initial_portfolio_value: float = 100000.0
    ) -> Dict[str, Any]:
        """
        Applies hypothetical stress shock to in-memory copy of data and evaluates
        pre-shock vs post-shock portfolio valuation, loss %, risk delta, and stock-level impact.
        """
        stocks = list(weights.keys())
        w_vector = np.array([weights.get(s, 0.0) for s in stocks], dtype=float)
        if np.sum(w_vector) > 0:
            w_vector = w_vector / np.sum(w_vector)

        # Baseline metrics from historical returns
        ret_df = price_df[stocks].pct_change().dropna()
        baseline_cov = ret_df.cov().values * 252.0
        baseline_vol = float(np.sqrt(max(1e-8, w_vector.T @ baseline_cov @ w_vector))) * 100.0

        # Determine impacted stocks
        magnitude_decimal = magnitude_pct / 100.0
        stock_shocks = {}

        if scenario_type == "Single Stock Crash":
            crash_target = target_stocks[0] if target_stocks and len(target_stocks) > 0 else stocks[0]
            for s in stocks:
                stock_shocks[s] = magnitude_decimal if s == crash_target else 0.0

        elif scenario_type == "Sector Crash":
            # If targets given use them, otherwise use first 30% of stocks as a proxy sector
            sector_targets = set(target_stocks if target_stocks else stocks[:max(2, len(stocks)//2)])
            for s in stocks:
                stock_shocks[s] = magnitude_decimal if s in sector_targets else (magnitude_decimal * 0.2)

        elif scenario_type == "Market-Wide Crash":
            for s in stocks:
                # All stocks drop with some individual beta variation
                noise = np.random.uniform(0.85, 1.25)
                stock_shocks[s] = magnitude_decimal * noise

        elif scenario_type == "High Volatility":
            for s in stocks:
                stock_shocks[s] = -abs(magnitude_decimal) * np.random.uniform(0.5, 1.5)

        elif scenario_type == "Sudden Recovery":
            # Negative shock followed by recovery
            for s in stocks:
                net_impact = magnitude_decimal * (1.0 - (recovery_pct / 100.0))
                stock_shocks[s] = net_impact

        elif scenario_type == "Random Shock":
            for s in stocks:
                stock_shocks[s] = np.random.uniform(-0.35, 0.05)

        else:
            for s in stocks:
                stock_shocks[s] = magnitude_decimal

        # Compute stock-level dollar impacts and returns
        stock_impacts = []
        portfolio_shock_return = 0.0

        for i, s in enumerate(stocks):
            alloc_pct = float(w_vector[i])
            stock_initial_val = alloc_pct * initial_portfolio_value
            stock_ret = stock_shocks[s]
            stock_loss = stock_initial_val * stock_ret
            stock_final_val = stock_initial_val + stock_loss

            portfolio_shock_return += alloc_pct * stock_ret

            stock_impacts.append({
                "ticker": s,
                "weight_pct": round(alloc_pct * 100.0, 2),
                "initial_value": round(stock_initial_val, 2),
                "shock_return_pct": round(stock_ret * 100.0, 2),
                "pnl_impact": round(stock_loss, 2),
                "post_shock_value": round(stock_final_val, 2)
            })

        post_shock_portfolio_val = initial_portfolio_value * (1.0 + portfolio_shock_return)
        portfolio_dollar_loss = post_shock_portfolio_val - initial_portfolio_value
        portfolio_loss_pct = portfolio_shock_return * 100.0

        # Estimate stressed volatility increase
        stressed_vol = baseline_vol * (1.35 if portfolio_loss_pct < -10 else 1.1)

        # Generate simulated trajectory over duration_days + recovery
        trajectory = []
        cur_val = initial_portfolio_value
        step_drop = portfolio_shock_return / max(1, duration_days // 2)
        recovery_days = duration_days - (duration_days // 2)
        step_recovery = (portfolio_shock_return * (recovery_pct / 100.0)) / max(1, recovery_days)

        for day in range(duration_days + 1):
            if day == 0:
                cur_val = initial_portfolio_value
            elif day <= duration_days // 2:
                cur_val = cur_val * (1.0 + step_drop * np.random.uniform(0.8, 1.2))
            else:
                cur_val = cur_val * (1.0 + step_recovery * np.random.uniform(0.8, 1.2))
            
            trajectory.append({
                "day": day,
                "value": round(cur_val, 2),
                "drawdown": round(((cur_val - initial_portfolio_value) / initial_portfolio_value) * 100.0, 2)
            })

        return {
            "scenario": scenario_type,
            "magnitude_pct": magnitude_pct,
            "duration_days": duration_days,
            "recovery_pct": recovery_pct,
            "initial_value": round(initial_portfolio_value, 2),
            "post_shock_value": round(post_shock_portfolio_val, 2),
            "dollar_loss": round(portfolio_dollar_loss, 2),
            "loss_pct": round(portfolio_loss_pct, 2),
            "baseline_volatility": round(baseline_vol, 2),
            "stressed_volatility": round(stressed_vol, 2),
            "max_drawdown": round(min([t["drawdown"] for t in trajectory]), 2),
            "stock_impacts": stock_impacts,
            "trajectory": trajectory
        }
