import io
import csv
import json
from typing import Dict, Any

class ReportExporter:
    @staticmethod
    def generate_csv_summary(report_data: Dict[str, Any]) -> str:
        """
        Generates a multi-section CSV string with portfolio allocations,
        risk metrics, and backtesting performance.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow(["FINANCIAL PORTFOLIO ANALYSIS & OPTIMIZATION REPORT"])
        writer.writerow(["Generated via AlphaPortfolio Quantitative Engine"])
        writer.writerow([])

        # Section 1: Portfolio Allocation
        writer.writerow(["SECTION 1: PORTFOLIO ALLOCATION & RISK ATTRIBUTION"])
        writer.writerow([
            "Ticker", "Allocation (%)", "Investment ($)", "Expected Return (%)", 
            "Volatility (%)", "Risk Contribution (%)", "Return Contribution (%)"
        ])
        for row in report_data.get("attribution", []):
            writer.writerow([
                row.get("ticker"),
                row.get("allocation_pct"),
                row.get("investment_amount"),
                row.get("expected_return"),
                row.get("volatility"),
                row.get("risk_contribution_pct"),
                row.get("return_contribution_pct")
            ])
        writer.writerow([])

        # Section 2: Portfolio Key Metrics
        writer.writerow(["SECTION 2: PORTFOLIO RISK & RETURN METRICS"])
        writer.writerow(["Metric", "Value"])
        metrics = report_data.get("portfolio_metrics", {})
        writer.writerow(["Expected Annual Return (%)", metrics.get("expected_return")])
        writer.writerow(["Annualized Volatility (%)", metrics.get("volatility")])
        writer.writerow(["Sharpe Ratio", metrics.get("sharpe_ratio")])
        writer.writerow(["Sortino Ratio", metrics.get("sortino_ratio")])
        writer.writerow(["Diversification Ratio", metrics.get("diversification_ratio")])
        writer.writerow(["Concentration Index (HHI)", metrics.get("concentration_hhi")])
        writer.writerow(["Effective Number of Assets", metrics.get("effective_n_assets")])
        writer.writerow(["Max Historical Drawdown (%)", metrics.get("max_drawdown")])
        writer.writerow(["Daily VaR 95% (%)", metrics.get("var_95_daily")])
        writer.writerow([])

        # Section 3: Backtesting Summary
        writer.writerow(["SECTION 3: HISTORICAL BACKTEST PERFORMANCE"])
        bt = report_data.get("backtest_metrics", {})
        writer.writerow(["Initial Investment ($)", bt.get("initial_investment")])
        writer.writerow(["Final Portfolio Value ($)", bt.get("final_value")])
        writer.writerow(["Total Return (%)", bt.get("total_return_pct")])
        writer.writerow(["Annualized CAGR (%)", bt.get("cagr_pct")])
        writer.writerow(["Benchmark Total Return (%)", bt.get("benchmark_total_return_pct")])
        writer.writerow(["Rebalance Frequency", bt.get("rebalance_frequency")])
        writer.writerow(["Total Rebalances Executed", bt.get("rebalance_count")])
        writer.writerow(["Total Fees Paid ($)", bt.get("total_fees_paid")])
        writer.writerow([])

        return output.getvalue()
