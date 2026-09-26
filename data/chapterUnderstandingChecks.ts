// 章末AI理解チェックで出題する問題（章ごとの SSOT）。
//
// 目的は弱点の復習ではなく「分かったつもり」の発見。四択では正解できても、
// 自分の言葉では説明しきれないことが多い概念を、章ごとに2〜4問選んである。
// 単純な用語暗記ではなく、理由・違い・仕組み・因果・関係・具体例を説明させる問題を優先する。
//
// 問題本文は data/writtenQuestions.ts が唯一の定義元。ここは id を参照するだけにする。
// topicId は「この部分を復習する」の戻り先と、補助シグナル（understandingSignals）の記録先。
// その問題が TOPIC_WRITTEN_QUESTION_IDS で紐づくトピックのうち、この章のものを指定する
// （test/chapterUnderstandingChecks.test.ts で担保）。

export type ChapterUnderstandingCheck = {
  questionId: string;
  topicId: string;
  /** この問題で確かめる「曖昧になりやすい理解」。章末の画面で出題理由として見せる。 */
  focus: string;
};

export const CHAPTER_UNDERSTANDING_CHECKS: Record<string, readonly ChapterUnderstandingCheck[]> = {
  "enterprise-activities": [
    { questionId: "ent-01", topicId: "strat-bcp", focus: "バックアップとBCPが守る範囲の違い" },
    { questionId: "ent-03", topicId: "strat-accounting-break-even", focus: "固定費の大きさと赤字になりやすさの因果" },
    { questionId: "ent-02", topicId: "strat-financial-statements", focus: "「ある時点」と「一定期間」の財務諸表の違い" },
  ],
  "business-analysis-data": [
    { questionId: "biz-02", topicId: "strat-decision-problem-solving", focus: "パレート図と特性要因図で分かることの違い" },
    { questionId: "biz-01", topicId: "strat-management-systems", focus: "CRM・SCM・ERPがそれぞれ何をまとめるか" },
  ],
  "law-standardization": [
    { questionId: "law-01", topicId: "strat-labor-laws", focus: "派遣と請負で指揮命令の関係がどう違うか" },
    { questionId: "law-02", topicId: "strat-intellectual-property", focus: "著作権と特許権が守るもの・権利の発生の違い" },
    { questionId: "law-03", topicId: "strat-privacy-law", focus: "個人情報の第三者提供に同意が要る理由" },
  ],
  "business-technology-strategy": [
    { questionId: "str-02", topicId: "strat-ppm", focus: "PPMの4分類と投資の流れの関係" },
    { questionId: "str-03", topicId: "strat-goal-evaluation", focus: "KGIとKPIの関係と、中間指標を置く理由" },
    { questionId: "str-01", topicId: "strat-swot", focus: "内部環境と外部環境を分けて整理する意味" },
  ],
  "business-industry": [
    { questionId: "ind-01", topicId: "strat-production-management", focus: "定量発注と定期発注が向く品目の違い" },
    { questionId: "ind-02", topicId: "strat-ebusiness", focus: "EDIとECが変えるものの違い" },
  ],
  "system-strategy-planning": [
    { questionId: "sst-02", topicId: "strat-generative-ai-dx", focus: "デジタル化とDXの違い" },
    { questionId: "sst-01", topicId: "strat-system-planning-rfp", focus: "RFI・RFPの順番と、それぞれの目的" },
  ],
  "system-development": [
    { questionId: "dev-02", topicId: "mgmt-testing", focus: "テストの段階ごとに確かめる範囲と順番の理由" },
    { questionId: "dev-01", topicId: "mgmt-development-process", focus: "ウォータフォールとアジャイルの仕様変更への強さ" },
  ],
  "project-management": [
    { questionId: "pm-02", topicId: "mgmt-pm-qcd", focus: "品質・コスト・納期が互いに影響し合う関係" },
    { questionId: "pm-03", topicId: "mgmt-risk-management", focus: "リスク対応4種類の違いと選び方" },
    { questionId: "pm-01", topicId: "mgmt-wbs-gantt", focus: "作業を分解すると何が管理しやすくなるか" },
  ],
  "service-management": [
    { questionId: "svc-02", topicId: "mgmt-itil", focus: "インシデント管理と問題管理の目的の違い" },
    { questionId: "svc-01", topicId: "mgmt-service-sla", focus: "サービスレベルを数値で合意する理由" },
  ],
  "system-audit-internal-control": [
    { questionId: "aud-02", topicId: "mgmt-system-audit", focus: "内部統制とシステム監査の役割分担" },
    { questionId: "aud-01", topicId: "mgmt-system-audit", focus: "監査人に独立性が求められる理由" },
  ],
  "foundation-data-science": [
    { questionId: "ai-05", topicId: "tech-data-utilization", focus: "相関関係と因果関係の違い" },
    { questionId: "ai-04", topicId: "tech-ai-ml", focus: "過学習で新しいデータの予測が外れる理由" },
    { questionId: "ai-02", topicId: "tech-ai-ml", focus: "教師あり・教師なし・強化学習の違い" },
  ],
  "algorithm-programming": [
    { questionId: "alg-01", topicId: "tech-data-structure", focus: "スタックとキューの取り出し順と使いどころ" },
    { questionId: "alg-02", topicId: "tech-programming-basics", focus: "コンパイラとインタプリタの翻訳のタイミング" },
    { questionId: "ai-06", topicId: "tech-algorithm-flowchart", focus: "順次・選択・繰返しで手順を組み立てる考え方" },
  ],
  "computer-system": [
    { questionId: "sys-01", topicId: "tech-reliability-availability", focus: "直列と並列で稼働率が上がる・下がる理由" },
    { questionId: "sys-02", topicId: "tech-reliability-availability", focus: "MTBF・MTTRと稼働率の関係" },
    { questionId: "sys-03", topicId: "tech-reliability-availability", focus: "RAIDの方式ごとの性能と耐障害性の違い" },
  ],
  software: [
    { questionId: "sw-01", topicId: "tech-backup", focus: "差分と増分で復旧に必要なデータが違う理由" },
    { questionId: "sw-02", topicId: "tech-cloud-models", focus: "SaaS・PaaS・IaaSで利用者が管理する範囲" },
  ],
  "information-design-media": [
    { questionId: "dsg-01", topicId: "tech-ui-ux", focus: "UIの改善とUXの改善の違い" },
    { questionId: "dsg-02", topicId: "tech-multimedia-compression", focus: "可逆圧縮と非可逆圧縮の使い分けの理由" },
  ],
  database: [
    { questionId: "db-01", topicId: "tech-transaction", focus: "処理をトランザクションにまとめる理由（原子性）" },
    { questionId: "db-05", topicId: "tech-transaction", focus: "同時更新で排他制御が必要になる理由" },
    { questionId: "db-03", topicId: "tech-normalization", focus: "正規化で防げる更新時の不整合" },
    { questionId: "db-02", topicId: "tech-keys", focus: "主キーと外部キーがテーブルをつなぐ仕組み" },
  ],
  network: [
    { questionId: "net-01", topicId: "tech-network-address", focus: "DNSがドメイン名とIPアドレスを結ぶ流れ" },
    { questionId: "net-02", topicId: "tech-network-devices", focus: "ルータとスイッチが振り分ける単位の違い" },
    { questionId: "net-04", topicId: "tech-http-https", focus: "HTTPSで守られるものと守られる理由" },
    { questionId: "net-05", topicId: "tech-email-protocol", focus: "SMTP・POP・IMAPの役割分担" },
  ],
  "information-security": [
    { questionId: "sec-02", topicId: "tech-public-key-crypto", focus: "共通鍵と公開鍵を組み合わせる理由" },
    { questionId: "sec-03", topicId: "tech-digital-signature", focus: "デジタル署名と暗号化で守るものの違い" },
    { questionId: "sec-08", topicId: "tech-firewall-vpn-zero-trust", focus: "ゼロトラストと境界防御の前提の違い" },
    { questionId: "sec-06", topicId: "tech-malware-phishing-ransomware", focus: "ランサムウェアにバックアップだけでは足りない理由" },
  ],
};

export function getChapterUnderstandingChecks(themeSlug: string): readonly ChapterUnderstandingCheck[] {
  return CHAPTER_UNDERSTANDING_CHECKS[themeSlug] ?? [];
}
