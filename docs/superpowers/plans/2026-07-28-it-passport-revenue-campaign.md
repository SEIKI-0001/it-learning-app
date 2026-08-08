# ITパスポート学習コーチ 8月収益化キャンペーン Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存の6か月Pro買い切りプラン（3,480円）を、2026年8月10日までの先着相談特典付きキャンペーンとして安全に販売できる公開導線・決済識別・法務表示・運用記録を本番公開する。

**Architecture:** 静的な説明とSEOはServer Componentに置き、Checkout開始とWebhook反映待ちだけを小さなClient Componentへ分離する。既存の`one_6m` Stripe Price、Checkout Route Handler、Webhook、課金状態APIを再利用し、固定キャンペーンキーだけをCheckout metadataへ付ける。公開ルート判定とキャンペーン期限判定は純粋関数へ切り出して単体テストする。

**Tech Stack:** Next.js 16.2.9 App Router、React 19.2、TypeScript 5、Tailwind CSS 4、Stripe Checkout REST API、Supabase Auth、Vitest、Testing Library、Playwright、Vercel

## Global Constraints

- 価格は既存の`one_6m`、3,480円（税込・買い切り）のまま変更しない。
- 新しいStripe Product、Price、Coupon、Webhook、DB migrationは作らない。
- キャンペーンキーは`august_2026`だけを許可し、任意文字列をStripe metadataへ渡さない。
- 特典期限は2026年8月10日23:59:59.999（JST）とし、UTCでは`2026-08-10T14:59:59.999Z`とする。
- 先着6件到達時は`AUGUST_2026_BONUS_OPEN=false`で特典を終了する。環境変数未設定は受付中として扱う。
- キャンペーン期間中にLINE URLが未設定なら、特典提供不能のためキャンペーン購入CTAを無効にする。
- 特典終了後も通常の6か月買い切り購入は可能にし、キャンペーンmetadataは付けない。
- 購入成功表示はStripe Checkoutから戻った事実とPro状態を分け、Webhook反映前に権限付与完了を断定しない。
- 返金条件は「購入日を含む7日以内、かつ20分相談実施前は全額返金」。相談後は重大な不具合または二重決済を除き返金しない。
- 合格保証、誇大な残席表示、架空の購入件数、無差別DM、自動投稿は実装・運用しない。
- `.gitignore`、`.projects/`、`components/pastExam/PastExamRunner.tsx`の既存作業ツリー変更は本施策の対象外とし、編集・stage・commitしない。
- Vercel CLIを使う前に54.14.5から58.0.0以降へ更新する。更新できない場合はCLIによる本番変更を止め、既存Git連携の状態を確認する。
- 自己購入は売上目標へ算入せず、本番スモークテストではCheckout画面まで確認して決済しない。

---

## File Map

- `lib/campaign/august2026.ts`: キャンペーンの固定値・期限・入力正規化だけを持つ。
- `lib/auth/publicRoutes.ts`: Proxyが利用する公開パス判定だけを持つ。
- `app/api/billing/checkout/route.ts`: 認証済みユーザーのStripe Checkout Sessionを作り、許可済みキャンペーンだけをmetadataへ渡す。
- `components/campaign/August2026Checkout.tsx`: Checkout開始、エラー、キャンセル、Webhook反映待ち、購入後LINE導線だけを扱うClient Component。
- `app/campaign/august-2026/page.tsx`: 販売説明とrequest-timeの認証・期限・設定値を扱うServer Component。
- `app/legal/tokusho/page.tsx`: 通信販売条件と事業者情報の開示請求方法を公開する。
- `app/privacy/page.tsx`: 取得情報、利用目的、外部サービス送信、問い合わせ方法を公開する。
- `components/marketing/PublicFooter.tsx`: 公開ページ間の法務リンクを一元化する。
- `app/lp/page.tsx` / `app/lp/lp.css`: 既存LPの価格表を維持し、キャンペーンへの入口だけを追加する。
- `docs/operations/2026-august-revenue-campaign-log.md`: 個人情報を含まない日次ファネル・購入照合・特典提供ログ。
- `docs/operations/2026-august-revenue-outreach.md`: 非スパムの公開投稿・返信原稿と禁止事項。

---

### Task 1: キャンペーンの純粋なドメインモデル

**Files:**
- Create: `lib/campaign/august2026.ts`
- Create: `test/august2026Campaign.test.ts`

**Interfaces:**
- Produces: `AUGUST_2026_CAMPAIGN`
- Produces: `isAugust2026BonusActive(args): boolean`
- Produces: `isAugust2026BonusOpen(value): boolean`
- Produces: `parseAugust2026CheckoutResult(value): "success" | "cancel" | null`

- [ ] **Step 1: 期限・運用フラグ・Checkout結果の失敗テストを書く**

Create `test/august2026Campaign.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AUGUST_2026_CAMPAIGN,
  isAugust2026BonusActive,
  isAugust2026BonusOpen,
  parseAugust2026CheckoutResult,
} from "@/lib/campaign/august2026";

describe("August 2026 campaign", () => {
  it("uses the approved plan, price, path, and JST deadline", () => {
    expect(AUGUST_2026_CAMPAIGN).toMatchObject({
      key: "august_2026",
      path: "/campaign/august-2026",
      planKey: "one_6m",
      totalJpy: 3480,
      bonusLimit: 6,
      endsAt: "2026-08-10T14:59:59.999Z",
    });
  });

  it("is active through the final millisecond and closed immediately after", () => {
    expect(
      isAugust2026BonusActive({
        now: new Date("2026-08-10T14:59:59.999Z"),
        bonusOpen: true,
      }),
    ).toBe(true);
    expect(
      isAugust2026BonusActive({
        now: new Date("2026-08-10T15:00:00.000Z"),
        bonusOpen: true,
      }),
    ).toBe(false);
  });

  it("honors the manual sold-out switch", () => {
    expect(
      isAugust2026BonusActive({
        now: new Date("2026-08-01T00:00:00.000Z"),
        bonusOpen: false,
      }),
    ).toBe(false);
    expect(isAugust2026BonusOpen(undefined)).toBe(true);
    expect(isAugust2026BonusOpen("false")).toBe(false);
    expect(isAugust2026BonusOpen(" FALSE ")).toBe(false);
  });

  it("accepts only known checkout results", () => {
    expect(parseAugust2026CheckoutResult("success")).toBe("success");
    expect(parseAugust2026CheckoutResult("cancel")).toBe("cancel");
    expect(parseAugust2026CheckoutResult(["success"])).toBeNull();
    expect(parseAugust2026CheckoutResult("paid")).toBeNull();
    expect(parseAugust2026CheckoutResult(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: REDを確認する**

Run:

```bash
npx vitest run test/august2026Campaign.test.ts
```

Expected: `@/lib/campaign/august2026`が存在しないため失敗する。

- [ ] **Step 3: 最小の純粋実装を書く**

Create `lib/campaign/august2026.ts`:

```ts
export const AUGUST_2026_CAMPAIGN = {
  key: "august_2026",
  path: "/campaign/august-2026",
  planKey: "one_6m",
  totalJpy: 3480,
  bonusLimit: 6,
  endsAt: "2026-08-10T14:59:59.999Z",
} as const;

export type August2026CheckoutResult = "success" | "cancel";

export function isAugust2026BonusOpen(value: string | undefined): boolean {
  return value?.trim().toLowerCase() !== "false";
}

export function isAugust2026BonusActive({
  now,
  bonusOpen,
}: {
  now: Date;
  bonusOpen: boolean;
}): boolean {
  return bonusOpen && now.getTime() <= Date.parse(AUGUST_2026_CAMPAIGN.endsAt);
}

export function parseAugust2026CheckoutResult(
  value: string | string[] | undefined,
): August2026CheckoutResult | null {
  return value === "success" || value === "cancel" ? value : null;
}
```

- [ ] **Step 4: GREENを確認する**

Run:

```bash
npx vitest run test/august2026Campaign.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Task 1だけをcommitする**

```bash
git add lib/campaign/august2026.ts test/august2026Campaign.test.ts
git commit -m "feat: add August campaign model"
```

---

### Task 2: 公開ルート判定を純粋関数へ分離する

**Files:**
- Create: `lib/auth/publicRoutes.ts`
- Modify: `proxy.ts`
- Create: `test/publicRoutes.test.ts`

**Interfaces:**
- Produces: `PUBLIC_PREFIXES`
- Produces: `isPublicPath(pathname): boolean`
- Changes: `/campaign/*`、`/legal/*`、`/privacy`を認証不要にする。

- [ ] **Step 1: 公開範囲の失敗テストを書く**

Create `test/publicRoutes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/auth/publicRoutes";

describe("public route matching", () => {
  it.each([
    "/login",
    "/auth/callback",
    "/lp",
    "/campaign/august-2026",
    "/legal/tokusho",
    "/privacy",
  ])("allows %s without an app session", (pathname) => {
    expect(isPublicPath(pathname)).toBe(true);
  });

  it.each(["/", "/more", "/campaigning", "/legalese", "/privacy-policy"])(
    "does not broaden matching to %s",
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(false);
    },
  );
});
```

- [ ] **Step 2: REDを確認する**

Run:

```bash
npx vitest run test/publicRoutes.test.ts
```

Expected: public route module missing.

- [ ] **Step 3: helperを実装しProxyから利用する**

Create `lib/auth/publicRoutes.ts`:

```ts
export const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/lp",
  "/campaign",
  "/legal",
  "/privacy",
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
```

In `proxy.ts`, import the helper, delete the local `PUBLIC_PREFIXES`, and replace the inline `some` expression:

```ts
import { isPublicPath } from "@/lib/auth/publicRoutes";
```

```ts
if (isPublicPath(pathname)) {
  return response;
}
```

- [ ] **Step 4: 公開範囲とProxy型を検証する**

Run:

```bash
npx vitest run test/publicRoutes.test.ts
npm run typecheck
```

Expected: tests and TypeScript pass.

- [ ] **Step 5: Task 2だけをcommitする**

```bash
git add lib/auth/publicRoutes.ts proxy.ts test/publicRoutes.test.ts
git commit -m "feat: expose campaign and legal routes"
```

---

### Task 3: Checkoutへ許可済みキャンペーン情報を付与する

**Files:**
- Modify: `app/api/billing/checkout/route.ts`
- Modify: `test/billingCheckout.test.ts`

**Interfaces:**
- Changes request body to `{ userId?, plan?, returnTo?, campaign? }`
- Allows return path `/campaign/august-2026`
- Adds `metadata[campaign]=august_2026` only for an active `one_6m` campaign
- Adds Stripe `custom_text[submit][message]` only for an active campaign checkout

- [ ] **Step 1: 6か月Priceをテスト環境へ追加する**

In `test/billingCheckout.test.ts` `beforeEach`:

```ts
vi.stubEnv("STRIPE_PRICE_ID_PRO_6M", "price_pro_6m");
vi.stubEnv("AUGUST_2026_BONUS_OPEN", "true");
vi.useFakeTimers();
vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
```

In `afterEach`:

```ts
vi.unstubAllGlobals();
vi.useRealTimers();
```

- [ ] **Step 2: 正常・不正・終了後の失敗テストを書く**

Append to `test/billingCheckout.test.ts`:

```ts
it("marks an active approved six-month campaign checkout", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(stripeResponse({ url: "https://checkout.test/session" }));
  vi.stubGlobal("fetch", fetchMock);

  const response = await POST(
    new Request("https://example.test/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({
        plan: "one_6m",
        returnTo: "/campaign/august-2026",
        campaign: "august_2026",
      }),
    }),
  );

  expect(response.status).toBe(200);
  const checkoutBody = new URLSearchParams(fetchMock.mock.calls[0][1].body);
  expect(checkoutBody.get("line_items[0][price]")).toBe("price_pro_6m");
  expect(checkoutBody.get("metadata[campaign]")).toBe("august_2026");
  expect(checkoutBody.get("success_url")).toBe(
    "https://example.test/campaign/august-2026?checkout=success&campaign=august_2026#purchase",
  );
  expect(checkoutBody.get("cancel_url")).toBe(
    "https://example.test/campaign/august-2026?checkout=cancel#purchase",
  );
  expect(checkoutBody.get("custom_text[submit][message]")).toContain(
    "買い切り6か月・自動更新なし",
  );
  expect(checkoutBody.get("custom_text[submit][message]")).toContain(
    "https://example.test/legal/tokusho",
  );
});

it.each([
  { campaign: "anything", plan: "one_6m" },
  { campaign: "august_2026", plan: "one_1m" },
])("does not forward an invalid campaign combination: %o", async (body) => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(stripeResponse({ url: "https://checkout.test/session" }));
  vi.stubGlobal("fetch", fetchMock);

  await POST(
    new Request("https://example.test/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        returnTo: "/campaign/august-2026",
      }),
    }),
  );

  const checkoutBody = new URLSearchParams(fetchMock.mock.calls[0][1].body);
  expect(checkoutBody.has("metadata[campaign]")).toBe(false);
  expect(checkoutBody.has("custom_text[submit][message]")).toBe(false);
});

it("stops campaign labeling after the deadline without blocking normal purchase", async () => {
  vi.setSystemTime(new Date("2026-08-10T15:00:00.000Z"));
  const fetchMock = vi
    .fn()
    .mockResolvedValue(stripeResponse({ url: "https://checkout.test/session" }));
  vi.stubGlobal("fetch", fetchMock);

  const response = await POST(
    new Request("https://example.test/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({
        plan: "one_6m",
        returnTo: "/campaign/august-2026",
        campaign: "august_2026",
      }),
    }),
  );

  expect(response.status).toBe(200);
  const checkoutBody = new URLSearchParams(fetchMock.mock.calls[0][1].body);
  expect(checkoutBody.has("metadata[campaign]")).toBe(false);
  expect(checkoutBody.has("custom_text[submit][message]")).toBe(false);
});

it("falls back to /more for an unapproved return path", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(stripeResponse({ url: "https://checkout.test/session" }));
  vi.stubGlobal("fetch", fetchMock);

  await POST(
    new Request("https://example.test/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({
        plan: "one_6m",
        returnTo: "//evil.example",
        campaign: "august_2026",
      }),
    }),
  );

  const checkoutBody = new URLSearchParams(fetchMock.mock.calls[0][1].body);
  expect(checkoutBody.get("success_url")).toBe(
    "https://example.test/more?checkout=success#billing",
  );
});
```

- [ ] **Step 3: REDを確認する**

Run:

```bash
npx vitest run test/billingCheckout.test.ts
```

Expected: campaign metadata, campaign return path, anchor, and custom text assertions fail.

- [ ] **Step 4: Route Handlerへ固定条件を実装する**

At the top of `app/api/billing/checkout/route.ts`:

```ts
import {
  AUGUST_2026_CAMPAIGN,
  isAugust2026BonusActive,
  isAugust2026BonusOpen,
} from "@/lib/campaign/august2026";
```

Change the body and allowlist:

```ts
const RETURN_PATHS = [
  "/more",
  "/ai-grading",
  AUGUST_2026_CAMPAIGN.path,
] as const;
```

```ts
let body: {
  userId?: string;
  plan?: string;
  returnTo?: string;
  campaign?: string;
} = {};
```

After resolving `returnTo`, derive the server-authoritative campaign state:

```ts
const isAugustCampaignCheckout =
  body.campaign === AUGUST_2026_CAMPAIGN.key &&
  plan.key === AUGUST_2026_CAMPAIGN.planKey &&
  isAugust2026BonusActive({
    now: new Date(),
    bonusOpen: isAugust2026BonusOpen(
      process.env.AUGUST_2026_BONUS_OPEN,
    ),
  });
const returnAnchor =
  returnTo === AUGUST_2026_CAMPAIGN.path ? "purchase" : "billing";
const baseUrl = appUrl.replace(/\/+$/, "");
```

Replace success and cancel URL creation:

```ts
const successQuery = new URLSearchParams({ checkout: "success" });
if (isAugustCampaignCheckout) {
  successQuery.set("campaign", AUGUST_2026_CAMPAIGN.key);
}
params.set(
  "success_url",
  `${baseUrl}${returnTo}?${successQuery.toString()}#${returnAnchor}`,
);
params.set(
  "cancel_url",
  `${baseUrl}${returnTo}?checkout=cancel#${returnAnchor}`,
);
```

Add after the ordinary metadata:

```ts
if (isAugustCampaignCheckout) {
  params.append("metadata[campaign]", AUGUST_2026_CAMPAIGN.key);
  params.set(
    "custom_text[submit][message]",
    `買い切り6か月・自動更新なし。購入日を含む7日以内かつ個別相談前は全額返金。条件: ${baseUrl}/legal/tokusho`,
  );
}
```

Do not add campaign metadata to `subscription_data`, do not change webhook logic, and do not reject a normal purchase after the campaign closes.

- [ ] **Step 5: Checkout回帰テストをGREENにする**

Run:

```bash
npx vitest run test/billingCheckout.test.ts test/billingWebhook.test.ts test/billingAtomicPurchase.test.ts
```

Expected: all billing tests pass.

- [ ] **Step 6: Task 3だけをcommitする**

```bash
git add app/api/billing/checkout/route.ts test/billingCheckout.test.ts
git commit -m "feat: tag August campaign checkouts"
```

---

### Task 4: キャンペーン購入Client Component

**Files:**
- Create: `components/campaign/August2026Checkout.tsx`
- Create: `test/August2026Checkout.test.tsx`

**Interfaces:**
- Consumes: `useBillingStatus()`
- Consumes props: `authenticated`, `bonusActive`, `checkoutEnabled`, `lineUrl`, `checkoutResult`, `campaignPurchase`
- Starts only `one_6m` with `returnTo=/campaign/august-2026`
- Shows login, ready, busy, error, cancel, confirming, and confirmed states

- [ ] **Step 1: UI stateの失敗テストを書く**

Create `test/August2026Checkout.test.tsx`:

```tsx
// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.hoisted(() => vi.fn());
const billing = vi.hoisted(() => ({
  status: null as null | {
    entitlements: { isPro: boolean };
  },
}));

vi.mock("@/lib/useBillingStatus", () => ({
  useBillingStatus: () => ({
    status: billing.status,
    loading: false,
    refresh,
  }),
}));
vi.mock("@/lib/userSession", () => ({ getUserId: () => "user-1" }));

import August2026Checkout from "@/components/campaign/August2026Checkout";

const baseProps = {
  authenticated: true,
  bonusActive: true,
  checkoutEnabled: true,
  lineUrl: "https://line.example/add",
  checkoutResult: null,
  campaignPurchase: false,
} as const;

beforeEach(() => {
  billing.status = null;
  refresh.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("August2026Checkout", () => {
  it("sends unauthenticated visitors to login and preserves the return path", () => {
    render(<August2026Checkout {...baseProps} authenticated={false} />);
    expect(
      screen.getByRole("link", { name: "ログインして3,480円で始める" }),
    ).toHaveAttribute(
      "href",
      "/login?next=%2Fcampaign%2Faugust-2026",
    );
  });

  it("starts the approved campaign checkout", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, error: "テスト停止" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<August2026Checkout {...baseProps} />);

    fireEvent.click(
      screen.getByRole("button", { name: "3,480円で6か月始める" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      userId: "user-1",
      plan: "one_6m",
      returnTo: "/campaign/august-2026",
      campaign: "august_2026",
    });
    expect(await screen.findByText("テスト停止")).toBeInTheDocument();
  });

  it("does not enable the bonus checkout when LINE is unavailable", () => {
    render(<August2026Checkout {...baseProps} lineUrl="" />);
    expect(
      screen.getByRole("button", { name: "特典受付を準備中" }),
    ).toBeDisabled();
  });

  it("shows a normal six-month purchase after the bonus closes", () => {
    render(
      <August2026Checkout
        {...baseProps}
        bonusActive={false}
        lineUrl=""
      />,
    );
    expect(
      screen.getByRole("button", { name: "通常の6か月プランを購入する" }),
    ).toBeEnabled();
    expect(screen.getByText("相談特典の受付は終了しました。")).toBeInTheDocument();
  });

  it("distinguishes cancellation from a successful return awaiting webhook", () => {
    const { rerender } = render(
      <August2026Checkout {...baseProps} checkoutResult="cancel" />,
    );
    expect(screen.getByText(/購入手続きをキャンセルしました。/)).toBeInTheDocument();

    rerender(<August2026Checkout {...baseProps} checkoutResult="success" />);
    expect(screen.getByText(/決済を確認中です。/)).toBeInTheDocument();
    expect(screen.queryByText("Pro反映済み")).not.toBeInTheDocument();
  });

  it("shows confirmation and the LINE fulfillment link only after Pro is active", () => {
    billing.status = { entitlements: { isPro: true } };
    render(
      <August2026Checkout
        {...baseProps}
        checkoutResult="success"
        campaignPurchase
      />,
    );
    expect(screen.getByText("Pro反映済み")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "LINEで相談特典を受け取る" }),
    ).toHaveAttribute("href", "https://line.example/add");
  });
});
```

- [ ] **Step 2: REDを確認する**

Run:

```bash
npx vitest run test/August2026Checkout.test.tsx
```

Expected: component missing.

- [ ] **Step 3: Client Componentを実装する**

Create `components/campaign/August2026Checkout.tsx` with this public contract:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AUGUST_2026_CAMPAIGN } from "@/lib/campaign/august2026";
import { getUserId } from "@/lib/userSession";
import { useBillingStatus } from "@/lib/useBillingStatus";
import type { August2026CheckoutResult } from "@/lib/campaign/august2026";

type Props = {
  authenticated: boolean;
  bonusActive: boolean;
  checkoutEnabled: boolean;
  lineUrl: string;
  checkoutResult: August2026CheckoutResult | null;
  campaignPurchase: boolean;
};
```

Use these state transitions and request implementation:

```tsx
export default function August2026Checkout(props: Props) {
  const { status, refresh } = useBillingStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPro = Boolean(status?.entitlements.isPro);

  useEffect(() => {
    if (props.checkoutResult !== "success") return;
    const timer = window.setTimeout(() => refresh(), 2500);
    return () => window.clearTimeout(timer);
    // refresh changes identity in the existing hook; run once for each return state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.checkoutResult]);

  async function startCheckout() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getUserId(),
          plan: AUGUST_2026_CAMPAIGN.planKey,
          returnTo: AUGUST_2026_CAMPAIGN.path,
          campaign: props.bonusActive
            ? AUGUST_2026_CAMPAIGN.key
            : undefined,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok: boolean; url?: string; error?: string }
        | null;
      if (data?.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(
        data?.error ||
          "購入手続きを開始できませんでした。時間をおいて再度お試しください。",
      );
    } catch {
      setError(
        "購入手続きを開始できませんでした。時間をおいて再度お試しください。",
      );
    } finally {
      setBusy(false);
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(
    AUGUST_2026_CAMPAIGN.path,
  )}`;
  const bonusUnavailable = props.bonusActive && !props.lineUrl;
  const buttonLabel = props.bonusActive
    ? "3,480円で6か月始める"
    : "通常の6か月プランを購入する";
```

Continue the same function with this branch order:

```tsx
  return (
    <section id="purchase" className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
      <p className="text-sm font-bold text-brand-700">3,480円（税込）</p>
      <p className="mt-1 text-sm text-slate-600">
        買い切り・6か月・自動更新なし
      </p>
      <p className="mt-3 text-xs leading-6 text-slate-600">
        購入日を含む7日以内、かつ20分相談の実施前は全額返金
      </p>
      {props.checkoutResult === "cancel" && (
        <p className="mt-4 rounded-xl bg-slate-100 p-3">
          購入手続きをキャンセルしました。課金とプラン変更は行われていません。
        </p>
      )}
      {props.checkoutResult === "success" && !isPro && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-amber-900">
          決済を確認中です。Stripeの決済完了後、通常は数分以内にProへ反映されます。
        </p>
      )}
      {props.checkoutResult === "success" && isPro && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-900">
          <p className="font-bold">Pro反映済み</p>
          {props.campaignPurchase && props.lineUrl ? (
            <a className="mt-2 inline-block underline" href={props.lineUrl}>
              LINEで相談特典を受け取る
            </a>
          ) : (
            <Link className="mt-2 inline-block underline" href="/more">
              プラン・購入履歴を確認する
            </Link>
          )}
        </div>
      )}
      {error && <p className="mt-4 text-sm text-rose-700" role="alert">{error}</p>}
      <div className="mt-5">
        {!props.authenticated ? (
          <Link href={loginHref}>ログインして3,480円で始める</Link>
        ) : bonusUnavailable ? (
          <button type="button" disabled>特典受付を準備中</button>
        ) : !props.checkoutEnabled ? (
          <button type="button" disabled>決済を準備中</button>
        ) : (
          <button type="button" disabled={busy} onClick={startCheckout}>
            {busy ? "Stripeを開いています…" : buttonLabel}
          </button>
        )}
      </div>
      {!props.bonusActive && (
        <p className="mt-3 text-sm text-slate-600">
          相談特典の受付は終了しました。
        </p>
      )}
    </section>
  );
}
```

Behavioral invariants:

- `checkoutResult==="success"` schedules one `refresh()` after 2,500ms and clears the timer on unmount.
- `status?.entitlements.isPro === true` is the only condition for the text `Pro反映済み`.
- A successful return without Pro shows `決済を確認中です。Stripeの決済完了後、通常は数分以内にProへ反映されます。`.
- A cancel return shows `購入手続きをキャンセルしました。課金とプラン変更は行われていません。`.
- Unauthenticated users receive a Next `Link` to `"/login?next=%2Fcampaign%2Faugust-2026"`.
- When `bonusActive && !lineUrl`, render a disabled `特典受付を準備中` button.
- When `!checkoutEnabled`, render a disabled `決済を準備中` button.
- An active offer button is `3,480円で6か月始める`; a closed offer button is `通常の6か月プランを購入する`.
- POST body is:

```ts
{
  userId: getUserId(),
  plan: AUGUST_2026_CAMPAIGN.planKey,
  returnTo: AUGUST_2026_CAMPAIGN.path,
  campaign: bonusActive ? AUGUST_2026_CAMPAIGN.key : undefined,
}
```

- On `{ok:true,url}` use `window.location.assign(url)`.
- On an HTTP/application error show the returned error or `購入手続きを開始できませんでした。時間をおいて再度お試しください。`.
- Keep the CTA inside `<section id="purchase">`.
- The confirmed state displays the LINE link only when `campaignPurchase && lineUrl`; otherwise it directs the user to `/more`. This preserves fulfillment for a valid purchase that returns after the deadline without offering the bonus to a normal post-campaign purchase.

- [ ] **Step 4: GREENと既存BillingSection回帰を確認する**

Run:

```bash
npx vitest run test/August2026Checkout.test.tsx test/BillingSection.test.tsx
```

Expected: both suites pass.

- [ ] **Step 5: Task 4だけをcommitする**

```bash
git add components/campaign/August2026Checkout.tsx test/August2026Checkout.test.tsx
git commit -m "feat: add campaign checkout experience"
```

---

### Task 5: 公開キャンペーンページ

**Files:**
- Create: `app/campaign/august-2026/page.tsx`
- Create: `test/August2026CampaignPage.test.tsx`

**Interfaces:**
- Uses Server Component for copy, metadata, auth, deadline, and environment readiness
- Awaits Next.js 16 `searchParams`
- Passes only serializable primitives to `August2026Checkout`

- [ ] **Step 1: ページ内容とServer/Client境界の失敗テストを書く**

Create `test/August2026CampaignPage.test.tsx`:

```tsx
// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getInternalUserId = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/currentUser", () => ({ getInternalUserId }));
vi.mock("@/components/campaign/August2026Checkout", () => ({
  default: (props: Record<string, unknown>) => (
    <output data-testid="checkout-props">{JSON.stringify(props)}</output>
  ),
}));

import CampaignPage from "@/app/campaign/august-2026/page";

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
  vi.stubEnv("STRIPE_PRICE_ID_PRO_6M", "price_6m");
  vi.stubEnv("NEXT_PUBLIC_LINE_ADD_FRIEND_URL", "https://line.example/add");
  vi.stubEnv("AUGUST_2026_BONUS_OPEN", "true");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
  getInternalUserId.mockResolvedValue(null);
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("August campaign page", () => {
  it("renders the approved offer and disclosures", async () => {
    render(await CampaignPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "ITパスポート学習コーチ Pro 6か月",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("3,480円（税込・買い切り）")).toBeInTheDocument();
    expect(screen.getByText(/自動更新はありません/)).toBeInTheDocument();
    expect(screen.getByText(/合格を保証するものではありません/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "特定商取引法に基づく表示" }),
    ).toHaveAttribute("href", "/legal/tokusho");
    expect(
      screen.getByRole("link", { name: "プライバシーポリシー" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("passes request-time auth and checkout result as serializable props", async () => {
    getInternalUserId.mockResolvedValue("user-1");
    render(
      await CampaignPage({
        searchParams: Promise.resolve({
          checkout: "success",
          campaign: "august_2026",
        }),
      }),
    );
    expect(JSON.parse(screen.getByTestId("checkout-props").textContent || "{}")).toEqual({
      authenticated: true,
      bonusActive: true,
      checkoutEnabled: true,
      lineUrl: "https://line.example/add",
      checkoutResult: "success",
      campaignPurchase: true,
    });
  });
});
```

- [ ] **Step 2: REDを確認する**

Run:

```bash
npx vitest run test/August2026CampaignPage.test.tsx
```

Expected: page missing.

- [ ] **Step 3: Server Componentページを実装する**

Create `app/campaign/august-2026/page.tsx` with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import August2026Checkout from "@/components/campaign/August2026Checkout";
import { getInternalUserId } from "@/lib/auth/currentUser";
import {
  AUGUST_2026_CAMPAIGN,
  isAugust2026BonusActive,
  isAugust2026BonusOpen,
  parseAugust2026CheckoutResult,
} from "@/lib/campaign/august2026";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pro 6か月 3,480円｜ITパスポート学習コーチ",
  description:
    "ITパスポート学習コーチの6か月Pro買い切りプラン。2026年8月10日まで先着6名に20分の学習計画相談付き。",
};

export default async function CampaignPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkout?: string | string[];
    campaign?: string | string[];
  }>;
}) {
  const [userId, query] = await Promise.all([
    getInternalUserId(),
    searchParams,
  ]);
  const lineUrl =
    process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL?.trim() || "";
  const bonusActive = isAugust2026BonusActive({
    now: new Date(),
    bonusOpen: isAugust2026BonusOpen(
      process.env.AUGUST_2026_BONUS_OPEN,
    ),
  });
  const checkoutEnabled = Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_ID_PRO_6M?.trim(),
  );
```

Continue the function with this single-`main` markup:

```tsx
  const audience = [
    "何をどの順番で勉強すればよいか迷っている",
    "参考書のカタカナ用語で止まった",
    "過去問の正答率だけでは、合格までの距離が分からない",
  ];
  const proFeatures = [
    "学習記録を6か月保存",
    "合格準備度・復習・毎日の学習計画",
    "Claude SonnetによるAI採点を1日10回まで",
    "69トピック、確認問題276問、英略語103語",
  ];
  const steps = [
    "登録",
    "Stripeで決済",
    "Pro反映",
    "LINEで購入時メールアドレスを送信",
    "相談日時を決定",
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-brand-900 px-5 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-bold text-brand-100">
            2026年8月10日 23:59（日本時間）まで・先着6名
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            ITパスポート学習コーチ Pro 6か月
          </h1>
          <p className="mt-5 text-2xl font-bold">
            3,480円（税込・買い切り）
          </p>
          <p className="mt-5 max-w-2xl leading-8 text-brand-50">
            参考書で止まった人へ。試験日から逆算した「今日やること」と、
            理解を確かめるAI採点を6か月使えます。
          </p>
          <p className="mt-3 text-sm text-brand-100">
            自動更新はありません。
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-bold">こんな方へ</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              {audience.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-bold">6か月Proで使えること</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {proFeatures.map((item) => (
                <li className="rounded-xl bg-white p-4 ring-1 ring-slate-200" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl bg-brand-50 p-6 ring-1 ring-brand-200">
            <h2 className="text-2xl font-bold">先着6名の期間限定特典</h2>
            <p className="mt-3 font-bold">
              20分のオンライン学習計画相談1回＋相談後のLINEフォロー1回
            </p>
            <p className="mt-3 leading-7 text-slate-700">
              本特典は、試験日と生活時間に合わせた学習計画を一緒に作るものです。
              合格を保証するものではありません。
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold">購入から相談まで</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-5">
              {steps.map((step, index) => (
                <li className="rounded-xl bg-white p-3 ring-1 ring-slate-200" key={step}>
                  <span className="block text-xs font-bold text-brand-700">
                    STEP {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h2 className="text-2xl font-bold">返金条件</h2>
            <p className="mt-3 leading-7">
              購入日を含む7日以内、かつ20分相談の実施前に公式LINEから
              申し出た場合は全額返金します。
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold">よくある質問</h2>
            <div className="mt-4 space-y-3">
              <details><summary>自動更新されますか？</summary><p>いいえ。6か月の買い切りです。</p></details>
              <details><summary>相談特典はどう受け取りますか？</summary><p>購入後、公式LINEへ購入時メールアドレスを送ってください。</p></details>
              <details><summary>返金できますか？</summary><p>上記の返金条件を満たす場合は全額返金します。</p></details>
              <details><summary>必要な動作環境は？</summary><p>最新版のモダンブラウザとインターネット接続が必要です。</p></details>
            </div>
          </section>
        </div>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <August2026Checkout
            authenticated={Boolean(userId)}
            bonusActive={bonusActive}
            checkoutEnabled={checkoutEnabled}
            lineUrl={lineUrl}
            checkoutResult={parseAugust2026CheckoutResult(query.checkout)}
            campaignPurchase={
              query.campaign === AUGUST_2026_CAMPAIGN.key &&
              query.checkout === "success"
            }
          />
        </aside>
      </div>
      <nav className="border-t border-slate-200 px-5 py-8 text-center text-sm" aria-label="法務情報">
        <Link className="underline" href="/legal/tokusho">特定商取引法に基づく表示</Link>
        <span aria-hidden="true"> ・ </span>
        <Link className="underline" href="/privacy">プライバシーポリシー</Link>
      </nav>
    </main>
  );
}
```

Keep the page a Server Component; do not add `"use client"` or import browser APIs.

- [ ] **Step 4: Page testsとproduction buildを確認する**

Run:

```bash
npx vitest run test/August2026CampaignPage.test.tsx test/August2026Checkout.test.tsx
npm run typecheck
```

Expected: tests and types pass.

- [ ] **Step 5: Task 5だけをcommitする**

```bash
git add app/campaign/august-2026/page.tsx test/August2026CampaignPage.test.tsx
git commit -m "feat: publish August campaign page"
```

---

### Task 6: 特定商取引法表示・プライバシー・LP導線

**Files:**
- Create: `components/marketing/PublicFooter.tsx`
- Create: `app/legal/tokusho/page.tsx`
- Create: `app/privacy/page.tsx`
- Modify: `app/lp/page.tsx`
- Modify: `app/lp/lp.css`
- Create: `test/PublicLegalPages.test.tsx`
- Create: `test/LandingPageCampaign.test.tsx`

**Interfaces:**
- Produces public legal pages with Metadata
- Produces reusable footer links
- Keeps the existing LP pricing table unchanged while adding a campaign banner

- [ ] **Step 1: 法務ページの失敗テストを書く**

Create `test/PublicLegalPages.test.tsx`:

```tsx
// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TokushoPage from "@/app/legal/tokusho/page";
import PrivacyPage from "@/app/privacy/page";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("public legal pages", () => {
  it("publishes the required commercial terms and disclosure request", () => {
    vi.stubEnv("NEXT_PUBLIC_LINE_ADD_FRIEND_URL", "https://line.example/add");
    render(<TokushoPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "特定商取引法に基づく表示" }),
    ).toBeInTheDocument();
    expect(screen.getByText("3,480円（税込）")).toBeInTheDocument();
    expect(screen.getByText(/自動更新はありません/)).toBeInTheDocument();
    expect(screen.getByText(/購入日を含む7日以内/)).toBeInTheDocument();
    expect(screen.getByText(/遅滞なく提供します/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "公式LINEで開示を請求する" })).toHaveAttribute(
      "href",
      "https://line.example/add",
    );
  });

  it("explains collected data, processors, purposes, and contact", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "プライバシーポリシー" }),
    ).toBeInTheDocument();
    for (const service of ["Google", "LINE", "Stripe", "Supabase"]) {
      expect(screen.getAllByText(new RegExp(service)).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/学習履歴/)).toBeInTheDocument();
    expect(screen.getByText(/AI採点履歴/)).toBeInTheDocument();
    expect(screen.getByText(/購入時メールアドレス/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: LP導線の失敗テストを書く**

Create `test/LandingPageCampaign.test.tsx`:

```tsx
// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LandingPage from "@/app/lp/page";

afterEach(cleanup);

describe("landing page campaign route", () => {
  it("links to the approved offer without replacing normal pricing", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("link", { name: "6か月Proキャンペーンを見る" }),
    ).toHaveAttribute("href", "/campaign/august-2026");
    expect(screen.getByText("¥3,480")).toBeInTheDocument();
    expect(screen.getAllByText("¥980").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "特定商取引法に基づく表示" }),
    ).toHaveAttribute("href", "/legal/tokusho");
    expect(
      screen.getByRole("link", { name: "プライバシーポリシー" }),
    ).toHaveAttribute("href", "/privacy");
  });
});
```

- [ ] **Step 3: REDを確認する**

Run:

```bash
npx vitest run test/PublicLegalPages.test.tsx test/LandingPageCampaign.test.tsx
```

Expected: legal pages, campaign link, and legal links missing.

- [ ] **Step 4: 共通公開footerを実装する**

Create `components/marketing/PublicFooter.tsx`:

```tsx
import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 px-5 py-8 text-center text-sm text-slate-600">
      <p>ITパスポート学習コーチ</p>
      <nav className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="法務情報">
        <Link href="/lp">サービス紹介</Link>
        <Link href="/legal/tokusho">特定商取引法に基づく表示</Link>
        <Link href="/privacy">プライバシーポリシー</Link>
      </nav>
    </footer>
  );
}
```

- [ ] **Step 5: 特定商取引法表示を実装する**

Create `app/legal/tokusho/page.tsx` as this synchronous Server Component:

```tsx
import type { Metadata } from "next";
import PublicFooter from "@/components/marketing/PublicFooter";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表示｜ITパスポート学習コーチ",
};

const TERMS = [
  ["販売価格", "3,480円（税込）"],
  ["商品以外の必要料金", "インターネット接続料金・通信料金は購入者の負担です。"],
  ["支払方法・時期", "Stripeによるクレジットカード決済。購入時に即時決済されます。"],
  ["提供時期", "決済完了後、Webhookによる反映を経て通常数分以内に提供を開始します。"],
  ["提供期間", "決済完了から6か月。買い切りのため自動更新はありません。"],
  ["キャンペーン特典", "対象期間中の先着購入者へ、20分のオンライン学習計画相談1回と相談後のLINEフォロー1回を提供します。"],
  ["返金条件", "購入日を含む7日以内、かつ20分相談の実施前に公式LINEから申し出た場合は、理由を問わず全額返金します。相談実施後は、サービスの重大な不具合または二重決済を除き返金しません。"],
  ["動作環境", "最新版のSafari、Chrome、Edge等のモダンブラウザとインターネット接続が必要です。"],
  ["販売事業者情報", "販売事業者の氏名（名称）、住所、電話番号は、請求があり次第、これらを記載した書面または電子メールを購入判断に間に合うよう遅滞なく提供します。"],
] as const;

export default function TokushoPage() {
  const lineUrl =
    process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL?.trim() || "";
  return (
    <>
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold text-slate-900">
          特定商取引法に基づく表示
        </h1>
        <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {TERMS.map(([term, value]) => (
            <div className="grid gap-2 py-5 sm:grid-cols-[12rem_1fr]" key={term}>
              <dt className="font-bold text-slate-800">{term}</dt>
              <dd className="leading-7 text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>
        <section className="mt-8 rounded-2xl bg-slate-100 p-5">
          <h2 className="font-bold text-slate-900">事業者情報の開示請求</h2>
          {lineUrl ? (
            <a className="mt-3 inline-block font-bold text-brand-700 underline" href={lineUrl}>
              公式LINEで開示を請求する
            </a>
          ) : (
            <p className="mt-3 text-slate-700">
              公式LINE窓口を準備中です。購入手続きも停止しています。
            </p>
          )}
        </section>
        <p className="mt-8 text-sm leading-7 text-slate-600">
          表示方法は
          <a className="underline" href="https://www.no-trouble.caa.go.jp/qa/advertising.html">
            消費者庁 通信販売広告Q&amp;A
          </a>
          および
          <a className="underline" href="https://www.no-trouble.caa.go.jp/what/mailorder/">
            通信販売のルール
          </a>
          を参照しています。
        </p>
      </main>
      <PublicFooter />
    </>
  );
}
```

- [ ] **Step 6: プライバシーポリシーを実装する**

Create `app/privacy/page.tsx` as this synchronous Server Component:

```tsx
import type { Metadata } from "next";
import PublicFooter from "@/components/marketing/PublicFooter";

export const metadata: Metadata = {
  title: "プライバシーポリシー｜ITパスポート学習コーチ",
};

const SECTIONS = [
  ["取得する情報", "GoogleおよびLINEの識別子・メールアドレス、Stripeの購入情報と支払状況、Supabaseのアカウント情報、学習履歴、問題への回答、AI採点履歴、端末・ブラウザ・アクセス時のリクエスト情報を取得します。"],
  ["利用目的", "本人認証、学習の継続、Pro権限の付与、請求と購入サポート、不正防止と安全管理、サービス改善、問い合わせ対応、キャンペーン特典の提供に利用します。"],
  ["外部サービスへの送信", "認証のためGoogle・LINE・Supabaseへ、決済のためStripeへ、AI採点のため設定済みAI提供者へ、それぞれ処理に必要な範囲の情報を送信します。各社では各社の規約とプライバシーポリシーに従って処理されます。"],
  ["相談特典", "LINEで受け取った購入時メールアドレスは、Stripe上の購入照合と相談特典の提供だけに利用します。"],
  ["保存と安全管理", "情報は利用目的、法令上の保存義務、紛争対応に必要な期間だけ保持し、アクセス制限など合理的な安全管理措置を講じます。不要になった情報は、法令上の保存義務がある場合を除き、削除または匿名化します。"],
  ["開示・訂正・削除・問い合わせ", "公式LINEから請求できます。第三者への誤開示を防ぐため、必要に応じて本人確認を行います。"],
  ["改定", "重要な変更がある場合は、本サービス上で分かりやすく告知します。"],
] as const;

export default function PrivacyPage() {
  const lineUrl =
    process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL?.trim() || "";
  return (
    <>
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold text-slate-900">
          プライバシーポリシー
        </h1>
        <div className="mt-8 space-y-8">
          {SECTIONS.map(([heading, body]) => (
            <section key={heading}>
              <h2 className="text-xl font-bold text-slate-900">{heading}</h2>
              <p className="mt-2 leading-8 text-slate-700">{body}</p>
            </section>
          ))}
        </div>
        {lineUrl && (
          <a className="mt-8 inline-block font-bold text-brand-700 underline" href={lineUrl}>
            公式LINEへ問い合わせる
          </a>
        )}
      </main>
      <PublicFooter />
    </>
  );
}
```

This wording deliberately avoids claiming a fixed deletion period that the current system does not enforce.

- [ ] **Step 7: LPへキャンペーンバナーと法務リンクを追加する**

In `app/lp/page.tsx`, add immediately below the header:

```tsx
<aside className="campaign-banner" aria-label="期間限定キャンペーン">
  <p>
    <strong>8月10日まで・先着6名</strong>
    6か月Pro 3,480円に、20分の学習計画相談が付きます。
  </p>
  <a href="/campaign/august-2026">6か月Proキャンペーンを見る</a>
</aside>
```

Keep the four existing price cards unchanged. Add to the existing footer:

```tsx
<a href="/legal/tokusho">特定商取引法に基づく表示</a>
{" / "}
<a href="/privacy">プライバシーポリシー</a>
```

In `app/lp/lp.css`, add:

```css
.lp .campaign-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: #0756a8;
  color: #fff;
  padding: 14px 24px;
  font-size: 0.9rem;
  line-height: 1.6;
}
.lp .campaign-banner strong {
  margin-right: 0.75rem;
}
.lp .campaign-banner a {
  flex: none;
  border-radius: 999px;
  background: #fff;
  color: #0756a8;
  padding: 8px 16px;
  font-weight: 700;
}
.lp .campaign-banner a:focus-visible {
  outline: 3px solid #fdba74;
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .lp .campaign-banner {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
}
```

Do not add animation.

- [ ] **Step 8: Legal/LPテストをGREENにする**

Run:

```bash
npx vitest run test/PublicLegalPages.test.tsx test/LandingPageCampaign.test.tsx
npm run typecheck
```

Expected: tests and types pass.

- [ ] **Step 9: Task 6だけをcommitする**

```bash
git add components/marketing/PublicFooter.tsx app/legal/tokusho/page.tsx app/privacy/page.tsx app/lp/page.tsx app/lp/lp.css test/PublicLegalPages.test.tsx test/LandingPageCampaign.test.tsx
git commit -m "feat: add campaign disclosures and landing link"
```

---

### Task 7: 販売運用ログと投稿原稿

**Files:**
- Create: `docs/operations/2026-august-revenue-campaign-log.md`
- Create: `docs/operations/2026-august-revenue-outreach.md`

**Interfaces:**
- Produces a daily funnel ledger
- Produces non-spam outreach copy and response rules

- [ ] **Step 1: 記録項目を固定する**

Create `docs/operations/2026-august-revenue-campaign-log.md` with:

```md
# 2026年8月 収益化キャンペーン運用ログ

## 目標

- 期限: 2026-08-10 23:59 JST
- 商品: Pro 6か月・3,480円・買い切り
- 目標: 外部顧客6件、Stripe手数料控除後100米ドル相当以上
- キャンペーンURL: https://it-learning-app.vercel.app/campaign/august-2026

## 日次ファネル

| 日付 | 媒体 | 活動内容 | 対象者の悩み | 投稿/返信URL | 返信数 | LP閲覧 | 登録 | Checkout開始 | 外部顧客購入 | 売上総額 | Stripe手数料 | 純額 | 次の改善 |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|

## 購入・特典台帳

個人情報をこのGit管理ファイルへ記録しない。Stripe Checkout Session IDの末尾8文字だけを照合用に使う。

| 順位 | 決済日時(JST) | Session末尾8文字 | 金額 | 外部顧客確認 | 返金 | 相談予約 | 相談実施 | LINEフォロー | 備考 |
|---:|---|---|---:|---|---|---|---|---|---|

## 毎日09:00の確認

- [ ] Stripeの支払済みCheckoutを`metadata.campaign=august_2026`で確認
- [ ] Webhook失敗とPro未反映を管理画面で確認
- [ ] 前日の閲覧→登録→Checkout→購入の最大離脱点を特定
- [ ] 公開SNSで個別性のある回答を最大10件
- [ ] 実物が分かる投稿を最大2件
- [ ] 同文大量投稿、無差別DM、無関係な宣伝をしていない
- [ ] 6件到達時は超過同時決済も特典対象にしてから特典受付を閉じる

## 判断ルール

- 閲覧0: 投稿の入口と配信場所を変える。
- 閲覧あり・登録0: 対象者と価値提案を明確にする。
- 登録あり・Checkout0: 価格、返金、内容の説明を改善する。
- Checkoutあり・購入0: Stripe表示と技術エラーを最優先で確認する。
- 8月5日時点で購入2件未満: 値下げせず、20分相談の無料体験枠で信頼形成する。

## 6件到達時の手順

1. Stripeで`metadata.campaign=august_2026`かつ支払済みの外部顧客取引を決済時刻順に並べる。
2. 6件目と同時刻帯の超過購入も特典対象として台帳へ記録する。
3. Vercel Productionの`AUGUST_2026_BONUS_OPEN`を`false`へ変更する。
4. 同じ検証済みcommitを再deployする。
5. 公開ページが「相談特典の受付は終了しました。」を表示し、通常の6か月購入だけを案内することを確認する。

## 目標達成の証跡

| 確認日 | 外部顧客売上総額(JPY) | Stripe手数料(JPY) | 返金(JPY) | 純額(JPY) | 日銀USD/JPY | 純額(USD) | 証跡 |
|---|---:|---:|---:|---:|---:|---:|---|

計算式は`純額(JPY) = 売上総額 - Stripe手数料 - 返金`、`純額(USD) = 純額(JPY) ÷ 日銀USD/JPY`とする。日銀の公表ページURLと確認日を証跡欄へ記録する。
```

- [ ] **Step 2: 個別性を保つ投稿・返信原稿を書く**

Create `docs/operations/2026-august-revenue-outreach.md` with:

- A launch post centered on `参考書の3章で止まる`.
- A demonstration post centered on one interactive topic and the public question bank.
- A deadline reminder that accurately says `8月10日まで` and does not invent remaining slots.
- A reply framework: acknowledge the specific problem, give one useful answer, ask one diagnostic question, offer the campaign link only after interest.
- Five concrete reply examples for planning, terminology, past-exam score, lack of time, and test anxiety.
- A prohibited list: copy-paste mass replies, unsolicited DM, fabricated scarcity, guaranteed passing, disguised affiliate-style claims, collection of email addresses in public replies.
- The exact campaign URL and UTM-free default link.

Use natural Japanese, keep each public post under 240 Japanese characters, and include no unsupported result claims.

- [ ] **Step 3: placeholderと個人情報欄を検査する**

Run:

```bash
rg -n "FIXME|XXX|未定|後で追記" docs/operations/2026-august-revenue-campaign-log.md docs/operations/2026-august-revenue-outreach.md
rg -n "個人情報をこのGit管理ファイルへ記録しない" docs/operations/2026-august-revenue-campaign-log.md
```

Expected: the first command has no matches; the second command matches the privacy guard exactly once.

- [ ] **Step 4: Task 7だけをcommitする**

```bash
git add docs/operations/2026-august-revenue-campaign-log.md docs/operations/2026-august-revenue-outreach.md
git commit -m "docs: add August campaign operations playbook"
```

---

### Task 8: 全体検証とローカルの購入導線スモーク

**Files:**
- Review: Tasks 1–7の全変更
- Review: `app/api/billing/webhook/route.ts`
- Review: `app/api/billing/status/route.ts`
- Review: `app/auth/callback/route.ts`

**Interfaces:**
- Produces a regression-clean, production-buildable campaign
- Does not change webhook entitlement rules

- [ ] **Step 1: 対象テストをまとめて実行する**

Run:

```bash
npx vitest run test/august2026Campaign.test.ts test/publicRoutes.test.ts test/billingCheckout.test.ts test/August2026Checkout.test.tsx test/August2026CampaignPage.test.tsx test/PublicLegalPages.test.tsx test/LandingPageCampaign.test.tsx test/BillingSection.test.tsx test/billingWebhook.test.ts test/billingAtomicPurchase.test.ts
```

Expected: zero failures.

- [ ] **Step 2: 全テスト・型・Lint・buildを実行する**

Run one at a time so failures remain attributable:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: every command exits 0. If an unrelated pre-existing failure occurs, record the exact command and output before deciding whether it blocks deployment; do not edit unrelated user work to hide it.

- [ ] **Step 3: 実装制約を静的に確認する**

Run:

```bash
rg -n "6600|6,600|合格保証|guarantee" app/campaign components/campaign app/legal app/privacy app/lp
rg -n "august_2026" app/api/billing/checkout/route.ts lib/campaign test
rg -n "STRIPE_PRICE_ID_PRO_6M|one_6m" app/api/billing/checkout/route.ts lib/campaign
git diff --check
git status --short
```

Expected:

- 6,600円の旧提案が公開UIにない。
- `合格を保証するものではありません`以外の保証表現がない。
- Campaign key is restricted in the route and tests.
- Only existing `one_6m` Price env is used.
- No whitespace errors.
- Pre-existing `.gitignore`, `.projects/`, and `PastExamRunner.tsx` changes remain unstaged and untouched.

- [ ] **Step 4: ローカルまたはPreviewで非決済スモークを行う**

Check:

1. `/campaign/august-2026` returns 200 logged out.
2. `/legal/tokusho` and `/privacy` return 200 logged out.
3. Login link contains `next=/campaign/august-2026`.
4. Campaign CTA POSTs `one_6m` and fixed campaign key.
5. Cancel display says no charge/plan change.
6. Success display says confirming until Pro status becomes true.
7. Expired/manual-closed state removes bonus metadata but leaves normal 6-month purchase.
8. Mobile width 390px has no horizontal overflow; CTA and legal links remain keyboard accessible.

- [ ] **Step 5: 必要な修正を小さくcommitする**

If verification required code changes:

```bash
git diff --name-only
git add app/campaign components/campaign app/legal app/privacy lib/campaign lib/auth/publicRoutes.ts app/api/billing/checkout/route.ts test
git commit -m "fix: harden August campaign flow"
```

Before the `git add`, verify every listed diff belongs to the campaign. If a fix touched fewer paths, remove the untouched paths from the command. Never use `git add -A` or `git add .`. If no fix is needed, do not create an empty commit.

---

### Task 9: Vercel本番公開とStripe非決済スモーク

**Files:**
- Review: deployment configuration and Vercel project link
- Modify only if required: Vercel environment `AUGUST_2026_BONUS_OPEN`

**Interfaces:**
- Produces a production deployment
- Verifies real Stripe Checkout without making a self-purchase

- [ ] **Step 1: CLIとプロジェクトの安全確認をする**

Run:

```bash
vercel --version
vercel project inspect
vercel env ls
```

Require Vercel CLI 58.0.0 or newer before mutating production. Confirm the linked project is the existing `it-learning-app`; do not create a second project.

- [ ] **Step 2: 本番の必須環境変数の存在だけを確認する**

Confirm names without printing values:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_LINE_ADD_FRIEND_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_PRO_6M`
- `STRIPE_WEBHOOK_SECRET`
- Supabase variables already required by production auth

Set `AUGUST_2026_BONUS_OPEN=true` for Production only if absent. Do not overwrite any Stripe or Supabase secret.

- [ ] **Step 3: 現在のcampaign commitsだけを公開する**

Before deploy:

```bash
git log --oneline -10
git status --short
git diff --cached --name-only
```

Do not include the unrelated dirty files. Deploy the exact verified commit using the repository's existing Vercel workflow. If direct CLI deployment is required:

```bash
vercel deploy --prod
```

Record the resulting production deployment URL.

- [ ] **Step 4: 公開ページをスモークする**

Verify HTTP 200 and visible copy at:

- `https://it-learning-app.vercel.app/campaign/august-2026`
- `https://it-learning-app.vercel.app/legal/tokusho`
- `https://it-learning-app.vercel.app/privacy`
- `https://it-learning-app.vercel.app/lp`

Check the campaign CTA, legal links, mobile layout, and logged-out login return path.

- [ ] **Step 5: 本番Stripe Checkoutを決済直前まで確認する**

With a real logged-in test account:

1. Open the campaign page.
2. Start checkout.
3. Confirm product/price: Pro 6か月, 3,480円.
4. Confirm payment mode is one-time and no recurring charge is shown.
5. Confirm the custom submit message contains refund/legal terms.
6. Inspect the Checkout Session in Stripe and confirm `metadata.campaign=august_2026`, `metadata.plan_key=one_6m`, and the correct internal user reference.
7. Press cancel; do not enter or submit a real payment.
8. Confirm the app shows cancellation and no entitlement/purchase record changed.

- [ ] **Step 6: Webhookと運用開始状態を確認する**

Confirm the existing production webhook endpoint remains enabled and has no new failures. Add the first dated row to the local operations log only after the first real outreach activity occurs; do not fabricate zero-value activity.

- [ ] **Step 7: 公開結果を報告する**

Report:

- production campaign URL
- legal/privacy URLs
- exact verified test commands
- production deployment identifier
- Stripe Checkout observations without secret values
- any manual action still required from the operator
- explicit statement that no self-purchase was counted

Do not mark the revenue goal complete until external-customer Stripe transactions, fees, and the Bank of Japan exchange rate prove at least 100 USD equivalent net by the deadline.
