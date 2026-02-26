package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

const defaultProjectPromptsDir = "prompts"

// Config holds the contents of ~/.ahq/config.yaml.
type Config struct {
	PromptSources      []string `yaml:"prompt_sources"`
	ProjectPromptsDir  string   `yaml:"project_prompts_dir"`
}

// ConfigPath returns the path to the user's AHQ config file.
func ConfigPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("home directory: %w", err)
	}
	return filepath.Join(home, ".ahq", "config.yaml"), nil
}

// CatalogPath returns the path to the user's local catalog file.
func CatalogPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("home directory: %w", err)
	}
	return filepath.Join(home, ".ahq", "catalog.yaml"), nil
}

// ProjectCatalogPath returns the path to the project-local catalog file under dir (cwd).
func ProjectCatalogPath(projectDir string) string {
	return filepath.Join(projectDir, ".ahq", "catalog.yaml")
}

// Load reads and parses the config file at ~/.ahq/config.yaml.
// If the file is missing, returns a clear error without wrapping in a stack.
func Load() (*Config, error) {
	path, err := ConfigPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("config not found: %s (create it or run from a setup that provides it)", path)
		}
		return nil, fmt.Errorf("read config: %w", err)
	}
	var c Config
	if err := yaml.Unmarshal(data, &c); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}
	if c.ProjectPromptsDir == "" {
		c.ProjectPromptsDir = defaultProjectPromptsDir
	}
	// Expand ~ in prompt sources
	home, _ := os.UserHomeDir()
	for i := range c.PromptSources {
		c.PromptSources[i] = expandHome(c.PromptSources[i], home)
	}
	return &c, nil
}

func expandHome(path, home string) string {
	if home == "" {
		return path
	}
	if path == "~" {
		return home
	}
	if strings.HasPrefix(path, "~/") {
		return filepath.Join(home, path[2:])
	}
	return path
}
