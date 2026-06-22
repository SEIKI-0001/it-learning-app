import type { ComponentType } from "react";
import BinaryExperience from "./BinaryExperience";
import AlgorithmExperience from "./AlgorithmExperience";
import NormalizationExperience from "./NormalizationExperience";
import ComputerCoreExperience from "./ComputerCoreExperience";
import KeysExperience from "./KeysExperience";
import OsExperience from "./OsExperience";
import SqlExperience from "./SqlExperience";
import NetworkAddressExperience from "./NetworkAddressExperience";
import LanWanExperience from "./LanWanExperience";
import InternetProtocolExperience from "./InternetProtocolExperience";
import HttpsExperience from "./HttpsExperience";
import SecurityCiaExperience from "./SecurityCiaExperience";
import EncryptionHashExperience from "./EncryptionHashExperience";
import PublicKeyExperience from "./PublicKeyExperience";
import CommonKeyExperience from "./CommonKeyExperience";
import AuthExperience from "./AuthExperience";
import MalwareExperience from "./MalwareExperience";
import FirewallExperience from "./FirewallExperience";
import CloudExperience from "./CloudExperience";
import AiMlExperience from "./AiMlExperience";
import IotExperience from "./IotExperience";
import ProgrammingBasicsExperience from "./ProgrammingBasicsExperience";
import DataUtilizationExperience from "./DataUtilizationExperience";
import ApiExperience from "./ApiExperience";

// ============================================================================
// トピックごとの「専用学習体験」レジストリ。
//
// 汎用カード図解（conceptCard + DiagramSpec）では分かりにくいテーマは、
// ここに topic.id → 専用コンポーネント を登録する。
// 登録があるトピックは、詳細ページで固定スタックの代わりにこの体験を描画する。
// （ヘッダー・確認問題・解説・復習などの枠は従来どおり維持）
// ============================================================================

export const TOPIC_EXPERIENCES: Record<string, ComponentType> = {
  "tech-binary-data": BinaryExperience,
  "tech-algorithm-flowchart": AlgorithmExperience,
  "tech-normalization": NormalizationExperience,
  "tech-computer-core": ComputerCoreExperience,
  "tech-keys": KeysExperience,
  "tech-os-software-hardware": OsExperience,
  "tech-database-sql": SqlExperience,
  "tech-network-address": NetworkAddressExperience,
  "tech-lan-wan": LanWanExperience,
  "tech-web-internet-basics": InternetProtocolExperience,
  "tech-http-https": HttpsExperience,
  "tech-security-cia": SecurityCiaExperience,
  "tech-encryption-hash": EncryptionHashExperience,
  "tech-public-key-crypto": PublicKeyExperience,
  "tech-common-key-crypto": CommonKeyExperience,
  "tech-auth-authz-mfa": AuthExperience,
  "tech-malware-phishing-ransomware": MalwareExperience,
  "tech-firewall-vpn-zero-trust": FirewallExperience,
  "tech-cloud-models": CloudExperience,
  "tech-ai-ml": AiMlExperience,
  "tech-iot": IotExperience,
  "tech-programming-basics": ProgrammingBasicsExperience,
  "tech-data-utilization": DataUtilizationExperience,
  "tech-api": ApiExperience,
};

export function getTopicExperience(id: string): ComponentType | undefined {
  return TOPIC_EXPERIENCES[id];
}
