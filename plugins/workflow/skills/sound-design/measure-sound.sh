#!/usr/bin/env bash
# Prints what a sound measures, so it can be judged without being heard.
# Usage: bash measure-sound.sh <file> [more files]
set -euo pipefail

SILENCE_FLOOR_DB=-50
SILENCE_MIN_SECONDS=0.002
BANDS=("sub 20 60" "bass 60 250" "mid 250 2000" "presence 2000 6000" "air 6000 20000")

measure_silence() {
  ffmpeg -nostats -hide_banner -i "$1" -af "silencedetect=noise=${SILENCE_FLOOR_DB}dB:d=${SILENCE_MIN_SECONDS}" -f null - 2>&1 |
    awk -v duration="$2" '
      /silence_start/ { start = $NF + 0; if (!seen_start++) first_start = start }
      /silence_end/ { for (i = 1; i <= NF; i++) if ($i == "silence_end:") end = $(i + 1) + 0
        if (first_start < 0.0005 && !lead_done++) lead = end
        tail = (end >= duration - 0.002) ? start : duration }
      END { printf "lead silence  %.1f ms\nsound ends    %.2f s\n", lead * 1000, (seen_start ? tail : duration) }'
}

measure_loudness() {
  ffmpeg -nostats -hide_banner -i "$1" -filter_complex "ebur128=peak=true:framelog=quiet" -f null - 2>&1 |
    awk '/^ +I:/ { print "loudness      " $2, $3 } /^ +LRA:/ { print "range         " $2, $3 } /^ +Peak:/ { print "true peak     " $2, $3 }'
}

measure_bands() {
  local name low high
  for band in "${BANDS[@]}"; do
    read -r name low high <<<"$band"
    ffmpeg -nostats -hide_banner -i "$1" -af "highpass=f=$low,highpass=f=$low,lowpass=f=$high,lowpass=f=$high,volumedetect" -f null - 2>&1 |
      awk -v name="$name" '/mean_volume/ { printf "band %-8s %s dB\n", name, $5 }'
  done
}

measure_edges() {
  local samples
  samples=$(mktemp)
  ffmpeg -v error -y -i "$1" -ac 1 -f f32le "$samples"
  local first last
  first=$(head -c 4 "$samples" | od -An -f | tr -d ' ')
  last=$(tail -c 4 "$samples" | od -An -f | tr -d ' ')
  rm -f "$samples"
  echo "first sample  $first"
  echo "last sample   $last"
}

for input in "$@"; do
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$input")
  format=$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate,channels -of csv=p=0 "$input")
  echo "== $input"
  echo "format        ${duration} s, ${format/,/ Hz, } channels"
  measure_silence "$input" "$duration"
  measure_loudness "$input"
  measure_bands "$input"
  measure_edges "$input"
done
