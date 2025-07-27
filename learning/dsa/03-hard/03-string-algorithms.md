# String Algorithms 📝

## 🎯 **Overview**

String algorithms are essential for text processing, pattern matching, and data compression. They form the backbone of search engines, DNA analysis, text editors, and many other applications requiring efficient string manipulation.

## 🔍 **Pattern Matching Algorithms**

### **Knuth-Morris-Pratt (KMP) Algorithm**

```java
public class KMPAlgorithm {

    // Build LPS (Longest Proper Prefix which is also Suffix) array
    private static int[] buildLPS(String pattern) {
        int m = pattern.length();
        int[] lps = new int[m];
        int length = 0; // Length of previous longest prefix suffix
        int i = 1;

        while (i < m) {
            if (pattern.charAt(i) == pattern.charAt(length)) {
                length++;
                lps[i] = length;
                i++;
            } else {
                if (length != 0) {
                    length = lps[length - 1];
                } else {
                    lps[i] = 0;
                    i++;
                }
            }
        }

        return lps;
    }

    // KMP pattern search - O(n + m) time complexity
    public static List<Integer> kmpSearch(String text, String pattern) {
        List<Integer> matches = new ArrayList<>();
        int n = text.length();
        int m = pattern.length();

        if (m == 0) return matches;

        int[] lps = buildLPS(pattern);

        int i = 0; // Index for text
        int j = 0; // Index for pattern

        while (i < n) {
            if (text.charAt(i) == pattern.charAt(j)) {
                i++;
                j++;
            }

            if (j == m) {
                matches.add(i - j); // Found match at index i-j
                j = lps[j - 1];
            } else if (i < n && text.charAt(i) != pattern.charAt(j)) {
                if (j != 0) {
                    j = lps[j - 1];
                } else {
                    i++;
                }
            }
        }

        return matches;
    }
}
```

**LPS Array Example for pattern "ABABCABAB":**

```
Pattern: A B A B C A B A B
Index:   0 1 2 3 4 5 6 7 8
LPS:     0 0 1 2 0 1 2 3 4

Explanation:
- LPS[0] = 0 (single character has no proper prefix/suffix)
- LPS[3] = 2 ("ABAB" has "AB" as longest proper prefix that's also suffix)
- LPS[8] = 4 ("ABABCABAB" has "ABAB" as longest proper prefix that's also suffix)
```

### **Rabin-Karp Algorithm**

```java
public class RabinKarpAlgorithm {

    private static final int PRIME = 101; // A prime number for hashing

    public static List<Integer> rabinKarpSearch(String text, String pattern) {
        List<Integer> matches = new ArrayList<>();
        int n = text.length();
        int m = pattern.length();

        if (m > n) return matches;

        // Calculate hash of pattern and first window of text
        long patternHash = 0;
        long textHash = 0;
        long h = 1; // pow(256, m-1) % PRIME

        // Calculate h = pow(256, m-1) % PRIME
        for (int i = 0; i < m - 1; i++) {
            h = (h * 256) % PRIME;
        }

        // Calculate hash of pattern and first window
        for (int i = 0; i < m; i++) {
            patternHash = (256 * patternHash + pattern.charAt(i)) % PRIME;
            textHash = (256 * textHash + text.charAt(i)) % PRIME;
        }

        // Slide the pattern over text
        for (int i = 0; i <= n - m; i++) {
            // Check if hash values match
            if (patternHash == textHash) {
                // Check character by character (to handle hash collisions)
                boolean match = true;
                for (int j = 0; j < m; j++) {
                    if (text.charAt(i + j) != pattern.charAt(j)) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    matches.add(i);
                }
            }

            // Calculate hash for next window
            if (i < n - m) {
                textHash = (256 * (textHash - text.charAt(i) * h) + text.charAt(i + m)) % PRIME;

                // Convert negative hash to positive
                if (textHash < 0) {
                    textHash += PRIME;
                }
            }
        }

        return matches;
    }
}
```

### **Z Algorithm**

```java
public class ZAlgorithm {

    // Z array: Z[i] = length of longest substring starting from S[i]
    // which is also a prefix of S
    public static int[] computeZArray(String s) {
        int n = s.length();
        int[] z = new int[n];

        // [L, R] make a window which matches with prefix of s
        int L = 0, R = 0;

        for (int i = 1; i < n; i++) {
            // If i > R, nothing matches so we will calculate z[i] using naive method
            if (i > R) {
                L = R = i;

                // R-L = 0 in starting, so it will start checking from 0'th index
                while (R < n && s.charAt(R - L) == s.charAt(R)) {
                    R++;
                }
                z[i] = R - L;
                R--;
            } else {
                // k = i - L, so k corresponds to number which matches in [L, R] interval
                int k = i - L;

                // If z[k] is less than remaining interval then z[i] will be equal to z[k]
                if (z[k] < R - i + 1) {
                    z[i] = z[k];
                } else {
                    // Else start from R and check manually
                    L = i;
                    while (R < n && s.charAt(R - L) == s.charAt(R)) {
                        R++;
                    }
                    z[i] = R - L;
                    R--;
                }
            }
        }

        return z;
    }

    // Pattern searching using Z algorithm
    public static List<Integer> zSearch(String text, String pattern) {
        List<Integer> matches = new ArrayList<>();
        String combined = pattern + "$" + text; // $ is a delimiter

        int[] z = computeZArray(combined);
        int patternLength = pattern.length();

        for (int i = 0; i < z.length; i++) {
            if (z[i] == patternLength) {
                matches.add(i - patternLength - 1); // Adjust for delimiter
            }
        }

        return matches;
    }
}
```

## 🎯 **Advanced String Algorithms**

### **Manacher's Algorithm (Longest Palindromic Substring)**

```java
public class ManacherAlgorithm {

    // Find longest palindromic substring in O(n) time
    public static String longestPalindrome(String s) {
        if (s == null || s.length() == 0) return "";

        // Transform string to handle even-length palindromes
        String transformed = transformString(s);
        int n = transformed.length();
        int[] P = new int[n]; // P[i] = radius of palindrome centered at i

        int center = 0, right = 0; // Current palindrome center and right boundary
        int maxLen = 0, centerIndex = 0;

        for (int i = 0; i < n; i++) {
            // Mirror of i with respect to center
            int mirror = 2 * center - i;

            // If i is within current palindrome's right boundary
            if (i < right) {
                P[i] = Math.min(right - i, P[mirror]);
            }

            // Try to expand palindrome centered at i
            try {
                while (i + P[i] + 1 < n && i - P[i] - 1 >= 0 &&
                       transformed.charAt(i + P[i] + 1) == transformed.charAt(i - P[i] - 1)) {
                    P[i]++;
                }
            } catch (Exception e) {
                // Handle boundary cases
            }

            // If palindrome centered at i extends past right, adjust center and right
            if (i + P[i] > right) {
                center = i;
                right = i + P[i];
            }

            // Update maximum length palindrome
            if (P[i] > maxLen) {
                maxLen = P[i];
                centerIndex = i;
            }
        }

        // Extract original palindrome from transformed string
        int start = (centerIndex - maxLen) / 2;
        return s.substring(start, start + maxLen);
    }

    private static String transformString(String s) {
        StringBuilder sb = new StringBuilder();
        sb.append("^#"); // Start markers

        for (char c : s.toCharArray()) {
            sb.append(c).append("#");
        }

        sb.append("$"); // End marker
        return sb.toString();
    }
}
```

### **Suffix Array Construction**

```java
public class SuffixArray {

    // Build suffix array using comparison-based sorting O(n^2 log n)
    public static int[] buildSuffixArray(String s) {
        int n = s.length();
        Integer[] suffixes = new Integer[n];

        // Initialize suffix indices
        for (int i = 0; i < n; i++) {
            suffixes[i] = i;
        }

        // Sort suffixes based on lexicographic order
        Arrays.sort(suffixes, (a, b) -> s.substring(a).compareTo(s.substring(b)));

        return Arrays.stream(suffixes).mapToInt(i -> i).toArray();
    }

    // Optimized suffix array construction O(n log^2 n)
    public static int[] buildSuffixArrayOptimized(String s) {
        int n = s.length();
        int[][] suffixes = new int[n][3]; // [index, rank, next_rank]

        // Initialize with first character ranks
        for (int i = 0; i < n; i++) {
            suffixes[i][0] = i;
            suffixes[i][1] = s.charAt(i) - 'a';
            suffixes[i][2] = (i + 1 < n) ? s.charAt(i + 1) - 'a' : -1;
        }

        // Sort by first 2 characters
        Arrays.sort(suffixes, (a, b) -> {
            if (a[1] != b[1]) return Integer.compare(a[1], b[1]);
            return Integer.compare(a[2], b[2]);
        });

        int[] indices = new int[n];

        // Build suffix array iteratively
        for (int k = 4; k < 2 * n; k *= 2) {
            // Assign new ranks
            int rank = 0;
            int prevRank = suffixes[0][1];
            suffixes[0][1] = rank;
            indices[suffixes[0][0]] = 0;

            for (int i = 1; i < n; i++) {
                if (suffixes[i][1] == prevRank && suffixes[i][2] == suffixes[i-1][2]) {
                    suffixes[i][1] = rank;
                } else {
                    prevRank = suffixes[i][1];
                    suffixes[i][1] = ++rank;
                }
                indices[suffixes[i][0]] = i;
            }

            // Update next ranks
            for (int i = 0; i < n; i++) {
                int nextIndex = suffixes[i][0] + k / 2;
                suffixes[i][2] = (nextIndex < n) ? suffixes[indices[nextIndex]][1] : -1;
            }

            // Sort by updated ranks
            Arrays.sort(suffixes, (a, b) -> {
                if (a[1] != b[1]) return Integer.compare(a[1], b[1]);
                return Integer.compare(a[2], b[2]);
            });
        }

        int[] suffixArray = new int[n];
        for (int i = 0; i < n; i++) {
            suffixArray[i] = suffixes[i][0];
        }

        return suffixArray;
    }

    // Build LCP (Longest Common Prefix) array
    public static int[] buildLCPArray(String s, int[] suffixArray) {
        int n = s.length();
        int[] lcp = new int[n - 1];
        int[] rank = new int[n];

        // Build rank array
        for (int i = 0; i < n; i++) {
            rank[suffixArray[i]] = i;
        }

        int h = 0; // Height of current LCP
        for (int i = 0; i < n; i++) {
            if (rank[i] > 0) {
                int j = suffixArray[rank[i] - 1];

                while (i + h < n && j + h < n && s.charAt(i + h) == s.charAt(j + h)) {
                    h++;
                }

                lcp[rank[i] - 1] = h;

                if (h > 0) h--;
            }
        }

        return lcp;
    }
}
```

### **Aho-Corasick Algorithm (Multiple Pattern Matching)**

```java
import java.util.*;

public class AhoCorasick {

    static class TrieNode {
        Map<Character, TrieNode> children = new HashMap<>();
        TrieNode failure = null;
        List<String> output = new ArrayList<>();

        boolean containsKey(char ch) {
            return children.containsKey(ch);
        }

        TrieNode get(char ch) {
            return children.get(ch);
        }

        void put(char ch, TrieNode node) {
            children.put(ch, node);
        }
    }

    private TrieNode root;

    public AhoCorasick(String[] patterns) {
        root = new TrieNode();

        // Build trie
        for (String pattern : patterns) {
            insert(pattern);
        }

        // Build failure links
        buildFailureLinks();
    }

    private void insert(String word) {
        TrieNode node = root;

        for (char ch : word.toCharArray()) {
            if (!node.containsKey(ch)) {
                node.put(ch, new TrieNode());
            }
            node = node.get(ch);
        }

        node.output.add(word);
    }

    private void buildFailureLinks() {
        Queue<TrieNode> queue = new LinkedList<>();

        // Set failure links for depth 1 nodes
        for (TrieNode child : root.children.values()) {
            child.failure = root;
            queue.offer(child);
        }

        while (!queue.isEmpty()) {
            TrieNode current = queue.poll();

            for (Map.Entry<Character, TrieNode> entry : current.children.entrySet()) {
                char ch = entry.getKey();
                TrieNode child = entry.getValue();

                queue.offer(child);

                // Find failure link
                TrieNode temp = current.failure;
                while (temp != null && !temp.containsKey(ch)) {
                    temp = temp.failure;
                }

                child.failure = (temp != null) ? temp.get(ch) : root;

                // Add output from failure link
                child.output.addAll(child.failure.output);
            }
        }
    }

    public List<Match> search(String text) {
        List<Match> matches = new ArrayList<>();
        TrieNode current = root;

        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);

            // Follow failure links until we find a valid transition
            while (current != null && !current.containsKey(ch)) {
                current = current.failure;
            }

            if (current == null) {
                current = root;
                continue;
            }

            current = current.get(ch);

            // Report all patterns ending at current position
            for (String pattern : current.output) {
                matches.add(new Match(pattern, i - pattern.length() + 1));
            }
        }

        return matches;
    }

    static class Match {
        String pattern;
        int position;

        Match(String pattern, int position) {
            this.pattern = pattern;
            this.position = position;
        }

        @Override
        public String toString() {
            return "Pattern '" + pattern + "' found at position " + position;
        }
    }
}
```

## 🔤 **String Transformation Algorithms**

### **Edit Distance (Levenshtein Distance)**

```java
public class EditDistance {

    // Calculate minimum edit distance between two strings
    public static int editDistance(String s1, String s2) {
        int m = s1.length();
        int n = s2.length();

        // dp[i][j] = min operations to convert s1[0...i-1] to s2[0...j-1]
        int[][] dp = new int[m + 1][n + 1];

        // Initialize base cases
        for (int i = 0; i <= m; i++) {
            dp[i][0] = i; // Delete all characters from s1
        }

        for (int j = 0; j <= n; j++) {
            dp[0][j] = j; // Insert all characters to empty string
        }

        // Fill the DP table
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1]; // No operation needed
                } else {
                    dp[i][j] = 1 + Math.min(
                        Math.min(dp[i - 1][j],     // Delete
                                dp[i][j - 1]),     // Insert
                        dp[i - 1][j - 1]           // Replace
                    );
                }
            }
        }

        return dp[m][n];
    }

    // Space-optimized version
    public static int editDistanceOptimized(String s1, String s2) {
        int m = s1.length();
        int n = s2.length();

        // Ensure s1 is the shorter string for space optimization
        if (m > n) {
            return editDistanceOptimized(s2, s1);
        }

        int[] prev = new int[m + 1];
        int[] curr = new int[m + 1];

        // Initialize base case
        for (int i = 0; i <= m; i++) {
            prev[i] = i;
        }

        for (int j = 1; j <= n; j++) {
            curr[0] = j;

            for (int i = 1; i <= m; i++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                    curr[i] = prev[i - 1];
                } else {
                    curr[i] = 1 + Math.min(
                        Math.min(prev[i], curr[i - 1]),
                        prev[i - 1]
                    );
                }
            }

            // Swap arrays
            int[] temp = prev;
            prev = curr;
            curr = temp;
        }

        return prev[m];
    }

    // Get actual edit operations
    public static List<String> getEditOperations(String s1, String s2) {
        int m = s1.length();
        int n = s2.length();
        int[][] dp = new int[m + 1][n + 1];

        // Fill DP table (same as editDistance method)
        for (int i = 0; i <= m; i++) dp[i][0] = i;
        for (int j = 0; j <= n; j++) dp[0][j] = j;

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(Math.min(dp[i - 1][j], dp[i][j - 1]), dp[i - 1][j - 1]);
                }
            }
        }

        // Backtrack to find operations
        List<String> operations = new ArrayList<>();
        int i = m, j = n;

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && s1.charAt(i - 1) == s2.charAt(j - 1)) {
                i--;
                j--;
            } else if (i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + 1) {
                operations.add("Replace " + s1.charAt(i - 1) + " with " + s2.charAt(j - 1));
                i--;
                j--;
            } else if (i > 0 && dp[i][j] == dp[i - 1][j] + 1) {
                operations.add("Delete " + s1.charAt(i - 1));
                i--;
            } else {
                operations.add("Insert " + s2.charAt(j - 1));
                j--;
            }
        }

        Collections.reverse(operations);
        return operations;
    }
}
```

### **Longest Common Subsequence**

```java
public class LongestCommonSubsequence {

    public static int lcs(String s1, String s2) {
        int m = s1.length();
        int n = s2.length();

        int[][] dp = new int[m + 1][n + 1];

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        return dp[m][n];
    }

    // Get actual LCS string
    public static String getLCS(String s1, String s2) {
        int m = s1.length();
        int n = s2.length();
        int[][] dp = new int[m + 1][n + 1];

        // Fill DP table
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        // Backtrack to build LCS
        StringBuilder lcs = new StringBuilder();
        int i = m, j = n;

        while (i > 0 && j > 0) {
            if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                lcs.append(s1.charAt(i - 1));
                i--;
                j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }

        return lcs.reverse().toString();
    }
}
```

## 🎮 **Problem Categories**

### **Pattern Matching Problems**

1. **Implement strStr()** - Basic pattern matching
2. **Repeated String Match** - Multiple occurrences
3. **Find All Anagrams** - Sliding window with frequency
4. **Regular Expression Matching** - Advanced pattern matching

### **String Transformation**

1. **Edit Distance** - Minimum operations to transform
2. **One Edit Distance** - Check if strings are one edit apart
3. **Delete Columns to Make Sorted** - Column-wise sorting
4. **Minimum Window Substring** - Sliding window optimization

### **Advanced String Problems**

1. **Longest Palindromic Substring** - Manacher's algorithm
2. **Shortest Palindrome** - KMP with string manipulation
3. **Word Break II** - Backtracking with memoization
4. **Concatenated Words** - Trie with dynamic programming

### **String Data Structures**

1. **Implement Trie** - Prefix tree construction
2. **Design Search Autocomplete** - Trie with ranking
3. **Word Search II** - Backtracking with trie
4. **Stream of Characters** - Aho-Corasick algorithm

---

_Master string algorithms to efficiently process and manipulate text data in various applications!_
