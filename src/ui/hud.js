// DOM HUD: meters, participants, toasts, interaction prompt, hotbar, phone, end screen.
import { TUNE } from '../config.js';
import { ITEMS } from '../game/game.js';
import { iconURL, iconImg, hasRealIcon } from './icons.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createHUD({ onBuy }) {
  const el = {
    hud: $('hud'), night: $('night'), time: $('time'), room: $('room'), courier: $('courier-chip'),
    energy: $('bar-energy'), ofun: $('bar-ofun'), othirst: $('othirst'), handName: $('hand-name'), total: $('bar-total'), hut: $('bar-hut'), noise: $('bar-noise'), anger: $('anger'), people: $('people'), toasts: $('toasts'),
    prompt: $('prompt'), hotbar: $('hotbar'), doorAlert: $('door-alert'), blackout: $('blackout'),
    phone: $('phone'), phoneTime: $('phone-time'), phoneMoney: $('phone-money'),
    tabCam: $('tab-cam'), tabShop: $('tab-shop'), cam: $('phone-cam'), camView: $('cam-view'), camWho: $('cam-who'),
    shop: $('phone-shop'), shopCard: $('shop-card'), shopDots: $('shop-dots'), orders: $('orders'),
    slide: $('slide'), slideKnob: $('slide-knob'), slideFill: $('slide-fill'), slideText: $('slide-text'),
  };
  let cache = {};
  const set = (key, node, html) => {
    if (cache[key] === html) return;
    cache[key] = html;
    node.innerHTML = html;
  };

  // ---- phone: shop carousel with slide-to-buy
  const items = TUNE.shop.filter((s) => !s.soon);
  let idx = 0;
  let money = 0;
  $('ico-cam').src = iconURL('camera');
  $('ico-shop').src = iconURL('cart');
  const renderCard = () => {
    const it = items[idx];
    el.shopCard.innerHTML = `<button class="arrow l" type="button" data-step="-1">‹</button>${iconImg(it.icon, '')}<b>${esc(it.title)}</b><small>${esc(it.note ?? '')}</small><div class="price">${it.price} ₽</div><button class="arrow r" type="button" data-step="1">›</button>`;
    el.shopDots.innerHTML = items.map((_, k) => `<i class="${k === idx ? 'on' : ''}"></i>`).join('');
    updateSlide();
  };
  const step = (d) => {
    idx = (idx + d + items.length) % items.length;
    renderCard();
  };
  const updateSlide = () => {
    const poor = money < items[idx].price;
    el.slide.classList.toggle('no', poor);
    el.slideText.textContent = poor ? 'Не хватает денег' : `Сдвинь → заказать за ${items[idx].price} ₽`;
  };
  el.shopCard.addEventListener('click', (e) => {
    const d = e.target.closest('[data-step]')?.dataset.step;
    if (d) step(Number(d));
  });
  let swipeX = null;
  el.shopCard.addEventListener('pointerdown', (e) => (swipeX = e.clientX));
  el.shopCard.addEventListener('pointerup', (e) => {
    if (swipeX !== null && Math.abs(e.clientX - swipeX) > 40) step(e.clientX < swipeX ? 1 : -1);
    swipeX = null;
  });
  // slide-to-buy: drag the knob to the other end
  el.slideKnob.style.backgroundImage = `url(${iconURL('cart', { bare: true })})`;
  let drag = null;
  const maxX = () => el.slide.clientWidth - el.slideKnob.offsetWidth - 10;
  const setKnob = (x, anim = false) => {
    el.slideKnob.style.transition = el.slideFill.style.transition = anim ? 'transform 0.25s, width 0.25s' : 'none';
    el.slideKnob.style.transform = `translateX(${x}px)`;
    el.slideFill.style.width = `${x + 30}px`;
  };
  el.slideKnob.addEventListener('pointerdown', (e) => {
    if (money < items[idx].price) return;
    drag = { x0: e.clientX };
    el.slideKnob.setPointerCapture(e.pointerId);
  });
  el.slideKnob.addEventListener('pointermove', (e) => drag && setKnob(Math.max(0, Math.min(maxX(), e.clientX - drag.x0))));
  el.slideKnob.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const x = e.clientX - drag.x0;
    drag = null;
    if (x >= maxX() * 0.9) {
      onBuy(items[idx].id);
      el.slide.animate([{ background: 'rgba(127,212,138,0.6)' }, { background: '' }], 500);
    }
    setKnob(0, true);
  });
  renderCard();

  const tab = (which) => {
    el.tabCam.classList.toggle('on', which === 'cam');
    el.tabShop.classList.toggle('on', which === 'shop');
    el.cam.hidden = which !== 'cam';
    el.shop.hidden = which !== 'shop';
  };
  el.tabCam.addEventListener('click', () => tab('cam'));
  el.tabShop.addEventListener('click', () => tab('shop'));

  const bar = (v, cls = '') => `<div class="bar ${cls} ${v < 25 ? 'low' : ''}"><i style="width:${Math.max(0, Math.min(100, v)).toFixed(0)}%"></i></div>`;

  return {
    el,
    reset() {
      cache = {};
    },
    shopStep: step,
    // progress of a hands-on action, under the crosshair
    setUse(h) {
      const u = $('use');
      u.hidden = !h;
      if (!h) return;
      u.classList.toggle('top', !!h.top); // close-ups: keep the middle of the screen free
      set('useLabel', $('use-label'), esc(h.label));
      $('use-bar').parentElement.hidden = h.progress === null;
      $('use-bar').style.width = `${Math.round((h.progress ?? 0) * 100)}%`;
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
      // the courier: when he comes and with what, right under the clock
      const atDoor = game.visitor?.type === 'courier';
      const order = game.orders.find((o) => !o.done);
      el.courier.hidden = !atDoor && !order;
      el.courier.classList.toggle('here', atDoor);
      if (atDoor) el.courier.textContent = `🛵 Курьер у двери! Открой (${Math.ceil(game.visitor.left)} c)`;
      else if (order) el.courier.textContent = `🛵 Курьер через ${game.gameMinutes(order.eta)} мин: ${order.title}`;
      el.total.style.width = `${st.totalFun}%`;
      el.total.parentElement.classList.toggle('low', st.totalFun < 25);
      el.hut.style.width = `${st.hut}%`;
      el.hut.parentElement.classList.toggle('low', st.hut < 25);
      el.noise.style.width = `${game.noiseLevel * 100}%`;
      el.noise.parentElement.classList.toggle('hot', game.noiseLevel > 0.75);
      el.anger.textContent = st.anger ? `×${st.anger}` : '';
      el.energy.style.width = `${game.oleg.energy}%`;
      el.energy.parentElement.classList.toggle('low', game.oleg.energy < 20);
      el.ofun.style.width = `${game.oleg.fun}%`;
      el.ofun.parentElement.classList.toggle('low', game.oleg.fun < 25);
      el.othirst.hidden = game.oleg.thirst < TUNE.olegThirst.from; // Oleg wants a drink

      // who needs Oleg: name, fun, and a "!" when something is wrong (what exactly — look at him)
      const row = (name, fun, bad) => `<div class="row ${bad ? 'bad' : ''}"><span class="name">${esc(name)}</span><span class="badge ${bad ? '' : 'off'}">!</span>${bar(fun)}</div>`;
      const rows = [
        ...game.friends.map((f) => row(f.name, f.fun, !!f.problem)),
        row('Кот', game.cat.gone ? 0 : game.cat.fun, !!(game.cat.gone || game.cat.problem)),
      ];
      set('people', el.people, rows.join(''));

      set('toasts', el.toasts, game.toasts.slice(-2).map((t) => `<div class="toast ${t.kind}">${t.room ? `<small>${esc(t.room)}</small>` : ''}${esc(t.text)}</div>`).join(''));

      if (game.talkLocked) {
        const k = game.talk;
        const left = Math.max(0, Math.ceil((k.dur ?? 6) * 0.5 - (st.t - k.start)));
        target = { name: `Слушаешь: ${k.friend.name}` , info: () => `уйти можно через ${left} с` };
        actions = [];
      }
      let p = '';
      if (target) {
        p += `<div class="what">${esc(target.name)}</div>`;
        const info = target.info?.();
        if (info) p += `<div class="info">${esc(info)}</div>`;
        for (const a of actions) p += `<div class="act"><kbd>${a.key}</kbd>${esc(a.text)}</div>`;
      }
      set('prompt', el.prompt, p);

      // a real (Qwen) icon if there is one, otherwise the emoji
      const pic = (it) => (hasRealIcon(it) ? iconImg(it, '') : `<span class="emo">${ITEMS[it].icon}</span>`);
      set('hotbar', el.hotbar, game.inv.slots
        .map((it, i) => `<div class="slot ${i === game.inv.sel ? 'sel' : ''}"><span class="k">${i + 1}</span>${it ? pic(it) : ''}</div>`)
        .join(''));
      el.handName.textContent = game.inv.selectedItem() ? ITEMS[game.inv.selectedItem()].name : '';

      el.doorAlert.hidden = !game.visitor || !el.phone.hidden;
      el.blackout.hidden = !(game.oleg.blackout > 0);

      if (!el.phone.hidden) {
        el.phoneTime.textContent = game.clock;
        set('money', el.phoneMoney, `${iconImg('money', '')}${st.money} ₽`);
        if (money !== st.money) {
          money = st.money;
          updateSlide();
        }
        el.camWho.textContent = game.visitor ? `Стучит: ${game.visitor.name}. Открой дверь в прихожей` : 'У двери никого';
        el.camWho.classList.toggle('busy', !!game.visitor);
        set('orders', el.orders, game.orders
          .map((o) => `<div class="order">${iconImg(o.icon ?? 'cart', '')}<div class="bar"><i style="width:${(100 * (1 - Math.max(0, o.eta) / o.total)).toFixed(0)}%"></i></div><span>~${game.gameMinutes(Math.max(0, o.eta))} мин</span></div>`)
          .join(''));
      }
    },
  };
}
