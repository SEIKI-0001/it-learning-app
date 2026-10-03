/**
 * 流入元 Cookie（fq_attr）の生成と検証。ブラウザとサーバーの両方から使う純粋関数だけを置く。
 * 値は英数と . _ - だけに正規化し、長さも制限する（個人を特定する情報は扱わない）。
 */
export const ATTRIBUTION_COOKIE = "fq_attr";
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Attribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  ref: string | null;
  referrerHost: string | null;
  landingPath: string | null;
  firstSeenAt: string | null;
};

/** Cookie に載せる短縮形（JSON）。 */
type AttributionCookieShape = {
  s?: unknown;
  m?: unknown;
  c?: unknown;
  r?: unknown;
  rh?: unknown;
  lp?: unknown;
  t?: unknown;
};

const TOKEN_RE = /^[A-Za-z0-9._-]{1,64}$/;
const HOST_RE = /^[A-Za-z0-9.-]{1,255}$/;
const PATH_RE = /^\/[A-Za-z0-9/._~%-]{0,254}$/;

function token(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return TOKEN_RE.test(v) ? v.toLowerCase() : null;
}

function host(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return HOST_RE.test(v) ? v : null;
}

function path(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return PATH_RE.test(value) ? value : null;
}

function isoTime(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Cookie の生値を検証して Attribution にする。何も有効な値が無ければ null。 */
export function parseAttributionCookie(raw: string | null | undefined): Attribution | null {
  if (!raw) return null;
  let parsed: AttributionCookieShape;
  try {
    const decoded = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) return null;
    parsed = decoded as AttributionCookieShape;
  } catch {
    return null;
  }
  const attr: Attribution = {
    utmSource: token(parsed.s),
    utmMedium: token(parsed.m),
    utmCampaign: token(parsed.c),
    ref: token(parsed.r),
    referrerHost: host(parsed.rh),
    landingPath: path(parsed.lp),
    firstSeenAt: isoTime(parsed.t),
  };
  const hasSignal =
    attr.utmSource || attr.utmMedium || attr.utmCampaign || attr.ref || attr.referrerHost;
  return hasSignal ? attr : null;
}

/**
 * ブラウザ側で Cookie に入れる値を作る（純粋関数。テスト可能にするため分離）。
 * 記録すべき手がかり（utm / ref / 外部 referrer）が無ければ null。
 */
export function buildAttributionCookieValue(input: {
  search: string;
  pathname: string;
  referrer: string;
  currentHost: string;
  now: number;
}): string | null {
  const params = new URLSearchParams(input.search);
  let referrerHost: string | null = null;
  if (input.referrer) {
    try {
      const h = new URL(input.referrer).hostname.toLowerCase();
      if (h && h !== input.currentHost.toLowerCase()) referrerHost = host(h);
    } catch {
      referrerHost = null;
    }
  }
  const shape = {
    s: token(params.get("utm_source")),
    m: token(params.get("utm_medium")),
    c: token(params.get("utm_campaign")),
    r: token(params.get("ref")),
    rh: referrerHost,
    lp: path(input.pathname),
    t: input.now,
  };
  if (!shape.s && !shape.m && !shape.c && !shape.r && !shape.rh) return null;
  return encodeURIComponent(JSON.stringify(shape));
}
