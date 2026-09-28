import { useId, type CSSProperties, type ReactNode } from "react";
import { Billboard, Box, Cylinder, FloorShadow, type Vec3 } from "./Diorama3D";
import { EavesdropperStanding } from "./DioramaPeople";
import styles from "./dioramaParts.module.css";

// CSS 3D ジオラマの共通部品（机・PC・サーバラック・建物・人・運ぶ物）。
// 全テーマで同じ縮尺・同じ素材を使い、「同じ小さな世界」の中に見えるようにする。
// 縮尺の目安（px）：机の天板の高さ 44、ノートPC 幅 66、座った人 78×106、立った人 60×118、サーバラック 70×60×116。
// 各部品の (x, y, z) は「足もとの中心」。rot（0/90/180/270）で向きを変えられる（正面は +y＝手前向き）。
// 文字は 3D に貼らない。機器の名前・値は DioramaLabel（HTML）で付ける。画面の中身だけは機器の一部として描く。

export type PartState = "idle" | "active" | "sending" | "error" | "disabled" | "done";

/** サーバとブラウザで小数の丸めが違うと hydration がずれるので、計算した座標は文字列にして固定する */
const r2 = (n: number) => n.toFixed(2);

type At = { x: number; y: number; z?: number; rot?: number };

/** 部品をまとめて置く入れ物。子は原点（足もとの中心）まわりに組む。 */
export function Group({
  x = 0,
  y = 0,
  z = 0,
  rot = 0,
  children,
  className,
  style,
  testId,
  data,
}: Partial<At> & {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  testId?: string;
  data?: Record<`data-${string}`, string | undefined>;
}) {
  return (
    <div
      className={`${styles.group} ${className ?? ""}`}
      style={{ transform: `translate3d(${r2(x)}px, ${r2(y)}px, ${r2(z)}px)${rot ? ` rotateZ(${rot}deg)` : ""}`, ...style }}
      data-testid={testId}
      {...data}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 床・壁・台座
// ---------------------------------------------------------------------------

export type FloorMaterial =
  | "wood"
  | "carpet"
  | "tile"
  | "dc"
  | "asphalt"
  | "grass"
  | "concrete"
  | "paving"
  | "plain";

const FLOOR_COLOR: Record<FloorMaterial, string> = {
  wood: "#c9b39a",
  carpet: "#8d97a8",
  tile: "#e3e6ea",
  dc: "#cfd6e0",
  asphalt: "#5b6270",
  grass: "#8fbf7a",
  concrete: "#c7c9cc",
  paving: "#d9d2c5",
  plain: "#e7ebf0",
};

/** 模型の台座（床板）。(x, y) は奥・左の角。 */
export function Floor({
  x,
  y,
  w,
  d,
  h = 14,
  z = 0,
  material = "plain",
  className,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  h?: number;
  z?: number;
  material?: FloorMaterial;
  className?: string;
}) {
  return (
    <Box
      x={x}
      y={y}
      z={z - h}
      w={w}
      d={d}
      h={h}
      color={FLOOR_COLOR[material]}
      faceClass={{ top: `${styles.floor} ${className ?? ""}`, front: styles.plinthEdge, left: styles.plinthEdge }}
      style={{ "--m": material } as CSSProperties}
      omit={["back", "right"]}
      faces={{ top: <span className={styles.floorTexture} data-material={material} /> }}
    />
  );
}

/** 部屋の壁（奥＝back か 左＝left）。厚み 10。faces.front / faces.right に窓・掲示物を貼れる。 */
export function Wall({
  x,
  y,
  length,
  h = 140,
  side = "back",
  tone = "office",
  children,
}: {
  x: number;
  y: number;
  length: number;
  h?: number;
  side?: "back" | "left";
  tone?: "office" | "cafe" | "dc" | "home" | "factory";
  children?: ReactNode;
}) {
  const color = tone === "dc" ? "#e2e7ee" : tone === "factory" ? "#d6d9dd" : tone === "cafe" ? "#f3ede4" : "#f4f5f7";
  return side === "back" ? (
    <Box
      x={x}
      y={y - 10}
      w={length}
      d={10}
      h={h}
      color={color}
      faceClass={{ front: styles.wallFace }}
      faces={{ front: children }}
      style={{ "--wall": color } as CSSProperties}
    />
  ) : (
    <Box
      x={x - 10}
      y={y}
      w={10}
      d={length}
      h={h}
      color={color}
      faceClass={{ right: styles.wallFace }}
      faces={{ right: children }}
      style={{ "--wall": color } as CSSProperties}
    />
  );
}

/** 壁に付ける窓（Wall の children に入れる）。 */
export function WallWindow({ left, top, w, h }: { left: number; top: number; w: number; h: number }) {
  return <div className={styles.window} style={{ left, top, width: w, height: h }} />;
}

/** 壁の掲示物（ホワイトボード・時計など、文字のない飾り）。 */
export function WallBoard({ left, top, w, h, kind = "whiteboard" }: { left: number; top: number; w: number; h: number; kind?: "whiteboard" | "cork" | "screen" }) {
  return <div className={styles.board} data-kind={kind} style={{ left, top, width: w, height: h }} />;
}

// ---------------------------------------------------------------------------
// 家具
// ---------------------------------------------------------------------------

/** 机。tone=office は白い天板＋灰色の脚、wood はカフェ・自宅の木の天板。 */
export function Desk({
  x,
  y,
  z = 0,
  rot,
  w = 106,
  d = 64,
  h = 44,
  tone = "office",
  shadow = true,
}: At & { w?: number; d?: number; h?: number; tone?: "office" | "wood" | "counter"; shadow?: boolean }) {
  const top = tone === "wood" ? "#c89a6c" : tone === "counter" ? "#7a5638" : "#eef0f3";
  const leg = tone === "wood" ? "#3b3f47" : "#9aa3b0";
  return (
    <Group x={x} y={y} z={z} rot={rot}>
      {shadow && <FloorShadow x={-w / 2 - 6} y={-d / 2 + 4} w={w + 24} d={d + 14} opacity={0.28} />}
      {tone === "counter" ? (
        <Box x={-w / 2} y={-d / 2} w={w} d={d} h={h} color={top} faceClass={{ top: styles.counterTop }} />
      ) : (
        <>
          <Box x={-w / 2 + 4} y={-d / 2 + 4} w={4} d={4} h={h - 4} color={leg} />
          <Box x={w / 2 - 8} y={-d / 2 + 4} w={4} d={4} h={h - 4} color={leg} />
          <Box x={-w / 2 + 4} y={d / 2 - 8} w={4} d={4} h={h - 4} color={leg} />
          <Box x={w / 2 - 8} y={d / 2 - 8} w={4} d={4} h={h - 4} color={leg} />
          <Box
            x={-w / 2}
            y={-d / 2}
            z={h - 4}
            w={w}
            d={d}
            h={4}
            color={top}
            faceClass={{ top: tone === "wood" ? styles.woodTop : styles.officeTop }}
          />
        </>
      )}
    </Group>
  );
}

/** オフィスチェア（座面＋背もたれ）。人を座らせないときの空席にも。 */
export function Chair({ x, y, z = 0, rot }: At) {
  return (
    <Group x={x} y={y} z={z} rot={rot}>
      <Box x={-2} y={-2} w={4} d={4} h={22} color="#3a3f4b" />
      <Box x={-13} y={-12} z={22} w={26} d={24} h={5} color="#3b4252" />
      <Box x={-12} y={10} z={26} w={24} d={4} h={26} color="#343a46" />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// 画面（機器の画面の中身は約3倍で組んで縮める＝最小フォント対策・にじみ軽減）
// ---------------------------------------------------------------------------

export function Screen({
  children,
  tone = "light",
  glow = false,
  className,
}: {
  children?: ReactNode;
  tone?: "light" | "dark" | "off";
  glow?: boolean;
  className?: string;
}) {
  return (
    <div className={`${styles.screen} ${className ?? ""}`} data-tone={tone} data-glow={glow ? "true" : "false"}>
      {tone !== "off" && <div className={styles.screenInner}>{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 端末
// ---------------------------------------------------------------------------

/** 点の列を進行方向の右側へ d だけずらす（往路と復路を2車線に分ける）。 */
export function offsetPath(points: Vec3[], d: number): Vec3[] {
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: p.x - ((b.y - a.y) / len) * d, y: p.y + ((b.x - a.x) / len) * d, z: p.z };
  });
}

/** 点の列の割合 t（0〜1）までを切り出す（小包が経路を途中まで進むときの道のり）。 */
export function slicePath(points: Vec3[], t: number, z?: number): Vec3[] {
  const lens = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  const total = lens.reduce((s, v) => s + v, 0);
  let remain = total * t;
  const out: Vec3[] = [{ ...points[0], z: z ?? points[0].z }];
  for (let i = 0; i < lens.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (remain <= lens[i]) {
      const k = lens[i] ? remain / lens[i] : 0;
      out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: z ?? b.z });
      return out;
    }
    out.push({ ...b, z: z ?? b.z });
    remain -= lens[i];
  }
  return out;
}

/** ノートPC。screen に画面の中身（Screen の中身）を渡す。(x,y,z) は本体の中心・机の上面。 */
export function Laptop({
  x,
  y,
  z = 44,
  rot,
  screen,
  tone = "light",
  glow,
  w = 66,
  testId,
}: At & { screen?: ReactNode; tone?: "light" | "dark" | "off"; glow?: boolean; w?: number; testId?: string }) {
  const d = Math.round(w * 0.6);
  const lidH = Math.round(w * 0.66);
  return (
    <Group x={x} y={y} z={z} rot={rot} testId={testId}>
      <Box x={-w / 2} y={-d / 2} w={w} d={d} h={3} color="#cfd5dd" faceClass={{ top: styles.keyboardTop }} />
      <div className={styles.lidMount} style={{ transform: `translate3d(${-w / 2}px, ${-d / 2}px, 3px)` }}>
        <div className={styles.lid} style={{ width: w, height: lidH, top: -lidH }}>
          <Screen tone={tone} glow={glow}>
            {screen}
          </Screen>
        </div>
      </div>
    </Group>
  );
}

/** デスクトップのモニター＋キーボード。 */
export function Monitor({
  x,
  y,
  z = 44,
  rot,
  screen,
  tone = "light",
  glow,
  w = 78,
  keyboard = true,
  testId,
}: At & { screen?: ReactNode; tone?: "light" | "dark" | "off"; glow?: boolean; w?: number; keyboard?: boolean; testId?: string }) {
  const h = Math.round(w * 0.6);
  return (
    <Group x={x} y={y} z={z} rot={rot} testId={testId}>
      <Box x={-10} y={-14} w={20} d={12} h={2} color="#2b2f38" />
      <Box x={-2.5} y={-10} z={2} w={5} d={4} h={16} color="#2b2f38" />
      <Box
        x={-w / 2}
        y={-8}
        z={14}
        w={w}
        d={3}
        h={h}
        color="#1f232b"
        faceClass={{ front: styles.monitorFace }}
        faces={{
          front: (
            <Screen tone={tone} glow={glow}>
              {screen}
            </Screen>
          ),
        }}
      />
      {keyboard && (
        <>
          <Box x={-26} y={8} w={52} d={16} h={2.5} color="#dfe3e8" faceClass={{ top: styles.keysTop }} />
          <Box x={32} y={10} w={8} d={12} h={3} color="#dfe3e8" />
        </>
      )}
    </Group>
  );
}

/** スマホ（立てて見せる）。screen に画面の中身を渡す。 */
export function Phone({
  x,
  y,
  z = 0,
  rot,
  screen,
  tone = "light",
  glow,
  scale = 1,
  testId,
}: At & { screen?: ReactNode; tone?: "light" | "dark" | "off"; glow?: boolean; scale?: number; testId?: string }) {
  const w = 24 * scale;
  const h = 48 * scale;
  return (
    <Group x={x} y={y} z={z} rot={rot} testId={testId}>
      <Box
        x={-w / 2}
        y={-2}
        w={w}
        d={4}
        h={h}
        color="#1b1e25"
        faceClass={{ front: styles.phoneFace }}
        faces={{
          front: (
            <Screen tone={tone} glow={glow} className={styles.phoneScreen}>
              {screen}
            </Screen>
          ),
        }}
      />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// サーバ・ネットワーク機器
// ---------------------------------------------------------------------------

/** 19インチのサーバラック。state=active で LED が速く点滅、error で赤。units で段数。 */
export function ServerRack({
  x,
  y,
  z = 0,
  rot,
  w = 64,
  d = 56,
  h = 116,
  units = 6,
  state = "idle",
  tone = "dark",
  testId,
  accent,
}: At & {
  w?: number;
  d?: number;
  h?: number;
  units?: number;
  state?: PartState;
  tone?: "dark" | "light";
  testId?: string;
  /** 前面の上に付ける色の帯（機器の種類を色で見分ける） */
  accent?: string;
}) {
  return (
    <Group x={x} y={y} z={z} rot={rot} testId={testId}>
      <FloorShadow x={-w / 2 - 4} y={-d / 2 + 6} w={w + 22} d={d + 10} opacity={0.35} />
      <Box
        x={-w / 2}
        y={-d / 2}
        w={w}
        d={d}
        h={h}
        color={tone === "dark" ? "#2a303c" : "#dfe3e9"}
        faceClass={{ front: styles.rackFront, left: styles.rackSide, right: styles.rackSide }}
        style={{ "--accent": accent ?? "transparent" } as CSSProperties}
        faces={{
          front: (
            <div className={styles.rackBays} data-state={state} data-tone={tone}>
              {accent && <span className={styles.rackAccent} />}
              {Array.from({ length: units }, (_, i) => (
                <div key={i} className={styles.rackBay}>
                  <span className={styles.led} style={{ animationDelay: `${i * 170}ms` }} />
                  <span className={styles.led} data-alt style={{ animationDelay: `${i * 90 + 300}ms` }} />
                </div>
              ))}
            </div>
          ),
        }}
      />
    </Group>
  );
}

/** 家庭・店舗の Wi-Fi ルータ（白い箱＋アンテナ2本）。 */
export function WifiRouter({ x, y, z = 0, rot, on = true, testId }: At & { on?: boolean; testId?: string }) {
  return (
    <Group x={x} y={y} z={z} rot={rot} testId={testId}>
      <Box
        x={-17}
        y={-10}
        w={34}
        d={20}
        h={8}
        color="#f1f3f6"
        faceClass={{ front: styles.routerFront }}
        faces={{
          front: (
            <div className={styles.ledRow} data-on={on ? "true" : "false"}>
              <span className={styles.led} />
              <span className={styles.led} data-alt />
              <span className={styles.led} />
            </div>
          ),
        }}
      />
      <Box x={-14} y={-8} z={8} w={3} d={3} h={22} color="#e2e6eb" />
      <Box x={11} y={-8} z={8} w={3} d={3} h={22} color="#e2e6eb" />
    </Group>
  );
}

/** 通信会社・データセンターの業務用ルータ／スイッチ／ファイアウォール（ラックマウント機器を台に載せる）。 */
export function Appliance({
  x,
  y,
  z = 0,
  rot,
  kind = "router",
  state = "idle",
  stand = 0,
  w = 60,
  testId,
}: At & {
  kind?: "router" | "switch" | "firewall" | "waf" | "gateway" | "vpn";
  state?: PartState;
  /** 台の高さ（0 なら置き台なし） */
  stand?: number;
  w?: number;
  testId?: string;
}) {
  const color = kind === "firewall" ? "#b4323f" : kind === "waf" ? "#b8660b" : kind === "gateway" ? "#2455b8" : kind === "vpn" ? "#0f7a5c" : "#39414f";
  return (
    <Group x={x} y={y} z={z} rot={rot} testId={testId}>
      {stand > 0 && (
        <>
          <FloorShadow x={-w / 2 - 4} y={-12} w={w + 18} d={34} opacity={0.3} />
          <Box x={-w / 2 + 2} y={-14} w={w - 4} d={28} h={stand} color="#8a93a1" faceClass={{ front: styles.standFront }} />
        </>
      )}
      <Box
        x={-w / 2}
        y={-16}
        z={stand}
        w={w}
        d={32}
        h={14}
        color={color}
        faceClass={{ front: styles.applianceFront }}
        faces={{
          front: (
            <div className={styles.appliancePanel} data-state={state} data-kind={kind}>
              <span className={styles.portGrid} />
              <span className={styles.led} />
              <span className={styles.led} data-alt />
            </div>
          ),
        }}
      />
    </Group>
  );
}

/** ガラスの仕切り（データセンターの境界・会議室など）。(x,y) は奥・左の角、axis=x で横長、y で奥行き方向。 */
export function GlassWall({
  x,
  y,
  length,
  h = 90,
  axis = "x",
  alarm = false,
  testId,
}: {
  x: number;
  y: number;
  length: number;
  h?: number;
  axis?: "x" | "y";
  /** 赤く光らせる（不正な侵入を止めた） */
  alarm?: boolean;
  testId?: string;
}) {
  const frame = { w: axis === "x" ? length : 4, d: axis === "x" ? 4 : length };
  return (
    <div className={styles.group} data-testid={testId} data-alarm={alarm ? "true" : "false"}>
      <Box x={x} y={y} w={frame.w} d={frame.d} h={4} color="#8a93a1" />
      <Box
        x={x}
        y={y}
        z={4}
        w={frame.w}
        d={frame.d}
        h={h - 8}
        color="#bcd7ee"
        faceClass={{ top: styles.glassPane, front: styles.glassPane, back: styles.glassPane, left: styles.glassPane, right: styles.glassPane }}
      />
      <Box x={x} y={y} z={h - 4} w={frame.w} d={frame.d} h={4} color="#8a93a1" />
    </div>
  );
}

/** データベース（円筒を3段重ねた、いつもの DB の形）。 */
export function Database({ x, y, z = 0, r = 20, state = "idle", testId }: At & { r?: number; state?: PartState; testId?: string }) {
  return (
    <Group x={x} y={y} z={z} testId={testId} data={{ "data-state": state }}>
      <FloorShadow x={-r - 6} y={-r * 0.6} w={r * 2 + 20} d={r * 1.6} opacity={0.3} />
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.group} data-state={state}>
          <Cylinder from={{ x: 0, y: 0, z: i * 17 }} to={{ x: 0, y: 0, z: i * 17 + 14 }} z={0} r={r} segments={14} stripClassName={styles.dbStrip} />
          <div className={styles.dbCap} style={{ width: r * 2, height: r * 2, left: -r, top: -r, transform: `translateZ(${i * 17 + 14}px)` }} />
        </div>
      ))}
    </Group>
  );
}

// ---------------------------------------------------------------------------
// 建物（屋根を外したカットモデルにもできる）
// ---------------------------------------------------------------------------

export type BuildingKind = "office" | "bank" | "factory" | "store" | "datacenter" | "house" | "warehouse" | "tower";

const BUILDING_COLOR: Record<BuildingKind, string> = {
  office: "#dfe6ef",
  bank: "#e9e4da",
  factory: "#d5d9de",
  store: "#f3eee6",
  datacenter: "#d9dee6",
  house: "#f1e9dd",
  warehouse: "#cfd5dc",
  tower: "#cfd9e6",
};

/** 建物。(x, y) は足もとの中心。kind で外装（窓・シャッター・看板の台）が変わる。damaged でひび・割れ窓。 */
export function Building({
  x,
  y,
  z = 0,
  w,
  d,
  h,
  kind = "office",
  state = "idle",
  damaged = false,
  dim = false,
  color,
  roof = true,
  testId,
  children,
}: {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  kind?: BuildingKind;
  state?: PartState;
  damaged?: boolean;
  /** 使えない・まだ無い（半透明の灰色） */
  dim?: boolean;
  color?: string;
  roof?: boolean;
  testId?: string;
  /** 屋上に載せる物 */
  children?: ReactNode;
}) {
  const facade = (
    <div className={styles.facade} data-kind={kind} data-damaged={damaged ? "true" : "false"} data-state={state} />
  );
  return (
    <Group x={x} y={y} z={z} testId={testId} data={{ "data-dim": dim ? "true" : "false" }} className={styles.building}>
      <FloorShadow x={-w / 2 - 8} y={-d / 2 + 10} w={w + 36} d={d + 20} opacity={0.35} />
      <Box
        x={-w / 2}
        y={-d / 2}
        w={w}
        d={d}
        h={h}
        color={color ?? BUILDING_COLOR[kind]}
        faceClass={{ front: styles.facadeFace, left: styles.facadeFace, right: styles.facadeFace, top: styles.roofTop }}
        faces={{ front: facade, left: facade, right: facade }}
        omit={roof ? undefined : ["top"]}
      />
      {kind === "store" && (
        <Box x={-w / 2 - 2} y={d / 2 - 2} z={h * 0.42} w={w + 4} d={16} h={4} color="#d8483d" faceClass={{ top: styles.awning, front: styles.awningFront }} />
      )}
      {kind === "factory" && (
        <>
          <Box x={w / 2 - 22} y={-d / 2 + 6} z={h} w={14} d={14} h={46} color="#a9afb8" />
          <Box x={w / 2 - 22} y={-d / 2 + 6} z={h + 46} w={14} d={14} h={4} color="#8a2f2f" />
        </>
      )}
      {(kind === "datacenter" || kind === "office" || kind === "bank") && roof && (
        <>
          <Box x={-w / 2 + 10} y={-d / 2 + 8} z={h} w={22} d={16} h={10} color="#aab2bd" faceClass={{ top: styles.ventTop }} />
          <Box x={-w / 2 + 38} y={-d / 2 + 8} z={h} w={22} d={16} h={10} color="#aab2bd" faceClass={{ top: styles.ventTop }} />
        </>
      )}
      {kind === "house" && roof && (
        <div className={styles.gable} style={{ transform: `translate3d(${-w / 2}px, ${-d / 2}px, ${h}px)`, width: w, height: d }}>
          <div className={styles.gableA} style={{ height: d / 2 + 4 }} />
          <div className={styles.gableB} style={{ height: d / 2 + 4, top: d / 2 - 4 }} />
        </div>
      )}
      {roof && children && <Group x={0} y={0} z={h}>{children}</Group>}
    </Group>
  );
}

// ---------------------------------------------------------------------------
// 植栽・車両
// ---------------------------------------------------------------------------

export function Plant({ x, y, z = 0, size = 1 }: { x: number; y: number; z?: number; size?: number }) {
  return (
    <>
      <FloorShadow x={x - 20 * size} y={y - 10 * size} w={50 * size} d={36 * size} opacity={0.22} />
      <Box x={x - 12 * size} y={y - 12 * size} z={z} w={24 * size} d={24 * size} h={22 * size} color="#b86a44" />
      <Billboard x={x} y={y} z={z + 20 * size} w={52 * size} h={58 * size}>
        <svg viewBox="0 0 58 64" className="h-full w-full" aria-hidden>
          <path d="M29 64 C 20 44, 6 40, 2 22 C 16 26, 24 38, 29 64 Z" fill="#3f8f5a" />
          <path d="M29 64 C 38 42, 52 38, 56 18 C 42 24, 32 36, 29 64 Z" fill="#4fa56b" />
          <path d="M29 64 C 26 40, 22 18, 30 2 C 36 18, 34 42, 29 64 Z" fill="#5bb879" />
        </svg>
      </Billboard>
    </>
  );
}

export function Tree({ x, y, z = 0, size = 1 }: { x: number; y: number; z?: number; size?: number }) {
  return (
    <>
      <FloorShadow x={x - 24 * size} y={y - 12 * size} w={60 * size} d={40 * size} opacity={0.25} />
      <Billboard x={x} y={y} z={z} w={56 * size} h={90 * size}>
        <svg viewBox="0 0 56 90" className="h-full w-full" aria-hidden>
          <rect x="25" y="58" width="6" height="32" rx="2" fill="#7a5638" />
          <ellipse cx="28" cy="38" rx="24" ry="28" fill="#4f9a62" />
          <ellipse cx="20" cy="30" rx="12" ry="14" fill="#62b276" opacity="0.8" />
          <ellipse cx="36" cy="46" rx="12" ry="12" fill="#3f8552" opacity="0.8" />
        </svg>
      </Billboard>
    </>
  );
}

/** 配送トラック（荷台＋運転席）。正面は +x。 */
export function Truck({ x, y, z = 0, rot, color = "#f4f6f9", testId }: At & { color?: string; testId?: string }) {
  return (
    <Group x={x} y={y} z={z} rot={rot} testId={testId}>
      <FloorShadow x={-44} y={-18} w={98} d={40} opacity={0.3} />
      <Box x={-40} y={-15} z={6} w={56} d={30} h={32} color={color} faceClass={{ front: styles.truckSide, back: styles.truckSide }} />
      <Box x={18} y={-14} z={6} w={22} d={28} h={22} color="#2f6fdb" faceClass={{ right: styles.truckCab }} />
      {[-30, 4, 28].map((wx) =>
        [-15, 13].map((wy) => (
          <Cylinder key={`${wx}${wy}`} from={{ x: wx - 5, y: wy + 1, z: 6 }} to={{ x: wx + 5, y: wy + 1, z: 6 }} z={6} r={6} segments={8} stripClassName={styles.tireStrip} />
        )),
      )}
    </Group>
  );
}

// ---------------------------------------------------------------------------
// 経路（床の道・ケーブル・ガラス管）
// ---------------------------------------------------------------------------

export type RouteTone = "idle" | "request" | "response" | "secure" | "danger" | "blocked" | "done" | "warn" | "violet" | "amber";

/** 床に引いた経路（点の列）。active で矢印の模様が流れる（transform だけのアニメ）。 */
export function FloorRoute({
  points,
  width = 12,
  tone = "idle",
  active = false,
  z = 0.8,
  testId,
  data,
  fast = false,
}: {
  points: Vec3[];
  width?: number;
  tone?: RouteTone;
  active?: boolean;
  /** 大量の通信（DDoS など）：模様を速く・密に流す */
  fast?: boolean;
  z?: number;
  testId?: string;
  data?: Record<`data-${string}`, string | undefined>;
}) {
  return (
    <div className={styles.group} data-testid={testId} data-tone={tone} data-active={active ? "true" : "false"} {...data}>
      {points.slice(1).map((to, i) => {
        const from = points[i];
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
        return (
          <div
            key={i}
            className={styles.route}
            data-tone={tone}
            data-active={active ? "true" : "false"}
            data-fast={fast ? "true" : undefined}
            style={{
              width: `${r2(length + width / 2)}px`,
              height: width,
              top: -width / 2,
              left: -width / 4,
              transform: `translate3d(${r2(from.x)}px, ${r2(from.y)}px, ${r2((from.z ?? 0) + z)}px) rotateZ(${r2(angle)}deg)`,
            }}
          >
            <span className={styles.routeFlow} />
          </div>
        );
      })}
    </div>
  );
}

/** 空中を渡すケーブル（通信回線）。tone で色、active で光の粒ではなく芯が光る。 */
export function Cable({
  from,
  to,
  r = 3,
  tone = "idle",
  segments = 8,
}: {
  from: Vec3;
  to: Vec3;
  r?: number;
  tone?: RouteTone;
  segments?: number;
}) {
  return (
    <div className={styles.group} data-tone={tone}>
      <Cylinder from={from} to={to} z={from.z ?? 0} r={r} segments={segments} stripClassName={styles.cableStrip} />
    </div>
  );
}

/** 暗号の通り道（TLS・VPN）のガラス管。on で現れる。 */
export function GlassTube({
  from,
  to,
  r = 11,
  on,
  tone = "secure",
  testId,
}: {
  from: Vec3;
  to: Vec3;
  r?: number;
  on: boolean;
  tone?: "secure" | "danger" | "info";
  testId?: string;
}) {
  return (
    <div className={styles.group} data-on={on ? "true" : "false"} data-tone={tone} data-testid={testId}>
      <Cylinder from={from} to={to} z={from.z ?? 0} r={r} segments={14} stripClassName={styles.glassStrip} />
    </div>
  );
}

/** 遮断の壁（赤い半透明の板）。(x,y) は板の中心、axis で向き。 */
export function Barrier({
  x,
  y,
  z = 0,
  w = 80,
  h = 60,
  axis = "x",
  on,
  testId,
}: {
  x: number;
  y: number;
  z?: number;
  w?: number;
  h?: number;
  axis?: "x" | "y";
  on: boolean;
  testId?: string;
}) {
  return (
    <div
      className={styles.barrier}
      data-on={on ? "true" : "false"}
      data-testid={testId}
      style={{
        width: w,
        height: h,
        transform: `translate3d(${x}px, ${y}px, ${z}px) rotateZ(${axis === "x" ? 0 : 90}deg) translateX(${-w / 2}px) rotateX(90deg)`,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// 運ぶ物（DioramaToken の中に入れる）。原点は底面の中心。
// ---------------------------------------------------------------------------

export type CarryTone = "plain" | "secure" | "danger" | "ok" | "info" | "warn" | "muted";

const CARRY_COLOR: Record<CarryTone, string> = {
  plain: "#fbf4e2",
  secure: "#0f9f76",
  danger: "#e11d48",
  ok: "#16a37a",
  info: "#2f6fdb",
  warn: "#f59e0b",
  muted: "#cbd2dc",
};

export type ParcelMark = "lock" | "check" | "alert" | "none";

/** データの小包（パケット・リクエスト）。上面の印は文字ではなく形（鍵・チェック・注意）で描く。 */
export function Parcel({ tone = "plain", mark = "none", size = 1, testId }: { tone?: CarryTone; mark?: ParcelMark; size?: number; testId?: string }) {
  const w = 24 * size;
  const d = 16 * size;
  return (
    <div className={styles.group} data-testid={testId} data-tone={tone}>
      <Box
        x={-w / 2}
        y={-d / 2}
        w={w}
        d={d}
        h={12 * size}
        color={CARRY_COLOR[tone]}
        faceClass={{ top: styles.parcelTop }}
        faces={{ top: mark !== "none" ? <span className={styles.parcelMark} data-mark={mark} data-tone={tone} aria-hidden /> : undefined }}
      />
    </div>
  );
}

/** 紙の書類（数枚重ね）。stamp で印鑑の色、tone で紙の色。 */
export function Paper({ tone = "plain", count = 1, stamp }: { tone?: CarryTone; count?: number; stamp?: "ok" | "danger" | "info" }) {
  return (
    <div className={styles.group}>
      {Array.from({ length: count }, (_, i) => (
        <Box
          key={i}
          x={-11 + (i % 2) * 1.5}
          y={-14 + (i % 3)}
          z={i * 2.2}
          w={22}
          d={28}
          h={1.6}
          color={tone === "plain" ? "#fdfdfb" : CARRY_COLOR[tone]}
          faceClass={{ top: styles.paperTop }}
          faces={i === count - 1 && stamp ? { top: <span className={styles.stamp} data-tone={stamp} /> } : undefined}
        />
      ))}
    </div>
  );
}

/** 封筒（メール）。 */
export function Envelope({ tone = "plain", sealed = false }: { tone?: CarryTone; sealed?: boolean }) {
  return (
    <div className={styles.group}>
      <Box
        x={-14}
        y={-9}
        w={28}
        d={18}
        h={3}
        color={tone === "plain" ? "#fffdf7" : CARRY_COLOR[tone]}
        faceClass={{ top: styles.envelopeTop }}
        faces={{ top: <span className={styles.envelopeFlap} data-sealed={sealed ? "true" : "false"} /> }}
      />
    </div>
  );
}

/** 鍵（カメラを向く板）。kind で色：public=緑、private=赤、common=金。 */
export function KeyGlyph({ kind, size = 1, ghost = false }: { kind: "public" | "private" | "common"; size?: number; ghost?: boolean }) {
  // アプリ全体の約束：公開鍵＝緑、秘密鍵＝赤、共通鍵＝金
  const fill = kind === "public" ? "#16a37a" : kind === "private" ? "#e11d48" : "#e0a526";
  const dark = kind === "public" ? "#0b7457" : kind === "private" ? "#9f1239" : "#a6761a";
  return (
    <Billboard x={0} y={0} z={0} w={34 * size} h={20 * size}>
      <svg viewBox="0 0 34 20" className="h-full w-full" aria-hidden style={{ opacity: ghost ? 0.4 : 1 }}>
        <circle cx="8" cy="10" r="7" fill={fill} stroke={dark} strokeWidth="1.4" />
        <circle cx="8" cy="10" r="2.6" fill="#ffffff" />
        <rect x="14" y="8" width="18" height="4" rx="1.2" fill={fill} stroke={dark} strokeWidth="1" />
        <rect x="24" y="12" width="3" height="5" fill={fill} stroke={dark} strokeWidth="0.8" />
        <rect x="29" y="12" width="3" height="4" fill={fill} stroke={dark} strokeWidth="0.8" />
      </svg>
    </Billboard>
  );
}

/** 硬貨・お金の束。 */
export function Coin({ tone = "warn" }: { tone?: CarryTone }) {
  const color = tone === "danger" ? "#e11d48" : tone === "muted" ? "#cbd2dc" : "#e0a526";
  return (
    <div className={styles.group}>
      <Cylinder from={{ x: 0, y: 0, z: 0 }} to={{ x: 0, y: 0, z: 5 }} z={0} r={11} segments={12} stripClassName={styles.coinStrip} style={{ "--coin": color } as CSSProperties} />
      <div className={styles.coinTop} style={{ background: color }} />
    </div>
  );
}

/** 立っている人（正面・背中）。shirt で服の色。 */
export function Person({
  x,
  y,
  z = 0,
  pose = "stand",
  shirt = "#4f86e8",
  hair = "#2e2019",
  size = 1,
  testId,
  dim = false,
  active = false,
}: {
  x: number;
  y: number;
  z?: number;
  /** attacker＝フードとヘッドホンの盗聴者・攻撃者（active で身を乗り出す） */
  pose?: "stand" | "back" | "sit" | "attacker";
  active?: boolean;
  shirt?: string;
  hair?: string;
  size?: number;
  testId?: string;
  dim?: boolean;
}) {
  const w = (pose === "sit" ? 78 : pose === "attacker" ? 60 : 44) * size;
  const h = (pose === "sit" ? 106 : pose === "attacker" ? 112 : 108) * size;
  return (
    <>
      <FloorShadow x={x - w * 0.45} y={y - 12 * size} w={w * 0.9} d={30 * size} opacity={0.3} />
      <Billboard x={x} y={y} z={z} w={w} h={h}>
        <div
          className="h-full w-full"
          data-testid={testId}
          data-illustration={pose === "attacker" ? "attacker" : "human"}
          style={{ opacity: dim ? 0.35 : 1 }}
        >
          {pose === "attacker" ? (
            <EavesdropperStanding active={active} />
          ) : pose === "sit" ? <SeatedFromBehind shirt={shirt} hair={hair} /> : <Standing shirt={shirt} hair={hair} back={pose === "back"} />}
        </div>
      </Billboard>
    </>
  );
}

function SeatedFromBehind({ shirt, hair }: { shirt: string; hair: string }) {
  const shade = `dp-shade-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 82 112" className="h-full w-full" aria-hidden>
      <rect x="38" y="90" width="6" height="14" rx="2" fill="#3a3f4b" />
      <ellipse cx="41" cy="106" rx="20" ry="5" fill="#2c313c" />
      <path d="M12 74 C 12 54, 22 44, 41 44 C 60 44, 70 54, 70 74 L 70 86 L 12 86 Z" fill={shirt} />
      <path d="M12 74 C 12 54, 22 44, 41 44 C 60 44, 70 54, 70 74 L 70 86 L 12 86 Z" fill={`url(#${shade})`} />
      <rect x="18" y="62" width="46" height="32" rx="9" fill="#343a46" />
      <rect x="22" y="66" width="38" height="4" rx="2" fill="#4a5160" />
      <rect x="35" y="36" width="12" height="10" rx="4" fill="#e7b995" />
      <ellipse cx="25.5" cy="28" rx="3" ry="4.5" fill="#e7b995" />
      <ellipse cx="56.5" cy="28" rx="3" ry="4.5" fill="#e7b995" />
      <ellipse cx="41" cy="24" rx="15.5" ry="17" fill={hair} />
      <defs>
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Standing({ shirt, hair, back }: { shirt: string; hair: string; back: boolean }) {
  const body = `dp-body-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 44 108" className="h-full w-full" aria-hidden>
      {/* 脚 */}
      <path d="M14 66 L 13 104 L 20 104 L 22 70 L 24 104 L 31 104 L 30 66 Z" fill="#374151" />
      <ellipse cx="16.5" cy="104.5" rx="4.5" ry="2.2" fill="#1f2937" />
      <ellipse cx="27.5" cy="104.5" rx="4.5" ry="2.2" fill="#1f2937" />
      {/* 胴 */}
      <path d="M8 40 C 8 30, 14 26, 22 26 C 30 26, 36 30, 36 40 L 35 70 L 9 70 Z" fill={shirt} />
      <path d="M8 40 C 8 30, 14 26, 22 26 C 30 26, 36 30, 36 40 L 35 70 L 9 70 Z" fill={`url(#${body})`} />
      {/* 腕 */}
      <path d="M8 40 L 5 64 L 9 65 L 12 44 Z" fill={shirt} />
      <path d="M36 40 L 39 64 L 35 65 L 32 44 Z" fill={shirt} />
      <circle cx="7" cy="66" r="2.6" fill="#e7b995" />
      <circle cx="37" cy="66" r="2.6" fill="#e7b995" />
      {!back && <path d="M18 27 L 22 34 L 26 27" stroke="#ffffff" strokeWidth="1.6" fill="none" opacity="0.85" />}
      {/* 首と頭 */}
      <rect x="18.5" y="20" width="7" height="8" rx="3" fill="#e7b995" />
      <ellipse cx="22" cy="13" rx="9" ry="10" fill={back ? hair : "#e7b995"} />
      {!back && <path d="M13 11 C 13 4, 31 4, 31 11 C 28 7, 16 7, 13 11 Z" fill={hair} />}
      {!back && (
        <>
          <circle cx="18.6" cy="14" r="1" fill="#1f2937" />
          <circle cx="25.4" cy="14" r="1" fill="#1f2937" />
        </>
      )}
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  );
}
