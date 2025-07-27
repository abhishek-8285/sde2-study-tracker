# Stack & Queue 📚

## 🎯 **Overview**

Stack and Queue are fundamental linear data structures that follow specific ordering principles:

- **Stack**: Last In, First Out (LIFO) - like a stack of plates
- **Queue**: First In, First Out (FIFO) - like a line of people

## 📚 **Stack Data Structure**

### **Core Concept**

A stack allows insertion and deletion only at one end, called the "top" of the stack.

```python
class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        """Add item to top of stack - O(1)"""
        self.items.append(item)

    def pop(self):
        """Remove and return top item - O(1)"""
        if self.is_empty():
            raise IndexError("Pop from empty stack")
        return self.items.pop()

    def peek(self):
        """View top item without removing - O(1)"""
        if self.is_empty():
            raise IndexError("Peek from empty stack")
        return self.items[-1]

    def is_empty(self):
        """Check if stack is empty - O(1)"""
        return len(self.items) == 0

    def size(self):
        """Get number of items - O(1)"""
        return len(self.items)
```

### **Stack Operations Visualization**

```
Push operations:
Empty → [1] → [1,2] → [1,2,3] → [1,2,3,4]
         ↑     ↑       ↑         ↑
       push(1) push(2) push(3)  push(4)

Pop operations:
[1,2,3,4] → [1,2,3] → [1,2] → [1] → Empty
    ↓         ↓        ↓      ↓
  pop()→4   pop()→3  pop()→2 pop()→1
```

### **Stack Applications & Patterns**

#### **Pattern 1: Balanced Parentheses**

```python
def is_balanced_parentheses(s):
    """
    Check if parentheses are balanced
    Time: O(n), Space: O(n)
    """
    stack = []
    pairs = {'(': ')', '[': ']', '{': '}'}

    for char in s:
        if char in pairs:  # Opening bracket
            stack.append(char)
        elif char in pairs.values():  # Closing bracket
            if not stack:
                return False
            if pairs[stack.pop()] != char:
                return False

    return len(stack) == 0
```

**Execution Example:**

```
Input: "({[]})"

Step 1: '(' → stack = ['(']
Step 2: '{' → stack = ['(', '{']
Step 3: '[' → stack = ['(', '{', '[']
Step 4: ']' → pop '[', matches → stack = ['(', '{']
Step 5: '}' → pop '{', matches → stack = ['(']
Step 6: ')' → pop '(', matches → stack = []

Result: True (balanced)
```

#### **Pattern 2: Reverse Polish Notation (RPN)**

```python
def evaluate_rpn(tokens):
    """
    Evaluate Reverse Polish Notation expression
    Time: O(n), Space: O(n)
    """
    stack = []
    operators = {'+', '-', '*', '/'}

    for token in tokens:
        if token in operators:
            # Pop two operands (order matters!)
            b = stack.pop()
            a = stack.pop()

            if token == '+':
                result = a + b
            elif token == '-':
                result = a - b
            elif token == '*':
                result = a * b
            elif token == '/':
                result = int(a / b)  # Truncate toward zero

            stack.append(result)
        else:
            stack.append(int(token))

    return stack[0]
```

**Example: ["2", "1", "+", "3", "*"]**

```
Step 1: "2" → stack = [2]
Step 2: "1" → stack = [2, 1]
Step 3: "+" → pop 1,2 → 2+1=3 → stack = [3]
Step 4: "3" → stack = [3, 3]
Step 5: "*" → pop 3,3 → 3*3=9 → stack = [9]

Result: 9
```

#### **Pattern 3: Daily Temperatures**

```python
def daily_temperatures(temperatures):
    """
    Find how many days until warmer temperature
    Time: O(n), Space: O(n)
    """
    stack = []  # Store indices
    result = [0] * len(temperatures)

    for i, temp in enumerate(temperatures):
        # While stack not empty and current temp > temp at stack top
        while stack and temperatures[stack[-1]] < temp:
            prev_index = stack.pop()
            result[prev_index] = i - prev_index

        stack.append(i)

    return result
```

**Example: [73, 74, 75, 71, 69, 72, 76, 73]**

```
i=0: T=73 → stack = [0]
i=1: T=74 > 73 → pop 0, result[0] = 1-0 = 1 → stack = [1]
i=2: T=75 > 74 → pop 1, result[1] = 2-1 = 1 → stack = [2]
i=3: T=71 < 75 → stack = [2, 3]
i=4: T=69 < 71 → stack = [2, 3, 4]
i=5: T=72 > 69,71 → pop 4,3 → result[4]=1, result[3]=2 → stack = [2, 5]
i=6: T=76 > 72,75 → pop 5,2 → result[5]=1, result[2]=4 → stack = [6]
i=7: T=73 < 76 → stack = [6, 7]

Result: [1, 1, 4, 2, 1, 1, 0, 0]
```

## 🚶 **Queue Data Structure**

### **Core Concept**

A queue allows insertion at one end (rear/back) and deletion at the other end (front).

```python
from collections import deque

class Queue:
    def __init__(self):
        self.items = deque()

    def enqueue(self, item):
        """Add item to rear of queue - O(1)"""
        self.items.append(item)

    def dequeue(self):
        """Remove and return front item - O(1)"""
        if self.is_empty():
            raise IndexError("Dequeue from empty queue")
        return self.items.popleft()

    def front(self):
        """View front item without removing - O(1)"""
        if self.is_empty():
            raise IndexError("Front from empty queue")
        return self.items[0]

    def is_empty(self):
        """Check if queue is empty - O(1)"""
        return len(self.items) == 0

    def size(self):
        """Get number of items - O(1)"""
        return len(self.items)

# Alternative implementation using list (less efficient)
class SimpleQueue:
    def __init__(self):
        self.items = []

    def enqueue(self, item):
        self.items.append(item)  # O(1)

    def dequeue(self):
        if self.is_empty():
            raise IndexError("Dequeue from empty queue")
        return self.items.pop(0)  # O(n) - inefficient!
```

### **Queue Operations Visualization**

```
Enqueue operations:
Empty → [1] → [1,2] → [1,2,3] → [1,2,3,4]
front    ↑     ↑       ↑         ↑       rear
      enqueue enqueue enqueue   enqueue
        (1)     (2)     (3)       (4)

Dequeue operations:
[1,2,3,4] → [2,3,4] → [3,4] → [4] → Empty
front  ↓       ↓       ↓     ↓    rear
    dequeue→1 dequeue→2 dequeue→3 dequeue→4
```

### **Queue Applications & Patterns**

#### **Pattern 1: Breadth-First Search (BFS)**

```python
def bfs_tree_level_order(root):
    """
    Level-order traversal of binary tree
    Time: O(n), Space: O(w) where w is max width
    """
    if not root:
        return []

    result = []
    queue = deque([root])

    while queue:
        level_size = len(queue)
        level_nodes = []

        for _ in range(level_size):
            node = queue.popleft()
            level_nodes.append(node.val)

            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)

        result.append(level_nodes)

    return result
```

#### **Pattern 2: Sliding Window Maximum**

```python
from collections import deque

def sliding_window_maximum(nums, k):
    """
    Find maximum in each sliding window of size k
    Time: O(n), Space: O(k)
    """
    if not nums:
        return []

    dq = deque()  # Store indices in decreasing order of values
    result = []

    for i in range(len(nums)):
        # Remove indices outside current window
        while dq and dq[0] <= i - k:
            dq.popleft()

        # Remove indices whose values are smaller than current
        while dq and nums[dq[-1]] < nums[i]:
            dq.pop()

        dq.append(i)

        # Add maximum to result (after first window is complete)
        if i >= k - 1:
            result.append(nums[dq[0]])

    return result
```

#### **Pattern 3: Queue-based Problems**

```python
def first_non_repeating_char(stream):
    """
    Find first non-repeating character in stream
    Time: O(n), Space: O(alphabet_size)
    """
    char_count = {}
    queue = deque()
    result = []

    for char in stream:
        # Update count
        char_count[char] = char_count.get(char, 0) + 1
        queue.append(char)

        # Remove repeated characters from front
        while queue and char_count[queue[0]] > 1:
            queue.popleft()

        # First non-repeating char (or None if all repeat)
        if queue:
            result.append(queue[0])
        else:
            result.append(None)

    return result
```

## 🔄 **Deque (Double-ended Queue)**

### **Implementation & Usage**

```python
from collections import deque

# Creating deque
dq = deque([1, 2, 3])

# Operations at both ends
dq.appendleft(0)    # Add to left: [0, 1, 2, 3]
dq.append(4)        # Add to right: [0, 1, 2, 3, 4]
dq.popleft()        # Remove from left: [1, 2, 3, 4]
dq.pop()            # Remove from right: [1, 2, 3]

# Access (but not recommended for middle elements)
front = dq[0]       # First element
back = dq[-1]       # Last element
```

### **Deque Applications**

```python
def max_in_sliding_window_deque(nums, k):
    """
    Efficient sliding window maximum using deque
    Maintains decreasing order of elements
    """
    dq = deque()
    result = []

    for i, num in enumerate(nums):
        # Remove elements outside window
        while dq and dq[0] <= i - k:
            dq.popleft()

        # Maintain decreasing order
        while dq and nums[dq[-1]] < num:
            dq.pop()

        dq.append(i)

        if i >= k - 1:
            result.append(nums[dq[0]])

    return result
```

## 📊 **Complexity Comparison**

| Operation    | Array Stack | Linked Stack | Array Queue | Deque |
| ------------ | ----------- | ------------ | ----------- | ----- |
| Push/Enqueue | O(1)\*      | O(1)         | O(1)        | O(1)  |
| Pop/Dequeue  | O(1)        | O(1)         | O(n)        | O(1)  |
| Peek/Front   | O(1)        | O(1)         | O(1)        | O(1)  |
| Space        | O(n)        | O(n)         | O(n)        | O(n)  |

\*Amortized O(1) for dynamic arrays

## 🎯 **Common Problem Patterns**

### **Stack Patterns**

1. **Monotonic Stack**: Maintain increasing/decreasing order
2. **Expression Evaluation**: Infix, postfix, prefix
3. **Undo Operations**: Browser history, text editors
4. **Function Call Management**: Recursion simulation

### **Queue Patterns**

1. **BFS Traversal**: Trees, graphs, shortest path
2. **Sliding Window**: Maximum/minimum in windows
3. **Process Scheduling**: FIFO order processing
4. **Stream Processing**: First occurrence problems

### **Problem Examples**

#### **Easy Problems**

1. **Valid Parentheses** - Stack for matching
2. **Min Stack** - Stack with minimum tracking
3. **Queue using Stacks** - Implement queue with stacks
4. **Stack using Queues** - Implement stack with queues

#### **Medium Problems**

1. **Daily Temperatures** - Monotonic stack
2. **Sliding Window Maximum** - Deque optimization
3. **Evaluate RPN** - Stack for postfix evaluation
4. **Implement LRU Cache** - Combined data structures

## 💡 **Implementation Tips**

### **Python Built-ins**

```python
# Stack using list
stack = []
stack.append(item)    # Push
item = stack.pop()    # Pop

# Queue using deque (preferred)
from collections import deque
queue = deque()
queue.append(item)        # Enqueue
item = queue.popleft()    # Dequeue

# Priority Queue using heapq
import heapq
heap = []
heapq.heappush(heap, item)    # Push
item = heapq.heappop(heap)    # Pop minimum
```

### **Common Pitfalls**

- Using list for queue (O(n) dequeue operation)
- Not checking for empty stack/queue before operations
- Confusing LIFO vs FIFO behavior
- Forgetting to handle edge cases (empty structures)

## 📚 **Next Steps**

- [Binary Search](../02-medium/01-binary-search.md) - Efficient searching algorithm
- [Linked Lists](../02-medium/02-linked-lists.md) - Dynamic data structures
- [Trees & Tree Traversal](../02-medium/03-trees.md) - Hierarchical structures using stacks/queues

---

_Master Stack and Queue to handle ordered data processing and build foundation for more complex algorithms!_
