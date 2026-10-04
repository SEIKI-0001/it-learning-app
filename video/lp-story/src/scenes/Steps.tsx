// 5〜7. 解決の3ステップ：左に言葉、右に実際のアプリ画面。カメラは語りが指すところへ寄る。
//   STEP 1 理解する … 動く図解（パケットが経路を通って届き、元に戻る）
//   STEP 2 測る     … 確認問題を解いて正解を確かめる
//   STEP 3 次を決める … 合格準備度と現在地 → 今日やること
import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Camera, Eyebrow, PHONE_BEZEL, PHONE_SCREEN, Paper, PenCircle, PenLine, Phone, Rise, ScreenNote, Tap, clamp, easeInOutCubic, progress, track } from "../parts/motion";
import { C } from "../theme";
import type { Scene } from "../timeline";

/** 右側の画面パネル（左端はぼかして言葉の列となじませる） */
const PANEL = { left: 820, width: 1100, height: 1080 };
const PANEL_C = { x: PANEL.width / 2, y: PANEL.height / 2 };

function Layout({ text, panel, note }: { text: ReactNode; panel: ReactNode; note?: string }) {
  return (
    <AbsoluteFill>
      <Paper />
      <div
        style={{
          position: "absolute",
          left: PANEL.left,
          top: 0,
          width: PANEL.width,
          height: PANEL.height,
          WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 70px)",
          maskImage: "linear-gradient(90deg, transparent 0, #000 70px)",
        }}
      >
        {panel}
      </div>
      <div style={{ position: "absolute", left: 140, top: 0, bottom: 0, width: 720, display: "flex", flexDirection: "column", justifyContent: "center" }}>{text}</div>
      {note && <ScreenNote text={note} />}
    </AbsoluteFill>
  );
}

const HEAD = 88;

// ---------- STEP 1 理解する ----------
const PACKET = { w: 1152, h: 924, crop: 64 }; // 下端の「ドラッグで回転」は切る
export function Learn({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const [l] = scene.lines;
  const w = 980;
  const s = w / PACKET.w;
  const h = (PACKET.h - PACKET.crop) * s;
  // 6枚の静止画をクロスフェードでつなぎ、パケットが流れて届く様子にする
  const step = interpolate(frame, [8, scene.frames - 18], [0, 5], clamp);
  const enter = progress(frame, 0, 26);
  const zoom = interpolate(frame, [0, scene.frames + 14], [1, 1.06], clamp);
  return (
    <Layout
      note="実際の教材画面"
      text={
        <>
          <Eyebrow text="STEP 1 ｜ 理解する" at={4} />
          <div style={{ marginTop: 36 }}>
            <Rise runs="動く図解で、" at={l.onsets[0]} size={HEAD} />
            <Rise runs="仕組みから" at={l.onsets[1] - 4} size={HEAD} />
            <div style={{ position: "relative" }}>
              <Rise runs={[{ t: "理解する", color: C.ai }, { t: "。" }]} at={l.onsets[1] + 6} size={HEAD} />
              <PenLine width={370} at={l.onsets[1] + 22} style={{ left: 0, top: 112 }} />
            </div>
          </div>
        </>
      }
      panel={
        <div
          style={{
            position: "absolute",
            left: 70,
            top: (1080 - h) / 2,
            width: w,
            height: h,
            borderRadius: 28,
            overflow: "hidden",
            background: C.white,
            boxShadow: "0 40px 90px rgba(26,35,64,0.16), 0 0 0 1px rgba(26,35,64,0.06)",
            opacity: enter,
            transform: `translateX(${(1 - enter) * 60}px)`,
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Img
              key={i}
              src={staticFile(`shots/packet-${i}.png`)}
              style={{ position: "absolute", left: 0, top: 0, width: w, transformOrigin: "50% 45%", transform: `scale(${zoom})`, opacity: i === 0 ? 1 : interpolate(step, [i - 0.35, i], [0, 1], clamp) }}
            />
          ))}
        </div>
      }
    />
  );
}

// ---------- スマホを置いたパネル ----------
const PHONE_SCALE = 1.06;
const PW = PHONE_SCREEN.w * PHONE_SCALE + PHONE_BEZEL * 2;
const PH = PHONE_SCREEN.h * PHONE_SCALE + PHONE_BEZEL * 2;
const PX = PANEL_C.x - PW / 2 + 20;
const PY = (PANEL.height - PH) / 2;
/** 画面の論理座標 → パネル座標 */
const at = (x: number, y: number) => ({ x: PX + PHONE_BEZEL + x * PHONE_SCALE, y: PY + PHONE_BEZEL + y * PHONE_SCALE });

type Key = [number, { x: number; y: number; s: number }];
function useCam(keys: Key[]) {
  const frame = useCurrentFrame();
  return {
    x: track(frame, keys.map(([f, v]) => [f, v.x])),
    y: track(frame, keys.map(([f, v]) => [f, v.y])),
    s: track(frame, keys.map(([f, v]) => [f, v.s])),
  };
}
const WIDE = { x: PANEL_C.x, y: PANEL_C.y, s: 1 };
const focus = (x: number, y: number, s: number) => ({ ...at(x, y), s });

// ---------- STEP 2 測る ----------
// 撮影画面での選択肢「プロトコル」と解説欄の位置（論理座標）
const ANSWER = { x: 195, y: 438 };
const FEEDBACK = { x: 195, y: 560 };
export function Measure({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const [l] = scene.lines;
  const tap = l.onsets[1] + 14;
  const enter = progress(frame, 0, 26);
  const cam = useCam([
    [0, WIDE],
    [tap - 16, focus(ANSWER.x, ANSWER.y - 40, 1.18)],
    [tap + 24, focus(FEEDBACK.x, FEEDBACK.y - 30, 1.4)],
  ]);
  const answered = interpolate(frame, [tap + 3, tap + 9], [0, 1], clamp);
  return (
    <Layout
      note="実際の画面（撮影用の学習データ）"
      text={
        <>
          <Eyebrow text="STEP 2 ｜ 測る" at={4} />
          <div style={{ marginTop: 36 }}>
            <Rise runs="確認問題で、" at={l.onsets[0]} size={HEAD} />
            <Rise runs="本当に分かったかを" at={l.onsets[1] - 4} size={HEAD} />
            <div style={{ position: "relative" }}>
              <Rise runs={[{ t: "確かめる", color: C.ai }, { t: "。" }]} at={l.onsets[1] + 14} size={HEAD} />
              <PenLine width={370} at={l.onsets[1] + 32} style={{ left: 0, top: 112 }} />
            </div>
          </div>
        </>
      }
      panel={
        <Camera x={cam.x} y={cam.y} scale={cam.s} cx={PANEL_C.x} cy={PANEL_C.y}>
          <Phone
            scale={PHONE_SCALE}
            style={{ left: PX, top: PY, opacity: enter, transform: `translateY(${(1 - enter) * 50}px)` }}
            screens={[
              { src: "shots/quiz.png", opacity: 1 },
              { src: "shots/quiz-answer.png", opacity: answered },
            ]}
          >
            <Tap x={ANSWER.x} y={ANSWER.y} at={tap} />
          </Phone>
        </Camera>
      }
    />
  );
}

// ---------- STEP 3 次を決める ----------
const READINESS = { x: 92, y: 134 }; // 「68 /100」
const ROAD = { x: 195, y: 420 }; // 合格までの道のり（いまここ）
const TODAY_HEAD = { x: 170, y: 100 }; // 「あと29分で、今日のぶんが終わります。」
const TODAY_LIST = { x: 195, y: 590 }; // 今日の順番
export function Next({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const [l1, l2] = scene.lines;
  const swap = l2.from - 12;
  const enter = progress(frame, 0, 26);
  const cam = useCam([
    [0, WIDE],
    [l1.onsets[2] - 6, focus(READINESS.x + 70, READINESS.y + 10, 1.55)],
    [l1.onsets[3] - 4, focus(ROAD.x, ROAD.y, 1.3)],
    [swap - 6, focus(ROAD.x, ROAD.y, 1.25)],
    [swap + 10, WIDE],
    [l2.onsets[0] + 8, focus(TODAY_HEAD.x, TODAY_HEAD.y + 10, 1.5)],
    [l2.onsets[1] + 4, focus(TODAY_LIST.x, TODAY_LIST.y, 1.22)],
  ]);
  // 画面の切り替え：進捗 → 今日（アプリのページ遷移のように横へ送る）
  const sw = progress(frame, swap, 16, easeInOutCubic);
  const textOut = l2.from - 18;
  return (
    <Layout
      note="実際の画面（撮影用の学習データ）"
      text={
        <>
          <Eyebrow text="STEP 3 ｜ 次を決める" at={4} />
          <div style={{ position: "relative", marginTop: 36, height: HEAD * 0.82 * 1.32 + HEAD * 1.32 * 3 + 20 }}>
            <div style={{ position: "absolute", left: 0, top: 0 }}>
              <Rise runs="その結果から、" at={l1.onsets[0]} size={HEAD * 0.82} color={C.sub} exit={textOut} />
              <Rise runs="今の実力と、" at={l1.onsets[2]} size={HEAD} exit={textOut} />
              <Rise runs="足りないところが" at={l1.onsets[3]} size={HEAD} exit={textOut + 2} />
              <Rise runs={[{ t: "見える", color: C.ai }, { t: "。" }]} at={l1.onsets[3] + 14} size={HEAD} exit={textOut + 4} />
            </div>
            <div style={{ position: "absolute", left: 0, top: 0 }}>
              <Rise runs="試験日から逆算して、" at={l2.onsets[0]} size={HEAD * 0.82} color={C.sub} />
              <div style={{ position: "relative" }}>
                <Rise runs={[{ t: "今日やること", color: C.ai }, { t: "が" }]} at={l2.onsets[1] - 6} size={HEAD} />
                <PenLine width={540} at={l2.onsets[1] + 12} style={{ left: 0, top: 112 }} />
              </div>
              <Rise runs="決まる。" at={l2.onsets[1] + 8} size={HEAD} />
            </div>
          </div>
        </>
      }
      panel={
        <Camera x={cam.x} y={cam.y} scale={cam.s} cx={PANEL_C.x} cy={PANEL_C.y}>
          <div style={{ position: "absolute", inset: 0, opacity: enter, transform: `translateY(${(1 - enter) * 50}px)` }}>
            <Phone
              scale={PHONE_SCALE}
              style={{ left: PX, top: PY }}
              screens={[]}
            >
              <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                <Img src={staticFile("shots/progress.png")} style={{ position: "absolute", left: -sw * 390 * 0.35, top: 0, width: 390, opacity: 1 - sw * 0.6 }} />
                <Img src={staticFile("shots/today.png")} style={{ position: "absolute", left: (1 - sw) * 390, top: 0, width: 390, boxShadow: "-10px 0 30px rgba(0,0,0,0.12)" }} />
                {frame < swap && <PenCircle w={190} h={96} at={l1.onsets[2] + 8} stroke={4} style={{ left: READINESS.x - 95 + 6, top: READINESS.y - 48 }} />}
              </div>
            </Phone>
          </div>
        </Camera>
      }
    />
  );
}

