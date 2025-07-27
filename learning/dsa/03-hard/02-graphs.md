# Graph Algorithms 🕸️

## 🎯 **Overview**

Graph algorithms solve problems on networks of vertices and edges. They're essential for modeling relationships, finding paths, detecting patterns, and optimizing network flows in real-world applications.

## 💡 **Graph Representations**

### **Adjacency List**

```java
import java.util.*;

public class GraphAdjList {
    private Map<Integer, List<Integer>> adjList;
    private boolean directed;

    public GraphAdjList(boolean directed) {
        this.adjList = new HashMap<>();
        this.directed = directed;
    }

    public void addVertex(int vertex) {
        adjList.putIfAbsent(vertex, new ArrayList<>());
    }

    public void addEdge(int from, int to) {
        adjList.get(from).add(to);
        if (!directed) {
            adjList.get(to).add(from);
        }
    }

    public List<Integer> getNeighbors(int vertex) {
        return adjList.getOrDefault(vertex, new ArrayList<>());
    }
}
```

### **Adjacency Matrix**

```java
public class GraphAdjMatrix {
    private int[][] matrix;
    private int vertices;
    private boolean directed;

    public GraphAdjMatrix(int vertices, boolean directed) {
        this.vertices = vertices;
        this.directed = directed;
        this.matrix = new int[vertices][vertices];
    }

    public void addEdge(int from, int to, int weight) {
        matrix[from][to] = weight;
        if (!directed) {
            matrix[to][from] = weight;
        }
    }

    public boolean hasEdge(int from, int to) {
        return matrix[from][to] != 0;
    }

    public int getWeight(int from, int to) {
        return matrix[from][to];
    }
}
```

## 🔍 **Graph Traversal Algorithms**

### **Depth-First Search (DFS)**

```java
public class DFS {

    // Recursive DFS
    public static void dfsRecursive(Map<Integer, List<Integer>> graph,
                                    int start, Set<Integer> visited) {
        visited.add(start);
        System.out.print(start + " ");

        for (int neighbor : graph.getOrDefault(start, new ArrayList<>())) {
            if (!visited.contains(neighbor)) {
                dfsRecursive(graph, neighbor, visited);
            }
        }
    }

    // Iterative DFS using stack
    public static void dfsIterative(Map<Integer, List<Integer>> graph, int start) {
        Set<Integer> visited = new HashSet<>();
        Stack<Integer> stack = new Stack<>();

        stack.push(start);

        while (!stack.isEmpty()) {
            int current = stack.pop();

            if (!visited.contains(current)) {
                visited.add(current);
                System.out.print(current + " ");

                // Add neighbors to stack (in reverse order for consistent traversal)
                List<Integer> neighbors = graph.getOrDefault(current, new ArrayList<>());
                for (int i = neighbors.size() - 1; i >= 0; i--) {
                    if (!visited.contains(neighbors.get(i))) {
                        stack.push(neighbors.get(i));
                    }
                }
            }
        }
    }

    // DFS with path tracking
    public static boolean findPath(Map<Integer, List<Integer>> graph,
                                   int start, int target, List<Integer> path) {
        path.add(start);

        if (start == target) {
            return true;
        }

        for (int neighbor : graph.getOrDefault(start, new ArrayList<>())) {
            if (!path.contains(neighbor)) {
                if (findPath(graph, neighbor, target, path)) {
                    return true;
                }
            }
        }

        path.remove(path.size() - 1); // Backtrack
        return false;
    }
}
```

### **Breadth-First Search (BFS)**

```java
public class BFS {

    // Standard BFS
    public static void bfs(Map<Integer, List<Integer>> graph, int start) {
        Set<Integer> visited = new HashSet<>();
        Queue<Integer> queue = new LinkedList<>();

        queue.offer(start);
        visited.add(start);

        while (!queue.isEmpty()) {
            int current = queue.poll();
            System.out.print(current + " ");

            for (int neighbor : graph.getOrDefault(current, new ArrayList<>())) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.offer(neighbor);
                }
            }
        }
    }

    // BFS with level tracking
    public static void bfsLevels(Map<Integer, List<Integer>> graph, int start) {
        Map<Integer, Integer> levels = new HashMap<>();
        Queue<Integer> queue = new LinkedList<>();

        queue.offer(start);
        levels.put(start, 0);

        while (!queue.isEmpty()) {
            int current = queue.poll();
            int currentLevel = levels.get(current);

            System.out.println("Node " + current + " at level " + currentLevel);

            for (int neighbor : graph.getOrDefault(current, new ArrayList<>())) {
                if (!levels.containsKey(neighbor)) {
                    levels.put(neighbor, currentLevel + 1);
                    queue.offer(neighbor);
                }
            }
        }
    }

    // Shortest path in unweighted graph
    public static List<Integer> shortestPath(Map<Integer, List<Integer>> graph,
                                             int start, int target) {
        if (start == target) return Arrays.asList(start);

        Map<Integer, Integer> parent = new HashMap<>();
        Queue<Integer> queue = new LinkedList<>();
        Set<Integer> visited = new HashSet<>();

        queue.offer(start);
        visited.add(start);
        parent.put(start, null);

        while (!queue.isEmpty()) {
            int current = queue.poll();

            for (int neighbor : graph.getOrDefault(current, new ArrayList<>())) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    parent.put(neighbor, current);
                    queue.offer(neighbor);

                    if (neighbor == target) {
                        return reconstructPath(parent, start, target);
                    }
                }
            }
        }

        return new ArrayList<>(); // No path found
    }

    private static List<Integer> reconstructPath(Map<Integer, Integer> parent,
                                                 int start, int target) {
        List<Integer> path = new ArrayList<>();
        Integer current = target;

        while (current != null) {
            path.add(current);
            current = parent.get(current);
        }

        Collections.reverse(path);
        return path;
    }
}
```

## 🛤️ **Shortest Path Algorithms**

### **Dijkstra's Algorithm**

```java
import java.util.*;

public class Dijkstra {

    static class Edge {
        int to, weight;

        Edge(int to, int weight) {
            this.to = to;
            this.weight = weight;
        }
    }

    public static Map<Integer, Integer> dijkstra(Map<Integer, List<Edge>> graph, int start) {
        Map<Integer, Integer> distances = new HashMap<>();
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[1], b[1]));
        Set<Integer> visited = new HashSet<>();

        // Initialize distances
        for (int vertex : graph.keySet()) {
            distances.put(vertex, Integer.MAX_VALUE);
        }
        distances.put(start, 0);

        pq.offer(new int[]{start, 0});

        while (!pq.isEmpty()) {
            int[] current = pq.poll();
            int vertex = current[0];
            int distance = current[1];

            if (visited.contains(vertex)) continue;
            visited.add(vertex);

            for (Edge edge : graph.getOrDefault(vertex, new ArrayList<>())) {
                if (!visited.contains(edge.to)) {
                    int newDistance = distance + edge.weight;
                    if (newDistance < distances.get(edge.to)) {
                        distances.put(edge.to, newDistance);
                        pq.offer(new int[]{edge.to, newDistance});
                    }
                }
            }
        }

        return distances;
    }

    // With path reconstruction
    public static class DijkstraResult {
        Map<Integer, Integer> distances;
        Map<Integer, Integer> previous;

        DijkstraResult(Map<Integer, Integer> distances, Map<Integer, Integer> previous) {
            this.distances = distances;
            this.previous = previous;
        }

        public List<Integer> getPath(int target) {
            List<Integer> path = new ArrayList<>();
            Integer current = target;

            while (current != null) {
                path.add(current);
                current = previous.get(current);
            }

            Collections.reverse(path);
            return path;
        }
    }

    public static DijkstraResult dijkstraWithPath(Map<Integer, List<Edge>> graph, int start) {
        Map<Integer, Integer> distances = new HashMap<>();
        Map<Integer, Integer> previous = new HashMap<>();
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[1], b[1]));
        Set<Integer> visited = new HashSet<>();

        for (int vertex : graph.keySet()) {
            distances.put(vertex, Integer.MAX_VALUE);
        }
        distances.put(start, 0);

        pq.offer(new int[]{start, 0});

        while (!pq.isEmpty()) {
            int[] current = pq.poll();
            int vertex = current[0];
            int distance = current[1];

            if (visited.contains(vertex)) continue;
            visited.add(vertex);

            for (Edge edge : graph.getOrDefault(vertex, new ArrayList<>())) {
                if (!visited.contains(edge.to)) {
                    int newDistance = distance + edge.weight;
                    if (newDistance < distances.get(edge.to)) {
                        distances.put(edge.to, newDistance);
                        previous.put(edge.to, vertex);
                        pq.offer(new int[]{edge.to, newDistance});
                    }
                }
            }
        }

        return new DijkstraResult(distances, previous);
    }
}
```

### **Bellman-Ford Algorithm**

```java
public class BellmanFord {

    static class Edge {
        int from, to, weight;

        Edge(int from, int to, int weight) {
            this.from = from;
            this.to = to;
            this.weight = weight;
        }
    }

    public static Map<Integer, Integer> bellmanFord(List<Edge> edges,
                                                    Set<Integer> vertices, int start) {
        Map<Integer, Integer> distances = new HashMap<>();

        // Initialize distances
        for (int vertex : vertices) {
            distances.put(vertex, Integer.MAX_VALUE);
        }
        distances.put(start, 0);

        // Relax edges V-1 times
        for (int i = 0; i < vertices.size() - 1; i++) {
            for (Edge edge : edges) {
                if (distances.get(edge.from) != Integer.MAX_VALUE) {
                    int newDistance = distances.get(edge.from) + edge.weight;
                    if (newDistance < distances.get(edge.to)) {
                        distances.put(edge.to, newDistance);
                    }
                }
            }
        }

        // Check for negative cycles
        for (Edge edge : edges) {
            if (distances.get(edge.from) != Integer.MAX_VALUE) {
                int newDistance = distances.get(edge.from) + edge.weight;
                if (newDistance < distances.get(edge.to)) {
                    throw new RuntimeException("Graph contains negative cycle");
                }
            }
        }

        return distances;
    }
}
```

### **Floyd-Warshall Algorithm**

```java
public class FloydWarshall {

    public static int[][] floydWarshall(int[][] graph) {
        int n = graph.length;
        int[][] distances = new int[n][n];

        // Initialize distances
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                distances[i][j] = graph[i][j];
            }
        }

        // Find shortest paths through intermediate vertices
        for (int k = 0; k < n; k++) {
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    if (distances[i][k] != Integer.MAX_VALUE &&
                        distances[k][j] != Integer.MAX_VALUE &&
                        distances[i][k] + distances[k][j] < distances[i][j]) {
                        distances[i][j] = distances[i][k] + distances[k][j];
                    }
                }
            }
        }

        return distances;
    }

    // With path reconstruction
    public static class FloydWarshallResult {
        int[][] distances;
        int[][] next;

        FloydWarshallResult(int[][] distances, int[][] next) {
            this.distances = distances;
            this.next = next;
        }

        public List<Integer> getPath(int from, int to) {
            if (distances[from][to] == Integer.MAX_VALUE) {
                return new ArrayList<>();
            }

            List<Integer> path = new ArrayList<>();
            path.add(from);

            while (from != to) {
                from = next[from][to];
                path.add(from);
            }

            return path;
        }
    }

    public static FloydWarshallResult floydWarshallWithPath(int[][] graph) {
        int n = graph.length;
        int[][] distances = new int[n][n];
        int[][] next = new int[n][n];

        // Initialize
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                distances[i][j] = graph[i][j];
                if (graph[i][j] != Integer.MAX_VALUE && i != j) {
                    next[i][j] = j;
                } else {
                    next[i][j] = -1;
                }
            }
        }

        // Floyd-Warshall with path tracking
        for (int k = 0; k < n; k++) {
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    if (distances[i][k] != Integer.MAX_VALUE &&
                        distances[k][j] != Integer.MAX_VALUE &&
                        distances[i][k] + distances[k][j] < distances[i][j]) {
                        distances[i][j] = distances[i][k] + distances[k][j];
                        next[i][j] = next[i][k];
                    }
                }
            }
        }

        return new FloydWarshallResult(distances, next);
    }
}
```

## 🔄 **Cycle Detection**

### **Cycle Detection in Directed Graph**

```java
public class CycleDetection {

    // Using DFS with three colors
    public static boolean hasCycleDirected(Map<Integer, List<Integer>> graph) {
        Set<Integer> white = new HashSet<>(graph.keySet()); // Unvisited
        Set<Integer> gray = new HashSet<>();  // Currently processing
        Set<Integer> black = new HashSet<>(); // Fully processed

        for (int vertex : white) {
            if (dfsDirected(graph, vertex, white, gray, black)) {
                return true;
            }
        }

        return false;
    }

    private static boolean dfsDirected(Map<Integer, List<Integer>> graph, int vertex,
                                       Set<Integer> white, Set<Integer> gray, Set<Integer> black) {
        white.remove(vertex);
        gray.add(vertex);

        for (int neighbor : graph.getOrDefault(vertex, new ArrayList<>())) {
            if (black.contains(neighbor)) {
                continue;
            }

            if (gray.contains(neighbor) ||
                dfsDirected(graph, neighbor, white, gray, black)) {
                return true; // Back edge found (cycle)
            }
        }

        gray.remove(vertex);
        black.add(vertex);
        return false;
    }

    // Using DFS with recursion stack
    public static boolean hasCycleDirectedSimple(Map<Integer, List<Integer>> graph) {
        Set<Integer> visited = new HashSet<>();
        Set<Integer> recursionStack = new HashSet<>();

        for (int vertex : graph.keySet()) {
            if (!visited.contains(vertex)) {
                if (dfsStack(graph, vertex, visited, recursionStack)) {
                    return true;
                }
            }
        }

        return false;
    }

    private static boolean dfsStack(Map<Integer, List<Integer>> graph, int vertex,
                                    Set<Integer> visited, Set<Integer> recursionStack) {
        visited.add(vertex);
        recursionStack.add(vertex);

        for (int neighbor : graph.getOrDefault(vertex, new ArrayList<>())) {
            if (!visited.contains(neighbor)) {
                if (dfsStack(graph, neighbor, visited, recursionStack)) {
                    return true;
                }
            } else if (recursionStack.contains(neighbor)) {
                return true; // Back edge in recursion stack
            }
        }

        recursionStack.remove(vertex);
        return false;
    }
}
```

### **Cycle Detection in Undirected Graph**

```java
public class UndirectedCycleDetection {

    // Using DFS
    public static boolean hasCycleUndirected(Map<Integer, List<Integer>> graph) {
        Set<Integer> visited = new HashSet<>();

        for (int vertex : graph.keySet()) {
            if (!visited.contains(vertex)) {
                if (dfsUndirected(graph, vertex, -1, visited)) {
                    return true;
                }
            }
        }

        return false;
    }

    private static boolean dfsUndirected(Map<Integer, List<Integer>> graph,
                                         int vertex, int parent, Set<Integer> visited) {
        visited.add(vertex);

        for (int neighbor : graph.getOrDefault(vertex, new ArrayList<>())) {
            if (!visited.contains(neighbor)) {
                if (dfsUndirected(graph, neighbor, vertex, visited)) {
                    return true;
                }
            } else if (neighbor != parent) {
                return true; // Back edge found
            }
        }

        return false;
    }

    // Using Union-Find
    static class UnionFind {
        int[] parent, rank;

        UnionFind(int n) {
            parent = new int[n];
            rank = new int[n];
            for (int i = 0; i < n; i++) {
                parent[i] = i;
            }
        }

        int find(int x) {
            if (parent[x] != x) {
                parent[x] = find(parent[x]);
            }
            return parent[x];
        }

        boolean union(int x, int y) {
            int rootX = find(x);
            int rootY = find(y);

            if (rootX == rootY) return false; // Cycle detected

            if (rank[rootX] < rank[rootY]) {
                parent[rootX] = rootY;
            } else if (rank[rootX] > rank[rootY]) {
                parent[rootY] = rootX;
            } else {
                parent[rootY] = rootX;
                rank[rootX]++;
            }

            return true;
        }
    }

    public static boolean hasCycleUnionFind(List<int[]> edges, int vertices) {
        UnionFind uf = new UnionFind(vertices);

        for (int[] edge : edges) {
            if (!uf.union(edge[0], edge[1])) {
                return true; // Cycle detected
            }
        }

        return false;
    }
}
```

## 🎯 **Topological Sorting**

### **Kahn's Algorithm (BFS-based)**

```java
public class TopologicalSort {

    public static List<Integer> topologicalSortKahn(Map<Integer, List<Integer>> graph) {
        Map<Integer, Integer> inDegree = new HashMap<>();

        // Initialize in-degrees
        for (int vertex : graph.keySet()) {
            inDegree.put(vertex, 0);
        }

        // Calculate in-degrees
        for (int vertex : graph.keySet()) {
            for (int neighbor : graph.get(vertex)) {
                inDegree.put(neighbor, inDegree.getOrDefault(neighbor, 0) + 1);
            }
        }

        // Find vertices with in-degree 0
        Queue<Integer> queue = new LinkedList<>();
        for (Map.Entry<Integer, Integer> entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                queue.offer(entry.getKey());
            }
        }

        List<Integer> result = new ArrayList<>();

        while (!queue.isEmpty()) {
            int current = queue.poll();
            result.add(current);

            // Reduce in-degree of neighbors
            for (int neighbor : graph.getOrDefault(current, new ArrayList<>())) {
                inDegree.put(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) == 0) {
                    queue.offer(neighbor);
                }
            }
        }

        // Check if all vertices are included (no cycle)
        if (result.size() != graph.size()) {
            throw new RuntimeException("Graph has cycle, topological sort impossible");
        }

        return result;
    }

    // DFS-based topological sort
    public static List<Integer> topologicalSortDFS(Map<Integer, List<Integer>> graph) {
        Set<Integer> visited = new HashSet<>();
        Stack<Integer> stack = new Stack<>();

        for (int vertex : graph.keySet()) {
            if (!visited.contains(vertex)) {
                topologicalDFS(graph, vertex, visited, stack);
            }
        }

        List<Integer> result = new ArrayList<>();
        while (!stack.isEmpty()) {
            result.add(stack.pop());
        }

        return result;
    }

    private static void topologicalDFS(Map<Integer, List<Integer>> graph, int vertex,
                                       Set<Integer> visited, Stack<Integer> stack) {
        visited.add(vertex);

        for (int neighbor : graph.getOrDefault(vertex, new ArrayList<>())) {
            if (!visited.contains(neighbor)) {
                topologicalDFS(graph, neighbor, visited, stack);
            }
        }

        stack.push(vertex);
    }
}
```

## 🌐 **Strongly Connected Components**

### **Kosaraju's Algorithm**

```java
public class StronglyConnectedComponents {

    public static List<List<Integer>> kosarajuSCC(Map<Integer, List<Integer>> graph) {
        // Step 1: Get finishing order using DFS
        Stack<Integer> finishOrder = new Stack<>();
        Set<Integer> visited = new HashSet<>();

        for (int vertex : graph.keySet()) {
            if (!visited.contains(vertex)) {
                dfsFinishOrder(graph, vertex, visited, finishOrder);
            }
        }

        // Step 2: Create transpose graph
        Map<Integer, List<Integer>> transpose = getTranspose(graph);

        // Step 3: DFS on transpose in reverse finish order
        visited.clear();
        List<List<Integer>> sccs = new ArrayList<>();

        while (!finishOrder.isEmpty()) {
            int vertex = finishOrder.pop();
            if (!visited.contains(vertex)) {
                List<Integer> scc = new ArrayList<>();
                dfsCollectSCC(transpose, vertex, visited, scc);
                sccs.add(scc);
            }
        }

        return sccs;
    }

    private static void dfsFinishOrder(Map<Integer, List<Integer>> graph, int vertex,
                                       Set<Integer> visited, Stack<Integer> finishOrder) {
        visited.add(vertex);

        for (int neighbor : graph.getOrDefault(vertex, new ArrayList<>())) {
            if (!visited.contains(neighbor)) {
                dfsFinishOrder(graph, neighbor, visited, finishOrder);
            }
        }

        finishOrder.push(vertex);
    }

    private static Map<Integer, List<Integer>> getTranspose(Map<Integer, List<Integer>> graph) {
        Map<Integer, List<Integer>> transpose = new HashMap<>();

        // Initialize transpose graph
        for (int vertex : graph.keySet()) {
            transpose.put(vertex, new ArrayList<>());
        }

        // Reverse all edges
        for (Map.Entry<Integer, List<Integer>> entry : graph.entrySet()) {
            int from = entry.getKey();
            for (int to : entry.getValue()) {
                transpose.get(to).add(from);
            }
        }

        return transpose;
    }

    private static void dfsCollectSCC(Map<Integer, List<Integer>> graph, int vertex,
                                      Set<Integer> visited, List<Integer> scc) {
        visited.add(vertex);
        scc.add(vertex);

        for (int neighbor : graph.getOrDefault(vertex, new ArrayList<>())) {
            if (!visited.contains(neighbor)) {
                dfsCollectSCC(graph, neighbor, visited, scc);
            }
        }
    }
}
```

## 🎮 **Problem Categories**

### **Easy Graph Problems**

1. **Find if Path Exists** - Basic graph traversal
2. **Number of Islands** - DFS/BFS on grid
3. **Clone Graph** - Graph copying with DFS/BFS
4. **Valid Tree** - Cycle detection and connectivity

### **Medium Problems**

1. **Course Schedule** - Topological sorting and cycle detection
2. **Number of Connected Components** - Union-Find or DFS
3. **Shortest Path in Binary Matrix** - BFS on grid
4. **Network Delay Time** - Dijkstra's algorithm

### **Hard Problems**

1. **Critical Connections** - Tarjan's algorithm for bridges
2. **Reconstruct Itinerary** - Hierholzer's algorithm for Eulerian path
3. **Alien Dictionary** - Topological sorting on character ordering
4. **Minimum Spanning Tree** - Kruskal's or Prim's algorithm

---

_Master graph algorithms to solve complex network and relationship problems efficiently!_
