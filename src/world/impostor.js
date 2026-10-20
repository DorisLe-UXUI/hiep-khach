import * as THREE from 'three';

/**
 * Impostor: chụp model cây thật từ VIEWS góc quanh trục Y vào atlas (màu + pháp tuyến),
 * rồi vẽ hàng nghìn cây bằng billboard xoay theo camera. Có nhận/đổ bóng và sương mù.
 */
const VIEWS = 8;

/** Tải atlas đã bake sẵn (tools/bake.html) từ public/assets/impostors. */
export async function loadImpostor(name) {
  const base = `/assets/impostors/${name}`;
  const [meta, color, normal] = await Promise.all([
    fetch(base + '.json').then((r) => r.json()),
    new THREE.TextureLoader().loadAsync(base + '_color.png'),
    new THREE.TextureLoader().loadAsync(base + '_normal.png'),
  ]);
  color.colorSpace = THREE.SRGBColorSpace;
  for (const t of [color, normal]) { t.anisotropy = 4; t.minFilter = THREE.LinearMipmapLinearFilter; }
  return { color, normal, width: meta.width, height: meta.height };
}

export function bakeImpostor(renderer, object, size = 384) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const ext = box.getSize(new THREE.Vector3());
  const halfW = Math.max(ext.x, ext.z) * 0.5 * 1.05;
  const H = ext.y * 1.02;
  const aspect = H / (halfW * 2);
  const tileW = size, tileH = Math.min(1024, Math.round(size * aspect));

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x4a4030, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  scene.add(key, key.target);
  const holder = new THREE.Group();
  holder.add(object);
  object.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
  scene.add(holder);

  const cam = new THREE.OrthographicCamera(-halfW, halfW, H, 0, 0.1, halfW * 8);
  const opts = { type: THREE.UnsignedByteType, colorSpace: THREE.NoColorSpace };
  const color = new THREE.WebGLRenderTarget(tileW * VIEWS, tileH, opts);
  const normal = new THREE.WebGLRenderTarget(tileW * VIEWS, tileH, opts);
  const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });

  const prev = { target: renderer.getRenderTarget(), clear: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), tone: renderer.toneMapping, scissor: renderer.getScissorTest() };
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  const pass = (rt, override) => {
    scene.overrideMaterial = override;
    rt.scissorTest = false;
    rt.viewport.set(0, 0, rt.width, rt.height);
    renderer.setRenderTarget(rt);
    renderer.clear();
    rt.scissorTest = true; // cờ của RT: chỉ xoá/vẽ trong ô hiện tại
    for (let i = 0; i < VIEWS; i++) {
      const a = (i / VIEWS) * Math.PI * 2;
      cam.position.set(Math.sin(a) * halfW * 4, 0, Math.cos(a) * halfW * 4);
      cam.lookAt(0, 0, 0);
      cam.updateMatrixWorld();
      key.position.copy(cam.position).add(new THREE.Vector3(0, halfW * 4, 0));
      rt.viewport.set(i * tileW, 0, tileW, tileH);
      rt.scissor.set(i * tileW, 0, tileW, tileH);
      renderer.setRenderTarget(rt); // three đọc viewport/scissor của RT tại đây
      renderer.render(scene, cam);
    }
  };
  // Bake với cây ở "không gian tối" để màu nền trong suốt không lẫn vào lá
  pass(color, null);
  pass(normal, normalMat);
  scene.overrideMaterial = null;
  renderer.setRenderTarget(prev.target);
  renderer.setClearColor(prev.clear, prev.alpha);
  renderer.toneMapping = prev.tone;
  renderer.setScissorTest(prev.scissor);
  for (const rt of [color, normal]) {
    rt.texture.generateMipmaps = true;
    rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
  }
  return { color: color.texture, normal: normal.texture, width: halfW * 2, height: H, rt: color, rtN: normal };
}

const VERT_DECL = /* glsl */ `
attribute vec4 aInst; // x, y, z, scale
attribute float aYaw;
uniform float uViews; uniform float uW; uniform float uH;
varying vec2 vAtlasUv;
varying vec3 vRightW; varying vec3 vTowardW;
`;

const VERT_MAIN = /* glsl */ `
  vec3 basePos = aInst.xyz;
  vec3 to = cameraPosition - basePos; to.y = 0.0;
  float len = length(to);
  vec3 toward = len > 1e-4 ? to / len : vec3(0.0, 0.0, 1.0);
  vec3 right = normalize(cross(vec3(0.0,1.0,0.0), toward));
  // góc nhìn so với hướng của cây -> chọn ô trong atlas
  float ang = atan(toward.x, toward.z) - aYaw;
  float idx = mod(floor(ang / 6.2831853 * uViews + 0.5), uViews);
  float va = idx / uViews * 6.2831853 + aYaw;
  vRightW = vec3(cos(va), 0.0, -sin(va));
  vTowardW = vec3(sin(va), 0.0, cos(va));
  vAtlasUv = vec2((idx + uv.x) / uViews, uv.y);
  vec3 worldPos = basePos + (right * position.x * uW + vec3(0.0,1.0,0.0) * position.y * uH) * aInst.w;
`;

function patch(material, uniforms, isDepth) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_DECL)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_MAIN)
      .replace('#include <project_vertex>', 'vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);\ngl_Position = projectionMatrix * mvPosition;')
      .replace('#include <worldpos_vertex>', 'vec4 worldPosition = vec4(worldPos, 1.0);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vAtlasUv;\nvarying vec3 vRightW; varying vec3 vTowardW;\nuniform sampler2D uColor; uniform sampler2D uNormal;')
      .replace('#include <map_fragment>', `
  vec4 texel = texture2D(uColor, vAtlasUv);
  if (texel.a < 0.5) discard;
  diffuseColor.rgb *= texel.rgb / max(texel.a, 0.001);
`)
      .replace('#include <alphatest_fragment>', isDepth ? 'if (texture2D(uColor, vAtlasUv).a < 0.5) discard;' : '');
    if (!isDepth) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
  {
    vec3 nv = texture2D(uNormal, vAtlasUv).xyz * 2.0 - 1.0;
    vec3 nw = normalize(nv.x * vRightW + nv.y * vec3(0.0,1.0,0.0) + nv.z * vTowardW);
    nw = normalize(mix(nw, vec3(0.0,1.0,0.0), 0.25));
    normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
  }
`);
    }
  };
}

/**
 * Tạo InstancedMesh billboard cho một loại cây.
 * items: [{x, y, z, scale, yaw}]
 */
export function impostorForest(baked, items, tint = 0xffffff) {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(0, 0.5, 0);
  const inst = new Float32Array(items.length * 4), yaw = new Float32Array(items.length);
  items.forEach((it, i) => { inst.set([it.x, it.y, it.z, it.scale], i * 4); yaw[i] = it.yaw; });
  const ig = new THREE.InstancedBufferGeometry().copy(geo);
  ig.instanceCount = items.length;
  ig.setAttribute('aInst', new THREE.InstancedBufferAttribute(inst, 4));
  ig.setAttribute('aYaw', new THREE.InstancedBufferAttribute(yaw, 1));
  const uniforms = { uColor: { value: baked.color }, uNormal: { value: baked.normal }, uViews: { value: VIEWS }, uW: { value: baked.width }, uH: { value: baked.height } };
  const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  patch(mat, uniforms, false);
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  patch(depth, uniforms, true);
  const mesh = new THREE.Mesh(ig, mat);
  mesh.customDepthMaterial = depth;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.userData.baked = baked;
  return mesh;
}
