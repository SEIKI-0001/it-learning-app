import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getInternalUserId } from "@/lib/auth/currentUser";
import { profileToRow, progressToRow } from "@/lib/dbMappers";
import { recalculateExamReadiness } from "@/lib/examReadiness/service";
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
};

/**
 * POST /api/progress/save
 * 進捗と任意でプロフィールを UPSERT する。
 * ユーザーはセッション（Google / LINE Cookie）から解決する。
 * body: { progress?: UserProgress, profile?: UserProfile, readinessTrigger? }
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
    const row = progressToRow(userId, progress);
    const progressPayload: Record<string, unknown> = { ...row };
    delete progressPayload.user_id;
    delete progressPayload.updated_at;
    const { data, error } = await supabase.rpc(
      "save_user_progress_with_readiness_evidence",
      {
        p_user_id: userId,
        p_progress: progressPayload,
        p_trigger_type: readinessTrigger?.triggerType ?? null,
        p_trigger_id: readinessTrigger?.triggerId ?? null,
      },
    );
    if (error) {
      return NextResponse.json({ ok: false, error: "progress save failed" }, { status: 500 });
    }
    if (!isProgressSaveResult(data)) {
      return NextResponse.json({ ok: false, error: "progress save failed" }, { status: 500 });
    }
    triggerRegistered = data.trigger_registered;
  }

  if (profile) {
    const { error } = await supabase
      .from("user_profiles")
      .upsert(profileToRow(userId, profile), { onConflict: "user_id" });
    if (error) {
      return NextResponse.json({ ok: false, error: "profile save failed" }, { status: 500 });
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

  return NextResponse.json({ ok: true, readinessUpdated });
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
