import * as THREE from 'three';
import { Actor } from './actor.js';

/** NPC đứng/đi lại, có thể nói chuyện. */
export class NPC extends Actor {
  constructor(game, character, { name, dialogue, idleAnim = 'Idle_Loop', talkAnim = 'Idle_Talking_Loop', route = null }) {
    super(game, character, { radius: 0.35, hp: 1 });
    this.name = name;
    this.dialogue = dialogue;
    this.idleAnim = idleAnim;
    this.talkAnim = talkAnim;
    this.route = route;
    this.routeIdx = 0;
    this.wait = 0;
    this.talking = false;
    this.homeYaw = 0;
  }

  update(dt) {
    const p = this.game.player;
    let speed = 0, dir = null;
    if (this.talking) {
      const to = new THREE.Vector3().subVectors(p.pos, this.pos);
      this.faceTowards(Math.atan2(to.x, to.z), dt, 6);
    } else if (this.route) {
      if (this.wait > 0) this.wait -= dt;
      else {
        const wp = this.route[this.routeIdx];
        const to = new THREE.Vector3(wp[0] - this.pos.x, 0, wp[1] - this.pos.z);
        if (to.length() < 0.8) { this.routeIdx = (this.routeIdx + 1) % this.route.length; this.wait = 2 + Math.random() * 4; }
        else { dir = to.normalize(); speed = 1.4; this.faceTowards(Math.atan2(dir.x, dir.z), dt, 4); }
      }
    } else {
      this.faceTowards(this.homeYaw, dt, 2);
    }
    const tv = dir ? dir.multiplyScalar(speed) : new THREE.Vector3();
    this.vel.x = tv.x; this.vel.z = tv.z;
    this.physics(dt);
    if (this.talking) this.char.play(this.talkAnim);
    else if (speed > 0) this.char.play('Walk_Loop', { speed: 0.8 });
    else this.char.play(this.idleAnim);
    this.char.update(dt);
  }
}
