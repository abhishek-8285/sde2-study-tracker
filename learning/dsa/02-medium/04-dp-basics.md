# Dynamic Programming - Basics 💭

## 🎯 **Overview**

Dynamic Programming (DP) is an optimization technique that solves complex problems by breaking them down into simpler subproblems and storing their solutions to avoid redundant calculations. It's essential for optimization problems and recursive solutions with overlapping subproblems.

## 💡 **Core Principles**

### **Two Key Properties**

1. **Optimal Substructure**: The optimal solution contains optimal solutions to subproblems
2. **Overlapping Subproblems**: The same subproblems are solved multiple times

### **Two Main Approaches**

- **Top-Down (Memoization)**: Start with original problem, recursively solve subproblems
- **Bottom-Up (Tabulation)**: Start with smallest subproblems, build up to original problem

## 🔧 **Basic DP Patterns**

### **Pattern 1: Fibonacci - Classic Introduction**

#### **Naive Recursive (Inefficient)**

```java
public class FibonacciNaive {
    // Time: O(2^n), Space: O(n) - exponential time!
    public static int fibRecursive(int n) {
        if (n <= 1) return n;
        return fibRecursive(n - 1) + fibRecursive(n - 2);
    }
}
```

#### **Top-Down with Memoization**

```java
import java.util.*;

public class FibonacciMemo {
    // Time: O(n), Space: O(n)
    public static int fibMemo(int n) {
        Map<Integer, Integer> memo = new HashMap<>();
        return fibHelper(n, memo);
    }

    private static int fibHelper(int n, Map<Integer, Integer> memo) {
        if (n <= 1) return n;

        if (memo.containsKey(n)) {
            return memo.get(n);
        }

        int result = fibHelper(n - 1, memo) + fibHelper(n - 2, memo);
        memo.put(n, result);
        return result;
    }
}
```

#### **Bottom-Up Tabulation**

```java
public class FibonacciTabulation {
    // Time: O(n), Space: O(n)
    public static int fibTabulation(int n) {
        if (n <= 1) return n;

        int[] dp = new int[n + 1];
        dp[0] = 0;
        dp[1] = 1;

        for (int i = 2; i <= n; i++) {
            dp[i] = dp[i - 1] + dp[i - 2];
        }

        return dp[n];
    }

    // Space optimized: O(1) space
    public static int fibOptimized(int n) {
        if (n <= 1) return n;

        int prev2 = 0, prev1 = 1;

        for (int i = 2; i <= n; i++) {
            int current = prev1 + prev2;
            prev2 = prev1;
            prev1 = current;
        }

        return prev1;
    }
}
```

### **Pattern 2: Climbing Stairs**

#### **Problem**: Count ways to climb n stairs (1 or 2 steps at a time)

```java
public class ClimbingStairs {

    // Top-down approach
    public static int climbStairsMemo(int n) {
        Map<Integer, Integer> memo = new HashMap<>();
        return climbHelper(n, memo);
    }

    private static int climbHelper(int n, Map<Integer, Integer> memo) {
        if (n <= 2) return n;

        if (memo.containsKey(n)) {
            return memo.get(n);
        }

        int result = climbHelper(n - 1, memo) + climbHelper(n - 2, memo);
        memo.put(n, result);
        return result;
    }

    // Bottom-up approach
    public static int climbStairsTabulation(int n) {
        if (n <= 2) return n;

        int[] dp = new int[n + 1];
        dp[1] = 1;
        dp[2] = 2;

        for (int i = 3; i <= n; i++) {
            dp[i] = dp[i - 1] + dp[i - 2];
        }

        return dp[n];
    }
}
```

### **Pattern 3: Coin Change**

#### **Minimum Coins to Make Amount**

```java
import java.util.*;

public class CoinChange {

    // Top-down with memoization
    public static int coinChangeMemo(int[] coins, int amount) {
        Map<Integer, Integer> memo = new HashMap<>();
        int result = coinChangeHelper(coins, amount, memo);
        return result == Integer.MAX_VALUE ? -1 : result;
    }

    private static int coinChangeHelper(int[] coins, int amount,
                                        Map<Integer, Integer> memo) {
        if (amount == 0) return 0;
        if (amount < 0) return Integer.MAX_VALUE;

        if (memo.containsKey(amount)) {
            return memo.get(amount);
        }

        int minCoins = Integer.MAX_VALUE;
        for (int coin : coins) {
            int subResult = coinChangeHelper(coins, amount - coin, memo);
            if (subResult != Integer.MAX_VALUE) {
                minCoins = Math.min(minCoins, subResult + 1);
            }
        }

        memo.put(amount, minCoins);
        return minCoins;
    }

    // Bottom-up approach
    public static int coinChangeTabulation(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1); // Initialize with impossible value
        dp[0] = 0;

        for (int i = 1; i <= amount; i++) {
            for (int coin : coins) {
                if (coin <= i) {
                    dp[i] = Math.min(dp[i], dp[i - coin] + 1);
                }
            }
        }

        return dp[amount] > amount ? -1 : dp[amount];
    }
}
```

**Visualization for coins=[1,3,4], amount=6:**

```
dp[0] = 0  (base case)
dp[1] = min(dp[1], dp[0]+1) = 1  (use coin 1)
dp[2] = min(dp[2], dp[1]+1) = 2  (use coin 1 twice)
dp[3] = min(dp[3], dp[2]+1, dp[0]+1) = 1  (use coin 3)
dp[4] = min(dp[4], dp[3]+1, dp[1]+1, dp[0]+1) = 1  (use coin 4)
dp[5] = min(dp[5], dp[4]+1, dp[2]+1, dp[1]+1) = 2  (coins 4+1)
dp[6] = min(dp[6], dp[5]+1, dp[3]+1, dp[2]+1) = 2  (coins 3+3)
```

### **Pattern 4: House Robber**

#### **Maximum Money Without Robbing Adjacent Houses**

```java
public class HouseRobber {

    // Top-down approach
    public static int robMemo(int[] nums) {
        Map<Integer, Integer> memo = new HashMap<>();
        return robHelper(nums, 0, memo);
    }

    private static int robHelper(int[] nums, int index,
                                 Map<Integer, Integer> memo) {
        if (index >= nums.length) return 0;

        if (memo.containsKey(index)) {
            return memo.get(index);
        }

        // Choice: rob current house or skip it
        int robCurrent = nums[index] + robHelper(nums, index + 2, memo);
        int skipCurrent = robHelper(nums, index + 1, memo);

        int result = Math.max(robCurrent, skipCurrent);
        memo.put(index, result);
        return result;
    }

    // Bottom-up approach
    public static int robTabulation(int[] nums) {
        if (nums.length == 0) return 0;
        if (nums.length == 1) return nums[0];

        int[] dp = new int[nums.length];
        dp[0] = nums[0];
        dp[1] = Math.max(nums[0], nums[1]);

        for (int i = 2; i < nums.length; i++) {
            dp[i] = Math.max(dp[i - 1], nums[i] + dp[i - 2]);
        }

        return dp[nums.length - 1];
    }

    // Space optimized
    public static int robOptimized(int[] nums) {
        if (nums.length == 0) return 0;
        if (nums.length == 1) return nums[0];

        int prev2 = nums[0];
        int prev1 = Math.max(nums[0], nums[1]);

        for (int i = 2; i < nums.length; i++) {
            int current = Math.max(prev1, nums[i] + prev2);
            prev2 = prev1;
            prev1 = current;
        }

        return prev1;
    }
}
```

## 🎮 **2D Dynamic Programming**

### **Pattern 1: Unique Paths**

#### **Count Paths in Grid**

```java
public class UniquePaths {

    // Top-down with memoization
    public static int uniquePathsMemo(int m, int n) {
        Map<String, Integer> memo = new HashMap<>();
        return pathHelper(0, 0, m, n, memo);
    }

    private static int pathHelper(int row, int col, int m, int n,
                                  Map<String, Integer> memo) {
        if (row == m - 1 && col == n - 1) return 1;
        if (row >= m || col >= n) return 0;

        String key = row + "," + col;
        if (memo.containsKey(key)) {
            return memo.get(key);
        }

        int result = pathHelper(row + 1, col, m, n, memo) +
                     pathHelper(row, col + 1, m, n, memo);

        memo.put(key, result);
        return result;
    }

    // Bottom-up approach
    public static int uniquePathsTabulation(int m, int n) {
        int[][] dp = new int[m][n];

        // Initialize first row and column
        for (int i = 0; i < m; i++) dp[i][0] = 1;
        for (int j = 0; j < n; j++) dp[0][j] = 1;

        // Fill the rest
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
            }
        }

        return dp[m - 1][n - 1];
    }

    // Space optimized (only need previous row)
    public static int uniquePathsOptimized(int m, int n) {
        int[] dp = new int[n];
        Arrays.fill(dp, 1);

        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                dp[j] += dp[j - 1];
            }
        }

        return dp[n - 1];
    }
}
```

### **Pattern 2: Minimum Path Sum**

#### **Find Path with Minimum Sum**

```java
public class MinimumPathSum {

    // Bottom-up approach
    public static int minPathSum(int[][] grid) {
        int m = grid.length;
        int n = grid[0].length;

        int[][] dp = new int[m][n];
        dp[0][0] = grid[0][0];

        // Initialize first row
        for (int j = 1; j < n; j++) {
            dp[0][j] = dp[0][j - 1] + grid[0][j];
        }

        // Initialize first column
        for (int i = 1; i < m; i++) {
            dp[i][0] = dp[i - 1][0] + grid[i][0];
        }

        // Fill the rest
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1]) + grid[i][j];
            }
        }

        return dp[m - 1][n - 1];
    }

    // Space optimized (modify input grid)
    public static int minPathSumOptimized(int[][] grid) {
        int m = grid.length;
        int n = grid[0].length;

        // Initialize first row
        for (int j = 1; j < n; j++) {
            grid[0][j] += grid[0][j - 1];
        }

        // Initialize first column
        for (int i = 1; i < m; i++) {
            grid[i][0] += grid[i - 1][0];
        }

        // Fill the rest
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                grid[i][j] += Math.min(grid[i - 1][j], grid[i][j - 1]);
            }
        }

        return grid[m - 1][n - 1];
    }
}
```

## 📊 **DP Problem Classification**

### **Linear DP (1D)**

| Problem          | State | Transition                      | Example               |
| ---------------- | ----- | ------------------------------- | --------------------- |
| Fibonacci        | dp[i] | dp[i-1] + dp[i-2]               | Climbing stairs       |
| Maximum Subarray | dp[i] | max(nums[i], dp[i-1] + nums[i]) | Kadane's algorithm    |
| House Robber     | dp[i] | max(dp[i-1], nums[i] + dp[i-2]) | Non-adjacent elements |

### **Grid DP (2D)**

| Problem          | State    | Transition                               | Example           |
| ---------------- | -------- | ---------------------------------------- | ----------------- |
| Unique Paths     | dp[i][j] | dp[i-1][j] + dp[i][j-1]                  | Grid traversal    |
| Minimum Path Sum | dp[i][j] | min(dp[i-1][j], dp[i][j-1]) + grid[i][j] | Weighted paths    |
| Edit Distance    | dp[i][j] | min(insert, delete, replace)             | String similarity |

## 🎯 **DP Template & Strategy**

### **General DP Template**

```java
public class DPTemplate {

    // Top-down template
    public static int topDownDP(/* parameters */) {
        Map<String, Integer> memo = new HashMap<>();
        return solve(/* initial state */, memo);
    }

    private static int solve(/* current state */, Map<String, Integer> memo) {
        // Base case
        if (/* base condition */) {
            return /* base result */;
        }

        // Check memo
        String key = /* create key from state */;
        if (memo.containsKey(key)) {
            return memo.get(key);
        }

        // Try all possible choices
        int result = /* initial value */;
        for (/* each choice */) {
            int subResult = solve(/* new state */, memo);
            result = /* combine subResult with current result */;
        }

        // Store in memo
        memo.put(key, result);
        return result;
    }

    // Bottom-up template
    public static int bottomUpDP(/* parameters */) {
        // Create DP table
        int[] dp = new int[/* size */];

        // Initialize base cases
        dp[0] = /* base value */;

        // Fill table
        for (int i = 1; i < dp.length; i++) {
            // Try all choices for state i
            for (/* each choice */) {
                dp[i] = /* optimal choice */;
            }
        }

        return dp[/* final state */];
    }
}
```

### **5-Step DP Strategy**

1. **Define the state**: What does dp[i] represent?
2. **Find the transition**: How to compute dp[i] from previous states?
3. **Initialize base cases**: What are the starting values?
4. **Determine the order**: In what order to fill the table?
5. **Find the answer**: Where is the final result?

## 🔧 **Common DP Patterns**

### **Decision Making**

- **House Robber**: Choose to rob or skip each house
- **Best Time to Buy/Sell Stock**: Choose to buy, sell, or hold

### **Path Counting**

- **Unique Paths**: Count ways to reach destination
- **Decode Ways**: Count ways to decode string

### **Optimization**

- **Minimum Path Sum**: Find path with minimum cost
- **Maximum Subarray**: Find subarray with maximum sum

## 🎮 **Problem Categories**

### **Easy DP Problems**

1. **Climbing Stairs** - Basic linear DP
2. **House Robber** - Decision making
3. **Maximum Subarray** - Kadane's algorithm
4. **Range Sum Query** - Prefix sums

### **Medium DP Problems**

1. **Coin Change** - Optimization problem
2. **Unique Paths** - 2D grid DP
3. **Longest Increasing Subsequence** - Sequence DP
4. **Word Break** - String DP

### **Hard DP Problems**

1. **Edit Distance** - 2D string DP
2. **Regular Expression Matching** - Complex pattern matching
3. **Burst Balloons** - Interval DP
4. **Palindrome Partitioning II** - String partitioning

---

_Master dynamic programming to efficiently solve optimization problems by breaking them into overlapping subproblems!_
