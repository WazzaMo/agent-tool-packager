# Standardised Skill support

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

Here is the [SKILL.md specification](https://agentskills.io/specification) and it definitey has YAML front matter and markdown body.

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

In a bundle directory, the bundle should have the name of the skill.
The YAML frontmatter and the markdown body should be in different files and assembled into one
SKILL.md file upon installation. Editors like VSCode support YAML editing when the extension is `.yml`
or `.yaml` and syntax highlighting will be disabled for YAMl frontmatter in a markdown file.

Similarly, markdown highlighting wil work better in a separate markdown file, with `.md` extension.

The YAML and Markdown should be written to:
1.  skill.yaml; and
2.  skill.md

Upon assembly during installation, this will be turned into SKILL.md with the YAML frontmatter, the `----`
divider and the Markdown body. Validation of the part can check the skill frontmatter for correct fields
and desirable value lengths to support [Progressive disclosure](https://agentskills.io/specification#progressive-disclosure)
to minimise unnecessary token usage.

A bundle allows for sub-directories, sucy as `scripts/` and the user can give the --exec-filter scripts/*
so the installation process can control the path and update the markdown body with the correct path.

## Standardisation means common implementation code

Because this standard applies to most agents, we can make a set of functions that implement the Skill
agent provider logic in one place, that all AgentProvider implementations can use when the part being installed is a skill.

A few questions before implementation:

1. Scope of shared logic is to handle installation of skills for all agent types:

    -   Validate and normalize the SKILL.md content from component files `skill.yaml` and `skill.md`

    -   Handle the optional directories as they appear in the bundle
        (scripts/, references/, assets/) as part of the skill install.

    -   the standardised provider logic should extend ATP package validation during authoring
        to confirm that any directories mentioned in the `skill.md` also appears in the bundle.

2. Validation strictness - name and description should be validated against Skill spec numbers:
    -   name : up to 64 chars

    -   description : up to 1024 chars


3.  File location - because it's standardised, we should give skill it's own sub-namespace
    so the directory for the common source code should be `src/provider/skill/` and this allows
    for multiple files to keep the code clean.
 
4.  Up until now, skills were intended to be pass-through but this deviates from Rule which
    share the YAML----Markdown format, so this is an inconsistency but more importantly the
    bundle format supports the possibilities of skills so much better. This means we want skills
    to be authored in a bundle with the `SKILL.md` being assembled from `skill.yaml` and `skill.md`
    as component files. So it will share the normalize/reassemble logic from `.mdc` files.

