package main

import (
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

//go:embed default-catalog.yaml
var defaultCatalogData []byte

// LoadGlobal returns the global (ahq-defined) catalog from the bundled default.
func LoadGlobal() (*Catalog, error) {
	var c Catalog
	if err := yaml.Unmarshal(defaultCatalogData, &c); err != nil {
		return nil, fmt.Errorf("parse bundled catalog: %w", err)
	}
	return &c, nil
}

// LoadLocal reads the user's local catalog from path. If the file does not
// exist, returns an empty catalog and nil error.
func LoadLocal(path string) (*Catalog, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &Catalog{Packages: []PackageEntry{}}, nil
		}
		return nil, fmt.Errorf("read catalog: %w", err)
	}
	var c Catalog
	if err := yaml.Unmarshal(data, &c); err != nil {
		return nil, fmt.Errorf("parse catalog: %w", err)
	}
	return &c, nil
}

// LoadMerged loads global, user local, and optional project catalogs and returns
// the merged view. Project overrides user overrides global when names clash.
// projectCatalogPath can be empty to skip project catalog.
func LoadMerged(userCatalogPath, projectCatalogPath string) ([]MergedEntry, error) {
	global, err := LoadGlobal()
	if err != nil {
		return nil, err
	}
	userLocal, err := LoadLocal(userCatalogPath)
	if err != nil {
		return nil, err
	}
	merged := Merge(global, userLocal)
	if projectCatalogPath != "" {
		projectLocal, err := LoadLocal(projectCatalogPath)
		if err != nil {
			return nil, err
		}
		merged = OverrideWith(merged, projectLocal, SourceProject)
	}
	return merged, nil
}

// SaveLocal writes the catalog to path, creating the parent directory if needed.
func SaveLocal(c *Catalog, path string) error {
	data, err := yaml.Marshal(c)
	if err != nil {
		return fmt.Errorf("serialize catalog: %w", err)
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("create %s: %w", dir, err)
	}
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("write catalog: %w", err)
	}
	return nil
}

// ExpandLocation expands ~ in a file location to the user's home directory.
func ExpandLocation(location, home string) string {
	if home == "" {
		return location
	}
	if strings.HasPrefix(location, "file://~/") {
		return "file://" + filepath.Join(home, location[9:])
	}
	if strings.HasPrefix(location, "~/") {
		return filepath.Join(home, location[2:])
	}
	if location == "~" {
		return home
	}
	return location
}
