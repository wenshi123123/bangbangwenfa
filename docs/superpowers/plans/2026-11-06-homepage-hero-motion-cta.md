# Homepage Hero Motion and CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved one-time narrative hero reveal and editorial color-sweep civil/criminal consultation links on the live homepage.

**Architecture:** Keep the feature inside the existing client homepage component and add narrowly scoped CSS keyframes/classes to the global stylesheet. Preserve the existing URL helpers and carousel behavior; verify the source contract with a focused TypeScript test and the rendered behavior in a browser.

**Tech Stack:** Next.js 16.4.5 App Router, React 19.2.3, TypeScript, Tailwind CSS 4, CSS animations, Lucide React, Playwright/browser smoke verification.

**Spec:** `docs/superpowers/specs/2026-11-06-homepage-hero-motion-cta-design.md`

## Global Constraints

- Do not add a motion dependency; use CSS animations and existing project capabilities.
- Preserve `getCivilUrl()`, `getConsultUrl()`, and `prefetch={false}` behavior.
- The hero entrance plays once per component mount and never loops.
- Civil and criminal links remain equal-weight, whole-surface links.
- The existing global `prefers-reduced-motion: reduce` rule must continue to disable meaningful motion.
- Do not modify carousel timing, pause behavior, login flow, or consultation routing.

## Review Focus

- Narrow mobile view: links stack vertically, keep at least 72px of touch height, and do not overflow.
- Keyboard navigation: both links expose visible `:focus-visible` treatment and correct link destinations.
- Reduced-motion preference: final content remains visible when animation duration is collapsed.
- Hydration and first paint: content exists in the initial JSX and animation does not depend on a delayed state flip.
- Existing dirty worktree: edits must stay within the approved homepage/test/style/plan files and preserve unrelated changes.

---

### Task 1: Add a homepage hero browser behavior test

**Files:**
- Create: `e2e/pages/home-hero-motion-cta.spec.ts`
- Test: `e2e/pages/home-hero-motion-cta.spec.ts`

**Interfaces:**
- Consumes: `src/app/page.tsx`, `src/app/globals.css`
- Produces: a browser behavior contract that pins the approved rendered copy, semantic links, responsive stacking, focus styling, and motion behavior.

- [ ] **Step 1: Write the failing browser behavior test**

Assert that the homepage renders the approved title and body copy, exposes civil and criminal links with their correct destinations and descriptions, stacks the links at a narrow viewport, keeps at least `72px` link height, exposes a visible keyboard focus indicator, and animates the title under normal motion preferences while keeping it visible with reduced motion.

- [ ] **Step 2: Run the test to verify it fails**

Run: `CI=1 TEST_BASE_URL=http://127.0.0.1:3100 PATH="/Users/Admin/.local/node-v24.19.0/bin:$PATH" pnpm exec playwright test e2e/pages/home-hero-motion-cta.spec.ts --project=chromium`

Expected: FAIL because the approved animation and consultation-entry hooks do not yet exist.

- [ ] **Step 3: Commit test checkpoint only if the user requests commits**

No automatic commit in the current dirty worktree.

### Task 2: Implement the approved hero entrance and editorial consultation links

**Files:**
- Modify: `src/app/page.tsx:360-410`
- Modify: `src/app/globals.css`
- Test: `e2e/pages/home-hero-motion-cta.spec.ts`

**Interfaces:**
- Consumes: existing `getCivilUrl(): string`, `getConsultUrl(): string`, `ArrowRight` icon, and homepage client component.
- Produces: stable CSS class hooks and two semantic `Link` surfaces that the contract test and browser verification can inspect.

- [ ] **Step 1: Add semantic spans and staged hero animation hooks**

Keep all approved text present in JSX. Add separate class hooks for `AI千问`, `不如`, `律师一言`, both body lines, and the promise row; use no interval, replay state, or animation library.

- [ ] **Step 2: Replace the two pill buttons with equal-weight editorial links**

Each `Link` must contain a title, approved description, and circular `ArrowRight` without a numeric index; keep `prefetch={false}` and the existing URL helpers.

- [ ] **Step 3: Add scoped CSS animations and interaction states**

Implement the approved delays and durations, left-to-right color sweep, civil clay/criminal brown variants, arrow movement, visible focus treatment, desktop equal columns, and mobile stacking with `min-height: 72px`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `CI=1 TEST_BASE_URL=http://127.0.0.1:3100 PATH="/Users/Admin/.local/node-v24.19.0/bin:$PATH" pnpm exec playwright test e2e/pages/home-hero-motion-cta.spec.ts --project=chromium`

Expected: all focused Playwright tests pass.

### Task 3: Verify type safety, formatting, and rendered behavior

**Files:**
- Verify: `src/app/page.tsx`
- Verify: `src/app/globals.css`
- Verify: `e2e/pages/home-hero-motion-cta.spec.ts`

**Interfaces:**
- Consumes: Task 2 implementation.
- Produces: evidence that the homepage compiles and the approved interaction renders correctly.

- [ ] **Step 1: Run TypeScript and targeted lint checks**

Run: `PATH="/Users/Admin/.local/node-v24.19.0/bin:$PATH" pnpm ts-check`

Run: `PATH="/Users/Admin/.local/node-v24.19.0/bin:$PATH" pnpm exec eslint src/app/page.tsx e2e/pages/home-hero-motion-cta.spec.ts`

Expected: both commands exit 0 without new diagnostics.

- [ ] **Step 2: Run diff whitespace validation**

Run: `git diff --check -- src/app/page.tsx src/app/globals.css e2e/pages/home-hero-motion-cta.spec.ts`

Expected: exit 0 with no output.

- [ ] **Step 3: Open the homepage in a browser and inspect desktop behavior**

Verify `/` renders the staged title and two equal editorial links; hovering each link triggers its corresponding color sweep without moving surrounding layout.

- [ ] **Step 4: Inspect narrow viewport behavior and link destinations**

Verify the two links stack, remain legible and clickable, and resolve to `getCivilUrl()` and `getConsultUrl()` destinations.

- [ ] **Step 5: Present the live local homepage to the user**

Open the verified local URL in Chrome and leave the final effect visible for review.

## Self-Review

- Spec coverage: title sequencing, CTA design, routing preservation, responsive stacking, focus behavior, reduced motion, and non-goals all map to Tasks 1–3.
- Step scan: every step produces a single checkable artifact or verification result.
- Type consistency: implementation retains the existing URL helper return values and `Link` interface.
- Review focus coverage: mobile, keyboard, reduced motion, hydration, and dirty-worktree preservation are asserted or manually verified.
- Proportion: the plan specifies decisions and checks without duplicating implementation bodies.
