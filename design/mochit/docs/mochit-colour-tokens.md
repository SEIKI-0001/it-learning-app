# モチット カラートークン

マスター `public/characters/mochit/master.png` から、キャラクター領域の色クラスタ平均をプログラムで抽出した値。SVG再構成・Riveエディタでの塗り設定はこの表を唯一の基準とする。

## 基本トークン

| トークン | 値 | 用途 | 抽出根拠 |
| --- | --- | --- | --- |
| `mochit/ink` | `#021C48` | 輪郭線・瞳・口・コア枠線 | 紺クラスタ平均（n≈26k px） |
| `mochit/body` | `#FDF9F3` | 体・腕・足・アンテナ茎の塗り | クリームクラスタ平均（n≈374k px） |
| `mochit/white` | `#FFFFFF` | グロス・キャッチライト・コアバー・白目 | 最明部サンプル |
| `mochit/frame` | `#F8F8F5` | コアの白フレーム帯 | フレーム帯サンプル（#F7F8F6近傍） |
| `mochit/core-cyan` | `#6DEEFE` | コア内部の塗り | シアンクラスタ平均（n≈13k px） |
| `mochit/core-cyan-light` | `#CFFAFE` | コア内部左上のハイライトブロブ | 実測（#CBFAFE〜#D3F9FE） |
| `mochit/mint` | `#8CF1D9` | アンテナ先端のハート | ミントクラスタ平均（n≈4.7k px） |
| `mochit/mint-light` | `#A9FAE4` | ハートのハイライト | 実測（ハート左上エッジ） |
| `mochit/circuit` | `#52D1BC` | 回路トレース・ノード | 回路線クラスタ平均（n≈1.3k px） |
| `mochit/cheek` | `#F8D8D6` → 透明 | 頬（放射グラデーション。中間 #F9DBD9） | 中心の最飽和画素 #F9DADA を実測 |
| `mochit/shadow` | `#D9E4E6` | 体・腕・足のソフトシャドウ | 冷色影クラスタ平均（n≈18k px） |
| `mochit/tongue` | `#F8B4C0` | Mouth_Open の舌（新規パーツ） | **マスターに存在しない近似値**。happy/cheering.webp の口内色を参考 |

## 既存UIとの関係

- アプリの成長段階グロー（`app/globals.css` の `.mochit-growth-2/3`）は Tailwind cyan-400 `rgba(34,211,238,…)` を使用している。Rive側の `Core_Glow` は `mochit/core-cyan` (#6DEEFE) ベースであり、厳密には別トークン。Rive移行完了時にどちらかへ寄せる判断が必要（推奨: キャラクター内演出は `core-cyan`、UI側リングは現状維持）。
- 線幅の基準（1254px座標系）: 本体輪郭 11 / コア外枠 9 / コア内エッジ 7 / 回路 10 / 口 13 / アンテナ茎エッジ 10。
- コア内部の濃色リムは v4 での誤認だった（マスターのシアンは均一 #6DEEFE ＋左上ブロブのみ）。v5 で削除済み。

## 禁止事項（デザイン仕様の再掲）

3D風表現・厚塗り・過剰な発光・複雑な装飾・文字・床・接地影・吹き出し・背景エフェクト・別画風は不可（`docs/superpowers/specs/2026-07-12-mochit-design.md`）。
