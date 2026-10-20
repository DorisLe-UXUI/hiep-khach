#!/bin/sh
# Đóng gói nhân vật Quaternius (CC0) -> public/assets/characters/*.glb
cd "$(dirname "$0")/.."
V=vendor_dl
O=public/assets/characters
mkdir -p $O
opt() { [ -f "$2" ] || npx gltf-transform optimize "$1" "$2" --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --join false --flatten false --instance false 2>&1 | grep -i error; echo "  $2"; }
OUT="$V/quaternius_outfits/x/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Outfits"
for n in Male_Ranger Male_Peasant Female_Ranger Female_Peasant; do opt "$OUT/$n.gltf" $O/outfit_$(echo $n | tr A-Z a-z).glb; done
BASE="$V/quaternius_ubc/x/Universal Base Characters[Standard]/Base Characters/Godot - UE"
opt "$BASE/Superhero_Male_FullBody.gltf" $O/base_male.glb
opt "$BASE/Superhero_Female_FullBody.gltf" $O/base_female.glb
HAIR="$V/quaternius_ubc/x/Universal Base Characters[Standard]/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)"
for n in Hair_Buns Hair_Long Hair_Beard Hair_SimpleParted Eyebrows_Regular Eyebrows_Female; do opt "$HAIR/$n.gltf" $O/$(echo $n | tr A-Z a-z).glb; done
# Animation: bản không root-motion, giữ nguyên keyframe
for f in "$V"/quaternius_ual1/x/*/Unreal-Godot/UAL1_Standard.glb "$V"/quaternius_ual2/x/*/Unreal-Godot/UAL2_Standard.glb; do
  o=$O/anim_$(basename "$f" _Standard.glb | tr A-Z a-z).glb
  [ -f "$o" ] || npx gltf-transform optimize "$f" "$o" --compress meshopt --texture-compress webp --texture-size 256 --simplify false --join false --flatten false --instance false --resample false 2>&1 | grep -i error; echo "  $o"
done
mkdir -p public/assets/licenses
cp "$V/quaternius_ual2/x/Universal Animation Library 2[Standard]/License.txt" public/assets/licenses/quaternius_CC0.txt
du -sh $O/*
