# Claude 桌宠（Windows 桌面版）

一只独立浮在桌面上的小魔女：透明背景、总在最前、可以拖到屏幕任何地方。她会盯着本机的 Claude Code，Claude 收到消息、调用工具、回答完时，头顶会冒出气泡。

只用 Windows 自带的 PowerShell 和 WPF，**不需要安装任何东西**。

## 启动

双击 `启动桌宠.vbs`。她会出现在屏幕右下角，任务栏右下角的托盘区里也会多一个她的图标。

- **左键按住拖动**：把她放到任何位置（下次启动还在那里）
- **双击**：摸摸头
- **右键菜单**：摸摸头、休息 / 跳舞、大小（小 / 中 / 大）、总在最前、开机自动启动、打开 Claude、退出
- **托盘图标**：显示 / 隐藏、退出

## 她怎么知道 Claude 在做什么

她每 0.8 秒看一眼 `%USERPROFILE%\.claude\projects` 里最近更新的 Claude Code 会话记录（`.jsonl`），只读文件末尾，不改任何设置，也不会拖慢 Claude。所以 Claude 桌面 App 的 Code 标签（Local 会话）和命令行里的 `claude` 都能感知到；网页版和云端（Cloud）会话的记录不在你电脑上，感知不到。

| Claude 在做 | 她会说 |
| --- | --- |
| 收到你的消息 | 收到～让我想想！ |
| 跑命令 / 读文件 / 改文件 / 搜索 / 上网 | 噼里啪啦敲命令中… / 翻书中 📖 / 写写改改 ✏️ / 找找看在哪 🔍 / 上网查资料 🌐 |
| 回答完 | 搞定啦！✨ |
| 一直没动静 | 偶尔自言自语 |

## 出问题时

- 启动失败会弹窗，详细信息在 `%APPDATA%\claude-desktop-pet\error.log`。
- 她跑到屏幕外找不到了：删掉 `%APPDATA%\claude-desktop-pet\config.json`，重新启动就会回到右下角。
- 想看命令行输出：在 PowerShell 里运行
  `powershell -NoProfile -STA -ExecutionPolicy Bypass -File .\pet.ps1`

## 文件

| 文件 | 作用 |
| --- | --- |
| `启动桌宠.vbs` | 不弹黑框地启动 `pet.ps1` |
| `pet.ps1` | 桌宠窗口：动画、气泡、拖动、菜单、托盘 |
| `ClaudeWatcher.ps1` | 读取 Claude Code 会话记录，判断 Claude 在做什么 |
| `frames/` | 85 帧 240×240 透明 PNG，由原 GIF 隔一帧取一帧生成，每帧 60ms |
| `tests/ClaudeWatcher.Tests.ps1` | `ClaudeWatcher.ps1` 的测试：`powershell -File tests\ClaudeWatcher.Tests.ps1` |

## 换成别的角色

用 Python + Pillow 从任意 GIF 重新生成 `frames/`：

```python
from PIL import Image

im = Image.open('your.gif')
for n, i in enumerate(range(0, im.n_frames, 2)):  # 隔一帧取一帧
    im.seek(i)
    frame = im.convert('RGBA').resize((240, 240), Image.LANCZOS)
    frame = frame.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    frame.save(f'frames/{n:02d}.png', optimize=True)
```

帧间隔改 `pet.ps1` 开头的 `$FrameMs`。
