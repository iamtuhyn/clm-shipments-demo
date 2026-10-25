/* Group page (working package / destination / sender / recipient)
   Layout follows CLM Figma "Lean card group views" (31454:71841): tinted header band with key facts,
   status check-filters, list / cards switch, Add shipment — rendered with Amlog DS tokens & components. */
(function () {
  const { D, WP_STATUS } = CLM;
  const { esc, ms, hl, tradeColor, tradeDark } = UI;
  const BUCKETS = [
    { k: 'open', label: 'Open', icon: 'assets/fig/f-open.svg', test: (s) => s.status === 'Open' },
    { k: 'approved', label: 'Approved', icon: 'assets/fig/f-approved.svg', test: (s) => !['Open', 'Completed', 'Canceled', 'Rejected'].includes(s.status) },
    { k: 'completed', label: 'Completed', icon: 'assets/fig/f-completed.svg', test: (s) => s.status === 'Completed' },
    { k: 'canceled', label: 'Canceled', icon: null, test: (s) => ['Canceled', 'Rejected'].includes(s.status) },
  ];
  const STATUS_TXT = { overdue: ['warning', 'var(--color-status-error-fg)'], active: ['fiber_manual_record', 'var(--color-status-success-fg)'], pending: ['schedule', 'var(--color-raisin-300)'], completed: ['library_add_check', 'var(--color-data-12)'] };
  let st = null;

  function render(view, by, key) {
    const wp = by === 'wp' ? S.wp(key) : null;
    if (by === 'wp' && !wp) { view.innerHTML = `<div class="page"><div class="na-page"><div>${ms('folder_off')}<h2>Working package not found</h2><a class="btn" href="#/shipments">Back to Shipments</a></div></div></div>`; return; }
    if (!st || st.id !== by + key) st = { id: by + key, on: { open: true, approved: true, completed: true, canceled: true }, view: st?.view || 'cards', q: {} };
    const all = by === 'wp' ? S.shipmentsOf(key) : S.data.SHIPMENTS.filter((s) => S.groupKey(s, by) === key).sort((a, b) => a.date.localeCompare(b.date));
    const counts = Object.fromEntries(BUCKETS.map((b) => [b.k, all.filter(b.test).length]));
    const status = wp ? S.wpStatus(wp) : null;

    // header facts
    const sep = '<i class="gh-sep"></i>';
    const fact = (l, v) => `<span class="gh-fact"><b>${l}:</b> <span>${esc(v)}</span></span>`;
    let facts;
    if (wp) {
      const [ic, col] = STATUS_TXT[status];
      facts = `<span class="gh-trade ${tradeDark(wp.trade) ? 'dark-t' : ''}" style="background:${tradeColor(wp.trade)}">${esc(wp.trade)}</span>${fact('Building', wp.building)}${sep}${fact('Floor', wp.floor)}${sep}${fact('Duration', `${D.fmt(wp.from)} - ${D.fmt(wp.to)}`)}<span class="gh-status" style="color:${col}">${ms(ic, 's18')}${WP_STATUS[status].label}</span>`;
    } else {
      const uniq = (f) => new Set(all.map(f)).size;
      const pad = (n) => String(n).padStart(2, '0');
      const parts = by === 'destination'
        ? [['Laydown areas', pad(uniq((s) => s.zone))], ['Senders', pad(uniq((s) => s.sender))], ['Working packages', pad(uniq((s) => s.wpId))]]
        : by === 'sender'
          ? [['Recipients', pad(uniq((s) => s.recipient))], ['Buildings', pad(uniq((s) => s.building))], ['Working packages', pad(uniq((s) => s.wpId))]]
          : [['Senders', pad(uniq((s) => s.sender))], ['Buildings', pad(uniq((s) => s.building))], ['Working packages', pad(uniq((s) => s.wpId))]];
      facts = `<span class="gh-trade" style="background:var(--color-raisin-300)">${S.groupLabel(by)}</span>` + parts.map(([l, v]) => fact(l, v)).join(sep);
    }
    const org = wp ? wp.sender : by === 'sender' || by === 'recipient' ? key : null;

    view.innerHTML = `
    <div class="page gpage">
      <div class="sticky-head gh">
        <div class="gh-band">
          <button class="back" id="gBack" data-tip="Back">${ms('arrow_back')}</button>
          <div class="grow">
            <div class="gh-title"><h1>${esc(wp ? wp.title : key)}</h1>${wp ? `<button class="icon-btn sm" id="gEdit" data-tip="Edit working package">${ms('edit', 's18')}</button><button class="icon-btn sm" id="gMore" data-tip="More actions">${ms('more_vert', 's18')}</button>` : ''}</div>
            <div class="gh-facts">${facts}</div>
          </div>
          ${org ? `<div class="gh-logo" data-tip="${esc(org)}">${esc(org.split(/[\s.&]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase())}<small>${esc(org)}</small></div>` : ''}
        </div>
        <div class="gh-bar">
          <div class="gh-filters">${BUCKETS.filter((b) => b.k !== 'canceled' || counts.canceled).map((b) => `<button class="sfilter ${b.k} ${st.on[b.k] ? 'on' : ''}" data-b="${b.k}" aria-pressed="${st.on[b.k]}"><span class="cbx"></span>${b.icon ? `<img src="${b.icon}" width="24" height="24" alt="">` : ms('block')}<b>${counts[b.k]}</b>${b.label}</button>`).join('')}</div>
          <span class="sp"></span>
          <div class="itabs" role="tablist">${[['list', 'view_list', 'List'], ['cards', 'view_module', 'Cards']].map(([k, ic, t]) => `<button class="itab ${st.view === k ? 'on' : ''}" data-v="${k}" data-tip="${t}">${ms(ic)}</button>`).join('')}</div>
          ${!wp || status !== 'completed' ? `<button class="btn primary" id="gAdd">${ms('add')}Add shipment</button>` : ''}
        </div>
      </div>
      <div class="gbody" id="gBody"></div>
    </div>`;

    const draw = () => {
      const list = all.filter((s) => BUCKETS.some((b) => st.on[b.k] && b.test(s)));
      view.querySelector('#gBody').innerHTML = !all.length ? emptyHtml(wp, status, 'No shipments in this working package yet.')
        : !list.length ? emptyHtml(null, null, 'No shipments match the selected status.')
          : st.view === 'cards' ? `<div class="scards">${list.map(cardHtml).join('')}</div>` : tableHtml(list, by);
      bindBody(view, by, key);
    };
    draw();

    view.querySelectorAll('.sfilter').forEach((b) => b.onclick = () => { st.on[b.dataset.b] = !st.on[b.dataset.b]; b.classList.toggle('on'); b.setAttribute('aria-pressed', st.on[b.dataset.b]); draw(); });
    view.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => { st.view = b.dataset.v; view.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
    view.querySelector('#gBack').onclick = () => goBack();
    view.querySelector('#gAdd')?.addEventListener('click', () => CREATE.start({ wpId: wp ? wp.id : null }));
    view.querySelector('#gEdit')?.addEventListener('click', () => WPFORM.open(wp));
    view.querySelector('#gMore')?.addEventListener('click', (e) => moreMenu(e.currentTarget, wp, all, () => render(view, by, key)));
  }

  function emptyHtml(wp, status, text) {
    return `<div class="empty card">${ms('local_shipping')}<span>${text}</span>${wp && status !== 'completed' ? `<button class="btn primary" data-addship>${ms('add')}Add shipment</button>` : ''}</div>`;
  }

  // shipment card — Figma "Lean card" shipment card on DS tokens
  function statusIcon(s, size = 20) { return HUB_legendShipIcon(s.status, size); }
  function cardHtml(s) {
    const cr = S.person(s.createdBy);
    return `<div class="scard" data-ship="${s.id}" tabindex="0">
      <div class="sc-head">${statusIcon(s)}<span class="ell" data-tip="${esc(s.name)}">${esc(s.name)}</span><button class="icon-btn sm sc-menu" data-rowmenu="${s.id}" data-tip="Actions">${ms('more_vert', 's18')}</button></div>
      <div class="sc-when"><span>${ms('event', 's16')}${D.fmt(s.date)}</span><i></i><span>${ms('schedule', 's16')}${s.start} - ${s.end}</span></div>
      <div class="sc-rows">
        <div>${ms('location_on', 's16')}<b>Unloading Zone (UP)-</b><span>${esc(s.up)}</span></div>
        <div>${ms('corporate_fare', 's16')}<b>Building-</b><span>${esc(s.building)}</span></div>
        <div>${ms('storage', 's16')}<b>Floor-</b><span>${esc(s.floor)}</span></div>
      </div>
      <div class="sc-foot"><span class="avatar sm">${UI.initials(cr.name)}</span><div style="min-width:0"><div>Created by</div><div class="ell">${esc(cr.name)} <i>|</i> ${D.fmt(s.created.slice(0, 10))}. ${s.created.slice(11)}</div></div></div>
    </div>`;
  }
  function createdLabel(iso) { const [d, t] = iso.split('T'); return `${+d.slice(8)} ${D.monthName(d, true)} ${d.slice(0, 4)}, ${t}`; }

  // list view — DS table with a search row per column (as in the Figma list view)
  const COLS = [
    ['name', 'Shipment', (s) => s.name], ['date', 'Date', (s) => D.fmt(s.date)], ['time', 'Time', (s) => `${s.start} - ${s.end}`],
    ['up', 'UP', (s) => s.up], ['building', 'Building', (s) => s.building], ['floor', 'Floor', (s) => s.floor],
    ['by', 'Created by', (s) => S.person(s.createdBy).name], ['on', 'Created on', (s) => createdLabel(s.created)],
  ];
  function tableHtml(list) {
    const q = st.q;
    const rows = list.filter((s) => COLS.every(([k, , f]) => !q[k] || String(f(s)).toLowerCase().includes(q[k].toLowerCase())));
    return `<div class="gtable"><table class="table">
      <thead><tr>${COLS.map(([, l]) => `<th>${l}</th>`).join('')}<th style="width:44px"></th></tr>
      <tr class="srch">${COLS.map(([k]) => `<th><input class="input" data-q="${k}" placeholder="Search" value="${esc(q[k] || '')}"></th>`).join('')}<th></th></tr></thead>
      <tbody>${rows.map((s) => `<tr class="click" data-ship="${s.id}">
        <td><div class="row" style="gap:8px;max-width:240px">${statusIcon(s, 18)}<span class="ell tline1" data-tip="${esc(s.name)}">${hl(s.name, q.name)}</span></div></td>
        <td class="nowrap">${D.fmt(s.date)}</td><td class="nowrap">${s.start} - ${s.end}</td><td>${esc(s.up)}</td><td class="nowrap">${esc(s.building)}</td><td>${esc(s.floor)}</td>
        <td><div class="row nowrap" style="gap:8px"><span class="avatar sm">${UI.initials(S.person(s.createdBy).name)}</span>${esc(S.person(s.createdBy).name)}</div></td>
        <td class="nowrap">${createdLabel(s.created)}</td>
        <td style="padding-left:0"><button class="icon-btn sm" data-rowmenu="${s.id}" data-tip="Actions">${ms('more_vert')}</button></td></tr>`).join('') || `<tr><td colspan="9" class="cap" style="text-align:center;padding:24px">No shipments match your search.</td></tr>`}</tbody>
    </table></div>`;
  }

  function bindBody(view, by, key) {
    const body = view.querySelector('#gBody');
    body.onclick = (e) => {
      const m = e.target.closest('[data-rowmenu]'); if (m) { e.stopPropagation(); rowMenu(m, S.shipment(m.dataset.rowmenu), () => render(view, by, key)); return; }
      if (e.target.closest('[data-addship]')) { CREATE.start({ wpId: by === 'wp' ? key : null }); return; }
      if (e.target.closest('input')) return;
      const r = e.target.closest('[data-ship]'); if (r) UI.go('#/shipment/' + r.dataset.ship);
    };
    body.onkeydown = (e) => { if (e.key === 'Enter' && e.target.matches('.scard')) e.target.click(); };
    body.querySelectorAll('[data-q]').forEach((inp) => inp.oninput = () => {
      st.q[inp.dataset.q] = inp.value; const k = inp.dataset.q; const pos = inp.selectionStart;
      const list = (by === 'wp' ? S.shipmentsOf(key) : S.data.SHIPMENTS.filter((s) => S.groupKey(s, by) === key)).filter((s) => BUCKETS.some((b) => st.on[b.k] && b.test(s)));
      body.innerHTML = tableHtml(list); bindBody(view, by, key);
      const n = body.querySelector(`[data-q="${k}"]`); n.focus(); n.setSelectionRange(pos, pos);
    });
  }

  function moreMenu(anchor, wp, all, after) {
    const status = S.wpStatus(wp);
    UI.menu(anchor, [
      { label: 'Add shipment', icon: 'add', disabled: status === 'completed', onClick: () => CREATE.start({ wpId: wp.id }) },
      { label: 'Duplicate working package', icon: 'content_copy', onClick: () => {
        const copy = Object.assign(JSON.parse(JSON.stringify(wp)), { id: 'wp' + Date.now(), title: wp.title + ' (copy)', completed: false });
        S.data.WPS.push(copy); S.persist(); UI.go('#/group/wp/' + copy.id); UI.toast('Working package duplicated · shipments were not copied');
      } },
      wp.completed ? { label: 'Reopen working package', icon: 'lock_open', onClick: () => { wp.completed = false; S.persist(); after(); UI.toast('Working package reopened'); } }
        : { label: 'Mark as completed', icon: 'library_add_check', onClick: async () => {
          const openN = all.filter((s) => !['Completed', 'Canceled', 'Rejected'].includes(s.status)).length;
          if (await UI.confirm({ title: 'Mark as completed?', text: openN ? `${openN} shipment${openN > 1 ? 's are' : ' is'} not completed yet. They stay as they are, but no new shipments can be added.` : 'No new shipments can be added afterwards. You can reopen it any time.', ok: 'Mark as completed' })) { wp.completed = true; S.persist(); after(); UI.toast('Working package completed'); }
        } },
      { sep: true },
      { label: 'Delete working package', icon: 'delete', danger: true, onClick: async () => {
        if (all.length) { UI.modal({ title: 'Can’t delete this working package', size: 'sm', body: `<p>It still has ${all.length} shipment${all.length > 1 ? 's' : ''}. Move or cancel them first, or mark the working package as completed.</p>`, actions: [{ label: 'OK', primary: true }] }); return; }
        if (await UI.confirm({ title: 'Delete working package?', text: `“${esc(wp.title)}” will be deleted. This can’t be undone.`, ok: 'Delete', danger: true })) { S.data.WPS = S.data.WPS.filter((w) => w !== wp); S.persist(); UI.go('#/shipments'); UI.toast('Working package deleted'); }
      } },
    ], { align: 'right', minWidth: 260 });
  }

  /* row actions shared with other pages */
  function rowMenu(anchor, s, after) {
    UI.menu(anchor, [
      { label: 'Open details', icon: 'open_in_new', onClick: () => UI.go('#/shipment/' + s.id) },
      { label: 'Duplicate', icon: 'content_copy', onClick: () => CREATE.start({ duplicate: s.id }) },
      { sep: true },
      { label: 'Cancel shipment', icon: 'block', danger: true, disabled: ['Completed', 'Canceled'].includes(s.status), onClick: () => DETAILS.cancel(s, after) },
    ], { align: 'right' });
  }
  window.GROUP = { render, rowMenu };
})();
