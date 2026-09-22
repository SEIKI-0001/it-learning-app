"use client";

import { useLayoutEffect, useRef, useState } from "react";
import styles from "./keys/keys.module.css";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「DBMS・主キー・外部キー」専用の体験。
// たとえは最初から最後まで「学校の名簿と成績表」で統一する。
//   ① 主キー  … 名簿で1人を確実に見分ける印（学生番号）。名簿に行を足すと、
//               DBMS（先生）が「重複」「空っぽ」の学生番号をはじく。
//   ② 外部キー … 成績表の学生番号から名簿の同じ番号へ線が伸びる。
//               名簿にいない番号の成績は、線がどこにもつながらず登録を拒否される（参照整合性）。
//   ③ つなげる … 名簿＋成績表を学生番号で合わせると「誰の・どの成績か」が1つの表になる。
//   ④ まとめ
// ============================================================================

type Student = { id: string; name: string; klass: string };
type Grade = { subject: string; score: string; student: string };

const STUDENTS: Student[] = [
  { id: "S01", name: "田中", klass: "1組" },
  { id: "S02", name: "田中", klass: "2組" },
  { id: "S03", name: "佐藤", klass: "1組" },
];

const GRADES: Grade[] = [
  { subject: "国語", score: "80", student: "S01" },
  { subject: "数学", score: "90", student: "S03" },
  { subject: "英語", score: "70", student: "S01" },
];

// ① 主キー：名簿に行を足してみる ---------------------------------------------
const INSERTS: { label: string; row: Student; verdict: "ok" | "dup" | "empty" }[] = [
  { label: "S04 鈴木を追加", row: { id: "S04", name: "鈴木", klass: "2組" }, verdict: "ok" },
  { label: "S02 山田を追加", row: { id: "S02", name: "山田", klass: "1組" }, verdict: "dup" },
  { label: "番号なしで高橋を追加", row: { id: "", name: "高橋", klass: "2組" }, verdict: "empty" },
];

const VERDICT_TEXT = {
  ok: "⭕ 登録OK：S04 はまだ誰も使っていない番号",
  dup: "✕ 登録できません：S02 はもう田中さん（2組）が使っている（主キーの重複）",
  empty: "✕ 登録できません：主キーを空っぽにはできない",
} as const;

function PrimaryKeyPanel() {
  const reducedMotion = useReducedMotion();
  const [tried, setTried] = useState<number | null>(null);
  const attempt = tried === null ? null : INSERTS[tried];
  const rows = attempt?.verdict === "ok" ? [...STUDENTS, attempt.row] : STUDENTS;
  const dupId = attempt?.verdict === "dup" ? attempt.row.id : null;

  return (
    <Panel>
      <SectionTitle step={1}>主キー＝1行を「確実に見分ける」印</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        名簿の中の1人を<b className="text-gray-800">重複なく</b>見分けられる項目が主キー。下の名簿では
        <b className="text-rose-700"> 学生番号</b> が主キーです。
      </p>
      <div className={`mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300 ${reducedMotion ? styles.reduced : ""}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-3 py-2 font-bold text-rose-700">学生番号（主キー）</th>
              <th className="px-3 py-2 font-bold">名前</th>
              <th className="px-3 py-2 font-bold">クラス</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const clash = s.id === dupId;
              return (
                <tr
                  key={s.id}
                  className={`border-t border-gray-200 text-center ${i >= STUDENTS.length ? styles.rowIn : ""} ${
                    clash ? "bg-rose-50" : i % 2 ? "bg-gray-50" : "bg-white"
                  }`}
                  data-testid={`pk-row-${s.id}`}
                >
                  <td className={`px-3 py-2 font-mono font-bold text-rose-700 ${clash ? "bg-rose-200" : "bg-rose-50"}`}>{s.id}</td>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">{s.klass}</td>
                </tr>
              );
            })}
            {attempt && attempt.verdict !== "ok" && (
              <tr key={`try-${tried}`} className={`${styles.reject} border-t border-dashed border-rose-300 bg-white text-center text-gray-400 line-through`} data-testid="pk-rejected">
                <td className="px-3 py-2 font-mono font-bold text-rose-500">{attempt.row.id || "（空）"}</td>
                <td className="px-3 py-2">{attempt.row.name}</td>
                <td className="px-3 py-2">{attempt.row.klass}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs font-bold text-gray-700">🧑‍🏫 DBMS（名簿係の先生）に登録を頼んでみよう</div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {INSERTS.map((it, i) => (
          <button
            key={it.label}
            type="button"
            aria-pressed={tried === i}
            onClick={() => setTried(i)}
            className={`rounded-lg px-1.5 py-1.5 text-[11px] font-bold leading-tight transition active:scale-95 ${
              tried === i ? "bg-gray-900 text-white" : "text-gray-700 ring-1 ring-gray-300"
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div
        className={`mt-2 min-h-[2.75em] rounded-lg px-3 py-2 text-xs font-bold leading-relaxed ${
          !attempt
            ? "bg-gray-50 text-gray-500"
            : attempt.verdict === "ok"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
        }`}
        aria-live="polite"
        data-testid="pk-verdict"
      >
        {attempt ? VERDICT_TEXT[attempt.verdict] : "ボタンを押すと、先生が主キーをチェックします。"}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※「名前」は<b>田中さんが2人</b>いて見分けられず、「クラス」も重複する。だから
        <b>重複しない学生番号</b>が主キーに向いています（主キーは重複・空っぽが許されません）。
      </p>
    </Panel>
  );
}

// ② 外部キー：線でつながる --------------------------------------------------
const NEW_GRADES: { label: string; row: Grade }[] = [
  { label: "S02 の理科85点を登録", row: { subject: "理科", score: "85", student: "S02" } },
  { label: "S09 の社会60点を登録", row: { subject: "社会", score: "60", student: "S09" } },
];

type LinkGeom = { d: string; end: { x: number; y: number }; ok: boolean } | null;

function LinkExperience() {
  const reducedMotion = useReducedMotion();
  const [added, setAdded] = useState<Grade[]>([]);
  const [pending, setPending] = useState<Grade | null>(null);
  const grades = pending ? [...GRADES, ...added, pending] : [...GRADES, ...added];
  const [sel, setSel] = useState(0);
  const grade = grades[Math.min(sel, grades.length - 1)];
  const matched = STUDENTS.find((s) => s.id === grade.student);

  const boxRef = useRef<HTMLDivElement>(null);
  const fkRefs = useRef(new Map<number, HTMLTableCellElement>());
  const pkRefs = useRef(new Map<string, HTMLTableCellElement>());
  const rosterRef = useRef<HTMLTableElement>(null);
  const [geom, setGeom] = useState<LinkGeom>(null);
  const selIndex = Math.min(sel, grades.length - 1);

  useLayoutEffect(() => {
    function measure() {
      const box = boxRef.current;
      const fk = fkRefs.current.get(selIndex);
      if (!box || !fk) return;
      const b = box.getBoundingClientRect();
      const f = fk.getBoundingClientRect();
      const x0 = f.left - b.left + 4;
      const y0 = f.top - b.top + f.height / 2;
      const gutter = 5;
      const pk = matched ? pkRefs.current.get(matched.id) : undefined;
      if (pk) {
        const p = pk.getBoundingClientRect();
        const y1 = p.top - b.top + p.height / 2;
        const x1 = p.left - b.left + 4;
        setGeom({ d: `M ${x0} ${y0} H ${gutter} V ${y1} H ${x1}`, end: { x: x1, y: y1 }, ok: true });
      } else {
        const r = rosterRef.current!.getBoundingClientRect();
        const y1 = r.bottom - b.top + 14;
        setGeom({ d: `M ${x0} ${y0} H ${gutter} V ${y1} H 36`, end: { x: 42, y: y1 }, ok: false });
      }
    }
    measure();
    // 追加された行は入場アニメーション中（transform）なので、落ち着いてから測り直す
    const settle = window.setTimeout(measure, 480);
    if (typeof ResizeObserver === "undefined") return () => window.clearTimeout(settle);
    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    return () => {
      window.clearTimeout(settle);
      ro.disconnect();
    };
  }, [selIndex, matched, grades.length]);

  function register(row: Grade) {
    const ok = STUDENTS.some((s) => s.id === row.student);
    if (ok) {
      if (!added.some((g) => g.subject === row.subject)) {
        setAdded([...added, row]);
        setSel(GRADES.length + added.length);
      } else {
        setSel(GRADES.length + added.findIndex((g) => g.subject === row.subject));
      }
      setPending(null);
    } else {
      setPending(row);
      setSel(GRADES.length + added.length);
    }
  }

  return (
    <Panel>
      <SectionTitle step={2}>外部キーでつながる（タップして辿る）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        成績表の<b className="text-brand-700">学生番号（外部キー）</b>は、名簿の
        <b className="text-rose-700">学生番号（主キー）</b>を指しています。
        <b className="text-gray-800">成績の行をタップ</b>すると、線が伸びて誰の成績か辿れます。
      </p>

      <div ref={boxRef} className={`relative mt-4 pl-3 ${reducedMotion ? styles.reduced : ""}`} data-testid="fk-box">
        {geom && (
          <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" aria-hidden>
            <path
              key={`${selIndex}-${grade.student}-${grades.length}`}
              d={geom.d}
              className={styles.link}
              stroke={geom.ok ? "#2563eb" : "#e11d48"}
              strokeDasharray={geom.ok ? undefined : "600"}
            />
            <g key={`end-${selIndex}-${grades.length}`} className={styles.endMark}>
              {geom.ok ? (
                <circle cx={geom.end.x} cy={geom.end.y} r={4} fill="#2563eb" />
              ) : (
                <text x={geom.end.x} y={geom.end.y + 4} fontSize={12} fontWeight={800} fill="#e11d48">
                  ✕ 名簿に S09 はいない
                </text>
              )}
            </g>
          </svg>
        )}

        {/* 成績表（外部キーを持つ側） */}
        <div className="mb-1.5 text-sm font-bold text-gray-800">📋 成績表</div>
        <div className="overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-2 py-2 font-bold text-brand-700">学生番号（外部キー）</th>
                <th className="px-2 py-2 font-bold">科目</th>
                <th className="px-2 py-2 font-bold">点数</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => {
                const on = i === selIndex;
                const rejected = pending !== null && i === grades.length - 1;
                return (
                  <tr
                    key={`${g.student}-${g.subject}`}
                    onClick={() => setSel(i)}
                    className={`cursor-pointer border-t border-gray-200 text-center transition ${i >= GRADES.length ? (rejected ? styles.reject : styles.rowIn) : ""} ${
                      rejected ? "bg-rose-50 text-rose-400 line-through" : on ? "bg-brand-50" : "bg-white hover:bg-gray-50"
                    }`}
                    data-testid={`fk-row-${g.student}-${g.subject}`}
                  >
                    <td
                      ref={(el) => {
                        if (el) fkRefs.current.set(i, el);
                        else fkRefs.current.delete(i);
                      }}
                      className={`px-2 py-2 font-mono font-bold ${rejected ? "text-rose-600" : on ? "bg-brand-200 text-brand-800" : "text-brand-700"}`}
                    >
                      {g.student}
                    </td>
                    <td className="px-2 py-2">{g.subject}</td>
                    <td className="px-2 py-2 font-mono">{g.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* つながりの説明 */}
        <div
          className={`my-3 rounded-xl px-4 py-3 text-center text-sm leading-relaxed text-gray-700 ring-1 ${
            matched ? "bg-sky-50 ring-sky-200" : "bg-rose-50 ring-rose-200"
          }`}
          aria-live="polite"
          data-testid="fk-result"
        >
          {matched ? (
            <>
              成績「<b>{grade.subject} {grade.score}点</b>」の学生番号は{" "}
              <b className="font-mono text-brand-700">{grade.student}</b> → 名簿の{" "}
              <b className="font-mono text-rose-700">{grade.student}</b> へ接続…
              <b className="text-gray-900">「{matched.name}」さん（{matched.klass}）</b>の成績だと分かる！
            </>
          ) : (
            <>
              <b className="font-mono text-rose-700">{grade.student}</b> は名簿のどこにもいない → つなぐ先がない。
              <b className="text-rose-800">DBMSが登録を拒否</b>します（<b>参照整合性</b>：外部キーの値は参照先の主キーに必ず存在する）。
            </>
          )}
        </div>

        {/* 名簿（主キーを持つ側） */}
        <div className="mb-1.5 text-sm font-bold text-gray-800">📋 名簿</div>
        <div className="overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table ref={rosterRef} className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-2 py-2 font-bold text-rose-700">学生番号（主キー）</th>
                <th className="px-2 py-2 font-bold">名前</th>
                <th className="px-2 py-2 font-bold">クラス</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map((s) => {
                const on = s.id === matched?.id;
                return (
                  <tr key={s.id} className={`border-t border-gray-200 text-center transition-colors duration-500 ${on ? "bg-brand-50" : "bg-white"}`} data-testid={`fk-pk-${s.id}`} data-linked={on ? "true" : "false"}>
                    <td
                      ref={(el) => {
                        if (el) pkRefs.current.set(s.id, el);
                        else pkRefs.current.delete(s.id);
                      }}
                      className={`px-2 py-2 font-mono font-bold ${on ? "bg-rose-200 text-rose-800" : "text-rose-700"}`}
                    >
                      {s.id}
                    </td>
                    <td className="px-2 py-2 font-bold">{s.name}</td>
                    <td className="px-2 py-2">{s.klass}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="h-7" aria-hidden />
      </div>

      <div className="text-xs font-bold text-gray-700">成績を新しく登録してみよう</div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {NEW_GRADES.map((n) => (
          <button
            key={n.label}
            type="button"
            onClick={() => register(n.row)}
            className="rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 ring-1 ring-gray-300 transition active:scale-95"
          >
            {n.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

// ③ つなげて1つの意味ある情報にする ------------------------------------------
function JoinPanel() {
  const reducedMotion = useReducedMotion();
  const [joined, setJoined] = useState(false);
  return (
    <Panel>
      <SectionTitle step={3}>つなげると「誰の・どの成績か」が分かる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        成績表だけだと「S01 国語 80」――<b className="text-gray-800">番号しか分かりません</b>。
        学生番号で名簿とつなぐと、名前とクラスが合わさって<b className="text-gray-800">意味のある1つの表</b>になります。
      </p>

      <div className={`mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300 ${reducedMotion ? styles.reduced : ""}`} data-testid="join-table" data-joined={joined ? "true" : "false"}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-2 py-2 font-bold text-brand-700">学生番号</th>
              {joined && (
                <>
                  <th className={`${styles.joinFrom} px-2 py-2 font-bold text-rose-700`}>名前</th>
                  <th className={`${styles.joinFrom} px-2 py-2 font-bold text-rose-700`}>クラス</th>
                </>
              )}
              <th className="px-2 py-2 font-bold">科目</th>
              <th className="px-2 py-2 font-bold">点数</th>
            </tr>
          </thead>
          <tbody>
            {GRADES.map((g, i) => {
              const s = STUDENTS.find((x) => x.id === g.student)!;
              const delay = { animationDelay: `${150 + i * 220}ms` };
              return (
                <tr key={`${g.student}-${g.subject}`} className="border-t border-gray-200 text-center">
                  <td className="px-2 py-2 font-mono font-bold text-brand-700">{g.student}</td>
                  {joined && (
                    <>
                      <td className={`${styles.joinFrom} bg-rose-50 px-2 py-2 font-bold text-gray-900`} style={delay}>
                        {s.name}
                      </td>
                      <td className={`${styles.joinFrom} bg-rose-50 px-2 py-2 text-gray-800`} style={delay}>
                        {s.klass}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-2">{g.subject}</td>
                  <td className="px-2 py-2 font-mono">{g.score}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          aria-pressed={!joined}
          onClick={() => setJoined(false)}
          className={`rounded-lg px-2 py-1.5 text-xs font-bold transition active:scale-95 ${!joined ? "bg-gray-900 text-white" : "text-gray-700 ring-1 ring-gray-300"}`}
        >
          成績表だけ
        </button>
        <button
          type="button"
          aria-pressed={joined}
          onClick={() => setJoined(true)}
          className={`rounded-lg px-2 py-1.5 text-xs font-bold transition active:scale-95 ${joined ? "bg-brand-600 text-white" : "text-gray-700 ring-1 ring-gray-300"}`}
        >
          🔗 名簿とつなぐ
        </button>
      </div>
      {joined && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold leading-relaxed text-emerald-800 ring-1 ring-emerald-200" data-testid="join-note">
          「S01＝1組の田中さん」の国語80点・英語70点、と読める。田中さんが2人いても、番号でつないだので取り違えません。
        </p>
      )}
    </Panel>
  );
}

export default function KeysExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🏫 学校でたとえると——名簿を管理する<b>先生＝DBMS</b>、<b>学生番号＝主キー</b>（1人を確実に見分ける）、
        成績表に書かれた<b>学生番号＝外部キー</b>（名簿とつなぐ）。番号で名簿と成績表が結びつきます。
      </div>

      <PrimaryKeyPanel />
      <LinkExperience />
      <JoinPanel />

      <Panel>
        <SectionTitle step={4}>言葉をおさらい</SectionTitle>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b>DBMS</b>：データベースを管理するソフトウェア（名簿を管理する先生）。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b className="text-rose-700">主キー</b>：表の1行を重複なく見分ける項目（学生番号）。<b>重複も空っぽもダメ</b>。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b className="text-brand-700">外部キー</b>：別の表の主キーを参照してつなぐ項目（成績表の学生番号）。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b>参照整合性</b>：外部キーの値は、参照先の主キーに必ず存在しなければならない決まり（S09の成績は登録できない）。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b>複合キー</b>：1列では見分けられないとき、複数の列を組み合わせた主キー。成績表は S01 が2行あるので、
            <b>学生番号＋科目</b>の組で1行が決まる。
          </li>
        </ul>
      </Panel>
    </div>
  );
}
