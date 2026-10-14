/**
 * 集客分析（/admin/acquisition）の集計。DB には触れない純粋関数だけを置く（取得は acquisitionData.ts）。
 *
 * 数え方は scripts/acquisition/signup-sources.sql と同じにしてある（数値の突き合わせ用）:
 *   登録     … 期間内に作られた line_users（merged_into is null・除外アカウントを除く）
 *   流入元   … coalesce(utm_source, referrer_host, '(none)')（signup_attributions = first-touch）
 *   学習開始 … そのアカウントの question_attempts が 1 件以上
 *   再学習   … 回答日（answered_at の JST 日付）が 2 日以上
 *
 * 訪問は public_funnel_events の view のうち、外部から公開ページに入ったもの（ref_path が無い）を
 * 端末の乱数 visitor_id で重複除去して数える。
 *
 * 投稿別は X 自動投稿（docs/operations/x-organic-posting.md）の取り決めに乗る。既存テーブルは変えない:
 *   投稿リンク … utm_source=x&utm_medium=social&utm_campaign=organic_x&utm_content=x-<UUID>&ref=x-<UUID>
 *   登録       … signup_attributions.ref に投稿 ID（first-touch）
 *   訪問       … 入口の view の public_funnel_events.placement に投稿 IDvisitor_id はアカウントと結びつかないので、
 * 「訪問 → 登録」の比は同じ人を追った転換率ではなく、別々に数えた 2 つの数の比（参考値）にすぎない。
 */

export const ACQUISITION_PERIODS = [7, 30, 90] as const;
export type AcquisitionPeriod = (typeof ACQUISITION_PERIODS)[number];
export const DEFAULT_ACQUISITION_PERIOD: AcquisitionPeriod = 30;

export const ACQUISITION_CHANNELS = ["x", "search", "note", "other"] as const;
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];

export const CHANNEL_LABELS: Record<AcquisitionChannel, string> = {
  x: "X",
  search: "自然検索",
  note: "note",
  other: "その他・不明",
};

/** 流入元の手がかりが無い登録・訪問（signup-sources.sql の '(none)' と同じ）。 */
export const NO_SOURCE = "(none)";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseAcquisitionPeriod(raw: string | null | undefined): AcquisitionPeriod {
  const n = Number(raw);
  return (ACQUISITION_PERIODS as readonly number[]).includes(n)
    ? (n as AcquisitionPeriod)
    : DEFAULT_ACQUISITION_PERIOD;
}

/** 期間の開始 = 今日（JST）を含めて days 日前の JST 0 時。 */
export function acquisitionPeriodStart(days: AcquisitionPeriod, now: number): Date {
  const nowJst = new Date(now + JST_OFFSET_MS);
  const todayStartUtc =
    Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate()) - JST_OFFSET_MS;
  return new Date(todayStartUtc - (days - 1) * DAY_MS);
}

/** ISO 時刻の JST 日付（YYYY-MM-DD）。 */
export function jstDate(iso: string): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t + JST_OFFSET_MS).toISOString().slice(0, 10);
}

const X_SOURCES = new Set(["x", "twitter", "t.co"]);
const X_HOSTS = new Set(["x.com", "t.co", "twitter.com", "mobile.twitter.com", "mobile.x.com"]);
const NOTE_HOSTS = new Set(["note.com", "note.mu"]);
const SEARCH_SOURCES = new Set(["google", "bing", "yahoo", "duckduckgo", "ecosia", "brave"]);
/** 検索結果からの流入。search.google.com は Search Console（運営の確認作業）なので含めない。 */
const SEARCH_HOST_RE =
  /^(?:www\.)?(?:google\.[a-z.]+|bing\.com|duckduckgo\.com|ecosia\.org)$|^(?:search\.yahoo\.co\.jp|search\.yahoo\.com|search\.brave\.com|cn\.bing\.com)$/;

/** utm_source を優先し、無ければ外部 referrer のホスト名でチャネルを決める。 */
export function classifyChannel(input: {
  utmSource: string | null;
  referrerHost: string | null;
}): AcquisitionChannel {
  const source = input.utmSource?.toLowerCase() ?? null;
  if (source) {
    if (X_SOURCES.has(source) || X_HOSTS.has(source)) return "x";
    if (source === "note" || NOTE_HOSTS.has(source)) return "note";
    if (SEARCH_SOURCES.has(source)) return "search";
    return "other";
  }
  const host = input.referrerHost?.toLowerCase() ?? null;
  if (!host) return "other";
  if (X_HOSTS.has(host)) return "x";
  if (NOTE_HOSTS.has(host) || host.endsWith(".note.com")) return "note";
  if (SEARCH_HOST_RE.test(host)) return "search";
  return "other";
}

/** X 自動投稿の投稿 ID（lib/growth/xPosting/core.ts の buildPostUrl と同じ形）。 */
const X_POST_ID_RE = /^x-[a-z0-9-]{1,60}$/;
export const X_ORGANIC = { source: "x", medium: "social", campaign: "organic_x" } as const;

export function isXPostId(value: string | null | undefined): value is string {
  return typeof value === "string" && X_POST_ID_RE.test(value);
}

export function sourceKey(utmSource: string | null, referrerHost: string | null): string {
  return utmSource ?? referrerHost ?? NO_SOURCE;
}

export type SignupInput = {
  userId: string;
  createdAt: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  /** 招待コード（beta）か X 投稿 ID（x-<UUID>）。 */
  ref: string | null;
  referrerHost: string | null;
  betaGrantedAt: string | null;
};

export type AttemptInput = { userId: string; answeredAt: string };

/** public_funnel_events の view 1 件。 */
export type VisitInput = {
  refPath: string | null;
  referrerHost: string | null;
  visitorId: string | null;
  /** 入口の view では X 投稿 ID が入る（それ以外の view では null）。 */
  placement: string | null;
};

export type Metrics = {
  /** 訪問（重複除去した端末数）。取得できなかったときは null。 */
  visits: number | null;
  signups: number;
  activated: number;
  returned: number;
};

export type ChannelRow = Metrics & { channel: AcquisitionChannel; label: string };
export type SourceRow = Metrics & {
  channel: AcquisitionChannel;
  source: string;
  campaign: string | null;
  betaGranted: number;
};
export type PostRow = Metrics & {
  channel: AcquisitionChannel;
  source: string;
  medium: string | null;
  campaign: string | null;
  /** 投稿 ID（X 自動投稿の x-<UUID>）。キャンペーン単位の行では null。 */
  content: string | null;
  /** x_social_posts から引いた投稿の情報（取れなければ null）。 */
  post: XPostInfo | null;
};

export type XPostInfo = {
  scheduledAt: string | null;
  theme: string | null;
  status: string | null;
  postUrl: string | null;
};

export type AcquisitionReport = {
  period: { days: AcquisitionPeriod; startAt: string; endAt: string };
  totals: Metrics & { betaGranted: number };
  channels: ChannelRow[];
  sources: SourceRow[];
  posts: PostRow[];
  excluded: { users: number; visitors: number };
};

type Bucket = { visitors: Set<string>; signups: number; activated: number; returned: number; beta: number };

function emptyBucket(): Bucket {
  return { visitors: new Set(), signups: 0, activated: 0, returned: 0, beta: 0 };
}

function bucketOf<K>(map: Map<K, Bucket>, key: K): Bucket {
  let b = map.get(key);
  if (!b) {
    b = emptyBucket();
    map.set(key, b);
  }
  return b;
}

function metrics(b: Bucket, visitsKnown: boolean): Metrics {
  return {
    visits: visitsKnown ? b.visitors.size : null,
    signups: b.signups,
    activated: b.activated,
    returned: b.returned,
  };
}

const SEP = "\u0000";

export function buildAcquisitionReport(input: {
  days: AcquisitionPeriod;
  startAt: Date;
  now: number;
  signups: SignupInput[];
  attempts: AttemptInput[];
  /** 取得に失敗したときは null（訪問の列を「—」にする）。 */
  visits: VisitInput[] | null;
  /** 投稿 ID → x_social_posts の情報。 */
  xPosts?: ReadonlyMap<string, XPostInfo>;
  excludedUserIds?: ReadonlySet<string>;
  excludedVisitorIds?: ReadonlySet<string>;
}): AcquisitionReport {
  const excludedUsers = input.excludedUserIds ?? new Set<string>();
  const excludedVisitors = input.excludedVisitorIds ?? new Set<string>();
  const visitsKnown = input.visits !== null;

  // ユーザーごとの回答数・回答日数
  const study = new Map<string, { answers: number; days: Set<string> }>();
  for (const a of input.attempts) {
    let s = study.get(a.userId);
    if (!s) {
      s = { answers: 0, days: new Set() };
      study.set(a.userId, s);
    }
    s.answers += 1;
    const d = jstDate(a.answeredAt);
    if (d) s.days.add(d);
  }

  const total = emptyBucket();
  const byChannel = new Map<AcquisitionChannel, Bucket>();
  const bySource = new Map<string, Bucket>();
  const byPost = new Map<string, Bucket>();
  let excludedUserCount = 0;

  for (const s of input.signups) {
    if (excludedUsers.has(s.userId)) {
      excludedUserCount += 1;
      continue;
    }
    const st = study.get(s.userId);
    const activated = (st?.answers ?? 0) >= 1 ? 1 : 0;
    const returned = (st?.days.size ?? 0) >= 2 ? 1 : 0;
    const beta = s.betaGrantedAt ? 1 : 0;
    const channel = classifyChannel(s);
    const source = sourceKey(s.utmSource, s.referrerHost);
    const buckets = [
      total,
      bucketOf(byChannel, channel),
      bucketOf(bySource, [channel, source, s.utmCampaign ?? ""].join(SEP)),
    ];
    const postId = isXPostId(s.ref) ? s.ref : null;
    if (s.utmCampaign || postId) {
      buckets.push(
        bucketOf(byPost, [channel, source, s.utmMedium ?? "", s.utmCampaign ?? "", postId ?? ""].join(SEP)),
      );
    }
    for (const b of buckets) {
      b.signups += 1;
      b.activated += activated;
      b.returned += returned;
      b.beta += beta;
    }
  }

  let excludedVisitorCount = 0;
  const seenExcluded = new Set<string>();
  (input.visits ?? []).forEach((v, i) => {
    // 自サイト内の移動は「訪問」ではない（外部・直接から入った最初の view だけを数える）。
    if (v.refPath) return;
    if (v.visitorId && excludedVisitors.has(v.visitorId)) {
      if (!seenExcluded.has(v.visitorId)) {
        seenExcluded.add(v.visitorId);
        excludedVisitorCount += 1;
      }
      return;
    }
    // 端末 ID を保存できない環境の view は 1 件 = 1 訪問として数える。
    const visitor = v.visitorId ?? `event:${i}`;
    // X 投稿のリンクから入った view は、X アプリが referrer を落としても投稿 ID で X に寄せる。
    const postId = isXPostId(v.placement) ? v.placement : null;
    const utmSource = postId ? X_ORGANIC.source : null;
    const campaign = postId ? X_ORGANIC.campaign : "";
    const channel = classifyChannel({ utmSource, referrerHost: v.referrerHost });
    const source = sourceKey(utmSource, v.referrerHost);
    const buckets = [
      total,
      bucketOf(byChannel, channel),
      bucketOf(bySource, [channel, source, campaign].join(SEP)),
    ];
    if (postId) {
      buckets.push(bucketOf(byPost, [channel, source, X_ORGANIC.medium, campaign, postId].join(SEP)));
    }
    for (const b of buckets) b.visitors.add(visitor);
  });

  const order = (a: Metrics, b: Metrics) =>
    b.signups - a.signups || (b.visits ?? 0) - (a.visits ?? 0);

  return {
    period: {
      days: input.days,
      startAt: input.startAt.toISOString(),
      endAt: new Date(input.now).toISOString(),
    },
    totals: { ...metrics(total, visitsKnown), betaGranted: total.beta },
    channels: ACQUISITION_CHANNELS.map((channel) => ({
      channel,
      label: CHANNEL_LABELS[channel],
      ...metrics(byChannel.get(channel) ?? emptyBucket(), visitsKnown),
    })),
    sources: [...bySource.entries()]
      .map(([key, b]) => {
        const [channel, source, campaign] = key.split(SEP);
        return {
          channel: channel as AcquisitionChannel,
          source,
          campaign: campaign || null,
          betaGranted: b.beta,
          ...metrics(b, visitsKnown),
        };
      })
      .sort((a, b) => order(a, b) || a.source.localeCompare(b.source)),
    posts: [...byPost.entries()]
      .map(([key, b]) => {
        const [channel, source, medium, campaign, content] = key.split(SEP);
        return {
          channel: channel as AcquisitionChannel,
          source,
          medium: medium || null,
          campaign: campaign || null,
          content: content || null,
          post: (content && input.xPosts?.get(content)) || null,
          ...metrics(b, visitsKnown),
        };
      })
      .sort(
        (a, b) =>
          order(a, b) ||
          (a.campaign ?? "").localeCompare(b.campaign ?? "") ||
          (a.content ?? "").localeCompare(b.content ?? ""),
      ),
    excluded: { users: excludedUserCount, visitors: excludedVisitorCount },
  };
}

/** 「1,2」のような環境変数を Set にする。UUID / 端末 ID の形に合わないものは捨てる。 */
export function parseIdList(raw: string | undefined, kind: "uuid" | "visitor"): Set<string> {
  const re =
    kind === "uuid"
      ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      : /^[a-z0-9]{8,32}$/;
  return new Set(
    (raw ?? "")
      .split(/[\s,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => re.test(s)),
  );
}

// ---------------------------------------------------------------- CSV

const CSV_COLUMNS = [
  "section",
  "period_start",
  "period_end",
  "channel",
  "source",
  "medium",
  "campaign",
  "content",
  "visits",
  "signups",
  "activated",
  "returned",
  "beta_granted",
  "post_scheduled_at",
  "post_theme",
  "post_url",
] as const;

/** Excel 等で数式として解釈されないよう、先頭の = + - @ をエスケープしてから引用する。 */
export function csvCell(value: string | number | null): string {
  if (value === null) return "";
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function acquisitionReportToCsv(report: AcquisitionReport): string {
  const { startAt, endAt } = report.period;
  const rows: (string | number | null)[][] = [];
  const push = (
    section: string,
    r: Metrics & { betaGranted?: number; post?: XPostInfo | null },
    dims: { channel?: string; source?: string; medium?: string | null; campaign?: string | null; content?: string | null },
  ) =>
    rows.push([
      section,
      startAt,
      endAt,
      dims.channel ?? null,
      dims.source ?? null,
      dims.medium ?? null,
      dims.campaign ?? null,
      dims.content ?? null,
      r.visits,
      r.signups,
      r.activated,
      r.returned,
      r.betaGranted ?? null,
      r.post?.scheduledAt ?? null,
      r.post?.theme ?? null,
      r.post?.postUrl ?? null,
    ]);

  push("total", report.totals, {});
  for (const c of report.channels) push("channel", c, { channel: c.channel });
  for (const s of report.sources)
    push("source", s, { channel: s.channel, source: s.source, campaign: s.campaign });
  for (const p of report.posts)
    push("post", p, {
      channel: p.channel,
      source: p.source,
      medium: p.medium,
      campaign: p.campaign,
      content: p.content,
    });

  const lines = [CSV_COLUMNS.join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  // 先頭の BOM は Excel で開いたときの文字化け防止。
  return `﻿${lines.join("\r\n")}\r\n`;
}
