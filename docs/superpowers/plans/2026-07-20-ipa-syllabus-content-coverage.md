# IPA Syllabus Content Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** IPA公式「ITパスポート試験シラバス Ver.6.5」の全63項目を、既存Topic IDと進捗互換性を維持したまま「学ぶ」画面の解説・図解・確認問題へ対応付ける。

**Architecture:** 既存の `createCompactTopic` と18テーマの学習カタログを維持し、分野別Topicファイルへ20件を追加、8件を拡張する。IPAの63項目とTopicの関係は `data/ipaSyllabus.ts` の型付きマニフェストへ集約し、Markdown対応表は人間向けの投影、自動テストは機械向けの検証として同じ対応内容を確認する。

**Tech Stack:** Next.js 16.2.9、React 19.2.4、TypeScript 5、Vitest 4、ESLint 9、既存 `createCompactTopic` データモデル

## Global Constraints

- 正式な基準はIPA公式「ITパスポート試験シラバス Ver.6.5」の項目1〜63とする。
- 市販参考書の番号、見出し、順序、書名をデータ、ドキュメント、テストへ保存しない。
- 既存Topic IDは変更・削除しない。
- UI全体、認証、課金、モチット、進捗ロジックを変更しない。
- 既存の未コミット変更へ触れない。
- 新規Topicは `createCompactTopic` を使い、図解と4問以上の4択問題を持たせる。
- 各問題は正答理由と3つの誤答理由を持つ。
- RAID、生産管理、通信経路数、性能評価には計算問題を含める。
- 参考書本文を転載せず、IT未経験者向けのオリジナル解説を作る。

---

## File Structure

- Create: `data/ipaSyllabus.ts` — IPA Ver.6.5の63項目とTopic IDの対応マニフェスト
- Modify: `data/topics/strategy.ts` — ストラテジ新規7Topicと既存5Topicの拡張
- Modify: `data/topics/management.ts` — マネジメント新規5Topic
- Modify: `data/topics/technology.ts` — テクノロジ新規8Topicと既存3Topicの拡張
- Modify: `data/learningCatalog.ts` — 新規20Topicの一意な学習導線
- Create: `docs/content/ipa-syllabus-coverage.md` — IPA項目1〜63の人間向け対応表
- Create: `test/ipaSyllabusCoverage.test.ts` — 63項目、Topic品質、互換性の自動検証
- Modify: `test/targetTopicCorrections.test.ts` — 拡張する既存Topicの内容契約

## Interfaces

`data/ipaSyllabus.ts` が提供する公開インタフェース:

```ts
import type { TopicField } from "@/types/content";

export type IpaCoverageStatus = "covered" | "expanded" | "new";

export type IpaSyllabusItem = {
  id: `ipa-${string}`;
  number: number;
  field: TopicField;
  majorCategory: string;
  middleCategory: string;
  item: string;
  topicIds: string[];
  coverage: IpaCoverageStatus;
  note: string;
};

export const IPA_SYLLABUS_VERSION = "6.5" as const;
export const ipaSyllabusItems: IpaSyllabusItem[] = [];
```

新規Topic IDの固定契約:

```ts
export const EXPECTED_NEW_TOPIC_IDS = [
  "strat-corporation-management-organization",
  "strat-decision-problem-solving",
  "strat-technology-development-strategy",
  "strat-business-systems",
  "strat-engineering-systems",
  "strat-production-management",
  "strat-embedded-systems",
  "mgmt-system-design",
  "mgmt-operation-maintenance",
  "mgmt-pmbok-basics",
  "mgmt-project-resource",
  "mgmt-project-communication",
  "tech-system-processing-architecture",
  "tech-raid",
  "tech-system-performance",
  "tech-parallel-systems",
  "tech-computer-types",
  "tech-file-system",
  "tech-backup",
  "tech-network-devices",
] as const;
```

---

### Task 1: Add Failing Coverage and Compatibility Contracts

**Files:**
- Create: `test/ipaSyllabusCoverage.test.ts`
- Modify: `test/targetTopicCorrections.test.ts`
- Reference: `data/topics/index.ts`
- Reference: `data/learningCatalog.ts`

**Consumes:** `topics`, `getAllTopics()`, `getOrderedLessonIds()` and current Topic shape.

**Produces:** A RED test suite that names all 20 new Topic IDs, all 8 existing Topic expansions, required question quality, and the future IPA manifest interface.

- [ ] **Step 1: Capture the existing Topic ID compatibility baseline**

Add the current IDs to `test/ipaSyllabusCoverage.test.ts` before production changes. The test must compare the baseline as a subset so additions are allowed but deletion or renaming fails.

```ts
const EXISTING_TOPIC_IDS = [
  "tech-binary-data", "tech-network-address", "tech-security-cia",
  "tech-computer-core", "tech-os-software-hardware", "tech-lan-wan",
  "tech-web-internet-basics", "tech-http-https", "tech-database-sql",
  "tech-keys", "tech-normalization", "tech-encryption-hash",
  "tech-common-key-crypto", "tech-public-key-crypto", "tech-auth-authz-mfa",
  "tech-malware-phishing-ransomware", "tech-firewall-vpn-zero-trust",
  "tech-cloud-models", "tech-ai-ml", "tech-iot", "tech-algorithm-flowchart",
  "tech-programming-basics", "tech-data-utilization", "tech-api",
  "tech-reliability-availability", "tech-logic-operations", "tech-spreadsheet",
  "tech-data-structure", "tech-transaction", "tech-cyber-attacks",
  "tech-digital-signature", "tech-isms-risk", "tech-wireless-mobile",
  "tech-email-protocol", "tech-io-devices", "tech-ui-ux",
  "tech-multimedia-compression", "mgmt-pm-qcd", "mgmt-wbs-gantt",
  "mgmt-service-sla", "mgmt-itil", "mgmt-system-audit",
  "mgmt-development-process", "mgmt-requirements-definition", "mgmt-testing",
  "mgmt-pdca", "mgmt-risk-management", "mgmt-facility-management",
  "mgmt-estimation", "strat-swot", "strat-enterprise-activities", "strat-3c",
  "strat-marketing-4p", "strat-accounting-break-even", "strat-legal-compliance",
  "strat-intellectual-property", "strat-privacy-law", "strat-security-laws",
  "strat-system-strategy", "strat-business-process", "strat-solution-business",
  "strat-ppm", "strat-value-chain", "strat-management-systems",
  "strat-goal-evaluation", "strat-financial-statements", "strat-generative-ai-dx",
  "strat-corporate-strategy", "strat-ebusiness", "strat-standardization",
  "strat-labor-laws", "strat-bcp", "strat-system-planning-rfp",
] as const;

it("keeps every pre-existing Topic ID", () => {
  const actual = new Set(getAllTopics().map((topic) => topic.id));
  expect(EXISTING_TOPIC_IDS.filter((id) => !actual.has(id))).toEqual([]);
});
```

- [ ] **Step 2: Add RED tests for the 20 new Topics and quality contract**

```ts
const NEW_TOPIC_IDS = [
  "strat-corporation-management-organization",
  "strat-decision-problem-solving",
  "strat-technology-development-strategy",
  "strat-business-systems",
  "strat-engineering-systems",
  "strat-production-management",
  "strat-embedded-systems",
  "mgmt-system-design",
  "mgmt-operation-maintenance",
  "mgmt-pmbok-basics",
  "mgmt-project-resource",
  "mgmt-project-communication",
  "tech-system-processing-architecture",
  "tech-raid",
  "tech-system-performance",
  "tech-parallel-systems",
  "tech-computer-types",
  "tech-file-system",
  "tech-backup",
  "tech-network-devices",
] as const;

it("provides every newly required Topic from the learning catalog", () => {
  const byId = new Map(getAllTopics().map((topic) => [topic.id, topic]));
  const catalogIds = getOrderedLessonIds();

  for (const id of NEW_TOPIC_IDS) {
    const topic = byId.get(id);
    expect(topic, `${id} should exist`).toBeDefined();
    expect(catalogIds.filter((candidate) => candidate === id)).toHaveLength(1);
    expect(topic?.summary.trim()).toBeTruthy();
    expect(topic?.conceptCard.body.trim()).toBeTruthy();
    expect(topic?.conceptCard.analogy.trim()).toBeTruthy();
    expect(topic?.explanation.body.trim()).toBeTruthy();
    expect(topic?.explanation.keyPoints?.length).toBeGreaterThanOrEqual(3);
    expect(topic?.conceptCard.diagram ?? topic?.explanation.diagram).toBeDefined();
    expect(topic?.relatedTerms?.length).toBeGreaterThanOrEqual(3);
    expect(topic?.referenceHints[0]?.keywords.length).toBeGreaterThanOrEqual(3);
    expect(topic?.checkQuestions.length).toBeGreaterThanOrEqual(4);

    for (const question of topic?.checkQuestions ?? []) {
      expect(question.choices).toHaveLength(4);
      expect(question.choiceExplanations?.A).toBeTruthy();
      expect(question.choiceExplanations?.B).toBeTruthy();
      expect(question.choiceExplanations?.C).toBeTruthy();
      expect(question.choiceExplanations?.D).toBeTruthy();
    }
  }
});
```

- [ ] **Step 3: Add RED tests for calculation and existing-topic expansion terms**

```ts
const textOf = (id: string) => JSON.stringify(getAllTopics().find((topic) => topic.id === id));

it.each([
  ["strat-production-management", ["MRP", "発注", "計算"]],
  ["mgmt-project-communication", ["n(n-1)/2", "通信経路", "計算"]],
  ["tech-raid", ["RAID 0", "RAID 1", "RAID 5", "RAID 6", "容量"]],
  ["tech-system-performance", ["レスポンスタイム", "ターンアラウンドタイム", "スループット", "計算"]],
])("includes a calculation scenario in %s", (id, keywords) => {
  const text = textOf(id);
  for (const keyword of keywords) expect(text).toContain(keyword);
  expect(getAllTopics().find((topic) => topic.id === id)?.checkQuestions.some(
    (question) => /台|人|秒|件|TB|GB|本/.test(question.prompt),
  )).toBe(true);
});

it.each([
  ["strat-management-systems", ["ヒト", "モノ", "カネ", "情報"]],
  ["strat-business-process", ["業務分析", "業務計画", "ボトルネック"]],
  ["strat-financial-statements", ["売上総利益", "営業利益", "経常利益", "当期純利益"]],
  ["strat-system-strategy", ["利用者教育", "導入促進", "IT投資評価", "導入後評価"]],
  ["tech-programming-basics", ["機械語", "アセンブラ", "高水準言語", "コンパイラ", "インタプリタ", "HTML", "XML", "JSON"]],
  ["tech-io-devices", ["USB", "HDMI", "Bluetooth", "NFC"]],
  ["tech-os-software-hardware", ["ワープロ", "表計算", "プレゼンテーション", "グループウェア", "OSS", "GPL", "コピーレフト"]],
])("expands %s with required concepts", (id, keywords) => {
  const text = textOf(id);
  for (const keyword of keywords) expect(text).toContain(keyword);
});
```

Keep the existing `strat-enterprise-activities` assertions and add an explicit guard that `CSR` and all stakeholder relationships remain present.

- [ ] **Step 4: Run the focused suite and verify RED**

Run: `npm test -- test/ipaSyllabusCoverage.test.ts test/targetTopicCorrections.test.ts`

Expected: FAIL because `data/ipaSyllabus.ts` and the 20 new Topic IDs do not exist, and expansion terms are absent.

- [ ] **Step 5: Commit the RED tests**

```bash
git add test/ipaSyllabusCoverage.test.ts test/targetTopicCorrections.test.ts
git commit -m "test: define IPA syllabus content contracts"
```

---

### Task 2: Implement A — Strategy Content

**Files:**
- Modify: `data/topics/strategy.ts`
- Modify: `data/learningCatalog.ts`
- Test: `test/ipaSyllabusCoverage.test.ts`
- Test: `test/targetTopicCorrections.test.ts`

**Consumes:** `createCompactTopic(CompactTopic): Topic` and the fixed strategy Topic IDs.

**Produces:** Seven new strategy Topics, five expanded existing Topics, and a catalog registration for every new strategy Topic.

- [ ] **Step 1: Narrow the RED test to strategy IDs and verify failure**

Use this strategy list in the focused assertion:

```ts
const STRATEGY_NEW_TOPIC_IDS = [
  "strat-corporation-management-organization",
  "strat-decision-problem-solving",
  "strat-technology-development-strategy",
  "strat-business-systems",
  "strat-engineering-systems",
  "strat-production-management",
  "strat-embedded-systems",
] as const;
```

Run: `npm test -- test/ipaSyllabusCoverage.test.ts -t "newly required Topic"`

Expected: FAIL listing all seven strategy IDs as missing.

- [ ] **Step 2: Add seven `createCompactTopic` objects**

Add them to `additionalStrategyTopics` using this content contract. Every row becomes a complete object with `summary`, beginner-oriented `body`, everyday `analogy`, at least three `keyPoints`, `examPoint`, two or more `commonMistakes`, at least three `relatedTerms`, `detail`, a `cards`/`flow`/`relation`/`comparison` diagram, and four questions with `wrongExplanations`.

| Topic ID | Required teaching content | Diagram | Required scenario/problem |
|---|---|---|---|
| `strat-corporation-management-organization` | 株主、株主総会、取締役会、所有と経営、経営理念、ミッション、ビジョン、職能別・事業部制・マトリックス・プロジェクト組織 | 株主総会→取締役会→経営の関係図と組織比較 | 新製品を部門横断で開発する組織選択 |
| `strat-decision-problem-solving` | ブレーンストーミング、ブレーンライティング、デルファイ法、親和図法、パレート図、特性要因図 | 発散→整理→優先順位→原因分析の流れ | 少数の原因が苦情の大半を占める場合の手法選択 |
| `strat-technology-development-strategy` | 技術動向調査、ロードマップ、研究・開発・事業化、オープンイノベーション、特許戦略 | 技術ロードマップ | 外部企業の技術を組み合わせる戦略判断 |
| `strat-business-systems` | POS、ICカード、GPS、GIS、金融・交通・流通での利用 | 店舗データの流れ | POSデータから時間帯別発注を変える事例 |
| `strat-engineering-systems` | CAD、CAM、CAE、CIM、コンカレントエンジニアリング | 設計→解析→製造 | 試作前の強度解析に使う仕組み |
| `strat-production-management` | 生産計画、MRP、資材所要量、在庫、定量発注、定期発注、安全在庫 | 需要→所要量→在庫差引→発注 | 製品台数×部品数−在庫の所要量計算 |
| `strat-embedded-systems` | 組込み機器、リアルタイム制御、センサー、アクチュエータ、フィードバック制御 | センサー→制御→アクチュエータ | 温度上昇を検知してファンを回す事例 |

For the production calculation, include a question equivalent to: “40台の製品に部品を3個ずつ使い、在庫が25個ある。追加所要量は95個” with three plausible arithmetic distractors and an explanation showing `40 × 3 - 25 = 95`.

- [ ] **Step 3: Expand five existing strategy Topics without changing IDs**

Apply these exact responsibilities:

```ts
// strat-management-systems
relatedTerms: [...existingTerms, "経営資源", "ヒト", "モノ", "カネ", "情報"]

// strat-business-process
// detail and diagram explain: 現状把握→業務分析→業務計画→ボトルネック改善

// strat-financial-statements
// diagram flow: 売上高→売上総利益→営業利益→経常利益→税引前当期純利益→当期純利益

// strat-system-strategy
// detail and a question distinguish 利用者教育・導入促進・事前のIT投資評価・導入後評価

// strat-enterprise-activities
// preserve CSR, stakeholder, corporate governance, and disclosure coverage unchanged
```

Add or revise questions only where needed to teach the new terms. Do not reduce any existing Topic below four questions.

- [ ] **Step 4: Register strategy Topics once in `learningCatalog.ts`**

Place IDs as follows:

```ts
// chapter-enterprise-activities / enterprise-basics
["strat-enterprise-activities", "strat-corporation-management-organization", "strat-bcp"]

// chapter-business-analysis / business-analysis
["strat-business-process", "strat-decision-problem-solving"]

// chapter-business-technology-strategy
// corporate-strategy section gains strat-technology-development-strategy

// chapter-business-industry / ebusiness
["strat-business-systems", "strat-engineering-systems", "strat-production-management",
 "strat-ebusiness", "strat-embedded-systems"]
```

- [ ] **Step 5: Run strategy tests and typecheck; verify GREEN for phase A**

Run:

```bash
npm test -- test/ipaSyllabusCoverage.test.ts test/targetTopicCorrections.test.ts test/learningCatalog.test.ts
npm run typecheck
```

Expected: Strategy-specific assertions PASS. Whole new-topic test may still report the pending management and technology IDs; no strategy ID may remain missing.

- [ ] **Step 6: Commit phase A**

```bash
git add data/topics/strategy.ts data/learningCatalog.ts test/ipaSyllabusCoverage.test.ts test/targetTopicCorrections.test.ts
git commit -m "feat: add IPA strategy learning content"
```

---

### Task 3: Implement B — Management Content

**Files:**
- Modify: `data/topics/management.ts`
- Modify: `data/learningCatalog.ts`
- Test: `test/ipaSyllabusCoverage.test.ts`

**Consumes:** Existing development, QCD, WBS, estimation and risk Topics.

**Produces:** Five new management Topics and one catalog registration for each.

- [ ] **Step 1: Verify the management IDs fail before implementation**

```ts
const MANAGEMENT_NEW_TOPIC_IDS = [
  "mgmt-system-design",
  "mgmt-operation-maintenance",
  "mgmt-pmbok-basics",
  "mgmt-project-resource",
  "mgmt-project-communication",
] as const;
```

Run: `npm test -- test/ipaSyllabusCoverage.test.ts -t "newly required Topic"`

Expected: FAIL listing these five IDs.

- [ ] **Step 2: Add five complete `createCompactTopic` objects**

| Topic ID | Required teaching content | Diagram | Required scenario/problem |
|---|---|---|---|
| `mgmt-system-design` | 外部設計、内部設計、画面・帳票、インタフェース、データ、モジュール設計 | 要件→外部設計→内部設計→実装 | 利用者と画面仕様を決める工程の判断 |
| `mgmt-operation-maintenance` | 運用監視、バックアップ、ジョブ管理、障害一次対応、修正・適応・予防保守 | 検知→切分け→復旧→原因対策 | OS更新へ対応する適応保守の判断 |
| `mgmt-pmbok-basics` | PMBOKの位置付け、立上げ・計画・実行・監視コントロール・終結、代表的知識エリア | プロセス群と知識エリアの二軸 | PMBOKを手順書そのものと誤解しない事例 |
| `mgmt-project-resource` | 要員計画、スキル、役割・責任、RACIのResponsible/Accountable/Consulted/Informed | RACI表 | 一つの成果物でAccountableを明確にする判断 |
| `mgmt-project-communication` | 誰に何をいつどの手段で伝えるか、報告経路、会議、課題・変更の共有、`n(n-1)/2` | 人数と通信経路の関係 | 6人の相互通信経路が15本になる計算 |

For the communication calculation, include `6 × 5 ÷ 2 = 15` in the correct explanation and use 6, 12, 15, 30 as choices in a non-leading order after the factory’s stable A-first representation.

- [ ] **Step 3: Register management Topics once**

```ts
// chapter-system-development / development-lifecycle
["mgmt-development-process", "mgmt-system-design", "mgmt-operation-maintenance"]

// chapter-project-management / project-planning
["mgmt-pm-qcd", "mgmt-pmbok-basics", "mgmt-wbs-gantt", "mgmt-estimation",
 "mgmt-project-resource", "mgmt-project-communication"]
```

Keep `mgmt-risk-management` in project-control and do not duplicate it.

- [ ] **Step 4: Run management tests and typecheck**

Run:

```bash
npm test -- test/ipaSyllabusCoverage.test.ts test/learningCatalog.test.ts
npm run typecheck
```

Expected: Strategy and management IDs PASS; only the eight pending technology IDs may remain missing.

- [ ] **Step 5: Commit phase B**

```bash
git add data/topics/management.ts data/learningCatalog.ts test/ipaSyllabusCoverage.test.ts
git commit -m "feat: add IPA management learning content"
```

---

### Task 4: Implement C — Computer, Software, and Network Content

**Files:**
- Modify: `data/topics/technology.ts`
- Modify: `data/learningCatalog.ts`
- Test: `test/ipaSyllabusCoverage.test.ts`
- Test: `test/targetTopicCorrections.test.ts`

**Consumes:** Existing computer core, OS, reliability, programming, I/O, LAN/WAN and spreadsheet Topics.

**Produces:** Eight new technology Topics, three expanded existing Topics, and complete new-Topic quality GREEN.

- [ ] **Step 1: Verify the eight technology IDs fail**

```ts
const TECHNOLOGY_NEW_TOPIC_IDS = [
  "tech-system-processing-architecture", "tech-raid", "tech-system-performance",
  "tech-parallel-systems", "tech-computer-types", "tech-file-system",
  "tech-backup", "tech-network-devices",
] as const;
```

Run: `npm test -- test/ipaSyllabusCoverage.test.ts -t "newly required Topic"`

Expected: FAIL listing these eight IDs.

- [ ] **Step 2: Add eight complete `createCompactTopic` objects**

| Topic ID | Required teaching content | Diagram | Required scenario/problem |
|---|---|---|---|
| `tech-system-processing-architecture` | バッチ、リアルタイム、オンライン、集中・分散、クライアントサーバ、三層、P2P | 処理タイミングと構成の比較 | 月末給与計算と座席予約の処理形態判断 |
| `tech-raid` | RAID 0/1/5/6、ストライピング、ミラーリング、パリティ、耐障害性、実効容量 | 4台構成比較 | 4TB×5台のRAID 5は16TB、RAID 6は12TB |
| `tech-system-performance` | レスポンス、ターンアラウンド、スループット、ベンチマーク、ボトルネック | 指標比較 | 10分で600件なら60件/分の計算 |
| `tech-parallel-systems` | マルチコア、マルチプロセッサ、並列処理、並行処理、分割可能性 | 一つのCPU内のコアと複数CPUの比較 | 独立画像を分担する処理の判断 |
| `tech-computer-types` | PC、サーバ、汎用機、スーパーコンピュータ、マイコン | 用途別比較 | 大量基幹処理・科学技術計算・家電制御の選択 |
| `tech-file-system` | ファイル、ディレクトリ、ルート、絶対・相対パス、拡張子、アクセス権 | ディレクトリ木 | 現在位置からの相対パスと最小権限 |
| `tech-backup` | フル、差分、増分、世代管理、リストア順序、RPO/RTOとの関係 | 取得日と復旧順序 | 日曜フル＋月〜水増分ならフル→月→火→水 |
| `tech-network-devices` | リピータ、ブリッジ、ハブ、スイッチ、ルータ、ゲートウェイ、AP、扱う単位 | OSI層と機器の対応 | 異なるIPネットワークを中継するルータの判断 |

RAID questions must explicitly teach:

```text
RAID 0: 容量 N台分、冗長性なし
RAID 1: 容量を対になるコピーで使う
RAID 5: 容量 (N-1)台分、1台故障まで
RAID 6: 容量 (N-2)台分、2台故障まで
```

- [ ] **Step 3: Expand the three existing technology Topics**

```ts
// tech-programming-basics
// Add a language translation comparison diagram:
// 機械語 / アセンブリ言語 + アセンブラ / 高水準言語 + コンパイラ・インタプリタ
// Add the IPA item 39 data-description language basics:
// HTML・XMLのタグによる表現 / JSONのキーと値によるデータ交換

// tech-io-devices
// Add interface grouping and questions:
// USB = 汎用有線、HDMI = 映像・音声、Bluetooth = 近距離無線、NFC = ごく近距離無線

// tech-os-software-hardware
// Add application software classification:
// ワープロ、表計算、プレゼンテーション、Webブラウザ、グループウェア
// Add OSS characteristics and cautions:
// ソースコード公開、再配布、無保証、ライセンス確認、GPL、コピーレフト
```

Do not move spreadsheet formulas out of `tech-spreadsheet`; the OS/software Topic only explains application categories and collaboration roles.

- [ ] **Step 4: Register technology Topics once**

```ts
// chapter-computer-system / computer-components
["tech-computer-types", "tech-computer-core", "tech-parallel-systems", "tech-io-devices"]

// chapter-computer-system / system-reliability
["tech-system-processing-architecture", "tech-raid", "tech-system-performance",
 "tech-reliability-availability"]

// chapter-software / software-basics
["tech-os-software-hardware", "tech-file-system", "tech-backup", "tech-api"]

// chapter-network / network-basics
["tech-lan-wan", "tech-network-devices", "tech-network-address"]
```

- [ ] **Step 5: Run phase C tests and typecheck; verify GREEN**

Run:

```bash
npm test -- test/ipaSyllabusCoverage.test.ts test/targetTopicCorrections.test.ts test/learningCatalog.test.ts test/TopicContent.test.tsx
npm run typecheck
```

Expected: All 20 new-topic, calculation, expansion, and catalog assertions PASS.

- [ ] **Step 6: Commit phase C**

```bash
git add data/topics/technology.ts data/learningCatalog.ts test/ipaSyllabusCoverage.test.ts test/targetTopicCorrections.test.ts
git commit -m "feat: add IPA computer and software learning content"
```

---

### Task 5: Implement D — IPA Manifest, Coverage Document, and Complete Validation

**Files:**
- Create: `data/ipaSyllabus.ts`
- Create: `docs/content/ipa-syllabus-coverage.md`
- Modify: `test/ipaSyllabusCoverage.test.ts`
- Test: `test/learningCatalog.test.ts`
- Test: `test/syllabus.test.ts`

**Consumes:** All existing and new Topic IDs.

**Produces:** A 63-entry authoritative manifest, a matching human-readable document, and a fully GREEN coverage suite.

- [ ] **Step 1: Add the final RED manifest assertions**

```ts
import { IPA_SYLLABUS_VERSION, ipaSyllabusItems } from "@/data/ipaSyllabus";

it("tracks IPA syllabus 6.5 items 1 through 63 without gaps", () => {
  expect(IPA_SYLLABUS_VERSION).toBe("6.5");
  expect(ipaSyllabusItems).toHaveLength(63);
  expect(ipaSyllabusItems.map((item) => item.number)).toEqual(
    Array.from({ length: 63 }, (_, index) => index + 1),
  );
  expect(new Set(ipaSyllabusItems.map((item) => item.id)).size).toBe(63);
});

it("maps every IPA item to existing learning content", () => {
  const topicIds = new Set(getAllTopics().map((topic) => topic.id));
  for (const item of ipaSyllabusItems) {
    expect(item.topicIds.length, item.id).toBeGreaterThan(0);
    expect(item.topicIds.filter((id) => !topicIds.has(id)), item.id).toEqual([]);
    expect(["covered", "expanded", "new"]).toContain(item.coverage);
    expect(item.note.trim()).toBeTruthy();
  }
});
```

Run: `npm test -- test/ipaSyllabusCoverage.test.ts -t "IPA syllabus"`

Expected: FAIL because `data/ipaSyllabus.ts` does not yet exist.

- [ ] **Step 2: Create all 63 manifest entries**

Use the official item names and this exact Topic mapping:

| IPA | Item | Topic IDs | Status |
|---:|---|---|---|
| 1 | 経営・組織論 | `strat-enterprise-activities`, `strat-corporation-management-organization`, `strat-management-systems`, `strat-bcp` | new |
| 2 | 業務分析・データ利活用 | `strat-business-process`, `strat-decision-problem-solving`, `tech-data-utilization` | new |
| 3 | 会計・財務 | `strat-accounting-break-even`, `strat-financial-statements` | expanded |
| 4 | 知的財産権 | `strat-intellectual-property` | covered |
| 5 | セキュリティ関連法規 | `strat-security-laws` | covered |
| 6 | 労働関連・取引関連法規 | `strat-labor-laws` | covered |
| 7 | その他の法律・ガイドライン・情報倫理 | `strat-legal-compliance`, `strat-privacy-law` | covered |
| 8 | 標準化関連 | `strat-standardization` | covered |
| 9 | 経営戦略手法 | `strat-swot`, `strat-3c`, `strat-ppm`, `strat-value-chain`, `strat-corporate-strategy` | covered |
| 10 | マーケティング | `strat-marketing-4p` | covered |
| 11 | ビジネス戦略と目標・評価 | `strat-corporate-strategy`, `strat-goal-evaluation` | covered |
| 12 | 経営管理システム | `strat-management-systems` | expanded |
| 13 | 技術開発戦略の立案・技術開発計画 | `strat-technology-development-strategy` | new |
| 14 | ビジネスシステム | `strat-business-systems` | new |
| 15 | エンジニアリングシステム | `strat-engineering-systems`, `strat-production-management` | new |
| 16 | e-ビジネス | `strat-ebusiness` | covered |
| 17 | IoTシステム・組込みシステム | `tech-iot`, `strat-embedded-systems` | new |
| 18 | 情報システム戦略 | `strat-system-strategy` | expanded |
| 19 | 業務プロセス | `strat-business-process` | expanded |
| 20 | ソリューションビジネス | `strat-solution-business`, `strat-generative-ai-dx` | covered |
| 21 | システム活用促進・評価 | `strat-system-strategy` | expanded |
| 22 | システム化計画 | `strat-system-planning-rfp` | covered |
| 23 | 要件定義 | `strat-system-planning-rfp`, `mgmt-requirements-definition` | covered |
| 24 | 調達計画・実施 | `strat-system-planning-rfp` | covered |
| 25 | システム開発技術 | `mgmt-requirements-definition`, `mgmt-system-design`, `mgmt-testing`, `mgmt-operation-maintenance` | new |
| 26 | 開発プロセス・手法 | `mgmt-development-process` | covered |
| 27 | プロジェクトマネジメント | `mgmt-pm-qcd`, `mgmt-pmbok-basics`, `mgmt-wbs-gantt`, `mgmt-estimation`, `mgmt-project-resource`, `mgmt-project-communication`, `mgmt-risk-management`, `mgmt-pdca` | new |
| 28 | サービスマネジメント | `mgmt-service-sla`, `mgmt-itil` | covered |
| 29 | サービスマネジメントシステム | `mgmt-itil`, `mgmt-service-sla` | covered |
| 30 | ファシリティマネジメント | `mgmt-facility-management` | covered |
| 31 | システム監査 | `mgmt-system-audit` | covered |
| 32 | 内部統制 | `mgmt-system-audit` | covered |
| 33 | 離散数学 | `tech-binary-data`, `tech-logic-operations` | covered |
| 34 | 応用数学 | `tech-data-utilization` | covered |
| 35 | 情報に関する理論 | `tech-binary-data`, `tech-multimedia-compression` | covered |
| 36 | データ構造 | `tech-data-structure` | covered |
| 37 | アルゴリズムとプログラミング | `tech-algorithm-flowchart` | covered |
| 38 | プログラム言語 | `tech-programming-basics` | expanded |
| 39 | その他の言語 | `tech-programming-basics` | expanded |
| 40 | プロセッサ | `tech-computer-core`, `tech-parallel-systems` | new |
| 41 | メモリ | `tech-computer-core` | covered |
| 42 | 入出力デバイス | `tech-io-devices` | expanded |
| 43 | システムの構成 | `tech-system-processing-architecture`, `tech-raid`, `tech-cloud-models` | new |
| 44 | システムの評価指標 | `tech-system-performance`, `tech-reliability-availability` | new |
| 45 | オペレーティングシステム | `tech-os-software-hardware` | expanded |
| 46 | ファイルシステム | `tech-file-system`, `tech-backup` | new |
| 47 | オフィスツール | `tech-os-software-hardware`, `tech-spreadsheet` | expanded |
| 48 | オープンソースソフトウェア | `tech-os-software-hardware` | expanded |
| 49 | ハードウェア（コンピュータ・入出力装置） | `tech-computer-types`, `tech-computer-core`, `tech-io-devices` | new |
| 50 | 情報デザイン | `tech-ui-ux` | covered |
| 51 | インタフェース設計 | `tech-ui-ux` | covered |
| 52 | マルチメディア技術 | `tech-multimedia-compression` | covered |
| 53 | マルチメディア応用 | `tech-multimedia-compression` | covered |
| 54 | データベース方式 | `tech-database-sql`, `tech-keys` | covered |
| 55 | データベース設計 | `tech-normalization`, `tech-keys` | covered |
| 56 | データ操作 | `tech-database-sql` | covered |
| 57 | トランザクション処理 | `tech-transaction` | covered |
| 58 | ネットワーク方式 | `tech-lan-wan`, `tech-network-devices`, `tech-wireless-mobile` | new |
| 59 | 通信プロトコル | `tech-web-internet-basics`, `tech-http-https`, `tech-email-protocol` | covered |
| 60 | ネットワーク応用 | `tech-network-address`, `tech-api`, `tech-cloud-models` | covered |
| 61 | 情報セキュリティ | `tech-security-cia`, `tech-malware-phishing-ransomware`, `tech-cyber-attacks` | covered |
| 62 | 情報セキュリティ管理 | `tech-isms-risk` | covered |
| 63 | 情報セキュリティ対策・情報セキュリティ実装技術 | `tech-firewall-vpn-zero-trust`, `tech-auth-authz-mfa`, `tech-encryption-hash`, `tech-common-key-crypto`, `tech-public-key-crypto`, `tech-digital-signature` | covered |

Use the official major/middle category labels from Ver.6.5. Notes must state which subareas each mapped Topic teaches; do not use empty or generic notes.

- [ ] **Step 3: Create the Markdown coverage document**

Start `docs/content/ipa-syllabus-coverage.md` with:

```md
# IPA ITパスポート試験シラバス Ver.6.5 対応表

正式な基準はIPA公式「ITパスポート試験シラバス Ver.6.5」です。
市販参考書は不足候補の発見にのみ利用し、参考書固有の構成は再現していません。

- 公式一覧: https://www.ipa.go.jp/shiken/syllabus/gaiyou.html
- 公式PDF: https://www.ipa.go.jp/shiken/syllabus/omgdg50000005kn1-att/syllabus_ip_ver6_5.pdf

| IPA項目 | 分野 | 大分類 | 中分類 | 項目名 | 対応Topic ID | 状態 | 補足 |
|---:|---|---|---|---|---|---|---|
```

Add exactly 63 rows mirroring the manifest table and notes. Do not include any reference-book chapter numbers or headings.

- [ ] **Step 4: Add a document/manifest drift test**

Read the Markdown with Node’s filesystem API and verify each stable IPA ID marker and every mapped Topic ID is present. Add an HTML comment marker to each row, for example `<!-- ipa-01 -->`, so the test does not depend on Japanese punctuation.

```ts
const coveragePath = path.join(process.cwd(), "docs/content/ipa-syllabus-coverage.md");
const coverageDocument = readFileSync(coveragePath, "utf8");

for (const item of ipaSyllabusItems) {
  expect(coverageDocument).toContain(`<!-- ${item.id} -->`);
  for (const topicId of item.topicIds) expect(coverageDocument).toContain(`\`${topicId}\``);
}
expect(coverageDocument).not.toMatch(/\b(?:0[0-9]|1[0-5])-\d{2}\b/);
```

Use the final negative assertion only for actual reference-book identifiers or titles; the explanatory policy sentence may mention “市販参考書”.

- [ ] **Step 5: Verify the existing exam guide separately**

Inspect `app/syllabus/page.tsx`, onboarding, and help/more content. Because exam orientation is not one of the IPA 63 knowledge items, do not add it to `ipaSyllabusItems`. If the current guide already explains the three fields, CBT flow, score conditions, and learning route, record that finding in the coverage document. If any fact is missing, add only the missing copy to the existing guide and add a focused component/data test; do not create a Topic or alter progress.

- [ ] **Step 6: Run D validation and commit**

Run:

```bash
npm test -- test/ipaSyllabusCoverage.test.ts test/learningCatalog.test.ts test/syllabus.test.ts
npm run typecheck
```

Expected: PASS with 63 ordered manifest entries, all mapped IDs present, and all Topics registered once.

Commit:

```bash
git add data/ipaSyllabus.ts docs/content/ipa-syllabus-coverage.md test/ipaSyllabusCoverage.test.ts
git commit -m "docs: map learning content to IPA syllabus 6.5"
```

---

### Task 6: Full Verification and Scope Audit

**Files:**
- Verify: all files changed in Tasks 1–5
- Do not modify: UI, authentication, billing, Mochit, or progress files

**Consumes:** Completed implementation and repository scripts.

**Produces:** Evidence that content, types, tests, lint, and production build pass without unrelated edits.

- [ ] **Step 1: Run whitespace and changed-file checks**

Run:

```bash
git diff --check
git status --short
git diff --name-only HEAD~4..HEAD
```

Expected: No whitespace errors. Changed implementation files are limited to the files named in this plan; pre-existing user changes may still appear in `git status` but are not part of these commits.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit 0 with no ESLint errors.

- [ ] **Step 3: Run TypeScript validation**

Run: `npm run typecheck`

Expected: exit 0 with no type errors.

- [ ] **Step 4: Run the complete test suite**

Run: `npm test`

Expected: all Vitest files and tests PASS.

- [ ] **Step 5: Run the production build**

Before this step, read the relevant local Next.js 16 guide under `node_modules/next/dist/docs/` as required by `AGENTS.md`; no Next API or UI change is planned, so use the build/troubleshooting guide only if the build exposes a framework-specific issue.

Run: `npm run build`

Expected: Next.js production build completes successfully.

- [ ] **Step 6: Review content quality manually**

For each new Topic, confirm:

```text
本文は初心者が前提知識なしで読める
図解が本文と同じ関係を表す
4問以上あり、少なくとも1問は事例問題
正答・誤答の理由が選択肢固有
計算Topicは式と単位を説明
参考書本文や参考書固有構成を再現していない
```

- [ ] **Step 7: Prepare final report**

Report:

```text
追加Topic: 20件（分野別ID一覧）
拡張Topic: 8件（追加した学習範囲）
IPA対応表: Ver.6.5の63/63項目
互換性: 既存Topic IDの変更・削除なし
検証: lint / typecheck / tests / build の実行結果
既存未コミット変更: 今回の作業には含めていない
```
