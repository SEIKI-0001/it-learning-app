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
import QcdExperience from "./QcdExperience";
import WbsGanttExperience from "./WbsGanttExperience";
import DevProcessExperience from "./DevProcessExperience";
import TestingExperience from "./TestingExperience";
import PdcaExperience from "./PdcaExperience";
import RiskExperience from "./RiskExperience";
import SlaExperience from "./SlaExperience";
import ItilExperience from "./ItilExperience";
import SystemAuditExperience from "./SystemAuditExperience";
import RequirementsExperience from "./RequirementsExperience";
import BreakEvenExperience from "./BreakEvenExperience";
import SwotExperience from "./SwotExperience";
import ThreeCExperience from "./ThreeCExperience";
import FourPExperience from "./FourPExperience";
import IntellectualPropertyExperience from "./IntellectualPropertyExperience";
import BcpExperience from "./BcpExperience";
import EnterpriseActivitiesExperience from "./EnterpriseActivitiesExperience";
import ComplianceExperience from "./ComplianceExperience";
import PrivacyExperience from "./PrivacyExperience";
import SecurityLawsExperience from "./SecurityLawsExperience";
import SystemStrategyExperience from "./SystemStrategyExperience";
import BusinessProcessExperience from "./BusinessProcessExperience";
import SolutionBusinessExperience from "./SolutionBusinessExperience";
import ReliabilityExperience from "./ReliabilityExperience";
import LogicOperationsExperience from "./LogicOperationsExperience";
import SpreadsheetExperience from "./SpreadsheetExperience";
import DataStructureExperience from "./DataStructureExperience";
import TransactionExperience from "./TransactionExperience";
import CyberAttacksExperience from "./CyberAttacksExperience";
import DigitalSignatureExperience from "./DigitalSignatureExperience";
import IsmsRiskExperience from "./IsmsRiskExperience";
import WirelessMobileExperience from "./WirelessMobileExperience";
import EmailProtocolExperience from "./EmailProtocolExperience";

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
  "mgmt-pm-qcd": QcdExperience,
  "mgmt-wbs-gantt": WbsGanttExperience,
  "mgmt-development-process": DevProcessExperience,
  "mgmt-testing": TestingExperience,
  "mgmt-pdca": PdcaExperience,
  "mgmt-risk-management": RiskExperience,
  "mgmt-service-sla": SlaExperience,
  "mgmt-itil": ItilExperience,
  "mgmt-system-audit": SystemAuditExperience,
  "mgmt-requirements-definition": RequirementsExperience,
  "strat-accounting-break-even": BreakEvenExperience,
  "strat-swot": SwotExperience,
  "strat-3c": ThreeCExperience,
  "strat-marketing-4p": FourPExperience,
  "strat-intellectual-property": IntellectualPropertyExperience,
  "strat-bcp": BcpExperience,
  "strat-enterprise-activities": EnterpriseActivitiesExperience,
  "strat-legal-compliance": ComplianceExperience,
  "strat-privacy-law": PrivacyExperience,
  "strat-security-laws": SecurityLawsExperience,
  "strat-system-strategy": SystemStrategyExperience,
  "strat-business-process": BusinessProcessExperience,
  "strat-solution-business": SolutionBusinessExperience,
  "tech-reliability-availability": ReliabilityExperience,
  "tech-logic-operations": LogicOperationsExperience,
  "tech-spreadsheet": SpreadsheetExperience,
  "tech-data-structure": DataStructureExperience,
  "tech-transaction": TransactionExperience,
  "tech-cyber-attacks": CyberAttacksExperience,
  "tech-digital-signature": DigitalSignatureExperience,
  "tech-isms-risk": IsmsRiskExperience,
  "tech-wireless-mobile": WirelessMobileExperience,
  "tech-email-protocol": EmailProtocolExperience,
};

export function getTopicExperience(id: string): ComponentType | undefined {
  return TOPIC_EXPERIENCES[id];
}
