# モチット Rive インポートチェックリスト

`design/mochit/source/mochit-layered.svg` を Rive Editor に取り込み、`public/characters/mochit/mochit.riv` を書き出すまでの手順と検証項目。

## 1. インポート前

- [ ] `design/mochit/references/overlay-compare.html` をブラウザで開き、SVGとマスターの一致を最終確認
- [ ] Rive Editor（Web/Desktop）が最新版であること
- [ ] SVGの `feGaussianBlur`（頬・影・グロス・コアシーン）と `radialGradient`（Core_Glow）は**インポートで失われる/変換される前提**を理解しておく

## 2. インポート

- [ ] 新規ファイル → アートボード名を **`Mochit`** にする（アプリ側定数 `MOCHIT_RIVE_ARTBOARD` と一致必須）
- [ ] アートボード 1024×1024・背景透過
- [ ] SVGをインポートし、`Mochit_Root`（scale 0.816587）がグループとして保持されているか確認
- [ ] レイヤー名が `design/mochit/docs/mochit-layer-map.md` の表と一致しているか確認（Riveのインポータは `id` をレイヤー名に使う）
- [ ] ぼかし表現をRiveの Feather で再設定（頬 / Body_Shadow / Body_Highlight / Core_Highlight / Arm・Foot_Shadow）
- [ ] `Core_Glow` の放射グラデーションを Rive のグラデーションで再作成（既定 opacity 0）

## 3. リグ（Riveエディタでの作業）

- [ ] ボーン: root → body → head / antenna(3節) / arm_L / arm_R / foot_L / foot_R
- [ ] 目: `Pupil_*`・`EyeHighlight_*` を `EyeWhite_*` の範囲内で移動可能に（attention追従用）
- [ ] まばたき: `Eyelid_*` を表示してscaleY降下 or パスモーフ
- [ ] 口: `Mouth_Neutral / Smile / Thinking / Open` の排他表示切替
- [ ] アンテナ: Base/Mid/Tip の遅延追従（ハートは最後に揺れる）。可能ならメッシュ＋ボーンで一本化し、SVGの分割継ぎ目を解消
- [ ] スクワッシュ＆ストレッチは `Body_Backfill` 込みで全体に掛ける（隙間防止）

## 4. ステートマシン

- [ ] ステートマシン名を **`MochitStateMachine`** にする（アプリ側定数 `MOCHIT_RIVE_STATE_MACHINE` と一致必須）
- [ ] 入力を以下の名前で定義（アプリ側 `components/mochit/mochitTypes.ts` の `MOCHIT_RIVE_INPUTS` と一致必須）

Boolean:
`isActive` / `isVisible` / `isFocused` / `isAnswering` / `isSleepy` / `reducedMotion` / `pointerEnabled` / `primaryInstance`

Number:
`mood`（-1〜1想定） / `energy`（0〜1） / `growthStage`（1〜3） / `attentionX`（0〜1） / `attentionY`（0〜1） / `screenContext`（アプリ側 `MOCHIT_SCREEN_CONTEXT` の整数コード）

Trigger:
`triggerTap` / `triggerCorrect` / `triggerIncorrect` / `triggerAllCorrect` / `triggerEncourage` / `triggerTaskComplete` / `triggerBadgeEarned` / `triggerCheckpointClear` / `triggerWakeUp`

- [ ] `reducedMotion=true` のとき: 呼吸・体の揺れ・バウンス・スクワッシュ・ポインタ追従を全停止し、静的な表情/ポーズ差分のみで反応（既存CSS実装のreduced-motionポリシーと同等）
- [ ] `primaryInstance=false`（コンパクト表示）のとき: 呼吸などの常時アニメを減らした軽量プロファイル
- [ ] トリガー反応の優先度はアプリ側で制御される（checkpoint > badge > task > allCorrect > answer > encourage > tap）。Rive側は各トリガーが割込み可能な短いワンショットとして作る

## 5. 書き出しと配置

- [ ] `mochit.riv` としてエクスポート
- [ ] `public/characters/mochit/mochit.riv` に配置（**このパスに置くだけでアプリがRive描画へ切替わる**。`components/mochit/MochitRive.tsx` の `MOCHIT_RIVE_SRC`）
- [ ] 既存WebP（normal/happy/thinking/cheering.webp）は**削除しない**（フォールバックとして必要）

## 6. 検証

- [ ] `/dev/mochit`（開発専用プレビュー）で全状態・全サイズ・成長段階・イベントボタン・reduced-motion・フォールバック強制を確認
- [ ] 静止状態（isActiveのみtrue）の見た目がマスター/normal.webpと一致
- [ ] 入力が1つ欠けていてもアプリがクラッシュしない（アプリ側は欠落入力を警告ログのみで許容する設計だが、Rive側も全入力を揃えるのが原則）
- [ ] 低スペック端末でのCPU使用率確認（複数インスタンス画面: /today）
- [ ] `npm run test && npm run build` が通ること
