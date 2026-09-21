import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./normalization.module.css";

// 「列（項目）がどこへ移動したか」を見失わないための Morphing Table。
// 表は「項目の行」を縦に並べたカードで描く（390px でも横スクロールしない）。
// 同じ項目は段階が変わっても同じ色・同じ data-flip-id を持ち、FLIP で新しい表へ飛んでいく。

export type FieldId = "orderNo" | "orderDate" | "custNo" | "custName" | "prodNo" | "prodName" | "price" | "qty";
type Group = "order" | "customer" | "product" | "detail";

export const FIELDS: Record<FieldId, { label: string; group: Group }> = {
  orderNo: { label: "注文番号", group: "order" },
  orderDate: { label: "注文日", group: "order" },
  custNo: { label: "顧客番号", group: "customer" },
  custName: { label: "顧客名", group: "customer" },
  prodNo: { label: "商品番号", group: "product" },
  prodName: { label: "商品名", group: "product" },
  price: { label: "単価", group: "product" },
  qty: { label: "数量", group: "detail" },
};

export const GROUP_LABEL: Record<Group, string> = {
  order: "注文の情報",
  customer: "顧客の情報",
  product: "商品の情報",
  detail: "明細の情報",
};

type Rec = Record<FieldId, string>;

// 第1正規形の3行（＝1枚の伝票を展開したもの）
const RECORDS: Rec[] = [
  { orderNo: "1001", orderDate: "6/21", custNo: "C01", custName: "田中商店", prodNo: "P10", prodName: "りんご", price: "100", qty: "5" },
  { orderNo: "1001", orderDate: "6/21", custNo: "C01", custName: "田中商店", prodNo: "P20", prodName: "みかん", price: "80", qty: "10" },
  { orderNo: "1002", orderDate: "6/22", custNo: "C02", custName: "鈴木屋", prodNo: "P10", prodName: "りんご", price: "100", qty: "3" },
];

export type TableId = "slip" | "flat" | "orders" | "customers" | "products" | "details";

type TableDef = {
  id: TableId;
  name: string;
  fields: FieldId[];
  keys: FieldId[];
  /** 他の表の主キーを指す項目（外部キー） */
  fks?: FieldId[];
  /** 非正規形の「繰り返し」グループ */
  repeating?: FieldId[];
  warn?: Partial<Record<FieldId, string>>;
};

export const STAGE_TABLES: TableDef[][] = [
  [
    {
      id: "slip",
      name: "注文伝票（非正規形）",
      fields: ["orderNo", "orderDate", "custNo", "custName", "prodNo", "prodName", "price", "qty"],
      keys: ["orderNo"],
      repeating: ["prodNo", "prodName", "price", "qty"],
    },
  ],
  [
    {
      id: "flat",
      name: "注文表（第1正規形）",
      fields: ["orderNo", "prodNo", "orderDate", "custNo", "custName", "prodName", "price", "qty"],
      keys: ["orderNo", "prodNo"],
    },
  ],
  [
    {
      id: "orders",
      name: "注文表",
      fields: ["orderNo", "orderDate", "custNo", "custName"],
      keys: ["orderNo"],
      warn: { custName: "顧客番号で決まる" },
    },
    { id: "products", name: "商品表", fields: ["prodNo", "prodName", "price"], keys: ["prodNo"] },
    { id: "details", name: "注文明細", fields: ["orderNo", "prodNo", "qty"], keys: ["orderNo", "prodNo"], fks: ["orderNo", "prodNo"] },
  ],
  [
    { id: "orders", name: "注文表", fields: ["orderNo", "orderDate", "custNo"], keys: ["orderNo"], fks: ["custNo"] },
    { id: "customers", name: "顧客表", fields: ["custNo", "custName"], keys: ["custNo"] },
    { id: "details", name: "注文明細", fields: ["orderNo", "prodNo", "qty"], keys: ["orderNo", "prodNo"], fks: ["orderNo", "prodNo"] },
    { id: "products", name: "商品表", fields: ["prodNo", "prodName", "price"], keys: ["prodNo"] },
  ],
];

/** 外部キー → 参照先の主キー。表どうしをつなぐ線になる。 */
const LINKS: { from: [TableId, FieldId]; to: [TableId, FieldId] }[] = [
  { from: ["details", "orderNo"], to: ["orders", "orderNo"] },
  { from: ["details", "prodNo"], to: ["products", "prodNo"] },
  { from: ["orders", "custNo"], to: ["customers", "custNo"] },
];

// ---------- 値の計算 ----------

function recordsFor(priceUp: boolean, flat: boolean): Rec[] {
  if (!priceUp) return RECORDS;
  // 重複を持つ表では「1か所だけ直して、もう1か所を直し忘れた」状態を再現する
  return RECORDS.map((r, i) =>
    r.prodNo === "P10" && (!flat || i === 0) ? { ...r, price: "120" } : r,
  );
}

type Chip = { v: string; dup: boolean; conflict: boolean; changed: boolean };

function projectRows(table: TableDef, priceUp: boolean): Chip[][] {
  const flat = table.id === "slip" || table.id === "flat";
  const recs = recordsFor(priceUp, flat);
  const seen = new Set<string>();
  const rows: Rec[] = [];
  for (const r of recs) {
    const key = table.fields.map((f) => r[f]).join("|");
    const identity = table.keys.map((f) => r[f]).join("|");
    const dedupeBy = table.id === "flat" ? key : identity;
    if (seen.has(dedupeBy)) continue;
    seen.add(dedupeBy);
    rows.push(r);
  }
  return table.fields.map((f) => {
    const values = rows.map((r) => r[f]);
    const isKey = table.keys.includes(f);
    return rows.map((r, i) => {
      const v = values[i];
      const repeats = values.filter((x) => x === v).length > 1;
      const conflict = f === "price" && priceUp && r.prodNo === "P10" && flat;
      return {
        v,
        dup: !isKey && repeats && !conflict,
        conflict,
        changed: f === "price" && priceUp && v === "120",
      };
    });
  });
}

// ---------- FLIP ----------

type Box = { left: number; top: number; right: number };
type Rects = Map<string, Box>;

/** root 基準の位置。transform（FLIP 中）やページのスクロールに影響されない。 */
function boxWithin(el: HTMLElement, root: HTMLElement): Box {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { left, top, right: left + el.offsetWidth };
}

function snapshot(root: HTMLElement): Rects {
  const map: Rects = new Map();
  root.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((el) => {
    const id = el.dataset.flipId!;
    if (!map.has(id)) map.set(id, boxWithin(el, root));
  });
  return map;
}

type Line = { id: string; d: string };

function measureLines(root: HTMLElement): Line[] {
  const lines: Line[] = [];
  for (const link of LINKS) {
    const a = root.querySelector<HTMLElement>(`[data-table="${link.from[0]}"] [data-field="${link.from[1]}"]`);
    const b = root.querySelector<HTMLElement>(`[data-table="${link.to[0]}"] [data-field="${link.to[1]}"]`);
    if (!a || !b) continue;
    const ra = boxWithin(a, root);
    const rb = boxWithin(b, root);
    const ay = ra.top + 11;
    const by = rb.top + 11;
    let d: string;
    if (Math.abs(ra.left - rb.left) < 8) {
      // 同じ列のカード同士：左側にふくらませてつなぐ
      const x = ra.left;
      d = `M ${x} ${ay} C ${x - 14} ${ay}, ${x - 14} ${by}, ${x} ${by}`;
    } else {
      const leftToRight = ra.left < rb.left;
      const ax = leftToRight ? ra.right : ra.left;
      const bx = leftToRight ? rb.left : rb.right;
      const mid = (ax + bx) / 2;
      d = `M ${ax} ${ay} C ${mid} ${ay}, ${mid} ${by}, ${bx} ${by}`;
    }
    lines.push({ id: `${link.from.join(".")}-${link.to.join(".")}`, d });
  }
  return lines;
}

// ---------- 描画 ----------

export function MorphingTables({
  stage,
  priceUp,
  reducedMotion,
}: {
  stage: number;
  priceUp: boolean;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastRects = useRef<Rects | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const tables = STAGE_TABLES[stage];

  // 1) 走っているアニメを止めて最終レイアウトを測る → 2) 接続線を引く → 3) 前回位置から FLIP
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const prev = lastRects.current;
    const current = snapshot(root);
    lastRects.current = current;
    setLines(stage >= 2 ? measureLines(root) : []);
    if (!prev || reducedMotion || typeof Element.prototype.animate !== "function") return;
    root.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((el) => {
      const from = prev.get(el.dataset.flipId!);
      const to = boxWithin(el, root);
      if (!from) {
        el.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], {
          duration: 420,
          delay: 260,
          easing: "ease-out",
          fill: "backwards",
        });
        return;
      }
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
        duration: 720,
        easing: "cubic-bezier(0.45, 0.05, 0.25, 1)",
      });
    });
  }, [stage, priceUp, reducedMotion]);

  // 画面幅が変わったら線だけ引き直す
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      lastRects.current = snapshot(root);
      setLines(stage >= 2 ? measureLines(root) : []);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [stage]);

  const single = tables.length === 1;

  return (
    <div ref={rootRef} className={styles.board} data-stage={stage} data-reduced-motion={reducedMotion ? "true" : "false"} data-testid="morph-board">
      <svg className={styles.links} aria-hidden>
        {lines.map((line) => (
          <path key={`${stage}-${line.id}`} d={line.d} className={styles.link} data-link={line.id} />
        ))}
      </svg>
      <div className={single ? styles.gridSingle : styles.grid}>
        {tables.map((table) => {
          const values = projectRows(table, priceUp);
          return (
            <section key={table.id} className={styles.card} data-table={table.id} aria-label={table.name}>
              <h4 className={styles.cardTitle} data-flip-id={`title-${table.id}`}>
                📋 {table.name}
              </h4>
              <ul className={styles.fields}>
                {table.fields.map((f, fi) => {
                  const meta = FIELDS[f];
                  const isKey = table.keys.includes(f);
                  const isFk = table.fks?.includes(f);
                  const repeating = table.repeating?.includes(f);
                  const chips = values[fi];
                  return (
                    <li
                      key={f}
                      className={styles.field}
                      data-flip-id={f}
                      data-field={f}
                      data-group={meta.group}
                      data-repeating={repeating ? "true" : "false"}
                      style={{ "--group": `var(--g-${meta.group})` } as CSSProperties}
                    >
                      <span className={styles.fieldHead}>
                        <span className={styles.fieldName}>{meta.label}</span>
                        {isKey && <span className={styles.keyBadge}>主キー</span>}
                        {isFk && <span className={styles.fkBadge}>→参照</span>}
                        {repeating && fi === table.fields.indexOf(table.repeating![0]) && (
                          <span className={styles.repeatBadge}>繰り返し</span>
                        )}
                        {table.warn?.[f] && <span className={styles.warnBadge}>{table.warn[f]}</span>}
                      </span>
                      <span className={styles.values}>
                        {repeating ? (
                          <RepeatingValues field={f} priceUp={priceUp} />
                        ) : (
                          chips.map((c, ci) => (
                            <span
                              key={`${ci}-${c.v}`}
                              className={styles.chip}
                              data-dup={c.dup ? "true" : "false"}
                              data-conflict={c.conflict ? "true" : "false"}
                              data-changed={c.changed ? "true" : "false"}
                            >
                              {c.v}
                            </span>
                          ))
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** 非正規形：1つの注文に明細がぶら下がる（注文ごとに［ ］でくくる） */
function RepeatingValues({ field, priceUp }: { field: FieldId; priceUp: boolean }) {
  const recs = recordsFor(priceUp, true);
  const orders = [...new Set(recs.map((r) => r.orderNo))];
  const all = recs.map((r) => r[field]);
  return (
    <>
      {orders.map((o) => (
        <span key={o} className={styles.bundle}>
          {recs
            .filter((r) => r.orderNo === o)
            .map((r, i) => {
              const v = r[field];
              const conflict = field === "price" && priceUp && r.prodNo === "P10";
              const dup = (field === "prodName" || field === "price") && all.filter((x) => x === v).length > 1 && !conflict;
              return (
                <span
                  key={`${o}-${i}`}
                  className={styles.chip}
                  data-dup={dup ? "true" : "false"}
                  data-conflict={conflict ? "true" : "false"}
                  data-changed={conflict && v === "120" ? "true" : "false"}
                >
                  {v}
                </span>
              );
            })}
        </span>
      ))}
    </>
  );
}

