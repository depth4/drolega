// Outside the flat: the stairwell down from the landing, the ground-floor lobby, the yard at night
// and the "Продукты 24" kiosk across it. Authored in plan coordinates (like layout.js) and converted
// with planToWorld, so it scales and mirrors with the flat.
//   floor heights: the flat and the landing are at 0, the street is a floor below (STREET)
//   heightAt(x, z): where Oleg's feet are (stairs are smooth ramps for the camera, steps for the eye)
import * as THREE from 'three';
import { H, planToWorld as P, worldToPlan } from './layout.js';
import { mat, boxGeo, worldUV } from './apartment.js';
import * as T from './textures.js';

export const STREET = -2.8;
const F1 = [6.8, 8.8], MID = [8.8, 9.5], F2 = [9.5, 11.5], LOBBY = [11.5, 12.8]; // plan z ranges
const SX = [8.5, 10.7]; // stairwell inner x
const EXIT = [11.7, 12.6]; // lobby door to the yard (plan z), in the east wall
const SHOP = { x0: 15, x1: 19, z0: 9.5, z1: 14, door: [11.3, 12.5] };
const YARD = { x0: 10.9, x1: 24, z0: 2, z1: 18 };

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
  const sw = (x0, x1, z0, z1) => {
    pbox(group, x0, x1, STREET, -1.1, z0, z1, paintLow);
    pbox(group, x0, x1, -1.1, H, z0, z1, paintHigh);
    wall(x0, x1, z0, z1);
  };
  sw(8.3, 8.5, 6.5, 13.0); // west
  sw(10.7, 10.9, 6.5, EXIT[0]); // east, up to the door
  sw(10.7, 10.9, EXIT[1], 13.0);
  pbox(group, 10.7, 10.9, STREET + 2.1, H, EXIT[0], EXIT[1], paintHigh); // above the door
  sw(8.3, 10.9, 12.8, 13.0); // south
  ceiling.add(pbox(new THREE.Group(), 8.3, 10.9, H, H + 0.15, 6.5, 13.0, mat('#bdb9ad')));

  // ---- stairs: steps you see, a ramp the camera follows
  const flight = (z0, z1, y0, y1, n) => {
    for (let k = 0; k < n; k++) {
      const a = z0 + ((z1 - z0) * k) / n, b = z0 + ((z1 - z0) * (k + 1)) / n;
      const top = y0 + ((y1 - y0) * (k + 1)) / n;
      pbox(group, SX[0], SX[1], Math.min(y0, y1) - 0.35, top, Math.min(a, b), Math.max(a, b), stepMat);
    }
  };
  pbox(group, SX[0], SX[1], -0.25, 0, 6.5, F1[0], concrete, 1); // top strip by the landing
  flight(F1[0], F1[1], 0, -1.4, 10);
  pbox(group, SX[0], SX[1], -1.65, -1.4, MID[0], MID[1], concrete, 1);
  flight(F2[0], F2[1], -1.4, STREET, 10);
  pbox(group, SX[0], SX[1], STREET - 0.2, STREET, LOBBY[0], LOBBY[1], new THREE.MeshStandardMaterial({ map: T.floorTile(), roughness: 0.8 }), 1);
  // hand rail along the west wall
  for (const [z0, z1, y0, y1] of [[F1[0], F1[1], 0.9, -0.5], [F2[0], F2[1], -0.5, STREET + 0.9]]) {
    const a = P.pt(8.55, z0), b = P.pt(8.55, z1);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], y1 - y0);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 8), railMat);
    m.position.set((a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2);
    m.lookAt(b[0], y1, b[1]);
    m.rotateX(Math.PI / 2);
    group.add(m);
  }
  // the building under the stairs so it doesn't float in the dollhouse view
  pbox(group, 8.3, 10.9, -9, STREET - 0.2, 6.5, 13.0, mat('#3a3834'));
  const stairLight = new THREE.PointLight('#d8f0c8', 3, 9, 1.6);
  const sl = P.pt(9.6, 9.1);
  stairLight.position.set(sl[0], 0.9, sl[1]);
  group.add(stairLight);

  // ---- the yard
  const ground = pbox(group, YARD.x0, YARD.x1, STREET - 0.3, STREET, YARD.z0, YARD.z1, mat('#2b2c2e', { roughness: 1 }));
  ground.receiveShadow = false;
  pbox(group, YARD.x0, 12.6, STREET, STREET + 0.08, YARD.z0, YARD.z1, mat('#55534f', { roughness: 1 })); // sidewalk
  // the building's outside wall, with the lobby door cut out
  const facade = new THREE.MeshStandardMaterial({ map: T.concrete(), color: '#8f8a80', roughness: 1 });
  pbox(group, 10.9, 11.0, STREET, 9, YARD.z0, EXIT[0], facade, 1);
  pbox(group, 10.9, 11.0, STREET, 9, EXIT[1], YARD.z1, facade, 1);
  pbox(group, 10.9, 11.0, STREET + 2.1, 9, EXIT[0], EXIT[1], facade, 1);
  wall(10.9, 11.0, YARD.z0, EXIT[0]);
  wall(10.9, 11.0, EXIT[1], YARD.z1);
  // a canopy and a lamp over the door
  pbox(group, 11.0, 11.7, STREET + 2.3, STREET + 2.4, EXIT[0] - 0.3, EXIT[1] + 0.3, mat('#5b5752'));
  // the yard's edges: fences you can't get past
  const fence = mat('#3b4a3a', { metalness: 0.3 });
  for (const [x0, x1, z0, z1] of [[YARD.x1, YARD.x1 + 0.1, YARD.z0, YARD.z1], [YARD.x0, YARD.x1, YARD.z0 - 0.1, YARD.z0], [YARD.x0, YARD.x1, YARD.z1, YARD.z1 + 0.1]]) {
    pbox(group, x0, x1, STREET, STREET + 1.1, z0, z1, fence);
    wall(x0, x1, z0, z1);
  }
  // the panel block across the yard
  const city = new THREE.MeshBasicMaterial({ map: T.cityFacade() });
  pbox(group, YARD.x1 + 3, YARD.x1 + 3.5, STREET, 16, YARD.z0 - 6, YARD.z1 + 6, city);
  // street lamps
  for (const [x, z] of [[13.2, 6], [13.2, 16]]) {
    pbox(group, x - 0.06, x + 0.06, STREET, STREET + 4.2, z - 0.06, z + 0.06, railMat);
    pbox(group, x - 0.25, x + 0.25, STREET + 4.1, STREET + 4.25, z - 0.15, z + 0.15, new THREE.MeshBasicMaterial({ color: '#ffd59a' }));
    const l = new THREE.PointLight('#ffb866', 7, 14, 1.4);
    const [wx, wz] = P.pt(x, z);
    l.position.set(wx, STREET + 4, wz);
    group.add(l);
  }
  // a Zhiguli parked in the yard
  const car = mat('#7a2d22', { roughness: 0.5, metalness: 0.2 });
  pbox(group, 20.4, 21.7, STREET + 0.25, STREET + 0.95, 4, 7.6, car);
  pbox(group, 20.5, 21.6, STREET + 0.95, STREET + 1.45, 4.9, 6.6, car);
  pbox(group, 20.45, 21.65, STREET + 1.0, STREET + 1.4, 4.95, 6.55, new THREE.MeshStandardMaterial({ color: '#1d2a33', roughness: 0.1 }));
  for (const [x, z] of [[20.4, 4.6], [21.7, 4.6], [20.4, 7.0], [21.7, 7.0]]) pbox(group, x - 0.08, x + 0.08, STREET, STREET + 0.45, z - 0.3, z + 0.3, mat('#111'));
  wall(20.4, 21.7, 4, 7.6);

  // ---- the kiosk "Продукты 24"
  const S = SHOP;
  const kiosk = mat('#d9d4c7', { roughness: 0.9 });
  const kw = (x0, x1, z0, z1) => {
    pbox(group, x0, x1, STREET, STREET + 2.6, z0, z1, kiosk);
    wall(x0, x1, z0, z1);
  };
  kw(S.x0, S.x0 + 0.15, S.z0, S.door[0]);
  kw(S.x0, S.x0 + 0.15, S.door[1], S.z1);
  pbox(group, S.x0, S.x0 + 0.15, STREET + 2.1, STREET + 2.6, S.door[0], S.door[1], kiosk);
  kw(S.x1 - 0.15, S.x1, S.z0, S.z1);
  kw(S.x0, S.x1, S.z0, S.z0 + 0.15);
  kw(S.x0, S.x1, S.z1 - 0.15, S.z1);
  pbox(group, S.x0, S.x1, STREET + 2.6, STREET + 2.75, S.z0, S.z1, mat('#5a5650'));
  pbox(group, S.x0 + 0.15, S.x1 - 0.15, STREET, STREET + 0.01, S.z0 + 0.15, S.z1 - 0.15, new THREE.MeshStandardMaterial({ map: T.floorTile(), roughness: 0.8 }), 1);
  // the glowing sign over the door
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
  const [sx, sz] = P.pt(S.x0 - 0.02, (S.door[0] + S.door[1]) / 2);
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(P.len(2.6), 0.5), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }));
  signMesh.position.set(sx, STREET + 2.35, sz);
  signMesh.lookAt(P.pt(S.x0 - 5, (S.door[0] + S.door[1]) / 2)[0], STREET + 2.35, sz);
  group.add(signMesh);
  const shopLight = new THREE.PointLight('#f4f8ff', 6, 10, 1.2);
  const [lx, lz] = P.pt((S.x0 + S.x1) / 2, (S.z0 + S.z1) / 2);
  shopLight.position.set(lx, STREET + 2.3, lz);
  group.add(shopLight);
  // counter (the cashier stands behind it)
  pbox(group, 17.5, 17.9, STREET, STREET + 1.0, 10.3, 13.2, mat('#7a5a3a'));
  pbox(group, 17.45, 17.95, STREET + 1.0, STREET + 1.05, 10.25, 13.25, mat('#c9b48a'));
  wall(17.5, 17.9, 10.3, 13.2);
  // shelves: one product each, the products are boxes in the item's colours
  const shelves = [];
  const shelf = (id, x0, x1, z0, z1, color, label) => {
    const unit = pbox(group, x0, x1, STREET, STREET + 1.9, z0, z1, mat('#6b6156'));
    wall(x0, x1, z0, z1);
    const goods = new THREE.Group();
    const r = P.rect(x0, x1, z0, z1);
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 6; k++) {
        const w = (r.x1 - r.x0) / 6;
        const m = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.22, (r.z1 - r.z0) * 0.6), mat(color));
        m.position.set(r.x0 + w * (k + 0.5), STREET + 0.35 + row * 0.42, (r.z0 + r.z1) / 2);
        goods.add(m);
      }
    group.add(goods);
    shelves.push({ id, label, mesh: unit, goods });
  };
  shelf('beer', 15.3, 16.35, 9.65, 10.05, '#3c6e2d', 'Пиво');
  shelf('vodka', 16.45, 17.4, 9.65, 10.05, '#dfe9ee', 'Водка');
  shelf('pelmeni', 15.3, 16.35, 13.45, 13.85, '#e8eef8', 'Пельмени');
  shelf('chips', 16.45, 17.4, 13.45, 13.85, '#e0a21b', 'Сухарики');
  // the door you can't walk out of with unpaid stuff (shop.js turns it on)
  const shopDoor = { ...P.rect(S.x0 - 0.05, S.x0 + 0.2, S.door[0], S.door[1]), enabled: false };
  colliders.push(shopDoor);
  const cashier = P.pt(18.4, 11.75);

  // where Oleg's feet are
  function heightAt(x, z) {
    const [px, pz] = worldToPlan(x, z);
    if (px > YARD.x0) return STREET;
    if (px < SX[0] - 0.2 || px > SX[1] + 0.25 || pz < 6.5) return 0;
    if (pz < F1[0]) return 0;
    if (pz < F1[1]) return -1.4 * ((pz - F1[0]) / (F1[1] - F1[0]));
    if (pz < MID[1]) return -1.4;
    if (pz < F2[1]) return -1.4 + (STREET + 1.4) * ((pz - F2[0]) / (F2[1] - F2[0]));
    return STREET;
  }

  function zoneName(x, z) {
    const [px, pz] = worldToPlan(x, z);
    if (px > S.x0 && px < S.x1 && pz > S.z0 && pz < S.z1) return 'Продукты 24';
    if (px > YARD.x0) return 'Двор';
    if (px >= SX[0] - 0.2 && px <= SX[1] + 0.25 && pz >= 6.5) return 'Подъезд';
    return null;
  }

  return { group, ceiling, colliders, heightAt, zoneName, shelves, shopDoor, cashier, inShop: (x, z) => zoneName(x, z) === 'Продукты 24' };
}
