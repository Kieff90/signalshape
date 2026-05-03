#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TARGET=${1:-all}

install_claude() {
  mkdir -p "$HOME/.claude/skills"
  rm -rf "$HOME/.claude/skills/signalshape"
  cp -R "$ROOT_DIR/skills/signalshape" "$HOME/.claude/skills/signalshape"
  printf '%s\n' "Installed SignalShape for Claude Code: $HOME/.claude/skills/signalshape"
}

install_codex() {
  mkdir -p "$HOME/.agents/skills"
  rm -rf "$HOME/.agents/skills/signalshape"
  cp -R "$ROOT_DIR/skills/signalshape" "$HOME/.agents/skills/signalshape"
  printf '%s\n' "Installed SignalShape for Codex: $HOME/.agents/skills/signalshape"
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

