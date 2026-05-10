#!/usr/bin/env bash
# Geofabrik から日本リージョンの最新 OSM PBF を取得する
# - 配置: ./data/japan-latest.osm.pbf
# - 容量目安: 1.5〜2 GB

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/data"
TARGET="${DATA_DIR}/japan-latest.osm.pbf"
URL="https://download.geofabrik.de/asia/japan-latest.osm.pbf"

mkdir -p "${DATA_DIR}"

echo "[osm:download] target = ${TARGET}"
echo "[osm:download] source = ${URL}"

# レジューム対応 + 進捗表示
curl -L --fail --retry 3 -C - -o "${TARGET}.tmp" "${URL}"
mv "${TARGET}.tmp" "${TARGET}"

echo "[osm:download] done. size:"
ls -lh "${TARGET}"
