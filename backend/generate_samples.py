import numpy as np
import pandas as pd
import os

def generate_datasets():
    os.makedirs("datasets", exist_ok=True)
    np.random.seed(42)

    # 1. Generate Long format dataset: 10 stocks, 2021-01-01 to 2023-12-31 (~754 trading days)
    dates = pd.date_range(start="2021-01-04", end="2023-12-29", freq="B")
    n_days = len(dates)

    stocks_config = {
        "AAPL":  {"s0": 130.0, "mu": 0.18, "sigma": 0.24, "sector": "Technology", "vol_base": 85000000},
        "MSFT":  {"s0": 220.0, "mu": 0.20, "sigma": 0.22, "sector": "Technology", "vol_base": 30000000},
        "GOOGL": {"s0": 85.0,  "mu": 0.16, "sigma": 0.25, "sector": "Technology", "vol_base": 28000000},
        "AMZN":  {"s0": 160.0, "mu": 0.12, "sigma": 0.30, "sector": "Consumer Discretionary", "vol_base": 55000000},
        "NVDA":  {"s0": 135.0, "mu": 0.40, "sigma": 0.45, "sector": "Technology", "vol_base": 45000000},
        "JNJ":   {"s0": 155.0, "mu": 0.06, "sigma": 0.14, "sector": "Healthcare", "vol_base": 8000000},
        "JPM":   {"s0": 125.0, "mu": 0.14, "sigma": 0.26, "sector": "Financials", "vol_base": 14000000},
        "XOM":   {"s0": 42.0,  "mu": 0.28, "sigma": 0.29, "sector": "Energy", "vol_base": 22000000},
        "PG":    {"s0": 138.0, "mu": 0.08, "sigma": 0.15, "sector": "Consumer Staples", "vol_base": 7500000},
        "TSLA":  {"s0": 240.0, "mu": 0.22, "sigma": 0.55, "sector": "Automotive/Tech", "vol_base": 90000000}
    }

    # Generate correlated random returns
    tickers = list(stocks_config.keys())
    n_assets = len(tickers)
    
    # Correlation base matrix
    corr = np.eye(n_assets)
    for i in range(n_assets):
        for j in range(i+1, n_assets):
            t1, t2 = tickers[i], tickers[j]
            if stocks_config[t1]["sector"] == stocks_config[t2]["sector"]:
                c = np.random.uniform(0.65, 0.82)
            elif "Tech" in stocks_config[t1]["sector"] and "Tech" in stocks_config[t2]["sector"]:
                c = np.random.uniform(0.55, 0.75)
            elif stocks_config[t1]["sector"] in ["Healthcare", "Consumer Staples"] or stocks_config[t2]["sector"] in ["Healthcare", "Consumer Staples"]:
                c = np.random.uniform(0.20, 0.40)
            else:
                c = np.random.uniform(0.30, 0.55)
            corr[i, j] = c
            corr[j, i] = c
            
    # Ensure positive semi-definite
    min_eig = np.min(np.real(np.linalg.eigvals(corr)))
    if min_eig < 1e-4:
        corr -= 10*min_eig * np.eye(n_assets)
        inv_sqrt = np.diag(1.0 / np.sqrt(np.diag(corr)))
        corr = inv_sqrt @ corr @ inv_sqrt

    L = np.linalg.cholesky(corr)
    dt = 1.0 / 252.0

    long_rows = []
    wide_prices = { "Date": [d.strftime("%Y-%m-%d") for d in dates] }

    all_prices = {}
    for i, ticker in enumerate(tickers):
        cfg = stocks_config[ticker]
        drift = (cfg["mu"] - 0.5 * cfg["sigma"]**2) * dt
        vol_step = cfg["sigma"] * np.sqrt(dt)
        all_prices[ticker] = [cfg["s0"]]

    uncorr_shocks = np.random.normal(0, 1, size=(n_days - 1, n_assets))
    corr_shocks = uncorr_shocks @ L.T

    for day_idx in range(n_days - 1):
        for i, ticker in enumerate(tickers):
            cfg = stocks_config[ticker]
            drift = (cfg["mu"] - 0.5 * cfg["sigma"]**2) * dt
            vol_step = cfg["sigma"] * np.sqrt(dt)
            ret = np.exp(drift + vol_step * corr_shocks[day_idx, i])
            prev_p = all_prices[ticker][-1]
            new_p = prev_p * ret
            all_prices[ticker].append(round(new_p, 2))

    for i, ticker in enumerate(tickers):
        cfg = stocks_config[ticker]
        prices = all_prices[ticker]
        wide_prices[ticker] = prices
        for d, p in zip(dates, prices):
            daily_noise = np.random.uniform(0.005, 0.02)
            open_p = round(p * (1.0 + np.random.uniform(-0.005, 0.005)), 2)
            high_p = round(max(p, open_p) * (1.0 + daily_noise), 2)
            low_p = round(min(p, open_p) * (1.0 - daily_noise), 2)
            close_p = p
            vol = int(cfg["vol_base"] * np.random.uniform(0.7, 1.4))
            long_rows.append({
                "Date": d.strftime("%Y-%m-%d"),
                "Ticker": ticker,
                "Open": open_p,
                "High": high_p,
                "Low": low_p,
                "Close": close_p,
                "Volume": vol,
                "Sector": cfg["sector"]
            })

    # Save Long format CSV
    df_long = pd.DataFrame(long_rows)
    df_long.to_csv("datasets/sp500_sample_long.csv", index=False)
    print("Saved datasets/sp500_sample_long.csv, rows:", len(df_long))

    # Save Wide format CSV (Date, AAPL, MSFT, GOOGL...)
    df_wide = pd.DataFrame(wide_prices)
    df_wide.to_csv("datasets/tech_etf_wide.csv", index=False)
    print("Saved datasets/tech_etf_wide.csv, rows:", len(df_wide))

    # 3. Global Assets Sample (Different column headers to test flexible mapping: Timestamp, Symbol, LastPrice, TradedVolume)
    global_assets = ["BRENT_CRUDE", "GOLD_OUNCE", "US_10Y_BOND", "GLOBAL_REIT", "BITCOIN_INDEX"]
    global_rows = []
    for d_idx, d in enumerate(dates):
        for sym in global_assets:
            base = 100.0 if sym != "BITCOIN_INDEX" else 30000.0
            p = round(base * (1.0 + 0.15 * np.sin(d_idx/30.0) + np.random.normal(0, 0.03)), 2)
            global_rows.append({
                "Timestamp": d.strftime("%Y-%m-%d"),
                "Symbol": sym,
                "LastPrice": p,
                "TradedVolume": int(np.random.uniform(50000, 500000))
            })
    df_global = pd.DataFrame(global_rows)
    df_global.to_csv("datasets/global_assets_sample.csv", index=False)
    print("Saved datasets/global_assets_sample.csv, rows:", len(df_global))

if __name__ == "__main__":
    generate_datasets()
