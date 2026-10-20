#!/bin/sh
# Tối ưu model Poly Haven (vendor_dl/polyhaven/models) -> public/assets/models/<tên>.glb
# Cây/thực vật nặng thì giảm polygon mạnh hơn. Chạy lại an toàn: có rồi thì bỏ qua.
cd "$(dirname "$0")/.."
mkdir -p public/assets/models
for g in vendor_dl/polyhaven/models/*/*.gltf; do
  name=$(basename "$g" .gltf)
  out=public/assets/models/$name.glb
  [ -f "$out" ] && continue
  size=$(du -sm "$(dirname "$g")" | cut -f1)
  ratio=1; err=0.0005
  if [ "$size" -gt 60 ]; then ratio=0.05; err=0.01
  elif [ "$size" -gt 15 ]; then ratio=0.2; err=0.005
  fi
  echo "$name (${size}MB, simplify $ratio)"
  npx gltf-transform optimize "$g" "$out" --compress meshopt --texture-compress webp \
    --texture-size 1024 --simplify-ratio $ratio --simplify-error $err 2>&1 | grep -iE "error" 
done
du -sh public/assets/models
