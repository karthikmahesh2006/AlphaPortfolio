import io
import re
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Optional

DATE_PATTERNS = [r"^date$", r"^timestamp$", r"^time$", r"^datetime$", r"^day$"]
TICKER_PATTERNS = [r"^ticker$", r"^symbol$", r"^stock$", r"^asset$", r"^name$", r"^code$"]
CLOSE_PATTERNS = [r"^close$", r"^adj[_\s]?close$", r"^last[_\s]?price$", r"^price$", r"^nav$"]
OPEN_PATTERNS = [r"^open$", r"^first[_\s]?price$"]
HIGH_PATTERNS = [r"^high$", r"^max[_\s]?price$"]
LOW_PATTERNS = [r"^low$", r"^min[_\s]?price$"]
VOLUME_PATTERNS = [r"^volume$", r"^vol$", r"^traded[_\s]?volume$", r"^shares[_\s]?traded$"]

def match_column(col_name: str, patterns: List[str]) -> bool:
    clean = str(col_name).strip().lower().replace("-", "_").replace(" ", "_")
    for pat in patterns:
        if re.search(pat, clean):
            return True
    return False

def detect_column_roles(columns: List[str]) -> Dict[str, Optional[str]]:
    roles = {
        "date": None,
        "ticker": None,
        "close": None,
        "open": None,
        "high": None,
        "low": None,
        "volume": None
    }
    for col in columns:
        col_str = str(col)
        if not roles["date"] and match_column(col_str, DATE_PATTERNS):
            roles["date"] = col_str
        elif not roles["ticker"] and match_column(col_str, TICKER_PATTERNS):
            roles["ticker"] = col_str
        elif not roles["close"] and match_column(col_str, CLOSE_PATTERNS):
            roles["close"] = col_str
        elif not roles["open"] and match_column(col_str, OPEN_PATTERNS):
            roles["open"] = col_str
        elif not roles["high"] and match_column(col_str, HIGH_PATTERNS):
            roles["high"] = col_str
        elif not roles["low"] and match_column(col_str, LOW_PATTERNS):
            roles["low"] = col_str
        elif not roles["volume"] and match_column(col_str, VOLUME_PATTERNS):
            roles["volume"] = col_str
    return roles

class DatasetLoader:
    @staticmethod
    def read_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            return pd.read_excel(io.BytesIO(file_bytes))
        
        # Check for yfinance multi-row header structure:
        # e.g., Line 1: Price,Close,High... Line 2: Ticker,A,A,A... Line 3: Date,,,,
        head_sample = file_bytes[:4096].decode("utf-8", errors="ignore")
        lines = [l.strip() for l in head_sample.split("\n") if l.strip()]
        
        if len(lines) >= 2 and ("Ticker" in lines[1] or "ticker" in lines[1].lower()) and ("Price" in lines[0] or "Close" in lines[0]):
            try:
                df_raw = pd.read_csv(io.BytesIO(file_bytes), header=[0, 1])
                date_col = df_raw.columns[0]
                dates = pd.to_datetime(df_raw[date_col].iloc[1:], errors="coerce")
                valid_mask = dates.notna()
                valid_dates = dates[valid_mask].dt.strftime("%Y-%m-%d")
                
                tickers = list(dict.fromkeys([c[1] for c in df_raw.columns if str(c[1]).strip().lower() != "ticker"]))
                if tickers:
                    records = []
                    for t in tickers:
                        sub = pd.DataFrame({"Date": valid_dates, "Ticker": str(t).upper().strip()})
                        for col_name in ["Close", "Open", "High", "Low", "Volume"]:
                            target_col = None
                            for c in df_raw.columns:
                                if str(c[0]).strip().lower() == col_name.lower() and str(c[1]).strip() == str(t).strip():
                                    target_col = c
                                    break
                            if target_col is not None:
                                sub[col_name] = pd.to_numeric(df_raw[target_col].iloc[1:][valid_mask], errors="coerce")
                            else:
                                if col_name in ["Open", "High", "Low"]:
                                    sub[col_name] = sub.get("Close", 0.0)
                                elif col_name == "Volume":
                                    sub[col_name] = 1000000
                        records.append(sub)
                    flattened = pd.concat(records, ignore_index=True)
                    if not flattened.empty:
                        return flattened
            except Exception as e:
                print(f"yfinance multi-row parser fallback: {e}")

        # Standard CSV read with utf-8 or latin1 fallback
        try:
            return pd.read_csv(io.BytesIO(file_bytes))
        except UnicodeDecodeError:
            return pd.read_csv(io.BytesIO(file_bytes), encoding="latin1")

    @classmethod
    def inspect_and_load(
        cls, 
        df: pd.DataFrame, 
        custom_mapping: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Inspects dataframe, detects layout (long vs wide), validates and standardizes data.
        Returns standardized price matrix (index=Date, columns=Stocks) and metadata.
        """
        raw_columns = list(df.columns)
        detected_roles = detect_column_roles(raw_columns)
        
        # Apply custom mappings if supplied
        if custom_mapping:
            for role, col in custom_mapping.items():
                if col in raw_columns:
                    detected_roles[role] = col

        date_col = detected_roles["date"]
        ticker_col = detected_roles["ticker"]
        close_col = detected_roles["close"]

        # Check if wide format: Date column exists, and majority of other columns are numeric
        is_wide_format = False
        if date_col and not ticker_col:
            other_cols = [c for c in raw_columns if c != date_col]
            numeric_cols = [c for c in other_cols if pd.api.types.is_numeric_dtype(df[c])]
            if len(numeric_cols) >= 1 and len(numeric_cols) >= len(other_cols) * 0.6:
                is_wide_format = True

        if is_wide_format:
            return cls._process_wide_format(df, date_col, detected_roles)
        elif date_col and ticker_col and close_col:
            return cls._process_long_format(df, date_col, ticker_col, close_col, detected_roles)
        elif date_col and close_col and not ticker_col:
            # Single stock time-series without explicit ticker column: Assign Ticker = 'ASSET'
            df_mod = df.copy()
            df_mod["Ticker"] = "ASSET"
            detected_roles["ticker"] = "Ticker"
            return cls._process_long_format(df_mod, date_col, "Ticker", close_col, detected_roles)
        else:
            return {
                "success": False,
                "needs_mapping": True,
                "detected_roles": detected_roles,
                "available_columns": raw_columns,
                "sample_rows": df.head(5).to_dict(orient="records"),
                "error": "Could not determine all required columns (Date, Ticker, Close). Please verify or map manually."
            }

    @classmethod
    def _process_wide_format(cls, df: pd.DataFrame, date_col: str, detected_roles: dict) -> Dict[str, Any]:
        df = df.copy()
        try:
            df["Date_Parsed"] = pd.to_datetime(df[date_col], errors="coerce")
        except Exception:
            return {"success": False, "error": f"Failed to parse date column '{date_col}'."}
            
        df = df.dropna(subset=["Date_Parsed"]).sort_values("Date_Parsed")
        df["Date_Str"] = df["Date_Parsed"].dt.strftime("%Y-%m-%d")
        
        stock_cols = [c for c in df.columns if c not in [date_col, "Date_Parsed", "Date_Str"] and pd.api.types.is_numeric_dtype(df[c])]
        
        if len(stock_cols) < 1:
            return {"success": False, "error": "Dataset must have at least 1 price column."}

        price_matrix = df.set_index("Date_Str")[stock_cols].apply(pd.to_numeric, errors="coerce")
        price_matrix = price_matrix.ffill().bfill()
        
        melted = df.melt(id_vars=["Date_Str"], value_vars=stock_cols, var_name="Ticker", value_name="Close")
        melted["Open"] = melted["Close"]
        melted["High"] = melted["Close"]
        melted["Low"] = melted["Close"]
        melted["Volume"] = 1000000

        is_single_stock = (len(stock_cols) == 1)

        return {
            "success": True,
            "format": "wide",
            "detected_roles": detected_roles,
            "stocks": stock_cols,
            "num_stocks": len(stock_cols),
            "is_single_stock": is_single_stock,
            "num_rows": len(df),
            "date_range": [price_matrix.index.min(), price_matrix.index.max()],
            "price_matrix": price_matrix.to_dict(orient="index"),
            "dates": list(price_matrix.index),
            "available_columns": list(df.columns),
            "sample_records": melted.head(100).to_dict(orient="records"),
            "has_ohlcv": False
        }

    @classmethod
    def _process_long_format(
        cls, 
        df: pd.DataFrame, 
        date_col: str, 
        ticker_col: str, 
        close_col: str, 
        detected_roles: dict
    ) -> Dict[str, Any]:
        df = df.copy()
        df["Date_Parsed"] = pd.to_datetime(df[date_col], errors="coerce")
        df = df.dropna(subset=["Date_Parsed", ticker_col, close_col])
        df = df.sort_values("Date_Parsed")
        df["Date_Str"] = df["Date_Parsed"].dt.strftime("%Y-%m-%d")
        df[ticker_col] = df[ticker_col].astype(str).str.strip().str.upper()
        df[close_col] = pd.to_numeric(df[close_col], errors="coerce")
        df = df.dropna(subset=[close_col])

        stocks = sorted(list(df[ticker_col].unique()))
        if len(stocks) < 1:
            return {"success": False, "error": "Dataset must have at least 1 valid stock ticker."}

        df = df.drop_duplicates(subset=["Date_Str", ticker_col], keep="last")
        price_pivot = df.pivot(index="Date_Str", columns=ticker_col, values=close_col)
        price_pivot = price_pivot.ffill().bfill()

        has_ohlcv = all(detected_roles.get(k) is not None for k in ["open", "high", "low", "volume"])
        is_single_stock = (len(stocks) == 1)

        return {
            "success": True,
            "format": "long",
            "detected_roles": detected_roles,
            "stocks": stocks,
            "num_stocks": len(stocks),
            "is_single_stock": is_single_stock,
            "num_rows": len(df),
            "date_range": [price_pivot.index.min(), price_pivot.index.max()],
            "price_matrix": price_pivot.to_dict(orient="index"),
            "dates": list(price_pivot.index),
            "available_columns": [c for c in df.columns if c not in ["Date_Parsed", "Date_Str"]],
            "sample_records": df.head(100).to_dict(orient="records"),
            "has_ohlcv": has_ohlcv,
            "date_col": date_col,
            "ticker_col": ticker_col,
            "close_col": close_col,
            "open_col": detected_roles.get("open"),
            "high_col": detected_roles.get("high"),
            "low_col": detected_roles.get("low"),
            "volume_col": detected_roles.get("volume")
        }
