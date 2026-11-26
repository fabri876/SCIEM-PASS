#!/bin/sh
set -e

TAR_FILE=$1
if [ -z "$TAR_FILE" ]; then
  echo "Uso: sh deploy/restaurar-evidencias.sh backups/evidencias.tar.gz"
  exit 1
fi

echo "Restaurando imágenes de evidencia desde $TAR_FILE..."
MSYS_NO_PATHCONV=1 docker exec -i sciem-backend tar -xzf - -C /app/evidencias < "$TAR_FILE"

echo "Evidencias restauradas correctamente."