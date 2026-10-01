// What a 24/7 kiosk sells, made to read at a glance instead of coloured blocks:
// bottles with real profiles (vodka, beer, cognac) and paper labels, a cigarette wall with
// price tags, packs of pelmeni and bags of сухарики with printed fronts.
// Everything is built as plain geometry in world space and merged per material by the caller.
import * as THREE from 'three';
import { mat } from './apartment.js';

// ---------- bottles ----------
// lathe profiles: [radius, height] from the bottom up (metres, real size)
const PROFILES = {
  vodka: [[0, 0], [0.034, 0], [0.036, 0.008], [0.036, 0.19], [0.03, 0.22], [0.015, 0.25], [0.012, 0.285], [0.014, 0.3], [0, 0.3]],
  beer: [[0, 0], [0.031, 0], [0.033, 0.008], [0.033, 0.14], [0.028, 0.17], [0.014, 0.2], [0.012, 0.235], [0.014, 0.25], [0, 0.25]],
  cognac: [[0, 0], [0.044, 0], [0.046, 0.01], [0.046, 0.15], [0.03, 0.18], [0.016, 0.2], [0.015, 0.245], [0, 0.245]],
};
const LABEL = { vodka: [0.07, 0.15, 0.037], beer: [0.05, 0.11, 0.034], cognac: [0.06, 0.12, 0.047] }; // [y0, y1, r]
const lathe = {};
const bottleGeo = (kind) => (lathe[kind] ??= new THREE.LatheGeometry(PROFILES[kind].map(([r, y]) => new THREE.Vector2(r, y)), 12));
const labelGeo = (kind) => {
  const [y0, y1, r] = LABEL[kind];
  return new THREE.CylinderGeometry(r, r, y1 - y0, 12, 1, true).translate(0, (y0 + y1) / 2, 0);
};

export const GLASS = {
  clear: () => new THREE.MeshStandardMaterial({ color: '#d6e6ea', roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.6 }),
  brown: () => mat('#4a2208', { roughness: 0.15, metalness: 0.1 }),
  green: () => mat('#1d4f26', { roughness: 0.15, metalness: 0.1 }),
  amber: () => mat('#7a3d0e', { roughness: 0.12, metalness: 0.1 }),
};

// a bucket of geometries per material name; the caller merges and adds them
export class Batch {
  constructor() {
    this.parts = new Map();
  }
  put(key, geo) {
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(geo);
  }
  bottle(kind, glass, label, x, y, z) {
    this.put(glass, bottleGeo(kind).clone().translate(x, y, z));
    this.put(label, labelGeo(kind).translate(x, y, z));
  }
}

// ---------- printed things (canvas textures) ----------
const tex = {};
function canvasTex(key, w, h, draw) {
  if (tex[key]) return tex[key];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (tex[key] = t);
}

// one shelf row of cigarette packs with yellow price tags under them
export const cigarettes = (seed = 0) =>
  canvasTex(`cig${seed}`, 512, 96, (g, w, h) => {
    g.fillStyle = '#2b2622';
    g.fillRect(0, 0, w, h);
    const brands = ['#b3102a', '#1d3f8f', '#c9a227', '#161616', '#8a8f96', '#0f6b3a', '#5e1d52', '#d8d2c4'];
    const pw = 22, gap = 6;
    for (let i = 0, x = 4; x + pw < w; i++, x += pw + gap) {
      const c = brands[(i * 3 + seed * 5 + (i % 4 === 0 ? 1 : 0)) % brands.length];
      for (const y of [6, 36]) { // two packs stacked
        g.fillStyle = '#efebe1';
        g.fillRect(x, y, pw, 28);
        g.fillStyle = c;
        g.fillRect(x, y, pw, 11);
        g.fillRect(x + 7, y + 15, 8, 8);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(x + pw - 3, y, 3, 28);
      }
      if (i % 2 === 0) {
        g.fillStyle = '#f2d23a';
        g.fillRect(x, 70, pw * 2 + gap - 2, 18);
        g.fillStyle = '#1b1408';
        g.font = 'bold 14px Arial';
        g.fillText(String(180 + ((i * 37 + seed * 11) % 140)), x + 6, 84);
      }
    }
  });

export const pelmeniPack = () =>
  canvasTex('pelmeni', 64, 96, (g, w, h) => {
    g.fillStyle = '#eef3fb';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2350a8';
    g.fillRect(0, 0, w, 30);
    g.fillRect(0, h - 10, w, 10);
    g.fillStyle = '#fff';
    g.font = 'bold 11px Arial';
    g.fillText('ПЕЛЬМЕНИ', 4, 20);
    g.fillStyle = '#e8d9b0'; // the pelmeni in the window
    for (const [x, y] of [[18, 52], [38, 50], [28, 66], [46, 68], [14, 72]]) {
      g.beginPath();
      g.ellipse(x, y, 8, 6, 0, 0, Math.PI * 2);
      g.fill();
    }
  });

export const chipsBag = () =>
  canvasTex('chips', 64, 96, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#f0a020');
    gr.addColorStop(1, '#c4561a');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b3102a';
    g.fillRect(0, 22, w, 20);
    g.fillStyle = '#fff';
    g.font = 'bold 10px Arial';
    g.fillText('СУХАРИКИ', 4, 36);
    g.fillStyle = '#e8c47a';
    for (const [x, y] of [[16, 62], [34, 70], [48, 58], [24, 80]]) g.fillRect(x, y, 9, 7);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(0, 0, w, 5);
    g.fillRect(0, h - 5, w, 5);
  });

// a small printed sign: dark plate, light letters
export const signText = (text, { bg = '#1b1c20', fg = '#f2d23a', w = 512, h = 64 } = {}) =>
  canvasTex(`sign:${text}`, w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = `bold ${Math.round(h * 0.55)}px Arial`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
