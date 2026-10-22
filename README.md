# web-playground

React + TypeScript + Vite + Tailwind CSS 前端开发仓库。

在线预览：https://goodnight1999.github.io/web-playground/

## 本地运行

```bash
npm install
npm run dev
```

## 用 Claude Code 云端会话开发

1. 在 Claude 桌面 App（或 claude.ai/code、手机 App 的 Code 标签）新建会话，把 **Local** 切成 **Cloud**，仓库选 `GoodNight1999/web-playground`。
2. 直接描述要做的功能，Claude 会在新分支上改代码。
3. 让它开 PR：PR 会自动跑 lint + build 检查，合并进 `main` 后自动部署到上面的预览地址。

云端会话启动时，`.claude/settings.json` 里的 SessionStart hook 会自动 `npm ci` 安装依赖；本地会话不受影响。

## 桌宠模组（desktop-pet）

`desktop-pet/` 是一个 Claude Code 模组：在 Claude 桌面端聊天旁边的面板里放一只会跳舞、会对 Claude 的工作做出反应的桌宠。安装方法和自定义角色的说明见 [desktop-pet/README.md](desktop-pet/README.md)。仓库根目录的 `.claude-plugin/marketplace.json` 让这个仓库本身可以当作插件市场来安装：

```
/plugin install desktop-pet --marketplace GoodNight1999/web-playground
```

## Windows 桌面桌宠（desktop-pet-app）

`desktop-pet-app/` 是一个独立浮在桌面上的桌宠：透明、置顶、可拖动，会读取本机 Claude Code 的会话记录，对 Claude 的工作做出反应。只用 Windows 自带的 PowerShell + WPF，双击 `启动桌宠.vbs` 即可运行，详见 [desktop-pet-app/README.md](desktop-pet-app/README.md)。
