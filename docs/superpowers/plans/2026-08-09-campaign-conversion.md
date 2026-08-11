# Campaign Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the August 2026 campaign purchase action easy to find on mobile and preserve the purchase path through Google login.

**Architecture:** Keep one `August2026Checkout` instance as the only owner of checkout state. Add a mobile-only fragment link in the server-rendered campaign hero, share one CTA class across checkout states, and make the login page conditionally emphasize Google only when its validated `next` path is the campaign page.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library

## Global Constraints

- Product remains `ITパスポート学習コーチ Pro 6か月` at `3,480円（税込・買い切り）` with no automatic renewal.
- Campaign deadline remains `2026年8月10日23時59分（日本時間）`.
- Do not change Stripe products, Price IDs, Checkout behavior, webhook behavior, or Pro entitlement behavior.
- Do not duplicate `August2026Checkout`; the mobile hero CTA must target `#purchase`.
- The mobile CTA copy is exactly `購入内容を確認する`.
- The campaign login notice is exactly `ログイン後、購入ページへ戻ります`.
- Preserve the existing internal-path validation for `next`; values beginning with `//` must not be accepted.
- Normal `/login` keeps the existing LINE recommendation. When Google is unavailable, LINE remains the emphasized available path.
- Read `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md` and `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` before editing Next.js code.
- Follow test-driven development: every production change must be preceded by a test that fails for the expected missing behavior.
- Do not read or modify `.env` or `.projects/`.

---

### Task 1: Purchase CTA styling and mobile discovery link

**Files:**
- Modify: `test/August2026Checkout.test.tsx`
- Modify: `test/August2026CampaignPage.test.tsx`
- Modify: `components/campaign/August2026Checkout.tsx`
- Modify: `app/campaign/august-2026/page.tsx`

**Interfaces:**
- Consumes: `AUGUST_2026_CAMPAIGN.path`, existing `August2026Checkout` props, and the existing `section#purchase` fragment target.
- Produces: a shared `purchaseActionClassName: string` inside `August2026Checkout` and one mobile-only `<Link href="#purchase">購入内容を確認する</Link>`.

- [ ] **Step 1: Read the repository’s Next.js Link and Page guides**

Run:

```bash
sed -n '1,1500p' node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md
sed -n '1,320p' node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
```

Expected: the full local Next.js 16.2 documentation for fragment links and Promise-based `searchParams` is available before code is edited.

- [ ] **Step 2: Add failing tests for the checkout action styles**

Append this test to `test/August2026Checkout.test.tsx`:

```tsx
it("renders purchase actions as accessible full-width CTAs", async () => {
  const { rerender } = render(
    <August2026Checkout {...baseProps} authenticated={false} />,
  );
  const loginLink = screen.getByRole("link", {
    name: "ログインして3,480円で始める",
  });
  expect(loginLink).toHaveClass("flex", "min-h-11", "w-full", "bg-brand-700", "text-white");

  rerender(<August2026Checkout {...baseProps} />);
  const activeButton = screen.getByRole("button", {
    name: "3,480円で6か月始める",
  });
  expect(activeButton).toHaveClass(
    "flex",
    "min-h-11",
    "w-full",
    "bg-brand-700",
    "text-white",
  );
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  fireEvent.click(activeButton);
  expect(
    await screen.findByRole("button", { name: "Stripeを開いています…" }),
  ).toHaveClass("flex", "min-h-11", "w-full", "bg-brand-700", "text-white");

  rerender(<August2026Checkout {...baseProps} checkoutEnabled={false} />);
  expect(screen.getByRole("button", { name: "決済を準備中" })).toHaveClass(
    "flex",
    "min-h-11",
    "w-full",
    "disabled:bg-slate-300",
  );
});
```

- [ ] **Step 3: Add a failing test for the mobile fragment link**

Add these assertions to the `renders the approved offer and disclosures` test in `test/August2026CampaignPage.test.tsx`:

```tsx
const mobilePurchaseLink = screen.getByRole("link", {
  name: "購入内容を確認する",
});
expect(mobilePurchaseLink).toHaveAttribute("href", "#purchase");
expect(mobilePurchaseLink).toHaveClass("flex", "min-h-11", "lg:hidden");
```

- [ ] **Step 4: Run the focused tests and verify RED**

Run:

```bash
npx vitest run test/August2026Checkout.test.tsx test/August2026CampaignPage.test.tsx
```

Expected: FAIL because purchase actions lack `min-h-11`/brand CTA classes and `購入内容を確認する` does not exist.

- [ ] **Step 5: Add the shared checkout CTA class**

Inside `components/campaign/August2026Checkout.tsx`, before the component, add:

```tsx
const purchaseActionClassName =
  "flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-700 px-5 py-3 text-center text-base font-bold text-white shadow-sm transition hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none";
```

Apply `className={purchaseActionClassName}` to the unauthenticated `Link` and all three button branches (`特典受付を準備中`, `決済を準備中`, and the active checkout button). Do not alter labels, state conditions, or `startCheckout`.

- [ ] **Step 6: Add the mobile hero fragment link**

In `app/campaign/august-2026/page.tsx`, directly after the `自動更新はありません。` paragraph, add:

```tsx
<Link
  href="#purchase"
  className="mt-6 flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-center text-base font-bold text-brand-900 shadow-sm transition hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.99] lg:hidden"
>
  購入内容を確認する
</Link>
```

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run test/August2026Checkout.test.tsx test/August2026CampaignPage.test.tsx
```

Expected: both test files pass with zero failures.

- [ ] **Step 8: Commit Task 1**

```bash
git add test/August2026Checkout.test.tsx test/August2026CampaignPage.test.tsx components/campaign/August2026Checkout.tsx app/campaign/august-2026/page.tsx
git commit -m "feat: improve campaign purchase CTA"
```

---

### Task 2: Campaign-aware login emphasis

**Files:**
- Create: `test/LoginPageCampaign.test.tsx`
- Modify: `app/login/page.tsx`

**Interfaces:**
- Consumes: validated `next: string`, `AUGUST_2026_CAMPAIGN.path`, `GoogleLoginButton({ next })`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_LINE_ADD_FRIEND_URL`.
- Produces: `campaignContinuation: boolean`; campaign-only notice and conditional LINE class without changing authentication mechanics.

- [ ] **Step 1: Create the failing login-page tests**

Create `test/LoginPageCampaign.test.tsx` with:

```tsx
// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getInternalUserId = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/currentUser", () => ({ getInternalUserId }));
vi.mock("@/components/auth/GoogleLoginButton", () => ({
  default: ({ next }: { next: string }) => (
    <output data-testid="google-next">{next}</output>
  ),
}));
vi.mock("@/components/mochit/Mochit", () => ({ default: () => <div /> }));

import LoginPage from "@/app/login/page";

beforeEach(() => {
  getInternalUserId.mockResolvedValue(null);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("NEXT_PUBLIC_LINE_ADD_FRIEND_URL", "https://line.example/add");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("campaign login continuation", () => {
  it("emphasizes Google and preserves the campaign return path", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/campaign/august-2026" }),
      }),
    );

    expect(screen.getByText("ログイン後、購入ページへ戻ります")).toBeInTheDocument();
    expect(screen.getByTestId("google-next")).toHaveTextContent(
      "/campaign/august-2026",
    );
    const lineLink = screen.getByRole("link", {
      name: "LINE公式アカウントから始める",
    });
    expect(lineLink).toHaveClass("bg-white", "text-brand-800");
    expect(lineLink).not.toHaveClass("bg-[#06C755]");
  });

  it("keeps LINE emphasized for normal login", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText("ログイン後、購入ページへ戻ります")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "LINE公式アカウントから始める" }),
    ).toHaveClass("bg-[#06C755]", "text-white");
  });

  it("keeps LINE emphasized when Google is unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    render(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/campaign/august-2026" }),
      }),
    );
    expect(
      screen.getByRole("link", { name: "LINE公式アカウントから始める" }),
    ).toHaveClass("bg-[#06C755]", "text-white");
  });

  it("does not treat an external-style next value as campaign continuation", async () => {
    render(
      await LoginPage({ searchParams: Promise.resolve({ next: "//evil.example" }) }),
    );
    expect(screen.getByTestId("google-next")).toHaveTextContent("/");
    expect(screen.queryByText("ログイン後、購入ページへ戻ります")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run test/LoginPageCampaign.test.tsx
```

Expected: FAIL because the campaign notice does not exist and LINE always uses the green primary style.

- [ ] **Step 3: Add campaign-aware presentation**

In `app/login/page.tsx`:

1. Import `AUGUST_2026_CAMPAIGN` from `@/lib/campaign/august2026`.
2. After validated `next` is computed, add:

```tsx
const campaignContinuation = next === AUGUST_2026_CAMPAIGN.path;
```

3. Immediately before the login-method `<div className="mt-8 ...">`, add:

```tsx
{campaignContinuation && (
  <div className="mt-6 w-full rounded-xl bg-white/15 px-4 py-4 text-left">
    <p className="font-bold">ログイン後、購入ページへ戻ります</p>
    <p className="mt-1 text-sm leading-relaxed text-brand-100">
      Googleログインなら購入ページへ戻れます。LINEは購入後の相談特典の受け取りにも利用できます。
    </p>
  </div>
)}
```

4. Before JSX return, define:

```tsx
const lineActionClassName =
  campaignContinuation && googleEnabled
    ? "flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-4 text-center text-base font-semibold text-brand-800 ring-1 ring-white/70 transition hover:bg-brand-50 active:scale-[0.99]"
    : "flex w-full items-center justify-center gap-2 rounded-lg bg-[#06C755] px-6 py-4 text-center text-base font-semibold text-white transition active:scale-[0.99]";
```

5. Replace the LINE anchor’s literal class with `className={lineActionClassName}`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npx vitest run test/LoginPageCampaign.test.tsx
```

Expected: 4 tests pass with zero failures.

- [ ] **Step 5: Run all campaign and login regression tests**

Run:

```bash
npx vitest run test/August2026Checkout.test.tsx test/August2026CampaignPage.test.tsx test/august2026Campaign.test.ts test/billingCheckout.test.ts test/LoginPageCampaign.test.tsx
```

Expected: all selected tests pass with zero failures.

- [ ] **Step 6: Commit Task 2**

```bash
git add test/LoginPageCampaign.test.tsx app/login/page.tsx
git commit -m "feat: preserve campaign login intent"
```

---

### Task 3: Full verification and production handoff

**Files:**
- Modify only if verification identifies a defect covered by Tasks 1 or 2.

**Interfaces:**
- Consumes: completed Tasks 1 and 2.
- Produces: a branch whose complete automated checks pass and whose production verification checklist is ready.

- [ ] **Step 1: Run formatting and complete automated verification**

Run:

```bash
git diff --check
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: every command exits 0 with zero test failures, type errors, lint errors, or build errors.

- [ ] **Step 2: Inspect the final diff and scope**

Run:

```bash
git status --short
git diff --stat HEAD~2..HEAD
git diff --check HEAD~2..HEAD
```

Expected: only `August2026Checkout.tsx`, the August campaign page, the login page, their listed tests, and campaign plan/spec documentation are in scope; `.env`, `.projects/`, and unrelated user changes are absent.

- [ ] **Step 3: Push the existing campaign branch**

```bash
git push origin codex/august-revenue-campaign
```

Expected: remote branch advances to the verified local HEAD.

- [ ] **Step 4: Verify the preview and production-safe flow**

On the Vercel preview generated for PR #16, verify:

1. `/campaign/august-2026` returns 200.
2. Mobile viewport shows `購入内容を確認する` near the hero.
3. The link moves to `#purchase`.
4. The purchase action is a full-width brand button.
5. `/login?next=%2Fcampaign%2Faugust-2026` shows `ログイン後、購入ページへ戻ります`.
6. Google OAuth initiation retains `/campaign/august-2026` as `next`.
7. Stripe Checkout displays 3,480円, payment mode, and the six-month product; do not complete a self-purchase.

- [ ] **Step 5: Record deployment evidence**

Append the preview URL, test summary, and the fact that no self-purchase occurred to `docs/operations/2026-august-revenue-campaign-log.md`, then commit:

```bash
git add docs/operations/2026-august-revenue-campaign-log.md
git commit -m "docs: record campaign conversion verification"
git push origin codex/august-revenue-campaign
```
