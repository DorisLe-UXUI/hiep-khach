#!/usr/bin/env bash
# Đăng bản dev lên GitHub Pages ở thư mục con /dev/ của nhánh gh-pages.
# Chỉ đụng tới dev/ — trang chính (gốc gh-pages) giữ nguyên.
# Chạy: npm run deploy:dev   →  https://dorisle-uxui.github.io/hiep-khach/dev/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SHA=$(git rev-parse --short HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ -n "$(git status --porcelain --untracked-files=no)" ] && echo "Cảnh báo: còn thay đổi chưa commit, bản dev sẽ gồm cả chúng (ghi là $SHA)."

node tools/build_pages.mjs --dev

# dist-pages/ = worktree của nhánh gh-pages
git fetch origin gh-pages
if [ ! -e dist-pages/.git ]; then
  rm -rf dist-pages
  git worktree add dist-pages gh-pages 2>/dev/null || git worktree add -B gh-pages dist-pages origin/gh-pages
fi
git -C dist-pages checkout -q gh-pages
git -C dist-pages merge -q --ff-only origin/gh-pages

rsync -a --delete --exclude .git --exclude .nojekyll dist-pages-dev/ dist-pages/dev/

cd dist-pages
git add -A dev
if git diff --cached --quiet; then echo "Bản dev không đổi."; exit 0; fi
# chặn mọi thay đổi ngoài dev/
if git diff --cached --name-only | grep -qv '^dev/'; then echo "Lỗi: có thay đổi ngoài dev/, dừng." >&2; exit 1; fi
git commit -q -m "deploy dev: $BRANCH@$SHA"
git push origin gh-pages
echo "Đã đăng: https://dorisle-uxui.github.io/hiep-khach/dev/"
