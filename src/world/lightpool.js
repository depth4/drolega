// A fixed handful of real point lights handed out to the lamps that matter.
// Every point light in the scene costs every lit pixel, and the flat, stairwell,
// street and shop together have more than a dozen. The scene keeps its lamps
// (hidden, so the shaders never see them); each frame the pool copies the ones
// nearest to the viewer, fading a lamp in and out when it gains or loses a slot.
// The light count never changes, so nothing recompiles mid-game.
import * as THREE from 'three';

const FADE = 3; // 1/s

export function createLightPool(scene, size = 6) {
  const slots = Array.from({ length: size }, () => {
    const l = new THREE.PointLight('#000', 0, 1, 2);
    l.userData.pooled = true;
    scene.add(l);
    return { l, src: null, w: 0 };
  });
  let lamps = [], scanIn = 0, first = true;
  const p = new THREE.Vector3();

  const scan = () => {
    const found = [];
    scene.traverse((o) => {
      if (!o.isPointLight || o.userData.pooled) return;
      o.visible = false;
      found.push(o);
    });
    lamps = found;
  };
  const shown = (o) => {
    for (let q = o.parent; q; q = q.parent) if (!q.visible) return false;
    return true;
  };

  return {
    scan,
    // views: world positions the picture is seen from (main camera, door camera)
    update(dt, views) {
      if ((scanIn -= dt) <= 0) { scan(); scanIn = 2; }
      const score = new Map();
      for (const o of lamps) {
        if (o.intensity <= 0 || !shown(o)) continue;
        o.getWorldPosition(p);
        let best = 0;
        for (const v of views) {
          const d = p.distanceTo(v);
          if (o.distance > 0 && d > o.distance + 8) continue;
          best = Math.max(best, o.intensity / Math.pow(1 + d, 1.6));
        }
        if (best > 0) score.set(o, best);
      }
      const want = new Set([...score.keys()].sort((a, b) => score.get(b) - score.get(a)).slice(0, size));
      const k = first ? 1 : dt * FADE;
      for (const s of slots) {
        if (s.src && !want.has(s.src)) {
          s.w -= k;
          if (s.w <= 0 || !lamps.includes(s.src)) { s.src = null; s.w = 0; }
        }
      }
      for (const o of want) {
        if (slots.some((s) => s.src === o)) continue;
        const free = slots.find((s) => !s.src);
        if (free) { free.src = o; free.w = 0; }
      }
      for (const s of slots) {
        if (!s.src) { s.l.intensity = 0; continue; }
        if (want.has(s.src)) s.w = Math.min(1, s.w + k);
        const o = s.src;
        o.getWorldPosition(s.l.position);
        s.l.color.copy(o.color);
        s.l.distance = o.distance;
        s.l.decay = o.decay;
        s.l.intensity = o.intensity * s.w;
      }
      first = false;
    },
  };
}
