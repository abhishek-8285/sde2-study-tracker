# Go Quick Reference Cheatsheet 🚀

## 📝 Basic Syntax

### Variables

```go
// Declaration
var name string
var age int = 25
var isActive bool

// Short declaration (inside functions only)
name := "John"
age := 25
isActive := true

// Multiple variables
var x, y int = 1, 2
a, b := 3, 4
```

### Constants

```go
const PI = 3.14159
const (
    StatusOK = 200
    StatusNotFound = 404
)

// iota for auto-incrementing
const (
    Sunday = iota  // 0
    Monday         // 1
    Tuesday        // 2
)
```

### Data Types

```go
// Basic types
bool, string
int, int8, int16, int32, int64
uint, uint8, uint16, uint32, uint64
float32, float64
complex64, complex128

// Zero values
false, "", 0, nil
```

## 🏗️ Data Structures

### Arrays & Slices

```go
// Arrays (fixed size)
var arr [5]int
arr := [5]int{1, 2, 3, 4, 5}
arr := [...]int{1, 2, 3}  // compiler counts

// Slices (dynamic)
var slice []int
slice := []int{1, 2, 3}
slice := make([]int, 5)      // length 5
slice := make([]int, 0, 10)  // length 0, capacity 10

// Slice operations
append(slice, 4, 5, 6)
slice[1:3]  // [start:end) - not inclusive of end
copy(dest, src)
```

### Maps

```go
// Declaration
var m map[string]int
m = make(map[string]int)
m := map[string]int{"key": 42}

// Operations
m["key"] = 42
value := m["key"]
value, ok := m["key"]  // ok is false if key doesn't exist
delete(m, "key")
```

### Structs

```go
type Person struct {
    Name string
    Age  int
}

// Creation
p := Person{Name: "John", Age: 30}
p := Person{"John", 30}
p := &Person{Name: "John"}  // pointer to struct
```

## 🔄 Control Flow

### If Statements

```go
if condition {
    // code
}

if x := getValue(); x > 10 {  // initialization
    // x is only available in this scope
}

if condition {
    // code
} else if otherCondition {
    // code
} else {
    // code
}
```

### Switch Statements

```go
switch variable {
case value1:
    // code
case value2, value3:
    // multiple values
default:
    // default case
}

// Type switch
switch v := interface{}(x).(type) {
case int:
    // v is int
case string:
    // v is string
}
```

### Loops

```go
// For loop (only loop in Go)
for i := 0; i < 10; i++ {
    // code
}

// While-style
for condition {
    // code
}

// Infinite
for {
    // code
    break  // or return
}

// Range
for index, value := range slice {
    // code
}

for key, value := range map {
    // code
}

for i := range slice {  // index only
    // code
}
```

## 🛠️ Functions

### Basic Functions

```go
func functionName(param1 type1, param2 type2) returnType {
    return value
}

// Multiple returns
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

// Named returns
func calculate(x, y int) (sum, product int) {
    sum = x + y
    product = x * y
    return  // naked return
}

// Variadic functions
func sum(numbers ...int) int {
    total := 0
    for _, num := range numbers {
        total += num
    }
    return total
}
```

### Methods

```go
type Rectangle struct {
    Width, Height float64
}

// Value receiver
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

// Pointer receiver
func (r *Rectangle) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}
```

## 🔗 Interfaces

```go
type Shape interface {
    Area() float64
    Perimeter() float64
}

// Empty interface
interface{}  // can hold any type

// Type assertion
value, ok := interface{}(x).(string)

// Type switch
switch v := interface{}(x).(type) {
case string:
    // v is string
case int:
    // v is int
}
```

## ⚡ Concurrency

### Goroutines

```go
go function()           // start goroutine
go func() {            // anonymous goroutine
    // code
}()
```

### Channels

```go
// Creation
ch := make(chan int)           // unbuffered
ch := make(chan int, 10)       // buffered

// Operations
ch <- value        // send
value := <-ch      // receive
value, ok := <-ch  // receive with closed check

close(ch)          // close channel

// Select statement
select {
case msg1 := <-ch1:
    // handle msg1
case msg2 := <-ch2:
    // handle msg2
case <-time.After(1 * time.Second):
    // timeout after 1 second
default:
    // non-blocking default
}
```

## 🚨 Error Handling

```go
// Basic error handling
result, err := someFunction()
if err != nil {
    return err
}

// Custom errors
import "errors"
err := errors.New("something went wrong")

// Error wrapping (Go 1.13+)
import "fmt"
err := fmt.Errorf("operation failed: %w", originalErr)

// Panic and recover
defer func() {
    if r := recover(); r != nil {
        fmt.Println("Recovered from panic:", r)
    }
}()
panic("something went wrong")
```

## 📦 Packages & Imports

```go
package main

import (
    "fmt"                    // standard library
    "net/http"              // standard library

    "github.com/gin-gonic/gin"  // external package
    mypackage "./internal/mypackage"  // local package
)

// Package initialization
func init() {
    // initialization code
}
```

## 🧪 Testing

```go
// test file: name_test.go
package main

import "testing"

func TestFunction(t *testing.T) {
    result := function(input)
    expected := expectedValue

    if result != expected {
        t.Errorf("Expected %v, got %v", expected, result)
    }
}

// Benchmark
func BenchmarkFunction(b *testing.B) {
    for i := 0; i < b.N; i++ {
        function(input)
    }
}

// Table-driven tests
func TestAdd(t *testing.T) {
    tests := []struct {
        a, b, expected int
    }{
        {1, 2, 3},
        {0, 0, 0},
        {-1, 1, 0},
    }

    for _, test := range tests {
        result := add(test.a, test.b)
        if result != test.expected {
            t.Errorf("add(%d, %d) = %d; want %d",
                test.a, test.b, result, test.expected)
        }
    }
}
```

## 🏃‍♂️ Common Commands

```bash
# Module management
go mod init module-name
go mod tidy
go mod download

# Build and run
go run main.go
go build
go install

# Testing
go test ./...
go test -v
go test -cover
go test -bench=.

# Formatting and linting
go fmt ./...
go vet ./...
goimports -w .

# Get dependencies
go get package-name
go get -u package-name  # update
```

## 💡 Common Patterns

### Error Wrapping

```go
if err != nil {
    return fmt.Errorf("failed to process: %w", err)
}
```

### Resource Cleanup

```go
file, err := os.Open("file.txt")
if err != nil {
    return err
}
defer file.Close()
```

### Worker Pool

```go
jobs := make(chan Job, 100)
results := make(chan Result, 100)

// Start workers
for w := 1; w <= numWorkers; w++ {
    go worker(jobs, results)
}
```

### Context Usage

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

select {
case result := <-ch:
    return result
case <-ctx.Done():
    return ctx.Err()
}
```

---

## 🎯 Quick Tips

- **Variables**: Use `:=` for new variables, `=` for existing ones
- **Errors**: Always check errors; don't ignore them
- **Pointers**: Use `&` to get address, `*` to dereference
- **Slices**: Remember they're references to underlying arrays
- **Channels**: Close channels from sender, not receiver
- **Goroutines**: Always have a way to stop them
- **Interfaces**: Keep them small and focused
- **Testing**: Write tests as you write code

---

_Keep this handy while coding! 📋_
