import { redirect } from "next/navigation";
import Link from "next/link";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import Icon from "@/components/ui/Icon";
import { FREE_RECORDING_DAYS } from "@/lib/billing/constants";
import { getInternalUserId } from "@/lib/auth/currentUser";
import { AUGUST_2026_CAMPAIGN } from "@/lib/campaign/august2026";
import FunnelTracker from "@/components/growth/FunnelTracker";
import { FUNNEL_PLACEMENTS } from "@/lib/growth/funnel";

// 初回登録・ログインページ。未ログインで Web を開くと proxy がここへ誘導する。
// LP の「無料で始める」の直後に見る画面なので、紹介の繰り返しはせず
// 「無料であること・この後の流れ・登録ボタン」だけを最初の画面に収める。
// Google と LINE は同格の入口。既存ユーザー向けの使い分けは折りたたみに置く。
// 認証セッションは Cookie 管理のため、このページは常に動的に評価する。
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; from?: string }>;
}) {
  const sp = await searchParams;
  // オープンリダイレクト防止: アプリ内パスのみ許可。
  const next =
    sp?.next && sp.next.startsWith("/") && !/^\/[/\\]/.test(sp.next) ? sp.next : "/";

  // 既にログイン済みなら遷移先へ（公開解説の「記録する」からは、そのテーマのレッスンへ）。
  const userId = await getInternalUserId();
  if (userId) redirect(next);
  const campaignContinuation = next === AUGUST_2026_CAMPAIGN.path;
  // 無料体験（/lp/try）の「登録」から来た人。見出しと戻り先だけを体験の続きに合わせる。
  const fromTrial = sp?.from === "trial";

  const googleEnabled = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const lineUrl = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL?.trim() || "";
  const lineActionClassName =
    campaignContinuation && googleEnabled
      ? "flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-4 text-center text-base font-medium text-gray-900 transition hover:bg-gray-50 active:scale-[0.99]"
      : "flex w-full items-center justify-center gap-2 rounded-lg bg-[#06C755] px-6 py-4 text-center text-base font-semibold text-white transition active:scale-[0.99]";

  const freeDays = FREE_RECORDING_DAYS;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <FunnelTracker />
      {/* LP から来た人が「戻れる」ことと「同じサービスの続き」だと分かるよう、LP と同じ名前を上に置く */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-12 w-full max-w-md items-center justify-between px-4">
          <a
            href={fromTrial ? "/lp/try" : "/lp"}
            className="-ml-1 flex items-center gap-1 rounded px-1 py-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            {fromTrial ? "体験に戻る" : "紹介ページ"}
          </a>
          <span className="text-sm font-semibold tracking-tight text-gray-900">
            ITパスポート学習コーチ
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-4 pb-12 pt-7 md:pt-12">
        <p className="text-xs font-semibold text-brand-700">
          {fromTrial ? "体験の続きから" : "無料ではじめる"}
        </p>
        <h1 className="mt-1.5 text-[22px] font-bold leading-snug tracking-tight">
          {fromTrial ? "登録して、学習を続けましょう" : "登録して、今日の学習をはじめましょう"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          登録は無料・クレジットカード不要。教材と公式過去問はずっと無料で、学習記録も最初の{freeDays}日間は無料です。
        </p>

        {/* この後の流れ。今いる段（登録）だけを濃くする */}
        <ol className="mt-5 grid grid-cols-3 gap-1.5" aria-label="はじめるまでの流れ">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              aria-current={i === 0 ? "step" : undefined}
              className={`rounded-lg px-2.5 py-2 ${
                i === 0 ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-600"
              }`}
            >
              <span
                className={`block text-[11px] tabular-nums ${i === 0 ? "text-gray-300" : "text-gray-400"}`}
              >
                STEP {i + 1}
              </span>
              <span className="block text-[13px] font-semibold leading-tight">{step.title}</span>
              <span
                className={`mt-0.5 block text-[11px] ${i === 0 ? "text-gray-300" : "text-gray-500"}`}
              >
                {step.note}
              </span>
            </li>
          ))}
        </ol>

        {campaignContinuation && (
          <div className="mt-5 rounded-xl bg-brand-50 px-4 py-4 text-left">
            <p className="font-medium">ログイン後、購入ページへ戻ります</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Googleログインなら購入ページへ戻れます。LINEは購入後の相談特典の受け取りにも利用できます。
            </p>
          </div>
        )}

        {/* ログイン手段。新規も既存も同じボタンで、アカウントが無ければそのまま作られる */}
        <div className="mt-6 space-y-3">
          {googleEnabled ? (
            <GoogleLoginButton next={next} label="Google で続ける" />
          ) : (
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Google ログインは現在準備中です。LINE から始めてください。
            </div>
          )}

          {lineUrl ? (
            <div>
              <a
                href={lineUrl}
                data-funnel-event="login_start"
                data-funnel={FUNNEL_PLACEMENTS.loginLine}
                className={lineActionClassName}
              >
                <LineMark />
                LINE で続ける
              </a>
              <p className="mt-1.5 text-center text-xs text-gray-500">
                LINE なら、毎日の学習の案内とリマインドが届きます
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              LINE公式アカウントのURLが未設定です（NEXT_PUBLIC_LINE_ADD_FRIEND_URL）。
            </div>
          )}
        </div>

        {/* 利用開始時の規約同意 */}
        <p className="mt-5 text-center text-xs leading-relaxed text-gray-500">
          続けることで、
          <Link href="/terms" className="underline underline-offset-2">利用規約</Link>
          と
          <Link href="/privacy" className="underline underline-offset-2">プライバシーポリシー</Link>
          に同意したものとみなします。
        </p>

        {/* 既存ユーザー・使い分けの説明は初見の人には要らないので畳む */}
        <details className="group mt-8 border-t border-gray-100 pt-4 text-sm text-gray-600">
          <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-gray-800 [&::-webkit-details-marker]:hidden">
            すでに使っている方・GoogleとLINEの違い
            <Icon
              name="chevron-down"
              className="h-4 w-4 text-gray-400 transition group-open:rotate-180"
            />
          </summary>
          <ul className="mt-3 space-y-2 leading-relaxed">
            <li>
              Google で続けると、Web をどの端末で開いても同じ続きから使えます（学習履歴・復習・単語帳・AI採点 Pro を引き継ぎ）。
            </li>
            <li>LINE で始めた方は、LINE のメッセージにあるリンクから開くと続きから使えます。</li>
            <li>
              LINE で始めた記録は、Google で続けた後に「設定」の連携コードでまとめられます。
            </li>
          </ul>
        </details>
      </div>
    </main>
  );
}

const STEPS = [
  { title: "登録", note: "30秒" },
  { title: "初回設定", note: "約1分" },
  { title: "今日の学習", note: "解説と問題" },
] as const;

function LineMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 3C6.48 3 2 6.6 2 11.04c0 3.98 3.55 7.31 8.35 7.94.33.07.77.21.88.49.1.25.07.64.03.9l-.14.85c-.04.25-.2.98.86.53 1.06-.45 5.73-3.37 7.82-5.78C21.27 14.4 22 12.8 22 11.04 22 6.6 17.52 3 12 3Z" />
    </svg>
  );
}
