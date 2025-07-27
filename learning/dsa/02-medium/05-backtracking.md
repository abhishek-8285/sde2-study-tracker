# Backtracking 🔙

## 🎯 **Overview**

Backtracking is a systematic method for solving problems by trying partial solutions and abandoning them ("backtracking") if they cannot lead to a complete solution. It's essentially a depth-first search of the solution space with pruning.

## 💡 **Core Concept**

### **Backtracking Algorithm Pattern**

```
1. Choose: Make a choice from available options
2. Explore: Recursively explore the consequences
3. Unchoose: Undo the choice (backtrack) when done exploring
```

### **General Template**

```java
public class BacktrackingTemplate {

    public static void backtrack(/* parameters */) {
        // Base case - found solution
        if (/* solution is complete */) {
            // Process/store solution
            return;
        }

        // Try all possible choices
        for (/* each possible choice */) {
            // Make choice
            /* add choice to current solution */

            // Explore
            backtrack(/* updated parameters */);

            // Unmake choice (backtrack)
            /* remove choice from current solution */
        }
    }
}
```

## 🎮 **Classic Backtracking Problems**

### **Pattern 1: Permutations**

#### **Generate All Permutations**

```java
import java.util.*;

public class Permutations {

    // Generate all permutations of an array
    public static List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        List<Integer> currentPerm = new ArrayList<>();
        boolean[] used = new boolean[nums.length];

        backtrack(nums, currentPerm, used, result);
        return result;
    }

    private static void backtrack(int[] nums, List<Integer> currentPerm,
                                  boolean[] used, List<List<Integer>> result) {
        // Base case - permutation is complete
        if (currentPerm.size() == nums.length) {
            result.add(new ArrayList<>(currentPerm));
            return;
        }

        // Try each unused number
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;

            // Make choice
            currentPerm.add(nums[i]);
            used[i] = true;

            // Explore
            backtrack(nums, currentPerm, used, result);

            // Unmake choice (backtrack)
            currentPerm.remove(currentPerm.size() - 1);
            used[i] = false;
        }
    }
}
```

**Execution Trace for [1,2,3]:**

```
Start: currentPerm=[], used=[F,F,F]

Choose 1: currentPerm=[1], used=[T,F,F]
  Choose 2: currentPerm=[1,2], used=[T,T,F]
    Choose 3: currentPerm=[1,2,3], used=[T,T,T] → Add [1,2,3]
    Backtrack: currentPerm=[1,2], used=[T,T,F]
  Backtrack: currentPerm=[1], used=[T,F,F]
  Choose 3: currentPerm=[1,3], used=[T,F,T]
    Choose 2: currentPerm=[1,3,2], used=[T,T,T] → Add [1,3,2]
    Backtrack: currentPerm=[1,3], used=[T,F,T]
  Backtrack: currentPerm=[1], used=[T,F,F]
Backtrack: currentPerm=[], used=[F,F,F]

... continue for starting with 2 and 3
```

### **Pattern 2: Combinations**

#### **Generate All Combinations**

```java
public class Combinations {

    // Generate all combinations of k numbers from 1 to n
    public static List<List<Integer>> combine(int n, int k) {
        List<List<Integer>> result = new ArrayList<>();
        List<Integer> currentComb = new ArrayList<>();

        backtrack(1, n, k, currentComb, result);
        return result;
    }

    private static void backtrack(int start, int n, int k,
                                  List<Integer> currentComb,
                                  List<List<Integer>> result) {
        // Base case - combination is complete
        if (currentComb.size() == k) {
            result.add(new ArrayList<>(currentComb));
            return;
        }

        // Try numbers from start to n
        for (int i = start; i <= n; i++) {
            // Make choice
            currentComb.add(i);

            // Explore (next number must be > current)
            backtrack(i + 1, n, k, currentComb, result);

            // Unmake choice (backtrack)
            currentComb.remove(currentComb.size() - 1);
        }
    }

    // Combination Sum - numbers can be reused
    public static List<List<Integer>> combinationSum(int[] candidates, int target) {
        List<List<Integer>> result = new ArrayList<>();
        List<Integer> currentComb = new ArrayList<>();
        Arrays.sort(candidates); // Sort for optimization

        backtrackSum(candidates, target, 0, currentComb, result);
        return result;
    }

    private static void backtrackSum(int[] candidates, int target, int start,
                                     List<Integer> currentComb,
                                     List<List<Integer>> result) {
        // Base case - found target sum
        if (target == 0) {
            result.add(new ArrayList<>(currentComb));
            return;
        }

        // Base case - exceeded target
        if (target < 0) {
            return;
        }

        // Try each candidate from start index
        for (int i = start; i < candidates.length; i++) {
            // Optimization: if current candidate > target, skip rest
            if (candidates[i] > target) break;

            // Make choice
            currentComb.add(candidates[i]);

            // Explore (can reuse same number, so pass i not i+1)
            backtrackSum(candidates, target - candidates[i], i, currentComb, result);

            // Unmake choice
            currentComb.remove(currentComb.size() - 1);
        }
    }
}
```

### **Pattern 3: Subsets**

#### **Generate All Subsets**

```java
public class Subsets {

    // Generate all subsets (power set)
    public static List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        List<Integer> currentSubset = new ArrayList<>();

        backtrack(nums, 0, currentSubset, result);
        return result;
    }

    private static void backtrack(int[] nums, int start,
                                  List<Integer> currentSubset,
                                  List<List<Integer>> result) {
        // Add current subset to result (every recursive call adds a subset)
        result.add(new ArrayList<>(currentSubset));

        // Try adding each remaining number
        for (int i = start; i < nums.length; i++) {
            // Make choice
            currentSubset.add(nums[i]);

            // Explore
            backtrack(nums, i + 1, currentSubset, result);

            // Unmake choice
            currentSubset.remove(currentSubset.size() - 1);
        }
    }

    // Iterative approach (bit manipulation)
    public static List<List<Integer>> subsetsIterative(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        int n = nums.length;

        // Generate all 2^n possible subsets
        for (int mask = 0; mask < (1 << n); mask++) {
            List<Integer> subset = new ArrayList<>();

            for (int i = 0; i < n; i++) {
                // Check if i-th bit is set
                if ((mask & (1 << i)) != 0) {
                    subset.add(nums[i]);
                }
            }

            result.add(subset);
        }

        return result;
    }
}
```

### **Pattern 4: N-Queens Problem**

#### **Classic Constraint Satisfaction**

```java
public class NQueens {

    public static List<List<String>> solveNQueens(int n) {
        List<List<String>> result = new ArrayList<>();
        char[][] board = new char[n][n];

        // Initialize board
        for (int i = 0; i < n; i++) {
            Arrays.fill(board[i], '.');
        }

        backtrack(board, 0, result);
        return result;
    }

    private static void backtrack(char[][] board, int row,
                                  List<List<String>> result) {
        int n = board.length;

        // Base case - all queens placed
        if (row == n) {
            result.add(createBoard(board));
            return;
        }

        // Try placing queen in each column of current row
        for (int col = 0; col < n; col++) {
            if (isValid(board, row, col)) {
                // Make choice
                board[row][col] = 'Q';

                // Explore
                backtrack(board, row + 1, result);

                // Unmake choice
                board[row][col] = '.';
            }
        }
    }

    private static boolean isValid(char[][] board, int row, int col) {
        int n = board.length;

        // Check column
        for (int i = 0; i < row; i++) {
            if (board[i][col] == 'Q') return false;
        }

        // Check diagonal (top-left to bottom-right)
        for (int i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--) {
            if (board[i][j] == 'Q') return false;
        }

        // Check diagonal (top-right to bottom-left)
        for (int i = row - 1, j = col + 1; i >= 0 && j < n; i--, j++) {
            if (board[i][j] == 'Q') return false;
        }

        return true;
    }

    private static List<String> createBoard(char[][] board) {
        List<String> result = new ArrayList<>();
        for (char[] row : board) {
            result.add(new String(row));
        }
        return result;
    }
}
```

### **Pattern 5: Word Search**

#### **Find Word in Grid**

```java
public class WordSearch {

    public static boolean exist(char[][] board, String word) {
        int m = board.length;
        int n = board[0].length;

        // Try starting from each cell
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (backtrack(board, word, 0, i, j)) {
                    return true;
                }
            }
        }

        return false;
    }

    private static boolean backtrack(char[][] board, String word,
                                     int index, int row, int col) {
        // Base case - found complete word
        if (index == word.length()) {
            return true;
        }

        // Boundary checks
        if (row < 0 || row >= board.length ||
            col < 0 || col >= board[0].length ||
            board[row][col] != word.charAt(index)) {
            return false;
        }

        // Make choice (mark as visited)
        char temp = board[row][col];
        board[row][col] = '#';

        // Explore all 4 directions
        boolean found = backtrack(board, word, index + 1, row + 1, col) ||
                        backtrack(board, word, index + 1, row - 1, col) ||
                        backtrack(board, word, index + 1, row, col + 1) ||
                        backtrack(board, word, index + 1, row, col - 1);

        // Unmake choice (restore original character)
        board[row][col] = temp;

        return found;
    }
}
```

## 🧩 **Advanced Backtracking Patterns**

### **Pattern 1: Sudoku Solver**

```java
public class SudokuSolver {

    public static void solveSudoku(char[][] board) {
        solve(board);
    }

    private static boolean solve(char[][] board) {
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                if (board[row][col] == '.') {
                    // Try digits 1-9
                    for (char digit = '1'; digit <= '9'; digit++) {
                        if (isValid(board, row, col, digit)) {
                            // Make choice
                            board[row][col] = digit;

                            // Explore
                            if (solve(board)) {
                                return true;
                            }

                            // Unmake choice
                            board[row][col] = '.';
                        }
                    }
                    return false; // No valid digit found
                }
            }
        }
        return true; // Board is complete
    }

    private static boolean isValid(char[][] board, int row, int col, char digit) {
        // Check row
        for (int j = 0; j < 9; j++) {
            if (board[row][j] == digit) return false;
        }

        // Check column
        for (int i = 0; i < 9; i++) {
            if (board[i][col] == digit) return false;
        }

        // Check 3x3 box
        int boxRow = (row / 3) * 3;
        int boxCol = (col / 3) * 3;
        for (int i = boxRow; i < boxRow + 3; i++) {
            for (int j = boxCol; j < boxCol + 3; j++) {
                if (board[i][j] == digit) return false;
            }
        }

        return true;
    }
}
```

### **Pattern 2: Generate Parentheses**

```java
public class GenerateParentheses {

    public static List<String> generateParenthesis(int n) {
        List<String> result = new ArrayList<>();
        backtrack("", 0, 0, n, result);
        return result;
    }

    private static void backtrack(String current, int open, int close,
                                  int max, List<String> result) {
        // Base case - used all parentheses
        if (current.length() == max * 2) {
            result.add(current);
            return;
        }

        // Add opening parenthesis if we haven't used all
        if (open < max) {
            backtrack(current + "(", open + 1, close, max, result);
        }

        // Add closing parenthesis if it won't make string invalid
        if (close < open) {
            backtrack(current + ")", open, close + 1, max, result);
        }
    }
}
```

## 📊 **Complexity Analysis**

### **Time Complexity Patterns**

- **Permutations**: O(n! × n) - n! permutations, each takes O(n) to construct
- **Combinations**: O(2^n × n) - 2^n subsets, each takes O(n) to construct
- **N-Queens**: O(N!) - pruning reduces from N^N to approximately N!
- **Sudoku**: O(9^(empty_cells)) - worst case, but heavy pruning in practice

### **Space Complexity**

- **Recursion Stack**: O(depth) where depth is maximum recursion depth
- **Solution Storage**: O(number_of_solutions × solution_size)
- **Auxiliary Space**: O(n) for tracking choices/visited states

## 🎯 **Backtracking Optimization Techniques**

### **1. Early Termination**

```java
// Stop early if current path cannot lead to solution
if (/* impossible to complete */) {
    return;
}
```

### **2. Constraint Propagation**

```java
// Use problem constraints to avoid invalid choices
if (/* choice violates constraint */) {
    continue; // Skip this choice
}
```

### **3. Ordering Heuristics**

```java
// Try most promising choices first
Arrays.sort(choices, /* custom comparator */);
```

### **4. Symmetry Breaking**

```java
// Avoid generating symmetric solutions
if (/* solution is symmetric to previous */) {
    continue;
}
```

## 🎮 **Problem Categories**

### **Easy Backtracking Problems**

1. **Generate Parentheses** - String generation with constraints
2. **Letter Combinations** - Phone number mapping
3. **Subsets** - Power set generation
4. **Permutations** - All arrangements

### **Medium Problems**

1. **Combination Sum** - Target sum with reuse
2. **Word Search** - Grid traversal with constraints
3. **Palindrome Partitioning** - String partitioning
4. **Restore IP Addresses** - Constrained string splitting

### **Hard Problems**

1. **N-Queens** - Classic constraint satisfaction
2. **Sudoku Solver** - Complex constraint propagation
3. **Word Search II** - Multiple word search
4. **Expression Add Operators** - Mathematical expression generation

---

_Master backtracking to systematically explore solution spaces and solve complex combinatorial problems!_
