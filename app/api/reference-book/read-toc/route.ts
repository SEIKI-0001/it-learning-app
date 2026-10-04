import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/apiUser";
import { readTableOfContents, TocReadError, type TocImage } from "@/lib/ai/referenceTocReader";
import {
  TOC_IMAGE_MIME_TYPES,
  TOC_MAX_IMAGE_BASE64,
  TOC_MAX_IMAGES,
} from "@/lib/referenceToc";

export const runtime = "nodejs";

const MIME_TYPES = new Set<string>(TOC_IMAGE_MIME_TYPES);

function fail(status: number, reason: string, error: string) {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

function sanitizeImages(value: unknown): TocImage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > TOC_MAX_IMAGES) return null;
  const images: TocImage[] = [];
  for (const v of value) {
    if (!v || typeof v !== "object") return null;
    const { mimeType, data } = v as { mimeType?: unknown; data?: unknown };
    if (typeof mimeType !== "string" || !MIME_TYPES.has(mimeType)) return null;
    if (typeof data !== "string" || !data || data.length > TOC_MAX_IMAGE_BASE64) return null;
    if (!/^[A-Za-z0-9+/]+=*$/.test(data)) return null;
    images.push({ mimeType, data });
  }
  return images;
}

/**
 * POST /api/reference-book/read-toc
 * 参考書の目次ページの画像から章構成を読み取る（保存はしない。登録はクライアントが既存の保存経路で行う）。
 * body: { userId?: string, images: { mimeType, data(base64) }[] }（production ではセッションからのみ解決）
 *
 * 401 未ログイン / 400 画像不正 / 422 目次が読み取れない / 502 AI 失敗 / 200 { ok, toc }
 */
export async function POST(request: Request) {
  let body: { userId?: string; images?: unknown };
  try {
    body = (await request.json()) as { userId?: string; images?: unknown };
  } catch {
    return fail(400, "invalid", "画像を送れませんでした。もう一度お試しください。");
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return fail(401, "login_required", "目次の読み取りはログインすると使えます。");
  }

  const images = sanitizeImages(body.images);
  if (!images) {
    return fail(
      400,
      "invalid",
      `画像は${TOC_MAX_IMAGES}枚まで、JPEG・PNG・WebP で送ってください。`,
    );
  }

  try {
    const { toc, model } = await readTableOfContents(images);
    if (toc.chapters.length === 0) {
      return fail(
        422,
        "not_found",
        "目次を読み取れませんでした。目次のページが画面いっぱいに写るように撮り直してください。",
      );
    }
    console.info("[read-toc]", { userId, images: images.length, chapters: toc.chapters.length, model });
    return NextResponse.json({ ok: true, toc });
  } catch (e) {
    const code = e instanceof TocReadError ? e.code : "request_failed";
    console.error("[read-toc] failed:", code, e instanceof Error ? e.message : e);
    return fail(502, "ai_failed", "読み取りに失敗しました。時間をおいてもう一度お試しください。");
  }
}
