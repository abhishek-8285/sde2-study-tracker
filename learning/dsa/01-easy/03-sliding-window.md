# Sliding Window Technique 🪟

## 🎯 **Overview**

The Sliding Window technique is an algorithmic approach that maintains a "window" of elements and slides it through the data structure. It's extremely efficient for problems involving contiguous subarrays or substrings.

## 💡 **When to Use Sliding Window**

✅ **Perfect for:**

- Finding maximum/minimum subarray of size k
- Substring problems with conditions
- Finding longest/shortest subarray with specific property
- Average, sum of subarrays of fixed size
- Pattern matching in strings

❌ **Not suitable for:**

- Non-contiguous elements
- Problems requiring global view
- Random access patterns

## 🔧 **Core Patterns**

### **Pattern 1: Fixed Size Window**

Window size remains constant throughout the algorithm.

```python
def fixed_window_template(arr, k):
    window_sum = 0
    window_start = 0

    # Build initial window
    for window_end in range(len(arr)):
        window_sum += arr[window_end]  # Expand window

        # Window reached desired size
        if window_end >= k - 1:
            # Process current window
            # ... do something with window_sum

            # Shrink window from left
            window_sum -= arr[window_start]
            window_start += 1
```

### **Pattern 2: Dynamic Size Window**

Window size changes based on conditions.

```python
def dynamic_window_template(arr, condition):
    window_start = 0
    result = 0

    for window_end in range(len(arr)):
        # Expand window
        # ... add arr[window_end] to window

        # Shrink window while condition is violated
        while condition_violated:
            # Remove arr[window_start] from window
            window_start += 1

        # Update result with current window
        result = max(result, window_end - window_start + 1)

    return result
```

## 📊 **Visual Examples with Step-by-Step Process**

### **Example 1: Maximum Sum Subarray of Size K**

**Problem**: Find maximum sum of any contiguous subarray of size k.

```python
def max_sum_subarray(arr, k):
    """
    Find maximum sum of subarray of size k
    Time: O(n), Space: O(1)
    """
    if len(arr) < k:
        return -1

    # Calculate sum of first window
    window_sum = sum(arr[:k])
    max_sum = window_sum

    # Slide the window
    for i in range(len(arr) - k):
        # Remove first element of previous window
        # Add last element of current window
        window_sum = window_sum - arr[i] + arr[i + k]
        max_sum = max(max_sum, window_sum)

    return max_sum
```

**Visualization:**

```
Array: [2, 1, 5, 1, 3, 2], k = 3

Step 1: Initial window [2, 1, 5]
[2, 1, 5, 1, 3, 2]
 -------
Sum = 8, max_sum = 8

Step 2: Slide window [1, 5, 1]
[2, 1, 5, 1, 3, 2]
    -------
Remove 2, Add 1: Sum = 8 - 2 + 1 = 7

Step 3: Slide window [5, 1, 3]
[2, 1, 5, 1, 3, 2]
       -------
Remove 1, Add 3: Sum = 7 - 1 + 3 = 9, max_sum = 9

Step 4: Slide window [1, 3, 2]
[2, 1, 5, 1, 3, 2]
          -------
Remove 5, Add 2: Sum = 9 - 5 + 2 = 6

Result: max_sum = 9
```

### **Example 2: Longest Substring Without Repeating Characters**

```python
def longest_unique_substring(s):
    """
    Find length of longest substring without repeating characters
    Time: O(n), Space: O(min(m,n)) where m is charset size
    """
    char_set = set()
    left = 0
    max_length = 0

    for right in range(len(s)):
        # Shrink window while we have duplicate
        while s[right] in char_set:
            char_set.remove(s[left])
            left += 1

        # Add current character
        char_set.add(s[right])

        # Update maximum length
        max_length = max(max_length, right - left + 1)

    return max_length
```

**Visualization:**

```
String: "abcabcbb"

Step 1: right=0, left=0
"abcabcbb"
 ↑
Set: {a}, length = 1

Step 2: right=1, left=0
"abcabcbb"
 --
Set: {a,b}, length = 2

Step 3: right=2, left=0
"abcabcbb"
 ---
Set: {a,b,c}, length = 3

Step 4: right=3, left=0
"abcabcbb"
 ----
'a' already in set! Shrink window:
Remove s[0]='a', left=1
Set: {b,c}, Add 'a', Set: {a,b,c}, length = 3

Step 5: right=4, left=1
"abcabcbb"
  ----
'b' already in set! Shrink window:
Remove s[1]='b', left=2
Remove s[2]='c', left=3
Set: {a}, Add 'b', Set: {a,b}, length = 2

Continue...
Final result: 3 (substring "abc")
```

### **Example 3: Minimum Window Substring**

```python
def min_window_substring(s, t):
    """
    Find minimum window in s that contains all characters of t
    Time: O(|s| + |t|), Space: O(|s| + |t|)
    """
    if not s or not t:
        return ""

    # Count characters in t
    dict_t = {}
    for char in t:
        dict_t[char] = dict_t.get(char, 0) + 1

    required = len(dict_t)  # Number of unique chars in t
    left = right = 0
    formed = 0  # Number of unique chars in current window with desired frequency

    window_counts = {}
    ans = float('inf'), None, None  # length, left, right

    while right < len(s):
        # Add character from right to window
        char = s[right]
        window_counts[char] = window_counts.get(char, 0) + 1

        # Check if current character's frequency matches desired count
        if char in dict_t and window_counts[char] == dict_t[char]:
            formed += 1

        # Try to shrink window from left
        while left <= right and formed == required:
            char = s[left]

            # Update result if this window is smaller
            if right - left + 1 < ans[0]:
                ans = (right - left + 1, left, right)

            # Remove from left
            window_counts[char] -= 1
            if char in dict_t and window_counts[char] < dict_t[char]:
                formed -= 1

            left += 1

        right += 1

    return "" if ans[0] == float('inf') else s[ans[1]:ans[2] + 1]
```

## 🎮 **Common Problem Patterns**

### **Pattern 1: Fixed Size Problems**

```python
def average_of_subarrays(arr, k):
    """Find average of all subarrays of size k"""
    result = []
    window_sum = 0
    window_start = 0

    for window_end in range(len(arr)):
        window_sum += arr[window_end]

        if window_end >= k - 1:
            result.append(window_sum / k)
            window_sum -= arr[window_start]
            window_start += 1

    return result
```

### **Pattern 2: Dynamic Size - Find Maximum**

```python
def longest_subarray_with_sum_k(arr, k):
    """Find longest subarray with sum equal to k"""
    left = 0
    current_sum = 0
    max_length = 0

    for right in range(len(arr)):
        current_sum += arr[right]

        # Shrink window while sum > k
        while current_sum > k and left <= right:
            current_sum -= arr[left]
            left += 1

        # Check if we found target sum
        if current_sum == k:
            max_length = max(max_length, right - left + 1)

    return max_length
```

### **Pattern 3: Character Frequency Problems**

```python
def longest_substring_with_k_distinct(s, k):
    """Find longest substring with at most k distinct characters"""
    if k == 0:
        return 0

    left = 0
    char_count = {}
    max_length = 0

    for right in range(len(s)):
        # Add right character
        char_count[s[right]] = char_count.get(s[right], 0) + 1

        # Shrink window if we have more than k distinct chars
        while len(char_count) > k:
            char_count[s[left]] -= 1
            if char_count[s[left]] == 0:
                del char_count[s[left]]
            left += 1

        max_length = max(max_length, right - left + 1)

    return max_length
```

## 📈 **Complexity Analysis**

| Problem Type        | Time Complexity | Space Complexity | Notes                                    |
| ------------------- | --------------- | ---------------- | ---------------------------------------- |
| Fixed Window        | O(n)            | O(1)             | Each element visited at most twice       |
| Dynamic Window      | O(n)            | O(k)             | k = size of character set or constraints |
| String Problems     | O(n)            | O(k)             | k = alphabet size                        |
| Multiple Conditions | O(n)            | O(k)             | k = number of unique elements tracked    |

## 🎯 **Problem Categories & Templates**

### **Easy Problems**

1. **Maximum Sum Subarray of Size K**
2. **Average of Subarrays of Size K**
3. **Find All Anagrams in String**

### **Medium Problems**

1. **Longest Substring Without Repeating Characters**
2. **Longest Substring with At Most K Distinct Characters**
3. **Minimum Window Substring**
4. **Permutation in String**

### **Advanced Problems**

1. **Sliding Window Maximum**
2. **Minimum Size Subarray Sum**
3. **Longest Repeating Character Replacement**

## 🔧 **Implementation Templates**

### **Template 1: Fixed Size Window**

```python
def fixed_size_window(arr, k):
    if len(arr) < k:
        return []

    result = []
    window_sum = 0

    # Process first window
    for i in range(k):
        window_sum += arr[i]

    result.append(window_sum)

    # Slide window
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i - k]
        result.append(window_sum)

    return result
```

### **Template 2: Dynamic Size Window**

```python
def dynamic_size_window(arr, target):
    left = 0
    current_sum = 0
    min_length = float('inf')

    for right in range(len(arr)):
        current_sum += arr[right]

        while current_sum >= target:
            min_length = min(min_length, right - left + 1)
            current_sum -= arr[left]
            left += 1

    return min_length if min_length != float('inf') else 0
```

### **Template 3: Character Frequency Window**

```python
def char_frequency_window(s, pattern):
    pattern_count = {}
    for char in pattern:
        pattern_count[char] = pattern_count.get(char, 0) + 1

    window_count = {}
    left = 0
    matches = 0
    result = []

    for right in range(len(s)):
        right_char = s[right]
        window_count[right_char] = window_count.get(right_char, 0) + 1

        if right_char in pattern_count and window_count[right_char] == pattern_count[right_char]:
            matches += 1

        if right - left + 1 == len(pattern):
            if matches == len(pattern_count):
                result.append(left)

            left_char = s[left]
            if left_char in pattern_count and window_count[left_char] == pattern_count[left_char]:
                matches -= 1

            window_count[left_char] -= 1
            left += 1

    return result
```

## 💡 **Key Tips & Best Practices**

### **✅ Optimization Strategies**

- Use deque for sliding window maximum/minimum problems
- HashMap for character/element frequency tracking
- Two pointers for expanding and contracting window
- Early termination when impossible conditions are met

### **🔧 Common Patterns Recognition**

- **"Subarray of size k"** → Fixed window
- **"Longest/shortest subarray with..."** → Dynamic window
- **"All subarrays/substrings that..."** → Sliding window with tracking
- **"Contains all characters of..."** → Window with frequency map

### **🐛 Common Pitfalls**

- Forgetting to handle empty inputs
- Not properly updating window bounds
- Incorrect frequency counting
- Off-by-one errors in window size calculation

## 🎨 **Visual Learning Aids**

### **Window Movement Visualization**

```
Fixed Window (k=3):
[1, 2, 3, 4, 5, 6]
 -------           Step 1: sum = 6
    -------        Step 2: sum = 9
       -------     Step 3: sum = 12
          -------  Step 4: sum = 15

Dynamic Window:
[1, 2, 3, 1, 1, 1, 1]  (target sum = 4)
 ---                    Step 1: sum = 6 > 4, shrink
   ---                  Step 2: sum = 5 > 4, shrink
     -                  Step 3: sum = 3 < 4, expand
     ---                Step 4: sum = 4 = 4 ✓
```

## 📚 **Next Steps**

- [Hash Maps & Sets](./04-hashmaps-sets.md) - Complement sliding window
- [Basic Recursion](./05-basic-recursion.md) - Different problem-solving approach
- [Binary Search](../02-medium/01-binary-search.md) - Advanced searching

---

_Master sliding window and you'll efficiently solve most subarray/substring problems in linear time!_
