"use client";

import Link from "next/link";
import { TOPIC_EXPERIENCES } from "@/components/experiences/registry";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

// 3D ジオラマ化の対象（HTTPS は PR #113 で 3D 化済み。比較用に並べる）
const TOPICS: { id: string; name: string }[] = [
  { id: "tech-http-https", name: "HTTPS（基準）" },
  { id: "tech-network-address", name: "IP・DNS" },
  { id: "tech-api", name: "API" },
  { id: "tech-firewall-vpn-zero-trust", name: "FW/VPN/ZT" },
  { id: "tech-web-internet-basics", name: "パケット" },
  { id: "tech-public-key-crypto", name: "公開鍵" },
  { id: "tech-common-key-crypto", name: "共通鍵" },
  { id: "tech-digital-signature", name: "署名・CA" },
  { id: "tech-cyber-attacks", name: "サイバー攻撃" },
  { id: "tech-transaction", name: "トランザクション" },
  { id: "strat-bcp", name: "BCP" },
  { id: "strat-business-process", name: "業務プロセス" },
  { id: "strat-value-chain", name: "バリューチェーン" },
  { id: "tech-computer-core", name: "CPU・メモリ" },
  { id: "tech-os-software-hardware", name: "OS" },
  { id: "tech-email-protocol", name: "メール" },
  { id: "tech-network-devices", name: "ネットワーク機器" },
  { id: "tech-iot", name: "IoT" },
  { id: "strat-ebusiness", name: "e-ビジネス" },
  { id: "tech-computer-types", name: "コンピュータの種類" },
  { id: "tech-system-processing-architecture", name: "処理形態" },
  { id: "tech-malware-phishing-ransomware", name: "マルウェア" },
];

export default function DioramaPreview({ topicId }: { topicId: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <nav className="mb-4 flex flex-wrap gap-1.5 text-xs">
        {TOPICS.map((t) => (
          <Link
            key={t.id}
            href={`/dev/diorama?t=${t.id}`}
            className={`rounded-full px-2.5 py-1 font-bold ${t.id === topicId ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {t.name}
          </Link>
        ))}
      </nav>
      <Preview topicId={topicId} />
    </main>
  );
}

function Preview({ topicId }: { topicId: string }) {
  const Experience = TOPIC_EXPERIENCES[topicId];
  // 本番（TopicContent）と同じく、Panel ごとに横スワイプで切り替える
  return Experience ? (
    <ExperienceSlideDeck key={topicId}>
      <Experience />
    </ExperienceSlideDeck>
  ) : (
    <p>体験が見つかりません：{topicId}</p>
  );
}
