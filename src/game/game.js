// Night simulation: fun, hut condition, money, fridge/table stock, visitors, deliveries,
// puddles, broken things, the stove, the grill, the cat toy and Oleg himself.
import * as THREE from 'three';
import { TUNE } from '../config.js';
import { FURNITURE, TOY_SPOTS, VISITOR_SPOT, CAT_SPOTS, roomAt } from '../world/layout.js';
import { makePerson, makePuddle, makeToy, makeBottle, makePlate, makeBrokenMark } from '../world/figures.js';
import { Friend, Cat, clamp, rand } from './friends.js';
import { particles } from '../world/particles.js';

export const ITEMS = {
  beer: { name: 'Пиво', icon: '🍺' },
  vodka: { name: 'Водка', icon: '🍾' },
  food: { name: 'Еда', icon: '🍕' },
  mop: { name: 'Тряпка', icon: '🧽' },
  tools: { name: 'Инструменты', icon: '🔧' },
  toy: { name: 'Мышка', icon: '🐭' },
};

const FRIEND_IDS = ['alexey', 'lyokha', 'kirill', 'temych'];
const BREAKABLE = ['stenka', 'ficus', 'microwave', 'sisterDesk', 'kitchenTable', 'wardrobe', 'loftBed', 'olegBed', 'sofa'];

class Inventory {
  constructor(game) {
    this.game = game;
    this.slots = [null, null, null, null];
    this.sel = 0;
  }
  selectedItem() {
    return this.slots[this.sel];
  }
  has(type) {
    return this.slots.includes(type);
  }
  add(type) {
    const i = this.slots.indexOf(null);
    if (i < 0) {
      this.game.toast('Руки заняты — освободи слот (G — выбросить)', 'warn');
      return false;
    }
    this.slots[i] = type;
    if (!this.slots[this.sel]) this.sel = i;
    return true;
  }
  consume() {
    this.slots[this.sel] = null;
  }
  remove(type) {
    const i = this.slots.indexOf(type);
    if (i >= 0) this.slots[i] = null;
  }
  select(i) {
    this.sel = (i + this.slots.length) % this.slots.length;
  }
  drop() {
    const item = this.slots[this.sel];
    if (!item) return;
    this.slots[this.sel] = null;
    if (item === 'toy') this.game.respawnToy();
    else if (['beer', 'vodka', 'food'].includes(item)) this.game.state.fridge[item] += 1; // back to the fridge
  }
}

export class Game {
  constructor({ scene, apt, furn, sfx, voices }) {
    this.scene = scene;
    this.voices = voices;
    this.apt = apt;
    this.furn = furn;
    this.doors = apt.doors;
    this.sfx = sfx;
    this.dynamic = new THREE.Group();
    scene.add(this.dynamic);
    particles.attach(scene);
    this.toasts = [];
    this.toastKeys = {};
    this.onEnd = null;
    this.night = 1;
    this.style = 'box';
    this.friends = [];
    this.inv = new Inventory(this);
    this.olegPos = [0, 0];

    this.buildStaticTargets();
    this.buildTableProps();
    this.buildStoveProps();
    this.buildGrillProps();
    this.toy = makeToy();
    this.toy.userData.target = { name: 'Мышка кота', actions: () => [{ key: 'E', text: 'Взять мышку', run: () => this.inv.add('toy') && (this.toy.visible = false) }] };
    this.dynamic.add(this.toy);
  }

  // problem frequency: grows each night, and every night starts calm and ramps up (TUNE.warmup)
  // swap every guy's look between 'box' (cube heads) and 'sprite' (Doom-style billboards)
  restyle(style) {
    this.style = style;
    for (const f of this.friends) {
      const old = f.figure;
      const nf = makePerson({ ...f.def, style, faceId: f.id });
      nf.root.position.copy(old.root.position);
      nf.root.rotation.copy(old.root.rotation);
      nf.root.userData = old.root.userData;
      nf.setPose(old.pose, f.y);
      if (f.problem) nf.setStatus(f.problem.short);
      this.dynamic.remove(old.root);
      this.dynamic.add(nf.root);
      f.figure = nf;
    }
  }

  get diff() {
    const W = TUNE.warmup;
    const ramp = Math.min(1, Math.max(0, (this.state.t - W.calm) / W.ramp));
    return (TUNE.baseDifficulty + (this.night - 1) * TUNE.difficultyPerNight) * (W.min + (1 - W.min) * ramp);
  }

  // ---------- night lifecycle ----------

  startNight(n) {
    this.night = n;
    this.voices?.stopAll();
    this.talk = null;
    this.reactCd = 0;
    this.olegCoughT = 0;
    const S = TUNE.start;
    this.state = {
      t: 0,
      totalFun: S.totalFun,
      hut: S.hut,
      money: S.money,
      fridge: { ...S.fridge },
      table: { ...S.table },
      music: false,
      noise: 0,
      anger: 0,
      neighborCd: 10,
      policeVisits: 0,
      stats: { helped: 0, bribes: 0, spent: 0 },
    };
    this.oleg = { fun: 80, drunk: 0, blackout: 0 };
    this.inv = new Inventory(this);
    this.toasts = [];
    this.toastKeys = {};
    this.over = null;
    this.orders = [];
    this.visitor?.figure && this.dynamic.remove(this.visitor.figure.root);
    this.visitor = null;
    this.visitorQueue = [];
    this.pending = [];
    this.stove = { phase: 'idle', t: 0 };
    this.grill = { lit: false, heat: 0 };
    particles.clear();
    for (const p of this.puddles ?? []) this.dynamic.remove(p);
    this.puddles = [];
    for (const it of Object.values(this.furn.items)) this.setBroken(it, false);

    for (const f of this.friends) this.dynamic.remove(f.figure.root);
    this.friends = FRIEND_IDS.map((id) => new Friend(this, id));
    for (const f of this.friends) {
      this.dynamic.add(f.figure.root);
      f.figure.root.userData.target = { name: f.name, friend: f, actions: () => f.actions(this) };
    }
    if (this.cat) this.dynamic.remove(this.cat.figure.root);
    this.cat = new Cat(this);
    this.cat.figure.root.userData.target = { name: 'Кот', cat: this.cat, actions: () => this.cat.actions(this) };
    this.dynamic.add(this.cat.figure.root);

    this.doors.balcony.setOpen(true);
    this.doors.bath.setOpen(true);
    this.doors.entrance.setOpen(false);
    this.lastToy = -1;
    this.respawnToy();
    this.alert(`Ночь ${n}. Пацаны пришли. Продержись до 06:00`, null, 'info');
  }

  // how close the neighbours are to knocking, 0..1
  get noiseLevel() {
    const N = TUNE.noise;
    return Math.min(1, this.state.noise / Math.max(10, N.neighborAt - this.state.anger * N.angerStep));
  }

  get clock() {
    const mins = 22 * 60 + (this.state.t / TUNE.nightSeconds) * 8 * 60;
    const h = Math.floor(mins / 60) % 24, m = Math.floor(mins % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  gameMinutes(sec) {
    return Math.round((sec * 480) / TUNE.nightSeconds);
  }

  // ---------- messages ----------

  toast(text, kind = 'info', room = null) {
    this.toasts.push({ text, kind, room, life: kind === 'alert' ? 5 : 3.5 });
    if (this.toasts.length > 3) this.toasts.shift();
  }
  alert(text, room, kind = 'alert') {
    this.toast(text, kind, room);
    if (kind === 'alert') this.sfx.alarm();
  }
  toastOnce(key, text, kind, cooldown) {
    const now = this.state.t;
    if (this.toastKeys[key] !== undefined && now - this.toastKeys[key] < cooldown) return;
    this.toastKeys[key] = now;
    this.toast(text, kind);
  }
  olegHelped() {
    this.oleg.fun += TUNE.fun.helpBonus;
    this.state.stats.helped += 1;
  }

  // ---------- world helpers ----------

  tableBooze() {
    return this.state.table.beer + this.state.table.vodka;
  }

  bathOccupied(except) {
    const bathClosed = !this.doors.bath.open;
    return this.friends.some(
      (f) =>
        f !== except &&
        (f.activity?.id === 'toilet' ||
          (f.mode === 'walk' && f.target?.id === 'toilet') ||
          (f.activity?.id === 'vape' && f.activity.spot.id === 'bathStand' && bathClosed) ||
          (f.problem?.id === 'puke' && f.room?.id === 'bath')),
    );
  }

  addPuddle(x, z) {
    const room = roomAt(x, z);
    if (!room || room.id === 'landing') return;
    const p = makePuddle(x, z);
    p.userData.target = {
      name: 'Блевота',
      info: () => (this.inv.has('mop') ? '' : 'Нужна тряпка — висит у раковины в санузле'),
      actions: () =>
        this.inv.selectedItem() === 'mop' || this.inv.has('mop')
          ? [{
              key: 'E', text: 'Убрать тряпкой',
              run: () => {
                this.dynamic.remove(p);
                this.puddles = this.puddles.filter((q) => q !== p);
                this.state.hut += TUNE.hut.clean;
              },
            }]
          : [],
    };
    this.dynamic.add(p);
    this.puddles.push(p);
    this.toast(`Блевота: ${room.name}`, 'bad', room.name);
  }

  setBroken(item, v) {
    item.broken = v;
    if (v && !item.mark) {
      item.mark = makeBrokenMark();
      item.mark.position.set((item.x0 + item.x1) / 2, 1.3, (item.z0 + item.z1) / 2);
      this.dynamic.add(item.mark);
    }
    if (!v && item.mark) {
      this.dynamic.remove(item.mark);
      item.mark = null;
    }
  }

  breakSomething(roomId) {
    const items = BREAKABLE.map((id) => this.furn.items[id]).filter((it) => it && !it.broken);
    const inRoom = items.filter((it) => roomAt((it.x0 + it.x1) / 2, (it.z0 + it.z1) / 2)?.id === roomId);
    const pool = inRoom.length ? inRoom : items;
    if (!pool.length) return;
    const it = pool[Math.floor(Math.random() * pool.length)];
    this.setBroken(it, true);
    this.state.hut -= TUNE.hut.smash;
    this.state.noise += TUNE.noise.smashHit;
    this.sfx.crash();
    this.alert(`Лёха сломал: ${it.label}`, roomAt((it.x0 + it.x1) / 2, (it.z0 + it.z1) / 2)?.name);
  }

  respawnToy() {
    let i;
    do i = Math.floor(Math.random() * TOY_SPOTS.length);
    while (i === this.lastToy && TOY_SPOTS.length > 1);
    this.lastToy = i;
    const s = TOY_SPOTS[i];
    this.toy.position.set(s.p[0], s.y + 0.005, s.p[1]);
    this.toy.rotation.y = Math.random() * Math.PI * 2;
    this.toy.visible = true;
  }

  fanGrill() {
    this.grill.heat = 100;
    this.sfx.whoosh();
  }

  catFell() {
    const c = this.cat;
    c.gone = true;
    c.clearProblem(false);
    c.figure.root.visible = false;
    this.state.totalFun -= TUNE.cat.fallPenalty;
    for (const f of this.friends) f.fun -= 15;
    this.alert('КОТ ВЫПАЛ С БАЛКОНА!', 'Балкон');
    this.pending.push({
      at: this.state.t + 20,
      fn: () =>
        this.queueVisitor({
          type: 'cat', name: 'Соседка с котом', shirt: '#8e6c8a', patience: 30,
          onOpen: () => {
            c.gone = false;
            c.figure.root.visible = true;
            c.fun = 50;
            c.path = null;
            c.mode = 'idle';
            c.place(CAT_SPOTS.catHall);
            this.toast('Соседка принесла кота. Живой! Третий этаж, кусты', 'good');
          },
          onTimeout: () => this.toast('Соседка ушла с котом… придёт ещё', 'bad'),
          retry: true,
        }),
    });
  }

  // ---------- Oleg ----------

  useSelf() {
    const item = this.inv.selectedItem();
    const d = TUNE.give[item];
    if (!d) return;
    this.inv.consume();
    this.oleg.fun += d.fun;
    this.oleg.drunk = clamp(this.oleg.drunk + d.drunk);
    this.sfx.gulp();
    if (this.oleg.drunk >= TUNE.oleg.blackoutAt) {
      this.oleg.blackout = TUNE.oleg.blackoutSeconds;
      this.alert('Олег вырубился…', null);
    }
  }

  // ---------- visitors & delivery ----------

  queueVisitor(v, urgent = false) {
    if (urgent) this.visitorQueue.unshift(v);
    else this.visitorQueue.push(v);
  }

  showVisitor(v) {
    v.left = v.patience;
    v.knockT = 0;
    v.figure = makePerson({ name: v.name, shirt: v.shirt, pants: v.pants, style: this.style });
    const [x, z] = VISITOR_SPOT;
    v.figure.root.position.set(x, 0, z);
    const [dx, dz] = this.doors.entrance.center;
    v.figure.root.rotation.y = Math.atan2(dx - x, dz - z);
    this.dynamic.add(v.figure.root);
    this.visitor = v;
    this.alert('Стучат в дверь… (глянь в камеру: F)', 'Прихожая');
    // the party reacts to the knocking (neighbours / police)
    if (v.type === 'neighbor' || v.type === 'police') {
      const t = this.furn.items.partyTable;
      setTimeout(() => this.visitor === v && this.voices?.play('event_neighbors', { pos: [(t.x0 + t.x1) / 2, (t.z0 + t.z1) / 2] }), 1600);
    }
  }

  // Oleg listens to a story: stuck facing him for the first part of the clip
  startTalk(friend, h) {
    this.talk = { friend, h, start: this.state.t, dur: null };
    friend.figure.say('…', 4);
  }

  get talkLocked() {
    const k = this.talk;
    if (!k) return false;
    const dur = k.dur ?? 6;
    return this.state.t - k.start < dur * TUNE.talk.lock;
  }

  // somebody near Lyokha reacts to the vomit (not every time)
  reactToPuke(f) {
    if (this.state.t < this.reactCd || Math.random() > 0.6) return;
    this.reactCd = this.state.t + 25;
    setTimeout(() => this.voices?.play('event_puke', { pos: [...f.pos] }), 700);
  }

  dismissVisitor() {
    const v = this.visitor;
    if (!v) return;
    this.visitor = null;
    setTimeout(() => this.dynamic.remove(v.figure.root), 1500);
  }

  openEntrance() {
    const door = this.doors.entrance;
    door.setOpen(true);
    this.entranceCloseT = 2.5;
    const v = this.visitor;
    if (!v) return this.toast('Никого нет', 'info');
    v.onOpen();
    this.dismissVisitor();
  }

  spawnNeighbor() {
    this.queueVisitor({
      type: 'neighbor', name: 'Соседка снизу', shirt: '#a0526b', patience: TUNE.visitors.patience,
      onOpen: () => {
        const st = this.state;
        st.noise = Math.max(0, st.noise - TUNE.noise.calm);
        st.anger += 1;
        st.music = false;
        st.neighborCd = TUNE.noise.cooldown;
        this.toast(`Соседка: «Сделайте потише!» Музыку выключили. Злость соседей: ${st.anger}`, 'warn');
      },
      onTimeout: () => {
        this.alert('Соседи забили на вас и вызвали ментов!', 'Прихожая');
        this.spawnPolice();
      },
    });
  }

  spawnPolice() {
    this.queueVisitor({
      type: 'police', name: 'Участковый', shirt: '#2b3f66', pants: '#1c2436', patience: TUNE.visitors.patience,
      onOpen: () => this.payPolice(false),
      onTimeout: () => {
        this.state.hut -= TUNE.hut.policeBreakIn;
        this.sfx.crash();
        this.alert('Менты выломали дверь!', 'Прихожая');
        this.payPolice(true);
      },
    }, true);
  }

  payPolice(forced) {
    const st = this.state, P = TUNE.police;
    const bribe = Math.round(P.bribe * (1 + P.bribeGrowth * st.policeVisits));
    const paid = Math.min(st.money, bribe);
    st.money -= paid;
    st.stats.bribes += paid;
    st.policeVisits += 1;
    st.anger = 1;
    st.noise = 0;
    st.music = false;
    st.neighborCd = TUNE.noise.cooldown * 1.5;
    if (paid < bribe) {
      st.hut -= 20;
      this.toast(`Денег на взятку не хватило (${paid}₽ из ${bribe}₽). Протокол, хата −20`, 'bad');
    } else this.toast(`${forced ? 'Пришлось' : 'Дал'} взятку ментам: −${bribe}₽`, 'bad');
  }

  buy(id) {
    const item = TUNE.shop.find((s) => s.id === id);
    const st = this.state;
    if (!item || item.soon) return;
    if (st.money < item.price) return this.toast('Не хватает денег', 'bad');
    st.money -= item.price;
    st.stats.spent += item.price;
    const eta = rand(TUNE.delivery.min, TUNE.delivery.max);
    this.orders.push({ title: item.title, gives: item.gives, eta });
    this.sfx.ding();
    this.toast(`Заказ: ${item.title}. Курьер будет через ~${this.gameMinutes(eta)} мин`, 'info');
  }

  // ---------- targets ----------

  buildStaticTargets() {
    const it = this.furn.items;
    const T = (id, target) => it[id] && (it[id].group.userData.target = { name: it[id].label, ...target, item: it[id] });
    const fr = () => this.state.fridge;

    T('fridge', {
      info: () => `Пиво ${fr().beer} · Водка ${fr().vodka} · Еда ${fr().food} · Пельмени ${fr().pelmeni}`,
      actions: () => [
        fr().beer > 0 && { key: 'E', text: 'Взять пиво', run: () => this.inv.add('beer') && fr().beer-- },
        fr().vodka > 0 && { key: 'R', text: 'Взять водку', run: () => this.inv.add('vodka') && fr().vodka-- },
        fr().food > 0 && { key: 'T', text: 'Взять еду', run: () => this.inv.add('food') && fr().food-- },
      ].filter(Boolean),
    });
    T('partyTable', {
      info: () => {
        const t = this.state.table;
        return `На столе: пиво ${t.beer} · водка ${t.vodka} · еда ${t.food}`;
      },
      actions: () => {
        const item = this.inv.selectedItem();
        const D = TUNE.drink;
        if (item === 'beer') return [{ key: 'E', text: `Поставить пиво (+${D.beer.servings})`, run: () => (this.inv.consume(), (this.state.table.beer += D.beer.servings)) }];
        if (item === 'vodka') return [{ key: 'E', text: `Поставить водку (+${D.vodka.servings})`, run: () => (this.inv.consume(), (this.state.table.vodka += D.vodka.servings)) }];
        if (item === 'food') return [{ key: 'E', text: `Выложить еду (+${D.plates})`, run: () => (this.inv.consume(), (this.state.table.food += D.plates)) }];
        return [];
      },
    });
    T('stenka', {
      actions: () => [{
        key: 'E', text: this.state.music ? 'Выключить музыку' : 'Врубить музыку',
        run: () => {
          if (it.stenka.broken) return this.toast('Музыка сломана — почини', 'warn');
          this.state.music = !this.state.music;
        },
      }],
    });
    T('bathSink', { actions: () => (this.inv.has('mop') ? [] : [{ key: 'E', text: 'Взять тряпку', run: () => this.inv.add('mop') }]) });
    T('wardrobe', { actions: () => (this.inv.has('tools') ? [] : [{ key: 'E', text: 'Взять инструменты', run: () => this.inv.add('tools') }]) });
    T('grill', {
      info: () => (this.grill.lit ? `Жар: ${Math.round(this.grill.heat)}%` : 'Не горит'),
      actions: () => (this.grill.lit ? [{ key: 'E', text: 'Раздуть мангал', run: () => this.fanGrill() }] : []),
    });
    T('stove', {
      info: () =>
        ({
          idle: this.state.fridge.pelmeni ? `Пельмени в холодосе: ${this.state.fridge.pelmeni}` : 'Пельменей нет — закажи',
          cooking: `Варятся… ещё ${Math.ceil(TUNE.stove.cookTime - this.stove.t)} с`,
          ready: 'ГОТОВО! Снимай, пока не сгорели',
        })[this.stove.phase],
      actions: () => {
        if (this.stove.phase === 'idle' && this.state.fridge.pelmeni > 0)
          return [{ key: 'E', text: 'Сварить пельмени', run: () => (this.state.fridge.pelmeni--, (this.stove = { phase: 'cooking', t: 0 })) }];
        if (this.stove.phase === 'ready')
          return [{ key: 'E', text: 'Снять пельмени', run: () => this.inv.add('food') && (this.stove = { phase: 'idle', t: 0 }) }];
        return [];
      },
    });
    // everything else: just a name (plus repair if broken)
    for (const item of Object.values(it)) item.group.userData.target ??= { name: item.label, item };
    for (const item of Object.values(it)) {
      const target = item.group.userData.target;
      const base = target.actions ?? (() => []);
      const baseInfo = target.info;
      target.actions = () => {
        if (!item.broken) return base();
        if (!this.inv.has('tools')) return [];
        return [{
          key: 'R', text: 'Починить',
          run: () => {
            this.setBroken(item, false);
            this.state.hut += TUNE.hut.repair;
            this.olegHelped();
            this.sfx.fix();
          },
        }, ...base().filter((a) => a.key !== 'R')];
      };
      target.info = () => (item.broken ? (this.inv.has('tools') ? 'СЛОМАНО' : 'СЛОМАНО — инструменты в гардеробе') : baseInfo?.() ?? '');
    }

    // doors
    const d = this.doors;
    d.balcony.leaf.userData.target = { name: 'Балконная дверь', actions: () => [{ key: 'E', text: d.balcony.open ? 'Закрыть' : 'Открыть', run: () => d.balcony.toggle() }] };
    d.bath.leaf.userData.target = { name: 'Дверь в санузел', actions: () => [{ key: 'E', text: d.bath.open ? 'Закрыть' : 'Открыть', run: () => d.bath.toggle() }] };
    d.entrance.leaf.userData.target = {
      name: 'Входная дверь',
      info: () => (this.visitor ? 'Кто-то стучит' : ''),
      actions: () => [{ key: 'E', text: 'Открыть дверь', run: () => this.openEntrance() }],
    };
  }

  buildTableProps() {
    const t = this.furn.items.partyTable;
    const cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2;
    const alongZ = t.z1 - t.z0 > t.x1 - t.x0;
    const at = (a, b) => (alongZ ? [cx + b, cz + a] : [cx + a, cz + b]);
    const place = (obj, a, b) => {
      const [x, z] = at(a, b);
      obj.position.set(x, 0.76, z);
      this.dynamic.add(obj);
      return obj;
    };
    this.tableProps = {
      beer: [[-0.4, -0.2], [-0.3, -0.25], [0.35, 0.25], [0.42, 0.18]].map(([a, b]) => place(makeBottle('beer'), a, b)),
      vodka: [[-0.35, 0.22], [0.3, -0.22]].map(([a, b]) => place(makeBottle('vodka'), a, b)),
      food: [[-0.25, 0.05], [0.25, -0.02], [0, 0.28], [0, -0.28]].map(([a, b]) => place(makePlate(), a, b)),
    };
  }

  buildStoveProps() {
    const s = this.furn.items.stove;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.16, 16), new THREE.MeshStandardMaterial({ color: '#b8b8b8', metalness: 0.7, roughness: 0.3 }));
    pot.position.set((s.x0 + s.x1) / 2, 0.95, (s.z0 + s.z1) / 2 + 0.12);
    this.dynamic.add(pot);
    this.stoveProps = { pot };
  }

  buildGrillProps() {
    const g = this.furn.items.grill;
    const light = new THREE.PointLight('#ff7a2a', 0, 3, 2);
    light.position.set((g.x0 + g.x1) / 2, 0.9, (g.z0 + g.z1) / 2);
    this.dynamic.add(light);
    let coals = null;
    g.group.traverse((o) => o.userData.coals && (coals = o));
    this.grillProps = { light, coals };
  }

  // ---------- tick ----------

  update(dt) {
    if (this.over) return;
    const st = this.state;
    st.t += dt;

    for (const p of this.pending.filter((p) => p.at <= st.t)) p.fn();
    this.pending = this.pending.filter((p) => p.at > st.t);

    // story time
    if (this.talk) {
      const k = this.talk;
      const d = k.h.audio.duration;
      if (!k.dur && Number.isFinite(d) && d > 0) {
        k.dur = d;
        k.friend.figure.say('…', d);
      }
      const done = !k.h.playing && st.t - k.start > 0.5;
      if (done || st.t - k.start > (k.dur ?? 6) + 0.3 || k.friend.problem) this.talk = null;
    }

    // Oleg coughs in the smoke: on the balcony by the grill, or next to someone coughing
    const olegRoom = roomAt(this.olegPos[0], this.olegPos[1])?.id;
    const smoky = (olegRoom === 'balcony' && this.grill.lit && !this.doors.balcony.open) ||
      this.friends.some((f) => ['cough', 'choke'].includes(f.problem?.id) && f.room?.id === olegRoom && Math.hypot(f.pos[0] - this.olegPos[0], f.pos[1] - this.olegPos[1]) < 2.5);
    if (smoky && (this.olegCoughT -= dt) <= 0) {
      this.olegCoughT = rand(5, 9);
      this.voices?.play('oleg_cough', { gain: 0.9 });
    } else if (!smoky) this.olegCoughT = Math.min(this.olegCoughT, 1);

    // Oleg
    const o = this.oleg;
    o.fun = clamp(o.fun - TUNE.fun.olegBoredom * dt + (st.music ? 0.2 * dt : 0));
    o.drunk = clamp(o.drunk - TUNE.oleg.drunkDecay * dt);
    if (o.blackout > 0) {
      o.blackout -= dt;
      if (o.blackout <= 0) o.drunk = 60;
    }

    for (const f of this.friends) f.update(dt);
    particles.update(dt);
    this.cat.update(dt);
    for (const d of Object.values(this.doors)) d.update(dt);
    if (this.entranceCloseT > 0) {
      this.entranceCloseT -= dt;
      const [cx, cz] = this.doors.entrance.center;
      if (Math.hypot(this.olegPos[0] - cx, this.olegPos[1] - cz) < 0.9) this.entranceCloseT = 0.5; // don't slam it on Oleg
      else if (this.entranceCloseT <= 0) this.doors.entrance.setOpen(false);
    }

    // stove
    const S = TUNE.stove;
    if (this.stove.phase === 'cooking') {
      this.stove.t += dt;
      if (this.stove.t >= S.cookTime) {
        this.stove = { phase: 'ready', t: 0 };
        this.alert('Пельмени сварились — снимай!', 'Кухня');
      }
    } else if (this.stove.phase === 'ready') {
      this.stove.t += dt;
      if (this.stove.t >= S.burnAfter) {
        this.stove = { phase: 'idle', t: 0 };
        st.hut -= S.burnHut;
        this.alert('Пельмени сгорели! Вонь на всю хату', 'Кухня');
      }
    }
    this.stoveProps.pot.visible = this.stove.phase !== 'idle';

    // grill glow
    const glow = this.grill.lit ? 0.3 + (this.grill.heat / 100) * 1.8 : 0;
    this.grillProps.light.intensity = glow * (0.8 + Math.random() * 0.4);
    if (this.grillProps.coals) this.grillProps.coals.material.emissiveIntensity = glow;

    // noise, neighbours, police
    const N = TUNE.noise, src = N.sources;
    const has = (id) => this.friends.some((f) => f.problem?.id === id);
    let noise = 0;
    if (st.music) noise += src.music;
    if (has('cry')) noise += src.cry;
    if (has('puke')) noise += src.puke;
    if (has('smash')) noise += src.smash;
    if (has('cough')) noise += src.cough;
    if (this.grill.lit) noise += src.smoke;
    if (this.cat.problem?.id === 'locked') noise += src.cat;
    if (this.doors.entrance.open && st.music) noise += src.openDoor;
    noise += this.puddles.length * src.smell;
    st.noise = Math.max(0, st.noise + (noise - N.decay) * dt);
    st.neighborCd -= dt;
    const threshold = N.neighborAt - st.anger * N.angerStep;
    const policeWaiting = this.visitor?.type === 'police' || this.visitorQueue.some((v) => v.type === 'police' || v.type === 'neighbor');
    if (!policeWaiting && st.neighborCd <= 0 && st.noise >= threshold) {
      st.neighborCd = N.cooldown;
      if (st.anger >= TUNE.police.angerLimit) {
        this.alert('Соседи психанули и сразу вызвали ментов', null);
        this.spawnPolice();
      } else this.spawnNeighbor();
    }

    // deliveries
    for (const order of this.orders) {
      order.eta -= dt;
      if (order.eta <= 0 && !order.done) {
        order.done = true;
        this.queueVisitor({
          type: 'courier', name: 'Курьер', shirt: '#e0a21b', patience: TUNE.visitors.courierPatience,
          onOpen: () => {
            for (const [k, v] of Object.entries(order.gives)) st.fridge[k] = (st.fridge[k] ?? 0) + v;
            this.toast(`Курьер: ${order.title} — закинул в холодос`, 'good');
          },
          onTimeout: () => this.toast(`Курьер ушёл с заказом (${order.title}). Деньги сгорели`, 'bad'),
        });
      }
    }
    this.orders = this.orders.filter((x) => !x.done);

    // visitor at the door
    if (!this.visitor && this.visitorQueue.length) this.showVisitor(this.visitorQueue.shift());
    const v = this.visitor;
    if (v) {
      v.left -= dt;
      v.knockT -= dt;
      if (v.knockT <= 0) {
        v.knockT = TUNE.visitors.knockEvery;
        this.sfx.knock();
        v.figure.play('knock');
      }
      v.figure.update(dt);
      if (v.left <= 0) {
        this.dismissVisitor();
        v.onTimeout();
        if (v.retry) this.pending.push({ at: st.t + 15, fn: () => this.queueVisitor({ ...v, figure: null }) });
      }
    }

    // hut
    const H = TUNE.hut;
    const broken = Object.values(this.furn.items).filter((i) => i.broken).length;
    st.hut -= (this.puddles.length * H.puddle + broken * H.broken + (st.music ? H.music : 0)) * dt;
    st.hut = clamp(st.hut);

    // total fun: drifts to the average, crashes while anyone is at zero
    const people = [...this.friends.map((f) => f.fun), o.fun, ...(this.cat.gone ? [] : [this.cat.fun])];
    const avg = people.reduce((a, b) => a + b, 0) / people.length;
    const zeros = people.filter((x) => x <= 0).length;
    st.totalFun += (avg - st.totalFun) * TUNE.totalFun.follow * dt - zeros * TUNE.totalFun.zeroDrain * dt;
    st.totalFun = clamp(st.totalFun);
    o.fun = clamp(o.fun);

    // table props
    const t = st.table;
    this.tableProps.beer.forEach((b, i) => (b.visible = i < Math.ceil(t.beer / TUNE.drink.beer.servings)));
    this.tableProps.vodka.forEach((b, i) => (b.visible = i < Math.ceil(t.vodka / TUNE.drink.vodka.servings)));
    this.tableProps.food.forEach((p, i) => (p.visible = i < t.food));

    // toasts
    for (const x of this.toasts) x.life -= dt;
    this.toasts = this.toasts.filter((x) => x.life > 0);

    // end of night
    if (st.totalFun <= 0) this.end(false, 'Туса сдохла. Все разъехались по домам.');
    else if (st.hut <= 0) this.end(false, 'Хату разнесли в хлам. Мама Олега в шоке.');
    else if (st.t >= TUNE.nightSeconds) this.end(true, '06:00. Все живы, хата стоит.');
  }

  end(win, reason) {
    this.over = { win, reason, night: this.night };
    this.state.music = false;
    this.onEnd?.(this.over);
  }
}
