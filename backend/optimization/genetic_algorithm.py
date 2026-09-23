import numpy as np
import pandas as pd
from typing import Dict, Any, List

class GeneticAlgorithmOptimizer:
    METADATA = {
        "id": "genetic_algorithm",
        "name": "Multi-Objective Genetic Algorithm (Evolutionary Metaheuristic)",
        "category": "Evolutionary Computation / Metaheuristic Search",
        "problem": "Solve complex non-convex multi-objective portfolio problems combining Sharpe ratio, diversification ratio, and cardinality/concentration constraints simultaneously.",
        "idea": "Evolves a population of candidate portfolio weight vectors through biological analogies: tournament selection, arithmetic crossover, stochastic mutation, and elitism over multiple generations.",
        "input": "Asset returns, population size P, generations G, mutation rate, constraint bounds.",
        "output": "Pareto-approximate optimal weight vector maximizing multi-objective fitness.",
        "time_complexity": "O(G * P * N) where G is number of generations, P is population size, and N is number of candidate assets.",
        "space_complexity": "O(P * N) - Required to maintain chromosomes for the current population and offspring buffer.",
        "why_appropriate": "Easily incorporates non-linear, discontinuous, and multi-modal constraints where gradient-based quadratic programming gets trapped in local extrema.",
        "pseudocode": """ALGORITHM GeneticPortfolioOptimization(Assets, P=60, G=50, mut_rate=0.15):
    Population = InitializeRandomPortfolios(P, N, min_w, max_w)
    EvaluateFitness(Population)
    For gen = 1 to G:
        Elites = SelectTopIndividuals(Population, k=5)
        Offspring = []
        While len(Offspring) < P - len(Elites):
            p1, p2 = TournamentSelection(Population, k=3)
            child = ArithmeticCrossover(p1, p2)
            child = MutateWithProbability(child, mut_rate)
            child = ProjectAndNormalize(child, min_w, max_w)
            Offspring.Append(child)
        Population = Elites + Offspring
        EvaluateFitness(Population)
    Return BestIndividual(Population)"""
    }

    @classmethod
    def optimize(
        cls, 
        returns_df: pd.DataFrame, 
        max_stocks: int = 10,
        min_alloc: float = 0.02,
        max_alloc: float = 0.35,
        pop_size: int = 60,
        generations: int = 50,
        mutation_rate: float = 0.15
    ) -> Dict[str, Any]:
        stocks = list(returns_df.columns)
        n_total = len(stocks)

        if n_total > max_stocks:
            mu = returns_df.mean().values * 252.0
            stds = returns_df.std().values * np.sqrt(252.0)
            sharpes = (mu - 0.03) / np.maximum(stds, 1e-4)
            top_idx = np.argsort(-sharpes)[:max_stocks]
            sub_stocks = [stocks[i] for i in top_idx]
            sub_returns = returns_df[sub_stocks]
        else:
            sub_stocks = stocks
            sub_returns = returns_df

        n = len(sub_stocks)
        means = sub_returns.mean().values * 252.0
        cov = sub_returns.cov().values * 252.0
        stds = sub_returns.std().values * np.sqrt(252.0)

        # Multi-objective fitness function
        def evaluate_fitness(w):
            port_ret = np.sum(w * means)
            port_var = w.T @ cov @ w
            port_vol = np.sqrt(max(1e-8, port_var))
            sharpe = (port_ret - 0.03) / max(port_vol, 1e-4)
            
            # Diversification ratio
            div_ratio = np.sum(w * stds) / max(port_vol, 1e-4)
            
            # Penalize HHI concentration > 0.3
            hhi = np.sum(w ** 2)
            penalty_hhi = max(0.0, hhi - 0.25) * 5.0

            # Composite multi-objective score
            score = sharpe + 0.35 * div_ratio - penalty_hhi
            return score

        def normalize_w(w):
            w = np.clip(w, min_alloc, max_alloc)
            s = np.sum(w)
            if s > 0:
                w = w / s
            else:
                w = np.full(n, 1.0 / n)
            return w

        # 1. Initialize random population
        np.random.seed(42)
        population = []
        for _ in range(pop_size):
            raw = np.random.uniform(min_alloc, max_alloc, size=n)
            population.append(normalize_w(raw))
        population = np.array(population)

        # 2. Evolutionary cycle
        for gen in range(generations):
            fitness_scores = np.array([evaluate_fitness(ind) for ind in population])
            
            # Elitism: retain top 4
            sorted_idx = np.argsort(-fitness_scores)
            elites = [population[i].copy() for i in sorted_idx[:4]]
            
            new_pop = list(elites)
            while len(new_pop) < pop_size:
                # Tournament selection
                i1, i2 = np.random.choice(pop_size, 2, replace=False)
                p1 = population[i1] if fitness_scores[i1] > fitness_scores[i2] else population[i2]
                
                i3, i4 = np.random.choice(pop_size, 2, replace=False)
                p2 = population[i3] if fitness_scores[i3] > fitness_scores[i4] else population[i4]

                # Arithmetic Crossover
                alpha = np.random.uniform(0.2, 0.8)
                child = alpha * p1 + (1.0 - alpha) * p2

                # Stochastic Mutation
                if np.random.rand() < mutation_rate:
                    noise = np.random.normal(0, 0.05, size=n)
                    child = child + noise

                new_pop.append(normalize_w(child))

            population = np.array(new_pop)

        # Pick global best individual
        final_scores = np.array([evaluate_fitness(ind) for ind in population])
        best_w = population[np.argmax(final_scores)]

        weights_dict = {s: 0.0 for s in stocks}
        for i, s in enumerate(sub_stocks):
            weights_dict[s] = float(best_w[i])

        return {
            "algorithm": cls.METADATA["name"],
            "metadata": cls.METADATA,
            "weights": weights_dict,
            "selected_stocks": sub_stocks
        }
