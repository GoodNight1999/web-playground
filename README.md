# web-playground

React + TypeScript + Vite + Tailwind CSS 前端开发仓库。

在线预览：https://goodnight1999.github.io/web-playground/

## 页面

- 首页：`index.html`
- [黎曼猜想](https://goodnight1999.github.io/web-playground/zeta/)：`zeta/index.html`，源码在 `src/zeta/`。配乐ハイスイノナサ「地下鉄の動態」的动态演示视频。
  - 画面在 1920×1080 画布上实时渲染，黑白几何风格参考大西景太为原曲制作的 MV；每个起音对应一个几何体。
  - 段落按原曲结构编排（`src/zeta/timeline.ts` 的 `SONG`）：用 librosa 做自相似矩阵与谱聚类、pYIN 找人声，得出前奏 0:00–0:53（14 小节，每小节 3.75 秒）、主歌 0:53、第二主题 1:25、副歌 1:54 / 2:09、歇息 2:24、第二次副歌 2:47 / 3:17、尾声 3:47。细到每一拍的事件在运行时吸附到分析出的起音上。
  - ζ 函数在 `src/zeta/math/zeta.ts` 用 Borwein 加速级数与函数方程计算，已与 mpmath 对照（相对误差约 1e-13）；零点由 `scripts/compute-zeros.py`（mpmath）生成到 `src/zeta/data/zeros.gen.ts`。
  - 公式用 MathJax 预渲染成 SVG（`src/zeta/formulas.gen.ts`），改公式后运行 `npm run formulas` 重新生成。
  - 片中事实的出处列在 `src/zeta/content.ts` 的 `SOURCES` 和页面底部。
  - 可全屏放映，也可逐帧导出视频（Chrome / Edge 导出 MP4，不支持 AAC 编码的浏览器导出 WebM）。页面不附带音乐。
  - 构建开关：`VITE_PREVIEW_ONLY=1` 隐藏导出（用于不能保存文件的预览环境）；`VITE_PRELOAD_AUDIO=<相对地址>`（可配 `VITE_PRELOAD_AUDIO_NAME`）让页面打开时自动载入该音频。音乐文件有版权，不要提交进仓库。

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
