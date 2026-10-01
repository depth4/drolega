// All balance numbers live here. Rates are per real second unless noted.
// Target: a night lasts ~3 minutes, Oleg runs around non-stop calming everyone down.
export const TUNE = {
  nightSeconds: 180, // 22:00 -> 06:00
  nights: 5,
  baseDifficulty: 0.7, // night 1 problem chance multiplier
  difficultyPerNight: 0.2, // problem chances grow by this each night
  warmup: { calm: 20, ramp: 50, min: 0.15 }, // first seconds are calm, then chaos ramps up over `ramp` seconds

  start: {
    totalFun: 70,
    hut: 100,
    money: 3000,
    fridge: { beer: 4, vodka: 1, food: 1, pelmeni: 1 }, // bottles / ready food / raw packs
    table: { beer: 6, vodka: 5, food: 2 }, // servings and plates on the party table
    friendFun: 75,
    catFun: 80,
  },

  totalFun: {
    follow: 0.08, // how fast total fun drifts toward the average of everyone's fun
    zeroDrain: 2.5, // per participant whose fun hit zero
  },

  fun: {
    boredom: 0.38, // everyone loses this much fun per second
    music: 0.9, // bonus in the living room while music plays
    olegBoredom: 0.35,
    helpBonus: 8, // Oleg's fun for solving someone's problem
  },

  // Beer: pricier, gets you drunk slowly, the fun lasts (buzz). Vodka: cheap, drunk fast -> chaos sooner.
  drink: {
    beer: { fun: 10, drunk: 5, buzz: 0.5, buzzTime: 15, servings: 2 }, // one serving from the table
    vodka: { fun: 14, drunk: 16, servings: 5 },
    plate: { fun: 8, drunk: -8 },
    plateEvery: 9,
    noBooze: 1.0, // extra fun loss for drinkers at an empty table
    plates: 3, // one food item on the table
  },
  // handing a whole bottle / plate to someone (or drinking it yourself)
  give: {
    beer: { fun: 18, drunk: 8, buzzTime: 20 },
    vodka: { fun: 22, drunk: 30 },
    food: { fun: 12, drunk: -15 },
  },

  // Pelmeni: cheap, but cook them on the stove and take them off in time or they burn
  stove: { cookTime: 15, burnAfter: 10, burnHut: 5 },

  oleg: { drunkDecay: 0.8, blackoutAt: 95, blackoutSeconds: 4 },

  // Oleg's strength: every real action costs some, it comes back by itself; food and a drink give a boost
  energy: { max: 100, regen: 1.8, fromFood: 35, fromBeer: 12, fromVodka: 6 },
  // Oleg wants a drink too: thirst grows, and when it's high his fun melts; a drink (Q) quenches it
  olegThirst: { rate: 0.9, from: 60, drain: 1.6, beer: 55, vodka: 80 },
  cost: {
    takeBottle: 6, comfort: 6, lead: 8, fan: 6, wake: 10, pat: 8, shower: 14, repair: 14, mop: 10,
    cook: 12, drain: 6, petCat: 4, catRescue: 5,
  },
  // photos on Oleg's phone: catch a moment (someone puking, dancing, asleep...) — each kind once a night,
  // 3 shots a night, then "память заполнена"
  photo: { perNight: 3, fun: 8, friendFun: 6, range: 7, cone: 0.32 },

  // hands-on actions (hold the left mouse button): strength spent per second / per pat
  hands: { hoseLength: 4.6, sprayRange: 3.2, sprayCost: 5, soak: 0.28, scrubCost: 4, scrubRate: 0.0022, patCost: 3, pats: 5, shakeCost: 5, shakeRate: 0.004 },
  // mini-games slow the world down instead of pausing it
  minigame: { timeScale: 0.35 },

  bladder: { base: 0.3, waitMax: 18, sip: 7 },

  // the guys get thirsty and hungry and go to the table by themselves; an empty table = a "!"
  needs: { thirst: 1.3, hunger: 0.6, goAt: 55, wantAt: 90, sip: 30, plate: 45, give: 70 },

  // "Коч!" chain: someone yells, others pick it up with a fading chance
  koch: { firstAfter: 25, every: [35, 60], chance: 0.85, decay: 0.8, max: 6, fun: 5, olegFun: 2, noise: 6 },

  // "Потрещать": he tells a recorded story; Oleg is stuck listening for `lock` of it (0.5 = first half)
  talk: { fun: 18, olegFun: 6, cooldown: 30, lock: 0.5 },

  hut: {
    puddle: 0.3, // per puddle per second
    broken: 0.1, // per broken thing per second
    smash: 8, // one-off when Lyokha breaks something
    repair: 5,
    clean: 3,
    peed: 6,
    music: 0.05,
    policeBreakIn: 35,
  },

  // Neighbours react to accumulated noise / smell / smoke (the "палево" meter), not to every single thing.
  // Knock -> open and calm them: the meter drops, but their anger stacks, so next time they come sooner.
  // Ignore them -> they call the police right away. Every police visit costs more.
  noise: {
    decay: 1.5,
    sources: {
      music: 3, // per second while the music plays
      cry: 2, // Alexey crying
      puke: 1, // Lyokha puking
      smell: 0.3, // per puddle
      smoke: 0.8, // grill burning on the balcony
      smash: 1.5, // Lyokha smashing (plus a one-off on every broken thing)
      cough: 0.5,
      cat: 1, // locked cat meowing
      openDoor: 5, // front door open while the party is loud
    },
    smashHit: 15,
    neighborAt: 60,
    angerStep: 12,
    calm: 40,
    cooldown: 20,
  },
  police: { bribe: 800, bribeGrowth: 0.5, angerLimit: 4 },
  visitors: { patience: 12, courierPatience: 15, knockEvery: 3 },

  delivery: { min: 15, max: 30 }, // seconds; not opening the door = courier leaves, money is gone

  shop: [
    { id: 'beer', icon: 'beer', title: 'Пиво ×4', note: 'держит долго, пьянит медленно', price: 800, gives: { beer: 4 } },
    { id: 'vodka', icon: 'vodka', title: 'Водка 0,5', note: 'дёшево, пьянит быстро', price: 400, gives: { vodka: 1 } },
    { id: 'pizza', icon: 'pizza', title: 'Пицца', note: 'готовая, сразу на стол', price: 700, gives: { food: 1 } },
    { id: 'pelmeni', icon: 'pelmeni', title: 'Пельмени', note: 'дёшево, но варить и сливать самому', price: 250, gives: { pelmeni: 1 } },
    { id: 'pills', title: 'Таблетки от ЗПП', note: 'скоро', price: 600, gives: { pills: 1 }, soon: true },
  ],

  drinkEvery: { alexey: 4, lyokha: 5, temych: 7, kirill: 7 },
  drunkMult: { alexey: 0.7, lyokha: 1.6, temych: 1, kirill: 0.8 },

  grill: { decay: 3.5, lowAt: 25, shashlikEvery: 20, shashlikPlates: 2, smokeAfter: 4, draftChance: 0.02 },
  vape: { coughAfter: 10 },
  lyokha: { wastedAt: 75, sober: 30, pukeEvery: 10, smashEvery: 6 },
  alexey: { hogChance: 0.05, hogDrainEvery: 1.5, cryChance: 0.015 },
  kirill: { sleepChance: 0.04 },

  cat: {
    boredom: 0.7,
    heldFun: 1.5, // calms down in Oleg's hands
    pet: 20, // quick but small
    toyPlay: 25, // seconds of play
    throwSpeed: 4.5, // m/s, LMB with the mouse in hand
    noticeRange: 9, // a mouse on the floor this close and he goes after it
    run: 2.6, // m/s chasing it
    toyFun: 2.5, // per second while playing
    balconyPull: 2.5, // how much more the cat wants the balcony when the door is open
    climbAfter: 10, // seconds on the balcony before it climbs the railing
    fallAfter: 8, // seconds on the railing before it falls
    fallPenalty: 40, // total fun lost when the cat falls
    lockedDrain: 4,
  },
};

// Birthday screen after night 5 — replace with your own words.
export const BIRTHDAY = {
  title: 'С ДНЁМ РОЖДЕНИЯ, ОЛЕГ!',
  lines: ['Ты пережил пять ночей на своей же хате.', 'Хата цела (почти). Кот жив. Мы тебя любим.', '— Алексей, Лёха, Кирилл, Темыч'],
};
