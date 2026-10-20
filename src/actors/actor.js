import * as THREE from 'three';
import { WATER_LEVEL } from '../world/layout.js';

const GRAVITY = 26;

/** Thân vật lý chung cho người chơi, địch, NPC: đứng trên đất/sàn, va chạm, xoay mặt. */
export class Actor {
  constructor(game, character, { radius = 0.38, hp = 100 } = {}) {
    this.game = game;
    this.char = character;
    this.root = character.root;
    this.pos = this.root.position;
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.radius = radius;
    this.hp = this.maxHp = hp;
    this.onGround = true;
    this.inWater = false;
    this.dead = false;
    this.gravityScale = 1;
    this.walkOnWater = false;
  }

  get alive() { return !this.dead; }

  placeAt(x, z, yaw = 0) {
    const y = this.groundAt(x, z, 1e4);
    this.pos.set(x, y, z);
    this.yaw = yaw;
    this.root.rotation.y = yaw;
  }

  groundAt(x, z, feetY) {
    const t = this.game.terrain.heightAt(x, z);
    const f = this.game.colliders.floorAt(x, z, feetY);
    return Math.max(t, f);
  }

  faceTowards(yaw, dt, speed = 12) {
    let d = yaw - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * speed);
    this.root.rotation.y = this.yaw;
  }

  forward() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }

  /** Tích phân vị trí + trọng lực + va chạm. */
  physics(dt) {
    this.vel.y -= GRAVITY * this.gravityScale * dt;
    const next = this.pos.clone().addScaledVector(this.vel, dt);
    this.game.colliders.resolve(next, this.radius, next.y + 0.3);
    // giới hạn bản đồ
    const r = Math.hypot(next.x, next.z);
    if (r > 385) { next.x *= 385 / r; next.z *= 385 / r; }
    const ground = this.groundAt(next.x, next.z, Math.max(this.pos.y, next.y));
    const deep = WATER_LEVEL - this.game.terrain.heightAt(next.x, next.z) > 1.35;
    this.inWater = false;
    if (deep && this.walkOnWater && next.y <= WATER_LEVEL + 0.05) {
      next.y = WATER_LEVEL; this.vel.y = Math.max(0, this.vel.y); this.onGround = true;
    } else if (deep && next.y <= WATER_LEVEL - 1.25) {
      next.y = WATER_LEVEL - 1.25; this.vel.y = Math.max(0, this.vel.y); this.onGround = false; this.inWater = true;
    } else if (next.y <= ground) {
      next.y = ground; this.vel.y = 0; this.onGround = true;
    } else {
      // bám đất khi đi xuống dốc nhẹ
      this.onGround = this.onGround && this.vel.y <= 0 && next.y - ground < 0.35;
      if (this.onGround) { next.y = ground; this.vel.y = 0; }
    }
    this.pos.copy(next);
  }

  /** Đẩy nhau ra để không đứng chồng lên nhau. */
  separate(others) {
    for (const o of others) {
      if (o === this || o.dead) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const rr = this.radius + o.radius, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2), k = ((rr - d) / d) * 0.5;
        this.pos.x += dx * k; this.pos.z += dz * k;
      }
    }
  }
}
