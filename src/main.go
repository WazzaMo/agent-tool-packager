package main

import (
	"fmt"
	"os"
)

func main() {
	if err := Run(); err != nil {
		fmt.Fprintln(os.Stderr, "ahq:", err)
		os.Exit(1)
	}
}
