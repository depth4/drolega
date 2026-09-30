// The guys and the cat: movement, activities, problems (the chaos Oleg has to calm down).
import { TUNE } from '../config.js';
import { SPOTS, CAT_SPOTS, roomAt } from '../world/layout.js';
import { makePerson, makeCat } from '../world/figures.js';
import { route } from './nav.js';

export const rand = (a, b) => a + Math.random() * (b - a);
export const chance = (perSec, dt) => Math.random() < perSec * dt;
export const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const pickWeighted = (entries) => {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) if ((r -= w) <= 0) return k;
  return entries.at(-1)?.[0];
};

// ---------- walking ----------

class Walker {
  constructor(game, figure, speed, canOpenDoors) {
    this.game = game;
    this.figure = figure;
    this.speed = speed;
    this.canOpenDoors = canOpenDoors;
    this.pos = [0, 0];
    this.y = 0;
    this.node = 'living';
    this.path = null;
    this.mode = 'idle';
    this.spot = null;
    this.t = Math.random() * 10;
  }
  get room() {
    return roomAt(this.pos[0], this.pos[1]);
  }
  place(spot) {
    this.pos = [...spot.p];
    this.node = spot.node;
    this.spot = spot;
    this.arrive(spot);
  }
  arrive(spot) {
    this.y = spot.y ?? 0;
    this.figure.setPose?.(spot.pose ?? 'stand', this.y);
    const root = this.figure.root;
    root.position.set(this.pos[0], spot.pose ? 0 : this.y, this.pos[1]);
    if (spot.look) root.rotation.y = Math.atan2(spot.look[0] - this.pos[0], spot.look[1] - this.pos[1]);
  }
  walkTo(spot, onArrive, blocked) {
    const r = route(this.node, this.pos, spot.node, spot.p, blocked);
    if (!r) return false;
    if (this.canOpenDoors) {
      if (r.nodes.includes('balconyDoor')) this.game.doors.balcony.setOpen(true);
      if (r.nodes.includes('bathDoor')) this.game.doors.bath.setOpen(true);
    }
    this.path = r.points;
    this.target = spot;
    this.onArrive = onArrive;
    this.mode = 'walk';
    this.spot = null;
    this.figure.setPose?.('stand');
    this.y = 0;
    return true;
  }
  stepWalk(dt) {
    let step = this.speed * dt;
    while (this.path.length && step > 0) {
      const [tx, tz] = this.path[0];
      const dx = tx - this.pos[0], dz = tz - this.pos[1];
      const d = Math.hypot(dx, dz);
      if (d <= step) {
        this.pos = [tx, tz];
        step -= d;
        this.path.shift();
      } else {
        this.pos[0] += (dx / d) * step;
        this.pos[1] += (dz / d) * step;
        this.figure.root.rotation.y = Math.atan2(dx, dz);
        step = 0;
      }
    }
    this.figure.root.position.set(this.pos[0], 0, this.pos[1]);
    if (!this.path.length) {
      this.mode = 'idle';
      this.node = this.target.node;
      this.spot = this.target;
      this.arrive(this.target);
      const cb = this.onArrive;
      this.onArrive = null;
      cb?.();
    }
  }
}

// ---------- activities ----------

const ACTIVITIES = {
  table: { spots: ['table1', 'table2'], dur: [12, 20], label: 'бухает за столом' },
  sofa: { spots: ['sofaA', 'sofaB'], dur: [8, 14], label: 'на диване', fun: 0.5 },
  kitchen: { spots: ['kitchen'], dur: [6, 10], label: 'трётся на кухне', fun: 0.4 },
  balcony: { spots: ['balcony'], dur: [6, 10], label: 'дышит на балконе', fun: 0.4 },
  grill: { spots: ['grill'], dur: [22, 32], label: 'жарит шашлык' },
  anime: { spots: ['olegBed'], dur: [15, 25], label: 'смотрит аниме', fun: 0.9 },
  vape: { spots: ['balcony', 'bathStand'], dur: [10, 16], label: 'парит вейп', fun: 0.6 },
  toilet: { spots: ['toilet'], dur: [3, 5], label: 'в туалете' },
};

// ---------- characters ----------

export const CHARS = {
  alexey: {
    name: 'Алексей', shirt: '#b3352d', hair: '#2a1a10',
    start: 'table1', prefs: { table: 7, sofa: 2, balcony: 1, kitchen: 1 }, drinker: true,
    tick(f, g, dt) {
      const T = TUNE.alexey;
      if (f.problem) return;
      if (f.activity?.id === 'table' && g.tableBooze() > 0 && chance(T.hogChance * g.diff, dt)) f.setProblem(PROBLEMS.hog(f, g));
      else if (f.drunk > 25 && f.mode !== 'walk' && chance(T.cryChance * g.diff, dt)) f.setProblem(PROBLEMS.cry(f, g));
    },
  },
  lyokha: {
    name: 'Лёха', shirt: '#1e1e20', pants: '#1c1c1e', hair: '#a07a50', // clothes come from src/assets/skins/lyokha.png
    start: 'table2', prefs: { table: 6, sofa: 2, kitchen: 1 }, drinker: true,
    tick(f, g) {
      if (!f.problem && !f.wasted && f.mode !== 'walk' && f.drunk >= TUNE.lyokha.wastedAt) startWasted(f, g);
    },
    wantsDrink: (f) => !f.wasted,
  },
  kirill: {
    name: 'Кирилл', shirt: '#2f5c9e', hair: '#1c1c1c', drinkFaceId: 'kirillDrink',
    start: 'sofaA', prefs: { grill: 6, anime: 3, table: 2, sofa: 1 }, drinker: true,
    needsBooze: false, // drinks when there is booze, but an empty table doesn't upset him
  },
  temych: {
    name: 'Темыч', shirt: '#6b3fa0', hair: '#a07040',
    start: 'sofaB', prefs: { vape: 5, sofa: 3, table: 3 }, drinker: true,
    quotes: ['Сука. Пацаны, на следующей неделе также…', 'Сукааааа', 'СУКААААА'], voice: 'temych',
  },
};

// ---------- problems ----------
// A problem: { id, text (log), short (bubble), drain, actions(g) -> [{key, text, run}], tick(dt) }

const PROBLEMS = {
  hog(f, g) {
    let t = 0;
    return {
      id: 'hog', text: 'присосался к бутылке, бухло на столе тает', short: 'ПЬЁТ ИЗ ГОРЛА', drain: -0.5,
      tick(dt) {
        t += dt;
        if (t >= TUNE.alexey.hogDrainEvery) {
          t = 0;
          const tb = g.state.table;
          if (tb.vodka > 0) tb.vodka -= 1;
          else if (tb.beer > 0) tb.beer -= 1;
          if (!g.tableBooze()) {
            g.toast('Алексей выжрал всё со стола', 'bad');
            f.clearProblem(false);
          }
        }
      },
      actions: () => [{
        key: 'E', text: 'Отобрать бутылку',
        run() {
          f.fun -= 5;
          f.clearProblem(true);
          if (g.inv.add('beer')) g.toast('Бутылка теперь у тебя', 'info');
        },
      }],
    };
  },
  cry(f, g) {
    const right = Math.random() < 0.5 ? 'pat' : 'hug';
    const tried = new Set();
    const attempt = (kind) => () => {
      if (kind === right) {
        f.fun += 20;
        f.clearProblem(true);
        g.toast('Алексей успокоился', 'good');
      } else {
        tried.add(kind);
        f.fun -= 5;
        g.state.noise += 5;
        g.toast('Не то… Алексей рыдает громче', 'bad');
      }
    };
    return {
      id: 'cry', text: 'плачет', short: 'ПЛАЧЕТ', drain: 2,
      tick(dt) {
        for (const o of g.friends) if (o !== f && o.room === f.room) o.fun -= 0.3 * dt;
      },
      actions: () => [
        !tried.has('pat') && { key: 'E', text: 'Погладить по головке', run: attempt('pat') },
        !tried.has('hug') && { key: 'R', text: 'Обнять', run: attempt('hug') },
      ].filter(Boolean),
    };
  },
  puke(f, g) {
    let t = 0;
    return {
      id: 'puke', text: 'блюёт', short: 'БЛЮЁТ', drain: 1.5,
      tick(dt) {
        t += dt;
        if (t >= TUNE.lyokha.pukeEvery && f.mode !== 'walk') {
          t = 0;
          g.addPuddle(f.pos[0] + rand(-0.4, 0.4), f.pos[1] + rand(-0.4, 0.4));
        }
      },
      actions: () => showerActions(f, g),
    };
  },
  sleepTub(f, g) {
    return { id: 'sleepTub', text: 'вырубился в ванной', short: 'СПИТ В ВАННОЙ', drain: 1.5, actions: () => showerActions(f, g) };
  },
  smash(f, g) {
    let t = 0;
    return {
      id: 'smash', text: 'громит хату', short: 'ГРОМИТ ХАТУ', drain: -0.5,
      tick(dt) {
        t += dt;
        if (f.mode !== 'walk' && t >= TUNE.lyokha.smashEvery) {
          t = 0;
          g.breakSomething(f.room?.id);
          const next = ['sofaA', 'kitchen', 'bedroom', 'hall', 'table2'][Math.floor(Math.random() * 5)];
          f.walkTo(SPOTS[next]);
        }
      },
      actions: () => [{
        key: 'E', text: 'Отвести в ванную',
        run() {
          f.walkTo(SPOTS.tub, () => f.setProblem(PROBLEMS.sleepTub(f, g), true));
          f.problem.short = 'ИДЁТ В ВАННУЮ';
          f.problem.drain = 0;
          f.problem.tick = null;
          f.problem.actions = () => [];
          f.figure.setStatus('ИДЁТ В ВАННУЮ', '#8a6d1a');
        },
      }],
    };
  },
  grillOut(f, g) {
    return {
      id: 'grillOut', text: 'мангал тухнет', short: 'МАНГАЛ ТУХНЕТ', drain: 1,
      actions: () => [{ key: 'E', text: 'Раздуть мангал', run: () => g.fanGrill() }],
    };
  },
  smoke(f, g) {
    return {
      id: 'smoke', text: 'задыхается в дыму на балконе', short: 'ЗАДЫХАЕТСЯ', drain: 2,
      tick() {
        if (g.doors.balcony.open) {
          f.clearProblem(true);
          g.toast('Кирилл отдышался', 'good');
        }
      },
      actions: () => [],
    };
  },
  sleep(f, g, text = 'уснул под аниме') {
    return {
      id: 'sleep', text, short: 'СПИТ', drain: 1.2,
      actions: () => [{
        key: 'E', text: 'Разбудить',
        run() {
          f.fun += 5;
          f.clearProblem(true);
          f.endActivity();
        },
      }],
    };
  },
  cough(f, g) {
    return {
      id: 'cough', text: 'закашлялся в дыму от вейпа', short: 'КАШЛЯЕТ', drain: 2,
      actions: () => [{
        key: 'E', text: 'Похлопать по спине',
        run() {
          f.fun += 10;
          f.clearProblem(true);
          f.endActivity();
        },
      }],
    };
  },
  waitToilet(f, g) {
    return {
      id: 'waitToilet', text: 'ждёт туалет — занято', short: 'ЖДЁТ ТУАЛЕТ', drain: 1,
      tick() {
        if (!g.bathOccupied(f)) {
          f.clearProblem(false);
          f.startActivity('toilet');
        } else if (f.problem.since > TUNE.bladder.waitMax) {
          g.addPuddle(f.pos[0], f.pos[1]);
          g.state.hut -= TUNE.hut.peed;
          f.fun -= 10;
          f.bladder = 0;
          g.toast(`${f.name} не дотерпел. Лужа в прихожей`, 'bad');
          f.clearProblem(false);
        }
      },
      actions: () => [],
    };
  },
};

function showerActions(f, g) {
  if (f.room?.id !== 'bath') return [];
  return [{
    key: 'E', text: 'Облить ледяным душем',
    run() {
      f.drunk = TUNE.lyokha.sober;
      f.wasted = false;
      f.fun += 10;
      f.clearProblem(true);
      g.toast('Лёха ожил после ледяного душа', 'good');
      g.sfx.splash();
      f.endActivity();
    },
  }];
}

function startWasted(f, g) {
  f.wasted = true;
  f.endActivity(true);
  const kind = pickWeighted([['puke', 0.45], ['sleepTub', 0.25], ['smash', 0.3]]);
  if (kind === 'puke') {
    g.addPuddle(f.pos[0] + rand(-0.3, 0.3), f.pos[1] + rand(-0.3, 0.3));
    f.setProblem(PROBLEMS.puke(f, g));
    f.walkTo(SPOTS.bathStand);
  } else if (kind === 'sleepTub') {
    f.walkTo(SPOTS.tub, () => f.setProblem(PROBLEMS.sleepTub(f, g)));
  } else {
    f.setProblem(PROBLEMS.smash(f, g));
  }
}

// ---------- friend ----------

export class Friend extends Walker {
  constructor(game, id) {
    const def = CHARS[id];
    super(game, makePerson({ ...def, style: game.style, faceId: id }), 1.4, true);
    this.id = id;
    this.def = def;
    this.name = def.name;
    this.fun = TUNE.start.friendFun;
    this.drunk = 0;
    this.bladder = rand(0, 40);
    this.activity = null;
    this.problem = null;
    this.wasted = false;
    this.talkCooldown = 0;
    this.figure.root.userData.friend = this;
    const spot = SPOTS[def.start];
    this.place(spot);
    const act = Object.entries(ACTIVITIES).find(([, a]) => a.spots.includes(def.start))?.[0];
    this.activity = { id: act, spot, left: rand(...ACTIVITIES[act].dur), t: 0, plateT: 0 };
  }

  // a catchphrase in a speech bubble (+ the recorded voice, louder when Oleg is close)
  speak(text = this.def.quotes[Math.floor(Math.random() * this.def.quotes.length)]) {
    this.figure.say(text);
    if (this.def.voice) {
      const [ox, oz] = this.game.olegPos;
      const d = Math.hypot(ox - this.pos[0], oz - this.pos[1]);
      this.game.sfx.voice(this.def.voice, Math.max(0.15, 1 - d / 7));
    }
  }

  drink(d, buzzTime = 0) {
    this.figure.sip(2.2);
    this.fun += d.fun;
    this.drunk = clamp(this.drunk + d.drunk * (TUNE.drunkMult[this.id] ?? 1));
    if (buzzTime) this.buzz = Math.max(this.buzz ?? 0, buzzTime);
  }

  get statusText() {
    if (this.problem) return this.problem.short;
    if (this.mode === 'walk') return 'идёт';
    return this.activity ? ACTIVITIES[this.activity.id].label : 'тусит';
  }

  setProblem(p, replace = false) {
    if (this.problem && !replace) return;
    this.problem = p;
    p.since = 0;
    this.figure.setStatus(p.short);
    if (p.drain > 0) this.game.alert(`${this.name} ${p.text}`, this.room?.name);
  }

  clearProblem(helped) {
    this.problem = null;
    this.figure.setStatus(null);
    if (helped) this.game.olegHelped();
  }

  endActivity(silent) {
    const a = this.activity;
    this.activity = null;
    if (a?.id === 'grill') this.game.grill.lit = false;
    if (!silent && this.mode !== 'walk') this.leaveSoon = rand(0.5, 1.5);
  }

  spotFree(id) {
    return !this.game.friends.some((o) => o !== this && (o.spot?.id === id || o.target?.id === id && o.mode === 'walk'));
  }

  startActivity(id) {
    const def = ACTIVITIES[id];
    const spots = def.spots.filter((s) => this.spotFree(s));
    if (!spots.length) return false;
    const spotId = spots[Math.floor(Math.random() * spots.length)];
    const spot = SPOTS[spotId];
    return this.walkTo(spot, () => {
      this.activity = { id, spot, left: rand(...def.dur), t: 0, plateT: 0, closedT: 0, cook: 0 };
      this.onActivityStart(id);
    });
  }

  onActivityStart(id) {
    const g = this.game;
    if (id === 'grill') {
      g.grill.lit = true;
      g.grill.heat = 100;
    }
    if (id === 'vape') {
      const door = this.activity.spot.id === 'balcony' ? g.doors.balcony : g.doors.bath;
      if (door.open) {
        door.setOpen(false);
        g.toast(`${this.name} заперся ${door.id === 'balcony' ? 'на балконе' : 'в санузле'} с вейпом`, 'warn', this.room?.name);
      }
    }
  }

  chooseNext() {
    if (this.bladder >= 100) {
      if (this.game.bathOccupied(this)) {
        this.walkTo(SPOTS.hallWait, () => this.setProblem(PROBLEMS.waitToilet(this, this.game)));
      } else this.startActivity('toilet');
      return;
    }
    const options = Object.entries(this.def.prefs).filter(([id]) => ACTIVITIES[id].spots.some((s) => this.spotFree(s)));
    if (!options.length) return;
    this.startActivity(pickWeighted(options));
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    this.talkCooldown -= dt;
    this.fun -= TUNE.fun.boredom * dt;
    this.bladder += TUNE.bladder.base * dt;
    this.drunk = clamp(this.drunk - 0.4 * dt);
    if (g.state.music && this.room?.id === 'living') this.fun += TUNE.fun.music * dt;
    if (this.buzz > 0) {
      this.buzz -= dt;
      this.fun += TUNE.drink.beer.buzz * dt;
    }

    if (this.problem) {
      this.problem.since += dt;
      this.fun -= this.problem.drain * dt;
      this.problem.tick?.(dt);
    }

    if (this.mode === 'walk') this.stepWalk(dt);
    else if (this.activity) this.tickActivity(dt);
    else if (!this.problem) {
      this.leaveSoon = (this.leaveSoon ?? 0) - dt;
      if (this.leaveSoon <= 0) this.chooseNext();
    }

    this.def.tick?.(this, g, dt);
    this.fun = clamp(this.fun);
    if (this.def.quotes && (this.quoteT = (this.quoteT ?? rand(8, 20)) - dt) <= 0) {
      this.quoteT = rand(30, 55);
      if (!this.problem) this.speak();
    }
    this.figure.animate(this.t, this.mode === 'walk', this.drunk / 100, dt);
  }

  tickActivity(dt) {
    const g = this.game, a = this.activity, D = TUNE.drink;
    const def = ACTIVITIES[a.id];
    if (!this.problem) this.fun += (def.fun ?? 0) * dt;

    if (a.id === 'table') {
      a.t += dt;
      a.plateT += dt;
      const every = TUNE.drinkEvery[this.id];
      const wants = this.def.drinker && (this.def.wantsDrink?.(this) ?? true);
      if (wants && a.t >= every && this.problem?.id !== 'hog') {
        a.t = 0;
        const tb = g.state.table;
        const kind = tb.beer > 0 && tb.vodka > 0 ? (Math.random() < 0.5 ? 'beer' : 'vodka') : tb.beer > 0 ? 'beer' : tb.vodka > 0 ? 'vodka' : null;
        if (kind) {
          tb[kind] -= 1;
          this.drink(D[kind], D[kind].buzzTime);
          this.bladder += 12;
        } else if (this.def.needsBooze !== false) {
          this.fun -= D.noBooze * every;
          g.toastOnce('nobooze', 'Бухло на столе кончилось!', 'warn', 12);
        }
      }
      if (a.plateT >= D.plateEvery) {
        a.plateT = 0;
        if (g.state.table.food > 0) {
          g.state.table.food -= 1;
          this.fun += D.plate.fun;
          this.drunk = clamp(this.drunk + D.plate.drunk);
        }
      }
    }

    if (a.id === 'grill') {
      const G = TUNE.grill;
      g.grill.heat = Math.max(0, g.grill.heat - G.decay * dt);
      if (g.grill.heat >= G.lowAt) {
        this.fun += 0.6 * dt;
        a.cook += dt;
        if (a.cook >= G.shashlikEvery) {
          a.cook = 0;
          g.state.table.food += G.shashlikPlates;
          g.toast(`Шашлык готов! +${G.shashlikPlates} на стол`, 'good');
        }
        if (this.problem?.id === 'grillOut') this.clearProblem(false);
      } else if (!this.problem) this.setProblem(PROBLEMS.grillOut(this, g));
      if (!g.doors.balcony.open) {
        a.closedT += dt;
        if (a.closedT >= G.smokeAfter && this.problem?.id !== 'smoke') this.setProblem(PROBLEMS.smoke(this, g), true);
      } else a.closedT = 0;
      if (g.doors.balcony.open && chance(G.draftChance * g.diff, dt)) {
        g.doors.balcony.setOpen(false);
        g.alert('Сквозняк захлопнул балконную дверь', 'Балкон');
      }
    }

    if (a.id === 'anime' && !this.problem && a.left < ACTIVITIES.anime.dur[0] - 5 && chance(TUNE.kirill.sleepChance * g.diff, dt)) {
      this.setProblem(PROBLEMS.sleep(this, g));
    }

    if (a.id === 'vape') {
      const door = a.spot.id === 'balcony' ? g.doors.balcony : g.doors.bath;
      if (!door.open) {
        a.closedT += dt;
        if (a.closedT >= TUNE.vape.coughAfter && !this.problem) {
          this.setProblem(PROBLEMS.cough(this, g));
          if (this.def.quotes) this.speak('Сукааааа');
        }
      }
    }

    if (a.id === 'toilet') this.bladder = Math.max(0, this.bladder - 40 * dt);

    if (!this.problem) {
      a.left -= dt;
      if (a.left <= 0) this.endActivity();
    }
  }

  // what Oleg can do to this friend right now
  actions(g) {
    const list = this.problem ? this.problem.actions(g) : [];
    const item = g.inv.selectedItem();
    if (!this.problem || !list.length) {
      if (item === 'beer' || item === 'vodka') {
        list.push({
          key: 'E', text: `Дать ${item === 'beer' ? 'пиво' : 'водку'}`,
          run: () => {
            if (!this.def.drinker) return g.toast(`${this.name} не пьёт`, 'info');
            g.inv.consume();
            this.drink(TUNE.give[item], TUNE.give[item].buzzTime);
            this.bladder += 15;
          },
        });
      } else if (item === 'food') {
        list.push({
          key: 'E', text: 'Накормить',
          run: () => {
            g.inv.consume();
            this.fun += TUNE.give.food.fun;
            this.drunk = clamp(this.drunk + TUNE.give.food.drunk);
          },
        });
      }
      if (this.talkCooldown <= 0 && !this.problem) {
        list.push({
          key: 'R', text: 'Потрещать',
          run: () => {
            this.fun += 4;
            g.oleg.fun += 2;
            this.talkCooldown = 8;
          },
        });
      }
    }
    return list;
  }
}

// ---------- cat ----------

export class Cat extends Walker {
  constructor(game) {
    super(game, makeCat(), 1.1, false);
    this.name = 'Кот';
    this.fun = TUNE.start.catFun;
    this.problem = null;
    this.idleLeft = rand(3, 6);
    this.balconyT = 0;
    this.railT = 0;
    this.playLeft = 0;
    this.gone = false;
    this.figure.root.userData.cat = this;
    this.place(CAT_SPOTS.catRug);
  }

  get statusText() {
    if (this.gone) return 'ВЫПАЛ С БАЛКОНА';
    if (this.problem) return this.problem.short;
    if (this.playLeft > 0) return 'играет с мышкой';
    return this.mode === 'walk' ? 'гуляет' : 'сидит';
  }

  blockedNodes() {
    const d = this.game.doors;
    return (n) => (!d.balcony.open && (n === 'balconyDoor' || n === 'balcony')) || (!d.bath.open && (n === 'bathDoor' || n === 'bath'));
  }

  setProblem(id, text, short, drain) {
    if (this.problem?.id === id) return;
    this.problem = { id, text, short, drain };
    this.figure.setStatus(short);
    this.game.alert(`Кот ${text}`, this.room?.name);
  }

  clearProblem(helped) {
    this.problem = null;
    this.figure.setStatus(null);
    if (helped) this.game.olegHelped();
  }

  update(dt) {
    if (this.gone) return;
    const g = this.game, C = TUNE.cat;
    this.t += dt;
    if (this.playLeft > 0) {
      this.playLeft -= dt;
      this.fun += C.toyFun * dt;
      if (this.playLeft <= 0) g.respawnToy();
    } else this.fun -= C.boredom * dt;

    const room = this.room?.id;
    const locked = this.mode !== 'walk' && ((room === 'balcony' && !g.doors.balcony.open) || (room === 'bath' && !g.doors.bath.open));
    if (locked && this.spot?.id !== 'catRail') this.setProblem('locked', room === 'balcony' ? 'заперт на балконе' : 'заперт в санузле', 'ЗАПЕРТ', C.lockedDrain);
    else if (this.problem?.id === 'locked') this.clearProblem(true);

    if (room === 'balcony') {
      this.balconyT += dt;
      if (this.balconyT >= C.climbAfter && this.mode !== 'walk' && this.spot?.id !== 'catRail' && this.problem?.id !== 'rail') {
        this.walkTo(CAT_SPOTS.catRail, () => this.setProblem('rail', 'лезет в открытую створку на балконе!', 'В ОКНЕ', 0));
      }
      if (this.problem?.id === 'rail') {
        this.railT += dt;
        if (this.railT >= C.fallAfter) g.catFell();
      }
    } else this.balconyT = 0;

    if (this.problem) this.fun -= this.problem.drain * dt;

    if (this.mode === 'walk') this.stepWalk(dt);
    else if (this.playLeft <= 0 && this.problem?.id !== 'rail') {
      this.idleLeft -= dt;
      if (this.idleLeft <= 0) this.wander();
    }
    this.fun = clamp(this.fun);
    this.figure.animate(this.t, this.mode === 'walk');
  }

  wander() {
    const g = this.game;
    this.idleLeft = rand(5, 10);
    const options = Object.values(CAT_SPOTS)
      .filter((s) => s.id !== 'catRail' && s.id !== this.spot?.id)
      .filter((s) => !(s.balcony && !g.doors.balcony.open))
      .map((s) => [s, s.balcony ? TUNE.cat.balconyPull : 1]);
    const spot = pickWeighted(options);
    if (spot) this.walkTo(spot, null, this.blockedNodes());
  }

  actions(g) {
    if (this.gone) return [];
    const onBalcony = this.room?.id === 'balcony';
    if (onBalcony) {
      return [{
        key: 'E', text: this.problem?.id === 'rail' ? 'Снять с окна!' : 'Забрать кота с балкона',
        run: () => {
          this.clearProblem(this.problem?.id === 'rail');
          this.railT = 0;
          this.balconyT = 0;
          this.path = null;
          this.mode = 'idle';
          this.place(CAT_SPOTS.catRug);
          g.toast('Кот в зале, в безопасности', 'good');
        },
      }];
    }
    const list = [];
    if (this.playLeft <= 0) {
      list.push({
        key: 'E', text: 'Погладить',
        run: () => {
          this.fun += TUNE.cat.pet;
          g.oleg.fun += 2;
          g.sfx.purr();
        },
      });
    }
    if (g.inv.has('toy') && this.playLeft <= 0) {
      list.push({
        key: 'R', text: 'Дать мышку',
        run: () => {
          g.inv.remove('toy');
          this.playLeft = TUNE.cat.toyPlay;
          this.idleLeft = 0;
          g.toast('Кот играет с мышкой', 'good');
        },
      });
    }
    return list;
  }
}
