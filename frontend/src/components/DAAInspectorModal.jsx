import React, { useState } from 'react';
import { X, GraduationCap, Code2, Clock, Cpu, CheckCircle2, ChevronRight } from 'lucide-react';

export default function DAAInspectorModal({ isOpen, onClose, selectedAlgoId = 'hrp' }) {
  if (!isOpen) return null;

  const algorithms = [
    {
      id: 'equal_weight',
      name: 'Equal Weight Portfolio (1/N)',
      category: 'Baseline / Uniform Allocation',
      time: 'O(N)',
      space: 'O(N)',
      problem: 'Uniformly distribute capital across N candidate assets without parameter estimation error.',
      idea: 'Assign each asset w_i = 1/N. Eliminates parameter estimation risk and acts as the universal benchmark (DeMiguel et al. 2009).',
      objective: 'w_i = 1 / N, for all i in {1, ..., N}',
      pseudocode: `ALGORITHM EqualWeightPortfolio(Assets[1..N], MaxStocks):
    If N > MaxStocks:
        Rank assets by Momentum or Sharpe descending
        Assets = Assets[1..MaxStocks]
        N = MaxStocks
    For i = 1 to N:
        w[i] = 1.0 / N
    Return w`,
      why: 'Serves as the theoretical baseline against which any algorithmic complexity must justify itself out-of-sample.'
    },
    {
      id: 'risk_parity',
      name: 'Risk-Based / Inverse Volatility',
      category: 'Greedy Risk Budgeting',
      time: 'O(N * T + N log N)',
      space: 'O(N)',
      problem: 'Equalize individual risk contributions so volatile speculative assets do not dominate portfolio variance.',
      idea: 'Calculate annualized standard deviation sigma_i for each asset. Set weight inversely proportional to volatility (w_i proportional to 1 / sigma_i) with iterative constraint clipping.',
      objective: 'w_i = (1 / sigma_i) / Sum_j(1 / sigma_j), subject to w_min <= w_i <= w_max',
      pseudocode: `ALGORITHM InverseVolatility(Returns[1..T, 1..N], min_w, max_w):
    For i = 1 to N:
        sigma[i] = StdDev(Returns[:, i]) * sqrt(252)
        inv_vol[i] = 1.0 / max(sigma[i], 1e-4)
    w = inv_vol / Sum(inv_vol)
    Repeat until convergence:
        w = Clip(w, min_w, max_w)
        w = w / Sum(w)
    Return w`,
      why: 'Protects investors during market turbulence by automatically dialing down exposure to high-beta assets.'
    },
    {
      id: 'markowitz_mvo',
      name: 'Markowitz Mean-Variance Optimization (MVO)',
      category: 'Convex Quadratic Programming (QP / SLSQP)',
      time: 'O(N^3) per SQP iteration',
      space: 'O(N^2) for covariance matrix',
      problem: 'Maximize expected portfolio return for a given variance tolerance on the Efficient Frontier.',
      idea: 'Formulate a constrained quadratic program balancing expected returns against asset covariance. Solved via Sequential Least Squares Programming (SLSQP).',
      objective: 'min_w { 0.5 * w^T * Sigma * w - lambda * mu^T * w } s.t. Sum(w_i) = 1, w_min <= w_i <= w_max',
      pseudocode: `ALGORITHM MarkowitzSLSQP(mu[1..N], Sigma[N x N], lambda, bounds):
    Objective(w) = 0.5 * (w^T * Sigma * w) - lambda * (mu^T * w)
    Gradient(w) = Sigma * w - lambda * mu
    Constraint: Sum(w) - 1.0 = 0
    Bounds: min_w <= w[i] <= max_w
    w_opt = SLSQP_Solver(Objective, Gradient, w_init=[1/N...], Bounds, Constraint)
    Return w_opt`,
      why: 'Mathematically optimal in sample variance-return space. Foundational pillar of modern mathematical finance.'
    },
    {
      id: 'hrp',
      name: 'Hierarchical Risk Parity (HRP)',
      category: 'Divide-and-Conquer / Graph Tree Traversal',
      time: 'O(N^2 log N)',
      space: 'O(N^2) for distance tree',
      problem: 'Overcome the numerical instability of inverting ill-conditioned covariance matrices in Markowitz MVO.',
      idea: 'Three algorithmic stages: (1) Tree Clustering on distance metric d_ij = sqrt(0.5*(1-rho_ij)); (2) Quasi-diagonalization to sort leaves via tree traversal; (3) Recursive Bisection allocating risk inversely between left and right clusters.',
      objective: 'Alpha = 1 - Var(Cluster_Left) / (Var(Cluster_Left) + Var(Cluster_Right))',
      pseudocode: `ALGORITHM HierarchicalRiskParity(Returns[T, N]):
    Corr = CorrelationMatrix(Returns)
    Dist = sqrt(0.5 * (1 - Corr))
    Tree = HierarchicalClustering(Dist, method='single')
    OrderedLeaves = TreeInOrderTraversal(Tree)
    Weights = RecursiveBisection(Covariance(Returns), OrderedLeaves)
    Return Weights`,
      why: 'Avoids matrix inversion entirely. Stable and robust against high multicollinearity in correlated equity sectors.'
    },
    {
      id: 'genetic_algorithm',
      name: 'Multi-Objective Genetic Algorithm (GA)',
      category: 'Evolutionary Computation / Metaheuristic',
      time: 'O(G * P * N)',
      space: 'O(P * N) for chromosomes',
      problem: 'Optimize complex non-convex portfolios with simultaneous constraints (Sharpe, Diversification, Concentration bounds).',
      idea: 'Evolves a population of candidate portfolio simplexes via tournament selection, arithmetic blending crossover, Gaussian mutation, and elitism.',
      objective: 'Fitness(w) = Sharpe(w) + 0.35 * DiversificationRatio(w) - Penalty(HHI > 0.25)',
      pseudocode: `ALGORITHM GeneticPortfolioOptimization(Assets, P=60, G=50):
    Population = GenerateDirichletSimplexes(P, N)
    For gen = 1 to G:
        Fitness = EvaluateMultiObjective(Population)
        Elites = TopIndividuals(Population, k=4)
        Offspring = []
        While len(Offspring) < P - len(Elites):
            p1, p2 = TournamentSelection(Population, Fitness)
            child = ArithmeticCrossover(p1, p2, alpha=rand(0.2, 0.8))
            child = GaussianMutation(child, p=0.15)
            child = NormalizeAndClip(child, min_w, max_w)
            Offspring.Append(child)
        Population = Elites + Offspring
    Return BestIndividual(Population)`,
      why: 'Overcomes local minima and easily incorporates non-linear real-world constraints.'
    },
    {
      id: 'community_detection',
      name: 'Clauset-Newman-Moore Community Detection',
      category: 'Graph Theory / Greedy Modularity',
      time: 'O(|E| * d * log |V|)',
      space: 'O(|V| + |E|)',
      problem: 'Partition the stock correlation network G=(V, E) into dense clusters maximizing intra-group co-movements.',
      idea: 'Agglomerative greedy clustering: iteratively joins the pair of communities that produces the largest increase in modularity score Q.',
      objective: 'Q = Sum_c [ (e_c / m) - (d_c / 2m)^2 ]',
      pseudocode: `ALGORITHM GreedyModularityClustering(G=(V, E)):
    Initialize each vertex v in V as its own community
    Maintain max-heap of delta_Q for all connected pairs (u, v)
    While Max(delta_Q) > 0 and len(Communities) > 1:
        Merge pair (u, v) yielding maximum modularity gain
        Update neighbor adjacency and heap delta_Q
    Return Communities`,
      why: 'Automatically uncovers latent market sectors and correlation bottlenecks without requiring pre-labeled industry tags.'
    }
  ];

  const [activeId, setActiveId] = useState(selectedAlgoId || 'hrp');
  const activeAlgo = algorithms.find((a) => a.id === activeId) || algorithms.find((a) => a.id === 'hrp') || algorithms[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                Algorithm Specifications & Complexity Analysis
              </h2>
              <p className="text-xs text-gray-400">
                Asymptotic Complexity (Big-O), Optimization Formulations, and Pseudocode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-2 rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Algorithm List */}
          <div className="w-72 border-r border-gray-800 p-4 space-y-2 overflow-y-auto bg-gray-950/40 shrink-0">
            <div className="text-[10px] uppercase font-mono tracking-wider text-gray-400 px-2 mb-2">
              Implemented Algorithms
            </div>
            {algorithms.map((algo) => (
              <button
                key={algo.id}
                onClick={() => setActiveId(algo.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  activeId === algo.id
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 shadow-sm'
                    : 'bg-gray-900/40 border-gray-800/80 text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                }`}
              >
                <div className="font-semibold text-xs text-gray-200">{algo.name}</div>
                <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-gray-400">
                  <span>{algo.time}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>

          {/* Right Details Panel */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  {activeAlgo.category}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-100 mt-2">{activeAlgo.name}</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{activeAlgo.problem}</p>
            </div>

            {/* Complexity Badges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center space-x-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Time Complexity</div>
                  <div className="text-sm font-mono font-semibold text-amber-300">{activeAlgo.time}</div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center space-x-3">
                <Cpu className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Space Complexity</div>
                  <div className="text-sm font-mono font-semibold text-cyan-300">{activeAlgo.space}</div>
                </div>
              </div>
            </div>

            {/* Algorithmic Idea & Objective */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-wider text-gray-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Algorithmic Design & Optimization Formulation
              </h4>
              <p className="text-xs text-gray-300 bg-gray-900/50 p-3.5 rounded-xl border border-gray-800 leading-relaxed">
                {activeAlgo.idea}
              </p>
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 font-mono text-xs text-emerald-400">
                <span className="text-gray-400">Objective: </span>
                {activeAlgo.objective}
              </div>
            </div>

            {/* Pseudocode Block */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase font-mono tracking-wider text-gray-400 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" /> Pseudocode
              </h4>
              <pre className="p-4 rounded-xl bg-black/60 border border-gray-800 font-mono text-xs text-gray-300 overflow-x-auto leading-relaxed">
                {activeAlgo.pseudocode}
              </pre>
            </div>

            {/* Why Appropriate */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs text-indigo-200">
              <span className="font-semibold text-indigo-300">Quantitative Engineering Rationale: </span>
              {activeAlgo.why}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
