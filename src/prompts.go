package main

import (
	"fmt"
	"os"
	"path/filepath"
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
