# Claude 桌宠：透明、置顶、可拖动的小窗口，独立浮在桌面上。
# 读取本地 Claude Code 会话记录，Claude 收到消息、用工具、回答完时会冒气泡。
# 只用 Windows 自带的 PowerShell 和 WPF，不需要安装任何东西。用「启动桌宠.vbs」启动。

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms, System.Drawing
. (Join-Path $PSScriptRoot 'ClaudeWatcher.ps1')

$ConfigDir = Join-Path $env:APPDATA 'claude-desktop-pet'
$ConfigPath = Join-Path $ConfigDir 'config.json'
$ErrorLog = Join-Path $ConfigDir 'error.log'

# 桌宠是隐藏窗口启动的，出错时看不到命令行：写进日志并弹窗提示
function Write-PetError($ErrorRecord) {
  if (-not (Test-Path -LiteralPath $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir | Out-Null
  }
  $text = "[$(Get-Date -Format s)] $ErrorRecord`r`n$($ErrorRecord.ScriptStackTrace)`r`n"
  Add-Content -LiteralPath $ErrorLog -Value $text -Encoding UTF8
}

trap {
  Write-PetError $_
  [System.Windows.MessageBox]::Show("桌宠启动失败：$_`n`n详细信息在 $ErrorLog", 'Claude 桌宠') | Out-Null
  exit 1
}

$app = New-Object System.Windows.Application
$app.ShutdownMode = [System.Windows.ShutdownMode]::OnMainWindowClose
# 运行中某个操作出错只记日志，不让整个桌宠崩掉
$app.add_DispatcherUnhandledException({
    param($sender, $e)
    Write-PetError $e.Exception
    $e.Handled = $true
  })

# 只允许开一个
$script:Mutex = New-Object System.Threading.Mutex($false, 'Local\ClaudeDesktopPet')
if (-not $script:Mutex.WaitOne(0)) {
  exit
}

$FrameMs = 60
$BubbleMs = 6000
$WatchMs = 800
$BubbleRoom = 72
$Sizes = [ordered]@{ '小' = 120; '中' = 180; '大' = 240 }

$PatLines = @('诶嘿嘿～', '帽子要被摸歪啦！', '再摸就要收费了哦', '（开心地转圈）', '今天也要加油写代码！', '摸头杀，效果拔群！')
$IdleLines = @('（发呆中…）', '（哼着小曲）', '有什么要帮忙的吗？', '（打了个哈欠）', '要不要休息一下？')

$StartupLink = Join-Path ([Environment]::GetFolderPath('Startup')) 'Claude 桌宠.lnk'

# ---------- 设置（位置、大小、是否跳舞），存在 %APPDATA%\claude-desktop-pet ----------

$script:Config = [pscustomobject]@{ Left = $null; Top = $null; Size = 180; IsDancing = $true; IsTopmost = $true }
if (Test-Path -LiteralPath $ConfigPath) {
  try {
    $saved = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($name in 'Left', 'Top', 'Size', 'IsDancing', 'IsTopmost') {
      if ($null -ne $saved.$name) {
        $script:Config.$name = $saved.$name
      }
    }
  } catch {
    # 设置文件坏了就用默认值
  }
}

function Save-Config {
  if (-not (Test-Path -LiteralPath $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir | Out-Null
  }
  $script:Config | ConvertTo-Json | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
}

# ---------- 帧图 ----------

$script:Frames = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'frames') -Filter '*.png' | Sort-Object Name | ForEach-Object {
    $bitmap = New-Object System.Windows.Media.Imaging.BitmapImage
    $bitmap.BeginInit()
    $bitmap.CacheOption = [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
    $bitmap.UriSource = New-Object Uri($_.FullName)
    $bitmap.EndInit()
    $bitmap.Freeze()
    $bitmap
  })
if ($script:Frames.Count -eq 0) {
  [System.Windows.MessageBox]::Show('找不到 frames 文件夹里的帧图。', 'Claude 桌宠') | Out-Null
  exit
}
$script:Frame = 0

# ---------- 窗口 ----------

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Claude 桌宠" WindowStyle="None" AllowsTransparency="True" Background="Transparent"
        ShowInTaskbar="False" ResizeMode="NoResize" Topmost="True">
  <Grid>
    <Grid.RowDefinitions>
      <RowDefinition x:Name="BubbleRow" Height="72"/>
      <RowDefinition Height="*"/>
    </Grid.RowDefinitions>
    <Border x:Name="Bubble" Grid.Row="0" Visibility="Hidden" VerticalAlignment="Bottom" HorizontalAlignment="Center"
            Background="#F5FFFFFF" BorderBrush="#40000000" BorderThickness="1" CornerRadius="12" Padding="10,6" Margin="4,0,4,2">
      <TextBlock x:Name="BubbleText" TextWrapping="Wrap" TextAlignment="Center" MaxWidth="200"
                 FontFamily="Microsoft YaHei UI" FontSize="13" Foreground="#333333"/>
    </Border>
    <Image x:Name="Sprite" Grid.Row="1" Cursor="Hand" RenderOptions.BitmapScalingMode="HighQuality"
           ToolTip="左键拖动，双击摸摸头，右键菜单"/>
  </Grid>
</Window>
'@
$script:Window = [Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $xaml))
$script:Bubble = $script:Window.FindName('Bubble')
$script:BubbleText = $script:Window.FindName('BubbleText')
$script:Sprite = $script:Window.FindName('Sprite')
$script:Window.FindName('BubbleRow').Height = New-Object System.Windows.GridLength($BubbleRoom)

function Set-PetSize([int]$Size) {
  $script:Config.Size = $Size
  $script:Sprite.Width = $Size
  $script:Sprite.Height = $Size
  $script:Window.Width = [Math]::Max($Size, 220)
  $script:Window.Height = $BubbleRoom + $Size
}

# 放回屏幕里：第一次启动放在右下角；换了显示器导致位置跑到屏幕外时也拉回来
function Set-PetPosition {
  $area = [System.Windows.SystemParameters]::WorkArea
  $left = $script:Config.Left
  $top = $script:Config.Top
  if ($null -eq $left -or $null -eq $top) {
    $left = $area.Right - $script:Window.Width - 24
    $top = $area.Bottom - $script:Window.Height - 8
  }
  $minLeft = [System.Windows.SystemParameters]::VirtualScreenLeft
  $minTop = [System.Windows.SystemParameters]::VirtualScreenTop
  $maxLeft = $minLeft + [System.Windows.SystemParameters]::VirtualScreenWidth - $script:Window.Width
  $maxTop = $minTop + [System.Windows.SystemParameters]::VirtualScreenHeight - $script:Window.Height
  $script:Window.Left = [Math]::Min([Math]::Max($left, $minLeft), $maxLeft)
  $script:Window.Top = [Math]::Min([Math]::Max($top, $minTop), $maxTop)
}

Set-PetSize $script:Config.Size
Set-PetPosition
$script:Window.Topmost = [bool]$script:Config.IsTopmost
$script:Sprite.Source = $script:Frames[0]

# ---------- 气泡 ----------

$script:BubbleTimer = New-Object System.Windows.Threading.DispatcherTimer
$script:BubbleTimer.Interval = [TimeSpan]::FromMilliseconds($BubbleMs)
$script:BubbleTimer.add_Tick({
    $script:BubbleTimer.Stop()
    $script:Bubble.Visibility = 'Hidden'
  })

function Show-Bubble([string]$Text) {
  $script:BubbleText.Text = $Text
  $script:Bubble.Visibility = 'Visible'
  $script:BubbleTimer.Stop()
  $script:BubbleTimer.Start()
  $script:LastSaidAt = Get-Date
}

function Get-RandomLine([string[]]$Lines) {
  return $Lines[(Get-Random -Maximum $Lines.Count)]
}

# ---------- 动画 ----------

$script:AnimTimer = New-Object System.Windows.Threading.DispatcherTimer
$script:AnimTimer.Interval = [TimeSpan]::FromMilliseconds($FrameMs)
$script:AnimTimer.add_Tick({
    $script:Frame = ($script:Frame + 1) % $script:Frames.Count
    $script:Sprite.Source = $script:Frames[$script:Frame]
  })

function Set-Dancing([bool]$IsDancing) {
  $script:Config.IsDancing = $IsDancing
  if ($IsDancing) {
    $script:AnimTimer.Start()
  } else {
    $script:AnimTimer.Stop()
    $script:Frame = 0
    $script:Sprite.Source = $script:Frames[0]
  }
  Save-Config
}

# ---------- 盯着 Claude ----------

$script:ProjectsDir = Get-ClaudeProjectsDir
$script:Transcript = $null
$script:TranscriptStamp = $null
$script:LastActivityId = $null
$script:LastScanAt = [DateTime]::MinValue
$script:LastSaidAt = Get-Date

$script:WatchTimer = New-Object System.Windows.Threading.DispatcherTimer
$script:WatchTimer.Interval = [TimeSpan]::FromMilliseconds($WatchMs)
$script:WatchTimer.add_Tick({
    try {
      # 每 4 秒重新找一次最新的会话；平时只看当前这个文件有没有变
      if (((Get-Date) - $script:LastScanAt).TotalSeconds -ge 4 -or -not $script:Transcript) {
        $script:LastScanAt = Get-Date
        $latest = Find-LatestTranscript $script:ProjectsDir
        if ($latest) {
          $script:Transcript = $latest.Path
        }
      }
      if ($script:Transcript) {
        $info = New-Object IO.FileInfo($script:Transcript)
        $stamp = "$($info.Length)|$($info.LastWriteTimeUtc.Ticks)"
        if ($stamp -ne $script:TranscriptStamp) {
          $isFirstRead = $null -eq $script:TranscriptStamp
          $script:TranscriptStamp = $stamp
          $activity = Get-LatestActivity (Read-TranscriptTail $script:Transcript)
          if ($activity -and $activity.Id -ne $script:LastActivityId) {
            $script:LastActivityId = $activity.Id
            $line = Get-ActivityLine $activity
            # 刚启动时不对旧记录说话
            if ($line -and -not $isFirstRead) {
              Show-Bubble $line
            }
          }
        }
      }
      # Claude 闲着的时候偶尔自言自语
      if (((Get-Date) - $script:LastSaidAt).TotalSeconds -gt (Get-Random -Minimum 90 -Maximum 180)) {
        Show-Bubble (Get-RandomLine $IdleLines)
      }
    } catch {
      # 读记录出错（比如文件刚被删）就等下一次
    }
  })

# ---------- 鼠标：拖动、双击摸头 ----------

$script:Sprite.add_MouseLeftButtonDown({
    param($sender, $e)
    if ($e.ClickCount -ge 2) {
      Show-Bubble (Get-RandomLine $PatLines)
      return
    }
    $script:Window.DragMove()
    $script:Config.Left = $script:Window.Left
    $script:Config.Top = $script:Window.Top
    Save-Config
  })

# ---------- 右键菜单和托盘图标 ----------

function New-MenuItem([string]$Header, [scriptblock]$OnClick) {
  $item = New-Object System.Windows.Controls.MenuItem
  $item.Header = $Header
  $item.add_Click($OnClick)

  return $item
}

function Test-Autostart {
  return (Test-Path -LiteralPath $StartupLink)
}

function Set-Autostart([bool]$IsOn) {
  if (-not $IsOn) {
    Remove-Item -LiteralPath $StartupLink -ErrorAction SilentlyContinue
    return
  }
  $shell = New-Object -ComObject WScript.Shell
  $link = $shell.CreateShortcut($StartupLink)
  $link.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
  $link.Arguments = '"' + (Join-Path $PSScriptRoot '启动桌宠.vbs') + '"'
  $link.WorkingDirectory = $PSScriptRoot
  $link.Save()
}

function Stop-Pet {
  $script:Tray.Visible = $false
  $script:Tray.Dispose()
  $script:Window.Close()
}

$menu = New-Object System.Windows.Controls.ContextMenu
[void]$menu.Items.Add((New-MenuItem '摸摸头' { Show-Bubble (Get-RandomLine $PatLines) }))
$script:DanceItem = New-MenuItem '休息' {
  Set-Dancing (-not $script:Config.IsDancing)
  if ($script:Config.IsDancing) { Show-Bubble '继续跳舞！' } else { Show-Bubble '休息一下～' }
}
[void]$menu.Items.Add($script:DanceItem)
$sizeItem = New-MenuItem '大小' {}
foreach ($entry in $Sizes.GetEnumerator()) {
  $item = New-MenuItem $entry.Key { param($sender) Set-PetSize $sender.Tag; Set-PetPosition; Save-Config }
  $item.Tag = $entry.Value
  [void]$sizeItem.Items.Add($item)
}
[void]$menu.Items.Add($sizeItem)
$script:TopmostItem = New-MenuItem '总在最前' {
  $script:Config.IsTopmost = -not $script:Config.IsTopmost
  $script:Window.Topmost = $script:Config.IsTopmost
  Save-Config
}
$script:TopmostItem.IsCheckable = $true
[void]$menu.Items.Add($script:TopmostItem)
$script:AutostartItem = New-MenuItem '开机自动启动' { Set-Autostart (-not (Test-Autostart)) }
$script:AutostartItem.IsCheckable = $true
[void]$menu.Items.Add($script:AutostartItem)
[void]$menu.Items.Add((New-Object System.Windows.Controls.Separator))
[void]$menu.Items.Add((New-MenuItem '打开 Claude' { try { Start-Process 'claude://' } catch { Show-Bubble '没找到 Claude 桌面 App…' } }))
[void]$menu.Items.Add((New-MenuItem '退出' { Stop-Pet }))
# 每次打开菜单时刷新勾选状态和文字
$menu.add_Opened({
    $script:DanceItem.Header = if ($script:Config.IsDancing) { '休息' } else { '跳舞' }
    $script:TopmostItem.IsChecked = [bool]$script:Config.IsTopmost
    $script:AutostartItem.IsChecked = Test-Autostart
  })
$script:Sprite.ContextMenu = $menu

# 托盘图标：窗口不在任务栏，被挡住或想退出时从这里操作
$script:Tray = New-Object System.Windows.Forms.NotifyIcon
$iconBitmap = New-Object System.Drawing.Bitmap((Join-Path $PSScriptRoot 'frames\00.png'))
$script:Tray.Icon = [System.Drawing.Icon]::FromHandle((New-Object System.Drawing.Bitmap($iconBitmap, 32, 32)).GetHicon())
$script:Tray.Text = 'Claude 桌宠'
$trayMenu = New-Object System.Windows.Forms.ContextMenuStrip
[void]$trayMenu.Items.Add('显示 / 隐藏', $null, {
    if ($script:Window.IsVisible) { $script:Window.Hide() } else { $script:Window.Show(); $script:Window.Activate() }
  })
[void]$trayMenu.Items.Add('退出', $null, { Stop-Pet })
$script:Tray.ContextMenuStrip = $trayMenu
$script:Tray.add_DoubleClick({ $script:Window.Show(); $script:Window.Activate() })
$script:Tray.Visible = $true

# ---------- 启动 ----------

$script:Window.add_Closed({
    $script:AnimTimer.Stop()
    $script:WatchTimer.Stop()
    $script:BubbleTimer.Stop()
    $script:Tray.Visible = $false
  })

Set-Dancing ([bool]$script:Config.IsDancing)
$script:WatchTimer.Start()
Show-Bubble '你好呀～'

[void]$app.Run($script:Window)
$script:Mutex.ReleaseMutex()
