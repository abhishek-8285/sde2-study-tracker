# Hash Maps & Sets 🗂️

## 🎯 **Overview**

Hash Maps (dictionaries) and Sets are fundamental data structures that provide O(1) average-case lookup, insertion, and deletion. They're essential for solving frequency counting, membership testing, and mapping problems efficiently.

## 💡 **When to Use Hash Maps & Sets**

### **Hash Maps (Dictionaries) ✅**

- Counting frequency of elements
- Storing key-value relationships
- Caching/memoization
- Grouping data by categories
- Two-sum type problems

### **Sets ✅**

- Checking membership/duplicates
- Finding unique elements
- Set operations (union, intersection)
- Removing duplicates
- Fast lookups without values

### **Not ideal for ❌**

- Ordered data (use arrays/lists)
- Range queries (use trees)
- Memory-constrained environments
- Small datasets where linear search is faster

## 🔧 **Core Operations & Complexity**

| Operation | Hash Map            | Set                | Average Case | Worst Case |
| --------- | ------------------- | ------------------ | ------------ | ---------- |
| Insert    | `dict[key] = value` | `set.add(item)`    | O(1)         | O(n)       |
| Delete    | `del dict[key]`     | `set.remove(item)` | O(1)         | O(n)       |
| Search    | `key in dict`       | `item in set`      | O(1)         | O(n)       |
| Access    | `dict[key]`         | N/A                | O(1)         | O(n)       |

## 📊 **Fundamental Patterns with Examples**

### **Pattern 1: Frequency Counting**

```python
def character_frequency(s):
    """Count frequency of each character"""
    freq = {}
    for char in s:
        freq[char] = freq.get(char, 0) + 1
    return freq

# Alternative using defaultdict
from collections import defaultdict

def char_freq_defaultdict(s):
    freq = defaultdict(int)
    for char in s:
        freq[char] += 1
    return dict(freq)

# Alternative using Counter
from collections import Counter

def char_freq_counter(s):
    return Counter(s)
```

**Example:**

```python
s = "programming"
result = character_frequency(s)
# Output: {'p': 1, 'r': 2, 'o': 1, 'g': 2, 'a': 1, 'm': 2, 'i': 1, 'n': 1}
```

### **Pattern 2: Two Sum Problem**

```python
def two_sum(nums, target):
    """
    Find indices of two numbers that add up to target
    Time: O(n), Space: O(n)
    """
    num_to_index = {}  # value -> index mapping

    for i, num in enumerate(nums):
        complement = target - num

        if complement in num_to_index:
            return [num_to_index[complement], i]

        num_to_index[num] = i

    return []  # No solution found
```

**Visualization:**

```
nums = [2, 7, 11, 15], target = 9

Step 1: i=0, num=2
complement = 9 - 2 = 7
7 not in map: {2: 0}

Step 2: i=1, num=7
complement = 9 - 7 = 2
2 in map! Return [0, 1]

Map progression:
{} → {2: 0} → Found!
```

### **Pattern 3: Grouping/Categorizing**

```python
def group_anagrams(strs):
    """
    Group strings that are anagrams of each other
    Time: O(n * k log k), Space: O(n * k)
    where n = number of strings, k = max length of string
    """
    anagram_groups = {}

    for s in strs:
        # Sort characters to create a key
        key = ''.join(sorted(s))

        if key not in anagram_groups:
            anagram_groups[key] = []

        anagram_groups[key].append(s)

    return list(anagram_groups.values())

# Alternative using defaultdict
def group_anagrams_defaultdict(strs):
    anagram_groups = defaultdict(list)

    for s in strs:
        key = ''.join(sorted(s))
        anagram_groups[key].append(s)

    return list(anagram_groups.values())
```

**Example:**

```python
strs = ["eat", "tea", "tan", "ate", "nat", "bat"]
result = group_anagrams(strs)
# Output: [["eat","tea","ate"], ["tan","nat"], ["bat"]]

Key mapping:
"aet" -> ["eat", "tea", "ate"]
"ant" -> ["tan", "nat"]
"abt" -> ["bat"]
```

### **Pattern 4: Finding Duplicates with Sets**

```python
def find_duplicates(nums):
    """Find all duplicates in array using set"""
    seen = set()
    duplicates = set()

    for num in nums:
        if num in seen:
            duplicates.add(num)
        else:
            seen.add(num)

    return list(duplicates)

def has_duplicates(nums):
    """Check if array has any duplicates"""
    return len(nums) != len(set(nums))

def first_duplicate(nums):
    """Find first duplicate element"""
    seen = set()

    for num in nums:
        if num in seen:
            return num
        seen.add(num)

    return None
```

### **Pattern 5: Set Operations**

```python
def set_operations_examples():
    set1 = {1, 2, 3, 4, 5}
    set2 = {4, 5, 6, 7, 8}

    # Union - all elements from both sets
    union = set1 | set2  # {1, 2, 3, 4, 5, 6, 7, 8}
    union_alt = set1.union(set2)

    # Intersection - common elements
    intersection = set1 & set2  # {4, 5}
    intersection_alt = set1.intersection(set2)

    # Difference - elements in set1 but not set2
    difference = set1 - set2  # {1, 2, 3}
    difference_alt = set1.difference(set2)

    # Symmetric difference - elements in either set but not both
    sym_diff = set1 ^ set2  # {1, 2, 3, 6, 7, 8}
    sym_diff_alt = set1.symmetric_difference(set2)

    return {
        'union': union,
        'intersection': intersection,
        'difference': difference,
        'symmetric_difference': sym_diff
    }
```

## 🎮 **Advanced Patterns & Problems**

### **Pattern 1: Longest Consecutive Sequence**

```python
def longest_consecutive(nums):
    """
    Find length of longest consecutive sequence
    Time: O(n), Space: O(n)
    """
    if not nums:
        return 0

    num_set = set(nums)
    max_length = 0

    for num in num_set:
        # Only start counting if num is the beginning of a sequence
        if num - 1 not in num_set:
            current_num = num
            current_length = 1

            # Count consecutive numbers
            while current_num + 1 in num_set:
                current_num += 1
                current_length += 1

            max_length = max(max_length, current_length)

    return max_length
```

**Visualization:**

```
nums = [100, 4, 200, 1, 3, 2]
num_set = {100, 4, 200, 1, 3, 2}

Check 100: 99 not in set → start sequence
100 → 101 not in set → length = 1

Check 4: 3 in set → skip (not start)

Check 200: 199 not in set → start sequence
200 → 201 not in set → length = 1

Check 1: 0 not in set → start sequence
1 → 2 → 3 → 4 → 5 not in set → length = 4

Result: 4 (sequence: 1,2,3,4)
```

### **Pattern 2: Subarray Sum Equals K**

```python
def subarray_sum_k(nums, k):
    """
    Count number of subarrays with sum equal to k
    Time: O(n), Space: O(n)
    """
    count = 0
    prefix_sum = 0
    sum_count = {0: 1}  # Handle subarrays starting from index 0

    for num in nums:
        prefix_sum += num

        # If (prefix_sum - k) exists, we found a subarray
        if prefix_sum - k in sum_count:
            count += sum_count[prefix_sum - k]

        # Add current prefix sum to map
        sum_count[prefix_sum] = sum_count.get(prefix_sum, 0) + 1

    return count
```

**Example:**

```
nums = [1, 1, 1], k = 2

Step 1: num=1, prefix_sum=1
Need: 1-2=-1, not in map
sum_count = {0: 1, 1: 1}

Step 2: num=1, prefix_sum=2
Need: 2-2=0, found! count += 1
sum_count = {0: 1, 1: 1, 2: 1}

Step 3: num=1, prefix_sum=3
Need: 3-2=1, found! count += 1
sum_count = {0: 1, 1: 1, 2: 1, 3: 1}

Result: count = 2
```

### **Pattern 3: Top K Frequent Elements**

```python
def top_k_frequent(nums, k):
    """
    Find k most frequent elements
    Time: O(n log n), Space: O(n)
    """
    # Count frequencies
    freq_count = {}
    for num in nums:
        freq_count[num] = freq_count.get(num, 0) + 1

    # Sort by frequency (descending)
    sorted_items = sorted(freq_count.items(), key=lambda x: x[1], reverse=True)

    # Return top k elements
    return [item[0] for item in sorted_items[:k]]

# Alternative using Counter and heap
from collections import Counter
import heapq

def top_k_frequent_heap(nums, k):
    """
    Time: O(n log k), Space: O(n)
    """
    count = Counter(nums)
    return heapq.nlargest(k, count.keys(), key=count.get)
```

## 🔧 **Implementation Tips & Best Practices**

### **Dictionary Methods**

```python
# Safe access methods
d = {'a': 1, 'b': 2}

# Method 1: get() with default
value = d.get('c', 0)  # Returns 0 if 'c' not found

# Method 2: setdefault()
d.setdefault('c', 0)   # Sets d['c'] = 0 if 'c' doesn't exist

# Method 3: defaultdict
from collections import defaultdict
dd = defaultdict(int)  # Auto-creates entries with default value
dd['new_key'] += 1     # No KeyError

# Iteration patterns
for key in d:                    # Iterate over keys
for value in d.values():         # Iterate over values
for key, value in d.items():     # Iterate over key-value pairs
```

### **Set Methods**

```python
s = {1, 2, 3}

# Adding elements
s.add(4)           # Add single element
s.update([5, 6])   # Add multiple elements

# Removing elements
s.remove(1)        # Raises KeyError if not found
s.discard(1)       # No error if not found
popped = s.pop()   # Remove and return arbitrary element

# Checking membership
if 2 in s:         # O(1) average case
    print("Found!")
```

## 📈 **Performance Considerations**

### **Hash Collision Handling**

```python
# Good hash distribution
good_keys = ["apple", "banana", "cherry"]  # Different hash values

# Poor hash distribution (avoid if possible)
# Keys that hash to same value cause collisions

# Python automatically handles collisions, but awareness helps:
# - Use immutable types as keys (str, int, tuple)
# - Avoid mutable types (list, dict) as keys
```

### **Memory vs Speed Trade-offs**

```python
# Space-efficient frequency counting for large datasets
def memory_efficient_count(items):
    """Use generator for large datasets"""
    counts = {}
    for item in items:  # items can be generator
        counts[item] = counts.get(item, 0) + 1
    return counts

# Time-efficient with Counter
from collections import Counter
def time_efficient_count(items):
    return Counter(items)  # Optimized C implementation
```

## 🎯 **Common Problem Categories**

### **Easy Problems**

1. **Two Sum** - Find pair with target sum
2. **Valid Anagram** - Check if two strings are anagrams
3. **Contains Duplicate** - Check for duplicates in array
4. **Intersection of Two Arrays** - Find common elements

### **Medium Problems**

1. **Group Anagrams** - Group strings by anagram
2. **Top K Frequent Elements** - Find most frequent items
3. **Subarray Sum Equals K** - Count subarrays with target sum
4. **Longest Consecutive Sequence** - Find longest consecutive numbers

### **Advanced Problems**

1. **Design HashMap** - Implement hash map from scratch
2. **LRU Cache** - Implement least recently used cache
3. **Word Pattern** - Match pattern with words
4. **Isomorphic Strings** - Check string isomorphism

## 🔍 **Problem-Solving Templates**

### **Template 1: Frequency Counting**

```python
def frequency_template(items):
    freq = {}
    for item in items:
        freq[item] = freq.get(item, 0) + 1

    # Process frequencies as needed
    return freq
```

### **Template 2: Two Sum Variants**

```python
def two_sum_template(nums, target):
    seen = {}  # value -> index/count

    for i, num in enumerate(nums):
        complement = target - num

        if complement in seen:
            return [seen[complement], i]  # or other processing

        seen[num] = i

    return []
```

### **Template 3: Grouping Pattern**

```python
def grouping_template(items, key_function):
    groups = {}

    for item in items:
        key = key_function(item)

        if key not in groups:
            groups[key] = []

        groups[key].append(item)

    return groups
```

## 💡 **Key Insights & Tips**

### **✅ Best Practices**

- Use `get()` method to avoid KeyError
- Prefer `defaultdict` for frequency counting
- Use sets for membership testing
- Consider `Counter` for advanced counting needs
- Choose appropriate data structure based on use case

### **🔧 Optimization Techniques**

- Use tuple as key for multi-dimensional mapping
- Implement custom hash functions for complex objects
- Consider frozenset for immutable set operations
- Use dict comprehensions for readable code

### **🐛 Common Pitfalls**

- Using mutable objects as dictionary keys
- Modifying dictionary while iterating
- Assuming O(1) performance in worst case
- Not handling missing keys properly

## 📚 **Next Steps**

- [Basic Recursion](./05-basic-recursion.md) - Problem decomposition technique
- [Stack & Queue](./06-stack-queue.md) - Linear data structures
- [Binary Search](../02-medium/01-binary-search.md) - Efficient searching

---

_Master hash maps and sets to solve frequency and lookup problems with optimal efficiency!_
