#!/bin/sh
# Remotion の書き出し（out/lp-story.mp4）を Web 配信用に仕上げ、LP の配信フォルダへ置く。
#   速度：DELIVERY_SPEED（src/timelineCore.ts）倍に速める（映像は 30fps のまま、音声は atempo で音程を保つ）
#   音量：-16 LUFS／-1.5 dBTP に 2 パスで正規化（1 パス目で測り、2 パス目で直線的に合わせる）
#   映像：H.264 High・crf 23・faststart（再生開始を速く）
#   字幕：同じタイムラインから WebVTT、ポスター：問いかけの場面の静止画
set -e
cd "$(dirname "$0")/.."
DEST=../../public/lp/story
NAME=story-v5
SPEED=$(node --input-type=module -e "import { DELIVERY_SPEED } from './src/timelineCore.ts'; console.log(DELIVERY_SPEED);")
mkdir -p "$DEST" out

M=$(ffmpeg -hide_banner -nostats -i out/lp-story.mp4 -af atempo=$SPEED,loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$M" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
AF="atempo=$SPEED,loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000"

ffmpeg -loglevel error -y -i out/lp-story.mp4 \
  -vf "setpts=PTS/$SPEED" -r 30 \
  -c:v libx264 -preset slow -crf 23 -profile:v high -pix_fmt yuv420p -movflags +faststart \
  -af "$AF" -c:a aac -b:a 160k -ar 48000 \
  "$DEST/$NAME.mp4"

node scripts/vtt.mjs "$DEST/$NAME.ja.vtt"

FRAME=$(node scripts/poster-frame.mjs)
npx remotion still src/index.ts LpStory out/poster.png --frame="$FRAME" --log error
# この ffmpeg には libwebp が無いことがあるので、リポジトリ本体の依存にある sharp で変換する
node --input-type=module -e "import sharp from 'sharp'; await sharp('out/poster.png').resize(1600, 900).webp({ quality: 82 }).toFile('$DEST/$NAME-poster.webp');"
ls -la "$DEST"
