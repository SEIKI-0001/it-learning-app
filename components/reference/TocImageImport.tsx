"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { getUserId } from "@/lib/userSession";
import { TOC_MAX_IMAGES, tocCounts, type TocExtraction } from "@/lib/referenceToc";

// 参考書の目次ページのスクショ・写真から章構成を読み取る（参考書の選択と詳細設定で共用）。
// 画像を選ぶ → 読み取る → 結果を確かめて「この章立てを使う」。保存は呼び出し側（onUse）が行う。
// 画像は端末で縮小してから送る（送信量を抑え、ホスティングの本文サイズ上限に収める）。

/** 縮小後の最大画素数。目次の小さな文字が読める範囲で抑える。 */
const MAX_PIXELS = 2_500_000;
const JPEG_QUALITY = 0.82;

type Picked = { id: string; file: File; url: string };
type Status =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "error"; message: string }
  | { kind: "done"; toc: TocExtraction };

async function toJpegBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (bitmap.width * bitmap.height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.fillStyle = "#fff"; // 透過 PNG の背景を白にする
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

export default function TocImageImport({
  onUse,
  useLabel = "この章立てを使う",
}: {
  onUse: (toc: TocExtraction) => void;
  useLabel?: string;
}) {
  const [picked, setPicked] = useState<Picked[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  // プレビュー用の object URL を片付ける。
  const pickedRef = useRef(picked);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);
  useEffect(() => () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = TOC_MAX_IMAGES - picked.length;
    const next = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, Math.max(0, room))
      .map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        url: URL.createObjectURL(file),
      }));
    setPicked((prev) => [...prev, ...next]);
    setStatus({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(id: string) {
    setPicked((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
    setStatus({ kind: "idle" });
  }

  function reset() {
    picked.forEach((p) => URL.revokeObjectURL(p.url));
    setPicked([]);
    setStatus({ kind: "idle" });
  }

  async function read() {
    if (picked.length === 0) return;
    setStatus({ kind: "reading" });
    let images: { mimeType: string; data: string }[];
    try {
      images = await Promise.all(
        picked.map(async (p) => ({ mimeType: "image/jpeg", data: await toJpegBase64(p.file) })),
      );
    } catch {
      setStatus({
        kind: "error",
        message: "画像を開けませんでした。スクリーンショット（PNG・JPEG）で試してください。",
      });
      return;
    }
    try {
      const res = await fetch("/api/reference-book/read-toc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId() ?? undefined, images }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; toc: TocExtraction }
        | { ok: false; error?: string }
        | null;
      if (data?.ok) {
        setStatus({ kind: "done", toc: data.toc });
      } else {
        setStatus({
          kind: "error",
          message: data?.error ?? "読み取りに失敗しました。時間をおいてもう一度お試しください。",
        });
      }
    } catch {
      setStatus({ kind: "error", message: "通信できませんでした。電波の良いところでもう一度お試しください。" });
    }
  }

  if (status.kind === "done") {
    const counts = tocCounts(status.toc);
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-sm font-medium text-gray-900">
          {counts.chapters}章・{counts.sections}節を読み取りました
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          {counts.linked > 0
            ? `うち${counts.linked}か所をアプリのレッスンと対応づけました。`
            : "アプリのレッスンとの対応づけは見つかりませんでした。"}
          登録後も設定画面で直せます。
        </p>
        <ol className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-md bg-gray-50 p-2.5 text-xs text-gray-800">
          {status.toc.chapters.map((c, i) => (
            <li key={i}>
              <p className="font-medium">{c.title}</p>
              {c.sections.length > 0 && (
                <ul className="mt-0.5 space-y-0.5 pl-3 text-gray-600">
                  {c.sections.map((s, j) => (
                    <li key={j}>{s.title}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onUse(status.toc);
              reset();
            }}
            className={buttonClass("primary", "sm")}
          >
            {useLabel}
          </button>
          <button type="button" onClick={reset} className={buttonClass("secondary", "sm")}>
            撮り直す
          </button>
        </div>
      </div>
    );
  }

  const reading = status.kind === "reading";
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
        <Icon name="camera" className="h-4 w-4 text-brand-700" />
        目次のスクショから章立てを登録
      </p>
      <p className="mt-0.5 text-xs text-gray-600">
        目次のページを撮影（またはスクショ）して選ぶと、章と節を自動で読み取ります。複数ページなら順番に{TOC_MAX_IMAGES}枚まで。
      </p>

      {picked.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {picked.map((p, i) => (
            <li key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- 端末内の object URL のプレビュー */}
              <img
                src={p.url}
                alt={`目次 ${i + 1}枚目`}
                className="h-20 w-16 rounded border border-gray-200 object-cover"
              />
              <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-white tabular-nums">
                {i + 1}
              </span>
              {!reading && (
                <button
                  type="button"
                  onClick={() => removeFile(p.id)}
                  aria-label={`${i + 1}枚目を外す`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-white"
                >
                  <Icon name="x" className="h-3 w-3" strokeWidth={2.4} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {picked.length < TOC_MAX_IMAGES && (
          <label className={buttonClass("secondary", "sm", reading ? "pointer-events-none opacity-50" : "cursor-pointer")}>
            {picked.length === 0 ? "画像を選ぶ" : "ページを追加"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={reading}
              onChange={(e) => addFiles(e.target.files)}
              className="sr-only"
            />
          </label>
        )}
        {picked.length > 0 && (
          <button
            type="button"
            onClick={read}
            disabled={reading}
            className={buttonClass("primary", "sm")}
          >
            {reading ? "読み取り中…" : "目次を読み取る"}
          </button>
        )}
      </div>

      {reading && (
        <p className="mt-2 text-xs text-gray-600" aria-live="polite">
          AIが目次を読んでいます。10〜30秒ほどかかります。
        </p>
      )}
      {status.kind === "error" && (
        <p className="mt-2 text-xs text-rose-700" role="alert">
          {status.message}
        </p>
      )}
    </div>
  );
}
