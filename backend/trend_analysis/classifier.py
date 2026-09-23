from typing import Dict, Any, List
import numpy as np

class TrendClassifier:
    @staticmethod
    def classify(summary: Dict[str, Any], recent_prices: List[float]) -> Dict[str, Any]:
        """
        Classifies stock trend into:
        Strong Uptrend, Uptrend, Neutral, Downtrend, Strong Downtrend.
        Uses rule-based multi-factor scoring (Price vs SMAs, RSI, 60-day return slope).
        """
        price = float(summary.get("latest_price", 0))
        sma50 = float(summary.get("latest_sma50", price))
        sma200 = float(summary.get("latest_sma200", price))
        rsi = float(summary.get("latest_rsi", 50))
        
        score = 0.0
        reasons = []

        # 1. Price vs 50-day SMA alignment
        if sma50 > 0:
            price_sma_ratio = (price - sma50) / sma50
            if price_sma_ratio > 0.02:
                score += 2.0
                reasons.append(f"Price (${price:,.2f}) is solidly above its 50-day SMA (${sma50:,.2f}) by +{price_sma_ratio*100:.1f}%")
            elif price_sma_ratio >= 0:
                score += 1.0
                reasons.append(f"Price (${price:,.2f}) is trading just above its 50-day SMA (${sma50:,.2f})")
            elif price_sma_ratio < -0.02:
                score -= 2.0
                reasons.append(f"Price (${price:,.2f}) is trading below its 50-day SMA (${sma50:,.2f}) by {price_sma_ratio*100:.1f}%")
            else:
                score -= 1.0
                reasons.append(f"Price (${price:,.2f}) is trading slightly below its 50-day SMA (${sma50:,.2f})")

        # 2. Structural SMA Alignment (Golden Cross vs Death Cross)
        if sma50 >= sma200:
            score += 1.5
            reasons.append(f"Golden Cross regime: 50-day SMA (${sma50:,.2f}) is above 200-day SMA (${sma200:,.2f})")
        else:
            score -= 1.5
            reasons.append(f"Death Cross regime: 50-day SMA (${sma50:,.2f}) is below 200-day SMA (${sma200:,.2f})")

        # 3. 14-day RSI Momentum
        if rsi >= 65:
            score += 1.5
            reasons.append(f"Strong bullish momentum: 14-day RSI at {rsi:.1f} (Overbought/Expansion)")
        elif rsi <= 35:
            score -= 1.5
            reasons.append(f"Oversold / bearish pressure: 14-day RSI at {rsi:.1f} (Contraction)")
        elif rsi > 52:
            score += 0.5
            reasons.append(f"Moderately positive momentum: 14-day RSI at {rsi:.1f}")
        elif rsi < 48:
            score -= 0.5
            reasons.append(f"Moderately negative momentum: 14-day RSI at {rsi:.1f}")
        else:
            reasons.append(f"Balanced RSI momentum at {rsi:.1f} (Neutral 50 level)")

        # 4. Recent linear price trajectory slope
        if len(recent_prices) >= 10:
            x = np.arange(len(recent_prices))
            slope, _ = np.polyfit(x, recent_prices, 1)
            pct_slope = (slope / max(recent_prices[0], 1e-4)) * 100.0
            if pct_slope > 0.08:
                score += 1.5
                reasons.append(f"Upward linear price trajectory (+{pct_slope:.2f}% per period)")
            elif pct_slope < -0.08:
                score -= 1.5
                reasons.append(f"Downward linear price trajectory ({pct_slope:.2f}% per period)")
            else:
                reasons.append(f"Sideways / consolidating trajectory ({pct_slope:+.2f}% per period)")

        # Map aggregate score [-6.5, +6.5] to classification
        if score >= 3.5:
            category = "Strong Uptrend"
            color = "emerald"
            signal = "BUY / OVERWEIGHT"
            description = "Price is well above key moving averages, RSI is strong, trajectory is positive."
        elif score >= 1.0:
            category = "Uptrend"
            color = "teal"
            signal = "MOMENTUM ACCUMULATE"
            description = "General positive momentum with favorable short-to-intermediate trend alignment."
        elif score > -1.0:
            category = "Neutral"
            color = "amber"
            signal = "HOLD / CONSOLIDATION"
            description = "Consolidation or sideways action with mixed technical indicators."
        elif score >= -3.5:
            category = "Downtrend"
            color = "orange"
            signal = "REDUCE / CAUTION"
            description = "Price below moving averages, negative slope, deteriorating momentum."
        else:
            category = "Strong Downtrend"
            color = "rose"
            signal = "AVOID / HEDGE"
            description = "Price in severe contraction, Death Cross, negative trajectory."

        return {
            "classification": category,
            "trend_score": round(score, 1),
            "signal": signal,
            "badge_color": color,
            "description": description,
            "reasons": reasons
        }
