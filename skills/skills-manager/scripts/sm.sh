#!/usr/bin/env bash
# Wrapper script for skills-manager CLI.
# AI agents should call this script instead of npx directly.
# Usage: "$SM" push | "$SM" pull | "$SM" link ...
exec npx -y @tc9011/skills-manager@latest "$@"
