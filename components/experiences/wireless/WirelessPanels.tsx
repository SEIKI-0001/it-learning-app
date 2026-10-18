import type { ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// 無線LAN・モバイルの解説で、過去問の出題に合わせて足したパネル群。操作不要の静的な図。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえている。

const Takeaway = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
);

// ② 無線LANを守る設定 ---------------------------------------------------------------
const SETTINGS: { t: string; does: string; not?: string }[] = [
  { t: "WPA2 / WPA3", does: "通信データを暗号化する（古いWEPより安全）" },
  { t: "PSK（事前共有鍵）", does: "接続時に入れるパスフレーズ。これをもとに端末ごとの暗号鍵が作られる" },
  { t: "ESSIDステルス", does: "電波の名前（ESSID）を周りに知らせず、不正接続のリスクを下げる", not: "暗号化や認証はしない" },
  { t: "MACアドレスフィルタリング", does: "登録したMACアドレスの機器以外からの接続を拒否する" },
  { t: "ゲストSSID", does: "来客の端末を、社内ネットワークにはつながず、インターネットにだけつなぐ" },
];

export function WifiSettings({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>無線LANを守る設定の見分け方</SectionTitle>
      <dl className="mt-3 space-y-1.5" data-testid="wifi-settings">
        {SETTINGS.map((s) => (
          <div key={s.t} className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-setting={s.t}>
            <dt className="text-[14px] font-bold text-gray-900">{s.t}</dt>
            <dd className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
              {s.does}
              {s.not && <span className="mt-0.5 block font-bold text-rose-700">注意：{s.not}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <Takeaway>
        アクセスポイントを通さず、端末どうしが直接つながる無線ネットワークは<b>アドホックネットワーク</b>。
        暗号化するのはWPA2だけで、ステルスやMACアドレスフィルタリングは「つながる相手を絞る」対策です。
      </Takeaway>
    </Panel>
  );
}

// ⑤ 近距離・省電力・位置の通信 -------------------------------------------------------
const SHORT: { t: string; range: string; d: string }[] = [
  { t: "NFC・RFID", range: "数cm", d: "スマホのICチップをかざして、駅の改札や決済に使う。QRコードの読み取りは別の仕組み" },
  { t: "BLE", range: "数m〜数十m", d: "Bluetooth 4.0で追加された省電力の仕様。ボタン電池で半年〜数年動き、機器どうしの距離の推定にも使う。従来のBluetoothとは互換性がない" },
  { t: "LPWA", range: "数km〜", d: "Low Power Wide Area。無線LANより範囲が広く、4Gより消費電力が少ない。IoTのセンサー向け" },
];
const OTHERS: { t: string; d: string }[] = [
  { t: "IrDA", d: "赤外線で通信する" },
  { t: "PLC", d: "電力線（コンセントの配線）で通信する" },
  { t: "準天頂衛星", d: "日本の上空に長くとどまる軌道の衛星。GPSと併用して、ビルの谷間でも位置を精度よく測る" },
];

export function ShortRange({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>近距離・省電力の通信と、位置を測る衛星</SectionTitle>
      <ol className="mt-3 space-y-1.5" data-testid="short-range">
        {SHORT.map((s) => (
          <li key={s.t} className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-tech={s.t}>
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-bold text-gray-900">{s.t}</span>
              <span className="flex-none rounded bg-gray-100 px-1.5 text-[11px] font-bold text-gray-600">届く距離 {s.range}</span>
            </p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">{s.d}</p>
          </li>
        ))}
      </ol>
      <dl className="mt-3 space-y-1" data-testid="short-others">
        {OTHERS.map((o) => (
          <div key={o.t} className="grid grid-cols-[5.5rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug">
            <dt className="font-bold text-gray-900">{o.t}</dt>
            <dd className="text-gray-700">{o.d}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

// ⑥ 携帯電話の電波と、問題文の言い回し --------------------------------------------------
const PHRASES = [
  { phrase: "複数の異なる周波数の電波を束ねて、無線通信を高速化する", term: "キャリアアグリゲーション" },
  { phrase: "移動中に、つながる基地局を自動で切り替えて通話を保つ", term: "ハンドオーバー" },
  { phrase: "海外でも、国内と同じメールなどのサービスを使える", term: "ローミング" },
  { phrase: "アクセスポイントを経由せず、端末どうしが直接通信する", term: "アドホックネットワーク" },
];

export function MobileRadio({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>携帯電話の電波と、問題文の言い回し</SectionTitle>
      <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2.5 text-[13px] leading-relaxed text-sky-950 ring-1 ring-sky-200" data-testid="platinum-band">
        <p className="font-bold">プラチナバンド</p>
        <p className="mt-0.5">
          電波は<b>周波数が低いほど回り込みやすく</b>、建物の裏にも届きやすい。この性質をもつ
          <b>700MHz帯〜900MHz帯</b>は、つながりやすいのでプラチナバンドと呼ばれます。
        </p>
      </div>
      <table className="mt-3 w-full border-collapse text-[12px]" data-testid="mobile-phrases">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-1.5 py-1 font-bold">問題文にこう書いてあれば</th>
            <th className="w-[9.5rem] px-1.5 py-1 font-bold">答え</th>
          </tr>
        </thead>
        <tbody>
          {PHRASES.map((p) => (
            <tr key={p.term} className="border-b border-gray-100 align-top">
              <td className="px-1.5 py-1.5 text-gray-700">{p.phrase}</td>
              <td className="px-1.5 py-1.5 font-bold text-brand-800">{p.term}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
