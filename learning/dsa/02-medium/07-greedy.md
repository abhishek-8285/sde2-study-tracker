# Greedy Algorithms 🎯

## 🎯 **Overview**

Greedy algorithms make locally optimal choices at each step, hoping to find a global optimum. They're simple, efficient, and work well for many optimization problems, though they don't always guarantee the optimal solution.

## 💡 **Core Principles**

### **Greedy Choice Property**

A global optimum can be arrived at by making a locally optimal choice. The key is identifying when this property holds.

### **Optimal Substructure**

An optimal solution contains optimal solutions to subproblems.

### **General Greedy Algorithm Template**

```java
public class GreedyTemplate {

    public static SolutionType greedy(InputType input) {
        // Initialize solution
        SolutionType solution = new SolutionType();

        // Sort or prioritize choices (often crucial)
        sortChoices(input);

        // Make greedy choices
        for (Choice choice : input.choices) {
            if (isSafe(choice, solution)) {
                solution.add(choice);
            }
        }

        return solution;
    }
}
```

## 🔧 **Classic Greedy Problems**

### **Problem 1: Activity Selection**

#### **Select Maximum Non-Overlapping Activities**

```java
import java.util.*;

public class ActivitySelection {

    static class Activity {
        int start, end;

        Activity(int start, int end) {
            this.start = start;
            this.end = end;
        }
    }

    // Select maximum number of non-overlapping activities
    public static List<Activity> selectActivities(Activity[] activities) {
        List<Activity> result = new ArrayList<>();

        // Sort by end time (greedy choice: earliest ending first)
        Arrays.sort(activities, (a, b) -> Integer.compare(a.end, b.end));

        if (activities.length > 0) {
            result.add(activities[0]);
            int lastSelected = 0;

            for (int i = 1; i < activities.length; i++) {
                // If current activity starts after last selected ends
                if (activities[i].start >= activities[lastSelected].end) {
                    result.add(activities[i]);
                    lastSelected = i;
                }
            }
        }

        return result;
    }
}
```

**Why Greedy Works**: Selecting the activity that ends earliest leaves maximum room for future activities.

### **Problem 2: Fractional Knapsack**

#### **Maximize Value with Weight Constraint**

```java
public class FractionalKnapsack {

    static class Item {
        int value, weight;
        double ratio;

        Item(int value, int weight) {
            this.value = value;
            this.weight = weight;
            this.ratio = (double) value / weight;
        }
    }

    public static double fractionalKnapsack(Item[] items, int capacity) {
        // Sort by value-to-weight ratio (greedy choice)
        Arrays.sort(items, (a, b) -> Double.compare(b.ratio, a.ratio));

        double totalValue = 0;
        int remainingCapacity = capacity;

        for (Item item : items) {
            if (remainingCapacity >= item.weight) {
                // Take entire item
                totalValue += item.value;
                remainingCapacity -= item.weight;
            } else {
                // Take fraction of item
                totalValue += item.ratio * remainingCapacity;
                break;
            }
        }

        return totalValue;
    }
}
```

### **Problem 3: Huffman Coding**

#### **Optimal Prefix Code for Data Compression**

```java
import java.util.*;

public class HuffmanCoding {

    static class Node implements Comparable<Node> {
        char ch;
        int freq;
        Node left, right;

        Node(char ch, int freq) {
            this.ch = ch;
            this.freq = freq;
        }

        Node(int freq, Node left, Node right) {
            this.freq = freq;
            this.left = left;
            this.right = right;
        }

        boolean isLeaf() {
            return left == null && right == null;
        }

        @Override
        public int compareTo(Node other) {
            return Integer.compare(this.freq, other.freq);
        }
    }

    public static Node buildHuffmanTree(Map<Character, Integer> frequencies) {
        PriorityQueue<Node> minHeap = new PriorityQueue<>();

        // Create leaf nodes
        for (Map.Entry<Character, Integer> entry : frequencies.entrySet()) {
            minHeap.offer(new Node(entry.getKey(), entry.getValue()));
        }

        // Build tree bottom-up
        while (minHeap.size() > 1) {
            Node left = minHeap.poll();
            Node right = minHeap.poll();

            // Create internal node (greedy: combine two minimum frequency nodes)
            Node merged = new Node(left.freq + right.freq, left, right);
            minHeap.offer(merged);
        }

        return minHeap.poll();
    }

    public static Map<Character, String> generateCodes(Node root) {
        Map<Character, String> codes = new HashMap<>();
        generateCodesHelper(root, "", codes);
        return codes;
    }

    private static void generateCodesHelper(Node node, String code,
                                            Map<Character, String> codes) {
        if (node.isLeaf()) {
            codes.put(node.ch, code.isEmpty() ? "0" : code);
        } else {
            generateCodesHelper(node.left, code + "0", codes);
            generateCodesHelper(node.right, code + "1", codes);
        }
    }
}
```

### **Problem 4: Minimum Spanning Tree**

#### **Kruskal's Algorithm**

```java
import java.util.*;

public class KruskalMST {

    static class Edge implements Comparable<Edge> {
        int src, dest, weight;

        Edge(int src, int dest, int weight) {
            this.src = src;
            this.dest = dest;
            this.weight = weight;
        }

        @Override
        public int compareTo(Edge other) {
            return Integer.compare(this.weight, other.weight);
        }
    }

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
                parent[x] = find(parent[x]); // Path compression
            }
            return parent[x];
        }

        boolean union(int x, int y) {
            int rootX = find(x);
            int rootY = find(y);

            if (rootX == rootY) return false;

            // Union by rank
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

    public static List<Edge> kruskalMST(int vertices, List<Edge> edges) {
        List<Edge> result = new ArrayList<>();

        // Sort edges by weight (greedy choice)
        Collections.sort(edges);

        UnionFind uf = new UnionFind(vertices);

        for (Edge edge : edges) {
            // If edge doesn't create cycle, include it
            if (uf.union(edge.src, edge.dest)) {
                result.add(edge);

                // MST has exactly V-1 edges
                if (result.size() == vertices - 1) {
                    break;
                }
            }
        }

        return result;
    }
}
```

## 🎮 **Interval Scheduling Problems**

### **Problem 1: Meeting Rooms**

#### **Check if All Meetings Can Be Attended**

```java
public class MeetingRooms {

    static class Interval {
        int start, end;

        Interval(int start, int end) {
            this.start = start;
            this.end = end;
        }
    }

    public static boolean canAttendMeetings(Interval[] intervals) {
        // Sort by start time
        Arrays.sort(intervals, (a, b) -> Integer.compare(a.start, b.start));

        // Check for overlaps
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i].start < intervals[i - 1].end) {
                return false;
            }
        }

        return true;
    }

    // Minimum meeting rooms required
    public static int minMeetingRooms(Interval[] intervals) {
        if (intervals.length == 0) return 0;

        int[] starts = new int[intervals.length];
        int[] ends = new int[intervals.length];

        for (int i = 0; i < intervals.length; i++) {
            starts[i] = intervals[i].start;
            ends[i] = intervals[i].end;
        }

        Arrays.sort(starts);
        Arrays.sort(ends);

        int rooms = 0, maxRooms = 0;
        int startPtr = 0, endPtr = 0;

        while (startPtr < intervals.length) {
            if (starts[startPtr] >= ends[endPtr]) {
                rooms--;
                endPtr++;
            }

            rooms++;
            startPtr++;
            maxRooms = Math.max(maxRooms, rooms);
        }

        return maxRooms;
    }
}
```

### **Problem 2: Non-Overlapping Intervals**

#### **Minimum Removals to Make Non-Overlapping**

```java
public class NonOverlappingIntervals {

    static class Interval {
        int start, end;

        Interval(int start, int end) {
            this.start = start;
            this.end = end;
        }
    }

    public static int eraseOverlapIntervals(Interval[] intervals) {
        if (intervals.length <= 1) return 0;

        // Sort by end time (greedy: keep intervals that end earliest)
        Arrays.sort(intervals, (a, b) -> Integer.compare(a.end, b.end));

        int count = 0;
        int end = intervals[0].end;

        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i].start < end) {
                // Overlapping interval, remove current one
                count++;
            } else {
                // Non-overlapping, update end
                end = intervals[i].end;
            }
        }

        return count;
    }
}
```

## 💰 **Optimization Problems**

### **Problem 1: Gas Station**

#### **Find Starting Point for Circular Tour**

```java
public class GasStation {

    public static int canCompleteCircuit(int[] gas, int[] cost) {
        int totalGas = 0, totalCost = 0;
        int currentGas = 0, start = 0;

        for (int i = 0; i < gas.length; i++) {
            totalGas += gas[i];
            totalCost += cost[i];
            currentGas += gas[i] - cost[i];

            // If we can't reach next station, start from next station
            if (currentGas < 0) {
                start = i + 1;
                currentGas = 0;
            }
        }

        // Check if total gas is enough for complete circuit
        return totalGas >= totalCost ? start : -1;
    }
}
```

### **Problem 2: Jump Game**

#### **Minimum Jumps to Reach End**

```java
public class JumpGame {

    // Check if we can reach the end
    public static boolean canJump(int[] nums) {
        int maxReach = 0;

        for (int i = 0; i < nums.length; i++) {
            if (i > maxReach) return false;
            maxReach = Math.max(maxReach, i + nums[i]);
        }

        return true;
    }

    // Minimum jumps to reach end
    public static int jump(int[] nums) {
        int jumps = 0, currentEnd = 0, farthest = 0;

        // We don't need to jump from last index
        for (int i = 0; i < nums.length - 1; i++) {
            farthest = Math.max(farthest, i + nums[i]);

            // If we've reached the end of current jump
            if (i == currentEnd) {
                jumps++;
                currentEnd = farthest;
            }
        }

        return jumps;
    }
}
```

### **Problem 3: Stock Trading**

#### **Maximum Profit from Multiple Transactions**

```java
public class StockTrading {

    // Buy and sell stock for maximum profit (multiple transactions)
    public static int maxProfit(int[] prices) {
        int totalProfit = 0;

        // Greedy: buy before every price increase, sell before every decrease
        for (int i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) {
                totalProfit += prices[i] - prices[i - 1];
            }
        }

        return totalProfit;
    }

    // Maximum profit with at most k transactions
    public static int maxProfit(int k, int[] prices) {
        int n = prices.length;
        if (n <= 1 || k == 0) return 0;

        // If k >= n/2, we can make as many transactions as we want
        if (k >= n / 2) {
            return maxProfit(prices); // Use greedy approach
        }

        // DP approach for limited transactions
        int[][] buy = new int[k + 1][n];
        int[][] sell = new int[k + 1][n];

        for (int i = 1; i <= k; i++) {
            buy[i][0] = -prices[0];
            for (int j = 1; j < n; j++) {
                buy[i][j] = Math.max(buy[i][j - 1], sell[i - 1][j - 1] - prices[j]);
                sell[i][j] = Math.max(sell[i][j - 1], buy[i][j - 1] + prices[j]);
            }
        }

        return sell[k][n - 1];
    }
}
```

## 🔄 **String Manipulation**

### **Problem 1: Remove K Digits**

#### **Remove Digits to Make Smallest Number**

```java
public class RemoveKDigits {

    public static String removeKdigits(String num, int k) {
        Stack<Character> stack = new Stack<>();

        for (char digit : num.toCharArray()) {
            // Remove larger digits from stack (greedy choice)
            while (!stack.isEmpty() && k > 0 && stack.peek() > digit) {
                stack.pop();
                k--;
            }
            stack.push(digit);
        }

        // Remove remaining digits from end
        while (k > 0) {
            stack.pop();
            k--;
        }

        // Build result
        StringBuilder result = new StringBuilder();
        for (char digit : stack) {
            result.append(digit);
        }

        // Remove leading zeros
        while (result.length() > 1 && result.charAt(0) == '0') {
            result.deleteCharAt(0);
        }

        return result.length() == 0 ? "0" : result.toString();
    }
}
```

### **Problem 2: Task Scheduler**

#### **Minimum Time to Complete Tasks with Cooldown**

```java
public class TaskScheduler {

    public static int leastInterval(char[] tasks, int n) {
        // Count frequency of each task
        int[] frequencies = new int[26];
        for (char task : tasks) {
            frequencies[task - 'A']++;
        }

        Arrays.sort(frequencies);

        // Most frequent task
        int maxFreq = frequencies[25];
        int idleTime = (maxFreq - 1) * n;

        // Fill idle time with other tasks
        for (int i = 24; i >= 0 && idleTime > 0; i--) {
            idleTime -= Math.min(frequencies[i], maxFreq - 1);
        }

        idleTime = Math.max(0, idleTime);

        return tasks.length + idleTime;
    }
}
```

## 📊 **When Greedy Works vs. When It Doesn't**

### **✅ Greedy Works When:**

1. **Optimal Substructure**: Optimal solution contains optimal subsolutions
2. **Greedy Choice Property**: Local optimum leads to global optimum
3. **No future dependencies**: Current choice doesn't affect future choices

### **❌ Greedy Fails When:**

1. **0/1 Knapsack**: Items can't be fractioned
2. **Shortest Path with Negative Weights**: Local optimum misleads
3. **Coin Change for Arbitrary Denominations**: Local optimum doesn't guarantee global optimum

### **Proving Greedy Correctness**

1. **Greedy Choice Property**: Show that greedy choice leads to optimal solution
2. **Optimal Substructure**: Show that optimal solution contains optimal subsolutions
3. **Cut-and-paste**: Show that any optimal solution can be modified to use greedy choice

## 🎯 **Greedy Algorithm Categories**

### **Scheduling Problems**

- Activity Selection
- Job Scheduling
- Meeting Rooms

### **Graph Problems**

- Minimum Spanning Tree (Kruskal's, Prim's)
- Shortest Path (Dijkstra's)

### **Array Problems**

- Jump Game
- Gas Station
- Remove K Digits

### **String Problems**

- Huffman Coding
- Lexicographically Smallest Subsequence

## 🎮 **Problem Categories**

### **Easy Greedy Problems**

1. **Best Time to Buy/Sell Stock II** - Multiple transactions
2. **Assign Cookies** - Distribute optimally
3. **Lemonade Change** - Greedy coin changing
4. **Walking Robot Simulation** - Local decisions

### **Medium Problems**

1. **Jump Game II** - Minimum jumps
2. **Gas Station** - Circular array optimization
3. **Task Scheduler** - Scheduling with constraints
4. **Non-overlapping Intervals** - Interval optimization

### **Hard Problems**

1. **Merge Intervals** - Complex interval manipulation
2. **Minimum Number of Taps** - Coverage optimization
3. **Candy** - Rating-based distribution
4. **Create Maximum Number** - Lexicographic optimization

---

_Master greedy algorithms to efficiently solve optimization problems by making locally optimal choices!_
