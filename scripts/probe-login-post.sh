#!/usr/bin/env bash
# Compatibilidade: o login por senha nao usa mais Server Action.
set -euo pipefail

echo "INFO: probe-login-post foi substituido pelo diagnostico completo."
exec bash "${APP_DIR:-/opt/agify}/scripts/diagnose-server.sh"
