import type { MiniGame } from "@/types/minigame";

// SQL宝探し: 小さなテーブルから条件に合う行をタップで探す。
// テーマ: テーブル / 行・列 / 主キー / SELECT・WHERE / AND。
export const sqlTreasureGame: MiniGame = {
  id: "sql-treasure",
  title: "SQL宝探し",
  field: "technology",
  themes: ["データベース", "テーブル", "行と列", "SELECT文", "WHERE条件"],
  difficulty: 2,
  estimatedMinutes: 3,
  description:
    "表の中から、ミッションの条件に合う行をタップで選んで判定するゲームです。WHEREで「絞り込む」感覚を体で覚えます。",
  examPoints: [
    "表＝テーブル、横1行＝レコード、縦1列＝項目（フィールド）",
    "WHEREは条件で行を絞り込む命令",
    "ANDは「両方の条件を満たす」という意味",
  ],
  relatedTopicId: "tech-database-sql",
  content: {
    kind: "sql-treasure",
    rounds: [
      {
        id: "sql-r1",
        mission: "部署が「営業部」で、売上が100以上の人を選ぼう",
        table: {
          name: "employees",
          columns: [
            { key: "id", label: "id" },
            { key: "name", label: "名前" },
            { key: "dept", label: "部署" },
            { key: "sales", label: "売上" },
          ],
          rows: [
            { id: 1, values: [1, "佐藤", "営業部", 120] },
            { id: 2, values: [2, "鈴木", "開発部", 80] },
            { id: 3, values: [3, "田中", "営業部", 90] },
            { id: 4, values: [4, "山田", "営業部", 150] },
          ],
        },
        correctRowIds: [1, 4],
        conditions: ["部署 = '営業部'", "売上 >= 100"],
        sql: "SELECT * FROM employees\nWHERE dept = '営業部'\n  AND sales >= 100;",
        explanation:
          "営業部の人は佐藤・田中・山田。そのうち売上が100以上なのは佐藤(120)と山田(150)。田中は営業部でも売上90なので、ANDの「両方」を満たさず対象外です。",
      },
      {
        id: "sql-r2",
        mission: "在庫が0の商品（売り切れ）を選ぼう",
        table: {
          name: "products",
          columns: [
            { key: "id", label: "id" },
            { key: "name", label: "商品名" },
            { key: "price", label: "価格" },
            { key: "stock", label: "在庫" },
          ],
          rows: [
            { id: 1, values: [1, "ノート", 200, 0] },
            { id: 2, values: [2, "ペン", 100, 35] },
            { id: 3, values: [3, "消しゴム", 80, 0] },
            { id: 4, values: [4, "定規", 150, 12] },
          ],
        },
        correctRowIds: [1, 3],
        conditions: ["在庫 = 0"],
        sql: "SELECT * FROM products\nWHERE stock = 0;",
        explanation:
          "条件は1つだけ。在庫が0なのはノートと消しゴムです。価格は条件に入っていないので見なくてOK。WHEREは「必要な行だけ」を取り出す命令です。",
      },
      {
        id: "sql-r3",
        mission: "学年が3年で、点数が80以上の生徒を選ぼう",
        table: {
          name: "students",
          columns: [
            { key: "id", label: "id" },
            { key: "name", label: "名前" },
            { key: "grade", label: "学年" },
            { key: "score", label: "点数" },
          ],
          rows: [
            { id: 1, values: [1, "井上", 3, 92] },
            { id: 2, values: [2, "加藤", 2, 88] },
            { id: 3, values: [3, "木村", 3, 75] },
            { id: 4, values: [4, "小林", 3, 80] },
          ],
        },
        correctRowIds: [1, 4],
        conditions: ["学年 = 3", "点数 >= 80"],
        sql: "SELECT * FROM students\nWHERE grade = 3\n  AND score >= 80;",
        explanation:
          "3年生は井上・木村・小林。点数80以上は井上(92)と小林(80)。「80以上」は80ちょうどを含みます。加藤は点数は足りても2年生なので、学年の条件で外れます。",
      },
    ],
  },
};
