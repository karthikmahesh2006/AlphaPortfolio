import pandas as pd
import numpy as np
from typing import Dict, Any, List

class DataCleaner:
    @staticmethod
    def audit_quality(price_df: pd.DataFrame, raw_df: pd.DataFrame = None) -> Dict[str, Any]:
        """
        Evaluates data hygiene, missingness, outliers, and computes an overall Data Quality Score.
        price_df: indexed by Date, columns are tickers.
        """
        n_rows, n_stocks = price_df.shape
        total_cells = n_rows * n_stocks

        # Missing values analysis
        raw_nulls = price_df.isnull().sum().to_dict()
        total_nulls = sum(raw_nulls.values())
        missing_pct = (total_nulls / total_cells * 100.0) if total_cells > 0 else 0.0

        # Outlier detection on daily returns (IQR + Z-score)
        returns = price_df.pct_change().dropna()
        outliers_by_stock = {}
        total_outliers = 0

        for col in price_df.columns:
            ret = returns[col].dropna()
            if len(ret) < 10:
                outliers_by_stock[col] = 0
                continue
            
            # IQR method
            q25, q75 = np.percentile(ret, [25, 75])
            iqr = q75 - q25
            lower_bound = q25 - 3.0 * iqr  # 3x IQR for extreme outliers
            upper_bound = q75 + 3.0 * iqr
            outlier_mask = (ret < lower_bound) | (ret > upper_bound)
            count = int(outlier_mask.sum())
            outliers_by_stock[col] = count
            total_outliers += count

        # Check duplicates
        duplicate_dates = 0
        if not price_df.index.is_unique:
            duplicate_dates = int(price_df.index.duplicated().sum())

        # Quality scoring (0-100)
        # Completeness: 40 points max
        score_completeness = max(0.0, 40.0 - (missing_pct * 4.0))
        # Outlier penalty: 30 points max
        outlier_ratio = total_outliers / max(1, (len(returns) * n_stocks))
        score_outliers = max(0.0, 30.0 - (outlier_ratio * 300.0))
        # Continuity/Duplicates: 30 points max
        score_continuity = 30.0 if duplicate_dates == 0 else max(0.0, 30.0 - duplicate_dates * 5.0)

        total_score = round(score_completeness + score_outliers + score_continuity, 1)

        rating = "Excellent" if total_score >= 90 else ("Good" if total_score >= 75 else ("Fair" if total_score >= 60 else "Poor"))

        return {
            "quality_score": total_score,
            "quality_rating": rating,
            "total_rows": n_rows,
            "total_stocks": n_stocks,
            "missing_cells": total_nulls,
            "missing_percentage": round(missing_pct, 2),
            "missing_by_stock": raw_nulls,
            "total_outliers": total_outliers,
            "outliers_by_stock": outliers_by_stock,
            "duplicate_dates": duplicate_dates,
            "scoring_breakdown": {
                "completeness": round(score_completeness, 1),
                "outlier_hygiene": round(score_outliers, 1),
                "continuity": round(score_continuity, 1)
            }
        }
