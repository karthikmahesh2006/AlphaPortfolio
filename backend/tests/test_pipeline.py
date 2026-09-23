import unittest
import os
import pandas as pd
import numpy as np

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data_processing.loader import DatasetLoader
from data_processing.cleaner import DataCleaner
from trend_analysis.metrics import TrendMetrics
from trend_analysis.classifier import TrendClassifier
from correlation.network import CorrelationNetworkEngine
from portfolio.objectives import PortfolioObjectives
from portfolio.risk_attribution import RiskAttribution
from optimization.equal_weight import EqualWeightOptimizer
from optimization.risk_parity import RiskParityOptimizer
from optimization.markowitz_mvo import MarkowitzOptimizer
from optimization.hrp import HRPOptimizer
from optimization.genetic_algorithm import GeneticAlgorithmOptimizer
from simulation.market_shock import MarketShockSimulator
from rebalancing.dynamic_rebalancer import DynamicRebalancingEngine
from backtesting.engine import BacktestingEngine
from backtesting.historical_replay import HistoricalReplayEngine

class TestStockMarketDAA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Load sample long dataset
        sample_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../datasets/sp500_sample_long.csv"))
        cls.df_long = pd.read_csv(sample_path)
        cls.long_meta = DatasetLoader.inspect_and_load(cls.df_long)

        # Load sample wide dataset
        wide_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../datasets/tech_etf_wide.csv"))
        cls.df_wide = pd.read_csv(wide_path)
        cls.wide_meta = DatasetLoader.inspect_and_load(cls.df_wide)

        # Build active price DataFrame
        cls.price_df = pd.DataFrame.from_dict(cls.long_meta["price_matrix"], orient="index")
        cls.ret_df = cls.price_df.pct_change().dropna()
        cls.stocks = list(cls.price_df.columns)

    def test_01_loader_long_and_wide(self):
        self.assertTrue(self.long_meta["success"])
        self.assertEqual(self.long_meta["format"], "long")
        self.assertGreaterEqual(self.long_meta["num_stocks"], 5)

        self.assertTrue(self.wide_meta["success"])
        self.assertEqual(self.wide_meta["format"], "wide")
        self.assertGreaterEqual(self.wide_meta["num_stocks"], 5)

    def test_02_data_cleaner(self):
        audit = DataCleaner.audit_quality(self.price_df, self.df_long)
        self.assertIn("quality_score", audit)
        self.assertGreaterEqual(audit["quality_score"], 50.0)
        self.assertIn("quality_rating", audit)

    def test_03_trend_analysis_and_classifier(self):
        s = self.stocks[0]
        dates = list(self.price_df.index)
        metrics = TrendMetrics.calculate_stock_metrics(self.price_df[s], dates)
        self.assertIn("latest_price", metrics["summary"])
        self.assertIn("sharpe_ratio", metrics["summary"])

        recent = list(self.price_df[s].values[-40:])
        cls_res = TrendClassifier.classify(metrics["summary"], recent)
        self.assertIn(cls_res["classification"], ["Strong Uptrend", "Uptrend", "Neutral", "Downtrend", "Strong Downtrend"])
        self.assertGreaterEqual(len(cls_res["reasons"]), 1)

    def test_04_correlation_network(self):
        net = CorrelationNetworkEngine.build_network(self.price_df, threshold=0.4)
        self.assertIn("nodes", net)
        self.assertIn("edges", net)
        self.assertIn("communities", net)
        self.assertGreaterEqual(len(net["communities"]), 1)

    def test_05_equal_weight_optimizer(self):
        res = EqualWeightOptimizer.optimize(self.stocks, max_stocks=5)
        w = res["weights"]
        total_w = sum(w.values())
        self.assertAlmostEqual(total_w, 1.0, places=4)
        non_zero = [k for k, v in w.items() if v > 0]
        self.assertEqual(len(non_zero), 5)

    def test_06_risk_parity_optimizer(self):
        res = RiskParityOptimizer.optimize(self.ret_df, max_stocks=8)
        w = res["weights"]
        total_w = sum(w.values())
        self.assertAlmostEqual(total_w, 1.0, places=3)

    def test_07_markowitz_mvo_optimizer(self):
        res = MarkowitzOptimizer.optimize(self.ret_df, risk_profile="Moderate", max_stocks=8)
        w = res["weights"]
        total_w = sum(w.values())
        self.assertAlmostEqual(total_w, 1.0, places=2)

    def test_08_hrp_optimizer(self):
        res = HRPOptimizer.optimize(self.ret_df, max_stocks=8)
        w = res["weights"]
        total_w = sum(w.values())
        self.assertAlmostEqual(total_w, 1.0, places=2)

    def test_09_genetic_algorithm_optimizer(self):
        res = GeneticAlgorithmOptimizer.optimize(self.ret_df, max_stocks=8, pop_size=20, generations=10)
        w = res["weights"]
        total_w = sum(w.values())
        self.assertAlmostEqual(total_w, 1.0, places=2)

    def test_10_portfolio_objectives_and_attribution(self):
        w_vec = np.ones(len(self.stocks)) / len(self.stocks)
        metrics = PortfolioObjectives.calculate_metrics(w_vec, self.ret_df)
        self.assertIn("sharpe_ratio", metrics)
        self.assertIn("diversification_ratio", metrics)
        self.assertIn("concentration_hhi", metrics)

        attr = RiskAttribution.compute_attribution(self.stocks, w_vec, self.ret_df, 100000.0)
        self.assertEqual(len(attr), len(self.stocks))

    def test_11_market_shock_simulator(self):
        weights = {s: 1.0/len(self.stocks) for s in self.stocks}
        res = MarketShockSimulator.simulate_shock(
            self.price_df, weights, scenario_type="Market-Wide Crash", magnitude_pct=-25.0
        )
        self.assertLess(res["post_shock_value"], res["initial_value"])
        self.assertIn("trajectory", res)
        self.assertGreaterEqual(len(res["stock_impacts"]), len(self.stocks))

    def test_12_dynamic_rebalancer(self):
        weights = {s: 1.0/len(self.stocks) for s in self.stocks}
        reb = DynamicRebalancingEngine.evaluate_and_rebalance(self.price_df, weights, drift_threshold=0.03)
        self.assertIn("events", reb)
        self.assertIn("total_rebalance_events", reb)

    def test_13_backtest_and_replay(self):
        weights = {s: 1.0/len(self.stocks) for s in self.stocks}
        bt = BacktestingEngine.run_backtest(self.price_df, weights, initial_investment=100000.0)
        self.assertIn("final_value", bt)
        self.assertIn("equity_curve", bt)

        rep = HistoricalReplayEngine.generate_replay(self.price_df, weights, n_frames=10)
        self.assertIn("frames", rep)
        self.assertGreaterEqual(len(rep["frames"]), 5)

if __name__ == "__main__":
    unittest.main()
