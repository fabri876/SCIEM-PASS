#!/bin/sh
set -e

DUMP_FILE=$1
if [ -z "$DUMP_FILE" ]; then
  echo "Uso: sh deploy/restaurar-bd.sh backups/sciem-public.dump"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: No se encontró el archivo .env en la raíz del proyecto ($ENV_FILE)"
  exit 1
fi

eval "$(tr -d '\r' < "$ENV_FILE" | grep -v '^#' | grep -v '^$')"

echo "Preparando esquemas y extensiones en la base de datos..."
docker exec -i sciem-db psql --username="$DB_ADMIN_USER" --dbname="$DB_NAME" -c "
  DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO $DB_ADMIN_USER;
  GRANT ALL ON SCHEMA public TO public;
  CREATE SCHEMA IF NOT EXISTS extensions;
  CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
  GRANT USAGE ON SCHEMA extensions TO PUBLIC;
"

echo "Restaurando base de datos desde $DUMP_FILE..."
docker exec -i sciem-db pg_restore \
  --username="$DB_ADMIN_USER" \
  --dbname="$DB_NAME" \
  --no-owner \
  --no-privileges \
  --role="$DB_ADMIN_USER" < "$DUMP_FILE"

echo "Base de datos restaurada correctamente."