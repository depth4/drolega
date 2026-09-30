// DOM HUD: meters, participants, toasts, interaction prompt, hotbar, phone, end screen.
import { TUNE } from '../config.js';
import { ITEMS } from '../game/game.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createHUD({ onBuy }) {
  const el = {
    hud: $('hud'), night: $('night'), time: $('time'), room: $('room'),
    total: $('bar-total'), hut: $('bar-hut'), noise: $('bar-noise'), anger: $('anger'), people: $('people'), toasts: $('toasts'),
    prompt: $('prompt'), hotbar: $('hotbar'), doorAlert: $('door-alert'), blackout: $('blackout'),
    phone: $('phone'), phoneTime: $('phone-time'), phoneMoney: $('phone-money'),
    tabCam: $('tab-cam'), tabShop: $('tab-shop'), cam: $('phone-cam'), camView: $('cam-view'), camWho: $('cam-who'),
    shop: $('phone-shop'), shopList: $('shop-list'), orders: $('orders'),
  };
  let cache = {};
  const set = (key, node, html) => {
    if (cache[key] === html) return;
    cache[key] = html;
    node.innerHTML = html;
  };

  // shop list (built once)
  el.shopList.innerHTML = TUNE.shop
    .map((s) => `<li><b>${esc(s.title)}</b><small>${esc(s.note ?? '')}</small><button type="button" data-buy="${s.id}" ${s.soon ? 'disabled' : ''}>${s.soon ? 'скоро' : `${s.price} ₽`}</button></li>`)
    .join('');
  el.shopList.addEventListener('click', (e) => {
    const id = e.target.closest('[data-buy]')?.dataset.buy;
    if (id) onBuy(id);
  });
  const tab = (which) => {
    el.tabCam.classList.toggle('on', which === 'cam');
    el.tabShop.classList.toggle('on', which === 'shop');
    el.cam.hidden = which !== 'cam';
    el.shop.hidden = which !== 'shop';
  };
  el.tabCam.addEventListener('click', () => tab('cam'));
  el.tabShop.addEventListener('click', () => tab('shop'));

  const bar = (v, cls = '') => `<div class="bar thin ${cls} ${v < 25 ? 'low' : ''}"><i style="width:${Math.max(0, Math.min(100, v)).toFixed(0)}%"></i></div>`;

  return {
    el,
    reset() {
      cache = {};
    },
    // the phone's camera rectangle in canvas pixels (for the scissored render), or null
    camRect() {
      if (el.phone.hidden || el.cam.hidden) return null;
      return el.camView.getBoundingClientRect();
    },
    update(game, { roomName, target, actions }) {
      const st = game.state;
      el.night.textContent = `НОЧЬ ${game.night}`;
      el.time.textContent = game.clock;
      el.room.textContent = roomName ?? '';
      el.total.style.width = `${st.totalFun}%`;
      el.total.parentElement.classList.toggle('low', st.totalFun < 25);
      el.hut.style.width = `${st.hut}%`;
      el.hut.parentElement.classList.toggle('low', st.hut < 25);
      el.noise.style.width = `${game.noiseLevel * 100}%`;
      el.noise.parentElement.classList.toggle('hot', game.noiseLevel > 0.75);
      el.anger.textContent = st.anger ? `· злость ${st.anger}${st.policeVisits ? ` · менты ${st.policeVisits}` : ''}` : '';

      const rows = [
        `<div class="person"><div class="top"><span class="name">Олег (ты)</span><span class="num">пьян ${game.oleg.drunk.toFixed(0)}%</span></div>${bar(game.oleg.fun)}${bar(game.oleg.drunk, 'drunk')}</div>`,
        ...game.friends.map((f) => {
          const alarm = f.problem && f.problem.drain > 0;
          return `<div class="person ${alarm ? 'alarm' : ''}"><div class="top"><span class="name">${esc(f.name)}</span><span class="status">${esc(f.statusText)}</span></div>${bar(f.fun)}</div>`;
        }),
        (() => {
          const c = game.cat;
          const alarm = c.gone || c.problem;
          return `<div class="person ${alarm ? 'alarm' : ''}"><div class="top"><span class="name">Кот</span><span class="status">${esc(c.statusText)}</span></div>${bar(c.gone ? 0 : c.fun)}</div>`;
        })(),
      ];
      set('people', el.people, rows.join(''));

      set('toasts', el.toasts, game.toasts.map((t) => `<div class="toast ${t.kind}">${t.room ? `<small>${esc(t.room)}</small>` : ''}${esc(t.text)}</div>`).join(''));

      let p = '';
      if (target) {
        p += `<div class="what">${esc(target.name)}</div>`;
        const info = target.info?.();
        if (info) p += `<div class="info">${esc(info)}</div>`;
        for (const a of actions) p += `<div class="act"><kbd>${a.key}</kbd>${esc(a.text)}</div>`;
      }
      set('prompt', el.prompt, p);

      set('hotbar', el.hotbar, game.inv.slots
        .map((it, i) => `<div class="slot ${i === game.inv.sel ? 'sel' : ''}"><span class="k">${i + 1}</span>${it ? `<span class="ico">${ITEMS[it].icon}</span><span class="lbl">${ITEMS[it].name}</span>` : ''}</div>`)
        .join(''));

      el.doorAlert.hidden = !game.visitor || !el.phone.hidden;
      el.blackout.hidden = !(game.oleg.blackout > 0);

      if (!el.phone.hidden) {
        el.phoneTime.textContent = game.clock;
        el.phoneMoney.textContent = `${st.money} ₽`;
        el.camWho.textContent = game.visitor ? `У двери: ${game.visitor.name}` : 'Никого';
        set('orders', el.orders, game.orders.length
          ? `В пути: ${game.orders.map((o) => `${esc(o.title)} (~${game.gameMinutes(Math.max(0, o.eta))} мин)`).join(', ')}`
          : 'Заказов нет');
        for (const b of el.shopList.querySelectorAll('button[data-buy]')) {
          const s = TUNE.shop.find((x) => x.id === b.dataset.buy);
          b.disabled = s.soon || st.money < s.price;
        }
      }
    },
  };
}
