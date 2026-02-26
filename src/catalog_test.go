package main

import (
	"testing"
)

func TestMerge_emptyGlobal(t *testing.T) {
	global := &Catalog{Packages: []PackageEntry{}}
	local := &Catalog{Packages: []PackageEntry{
		{Name: "a", Version: "1.0.0", Location: "/local/a"},
	}}
	merged := Merge(global, local)
	if len(merged) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(merged))
	}
	if merged[0].Name != "a" || merged[0].Source != SourceLocal {
		t.Errorf("entry: name=%s source=%s", merged[0].Name, merged[0].Source)
	}
}

func TestMerge_emptyLocal(t *testing.T) {
	global := &Catalog{Packages: []PackageEntry{
		{Name: "b", Version: "1.0.0", Location: "/global/b"},
	}}
	local := &Catalog{Packages: []PackageEntry{}}
	merged := Merge(global, local)
	if len(merged) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(merged))
	}
	if merged[0].Name != "b" || merged[0].Source != SourceGlobal {
		t.Errorf("entry: name=%s source=%s", merged[0].Name, merged[0].Source)
	}
}

func TestMerge_localOverridesGlobal(t *testing.T) {
	global := &Catalog{Packages: []PackageEntry{
		{Name: "doc-guide", Version: "1.0.0", Location: "/global/doc-guide"},
	}}
	local := &Catalog{Packages: []PackageEntry{
		{Name: "doc-guide", Version: "2.0.0", Location: "~/my/doc-guide"},
	}}
	merged := Merge(global, local)
	if len(merged) != 1 {
		t.Fatalf("expected 1 entry (local overrides), got %d", len(merged))
	}
	e := merged[0]
	if e.Name != "doc-guide" || e.Source != SourceLocal || e.Version != "2.0.0" {
		t.Errorf("expected local doc-guide 2.0.0, got %+v", e)
	}
}

func TestMerge_bothDistinct(t *testing.T) {
	global := &Catalog{Packages: []PackageEntry{
		{Name: "global-only", Version: "1.0.0"},
	}}
	local := &Catalog{Packages: []PackageEntry{
		{Name: "local-only", Version: "1.0.0"},
	}}
	merged := Merge(global, local)
	if len(merged) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(merged))
	}
	byName := make(map[string]MergedEntry)
	for _, e := range merged {
		byName[e.Name] = e
	}
	if byName["global-only"].Source != SourceGlobal {
		t.Error("global-only should be global")
	}
	if byName["local-only"].Source != SourceLocal {
		t.Error("local-only should be local")
	}
}

func TestFindByName_found(t *testing.T) {
	merged := []MergedEntry{
		{PackageEntry: PackageEntry{Name: "a"}, Source: SourceLocal},
		{PackageEntry: PackageEntry{Name: "b"}, Source: SourceGlobal},
	}
	e := FindByName(merged, "b")
	if e == nil || e.Name != "b" || e.Source != SourceGlobal {
		t.Errorf("FindByName(b): got %+v", e)
	}
}

func TestFindByName_notFound(t *testing.T) {
	merged := []MergedEntry{
		{PackageEntry: PackageEntry{Name: "a"}, Source: SourceLocal},
	}
	e := FindByName(merged, "missing")
	if e != nil {
		t.Errorf("FindByName(missing): expected nil, got %+v", e)
	}
}

func TestOverrideWith_projectOverridesUser(t *testing.T) {
	merged := []MergedEntry{
		{PackageEntry: PackageEntry{Name: "pkg", Version: "1.0.0", Location: "/user"}, Source: SourceLocal},
	}
	project := &Catalog{Packages: []PackageEntry{
		{Name: "pkg", Version: "2.0.0", Location: "./.ahq/packages/pkg"},
	}}
	out := OverrideWith(merged, project, SourceProject)
	if len(out) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(out))
	}
	if out[0].Version != "2.0.0" || out[0].Source != SourceProject {
		t.Errorf("expected project 2.0.0, got %+v", out[0])
	}
}
