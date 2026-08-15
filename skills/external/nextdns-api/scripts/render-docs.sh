#!/usr/bin/env bash
# Renders references/openapi.yaml into a readable static HTML doc
# (references/openapi.html) using Redocly CLI, and lints the spec first.
#
# Usage: ./render-docs.sh
# Requires: node/npx with internet access (or @redocly/cli cached locally).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../references"

echo "Linting openapi.yaml..."
npx --yes -q @redocly/cli lint openapi.yaml

echo "Rendering readable HTML doc..."
npx --yes -q @redocly/cli build-docs openapi.yaml -o openapi.html

echo "Done: references/openapi.html"
