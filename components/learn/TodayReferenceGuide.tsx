import type { Topic } from "@/types/content";
import type { ReferenceBook, ReferenceGuide } from "@/types/referenceBook";
import { referenceLocationLabel, resolveReferenceGuide } from "@/lib/referenceBook";
import Icon from "@/components/ui/Icon";

// 「今日の参考書」ブロック。/today の参考書カードとレッスンページで共用する。
// サービス側（既存の学習ロジック）が決めたトピックを、ユーザーの参考書上の場所へ変換して見せる。
// 学習順序は変えない。案内のフォールバック順は lib/referenceBook.ts の resolveReferenceGuide:
//   topicIds の紐づけ → 章・節のキーワード一致（候補・断定しない）→ referenceHints → 索引。

type GuideTopic = Pick<Topic, "id" | "title" | "referenceHints">;

type Row = { key: string; topicTitle: string; guide: ReferenceGuide };

/** 同じ場所に紐づく複数トピックは1行にまとめる（表示の重複を避ける）。 */
function buildRows(topics: GuideTopic[], book: ReferenceBook | null): Row[] {
  const rows: Row[] = [];
  const byKey = new Map<string, Row>();
  for (const topic of topics) {
    const guide = resolveReferenceGuide(book, topic);
    const key =
      guide.kind === "mapped" || guide.kind === "candidate"
        ? `${guide.kind}:${guide.location.chapter.id}/${guide.location.section?.id ?? ""}`
        : `topic:${topic.id}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.topicTitle = `${existing.topicTitle}、${topic.title}`;
      continue;
    }
    const row = { key, topicTitle: topic.title, guide };
    byKey.set(key, row);
    rows.push(row);
  }
  return rows;
}

export default function TodayReferenceGuide({
  topics,
  book,
  framed = true,
  showTopicTitles,
  label = "今日の参考書",
}: {
  topics: GuideTopic[];
  book: ReferenceBook | null;
  /** false なら枠なし（親カードの中に埋め込む） */
  framed?: boolean;
  /** 行ごとにトピック名を出すか（既定: 2件以上のとき） */
  showTopicTitles?: boolean;
  /** 枠つき表示の見出し（紐づけがあるとき） */
  label?: string;
}) {
  if (topics.length === 0) return null;
  const rows = buildRows(topics, book);
  const withTitles = showTopicTitles ?? topics.length > 1;
  const anyMapped = rows.some((r) => r.guide.kind === "mapped");
  const bookTitle = book?.title?.trim();

  const body = (
    <>
      {/* 埋め込み時は親カードに見出しがあるので、本の名前だけを出す */}
      {framed ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
          <Icon name="book-open" className="h-3.5 w-3.5" />
          {anyMapped ? label : "参考書で探す"}
        </p>
      ) : (
        !anyMapped && <p className="text-xs text-gray-600">参考書で探す</p>
      )}
      {anyMapped && bookTitle && (
        <p
          className={`${framed ? "mt-1" : ""} flex items-center gap-1.5 text-xs text-gray-600`}
        >
          {!framed && <Icon name="book-open" className="h-3.5 w-3.5 text-brand-700" />}
          {bookTitle}
        </p>
      )}
      <ul className="mt-2 space-y-2.5">
        {rows.map((row) => (
          <li key={row.key}>
            {withTitles && (
              <p className="text-[11px] text-gray-500">{row.topicTitle}</p>
            )}
            <GuideLine guide={row.guide} mixed={anyMapped} />
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-xs text-gray-600">
        {anyMapped
          ? "先にここを読んでから、アプリの解説・図解で確認しましょう。"
          : "章番号ではなく、索引でこの言葉を引いてから、アプリの図解で確認しましょう。"}
      </p>
    </>
  );

  if (!framed) return <div data-testid="reference-guide">{body}</div>;
  return (
    <section
      data-testid="reference-guide"
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      {body}
    </section>
  );
}

function GuideLine({
  guide,
  mixed,
}: {
  guide: ReferenceGuide;
  /** 同じ一覧に紐づけ済みの行がある（キーワード行に「索引で探す」と添える） */
  mixed: boolean;
}) {
  switch (guide.kind) {
    case "mapped":
      return (
        <p className="text-sm font-semibold leading-snug text-gray-900">
          {guide.location.chapter.title}
          {guide.location.section && (
            <span className="block font-normal text-gray-700">
              {guide.location.section.title}
            </span>
          )}
        </p>
      );
    case "candidate":
      return (
        <p className="text-sm leading-snug text-gray-800">
          「{referenceLocationLabel(guide.location)}」のあたりにありそうです
          <span className="block text-xs text-gray-500">
            キーワード（{guide.keywords.join("、")}）が一致。違っていたら索引で探してください。
          </span>
        </p>
      );
    case "keywords":
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {mixed && <span className="text-xs text-gray-600">索引で探す：</span>}
          {guide.keywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
            >
              {kw}
            </span>
          ))}
        </div>
      );
    case "index":
      return (
        <p className="text-sm text-gray-800">
          参考書の索引で「{guide.term}」を探してください。
        </p>
      );
  }
}
