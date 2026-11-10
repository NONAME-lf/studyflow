#!/usr/bin/env sh
# docs/uml/*.puml → docs/uml/out/*.png (PlantUML in Docker, no local Java needed).
set -e
cd "$(dirname "$0")/.."
docker run --rm -v "$PWD/docs/uml:/data" plantuml/plantuml -tpng -charset UTF-8 -o /data/out "/data/*.puml"
echo "✓ docs/uml/out/*.png"
