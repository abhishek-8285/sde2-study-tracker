# Advanced Dynamic Programming 💡

## 🎯 **Overview**

Advanced Dynamic Programming builds upon basic DP concepts to solve complex optimization problems involving multiple dimensions, states, and constraints. These problems often require sophisticated state design and transition logic.

## 💡 **Advanced DP Patterns**

### **Pattern 1: Interval DP**

Problems where we need to find optimal solutions for intervals and combine them.

#### **Matrix Chain Multiplication**

```java
public class MatrixChainMultiplication {

    // Find minimum scalar multiplications to multiply chain of matrices
    public static int matrixChainOrder(int[] dimensions) {
        int n = dimensions.length - 1; // number of matrices

        // dp[i][j] = minimum multiplications for matrices from i to j
        int[][] dp = new int[n][n];

        // Length of chain
        for (int length = 2; length <= n; length++) {
            for (int i = 0; i <= n - length; i++) {
                int j = i + length - 1;
                dp[i][j] = Integer.MAX_VALUE;

                // Try all possible split points
                for (int k = i; k < j; k++) {
                    int cost = dp[i][k] + dp[k + 1][j] +
                               dimensions[i] * dimensions[k + 1] * dimensions[j + 1];
                    dp[i][j] = Math.min(dp[i][j], cost);
                }
            }
        }

        return dp[0][n - 1];
    }

    // With memoization (top-down)
    public static int matrixChainMemo(int[] dimensions) {
        int n = dimensions.length - 1;
        int[][] memo = new int[n][n];

        // Initialize memo with -1
        for (int[] row : memo) {
            Arrays.fill(row, -1);
        }

        return matrixChainHelper(dimensions, 0, n - 1, memo);
    }

    private static int matrixChainHelper(int[] dimensions, int i, int j, int[][] memo) {
        if (i == j) return 0;

        if (memo[i][j] != -1) return memo[i][j];

        memo[i][j] = Integer.MAX_VALUE;
        for (int k = i; k < j; k++) {
            int cost = matrixChainHelper(dimensions, i, k, memo) +
                       matrixChainHelper(dimensions, k + 1, j, memo) +
                       dimensions[i] * dimensions[k + 1] * dimensions[j + 1];
            memo[i][j] = Math.min(memo[i][j], cost);
        }

        return memo[i][j];
    }
}
```

#### **Palindrome Partitioning II**

```java
public class PalindromePartitioning {

    // Minimum cuts to partition string into palindromes
    public static int minCut(String s) {
        int n = s.length();

        // Precompute palindrome check
        boolean[][] isPalindrome = new boolean[n][n];
        computePalindromes(s, isPalindrome);

        // dp[i] = minimum cuts for substring s[0...i]
        int[] dp = new int[n];

        for (int i = 0; i < n; i++) {
            if (isPalindrome[0][i]) {
                dp[i] = 0; // Entire substring is palindrome
            } else {
                dp[i] = i; // Worst case: cut after each character

                for (int j = 1; j <= i; j++) {
                    if (isPalindrome[j][i]) {
                        dp[i] = Math.min(dp[i], dp[j - 1] + 1);
                    }
                }
            }
        }

        return dp[n - 1];
    }

    private static void computePalindromes(String s, boolean[][] isPalindrome) {
        int n = s.length();

        // Single characters are palindromes
        for (int i = 0; i < n; i++) {
            isPalindrome[i][i] = true;
        }

        // Two character palindromes
        for (int i = 0; i < n - 1; i++) {
            isPalindrome[i][i + 1] = (s.charAt(i) == s.charAt(i + 1));
        }

        // Longer palindromes
        for (int length = 3; length <= n; length++) {
            for (int i = 0; i <= n - length; i++) {
                int j = i + length - 1;
                isPalindrome[i][j] = (s.charAt(i) == s.charAt(j)) &&
                                     isPalindrome[i + 1][j - 1];
            }
        }
    }
}
```

### **Pattern 2: State Machine DP**

Problems where we track different states and transitions between them.

#### **Best Time to Buy/Sell Stock with Cooldown**

```java
public class StockWithCooldown {

    // State: held[i] = max profit holding stock on day i
    //        sold[i] = max profit after selling stock on day i
    //        rest[i] = max profit resting on day i
    public static int maxProfit(int[] prices) {
        int n = prices.length;
        if (n <= 1) return 0;

        int[] held = new int[n];
        int[] sold = new int[n];
        int[] rest = new int[n];

        held[0] = -prices[0]; // Buy on day 0
        sold[0] = 0;          // Can't sell on day 0
        rest[0] = 0;          // Rest on day 0

        for (int i = 1; i < n; i++) {
            held[i] = Math.max(held[i - 1], rest[i - 1] - prices[i]);
            sold[i] = held[i - 1] + prices[i];
            rest[i] = Math.max(rest[i - 1], sold[i - 1]);
        }

        return Math.max(sold[n - 1], rest[n - 1]);
    }

    // Space optimized version
    public static int maxProfitOptimized(int[] prices) {
        int held = -prices[0];
        int sold = 0;
        int rest = 0;

        for (int i = 1; i < prices.length; i++) {
            int prevHeld = held;
            int prevSold = sold;
            int prevRest = rest;

            held = Math.max(prevHeld, prevRest - prices[i]);
            sold = prevHeld + prices[i];
            rest = Math.max(prevRest, prevSold);
        }

        return Math.max(sold, rest);
    }
}
```

#### **Paint House with K Colors**

```java
public class PaintHouseK {

    // Each house can be painted with k colors, no adjacent houses same color
    public static int minCostII(int[][] costs) {
        if (costs.length == 0) return 0;

        int n = costs.length;
        int k = costs[0].length;

        // dp[i][j] = minimum cost to paint houses 0 to i with house i painted color j
        int[][] dp = new int[n][k];

        // Initialize first house
        System.arraycopy(costs[0], 0, dp[0], 0, k);

        for (int i = 1; i < n; i++) {
            for (int j = 0; j < k; j++) {
                dp[i][j] = Integer.MAX_VALUE;

                // Try all colors for previous house except current color
                for (int prevColor = 0; prevColor < k; prevColor++) {
                    if (prevColor != j) {
                        dp[i][j] = Math.min(dp[i][j], dp[i - 1][prevColor] + costs[i][j]);
                    }
                }
            }
        }

        // Find minimum cost for last house with any color
        int result = Integer.MAX_VALUE;
        for (int j = 0; j < k; j++) {
            result = Math.min(result, dp[n - 1][j]);
        }

        return result;
    }

    // Optimized O(k) space solution
    public static int minCostIIOptimized(int[][] costs) {
        if (costs.length == 0) return 0;

        int n = costs.length;
        int k = costs[0].length;

        int[] prev = costs[0].clone();

        for (int i = 1; i < n; i++) {
            int[] curr = new int[k];

            // Find two minimum values from previous row
            int min1 = Integer.MAX_VALUE, min2 = Integer.MAX_VALUE;
            int min1Index = -1;

            for (int j = 0; j < k; j++) {
                if (prev[j] < min1) {
                    min2 = min1;
                    min1 = prev[j];
                    min1Index = j;
                } else if (prev[j] < min2) {
                    min2 = prev[j];
                }
            }

            for (int j = 0; j < k; j++) {
                curr[j] = costs[i][j] + (j == min1Index ? min2 : min1);
            }

            prev = curr;
        }

        return Arrays.stream(prev).min().getAsInt();
    }
}
```

### **Pattern 3: Digit DP**

For problems involving constraints on digits of numbers.

#### **Count Numbers with Specific Properties**

```java
public class DigitDP {

    // Count numbers from 1 to n with sum of digits equal to target
    public static int countNumbersWithSum(int n, int target) {
        String num = String.valueOf(n);
        Integer[][][] memo = new Integer[num.length()][target + 1][2];
        return solve(num, 0, target, 1, memo);
    }

    private static int solve(String num, int pos, int sum, int tight, Integer[][][] memo) {
        // Base case
        if (pos == num.length()) {
            return sum == 0 ? 1 : 0;
        }

        if (memo[pos][sum][tight] != null) {
            return memo[pos][sum][tight];
        }

        int limit = tight == 1 ? (num.charAt(pos) - '0') : 9;
        int result = 0;

        for (int digit = 0; digit <= limit; digit++) {
            if (sum >= digit) {
                int newTight = (tight == 1 && digit == limit) ? 1 : 0;
                result += solve(num, pos + 1, sum - digit, newTight, memo);
            }
        }

        return memo[pos][sum][tight] = result;
    }
}
```

### **Pattern 4: Bitmask DP**

For problems with subsets and permutations using bit manipulation.

#### **Traveling Salesman Problem**

```java
public class TravelingSalesman {

    public static int tsp(int[][] dist) {
        int n = dist.length;
        int[][] dp = new int[1 << n][n];

        // Initialize with infinity
        for (int[] row : dp) {
            Arrays.fill(row, Integer.MAX_VALUE);
        }

        // Start from city 0
        dp[1][0] = 0;

        for (int mask = 1; mask < (1 << n); mask++) {
            for (int u = 0; u < n; u++) {
                if ((mask & (1 << u)) == 0 || dp[mask][u] == Integer.MAX_VALUE) {
                    continue;
                }

                for (int v = 0; v < n; v++) {
                    if (mask & (1 << v)) continue;

                    int newMask = mask | (1 << v);
                    dp[newMask][v] = Math.min(dp[newMask][v], dp[mask][u] + dist[u][v]);
                }
            }
        }

        // Find minimum cost to return to start
        int result = Integer.MAX_VALUE;
        int finalMask = (1 << n) - 1;

        for (int i = 1; i < n; i++) {
            if (dp[finalMask][i] != Integer.MAX_VALUE) {
                result = Math.min(result, dp[finalMask][i] + dist[i][0]);
            }
        }

        return result;
    }
}
```

#### **Assignment Problem**

```java
public class AssignmentProblem {

    // Assign n tasks to n people with minimum cost
    public static int minAssignmentCost(int[][] cost) {
        int n = cost.length;
        int[] dp = new int[1 << n];
        Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;

        for (int mask = 0; mask < (1 << n); mask++) {
            if (dp[mask] == Integer.MAX_VALUE) continue;

            int person = Integer.bitCount(mask);
            if (person == n) continue;

            for (int task = 0; task < n; task++) {
                if ((mask & (1 << task)) == 0) {
                    int newMask = mask | (1 << task);
                    dp[newMask] = Math.min(dp[newMask], dp[mask] + cost[person][task]);
                }
            }
        }

        return dp[(1 << n) - 1];
    }
}
```

### **Pattern 5: Tree DP**

Dynamic programming on trees.

#### **Binary Tree Maximum Path Sum**

```java
public class TreePathSum {

    private static int maxSum = Integer.MIN_VALUE;

    public static int maxPathSum(TreeNode root) {
        maxSum = Integer.MIN_VALUE;
        maxPathSumHelper(root);
        return maxSum;
    }

    private static int maxPathSumHelper(TreeNode node) {
        if (node == null) return 0;

        // Get maximum sum from left and right subtrees (ignore negative paths)
        int leftSum = Math.max(0, maxPathSumHelper(node.left));
        int rightSum = Math.max(0, maxPathSumHelper(node.right));

        // Current path sum passing through this node
        int currentPathSum = node.val + leftSum + rightSum;
        maxSum = Math.max(maxSum, currentPathSum);

        // Return maximum path sum starting from this node
        return node.val + Math.max(leftSum, rightSum);
    }
}
```

#### **House Robber III (Tree)**

```java
public class HouseRobberTree {

    // Each node contains money, can't rob adjacent nodes
    public static int rob(TreeNode root) {
        int[] result = robHelper(root);
        return Math.max(result[0], result[1]);
    }

    // Returns [rob_this_node, dont_rob_this_node]
    private static int[] robHelper(TreeNode node) {
        if (node == null) return new int[]{0, 0};

        int[] left = robHelper(node.left);
        int[] right = robHelper(node.right);

        // If we rob this node, we can't rob children
        int robThis = node.val + left[1] + right[1];

        // If we don't rob this node, we take max from children
        int dontRobThis = Math.max(left[0], left[1]) + Math.max(right[0], right[1]);

        return new int[]{robThis, dontRobThis};
    }
}
```

## 🎯 **Advanced Optimization Techniques**

### **Space Optimization**

```java
public class SpaceOptimization {

    // 2D DP optimized to 1D when only previous row is needed
    public static int optimizedDP(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        int[] prev = new int[n];

        // Initialize first row
        prev[0] = grid[0][0];
        for (int j = 1; j < n; j++) {
            prev[j] = prev[j - 1] + grid[0][j];
        }

        for (int i = 1; i < m; i++) {
            int[] curr = new int[n];
            curr[0] = prev[0] + grid[i][0];

            for (int j = 1; j < n; j++) {
                curr[j] = Math.min(prev[j], curr[j - 1]) + grid[i][j];
            }

            prev = curr;
        }

        return prev[n - 1];
    }
}
```

### **Memory-Efficient Large DP**

```java
public class LargeDP {

    // When DP table is too large, use map for sparse states
    public static int sparseDP(int[] arr) {
        Map<String, Integer> memo = new HashMap<>();
        return solve(arr, 0, 0, memo);
    }

    private static int solve(int[] arr, int index, int sum, Map<String, Integer> memo) {
        if (index == arr.length) {
            return sum == 0 ? 1 : 0;
        }

        String key = index + "," + sum;
        if (memo.containsKey(key)) {
            return memo.get(key);
        }

        int result = solve(arr, index + 1, sum, memo) +
                     solve(arr, index + 1, sum - arr[index], memo);

        memo.put(key, result);
        return result;
    }
}
```

## 📊 **Complexity Analysis Patterns**

### **Time Complexity Guidelines**

- **1D DP**: Usually O(n) to O(n²)
- **2D DP**: Usually O(n²) to O(n³)
- **Interval DP**: Often O(n³)
- **Bitmask DP**: O(2ⁿ × n) or O(2ⁿ × n²)
- **Tree DP**: O(n) where n is number of nodes

### **Space Complexity Optimization**

- **Rolling Array**: Reduce 2D to 1D when only previous states needed
- **In-place**: Modify input array when possible
- **Sparse DP**: Use maps for large but sparse state spaces

## 🎮 **Problem Categories**

### **Advanced DP Problems**

1. **Edit Distance** - String transformation DP
2. **Regular Expression Matching** - Pattern matching DP
3. **Interleaving String** - Multi-string DP
4. **Burst Balloons** - Interval DP with multiplication

### **Expert Level**

1. **Stone Game IV** - Game theory DP
2. **Minimum Cost to Cut Stick** - Advanced interval DP
3. **Count Different Palindromic Subsequences** - String DP with constraints
4. **Profitable Schemes** - Multi-dimensional constraint DP

### **Contest Problems**

1. **SOS DP** - Sum over subsets
2. **Convex Hull Optimization** - Advanced DP optimization
3. **Divide and Conquer DP** - Optimize DP recurrence
4. **Matrix Exponentiation DP** - For very large constraints

---

_Master advanced DP patterns to solve complex optimization problems with sophisticated state management!_
