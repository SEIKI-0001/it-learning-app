"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// lib/explain3d/catalog.ts の模型を開く部品。全テーマを読み込むと重いので、選ばれた1つだけを後から読む。
// 模型を足したら catalog.ts と両方に登録する（テストで突き合わせている）。

function Loading() {
  return (
    <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl bg-gray-100 text-xs font-bold text-gray-500" role="status">
      模型を読み込み中…
    </div>
  );
}

export const EXISTING_MODEL_VIEWS: Record<string, ComponentType> = {
  "tech-computer-core": dynamic(() => import("@/components/experiences/ComputerCoreExperience"), { ssr: false, loading: Loading }),
  "tech-network-address": dynamic(() => import("@/components/experiences/NetworkAddressExperience"), { ssr: false, loading: Loading }),
  "tech-cyber-attacks": dynamic(() => import("@/components/experiences/CyberAttacksExperience"), { ssr: false, loading: Loading }),
  "strat-ebusiness": dynamic(() => import("@/components/experiences/EbusinessExperience"), { ssr: false, loading: Loading }),
  "tech-iot": dynamic(() => import("@/components/experiences/IotExperience"), { ssr: false, loading: Loading }),
  "tech-network-devices": dynamic(() => import("@/components/experiences/NetworkDevicesExperience"), { ssr: false, loading: Loading }),
  "tech-wireless-mobile": dynamic(() => import("@/components/experiences/WirelessMobileExperience"), { ssr: false, loading: Loading }),
  "tech-api": dynamic(() => import("@/components/experiences/ApiExperience"), { ssr: false, loading: Loading }),
  "tech-http-https": dynamic(() => import("@/components/experiences/HttpsExperience"), { ssr: false, loading: Loading }),
  "tech-web-internet-basics": dynamic(() => import("@/components/experiences/InternetProtocolExperience"), { ssr: false, loading: Loading }),
  "tech-email-protocol": dynamic(() => import("@/components/experiences/EmailProtocolExperience"), { ssr: false, loading: Loading }),
  "tech-lan-wan": dynamic(() => import("@/components/experiences/LanWanExperience"), { ssr: false, loading: Loading }),
  "tech-firewall-vpn-zero-trust": dynamic(() => import("@/components/experiences/FirewallExperience"), { ssr: false, loading: Loading }),
  "tech-common-key-crypto": dynamic(() => import("@/components/experiences/CommonKeyExperience"), { ssr: false, loading: Loading }),
  "tech-public-key-crypto": dynamic(() => import("@/components/experiences/PublicKeyExperience"), { ssr: false, loading: Loading }),
  "tech-digital-signature": dynamic(() => import("@/components/experiences/DigitalSignatureExperience"), { ssr: false, loading: Loading }),
  "tech-encryption-hash": dynamic(() => import("@/components/experiences/EncryptionHashExperience"), { ssr: false, loading: Loading }),
  "tech-malware-phishing-ransomware": dynamic(() => import("@/components/experiences/MalwareExperience"), { ssr: false, loading: Loading }),
  "tech-transaction": dynamic(() => import("@/components/experiences/TransactionExperience"), { ssr: false, loading: Loading }),
  "tech-os-software-hardware": dynamic(() => import("@/components/experiences/OsExperience"), { ssr: false, loading: Loading }),
  "tech-computer-types": dynamic(() => import("@/components/experiences/ComputerTypesExperience"), { ssr: false, loading: Loading }),
  "tech-system-processing-architecture": dynamic(() => import("@/components/experiences/ProcessingArchitectureExperience"), { ssr: false, loading: Loading }),
  "strat-bcp": dynamic(() => import("@/components/experiences/BcpExperience"), { ssr: false, loading: Loading }),
  "strat-embedded-systems": dynamic(() => import("@/components/experiences/EmbeddedControlExperience"), { ssr: false, loading: Loading }),
  "strat-business-process": dynamic(() => import("@/components/experiences/BusinessProcessExperience"), { ssr: false, loading: Loading }),
  "strat-value-chain": dynamic(() => import("@/components/experiences/ValueChainExperience"), { ssr: false, loading: Loading }),
};
