/* App shell: side navigation, top bar, router */
(function () {
  const { ms, esc } = UI;
  // Side navigation items — icons are the CLM nav assets from Figma (Side Navigation component)
  const NAV = [
    ['cockpit', 'nav-layout-b', 'Cockpit'], ['shipments', 'nav-shipping', 'Shipments'], ['equipment', 'nav-equipment', 'Equipment'],
    ['hub', 'nav-account-balance', 'Consolidation Hub'], ['projects', 'nav-layout-b', 'Projects'], ['zone', 'nav-blur', 'Logistics Zone'],
    ['material', 'nav-layers', 'Material Management'], ['team', 'nav-group-add', 'Team'], ['help', 'nav-help', 'Help'], ['upload', 'nav-upload', 'Upload'],
    ['admin', 'nav-admin', 'Administrator'],
  ];
  const NA_ICON = { cockpit: 'dashboard', equipment: 'precision_manufacturing', hub: 'account_balance', projects: 'dashboard', zone: 'blur_circular', material: 'layers', team: 'group_add', help: 'help', admin: 'group' };
  const view = document.getElementById('view');

  // ---------- shell ----------
  const items = document.getElementById('snItems');
  items.innerHTML = NAV.map(([k, ic, l]) => `<a class="sn-item" href="#/${k === 'shipments' ? 'shipments' : k === 'upload' ? 'upload' : 'na/' + k}" data-nav="${k}" data-tip="${l}" data-tip-pos="right"><span class="nav-ic"><img src="assets/fig/${ic}.svg" alt=""></span><span>${l}</span></a>`).join('');
  const app = document.getElementById('app');
  const setCollapsed = (v) => { app.classList.toggle('nav-collapsed', v); document.getElementById('snBurger').dataset.tip = v ? 'Expand menu' : 'Collapse menu'; };
  setCollapsed(!!S.prefs.navCollapsed);
  document.getElementById('snBurger').onclick = () => { S.prefs.navCollapsed = !S.prefs.navCollapsed; S.savePrefs(); setCollapsed(S.prefs.navCollapsed); };
  // only show nav tooltips when collapsed
  items.addEventListener('mouseover', (e) => { const a = e.target.closest('.sn-item'); if (a && !app.classList.contains('nav-collapsed')) a.removeAttribute('data-tip'); else if (a) a.dataset.tip = a.textContent.trim(); });

  // Site switcher — CLM Figma 26049:55842 (search + site list, selected site in olive with check)
  const SITES = [['All Sites', 'All projects'], ['Aerial View Site', 'Coopers'], ['Augustana College', 'Bradly Construction Project'], ['Construction site 01', 'LYDL'], ['Construction site 002', 'Coopers'], ['1000 Org Construction', 'Grace Pacific']];
  const CURRENT = 'Augustana College';
  document.getElementById('siteSelect').onclick = (e) => {
    const anchor = e.currentTarget;
    const el = UI.float(anchor, `<div class="ss-search input-icon">${ms('search')}<input class="input" placeholder="Search sites" id="ssQ" autocomplete="off"></div><div class="ss-list" id="ssList"></div>`, { cls: 'site-pop' });
    if (!el) return;
    el.style.width = anchor.getBoundingClientRect().width + 'px'; UI.place(el, anchor, 'left', 4);
    const draw = (q = '') => {
      const list = SITES.filter(([n, p]) => (n + ' ' + p).toLowerCase().includes(q.toLowerCase()));
      el.querySelector('#ssList').innerHTML = list.map(([n, p]) => `<button class="ss-item ${n === CURRENT ? 'on' : ''}" data-site="${esc(n)}"><span class="grow"><b>${esc(n)}</b><small>${esc(p)}</small></span>${n === CURRENT ? ms('check', 's24') : ''}</button>`).join('') || '<div class="cap" style="padding:12px 16px">No site found</div>';
    };
    draw(); el.querySelector('#ssQ').oninput = (ev) => draw(ev.target.value); setTimeout(() => el.querySelector('#ssQ').focus(), 30);
    el.onclick = (ev) => { const b = ev.target.closest('[data-site]'); if (!b) return; UI.closeFloat(); if (b.dataset.site !== CURRENT) UI.toast(`Only <b>${esc(CURRENT)}</b> has demo data. Other sites are not part of this demo.`, { icon: 'info' }); };
  };
  document.getElementById('langBtn').onclick = (e) => UI.menu(e.currentTarget, [['EN', 'English'], ['DE', 'Deutsch'], ['FR', 'Français'], ['IT', 'Italiano']].map(([c, l], i) => ({
    label: l, hint: c, on: i === 0, onClick: () => { if (i) UI.toast('Translations are not part of this demo.', { icon: 'translate' }); },
  })), { align: 'right' });
  document.getElementById('bellBtn').onclick = (e) => {
    const list = S.data.NOTIFICATIONS;
    const el = UI.float(e.currentTarget, `<div style="width:360px"><div class="row" style="padding:14px 16px 8px"><b style="font-weight:500;font-size:16px">Notifications</b><span class="sp"></span><button class="btn text sm" data-read>Mark all as read</button></div>
      ${list.map((n, i) => `<a class="row" href="${n.link}" data-n="${i}" style="padding:10px 16px;gap:12px;align-items:flex-start;color:var(--t1);text-decoration:none;border-top:1px solid #eee">${ms(n.icon)}<span class="grow" style="font-size:13px">${n.text}<div class="cap">${UI.dt(n.at)}</div></span></a>`).join('')}</div>`, { align: 'right' });
    if (!el) return;
    UI.place(el, e.currentTarget, 'right');
    el.querySelectorAll('a .ms').forEach((m, i) => m.style.color = { error: 'var(--err)', success: 'var(--succ)', neutral: 'var(--icon)' }[list[i].tone]);
    el.querySelector('[data-read]').onclick = () => { document.getElementById('bellDot').remove(); UI.closeFloat(); };
    el.onclick = (ev) => { if (ev.target.closest('a')) UI.closeFloat(); };
  };
  document.getElementById('avatarBtn').onclick = (e) => UI.menu(e.currentTarget, [
    { header: 'Max Mustermann · Team pRED' },
    { label: 'My profile', icon: 'person', onClick: () => UI.toast('Profile is not part of this demo.', { icon: 'info' }) },
    { sep: true },
    { label: 'Reset demo data', icon: 'restart_alt', onClick: async () => {
      if (await UI.confirm({ title: 'Reset demo data?', text: 'All changes you made in this browser (new shipments, status changes, uploads…) will be removed and the original demo data restored.', ok: 'Reset', danger: true })) {
        S.reset(); setCollapsed(false); UI.go('#/shipments'); UI.toast('Demo data restored');
      } } },
  ], { align: 'right', minWidth: 240 });

  // ---------- router ----------
  function route() {
    UI.closeFloat();
    document.querySelectorAll('.scrim').forEach((s) => s.remove());
    const h = location.hash.replace(/^#\/?/, '') || 'shipments';
    const [name, a, b] = h.split('/');
    let nav = 'shipments';
    view.scrollTop = 0;
    if (name === 'shipments' || name === '') HUB.render(view);
    else if (name === 'group') GROUP.render(view, a, decodeURIComponent(b || ''));
    else if (name === 'shipment') DETAILS.render(view, a, b);
    else if (name === 'create') CREATE.render(view);
    else if (name === 'upload') { UPLOAD.render(view); nav = 'shipments'; }
    else if (name === 'na') { nav = a; notAvailable(a); }
    else HUB.render(view);
    items.querySelectorAll('.sn-item').forEach((x) => x.classList.toggle('active', x.dataset.nav === nav));
    const title = { shipments: 'Shipments', group: 'Working package', shipment: 'Shipment', create: 'Create shipment', upload: 'Upload', na: 'CLM' }[name] || 'Shipments';
    document.title = 'CLM · ' + title;
    fitPanels();
  }
  // The right-hand details panel sticks below the page header and always fills the remaining height
  function fitPanels() {
    requestAnimationFrame(() => {
      const h = view.querySelector('.sticky-head')?.offsetHeight || 0;
      view.querySelectorAll('.split-layout').forEach((el) => el.style.setProperty('--rp-top', (h + 24) + 'px'));
    });
  }
  window.fitPanels = fitPanels;
  window.addEventListener('resize', fitPanels);
  new MutationObserver(fitPanels).observe(view, { childList: true });
  function notAvailable(k) {
    const n = NAV.find((x) => x[0] === k) || NAV[0];
    view.innerHTML = `<div class="page"><div class="na-page"><div>${ms(NA_ICON[k] || 'info')}<h2>${n[2]}</h2><p>This area is not part of this demo.<br>The demo covers the <b>Shipments</b> module end-to-end.</p><a class="btn primary" style="margin-top:16px" href="#/shipments">${ms('local_shipping')}Go to Shipments</a></div></div></div>`;
  }
  // back-arrow navigation: return to the screen the user came from
  const stack = [];
  window.addEventListener('hashchange', (e) => {
    const from = (e.oldURL || '').split('#')[1]; const to = location.hash.slice(1);
    if (window.__backNav) { window.__backNav = false; } else if (from && from !== to && !from.startsWith('/create') && from.split('/').slice(0, 3).join('/') !== to.split('/').slice(0, 3).join('/')) stack.push('#' + from);
    route();
  });
  window.goBack = (fallback = '#/shipments') => {
    let prev = stack.pop();
    while (prev && prev === location.hash) prev = stack.pop();
    window.__backNav = true; location.hash = prev || fallback;
  };
  route();
})();
