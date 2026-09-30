// Oleg's flat: the BTI plan (2-room khrushchevka) with his changes, mirrored left-right.
// Single source of truth for geometry: rooms, walls, openings, furniture, gameplay spots, nav graph.
//
// Everything below is authored in PLAN coordinates (as on the BTI drawing, bedroom on the left),
// then mirrored on export when MIRROR is true. Furniture uses the same trick (see mx / mrect).
// Run `npm run plan` to see the result as docs/plan.svg.
//
// Units: meters. Axes:
//   +X — right on the drawing
//   +Z — down on the drawing (away from the windows, toward the stairwell wall)
//   +Y — up
// Origin: inner corner of the bedroom (room 2) at the window wall.

export const MIRROR = true; // his flat is the mirror image of the drawing
export const W = 8.1; // inner width, mirror axis is W / 2
export const mx = (x) => (MIRROR ? W - x : x);
export const mrect = (q) => (MIRROR ? { ...q, x0: W - q.x1, x1: W - q.x0 } : q);
export const mfacing = (f) => (MIRROR && f ? { '+x': '-x', '-x': '+x' }[f] ?? f : f);
const mpt = ([x, z]) => [mx(x), z];

export const H = 2.5; // ceiling height
export const DOOR_H = 2.05;

const WIN = { bottom: 0.85, top: 2.2, kind: 'window' };
const DOOR = { bottom: 0, top: DOOR_H, kind: 'door' };

const r = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });

// rects: used for "which room am I in" and for wallpaper linings (lining goes only where a wall face exists)
// poly: optional exact floor outline (bath/hall are cut by the diagonal wall)
const PLAN_ROOMS = [
  { id: 'bedroom', name: 'Спальня', rects: [r(0, 2.3, 0, 5.5)], floor: 'parquet', wallpaper: 'bedroom', lamp: [1.15, 2.9] },
  { id: 'living', name: 'Зал', rects: [r(2.42, 5.48, 0, 5.5)], floor: 'parquet', wallpaper: 'living', lamp: [4.0, 2.6], lampPower: 1.6, chandelier: true },
  { id: 'kitchen', name: 'Кухня', rects: [r(5.6, 8.1, 0, 1.9)], floor: 'linoleum', wallpaper: 'kitchen', lamp: [6.85, 0.95] },
  {
    id: 'bath', name: 'Санузел',
    rects: [r(5.6, 8.1, 2.02, 3.5), r(6.45, 8.1, 3.5, 4.13)],
    poly: [[5.6, 2.02], [8.1, 2.02], [8.1, 4.13], [6.45, 4.13], [5.6, 3.44]],
    floor: 'floorTile', wallpaper: 'wallTile', wainscot: 1.6, lamp: [6.6, 3.1], lampPower: 0.7,
  },
  {
    id: 'hall', name: 'Прихожая',
    rects: [r(5.6, 8.1, 4.25, 5.5), r(5.6, 6.45, 3.5, 4.25)],
    poly: [[5.6, 3.44], [6.45, 4.13], [6.45, 4.25], [8.1, 4.25], [8.1, 5.5], [5.6, 5.5]],
    floor: 'linoleum', wallpaper: 'hall', lamp: [7.0, 4.7], lampPower: 0.6,
  },
  { id: 'balcony', name: 'Балкон', rects: [r(2.35, 5.55, -1.22, -0.42)], floor: 'concrete', outdoor: true },
  { id: 'landing', name: 'Подъезд', rects: [r(8.5, 10.7, 3.7, 6.3)], floor: 'floorTile', outdoor: true, wallpaper: 'landingPaint', wainscot: 1.5, lamp: [10.1, 5.9], lampPower: 0.5, lampColor: '#cfe8c8' },
];

// Axis-aligned walls. Openings are placed along the wall's long axis (absolute coords).
const PLAN_WALLS = [
  // exterior
  {
    id: 'north', ext: true, ...r(-0.4, 8.5, -0.42, 0),
    openings: [
      { at: [0.5, 1.8], ...WIN }, // bedroom
      { at: [2.75, 3.45], bottom: 0, top: DOOR_H, kind: 'balcony' }, // balcony door
      { at: [3.55, 4.95], ...WIN }, // living
      { at: [6.35, 7.55], ...WIN }, // kitchen
    ],
  },
  { id: 'south', ext: true, ...r(-0.4, 8.5, 5.5, 5.92) },
  { id: 'west', ext: true, ...r(-0.4, 0, 0, 5.5) },
  {
    id: 'east', ext: true, ...r(8.1, 8.5, 0, 5.5),
    openings: [{ at: [4.55, 5.35], bottom: 0, top: DOOR_H, kind: 'entrance' }],
  },

  // partitions
  { id: 'bedroom|living', ...r(2.3, 2.42, 0, 5.5), openings: [{ at: [3.75, 4.55], ...DOOR }] },
  {
    id: 'living|east', ...r(5.48, 5.6, 0, 5.5),
    openings: [
      { at: [0.45, 1.28], ...DOOR }, // living room is connected to the kitchen (no door)
      { at: [3.5, 5.5], ...DOOR }, // open passage to the hall, all the way to the diagonal bath wall
    ],
  },
  { id: 'kitchen|bath', ...r(5.6, 8.1, 1.9, 2.02) }, // old kitchen door is walled up
  { id: 'bath|hall', ...r(6.45, 8.1, 4.13, 4.25) },

  // stairwell landing outside the front door (visitors stand here, the door camera looks at it)
  { id: 'landing-far', ext: true, ...r(10.7, 10.9, 3.7, 6.3) },
  { id: 'landing-n', ext: true, ...r(8.5, 10.9, 3.5, 3.7) },
  { id: 'landing-s', ext: true, ...r(8.5, 10.9, 6.3, 6.5) },
  { id: 'landing-gap', ext: true, ...r(8.1, 8.5, 5.92, 6.5) },
];

// Non-axis walls: segment a -> b (plan coords), door measured in meters from a.
const PLAN_DIAG_WALLS = [
  { id: 'bath|hall diagonal', a: [5.6, 3.44], b: [6.45, 4.19], t: 0.1, door: { at: [0.2, 0.9], top: DOOR_H } },
];

const PLAN_BALCONY = { ...r(2.35, 5.55, -1.22, -0.42), railH: 1.0, rail: 0.05 };

// Furniture footprints. facing = where the front looks (the back is against the wall).
// furniture.js builds the look, colliders/labels come from here.
const PLAN_FURNITURE = [
  // bedroom: enter -> on the right Oleg's desk with the sister's loft bed above it,
  // further in: sister's desk on the left, Oleg's bed on the right
  { id: 'loftBed', label: 'Комп Олега', ...r(0.02, 2.0, 4.6, 5.48), facing: '-z' },
  { id: 'sisterDesk', label: 'Стол сестры', ...r(1.7, 2.28, 1.0, 2.3), facing: '-x' },
  { id: 'olegBed', label: 'Кровать Олега', ...r(0.04, 0.95, 0.95, 2.9), facing: '+x' },
  // living room
  { id: 'sofa', label: 'Диван', ...r(2.45, 3.3, 1.2, 3.2), facing: '+x' },
  { id: 'partyTable', label: 'Праздничный стол', ...r(3.6, 4.4, 2.0, 3.2) },
  { id: 'stenka', label: 'Стенка с теликом', ...r(5.0, 5.46, 1.45, 3.4), facing: '-x' }, // ends before the open passage to the hall (z 3.5)
  { id: 'ficus', label: 'Фикус', ...r(5.05, 5.4, 0.08, 0.4) },
  // kitchen
  { id: 'fridge', label: 'Холодильник', ...r(5.62, 6.18, 1.3, 1.88), facing: '-z' },
  { id: 'counter', label: 'Тумба с ящиками', ...r(6.18, 7.52, 1.3, 1.88), facing: '-z' },
  { id: 'microwave', label: 'Микроволновка', ...r(6.3, 6.75, 1.48, 1.85), facing: '-z', onTop: true },
  { id: 'sink', label: 'Раковина', ...r(7.52, 8.08, 0.95, 1.88), facing: '-x' },
  { id: 'stove', label: 'Плита', ...r(7.52, 8.08, 0.3, 0.95), facing: '-x' },
  { id: 'kitchenTable', label: 'Кухонный стол', ...r(6.05, 6.8, 0.08, 0.68) },
  // bathroom (combined)
  { id: 'tub', label: 'Ванна', ...r(6.35, 8.08, 2.04, 2.74), facing: '+z' },
  { id: 'bathSink', label: 'Раковина', ...r(7.62, 8.08, 2.82, 3.32), facing: '-x' },
  { id: 'toilet', label: 'Унитаз', ...r(7.5, 8.08, 3.48, 3.88), facing: '-x' },
  // hall
  { id: 'wardrobe', label: 'Гардероб', ...r(6.55, 7.7, 4.95, 5.48), facing: '-z' },
  // balcony
  { id: 'grill', label: 'Мангал', ...r(4.95, 5.45, -1.12, -0.82) },
];

// Navigation graph for friends: nodes (plan x, z) + edges. Friends walk node to node, then to the spot.
const PLAN_NAV = {
  hall: [7.2, 4.6],
  hallW: [6.2, 4.7],
  bathDoor: [6.01, 3.8],
  bath: [6.5, 3.1],
  passage: [5.54, 4.85],
  livingS: [4.6, 4.75],
  living: [4.1, 3.75],
  livingW: [3.45, 3.6],
  livingE: [4.72, 2.6],
  livingN: [4.3, 1.1],
  livingNW: [3.1, 0.6],
  bedDoor: [2.36, 4.15],
  bedroom: [1.3, 3.5],
  balconyDoor: [3.1, -0.21],
  balcony: [3.6, -0.8],
  kitchenDoor: [5.54, 0.87],
  kitchen: [6.4, 1.0],
};
export const NAV_EDGES = [
  ['hall', 'hallW'], ['hallW', 'bathDoor'], ['bathDoor', 'bath'], ['hallW', 'passage'],
  ['passage', 'livingS'], ['livingS', 'living'], ['livingS', 'bedDoor'], ['living', 'bedDoor'],
  ['bedDoor', 'bedroom'], ['living', 'livingW'], ['living', 'livingE'], ['livingE', 'livingN'],
  ['livingN', 'livingNW'], ['livingNW', 'balconyDoor'], ['balconyDoor', 'balcony'],
  ['livingN', 'kitchenDoor'], ['kitchenDoor', 'kitchen'],
];

// Spots where friends hang out: position, nav node to reach it from, pose, where to look.
const PLAN_SPOTS = {
  sofaA: { p: [2.95, 1.8], node: 'livingW', pose: 'sit', y: 0.08, look: [4, 1.8] },
  sofaB: { p: [2.95, 2.6], node: 'livingW', pose: 'sit', y: 0.08, look: [4, 2.6] },
  table1: { p: [4.6, 2.35], node: 'livingE', look: [4.0, 2.5] }, // keep arms out of the TV
  table2: { p: [4.0, 3.5], node: 'living', look: [4.0, 2.6] },
  balcony: { p: [3.6, -0.85], node: 'balcony', look: [3.6, -2] },
  grill: { p: [4.6, -0.95], node: 'balcony', look: [5.2, -0.95] },
  kitchen: { p: [6.6, 1.05], node: 'kitchen', look: [6.6, 0.3] },
  tub: { p: [7.2, 2.39], node: 'bath', pose: 'lie', y: 0.2, look: [8.0, 2.39] },
  toilet: { p: [7.62, 3.68], node: 'bath', pose: 'sit', look: [6.5, 3.68] },
  bathStand: { p: [6.2, 3.1], node: 'bath', look: [7, 3.1] },
  olegBed: { p: [0.5, 1.95], node: 'bedroom', pose: 'lie', y: 0.47, look: [0.5, 3] }, // on top of the mattress
  bedroom: { p: [1.3, 3.6], node: 'bedroom', look: [1.3, 2] },
  hall: { p: [7.2, 4.6], node: 'hall', look: [6, 4.6] },
  hallWait: { p: [6.2, 4.6], node: 'hallW', look: [6.0, 3.8] },
};

// The cat wanders between these (y = height it sits at). catBalcony only when the balcony door is open.
const PLAN_CAT_SPOTS = {
  catSofa: { p: [2.9, 2.9], node: 'livingW', y: 0.5 },
  catRug: { p: [4.0, 4.3], node: 'living' },
  catKitchen: { p: [7.0, 1.1], node: 'kitchen' },
  catBed: { p: [0.5, 2.6], node: 'bedroom', y: 0.5 },
  catBedroom: { p: [1.2, 4.2], node: 'bedroom' },
  catHall: { p: [7.6, 4.6], node: 'hall' },
  catBath: { p: [6.2, 3.3], node: 'bath' },
  catBalcony: { p: [3.3, -0.7], node: 'balcony', balcony: true },
  catRail: { p: [4.2, -1.13], node: 'balcony', y: 1.0, balcony: true },
};

// Where the cat toy can be hidden (y = height, e.g. on a desk)
const PLAN_TOY_SPOTS = [
  [0.95, 2.4], [4.0, 2.6], [6.4, 0.4], [7.25, 3.98], [5.75, 5.35], [1.0, 4.95], [2.55, -1.0], [2.0, 1.5, 0.76], [3.4, 5.2], [7.9, 0.15],
];

// Paintings (the birthday pictures). Hung on a wall: x = wall face, facing = which way the picture looks.
const PLAN_PAINTINGS = [
  { img: 'mushrooms', x: 2.42, z: 2.2, y: 1.45, w: 1.3, facing: '+x' }, // living room, above the sofa
  { img: 'pharaohs', x: 2.3, z: 1.65, y: 1.5, w: 1.1, facing: '-x' }, // bedroom, above the sister's desk
  { img: 'frogs', x: 5.6, z: 2.75, y: 1.95, w: 0.95, facing: '+x' }, // bathroom, above the tiles
];

const PLAN_VISITOR = [9.05, 4.95]; // where visitors stand on the landing
const PLAN_DOORCAM = { pos: [10.45, 2.15, 4.95], look: [8.3, 1.2, 4.95] };

// Where Oleg starts: in the hall by the front door, facing the living room.
const PLAN_START = { x: 7.3, z: 4.6, yaw: Math.PI / 2 };

// ---------- world-space exports (mirrored) ----------

const isAlongX = (w) => w.x1 - w.x0 >= w.z1 - w.z0;

export const ROOMS = PLAN_ROOMS.map((room) => ({
  ...room,
  rects: room.rects.map(mrect),
  poly: room.poly?.map(mpt),
  lamp: room.lamp && mpt(room.lamp),
}));

export const WALLS = PLAN_WALLS.map((w) => ({
  ...w,
  ...mrect(w),
  openings: (w.openings ?? []).map((o) => (MIRROR && isAlongX(w) ? { ...o, at: [W - o.at[1], W - o.at[0]] } : o)),
}));

export const DIAG_WALLS = PLAN_DIAG_WALLS.map((d) => ({ ...d, a: mpt(d.a), b: mpt(d.b) }));
export const BALCONY = mrect(PLAN_BALCONY);
// world rect + facing for colliders/interaction; .plan keeps the drawing-space version for furniture.js
export const FURNITURE = PLAN_FURNITURE.map((f) => ({ ...f, ...mrect(f), facing: mfacing(f.facing), plan: f }));
export const NAV = Object.fromEntries(Object.entries(PLAN_NAV).map(([k, p]) => [k, mpt(p)]));
export const SPOTS = Object.fromEntries(
  Object.entries(PLAN_SPOTS).map(([k, s]) => [k, { ...s, id: k, p: mpt(s.p), look: mpt(s.look) }]),
);
export const CAT_SPOTS = Object.fromEntries(
  Object.entries(PLAN_CAT_SPOTS).map(([k, s]) => [k, { ...s, id: k, p: mpt(s.p), y: s.y ?? 0 }]),
);
export const TOY_SPOTS = PLAN_TOY_SPOTS.map(([x, z, y = 0]) => ({ p: [mx(x), z], y }));
export const PAINTINGS = PLAN_PAINTINGS.map((p) => ({ ...p, x: mx(p.x), facing: mfacing(p.facing) }));
export const VISITOR_SPOT = mpt(PLAN_VISITOR);
export const DOORCAM = {
  pos: [mx(PLAN_DOORCAM.pos[0]), PLAN_DOORCAM.pos[1], PLAN_DOORCAM.pos[2]],
  look: [mx(PLAN_DOORCAM.look[0]), PLAN_DOORCAM.look[1], PLAN_DOORCAM.look[2]],
};
export const START = { x: mx(PLAN_START.x), z: PLAN_START.z, yaw: MIRROR ? -PLAN_START.yaw : PLAN_START.yaw };

function inPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function roomAt(x, z) {
  for (const room of ROOMS) if (room.poly && inPoly(x, z, room.poly)) return room;
  for (const room of ROOMS) {
    if (room.poly) continue;
    for (const q of room.rects) if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) return room;
  }
  return null;
}
