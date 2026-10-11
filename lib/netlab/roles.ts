import type { PlaceableKind } from "./engine";

// 機器を置く前に見せる「役割カード」。役割を読んで、1問の確認に正解したら置ける。
// 問いは用語の暗記ではなく「この機器は何のためにあるか」を確かめる（置いた後のつまずきを先に防ぐ）。

export type RoleCard = {
  kind: PlaceableKind;
  /** ひとことで言うと */
  role: string;
  /** 身近なものにたとえると */
  analogy: string;
  /** どこにつなぐか */
  connects: string;
  question: string;
  choices: string[];
  answer: number;
  /** 正解したときに添える一言 */
  why: string;
};

export const ROLE_CARDS: Record<PlaceableKind, RoleCard> = {
  switch: {
    kind: "switch",
    role: "同じ建物の中の機器どうしを、ケーブルで1か所に集めてつなぎ、1つの LAN にまとめる。",
    analogy: "社内の仕分け係。届いたデータを、宛先の机にだけ渡す。",
    connects: "社員の PC・サーバ・ルータなど、社内の機器を何台でも。",
    question: "スイッチの役割はどれ？",
    choices: ["インターネットとの出入口になる", "社内の機器どうしをつないで LAN にまとめる", "名前を IP アドレスに変換する"],
    answer: 1,
    why: "スイッチは社内（LAN）の中をつなぐ係。外への出入口はルータの仕事です。",
  },
  router: {
    kind: "router",
    role: "社内の LAN と、外のインターネットをつなぐ出入口。宛先を見て外へ送り出し、社内の機器に IP アドレスも配る（DHCP）。",
    analogy: "会社の受付と門。社外宛ての郵便はここを通って出ていく。",
    connects: "WAN 側を外（光回線の ONU）へ、LAN 側を社内のスイッチへ。",
    question: "ルータが社内 LAN とつなぐ相手はどれ？",
    choices: ["隣の席の PC", "外のネットワーク（インターネット）", "プリンタの電源"],
    answer: 1,
    why: "ルータは「ネットワークとネットワーク」をつなぐ機器。社内と社外の境目に置きます。",
  },
  fileServer: {
    kind: "fileServer",
    role: "社員みんなで使うファイルを置いておくコンピュータ。社員の PC から共有フォルダとして開く。",
    analogy: "みんなの書庫。場所（住所）がころころ変わると、誰もたどり着けない。",
    connects: "社内のスイッチへ。IP アドレスは手で決めて固定する。",
    question: "ファイルサーバの IP アドレスはどうするのがよい？",
    choices: ["毎回変わってよい", "いつも同じアドレスに固定する", "IP アドレスはなくてよい"],
    answer: 1,
    why: "みんながいつも同じ住所で探しに来るので、固定 IP アドレスにします。",
  },
  ap: {
    kind: "ap",
    role: "電波（Wi-Fi）で、ノート PC やスマホを社内の LAN につなぐ入口。",
    analogy: "目に見えないケーブルの差し込み口。",
    connects: "有線で社内のスイッチへ。端末とは電波でつながる。",
    question: "無線 AP で暗号化（WPA2 / WPA3）が欠かせない理由は？",
    choices: ["電波は壁の外まで届くから", "通信が速くなるから", "電気代が安くなるから"],
    answer: 0,
    why: "電波は建物の外にも漏れます。暗号化しないと、外の人が接続したり盗み見たりできます。",
  },
  firewall: {
    kind: "firewall",
    role: "外と内の境目で、通してよい通信だけを通し、それ以外を止める。",
    analogy: "ビルの入口の警備員。決められたリストに載った人だけ通す。",
    connects: "外（ONU）とルータの間に挟む。公開するサーバは DMZ ポートへ。",
    question: "ファイアウォールは何を見て「通す・止める」を決める？",
    choices: ["通信の速さ", "あらかじめ決めたルール（宛先やポート番号）", "ケーブルの色"],
    answer: 1,
    why: "宛先・ポート番号などのルールと照らし合わせて通信をふるい分けます（パケットフィルタリング）。",
  },
  webServer: {
    kind: "webServer",
    role: "会社の Web サイトを、外のお客さんに見せるコンピュータ。",
    analogy: "お店のショーウィンドウ。外から見えるが、店の奥（社内）には入れない。",
    connects: "ファイアウォールの DMZ ポートへ。社内 LAN とは分けて置く。",
    question: "外に公開する Web サーバはどこに置く？",
    choices: ["社内 LAN の真ん中", "社員の PC の中", "DMZ（社内と外の間の区画）"],
    answer: 2,
    why: "外から触られるサーバは DMZ に置き、乗っ取られても社内 LAN まで入られないようにします。",
  },
};
