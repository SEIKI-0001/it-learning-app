import type { Topic } from "@/types/content";
import type { ProgressLevel } from "@/types/studyProgress";
import type {
  ReferenceBook,
  ReferenceBookProgress,
  ReferenceChapter,
  ReferenceGuide,
  ReferenceLocation,
  ReferenceReadTarget,
  ReferenceSection,
} from "@/types/referenceBook";

// ============================================================================
// 参考書アウトラインの localStorage 操作・目次パース・トピック紐づけ検索。
// ここは純粋関数＋localStorage 隠蔽レイヤー。UI からはここ経由で参照する。
// ログイン時の DB 同期は lib/referenceBookSync.ts（クライアント fetch）が担う。
// ============================================================================

const STORAGE_KEY = "fequest:referenceBook";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** ゆるいユニークID（章・節用）。 */
export function genRefId(prefix = "ch"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/** 空の参考書アウトラインを作る。 */
export function createEmptyReferenceBook(): ReferenceBook {
  return {
    title: "",
    publisher: "",
    edition: "",
    active: true,
    note: "",
    chapters: [],
    updatedAt: new Date().toISOString(),
  };
}

/** localStorage から参考書を読み込む（無ければ null）。 */
export function loadReferenceBook(): ReferenceBook | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeReferenceBook(JSON.parse(raw) as ReferenceBook);
  } catch {
    return null;
  }
}

/** 欠けたフィールドを補完する（後方互換）。 */
export function normalizeReferenceBook(book: ReferenceBook): ReferenceBook {
  return {
    title: book.title ?? "",
    publisher: book.publisher ?? "",
    edition: book.edition ?? "",
    active: book.active ?? true,
    note: book.note ?? "",
    chapters: (book.chapters ?? []).map((ch) => ({
      id: ch.id || genRefId("ch"),
      title: ch.title ?? "",
      note: ch.note ?? "",
      keywords: ch.keywords ?? [],
      topicIds: ch.topicIds ?? [],
      done: ch.done ?? false,
      ...(ch.completedAt ? { completedAt: ch.completedAt } : {}),
      sections: (ch.sections ?? []).map((s) => ({
        id: s.id || genRefId("sec"),
        title: s.title ?? "",
        keywords: s.keywords ?? [],
        topicIds: s.topicIds ?? [],
        // 読了状態は任意フィールド。旧データ（節に done が無い）はそのまま未読として読む。
        ...(s.done ? { done: true } : {}),
        ...(s.completedAt ? { completedAt: s.completedAt } : {}),
        ...(s.startedAt ? { startedAt: s.startedAt } : {}),
      })),
    })),
    updatedAt: book.updatedAt ?? new Date().toISOString(),
  };
}

/**
 * localStorage へ保存する。
 * 既定では updatedAt を現在時刻に更新する。DB から取得した版を手元に写すときは
 * touch=false で DB 側の updatedAt を保つ（端末間でどちらが新しいかの判定に使うため）。
 */
export function saveReferenceBook(
  book: ReferenceBook,
  options: { touch?: boolean } = {},
): void {
  if (!isBrowser()) return;
  const touch = options.touch ?? true;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(touch ? { ...book, updatedAt: new Date().toISOString() } : book),
    );
  } catch {
    /* ignore */
  }
}

/** 参考書設定を削除する。 */
export function clearReferenceBook(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// 目次テキストのパース
// ---------------------------------------------------------------------------

const CHAPTER_KANJI = /^第\s*([0-9０-９一二三四五六七八九十百]+)\s*章[\s:：.．、]*(.*)$/;
const CHAPTER_NUM_KANJI = /^([0-9０-９]+)\s*章[\s:：.．、]*(.*)$/;
const CHAPTER_EN = /^chapter\s*([0-9]+)[\s:：.．、]*(.*)$/i;
// トップレベルの「1 概要」「1. 概要」「1章」など（節の "1.1" とは別に扱う）
const CHAPTER_TOPLEVEL = /^([0-9]+)[.．]?\s+(\S.*)$/;

const SECTION_KANJI = /^第\s*([0-9０-９一二三四五六七八九十]+)\s*節[\s:：.．、]*(.*)$/;
const SECTION_DOTTED = /^([0-9]+)[.\-－―]([0-9]+)(?:[.\-－―]?[0-9]*)[\s:：.．、]*(.*)$/;

/**
 * 目次テキストを章構成に変換する（簡易）。
 * 検出: 第○章 / ○章 / Chapter○ / CHAPTER○ / 1.1 / 1-1 / 第○節。
 * 完璧な変換は狙わず、生成後にユーザーが編集する前提。
 */
export function parseTableOfContents(text: string): ReferenceChapter[] {
  const chapters: ReferenceChapter[] = [];
  let current: ReferenceChapter | null = null;

  const pushChapter = (title: string) => {
    current = {
      id: genRefId("ch"),
      title: title.trim(),
      keywords: [],
      topicIds: [],
      done: false,
      sections: [],
    };
    chapters.push(current);
  };

  const pushSection = (title: string) => {
    if (!current) {
      // 章が未検出のまま節が来たら、器の章を1つ作る。
      pushChapter("第1章");
    }
    current!.sections!.push({
      id: genRefId("sec"),
      title: title.trim(),
      keywords: [],
      topicIds: [],
    });
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // --- 節（先に判定: "1.1" "1-1" が章の数字判定に食われないように）---
    let m = line.match(SECTION_KANJI);
    if (m) {
      pushSection(joinTitle(`第${m[1]}節`, m[2]));
      continue;
    }
    m = line.match(SECTION_DOTTED);
    if (m) {
      const marker = `${m[1]}.${m[2]}`;
      pushSection(joinTitle(marker, m[3]));
      continue;
    }

    // --- 章 ---
    m = line.match(CHAPTER_KANJI);
    if (m) {
      pushChapter(joinTitle(`第${m[1]}章`, m[2]));
      continue;
    }
    m = line.match(CHAPTER_NUM_KANJI);
    if (m) {
      pushChapter(joinTitle(`${m[1]}章`, m[2]));
      continue;
    }
    m = line.match(CHAPTER_EN);
    if (m) {
      pushChapter(joinTitle(`Chapter ${m[1]}`, m[2]));
      continue;
    }
    m = line.match(CHAPTER_TOPLEVEL);
    if (m) {
      pushChapter(joinTitle(`${m[1]}.`, m[2]));
      continue;
    }

    // --- どのパターンにも当てはまらない行は、直前の章の節として拾う ---
    if (current) {
      pushSection(line);
    } else {
      pushChapter(line);
    }
  }

  return chapters;
}

function joinTitle(marker: string, rest: string): string {
  const r = (rest ?? "").trim();
  return r ? `${marker} ${r}` : marker;
}

// ---------------------------------------------------------------------------
// トピック紐づけ検索・進捗
// ---------------------------------------------------------------------------

/**
 * プリセット（itpass_reference_book.json）作成後に改名されたトピック id の読み替え。
 * プリセットから作られた参考書は DB・端末にこの旧 id のまま保存されているため、
 * データを書き換えるのではなく照合時に現行 id へ読み替える。1対1が明らかなものだけを載せる
 * （例: strat-dx は「システム戦略」「生成AIとDX」のどちらとも取れるので載せない）。
 */
export const LEGACY_TOPIC_ID_ALIASES: Readonly<Record<string, string>> = {
  "tech-network-lan-wan": "tech-lan-wan",
  "tech-cloud-service-models": "tech-cloud-models",
  "tech-system-reliability-rasis": "tech-reliability-availability",
  "tech-auth-authz": "tech-auth-authz-mfa",
  "tech-encryption-basics": "tech-encryption-hash",
  "tech-db-keys": "tech-keys",
  "tech-db-sql": "tech-database-sql",
  "tech-programming-basic": "tech-programming-basics",
  "mgmt-service-management": "mgmt-service-sla",
  "mgmt-system-development": "mgmt-development-process",
  "strat-finance-breakeven": "strat-accounting-break-even",
};

/** 旧トピック id を現行 id に読み替える（該当しなければそのまま）。 */
export function canonicalTopicId(id: string): string {
  return LEGACY_TOPIC_ID_ALIASES[id] ?? id;
}

function linksTopic(topicIds: string[] | undefined, topicId: string): boolean {
  return (topicIds ?? []).some((id) => canonicalTopicId(id) === topicId);
}

/**
 * トピック id に紐づく参考書の場所（章・節）を探す。
 * 節→章の順で topicIds を照合し、最初に見つかった場所を返す。無ければ null。
 */
export function findReferenceLocation(
  book: ReferenceBook | null,
  topicId: string,
): ReferenceLocation | null {
  if (!book) return null;
  const id = canonicalTopicId(topicId);
  for (const chapter of book.chapters) {
    for (const section of chapter.sections ?? []) {
      if (linksTopic(section.topicIds, id)) {
        return { chapter, section };
      }
    }
  }
  for (const chapter of book.chapters) {
    if (linksTopic(chapter.topicIds, id)) {
      return { chapter };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 読了状態（章・節）
// ---------------------------------------------------------------------------
// 参考書の構造上の読了。日次の自己申告（daily_progress_reports）とは別に持つ。
//   - 節がある章: 各節の done が単位。章の読了は「全節が読了」で決まる。
//   - 節がない章: 章の done が単位（旧データと同じ）。
//   - 旧データの章 done=true（手動チェック）は、その章の節もすべて読了として扱う。

/** 節が読了か（章ごと読了済みの旧データも読了とみなす）。 */
export function isSectionRead(
  chapter: ReferenceChapter,
  section: ReferenceSection,
): boolean {
  return section.done === true || chapter.done === true;
}

/** 章が読了か。節がある章は全節読了で読了（旧データの章 done も尊重）。 */
export function isChapterRead(chapter: ReferenceChapter): boolean {
  if (chapter.done === true) return true;
  const sections = chapter.sections ?? [];
  return sections.length > 0 && sections.every((s) => s.done === true);
}

/**
 * 章構成から参考書1周の進捗を求める。章が無ければ null。
 * 単位は「節（節のない章は章）」。旧データの章 done は節すべてを読了として数えるので、
 * 「done章 / 全章」時代の進捗が 0% に戻ることはない。
 */
export function referenceChaptersProgress(
  chapters: ReferenceChapter[],
): ReferenceBookProgress | null {
  if (chapters.length === 0) return null;
  let done = 0;
  let total = 0;
  let doneChapters = 0;
  for (const chapter of chapters) {
    const sections = chapter.sections ?? [];
    if (sections.length === 0) {
      total += 1;
      if (chapter.done === true) done += 1;
    } else {
      total += sections.length;
      done += sections.filter((s) => isSectionRead(chapter, s)).length;
    }
    if (isChapterRead(chapter)) doneChapters += 1;
  }
  return {
    done,
    total,
    ratio: total > 0 ? done / total : 0,
    doneChapters,
    totalChapters: chapters.length,
  };
}

/** 参考書1周の進捗。章が無ければ null。 */
export function referenceBookProgress(
  book: ReferenceBook | null,
): ReferenceBookProgress | null {
  if (!book) return null;
  return referenceChaptersProgress(book.chapters);
}

/**
 * DB の user_reference_books 行（jsonb の chapters）から進捗率（0〜100）を求める。
 * 参考書が未登録・使用中でない・章が0件のときは null（指標に含めない）。
 * サーバー側（lib/progressBootstrap.ts）とクライアントで同じ計算を使うための入口。
 */
export function referenceBookRatioFromRow(
  row: { active: boolean | null; chapters: unknown } | null,
): number | null {
  if (!row || row.active === false) return null;
  const chapters = (Array.isArray(row.chapters) ? row.chapters : []).filter(
    (c): c is ReferenceChapter => typeof c === "object" && c !== null,
  );
  const progress = referenceChaptersProgress(chapters);
  return progress ? Math.round(progress.ratio * 100) : null;
}

/** 章を読了にしたときの節・章の補正（全節読了なら章も読了）。 */
function withDerivedChapterDone(
  chapter: ReferenceChapter,
  now: string,
): ReferenceChapter {
  const sections = chapter.sections ?? [];
  if (chapter.done || sections.length === 0) return chapter;
  if (!sections.every((s) => s.done === true)) return chapter;
  return { ...chapter, done: true, completedAt: chapter.completedAt ?? now };
}

/**
 * その日の対象トピックから、読了の対象（章・節）を特定する。
 * topicIds の紐づけで確定した場所だけを返す（キーワード一致の「候補」は含めない）。
 * 節がある章に章単位でだけ紐づいたトピックは、章全体を読了にすると過大なので対象にしない。
 * 同じ節に複数トピックが紐づいていても1件にまとめる。
 */
export function referenceTargetsForTopics(
  book: ReferenceBook | null,
  topicIds: string[],
): ReferenceReadTarget[] {
  if (!hasUsableReferenceBook(book)) return [];
  const seen = new Set<string>();
  const targets: ReferenceReadTarget[] = [];
  for (const topicId of topicIds) {
    const location = findReferenceLocation(book, topicId);
    if (!location) continue;
    let target: ReferenceReadTarget | null = null;
    if (location.section) {
      target = { chapterId: location.chapter.id, sectionId: location.section.id };
    } else if ((location.chapter.sections ?? []).length === 0) {
      target = { chapterId: location.chapter.id };
    }
    if (!target) continue;
    const key = `${target.chapterId}/${target.sectionId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push(target);
  }
  return targets;
}

/**
 * /today の「どこまで読んだか」を参考書の読了状態へ反映する。
 *   - all（全部）   … 対象の節（節のない章は章）を読了にする。全節そろえば章も読了。
 *   - half / little … 部分読了（startedAt）を付けるだけ。読了にはしない。
 *   - none / rest   … 何もしない。
 * 一度読了にしたものを、ここで未読に戻すことはない（取り消しは設定画面で明示的に行う）。
 * 変化が無ければ同じ参照を返す。
 */
export function applyReadingLevel(
  book: ReferenceBook,
  targets: ReferenceReadTarget[],
  level: ProgressLevel,
  now: string = new Date().toISOString(),
): ReferenceBook {
  if (targets.length === 0) return book;
  if (level !== "all" && level !== "half" && level !== "little") return book;
  const complete = level === "all";
  let changed = false;

  const chapters = book.chapters.map((chapter) => {
    const mine = targets.filter((t) => t.chapterId === chapter.id);
    if (mine.length === 0) return chapter;

    let next = chapter;
    if (mine.some((t) => !t.sectionId)) {
      if (complete && !chapter.done) {
        next = { ...next, done: true, completedAt: next.completedAt ?? now };
        changed = true;
      }
    }
    const sectionIds = new Set(mine.flatMap((t) => (t.sectionId ? [t.sectionId] : [])));
    if (sectionIds.size > 0) {
      const sections = (next.sections ?? []).map((section) => {
        if (!sectionIds.has(section.id)) return section;
        let updated = section;
        if (!updated.startedAt) {
          updated = { ...updated, startedAt: now };
        }
        if (complete && !updated.done) {
          updated = { ...updated, done: true, completedAt: updated.completedAt ?? now };
        }
        if (updated !== section) changed = true;
        return updated;
      });
      next = { ...next, sections };
    }
    const derived = withDerivedChapterDone(next, now);
    if (derived !== next) changed = true;
    return derived;
  });

  return changed ? { ...book, chapters, updatedAt: now } : book;
}

/** 設定画面から節の読了を明示的に切り替える（読了の取り消しはここでだけ行う）。 */
export function setSectionRead(
  book: ReferenceBook,
  chapterId: string,
  sectionId: string,
  read: boolean,
  now: string = new Date().toISOString(),
): ReferenceBook {
  return {
    ...book,
    updatedAt: now,
    chapters: book.chapters.map((chapter) => {
      if (chapter.id !== chapterId) return chapter;
      const sections = chapter.sections ?? [];
      if (read) {
        return withDerivedChapterDone(
          {
            ...chapter,
            sections: sections.map((s) =>
              s.id === sectionId
                ? { ...s, done: true, completedAt: s.completedAt ?? now }
                : s,
            ),
          },
          now,
        );
      }
      // 章ごと読了だった（旧データ含む）ときは、ほかの節の読了を明示してから外す。
      return {
        ...chapter,
        done: false,
        completedAt: undefined,
        sections: sections.map((s) => {
          if (s.id === sectionId) {
            return { ...s, done: false, completedAt: undefined };
          }
          if (chapter.done && !s.done) {
            return { ...s, done: true, completedAt: chapter.completedAt ?? now };
          }
          return s;
        }),
      };
    }),
  };
}

/** 設定画面から章の読了を明示的に切り替える（節もまとめて揃える）。 */
export function setChapterRead(
  book: ReferenceBook,
  chapterId: string,
  read: boolean,
  now: string = new Date().toISOString(),
): ReferenceBook {
  return {
    ...book,
    updatedAt: now,
    chapters: book.chapters.map((chapter) => {
      if (chapter.id !== chapterId) return chapter;
      const sections = (chapter.sections ?? []).map((s) =>
        read
          ? { ...s, done: true, completedAt: s.completedAt ?? now }
          : { ...s, done: false, completedAt: undefined },
      );
      return read
        ? { ...chapter, done: true, completedAt: chapter.completedAt ?? now, sections }
        : { ...chapter, done: false, completedAt: undefined, sections };
    }),
  };
}

/**
 * 端末ローカルと DB の参考書のうち、新しい方（updatedAt）を選ぶ。
 * 参考書は1ユーザー1冊を丸ごと保存するので、後から保存された方が正。
 */
export function pickNewerReferenceBook(
  local: ReferenceBook | null,
  remote: ReferenceBook | null,
): ReferenceBook | null {
  if (!local) return remote;
  if (!remote) return local;
  const l = Date.parse(local.updatedAt);
  const r = Date.parse(remote.updatedAt);
  if (Number.isNaN(l)) return remote;
  if (Number.isNaN(r)) return local;
  return r >= l ? remote : local;
}

// ---------------------------------------------------------------------------
// 今日のトピック → 参考書の場所（案内）
// ---------------------------------------------------------------------------

function normalizeKeyword(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/[\s・･]/g, "");
}

/**
 * 章・節の keywords と Topic.referenceHints の一致から「候補」の場所を探す。
 * 推測で章を断定しないよう、最多一致が1か所に絞れたときだけ返す
 * （同点が複数章にまたがるときは null。同じ章の節どうしの同点は章として返す）。
 */
function findKeywordCandidate(
  book: ReferenceBook,
  hintKeywords: string[],
): { location: ReferenceLocation; keywords: string[] } | null {
  const wanted = new Map<string, string>();
  for (const kw of hintKeywords) {
    const n = normalizeKeyword(kw);
    if (n.length >= 2) wanted.set(n, kw);
  }
  if (wanted.size === 0) return null;

  const matchOf = (keywords: string[] | undefined): string[] =>
    Array.from(
      new Set(
        (keywords ?? []).flatMap((k) => {
          const hit = wanted.get(normalizeKeyword(k));
          return hit ? [hit] : [];
        }),
      ),
    );

  type Hit = { location: ReferenceLocation; keywords: string[] };
  let best: Hit[] = [];
  let bestScore = 0;
  const consider = (hit: Hit) => {
    const score = hit.keywords.length;
    if (score === 0) return;
    if (score > bestScore) {
      bestScore = score;
      best = [hit];
    } else if (score === bestScore) {
      best.push(hit);
    }
  };

  // 節を優先して探し、節で見つからなければ章で探す。
  for (const chapter of book.chapters) {
    for (const section of chapter.sections ?? []) {
      consider({ location: { chapter, section }, keywords: matchOf(section.keywords) });
    }
  }
  if (best.length === 0) {
    for (const chapter of book.chapters) {
      consider({ location: { chapter }, keywords: matchOf(chapter.keywords) });
    }
  }
  if (best.length === 0) return null;
  if (best.length === 1) return best[0];
  const chapterIds = new Set(best.map((h) => h.location.chapter.id));
  if (chapterIds.size === 1) {
    return {
      location: { chapter: best[0].location.chapter },
      keywords: Array.from(new Set(best.flatMap((h) => h.keywords))),
    };
  }
  return null;
}

/**
 * サービス側で決めたトピックを、ユーザーの参考書上の案内へ変換する。
 * 学習順序は変えない（トピックは呼び出し側が既存ロジックで決めたもの）。
 * フォールバック順: topicIds → 章・節の keywords（候補）→ referenceHints → 索引。
 */
export function resolveReferenceGuide(
  book: ReferenceBook | null,
  topic: Pick<Topic, "id" | "title" | "referenceHints">,
): ReferenceGuide {
  const hintKeywords = Array.from(
    new Set((topic.referenceHints ?? []).flatMap((h) => h.keywords)),
  ).filter((k) => k.trim().length > 0);

  if (book && hasUsableReferenceBook(book)) {
    const location = findReferenceLocation(book, topic.id);
    if (location) return { kind: "mapped", location };
    const candidate = findKeywordCandidate(book, hintKeywords);
    if (candidate) return { kind: "candidate", ...candidate };
  }
  if (hintKeywords.length > 0) return { kind: "keywords", keywords: hintKeywords };
  return { kind: "index", term: topic.title };
}

/** 章・節を1行の場所ラベルにする。 */
export function referenceLocationLabel(location: ReferenceLocation): string {
  return location.section
    ? `${location.chapter.title} ／ ${location.section.title}`
    : location.chapter.title;
}

/** その参考書が「使用中」で章を持っているか。 */
export function hasUsableReferenceBook(book: ReferenceBook | null): boolean {
  return Boolean(book && book.active && book.chapters.length > 0);
}

/** 章に紐づくトピック id をすべて集める（章直下＋節）。 */
export function chapterTopicIds(chapter: ReferenceChapter): string[] {
  const ids = new Set<string>(chapter.topicIds ?? []);
  for (const s of chapter.sections ?? []) {
    for (const id of s.topicIds ?? []) ids.add(id);
  }
  return Array.from(ids);
}

export type { ReferenceSection };

// ---------------------------------------------------------------------------
// 参考書の切り替え（アクティブ1冊 ＋ 端末内の読了履歴アーカイブ）
// ---------------------------------------------------------------------------
// DB（user_reference_books）は1ユーザー1冊のまま。切り替え前の本の読了履歴は、
// 「保持する」を選んだときだけ端末内にアーカイブし、同じ本へ戻したときに復元する。
// 将来の複数冊管理では、このアーカイブを DB 側の一覧に置き換える想定。

const ARCHIVE_KEY = "fequest:referenceBookArchive";
const ARCHIVE_LIMIT = 5;

function bookKey(book: Pick<ReferenceBook, "title">): string {
  return normalizeKeyword(book.title ?? "");
}

/** 読了した節・章が1つでもあるか（アーカイブする価値があるか）。 */
export function hasReadingHistory(book: ReferenceBook | null): boolean {
  return (referenceBookProgress(book)?.done ?? 0) > 0;
}

export function loadReferenceBookArchive(): ReferenceBook[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ARCHIVE_KEY);
    const list = raw ? (JSON.parse(raw) as ReferenceBook[]) : [];
    return Array.isArray(list) ? list.map(normalizeReferenceBook) : [];
  } catch {
    return [];
  }
}

function saveReferenceBookArchive(list: ReferenceBook[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list.slice(0, ARCHIVE_LIMIT)));
  } catch {
    /* ignore */
  }
}

/**
 * 使用中の本を別の本へ切り替えた結果を返す（保存は呼び出し側）。
 *   - keepHistory: 今の本の読了履歴を端末内に残す（同じ本へ戻したら復元）
 *   - 切り替え先の読了履歴がアーカイブにあれば、それを復元して使う
 *   - 同じ本（書名一致）を選び直したときは、今の本（読了状態）をそのまま使う
 */
export function switchReferenceBook(
  current: ReferenceBook | null,
  next: ReferenceBook,
  options: { keepHistory: boolean },
): ReferenceBook {
  // 同じ本を選び直しただけなら、読了状態ごと今の本を使い続ける。
  if (current && bookKey(current) && bookKey(current) === bookKey(next)) {
    return { ...current, active: true };
  }
  let archive = loadReferenceBookArchive();
  if (current && bookKey(current)) {
    archive = archive.filter((b) => bookKey(b) !== bookKey(current));
    if (options.keepHistory && hasReadingHistory(current)) {
      archive = [{ ...current, active: false }, ...archive];
    }
  }
  const restored = archive.find((b) => bookKey(b) === bookKey(next));
  archive = archive.filter((b) => bookKey(b) !== bookKey(next));
  saveReferenceBookArchive(archive);
  return restored ? { ...restored, active: true } : { ...next, active: true };
}
