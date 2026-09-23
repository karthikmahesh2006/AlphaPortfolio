import numpy as np
import pandas as pd
from typing import Dict, Any, List

class TrendMetrics:
    @staticmethod
    def calculate_stock_metrics(price_series: pd.Series, dates: List[str]) -> Dict[str, Any]:
        """
        Computes financial and technical indicators for a single stock price series.
        """
        prices = pd.Series(price_series.values, index=pd.to_datetime(dates))
        
        # 1. Daily simple returns and cumulative returns
        daily_returns = prices.pct_change().fillna(0.0)
        cumulative_returns = (1.0 + daily_returns).cumprod() - 1.0

        # 2. Moving Averages
        sma_20 = prices.rolling(window=20, min_periods=1).mean()
        sma_50 = prices.rolling(window=50, min_periods=1).mean()
        sma_200 = prices.rolling(window=200, min_periods=1).mean()
        ema_12 = prices.ewm(span=12, adjust=False).mean()
        ema_26 = prices.ewm(span=26, adjust=False).mean()

        # 3. Rolling Volatility (21 trading days, annualized)
        rolling_vol = daily_returns.rolling(window=21, min_periods=5).std() * np.sqrt(252)
        rolling_vol = rolling_vol.bfill().fillna(0.0)

        # 4. Maximum Drawdown & Drawdown Series
        peak = prices.cummax()
        drawdown_series = (prices - peak) / peak
        max_drawdown = float(drawdown_series.min())

        # 5. Overall statistics
        total_return = float(cumulative_returns.iloc[-1])
        n_years = max(len(prices) / 252.0, 0.1)
        annualized_return = float((1.0 + total_return) ** (1.0 / n_years) - 1.0)
        annualized_vol = float(daily_returns.std() * np.sqrt(252))
        sharpe_ratio = float((annualized_return - 0.03) / max(annualized_vol, 1e-4))

        # 6. 14-day RSI calculation
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14, min_periods=1).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
        rs = gain / (loss + 1e-9)
        rsi_14 = 100 - (100 / (1 + rs))

        # Downsample timeseries if very long for fast client chart rendering (up to 300 points)
        step = max(1, len(dates) // 300)
        
        timeseries = []
        for i in range(0, len(dates), step):
            d = dates[i]
            timeseries.append({
                "date": d,
                "price": round(float(prices.iloc[i]), 2),
                "daily_return": round(float(daily_returns.iloc[i]) * 100.0, 2),
                "cumulative_return": round(float(cumulative_returns.iloc[i]) * 100.0, 2),
                "sma_20": round(float(sma_20.iloc[i]), 2),
                "sma_50": round(float(sma_50.iloc[i]), 2),
                "sma_200": round(float(sma_200.iloc[i]), 2),
                "rolling_vol": round(float(rolling_vol.iloc[i]) * 100.0, 2),
                "drawdown": round(float(drawdown_series.iloc[i]) * 100.0, 2),
                "rsi": round(float(rsi_14.iloc[i]), 2)
            })

        latest_price = float(prices.iloc[-1])
        latest_sma20 = float(sma_20.iloc[-1])
        latest_sma50 = float(sma_50.iloc[-1])
        latest_sma200 = float(sma_200.iloc[-1])
        latest_rsi = float(rsi_14.iloc[-1])

        return {
            "summary": {
                "latest_price": round(latest_price, 2),
                "total_return": round(total_return * 100.0, 2),
                "annualized_return": round(annualized_return * 100.0, 2),
                "annualized_volatility": round(annualized_vol * 100.0, 2),
                "max_drawdown": round(max_drawdown * 100.0, 2),
                "sharpe_ratio": round(sharpe_ratio, 2),
                "latest_rsi": round(latest_rsi, 1),
                "latest_sma50": round(latest_sma50, 2),
                "latest_sma200": round(latest_sma200, 2)
            },
            "timeseries": timeseries
        }
