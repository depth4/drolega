// Low-poly people, the cat, floating labels and small props (puddles, toy, table bottles).
// People face local +z (Object3D.lookAt points +z at the target).
import * as THREE from 'three';
import { mat } from './apartment.js';

export function textSprite(text, { bg = 'rgba(20,18,24,0.78)', fg = '#fff', size = 40, scale = 0.001 } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = `bold ${size}px "Russo One", "Arial", sans-serif`;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + size;
  c.width = w;
  c.height = Math.ceil(size * 1.5);
  g.font = font;
  g.fillStyle = bg;
  const r = c.height / 2;
  g.beginPath();
  g.roundRect(0, 0, c.width, c.height, r);
  g.fill();
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // constant on-screen size, so a friend standing next to you doesn't get a giant name tag
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true, sizeAttenuation: false }));
  sprite.scale.set(c.width * scale, c.height * scale, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function makePerson({ name, shirt, pants = '#2b2f3a', skin = '#e2b594', hair = '#3b2a1e', label = true }) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const m = { shirt: mat(shirt, { roughness: 0.9 }), pants: mat(pants, { roughness: 0.9 }), skin: mat(skin, { roughness: 0.7 }), hair: mat(hair) };

  const hips = new THREE.Group();
  hips.position.y = 0.82;
  body.add(hips);
  const legs = new THREE.Group();
  hips.add(legs);
  for (const x of [-0.09, 0.09]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.82, 0.15).translate(0, -0.41, 0), m.pants);
    leg.position.x = x;
    legs.add(leg);
  }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.36, 4, 10).translate(0, 0.33, 0), m.shirt);
  torso.scale.z = 0.7;
  hips.add(torso);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.26, 0.58, 0);
    arm.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.12).translate(0, -0.3, 0), m.shirt));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6).translate(0, -0.62, 0), m.skin);
    arm.add(hand);
    hips.add(arm);
    arms.push(arm);
  }
  const head = new THREE.Group();
  head.position.y = 0.88;
  hips.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), m.skin));
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.147, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2).rotateX(-0.25), m.hair));
  const eye = mat('#111');
  for (const x of [-0.05, 0.05]) head.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6).translate(x, 0.02, 0.13), eye));

  let nameTag = null;
  if (label) {
    nameTag = textSprite(name);
    nameTag.position.y = 1.95;
    root.add(nameTag);
  }
  let bubble = null;
  let bubbleText = null;

  let pose = 'stand';
  const person = {
    root,
    body,
    arms,
    setPose(p, y = 0) {
      pose = p;
      body.rotation.set(0, 0, 0);
      body.position.set(0, 0, 0);
      legs.rotation.x = 0;
      arms.forEach((a) => (a.rotation.x = 0));
      if (p === 'sit') {
        body.position.y = -0.37 + y;
        legs.rotation.x = -Math.PI / 2;
      } else if (p === 'lie') {
        body.rotation.x = -Math.PI / 2;
        body.position.y = y + 0.12;
        body.position.z = 0.8;
      }
      if (nameTag) nameTag.position.y = p === 'lie' ? 1.1 + y : p === 'sit' ? 1.6 + y : 1.95;
      if (bubble) bubble.position.y = nameTag.position.y + 0.28;
    },
    setStatus(text, color = '#c0392b') {
      if (text === bubbleText) return;
      bubbleText = text;
      if (bubble) {
        root.remove(bubble);
        bubble.material.map.dispose();
        bubble = null;
      }
      if (!text) return;
      bubble = textSprite(`! ${text}`, { bg: color, size: 36 });
      bubble.position.y = (nameTag?.position.y ?? 1.9) + 0.28;
      root.add(bubble);
    },
    animate(t, walking, extra = 0) {
      if (pose === 'stand' && walking) {
        const s = Math.sin(t * 9);
        legs.children[0].rotation.x = s * 0.5;
        legs.children[1].rotation.x = -s * 0.5;
        arms[0].rotation.x = -s * 0.4;
        arms[1].rotation.x = s * 0.4;
        body.position.y = Math.abs(Math.cos(t * 9)) * 0.03;
      } else if (pose === 'stand') {
        legs.children[0].rotation.x = legs.children[1].rotation.x = 0;
        arms[0].rotation.x = arms[1].rotation.x = 0;
        body.position.y = 0;
      }
      // idle sway / drunk wobble
      if (pose !== 'lie') hips.rotation.z = Math.sin(t * 1.7) * (0.02 + extra * 0.12);
    },
    get pose() {
      return pose;
    },
  };
  return person;
}

export function makeCat() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = mat('#d98b3a', { roughness: 1 });
  const dark = mat('#8a4f1d', { roughness: 1 });
  body.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.22, 4, 8).rotateX(Math.PI / 2).translate(0, 0.16, 0), fur));
  const head = new THREE.Group();
  head.position.set(0, 0.26, 0.17);
  body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), fur));
  for (const x of [-0.045, 0.045]) {
    head.add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4).translate(x, 0.08, 0), dark));
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4).translate(x * 0.8, 0.015, 0.07), mat('#1b3b1b')));
  }
  const legs = [];
  for (const [x, z] of [[-0.05, 0.1], [0.05, 0.1], [-0.05, -0.1], [0.05, -0.1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12).translate(0, -0.06, 0), fur);
    leg.position.set(x, 0.12, z);
    body.add(leg);
    legs.push(leg);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 0.28).translate(0, 0.14, 0), dark);
  tail.position.set(0, 0.2, -0.17);
  tail.rotation.x = -0.6;
  body.add(tail);

  const tag = textSprite('Кот', { size: 34 });
  tag.position.y = 0.6;
  root.add(tag);
  let bubble = null, bubbleText = null;
  return {
    root,
    setStatus(text, color = '#c0392b') {
      if (text === bubbleText) return;
      bubbleText = text;
      if (bubble) {
        root.remove(bubble);
        bubble = null;
      }
      if (!text) return;
      bubble = textSprite(`! ${text}`, { bg: color, size: 34 });
      bubble.position.y = 0.85;
      root.add(bubble);
    },
    animate(t, walking) {
      const s = walking ? Math.sin(t * 14) * 0.5 : 0;
      legs[0].rotation.x = legs[3].rotation.x = s;
      legs[1].rotation.x = legs[2].rotation.x = -s;
      tail.rotation.z = Math.sin(t * 3) * 0.4;
    },
  };
}

export function makePuddle(x, z) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 16).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#9aa53a', roughness: 0.15, transparent: true, opacity: 0.85 }),
  );
  mesh.scale.set(1 + Math.random() * 0.4, 1, 0.7 + Math.random() * 0.4);
  mesh.position.set(x, 0.008 + Math.random() * 0.002, z);
  return mesh;
}

export function makeToy() {
  const g = new THREE.Group();
  const grey = mat('#8d8d8d', { roughness: 1 });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8).scale(1, 0.7, 1.5).translate(0, 0.035, 0), grey));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4).translate(-0.025, 0.07, 0.05), mat('#e0a0a0')));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4).translate(0.025, 0.07, 0.05), mat('#e0a0a0')));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14).rotateX(Math.PI / 2).translate(0, 0.02, -0.13), mat('#d05050')));
  return g;
}

export function makeBottle(kind) {
  const g = new THREE.Group();
  const color = kind === 'vodka' ? '#dfe9ee' : '#3c6e2d';
  const glass = new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10).translate(0, 0.1, 0), glass));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.08, 10).translate(0, 0.24, 0), glass));
  return g;
}

export function makePlate() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.02, 16).translate(0, 0.01, 0), mat('#f7f7f2', { roughness: 0.3 })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1).translate(0, 0.02, 0), mat('#e8d9a0'))); // olivier
  return g;
}

// Broken marker: a crooked red cross floating over the item
export function makeBrokenMark() {
  const g = new THREE.Group();
  const red = new THREE.MeshBasicMaterial({ color: '#ff3b30' });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05).rotateZ(Math.PI / 4), red));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05).rotateZ(-Math.PI / 4), red));
  return g;
}
