# 浏览器标签页品牌图标 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用用户提供的 Logo 替换浏览器标签页 favicon，不改变页面导航栏 Logo。

**Architecture:** 将 Logo 缩放为小尺寸 PNG，并封装为 ICO 文件，替换 Next.js App Router 的 `src/app/favicon.ico` 文件式 metadata 资源。无需组件或业务逻辑改动。

**Tech Stack:** Next.js App Router、PNG/ICO 静态资源、pnpm。

## Global Constraints

- 只修改浏览器 favicon；页面导航栏 Logo 保持不变。
- 不修改业务代码和配置，不引入依赖。
- 必须通过构建验证。

### Task 1: 生成并替换 favicon

**Files:**
- Modify: `src/app/favicon.ico`
- Source asset: `/Users/Admin/Desktop/帮帮问法LOGO.png`

- [ ] 将源 Logo 缩放为 64×64 PNG，并封装为浏览器兼容 ICO。
- [ ] 替换 `src/app/favicon.ico`，确认文件类型为 ICO。

### Task 2: 构建验证

**Files:**
- No source-code changes.

- [ ] 运行 TypeScript 检查。
- [ ] 运行项目构建。
- [ ] 检查构建产物中的 favicon 路由资源。
- [ ] 提交变更并推送，触发自动部署。
