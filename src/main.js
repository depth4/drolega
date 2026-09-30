import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildApartment } from './world/apartment.js';
import { buildFurniture } from './world/furniture.js';
import { roomAt, START, DOORCAM, SPOTS, CENTER } from './world/layout.js';
import { Game } from './game/game.js';
import { Player } from './player.js';
import { makeFX } from './fx.js';
import { createHUD } from './ui/hud.js';
import * as audio from './audio.js';
import { TUNE, BIRTHDAY } from './config.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

// ---------- renderer & scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('app').appendChild(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0f1c');

const camera = new THREE.PerspectiveCamera(80, innerWidth / innerHeight, 0.05, 200);
const orbitCam = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
const doorCam = new THREE.PerspectiveCamera(80, 4 / 3, 0.05, 50);
doorCam.position.set(...DOORCAM.pos);
doorCam.lookAt(...DOORCAM.look);

const apt = buildApartment();
const furn = buildFurniture();
scene.add(apt.group, furn.group);

const game = new Game({ scene, apt, furn, sfx: audio.sfx, voices: audio.voices });
const player = new Player(camera, [...apt.colliders, ...furn.colliders]);
const fx = makeFX(renderer, scene, camera);
const hud = createHUD({ onBuy: (id) => game.buy(id) });
window.__game = game; // handy in the console
window.__player = player;
window.__spots = SPOTS;
window.__three = THREE; // debugging: raycasts from the console

const orbit = new OrbitControls(orbitCam, canvas);
orbit.target.set(CENTER.x, 0, CENTER.z);
orbit.enableDamping = true;
orbit.enabled = false;

// ---------- modes ----------
let mode = 'menu'; // menu | play | orbit | end
let started = false;
let phoneOpen = false;
let locked = false;
let dragging = false;

const isTouchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
if (isTouchOnly) {
  $('btn-play').disabled = true;
  $('mobile-note').hidden = false;
}

function show(id, v) {
  $(id).hidden = !v;
}

function startNight(n) {
  game.startNight(n);
  player.place(START.x, START.z, START.yaw);
  hud.reset();
  started = true;
}

function lock() {
  try {
    canvas.requestPointerLock()?.catch?.(() => {});
  } catch {
    /* pointer lock is optional: drag to look instead */
  }
}

function play() {
  audio.init();
  if (!started || game.over) startNight(game.over?.win ? game.night + 1 : game.night);
  mode = 'play';
  show('menu', false);
  show('end', false);
  show('orbit-bar', false);
  show('hud', true);
  orbit.enabled = false;
  apt.ceiling.visible = true;
  lock();
}

function pause() {
  mode = 'menu';
  setPhone(false, false);
  $('btn-play').textContent = started && !game.over ? 'Продолжить' : `Начать ночь ${game.night}`;
  show('menu', true);
  show('hud', false);
}

function toOrbit() {
  mode = 'orbit';
  show('menu', false);
  show('hud', false);
  show('orbit-bar', true);
  orbit.enabled = true;
  apt.ceiling.visible = false;
  if (params.get('view') === 'top') {
    orbitCam.position.set(CENTER.x, 17, CENTER.z);
  } else orbitCam.position.set(CENTER.x, 12, CENTER.z + 11);
  orbitCam.lookAt(orbit.target);
}

function setPhone(open, relock = true) {
  phoneOpen = open;
  show('phone', open);
  if (open) document.exitPointerLock?.();
  else if (relock && mode === 'play') lock();
}

game.onEnd = (res) => {
  mode = 'end';
  setPhone(false, false);
  document.exitPointerLock?.();
  audio.setMusic(false);
  show('hud', false);
  const st = game.state;
  const last = res.win && res.night >= TUNE.nights;
  $('end-night').textContent = `Ночь ${res.night} из ${TUNE.nights}`;
  $('end-title').textContent = last ? BIRTHDAY.title : res.win ? 'Пережил ночь!' : 'Провал';
  $('end-reason').textContent = last ? BIRTHDAY.lines.join(' ') : res.reason;
  $('end-stats').innerHTML = `Помог пацанам: ${st.stats.helped} раз<br>Потрачено на доставку: ${st.stats.spent} ₽ · на взятки: ${st.stats.bribes} ₽<br>Осталось денег: ${st.money} ₽ · хата: ${Math.round(st.hut)}%`;
  $('btn-next').textContent = last ? 'Сначала' : res.win ? `Ночь ${res.night + 1}` : 'Ещё раз';
  if (last) game.night = 0;
  show('end', true);
};

$('btn-play').addEventListener('click', play);
$('btn-orbit').addEventListener('click', toOrbit);

// character look: cube heads with photo faces, or Doom-style pixel sprites
const STYLE_NAMES = { box: 'Бошки: кубы', sprite: 'Бошки: плоские (как в Doom)' };
function setStyle(style) {
  game.restyle(style);
  $('btn-style').textContent = STYLE_NAMES[style];
  try {
    localStorage.setItem('oleg-style', style);
  } catch {
    /* no storage: the choice just isn't remembered */
  }
}
$('btn-style').addEventListener('click', () => setStyle(game.style === 'box' ? 'sprite' : 'box'));
$('btn-back').addEventListener('click', pause);
$('btn-next').addEventListener('click', () => {
  const win = game.over?.win;
  game.over = null;
  startNight(win ? game.night + 1 : game.night);
  play();
});
$('btn-menu').addEventListener('click', () => {
  game.over = null;
  started = false;
  pause();
});
$('phone-close').addEventListener('click', () => setPhone(false));

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && mode === 'play' && !phoneOpen) pause();
});
document.addEventListener('mousemove', (e) => {
  if (mode !== 'play' || phoneOpen) return;
  if ((locked || dragging) && !game.talkLocked) player.look(e.movementX, e.movementY);
});
canvas.addEventListener('mousedown', () => {
  if (mode === 'play' && !locked && !phoneOpen) dragging = true;
});
addEventListener('mouseup', () => (dragging = false));
addEventListener('wheel', (e) => mode === 'play' && game.inv.select(game.inv.sel + Math.sign(e.deltaY)));

let currentActions = [];
addEventListener('keydown', (e) => {
  if (mode !== 'play') return;
  player.keys.add(e.code);
  if (e.repeat) return;
  const k = e.code;
  if (k === 'KeyF') return setPhone(!phoneOpen);
  if (k === 'Escape') return phoneOpen ? setPhone(false) : pause();
  if (phoneOpen || game.oleg.blackout > 0 || game.talkLocked) return;
  if (k.startsWith('Digit')) {
    const n = Number(k.slice(5));
    if (n >= 1 && n <= 4) game.inv.select(n - 1);
  }
  if (k === 'KeyQ') game.useSelf();
  if (k === 'KeyG') game.inv.drop();
  const key = { KeyE: 'E', KeyR: 'R', KeyT: 'T' }[k];
  const act = key && currentActions.find((a) => a.key === key);
  if (act) {
    act.run();
    audio.sfx.click();
  }
});
addEventListener('keyup', (e) => player.keys.delete(e.code));
addEventListener('blur', () => player.keys.clear());

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  fx.setSize(innerWidth, innerHeight);
  for (const c of [camera, orbitCam]) {
    c.aspect = innerWidth / innerHeight;
    c.updateProjectionMatrix();
  }
});

// ---------- looking at things ----------
const ray = new THREE.Raycaster();
ray.far = 2.4;
ray.camera = camera;
const center = new THREE.Vector2(0, 0);
const pickRoots = [apt.group, furn.group, game.dynamic];
function visibleChain(o) {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}
function findTarget() {
  ray.setFromCamera(center, camera);
  for (const hit of ray.intersectObjects(pickRoots, true)) {
    if (!visibleChain(hit.object)) continue;
    if (hit.object.isSprite && !hit.object.parent?.userData.target) continue; // labels don't block
    for (let o = hit.object; o; o = o.parent) if (o.userData.target) return o.userData.target;
    return null; // a wall or something without a target is in the way
  }
  return null;
}

// ---------- loop ----------
const camCanvas = $('cam-canvas');
const camCtx = camCanvas.getContext('2d');
let last = performance.now();
let time = 0;
let drunkFx = 0;
let blackFx = 0;
let hudT = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;

  if (mode === 'play') {
    game.update(dt);
    // listening to a story: Oleg turns to the guy and can't walk away until the lock ends
    const listening = game.talkLocked;
    if (listening) {
      const [fx, fz] = game.talk.friend.pos;
      const want = Math.atan2(-(fx - player.x), -(fz - player.z));
      let dy = want - player.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      player.yaw += dy * Math.min(1, dt * 6);
      player.pitch += (-0.12 - player.pitch) * Math.min(1, dt * 4);
    }
    player.update(dt, { drunk: game.oleg.drunk, canMove: !phoneOpen && !(game.oleg.blackout > 0) && !listening });
    game.olegPos = [player.x, player.z];
    const target = phoneOpen ? null : findTarget();
    currentActions = target?.actions?.() ?? [];
    hudT -= dt;
    if (hudT <= 0 || target !== hud.lastTarget) {
      hudT = 0.1;
      hud.lastTarget = target;
      hud.update(game, { roomName: roomAt(player.x, player.z)?.name, target, actions: currentActions });
    }
    audio.setMusic(game.state.music);
    audio.voices.update([player.x, player.z]);
  } else {
    audio.setMusic(false);
    audio.voices.stopAll();
    if (mode === 'orbit') orbit.update();
    else if (mode === 'menu' || mode === 'end') player.update(0);
  }

  drunkFx += ((mode === 'play' ? game.oleg.drunk / 100 : 0) - drunkFx) * Math.min(1, dt * 2);
  blackFx += ((mode === 'play' && game.oleg.blackout > 0 ? 1 : 0) - blackFx) * Math.min(1, dt * 3);
  fx.set(time, drunkFx, blackFx);

  if (mode === 'orbit') renderer.render(scene, orbitCam);
  else fx.render();

  const r = mode === 'play' && hud.camRect();
  if (r) {
    doorCam.aspect = r.width / r.height;
    doorCam.updateProjectionMatrix();
    const y = innerHeight - r.bottom;
    renderer.setScissorTest(true);
    renderer.setScissor(r.left, y, r.width, r.height);
    renderer.setViewport(r.left, y, r.width, r.height);
    renderer.render(scene, doorCam);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, innerWidth, innerHeight);
    // the phone body covers that part of the canvas, so copy the picture into the phone's own canvas
    const pr = renderer.getPixelRatio();
    const w = Math.round(r.width * pr), h = Math.round(r.height * pr);
    if (camCanvas.width !== w || camCanvas.height !== h) [camCanvas.width, camCanvas.height] = [w, h];
    camCtx.drawImage(canvas, r.left * pr, r.top * pr, w, h, 0, 0, w, h);
  }
  requestAnimationFrame(frame);
}

// ---------- boot ----------
try {
  game.style = params.get('heads') ?? localStorage.getItem('oleg-style') ?? 'box';
} catch {
  game.style = params.get('heads') ?? 'box';
}
if (!STYLE_NAMES[game.style]) game.style = 'box';
$('btn-style').textContent = STYLE_NAMES[game.style];
startNight(Number(params.get('night')) || 1);
started = false; // the menu offers "start", not "continue"
player.update(0);
if (params.has('x')) player.place(Number(params.get('x')), Number(params.get('z')), (Number(params.get('yaw')) || 0) * (Math.PI / 180));
if (params.has('pitch')) player.pitch = (Number(params.get('pitch')) * Math.PI) / 180;
if (params.has('eye')) {
  // debug: look from any height (e.g. ?eye=6&pitch=-89 for a close top-down view); ceiling hidden above it
  player.eye = Number(params.get('eye'));
  apt.ceiling.visible = player.eye < 2.5;
}
if (params.get('view') === 'orbit' || params.get('view') === 'top') toOrbit();
if (params.has('play')) {
  // screenshot/testing mode: run without pointer lock
  mode = 'play';
  started = true;
  show('menu', false);
  show('hud', true);
  const skip = Number(params.get('t')) || 0;
  for (let s = 0; s < skip; s += 0.05) game.update(0.05);
  if (params.has('phone')) setPhone(true, false);
}
requestAnimationFrame(frame);
