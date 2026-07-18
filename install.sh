#!/bin/sh
# Install the summer-vibe skill for Mistral Vibe.
# Usage:  curl -fsSL https://raw.githubusercontent.com/luaroncrew/summer-vibe-hack/main/install.sh | sh
set -e
DIR="$HOME/.vibe/skills/summer-vibe"
mkdir -p "$DIR"
curl -fsSL "https://raw.githubusercontent.com/luaroncrew/summer-vibe-hack/main/skill/summer-vibe/SKILL.md" -o "$DIR/SKILL.md"
echo "Installed. Open vibe and type: /summer-vibe"
