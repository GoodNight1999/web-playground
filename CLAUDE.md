# web-playground

前端开发仓库。仓库主人用中文交流：回复、提交说明和 PR 描述都用中文。

## 技术栈
- React 19 + TypeScript + Vite
- Tailwind CSS v4：通过 `@tailwindcss/vite` 插件接入，入口是 `src/index.css` 里的 `@import "tailwindcss";`，没有 `tailwind.config.js`
- Lint 用 oxlint（配置在 `.oxlintrc.json`）
- 包管理用 npm（有 `package-lock.json`），不要混用 pnpm / yarn

## 常用命令
- `npm run dev`：本地开发服务器
- `npm run lint`：代码检查
- `npm run build`：类型检查 + 生产构建（输出到 `dist/`）

## 工作规则
- 提交前必须跑 `npm run lint` 和 `npm run build`，都通过才能提交。
- 样式优先用 Tailwind 工具类，不要新建零散的 CSS 文件。
- 在分支上工作，通过 PR 合并进 `main`，不要直接推 `main`。

## 部署
- 合并进 `main` 后，`.github/workflows/ci.yml` 自动构建并部署到 GitHub Pages：https://goodnight1999.github.io/web-playground/ 。PR 也会跑同样的 lint + build 检查。
- 站点在子路径下，`vite.config.ts` 的 `base` 是 `/web-playground/`（本地 dev 地址也是 http://localhost:5173/web-playground/）。引用 `public/` 里的文件要用 `import.meta.env.BASE_URL` 拼路径，不要写死以 `/` 开头的绝对路径。仓库改名时要同步改 `base`。
- GitHub Pages 不支持 SPA 路由回退：以后加前端路由时用 HashRouter，或者给 BrowserRouter 设 `basename` 并加 `404.html` 回退。
