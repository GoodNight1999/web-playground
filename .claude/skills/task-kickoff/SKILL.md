---
name: task-kickoff
description: 在本仓库动手做任何任务之前使用：先盘点并选择最合适的工具、skill、插件和参考项目，再制定方案。只要是写代码、改页面、做设计、排查问题、调研、写文档这类需要产出的任务，开工前都先走一遍这个流程；纯闲聊或一句话就能答的问题不用。
---

# 开工前：选工具、找参考、定方案

仓库主人的硬性要求：每次执行任务前，先深度寻找并选择最优的工具和 skill 并自行配置，广泛参考已有的优质项目与案例。
但"深度"要和任务大小相称（见第 0 步），在一行改动上花半小时调研同样不是最优。

## 第 0 步：判断任务量级

| 量级 | 例子 | 调研深度 |
| --- | --- | --- |
| 小 | 改文案、改一个颜色、修一个明显的 typo | 只做第 1 步的快速盘点，不搜外部 |
| 中 | 新增一个组件/页面、修一个不明显的 bug | 第 1～3 步都做，外部参考 2～3 个 |
| 大 | 新功能模块、引入新依赖、改架构/部署 | 全部步骤，参考 3 个以上，方案先给用户过目 |

## 第 1 步：盘点手头已有的能力

按顺序检查，不要凭记忆：

1. **会话里已加载的 skill**：看系统提示里的 skill 列表。本仓库常用的：
   - `run`：启动 dev server 并截图验证改动
   - `artifact-design`：页面/可视化的设计规范
   - `dataviz`：任何图表、仪表盘
   - `code-review`、`simplify`、`security-review`：提交前自查
   - `session-start-hook`：改 `.claude/settings.json` 里的启动钩子
2. **本仓库的项目级配置**：`.claude/skills/`、`.claude/settings.json`、`.claude-plugin/marketplace.json`（本仓库自带的 mod，如 `claude-chat-toc`）。
3. **环境里预装的工具**：Playwright + Chromium（`require('playwright')` 直接可用，做截图和 E2E 验证）、`gh api` 搜代码、npm。
4. **延迟加载的工具**：用 ToolSearch 按关键词查，例如 `WebSearch`、`SearchPlugins`、`SearchSkills`、GitHub MCP 工具。

## 第 2 步：搜索还没装上的好工具

- `SearchPlugins` / `SearchSkills`：按任务关键词搜插件目录。优先选 Anthropic 官方或 partner 层级的；community 层级的先看它包含哪些组件再决定。
- 找到合适的就用 `SuggestPluginInstall` / `SuggestSkills` 让用户一键安装（安装需要用户在卡片上确认）。
- 需要第三方服务（设计稿、数据源等）时用 `SearchMcpRegistry` 找连接器。
- 需要新的 npm 依赖时：先查 npm 周下载量、最近发布时间、是否支持 React 19 / Vite / Tailwind v4，再用 `npm install` 装（只用 npm）。

本仓库已知值得用的插件（来自插件目录，未默认启用）：
- `frontend-design`（Anthropic 官方）：UI/UX 实现时的设计指导。
- `audit-suite`（community）：设计/前端/性能/无障碍多视角审查，含 vercel-react-best-practices、web-design-guidelines。

## 第 3 步：参考已有的优质项目和案例

- **官方文档优先**：React（react.dev）、Vite（vite.dev）、Tailwind v4（tailwindcss.com/docs）、Claude Code（code.claude.com/docs）。版本相关的细节一律以官方文档为准。
- **真实代码**：`gh api -X GET search/code -f q='<关键词> language:tsx'` 搜 GitHub 上的实现；看 star 数高、近期仍在维护的仓库。
- **网页搜索**：`WebSearch`（默认 standard，结果不够再用 extended），需要读全文时用 `web-fetch` 子代理。
- 参考只借鉴思路和模式，不照抄有版权的设计、素材或整段代码。

## 第 4 步：定方案并说出来

开工前在回复里用几行写清楚：

1. 选了哪些工具/skill/插件，为什么（没选的明显候选也一句话说明原因）。
2. 参考了哪些项目或文档（附链接）。
3. 实施步骤和验证方式（至少：`npm run lint`、`npm run build`；有界面改动的用 `run` skill 或 Playwright 截图确认）。

大任务在这一步停下来等用户确认；小、中任务直接执行。

## 第 5 步：收尾

- 提交前跑 `npm run lint` 和 `npm run build`。
- 如果这次发现了新的好工具或踩了坑，顺手更新本 skill 的"已知值得用的插件"或第 1 步清单，让下次更快。
