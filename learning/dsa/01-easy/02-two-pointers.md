# Two Pointers Technique 🔄

## 🎯 **Overview**

The Two Pointers technique is a powerful algorithmic approach that uses two pointers to traverse data structures, typically arrays or strings. It's particularly effective for problems involving pairs, palindromes, or sorted arrays.

## 💡 **When to Use Two Pointers**

✅ **Perfect for:**

- Finding pairs with specific sum
- Palindrome problems
- Reversing arrays/strings
- Merging sorted arrays
- Removing duplicates
- Partitioning arrays

❌ **Not ideal for:**

- Unsorted data (without additional sorting)
- Complex nested structures
- Problems requiring random access

## 🔧 **Core Patterns**

### **Pattern 1: Opposite Directional Pointers**

Pointers start from opposite ends and move toward each other.

```python
def two_pointers_opposite(arr):
    left = 0
    right = len(arr) - 1

    while left < right:
        # Process arr[left] and arr[right]
        # Move pointers based on condition
        left += 1
        right -= 1
```

### **Pattern 2: Same Directional Pointers**

Both pointers start from the same end and move in the same direction at different speeds.

```python
def two_pointers_same_direction(arr):
    slow = 0
    fast = 0

    while fast < len(arr):
        # Process elements at different speeds
        # Slow pointer moves conditionally
        # Fast pointer moves every iteration
        fast += 1
        if some_condition:
            slow += 1
```

## 📊 **Detailed Examples with Visualizations**

### **Example 1: Two Sum in Sorted Array**

**Problem**: Find two numbers in sorted array that add up to target.

```python
def two_sum_sorted(arr, target):
    """
    Find two numbers that add up to target in sorted array
    Time: O(n), Space: O(1)
    """
    left, right = 0, len(arr) - 1

    while left < right:
        current_sum = arr[left] + arr[right]

        if current_sum == target:
            return [left, right]
        elif current_sum < target:
            left += 1  # Need larger sum
        else:
            right -= 1  # Need smaller sum

    return []  # No solution found
```

**Visualization:**

```
Array: [2, 7, 11, 15], Target: 9

Step 1: left=0, right=3
[2, 7, 11, 15]
 ↑          ↑
 2 + 15 = 17 > 9, move right pointer left

Step 2: left=0, right=2
[2, 7, 11, 15]
 ↑      ↑
 2 + 11 = 13 > 9, move right pointer left

Step 3: left=0, right=1
[2, 7, 11, 15]
 ↑  ↑
 2 + 7 = 9 ✓ Found!

Return: [0, 1]
```

### **Example 2: Valid Palindrome**

```python
def is_palindrome(s):
    """
    Check if string is valid palindrome
    Time: O(n), Space: O(1)
    """
    # Convert to lowercase and keep only alphanumeric
    cleaned = ''.join(char.lower() for char in s if char.isalnum())

    left, right = 0, len(cleaned) - 1

    while left < right:
        if cleaned[left] != cleaned[right]:
            return False
        left += 1
        right -= 1

    return True
```

**Visualization:**

```
String: "A man, a plan, a canal: Panama"
Cleaned: "amanaplanacanalpanama"

Step 1: left=0, right=20
a m a n a p l a n a c a n a l p a n a m a
↑                                     ↑
a == a ✓, move both pointers

Step 2: left=1, right=19
a m a n a p l a n a c a n a l p a n a m a
  ↑                                 ↑
m == m ✓, continue...

Continue until pointers meet or cross
```

### **Example 3: Remove Duplicates**

```python
def remove_duplicates(arr):
    """
    Remove duplicates from sorted array in-place
    Time: O(n), Space: O(1)
    """
    if not arr:
        return 0

    write_index = 1  # Position for next unique element

    for read_index in range(1, len(arr)):
        if arr[read_index] != arr[read_index - 1]:
            arr[write_index] = arr[read_index]
            write_index += 1

    return write_index
```

**Visualization:**

```
Array: [1, 1, 2, 2, 3, 4, 4, 5]

Initial: write_index = 1, read_index = 1
[1, 1, 2, 2, 3, 4, 4, 5]
    ↑  ↑
    w  r

Step 1: arr[1] == arr[0], skip
Step 2: arr[2] != arr[1], write 2 at index 1
[1, 2, 2, 2, 3, 4, 4, 5]
       ↑     ↑
       w     r

Continue... Final result:
[1, 2, 3, 4, 5, _, _, _]
                ↑
            write_index = 5
```

### **Example 4: Container With Most Water**

```python
def max_area(height):
    """
    Find container that can hold most water
    Time: O(n), Space: O(1)
    """
    left, right = 0, len(height) - 1
    max_water = 0

    while left < right:
        # Width between the two lines
        width = right - left
        # Height is limited by the shorter line
        current_height = min(height[left], height[right])
        # Calculate area
        water = width * current_height
        max_water = max(max_water, water)

        # Move pointer with smaller height
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1

    return max_water
```

**Visualization:**

```
Heights: [1, 8, 6, 2, 5, 4, 8, 3, 7]

Step 1: left=0, right=8
[1, 8, 6, 2, 5, 4, 8, 3, 7]
 ↑                       ↑
Width: 8, Height: min(1,7)=1, Area: 8*1=8
Move left (smaller height)

Step 2: left=1, right=8
[1, 8, 6, 2, 5, 4, 8, 3, 7]
    ↑                    ↑
Width: 7, Height: min(8,7)=7, Area: 7*7=49
Move right (smaller height)

Continue until pointers meet...
```

## 🎮 **Advanced Patterns**

### **Pattern: Three Sum**

```python
def three_sum(nums):
    """
    Find all unique triplets that sum to zero
    Time: O(n²), Space: O(1)
    """
    nums.sort()  # Sort first
    result = []

    for i in range(len(nums) - 2):
        # Skip duplicates for first element
        if i > 0 and nums[i] == nums[i-1]:
            continue

        left, right = i + 1, len(nums) - 1
        target = -nums[i]  # We want nums[i] + nums[left] + nums[right] = 0

        while left < right:
            current_sum = nums[left] + nums[right]

            if current_sum == target:
                result.append([nums[i], nums[left], nums[right]])

                # Skip duplicates
                while left < right and nums[left] == nums[left + 1]:
                    left += 1
                while left < right and nums[right] == nums[right - 1]:
                    right -= 1

                left += 1
                right -= 1
            elif current_sum < target:
                left += 1
            else:
                right -= 1

    return result
```

### **Pattern: Fast & Slow Pointers (Floyd's Algorithm)**

```python
def has_cycle(head):
    """
    Detect cycle in linked list using Floyd's algorithm
    Time: O(n), Space: O(1)
    """
    if not head or not head.next:
        return False

    slow = head      # Moves 1 step
    fast = head.next # Moves 2 steps

    while fast and fast.next:
        if slow == fast:
            return True
        slow = slow.next
        fast = fast.next.next

    return False
```

## 📈 **Complexity Analysis**

| Pattern            | Time Complexity | Space Complexity | Use Case             |
| ------------------ | --------------- | ---------------- | -------------------- |
| Opposite Direction | O(n)            | O(1)             | Palindromes, Two Sum |
| Same Direction     | O(n)            | O(1)             | Remove duplicates    |
| Three Sum          | O(n²)           | O(1)             | Triplet problems     |
| Fast & Slow        | O(n)            | O(1)             | Cycle detection      |

## 🎯 **Problem Categories**

### **Easy Problems**

1. **Valid Palindrome** - Check if string reads same forwards/backwards
2. **Two Sum II** - Two sum in sorted array
3. **Remove Duplicates** - Remove duplicates from sorted array
4. **Reverse String** - Reverse characters in string

### **Medium Problems**

1. **3Sum** - Find triplets that sum to zero
2. **Container With Most Water** - Find maximum area
3. **Sort Colors** - Dutch national flag problem
4. **Remove Nth Node** - Remove nth node from end of list

### **Advanced Problems**

1. **4Sum** - Find quadruplets with target sum
2. **Trapping Rain Water** - Calculate trapped rainwater
3. **Minimum Window Substring** - Find minimum window containing all characters

## 💡 **Key Tips & Tricks**

### **✅ Best Practices**

- Always check for edge cases (empty arrays, single elements)
- Use two pointers when you need O(1) space complexity
- Sort the array first if the problem allows it
- Skip duplicates when finding unique combinations
- Consider the direction of pointer movement carefully

### **🔧 Optimization Techniques**

- **Early termination**: Stop when condition is met
- **Skip duplicates**: Avoid processing same elements multiple times
- **Boundary checks**: Prevent index out of bounds errors

### **🐛 Common Pitfalls**

- Forgetting to handle empty inputs
- Infinite loops when pointers don't move correctly
- Off-by-one errors in boundary conditions
- Not considering duplicate elements

## 🔗 **Practice Problems**

```python
# Practice Template
def two_pointers_template(arr):
    left, right = 0, len(arr) - 1

    while left < right:
        # Check current condition
        if condition_met(arr[left], arr[right]):
            # Process and return result
            return result
        elif need_larger_value:
            left += 1
        else:
            right -= 1

    return default_result
```

## 📚 **Next Topics**

- [Sliding Window](./03-sliding-window.md) - Extension of two pointers
- [Hash Maps & Sets](./04-hashmaps-sets.md) - Alternative approaches
- [Fast & Slow Pointers](../02-medium/02-linked-lists.md) - Advanced pattern

---

_Master these patterns and you'll solve array/string problems efficiently with optimal space complexity!_
