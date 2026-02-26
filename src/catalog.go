package main

// Source identifies where a catalog entry came from.
type Source string

const (
	SourceGlobal  Source = "global"
	SourceLocal   Source = "local"   // user's ~/.ahq/catalog.yaml
	SourceProject Source = "project" // ./.ahq/catalog.yaml
)

// PackageEntry is a single catalog entry (name, version, location).
type PackageEntry struct {
	Name        string `yaml:"name"`
	Version     string `yaml:"version"`
	Description string `yaml:"description"`
	Location    string `yaml:"location"` // path or URL
}

// Catalog is a list of package entries (global or local).
type Catalog struct {
	Packages []PackageEntry `yaml:"packages"`
}

// MergedEntry is a package entry with its source (global or local).
type MergedEntry struct {
	PackageEntry
	Source Source
}

// Merge combines global and local catalogs. Local entries override global
// when names clash. Order: all global first, then local overrides by name.
func Merge(global, local *Catalog) []MergedEntry {
	byName := make(map[string]MergedEntry)
	for _, p := range global.Packages {
		byName[p.Name] = MergedEntry{PackageEntry: p, Source: SourceGlobal}
	}
	for _, p := range local.Packages {
		byName[p.Name] = MergedEntry{PackageEntry: p, Source: SourceLocal}
	}
	out := make([]MergedEntry, 0, len(byName))
	for _, e := range byName {
		out = append(out, e)
	}
	return out
}

// OverrideWith applies entries from c onto merged, tagging them with src.
// Entries in c override existing entries with the same name.
func OverrideWith(merged []MergedEntry, c *Catalog, src Source) []MergedEntry {
	byName := make(map[string]MergedEntry)
	for _, e := range merged {
		byName[e.Name] = e
	}
	for _, p := range c.Packages {
		byName[p.Name] = MergedEntry{PackageEntry: p, Source: src}
	}
	out := make([]MergedEntry, 0, len(byName))
	for _, e := range byName {
		out = append(out, e)
	}
	return out
}

// FindByName returns the merged entry for name, or nil if not found.
func FindByName(merged []MergedEntry, name string) *MergedEntry {
	for i := range merged {
		if merged[i].Name == name {
			return &merged[i]
		}
	}
	return nil
}
