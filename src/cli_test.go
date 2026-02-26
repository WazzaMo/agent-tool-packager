package main

import (
	"os"
	"testing"
)

// CLI tests that invoke Run() must set AHQ_CONFIG_HOME to a test config dir
// (use setupTestConfigDir) so they never use the real ~/.ahq. The test dir is
// named test-ahq-config; see config_test.go.

func TestRun_list_usesTestConfigDir(t *testing.T) {
	setupTestConfigDir(t)
	// Save original args and restore after test
	old := os.Args
	defer func() { os.Args = old }()
	os.Args = []string{"ahq", "list"}
	err := Run()
	if err != nil {
		t.Fatalf("Run list: %v", err)
	}
}

func TestRun_help_succeeds(t *testing.T) {
	setupTestConfigDir(t)
	old := os.Args
	defer func() { os.Args = old }()
	os.Args = []string{"ahq", "help"}
	err := Run()
	if err != nil {
		t.Fatalf("Run help: %v", err)
	}
}
