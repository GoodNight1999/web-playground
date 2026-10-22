# 不依赖 Pester 的小测试：pwsh -File desktop-pet-app/tests/ClaudeWatcher.Tests.ps1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\ClaudeWatcher.ps1')

$script:failed = 0
function Assert-Equal($Actual, $Expected, [string]$Name) {
  if ($Actual -ceq $Expected) {
    Write-Host "(pass) $Name"
  } else {
    Write-Host "(fail) $Name：期望 [$Expected]，实际 [$Actual]"
    $script:failed++
  }
}

function Line($Object) {
  return ($Object | ConvertTo-Json -Depth 10 -Compress)
}

$prompt = Line @{ type = 'user'; uuid = 'u1'; message = @{ role = 'user'; content = '你好' } }
$toolUse = Line @{ type = 'assistant'; uuid = 'a1'; message = @{ role = 'assistant'; stop_reason = 'tool_use'; content = @(@{ type = 'text'; text = '我看看' }, @{ type = 'tool_use'; name = 'Bash'; input = @{ command = 'ls' } }) } }
$toolResult = Line @{ type = 'user'; uuid = 'u2'; message = @{ role = 'user'; content = @(@{ type = 'tool_result'; content = 'ok' }) } }
$answer = Line @{ type = 'assistant'; uuid = 'a2'; message = @{ role = 'assistant'; stop_reason = 'end_turn'; content = @(@{ type = 'text'; text = '好了' }) } }
$attachment = Line @{ type = 'attachment'; uuid = 'x1' }
$system = Line @{ type = 'system'; subtype = 'stop_hook_summary'; uuid = 's1' }
$sidechain = Line @{ type = 'assistant'; uuid = 'a3'; isSidechain = $true; message = @{ role = 'assistant'; content = @(@{ type = 'tool_use'; name = 'Grep' }) } }
$mcp = Line @{ type = 'assistant'; uuid = 'a4'; message = @{ role = 'assistant'; content = @(@{ type = 'tool_use'; name = 'mcp__github__pull_request_read' }) } }

$activity = Get-LatestActivity @($prompt)
Assert-Equal $activity.Kind 'prompt' '用户刚发消息'
Assert-Equal (Get-ActivityLine $activity) '收到～让我想想！' '收到消息的台词'

$activity = Get-LatestActivity @($prompt, $toolUse, $attachment)
Assert-Equal $activity.Kind 'tool' '调用工具（跳过后面的附件记录）'
Assert-Equal $activity.Tool 'Bash' '工具名'
Assert-Equal $activity.Id 'a1' '记录 id'
Assert-Equal (Get-ActivityLine $activity) '噼里啪啦敲命令中…' '工具台词'

$activity = Get-LatestActivity @($prompt, $toolUse, $toolResult)
Assert-Equal $activity.Kind 'thinking' '工具结果回来后在思考'
Assert-Equal (Get-ActivityLine $activity) $null '思考中不说话'

$activity = Get-LatestActivity @($prompt, $toolUse, $toolResult, $answer, $system, '')
Assert-Equal $activity.Kind 'done' '回答完成（跳过系统记录和空行）'
Assert-Equal (Get-ActivityLine $activity) '搞定啦！✨' '完成台词'

$activity = Get-LatestActivity @($answer, $sidechain)
Assert-Equal $activity.Kind 'done' '忽略子代理的记录'

$activity = Get-LatestActivity @($mcp)
Assert-Equal (Get-ActivityLine $activity) '在用外部工具 🔌' 'MCP 工具用统一台词'

$activity = Get-LatestActivity @('{"type":"user", broken', $answer)
Assert-Equal $activity.Kind 'done' '坏掉的行不影响'
$activity = Get-LatestActivity @($answer, '{"type":"user", broken')
Assert-Equal $activity.Kind 'done' '最后一行写到一半时用上一条'

# 读文件尾部：大文件从中间截断时丢掉半行
$dir = Join-Path ([IO.Path]::GetTempPath()) ("pet-test-" + [guid]::NewGuid())
$projects = Join-Path $dir 'projects'
New-Item -ItemType Directory -Path (Join-Path $projects 'a'), (Join-Path $projects 'b') | Out-Null
$old = Join-Path $projects 'a\old.jsonl'
$new = Join-Path $projects 'b\new.jsonl'
Set-Content -LiteralPath $old -Value $prompt -Encoding utf8
$filler = Line @{ type = 'attachment'; data = ('x' * 5000) }
Set-Content -LiteralPath $new -Value (@($filler) * 20 + @($prompt, $toolUse)) -Encoding utf8
[IO.File]::SetLastWriteTimeUtc($old, [DateTime]::UtcNow.AddMinutes(-5))

$latest = Find-LatestTranscript $projects
Assert-Equal ([IO.Path]::GetFileName($latest.Path)) 'new.jsonl' '找到最近写过的会话记录'
$lines = Read-TranscriptTail $latest.Path 8000
Assert-Equal ((Get-LatestActivity $lines).Tool) 'Bash' '只读文件尾部也能判断状态'
Assert-Equal (@($lines | Where-Object { $_ -and -not $_.StartsWith('{') }).Count) 0 '截断的半行被丢掉'
Assert-Equal (Find-LatestTranscript (Join-Path $dir 'missing')) $null '没有记录目录时返回空'
Remove-Item -Recurse -Force $dir

if ($script:failed -gt 0) {
  Write-Host "$script:failed 个失败"
  exit 1
}
Write-Host '全部通过'
