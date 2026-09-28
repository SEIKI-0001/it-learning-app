#!/bin/sh
# Remotion の書き出し（out/tutorial.mp4）を Web 配信用に仕上げる。
#   音量：-16 LUFS／ピーク -1.5 dBTP に正規化（語り・BGM・効果音の重なりで割れないように）
#   映像：H.264 crf 27・faststart（再生開始を速く）
set -e
cd "$(dirname "$0")/.."
ffmpeg -loglevel error -y -i out/tutorial.mp4 \
  -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.7:level=false" -c:a aac -b:a 160k -ar 48000 \
  out/tutorial-web.mp4
node scripts/vtt.mjs out/tutorial-web.vtt
