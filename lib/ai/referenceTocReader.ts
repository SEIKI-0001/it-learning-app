// 参考書の目次ページ（スクショ・写真）から章構成を読み取る（サーバー専用）。
// AI 採点・モチット相談と同じく Gemini の REST を直接呼ぶ。
// - 画像は目次ページだけを想定。読み取った見出しとトピックの紐づけ候補を JSON で受け取り、
//   lib/referenceToc.ts の normalizeTocExtraction で整える（AI 出力は信用しない）。
// - GEMINI_API_KEY 未設定・通信失敗・空応答はすべて例外。非 production でキーが無いときだけ
//   画面確認用の固定結果を返す（AI 採点のダミー採点と同じ方針）。

import { getAllTopics } from "@/lib/content";
import { extractJson, getGeminiModel } from "@/lib/ai/gradingCore";
import { normalizeTocExtraction, type TocExtraction } from "@/lib/referenceToc";

const TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 8192;

export type TocImage = { mimeType: string; data: string };

export class TocReadError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "request_failed" | "invalid_response",
  ) {
    super(message);
    this.name = "TocReadError";
  }
}

/** 使用モデル。REFERENCE_TOC_MODEL で上書き、無ければ AI 採点と同じ Gemini モデル。 */
export function getTocModel(): string {
  return process.env.REFERENCE_TOC_MODEL?.trim() || getGeminiModel();
}

function buildPrompt(): string {
  const topicLines = getAllTopics()
    .map((t) => `${t.id}\t${t.title}（${t.category}）`)
    .join("\n");
  return `あなたは ITパスポート試験の参考書の目次ページを読み取るアシスタントです。
添付画像は1冊の参考書の目次ページです（複数枚なら、添付順に続いています）。

# やること
1. 目次の見出しを、画像に書かれている文言のまま「章」と「節」に分けて書き出す。
   - 章: 「第1章」「Chapter 1」「1」など最上位の見出し。章番号は title に含める（例: "第1章 企業活動"）。
   - 節: 章の下の見出し（例: "1-1 経営組織"、"01 財務諸表"）。節番号も title に含める。
   - 節の下の小見出し（項）は書き出さない。
   - ページ番号・点線リーダー・「はじめに」「索引」「奥付」など本文でない項目は含めない。
   - 前のページから続いている章（画像の先頭が節から始まる）は、直前の章の続きとして扱う。
   - 読めない文字を推測で補わない。見えている見出しだけを書く。
2. 書名が画像から読める場合だけ bookTitle に入れる（読めなければ省略）。
3. 各節（節が無い章は章）に、内容が明らかに対応するアプリのトピック id を下の一覧から選んで topicIds に入れる。
   - 一覧にある id だけを使う。確信が持てなければ空配列にする。1つの見出しに最大3件まで。

# アプリのトピック一覧（id<TAB>タイトル（分類））
${topicLines}

# 出力
次の JSON だけを返す。説明文やコードブロックは付けない。
{"bookTitle":"書名(任意)","chapters":[{"title":"第1章 …","topicIds":[],"sections":[{"title":"1-1 …","topicIds":["..."]}]}]}
目次が写っていない画像なら {"chapters":[]} を返す。`;
}

/** 開発確認用の固定結果（キー未設定の非 production のみ）。 */
function buildDevStub(validTopicIds: ReadonlySet<string>): TocExtraction {
  return normalizeTocExtraction(
    {
      bookTitle: "（開発用の固定結果）",
      chapters: [
        {
          title: "第1章 企業と法務",
          sections: [{ title: "1-1 企業活動" }, { title: "1-2 法務" }],
        },
        {
          title: "第2章 経営戦略",
          sections: [{ title: "2-1 経営戦略マネジメント" }, { title: "2-2 技術戦略マネジメント" }],
        },
      ],
    },
    validTopicIds,
  );
}

export async function readTableOfContents(images: TocImage[]): Promise<{
  toc: TocExtraction;
  model: string;
}> {
  const validTopicIds = new Set(getAllTopics().map((t) => t.id));
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = getTocModel();
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      return { toc: buildDevStub(validTopicIds), model: "dev-stub" };
    }
    throw new TocReadError("GEMINI_API_KEY is not set", "not_configured");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
              { text: buildPrompt() },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new TocReadError(`gemini request failed: ${String(e)}`, "request_failed");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new TocReadError(`gemini http ${res.status}: ${detail.slice(0, 300)}`, "request_failed");
  }

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new TocReadError("gemini returned empty response", "invalid_response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    console.error("[read-toc] gemini JSON parse failed. raw:", text.slice(0, 500));
    throw new TocReadError("failed to parse gemini json", "invalid_response");
  }
  return { toc: normalizeTocExtraction(parsed, validTopicIds), model };
}
