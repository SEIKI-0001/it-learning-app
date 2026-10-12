/**
 * 公開ページ（/kakomon・/kaisetsu・/guide・/words・/lp）の回遊計測。
 *
 * 「過去問 → 図解解説 → LP / 登録」のどこで人が落ちているかを数えるためのイベント。
 * 登録した人の流入元は別途 signup_attributions（first-touch）が持つので、ここでは
 * 登録前の行動（閲覧・解答を開く・内部リンクのクリック）だけを扱う。
 *
 * 個人を特定する情報は扱わない。visitor_id はブラウザが作る乱数で、アカウントとは結びつけない。
 * 値は英数と . _ - / だけに正規化し、長さも制限する。ブラウザとサーバーの両方から使う純粋関数。
 */

export const FUNNEL_EVENTS = ["view", "answer_open", "click"] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

/** リンクの置き場所（data-funnel 属性）。どの位置のリンクが押されたかを比べるのに使う。 */
export const FUNNEL_PLACEMENTS = {
  /** 過去問の解説を開いた中の「図解で解説を見る」 */
  kakomonAnswerKaisetsu: "kakomon_answer_kaisetsu",
  /** 過去問ページ下部の「この問題のテーマを基礎から学ぶ」 */
  kakomonBottomKaisetsu: "kakomon_bottom_kaisetsu",
  /** GuideCTA の「無料で始める」 */
  ctaStart: "cta_start",
  /** GuideCTA の「勉強アプリの機能と料金を見る」 */
  ctaLp: "cta_lp",
} as const;

export const FUNNEL_VISITOR_KEY = "fq_vid";

export type FunnelInput = {
  event: FunnelEvent;
  path: string;
  targetPath: string | null;
  placement: string | null;
  refPath: string | null;
  referrerHost: string | null;
  visitorId: string | null;
};

const TOKEN_RE = /^[a-z0-9._-]{1,64}$/;
const VISITOR_RE = /^[a-z0-9]{8,32}$/;
const HOST_RE = /^[a-z0-9.-]{1,255}$/;
const PATH_RE = /^\/[A-Za-z0-9/._~%-]{0,254}$/;

function token(value: unknown, re = TOKEN_RE): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return re.test(v) ? v : null;
}

function path(value: unknown): string | null {
  return typeof value === "string" && PATH_RE.test(value) ? value : null;
}

/** 受け取った本文を検証する。不正なら null（サーバーは黙って捨てる）。 */
export function parseFunnelInput(raw: unknown): FunnelInput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const event = FUNNEL_EVENTS.find((e) => e === r.event);
  const p = path(r.path);
  if (!event || !p) return null;
  const targetPath = path(r.targetPath);
  if (event === "click" && !targetPath) return null;
  return {
    event,
    path: p,
    targetPath: event === "click" ? targetPath : null,
    placement: token(r.placement),
    refPath: event === "view" ? path(r.refPath) : null,
    referrerHost: event === "view" ? token(r.referrerHost, HOST_RE) : null,
    visitorId: token(r.visitorId, VISITOR_RE),
  };
}

/** 検索エンジン等のクローラー。回遊の母数を水増しするので記録しない。 */
const BOT_UA_RE = /bot|crawl|spider|slurp|preview|lighthouse|headless|facebookexternalhit|curl|wget/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  return !ua || BOT_UA_RE.test(ua);
}

/**
 * 直前のページ（document.referrer）を「自サイト内のパス」か「外部ホスト名」に分ける。
 * 外部はホスト名だけを残す（パスやクエリは保存しない）。
 */
export function splitReferrer(
  referrer: string,
  currentHost: string,
): { refPath: string | null; referrerHost: string | null } {
  if (!referrer) return { refPath: null, referrerHost: null };
  try {
    const u = new URL(referrer);
    if (u.hostname.toLowerCase() === currentHost.toLowerCase()) {
      return { refPath: path(u.pathname), referrerHost: null };
    }
    return { refPath: null, referrerHost: token(u.hostname, HOST_RE) };
  } catch {
    return { refPath: null, referrerHost: null };
  }
}
