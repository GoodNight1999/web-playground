# desktop-pet 桌宠

一个 Claude Code 模组（mod）：在 Claude 桌面端聊天旁边的侧边面板里放一只会跳舞的小魔女桌宠。

- **跳舞**：循环播放原 GIF 的舞蹈动画（57 帧，每帧 90ms）。
- **会说话**：Claude 收到消息、调用工具（读文件、跑命令、搜索……）、完成回答时，头顶气泡会冒出对应的话；闲置一会儿后会自己发呆。
- **能互动**：面板下方有「摸摸头」和「休息 / 跳舞」两个按钮（面板获得焦点时也可以按 `p` / `d`）。
- **/pet 命令**：面板被关掉后，输入 `/pet` 把它叫回来。

## 安装

在终端里的 Claude Code 会话输入：

```
/plugin install desktop-pet --marketplace GoodNight1999/web-playground
```

或者在 shell 里：

```bash
claude plugin install desktop-pet --marketplace GoodNight1999/web-playground
```

在桌面 App 里（`/plugin` 不能用的地方）：点输入框旁边的 **+** → **Plugins** → **Add marketplace**，填 `GoodNight1999/web-playground`，再 **Add plugin** 选 `desktop-pet`。

装在 user 作用域后，之后新开的会话（包括桌面 App 的 Code 标签）都会自动带上桌宠。

## 只在桌面端有动画

动画用 `Svg` 元素画，桌面端、VS Code 和手机 App 都有；纯终端没有 `Svg`，面板里只显示气泡文字和按钮。

## 换成别的角色

帧图放在 `assets/frames/00.webp` … `56.webp`（240×240，透明背景）。用 Python + Pillow 可以从任意 GIF 重新生成：

```python
from PIL import Image

im = Image.open('your.gif')
for n, i in enumerate(range(0, im.n_frames, 3)):  # 隔 2 帧取 1 帧
    im.seek(i)
    frame = im.convert('RGBA').resize((240, 240), Image.LANCZOS)
    frame.save(f'assets/frames/{n:02d}.webp', 'WEBP', quality=75, alpha_quality=80, method=6)
```

帧数变了的话，同步修改 `hooks/register.tsx` 里的 `FRAME_COUNT`；帧间隔改 `FRAME_MS`。单帧 SVG 有 131072 字符的上限，每帧 WebP 控制在 90KB 以内就不会超。

## 开发

```bash
claude plugin validate desktop-pet   # 检查清单和钩子模块
claude plugin test desktop-pet       # 跑 hooks/register.test.tsx
claude --plugin-dir desktop-pet      # 带着这个模组启动一个会话，改动会热重载
```
