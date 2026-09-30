// First-person Oleg: WASD + mouse look, collisions against wall/furniture footprints, drunk sway.
export const EYE = 1.62;
const R = 0.22; // body radius

export class Player {
  constructor(camera, colliders) {
    this.camera = camera;
    camera.rotation.order = 'YXZ';
    this.colliders = colliders;
    this.x = 0;
    this.z = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.walkT = 0;
    this.t = 0;
  }

  place(x, z, yaw) {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.pitch = 0;
  }

  look(dx, dy) {
    this.yaw -= dx * 0.0022;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy * 0.0022));
  }

  blocked(x, z) {
    for (const c of this.colliders) {
      if (c.enabled === false) continue;
      if (c.seg) {
        const [ax, az, bx, bz] = c.seg;
        const vx = bx - ax, vz = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
        if (Math.hypot(x - ax - vx * t, z - az - vz * t) < c.r + R) return true;
      } else if (x > c.x0 - R && x < c.x1 + R && z > c.z0 - R && z < c.z1 + R) return true;
    }
    return false;
  }

  update(dt, { drunk = 0, canMove = true } = {}) {
    this.t += dt;
    const k = this.keys;
    const f = canMove ? (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0) : 0;
    const s = canMove ? (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) : 0;
    const d = drunk / 100;
    const moving = f || s;
    if (moving) {
      const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? 4.2 : 2.6;
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      let dx = -sin * f + cos * s, dz = -cos * f - sin * s;
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
      // drunk: the floor keeps sliding sideways
      const drift = Math.sin(this.t * 1.3) * d * 0.7;
      dx += cos * drift;
      dz -= sin * drift;
      const step = speed * dt;
      if (!this.blocked(this.x + dx * step, this.z)) this.x += dx * step;
      if (!this.blocked(this.x, this.z + dz * step)) this.z += dz * step;
      this.walkT += dt * (speed / 2.6);
    }
    const bob = moving ? Math.sin(this.walkT * 8) * 0.03 : 0;
    const sway = d * d;
    this.camera.position.set(
      this.x + Math.sin(this.t * 0.9) * sway * 0.08,
      EYE + bob + Math.sin(this.t * 1.4) * sway * 0.04,
      this.z + Math.cos(this.t * 0.7) * sway * 0.08,
    );
    this.camera.rotation.set(
      this.pitch + Math.sin(this.t * 1.1) * sway * 0.08,
      this.yaw + Math.sin(this.t * 0.6) * sway * 0.12,
      Math.sin(this.t * 0.8) * sway * 0.15,
    );
  }
}
