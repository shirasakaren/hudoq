#!/usr/bin/env bash
# Web-encodes the source clips in media/ into public/video/ (muted, faststart H.264 + poster).
set -euo pipefail
M=media; O=public/video; mkdir -p $O
enc() { # in out vf crf [extra input args...]
  local in="$1" out="$2" vf="$3" crf="$4"; shift 4
  ffmpeg -v error -y "$@" -i "$in" -an -vf "$vf" -c:v libx264 -preset slow -crf "$crf" -pix_fmt yuv420p -movflags +faststart "$O/$out.mp4"
  ffmpeg -v error -y -ss 1 -i "$O/$out.mp4" -frames:v 1 -vf "scale=960:-2" -q:v 4 "$O/$out.jpg"
}
enc "$M/video/bnw-clip/hudoq_clip.mp4"            archive-1948 "crop=480:360:80:0,eq=contrast=1.08" 30   # source has baked-in side bars
enc "$M/video/1933/video.mov"                      archive-1933 "scale=854:-2" 32
enc "$M/modern/Ester Veronika/video.mp4"           reel-ester   "scale=540:-2" 28 -ss 0
enc "$M/modern/Miss Supranational 2018/stage.mov"  stage-2018   "scale=960:-2" 27

# Documentary b-roll (TVRI World, "The Heritage"): cut clean shots (no subtitles), zoom 12% toward the bottom-right to drop the corner logo.
SRC=${DOC_SRC:-$M/video/current-era/video.mkv}
doc() { # name start dur
  enc "$SRC" "doc-$1" "scale=1434:806,crop=1280:720:154:86,scale=1280:-2" 28 -ss "$2" -t "$3"
}
doc river    18 10
doc parade   33 12
doc aerial   107 7
doc masks    166 10
doc drone    237 7
doc night    264 12
