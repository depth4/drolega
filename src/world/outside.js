// Outside the flat: the stairwell down from the landing, the ground-floor lobby, the yard at night
// and the "Продукты 24" kiosk across it. Authored in plan coordinates (like layout.js) and converted
// with planToWorld, so it scales and mirrors with the flat.
//   floor heights: the flat and the landing are at 0, the street is a floor below (STREET)
//   heightAt(x, z): where Oleg's feet are (stairs are smooth ramps for the camera, steps for the eye)
import * as THREE from 'three';
import { H, planToWorld as P, worldToPlan } from './layout.js';
import { mat, boxGeo, worldUV } from './apartment.js';
import * as T from './textures.js';

// Khrushchevka stairwell, Oleg on the 2nd floor. Side view: his landing -> a flight down to the half
// landing -> a flight back to the 1st-floor landing (right under his) -> a short flight down to the
// entrance door. The flights zig-zag in two lanes, stacked over each other.
export const STREET = -4.0;
const L1 = -2.8; // 1st floor landing
const SX = [8.5, 10.7], LANE = 9.6; // stairwell inner x; lane A (x < LANE) and lane B
const STRIP = [6.5, 7.0], FL = [7.0, 9.0], END = [9.0, 9.8]; // plan z: landing strip, flights, far end
const EXIT = [END[0], END[1]]; // entrance door to the yard (plan z), in the east wall at the bottom
// The yard wraps round the corner: out of the entrance on the east side, round to the front of the
// building, under the balcony and the living room windows, where the kiosk stands (you see it from above).
const EAST = { x0: 10.9, x1: 16, z0: -0.42, z1: 13 }; // strip along the stairwell side
const FRONT = { x0: -3, x1: 16, z0: -14, z1: -0.42 }; // in front of the balcony
const SHOP = { x0: 4, x1: 8.5, z0: -10.5, z1: -6.5, door: [5.7, 6.9] }; // door on the side facing the building

// plan-space box -> world mesh (y in meters, not scaled)
function pbox(group, x0, x1, y0, y1, z0, z1, m, uv) {
  const r = P.rect(x0, x1, z0, z1);
  const g = boxGeo(r.x0, r.x1, y0, y1, r.z0, r.z1);
  if (uv) worldUV(g, uv);
  const mesh = new THREE.Mesh(g, m);
  group.add(mesh);
  return mesh;
}

export function buildOutside() {
  const group = new THREE.Group();
  const ceiling = new THREE.Group();
  const colliders = [];
  const wall = (x0, x1, z0, z1, extra = {}) => colliders.push({ ...P.rect(x0, x1, z0, z1), ...extra });

  const paintLow = mat('#3f6b5a', { roughness: 0.9 }); // the classic green stairwell paint
  const paintHigh = mat('#c9c6b8', { roughness: 0.95 });
  const concrete = new THREE.MeshStandardMaterial({ map: T.concrete(), roughness: 1 });
  const stepMat = mat('#8a8378', { roughness: 0.95 });
  const railMat = mat('#2a2a2a', { metalness: 0.4, roughness: 0.6 });

  // ---- stairwell walls (from the street level up to the ceiling)
  const sw = (x0, x1, z0, z1, y0 = STREET, extra = {}) => {
    pbox(group, x0, x1, y0, Math.min(H, Math.max(y0, -1.1)), z0, z1, paintLow);
    if (y0 < H) pbox(group, x0, x1, Math.max(y0, -1.1), H, z0, z1, paintHigh);
    wall(x0, x1, z0, z1, extra);
  };
  sw(8.3, 8.5, STRIP[0], 10.0); // west
  sw(10.7, 10.9, STRIP[0], EXIT[0]); // east
  sw(8.3, 10.9, END[1], 10.0); // far end
  // the entrance door: a hole at the bottom only; above it the wall is solid (and solid for the upper levels)
  pbox(group, 10.7, 10.9, STREET + 2.1, H, EXIT[0], EXIT[1], paintHigh);
  wall(10.7, 10.9, EXIT[0], EXIT[1], { floor: [-3.4, 9] });
  // the main entrance door leaf, open into the yard
  pbox(group, 10.9, 11.0, STREET, STREET + 2.05, EXIT[0] - 0.75, EXIT[0], mat('#5a3a24'));
  ceiling.add(pbox(new THREE.Group(), 8.3, 10.9, H, H + 0.15, STRIP[0], 10.0, mat('#bdb9ad')));

  // ---- stairs: steps you see, a ramp the camera follows (heightAt)
  const lane = (a) => (a ? [SX[0], LANE - 0.05] : [LANE + 0.05, SX[1]]);
  const flight = (laneA, z0, z1, y0, y1, n) => {
    const [x0, x1] = lane(laneA);
    for (let k = 0; k < n; k++) {
      const a = z0 + ((z1 - z0) * k) / n, b = z0 + ((z1 - z0) * (k + 1)) / n;
      const top = y0 + ((y1 - y0) * (k + 1)) / n;
      pbox(group, x0, x1, top - 0.3, top, Math.min(a, b), Math.max(a, b), stepMat);
    }
  };
  const slab = (z0, z1, y) => pbox(group, SX[0], SX[1], y - 0.25, y, z0, z1, concrete, 1);
  slab(STRIP[0], STRIP[1], 0); // his landing, by the doorway
  flight(true, FL[0], FL[1], 0, -1.4, 10); // down to the half landing
  slab(END[0], END[1], -1.4);
  flight(false, FL[1], FL[0], -1.4, L1, 10); // back to the 1st floor
  slab(STRIP[0], STRIP[1], L1);
  flight(true, FL[0], FL[1], L1, STREET, 8); // the short one down to the door
  pbox(group, SX[0], SX[1], STREET - 0.2, STREET, END[0], END[1], new THREE.MeshStandardMaterial({ map: T.floorTile(), roughness: 0.8 }), 1);
  // the gap between the flights: a railing all the way down
  // balusters and a hand rail along each flight (the collider stops you hopping between flights)
  wall(LANE - 0.05, LANE + 0.05, FL[0], FL[1]);
  for (const [y0, y1] of [[0, -1.4], [L1, -1.4], [L1, STREET]]) {
    const n = 9;
    for (let k = 0; k <= n; k++) {
      const z = FL[0] + ((FL[1] - FL[0]) * k) / n, y = y0 + ((y1 - y0) * k) / n;
      pbox(group, LANE - 0.015, LANE + 0.015, y, y + 0.9, z - 0.015, z + 0.015, railMat);
    }
    const a = P.pt(LANE, FL[0]), b2 = P.pt(LANE, FL[1]);
    const len = Math.hypot(b2[0] - a[0], b2[1] - a[1], y1 - y0);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, len), mat('#5a3a24'));
    rail.position.set((a[0] + b2[0]) / 2, (y0 + y1) / 2 + 0.92, (a[1] + b2[1]) / 2);
    rail.lookAt(b2[0], y1 + 0.92, b2[1]);
    group.add(rail);
  }
  // drops you can't walk off: his landing over the 2nd flight, the 1st-floor landing back into his doorway
  wall(LANE, SX[1], FL[0] - 0.03, FL[0] + 0.03, { floor: [-0.7, 9] });
  wall(SX[0], SX[1], 6.42, 6.55, { floor: [-9, -0.7] });
  // under the 2nd flight at the bottom: no headroom
  wall(LANE, SX[1], STRIP[0], END[0], { floor: [-9, -3.4] });
  // a doorway on the 1st floor (the neighbours below)
  pbox(group, 10.72, 10.76, L1, L1 + 2.0, STRIP[0] - 0.05, STRIP[1] - 0.05, mat('#6a4a2e'));
  // the building under the stairs so it doesn't float in the dollhouse view
  pbox(group, 8.3, 10.9, -9, STREET - 0.2, STRIP[0], 10.0, mat('#3a3834'));
  for (const [z, y] of [[9.4, -0.4], [6.75, L1 + 1.6]]) {
    const l = new THREE.PointLight('#d8f0c8', 2.5, 7, 1.6);
    const [lx0, lz0] = P.pt(9.6, z);
    l.position.set(lx0, y, lz0);
    group.add(l);
  }

  // ---- the yard (an L round the corner)
  const asphalt = mat('#2b2c2e', { roughness: 1 });
  const curb = mat('#55534f', { roughness: 1 });
  for (const q of [EAST, FRONT]) pbox(group, q.x0, q.x1, STREET - 0.3, STREET, q.z0, q.z1, asphalt);
  pbox(group, EAST.x0, 12.4, STREET, STREET + 0.06, EAST.z0, EAST.z1, curb); // sidewalks along the house
  pbox(group, FRONT.x0, FRONT.x1, STREET, STREET + 0.06, -1.9, FRONT.z1, curb);
  // the outside walls of the building at street level (the flat's own walls start at its floor)
  const facade = new THREE.MeshStandardMaterial({ map: T.concrete(), color: '#8f8a80', roughness: 1 });
  pbox(group, 10.9, 11.0, STREET, 0, EAST.z0, EXIT[0], facade, 1);
  pbox(group, 10.9, 11.0, STREET, 0, EXIT[1], EAST.z1, facade, 1);
  pbox(group, 10.9, 11.0, 0, H + 0.4, 10.0, EAST.z1, facade, 1);
  wall(10.9, 11.0, EAST.z0, EXIT[0]);
  wall(10.9, 11.0, EXIT[1], EAST.z1);
  pbox(group, -0.4, 10.9, STREET, -0.25, -0.5, -0.42, facade, 1); // under the front windows
  wall(-0.4, 10.9, -0.5, -0.42);
  // a canopy over the entrance
  pbox(group, 11.0, 11.7, STREET + 2.3, STREET + 2.4, EXIT[0] - 0.3, EXIT[1] + 0.3, mat('#5b5752'));
  // fences round the yard
  const fence = mat('#3b4a3a', { metalness: 0.3 });
  for (const [x0, x1, z0, z1] of [
    [FRONT.x0, FRONT.x1, FRONT.z0 - 0.1, FRONT.z0], // far side
    [FRONT.x0 - 0.1, FRONT.x0, FRONT.z0, FRONT.z1], // west end
    [FRONT.x0, -0.4, FRONT.z1 - 0.1, FRONT.z1 + 0.05], // round the west corner
    [EAST.x1, EAST.x1 + 0.1, FRONT.z0, EAST.z1], // east side
    [EAST.x0, EAST.x1, EAST.z1, EAST.z1 + 0.1], // the back
  ]) {
    pbox(group, x0, x1, STREET, STREET + 1.1, z0, z1, fence);
    wall(x0, x1, z0, z1);
  }
  // street lamps: one by the entrance, two in front, so the kiosk is lit from the balcony
  for (const [x, z] of [[13.2, 5], [2, -3.2], [10, -3.2]]) {
    pbox(group, x - 0.06, x + 0.06, STREET, STREET + 4.2, z - 0.06, z + 0.06, railMat);
    pbox(group, x - 0.25, x + 0.25, STREET + 4.1, STREET + 4.25, z - 0.15, z + 0.15, new THREE.MeshBasicMaterial({ color: '#ffd59a' }));
    const l = new THREE.PointLight('#ffb866', 7, 14, 1.4);
    const [wx, wz] = P.pt(x, z);
    l.position.set(wx, STREET + 4, wz);
    group.add(l);
  }
  // a Zhiguli parked in front
  const car = mat('#7a2d22', { roughness: 0.5, metalness: 0.2 });
  pbox(group, 11.2, 12.5, STREET + 0.25, STREET + 0.95, -9, -5.4, car);
  pbox(group, 11.3, 12.4, STREET + 0.95, STREET + 1.45, -8.1, -6.4, car);
  pbox(group, 11.25, 12.45, STREET + 1.0, STREET + 1.4, -8.05, -6.45, new THREE.MeshStandardMaterial({ color: '#1d2a33', roughness: 0.1 }));
  for (const [x, z] of [[11.2, -8.4], [12.5, -8.4], [11.2, -6.0], [12.5, -6.0]]) pbox(group, x - 0.08, x + 0.08, STREET, STREET + 0.45, z - 0.3, z + 0.3, mat('#111'));
  wall(11.2, 12.5, -9, -5.4);
  // a bench and the trash bins, for the yard feel
  pbox(group, 1.5, 3.2, STREET + 0.4, STREET + 0.48, -6.2, -5.8, mat('#6b4a2c'));
  pbox(group, 13.6, 14.4, STREET, STREET + 1.1, 9, 10.5, mat('#3d5a3a'));
  wall(13.6, 14.4, 9, 10.5);

  // ---- the kiosk "Продукты 24" (door towards the building)
  const S = SHOP;
  const kiosk = mat('#d9d4c7', { roughness: 0.9 });
  const kw = (x0, x1, z0, z1) => {
    pbox(group, x0, x1, STREET, STREET + 2.6, z0, z1, kiosk);
    wall(x0, x1, z0, z1);
  };
  kw(S.x0, S.door[0], S.z1 - 0.15, S.z1);
  kw(S.door[1], S.x1, S.z1 - 0.15, S.z1);
  pbox(group, S.door[0], S.door[1], STREET + 2.1, STREET + 2.6, S.z1 - 0.15, S.z1, kiosk);
  kw(S.x0, S.x1, S.z0, S.z0 + 0.15);
  kw(S.x0, S.x0 + 0.15, S.z0, S.z1);
  kw(S.x1 - 0.15, S.x1, S.z0, S.z1);
  pbox(group, S.x0, S.x1, STREET + 2.6, STREET + 2.75, S.z0, S.z1, mat('#5a5650'));
  pbox(group, S.x0 + 0.15, S.x1 - 0.15, STREET, STREET + 0.01, S.z0 + 0.15, S.z1 - 0.15, new THREE.MeshStandardMaterial({ map: T.floorTile(), roughness: 0.8 }), 1);
  // the glowing sign over the door, and one on the roof you can read from the balcony
  const sign = document.createElement('canvas');
  sign.width = 512;
  sign.height = 96;
  const sg = sign.getContext('2d');
  sg.fillStyle = '#0d3b2a';
  sg.fillRect(0, 0, 512, 96);
  sg.fillStyle = '#7dffb0';
  sg.font = '900 60px Arial';
  sg.textAlign = 'center';
  sg.textBaseline = 'middle';
  sg.fillText('ПРОДУКТЫ 24', 256, 50);
  const signTex = new THREE.CanvasTexture(sign);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false, side: THREE.DoubleSide });
  const [sx, sz] = P.pt((S.door[0] + S.door[1]) / 2, S.z1 + 0.02);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(P.len(2.6), 0.5), signMat);
  front.position.set(sx, STREET + 2.35, sz);
  front.lookAt(sx, STREET + 2.35, sz + 5);
  group.add(front);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(P.len(3.4), 0.8), signMat);
  const [rx, rz] = P.pt((S.x0 + S.x1) / 2, S.z1 - 0.3);
  roof.position.set(rx, STREET + 3.25, rz);
  roof.lookAt(rx, STREET + 3.9, rz + 5); // tipped up towards the windows
  group.add(roof);
  const shopLight = new THREE.PointLight('#f4f8ff', 6, 10, 1.2);
  const [lx, lz] = P.pt((S.x0 + S.x1) / 2, (S.z0 + S.z1) / 2);
  shopLight.position.set(lx, STREET + 2.3, lz);
  group.add(shopLight);
  // counter across the back, the cashier behind it
  pbox(group, 4.6, 7.9, STREET, STREET + 1.0, -9.5, -9.1, mat('#7a5a3a'));
  pbox(group, 4.55, 7.95, STREET + 1.0, STREET + 1.05, -9.55, -9.05, mat('#c9b48a'));
  wall(4.6, 7.9, -9.5, -9.1);
  // shelves: one product each; the products are boxes in the item's colours
  const shelves = [];
  const shelf = (id, x0, x1, z0, z1, color, label) => {
    const unit = pbox(group, x0, x1, STREET, STREET + 1.9, z0, z1, mat('#6b6156'));
    wall(x0, x1, z0, z1);
    const goods = new THREE.Group();
    const r = P.rect(x0, x1, z0, z1);
    const alongX = r.x1 - r.x0 > r.z1 - r.z0;
    const len = alongX ? r.x1 - r.x0 : r.z1 - r.z0, dep = alongX ? r.z1 - r.z0 : r.x1 - r.x0;
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 6; k++) {
        const w = len / 6;
        const m = new THREE.Mesh(alongX ? new THREE.BoxGeometry(w * 0.7, 0.22, dep * 0.6) : new THREE.BoxGeometry(dep * 0.6, 0.22, w * 0.7), mat(color));
        const along = (alongX ? r.x0 : r.z0) + w * (k + 0.5);
        m.position.set(alongX ? along : (r.x0 + r.x1) / 2, STREET + 0.35 + row * 0.42, alongX ? (r.z0 + r.z1) / 2 : along);
        goods.add(m);
      }
    group.add(goods);
    shelves.push({ id, label, mesh: unit, goods });
  };
  shelf('beer', 4.15, 4.55, -8.7, -7.85, '#3c6e2d', 'Пиво');
  shelf('vodka', 4.15, 4.55, -7.8, -6.95, '#dfe9ee', 'Водка');
  shelf('pelmeni', 7.95, 8.35, -8.7, -7.85, '#e8eef8', 'Пельмени');
  shelf('chips', 7.95, 8.35, -7.8, -6.95, '#e0a21b', 'Сухарики');
  // behind the cashier: the wall of cigarettes, bottles and everything
  pbox(group, 4.3, 8.2, STREET, STREET + 2.2, -10.35, -9.95, mat('#5e544a'));
  const backGoods = ['#b3242a', '#e8e0c8', '#2f5fb8', '#3c6e2d', '#e0a21b', '#7a3a8a', '#dfe9ee'];
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k < 13; k++) {
      const x = 4.45 + k * 0.28, bottle = row < 2;
      const [bx, bz] = P.pt(x, -9.92);
      const m = bottle
        ? new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.3, 8), mat(backGoods[(k + row * 3) % backGoods.length], { roughness: 0.2 }))
        : new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.06), mat(backGoods[(k * 2 + row) % backGoods.length]));
      m.position.set(bx, STREET + 0.45 + row * 0.38 + (bottle ? 0.15 : 0.06), bz);
      group.add(m);
    }
    pbox(group, 4.3, 8.2, STREET + 0.4 + row * 0.38, STREET + 0.43 + row * 0.38, -10.35, -9.8, mat('#4a4038'));
  }
  // the door you can't walk out of with unpaid stuff (shop.js turns it on)
  const shopDoor = { ...P.rect(S.door[0], S.door[1], S.z1 - 0.2, S.z1 + 0.05), enabled: false };
  colliders.push(shopDoor);
  const cashier = P.pt(6.25, -9.75);

  // where Oleg's feet are. In the stairwell several floors are stacked over the same spot: take the one
  // closest to where his feet already are (you can only get to a level by walking onto it)
  function heightAt(x, z, cur = 0) {
    const [px, pz] = worldToPlan(x, z);
    const onBalcony = px > 2.3 && px < 5.6 && pz > -1.3 && pz < -0.42; // the balcony is the flat's floor
    if (px > EAST.x0 || (pz < FRONT.z1 && !onBalcony)) return STREET;
    if (px < SX[0] - 0.2 || px > SX[1] + 0.25 || pz < STRIP[0]) return 0;
    const t = (pz - FL[0]) / (FL[1] - FL[0]);
    let cands;
    if (pz < STRIP[1]) cands = [0, L1];
    else if (pz >= END[0]) cands = [-1.4, STREET];
    else if (px < LANE) cands = [-1.4 * t, L1 + (STREET - L1) * t];
    else cands = [L1 + 1.4 * t];
    return cands.reduce((b, h) => (Math.abs(h - cur) < Math.abs(b - cur) ? h : b));
  }

  function zoneName(x, z) {
    const [px, pz] = worldToPlan(x, z);
    if (px > S.x0 && px < S.x1 && pz > S.z0 && pz < S.z1) return 'Продукты 24';
    if (px > EAST.x0 || (pz < -1.3)) return 'Двор';
    if (px >= SX[0] - 0.2 && px <= SX[1] + 0.25 && pz >= STRIP[0]) return 'Подъезд';
    return null;
  }

  return { group, ceiling, colliders, heightAt, zoneName, shelves, shopDoor, cashier, inShop: (x, z) => zoneName(x, z) === 'Продукты 24' };
}
