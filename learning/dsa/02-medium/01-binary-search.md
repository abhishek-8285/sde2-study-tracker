# Binary Search 🔍

## 🎯 **Overview**

Binary Search is a highly efficient searching algorithm that works on sorted arrays by repeatedly dividing the search space in half. It's one of the most fundamental algorithms in computer science with O(log n) time complexity.

## 💡 **Core Principle**

Binary search works by comparing the target value with the middle element:

- If equal: Found the target
- If target is smaller: Search the left half
- If target is larger: Search the right half

**Key Requirements:**

- ✅ Array must be sorted
- ✅ Random access to elements (arrays, not linked lists)
- ✅ Clear comparison criteria

## 🔧 **Basic Implementation**

### **Iterative Approach**

```python
def binary_search(arr, target):
    """
    Classic binary search implementation
    Time: O(log n), Space: O(1)
    """
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = left + (right - left) // 2  # Prevent overflow

        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1  # Search right half
        else:
            right = mid - 1  # Search left half

    return -1  # Not found
```

### **Recursive Approach**

```python
def binary_search_recursive(arr, target, left=0, right=None):
    """
    Recursive binary search
    Time: O(log n), Space: O(log n) - call stack
    """
    if right is None:
        right = len(arr) - 1

    # Base case - not found
    if left > right:
        return -1

    mid = left + (right - left) // 2

    # Base case - found
    if arr[mid] == target:
        return mid

    # Recursive cases
    if arr[mid] < target:
        return binary_search_recursive(arr, target, mid + 1, right)
    else:
        return binary_search_recursive(arr, target, left, mid - 1)
```

## 📊 **Visual Step-by-Step Example**

**Array: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], Target: 7**

```
Step 1: left=0, right=9, mid=4
[1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
 ↑        ↑              ↑
left     mid           right
arr[4] = 9 > 7, search left half

Step 2: left=0, right=3, mid=1
[1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
 ↑  ↑     ↑
left mid right
arr[1] = 3 < 7, search right half

Step 3: left=2, right=3, mid=2
[1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
       ↑  ↑
      mid right
     left
arr[2] = 5 < 7, search right half

Step 4: left=3, right=3, mid=3
[1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
          ↑
      left/mid/right
arr[3] = 7 = 7, FOUND! Return index 3
```

## 🎮 **Binary Search Variations**

### **Variation 1: Find First Occurrence**

```python
def find_first_occurrence(arr, target):
    """
    Find the first occurrence of target in sorted array with duplicates
    Time: O(log n), Space: O(1)
    """
    left, right = 0, len(arr) - 1
    result = -1

    while left <= right:
        mid = left + (right - left) // 2

        if arr[mid] == target:
            result = mid  # Store potential answer
            right = mid - 1  # Continue searching left for first occurrence
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return result
```

### **Variation 2: Find Last Occurrence**

```python
def find_last_occurrence(arr, target):
    """
    Find the last occurrence of target in sorted array with duplicates
    Time: O(log n), Space: O(1)
    """
    left, right = 0, len(arr) - 1
    result = -1

    while left <= right:
        mid = left + (right - left) // 2

        if arr[mid] == target:
            result = mid  # Store potential answer
            left = mid + 1  # Continue searching right for last occurrence
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return result
```

### **Variation 3: Find Insert Position**

```python
def search_insert_position(arr, target):
    """
    Find position where target should be inserted to maintain sorted order
    Time: O(log n), Space: O(1)
    """
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = left + (right - left) // 2

        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return left  # Insert position
```

**Example: [1, 3, 5, 6], target = 4**

```
Final state: left=2, right=1
Insert position = left = 2
Result array: [1, 3, 4, 5, 6]
                    ↑
                position 2
```

## 🔄 **Advanced Binary Search Patterns**

### **Pattern 1: Search in Rotated Sorted Array**

```python
def search_rotated_array(nums, target):
    """
    Search in rotated sorted array
    Example: [4,5,6,7,0,1,2], target = 0
    Time: O(log n), Space: O(1)
    """
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2

        if nums[mid] == target:
            return mid

        # Check which half is sorted
        if nums[left] <= nums[mid]:  # Left half is sorted
            if nums[left] <= target < nums[mid]:
                right = mid - 1  # Target in left half
            else:
                left = mid + 1   # Target in right half
        else:  # Right half is sorted
            if nums[mid] < target <= nums[right]:
                left = mid + 1   # Target in right half
            else:
                right = mid - 1  # Target in left half

    return -1
```

**Visualization for [4,5,6,7,0,1,2], target = 0:**

```
Step 1: left=0, right=6, mid=3
[4, 5, 6, 7, 0, 1, 2]
 ↑        ↑        ↑
left     mid     right
nums[0]=4 <= nums[3]=7 → left half sorted
target=0 not in [4,7) → search right half

Step 2: left=4, right=6, mid=5
[4, 5, 6, 7, 0, 1, 2]
             ↑  ↑  ↑
           left mid right
nums[4]=0 > nums[5]=1 → right half sorted
target=0 not in (1,2] → search left half

Step 3: left=4, right=4, mid=4
[4, 5, 6, 7, 0, 1, 2]
             ↑
         left/mid/right
nums[4] = 0 = target, FOUND!
```

### **Pattern 2: Find Peak Element**

```python
def find_peak_element(nums):
    """
    Find any peak element (element greater than neighbors)
    Time: O(log n), Space: O(1)
    """
    left, right = 0, len(nums) - 1

    while left < right:
        mid = left + (right - left) // 2

        if nums[mid] > nums[mid + 1]:
            # Peak is in left half (including mid)
            right = mid
        else:
            # Peak is in right half
            left = mid + 1

    return left  # left == right at peak
```

### **Pattern 3: Square Root (Integer)**

```python
def my_sqrt(x):
    """
    Find integer square root using binary search
    Time: O(log x), Space: O(1)
    """
    if x < 2:
        return x

    left, right = 2, x // 2

    while left <= right:
        mid = left + (right - left) // 2
        square = mid * mid

        if square == x:
            return mid
        elif square < x:
            left = mid + 1
        else:
            right = mid - 1

    return right  # Largest integer whose square <= x
```

## 🎯 **Binary Search on Answer**

This powerful technique uses binary search to find optimal values in optimization problems.

### **Example: Minimum Days to Make Bouquets**

```python
def min_days_bouquets(bloom_day, m, k):
    """
    Find minimum days to make m bouquets, each needing k adjacent flowers
    Time: O(n * log(max_day)), Space: O(1)
    """
    if m * k > len(bloom_day):
        return -1

    def can_make_bouquets(days):
        """Check if we can make m bouquets in given days"""
        bouquets = consecutive = 0

        for bloom in bloom_day:
            if bloom <= days:
                consecutive += 1
                if consecutive == k:
                    bouquets += 1
                    consecutive = 0
            else:
                consecutive = 0

        return bouquets >= m

    left, right = min(bloom_day), max(bloom_day)

    while left < right:
        mid = left + (right - left) // 2

        if can_make_bouquets(mid):
            right = mid  # Try fewer days
        else:
            left = mid + 1  # Need more days

    return left
```

### **Template for Binary Search on Answer**

```python
def binary_search_answer(condition_func, left, right):
    """
    Generic template for binary search on answer
    Find minimum value that satisfies condition
    """
    while left < right:
        mid = left + (right - left) // 2

        if condition_func(mid):
            right = mid  # Try smaller value
        else:
            left = mid + 1  # Need larger value

    return left
```

## 📈 **Complexity Analysis & Comparison**

| Algorithm          | Time         | Space | Use Case            |
| ------------------ | ------------ | ----- | ------------------- |
| Linear Search      | O(n)         | O(1)  | Unsorted arrays     |
| Binary Search      | O(log n)     | O(1)  | Sorted arrays       |
| Hash Table         | O(1) avg     | O(n)  | Key-value lookup    |
| Binary Search Tree | O(log n) avg | O(n)  | Dynamic sorted data |

**Growth Comparison:**

```
n = 1,000,000

Linear Search: 1,000,000 operations
Binary Search: ~20 operations (log₂ 1,000,000)
Hash Table: ~1 operation (average)
```

## 🎮 **Common Problem Categories**

### **Easy Binary Search Problems**

1. **Classic Binary Search** - Find target in sorted array
2. **Search Insert Position** - Find insertion point
3. **First Bad Version** - API call optimization
4. **Valid Perfect Square** - Mathematical application

### **Medium Problems**

1. **Search in Rotated Array** - Modified binary search
2. **Find Peak Element** - Local optimization
3. **Search 2D Matrix** - 2D binary search
4. **Koko Eating Bananas** - Binary search on answer

### **Advanced Problems**

1. **Median of Two Sorted Arrays** - Complex binary search
2. **Split Array Largest Sum** - Binary search optimization
3. **Capacity to Ship Packages** - Constraint optimization
4. **Aggressive Cows** - Distance optimization

## 🔧 **Implementation Templates**

### **Template 1: Standard Binary Search**

```python
def binary_search_template(arr, target):
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = left + (right - left) // 2

        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1
```

### **Template 2: Left Boundary (First Occurrence)**

```python
def left_boundary_template(arr, target):
    left, right = 0, len(arr) - 1

    while left < right:
        mid = left + (right - left) // 2

        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid

    return left if arr[left] == target else -1
```

### **Template 3: Right Boundary (Last Occurrence)**

```python
def right_boundary_template(arr, target):
    left, right = 0, len(arr) - 1

    while left < right:
        mid = left + (right - left + 1) // 2  # Bias toward right

        if arr[mid] > target:
            right = mid - 1
        else:
            left = mid

    return left if arr[left] == target else -1
```

## 💡 **Key Tips & Best Practices**

### **✅ Best Practices**

- Use `left + (right - left) // 2` to prevent integer overflow
- Be careful with boundary conditions (`<=` vs `<`)
- Consider edge cases: empty array, single element, target not found
- Test with even and odd length arrays
- Verify the array is actually sorted

### **🔧 Common Variations**

- **Find first/last occurrence**: Modify condition to continue searching
- **Find insertion point**: Return left pointer when not found
- **Search in 2D matrix**: Treat as 1D array with coordinate conversion
- **Binary search on answer**: Search for optimal value in range

### **🐛 Common Pitfalls**

- Integer overflow in mid calculation
- Infinite loops due to incorrect boundary updates
- Off-by-one errors in boundary conditions
- Forgetting to handle empty arrays
- Not maintaining the invariant that answer lies in [left, right]

## 🎨 **Visual Learning Aid**

### **Binary Search Decision Tree**

```
Is arr[mid] == target?
├─ YES → Return mid
└─ NO
   ├─ arr[mid] < target → Search right half (left = mid + 1)
   └─ arr[mid] > target → Search left half (right = mid - 1)

Repeat until left > right (not found)
```

### **Search Space Reduction**

```
Initial: [1, 3, 5, 7, 9, 11, 13, 15], target = 7
         |←─────── Search Space ────────→|

Step 1:  [1, 3, 5, 7] 9, 11, 13, 15
         |←── New ──→|

Step 2:  1, 3, [5, 7]
               |←─→|

Step 3:  5, [7] → Found!
```

## 📚 **Next Steps**

- [Linked Lists](./02-linked-lists.md) - Dynamic data structures
- [Trees & Tree Traversal](./03-trees.md) - Hierarchical binary search
- [Dynamic Programming](./04-dp-basics.md) - Optimization techniques

---

_Master binary search to efficiently solve searching and optimization problems with logarithmic time complexity!_
