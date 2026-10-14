import type { IconName } from "@/components/ui/Icon";

export type Question = { prompt: string; options: string[]; answer: number; explanation: string };
export type Mission = {
  id: string; title: string; subtitle: string; icon: IconName; tag: string;
  story: string; task: string; choices: { label: string; icon: IconName; feedback: string }[];
  answer: number; source: string; target: string; bridge: string; takeaway: string;
  lessonHref: string; questions: Question[];
};

// 学習用のオリジナル問題。IPA公開問題を転載したものではない。
export const missions: Mission[] = [
  {
    id: "lan", title: "はじめてのつながり", subtitle: "LANとWAN", icon: "monitor", tag: "NETWORK BASICS",
    story: "小さなカフェをオープン！ レジのパソコンと店内のパソコンで、売上データを共有したい。",
    task: "同じ店内の有線LANで、2台のパソコンをつなぐ機器は？",
    source: "レジのPC", target: "店内のPC", bridge: "スイッチングハブ",
    choices: [
      { label: "DNSサーバ", icon: "server", feedback: "DNSは名前からIPアドレスを調べる役割。今回は、店内の機器をケーブルでつなぐ道具を探そう。" },
      { label: "スイッチングハブ", icon: "grid", feedback: "接続成功！ スイッチングハブは同じLAN内の機器をつなぎ、宛先のMACアドレスをもとにデータを転送します。" },
      { label: "プリンタ", icon: "file-text", feedback: "プリンタは紙に印刷する機器。パソコン同士の通信を中継する機器ではありません。" },
    ], answer: 1,
    takeaway: "LANは家やオフィスなど、限られた範囲のネットワーク。WANは離れた拠点のLAN同士などを結ぶ広域のネットワークです。",
    lessonHref: "/learn/network/network-basics/tech-lan-wan",
    questions: [
      { prompt: "LANの説明として、最も適切なものは？", options: ["世界中を結ぶ一つの無線ネットワーク", "同じ建物などの限られた範囲を結ぶネットワーク", "ドメイン名をIPアドレスに変換する仕組み", "メールを暗号化する仕組み"], answer: 1, explanation: "LANはLocal Area Networkの略。家庭やオフィスなど限られた範囲で使います。有線でも無線でもLANを構成できます。" },
      { prompt: "東京本社と大阪支社を通信回線でつなぐ。このつながりに当たるものは？", options: ["1台のPCの内部配線", "ブラウザのキャッシュ", "離れた拠点のLAN同士を結ぶWAN", "店内だけの無線LAN"], answer: 2, explanation: "WANはWide Area Networkの略。通信事業者の回線などを利用して、地理的に離れた拠点を結びます。" },
    ],
  },
  {
    id: "router", title: "外の世界へ届けよう", subtitle: "IPアドレスとルータ", icon: "globe", tag: "ROUTING",
    story: "カフェのPCから、別のネットワークにある仕入先へ注文データを届けよう。",
    task: "異なるネットワークの間で、宛先IPアドレスをもとにデータを転送するのは？",
    source: "カフェのLAN", target: "仕入先のネットワーク", bridge: "ルータ",
    choices: [
      { label: "ルータ", icon: "globe", feedback: "外の世界につながった！ ルータは宛先IPアドレスと経路情報を使い、別のネットワークへデータを転送します。" },
      { label: "スイッチングハブ", icon: "grid", feedback: "基本的なスイッチングハブは同じLAN内で転送します。今回は異なるネットワークを結ぶ役割が必要です。" },
      { label: "ディスプレイ", icon: "monitor", feedback: "ディスプレイは情報を表示する機器。ネットワーク間の道案内はできません。" },
    ], answer: 0,
    takeaway: "IPアドレスはネットワーク上の住所。IPv4は32ビット、IPv6は128ビットです。ルータは異なるネットワークの間の道案内役です。", lessonHref: "/learn/network/network-basics/tech-network-devices",
    questions: [
      { prompt: "ルータの主な役割は？", options: ["名前からIPアドレスを検索する", "Webページの文字を表示する", "異なるネットワーク間でパケットを転送する", "メールの本文を作成する"], answer: 2, explanation: "ルータは宛先のIPアドレスを見て転送先を決めます。DNSの名前解決やアプリの表示処理とは役割が異なります。" },
      { prompt: "IPv4アドレスの長さは？", options: ["32ビット", "8ビット", "64ビット", "128ビット"], answer: 0, explanation: "IPv4は32ビット。例の192.168.1.10は、8ビットずつの4組を10進数で表しています。IPv6は128ビットです。" },
    ],
  },
  {
    id: "dns", title: "名前から住所を探せ", subtitle: "ドメイン名とDNS", icon: "search", tag: "NAME RESOLUTION",
    story: "cafe.example のサイトを開きたい。キャッシュに情報がないので、まずサーバのIPアドレスを調べよう。",
    task: "ドメイン名からIPアドレスを調べる相手を選ぼう。",
    source: "cafe.example", target: "192.0.2.10", bridge: "DNS",
    choices: [
      { label: "DHCP", icon: "wifi", feedback: "DHCPはIPアドレスなどのネットワーク設定を端末に自動配布します。名前から住所を調べる役割は別です。" },
      { label: "SMTP", icon: "mail", feedback: "SMTPは電子メールを送信・転送するためのプロトコル。サイトのIPアドレスは調べられません。" },
      { label: "DNS", icon: "search", feedback: "住所が見つかった！ DNSでドメイン名に対応するIPアドレスが分かり、その宛先への接続に進めます。" },
    ], answer: 2,
    takeaway: "DNSは名前とIPアドレスを対応づける仕組み。DHCPは端末にIPアドレスなどを配る仕組み。似た略語でも役割は違います。図のアドレスは説明用です。", lessonHref: "/learn/network/network-basics/tech-network-address",
    questions: [
      { prompt: "DNSを利用する目的は？", options: ["無線の電波を強くする", "ドメイン名に対応するIPアドレスを調べる", "通信内容を暗号化する", "ファイルを圧縮する"], answer: 1, explanation: "DNSの名前解決で、人が覚えやすいドメイン名から機器が通信に使うIPアドレスを調べられます。キャッシュがあれば再利用する場合もあります。" },
      { prompt: "端末にIPアドレスなどを自動で割り当てる仕組みは？", options: ["HTTP", "DNS", "SMTP", "DHCP"], answer: 3, explanation: "DHCPはIPアドレスやデフォルトゲートウェイ、DNSサーバの情報などを端末へ配布します。DNSの名前解決とは区別しましょう。" },
    ],
  },
  {
    id: "https", title: "ひみつの注文を守ろう", subtitle: "HTTP・HTTPS", icon: "shield", tag: "SECURE CONNECTION",
    story: "ネットショップで注文。入力した情報が通信の途中でそのまま読まれないようにしたい。",
    task: "Webサーバとの通信をTLSで暗号化する方式を選ぼう。",
    source: "注文するブラウザ", target: "ショップのサーバ", bridge: "HTTPS / TLS",
    choices: [
      { label: "HTTP", icon: "globe", feedback: "HTTPだけでは通信を暗号化しません。TLSを組み合わせる方式を選ぼう。" },
      { label: "HTTPS", icon: "shield", feedback: "暗号化して届いた！ HTTPSはHTTPをTLSで保護し、通信中の盗聴や改ざんのリスクを減らします。" },
      { label: "SSID", icon: "wifi", feedback: "SSIDは無線LANを識別する名前です。Web通信を暗号化する方式ではありません。" },
    ], answer: 1,
    takeaway: "HTTPSは通信経路を保護します。ただし、HTTPSのサイトだから運営者が信頼できるとは限りません。偽サイトにも注意が必要です。", lessonHref: "/learn/network/internet-web/tech-http-https",
    questions: [
      { prompt: "HTTPSが主に保護するものは？", options: ["ブラウザとWebサーバ間の通信", "PCに保存したすべてのファイル", "Webサイトの商品の品質", "サイトに書かれた情報の正しさ"], answer: 0, explanation: "HTTPSはTLSで通信を暗号化し、改ざん検知やサーバ認証にも役立ちます。保存済みファイルや商品の品質を保証する仕組みではありません。" },
      { prompt: "HTTPSで接続できたサイトへの対応として適切なのは？", options: ["どのサイトにもパスワードを入力してよい", "運営者は必ず信頼できる", "URLや運営者も確認してから情報を入力する", "ウイルス対策は不要になる"], answer: 2, explanation: "HTTPSは通信の保護。詐欺サイトがHTTPSを使うこともあるため、正しいドメインや運営者かを確認することが大切です。" },
    ],
  },
  {
    id: "mail", title: "メールの配達人", subtitle: "通信プロトコル", icon: "mail", tag: "PROTOCOLS",
    story: "仕入先にお礼のメールを書いた。送信ボタンの向こうで働くプロトコルを選ぼう。",
    task: "電子メールの送信・メールサーバ間の転送に使うのは？",
    source: "送信者", target: "メールサーバ", bridge: "SMTP",
    choices: [
      { label: "IMAP", icon: "server", feedback: "IMAPはサーバ上のメールを参照・管理するためのプロトコル。送信は別のプロトコルが担当します。" },
      { label: "DNS", icon: "search", feedback: "DNSは配送先を調べる際にも利用しますが、メール本文の送信・転送そのものは別のプロトコルが担当します。" },
      { label: "SMTP", icon: "mail", feedback: "送信成功！ SMTPがメールを送信・転送します。受信したメールの参照にはIMAPやPOP3などを使います。" },
    ], answer: 2,
    takeaway: "プロトコルは通信のお約束。WebはHTTP/HTTPS、メール送信はSMTP、メール参照・受信はIMAP/POP3。目的とセットで覚えましょう。", lessonHref: "/learn/network/network-services/tech-email-protocol",
    questions: [
      { prompt: "メールを送信するプロトコルは？", options: ["POP3", "SMTP", "IMAP", "FTP"], answer: 1, explanation: "SMTPはメールの送信・サーバ間転送を担当します。POP3とIMAPは受信・参照、FTPはファイル転送に使います。" },
      { prompt: "PCとスマホでサーバ上のメールを参照・管理したい。適したものは？", options: ["DHCP", "IP", "HTTP", "IMAP"], answer: 3, explanation: "IMAPではサーバ上のメールを参照・管理できます。複数端末で同じメールボックスを扱う用途に適しています。" },
    ],
  },
];
