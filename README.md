# AlphaPortfolio: Quantitative Portfolio Construction & Stock Trend Optimization

> An interactive financial analytics, graph relationship discovery, and quantitative portfolio optimization platform.  
> Works with any arbitrary Kaggle stock dataset, Yahoo Finance multi-level export, or single-stock time-series with rigorous mathematical algorithms, stress simulation, and dynamic rebalancing.

---

## 1. Executive Summary & Architecture Novelty

### How This Platform is Strictly Different from a Normal Stock Prediction / Portfolio Dashboard

Traditional financial dashboards typically fall into one of two categories: (1) simple price visualization charts with moving averages, or (2) "black-box" machine learning predictors that attempt to forecast tomorrow's price without mathematical accountability.

This platform was engineered from the ground up to solve core algorithmic optimization challenges:

| Feature Dimension | Traditional Stock Dashboard | Our Algorithmic Platform (AlphaPortfolio) |
|---|---|---|
| **Data Independence** | Hard-coded for AAPL, MSFT, TSLA | Fully dynamic parser supporting any Kaggle CSV/XLSX (long OHLCV, wide matrices, custom column mappings) |
| **Asset Relationships** | Simple correlation table / heatmap | **Graph-Theoretic Stock Network**: Nodes = Assets, Edges = Correlation strengths, Clauset-Newman-Moore community detection ($O(\|E\| d \log \|V\|)$) |
| **Optimization Method** | Manual weight sliders or equal weight | **5 Mathematical Algorithms**: Markowitz SLSQP QP ($O(N^3)$), Hierarchical Risk Parity ($O(N^2 \log N)$), Inverse Volatility ($O(N \log N)$), Multi-Objective GA ($O(G \cdot P \cdot N)$), Equal Weight ($O(N)$) |
| **Multi-Objective Trade-offs**| Only maximizes expected return | Evaluates Return, Covariance Variance, Choueifaty Diversification Ratio, and Herfindahl-Hirschman Concentration (HHI) |
| **Market Stress Testing** | None or static drawdown stat | **Interactive Shock Simulator**: 6 stress scenarios (Single asset crash, Sector crash, Market-wide recession, Volatility spikes, V-bounce, Black Swan) |
| **Execution & Replay** | Static backtest chart | **Chronological Historical Replay Engine**: Frame-by-frame animation player tracking real-time asset weight drifts and rebalance events |
| **Rebalancing Mechanism** | Calendar-only (e.g. annually) | **Adaptive Multi-Factor Trigger Engine**: Triggers on weight drift, rolling volatility jumps, trend breakdowns, or drawdown breaches with exact causal logs |
| **Decision Transparency** | Black-box weights | **Fact-Based Metric Attribution**: Explains the exact mathematical reasons why each asset received its capital allocation |

---

## 2. DAA Algorithmic Specifications & Complexity Analysis

This project explicitly implements and benchmarks 5 optimization algorithms and 2 graph-theoretic algorithms:

### Algorithmic Master Table

| # | Algorithm Name | Algorithmic Paradigm | Time Complexity | Space Complexity | Objective Function |
|---|---|---|---|---|---|
| 1 | **Equal Weight (1/N)** | Baseline / Uniform Allocation | $O(N)$ | $O(N)$ | $w_i = \frac{1}{N}$ |
| 2 | **Inverse Volatility Parity** | Greedy Risk-Budgeting | $O(N \cdot T + N \log N)$ | $O(N)$ | $w_i \propto \frac{1}{\sigma_i}$, clipped to $[w_{\min}, w_{\max}]$ |
| 3 | **Markowitz Mean-Variance (MVO)** | Convex Quadratic Programming (SLSQP) | $O(K \cdot N^3)$ | $O(N^2)$ | $\min_w \left\{ \frac{1}{2} w^T \Sigma w - \lambda \mu^T w \right\}$ s.t. $\sum w_i = 1$ |
| 4 | **Hierarchical Risk Parity (HRP)** | Divide-and-Conquer / Graph Tree Traversal | $O(N^2 \log N)$ | $O(N^2)$ | Quasi-diag tree reordering + Recursive bisection allocation |
| 5 | **Multi-Objective Genetic Algorithm (GA)** | Evolutionary Metaheuristic | $O(G \cdot P \cdot N)$ | $O(P \cdot N)$ | $\max \left\{ \text{Sharpe}(w) + 0.35 \text{DivRatio}(w) - \text{Penalty}(HHI) \right\}$ |
| 6 | **Correlation Graph Construction** | Graph Formulation & Thresholding | $O(N^2 \cdot T)$ | $O(N^2)$ | $G = (V, E)$, where edge exists if $\|\rho_{ij}\| \ge \theta$ |
| 7 | **Greedy Modularity Community Detection** | Agglomerative Graph Clustering | $O(\|E\| \cdot d \cdot \log \|V\|)$ | $O(\|V\| + \|E\|)$ | $\max Q = \sum_c \left[ \frac{e_c}{m} - \left(\frac{d_c}{2m}\right)^2 \right]$ |

---

### Detailed Algorithmic Breakdowns

#### 1. Markowitz Mean-Variance Quadratic Optimization
- **Problem**: Solve for the Pareto-optimal asset allocation vector $w^*$ lying on the Efficient Frontier for a specified risk appetite $\lambda$.
- **Algorithmic Idea**: Formulate as a constrained non-linear quadratic programming (QP) problem. Solved via Sequential Least Squares Programming (SLSQP).
- **Time Complexity**: $O(K \cdot N^3)$ where $K$ is the number of active-set QP iterations and $N$ is the number of assets.
- **Space Complexity**: $O(N^2)$ to store the $N \times N$ annualized covariance matrix $\Sigma$.
- **Pseudocode**:
```text
ALGORITHM MarkowitzSLSQP(mu[1..N], Sigma[N x N], lambda, w_min, w_max):
    Objective(w) = 0.5 * (w^T * Sigma * w) - lambda * (mu^T * w)
    Gradient(w) = Sigma * w - lambda * mu
    Constraint: Sum(w_i) - 1.0 = 0
    Bounds: w_min <= w[i] <= w_max for all i in {1..N}
    w_init = [1/N, 1/N, ..., 1/N]
    w* = SLSQP_Solver(Objective, Gradient, w_init, Bounds, Constraint)
    Return w*
```

#### 2. Hierarchical Risk Parity (HRP)
- **Problem**: Avoid the numerical instability and extreme weight sensitivity caused by inverting ill-conditioned or singular covariance matrices in classic Markowitz optimization.
- **Algorithmic Idea**: Marcos López de Prado's three-stage approach:
  1. **Tree Clustering**: Transform correlation into a distance metric $d_{ij} = \sqrt{0.5 \cdot (1 - \rho_{ij})}$ and build a hierarchical linkage tree.
  2. **Quasi-Diagonalization**: Traverse the tree leaves in-order to reorder the covariance matrix such that highly correlated assets are adjacent along the diagonal.
  3. **Recursive Bisection**: Divide-and-conquer risk allocation splitting clusters into left and right subsets and weighting them inversely to their sub-cluster variance.
- **Time Complexity**: $O(N^2 \log N)$ (Tree clustering $O(N^2)$, traversal $O(N)$, recursive bisection $O(N \log N)$).
- **Space Complexity**: $O(N^2)$ for condensed pairwise distance matrix.

#### 3. Multi-Objective Genetic Algorithm (GA)
- **Problem**: Optimize non-convex, discontinuous portfolio objectives with discrete constraints (cardinality limits, concentration boundaries) where gradient solvers get trapped in local extrema.
- **Algorithmic Idea**: Maintains a population of $P$ Dirichlet simplex weight vectors. Evolves candidates across $G$ generations using tournament selection, arithmetic blend crossover, stochastic Gaussian mutation, and elitism preservation.
- **Time Complexity**: $O(G \cdot P \cdot N)$ where $G=50$ generations, $P=60$ individuals, $N$ candidate assets.
- **Space Complexity**: $O(P \cdot N)$ for the chromosome population matrix.

#### 4. Clauset-Newman-Moore Greedy Modularity Community Detection
- **Problem**: Partition the stock correlation network $G=(V, E)$ into dense communities without requiring pre-labeled industry tags.
- **Algorithmic Idea**: Agglomerative clustering repeatedly joining communities that yield the largest positive step-change in graph modularity score $Q$.
- **Time Complexity**: $O(|E| \cdot d \cdot \log |V|)$ using max-heaps, where $d$ is maximum vertex degree.

---

## 3. Dataset Independence & Formats Supported

The application is completely independent of any specific ticker or asset set. It supports:

1. **Standard Long / Tidy Format (Single Table)**:
   - Contains columns for Date, Ticker/Symbol, Close/Price, and optional Open, High, Low, Volume.
   - Example: `datasets/sp500_sample_long.csv`.
2. **Wide Price Matrix Format**:
   - Contains a Date column, and each stock is represented as a separate price column (e.g. `Date, AAPL, MSFT, GOOGL, NVDA, AMZN`).
   - Example: `datasets/tech_etf_wide.csv`.
3. **Custom Headers & Column Mapping**:
   - Handles unusual column names (e.g. `Timestamp`, `Asset_Name`, `Last_Traded_Price`) via interactive schema mapping modal.
   - Example: `datasets/global_assets_sample.csv`.
4. **Real-World Kaggle Benchmarks (`Final dataset/`)**:
   - `Final dataset/SP500_Historical_Data.csv`: S&P 500 multi-stock daily time-series (~142MB).
   - `Final dataset/nifty500_stocks.csv`: NSE Nifty 500 equities dataset (~22MB).
5. **Data Quality Auditor**:
   - Automatically computes a **Data Quality Score (0 - 100%)** assessing missing value ratios, duplicate date flags, and statistical return outliers using 3-sigma and IQR metrics.

---

## 4. System Architecture

```
Stock Market DAA/
│
├── backend/
│   ├── app.py                     # FastAPI REST API controller
│   ├── generate_samples.py        # Synthetic & sample dataset generator
│   ├── data_processing/
│   │   ├── loader.py              # Dual-format CSV/XLSX parser & auto-detector
│   │   ├── cleaner.py             # Missing values, outliers, Data Quality Score
│   │   └── mapper.py              # Custom schema adapter
│   ├── trend_analysis/
│   │   ├── metrics.py             # Returns, SMA-20/50/200, EMA, Volatility, Drawdowns, RSI
│   │   └── classifier.py          # 5-stage algorithmic trend classifier (Strong Uptrend -> Strong Downtrend)
│   ├── correlation/
│   │   └── network.py             # NetworkX graph, centrality metrics, greedy modularity clustering
│   ├── portfolio/
│   │   ├── objectives.py          # Sharpe, Sortino, Diversification Ratio, HHI, VaR, CVaR
│   │   └── risk_attribution.py   # Marginal Risk Contribution & % Risk/Return attribution
│   ├── optimization/
│   │   ├── equal_weight.py        # Method 1: 1/N baseline allocation
│   │   ├── risk_parity.py         # Method 2: Inverse Volatility Parity
│   │   ├── markowitz_mvo.py       # Method 3: Markowitz Mean-Variance Quadratic Programming
│   │   ├── hrp.py                 # Method 4: Hierarchical Risk Parity (HRP)
│   │   └── genetic_algorithm.py   # Method 5: Multi-Objective Evolutionary Algorithm
│   ├── simulation/
│   │   └── market_shock.py        # 6 hypothetical crash & stress test scenarios
│   ├── rebalancing/
│   │   └── dynamic_rebalancer.py  # Adaptive drift, volatility jump, and drawdown triggers
│   ├── backtesting/
│   │   ├── engine.py              # Walk-forward backtesting with transaction costs
│   │   └── historical_replay.py   # Chronological keyframe generator
│   ├── explainability/
│   │   └── explainer.py           # Metric-grounded rationale for asset allocations
│   ├── reports/
│   │   └── exporter.py            # Summary CSV and print exporter
│   └── tests/
│       └── test_pipeline.py       # Automated unit test suite (13/13 passing)
│
├── frontend/                      # React 18 + Vite + Tailwind CSS + Lucide + Recharts
│   ├── package.json               # Dependencies & scripts
│   ├── vite.config.js             # Vite build configuration
│   └── src/
│       ├── components/            # Navbar, Sidebar, DAAInspectorModal
│       ├── views/                 # 14 specialized analytical views
│       └── services/api.js        # REST API connector
│
├── datasets/                      # Pre-packaged sample datasets (S&P 500, Tech ETF, Global)
├── Final dataset/                 # Real-world benchmark datasets (S&P 500 Historical, Nifty 500)
├── run.ps1 / start.bat            # One-click startup scripts (auto-detects Anaconda/Python 3)
├── .gitignore                     # Git ignore rules (backend, frontend, heavy datasets)
└── README.md
```

---

## 5. Quick Start Instructions

### Prerequisites
- **Python 3.10+** (Anaconda Python or standard CPython 3)
- **Node.js 18+** and npm

### 1-Click Launch (Windows)
Double-click `start.bat` or run in PowerShell (automatically detects Anaconda or system Python 3):
```powershell
.\run.ps1
```

### Manual Launch

#### 1. Backend:
```powershell
cd backend
python -m uvicorn app:app --reload --port 8000
# On Windows, if 'python' points to a legacy Python, use:
# py -3 -m uvicorn app:app --reload --port 8000
```
API Documentation will be available at: `http://127.0.0.1:8000/docs`.

#### 2. Frontend:
```powershell
cd frontend
npm run dev
```
Open your browser at: `http://localhost:5173`.

---

## 6. Automated Unit Tests Verification

The backend includes a comprehensive test suite verifying the end-to-end mathematical correctness of all components:
```powershell
python -m unittest discover -s backend/tests -p "test_*.py"
# Or if needed: py -3 -m unittest discover -s backend/tests -p "test_*.py"
```
**Results**:
- `test_01_loader_long_and_wide`: **PASS**
- `test_02_data_cleaner`: **PASS**
- `test_03_trend_analysis_and_classifier`: **PASS**
- `test_04_correlation_network`: **PASS**
- `test_05_equal_weight_optimizer`: **PASS**
- `test_06_risk_parity_optimizer`: **PASS**
- `test_07_markowitz_mvo_optimizer`: **PASS**
- `test_08_hrp_optimizer`: **PASS**
- `test_09_genetic_algorithm_optimizer`: **PASS**
- `test_10_portfolio_objectives_and_attribution`: **PASS**
- `test_11_market_shock_simulator`: **PASS**
- `test_12_dynamic_rebalancer`: **PASS**
- `test_13_backtest_and_replay`: **PASS**

*Status: Ran 13 tests in 1.25s. OK.*
