package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadGlobal_returnsEmpty(t *testing.T) {
	global, err := LoadGlobal()
	if err != nil {
		t.Fatal(err)
	}
	if global == nil || len(global.Packages) != 0 {
		t.Errorf("LoadGlobal: expected empty catalog, got %d packages", len(global.Packages))
	}
}

func TestLoadLocal_missingFile_returnsEmpty(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "nonexistent.yaml")
	local, err := LoadLocal(path)
	if err != nil {
		t.Fatal(err)
	}
	if local == nil || len(local.Packages) != 0 {
		t.Errorf("LoadLocal(missing): expected empty catalog, got %d packages", len(local.Packages))
	}
}

func TestSaveLocal_andLoadLocal_roundtrip(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "catalog.yaml")
	c := &Catalog{Packages: []PackageEntry{
		{Name: "roundtrip", Version: "1.0.0", Description: "Test", Location: "/path"},
	}}
	if err := SaveLocal(c, path); err != nil {
		t.Fatal(err)
	}
	loaded, err := LoadLocal(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(loaded.Packages) != 1 {
		t.Fatalf("expected 1 package, got %d", len(loaded.Packages))
	}
	p := loaded.Packages[0]
	if p.Name != "roundtrip" || p.Version != "1.0.0" || p.Location != "/path" {
		t.Errorf("loaded: %+v", p)
	}
}

func TestLoadMerged_noLocalFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "catalog.yaml")
	// No file at path => user and project local empty
	merged, err := LoadMerged(path, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(merged) != 0 {
		t.Errorf("expected 0 merged (no global packages yet), got %d", len(merged))
	}
}

func TestExpandLocation_fileURLWithTilde(t *testing.T) {
	home := "/home/user"
	loc := "file://~/prompts"
	out := ExpandLocation(loc, home)
	if out != "file:///home/user/prompts" {
		t.Errorf("ExpandLocation(%q): got %q", loc, out)
	}
}

func TestExpandLocation_tildePath(t *testing.T) {
	home := "/home/user"
	loc := "~/my/prompts"
	out := ExpandLocation(loc, home)
	if out != filepath.Join(home, "my", "prompts") {
		t.Errorf("ExpandLocation(%q): got %q", loc, out)
	}
}

func TestLoadMerged_withProjectOverride(t *testing.T) {
	userPath := filepath.Join(t.TempDir(), "user.yaml")
	projectPath := filepath.Join(t.TempDir(), "project.yaml")
	userCat := &Catalog{Packages: []PackageEntry{
		{Name: "same", Version: "1.0.0", Location: "/user/same"},
	}}
	if err := SaveLocal(userCat, userPath); err != nil {
		t.Fatal(err)
	}
	projectCat := &Catalog{Packages: []PackageEntry{
		{Name: "same", Version: "2.0.0", Location: "/project/same"},
	}}
	if err := SaveLocal(projectCat, projectPath); err != nil {
		t.Fatal(err)
	}
	merged, err := LoadMerged(userPath, projectPath)
	if err != nil {
		t.Fatal(err)
	}
	if len(merged) != 1 {
		t.Fatalf("expected 1 merged entry, got %d", len(merged))
	}
	if merged[0].Version != "2.0.0" || merged[0].Source != SourceProject {
		t.Errorf("expected project override: %+v", merged[0])
	}
}

func TestLoadLocal_invalidYAML_returnsError(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "bad.yaml")
	if err := os.WriteFile(path, []byte("not: valid: yaml: ["), 0644); err != nil {
		t.Fatal(err)
	}
	_, err := LoadLocal(path)
	if err == nil {
		t.Error("expected error for invalid YAML")
	}
}
