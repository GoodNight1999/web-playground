# 读取本地 Claude Code 会话记录（~/.claude/projects/*/*.jsonl），判断 Claude 此刻在做什么。
# 只读文件、不改任何设置，也不会拖慢 Claude。兼容 Windows PowerShell 5.1。

$script:ToolLines = @{
  Bash      = '噼里啪啦敲命令中…'
  PowerShell = '噼里啪啦敲命令中…'
  Read      = '翻书中 📖'
  Edit      = '写写改改 ✏️'
  Write     = '奋笔疾书 ✏️'
  Grep      = '找找看在哪 🔍'
  Glob      = '找找看在哪 🔍'
  WebSearch = '上网查资料 🌐'
  WebFetch  = '上网查资料 🌐'
  Agent     = '叫小伙伴来帮忙！'
  Task      = '叫小伙伴来帮忙！'
}

function Get-ClaudeProjectsDir {
  $base = $env:CLAUDE_CONFIG_DIR
  if (-not $base) {
    $home_ = if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME }
    $base = Join-Path $home_ '.claude'
  }

  return (Join-Path $base 'projects')
}

# 所有项目目录里最近写过的那个会话记录；没有就返回 $null
function Find-LatestTranscript([string]$ProjectsDir) {
  if (-not (Test-Path -LiteralPath $ProjectsDir)) {
    return $null
  }
  $latest = $null
  foreach ($dir in [IO.Directory]::EnumerateDirectories($ProjectsDir)) {
    foreach ($file in [IO.Directory]::EnumerateFiles($dir, '*.jsonl')) {
      $time = [IO.File]::GetLastWriteTimeUtc($file)
      if (-not $latest -or $time -gt $latest.Time) {
        $latest = [pscustomobject]@{ Path = $file; Time = $time }
      }
    }
  }

  return $latest
}

# 读文件末尾一段（Claude 正在写这个文件，所以要允许共享读写）
function Read-TranscriptTail([string]$Path, [int]$Bytes = 262144) {
  $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]'ReadWrite, Delete')
  try {
    $start = [Math]::Max(0, $stream.Length - $Bytes)
    [void]$stream.Seek($start, [IO.SeekOrigin]::Begin)
    $buffer = New-Object byte[] ($stream.Length - $start)
    $read = $stream.Read($buffer, 0, $buffer.Length)
    $text = [Text.Encoding]::UTF8.GetString($buffer, 0, $read)
  } finally {
    $stream.Dispose()
  }
  $lines = $text -split "`n"
  # 从中间截断时第一行是半截，丢掉
  if ($start -gt 0 -and $lines.Count -gt 0) {
    $lines = $lines[1..($lines.Count - 1)]
  }

  return $lines
}

# 从一条记录判断状态：prompt（刚收到消息）、tool（在用工具）、thinking（思考中）、done（回答完了）
function Get-ClaudeActivity($Entry) {
  $content = @($Entry.message.content)
  if ($Entry.type -eq 'assistant') {
    $tool = $content | Where-Object { $_.type -eq 'tool_use' } | Select-Object -Last 1
    if ($tool) {
      return [pscustomobject]@{ Kind = 'tool'; Tool = [string]$tool.name }
    }
    if ($Entry.message.stop_reason -eq 'end_turn') {
      return [pscustomobject]@{ Kind = 'done'; Tool = $null }
    }

    return [pscustomobject]@{ Kind = 'thinking'; Tool = $null }
  }
  if ($content | Where-Object { $_.type -eq 'tool_result' }) {
    return [pscustomobject]@{ Kind = 'thinking'; Tool = $null }
  }

  return [pscustomobject]@{ Kind = 'prompt'; Tool = $null }
}

# 倒着找最后一条用户或 Claude 的消息（跳过附件、系统记录和子代理的记录）
function Get-LatestActivity([string[]]$Lines) {
  for ($i = $Lines.Count - 1; $i -ge 0; $i--) {
    $line = $Lines[$i]
    if (-not $line -or ($line -notlike '*"type":"assistant"*' -and $line -notlike '*"type":"user"*')) {
      continue
    }
    try {
      $entry = $line | ConvertFrom-Json
    } catch {
      continue
    }
    if (($entry.type -ne 'assistant' -and $entry.type -ne 'user') -or $entry.isSidechain -or -not $entry.message) {
      continue
    }
    $activity = Get-ClaudeActivity $entry
    $activity | Add-Member -NotePropertyName Id -NotePropertyValue ([string]$entry.uuid)

    return $activity
  }

  return $null
}

# 桌宠对某个状态要说的话；thinking 不说话，避免气泡刷屏
function Get-ActivityLine($Activity) {
  switch ($Activity.Kind) {
    'prompt' { return '收到～让我想想！' }
    'done' { return '搞定啦！✨' }
    'tool' {
      if ($Activity.Tool -like 'mcp__*') {
        return '在用外部工具 🔌'
      }
      $line = $script:ToolLines[$Activity.Tool]
      if ($line) {
        return $line
      }

      return "正在用 $($Activity.Tool)…"
    }
  }

  return $null
}
