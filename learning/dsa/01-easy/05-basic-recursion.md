# Basic Recursion 🔄

## 🎯 **Overview**

Recursion is a problem-solving technique where a function calls itself to solve smaller instances of the same problem. It's fundamental to many algorithms and is essential for understanding tree traversals, dynamic programming, and divide-and-conquer approaches.

## 💡 **Core Concept**

Every recursive solution has two key components:

1. **Base Case**: The stopping condition that prevents infinite recursion
2. **Recursive Case**: The function calling itself with a modified/smaller input

```python
def recursive_function(input):
    # Base case - when to stop
    if stopping_condition:
        return base_result

    # Recursive case - function calls itself
    return recursive_function(modified_input)
```

## 🔧 **Fundamental Examples**

### **Example 1: Factorial**

Calculate n! = n × (n-1) × (n-2) × ... × 1

```python
def factorial(n):
    """
    Calculate factorial using recursion
    Time: O(n), Space: O(n) - call stack
    """
    # Base case
    if n <= 1:
        return 1

    # Recursive case
    return n * factorial(n - 1)
```

**Call Stack Visualization:**

```
factorial(4)
├── 4 * factorial(3)
│   ├── 3 * factorial(2)
│   │   ├── 2 * factorial(1)
│   │   │   └── 1 (base case)
│   │   └── 2 * 1 = 2
│   └── 3 * 2 = 6
└── 4 * 6 = 24

Call Stack Evolution:
factorial(4) → factorial(3) → factorial(2) → factorial(1)
    ↓             ↓             ↓             ↓
   24   ←        6    ←        2    ←        1
```

### **Example 2: Fibonacci Sequence**

F(n) = F(n-1) + F(n-2), where F(0)=0, F(1)=1

```python
def fibonacci(n):
    """
    Calculate nth Fibonacci number
    Time: O(2^n), Space: O(n) - inefficient but educational
    """
    # Base cases
    if n <= 1:
        return n

    # Recursive case
    return fibonacci(n - 1) + fibonacci(n - 2)

# Optimized version with memoization
def fibonacci_memo(n, memo={}):
    """
    Optimized Fibonacci with memoization
    Time: O(n), Space: O(n)
    """
    if n in memo:
        return memo[n]

    if n <= 1:
        return n

    memo[n] = fibonacci_memo(n - 1, memo) + fibonacci_memo(n - 2, memo)
    return memo[n]
```

**Recursion Tree for fibonacci(5):**

```
                fibonacci(5)
               /            \
        fibonacci(4)      fibonacci(3)
        /         \        /         \
   fib(3)       fib(2)  fib(2)     fib(1)
   /   \        /   \    /   \        |
fib(2) fib(1) fib(1) fib(0) fib(1) fib(0)  1
/   \    |      |      |      |      |
fib(1) fib(0) 1     1     0     1     0
  |      |
  1      0

Result: 5
```

### **Example 3: Array Sum**

Calculate sum of all elements in array

```python
def array_sum(arr, index=0):
    """
    Calculate sum using recursion
    Time: O(n), Space: O(n)
    """
    # Base case - reached end of array
    if index >= len(arr):
        return 0

    # Recursive case - current element + sum of rest
    return arr[index] + array_sum(arr, index + 1)

# Alternative approach
def array_sum_slice(arr):
    """Using array slicing (creates new arrays)"""
    # Base case
    if not arr:
        return 0

    # Recursive case
    return arr[0] + array_sum_slice(arr[1:])
```

**Execution trace for [1, 2, 3, 4]:**

```
array_sum([1,2,3,4], 0)
├── 1 + array_sum([1,2,3,4], 1)
│   ├── 2 + array_sum([1,2,3,4], 2)
│   │   ├── 3 + array_sum([1,2,3,4], 3)
│   │   │   ├── 4 + array_sum([1,2,3,4], 4)
│   │   │   │   └── 0 (base case)
│   │   │   └── 4 + 0 = 4
│   │   └── 3 + 4 = 7
│   └── 2 + 7 = 9
└── 1 + 9 = 10
```

## 🎮 **Common Recursive Patterns**

### **Pattern 1: Linear Recursion**

Each function call makes exactly one recursive call.

```python
def linear_search(arr, target, index=0):
    """Find target in array using recursion"""
    # Base case - not found
    if index >= len(arr):
        return -1

    # Base case - found
    if arr[index] == target:
        return index

    # Recursive case
    return linear_search(arr, target, index + 1)

def reverse_string(s):
    """Reverse string using recursion"""
    # Base case
    if len(s) <= 1:
        return s

    # Recursive case
    return s[-1] + reverse_string(s[:-1])
```

### **Pattern 2: Binary Recursion**

Each function call makes two recursive calls.

```python
def binary_search(arr, target, left=0, right=None):
    """Binary search using recursion"""
    if right is None:
        right = len(arr) - 1

    # Base case - not found
    if left > right:
        return -1

    mid = (left + right) // 2

    # Base case - found
    if arr[mid] == target:
        return mid

    # Recursive cases
    if arr[mid] > target:
        return binary_search(arr, target, left, mid - 1)
    else:
        return binary_search(arr, target, mid + 1, right)

def tower_of_hanoi(n, source, destination, auxiliary):
    """Solve Tower of Hanoi puzzle"""
    if n == 1:
        print(f"Move disk from {source} to {destination}")
        return

    # Move n-1 disks to auxiliary
    tower_of_hanoi(n - 1, source, auxiliary, destination)

    # Move largest disk to destination
    print(f"Move disk from {source} to {destination}")

    # Move n-1 disks from auxiliary to destination
    tower_of_hanoi(n - 1, auxiliary, destination, source)
```

### **Pattern 3: Tree Recursion**

Multiple recursive calls exploring different branches.

```python
def generate_permutations(arr):
    """Generate all permutations of array"""
    # Base case
    if len(arr) <= 1:
        return [arr]

    result = []
    for i in range(len(arr)):
        # Fix current element
        current = arr[i]
        remaining = arr[:i] + arr[i+1:]

        # Generate permutations of remaining elements
        for perm in generate_permutations(remaining):
            result.append([current] + perm)

    return result

def count_paths(grid, row=0, col=0):
    """Count paths in grid from top-left to bottom-right"""
    rows, cols = len(grid), len(grid[0])

    # Base cases
    if row >= rows or col >= cols:
        return 0
    if row == rows - 1 and col == cols - 1:
        return 1

    # Recursive cases - move right or down
    return (count_paths(grid, row, col + 1) +
            count_paths(grid, row + 1, col))
```

## 🧠 **Thinking Recursively**

### **Step-by-Step Approach**

1. **Identify the base case**: When should recursion stop?
2. **Define the recursive relationship**: How does the problem relate to smaller versions?
3. **Ensure progress toward base case**: Each call should get closer to the base case
4. **Combine results**: How do you use the result from recursive calls?

### **Example: Power Function**

Calculate x^n using recursion

```python
def power(x, n):
    """
    Calculate x^n using recursion
    Time: O(log n) with optimization, O(n) without
    """
    # Base cases
    if n == 0:
        return 1
    if n == 1:
        return x

    # Optimization: use the fact that x^n = (x^(n/2))^2
    if n % 2 == 0:
        half_power = power(x, n // 2)
        return half_power * half_power
    else:
        return x * power(x, n - 1)
```

**Optimized vs Naive approach:**

```
Naive: power(2, 8) = 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2  (8 multiplications)

Optimized:
power(2, 8)
├── half_power = power(2, 4)
│   ├── half_power = power(2, 2)
│   │   ├── half_power = power(2, 1) = 2
│   │   └── 2 * 2 = 4
│   └── 4 * 4 = 16
└── 16 * 16 = 256

Only 3 multiplications!
```

## 📊 **Complexity Analysis**

### **Time Complexity Patterns**

```python
# Linear recursion: T(n) = T(n-1) + O(1) → O(n)
def factorial(n):
    if n <= 1: return 1
    return n * factorial(n-1)

# Binary recursion (unoptimized): T(n) = 2*T(n-1) + O(1) → O(2^n)
def fibonacci(n):
    if n <= 1: return n
    return fibonacci(n-1) + fibonacci(n-2)

# Divide and conquer: T(n) = T(n/2) + O(1) → O(log n)
def binary_search(arr, target, left, right):
    if left > right: return -1
    mid = (left + right) // 2
    if arr[mid] == target: return mid
    elif arr[mid] > target: return binary_search(arr, target, left, mid-1)
    else: return binary_search(arr, target, mid+1, right)
```

### **Space Complexity**

- **Call Stack Depth**: Maximum number of function calls on the stack
- **Linear Recursion**: O(n) space due to call stack
- **Binary Recursion**: O(n) space in worst case
- **Tail Recursion**: Can be optimized to O(1) space (not in Python)

## 🔧 **Common Recursive Problems**

### **String Problems**

```python
def is_palindrome_recursive(s, left=0, right=None):
    """Check if string is palindrome"""
    if right is None:
        right = len(s) - 1

    # Base cases
    if left >= right:
        return True

    # Recursive case
    if s[left] != s[right]:
        return False

    return is_palindrome_recursive(s, left + 1, right - 1)

def count_vowels(s, index=0):
    """Count vowels in string"""
    # Base case
    if index >= len(s):
        return 0

    # Recursive case
    count = 1 if s[index].lower() in 'aeiou' else 0
    return count + count_vowels(s, index + 1)
```

### **Array Problems**

```python
def find_max(arr, index=0):
    """Find maximum element in array"""
    # Base case
    if index == len(arr) - 1:
        return arr[index]

    # Recursive case
    max_rest = find_max(arr, index + 1)
    return max(arr[index], max_rest)

def merge_sorted_arrays(arr1, arr2, i=0, j=0, result=None):
    """Merge two sorted arrays"""
    if result is None:
        result = []

    # Base cases
    if i >= len(arr1):
        return result + arr2[j:]
    if j >= len(arr2):
        return result + arr1[i:]

    # Recursive cases
    if arr1[i] <= arr2[j]:
        result.append(arr1[i])
        return merge_sorted_arrays(arr1, arr2, i + 1, j, result)
    else:
        result.append(arr2[j])
        return merge_sorted_arrays(arr1, arr2, i, j + 1, result)
```

## 💡 **Best Practices & Tips**

### **✅ Good Practices**

- Always define clear base cases
- Ensure each recursive call progresses toward base case
- Consider iterative alternatives for simple cases
- Use memoization to avoid redundant calculations
- Think about the problem in terms of subproblems

### **🔧 Optimization Techniques**

```python
# Memoization example
def fibonacci_optimized(n, memo={}):
    if n in memo:
        return memo[n]

    if n <= 1:
        return n

    memo[n] = fibonacci_optimized(n-1, memo) + fibonacci_optimized(n-2, memo)
    return memo[n]

# Tail recursion (convert to iteration in Python)
def factorial_iterative(n):
    result = 1
    for i in range(1, n + 1):
        result *= i
    return result
```

### **🐛 Common Pitfalls**

- **Missing base case**: Leads to infinite recursion
- **Incorrect base case**: Wrong stopping condition
- **No progress**: Recursive calls don't get closer to base case
- **Stack overflow**: Too many recursive calls for large inputs
- **Redundant calculations**: Not using memoization when needed

## 🎯 **Problem Categories**

### **Easy Recursive Problems**

1. **Factorial** - Basic recursion concept
2. **Sum of Array** - Linear recursion
3. **Reverse String** - String manipulation
4. **Count Digits** - Number processing
5. **Power Function** - Mathematical recursion

### **Medium Recursive Problems**

1. **Fibonacci with Memoization** - Optimization
2. **Binary Search** - Divide and conquer
3. **Permutations/Combinations** - Tree recursion
4. **Tower of Hanoi** - Classic problem
5. **Path Counting** - Grid problems

## 📚 **Next Steps**

- [Stack & Queue](./06-stack-queue.md) - Data structures that use recursion concepts
- [Trees & Tree Traversal](../02-medium/03-trees.md) - Advanced recursion applications
- [Dynamic Programming](../02-medium/04-dp-basics.md) - Optimized recursion

---

_Master recursion by thinking in terms of smaller subproblems and always defining clear base cases!_
