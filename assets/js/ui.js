/* Shared UI primitives: icons, toasts, menus, popovers, dialogs, tooltips */
(function () {
  const { D, SHIPMENT_STATUS, WP_STATUS, TRADES } = CLM;
  const layer = () => document.getElementById('layer');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ms = (name, cls = '') => `<span class="ms ${cls}">${name}</span>`;
  const ci = (name, size = 20, extra = '') => `<span class="ci" style="width:${size}px;height:${size}px;${extra}">${(window.CLM_ICONS[name] || '')}</span>`;
  const initials = (n) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const hl = (text, q) => {
    const t = esc(text); if (!q) return t;
    const i = String(text).toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return t;
    return esc(String(text).slice(0, i)) + '<mark>' + esc(String(text).slice(i, i + q.length)) + '</mark>' + esc(String(text).slice(i + q.length));
  };
  const dt = (iso) => { if (!iso) return ''; const [d, t] = iso.split('T'); return `${D.fmt(d)}${t ? ', ' + t : ''}`; };
  const isDark = (hex) => ['#F2CA27', '#C4C27A', '#71C68D', '#A09FB5', '#9E9EA7'].includes(hex);

  function wpPill(st) { const w = WP_STATUS[st]; return w ? `<span class="pill wp-${st}">${w.label}</span>` : ''; }
  function wpIcon(st, size = 16) { const w = WP_STATUS[st]; return w ? `<span data-tip="Working package: ${w.label}">${ci(w.icon, size)}</span>` : ''; }
  function shipPill(status) {
    const s = SHIPMENT_STATUS[status] || SHIPMENT_STATUS.Open;
    return `<span class="spill" style="background:${s.bg};color:${s.fg}">${ci(s.icon, 14)}${esc(s.label)}</span>`;
  }
  function shipIcon(status, size = 26) {
    const s = SHIPMENT_STATUS[status] || SHIPMENT_STATUS.Open;
    return `<span class="s-ic" style="background:${s.bg};width:${size}px;height:${size}px;color:${s.fg}" data-tip="${esc(s.label)}">${ci(s.icon, Math.round(size * 0.58))}</span>`;
  }
  function tradeColor(t) { return (TRADES[t] || { color: '#969300' }).color; }
  function tradeDark(t) { return !!(TRADES[t] || {}).dark; }

  // ---------- tooltip ----------
  const tip = document.getElementById('tip');
  let tipTarget = null, tipTimer = null;
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el === tipTarget) return;
    tipTarget = el; clearTimeout(tipTimer); tip.classList.remove('show');
    if (!el) return;
    tipTimer = setTimeout(() => {
      if (!document.body.contains(el)) return;
      tip.innerHTML = el.getAttribute('data-tip');
      const r = el.getBoundingClientRect(); const pos = el.getAttribute('data-tip-pos') || 'bottom';
      tip.style.left = '0px'; tip.style.top = '0px'; tip.classList.add('show');
      const tr = tip.getBoundingClientRect();
      let x = r.left + r.width / 2 - tr.width / 2, y = r.bottom + 6;
      if (pos === 'top') y = r.top - tr.height - 6;
      if (pos === 'right') { x = r.right + 8; y = r.top + r.height / 2 - tr.height / 2; }
      if (y + tr.height > innerHeight - 4) y = r.top - tr.height - 6;
      x = Math.max(6, Math.min(innerWidth - tr.width - 6, x));
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    }, 350);
  });
  document.addEventListener('mousedown', () => { clearTimeout(tipTimer); tip.classList.remove('show'); });
  document.addEventListener('scroll', () => tip.classList.remove('show'), true);

  // ---------- floating (menus / popovers) ----------
  let openFloat = null;
  function closeFloat() { if (openFloat) { openFloat.el.remove(); openFloat.anchor?.classList.remove('on'); const cb = openFloat.onClose; openFloat = null; cb && cb(); } }
  function place(el, anchor, align = 'left', gap = 4) {
    const r = anchor.getBoundingClientRect(); const er = el.getBoundingClientRect();
    let x = align === 'right' ? r.right - er.width : r.left;
    let y = r.bottom + gap;
    if (y + er.height > innerHeight - 8) y = Math.max(8, r.top - er.height - gap);
    x = Math.max(8, Math.min(innerWidth - er.width - 8, x));
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  function float(anchor, html, { cls = 'popover', align, onClose, hover } = {}) {
    if (openFloat && openFloat.anchor === anchor && !hover) { closeFloat(); return null; }
    closeFloat();
    const el = document.createElement('div'); el.className = cls; el.innerHTML = html;
    layer().appendChild(el); place(el, anchor, align); anchor.classList.add('on');
    openFloat = { el, anchor, onClose };
    return el;
  }
  document.addEventListener('mousedown', (e) => {
    if (!openFloat) return;
    if (openFloat.el.contains(e.target) || openFloat.anchor.contains(e.target)) return;
    closeFloat();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (openFloat) return closeFloat();
      const top = [...document.querySelectorAll('.scrim, .lightbox')].pop(); if (top) top._close?.();
    }
  });
  window.addEventListener('resize', closeFloat);
  document.addEventListener('scroll', (e) => { if (openFloat && !openFloat.el.contains(e.target)) closeFloat(); }, true);

  /* items: [{label, icon, ci, onClick, danger, on, disabled, sep, header, hint}] */
  function menu(anchor, items, opts = {}) {
    const html = items.map((it, i) => {
      if (it.sep) return '<div class="msep"></div>';
      if (it.header) return `<div class="mh">${esc(it.header)}</div>`;
      return `<button class="mi ${it.danger ? 'danger' : ''} ${it.on ? 'on' : ''}" data-i="${i}" ${it.disabled ? 'disabled' : ''}>${it.ci || (it.icon ? ms(it.icon) : '')}<span>${esc(it.label)}</span>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}${it.on ? ms('check', 'chk') : ''}</button>`;
    }).join('');
    const el = float(anchor, html, { cls: 'menu', align: opts.align });
    if (!el) return;
    if (opts.minWidth) el.style.minWidth = opts.minWidth + 'px';
    place(el, anchor, opts.align);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.mi'); if (!b || b.disabled) return;
      const it = items[+b.dataset.i]; closeFloat(); it.onClick && it.onClick();
    });
  }

  // ---------- toasts ----------
  function toast(msg, { icon = 'check_circle', err, action, onAction, ms: dur = 4200 } = {}) {
    const el = document.createElement('div'); el.className = 'toast' + (err ? ' err' : '');
    el.innerHTML = `${ms(err ? 'error' : icon)}<span class="grow">${msg}</span>${action ? `<button class="btn text">${esc(action)}</button>` : ''}<button class="icon-btn sm" style="color:#fff">${ms('close')}</button>`;
    document.getElementById('toasts').appendChild(el);
    const kill = () => { el.style.transition = 'opacity .2s'; el.style.opacity = 0; setTimeout(() => el.remove(), 200); };
    el.querySelector('.icon-btn').onclick = kill;
    if (action) el.querySelector('.btn.text').onclick = () => { kill(); onAction && onAction(); };
    setTimeout(kill, dur);
  }

  // ---------- dialogs ----------
  /* modal({title, sub, icon, iconTone, body, size, actions:[{label, primary, danger, left, icon, onClick(close) -> false keeps open}], onMount(el, close)}) */
  function modal(o) {
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    scrim.innerHTML = `<div class="dialog ${o.size || ''}" role="dialog" aria-modal="true">
      <div class="dlg-h">${o.icon ? `<span class="dlg-icon ${o.iconTone || 'olive'}">${ms(o.icon)}</span>` : ''}<div class="grow"><h2>${o.title}</h2>${o.sub ? `<div class="card-sub">${o.sub}</div>` : ''}</div>${o.noClose ? '' : `<button class="icon-btn" data-x data-tip="Close">${ms('close')}</button>`}</div>
      <div class="dlg-b">${o.body || ''}</div>
      ${o.actions ? `<div class="dlg-f">${o.actions.map((a, i) => `<button class="btn ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''} ${a.text ? 'text' : ''} ${a.left ? 'left' : ''}" data-a="${i}">${a.icon ? ms(a.icon) : ''}${esc(a.label)}</button>`).join('')}</div>` : ''}
    </div>`;
    document.body.appendChild(scrim);
    const close = () => { scrim.remove(); o.onClose && o.onClose(); };
    scrim._close = close;
    scrim.addEventListener('mousedown', (e) => { if (e.target === scrim && !o.sticky) close(); });
    scrim.querySelector('[data-x]')?.addEventListener('click', close);
    scrim.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = o.actions[+b.dataset.a]; const r = a.onClick ? a.onClick(close, scrim) : undefined; if (r !== false) close();
    }));
    o.onMount && o.onMount(scrim.querySelector('.dialog'), close);
    setTimeout(() => scrim.querySelector('input:not([type=hidden]):not([readonly]), textarea')?.focus(), 30);
    return { el: scrim, close };
  }
  function confirm({ title, text, ok = 'Confirm', danger, icon }) {
    return new Promise((res) => {
      modal({ title, size: 'sm', icon: icon || (danger ? 'warning' : 'help'), iconTone: danger ? 'warn' : 'olive', body: `<p class="muted">${text}</p>`,
        actions: [{ label: 'Cancel', text: true, onClick: () => res(false) }, { label: ok, primary: true, danger, onClick: () => res(true) }], onClose: () => res(false) });
    });
  }
  function lightbox(srcs, i = 0) {
    const el = document.createElement('div'); el.className = 'lightbox';
    const draw = () => { el.innerHTML = `<img src="${srcs[i]}" alt=""><button class="icon-btn" style="top:16px;right:16px" data-c>${ms('close', 's24')}</button>${srcs.length > 1 ? `<button class="icon-btn" style="left:16px;top:50%" data-p>${ms('chevron_left', 's24')}</button><button class="icon-btn" style="right:16px;top:50%" data-n>${ms('chevron_right', 's24')}</button><div style="position:absolute;bottom:20px;color:#fff;font-size:13px">${i + 1} / ${srcs.length}</div>` : ''}`; };
    draw(); document.body.appendChild(el);
    el._close = () => el.remove();
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-p]')) { i = (i - 1 + srcs.length) % srcs.length; draw(); }
      else if (e.target.closest('[data-n]')) { i = (i + 1) % srcs.length; draw(); }
      else if (e.target.closest('[data-c]') || e.target === el) el.remove();
    });
  }

  // simple file picker (local only, nothing is uploaded anywhere)
  function pickFiles(accept, multiple = true) {
    return new Promise((res) => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept || ''; inp.multiple = multiple;
      inp.onchange = () => res([...inp.files]); inp.click();
    });
  }
  const fileSize = (b) => (b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB');

  // DS weather assets (Amlog DS/Asset/Weather)
  const WX = { sun: 'w-sun', sunny: 'w-sun', partly: 'w-partly', partly_cloudy_day: 'w-partly', cloud: 'w-cloud', rain: 'w-rain', rainy: 'w-rain' };
  const wx = (kind, size = 24, cls = '') => `<img class="${cls}" src="assets/fig/${WX[kind] || 'w-sun'}.svg" width="${size}" height="${size}" alt="">`;
  // DS status dots for filter pills (status/*/fg)
  const DOT = { overdue: '#B51C00', active: '#065F46', pending: '#92400E', completed: '#54545D' };

  /* Amlog DS/Pattern/Working Package Card (folder) — o: { title, trade, building, floor, dates, sender, counts:{open,approved,completed,draft}, status, sel, attrs, tabLabel, tabColor } */
  function wpCard(o) {
    const col = o.tabColor || tradeColor(o.trade); const dark = o.tabColor ? false : tradeDark(o.trade);
    const c = o.counts || {};
    return `<div class="fcard ${o.sel ? 'sel' : ''}" tabindex="0" ${o.attrs || ''}>
      <div class="ftab ${dark ? 'dark-t' : ''}" style="background:${col}">${esc(o.tabLabel || o.trade)}</div>
      <div class="fbody">
        <div class="ft"><span class="t" data-tip="${esc(o.title)}">${o.titleHtml || esc(o.title)}</span>${o.sel ? `<span class="chk">${ms('check')}</span>` : o.status ? `<span data-tip="Working package: ${WP_STATUS[o.status].label}">${ci(WP_STATUS[o.status].icon, 18)}</span>` : ''}</div>
        <div class="fl"><img src="assets/fig/wp-building.svg" width="20" height="20" alt="">${esc(o.building)}</div>
        <div class="fl"><img src="assets/fig/wp-floor.svg" width="20" height="20" alt="">${esc(o.floor)}</div>
        <div class="fl">${esc(o.dates)}</div>
        <div class="fsub">${esc(o.sender)}</div>
        <div class="fstats">
          <span data-tip="Open"><img src="assets/fig/wp-open.svg" alt="">${c.open || 0}</span>
          <span data-tip="Approved / in progress"><img src="assets/fig/wp-approved.svg" alt="">${c.approved || 0}</span>
          <span data-tip="Completed"><img src="assets/fig/wp-completed.svg" alt="">${c.completed || 0}</span>
          <span data-tip="Draft / canceled"><img src="assets/fig/chip-draft.svg" alt="">${c.draft || 0}</span>
        </div>
      </div></div>`;
  }

  /* Check chip — CLM chip style (checkbox + icon + zero-padded count + label, tinted by status) */
  const pad2 = (n) => String(n).padStart(2, '0');
  function checkChip({ key, label, count, checked, tone, icon }) {
    return `<button class="cchip ${tone} ${checked ? 'on' : ''}" data-cc="${key}" aria-pressed="${!!checked}">${icon || ''}<span class="cc-t">${pad2(count)} ${label}</span></button>`;
  }
  const img = (name, size = 20) => `<img src="assets/fig/${name}.svg" width="${size}" height="${size}" alt="">`;

  /* Form dropdown — CLM Figma 31468:83736. Replaces the browser's native list for every <select class="select">.
     The native select stays in the DOM (hidden) as the value holder, so existing change handlers keep working. */
  function enhanceSelect(sel) {
    if (sel._dd) return; sel._dd = true;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cselect';
    const sync = () => { const o = sel.options[sel.selectedIndex]; btn.innerHTML = `<span class="${!o || !o.value ? 'ph' : ''}">${esc(o ? o.text : '')}</span>`; btn.disabled = sel.disabled; };
    sync(); sel.after(btn); sel.classList.add('select-native');
    btn.onclick = () => {
      const opts = [...sel.options];
      const el = float(btn, opts.map((o, i) => `<button type="button" class="dd-i ${i === sel.selectedIndex && o.value ? 'on' : ''} ${!o.value ? 'ph' : ''}" data-i="${i}" ${o.disabled ? 'disabled' : ''}><span>${esc(o.text)}</span>${i === sel.selectedIndex && o.value ? `<img src="assets/fig/dd-check.svg" width="16" height="16" alt="">` : ''}</button>`).join(''), { cls: 'dd-pop' });
      if (!el) return;
      el.style.width = btn.getBoundingClientRect().width + 'px'; place(el, btn, 'left', 2);
      el.querySelector('.dd-i.on')?.scrollIntoView({ block: 'nearest' });
      el.onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; sel.selectedIndex = +b.dataset.i; closeFloat(); sync(); sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); };
    };
    sel.addEventListener('change', sync);
  }
  const enhanceAll = (root) => root.querySelectorAll && root.querySelectorAll('select.select').forEach(enhanceSelect);
  new MutationObserver((ms_) => ms_.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches?.('select.select')) enhanceSelect(n); enhanceAll(n); } }))).observe(document.body, { childList: true, subtree: true });

  function go(hash) { if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash; }

  window.UI = { checkChip, img, wx, wpCard, DOT, esc, ms, ci, initials, hl, dt, isDark, wpPill, wpIcon, shipPill, shipIcon, tradeColor, tradeDark, menu, float, closeFloat, place, toast, modal, confirm, lightbox, pickFiles, fileSize, go };
})();
