#!/usr/bin/env bash
# Usage: ./build.sh stage4 stage4-slides ...  → build/<name>.pdf (XeLaTeX, 2 проходи)
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p build
for name in "$@"; do
  for pass in 1 2; do
    if ! xelatex -interaction=nonstopmode -halt-on-error -output-directory=build "$name.tex" > "build/$name.stdout" 2>&1; then
      echo "✗ $name (pass $pass)"; grep -A8 '^!' "build/$name.log" || tail -30 "build/$name.stdout"; exit 1
    fi
  done
  todos=$(pdftotext "build/$name.pdf" - 2>/dev/null | grep -c 'TODO' || true)
  echo "✓ build/$name.pdf  (TODO у тексті: ${todos:-?})"
done
