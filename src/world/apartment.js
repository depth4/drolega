// Builds the flat's shell from layout.js: floors, walls with openings, wallpaper linings,
// windows, balcony, ceiling, lamps and the night view outside.
import * as THREE from 'three';
import { H, ROOMS, WALLS, BALCONY } from './layout.js';
import * as T from './textures.js';

const CENTER = { x: 4.05, z: 2.75 };

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

// UVs from world position so textures keep real-world scale on any box/plane (geometry baked in world space).
export function worldUV(geo, scale = 1) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) [u, v] = [p.getX(i), -p.getZ(i)];
    else if (ax >= az) [u, v] = [p.getZ(i), p.getY(i)];
    else [u, v] = [p.getX(i), p.getY(i)];
    uv.setXY(i, u * scale, v * scale);
  }
  uv.needsUpdate = true;
  return geo;
}

function boxGeo(x0, x1, y0, y1, z0, z1) {
  return new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}

const alongX = (w) => w.x1 - w.x0 >= w.z1 - w.z0;

export function buildApartment() {
  const group = new THREE.Group();
  const ceiling = new THREE.Group();
  const colliders = []; // {x0,x1,z0,z1} footprints in XZ
  const lights = [];

  const paint = mat('#d9d2c3');
  const cap = mat('#2b2622');
  const wallMats = [paint, paint, cap, paint, paint, paint]; // top face dark for the dollhouse view
  const frameMat = mat('#e8e4da', { roughness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#9fb8d0', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1 });
  const sillMat = mat('#f0ede6', { roughness: 0.4 });

  // --- base slab (thresholds under door openings)
  const slab = new THREE.Mesh(boxGeo(-0.4, 8.5, -0.25, 0, -0.42, 5.92), mat('#4a3f36'));
  group.add(slab);

  // --- floors
  const floorMats = {
    parquet: mat('#ffffff', { map: T.parquet(), roughness: 0.6 }),
    linoleum: mat('#ffffff', { map: T.linoleum(), roughness: 0.55 }),
    floorTile: mat('#ffffff', { map: T.floorTile(), roughness: 0.4 }),
    concrete: mat('#ffffff', { map: T.concrete() }),
  };
  for (const room of ROOMS) {
    for (const q of room.rects) {
      const geo = new THREE.PlaneGeometry(q.x1 - q.x0, q.z1 - q.z0).rotateX(-Math.PI / 2).translate((q.x0 + q.x1) / 2, 0.002, (q.z0 + q.z1) / 2);
      const m = new THREE.Mesh(worldUV(geo), floorMats[room.floor]);
      m.receiveShadow = true;
      group.add(m);
    }
  }

  // --- walls
  for (const w of WALLS) {
    const ax = alongX(w);
    const [s0, s1] = ax ? [w.x0, w.x1] : [w.z0, w.z1];
    const [t0, t1] = ax ? [w.z0, w.z1] : [w.x0, w.x1];
    const toRect = (a, b) => (ax ? { x0: a, x1: b, z0: t0, z1: t1 } : { x0: t0, x1: t1, z0: a, z1: b });
    const pieces = [];
    let cur = s0;
    for (const o of [...(w.openings ?? [])].sort((a, b) => a.at[0] - b.at[0])) {
      if (o.at[0] > cur) pieces.push([cur, o.at[0], 0, H, true]);
      if (o.bottom > 0) pieces.push([o.at[0], o.at[1], 0, o.bottom, true]);
      if (o.top < H) pieces.push([o.at[0], o.at[1], o.top, H, false]);
      cur = o.at[1];
      addOpeningDetails(group, colliders, w, o, ax, t0, t1, { frameMat, glassMat, sillMat });
    }
    if (cur < s1) pieces.push([cur, s1, 0, H, true]);

    for (const [a, b, y0, y1, solid] of pieces) {
      const q = toRect(a, b);
      const mesh = new THREE.Mesh(boxGeo(q.x0, q.x1, y0, y1, q.z0, q.z1), wallMats);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      if (solid) colliders.push(q);
    }
  }

  // --- wallpaper / tile linings, per room, only where a real wall face exists
  const wallpaperMats = {};
  const wpMat = (key) => {
    if (!wallpaperMats[key]) {
      const map = T.wallpapers[key]();
      wallpaperMats[key] = mat('#ffffff', { map, roughness: key === 'wallTile' ? 0.3 : 0.9 });
    }
    return wallpaperMats[key];
  };
  for (const room of ROOMS) {
    if (!room.wallpaper) continue;
    const m = wpMat(room.wallpaper);
    const scale = room.wallpaper === 'wallTile' ? 1 : 2; // wallpapers are 0.5 m per tile
    const height = room.wainscot ?? H;
    for (const q of room.rects) {
      for (const edge of roomEdges(q)) {
        for (const [a, b, y0, y1] of liningPieces(edge, height)) {
          group.add(new THREE.Mesh(worldUV(liningGeo(edge, a, b, y0, y1), scale), m));
        }
      }
    }
  }

  // --- balcony: slab + railing with a soviet corrugated sheet
  {
    const b = BALCONY;
    group.add(new THREE.Mesh(boxGeo(b.x0, b.x1, -0.14, 0, b.z0, b.z1), mat('#5b5752')));
    const sheet = mat('#6f7d63', { roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
    const rail = mat('#2a2a2a', { metalness: 0.5, roughness: 0.5 });
    const t = b.rail;
    const sides = [
      { x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z0 + t },
      { x0: b.x0, x1: b.x0 + t, z0: b.z0, z1: b.z1 },
      { x0: b.x1 - t, x1: b.x1, z0: b.z0, z1: b.z1 },
    ];
    for (const s of sides) {
      group.add(new THREE.Mesh(boxGeo(s.x0, s.x1, 0, b.railH - 0.05, s.z0, s.z1), sheet));
      group.add(new THREE.Mesh(boxGeo(s.x0 - 0.01, s.x1 + 0.01, b.railH - 0.05, b.railH, s.z0 - 0.01, s.z1 + 0.01), rail));
      colliders.push(s);
    }
  }

  // --- ceiling (faces down, so it is invisible from above anyway)
  {
    const geo = new THREE.PlaneGeometry(8.9, 6.34).rotateX(Math.PI / 2).translate(4.05, H, 2.75);
    ceiling.add(new THREE.Mesh(geo, mat('#efece6')));
  }

  // --- lamps
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#fff2d0' });
  const shadeMat = mat('#c8742f', { side: THREE.DoubleSide, emissive: '#5a2a08', emissiveIntensity: 0.6 });
  for (const room of ROOMS) {
    if (!room.lamp) continue;
    const [x, z] = room.lamp;
    const power = room.lampPower ?? 1;
    const light = new THREE.PointLight('#ffd7a0', 9 * power, 0, 1.6);
    light.position.set(x, H - 0.45, z);
    group.add(light);
    lights.push(light);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3), mat('#222'));
    cord.position.set(x, H - 0.15, z);
    ceiling.add(cord);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), bulbMat);
    bulb.position.set(x, H - 0.42, z);
    group.add(bulb);
    if (room.id === 'living') continue; // the living room gets a chandelier in furniture.js
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.16, 16, 1, true), shadeMat);
    shade.position.set(x, H - 0.36, z);
    ceiling.add(shade);
  }

  // --- night outside: yard, panel building across, moonlight
  {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), mat('#101418'));
    ground.position.y = -9;
    group.add(ground);
    const facade = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ map: T.cityFacade() }));
    facade.position.set(4, 6, -32);
    group.add(facade);
    const moon = new THREE.DirectionalLight('#8090c0', 0.35);
    moon.position.set(-6, 12, -10);
    moon.target.position.set(4, 0, 2);
    group.add(moon, moon.target);
    group.add(new THREE.HemisphereLight('#8a94b8', '#2a2018', 0.25));
  }

  // outer walls of the neighbours so the flat doesn't float in the dollhouse view
  group.add(new THREE.Mesh(boxGeo(-0.4, 8.5, -9, -0.25, -0.42, 5.92), mat('#3a3834')));

  group.add(ceiling);
  return { group, ceiling, colliders, lights };
}

// Room rect edges with the inward normal
function roomEdges(q) {
  return [
    { axis: 'x', c: q.z0, from: q.x0, to: q.x1, n: +1, face: (w) => Math.abs(w.z1 - q.z0) < 0.02 }, // north
    { axis: 'x', c: q.z1, from: q.x0, to: q.x1, n: -1, face: (w) => Math.abs(w.z0 - q.z1) < 0.02 }, // south
    { axis: 'z', c: q.x0, from: q.z0, to: q.z1, n: +1, face: (w) => Math.abs(w.x1 - q.x0) < 0.02 }, // west
    { axis: 'z', c: q.x1, from: q.z0, to: q.z1, n: -1, face: (w) => Math.abs(w.x0 - q.x1) < 0.02 }, // east
  ];
}

// Pieces [a, b, y0, y1] of lining along an edge: only where walls exist, minus openings.
function liningPieces(edge, height) {
  const out = [];
  for (const w of WALLS) {
    if ((edge.axis === 'x') !== alongX(w) || !edge.face(w)) continue;
    const [s0, s1] = edge.axis === 'x' ? [w.x0, w.x1] : [w.z0, w.z1];
    const a0 = Math.max(s0, edge.from), b0 = Math.min(s1, edge.to);
    if (b0 - a0 < 0.01) continue;
    let cur = a0;
    const ops = (w.openings ?? []).filter((o) => o.at[1] > a0 && o.at[0] < b0).sort((a, b) => a.at[0] - b.at[0]);
    for (const o of ops) {
      const oa = Math.max(o.at[0], a0), ob = Math.min(o.at[1], b0);
      if (oa > cur) out.push([cur, oa, 0, height]);
      if (o.bottom > 0) out.push([oa, ob, 0, Math.min(o.bottom, height)]);
      if (o.top < height) out.push([oa, ob, o.top, height]);
      cur = ob;
    }
    if (cur < b0) out.push([cur, b0, 0, height]);
  }
  return out;
}

function liningGeo(edge, a, b, y0, y1) {
  const off = 0.004 * edge.n;
  const geo = new THREE.PlaneGeometry(b - a, y1 - y0);
  const mid = (a + b) / 2, ym = (y0 + y1) / 2;
  if (edge.axis === 'x') {
    if (edge.n < 0) geo.rotateY(Math.PI);
    geo.translate(mid, ym, edge.c + off);
  } else {
    geo.rotateY(edge.n > 0 ? Math.PI / 2 : -Math.PI / 2);
    geo.translate(edge.c + off, ym, mid);
  }
  return geo;
}

// Window frames and glass, balcony door frame, entrance door leaf
function addOpeningDetails(group, colliders, w, o, ax, t0, t1, m) {
  const [a, b] = o.at;
  const mid = (t0 + t1) / 2;
  const inside = (ax ? CENTER.z : CENTER.x) > mid ? 1 : -1;
  const innerFace = inside > 0 ? t1 : t0;
  const box = (s0, s1, y0, y1, u0, u1, material) => {
    const g = ax ? boxGeo(s0, s1, y0, y1, u0, u1) : boxGeo(u0, u1, y0, y1, s0, s1);
    const mesh = new THREE.Mesh(g, material);
    group.add(mesh);
    return mesh;
  };
  const f = 0.06; // frame bar
  const fu0 = mid - 0.04, fu1 = mid + 0.04;

  if (o.kind === 'window' || o.kind === 'balcony') {
    box(a, a + f, o.bottom, o.top, fu0, fu1, m.frameMat);
    box(b - f, b, o.bottom, o.top, fu0, fu1, m.frameMat);
    box(a, b, o.top - f, o.top, fu0, fu1, m.frameMat);
  }
  if (o.kind === 'window') {
    box(a, b, o.bottom, o.bottom + f, fu0, fu1, m.frameMat);
    box((a + b) / 2 - f / 2, (a + b) / 2 + f / 2, o.bottom, o.top, fu0, fu1, m.frameMat);
    box(a, b, o.top - 0.55, o.top - 0.55 + f / 2, fu0, fu1, m.frameMat); // fortochka line
    box(a + f, b - f, o.bottom + f, o.top - f, mid - 0.01, mid + 0.01, m.glassMat);
    // windowsill (podokonnik)
    const s0 = Math.min(mid, innerFace + 0.07 * inside), s1 = Math.max(mid, innerFace + 0.07 * inside);
    box(a - 0.05, b + 0.05, o.bottom - 0.04, o.bottom, s0, s1, m.sillMat);
    // a radiator under it
    const r0 = innerFace + 0.03 * inside, r1 = innerFace + 0.12 * inside;
    const rad = box(a + 0.2, b - 0.2, 0.15, 0.7, Math.min(r0, r1), Math.max(r0, r1), new THREE.MeshStandardMaterial({ color: '#e9e4d6', roughness: 0.5 }));
    rad.userData.label = 'Батарея';
  }
  if (o.kind === 'entrance') {
    const leafMat = new THREE.MeshStandardMaterial({ color: '#5a2d1c', roughness: 0.65 }); // dermantin
    const u0 = innerFace + 0.02 * inside, u1 = innerFace + 0.08 * inside;
    const leaf = box(a + 0.02, b - 0.02, 0.01, o.top - 0.02, Math.min(u0, u1), Math.max(u0, u1), leafMat);
    leaf.userData.label = 'Входная дверь';
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: '#c9a44a', metalness: 0.8, roughness: 0.3 }));
    knob.position.set(innerFace + 0.1 * inside, 1.0, a + 0.12);
    group.add(knob);
    // quilted buttons
    const btn = new THREE.MeshStandardMaterial({ color: '#b08a3a', metalness: 0.7, roughness: 0.4 });
    for (let yy = 0.3; yy < 1.9; yy += 0.3)
      for (let ss = a + 0.18; ss < b - 0.1; ss += 0.22) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), btn);
        s.position.set(innerFace + 0.085 * inside, yy, ss);
        group.add(s);
      }
    colliders.push(ax ? { x0: a, x1: b, z0: t0, z1: t1 } : { x0: t0, x1: t1, z0: a, z1: b });
  }
}
