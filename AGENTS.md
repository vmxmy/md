# Repository Guidelines

## 项目结构与模块组织

这是一个 pnpm monorepo。主要目录如下：`apps/web`（网页与浏览器插件）、`apps/vscode`（VSCode 插件）、`packages/core`（核心渲染）、`packages/shared`（共享工具与类型）、`packages/config`（配置）、`packages/example`（openapi 代理示例）、`packages/md-cli`（命令行工具）。其他常用目录：`docs/`（文档）、`public/`（静态资源）、`scripts/`（构建/发布脚本）、`docker/`（容器相关）。

## 构建、测试与开发命令

- `pnpm install`：安装依赖（要求 Node >= 22、pnpm >= 10）。
- `pnpm web dev` 或 `pnpm start`：启动 `@md/web` 本地开发。
- `pnpm run lint`：运行 ESLint 与 Prettier 自动修复。
- `pnpm run type-check`：运行 TypeScript 类型检查。
- `pnpm run web build`：构建 Web 产物并做本地验证。
- `pnpm run build:cli`：构建并打包 CLI（会产出 `packages/md-cli` 产物）。

## 代码风格与命名规范

- 缩进使用 2 个空格，行尾 LF，80 字符软限制（Markdown 不限制）。
- 统一使用 ESLint 与 Prettier；提交前请确保 `pnpm run lint` 通过。
- 按模块语义命名：组件/包使用清晰英文名，避免缩写；保持与现有包名风格一致（如 `@md/*`、`md-cli`）。

## 测试与质量要求

仓库根目录未提供统一的 `test` 脚本。新增功能时请至少通过 `lint`、`type-check` 与 `web build`；如引入测试框架，请在对应包内补充脚本并在 PR 中说明运行方式。

## 提交与 Pull Request 规范

- Commit message 采用 `feat|fix|docs|style|refactor|perf|test|build|chore` 前缀，例如 `feat(editor): 支持自定义快捷键`。
- 分支命名：`feat/<描述>`、`fix/<描述>`、`docs/<描述>`。
- PR 标题与首条 commit 保持一致，附带 scope 更佳；描述中注明动机、影响范围、关联 Issue，UI 变更请附截图。

## 本地配置提示

如需快速打开编辑器定位，可在 `apps/web/.env.local` 配置 `VITE_LAUNCH_EDITOR=code`（或其他支持的编辑器）。
