import pandas as pd
import numpy as np
import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities
from typing import Dict, Any, List

class CorrelationNetworkEngine:
    @staticmethod
    def build_network(
        price_df: pd.DataFrame, 
        threshold: float = 0.5,
        method: str = "pearson"
    ) -> Dict[str, Any]:
        """
        Calculates correlation matrix, constructs NetworkX graph with threshold filtering,
        computes graph centrality metrics, and identifies communities/clusters.
        """
        returns_df = price_df.pct_change().dropna()
        if returns_df.empty or len(returns_df.columns) < 2:
            return {"error": "Insufficient return data to build correlation network."}

        corr_matrix = returns_df.corr(method=method)
        stocks = list(corr_matrix.columns)
        n = len(stocks)

        # Build NetworkX undirected graph
        G = nx.Graph()
        for s in stocks:
            G.add_node(s)

        edges = []
        for i in range(n):
            for j in range(i + 1, n):
                s1, s2 = stocks[i], stocks[j]
                val = float(corr_matrix.iloc[i, j])
                abs_val = abs(val)
                if abs_val >= threshold:
                    G.add_edge(s1, s2, weight=abs_val, signed_weight=val)
                    edges.append({
                        "source": s1,
                        "target": s2,
                        "correlation": round(val, 3),
                        "abs_correlation": round(abs_val, 3)
                    })

        # Calculate Graph Centralities (Handle disconnected components gracefully)
        deg_centrality = nx.degree_centrality(G)
        try:
            between_centrality = nx.betweenness_centrality(G, weight="weight")
        except Exception:
            between_centrality = {s: 0.0 for s in stocks}

        # Community detection / Clustering
        communities = []
        try:
            raw_comms = list(greedy_modularity_communities(G, weight="weight"))
            for idx, comm in enumerate(raw_comms):
                members = sorted(list(comm))
                # Compute intra-cluster average correlation
                sub_corr = []
                for m1 in members:
                    for m2 in members:
                        if m1 < m2:
                            sub_corr.append(corr_matrix.loc[m1, m2])
                avg_intra_corr = float(np.mean(sub_corr)) if sub_corr else 1.0
                
                # Derive meaningful semantic label
                if avg_intra_corr > 0.65:
                    label = f"Cluster {idx+1}: High Co-Movement Group (Avg r={avg_intra_corr:.2f})"
                elif avg_intra_corr > 0.4:
                    label = f"Cluster {idx+1}: Moderate Co-Movement Group (Avg r={avg_intra_corr:.2f})"
                else:
                    label = f"Cluster {idx+1}: Diversified / Low Coupling Group (Avg r={avg_intra_corr:.2f})"

                communities.append({
                    "id": idx + 1,
                    "label": label,
                    "members": members,
                    "avg_correlation": round(avg_intra_corr, 2),
                    "size": len(members),
                    "description": f"Stocks in this group exhibit synchronous price trajectories. Holding too many from this single cluster limits portfolio diversification benefits."
                })
        except Exception as e:
            # Fallback if graph is empty or disconnected
            communities = [{
                "id": 1,
                "label": "All Stocks",
                "members": stocks,
                "avg_correlation": round(float(corr_matrix.values[np.triu_indices_from(corr_matrix.values, k=1)].mean()), 2) if n > 1 else 1.0,
                "size": n,
                "description": "Single unified group under current threshold."
            }]

        # Prepare node payload with coordinates using spring layout
        pos = nx.spring_layout(G, seed=42, k=1.2)
        nodes = []
        stock_cluster_map = {}
        for c in communities:
            for m in c["members"]:
                stock_cluster_map[m] = c["id"]

        for s in stocks:
            nodes.append({
                "id": s,
                "name": s,
                "x": round(float(pos[s][0]), 3),
                "y": round(float(pos[s][1]), 3),
                "degree": G.degree(s),
                "degree_centrality": round(float(deg_centrality.get(s, 0.0)), 3),
                "betweenness_centrality": round(float(between_centrality.get(s, 0.0)), 3),
                "cluster_id": stock_cluster_map.get(s, 1)
            })

        # Serialized correlation heatmap matrix
        corr_dict = {s: {s2: round(float(corr_matrix.loc[s, s2]), 3) for s2 in stocks} for s in stocks}

        return {
            "stocks": stocks,
            "threshold": threshold,
            "nodes": nodes,
            "edges": edges,
            "total_edges": len(edges),
            "density": round(nx.density(G), 3),
            "communities": communities,
            "correlation_matrix": corr_dict
        }
