package main

import (
	"fmt"
	"os"
)

func main() {
	// Basic Hello World
	fmt.Println("Hello, Go World!")

	// Hello with command line arguments
	if len(os.Args) > 1 {
		fmt.Printf("Hello, %s!\n", os.Args[1])
	}

	// Hello with environment variable
	if name := os.Getenv("USER"); name != "" {
		fmt.Printf("Hello, %s (from environment)!\n", name)
	}
}

// To run this program:
// go run hello.go
// go run hello.go "Your Name"
// USER=TestUser go run hello.go
