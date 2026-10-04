# LPストーリー動画

90秒 / 1920×1080 / 24fps / H.264 + AAC。LPのヒーロー直下に掲載。
機能を列挙せず「理解した自信がない」「次が決まらない」から、理解する→測る→次を決める、へつなぐ。

## 配信ファイル

- `public/lp/story/it-learning-story.mp4`
- `public/lp/story/poster.webp`
- `public/lp/story/captions.ja.vtt`

字幕は映像に焼き込み済み。VTTはネイティブプレーヤーでも選択可能。
自動再生なし、`preload="none"`、モバイルはインライン再生。
`/lp/`配下なので未ログインでも動画・字幕を取得できる。

## 素材と表現

- `assets/student.png`: この動画のためにimagegenで生成した架空の学習者。実在の利用者・体験談ではない。
- `assets/mochit.webp`: 既存の `public/characters/mochit/happy.webp`。
- Today / Progress / パケット教材 / 確認問題: `origin/main` d6c37dd の実ページをローカル起動し、撮影用データで収録。個人の学習履歴を使用していない。
- 合格準備度68→76は説明用の変化イメージ。計算された実績や改善保証ではない。映像中に明記。
- BGM: `audio.py`で合成したオリジナルのアンビエント曲。外部音源なし。
- 音声: **VOICEVOX：春日部つむぎ（ノーマル）**。動画終端とLPにクレジット表記。
  [音声ライブラリ規約](https://tsumugi-official.studio.site/rule)。音声の再利用時もクレジットと規約を引き継ぐ。
- フォント: macOSのHiragino Sans。画像としてレンダリング。フォントファイルは配布しない。

## 再制作

`story.json` がタイムコード付き台本。`film.html` が決定的なCanvasアニメーション。
`render.mjs` はPlaywrightでフレームを描き、FFmpegでMP4に書き出す。
アプリ本体にランタイム依存は追加していない。

```sh
# リポジトリルート、npm ci済み。FFmpegとChromiumが必要。
# 音声を変更しない再レンダーでは保存したFLACから戻す。
ffmpeg -y -i tools/lp-video/assets/soundtrack.flac tools/lp-video/assets/soundtrack.wav
node tools/lp-video/render.mjs --preview
node tools/lp-video/render.mjs
```

音声を再生成する場合、Python環境に`voicevox-core==0.17.0`と`numpy`を用意し、
公式ダウンローダーでONNX Runtime・0.vvm・Open JTalk辞書を取得する。
`VOICEVOX_CORE_DIR`を取得先に設定して `python tools/lp-video/audio.py` を実行。
その後、音声をFLACに保存して再レンダーする。

実画面を撮り直す場合、最新mainの開発サーバーを3107番で起動し、
`capture.mjs`（Today/Progress）、`capture-lesson.mjs`（図解/問題）を実行。
実装変更に合わせて撮影位置と字幕も確認する。画面・音声・成果物のサンプル検査をしてから公開する。
