import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getInternalUserId } from "@/lib/auth/currentUser";
import { saveSharedProgress } from "@/lib/auth/sharedProgress";
import { profileToRow } from "@/lib/dbMappers";
import { recalculateExamReadiness } from "@/lib/examReadiness/service";
import {
  PLANNING_INPUT_COLUMNS,
  havePlanningInputsChanged,
  planningInputsFromProfile,
  planningInputsFromRow,
  type PlanningInputsRow,
} from "@/lib/planningInputs";
import { replanForPlanningInputsChange } from "@/lib/progressBootstrap";
import type { UserProfile, UserProgress } from "@/types";

export const runtime = "nodejs";

type ReadinessTriggerInput = {
  triggerType: "learning_complete" | "review_complete" | "assessment";
  triggerId: string;
};

type ProgressSaveBody = {
  userId?: string;
  progress?: UserProgress;
  profile?: UserProfile;
  readinessTrigger?: ReadinessTriggerInput;
  /**
   * クライアントが planning inputs の変更を検知したときの再計算要求。
   * 前回の保存でプロフィールだけ書けて再計算に失敗した場合、DB 上は既に新しい値で
   * サーバー側の比較では差分が出ないため、再試行時にこれで再計算を確実に走らせる。
   */
  replan?: boolean;
};

/**
 * POST /api/progress/save
 * 進捗と任意でプロフィールを UPSERT する。
 * ユーザーはセッション（Google / LINE Cookie）から解決する。
 * body: { progress?: UserProgress, profile?: UserProfile, readinessTrigger?, replan? }
 *
 * プロフィールの planning inputs（試験日・平日/休日の学習可能時間）が変わったときは
 * 学習計画の再計算イベントとして扱い、統合進捗の当日分を作り直し、旧条件の立て直し案を
 * expired にして新しい案を生成するまで待ってから応答する（planningInputsChanged: true）。
 * 再計算に失敗したら ok:false（保存できたように見せない）。
 */
export async function POST(request: Request) {
  let progress: UserProgress | undefined;
  let profile: UserProfile | undefined;
  let readinessTrigger: ReadinessTriggerInput | undefined;
  let body: ProgressSaveBody = {};
  try {
    body = (await request.json()) as ProgressSaveBody;
    progress = body.progress;
    profile = body.profile;
    readinessTrigger = parseReadinessTrigger(body.readinessTrigger);
    if (body.readinessTrigger !== undefined && readinessTrigger === undefined) {
      return NextResponse.json({ ok: false, error: "invalid readiness trigger" }, { status: 400 });
    }
    if (readinessTrigger && !progress) {
      return NextResponse.json({ ok: false, error: "missing progress" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const userId = await getInternalUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  let triggerRegistered = false;
  if (progress) {
    const { data, error } = await saveSharedProgress(supabase, userId, progress, readinessTrigger);
    if (error) {
      return NextResponse.json({ ok: false, error: "progress save failed" }, { status: 500 });
    }
    if (!isProgressSaveResult(data)) {
      return NextResponse.json({ ok: false, error: "progress save failed" }, { status: 500 });
    }
    triggerRegistered = data.trigger_registered;
  }

  let planningInputsChanged = false;
  if (profile) {
    const { data: before, error: beforeError } = await supabase
      .from("user_profiles")
      .select(PLANNING_INPUT_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
    if (beforeError) {
      return NextResponse.json({ ok: false, error: "profile save failed" }, { status: 500 });
    }
    const { error } = await supabase
      .from("user_profiles")
      .upsert(profileToRow(userId, profile), { onConflict: "user_id" });
    if (error) {
      return NextResponse.json({ ok: false, error: "profile save failed" }, { status: 500 });
    }
    planningInputsChanged =
      body.replan === true ||
      havePlanningInputsChanged(
        planningInputsFromRow(before as PlanningInputsRow | null),
        planningInputsFromProfile(profile),
      );
  }

  if (planningInputsChanged) {
    try {
      await replanForPlanningInputsChange(supabase, userId);
    } catch {
      return NextResponse.json(
        { ok: false, error: "replan failed", profileSaved: true },
        { status: 500 },
      );
    }
  }

  let readinessUpdated = false;
  if (readinessTrigger && triggerRegistered) {
    try {
      await recalculateExamReadiness({
        supabase,
        userId,
        ...readinessTrigger,
      });
      readinessUpdated = true;
    } catch {
      // P0 state と evidence revision は RPC commit 済み。学習成功は巻き戻さない。
    }
  }

  return NextResponse.json({
    ok: true,
    readinessUpdated,
    ...(profile ? { planningInputsChanged } : {}),
  });
}

function parseReadinessTrigger(value: unknown): ReadinessTriggerInput | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    (candidate.triggerType !== "learning_complete"
      && candidate.triggerType !== "review_complete"
      && candidate.triggerType !== "assessment")
    || typeof candidate.triggerId !== "string"
    || candidate.triggerId.trim().length === 0
    || candidate.triggerId.length > 4096
  ) return undefined;
  return {
    triggerType: candidate.triggerType,
    triggerId: candidate.triggerId,
  };
}

function isProgressSaveResult(value: unknown): value is {
  evidence_changed: boolean;
  trigger_registered: boolean;
} {
  return value !== null
    && typeof value === "object"
    && "evidence_changed" in value
    && typeof value.evidence_changed === "boolean"
    && "trigger_registered" in value
    && typeof value.trigger_registered === "boolean";
}
