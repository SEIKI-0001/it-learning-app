# LP紹介動画（/lp）

`/lp` のヒーロー直下で再生する紹介動画（約75秒・1920×1080・30fps）を、コードから作り直せるようにした Remotion プロジェクト。
アプリ本体のビルド・lint・typecheck の対象外（独自の package.json。構成は `video/tutorial/` と同じ）。

## 伝えること

機能を並べず、悩み → 解決の順で「使ってみたい」と思ってもらう。

1. つかみ：参考書を読んだ・過去問も解いた。でも本当に理解できている？
2. つまずき1「分からない」：文字だけでは仕組みが浮かばず、丸暗記になりがち
3. つまずき2「迷う」：復習か、過去問か、このペースで間に合うのか
4. 転換：ITパスポート学習コーチが、2つをまとめて解決（夜の場面 → LP と同じ白い紙面へ）
5. STEP 1 理解する（動く図解）／ STEP 2 測る（確認問題）／ STEP 3 次を決める（合格準備度 → 今日やること）
6. 理解する・測る・次を決める のサイクルを合格の日まで
7. 教材と公式過去問は無料・URL

## 作りの方針

- **サービス名は「ITパスポート学習コーチ」**（LP の siteName と同じ）。リポジトリ名の it-learning-app は出さない。
- **見た目は LP と地続き**：白地・明朝の見出し・藍の強調・朱の手書き線（LP ヒーローの赤丸と同じ表現）。色と書体は `src/theme.ts`（`app/lp/lp.css` の値）。
- **スマホで見ても読める**大きさにする。見出しは 84px 以上、注記でも 24px 以上（LP では幅 360px 前後で再生される）。
- **字幕は焼き込まない**。各場面の大きな見出しが語りの要点を担い、字幕は `<track>` の WebVTT で出し分ける（焼き込みと VTT の二重表示を避ける）。
- **尺は語りに合わせる**。音声を伸び縮みさせて尺に押し込まない。シーンの長さは `src/voice-manifest.json` の秒数から決まり（`src/timelineCore.ts`）、文字や強調は語の区切り（onsets）に合わせて出る。
- 実画面は撮影用の学習データで撮る（個人の学習履歴は使わない）。画面の場面には「撮影用の学習データ」と注記する。合格準備度の数値を動かすなど、効果を約束する演出はしない。

## 構成

| パス | 中身 |
|---|---|
| `voice/script.json` | ナレーション台本（行ごとの話速・抑揚、シーンが使う語の区切りの数 `needOnsets`） |
| `public/voice/*.wav` | VOICEVOX で生成済みの音声（-20 LUFS にそろえ済み。エンジンが無くても再レンダーできるようコミット） |
| `src/voice-manifest.json` | 各行の秒数と語の区切り（秒）。シーンの尺と文字の出るタイミングはここから決まる |
| `src/scenes/*.tsx` | 9場面（Hook / Term / Lost / Pivot / Steps(Learn・Measure・Next) / Cycle / Cta） |
| `src/LpStory.tsx` | 場面転換・ナレーション・BGM の自動ダッキング・効果音 |
| `public/shots/` | 実画面（`scripts/capture.mjs` でスマホ幅 3 倍密度／図解は PC 幅 2 倍密度） |
| `public/photo/student.png` | 冒頭の学習者の写真。画像生成で作った架空の人物（実在の利用者・体験談ではない） |
| `scripts/synth-audio.mjs` | BGM と効果音をコードで合成（外部素材なし）。曲の切り替わりはタイムラインから計算 |
| `scripts/finalize.sh` | 配信用に仕上げて `public/lp/story/` へ（-16 LUFS／-1.5 dBTP の 2 パス正規化・H.264・faststart、字幕 VTT、ポスター） |

## 作り直す

```sh
cd video/lp-story
npm ci
npm run studio          # プレビュー（ブラウザで編集しながら確認）
npm run render          # public/lp/story/story-v2.{mp4,ja.vtt} と story-v2-poster.webp を出力
```

`finalize.sh` のポスター変換はリポジトリ本体の `sharp` を使うので、ルートでも `npm ci` 済みであること。
字幕・BGM 生成は Node の TypeScript 実行を使うので Node 23.6 以上が必要。
ファイル名の `v2` は再訪ユーザーのブラウザキャッシュを避けるため、中身を変えたら上げる（`app/lp/page.tsx` も合わせる）。

### ナレーションを変えるとき

VOICEVOX エンジンを `http://127.0.0.1:50021` で起動してから（macOS 版は GitHub の VOICEVOX/voicevox_engine リリースの `.vvpp` を unzip して `./run`）:

```sh
npm run voice
```

話者は春日部つむぎ（ノーマル）。VOICEVOX の利用規約により、動画の最後と LP の動画下に
「VOICEVOX:春日部つむぎ」のクレジットを表記している。話者を変えたら両方を直す。
台本の読点を減らすと語の区切りが取れなくなり、`needOnsets` のチェックで止まる（演出のずれを防ぐため）。

### 実画面を撮り直すとき

最新 main の開発サーバーを 3107 番で起動して `npm run capture`。画面の配置が変わったら、
`src/scenes/Steps.tsx` の座標（選択肢・合格準備度・今日の見出しの位置）も合わせる。
