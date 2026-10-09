"use client";

import { useState, type ReactNode } from "react";
import { Note } from "./calc/CalcParts";
import { Caption, Lead, PointsPanel, Seg } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";
import { InlineIcon } from "@/components/ui/Pictogram";

// 「ファイルシステムとアクセス権」。試験で問われるのは次の4つだけなので、1スライド1テーマで絞る。
//   ① 木の形：ファイルは必ず末端（葉）。ディレクトリは中身があれば途中（節）、空なら末端（葉）にもなる（令和4年度 問90）
//   ② パス：同じ木で「現在地」と「行き先」を選ぶと、絶対パスは変わらず相対パスだけ変わる。経路を木の上で光らせる
//   ③ 拡張子：名前の末尾の目印にすぎない。名前を変えても中身は変わらない／非表示だと偽装に気付けない
//   ④ アクセス権：読取り・書込み・実行をグループごとに。仕事に必要な分だけ（最小権限）
//   ⑤ 試験ポイント

export default function FileSystemExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        パソコンやサーバの中のデータは、<b>ディレクトリ（フォルダ）</b>の入れ子で整理されています。試験で問われるのは<b>木の形・場所の書き方（パス）・拡張子・アクセス権</b>の4つです。
      </Lead>
      <TreePanel />
      <PathPanel />
      <ExtensionPanel />
      <PermissionPanel />
      <PointsPanel
        step={5}
        points={[
          <>ファイルは必ず<b>葉</b>。ディレクトリは<b>節にも葉にも</b>なる（空のディレクトリは葉）</>,
          <>絶対パス＝<b>ルートから</b>全部書く（現在地に関係なく同じ）。相対パス＝<b>現在地から</b>書く。「..」は1つ上</>,
          <>拡張子は形式の<b>目印</b>。名前を変えても中身は変わらない</>,
          <>アクセス権は読取り・書込み・実行。<b>仕事に必要な分だけ</b>与える（最小権限）</>,
        ]}
        traps={[
          ["ディレクトリは必ず節になる", "中身が空のディレクトリは子を持たないので葉になる"],
          ["同じファイルなら、相対パスはどこから見ても同じ書き方", "現在地が変わると相対パスの書き方が変わる。変わらないのは絶対パス"],
          ["拡張子を .txt に変えると文字のデータに変換される", "中身は元の形式のまま。開くアプリが変わるだけ"],
          ["共有フォルダは全員に書込みを許すと便利", "見るだけの人には読取りだけ。誤って消す・書き換える危険を減らす"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 共通：ディレクトリ木
// ---------------------------------------------------------------------------

type Node = { id: string; name: string; parent: string | null; kind: "dir" | "file" };

// 試験の図に近い小さな木。photos は空のディレクトリ（＝葉になるディレクトリ）
const NODES: Node[] = [
  { id: "root", name: "/", parent: null, kind: "dir" },
  { id: "home", name: "home", parent: "root", kind: "dir" },
  { id: "sato", name: "sato", parent: "home", kind: "dir" },
  { id: "memo", name: "memo.txt", parent: "sato", kind: "file" },
  { id: "photos", name: "photos", parent: "sato", kind: "dir" },
  { id: "suzuki", name: "suzuki", parent: "home", kind: "dir" },
  { id: "plan", name: "plan.xlsx", parent: "suzuki", kind: "file" },
  { id: "share", name: "share", parent: "root", kind: "dir" },
  { id: "price", name: "price.csv", parent: "share", kind: "file" },
];
const BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, Node>;

/** ルートから id までの節点（ルートを含む） */
function chain(id: string): Node[] {
  const out: Node[] = [];
  for (let n: Node | undefined = BY_ID[id]; n; n = n.parent ? BY_ID[n.parent] : undefined) out.unshift(n);
  return out;
}
const depth = (id: string) => chain(id).length - 1;
const isLeaf = (id: string) => !NODES.some((n) => n.parent === id);

export function absolutePath(target: string): string {
  return "/" + chain(target).slice(1).map((n) => n.name).join("/");
}

/** 現在地 cwd から target への相対パス。up＝「..」1回ごとに上がった先、down＝そこから下っていく名前 */
export function relativePath(cwd: string, target: string): { up: string[]; down: string[]; text: string } {
  const from = chain(cwd);
  const to = chain(target);
  let common = 0;
  while (common < from.length && common < to.length && from[common].id === to[common].id) common++;
  const up = from.slice(common - 1, -1).reverse().map((n) => n.id);
  const down = to.slice(common).map((n) => n.id);
  const text = [...up.map(() => ".."), ...down.map((id) => BY_ID[id].name)].join("/");
  return { up, down, text };
}

function Glyph({ kind, className = "" }: { kind: "dir" | "file"; className?: string }) {
  return kind === "dir" ? (
    <svg viewBox="0 0 20 16" className={`h-3.5 w-4 flex-none ${className}`} aria-hidden>
      <path d="M1.5 3.2c0-.9.7-1.7 1.7-1.7h4l1.8 2h7.8c.9 0 1.7.8 1.7 1.7v8.1c0 .9-.8 1.7-1.7 1.7H3.2c-1 0-1.7-.8-1.7-1.7Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 18" className={`h-4 w-3.5 flex-none ${className}`} aria-hidden>
      <path d="M2 1.5h7.5L14 6v10.5H2Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9.5 1.5V6H14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

type RowStyle = { row?: string; tag?: ReactNode; onClick?: () => void; pressed?: boolean };

/** エクスプローラ風の木。各行の見た目と右端の札は style(id) で決める */
function Tree({ style, testId }: { style: (n: Node) => RowStyle; testId?: string }) {
  return (
    <ul className="space-y-0.5 rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200" data-testid={testId}>
      {NODES.map((n) => {
        const s = style(n);
        const d = depth(n.id);
        const inner = (
          <>
            {Array.from({ length: d }, (_, i) => (
              <span key={i} aria-hidden className="w-4 flex-none self-stretch border-l border-gray-300" />
            ))}
            <Glyph kind={n.kind} className={n.kind === "dir" ? "text-amber-600" : "text-gray-500"} />
            <span className="ml-1.5 font-mono text-[13px]">{n.id === "root" ? "/（ルート）" : n.name}</span>
            {s.tag && <span className="ml-auto pl-2">{s.tag}</span>}
          </>
        );
        const cls = `flex w-full items-center rounded-md px-1.5 py-1 text-left text-gray-800 ${s.row ?? ""}`;
        return (
          <li key={n.id} data-node={n.id}>
            {s.onClick ? (
              <button type="button" onClick={s.onClick} aria-pressed={s.pressed} className={`${cls} transition active:scale-[0.99]`}>
                {inner}
              </button>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Tag({ children, tone }: { children: ReactNode; tone: "brand" | "gray" | "amber" | "dark" }) {
  const c = {
    brand: "bg-brand-600 text-white",
    gray: "bg-white text-gray-500 ring-1 ring-gray-300",
    amber: "bg-amber-100 text-amber-800",
    dark: "bg-gray-900 text-white",
  }[tone];
  return <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-bold ${c}`}>{children}</span>;
}

// ---------------------------------------------------------------------------
// ① 木の形
// ---------------------------------------------------------------------------

function TreePanel() {
  return (
    <Panel>
      <SectionTitle step={1}>ファイルとディレクトリは「木」の形</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        いちばん上が<b className="text-gray-800">ルート</b>。そこからディレクトリが枝分かれし、ファイルはその中に入ります。途中の分かれ目を<b className="text-gray-800">節</b>、行き止まりを<b className="text-gray-800">葉</b>と呼びます。
      </p>
      <div className="mt-3">
        <Tree
          testId="fs-tree-roles"
          style={(n) => {
            if (n.id === "root") return { tag: <Tag tone="dark">根</Tag> };
            if (isLeaf(n.id))
              return {
                row: n.kind === "dir" ? "bg-amber-50 ring-1 ring-amber-300" : "",
                tag: <Tag tone="gray">{n.kind === "dir" ? "葉（空のディレクトリ）" : "葉"}</Tag>,
              };
            return { tag: <Tag tone="brand">節</Tag> };
          }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] leading-relaxed">
        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-gray-200">
          <Caption className="flex items-center gap-1">
            <Glyph kind="file" className="text-gray-500" />
            ファイル
          </Caption>
          <p className="mt-1 text-gray-700">
            中に何も入れられないので、<b>必ず葉</b>。
          </p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-gray-200">
          <Caption className="flex items-center gap-1">
            <Glyph kind="dir" className="text-amber-600" />
            ディレクトリ
          </Caption>
          <p className="mt-1 text-gray-700">
            中身があれば<b>節</b>、空なら<b>葉</b>。
          </p>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② パス
// ---------------------------------------------------------------------------

const CWD_OPTIONS: { value: string; label: string }[] = [
  { value: "sato", label: "sato" },
  { value: "suzuki", label: "suzuki" },
  { value: "home", label: "home" },
];
const TARGETS = ["memo", "plan", "price"];

function PathPanel() {
  const [cwd, setCwd] = useState("sato");
  const [target, setTarget] = useState("plan");
  const rel = relativePath(cwd, target);
  const onUp = new Set(rel.up);
  const onDown = new Set(rel.down);

  return (
    <Panel>
      <SectionTitle step={2}>パス ― 場所の書き方は2通り</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        いま開いているディレクトリが<b className="text-gray-800">現在地（カレントディレクトリ）</b>。現在地を変えて、2つの書き方を比べます。行き先のファイルは木の中で選べます。
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="flex-none text-xs font-bold text-gray-600">現在地</span>
        <div className="flex-1">
          <Seg testId="fs-cwd" value={cwd} onChange={setCwd} options={CWD_OPTIONS} />
        </div>
      </div>
      <div className="mt-2">
        <Tree
          testId="fs-tree-path"
          style={(n) => {
            const pickable = TARGETS.includes(n.id);
            const pick = pickable ? { onClick: () => setTarget(n.id), pressed: target === n.id } : {};
            if (n.id === cwd) return { row: "bg-white ring-2 ring-gray-900", tag: <Tag tone="dark">現在地</Tag>, ...pick };
            if (n.id === target) return { row: "bg-brand-600 !text-white", tag: <Tag tone="gray">行き先</Tag>, ...pick };
            if (onUp.has(n.id)) return { row: "bg-amber-50 ring-1 ring-amber-300", tag: <Tag tone="amber">「..」で上がる</Tag>, ...pick };
            if (onDown.has(n.id)) return { row: "bg-brand-50 ring-1 ring-brand-200", ...pick };
            if (pickable) return { row: "ring-1 ring-dashed ring-gray-300", tag: <span className="text-[11px] text-gray-400">選べる</span>, ...pick };
            return {};
          }}
        />
      </div>

      <div className="mt-3 space-y-2" data-testid="fs-paths" data-cwd={cwd} data-target={target}>
        <div className="rounded-xl px-3 py-2 ring-1 ring-gray-200">
          <Caption>絶対パス ― ルートから全部（現在地に関係なく同じ）</Caption>
          <p className="mt-1 break-all font-mono text-[15px] font-bold text-gray-900" data-testid="fs-abs">
            {absolutePath(target)}
          </p>
        </div>
        <div className="rounded-xl px-3 py-2 ring-1 ring-brand-200 bg-brand-50/40">
          <Caption>相対パス ― 現在地から</Caption>
          <p className="mt-1 flex flex-wrap items-center gap-1 font-mono text-[15px] font-bold" data-testid="fs-rel" data-text={rel.text}>
            {rel.up.map((id, i) => (
              <span key={`u${id}`} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-400">/</span>}
                <span className="rounded bg-amber-100 px-1 text-amber-800">..</span>
              </span>
            ))}
            {rel.down.map((id, i) => (
              <span key={`d${id}`} className="flex items-center gap-1">
                {(i > 0 || rel.up.length > 0) && <span className="text-gray-400">/</span>}
                <span className={id === target ? "text-brand-700" : "text-brand-600"}>{BY_ID[id].name}</span>
              </span>
            ))}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-600">
            {rel.up.length > 0 ? (
              <>
                <span className="font-bold text-amber-700">「..」＝1つ上へ</span>を{rel.up.length}回、そこから下へたどる
              </>
            ) : (
              <>現在地の下にあるので、そのまま下へたどる</>
            )}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-500">区切りは「/」のほか、問題によっては「\」で書かれます。意味は同じです。</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 拡張子
// ---------------------------------------------------------------------------

type ExtMode = "jpg" | "txt";

function ExtensionPanel() {
  const [mode, setMode] = useState<ExtMode>("jpg");
  const [shown, setShown] = useState(true);
  const renamed = mode === "txt";
  return (
    <Panel>
      <SectionTitle step={3}>拡張子は「名前の末尾の目印」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        photo<b className="text-gray-800">.jpg</b> の「.jpg」が拡張子。OSはこれを見て、<b className="text-gray-800">どのアプリで開くか</b>を決めます（関連付け）。
      </p>

      <div className="mt-3">
        <Seg
          testId="fs-ext-mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "jpg", label: "photo.jpg" },
            { value: "txt", label: "名前を photo.txt に変更" },
          ]}
        />
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2" data-testid="fs-ext" data-mode={mode}>
        <div className="rounded-xl bg-white p-2 ring-1 ring-gray-300">
          <div className="text-center font-mono text-[13px] font-bold">
            photo<span className={renamed ? "rounded bg-amber-100 px-0.5 text-amber-800" : "text-brand-700"}>.{mode}</span>
          </div>
          <div className="mt-1.5 rounded-lg bg-gray-100 px-2 py-1.5 text-center text-[11px] leading-snug text-gray-600">
            中身
            <br />
            <b className="text-gray-800">JPEG画像のまま</b>
          </div>
        </div>
        <span aria-hidden className="text-base font-bold text-gray-400">→</span>
        <div className={`rounded-xl p-2 text-center ring-1 ${renamed ? "bg-rose-50 ring-rose-300" : "bg-emerald-50 ring-emerald-300"}`}>
          <div className="text-[11px] font-bold text-gray-500">開くアプリ</div>
          <div className="mt-0.5 text-[13px] font-bold text-gray-800">{renamed ? "メモ帳" : "写真ビューア"}</div>
          <div className={`mt-1 text-[11px] font-bold ${renamed ? "text-rose-700" : "text-emerald-700"}`}>{renamed ? "文字化けして読めない" : "写真が見える"}</div>
        </div>
      </div>
      <Note>
        <InlineIcon name="lightbulb" />
        名前を変えても<b>データは変換されない</b>。変わるのは「どのアプリで開くか」だけ。
      </Note>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <Caption>拡張子を隠すと、偽装に気付けない</Caption>
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-pressed={shown}
            className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-700 active:scale-95"
            data-testid="fs-ext-toggle"
          >
            拡張子を{shown ? "隠す" : "表示する"}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-gray-200" data-testid="fs-ext-disguise" data-shown={shown}>
          <Glyph kind="file" className="text-gray-500" />
          <span className="font-mono text-[13px] font-bold text-gray-800">
            請求書.pdf{shown && <span className="rounded bg-rose-100 px-0.5 text-rose-700">.exe</span>}
          </span>
          <span className={`ml-auto text-[11px] font-bold ${shown ? "text-rose-700" : "text-gray-500"}`}>{shown ? "本当はプログラム" : "PDFに見える"}</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-gray-600">本当の拡張子は最後の「.exe」。開くとプログラムが動いてしまう。名前だけで安全とは判断しない。</p>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ アクセス権
// ---------------------------------------------------------------------------

type Right = "read" | "write" | "exec";
type Who = "sales" | "acct" | "other";

const RIGHTS: { key: Right; label: string; does: string }[] = [
  { key: "read", label: "読取り", does: "開いて見る" },
  { key: "write", label: "書込み", does: "変更・保存・削除" },
  { key: "exec", label: "実行", does: "プログラムを動かす" },
];

const GROUPS: { key: Who; label: string; person: string; job: string; grant: Right[] }[] = [
  { key: "sales", label: "営業部", person: "営業部の佐藤さん", job: "見積書を作って更新する", grant: ["read", "write"] },
  { key: "acct", label: "経理部", person: "経理部の田中さん", job: "見積額を確認するだけ", grant: ["read"] },
  { key: "other", label: "その他", person: "ほかの部署の人", job: "この資料を使う仕事がない", grant: [] },
];

function PermissionPanel() {
  const [who, setWho] = useState<Who>("acct");
  const g = GROUPS.find((x) => x.key === who)!;
  return (
    <Panel>
      <SectionTitle step={4}>アクセス権 ― 誰に、何をさせるか</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        共有サーバの「見積書」ディレクトリ。権限は1人ずつではなく<b className="text-gray-800">グループ（部署）ごと</b>に付けると、異動してもグループを移すだけで済みます。
      </p>

      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-200" data-testid="fs-perm-table">
        <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] bg-gray-100 text-center text-[11px] font-bold text-gray-700">
          <span className="py-1.5" />
          {RIGHTS.map((r) => (
            <span key={r.key} className="py-1.5 leading-tight">
              {r.label}
              <span className="block text-[10px] font-normal text-gray-500">{r.does}</span>
            </span>
          ))}
        </div>
        {GROUPS.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={() => setWho(row.key)}
            aria-pressed={who === row.key}
            className={`grid w-full grid-cols-[4.5rem_1fr_1fr_1fr] border-t border-gray-100 text-center text-[13px] transition ${
              who === row.key ? "bg-brand-50 ring-2 ring-inset ring-brand-400" : "bg-white"
            }`}
          >
            <span className="py-2 text-left pl-2 font-bold text-gray-800">{row.label}</span>
            {RIGHTS.map((r) => {
              const ok = row.grant.includes(r.key);
              return (
                <span key={r.key} className={`py-1.5 text-base font-bold ${ok ? "text-emerald-600" : "text-gray-300"}`}>
                  {ok ? "○" : "×"}
                  <span className="sr-only">{ok ? "許可" : "なし"}</span>
                </span>
              );
            })}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-gray-500">行をタップすると、その人ができることが分かります。</p>

      <div className="mt-2 rounded-xl bg-gray-50 px-3 py-2.5 text-[13px] leading-relaxed ring-1 ring-gray-200" data-testid="fs-perm-who" data-who={who}>
        <p className="font-bold text-gray-900">
          {g.person}（仕事：{g.job}）
        </p>
        <p className="mt-1 text-gray-700">
          {g.grant.length === 0
            ? "ディレクトリを開くこともできない。仕事に要らないので、与えない。"
            : g.grant.includes("write")
              ? "開いて見る・書き換えて保存できる。仕事に書き換えが必要だから。"
              : "開いて見られるが、書き換え・削除はできない。確認するだけなら読取りで十分。"}
        </p>
      </div>
      <Note>
        <InlineIcon name="lightbulb" />
        仕事に<b>必要な分だけ</b>許すのが<b>最小権限の原則</b>。誤って消す・書き換える、情報が漏れる、といった被害の範囲を小さくできる。見積書は資料なので、<b>実行</b>はどのグループにも要らない。
      </Note>
    </Panel>
  );
}
