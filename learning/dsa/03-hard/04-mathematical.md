# Mathematical Algorithms 🔢

## 🎯 **Overview**

Mathematical algorithms solve problems involving number theory, combinatorics, probability, and computational geometry. These algorithms are essential for competitive programming, cryptography, and scientific computing applications.

## 🔢 **Number Theory Algorithms**

### **Prime Number Algorithms**

#### **Sieve of Eratosthenes**

```java
import java.util.*;

public class PrimeAlgorithms {

    // Generate all primes up to n - O(n log log n)
    public static boolean[] sieveOfEratosthenes(int n) {
        boolean[] isPrime = new boolean[n + 1];
        Arrays.fill(isPrime, true);
        isPrime[0] = isPrime[1] = false;

        for (int i = 2; i * i <= n; i++) {
            if (isPrime[i]) {
                // Mark multiples of i as composite
                for (int j = i * i; j <= n; j += i) {
                    isPrime[j] = false;
                }
            }
        }

        return isPrime;
    }

    // Get list of primes up to n
    public static List<Integer> getPrimes(int n) {
        boolean[] isPrime = sieveOfEratosthenes(n);
        List<Integer> primes = new ArrayList<>();

        for (int i = 2; i <= n; i++) {
            if (isPrime[i]) {
                primes.add(i);
            }
        }

        return primes;
    }

    // Check if number is prime - O(√n)
    public static boolean isPrime(long n) {
        if (n <= 1) return false;
        if (n <= 3) return true;
        if (n % 2 == 0 || n % 3 == 0) return false;

        for (long i = 5; i * i <= n; i += 6) {
            if (n % i == 0 || n % (i + 2) == 0) {
                return false;
            }
        }

        return true;
    }

    // Miller-Rabin primality test - O(k log³ n)
    public static boolean millerRabinTest(long n, int k) {
        if (n < 2) return false;
        if (n == 2 || n == 3) return true;
        if (n % 2 == 0) return false;

        // Write n-1 as d * 2^r
        long d = n - 1;
        int r = 0;
        while (d % 2 == 0) {
            d /= 2;
            r++;
        }

        Random random = new Random();

        // Perform k rounds of testing
        for (int i = 0; i < k; i++) {
            long a = 2 + random.nextLong() % (n - 4);
            long x = modularExponentiation(a, d, n);

            if (x == 1 || x == n - 1) continue;

            boolean composite = true;
            for (int j = 0; j < r - 1; j++) {
                x = modularMultiplication(x, x, n);
                if (x == n - 1) {
                    composite = false;
                    break;
                }
            }

            if (composite) return false;
        }

        return true;
    }
}
```

### **Modular Arithmetic**

```java
public class ModularArithmetic {

    // Modular exponentiation: (base^exp) % mod - O(log exp)
    public static long modularExponentiation(long base, long exp, long mod) {
        long result = 1;
        base %= mod;

        while (exp > 0) {
            if (exp % 2 == 1) {
                result = (result * base) % mod;
            }
            exp >>= 1;
            base = (base * base) % mod;
        }

        return result;
    }

    // Modular multiplication to prevent overflow
    public static long modularMultiplication(long a, long b, long mod) {
        return ((a % mod) * (b % mod)) % mod;
    }

    // Extended Euclidean Algorithm
    public static class ExtendedGCDResult {
        long gcd, x, y;

        ExtendedGCDResult(long gcd, long x, long y) {
            this.gcd = gcd;
            this.x = x;
            this.y = y;
        }
    }

    public static ExtendedGCDResult extendedGCD(long a, long b) {
        if (b == 0) {
            return new ExtendedGCDResult(a, 1, 0);
        }

        ExtendedGCDResult result = extendedGCD(b, a % b);
        long x = result.y;
        long y = result.x - (a / b) * result.y;

        return new ExtendedGCDResult(result.gcd, x, y);
    }

    // Modular multiplicative inverse
    public static long modularInverse(long a, long mod) {
        ExtendedGCDResult result = extendedGCD(a, mod);

        if (result.gcd != 1) {
            throw new IllegalArgumentException("Modular inverse doesn't exist");
        }

        return (result.x % mod + mod) % mod;
    }

    // Chinese Remainder Theorem
    public static long chineseRemainderTheorem(long[] remainders, long[] moduli) {
        long prod = 1;
        for (long mod : moduli) {
            prod *= mod;
        }

        long result = 0;
        for (int i = 0; i < remainders.length; i++) {
            long partialProd = prod / moduli[i];
            long inverse = modularInverse(partialProd, moduli[i]);
            result += remainders[i] * partialProd * inverse;
        }

        return result % prod;
    }
}
```

### **Prime Factorization**

```java
public class PrimeFactorization {

    // Prime factorization - O(√n)
    public static Map<Long, Integer> primeFactors(long n) {
        Map<Long, Integer> factors = new HashMap<>();

        // Handle factor 2
        while (n % 2 == 0) {
            factors.put(2L, factors.getOrDefault(2L, 0) + 1);
            n /= 2;
        }

        // Check odd factors
        for (long i = 3; i * i <= n; i += 2) {
            while (n % i == 0) {
                factors.put(i, factors.getOrDefault(i, 0) + 1);
                n /= i;
            }
        }

        // If n is still > 1, it's a prime factor
        if (n > 1) {
            factors.put(n, 1);
        }

        return factors;
    }

    // Pollard's rho algorithm for large numbers - O(n^(1/4))
    public static long pollardRho(long n) {
        if (n % 2 == 0) return 2;

        Random random = new Random();
        long x = random.nextLong() % (n - 2) + 2;
        long y = x;
        long c = random.nextLong() % (n - 1) + 1;
        long d = 1;

        while (d == 1) {
            x = (modularMultiplication(x, x, n) + c) % n;
            y = (modularMultiplication(y, y, n) + c) % n;
            y = (modularMultiplication(y, y, n) + c) % n;

            d = gcd(Math.abs(x - y), n);
        }

        return d;
    }

    public static long gcd(long a, long b) {
        while (b != 0) {
            long temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    private static long modularMultiplication(long a, long b, long mod) {
        return ((a % mod) * (b % mod)) % mod;
    }
}
```

## 🎲 **Combinatorics Algorithms**

### **Factorial and Combinations**

```java
public class Combinatorics {

    private static final int MOD = 1000000007;
    private static long[] factorial;
    private static long[] invFactorial;

    // Precompute factorials with modular arithmetic
    public static void precomputeFactorials(int n) {
        factorial = new long[n + 1];
        invFactorial = new long[n + 1];

        factorial[0] = 1;
        for (int i = 1; i <= n; i++) {
            factorial[i] = (factorial[i - 1] * i) % MOD;
        }

        invFactorial[n] = modularInverse(factorial[n], MOD);
        for (int i = n - 1; i >= 0; i--) {
            invFactorial[i] = (invFactorial[i + 1] * (i + 1)) % MOD;
        }
    }

    // nCr = n! / (r! * (n-r)!) mod MOD
    public static long combination(int n, int r) {
        if (r > n || r < 0) return 0;

        return (factorial[n] * invFactorial[r] % MOD) * invFactorial[n - r] % MOD;
    }

    // nPr = n! / (n-r)!
    public static long permutation(int n, int r) {
        if (r > n || r < 0) return 0;

        return factorial[n] * invFactorial[n - r] % MOD;
    }

    // Pascal's triangle for small values
    public static long[][] buildPascalTriangle(int n) {
        long[][] triangle = new long[n + 1][];

        for (int i = 0; i <= n; i++) {
            triangle[i] = new long[i + 1];
            triangle[i][0] = triangle[i][i] = 1;

            for (int j = 1; j < i; j++) {
                triangle[i][j] = triangle[i - 1][j - 1] + triangle[i - 1][j];
            }
        }

        return triangle;
    }

    // Catalan numbers: C_n = (2n)! / ((n+1)! * n!)
    public static long catalanNumber(int n) {
        return combination(2 * n, n) * modularInverse(n + 1, MOD) % MOD;
    }

    // Stars and bars: distribute n identical items into k bins
    public static long starsAndBars(int n, int k) {
        return combination(n + k - 1, k - 1);
    }

    private static long modularInverse(long a, long mod) {
        return modularExponentiation(a, mod - 2, mod);
    }

    private static long modularExponentiation(long base, long exp, long mod) {
        long result = 1;
        base %= mod;

        while (exp > 0) {
            if (exp % 2 == 1) {
                result = (result * base) % mod;
            }
            exp >>= 1;
            base = (base * base) % mod;
        }

        return result;
    }
}
```

### **Inclusion-Exclusion Principle**

```java
public class InclusionExclusion {

    // Count elements satisfying at least one condition
    public static long inclusionExclusion(int[] setSizes, int[][] intersections) {
        int n = setSizes.length;
        long result = 0;

        // Iterate through all subsets
        for (int mask = 1; mask < (1 << n); mask++) {
            long intersection = Long.MAX_VALUE;
            int bits = Integer.bitCount(mask);

            // Find intersection of sets in current subset
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) != 0) {
                    intersection = Math.min(intersection, setSizes[i]);
                }
            }

            // Apply inclusion-exclusion principle
            if (bits % 2 == 1) {
                result += intersection;
            } else {
                result -= intersection;
            }
        }

        return result;
    }

    // Derangements: permutations with no fixed points
    public static long derangements(int n) {
        if (n == 0) return 1;
        if (n == 1) return 0;

        long[] dp = new long[n + 1];
        dp[0] = 1;
        dp[1] = 0;

        for (int i = 2; i <= n; i++) {
            dp[i] = (i - 1) * (dp[i - 1] + dp[i - 2]);
        }

        return dp[n];
    }
}
```

## 🔢 **Matrix Operations**

### **Matrix Exponentiation**

```java
public class MatrixExponentiation {

    private static final int MOD = 1000000007;

    static class Matrix {
        long[][] mat;
        int n;

        Matrix(int n) {
            this.n = n;
            this.mat = new long[n][n];
        }

        Matrix(long[][] mat) {
            this.n = mat.length;
            this.mat = new long[n][n];
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    this.mat[i][j] = mat[i][j];
                }
            }
        }

        Matrix multiply(Matrix other) {
            Matrix result = new Matrix(n);

            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    for (int k = 0; k < n; k++) {
                        result.mat[i][j] = (result.mat[i][j] +
                                          mat[i][k] * other.mat[k][j]) % MOD;
                    }
                }
            }

            return result;
        }

        static Matrix identity(int n) {
            Matrix result = new Matrix(n);
            for (int i = 0; i < n; i++) {
                result.mat[i][i] = 1;
            }
            return result;
        }
    }

    // Matrix exponentiation - O(n³ log k)
    public static Matrix matrixPower(Matrix base, long exp) {
        Matrix result = Matrix.identity(base.n);

        while (exp > 0) {
            if (exp % 2 == 1) {
                result = result.multiply(base);
            }
            base = base.multiply(base);
            exp /= 2;
        }

        return result;
    }

    // Fibonacci using matrix exponentiation - O(log n)
    public static long fibonacciMatrix(long n) {
        if (n == 0) return 0;
        if (n == 1) return 1;

        Matrix base = new Matrix(new long[][]{{1, 1}, {1, 0}});
        Matrix result = matrixPower(base, n - 1);

        return result.mat[0][0];
    }

    // Linear recurrence solver
    public static long solveRecurrence(long[] coeffs, long[] initial, long n) {
        int k = coeffs.length;
        if (n < k) return initial[(int)n];

        // Build transformation matrix
        Matrix trans = new Matrix(k);
        for (int i = 0; i < k; i++) {
            trans.mat[0][i] = coeffs[i];
        }
        for (int i = 1; i < k; i++) {
            trans.mat[i][i - 1] = 1;
        }

        Matrix result = matrixPower(trans, n - k + 1);

        long answer = 0;
        for (int i = 0; i < k; i++) {
            answer = (answer + result.mat[0][i] * initial[k - 1 - i]) % MOD;
        }

        return answer;
    }
}
```

## 🎯 **Game Theory**

### **Nim Game and Grundy Numbers**

```java
public class GameTheory {

    // Calculate Grundy number (nimber) for a position
    public static int grundyNumber(int position, int[] moves, int[] memo) {
        if (memo[position] != -1) {
            return memo[position];
        }

        Set<Integer> reachable = new HashSet<>();

        for (int move : moves) {
            if (position >= move) {
                reachable.add(grundyNumber(position - move, moves, memo));
            }
        }

        // Find MEX (minimum excludant)
        int mex = 0;
        while (reachable.contains(mex)) {
            mex++;
        }

        return memo[position] = mex;
    }

    // Nim game with multiple piles
    public static boolean isWinningNim(int[] piles) {
        int nimSum = 0;
        for (int pile : piles) {
            nimSum ^= pile;
        }
        return nimSum != 0;
    }

    // Sprague-Grundy theorem for impartial games
    public static boolean isWinningPosition(int[] gameStates) {
        int grundySum = 0;
        for (int state : gameStates) {
            // Calculate Grundy number for each game state
            grundySum ^= calculateGrundy(state);
        }
        return grundySum != 0;
    }

    private static int calculateGrundy(int state) {
        // Implementation depends on specific game rules
        // This is a placeholder
        return state % 3; // Example calculation
    }

    // Minimax algorithm for zero-sum games
    public static int minimax(int[][] gameBoard, int depth, boolean isMaximizing) {
        // Base case: evaluate leaf nodes
        if (depth == 0 || isGameOver(gameBoard)) {
            return evaluatePosition(gameBoard);
        }

        if (isMaximizing) {
            int maxEval = Integer.MIN_VALUE;
            for (int[] move : generateMoves(gameBoard)) {
                int[][] newBoard = makeMove(gameBoard, move);
                int eval = minimax(newBoard, depth - 1, false);
                maxEval = Math.max(maxEval, eval);
            }
            return maxEval;
        } else {
            int minEval = Integer.MAX_VALUE;
            for (int[] move : generateMoves(gameBoard)) {
                int[][] newBoard = makeMove(gameBoard, move);
                int eval = minimax(newBoard, depth - 1, true);
                minEval = Math.min(minEval, eval);
            }
            return minEval;
        }
    }

    // Alpha-beta pruning optimization
    public static int alphaBeta(int[][] gameBoard, int depth, int alpha, int beta, boolean isMaximizing) {
        if (depth == 0 || isGameOver(gameBoard)) {
            return evaluatePosition(gameBoard);
        }

        if (isMaximizing) {
            int maxEval = Integer.MIN_VALUE;
            for (int[] move : generateMoves(gameBoard)) {
                int[][] newBoard = makeMove(gameBoard, move);
                int eval = alphaBeta(newBoard, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, eval);
                alpha = Math.max(alpha, eval);
                if (beta <= alpha) break; // Beta cutoff
            }
            return maxEval;
        } else {
            int minEval = Integer.MAX_VALUE;
            for (int[] move : generateMoves(gameBoard)) {
                int[][] newBoard = makeMove(gameBoard, move);
                int eval = alphaBeta(newBoard, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, eval);
                beta = Math.min(beta, eval);
                if (beta <= alpha) break; // Alpha cutoff
            }
            return minEval;
        }
    }

    // Helper methods (implementation depends on specific game)
    private static boolean isGameOver(int[][] board) { return false; }
    private static int evaluatePosition(int[][] board) { return 0; }
    private static List<int[]> generateMoves(int[][] board) { return new ArrayList<>(); }
    private static int[][] makeMove(int[][] board, int[] move) { return board; }
}
```

## 🔢 **Probability and Statistics**

### **Probability Calculations**

```java
public class ProbabilityAlgorithms {

    // Expected value calculation
    public static double expectedValue(double[] values, double[] probabilities) {
        double expected = 0.0;
        for (int i = 0; i < values.length; i++) {
            expected += values[i] * probabilities[i];
        }
        return expected;
    }

    // Binomial probability: P(X = k) = C(n,k) * p^k * (1-p)^(n-k)
    public static double binomialProbability(int n, int k, double p) {
        if (k > n || k < 0) return 0.0;

        double logProb = logCombination(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
        return Math.exp(logProb);
    }

    // Log combination to avoid overflow
    private static double logCombination(int n, int k) {
        double result = 0.0;
        for (int i = 1; i <= k; i++) {
            result += Math.log(n - i + 1) - Math.log(i);
        }
        return result;
    }

    // Monte Carlo simulation
    public static double monteCarlo(int trials, java.util.function.Supplier<Boolean> experiment) {
        int successes = 0;
        for (int i = 0; i < trials; i++) {
            if (experiment.get()) {
                successes++;
            }
        }
        return (double) successes / trials;
    }

    // Random number generation (Linear Congruential Generator)
    public static class SimpleRandom {
        private long seed;
        private static final long A = 1664525L;
        private static final long C = 1013904223L;
        private static final long M = (1L << 32);

        public SimpleRandom(long seed) {
            this.seed = seed;
        }

        public int nextInt() {
            seed = (A * seed + C) % M;
            return (int) seed;
        }

        public double nextDouble() {
            return (double) Math.abs(nextInt()) / Integer.MAX_VALUE;
        }
    }
}
```

## 🎮 **Number Theory Applications**

### **Fast Fourier Transform (FFT)**

```java
public class FFT {

    static class Complex {
        double real, imag;

        Complex(double real, double imag) {
            this.real = real;
            this.imag = imag;
        }

        Complex add(Complex other) {
            return new Complex(real + other.real, imag + other.imag);
        }

        Complex subtract(Complex other) {
            return new Complex(real - other.real, imag - other.imag);
        }

        Complex multiply(Complex other) {
            return new Complex(
                real * other.real - imag * other.imag,
                real * other.imag + imag * other.real
            );
        }

        Complex multiply(double scalar) {
            return new Complex(real * scalar, imag * scalar);
        }
    }

    // Fast Fourier Transform - O(n log n)
    public static Complex[] fft(Complex[] a) {
        int n = a.length;
        if (n <= 1) return a;

        // Divide
        Complex[] even = new Complex[n / 2];
        Complex[] odd = new Complex[n / 2];

        for (int i = 0; i < n / 2; i++) {
            even[i] = a[2 * i];
            odd[i] = a[2 * i + 1];
        }

        // Conquer
        Complex[] evenFFT = fft(even);
        Complex[] oddFFT = fft(odd);

        // Combine
        Complex[] result = new Complex[n];
        for (int i = 0; i < n / 2; i++) {
            double angle = -2 * Math.PI * i / n;
            Complex w = new Complex(Math.cos(angle), Math.sin(angle));

            result[i] = evenFFT[i].add(w.multiply(oddFFT[i]));
            result[i + n / 2] = evenFFT[i].subtract(w.multiply(oddFFT[i]));
        }

        return result;
    }

    // Polynomial multiplication using FFT
    public static int[] multiplyPolynomials(int[] a, int[] b) {
        int n = 1;
        while (n < a.length + b.length) n <<= 1;

        Complex[] ca = new Complex[n];
        Complex[] cb = new Complex[n];

        for (int i = 0; i < n; i++) {
            ca[i] = new Complex(i < a.length ? a[i] : 0, 0);
            cb[i] = new Complex(i < b.length ? b[i] : 0, 0);
        }

        Complex[] fa = fft(ca);
        Complex[] fb = fft(cb);

        for (int i = 0; i < n; i++) {
            fa[i] = fa[i].multiply(fb[i]);
        }

        Complex[] result = ifft(fa);

        int[] finalResult = new int[a.length + b.length - 1];
        for (int i = 0; i < finalResult.length; i++) {
            finalResult[i] = (int) Math.round(result[i].real);
        }

        return finalResult;
    }

    // Inverse FFT
    private static Complex[] ifft(Complex[] a) {
        int n = a.length;

        // Conjugate
        for (int i = 0; i < n; i++) {
            a[i] = new Complex(a[i].real, -a[i].imag);
        }

        // Apply FFT
        Complex[] result = fft(a);

        // Conjugate and scale
        for (int i = 0; i < n; i++) {
            result[i] = new Complex(result[i].real / n, -result[i].imag / n);
        }

        return result;
    }
}
```

## 🎯 **Problem Categories**

### **Number Theory Problems**

1. **Count Primes** - Sieve of Eratosthenes
2. **Power of Three** - Mathematical property checking
3. **Happy Number** - Cycle detection in sequences
4. **Perfect Squares** - Number theory with optimization

### **Combinatorics Problems**

1. **Unique Paths** - Combinations with constraints
2. **Climbing Stairs** - Fibonacci and combinatorics
3. **Permutation Sequence** - Factorial number system
4. **Pascal's Triangle** - Binomial coefficients

### **Matrix Problems**

1. **Matrix Chain Multiplication** - Dynamic programming
2. **Rotate Image** - In-place matrix transformation
3. **Spiral Matrix** - Matrix traversal patterns
4. **Valid Sudoku** - Constraint satisfaction

### **Advanced Mathematical**

1. **Russian Doll Envelopes** - LIS with sorting
2. **Rectangle Area** - Computational geometry
3. **Integer to English Words** - Number to text conversion
4. **Fraction to Recurring Decimal** - Long division algorithm

---

_Master mathematical algorithms to solve complex numerical and computational problems efficiently!_
