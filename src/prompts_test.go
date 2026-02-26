package main

import (
	"os"
	"path/filepath"
	"testing"
)

// TestInstallFromCatalog_copyFromPath verifies that InstallFromCatalog copies
// markdown from a package location into the project prompts dir.
func TestInstallFromCatalog_copyFromPath(t *testing.T) {
	projectDir := t.TempDir()
	promptsDir := "prompts"
	// Create a fake "package" dir with one .md file
	pkgDir := t.TempDir()
	mdPath := filepath.Join(pkgDir, "guide.md")
	if err := os.WriteFile(mdPath, []byte("# Guide\n"), 0644); err != nil {
		t.Fatal(err)
	}
	merged := []MergedEntry{
		{
			PackageEntry: PackageEntry{
				Name:     "my-guide",
				Version:  "1.0.0",
				Location: pkgDir,
			},
			Source: SourceLocal,
		},
	}
	err := InstallFromCatalog(merged, "my-guide", projectDir, promptsDir)
	if err != nil {
		t.Fatal(err)
	}
	destPath := filepath.Join(projectDir, promptsDir, "guide.md")
	data, err := os.ReadFile(destPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "# Guide\n" {
		t.Errorf("expected # Guide\\n, got %q", data)
	}
}

func TestInstallFromCatalog_packageNotFound(t *testing.T) {
	merged := []MergedEntry{}
	err := InstallFromCatalog(merged, "missing", t.TempDir(), "prompts")
	if err == nil {
		t.Error("expected error when package not in catalog")
	}
}
