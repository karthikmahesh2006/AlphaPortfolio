import pandas as pd
import numpy as np
from typing import Dict, Any, List

class HistoricalReplayEngine:
    @classmethod
    def generate_replay(
        cls,
        price_df: pd.DataFrame,
        weights: Dict[str, float],
        initial_capital: float = 100000.0,
        rebal_frequency: str = "Quarterly",
        n_frames: int = 40
    ) -> Dict[str, Any]:
        """
        Generates chronological keyframe snapshots across the historical timeline
        for interactive replay animation in the frontend.
        """
        stocks = list(weights.keys())
        sub_df = price_df[stocks].dropna()
        dates = list(sub_df.index)
        n_days = len(dates)

        if n_days < 10:
            return {"error": "Insufficient history for replay."}

        target_w = {s: weights.get(s, 0.0) for s in stocks}
        s_target = sum(target_w.values())
        if s_target > 0:
            target_w = {s: target_w[s] / s_target for s in stocks}

        rebal_step = 63 if rebal_frequency == "Quarterly" else 21

        frames = []
        frame_interval = max(1, n_days // n_frames)

        # Simulation state
        cur_prices = sub_df.iloc[0]
        cur_val = initial_capital
        units = {s: (initial_capital * target_w[s]) / cur_prices[s] for s in stocks}

        for t in range(0, n_days):
            today_prices = sub_df.iloc[t]
            cur_holdings = {s: units[s] * today_prices[s] for s in stocks}
            cur_val = sum(cur_holdings.values())
            cur_weights = {s: cur_holdings[s] / cur_val for s in stocks}

            # Periodic rebalance check
            is_rebalance_day = (t > 0 and t % rebal_step == 0)
            if is_rebalance_day:
                # Realignment to target weights
                for s in stocks:
                    units[s] = (cur_val * target_w[s]) / today_prices[s]
                cur_weights = dict(target_w)

            # Record frame if at interval or on rebalance day or on last day
            if (t % frame_interval == 0) or is_rebalance_day or (t == n_days - 1):
                pnl_pct = ((cur_val - initial_capital) / initial_capital) * 100.0
                frames.append({
                    "frame_idx": len(frames),
                    "date": dates[t],
                    "portfolio_value": round(cur_val, 2),
                    "pnl_pct": round(pnl_pct, 2),
                    "is_rebalance": is_rebalance_day,
                    "weights": {s: round(cur_weights[s] * 100.0, 1) for s in stocks},
                    "holdings_value": {s: round(cur_holdings[s], 2) for s in stocks}
                })

        return {
            "total_frames": len(frames),
            "start_date": dates[0],
            "end_date": dates[-1],
            "initial_capital": initial_capital,
            "final_value": round(frames[-1]["portfolio_value"], 2),
            "frames": frames
        }
