# Contributing to Agent Tool Packager

Thank you for your interest in contributing to Agent Tool Packager. Your agents will thank you...

This guide covers everything you need to get started, from setting up your environment to submitting a pull request.

# How to Contribute

Agent Tool Packager uses the fork and pull request workflow. You do not need write access to the repository to contribute.

## Step 1: Fork the Repository

1. Navigate to [https://github.com/WazzaMo/atp](https://github.com/WazzaMo/atp).
2. Click the **Fork** button in the top-right corner.
3. Select **Copy the default branch only** (recommended for most contributions).
4. GitHub creates your own copy of the repository under your account.

## Step 2: Clone Your Fork

```bash
git clone https://github.com/WazzaMo/atp.git
# or ... git clone git@github.com:WazzaMo/atp.git
cd atp
```

## Step 3: Create a Branch

Create a branch for your change. Use a descriptive name that reflects the work.

```bash
git checkout -b create-skill-for-agent
```

## Step 4: Make Your Changes

Follow the coding standards and environment setup described below. Commit your work with clear, concise messages.

```bash
git add .
git commit -m "Fix search tool ignoring limit parameter"
```

## Step 5: Push and Open a Pull Request

Push your branch to your fork:

```bash
git push -u origin fix-search-limit
```

Then open a pull request from your fork on GitHub. In the pull request description:

- Summarise what you changed and why.
- Reference any related issues (e.g., "Fixes #12").
- Describe how to test the change.

A maintainer will review your pull request and may request changes before merging.

# Environment Setup

This should be found in the [README file](./README.md).

## General

- Do not commit secrets, API keys, or `.env` files.
- Do not commit generated files (`dist/`, `.venv/`, `node_modules/`).
- Run the relevant test suite before submitting a pull request.

# Documentation

Documentation is a first-class citizen in Agent Tool Packager. All Markdown files should follow the formatting rules in [docs/doc-guide.md](docs/doc-guide.md):

- Use `#` (level 1 headings) for new sections, not only the title.
- Place an empty line after every heading.
- Use headings instead of bold text for labels.
- Keep table rows under 60 characters; use headings and paragraphs for longer descriptions.
- Use Mermaid for diagrams, with all text labels quoted.

## Agent provider contributions

When adding or changing **`AgentProvider`** wiring (a new agent, merge targets,
install gates, or Safehouse removal paths), follow
[docs/contributor-guide-agent-providers.md](docs/contributor-guide-agent-providers.md)
alongside [Feature 5 — Installer providers](docs/features/5-installer-providers-for-known-agents.md).

## Notes

If your contribution involves a new feature or architectural change, create an implementation plan in `docs/notes/` prefixed with the date (e.g., `2026-02-15-my-feature.md`). Review it against the project goals in [docs/goals.md](docs/goals.md) and requirements in [docs/requirements.md](docs/requirements.md).

# What to Contribute

Contributions of all kinds are welcome:

- Bug fixes

- New features or tool improvements
    - New rules, prompts, skills, hooks
    - extending the type, or number, of agents supported.

- Test coverage improvements

- Documentation updates and corrections

- Performance optimisations

- Support for additional embedding providers in the Python script

- Agent Tool Packager can hold notes about what experience has taught people.

If you are unsure whether a change is in scope, open an issue first to discuss it.

# Reporting Issues

Open an issue at [https://github.com/WazzaMo/atp/issues](https://github.com/WazzaMo/atp/issues) with:

- A clear description of the problem or suggestion.
- Steps to reproduce (for bugs).
- Your environment (OS, Node.js version, Python version).

# License

By contributing to Agent Tool Packager, you agree that your contributions will be licensed under the Apache License, Version 2.0, the same license as the project.
