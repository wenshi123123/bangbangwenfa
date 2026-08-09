# 在线法律服务协议页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将用户提供的《在线法律服务协议》作为公开网页，并在网站底部“服务”栏目增加入口。

**Architecture:** 复用现有 `user-agreement` 的协议阅读布局，新增一个独立 App Router 页面；将 Word 文档内容转换为页面内的语义化标题、段落和列表。公共页脚只增加一个链接，协议页面本身继续使用现有页脚，不引入登录、数据库或支付依赖。

**Tech Stack:** Next.js App Router、React、TypeScript、Tailwind CSS、现有 `Footer` 与 `src/lib/site.ts` 路由辅助函数、Word 文档读取使用工作区自带 Python 与 `python-docx`。

## Global Constraints

- 协议正文来源于 `/Users/Admin/Desktop/《在线法律服务协议》20260709_副本.docx`。
- 正文保持文档原意，不擅自改写、删减或补充法律条款。
- 页面公开访问，不要求登录。
- 新入口名称必须为 `在线法律服务协议`，并放在页脚“服务”栏目中“守护者计划”之后。
- 只修改协议页面、站点 URL 辅助函数和公共页脚；不修改支付、认证、数据库或 CloudBase 配置。
- 不默认提供 Word/PDF 下载入口。
- 先完成本地实现和验证，不自动部署线上。

---

### Task 1: 读取并核对 Word 文档结构

**Files:**
- Read: `/Users/Admin/Desktop/《在线法律服务协议》20260709_副本.docx`
- Create: `/tmp/online-legal-service-agreement-structure.json`（仅作为转换中间产物，不进入仓库）

**Interfaces:**
- Produces: 协议标题、日期/版本（仅当文档明确存在）、正文段落、标题层级、编号条款和列表的有序结构。

- [ ] **Step 1: 使用工作区 Python 读取 DOCX 段落和样式**

  使用 `codex_app__load_workspace_dependencies` 返回的 Python 路径和 `python-docx`，按文档原有顺序输出每个段落的文字、样式名和编号信息；不要改写原文。

- [ ] **Step 2: 核对结构完整性**

  检查输出中没有空白截断、乱码、重复段落或遗漏的标题；将文档中的日期只作为候选元数据，不根据文件名自行推断。

- [ ] **Step 3: 记录转换映射**

  将 Word 标题映射为网页 `h1`/`h2`/`h3`，普通段落映射为 `p`，编号条款保持正文编号，Word 列表映射为 `ul`/`ol`。

### Task 2: 增加协议页面路由

**Files:**
- Create: `src/app/online-legal-service-agreement/page.tsx`
- Reference: `src/app/user-agreement/page.tsx`

**Interfaces:**
- Produces: 默认导出的 `OnlineLegalServiceAgreementPage` React 页面组件，可通过 `/online-legal-service-agreement` 访问。

- [ ] **Step 1: 按现有协议页面建立页面骨架**

  复用现有协议页的返回首页区域、`min-h-screen` 背景、内容最大宽度和页脚调用；页面标题固定为 `在线法律服务协议`。

- [ ] **Step 2: 写入经过核对的文档正文**

  将 Task 1 的结构按原顺序写入语义化 JSX。正文只做网页排版，不改动法律条款措辞；每个 Word 标题使用对应的标题元素，每个条款段落单独渲染，列表使用真正的 `ul`/`ol`。

- [ ] **Step 3: 保持移动端阅读体验**

  使用现有协议页面的响应式容器、正文字号、行高和段落间距；长条款不使用固定高度，不产生横向滚动。

- [ ] **Step 4: 添加返回首页交互**

  使用现有 `Link href="/"` 和返回箭头样式，确保无需登录即可打开和返回。

### Task 3: 增加站点 URL 与页脚入口

**Files:**
- Modify: `src/lib/site.ts`
- Modify: `src/components/layout/footer.tsx`

**Interfaces:**
- Produces: `getOnlineLegalServiceAgreementUrl(): string`，返回 `/online-legal-service-agreement`；公共页脚“服务”数组新增对应链接。

- [ ] **Step 1: 按现有 URL 辅助函数风格增加路径函数**

  在 `src/lib/site.ts` 中增加与 `getUserAgreementUrl`、`getPrivacyPolicyUrl` 相同风格的函数，不引入新的依赖或环境变量。

- [ ] **Step 2: 在 Footer 中增加单个链接**

  引入新 URL 函数，在 `footerLinks.服务` 中将 `{ label: "在线法律服务协议", href: getOnlineLegalServiceAgreementUrl() }` 放在“守护者计划”之后；不修改“律师”和“法律信息”两列。

- [ ] **Step 3: 检查所有使用公共 Footer 的页面**

  确认首页、民事咨询、刑事咨询和协议页都能复用同一个新增链接，避免重复实现。

### Task 4: 本地验证与内容验收

**Files:**
- Test: `src/app/online-legal-service-agreement/page.tsx`
- Test: `src/components/layout/footer.tsx`

**Interfaces:**
- Verifies: 新路由可访问、页脚链接存在、文档正文完整、移动端无横向溢出、TypeScript 和生产构建通过。

- [ ] **Step 1: 运行静态检查**

  运行：

  ```bash
  PATH=/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH pnpm exec tsc --noEmit
  ```

  预期：无 TypeScript 错误。

- [ ] **Step 2: 运行生产构建**

  运行：

  ```bash
  PATH=/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH pnpm build
  ```

  预期：构建完成，路由列表包含 `/online-legal-service-agreement`。

- [ ] **Step 3: 在本地浏览器验收**

  打开 `http://localhost:3000/`，确认页脚“服务”出现“在线法律服务协议”；点击后确认进入新页面、标题和正文正常显示，点击“返回首页”可返回。

- [ ] **Step 4: 做移动端宽度检查**

  使用浏览器窄窗口或移动设备模拟宽度，确认正文不横向溢出、标题层级可读、页脚链接仍可点击。

- [ ] **Step 5: 检查本次改动范围**

  运行 `git diff --check` 和 `git diff --name-only`，确认只包含协议页面、URL 辅助函数和 Footer；不提交 Word 原文件、不提交构建产物、不提交其他未确认改动。

### Task 5: 交付本地版本，等待线上发布确认

**Files:**
- Modify: `src/app/online-legal-service-agreement/page.tsx`
- Modify: `src/lib/site.ts`
- Modify: `src/components/layout/footer.tsx`

- [ ] **Step 1: 汇总本地验收结果**

  报告协议正文、页脚入口、桌面端和移动端验收结果，并列出任何未完成项。

- [ ] **Step 2: 等待用户确认是否部署**

  本计划不自动推送 GitHub 或触发 CloudBase；只有用户明确确认线上发布后，才进入单独的发布流程。
