import * as THREE from 'three';

/** Camera sau lưng (mặc định) hoặc nhìn từ trên cao kiểu ARPG (phím V). */
export class CameraRig {
  constructor(camera, terrain, colliders) {
    this.camera = camera;
    this.terrain = terrain;
    this.colliders = colliders;
    this.yaw = Math.PI;      // nhìn về phía bắc (-z)
    this.pitch = 0.22;
    this.dist = 4.6;
    this.mode = 'third';
    this.target = new THREE.Vector3();
    this.shake = 0;
    this.pos = new THREE.Vector3();
    this.lockTarget = null;
    this.sens = 1;
    this.invertY = false;
    this.cinematic = null;
  }

  snap(focus) {
    this.target.copy(focus);
    const back = new THREE.Vector3(Math.sin(this.yaw), 0.4, Math.cos(this.yaw)).normalize();
    this.pos.copy(focus).add(new THREE.Vector3(0, 1.6, 0)).addScaledVector(back, this.dist);
  }

  /** Khung hình hội thoại: nhìn nghiêng qua vai người chơi về phía NPC. */
  frameDialog(a, b) {
    const mid = a.pos.clone().add(b.pos).multiplyScalar(0.5);
    const ab = new THREE.Vector3().subVectors(b.pos, a.pos).setY(0);
    const side = new THREE.Vector3(-ab.z, 0, ab.x).normalize();
    const look = mid.clone().setY(mid.y + 1.45);
    const pos = a.pos.clone().addScaledVector(ab.clone().normalize(), -1.3).addScaledVector(side, 1.1).setY(a.pos.y + 1.85);
    this.cinematic = { pos, look };
  }

  toggleMode() { this.mode = this.mode === 'third' ? 'top' : 'third'; }

  update(dt, focus, input) {
    if (this.cinematic) {
      this.pos.lerp(this.cinematic.pos, 1 - Math.exp(-dt * 4));
      this.camera.position.copy(this.pos);
      this.camera.lookAt(this.cinematic.look);
      return;
    }
    const sens = 0.0024 * (this.sens || 1);
    const dy = input.mouseDY * (this.invertY ? -1 : 1);
    if (this.mode === 'third') {
      this.yaw -= input.mouseDX * sens;
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * sens, -0.6, 1.2);
      this.dist = THREE.MathUtils.clamp(this.dist + input.wheel * 0.5, 2.2, 11);
    } else {
      this.yaw -= input.mouseDX * sens * 0.6;
      this.dist = THREE.MathUtils.clamp(this.dist + input.wheel * 1.5, 10, 30);
    }
    this.target.lerp(focus, 1 - Math.exp(-dt * 14));
    const pitch = this.mode === 'third' ? this.pitch : 0.95;
    const dist = this.mode === 'third' ? this.dist : Math.max(14, this.dist);
    const head = this.target.clone().add(new THREE.Vector3(0, this.mode === 'third' ? 1.55 : 1.0, 0));
    const back = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.yaw) * Math.cos(pitch));
    // lệch vai phải một chút cho dễ nhìn trước mặt
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const shoulder = this.mode === 'third' ? 0.45 : 0;
    let d = dist;
    // camera không xuyên tường/đất: rút ngắn khoảng cách khi bị chặn
    if (this.mode === 'third') {
      for (let k = 0.6; k <= dist; k += 0.3) {
        const p = head.clone().addScaledVector(back, k).addScaledVector(right, shoulder);
        if (p.y < this.terrain.heightAt(p.x, p.z) + 0.3 || this.colliders.blocked(head.x, head.z, p.x, p.z, p.y)) { d = Math.max(0.6, k - 0.3); break; }
      }
    }
    const desired = head.clone().addScaledVector(back, d).addScaledVector(right, shoulder);
    desired.y = Math.max(desired.y, this.terrain.heightAt(desired.x, desired.z) + 0.4);
    this.pos.lerp(desired, 1 - Math.exp(-dt * 20));
    this.camera.position.copy(this.pos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3);
      const s = this.shake * this.shake * 0.25;
      this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
    }
    this.camera.lookAt(head.clone().addScaledVector(right, shoulder));
  }

  /** Hướng "phía trước" trên mặt đất theo camera. */
  forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  right() { return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }
}
