# チュートリアル動画（/tutorial）

`/tutorial` で再生する紹介動画を、コードから作り直せるようにした Remotion プロジェクト。
アプリ本体のビルド・lint・typecheck の対象外（独自の package.json）。

## 方針

- 動画は「使ってみたい！」と思ってもらうためのもの。操作の細かい説明はしない（操作は実画面のガイドで覚えてもらう）。
- 映すのはアプリに実在する機能と数値だけ（XP は `lib/study.ts`、バッジは `lib/badges.ts`、成長段階は `lib/mochit.ts`、
  地図は `components/roadmap-map/mapConfig.ts` と同じもの）。仕様が変わったら動画も合わせる。
- モチットはアプリの SVG（`components/mochit/mochitSvgMarkup.ts`）をそのまま読み込み、フレーム単位で動かしている。

## 構成

| パス | 中身 |
|---|---|
| `voice/script.json` | ナレーション台本（話者・話速・抑揚を行ごとに調整できる） |
| `public/voice/*.wav` | VOICEVOX で生成済みの音声（エンジンがなくても再レンダーできるようコミット） |
| `src/voice-manifest.json` | 各行の秒数。シーンの尺はここから自動で決まる（`src/timelineCore.ts`） |
| `src/scenes/*.tsx` | 8シーン（フック→冒険マップ→Today→図解→確認問題→成長→合格準備度→呼びかけ） |
| `scripts/synth-audio.mjs` | BGM と効果音をコードで合成（外部素材なし） |
| `scripts/finalize.sh` | Web 配信用に再エンコード（-16 LUFS・ピーク制限・faststart）＋字幕 VTT 生成 |

## 作り直す

```sh
cd video/tutorial
npm ci
npm run studio          # プレビュー（ブラウザで編集しながら確認）
npm run render          # out/tutorial-web.mp4 と out/tutorial-web.vtt を出力
cp out/tutorial-web.mp4 ../../public/tutorial/first-study-guide-v3.mp4
cp out/tutorial-web.vtt ../../public/tutorial/first-study-guide-v3.vtt
```

ファイル名の `v3` は、再訪ユーザーのブラウザキャッシュを避けるため、中身を変えたら上げる（`app/tutorial/page.tsx` も合わせる）。
字幕生成（`scripts/vtt.mjs`）は Node の TypeScript 実行を使うので Node 23.6 以上が必要。

### ナレーションを変えるとき

VOICEVOX エンジンを `http://127.0.0.1:50021` で起動してから（macOS 版は GitHub の VOICEVOX/voicevox_engine リリースの `.vvpp` を展開して `./run`）:

```sh
npm run voice                                            # 台本どおり全行を生成
node scripts/voice.mjs --sample "白上虎太郎/わーい" --out /tmp/sample   # 声色の聴き比べ
```

話者は春日部つむぎ（ノーマル）。VOICEVOX の利用規約により、動画内と `/tutorial` ページに
「VOICEVOX:春日部つむぎ」のクレジットを表記している。話者を変えたら両方を直す。
