# Sorting Algorithms 📊

## 🎯 **Overview**

Sorting algorithms arrange elements in a specific order (ascending or descending). Understanding different sorting techniques is crucial for optimizing data processing and serves as foundation for many other algorithms.

## 📊 **Sorting Algorithms Comparison**

| Algorithm      | Best Case  | Average Case | Worst Case | Space    | Stable | In-Place |
| -------------- | ---------- | ------------ | ---------- | -------- | ------ | -------- |
| Bubble Sort    | O(n)       | O(n²)        | O(n²)      | O(1)     | Yes    | Yes      |
| Selection Sort | O(n²)      | O(n²)        | O(n²)      | O(1)     | No     | Yes      |
| Insertion Sort | O(n)       | O(n²)        | O(n²)      | O(1)     | Yes    | Yes      |
| Merge Sort     | O(n log n) | O(n log n)   | O(n log n) | O(n)     | Yes    | No       |
| Quick Sort     | O(n log n) | O(n log n)   | O(n²)      | O(log n) | No     | Yes      |
| Heap Sort      | O(n log n) | O(n log n)   | O(n log n) | O(1)     | No     | Yes      |
| Counting Sort  | O(n + k)   | O(n + k)     | O(n + k)   | O(k)     | Yes    | No       |

## 🔧 **Simple Sorting Algorithms**

### **Bubble Sort**

```java
public class BubbleSort {

    // Basic bubble sort - O(n²) time, O(1) space
    public static void bubbleSort(int[] arr) {
        int n = arr.length;

        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    // Swap elements
                    swap(arr, j, j + 1);
                }
            }
        }
    }

    // Optimized bubble sort (stops early if array becomes sorted)
    public static void bubbleSortOptimized(int[] arr) {
        int n = arr.length;

        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;

            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    swap(arr, j, j + 1);
                    swapped = true;
                }
            }

            // If no swapping occurred, array is sorted
            if (!swapped) break;
        }
    }

    private static void swap(int[] arr, int i, int j) {
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}
```

### **Selection Sort**

```java
public class SelectionSort {

    // Selection sort - O(n²) time, O(1) space
    public static void selectionSort(int[] arr) {
        int n = arr.length;

        for (int i = 0; i < n - 1; i++) {
            // Find minimum element in remaining array
            int minIndex = i;

            for (int j = i + 1; j < n; j++) {
                if (arr[j] < arr[minIndex]) {
                    minIndex = j;
                }
            }

            // Swap minimum element with first element
            swap(arr, i, minIndex);
        }
    }

    private static void swap(int[] arr, int i, int j) {
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}
```

### **Insertion Sort**

```java
public class InsertionSort {

    // Insertion sort - O(n²) worst case, O(n) best case
    public static void insertionSort(int[] arr) {
        int n = arr.length;

        for (int i = 1; i < n; i++) {
            int key = arr[i];
            int j = i - 1;

            // Shift elements greater than key to right
            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j--;
            }

            // Insert key at correct position
            arr[j + 1] = key;
        }
    }

    // Binary insertion sort (reduces comparisons)
    public static void binaryInsertionSort(int[] arr) {
        int n = arr.length;

        for (int i = 1; i < n; i++) {
            int key = arr[i];
            int insertPos = binarySearch(arr, 0, i - 1, key);

            // Shift elements to make space
            for (int j = i - 1; j >= insertPos; j--) {
                arr[j + 1] = arr[j];
            }

            arr[insertPos] = key;
        }
    }

    private static int binarySearch(int[] arr, int left, int right, int key) {
        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (arr[mid] > key) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        return left;
    }
}
```

## 🚀 **Efficient Sorting Algorithms**

### **Merge Sort**

```java
public class MergeSort {

    // Merge sort - O(n log n) time, O(n) space
    public static void mergeSort(int[] arr) {
        if (arr.length <= 1) return;

        mergeSort(arr, 0, arr.length - 1);
    }

    private static void mergeSort(int[] arr, int left, int right) {
        if (left < right) {
            int mid = left + (right - left) / 2;

            // Recursively sort both halves
            mergeSort(arr, left, mid);
            mergeSort(arr, mid + 1, right);

            // Merge sorted halves
            merge(arr, left, mid, right);
        }
    }

    private static void merge(int[] arr, int left, int mid, int right) {
        // Create temporary arrays
        int[] leftArr = new int[mid - left + 1];
        int[] rightArr = new int[right - mid];

        // Copy data to temporary arrays
        System.arraycopy(arr, left, leftArr, 0, leftArr.length);
        System.arraycopy(arr, mid + 1, rightArr, 0, rightArr.length);

        // Merge the temporary arrays back
        int i = 0, j = 0, k = left;

        while (i < leftArr.length && j < rightArr.length) {
            if (leftArr[i] <= rightArr[j]) {
                arr[k++] = leftArr[i++];
            } else {
                arr[k++] = rightArr[j++];
            }
        }

        // Copy remaining elements
        while (i < leftArr.length) {
            arr[k++] = leftArr[i++];
        }

        while (j < rightArr.length) {
            arr[k++] = rightArr[j++];
        }
    }
}
```

### **Quick Sort**

```java
public class QuickSort {

    // Quick sort - O(n log n) average, O(n²) worst case
    public static void quickSort(int[] arr) {
        if (arr.length <= 1) return;

        quickSort(arr, 0, arr.length - 1);
    }

    private static void quickSort(int[] arr, int low, int high) {
        if (low < high) {
            // Partition array and get pivot index
            int pivotIndex = partition(arr, low, high);

            // Recursively sort elements before and after partition
            quickSort(arr, low, pivotIndex - 1);
            quickSort(arr, pivotIndex + 1, high);
        }
    }

    // Lomuto partition scheme
    private static int partition(int[] arr, int low, int high) {
        int pivot = arr[high]; // Choose last element as pivot
        int i = low - 1; // Index of smaller element

        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                swap(arr, i, j);
            }
        }

        swap(arr, i + 1, high);
        return i + 1;
    }

    // Hoare partition scheme (alternative)
    private static int hoarePartition(int[] arr, int low, int high) {
        int pivot = arr[low];
        int i = low - 1;
        int j = high + 1;

        while (true) {
            do { i++; } while (arr[i] < pivot);
            do { j--; } while (arr[j] > pivot);

            if (i >= j) return j;

            swap(arr, i, j);
        }
    }

    // Randomized quick sort (better average performance)
    public static void randomizedQuickSort(int[] arr, int low, int high) {
        if (low < high) {
            // Randomly choose pivot
            int randomIndex = low + (int) (Math.random() * (high - low + 1));
            swap(arr, randomIndex, high);

            int pivotIndex = partition(arr, low, high);
            randomizedQuickSort(arr, low, pivotIndex - 1);
            randomizedQuickSort(arr, pivotIndex + 1, high);
        }
    }

    private static void swap(int[] arr, int i, int j) {
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}
```

### **Heap Sort**

```java
public class HeapSort {

    // Heap sort - O(n log n) time, O(1) space
    public static void heapSort(int[] arr) {
        int n = arr.length;

        // Build max heap
        for (int i = n / 2 - 1; i >= 0; i--) {
            heapify(arr, n, i);
        }

        // Extract elements from heap one by one
        for (int i = n - 1; i > 0; i--) {
            // Move current root to end
            swap(arr, 0, i);

            // Heapify reduced heap
            heapify(arr, i, 0);
        }
    }

    // Heapify a subtree rooted at index i
    private static void heapify(int[] arr, int n, int i) {
        int largest = i; // Initialize largest as root
        int left = 2 * i + 1;
        int right = 2 * i + 2;

        // If left child is larger than root
        if (left < n && arr[left] > arr[largest]) {
            largest = left;
        }

        // If right child is larger than largest so far
        if (right < n && arr[right] > arr[largest]) {
            largest = right;
        }

        // If largest is not root
        if (largest != i) {
            swap(arr, i, largest);

            // Recursively heapify the affected sub-tree
            heapify(arr, n, largest);
        }
    }

    private static void swap(int[] arr, int i, int j) {
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}
```

## 🎯 **Non-Comparison Based Sorting**

### **Counting Sort**

```java
public class CountingSort {

    // Counting sort - O(n + k) time, O(k) space
    // Works well when range of input (k) is not significantly larger than n
    public static void countingSort(int[] arr) {
        if (arr.length == 0) return;

        // Find range
        int max = Arrays.stream(arr).max().getAsInt();
        int min = Arrays.stream(arr).min().getAsInt();
        int range = max - min + 1;

        // Count occurrences
        int[] count = new int[range];
        for (int num : arr) {
            count[num - min]++;
        }

        // Reconstruct sorted array
        int index = 0;
        for (int i = 0; i < range; i++) {
            while (count[i] > 0) {
                arr[index++] = i + min;
                count[i]--;
            }
        }
    }

    // Stable counting sort (preserves relative order)
    public static void stableCountingSort(int[] arr) {
        if (arr.length == 0) return;

        int max = Arrays.stream(arr).max().getAsInt();
        int min = Arrays.stream(arr).min().getAsInt();
        int range = max - min + 1;

        int[] count = new int[range];
        int[] output = new int[arr.length];

        // Count occurrences
        for (int num : arr) {
            count[num - min]++;
        }

        // Change count[i] to store actual position
        for (int i = 1; i < range; i++) {
            count[i] += count[i - 1];
        }

        // Build output array (traverse in reverse for stability)
        for (int i = arr.length - 1; i >= 0; i--) {
            output[count[arr[i] - min] - 1] = arr[i];
            count[arr[i] - min]--;
        }

        // Copy output back to original array
        System.arraycopy(output, 0, arr, 0, arr.length);
    }
}
```

### **Radix Sort**

```java
public class RadixSort {

    // Radix sort - O(d × (n + k)) time where d is number of digits
    public static void radixSort(int[] arr) {
        if (arr.length == 0) return;

        // Find maximum number to know number of digits
        int max = Arrays.stream(arr).max().getAsInt();

        // Do counting sort for every digit
        for (int exp = 1; max / exp > 0; exp *= 10) {
            countingSortByDigit(arr, exp);
        }
    }

    // Counting sort based on digit represented by exp
    private static void countingSortByDigit(int[] arr, int exp) {
        int n = arr.length;
        int[] output = new int[n];
        int[] count = new int[10]; // 0-9 digits

        // Count occurrences of each digit
        for (int num : arr) {
            count[(num / exp) % 10]++;
        }

        // Change count[i] to store actual position
        for (int i = 1; i < 10; i++) {
            count[i] += count[i - 1];
        }

        // Build output array
        for (int i = n - 1; i >= 0; i--) {
            output[count[(arr[i] / exp) % 10] - 1] = arr[i];
            count[(arr[i] / exp) % 10]--;
        }

        // Copy output back to original array
        System.arraycopy(output, 0, arr, 0, n);
    }
}
```

## 🎮 **Specialized Sorting Techniques**

### **Dutch National Flag (3-Way Partitioning)**

```java
public class DutchNationalFlag {

    // Sort array containing only 0s, 1s, and 2s
    public static void sortColors(int[] nums) {
        int low = 0, mid = 0, high = nums.length - 1;

        while (mid <= high) {
            switch (nums[mid]) {
                case 0:
                    swap(nums, low++, mid++);
                    break;
                case 1:
                    mid++;
                    break;
                case 2:
                    swap(nums, mid, high--);
                    break;
            }
        }
    }

    private static void swap(int[] nums, int i, int j) {
        int temp = nums[i];
        nums[i] = nums[j];
        nums[j] = temp;
    }
}
```

### **Custom Comparator Sorting**

```java
import java.util.*;

public class CustomSorting {

    // Sort strings by length, then lexicographically
    public static void sortStringsByLength(String[] strings) {
        Arrays.sort(strings, (a, b) -> {
            if (a.length() != b.length()) {
                return Integer.compare(a.length(), b.length());
            }
            return a.compareTo(b);
        });
    }

    // Sort intervals by start time
    static class Interval {
        int start, end;
        Interval(int start, int end) {
            this.start = start;
            this.end = end;
        }
    }

    public static void sortIntervals(Interval[] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a.start, b.start));
    }

    // Sort array by frequency, then by value
    public static void sortByFrequency(int[] arr) {
        Map<Integer, Integer> freqMap = new HashMap<>();
        for (int num : arr) {
            freqMap.put(num, freqMap.getOrDefault(num, 0) + 1);
        }

        Integer[] boxedArr = Arrays.stream(arr).boxed().toArray(Integer[]::new);

        Arrays.sort(boxedArr, (a, b) -> {
            int freqCompare = Integer.compare(freqMap.get(b), freqMap.get(a));
            if (freqCompare != 0) return freqCompare;
            return Integer.compare(a, b);
        });

        for (int i = 0; i < arr.length; i++) {
            arr[i] = boxedArr[i];
        }
    }
}
```

## 📊 **Algorithm Selection Guide**

### **When to Use Each Algorithm**

#### **Small Arrays (n < 50)**

- **Insertion Sort**: Best for small arrays and nearly sorted data
- **Selection Sort**: When memory writes are expensive

#### **General Purpose**

- **Merge Sort**: When stability is required and O(n log n) worst case is needed
- **Quick Sort**: Generally fastest for average case, good cache performance
- **Heap Sort**: When O(n log n) worst case and O(1) space is required

#### **Special Cases**

- **Counting Sort**: When range of input is small
- **Radix Sort**: When sorting integers or strings
- **Bucket Sort**: When input is uniformly distributed

#### **Nearly Sorted Data**

- **Insertion Sort**: O(n) for nearly sorted arrays
- **Tim Sort**: Hybrid stable sorting (used by Java's Arrays.sort for objects)

## 🎯 **Sorting Applications**

### **Finding Kth Largest Element**

```java
public class KthLargest {

    // Using Quick Select - O(n) average case
    public static int findKthLargest(int[] nums, int k) {
        return quickSelect(nums, 0, nums.length - 1, nums.length - k);
    }

    private static int quickSelect(int[] nums, int left, int right, int k) {
        if (left == right) return nums[left];

        int pivotIndex = partition(nums, left, right);

        if (pivotIndex == k) {
            return nums[k];
        } else if (pivotIndex < k) {
            return quickSelect(nums, pivotIndex + 1, right, k);
        } else {
            return quickSelect(nums, left, pivotIndex - 1, k);
        }
    }

    private static int partition(int[] nums, int left, int right) {
        int pivot = nums[right];
        int i = left;

        for (int j = left; j < right; j++) {
            if (nums[j] <= pivot) {
                swap(nums, i++, j);
            }
        }

        swap(nums, i, right);
        return i;
    }

    private static void swap(int[] nums, int i, int j) {
        int temp = nums[i];
        nums[i] = nums[j];
        nums[j] = temp;
    }
}
```

## 🎮 **Problem Categories**

### **Easy Sorting Problems**

1. **Sort Colors** - Dutch national flag problem
2. **Merge Sorted Array** - Two pointer technique
3. **Find All Numbers Disappeared** - Using sorting properties
4. **Intersection of Two Arrays** - Set operations with sorting

### **Medium Problems**

1. **Kth Largest Element** - Quick select algorithm
2. **Sort List** - Merge sort on linked list
3. **Meeting Rooms II** - Interval sorting
4. **Custom Sort String** - Custom comparator

### **Advanced Applications**

1. **External Sorting** - Sorting data larger than memory
2. **Parallel Sorting** - Multi-threaded sorting algorithms
3. **Online Sorting** - Sorting streaming data
4. **Stable Sorting** - Maintaining relative order

---

_Master sorting algorithms to efficiently organize data and understand the foundation of many advanced algorithms!_
