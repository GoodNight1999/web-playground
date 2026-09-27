# web-playground

React + TypeScript + Vite + Tailwind CSS 前端开发仓库。

在线预览：https://goodnight1999.github.io/web-playground/

## 页面

- 首页：`index.html`
- [纳维–斯托克斯方程的有限时间爆破 · 发布会视频](https://goodnight1999.github.io/web-playground/ns-blowup/)：`ns-blowup/index.html`，源码在 `src/ns-blowup/`。
  - 画面在 1920×1080 画布上实时渲染；载入本地音乐文件后自动分析节拍与段落，场景切换和动画重音随之卡点。页面不附带音乐。
  - 可全屏放映，也可逐帧导出视频（Chrome / Edge 导出 MP4，不支持 AAC 编码的浏览器导出 WebM）。
  - 公式用 MathJax 预渲染成 SVG（`src/ns-blowup/formulas.gen.ts`），改公式后运行 `npm run formulas` 重新生成。
  - 片中事实的出处列在 `src/ns-blowup/content.ts` 的 `SOURCES` 和页面底部。

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
