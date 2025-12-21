# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**doocs/md** is a WeChat Markdown Editor - a Vue 3 + TypeScript monorepo that transforms Markdown documents into formatted WeChat articles. It supports multiple deployment targets: web app, Chrome/Firefox extensions, CLI, Docker, uTools plugin, and VSCode extension.

## Development Commands

```bash
# Install dependencies (requires pnpm, Node.js ≥22)
pnpm install

# Start development server (http://localhost:5173/md/)
pnpm web dev

# Linting and type checking (run before commits)
pnpm run lint          # ESLint + Prettier auto-fix
pnpm run type-check    # TypeScript type checking

# Build
pnpm web build              # Build for /md/ base path
pnpm web build:h5-netlify   # Build for root path
pnpm web build:analyze      # Build with bundle visualization

# Browser extensions
pnpm web ext:dev       # Chrome extension dev mode
pnpm web ext:zip       # Package Chrome extension
pnpm web firefox:dev   # Firefox extension dev mode
pnpm web firefox:zip   # Package Firefox extension

# Other targets
pnpm web wrangler:dev     # Cloudflare Workers dev mode
pnpm web wrangler:deploy  # Deploy to Cloudflare Workers
pnpm utools:package       # Package uTools plugin
pnpm build:cli            # Build npm CLI package
```

## Architecture

### Monorepo Structure (pnpm workspaces)

```
apps/
├── web/          # Main web app + browser extensions (Vue 3 + wxt)
├── vscode/       # VSCode extension
└── utools/       # uTools plugin

packages/
├── core/         # Markdown rendering engine
├── shared/       # Shared utilities, types, constants, editor config
├── config/       # TypeScript & ESLint configs
├── md-cli/       # NPM CLI package (@doocs/md-cli)
└── example/      # WeChat OpenAPI proxy example
```

### Core Package (@md/core)

The markdown rendering engine in `packages/core/`:

- `extensions/` - Markdown extensions (alerts, ruby annotations, KaTeX, PlantUML, footnotes, TOC)
- `renderer/` - HTML rendering logic (`renderer-impl.ts`)
- `theme/` - CSS theme processing with scope wrapping for WeChat compatibility
- `utils/` - Mermaid initialization, language support, markdown helpers

### Web Application (@md/web)

Main Vue 3 app in `apps/web/`:

- `stores/` - Pinia state management (editor, render, theme, ui, post, template, aiConfig, export, cssEditor)
- `views/` - Main `CodemirrorEditor.vue` component
- `components/` - UI components based on shadcn/ui + Radix Vue
  - `ai/` - AI integration (chat, image generation)
  - `editor/` - Editor controls
  - `ui/` - Reusable UI primitives
- `entrypoints/` - Multiple entry points (web, extension, worker)

### Key Technologies

- **Vue 3** with Composition API, **Pinia** for state management
- **CodeMirror 6** for the editor
- **Marked** for Markdown parsing, **Mermaid** for diagrams, **KaTeX** for math
- **TailwindCSS v4** for styling
- **wxt** framework for browser extensions
- **Vite 7** with environment-specific builds

## Commit Conventions

Use conventional commits with scope:

- `feat(editor): add shortcut support`
- `fix(theme): correct color variable`
- `docs`, `style`, `refactor`, `perf`, `test`, `build`, `chore`

Branch naming: `feat/<description>`, `fix/<description>`, `docs/<description>`

## Pre-commit Hooks

The project uses `simple-git-hooks` + `lint-staged` to run ESLint auto-fix on all staged files before commit.

## Environment Configuration

Create `apps/web/.env.local` for local development:

```
VITE_LAUNCH_EDITOR=code  # or cursor, vim, etc.
```
