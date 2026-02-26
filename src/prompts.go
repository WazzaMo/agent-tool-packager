package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Install copies prompt markdown from config sources into the project dir (cwd).
// It creates the project prompts subdir and overwrites existing files.
func Install(cfg *Config, projectDir string) error {
	destDir := filepath.Join(projectDir, cfg.ProjectPromptsDir)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return fmt.Errorf("create %s: %w", destDir, err)
	}
	for _, src := range cfg.PromptSources {
		if err := copyPromptSource(src, destDir); err != nil {
			return fmt.Errorf("copy from %s: %w", src, err)
		}
	}
	return nil
}

func copyPromptSource(src, destDir string) error {
	info, err := os.Stat(src)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("source does not exist: %s", src)
		}
		return err
	}
	if info.IsDir() {
		return copyPromptDir(src, destDir)
	}
	return copyFile(src, filepath.Join(destDir, filepath.Base(src)))
}

func copyPromptDir(srcDir, destDir string) error {
	entries, err := os.ReadDir(srcDir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		ext := filepath.Ext(e.Name())
		if ext != ".md" && ext != ".markdown" {
			continue
		}
		srcPath := filepath.Join(srcDir, e.Name())
		if err := copyFile(srcPath, filepath.Join(destDir, e.Name())); err != nil {
			return err
		}
	}
	return nil
}

func copyFile(src, dest string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dest, data, 0644)
}

// InstallFromCatalog installs a single package by name from the merged catalog
// into projectDir under projectPromptsDir.
func InstallFromCatalog(merged []MergedEntry, name, projectDir, projectPromptsDir string) error {
	entry := FindByName(merged, name)
	if entry == nil {
		return fmt.Errorf("package %q not in catalog (try 'ahq list')", name)
	}
	home, _ := os.UserHomeDir()
	path := ExpandLocation(entry.Location, home)
	if strings.HasPrefix(path, "file://") {
		path = strings.TrimPrefix(path, "file://")
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return fmt.Errorf("installing from URL not yet supported: %s", entry.Location)
	}
	destDir := filepath.Join(projectDir, projectPromptsDir)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return fmt.Errorf("create %s: %w", destDir, err)
	}
	return copyPromptSource(path, destDir)
}
