import pandas as pd
import numpy as np
from typing import Dict, Any, List

class BacktestingEngine:
    @classmethod
    def run_backtest(
        cls,
        price_df: pd.DataFrame,
        weights: Dict[str, float],
        start_date: str = None,
        end_date: str = None,
        initial_investment: float = 100000.0,
        rebalance_frequency: str = "Monthly", # "Monthly", "Quarterly", "None"
        transaction_cost_bps: float = 10.0 # 10 bps = 0.10%
    ) -> Dict[str, Any]:
        """
        Executes a walk-forward realistic backtest modeling equity curves,
        drawdowns, transaction fees, and benchmarks against Equal Weight.
        """
        stocks = list(weights.keys())
        sub_df = price_df[stocks].copy()
        
        # Filter date range if specified
        if start_date:
            sub_df = sub_df[sub_df.index >= start_date]
        if end_date:
            sub_df = sub_df[sub_df.index <= end_date]

        sub_df = sub_df.dropna()
        if len(sub_df) < 10:
            return {"error": "Insufficient historical data for selected date range."}

        dates = list(sub_df.index)
        n_days = len(dates)

        target_w = np.array([weights.get(s, 0.0) for s in stocks], dtype=float)
        if np.sum(target_w) > 0:
            target_w = target_w / np.sum(target_w)
        else:
            target_w = np.ones(len(stocks)) / len(stocks)

        # Equal weight benchmark
        ew_w = np.ones(len(stocks)) / len(stocks)

        # Rebalance period in trading days
        rebal_days = 21 if rebalance_frequency == "Monthly" else (63 if rebalance_frequency == "Quarterly" else 999999)

        # Simulation state
        port_equity = [initial_investment]
        benchmark_equity = [initial_investment]
        drawdowns = [0.0]

        # Initial allocation
        cur_port_val = initial_investment
        cur_bm_val = initial_investment
        fee_rate = (transaction_cost_bps / 10000.0)
        total_fees = 0.0
        rebalance_count = 0

        first_prices = sub_df.iloc[0].values
        # Initial units
        port_units = (cur_port_val * (1.0 - fee_rate) * target_w) / first_prices
        bm_units = (cur_bm_val * (1.0 - fee_rate) * ew_w) / first_prices
        total_fees += initial_investment * fee_rate

        equity_curve = [{
            "date": dates[0],
            "portfolio": round(cur_port_val, 2),
            "benchmark": round(cur_bm_val, 2),
            "drawdown": 0.0
        }]

        peak_equity = initial_investment

        for t in range(1, n_days):
            prices_t = sub_df.iloc[t].values
            
            # Compute current portfolio valuation
            cur_port_val = float(np.sum(port_units * prices_t))
            cur_bm_val = float(np.sum(bm_units * prices_t))

            # Peak and Drawdown
            if cur_port_val > peak_equity:
                peak_equity = cur_port_val
            dd = (cur_port_val - peak_equity) / max(1.0, peak_equity)

            # Check Rebalancing
            if (t % rebal_days == 0) and t < n_days - 1:
                rebalance_count += 1
                # Calculate turnover
                cur_weights = (port_units * prices_t) / cur_port_val
                turnover = np.sum(np.abs(cur_weights - target_w)) / 2.0
                fee = cur_port_val * turnover * fee_rate
                total_fees += fee
                cur_port_val -= fee
                # Reset units
                port_units = (cur_port_val * target_w) / prices_t

            equity_curve.append({
                "date": dates[t],
                "portfolio": round(cur_port_val, 2),
                "benchmark": round(cur_bm_val, 2),
                "drawdown": round(dd * 100.0, 2)
            })

        # Calculate final summary statistics
        final_val = float(equity_curve[-1]["portfolio"])
        final_bm_val = float(equity_curve[-1]["benchmark"])
        total_ret = (final_val - initial_investment) / initial_investment
        bm_total_ret = (final_bm_val - initial_investment) / initial_investment

        n_years = max(n_days / 252.0, 0.1)
        cagr = (final_val / initial_investment) ** (1.0 / n_years) - 1.0
        bm_cagr = (final_bm_val / initial_investment) ** (1.0 / n_years) - 1.0

        daily_port_rets = pd.Series([e["portfolio"] for e in equity_curve]).pct_change().dropna()
        daily_bm_rets = pd.Series([e["benchmark"] for e in equity_curve]).pct_change().dropna()

        ann_vol = float(daily_port_rets.std() * np.sqrt(252.0))
        bm_ann_vol = float(daily_bm_rets.std() * np.sqrt(252.0))

        sharpe = float((cagr - 0.03) / max(ann_vol, 1e-4))
        bm_sharpe = float((bm_cagr - 0.03) / max(bm_ann_vol, 1e-4))

        min_dd = min([e["drawdown"] for e in equity_curve])

        # Sample for frontend charting (downsample if > 250 points)
        step = max(1, len(equity_curve) // 250)
        sampled_curve = [equity_curve[i] for i in range(0, len(equity_curve), step)]
        if sampled_curve[-1]["date"] != equity_curve[-1]["date"]:
            sampled_curve.append(equity_curve[-1])

        return {
            "initial_investment": round(initial_investment, 2),
            "final_value": round(final_val, 2),
            "benchmark_final_value": round(final_bm_val, 2),
            "total_return_pct": round(total_ret * 100.0, 2),
            "benchmark_total_return_pct": round(bm_total_ret * 100.0, 2),
            "cagr_pct": round(cagr * 100.0, 2),
            "benchmark_cagr_pct": round(bm_cagr * 100.0, 2),
            "annualized_volatility_pct": round(ann_vol * 100.0, 2),
            "benchmark_volatility_pct": round(bm_ann_vol * 100.0, 2),
            "sharpe_ratio": round(sharpe, 2),
            "benchmark_sharpe": round(bm_sharpe, 2),
            "max_drawdown_pct": round(min_dd, 2),
            "rebalance_count": rebalance_count,
            "total_fees_paid": round(total_fees, 2),
            "rebalance_frequency": rebalance_frequency,
            "equity_curve": sampled_curve
        }
