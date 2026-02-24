package main

import (
	"fmt"
	"os"
)

const usage = `ahq - Agent HQ CLI

Usage:
  ahq install    Install prompt markdown into the current project (default)
  ahq help       Show this message

Config is read from ~/.ahq/config.yaml. See docs/notes for the config schema.
`

// Run interprets os.Args and runs the appropriate subcommand.
func Run() error {
	args := os.Args[1:]
	cmd := "install"
	if len(args) > 0 && args[0] != "" {
		cmd = args[0]
	}
	switch cmd {
	case "install", "i":
		return runInstall()
	case "help", "-h", "--help", "":
		fmt.Print(usage)
		return nil
	default:
		return fmt.Errorf("unknown command: %q\n%s", cmd, usage)
	}
}

func runInstall() error {
	cfg, err := Load()
	if err != nil {
		return err
	}
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("current directory: %w", err)
	}
	return Install(cfg, cwd)
}
