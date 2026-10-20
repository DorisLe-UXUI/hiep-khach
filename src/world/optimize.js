import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Gộp các mesh tĩnh cùng vật liệu thành một mesh duy nhất (giảm hàng nghìn lệnh vẽ còn vài chục).
 * Bỏ qua InstancedMesh, SkinnedMesh, mesh nhiều vật liệu và vật trong suốt.
 */
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  const remove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || o.userData.keep) return;
    if (o.material.transparent) return;
    let g = o.geometry;
    if (!g.attributes.uv || !g.attributes.normal) return;
    g = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(o.matrixWorld);
    const key = o.material.uuid + (o.castShadow ? 's' : '');
    if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, list: [] });
    groups.get(key).list.push(g);
    remove.push(o);
  });
  for (const o of remove) o.removeFromParent();
  const out = new THREE.Group();
  out.name = root.name + '-merged';
  for (const { mat, cast, list } of groups.values()) {
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = cast;
    m.receiveShadow = true;
    out.add(m);
  }
  root.add(out);
  // khử ma trận của các group rỗng còn lại (đã gộp toạ độ thế giới vào hình học)
  out.matrixAutoUpdate = false;
  out.matrix.copy(root.matrixWorld).invert();
  out.matrixWorldNeedsUpdate = true;
  return { meshes: remove.length, merged: groups.size };
}
