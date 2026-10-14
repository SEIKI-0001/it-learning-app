/**
 * 集客分析の取得（サーバー専用・service role）。集計は lib/growth/acquisition.ts の純粋関数に任せる。
 *
 * テスト・運営アカウントの除外は環境変数で指定する（UUID を Git に入れないため。
 * scripts/acquisition/*.sql の excluded_user_ids と同じ値を入れる）:
 *   ACQUISITION_EXCLUDED_USER_IDS    … line_users.id（カンマ/空白区切り）
 *   ACQUISITION_EXCLUDED_VISITOR_IDS … 運営の端末の fq_vid（localStorage）。訪問の数から除く
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  acquisitionPeriodStart,
  buildAcquisitionReport,
  isXPostId,
  parseIdList,
  type AcquisitionPeriod,
  type AcquisitionReport,
  type AttemptInput,
  type SignupInput,
  type VisitInput,
  type XPostInfo,
} from "@/lib/growth/acquisition";

const PAGE_SIZE = 1000;
/** .in() に渡す ID の数（URL の長さを抑える）。 */
const ID_CHUNK = 100;

type QueryResult<T> = PromiseLike<{ data: T[] | null; error: { message: string; code?: string } | null }>;

/** range() でページを送りながら全件を取る（PostgREST の既定上限 1000 行を越えるため）。 */
async function fetchAll<T>(table: string, page: (from: number, to: number) => QueryResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type UserRow = { id: string; created_at: string };
type AttributionRow = {
  user_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ref: string | null;
  referrer_host: string | null;
  beta_granted_at: string | null;
};
type AttemptRow = { user_id: string; answered_at: string };
type FunnelRow = {
  ref_path: string | null;
  referrer_host: string | null;
  visitor_id: string | null;
  placement: string | null;
};
type XPostRow = {
  utm_content: string;
  scheduled_at: string | null;
  theme: string | null;
  status: string | null;
  post_url: string | null;
};

export type AcquisitionLoadResult =
  | { ok: true; report: AcquisitionReport; warnings: string[] }
  | { ok: false; error: string };

export async function loadAcquisitionReport(
  supabase: SupabaseClient,
  days: AcquisitionPeriod,
  now: number = Date.now(),
): Promise<AcquisitionLoadResult> {
  const startAt = acquisitionPeriodStart(days, now);
  const startIso = startAt.toISOString();
  const warnings: string[] = [];

  let signups: SignupInput[];
  let attempts: AttemptInput[];
  try {
    const users = await fetchAll<UserRow>("line_users", (from, to) =>
      supabase
        .from("line_users")
        .select("id, created_at")
        .gte("created_at", startIso)
        .is("merged_into", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    );
    const ids = users.map((u) => u.id);

    const attributions: AttributionRow[] = [];
    for (const part of chunks(ids, ID_CHUNK)) {
      attributions.push(
        ...(await fetchAll<AttributionRow>("signup_attributions", (from, to) =>
          supabase
            .from("signup_attributions")
            .select("user_id, utm_source, utm_medium, utm_campaign, ref, referrer_host, beta_granted_at")
            .in("user_id", part)
            .order("user_id", { ascending: true })
            .range(from, to),
        )),
      );
    }

    attempts = [];
    for (const part of chunks(ids, ID_CHUNK)) {
      const rows = await fetchAll<AttemptRow>("question_attempts", (from, to) =>
        supabase
          .from("question_attempts")
          .select("user_id, answered_at")
          .in("user_id", part)
          .order("attempt_id", { ascending: true })
          .range(from, to),
      );
      attempts.push(...rows.map((r) => ({ userId: r.user_id, answeredAt: r.answered_at })));
    }

    const attrById = new Map(attributions.map((a) => [a.user_id, a]));
    signups = users.map((u) => {
      const a = attrById.get(u.id);
      return {
        userId: u.id,
        createdAt: u.created_at,
        utmSource: a?.utm_source ?? null,
        utmMedium: a?.utm_medium ?? null,
        utmCampaign: a?.utm_campaign ?? null,
        ref: a?.ref ?? null,
        referrerHost: a?.referrer_host ?? null,
        betaGrantedAt: a?.beta_granted_at ?? null,
      };
    });
  } catch (e) {
    console.error("[admin] acquisition signups query failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "登録・学習データの取得に失敗しました" };
  }

  // 訪問は補助的な数。取れなくても登録側の集計は返す。
  let visits: VisitInput[] | null = null;
  try {
    const rows = await fetchAll<FunnelRow>("public_funnel_events", (from, to) =>
      supabase
        .from("public_funnel_events")
        .select("ref_path, referrer_host, visitor_id, placement")
        .eq("event", "view")
        .gte("created_at", startIso)
        .order("id", { ascending: true })
        .range(from, to),
    );
    visits = rows.map((r) => ({
      refPath: r.ref_path,
      referrerHost: r.referrer_host,
      visitorId: r.visitor_id,
      placement: r.placement,
    }));
  } catch (e) {
    console.error("[admin] acquisition funnel query failed:", e instanceof Error ? e.message : e);
    warnings.push("訪問（public_funnel_events）を取得できませんでした。訪問の列は「—」で表示しています。");
  }

  const postIds = new Set<string>();
  for (const sgn of signups) if (isXPostId(sgn.ref)) postIds.add(sgn.ref);
  for (const v of visits ?? []) if (isXPostId(v.placement)) postIds.add(v.placement);
  const xPosts = await loadXPosts(supabase, [...postIds], warnings);

  const report = buildAcquisitionReport({
    days,
    startAt,
    now,
    signups,
    attempts,
    visits,
    xPosts,
    excludedUserIds: parseIdList(process.env.ACQUISITION_EXCLUDED_USER_IDS, "uuid"),
    excludedVisitorIds: parseIdList(process.env.ACQUISITION_EXCLUDED_VISITOR_IDS, "visitor"),
  });
  return { ok: true, report, warnings };
}

/**
 * 投稿 ID → 投稿日時・テーマ・URL（x_social_posts。X 自動投稿の migration が未適用なら空）。
 * 表示の補足なので、取れなくても集計は止めない。
 */
async function loadXPosts(
  supabase: SupabaseClient,
  ids: string[],
  warnings: string[],
): Promise<Map<string, XPostInfo>> {
  const map = new Map<string, XPostInfo>();
  try {
    for (const part of chunks(ids, ID_CHUNK)) {
      const rows = await fetchAll<XPostRow>("x_social_posts", (from, to) =>
        supabase
          .from("x_social_posts")
          .select("utm_content, scheduled_at, theme, status, post_url")
          .in("utm_content", part)
          .order("utm_content", { ascending: true })
          .range(from, to),
      );
      for (const r of rows) {
        map.set(r.utm_content, {
          scheduledAt: r.scheduled_at,
          theme: r.theme,
          status: r.status,
          postUrl: r.post_url,
        });
      }
    }
  } catch (e) {
    console.error("[admin] acquisition x_social_posts query failed:", e instanceof Error ? e.message : e);
    warnings.push("X 投稿の詳細（x_social_posts）を取得できませんでした。投稿 ID だけで表示しています。");
  }
  return map;
}
