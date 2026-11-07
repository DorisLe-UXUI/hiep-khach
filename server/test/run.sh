#!/bin/sh
# Chạy mọi bài kiểm tra của máy chủ trực tuyến trên PostgreSQL thật:
#   - dựng một container postgres:17-alpine tạm trên một mạng docker riêng (--internal, không ra Internet),
#   - chạy node --test trong node:24-alpine cùng mạng, mật khẩu ngẫu nhiên truyền qua tệp (PGPASSWORD_FILE),
#   - dọn container, mạng và tệp mật khẩu khi xong (kể cả khi lỗi hoặc Ctrl+C).
# Dùng: server/test/run.sh [tham số thêm cho node --test, vd. test/import.test.mjs]
set -eu
cd "$(dirname "$0")/.."
SERVER_DIR=$(pwd)
TAG="hk-pgtest-$$-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"
NET="$TAG-net"
DB="$TAG-db"
RUNNER="$TAG-node"
SECRETS=$(mktemp -d)

cleanup() {
  docker rm -f "$RUNNER" "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$SECRETS"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# mật khẩu ngẫu nhiên chỉ cho lần chạy này; tệp đọc được bởi người dùng postgres (uid 70) trong container
od -An -N24 -tx1 /dev/urandom | tr -d ' \n' > "$SECRETS/pg_password"
chmod 755 "$SECRETS"; chmod 644 "$SECRETS/pg_password"

if [ ! -d node_modules/pg ] || [ ! -d node_modules/ws ]; then
  echo "run.sh: cài phụ thuộc (npm ci)"
  docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
    -v "$SERVER_DIR":/app -w /app node:24-alpine npm ci --no-audit --no-fund
fi

docker network create --internal "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" \
  -e POSTGRES_PASSWORD_FILE=/run/secrets/pg_password \
  -v "$SECRETS/pg_password":/run/secrets/pg_password:ro \
  --tmpfs /var/lib/postgresql/data \
  postgres:17-alpine >/dev/null

# chờ máy chủ thật (bản tạm lúc khởi tạo chỉ nghe socket unix, không nghe TCP)
i=0
until docker exec "$DB" pg_isready -q -h 127.0.0.1 -U postgres; do
  i=$((i + 1))
  if [ "$i" -gt 120 ]; then echo "run.sh: postgres không khởi động được" >&2; docker logs "$DB" >&2; exit 1; fi
  sleep 0.5
done

docker run --rm --name "$RUNNER" --network "$NET" --user "$(id -u):$(id -g)" \
  -e PGHOST="$DB" -e PGPORT=5432 -e PGUSER=postgres -e PGDATABASE=postgres \
  -e PGPASSWORD_FILE=/run/secrets/pg_password \
  -v "$SECRETS/pg_password":/run/secrets/pg_password:ro \
  -v "$SERVER_DIR":/app:ro -w /app \
  node:24-alpine node --test --test-concurrency=4 --test-timeout=120000 "$@"
