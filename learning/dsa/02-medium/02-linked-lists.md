# Linked Lists 🔗

## 🎯 **Overview**

Linked Lists are dynamic data structures where elements (nodes) are connected through pointers/references. Unlike arrays, they don't require contiguous memory allocation and can grow/shrink during runtime.

## 💡 **Basic Node Structure**

### **Singly Linked List**

```java
class ListNode {
    int val;
    ListNode next;

    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) {
        this.val = val;
        this.next = next;
    }
}
```

### **Core Operations**

```java
public class LinkedListOperations {

    // Insert at beginning - O(1)
    public static ListNode insertFirst(ListNode head, int val) {
        ListNode newNode = new ListNode(val);
        newNode.next = head;
        return newNode;
    }

    // Delete by value - O(n)
    public static ListNode delete(ListNode head, int val) {
        if (head == null) return null;

        if (head.val == val) {
            return head.next;
        }

        ListNode current = head;
        while (current.next != null && current.next.val != val) {
            current = current.next;
        }

        if (current.next != null) {
            current.next = current.next.next;
        }

        return head;
    }

    // Display list - O(n)
    public static void display(ListNode head) {
        ListNode current = head;
        while (current != null) {
            System.out.print(current.val + " -> ");
            current = current.next;
        }
        System.out.println("null");
    }
}
```

## 🎮 **Essential Patterns**

### **Pattern 1: Two Pointers (Fast & Slow)**

#### **Floyd's Cycle Detection**

```java
public class CycleDetection {

    // Detect cycle - O(n) time, O(1) space
    public static boolean hasCycle(ListNode head) {
        if (head == null || head.next == null) return false;

        ListNode slow = head;
        ListNode fast = head.next;

        while (fast != null && fast.next != null) {
            if (slow == fast) return true;
            slow = slow.next;
            fast = fast.next.next;
        }

        return false;
    }

    // Find middle node
    public static ListNode findMiddle(ListNode head) {
        if (head == null) return null;

        ListNode slow = head;
        ListNode fast = head;

        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }

        return slow;
    }
}
```

### **Pattern 2: Reverse Operations**

```java
public class ReverseOperations {

    // Reverse entire list - O(n) time, O(1) space
    public static ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode current = head;

        while (current != null) {
            ListNode nextTemp = current.next;
            current.next = prev;
            prev = current;
            current = nextTemp;
        }

        return prev;
    }

    // Remove nth node from end
    public static ListNode removeNthFromEnd(ListNode head, int n) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;

        ListNode first = dummy;
        ListNode second = dummy;

        // Move first n+1 steps ahead
        for (int i = 0; i <= n; i++) {
            first = first.next;
        }

        // Move both until first reaches end
        while (first != null) {
            first = first.next;
            second = second.next;
        }

        second.next = second.next.next;
        return dummy.next;
    }
}
```

### **Pattern 3: Merge Operations**

```java
public class MergeOperations {

    // Merge two sorted lists
    public static ListNode mergeTwoLists(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode current = dummy;

        while (l1 != null && l2 != null) {
            if (l1.val <= l2.val) {
                current.next = l1;
                l1 = l1.next;
            } else {
                current.next = l2;
                l2 = l2.next;
            }
            current = current.next;
        }

        current.next = (l1 != null) ? l1 : l2;
        return dummy.next;
    }
}
```

## 📊 **Complexity Analysis**

| Operation        | Singly LL | Array  | Notes             |
| ---------------- | --------- | ------ | ----------------- |
| Insert Beginning | O(1)      | O(n)   | LL advantage      |
| Insert End       | O(n)      | O(1)\* | Need tail pointer |
| Delete Beginning | O(1)      | O(n)   | LL advantage      |
| Search           | O(n)      | O(n)   | Linear search     |
| Random Access    | O(n)      | O(1)   | Array advantage   |

## 🎯 **Common Problems**

### **Easy Level**

1. **Reverse Linked List** - Basic reversal pattern
2. **Merge Two Sorted Lists** - Two pointer technique
3. **Remove Duplicates** - Simple traversal
4. **Linked List Cycle** - Floyd's algorithm

### **Medium Level**

1. **Remove Nth from End** - Two pointer with gap
2. **Add Two Numbers** - Carry handling
3. **Reorder List** - Multiple patterns combined
4. **Copy List with Random Pointer** - HashMap approach

---

_Master linked lists to handle dynamic data structures efficiently!_
