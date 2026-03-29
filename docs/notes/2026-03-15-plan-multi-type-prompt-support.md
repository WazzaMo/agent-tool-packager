# Multi-type Prompt Support in a Single Package

(c) Copyright 2026 Warwick Molloy.
Created Mar 15, 2026.

This note explores options for supporting multiple types of prompt matter (e.g., both a `Skill` and a `Rule`) within a single ATP package.

## Current Limitation

Currently, a package has a single global `type` (Rule, Prompt, Skill, Hook, Mcp, etc.). All files listed in the `components` property are assigned this type during catalog addition. This prevents a single package from providing both a rule (background context) and a skill (specific agent instruction).

## Proposed Alternatives

### Alternative 1: Explicit Metadata in `atp-package.yaml`

In this model, the `components` list is evolved from a list of strings to a list of objects containing both the file path and its specific asset type.

**YAML Example:**
```yaml
name: advanced-mcp-tool
type: Mcp
version: 0.1.0
components:
  - path: docs/conventions.md
    type: rule
  - path: docs/operator-skill.md
    type: skill
bundles:
  - path: mcp-server
```

**Tar Layout (`stage.tar`):**
Components remain flat at the root of the tar to maintain current `atp` behavior.
```text
conventions.md
operator-skill.md
mcp-server/bin/server.js
...
```

---

### Alternative 2: Convention-based (Directory Mapping)

The asset type is inferred from the directory structure within the package root or the staging area. This aligns with the "near UNIX conformant" goals for bundles.

**YAML Example:**
```yaml
name: advanced-mcp-tool
type: Mcp
version: 0.1.0
components:
  - rules/conventions.md
  - skills/operator-skill.md
bundles:
  - path: mcp-server
```

**Tar Layout (`stage.tar`):**
The directory hierarchy is preserved in the tar file.
```text
rules/conventions.md
skills/operator-skill.md
mcp-server/bin/server.js
...
```

---

### Alternative 3: The "Prompt Bundle"

Instead of using individual components, prompts are grouped into a dedicated bundle. The installer then treats specific subdirectories within that bundle as rules or skills.

**YAML Example:**
```yaml
name: advanced-mcp-tool
type: Mcp
version: 0.1.0
bundles:
  - path: prompts
  - path: mcp-server
```

**Tar Layout (`stage.tar`):**
```text
prompts/rules/conventions.md
prompts/skills/operator-skill.md
mcp-server/bin/server.js
...
```

## Comparison

| Feature | Alternative 1 (Explicit) | Alternative 2 (Convention) | Alternative 3 (Bundle) |
|---------|-------------------------|----------------------------|------------------------|
| **Clarity** | Very High (Explicit in YAML) | Medium (Inferred from path) | High (Structure-driven) |
| **Complexity** | High (YAML schema change) | Low (Path parsing) | Low (Standard bundle) |
| **Flexibility** | High | Medium | Medium |
| **Conformance** | Low | High | Very High |

## Conclusion

**Alternative 2** offers the best balance between implementation simplicity and alignment with the existing bundle architecture, while **Alternative 1** provides the most robust metadata for tools that might want to inspect the package without extracting it.
