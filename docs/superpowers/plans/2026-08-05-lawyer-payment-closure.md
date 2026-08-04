# Lawyer Payment Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the lawyer onboarding and renewal payment closure without replacing the existing consultation payment integration.

**Architecture:** Preserve the existing business tables and WeChat payment client. Add a compatibility migration that standardizes payment lifecycle metadata, records complimentary onboarding as an auditable zero-value order, and uses `membership_records` for per-package civil/criminal entitlement. User and admin order endpoints will project consultation, onboarding, renewal, and complimentary records through the same display contract.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Supabase/Postgres, existing WeChat payment client, Node contract tests.

## Global Constraints

- Reuse the consultation payment channel selection (Native, H5, JSAPI); do not create a new payment provider.
- Price is stored and transmitted in integer cents; the browser never supplies a trusted amount.
- A paid onboarding callback must never approve a lawyer.
- Complimentary approval requires an administrator reason plus a server-verified code; do not store the code text.
- Civil and criminal onboarding remain multi-select; entitlements and renewals are package-specific.
- Keep historical orders readable and do not delete existing data.

---

### Task 1: Lock down onboarding approval and complimentary audit records

**Files:**
- Create: `supabase/migrations/20260805090000_lawyer_payment_closure.sql`
- Modify: `src/app/api/admin/lawyer/review/route.ts`
- Modify: `src/app/admin/lawyer/[id]/page.tsx`
- Modify: `src/app/admin/lawyer/page.tsx`
- Test: `scripts/lawyer-payment-closure-contract.test.ts`

- [ ] Write a failing contract test requiring paid approval, complimentary reason/code verification, and an auditable zero-value order.
- [ ] Add additive columns, status checks, indexes, and RLS-protected audit table migration.
- [ ] Require `payment_status = paid` for normal approval; add `approve_complimentary` with `COMPLIMENTARY_APPROVAL_CODE`, reason, and duration validation.
- [ ] Create package-specific membership records and zero-value complimentary payment records; do not record the code itself.
- [ ] Add the administrator UI controls for complimentary reason, code, and duration.
- [ ] Run the contract test and verify it passes.

### Task 2: Make price and lifecycle handling authoritative

**Files:**
- Modify: `src/app/api/consult/create/route.ts`
- Modify: `src/components/consult/price-step.tsx`
- Modify: `src/components/consult/civil-price-step.tsx`
- Modify: `src/app/api/pay/create/route.ts`
- Modify: `src/app/api/pay/status/route.ts`
- Modify: `src/app/api/lawyer/pay/create/route.ts`
- Modify: `src/app/api/lawyer/pay/status/route.ts`
- Test: `scripts/lawyer-payment-closure-contract.test.ts`

- [ ] Extend the failing contract test to reject client-supplied consultation amounts and require lifecycle states.
- [ ] Submit only consultation plan IDs from the browser; load price from `price_configs` in the server route.
- [ ] Set `paying` only after a provider order is created; close expired orders and return recoverable payment details for valid pending orders.
- [ ] Run the focused contract test and TypeScript check.

### Task 3: Reuse payment channels for renewal and preserve dual-package entitlements

**Files:**
- Modify: `src/app/api/lawyer/renew/route.ts`
- Modify: `src/app/api/lawyer/renew/callback/route.ts`
- Modify: `src/app/lawyer/renew/page.tsx`
- Modify: `src/components/lawyer/lawyer-package-step.tsx`
- Test: `scripts/lawyer-payment-closure-contract.test.ts`

- [ ] Add failing contract coverage for H5/JSAPI renewal and selected-package authorization.
- [ ] Use existing `getPaymentClientContext` plus WeChat session helpers to create Native/H5/JSAPI renewal payments.
- [ ] Make renewal callback update the relevant package membership record and preserve expiry stacking.
- [ ] Retain selected packages as the source of legal renewal choices; display prices with two decimals.
- [ ] Run focused tests and TypeScript check.

### Task 4: Project all orders identically for users and administrators

**Files:**
- Modify: `src/app/api/user/orders/route.ts`
- Modify: `src/app/user/page.tsx`
- Modify: `src/app/api/admin/order/list/route.ts`
- Modify: `src/app/admin/orders/page.tsx`
- Test: `scripts/lawyer-payment-closure-contract.test.ts`

- [ ] Add failing contract coverage for renewal and complimentary order projections.
- [ ] Add renewal and complimentary records to both endpoints with type, number, cents amount, lifecycle status, and timestamps.
- [ ] Extend user/admin status labels for the shared lifecycle.
- [ ] Run focused tests, full TypeScript check, and production build.

### Task 5: Apply and verify the database migration

**Files:**
- Modify: `supabase/migrations/20260805090000_lawyer_payment_closure.sql`

- [ ] Inspect the live schema before applying migration.
- [ ] Apply the additive migration to the connected Supabase project.
- [ ] Verify required tables, columns, indexes, and RLS with SQL and Supabase security advisors.
- [ ] Commit only the payment-closure files and push `main` to trigger CloudBase deployment.
