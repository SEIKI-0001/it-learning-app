// public/models/explain-kit.glb の部品の大きさ（scripts/explain3d/kit-assets.mjs が ~/Blender/explain_kit/kit.json から作る。手で直さない）。
// 単位 m・glTF 座標（x＝右、y＝上、z＝手前）。部品は足もとの中心が原点で、正面は手前（+z）を向く。

export type KitBox = { w: number; h: number; d: number };

/** 場所の床の上面の高さ（部品はここに置く） */
export const KIT_FLOOR_Y = 0.012;

export const KIT_PARTS: Record<string, KitBox> = {
  Item_coin: { w: 0.030, h: 0.016, d: 0.028 },
  Item_envelope: { w: 0.050, h: 0.034, d: 0.005 },
  Item_key: { w: 0.056, h: 0.032, d: 0.005 },
  Item_lock: { w: 0.022, h: 0.028, d: 0.013 },
  Item_paper: { w: 0.034, h: 0.046, d: 0.004 },
  Item_parcel: { w: 0.042, h: 0.033, d: 0.041 },
  Kit_attacker: { w: 0.165, h: 0.221, d: 0.195 },
  Kit_bank: { w: 0.256, h: 0.202, d: 0.192 },
  Kit_database: { w: 0.111, h: 0.330, d: 0.145 },
  Kit_datacenter: { w: 0.278, h: 0.130, d: 0.183 },
  Kit_factory: { w: 0.272, h: 0.256, d: 0.164 },
  Kit_firewall: { w: 0.111, h: 0.258, d: 0.142 },
  Kit_house: { w: 0.272, h: 0.200, d: 0.208 },
  Kit_laptop: { w: 0.135, h: 0.154, d: 0.210 },
  Kit_office: { w: 0.200, h: 0.352, d: 0.152 },
  Kit_pc: { w: 0.195, h: 0.189, d: 0.205 },
  Kit_person: { w: 0.086, h: 0.246, d: 0.044 },
  Kit_phone: { w: 0.087, h: 0.246, d: 0.072 },
  Kit_router: { w: 0.180, h: 0.179, d: 0.090 },
  Kit_safe: { w: 0.105, h: 0.120, d: 0.102 },
  Kit_server: { w: 0.111, h: 0.306, d: 0.142 },
  Kit_store: { w: 0.246, h: 0.167, d: 0.203 },
  Kit_switch: { w: 0.180, h: 0.123, d: 0.090 },
  Kit_truck: { w: 0.179, h: 0.102, d: 0.084 },
  Kit_wifi: { w: 0.120, h: 0.160, d: 0.075 },
};

/** 場所の床の大きさ（w＝横、d＝奥行き） */
export const KIT_ZONES: Record<string, { w: number; d: number; h: number }> = {
  Zone_datacenter: { w: 0.62, d: 0.56, h: 0.236 },
  Zone_home: { w: 0.62, d: 0.56, h: 0.162 },
  Zone_internet: { w: 0.5, d: 0.56, h: 0.243 },
  Zone_office: { w: 0.62, d: 0.56, h: 0.172 },
  Zone_outside: { w: 0.5, d: 0.56, h: 0.162 },
  Zone_town: { w: 0.9, d: 0.56, h: 0.172 },
};

/** 画面（CanvasTexture を貼る面）のある部品 */
export const KIT_SCREENS = ["attacker","laptop","pc","phone"] as const;
/** LED（状態で光らせる）のある部品 */
export const KIT_LEDS = ["database","firewall","router","server","switch","wifi"] as const;
