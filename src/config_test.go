package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestConfigDirName is the directory name used for test config. All tests that
// invoke ConfigPath(), CatalogPath(), or Load() must set AHQ_CONFIG_HOME to a
// path ending in this name so they never use the real ~/.ahq.
const TestConfigDirName = "test-ahq-config"

// setupTestConfigDir creates a directory named test-ahq-config under a new temp
// dir, sets AHQ_CONFIG_HOME to it, and returns the path. t.Setenv restores the
// env at the end of the test. Use this in any test that calls ConfigPath(),
// CatalogPath(), or Load() so tests do not touch the user's real config.
func setupTestConfigDir(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	dir := filepath.Join(root, TestConfigDirName)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatal(err)
	}
	t.Setenv(AHQConfigHomeEnv, dir)
	return dir
}

func TestConfigPath_usesTestDirWhenEnvSet(t *testing.T) {
	dir := setupTestConfigDir(t)
	path, err := ConfigPath()
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(dir, "config.yaml")
	if path != want {
		t.Errorf("ConfigPath() = %q, want %q", path, want)
	}
}

func TestCatalogPath_usesTestDirWhenEnvSet(t *testing.T) {
	dir := setupTestConfigDir(t)
	path, err := CatalogPath()
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(dir, "catalog.yaml")
	if path != want {
		t.Errorf("CatalogPath() = %q, want %q", path, want)
	}
}

func TestLoad_missingConfig_returnsError(t *testing.T) {
	setupTestConfigDir(t) // no config.yaml
	_, err := Load()
	if err == nil {
		t.Fatal("Load(): expected error when config missing")
	}
	if err != nil && !strings.Contains(err.Error(), "config not found") {
		t.Errorf("Load(): expected 'config not found' error, got: %v", err)
	}
}

func TestLoad_readsConfigFromTestDir(t *testing.T) {
	dir := setupTestConfigDir(t)
	configPath := filepath.Join(dir, "config.yaml")
	cfgYaml := []byte("prompt_sources:\n  - /tmp/prompts\nproject_prompts_dir: myprompts\n")
	if err := os.WriteFile(configPath, cfgYaml, 0644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ProjectPromptsDir != "myprompts" {
		t.Errorf("ProjectPromptsDir = %q, want myprompts", cfg.ProjectPromptsDir)
	}
	if len(cfg.PromptSources) != 1 || cfg.PromptSources[0] != "/tmp/prompts" {
		t.Errorf("PromptSources = %v", cfg.PromptSources)
	}
}

