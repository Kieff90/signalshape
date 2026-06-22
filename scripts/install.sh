#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TARGET=${1:-all}

install_skill() {
  dest=$1
  label=$2

  mkdir -p "$(dirname "$dest")"
  if [ -e "$dest" ]; then
    backup="${dest}.backup.$(date +%Y%m%d%H%M%S)"
    mv "$dest" "$backup"
    printf '%s\n' "Existing SignalShape skill moved to backup: $backup"
  fi
  cp -R "$ROOT_DIR/skills/signalshape" "$dest"
  printf '%s\n' "Installed SignalShape skill for $label: $dest"
}

install_claude() {
  install_skill "$HOME/.claude/skills/signalshape" "Claude-compatible agents"
}

install_codex() {
  install_skill "$HOME/.agents/skills/signalshape" "Codex-compatible agents"
}

case "$TARGET" in
  claude)
    install_claude
    ;;
  codex)
    install_codex
    ;;
  all)
    install_claude
    install_codex
    ;;
  *)
    printf '%s\n' "Usage: ./scripts/install.sh [all|claude|codex]" >&2
    exit 1
    ;;
esac
