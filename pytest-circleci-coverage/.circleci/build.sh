#!/bin/bash
# Build the Python package distribution with a dynamic version.
#
# The version is set to MAJOR.MINOR.<pipeline number>: the MAJOR.MINOR base
# lives in pyproject.toml, and CI supplies a unique, increasing patch so every
# publish from main is a new version.
#
# Environment variables:
#   PIPELINE_NUMBER - CircleCI pipeline number (defaults to 0 locally)

set -eu

PATCH="${PIPELINE_NUMBER:-0}"

BASE_VERSION="$(python -c "import tomllib; print(tomllib.load(open('pyproject.toml','rb'))['project']['version'])")"
MAJOR="$(echo "$BASE_VERSION" | cut -d. -f1)"
MINOR="$(echo "$BASE_VERSION" | cut -d. -f2)"
TARGET_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo "Building package version: ${TARGET_VERSION}"

# Update version in pyproject.toml (portable sed for macOS and Linux).
sed -i.bak "s/^version = \".*\"/version = \"${TARGET_VERSION}\"/" pyproject.toml && rm -f pyproject.toml.bak

python -m build
