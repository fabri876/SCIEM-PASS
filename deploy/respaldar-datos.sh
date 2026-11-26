#!/bin/sh
set -e

OUT_DIR=$1
if [ -z "$OUT_DIR" ]; then
  echo "Uso: sh deploy/respaldar-datos.sh backups/corte-final"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: No se encontró el archivo .env en la raíz del proyecto ($ENV_FILE)"
  exit 1
fi

eval "$(tr -d '\r' < "$ENV_FILE" | grep -v '^#' | grep -v '^$')"

mkdir -p "$OUT_DIR"

echo "Respaldando base de datos..."
MSYS_NO_PATHCONV=1 docker exec sciem-db pg_dump \
  --username="$DB_ADMIN_USER" \
  --dbname="$DB_NAME" \
  --schema=public \
  --format=custom > "$OUT_DIR/sciem-public.dump"

echo "Respaldando imágenes de evidencia..."
MSYS_NO_PATHCONV=1 docker exec sciem-backend tar -czf - -C /app/evidencias . > "$OUT_DIR/evidencias.tar.gz"

echo "Respaldo completado en $OUT_DIR"