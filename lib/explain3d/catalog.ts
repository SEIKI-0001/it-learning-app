// 作り込んだ模型のあるテーマの一覧（/explain で「既存の模型」として開ける物）。
// shows は AI が質問と合うかを判断する材料、keywords は AI が使えないときの照合に使う。
// 模型を足したら、ここと components/explain3d/existingModels.tsx の両方に登録する。

export type ExistingModel = {
  topicId: string;
  /** Blender 製の動く3D（WebGL）なら "blender"、部品で組んだジオラマなら "diorama" */
  model: "blender" | "diorama";
  /** 模型で見せている場面（AI に渡す説明） */
  shows: string;
  keywords: readonly string[];
};

export const EXISTING_MODELS: readonly ExistingModel[] = [
  {
    topicId: "tech-computer-core",
    model: "blender",
    shows: "机のPCを開き、CPU・メモリ・ストレージの間でデータが動いて計算される様子",
    keywords: ["CPU", "メモリ", "ストレージ", "主記憶", "補助記憶", "SSD", "HDD", "パソコンの中", "パソコンの仕組み", "キャッシュ"],
  },
  {
    topicId: "tech-network-address",
    model: "blender",
    shows: "ブラウザがDNSサーバに名前を問い合わせ、IPアドレスを受け取ってWebサーバへ届く様子",
    keywords: ["DNS", "IPアドレス", "ドメイン", "名前解決", "URL", "サブネット", "IPv4", "IPv6"],
  },
  {
    topicId: "tech-cyber-attacks",
    model: "blender",
    shows: "オフィスが標的型攻撃・DDoS・SQLインジェクションなどのサイバー攻撃を受ける様子",
    keywords: ["サイバー攻撃", "DDoS", "DoS", "SQLインジェクション", "標的型", "クロスサイト", "XSS", "ブルートフォース", "総当たり", "ゼロデイ"],
  },
  {
    topicId: "strat-ebusiness",
    model: "blender",
    shows: "企業と消費者の取引（BtoB・BtoC・CtoC）を、街の中を走る乗り物で見せる様子",
    keywords: ["BtoB", "BtoC", "CtoC", "電子商取引", "EC", "eビジネス", "ネット通販", "EDI"],
  },
  {
    topicId: "tech-iot",
    model: "blender",
    shows: "家の中のセンサーが測った値をクラウドへ送り、アクチュエータが動く IoT の様子",
    keywords: ["IoT", "センサー", "センサ", "アクチュエータ", "スマート家電", "LPWA", "エッジコンピューティング"],
  },
  {
    topicId: "tech-network-devices",
    model: "blender",
    shows: "オフィスのハブ・スイッチ・ルータ・ゲートウェイなどの機器がデータを中継する様子",
    keywords: ["ルータ", "ルーター", "スイッチ", "ハブ", "ゲートウェイ", "ネットワーク機器", "MACアドレス", "リピータ", "ブリッジ"],
  },
  {
    topicId: "tech-wireless-mobile",
    model: "blender",
    shows: "カフェの無線LAN（Wi-Fi）と、街角の基地局を使うモバイル通信の様子",
    keywords: ["無線LAN", "Wi-Fi", "WiFi", "SSID", "モバイル通信", "4G", "5G", "基地局", "テザリング", "Bluetooth", "WPA"],
  },
  {
    topicId: "tech-api",
    model: "diorama",
    shows: "スマホの天気アプリが API Gateway を通ってサービスとデータベースから天気を受け取る様子",
    keywords: ["API", "Web API", "API連携", "REST"],
  },
  {
    topicId: "tech-http-https",
    model: "diorama",
    shows: "カフェのWi-FiでWebサイトを開くとき、HTTPは盗み見され、HTTPSは暗号化で守られる様子",
    keywords: ["HTTP", "HTTPS", "SSL", "TLS", "Webサイト", "ブラウザ", "盗聴"],
  },
  {
    topicId: "tech-web-internet-basics",
    model: "diorama",
    shows: "データがパケットに分けられ、ネットワークを通って相手に届き組み立て直される様子",
    keywords: ["パケット", "TCP/IP", "TCP", "インターネットの仕組み", "プロトコル", "ポート番号"],
  },
  {
    topicId: "tech-email-protocol",
    model: "diorama",
    shows: "メールがSMTPで送られ、POP/IMAPで受け取られるまでの様子",
    keywords: ["メール", "電子メール", "SMTP", "POP", "POP3", "IMAP", "MIME"],
  },
  {
    topicId: "tech-lan-wan",
    model: "diorama",
    shows: "自宅のLAN（Wi-Fiルータ・PC・プリンタ）から、ONU・通信事業者の局舎（WAN）を通って会社や海外へつながる様子",
    keywords: ["LAN", "WAN", "社内ネットワーク", "転送時間", "回線"],
  },
  {
    topicId: "tech-firewall-vpn-zero-trust",
    model: "diorama",
    shows: "会社の入口のファイアウォールとWAFが通信を通す/止める様子、自宅から会社へのVPNトンネル、ゼロトラストで毎回確かめる様子",
    keywords: ["ファイアウォール", "VPN", "ゼロトラスト", "DMZ", "パケットフィルタリング", "WAF", "プロキシ"],
  },
  {
    topicId: "tech-common-key-crypto",
    model: "diorama",
    shows: "A社とB社が同じ1本の鍵で暗号化・復号する様子と、鍵を渡す途中で盗まれる危険",
    keywords: ["共通鍵", "共通鍵暗号", "AES", "鍵配送"],
  },
  {
    topicId: "tech-public-key-crypto",
    model: "diorama",
    shows: "公開鍵で暗号化し、秘密鍵を持つ人だけが開けられる公開鍵暗号の様子",
    keywords: ["公開鍵", "公開鍵暗号", "秘密鍵", "RSA", "鍵ペア"],
  },
  {
    topicId: "tech-digital-signature",
    model: "diorama",
    shows: "秘密鍵で署名し公開鍵で確かめるデジタル署名と、認証局(CA)が証明書を発行する様子",
    keywords: ["デジタル署名", "電子署名", "認証局", "CA", "電子証明書", "PKI", "改ざん検知"],
  },
  {
    topicId: "tech-encryption-hash",
    model: "diorama",
    shows: "通販サイトの会員登録で、住所は暗号化して保存し（戻せる）、パスワードはハッシュ値だけ保存する（戻さない）様子",
    keywords: ["ハッシュ", "ハッシュ関数", "ハッシュ値", "パスワード保存", "SHA"],
  },
  {
    topicId: "tech-malware-phishing-ransomware",
    model: "diorama",
    shows: "ランサムウェアに感染したPCのファイルが暗号化され、身代金を要求される様子",
    keywords: ["ランサムウェア", "マルウェア", "ウイルス", "フィッシング", "ワーム", "トロイの木馬"],
  },
  {
    topicId: "tech-transaction",
    model: "diorama",
    shows: "銀行の振込で、途中で失敗したらロールバックし、成功したらコミットするトランザクションの様子",
    keywords: ["トランザクション", "コミット", "ロールバック", "排他制御", "ロック", "ACID"],
  },
  {
    topicId: "tech-os-software-hardware",
    model: "diorama",
    shows: "パソコンをアプリ・OS・ハードウェアの3つの階に分け、アプリの頼みごとがOSを通ってハードへ届く様子",
    keywords: ["OS", "オペレーティングシステム", "ミドルウェア", "ドライバ", "アプリケーション"],
  },
  {
    topicId: "tech-computer-types",
    model: "diorama",
    shows: "PC・サーバ・汎用機・スーパーコンピュータ・マイコンを、実際に置かれている場所ごと1つの街に並べた様子",
    keywords: ["スーパーコンピュータ", "メインフレーム", "コンピュータの種類", "ワークステーション"],
  },
  {
    topicId: "tech-system-processing-architecture",
    model: "diorama",
    shows: "コンビニチェーンの本部と店舗で、集中処理・分散処理・クライアントサーバ・三層・P2Pの違いを見せる様子",
    keywords: ["クライアントサーバ", "集中処理", "分散処理", "P2P", "ピアツーピア", "Webシステム"],
  },
  {
    topicId: "strat-bcp",
    model: "diorama",
    shows: "災害で本社が止まったとき、バックアップ拠点で業務を続けるBCPの様子",
    keywords: ["BCP", "事業継続", "災害対策", "BCM", "バックアップサイト"],
  },
  {
    topicId: "strat-embedded-systems",
    model: "diorama",
    shows: "エアコンのセンサーが温度を測り、マイコンが判断してファンを動かす組込みシステムの様子",
    keywords: ["組込みシステム", "組み込み", "マイコン", "制御", "エアコン"],
  },
  {
    topicId: "strat-business-process",
    model: "diorama",
    shows: "注文の書類が受付→転記→承認→発送の机を回り、遅い机（ボトルネック）に書類が溜まる様子と改善後の流れ",
    keywords: ["BPR", "業務プロセス", "業務改善", "ワークフロー", "BPM"],
  },
  {
    topicId: "strat-value-chain",
    model: "diorama",
    shows: "家具メーカーの購買物流→製造→出荷物流→販売→サービスの主活動と、それを支える支援活動",
    keywords: ["バリューチェーン", "価値連鎖", "主活動", "支援活動"],
  },
];

export function getExistingModel(topicId: string): ExistingModel | undefined {
  return EXISTING_MODELS.find((m) => m.topicId === topicId);
}

const normalize = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s・ー-]/g, "");

/**
 * 質問文に含まれるキーワードで模型を探す（AI が使えないとき・AI の答えの確かめ用）。
 * 長いキーワードほど強く数え、いちばん強い1件を返す。
 */
export function matchExistingModel(question: string): ExistingModel | null {
  const q = normalize(question);
  let best: { model: ExistingModel; score: number } | null = null;
  for (const model of EXISTING_MODELS) {
    let score = 0;
    for (const kw of model.keywords) {
      const k = normalize(kw);
      // 2文字以下の英字（OS・CA・EC など）は単語の一部と取り違えやすいので、前後が英字でないときだけ数える
      if (k.length <= 2 && /^[a-z]+$/.test(k)) {
        if (new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(q)) score += k.length;
      } else if (q.includes(k)) {
        score += k.length;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { model, score };
  }
  return best?.model ?? null;
}
