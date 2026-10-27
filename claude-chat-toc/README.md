# chat-toc · 对话目录

在 Claude Code 会话旁边常驻一个「对话目录」面板：按顺序列出你发过的每一条提问，点一下就把对话滚回那条提问（下面紧跟着就是 Claude 的回答），不用再手动往上翻。

- 打开：会话开始时自动打开；关掉后输入 `/toc` 重新打开。
- 跳转：点击条目，或者在面板获得焦点时按数字键 1–9 跳到前 9 条。
- ▶ 标记的是你当前正在看的那条提问。
- 只收录你自己发的消息，后台任务通知、其他 agent 发来的消息不会进目录。

## 安装

在终端的 Claude Code 会话里输入：

```
/plugin install chat-toc --marketplace GoodNight1999/web-playground
```

按 `y` 添加 marketplace，然后选择安装范围（默认 user 即可）。

也可以在 shell 里装：

```
claude plugin install chat-toc --marketplace GoodNight1999/web-playground
```

在桌面 app 里（不支持 `/plugin`）：点输入框旁边的 +，选 Plugins → Add marketplace，填 `GoodNight1999/web-playground`，再点 Add plugin。

在终端里以 user 范围安装后，桌面 app 的 Code 标签页里的本地会话也会加载它。

## 限制

- 只在接入了显示界面的 Claude Code 会话里能画出来（本地终端、桌面 app 的本地 Code 会话）。云端会话在 app 里远程查看时没有接入显示界面，面板和横栏都不会出现。
- claude.ai 的普通 Chat 不加载 mod。
