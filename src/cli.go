package main

import (
	"fmt"
	"os"
)

const usage = `ahq - Agent HQ CLI

Usage:
  ahq install [name]     Install prompts (all from config, or named package from catalog)
  ahq list               List packages (use --local-only, --global-only, or --project-only)
  ahq catalog add        Add a local package
  ahq catalog remove     Remove a local package
  ahq catalog show       Show package details
  ahq catalog refresh    Refresh local catalog from sources
  ahq help               Show this message

Config is read from ~/.ahq/config.yaml. Catalog: ~/.ahq/catalog.yaml.
`

// Run interprets os.Args and runs the appropriate subcommand.
func Run() error {
	args := os.Args[1:]
	cmd := "install"
	if len(args) > 0 && args[0] != "" {
		cmd = args[0]
	}
	switch cmd {
	case "install", "i":
		return runInstall(args)
	case "list", "l":
		return runList(args)
	case "catalog":
		return runCatalog(args[1:])
	case "help", "-h", "--help", "":
		fmt.Print(usage)
		return nil
	default:
		return fmt.Errorf("unknown command: %q\n%s", cmd, usage)
	}
}

func runInstall(args []string) error {
	cfg, err := Load()
	if err != nil {
		return err
	}
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("current directory: %w", err)
	}
	var packageName string
	for _, a := range args {
		if len(a) > 0 && a[0] != '-' {
			packageName = a
			break
		}
	}
	if packageName != "" {
		return runInstallFromCatalog(packageName, cfg.ProjectPromptsDir, cwd)
	}
	return Install(cfg, cwd)
}

func runInstallFromCatalog(packageName, projectPromptsDir, cwd string) error {
	userPath, err := CatalogPath()
	if err != nil {
		return err
	}
	projectPath := ProjectCatalogPath(cwd)
	merged, err := LoadMerged(userPath, projectPath)
	if err != nil {
		return err
	}
	return InstallFromCatalog(merged, packageName, cwd, projectPromptsDir)
}

func runList(args []string) error {
	userPath, err := CatalogPath()
	if err != nil {
		return err
	}
	cwd, _ := os.Getwd()
	projectPath := ProjectCatalogPath(cwd)
	merged, err := LoadMerged(userPath, projectPath)
	if err != nil {
		return err
	}
	localOnly := false
	globalOnly := false
	projectOnly := false
	for _, a := range args {
		switch a {
		case "--local-only":
			localOnly = true
		case "--global-only":
			globalOnly = true
		case "--project-only":
			projectOnly = true
		}
	}
	if localOnly {
		merged = filterBySource(merged, SourceLocal)
	}
	if globalOnly {
		merged = filterBySource(merged, SourceGlobal)
	}
	if projectOnly {
		merged = filterBySource(merged, SourceProject)
	}
	return printList(merged)
}

func filterBySource(entries []MergedEntry, src Source) []MergedEntry {
	out := make([]MergedEntry, 0, len(entries))
	for _, e := range entries {
		if e.Source == src {
			out = append(out, e)
		}
	}
	return out
}

func printList(entries []MergedEntry) error {
	if len(entries) == 0 {
		fmt.Println("No packages in catalog.")
		return nil
	}
	fmt.Printf("%-20s %-12s %-8s %s\n", "NAME", "VERSION", "SOURCE", "DESCRIPTION")
	fmt.Println("-------------------- ------------ -------- " + "------------------------")
	for _, e := range entries {
		desc := e.Description
		if len(desc) > 40 {
			desc = desc[:37] + "..."
		}
		fmt.Printf("%-20s %-12s %-8s %s\n", e.Name, e.Version, string(e.Source), desc)
	}
	return nil
}

func runCatalog(args []string) error {
	sub := ""
	if len(args) > 0 {
		sub = args[0]
	}
	switch sub {
	case "list":
		return runList(args[1:])
	case "add":
		return runCatalogAdd(args[1:])
	case "remove":
		return runCatalogRemove(args[1:])
	case "show":
		return runCatalogShow(args[1:])
	case "refresh":
		return runCatalogRefresh(args[1:])
	default:
		if sub == "" {
			return fmt.Errorf("catalog: use add, remove, show, refresh, or list")
		}
		return fmt.Errorf("catalog: use add, remove, show, or refresh (got %q)", sub)
	}
}

func runCatalogAdd(args []string) error {
	if len(args) < 2 {
		return fmt.Errorf("catalog add: need name and location (e.g. ahq catalog add my-prompt ~/prompts)")
	}
	name, location := args[0], args[1]
	version := "0.0.0"
	for i := 2; i < len(args); i++ {
		if args[i] == "--version" && i+1 < len(args) {
			version = args[i+1]
			break
		}
	}
	path, err := CatalogPath()
	if err != nil {
		return err
	}
	local, err := LoadLocal(path)
	if err != nil {
		return err
	}
	for _, p := range local.Packages {
		if p.Name == name {
			return fmt.Errorf("catalog add: %q already in local catalog (use catalog remove first to replace)", name)
		}
	}
	local.Packages = append(local.Packages, PackageEntry{
		Name:        name,
		Version:     version,
		Description: "Local package",
		Location:    location,
	})
	return SaveLocal(local, path)
}

func runCatalogRemove(args []string) error {
	if len(args) < 1 {
		return fmt.Errorf("catalog remove: need package name (e.g. ahq catalog remove my-prompt)")
	}
	name := args[0]
	path, err := CatalogPath()
	if err != nil {
		return err
	}
	local, err := LoadLocal(path)
	if err != nil {
		return err
	}
	found := false
	newPkgs := make([]PackageEntry, 0, len(local.Packages))
	for _, p := range local.Packages {
		if p.Name == name {
			found = true
			continue
		}
		newPkgs = append(newPkgs, p)
	}
	if !found {
		return fmt.Errorf("catalog remove: %q is not in your local catalog (only local packages can be removed)", name)
	}
	local.Packages = newPkgs
	return SaveLocal(local, path)
}

func runCatalogShow(args []string) error {
	if len(args) < 1 {
		return fmt.Errorf("catalog show: need package name (e.g. ahq catalog show my-prompt)")
	}
	name := args[0]
	userPath, err := CatalogPath()
	if err != nil {
		return err
	}
	cwd, _ := os.Getwd()
	projectPath := ProjectCatalogPath(cwd)
	merged, err := LoadMerged(userPath, projectPath)
	if err != nil {
		return err
	}
	entry := FindByName(merged, name)
	if entry == nil {
		return fmt.Errorf("package %q not in catalog", name)
	}
	fmt.Printf("name:        %s\n", entry.Name)
	fmt.Printf("version:     %s\n", entry.Version)
	fmt.Printf("source:      %s\n", entry.Source)
	fmt.Printf("description: %s\n", entry.Description)
	fmt.Printf("location:    %s\n", entry.Location)
	return nil
}

func runCatalogRefresh(args []string) error {
	path, err := CatalogPath()
	if err != nil {
		return err
	}
	local, err := LoadLocal(path)
	if err != nil {
		return err
	}
	// Reload and save to normalize; future: re-read manifests from locations
	return SaveLocal(local, path)
}
