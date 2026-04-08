# Standardised Skill support

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

Here is the [SKILL.md specification](https://agentskills.io/specification) and it definitely has YAML
front matter and markdown body.

Skills are expected to be packed in a particular directory structure and [the specification gives this breakdown](https://agentskills.io/specification#directory-structure)

```text
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

## Changing the thinking

Earlier, the general assumption in package authoring examples were that skills were a single file,
just `SKILL.md` in a particular directory. It is not that simple. Given that skills can include
optional scripts, a bundle is the most effective mechanism for developing, staging, authoring and
specifying skills.

In a bundle directory, the bundle base directory name does not need to match the name of the skill
because the file layout will be controlled during the installation process.
The YAML frontmatter and the markdown body should be in different files and assembled into one
SKILL.md file upon installation. Editors like VSCode support YAML editing when the extension is `.yml`
or `.yaml` and syntax highlighting will be disabled for YAML frontmatter in a markdown file.

Similarly, markdown highlighting will work better in a separate markdown file, with `.md` extension.

The YAML and Markdown should be written to:
1.  skill.yaml; and
2.  skill.md

Upon assembly during installation, this will be turned into SKILL.md with the YAML frontmatter, the `---`
divider and the Markdown body. Validation of the part can check the skill frontmatter for correct fields
and desirable value lengths to support [Progressive disclosure](https://agentskills.io/specification#progressive-disclosure)
to minimise unnecessary token usage.

A bundle allows for sub-directories, such as `scripts/` and the user can give the --exec-filter scripts/*
so the installation process can control the path and update the markdown body with the correct path.

## Standardisation means common implementation code

Because this standard applies to most agents, we can make a set of functions that implement the Skill
agent provider logic in one place, that all AgentProvider implementations can use when the part being installed is a skill.

## A few points to consider

1. Scope of shared logic is to handle installation of skills for all agent types:

    -   Validate and normalize the SKILL.md content from bundle files `skill.yaml` and `skill.md`

    -   Handle the optional directories as they appear in the bundle
        (scripts/, references/, assets/) as part of the skill install.

    -   the standardised provider logic should extend ATP package validation during authoring
        to confirm that any directories mentioned in the `skill.md` also appear in the bundle.

2. Validation strictness - name and description should be validated against Skill spec numbers:

 | Field        | Details       |
 |--------------|---------------|
 | name         |   64 chars    |
 | description  | 1024 chars    |
 | compatibility|  500 chars (a)|
 | metadata     | object see (b)|
 | allowed-tools| list   see (c)|
 
(a) Optional, natural language list of dependencies or environment limits e.g. "Designed for Claude Code"

(b) A YAML object adding additional metadata. Per the Agent Skills specification, keys are strings
    and values are strings. ATP standard skill provider functions validate that shape when `metadata`
    is present (arbitrary keys allowed, not a fixed set).


```yaml
metadata:
  author: example-org
  version: "1.0"
```

(c) A space-delimited list of tools that are pre-approved for use. This is an experimental field
    in the spec. ATP will strip this from YAML frontmatter for now and may be supported in the future.


3.  File location - because it's standardised, we should give skill it's own sub-namespace
    so the directory for the common source code should be `src/provider/skill/` and this allows
    for multiple files to keep the code clean.
 
4.  Up until now, skills were intended to be pass-through but this deviates from Rule which
    share the YAML front matter and Markdown body pattern, so this is an inconsistency but more
    importantly the bundle format supports the possibilities of skills so much better. This means we
    want skills to be authored in a bundle with `SKILL.md` assembled from `skill.yaml` and `skill.md`
    as files inside that skill bundle. So it will share the normalize/reassemble logic from `.mdc` files.


## Implications and analysis

### Backward compatibility and user choice

The user may choose to create their skill file in the final form, as `SKILL.md` with YAML
frontmatter, --- divider and Markdown body. The user should be able to do this, if they wish.
Supporting this choice will also result in supporting existing packages.

If the skill is packaged as a component file on its own, this can still work.
At installation time, the skill directory will need to be created and its name must match
the skill name field from the YAML frontmatter, following the Skills specification.

The implication of this decision is that the Skills standard validations need to allow for the possibility
of an exact SKILL.md file being supplied either in a bundle or as a component, and the supply of partial
skill files - `skill.yaml` and `skill.md` that require assembly. The validation should check 
that the part has given one or the other - pre-assembled or needing assembly forms.

It is not valid, for a skill part to omit any form of skill file and it is also invalid to supply
one of the partial files without the other - both the yaml and markdown partials are required.
Omitted skills should result in an error message during package authoring and a failure with a non-zero
exit code.

The pair of partial files, `skill.yaml` and `skill.md`, are only accepted in a bundle and will be
rejected at authoring time if added as components, with an error message instructing the user
to employ the bundle approach. `skill.yml` is treated as an alias to `skill.yaml` and either name for the
skill YAML content will be accepted.

A `SKILL.md` can be provided as a component, the legacy way, or in a bundle - either is acceptable.

### Installed directory naming and layout

After the package installation completes, the skill part will have a layout as described here.
The assembled file will be `SKILL.md`. When assembly is used, the install directory name comes from
the `name` field in the YAML frontmatter. The directory structure will be:

```text
{agent-skill-directory}/{skill-name}
├── SKILL.md
├── optional directories (scripts/, references/, assets/)
```

Where:
    {agent-skill-directory} = {project-root}/{project-agent-directory}/{agent-skills-subdir}

    - {project-root} is the base directory for the development project;
    - {project-agent-directory} is the directory for agent-specific files (e.g. `.cursor`, `.gemini`,
      `.claude`; Codex skills use `.agents` as in upstream layout)
    - {agent-skills-subdir} is `skills` relative to that directory (ATP **`GeminiAgentProvider`** uses
      project **`.gemini/`** only—not **`.agents/`**—for Gemini CLI installs).

An example is `.cursor/skills/pdf-processing/` where:
- the agent is cursor
- cursor expects `skills` as the {agent-skills-subdir}; and
- `pdf-processing` is the skill name specified in the YAML frontmatter.

The AgentProvider implementation can pass the agent skill directory, as a full path to the
skill provider standard functions to complete resolution of the complete set of installation paths.
This will meet the spec for agents and for skills, in general.

The optional `references/` and `assets/` directories should install inside the skill directory to comply
with the skill specification.

### Bundle layout and processing

It **will not** rely on the bundle name or bundle structure to match the name of the skill.
Example, assume the package developer has a working directory structure like this:

```text
WonderSkill/
├── .git/
├── pkg_bundle/
│   ├── SKILL.md
│   └── assets/
│       └── template.yaml
└── author-dir/
```

Where WonderSkill is their project base and their local `git` repo.
The `author-dir` directory is where they would use ATP to build the package
and they would use relative paths back to `pkg_bundle` when adding the bundle.
This directory is not special and its name will be replaced through the directory
structure control mechanism used at install time.

The bundle directory can store all the other directories and files to include in the 
package part, such as the template asset.


### Component SKILL.md files

When a single or a few files are provided in the skill part, such as the SKILL.md,
the directory structure control mechanism will be required to ensure the skill spec compliant
directory layout will be created at install time.

### Directory structure control

To best support both bundles and components where the user has packaged a SKILL.md final file
as a component, the install process will control the directory structure to match the above specification
and the Skill specification.

The process is to:

 1. resolve skill-name from frontmatter
 
 2. create {agent-skills-subdir}/{skill-name}/,
 
 3. map bundle tree under it so that it replaces the bundle base directory such that the assembled 
    SKILL.md or the component SKILL.md will appear under {skill-name}/ along with any optional
    directories, such as `scripts/`, `assets/` or `references/`.

### Script installation

For scripts in skills, we should meet the specification for skills because this avoids surprising the end
user and that means that scripts are installed in with the skill, as documented by the Skills specification. The implication of this is that we cannot make this bundle a UNIX compliant structure upon
install. It also means the scripts do not need to be in the general PATH environment variable for the user.

This means these scripts are not treated as system executables and are for the agent's predominantly.
There is nothing but inconvenience stopping a user from running them.

### Script path patching in SKILL.md files

Is path patching needed? Most likely this will not be needed because there is a standard
and agents have implemented it.

We can give the user the option to employ path patching by using the variable in their markdown body.
```markdown
## Extract content from PDF
Execute {skill_scripts}/extract.py to extract text from the PDF.
```

The variable will be very specific `{skill_scripts}` and will be expected to have `/` follow it.
Meaning a string replace can be performed after the SKILL.md file is written, replacing the variable
with relative paths from the skill root directory.

### Skill validation

The validation of the skill bundle should be performed at authoring time because this is the best
time for the author to take corrective action. They must be told what is wrong and given clues and
suggestions for corrections.

Authoring error cause cases (incomplete list):

    - SKILL.md or ((skill.yaml or skill.yml) + skill.md) file missing

    - YAML frontmatter violations - field names or lengths outside the Skill specification.

    - Markdown body mentions a script file, reference or asset file and the files are missing.

These are all things the author should be told at authoring time, so they can fix their package.
The package authoring process should fail with error messages and stop until fixed.

If any package validation violations are found at install time, the package must be deemed as invalid
and recognised as a security risk because the package YAML file, `atp-package.yaml` and the contents
of the `package.tar.gz` may have been tampered with or corrupted.

At install time, there are other reasons for install to fail, such as installation ambiguities
or file path collisions should lead to an error message. Installation ambiguities was defined
in [Feature 5 spec section: Configuration files (JSON and TOML)](../features/5-installer-providers-for-known-agents.md#configuration-files-json-and-toml)
where an install would appear to overwrite an existing directory or file.

The installation validation logic is different from authoring validation because:

    1.  the problems are different; and

    2.  the actions to correct the problems are different.

That said, the installation validation is additive to the package validation.
