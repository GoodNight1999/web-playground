#!/bin/bash
# 只在 Claude Code 云端会话里安装依赖；本地会话直接跳过。
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" && npm ci --no-fund --no-audit --loglevel=error
exit 0
