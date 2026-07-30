#!/bin/bash
# Publish Python package distributions to PyPI or TestPyPI using twine
#
# Usage (API Token):
#   export PYPI_ENV=staging
#   export TWINE_USERNAME="__token__"
#   export TWINE_PASSWORD="<your-pypi-token>"
#   ./publish.sh
#
# Environment variables:
#   PYPI_API_KEY - PyPI API token

set -eu

#REPO_DOMAIN="test.pypi.org"
#REPO_NAME="TestPyPI"
REPO_DOMAIN="pypi.org"
REPO_NAME="PyPI"

REPO_URL="https://${REPO_DOMAIN}/legacy/"

echo "Publishing to $REPO_NAME (${REPO_DOMAIN})..."

# Disable command echoing to avoid leaking credentials
set +x

# Upload distributions
python -m twine upload --verbose \
  --repository-url "$REPO_URL" \
  --username "__token__" \
  --password "$PYPI_API_KEY" \
  dist/*.whl dist/*.tar.gz

set -x

echo "Publish to $REPO_NAME complete!"
