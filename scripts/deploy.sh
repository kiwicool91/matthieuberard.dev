#!/usr/bin/env bash
set -euo pipefail

# Load .env (only set vars that are currently unset)
if [[ -f .env ]]; then
  while IFS='=' read -r __key __value; do
    # Skip comments/empty lines
    [[ -z "${__key}" || "${__key}" =~ ^# ]] && continue
    # Trim trailing carriage return if present (Windows line endings)
    __value="${__value%$'\r'}"
    # Only export if not already set in the environment
    if [[ -z "${!__key+x}" ]]; then
      export "${__key}"="${__value}"
    fi
  done < .env
fi

DEPLOY_HOST=${DEPLOY_HOST:-}
DEPLOY_USER=${DEPLOY_USER:-root}
DEPLOY_PATH=${DEPLOY_PATH:-}
DEPLOY_PORT=${DEPLOY_PORT:-22}
RSYNC_OPTS=${RSYNC_OPTS:-"-avz --delete"}
# Optional: SSH key and extra SSH options
DEPLOY_SSH_KEY=${DEPLOY_SSH_KEY:-}
# Default to accepting new host keys automatically on first connect
DEPLOY_SSH_OPTS=${DEPLOY_SSH_OPTS:-"-o StrictHostKeyChecking=accept-new"}

if [[ -z "$DEPLOY_HOST" || -z "$DEPLOY_PATH" ]]; then
  echo "Missing DEPLOY_HOST or DEPLOY_PATH environment variables." >&2
  echo "Example: DEPLOY_HOST=example.com DEPLOY_USER=deploy DEPLOY_PATH=/var/www/app npm run deploy" >&2
  exit 1
fi

echo "Building project…"
npm run build

# Expand ~ in key path and validate key file if provided
if [[ -n "${DEPLOY_SSH_KEY}" && "${DEPLOY_SSH_KEY}" == ~* ]]; then
  DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY/#\~/${HOME}}"
fi
if [[ -n "${DEPLOY_SSH_KEY}" && ! -f "${DEPLOY_SSH_KEY}" ]]; then
  echo "SSH key not found at: ${DEPLOY_SSH_KEY}" >&2
  exit 1
fi

# Build SSH command
SSH_CMD=(ssh -p "${DEPLOY_PORT}")
if [[ -n "${DEPLOY_SSH_KEY}" ]]; then
  SSH_CMD+=( -i "${DEPLOY_SSH_KEY}" -o IdentitiesOnly=yes )
  echo "Using SSH key: ${DEPLOY_SSH_KEY}"
fi
if [[ -n "${DEPLOY_SSH_OPTS}" ]]; then
  # shellcheck disable=SC2206
  EXTRA_OPTS=( ${DEPLOY_SSH_OPTS} )
  SSH_CMD+=( "${EXTRA_OPTS[@]}" )
fi

# Avoid falling back to password prompts; fail fast if key auth fails
SSH_CMD+=( -o PasswordAuthentication=no )

# Optional SSH debug output
if [[ "${DEPLOY_DEBUG_SSH:-0}" == "1" ]]; then
  SSH_CMD+=( -v )
fi

# Quick connectivity check to ensure key auth works (non-interactive)
echo "Checking SSH connectivity…"
if ! "${SSH_CMD[@]}" -o BatchMode=yes -o ConnectTimeout=5 "${DEPLOY_USER}@${DEPLOY_HOST}" true; then
  echo "SSH failed or requires a password. Configure your SSH key (ssh-copy-id) or set DEPLOY_SSH_KEY in .env." >&2
  exit 1
fi

# If we are not going to use sudo on the remote, ensure the target is writable.
if [[ "${DEPLOY_RSYNC_SUDO:-0}" != "1" ]]; then
  echo "Checking remote directory permissions…"
  if ! "${SSH_CMD[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" bash -lc "test -d '${DEPLOY_PATH}' && test -w '${DEPLOY_PATH}'"; then
    echo "Remote path is not writable by ${DEPLOY_USER}: ${DEPLOY_PATH}" >&2
    echo "Fix by adjusting ownership/permissions on the server, e.g.:" >&2
    echo "  sudo mkdir -p '${DEPLOY_PATH}' && sudo chown -R ${DEPLOY_USER}:www-data '${DEPLOY_PATH}' && sudo chmod -R g+rwX '${DEPLOY_PATH}'" >&2
    echo "Alternatively, set DEPLOY_RSYNC_SUDO=1 in .env to run rsync via sudo on the remote (requires passwordless sudo for rsync)." >&2
    exit 1
  fi
fi

# Optionally run rsync via sudo on the remote if DEPLOY_RSYNC_SUDO=1
RSYNC_PATH_ARG=()
if [[ "${DEPLOY_RSYNC_SUDO:-0}" == "1" ]]; then
  echo "Resolving remote elevation (sudo/doas) and rsync paths…"
  REMOTE_SUDO_PATH=$("${SSH_CMD[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" bash -lc 'command -v sudo || true')
  REMOTE_DOAS_PATH=$("${SSH_CMD[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" bash -lc 'command -v doas || true')
  REMOTE_RSYNC_PATH=$("${SSH_CMD[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" bash -lc 'command -v rsync || true')
  if [[ -z "${REMOTE_RSYNC_PATH}" ]]; then
    # Best-effort default; if still missing, rsync itself will error clearly
    REMOTE_RSYNC_PATH="/usr/bin/rsync"
  fi
  if [[ -n "${REMOTE_SUDO_PATH}" ]]; then
    RSYNC_PATH_ARG=(--rsync-path "${REMOTE_SUDO_PATH} -n ${REMOTE_RSYNC_PATH}")
  elif [[ -n "${REMOTE_DOAS_PATH}" ]]; then
    RSYNC_PATH_ARG=(--rsync-path "${REMOTE_DOAS_PATH} -n ${REMOTE_RSYNC_PATH}")
  else
    echo "Neither sudo nor doas found on remote host. Install one, or disable DEPLOY_RSYNC_SUDO and ensure ${DEPLOY_PATH} is writable by ${DEPLOY_USER}." >&2
    exit 1
  fi
fi

echo "Syncing dist/ to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH} (port ${DEPLOY_PORT})…"
rsync ${RSYNC_OPTS} ${RSYNC_PATH_ARG[@]} -e "${SSH_CMD[*]}" dist/ "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "Deploy complete."
