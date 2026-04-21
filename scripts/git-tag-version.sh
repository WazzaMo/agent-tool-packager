#!/usr/bin/env bash
# Create a git tag v{version} using the semver in project-version at the repo root.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version_file="${repo_root}/project-version"

if [[ ! -f "${version_file}" ]]; then
  echo "error: missing ${version_file}" >&2
  exit 1
fi

version="$(tr -d '[:space:]' < "${version_file}")"
if [[ -z "${version}" ]]; then
  echo "error: empty version in ${version_file}" >&2
  exit 1
fi

tag="v${version}"

if ! git -C "${repo_root}" rev-parse --git-dir >/dev/null 2>&1; then
  echo "error: ${repo_root} is not a git repository" >&2
  exit 1
fi

if git -C "${repo_root}" rev-parse -q --verify "refs/tags/${tag}" >/dev/null 2>&1; then
  echo "error: tag ${tag} already exists" >&2
  exit 1
fi

git -C "${repo_root}" tag "${tag}"
echo "Created tag ${tag} (from project-version). Push with: git push origin ${tag}"
