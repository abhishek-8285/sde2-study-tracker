# Trees & Tree Traversal 🌳

## 🎯 **Overview**

Trees are hierarchical data structures consisting of nodes connected by edges. They're fundamental for organizing data with natural hierarchical relationships and enable efficient searching, insertion, and deletion operations.

## 💡 **Basic Tree Structure**

### **Binary Tree Node**

```java
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;

    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}
```

### **Tree Terminology**

- **Root**: Top node with no parent
- **Leaf**: Node with no children
- **Height**: Longest path from root to leaf
- **Depth**: Distance from root to node
- **Subtree**: Tree rooted at any node

## 🔄 **Tree Traversal Methods**

### **Depth-First Search (DFS)**

#### **1. Inorder Traversal (Left → Root → Right)**

```java
public class InorderTraversal {

    // Recursive approach - O(n) time, O(h) space
    public static void inorderRecursive(TreeNode root) {
        if (root == null) return;

        inorderRecursive(root.left);   // Visit left subtree
        System.out.print(root.val + " ");  // Process root
        inorderRecursive(root.right);  // Visit right subtree
    }

    // Iterative approach using stack
    public static List<Integer> inorderIterative(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        Stack<TreeNode> stack = new Stack<>();
        TreeNode current = root;

        while (current != null || !stack.isEmpty()) {
            // Go to leftmost node
            while (current != null) {
                stack.push(current);
                current = current.left;
            }

            // Process current node
            current = stack.pop();
            result.add(current.val);

            // Move to right subtree
            current = current.right;
        }

        return result;
    }
}
```

#### **2. Preorder Traversal (Root → Left → Right)**

```java
public class PreorderTraversal {

    // Recursive approach
    public static void preorderRecursive(TreeNode root) {
        if (root == null) return;

        System.out.print(root.val + " ");  // Process root
        preorderRecursive(root.left);      // Visit left subtree
        preorderRecursive(root.right);     // Visit right subtree
    }

    // Iterative approach
    public static List<Integer> preorderIterative(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        if (root == null) return result;

        Stack<TreeNode> stack = new Stack<>();
        stack.push(root);

        while (!stack.isEmpty()) {
            TreeNode node = stack.pop();
            result.add(node.val);

            // Push right first (LIFO - will be processed after left)
            if (node.right != null) stack.push(node.right);
            if (node.left != null) stack.push(node.left);
        }

        return result;
    }
}
```

#### **3. Postorder Traversal (Left → Right → Root)**

```java
public class PostorderTraversal {

    // Recursive approach
    public static void postorderRecursive(TreeNode root) {
        if (root == null) return;

        postorderRecursive(root.left);     // Visit left subtree
        postorderRecursive(root.right);    // Visit right subtree
        System.out.print(root.val + " ");  // Process root
    }

    // Iterative approach using two stacks
    public static List<Integer> postorderIterative(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        if (root == null) return result;

        Stack<TreeNode> stack1 = new Stack<>();
        Stack<TreeNode> stack2 = new Stack<>();

        stack1.push(root);

        while (!stack1.isEmpty()) {
            TreeNode node = stack1.pop();
            stack2.push(node);

            if (node.left != null) stack1.push(node.left);
            if (node.right != null) stack1.push(node.right);
        }

        while (!stack2.isEmpty()) {
            result.add(stack2.pop().val);
        }

        return result;
    }
}
```

### **Breadth-First Search (BFS)**

#### **Level Order Traversal**

```java
import java.util.*;

public class LevelOrderTraversal {

    // Level by level traversal
    public static List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;

        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);

        while (!queue.isEmpty()) {
            int levelSize = queue.size();
            List<Integer> currentLevel = new ArrayList<>();

            for (int i = 0; i < levelSize; i++) {
                TreeNode node = queue.poll();
                currentLevel.add(node.val);

                if (node.left != null) queue.offer(node.left);
                if (node.right != null) queue.offer(node.right);
            }

            result.add(currentLevel);
        }

        return result;
    }

    // Zigzag level order (alternate left-right, right-left)
    public static List<List<Integer>> zigzagLevelOrder(TreeNode root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;

        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        boolean leftToRight = true;

        while (!queue.isEmpty()) {
            int levelSize = queue.size();
            List<Integer> currentLevel = new ArrayList<>();

            for (int i = 0; i < levelSize; i++) {
                TreeNode node = queue.poll();

                if (leftToRight) {
                    currentLevel.add(node.val);
                } else {
                    currentLevel.add(0, node.val); // Add at beginning
                }

                if (node.left != null) queue.offer(node.left);
                if (node.right != null) queue.offer(node.right);
            }

            result.add(currentLevel);
            leftToRight = !leftToRight; // Flip direction
        }

        return result;
    }
}
```

## 🎮 **Common Tree Patterns**

### **Pattern 1: Tree Properties**

#### **Maximum Depth/Height**

```java
public class TreeProperties {

    // Find maximum depth - O(n) time, O(h) space
    public static int maxDepth(TreeNode root) {
        if (root == null) return 0;

        int leftDepth = maxDepth(root.left);
        int rightDepth = maxDepth(root.right);

        return Math.max(leftDepth, rightDepth) + 1;
    }

    // Check if tree is balanced
    public static boolean isBalanced(TreeNode root) {
        return checkBalance(root) != -1;
    }

    private static int checkBalance(TreeNode node) {
        if (node == null) return 0;

        int leftHeight = checkBalance(node.left);
        if (leftHeight == -1) return -1;

        int rightHeight = checkBalance(node.right);
        if (rightHeight == -1) return -1;

        if (Math.abs(leftHeight - rightHeight) > 1) return -1;

        return Math.max(leftHeight, rightHeight) + 1;
    }

    // Check if tree is symmetric
    public static boolean isSymmetric(TreeNode root) {
        if (root == null) return true;
        return isMirror(root.left, root.right);
    }

    private static boolean isMirror(TreeNode left, TreeNode right) {
        if (left == null && right == null) return true;
        if (left == null || right == null) return false;

        return left.val == right.val &&
               isMirror(left.left, right.right) &&
               isMirror(left.right, right.left);
    }
}
```

### **Pattern 2: Path Problems**

#### **Path Sum**

```java
public class PathProblems {

    // Check if path sum exists from root to leaf
    public static boolean hasPathSum(TreeNode root, int targetSum) {
        if (root == null) return false;

        // Leaf node
        if (root.left == null && root.right == null) {
            return root.val == targetSum;
        }

        int remainingSum = targetSum - root.val;
        return hasPathSum(root.left, remainingSum) ||
               hasPathSum(root.right, remainingSum);
    }

    // Find all root-to-leaf paths with target sum
    public static List<List<Integer>> pathSum(TreeNode root, int targetSum) {
        List<List<Integer>> result = new ArrayList<>();
        List<Integer> currentPath = new ArrayList<>();
        findPaths(root, targetSum, currentPath, result);
        return result;
    }

    private static void findPaths(TreeNode node, int targetSum,
                                  List<Integer> currentPath,
                                  List<List<Integer>> result) {
        if (node == null) return;

        currentPath.add(node.val);

        // Leaf node with target sum
        if (node.left == null && node.right == null &&
            node.val == targetSum) {
            result.add(new ArrayList<>(currentPath));
        }

        // Recurse on children
        int remainingSum = targetSum - node.val;
        findPaths(node.left, remainingSum, currentPath, result);
        findPaths(node.right, remainingSum, currentPath, result);

        // Backtrack
        currentPath.remove(currentPath.size() - 1);
    }

    // Maximum path sum (any path)
    private static int maxPathSum = Integer.MIN_VALUE;

    public static int maxPathSum(TreeNode root) {
        maxPathSum = Integer.MIN_VALUE;
        maxPathSumHelper(root);
        return maxPathSum;
    }

    private static int maxPathSumHelper(TreeNode node) {
        if (node == null) return 0;

        // Get max sum from left and right subtrees (ignore negative)
        int leftSum = Math.max(0, maxPathSumHelper(node.left));
        int rightSum = Math.max(0, maxPathSumHelper(node.right));

        // Current path sum including this node
        int currentPathSum = node.val + leftSum + rightSum;
        maxPathSum = Math.max(maxPathSum, currentPathSum);

        // Return max sum path through this node
        return node.val + Math.max(leftSum, rightSum);
    }
}
```

### **Pattern 3: Binary Search Tree (BST)**

#### **BST Operations**

```java
public class BSTOperations {

    // Validate BST
    public static boolean isValidBST(TreeNode root) {
        return validate(root, null, null);
    }

    private static boolean validate(TreeNode node, Integer min, Integer max) {
        if (node == null) return true;

        if ((min != null && node.val <= min) ||
            (max != null && node.val >= max)) {
            return false;
        }

        return validate(node.left, min, node.val) &&
               validate(node.right, node.val, max);
    }

    // Insert into BST
    public static TreeNode insertIntoBST(TreeNode root, int val) {
        if (root == null) return new TreeNode(val);

        if (val < root.val) {
            root.left = insertIntoBST(root.left, val);
        } else {
            root.right = insertIntoBST(root.right, val);
        }

        return root;
    }

    // Delete from BST
    public static TreeNode deleteNode(TreeNode root, int key) {
        if (root == null) return null;

        if (key < root.val) {
            root.left = deleteNode(root.left, key);
        } else if (key > root.val) {
            root.right = deleteNode(root.right, key);
        } else {
            // Node to delete found
            if (root.left == null) return root.right;
            if (root.right == null) return root.left;

            // Node has two children - find inorder successor
            TreeNode successor = findMin(root.right);
            root.val = successor.val;
            root.right = deleteNode(root.right, successor.val);
        }

        return root;
    }

    private static TreeNode findMin(TreeNode node) {
        while (node.left != null) {
            node = node.left;
        }
        return node;
    }
}
```

## 📊 **Complexity Analysis**

| Operation | Binary Tree | BST (Balanced) | BST (Skewed) |
| --------- | ----------- | -------------- | ------------ |
| Search    | O(n)        | O(log n)       | O(n)         |
| Insert    | O(n)        | O(log n)       | O(n)         |
| Delete    | O(n)        | O(log n)       | O(n)         |
| Traversal | O(n)        | O(n)           | O(n)         |
| Space     | O(h)        | O(log n)       | O(n)         |

## 🎯 **Tree Construction**

### **Build Tree from Traversals**

```java
public class TreeConstruction {

    // Build tree from preorder and inorder
    public static TreeNode buildTree(int[] preorder, int[] inorder) {
        Map<Integer, Integer> inorderMap = new HashMap<>();
        for (int i = 0; i < inorder.length; i++) {
            inorderMap.put(inorder[i], i);
        }

        return buildTreeHelper(preorder, 0, preorder.length - 1,
                               inorder, 0, inorder.length - 1, inorderMap);
    }

    private static TreeNode buildTreeHelper(int[] preorder, int preStart, int preEnd,
                                            int[] inorder, int inStart, int inEnd,
                                            Map<Integer, Integer> inorderMap) {
        if (preStart > preEnd) return null;

        int rootVal = preorder[preStart];
        TreeNode root = new TreeNode(rootVal);

        int rootIndex = inorderMap.get(rootVal);
        int leftSize = rootIndex - inStart;

        root.left = buildTreeHelper(preorder, preStart + 1, preStart + leftSize,
                                    inorder, inStart, rootIndex - 1, inorderMap);
        root.right = buildTreeHelper(preorder, preStart + leftSize + 1, preEnd,
                                     inorder, rootIndex + 1, inEnd, inorderMap);

        return root;
    }
}
```

## 🎮 **Problem Categories**

### **Easy Level**

1. **Maximum Depth** - Basic tree property
2. **Same Tree** - Tree comparison
3. **Invert Binary Tree** - Tree transformation
4. **Symmetric Tree** - Mirror property

### **Medium Level**

1. **Binary Tree Level Order** - BFS traversal
2. **Path Sum II** - Backtracking in trees
3. **Validate BST** - Tree property validation
4. **Lowest Common Ancestor** - Tree relationship

### **Hard Level**

1. **Binary Tree Maximum Path Sum** - Complex path problems
2. **Serialize/Deserialize Tree** - Tree encoding
3. **Recover BST** - Tree correction
4. **Binary Tree Cameras** - Optimization problems

---

_Master tree traversals and patterns to handle hierarchical data structures efficiently!_
