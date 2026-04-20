# Security Policy

This document describes how to report security vulnerabilities in Agent Tool
Packager (ATP) and which releases we aim to support with security fixes.

Repository:

https://github.com/WazzaMo/agent-tool-packager

# Supported Versions

We focus security fixes on the current development line. Use the latest
release or commit on the default branch when possible.

| Line              | Supported   |
|-------------------|-------------|
| Current `main`    | Yes         |
| Latest tagged npm | Yes         |
| Older releases    | Best effort |

If you depend on an older version, plan to upgrade; we may not backport every
fix.

# Reporting a Vulnerability

Please report security issues privately so we can investigate before details
are public.

## Preferred: GitHub

1. Open the repository on GitHub.

2. Use the Security tab and follow the reporting flow for vulnerabilities
   (private reporting), if it is enabled for this project.

3. Do not open a public issue or discussion for undisclosed security
   problems.

## What to include

- A clear description of the issue and its impact.

- Steps to reproduce, or proof-of-concept, where safe to share.

- Affected component (CLI, install paths, catalog fetch, etc.) and version
  or commit if known.

## After you report

- We will acknowledge receipt when we can and work on a fix on a reasonable
  timeline depending on severity and complexity.

- We may ask follow-up questions; please keep the report channel confidential
  until we coordinate disclosure.

- Credit in release notes or advisories is welcome when you want it; say so
  in your report.

# Coordinated Disclosure

Please allow time for a fix before public discussion. We aim to release
patches via the normal release process (semantic versioning) and to document
material changes in release notes where appropriate.

# Non-security bugs

For regular defects and feature requests, use the project’s usual
contribution paths (issues or pull requests) as described in
[CONTRIBUTING.md](CONTRIBUTING.md).
