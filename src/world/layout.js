// Oleg's flat: the BTI plan (2-room khrushchevka) with his changes, mirrored left-right.
// Single source of truth for geometry: rooms, walls, openings, gameplay spots.
//
// Everything below is authored in PLAN coordinates (as on the BTI drawing, bedroom on the left),
// then mirrored on export when MIRROR is true. Furniture uses the same trick (see mx / mrect).
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
const mpt = ([x, z]) => [mx(x), z];

export const H = 2.5; // ceiling height
export const DOOR_H = 2.05;

const WIN = { bottom: 0.85, top: 2.2, kind: 'window' };
const DOOR = { bottom: 0, top: DOOR_H, kind: 'door' };

const r = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });

// rects: used for "which room am I in" and for wallpaper linings (lining goes only where a wall face exists)
// poly: optional exact floor outline (bath/hall are cut by the diagonal wall)
const PLAN_ROOMS = [
  { id: 'bedroom', name: 'Спальня', rects: [r(0, 2.3, 0, 5.5)], floor: 'parquet', wallpaper: 'bedroom', lamp: [1.15, 2.7] },
  { id: 'living', name: 'Зал', rects: [r(2.42, 5.48, 0, 5.5)], floor: 'parquet', wallpaper: 'living', lamp: [4.0, 2.7], lampPower: 1.6, chandelier: true },
  { id: 'kitchen', name: 'Кухня', rects: [r(5.6, 8.1, 0, 1.9)], floor: 'linoleum', wallpaper: 'kitchen', lamp: [6.85, 0.95] },
  {
    id: 'bath', name: 'Санузел',
    rects: [r(5.6, 8.1, 2.02, 3.5), r(6.45, 8.1, 3.5, 4.13)],
    poly: [[5.6, 2.02], [8.1, 2.02], [8.1, 4.13], [6.45, 4.13], [5.6, 3.44]],
    floor: 'floorTile', wallpaper: 'wallTile', wainscot: 1.6, lamp: [6.85, 3.0], lampPower: 0.7,
  },
  {
    id: 'hall', name: 'Прихожая',
    rects: [r(5.6, 8.1, 4.25, 5.5), r(5.6, 6.45, 3.5, 4.25)],
    poly: [[5.6, 3.44], [6.45, 4.13], [6.45, 4.25], [8.1, 4.25], [8.1, 5.5], [5.6, 5.5]],
    floor: 'linoleum', wallpaper: 'hall', lamp: [7.0, 4.85], lampPower: 0.6,
  },
  { id: 'balcony', name: 'Балкон', rects: [r(2.35, 5.55, -1.22, -0.42)], floor: 'concrete', outdoor: true },
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
  { id: 'bedroom|living', ...r(2.3, 2.42, 0, 5.5), openings: [{ at: [4.0, 4.85], ...DOOR }] }, // straight ahead from the front door
  {
    id: 'living|east', ...r(5.48, 5.6, 0, 5.5),
    openings: [
      { at: [0.45, 1.28], ...DOOR }, // living room is connected to the kitchen (no door)
      { at: [4.25, 5.5], ...DOOR }, // passage to the hall (dashed on the plan)
    ],
  },
  { id: 'kitchen|bath', ...r(5.6, 8.1, 1.9, 2.02) }, // old kitchen door is walled up
  { id: 'bath|hall', ...r(6.45, 8.1, 4.13, 4.25) },
];

// Non-axis walls: segment a -> b (plan coords), door measured in meters from a.
const PLAN_DIAG_WALLS = [
  { id: 'bath|hall diagonal', a: [5.6, 3.44], b: [6.45, 4.19], t: 0.1, door: { at: [0.2, 0.9], top: DOOR_H } },
];

const PLAN_BALCONY = { ...r(2.35, 5.55, -1.22, -0.42), railH: 1.0, rail: 0.05 };

// Anchor points for friends / events (plan x, z). Friends stand or sit here.
const PLAN_SPOTS = {
  sofa: [2.95, 2.2],
  partyTable: [4.05, 2.7],
  balcony: [3.95, -0.8],
  kitchenTable: [6.45, 0.95],
  fridge: [5.9, 1.05],
  microwave: [6.55, 1.05],
  sink: [7.25, 1.5],
  stove: [7.25, 0.6],
  bath: [7.2, 2.85],
  toilet: [7.3, 3.3],
  washer: [7.8, 3.3],
  bed: [0.55, 3.4],
  pc: [1.25, 1.1],
  wardrobe: [7.1, 5.05],
  entrance: [7.7, 4.95],
};

// Furniture footprints (plan coords). furniture.js builds the 3D look, this is where things stand.
// y: height off the floor for things that sit on top of something else.
const PLAN_FURNITURE = [
  // bedroom
  { id: 'bed', label: 'Кровать', ...r(0.04, 1.0, 2.4, 4.4) },
  { id: 'bedroomCloset', label: 'Шкаф', ...r(0.04, 1.3, 4.9, 5.48) },
  { id: 'desk', label: 'Стол с компом', ...r(0.6, 1.9, 0.12, 0.72) },
  // living room
  { id: 'sofa', label: 'Диван', ...r(2.45, 3.3, 1.2, 3.2) },
  { id: 'partyTable', label: 'Праздничный стол', ...r(3.55, 4.55, 2.2, 3.2) },
  { id: 'stenka', label: 'Стенка + телик', ...r(5.0, 5.46, 1.6, 3.9) },
  { id: 'ficus', label: 'Фикус', ...r(5.05, 5.4, 0.08, 0.4) },
  // kitchen
  { id: 'fridge', label: 'Холодильник', ...r(5.62, 6.18, 1.3, 1.88) },
  { id: 'counter', label: 'Тумба с ящиками', ...r(6.18, 7.52, 1.3, 1.88) },
  { id: 'microwave', label: 'Микроволновка', ...r(6.3, 6.75, 1.48, 1.85), y: 0.88, onTop: true },
  { id: 'sink', label: 'Раковина', ...r(7.52, 8.08, 0.95, 1.88) },
  { id: 'stove', label: 'Плита', ...r(7.52, 8.08, 0.3, 0.95) },
  { id: 'kitchenTable', label: 'Стол', ...r(6.05, 6.8, 0.08, 0.68) },
  // bathroom (combined)
  { id: 'tub', label: 'Ванна', ...r(6.35, 8.08, 2.5, 3.2) },
  { id: 'bathSink', label: 'Раковина', ...r(7.35, 7.85, 2.04, 2.45) },
  { id: 'toilet', label: 'Унитаз', ...r(7.1, 7.5, 3.55, 4.11) },
  // hall
  { id: 'wardrobe', label: 'Гардероб', ...r(6.55, 7.7, 4.25, 4.8) },
];

// Where Oleg starts: in the hall by the front door, facing the living room.
const PLAN_START = { x: 7.6, z: 4.9, yaw: Math.PI / 2 };

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
export const FURNITURE = PLAN_FURNITURE.map((f) => ({ ...f, ...mrect(f) }));
export const SPOTS = Object.fromEntries(Object.entries(PLAN_SPOTS).map(([k, p]) => [k, mpt(p)]));
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
