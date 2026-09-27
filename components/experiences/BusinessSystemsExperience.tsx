"use client";

import { GisIcon, GpsIcon, IcCardIcon, PosIcon } from "./bizsys/Icons";
import { Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「身近なビジネスシステム」。POS・ICカード・GPS・GISは、文章だけだと
// 「何をしている仕組みか」が伝わりにくいので、小さな線画イラストで動きを見せる。
//   ① POS：バーコードを読む → その場で商品・時刻・数量が販売データになる（→発注までの流れ）
//   ② ICカード：チップをリーダーにかざす → 決済・乗車に使われる
//   ③ GPSとGIS：GPSは位置を測る、GISは地図に情報を重ねて分析する（同じものと混同しやすい）
//   ④ 試験ポイント

export default function BusinessSystemsExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        お店・お金・移動の身近な場面にも、データを集めて活用する仕組みがあります。
        <b>POS</b>は売れた記録を、<b>ICカード</b>は決済や乗車の認証を、<b>GPS・GIS</b>は位置に関する情報を扱います。
      </Lead>
      <PosPanel />
      <IcCardPanel />
      <LocationPanel />
      <PointsPanel
        step={4}
        points={[
          <>POSは<b>販売した時点</b>のデータ（商品・時刻・数量）を収集する</>,
          <>ICカードは内蔵チップを使い、<b>金融・交通の決済や認証</b>に使われる</>,
          <>GPSは<b>位置を測る</b>仕組み、GISは<b>地図に情報を重ねて分析する</b>仕組み</>,
        ]}
        traps={[
          ["POSを在庫そのものだと思う", "POSが集めるのは販売時点のデータ。在庫管理はそのデータを使う別の仕組み"],
          ["GPSとGISを同じ仕組みだと思う", "GPSは現在位置を測定し、GISはその位置情報を地図上で重ねて分析する"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① POS
// ---------------------------------------------------------------------------

const FLOW = ["販売", "データ収集", "分析", "発注"];

function PosPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>POS ― 売れたその時点でデータを記録</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        レジでバーコードを読み取ると、<b className="text-gray-800">商品・時刻・数量</b>が販売の記録として、
        その場ですぐデータになります（POS＝販売時点情報管理）。
      </p>
      <PosIcon />
      <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
        本部はこのデータを時間帯別に分析し、<b className="text-gray-800">在庫と照らして次の発注量</b>を決めます。
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[12px] font-bold" data-testid="bizsys-flow">
        {FLOW.map((f, i) => (
          <span key={f} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-gray-300" aria-hidden>
                →
              </span>
            )}
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-800 ring-1 ring-brand-200">{f}</span>
          </span>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② ICカード
// ---------------------------------------------------------------------------

function IcCardPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>ICカード ― かざして決済・乗車</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">内蔵チップ</b>に情報を保持し、リーダーにかざして読み書きします。
        キャッシュカードや電子マネーの<b className="text-gray-800">決済</b>、乗車券としての<b className="text-gray-800">乗車</b>に使われます。
      </p>
      <IcCardIcon />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ GPSとGIS
// ---------------------------------------------------------------------------

function LocationPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>GPSとGIS ― 測るのと、重ねて見るのは別</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        名前は似ていますが、役割は別々です。<b className="text-gray-800">GPSは位置を測る</b>、
        <b className="text-gray-800">GISは地図の上に情報を重ねて分析する</b>仕組みです。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="bizsys-location">
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          <div className="text-center text-[12px] font-bold text-gray-700">GPS（測位）</div>
          <GpsIcon />
          <p className="mt-1 text-center text-[11px] leading-snug text-gray-500">衛星からの信号で現在位置を求める</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          <div className="text-center text-[12px] font-bold text-gray-700">GIS（地理情報）</div>
          <GisIcon />
          <p className="mt-1 text-center text-[11px] leading-snug text-gray-500">人口・店舗などを地図に重ねて分析する</p>
        </div>
      </div>
    </Panel>
  );
}
