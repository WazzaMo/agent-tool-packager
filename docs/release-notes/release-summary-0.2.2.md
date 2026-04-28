# 0.2.2 Release — 2026-03-21

Release summary for [0.2.2-Release-2026-03-21.md](./0.2.2-Release-2026-03-21.md). Each section below condenses the matching heading in that note.

# Summary

This is ATP’s first formal release note: it aligns the published CLI semver with `package.json`, ties together the three feature docs (`docs/features/1–3`), planning notes around Station/catalog/Safehouse, and marks work closed from the 2026-03-15 install-process todo.

# Feature 1 — Catalog, Station, and installation

Station holds config, catalog, and installs (default `~/.atp_station`, overridable); users initialize Station and Safehouse, list and install packages with project vs station scopes and binary placement defaults, handle several package kinds, agents, listings, removals, and optional Station exfiltrate workflows.

# Feature 2 — Package developer support

Authors scaffold packages incrementally—metadata, staged components and bundles with UNIX or `--exec-filter` layouts—and validate before publishing validated tarballs plus user-catalog entries beside `atp-package.yaml`.

# Feature 3 — Install process (project / Safehouse)

Install resolves the project base, initializes Safehouse, selects an agent, installs from catalog, unpacks bundles, places prompts where configured, patches bundle placeholders, and records `manifest.yaml` per Feature 3’s narrative.

# Package install process — work closed from project todo

This section inventories closure of gaps called out between Feature 3 and implementation in the March 2026 todo note—including agent commands, manifest shape, install mechanics, dependencies, discovery, docs, plus remaining low-severity follow-ups flagged for later clarity.

### Workflow and agent commands

`atp agent` demands a prior Safehouse init; docs show init-first examples; only Station-configured agents are accepted for assign and handover with integration coverage on rejection paths.

### Manifest and Station registration

Safehouse manifests follow the Feature 3 schema with backwards-compatible legacy loading; initializing registers the path in Station `atp-safehouse-list.yaml` when Station exists.

### Install mechanics

`{bundle_name}` placeholders expand during skill/rule copy; program assets land in user or project binary locations per scopes and staged catalog layout produced at catalog-add time.

### Dependencies

Installing without `--dependencies` fails fast on missing prerequisites so users explicitly opt into dependency installs.

### Project base discovery

`findProjectBase` discovers repo roots via marker walk or `SAFEHOUSE_PROJECT_PATH` for agent, Safehouse, install, and removal commands—with later home-directory hardening noted under safety.

### Code documentation (Feature 3 touchpoints)

Feature 3 hotspots gained JSDoc and import discipline per `clean-code.md`, plus an updated `copy-assets` module header describing tarball and binary-scope behavior.

### Outstanding clarifications from the same note

The historical todo still lists mild follow-ups—non-interactive failure on uncertain project bases, clearer param naming possibilities, and documenting that installs consume catalog staging rather than re-deriving bundle layout at apply time.

# Safety and configuration alignment

Init refuses `.atp_safehouse` directly in `$HOME` unless `ATP_ALLOW_HOME_SAFEHOUSE=1`; Station/catalog docs and filenames were aligned (`packages.standard` / `user`, naming conventions).

# Deferred exploration

A separate plan discusses multi-type prompt combinations in one package; that behavior is acknowledged but not shipped in 0.2.2.

# Where to read more

Cross-reference hub pointing readers at Feature 1–3 markdown, `docs/configuration.md`, and the closed install-process todo note for deeper reading.

### Feature 1 — definition and installation

Pointers to [`docs/features/1-package-definition-and-installation.md`](../features/1-package-definition-and-installation.md) for authoritative catalog/Station/install detail.

### Feature 2 — developer support

Pointers to [`docs/features/2-package-developer-support.md`](../features/2-package-developer-support.md) for authoring workflows and expectations.

### Feature 3 — install process

Pointers to [`docs/features/3-package-install-process.md`](../features/3-package-install-process.md) for end-to-end install narrative.

### Configuration

Pointers to [`docs/configuration.md`](../configuration.md) for Station and catalog configuration.

### Install process todo (historical closure)

Pointers to [`docs/notes/2026-03-15-todo-questions-on-package-install-process.md`](../notes/2026-03-15-todo-questions-on-package-install-process.md) for the originating gap list against Feature 3.
