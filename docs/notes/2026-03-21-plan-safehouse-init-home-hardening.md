# Plan: Harden safehouse init against home-directory safehouses

(c) Copyright 2026 Warwick Molloy.
Created 2026-03-21.

# Overview

`atp safehouse init` should not create `.atp_safehouse` under the user’s home directory by mistake. Today, a guard only runs when no project base is found **and** the current working directory looks like home. If `findProjectBase` resolves to `$HOME` (common when `~/.vscode` or `~/.git` exists, or when the parent walk reaches home within radius), init still creates `$HOME/.atp_safehouse`. The same gap applies when `SAFEHOUSE_PROJECT_PATH` points at home.

This note proposes a small implementation plan to close that gap.

# Problem

# Current behavior

`safehouseInit` in `src/init/safehouse-init.ts` calls `findProjectBase(cwd)`. It only refuses home when `projectBase` is null and `isHomeDirectory(cwd)` is true. If `projectBase` is non-null and equals (or is heuristically) the home directory, execution continues and `getSafehousePath(projectBase)` yields `$HOME/.atp_safehouse`.

`findProjectBase` in `src/config/paths.ts` returns the first directory in a short upward walk that contains `.git` or `.vscode`, or the directory from `SAFEHOUSE_PROJECT_PATH` if set. There is no check that the chosen root is not the user’s home.

# Risk

Users with project markers in `$HOME`, or shallow paths under `$HOME` that walk up to `$HOME` within the configured radius, get a safehouse in the home directory—contrary to documented intent and the existing anti-pattern messaging for the “no project found” case.

# Goal

Never create `.atp_safehouse` under the user’s home directory unless the user **explicitly** opts in (see escape hatch below).

# Proposed design

# 1. Guard the resolved project root

After obtaining a non-null `projectBase` from `findProjectBase`, if `isHomeDirectory(projectBase)` is true, exit with a clear error and the same class of guidance as today: run from a real project directory, adjust markers, or set `SAFEHOUSE_PROJECT_PATH` to a non-home project path.

# 2. Apply the same rule to `SAFEHOUSE_PROJECT_PATH`

If the env var resolves to a directory that `isHomeDirectory` treats as home, treat it as invalid for init unless the escape hatch is set.

# 3. Optional escape hatch

Support an explicit env var `ATP_ALLOW_HOME_SAFEHOUSE=1` so power users or tests can still init in home when intentional. Mention it in the error message. Default remains strict.

# 4. Messaging

Reuse or slightly extend the existing anti-pattern copy so users who hit “markers in home” or “env points at home” see consistent instructions, including the escape hatch if implemented.

# Code touchpoints

| Area                          | Change condition -> treatment                                         |
|-------------------------------|--------------------------------                                       |
| `src/init/safehouse-init.ts`  | After resolving `projectBase`, if `isHomeDirectory(projectBase)` -> 1 |
| `src/config/paths.ts`         | Optional: add a thin helper, say `isForbiddenSafehouseDir` ->2        |
| `src/commands/safehouse.ts`   | Update description/help for clarity -> 3                              |

Handling or treatment types (from above)

  1. when escape hatch unset, log error and `process.exit(1)`.

  2. wrapping `isHomeDirectory` only if it improves clarity.

  3. clarity in case it implies init always follows cwd without mentioning home rejection.

No change required to `getSafehousePath`; enforcement stays at init time.

## Benefits of the above changes

Adding the logic to check for the first area in `isForbiddenSafehouseDir` as per the second
area of change results in clear, self-documenting code so this has benefits. This becomes
the definition of what is a forbidden directory for the safehouse. The escape hatch is on test
could be done here, too, and it could generate the warning when the escape hatch is set on,
keeping all definition logic for "bad" and overrides in one place.

The "escape hatch" is only considered "on" when the env var `ATP_ALLOW_HOME_SAFEHOUSE` = 1
and any other value is not "on".

The third area of change listed above, is about communication.

Given these are all beneficial, integration tests should be added to confirm all three work as intended.
These tests should cover situations where the condition was and was not met.


# Testing

Unit and integration tests should cover these cases for both sides of the condition checks.

## Heuristics

The strict case `resolved === os.homedir()` is the main trigger; secondary heuristics (e.g. `.ssh`, `.bashrc`) apply to paths under `home` / `Users` parents.

## Edge cases

### Symlinks

`findProjectBase` uses `path.resolve`; `isHomeDirectory` compares to `os.homedir()`. If realpath mismatches appear on specific platforms, consider normalizing with `fs.realpathSync` only if tests or reports justify it.

### Windows

`isHomeDirectory` uses parent name `Users` for heuristics; confirm behavior matches `os.homedir()` on typical
Windows layouts.

## Integration

Use a temporary `HOME` (pattern already used elsewhere in tests) as a fake home containing `.vscode` or `.git`, run `safehouse init` from within that tree, and assert exit failure and stderr content (stable substring).

Include all integration tests mentioned above.

## Escape hatch

With the allow env set, same setup should succeed and create `.atp_safehouse` under the fake home if the hatch is implemented.

## `SAFEHOUSE_PROJECT_PATH`

Point at fake home path; expect failure without hatch; expect success with hatch if implemented.

## Regression

Existing cases (project with `.git` / `.vscode`, init from another cwd with `SAFEHOUSE_PROJECT_PATH` to a real project directory) must still pass.

# Documentation

Add a short note in `README.md` or `docs/configuration.md` under safehouse behavior: init does not create under `$HOME` by default; document the override env if added.

# Rollout

No data migration: existing `~/.atp_safehouse` directories are untouched; new inits simply stop creating home safehouses unless opted in.

# Risks

## Low

Behavior change is user-visible but aligns with documented anti-pattern; escape hatch preserves an explicit override.

# Summary

Add a post-resolution check: `isHomeDirectory(projectBase)` → refuse unless explicit allow env; extend tests and docs accordingly. Scope is small and localized to `safehouse-init.ts` plus tests and a doc line.
