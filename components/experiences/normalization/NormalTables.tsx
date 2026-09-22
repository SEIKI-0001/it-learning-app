import type { CSSProperties } from "react";
import styles from "./normalization.module.css";

// 正規化の各段階の表を、行×列のふつうの表（2D）で描く。
// 列見出しの色＝項目のグループ（注文/顧客/商品/明細）。段階が変わっても同じ項目は同じ色。
// 重複セル＝黄、値上げの食い違い＝赤、1か所の修正＝緑。

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
  /** 他の表の主キーを指す項目（外部キー）→ 参照先の表名 */
  fks?: Partial<Record<FieldId, string>>;
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
    {
      id: "details",
      name: "注文明細",
      fields: ["orderNo", "prodNo", "qty"],
      keys: ["orderNo", "prodNo"],
      fks: { orderNo: "注文表", prodNo: "商品表" },
    },
  ],
  [
    { id: "orders", name: "注文表", fields: ["orderNo", "orderDate", "custNo"], keys: ["orderNo"], fks: { custNo: "顧客表" } },
    { id: "customers", name: "顧客表", fields: ["custNo", "custName"], keys: ["custNo"] },
    {
      id: "details",
      name: "注文明細",
      fields: ["orderNo", "prodNo", "qty"],
      keys: ["orderNo", "prodNo"],
      fks: { orderNo: "注文表", prodNo: "商品表" },
    },
    { id: "products", name: "商品表", fields: ["prodNo", "prodName", "price"], keys: ["prodNo"] },
  ],
];

// ---------- 値の計算 ----------

function recordsFor(priceUp: boolean, flat: boolean): Rec[] {
  if (!priceUp) return RECORDS;
  // 重複を持つ表では「1か所だけ直して、もう1か所を直し忘れた」状態を再現する
  return RECORDS.map((r, i) => (r.prodNo === "P10" && (!flat || i === 0) ? { ...r, price: "120" } : r));
}

type Cell = { v: string; dup: boolean; conflict: boolean; changed: boolean };

/** 表の行（重複行はまとめる）。非正規形は注文ごとに1行で、繰り返し項目は複数値を持つ。 */
function tableRows(table: TableDef, priceUp: boolean): Cell[][][] {
  const flat = table.id === "slip" || table.id === "flat";
  const recs = recordsFor(priceUp, flat);
  const groupBy = table.id === "slip" ? ["orderNo"] : table.id === "flat" ? table.fields : table.keys;
  const rows: Rec[][] = [];
  const index = new Map<string, number>();
  for (const r of recs) {
    const k = groupBy.map((f) => r[f as FieldId]).join("|");
    if (!index.has(k)) {
      index.set(k, rows.length);
      rows.push([]);
    }
    rows[index.get(k)!].push(r);
  }
  const column = (f: FieldId) => recs.map((r) => r[f]);
  return rows.map((group) =>
    table.fields.map((f) => {
      const isKey = table.keys.includes(f);
      const repeating = table.repeating?.includes(f);
      const members = repeating ? group : [group[0]];
      return members.map((r) => {
        const v = r[f];
        const conflict = f === "price" && priceUp && r.prodNo === "P10" && flat;
        // 同じ値が表の中に何度も出てくる＝重複（主キーと非正規形の注文側の列は除く）
        const countable = !isKey && (table.id !== "slip" || f === "prodName" || f === "price");
        const repeats = countable && flat && column(f).filter((x) => x === v).length > 1;
        return { v, dup: repeats && !conflict, conflict, changed: f === "price" && priceUp && v === "120" };
      });
    }),
  );
}

// ---------- 描画 ----------

export function NormalTables({ stage, priceUp }: { stage: number; priceUp: boolean }) {
  const tables = STAGE_TABLES[stage];
  return (
    <div className={styles.board} data-stage={stage} data-testid="norm-board" key={stage}>
      {tables.map((table) => {
        const rows = tableRows(table, priceUp);
        return (
          <section key={table.id} className={styles.card} data-table={table.id} aria-label={table.name}>
            <h4 className={styles.cardTitle}>📋 {table.name}</h4>
            <div className={styles.scroll}>
              <table className={styles.table} data-wide={table.fields.length > 5 ? "true" : "false"}>
                <thead>
                  <tr>
                    {table.fields.map((f) => {
                      const meta = FIELDS[f];
                      const isKey = table.keys.includes(f);
                      const fk = table.fks?.[f];
                      const repeating = table.repeating?.includes(f);
                      return (
                        <th
                          key={f}
                          scope="col"
                          data-field={f}
                          data-group={meta.group}
                          data-key={isKey ? "true" : "false"}
                          data-repeating={repeating ? "true" : "false"}
                          style={{ "--group": `var(--g-${meta.group})` } as CSSProperties}
                        >
                          <span className={styles.fieldName}>
                            {/* 列が多い表は見出しを2文字ずつ折り返し、390px幅に収める */}
                            {table.fields.length > 5 && meta.label.length > 3 ? (
                              <>
                                {meta.label.slice(0, 2)}
                                <br />
                                {meta.label.slice(2)}
                              </>
                            ) : (
                              meta.label
                            )}
                          </span>
                          {(isKey || fk || table.warn?.[f]) && (
                            <span className={styles.badges}>
                              {isKey && <span className={styles.keyBadge}>主キー</span>}
                              {fk && <span className={styles.fkBadge}>→{fk}</span>}
                              {table.warn?.[f] && <span className={styles.warnBadge}>{table.warn[f]}</span>}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cells, fi) => {
                        const f = table.fields[fi];
                        return (
                          <td
                            key={f}
                            data-field={f}
                            data-key={table.keys.includes(f) ? "true" : "false"}
                            data-repeating={table.repeating?.includes(f) ? "true" : "false"}
                          >
                            {cells.map((c, ci) => (
                              <span
                                key={ci}
                                className={styles.value}
                                data-dup={c.dup ? "true" : "false"}
                                data-conflict={c.conflict ? "true" : "false"}
                                data-changed={c.changed ? "true" : "false"}
                              >
                                {c.v}
                              </span>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
