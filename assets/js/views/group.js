/* Group page (working package / destination / sender / recipient)
   Layout follows CLM Figma "Lean card group views" (31454:71841): tinted header band with key facts,
   status check-filters, list / cards switch, Add shipment — rendered with Amlog DS tokens & components. */
(function () {
  const { D, WP_STATUS } = CLM;
  const { esc, ms, hl, tradeColor, tradeDark } = UI;
  const BUCKETS = [
    { k: 'open', label: 'Open', tone: 'grey', icon: 'lg-open', test: (s) => s.status === 'Open' },
    { k: 'approved', label: 'Approved', tone: 'olive', icon: 'lg-approved', test: (s) => !['Open', 'Completed', 'Canceled', 'Rejected'].includes(s.status) },
    { k: 'completed', label: 'Completed', tone: 'blue', icon: 'lg-completed', test: (s) => s.status === 'Completed' },
    { k: 'canceled', label: 'Draft', tone: 'red', icon: null, test: (s) => ['Canceled', 'Rejected'].includes(s.status) },
  ];
  const STATUS_TXT = { overdue: ['warning', 'var(--color-status-error-fg)'], active: ['fiber_manual_record', 'var(--color-status-success-fg)'], pending: ['schedule', 'var(--color-raisin-300)'], completed: ['library_add_check', 'var(--color-data-12)'] };
  let st = null;

  function render(view, by, key) {
    const wp = by === 'wp' ? S.wp(key) : null;
    if (by === 'wp' && !wp) { view.innerHTML = `<div class="page"><div class="na-page"><div>${ms('folder_off')}<h2>Working package not found</h2><a class="btn" href="#/shipments">Back to Shipments</a></div></div></div>`; return; }
    if (!st || st.id !== by + key) st = { id: by + key, on: [], view: st?.view || 'cards', q: {} };
    if (by !== 'wp') st.view = 'list'; // cards are only available for working packages
    const pass = (s) => !st.on.length || BUCKETS.some((b) => st.on.includes(b.k) && b.test(s));
    const all = by === 'wp' ? S.shipmentsOf(key) : S.data.SHIPMENTS.filter((s) => S.groupKey(s, by) === key).sort((a, b) => a.date.localeCompare(b.date));
    const counts = Object.fromEntries(BUCKETS.map((b) => [b.k, all.filter(b.test).length]));
    const status = wp ? S.wpStatus(wp) : null;

    // header facts — label above value (Figma B2 · Package opened)
    const kv = (l, v) => `<div class="gh-kv"><span>${l}</span><b>${esc(v)}</b></div>`;
    const uniq = (f) => new Set(all.map(f)).size;
    const facts = wp
      ? kv('Trade', wp.trade) + kv('Location', `${wp.building} · ${wp.floor}${wp.zone ? ' · ' + wp.zone : ''}`) + kv('Booking window', `${D.fmt(wp.from)} – ${D.fmt(wp.to)}`) + kv('Sender', wp.sender) + kv('Recipient', wp.recipient) + kv('Volume', [wp.volume !== '—' && wp.volume, wp.unitsQty && `${wp.unitsQty} ${wp.units}`].filter(Boolean).join(' · ') || '—')
      : by === 'destination'
        ? kv('Laydown areas', uniq((s) => s.zone)) + kv('Senders', uniq((s) => s.sender)) + kv('Recipients', uniq((s) => s.recipient)) + kv('Working packages', uniq((s) => s.wpId))
        : kv(by === 'sender' ? 'Recipients' : 'Senders', uniq((s) => (by === 'sender' ? s.recipient : s.sender))) + kv('Buildings', uniq((s) => s.building)) + kv('Floors', uniq((s) => s.building + s.floor)) + kv('Working packages', uniq((s) => s.wpId));
    const done = counts.completed; const pct = all.length ? Math.round((done / all.length) * 100) : 0;
    const accent = wp ? tradeColor(wp.trade) : 'var(--color-action-primary)';
    const icon = { wp: 'folder', destination: 'location_on', sender: 'outbox', recipient: 'move_to_inbox' }[by];
    const statusChip = wp ? `<span class="pill ${{ overdue: 'error', active: 'success', pending: 'warning', completed: 'inactive' }[status]}">${WP_STATUS[status].label}</span>` : `<span class="pill">${S.groupLabel(by)}</span>`;

    view.innerHTML = `
    <div class="page gpage">
      <div class="sticky-head gh">
        <div class="gh-top">
          <button class="back" id="gBack" data-tip="Back">${ms('arrow_back')}</button>
          <span class="ms gh-ic" style="color:${accent}">${icon}</span>
          <h1 class="ell">${esc(wp ? wp.title : key)}</h1>${statusChip}
          <span class="sp"></span>
          ${wp ? `<button class="btn text" id="gEdit">${ms('edit')}Edit</button>` : ''}
          ${!wp || status !== 'completed' ? `<button class="btn primary" id="gAdd">${ms('add')}Shipment</button>` : ''}
        </div>
        <div class="gh-grid">${facts}</div>
        <div class="gh-prog"><div class="progress"><i style="width:${pct}%"></i></div><span>${done} of ${all.length} shipments completed</span></div>
        <div class="gh-bar">
          <span class="gh-lbl">Shipments</span>
          <div class="chips" id="gChips"></div>
          <span class="sp"></span>
          <div class="vswitch" role="tablist">${[['list', 'format_list_bulleted', 'List'], ['cards', 'grid_on', 'Cards']].map(([k, ic, t]) => `<button class="vs ${st.view === k ? 'on' : ''}" data-v="${k}" ${by !== 'wp' && k === 'cards' ? `disabled data-tip="Working packages only"` : `data-tip="${t}"`}>${ms(ic)}</button>`).join('')}</div>
        </div>
      </div>
      <div class="gbody" id="gBody"></div>
    </div>`;

    const draw = () => {
      const list = all.filter(pass);
      const chips = view.querySelector('#gChips');
      const shown = BUCKETS.filter((b) => b.k !== 'canceled' || counts.canceled);
      chips.innerHTML = UI.checkChip({ key: '', label: 'All', count: all.length, checked: !st.on.length, tone: 'olive' }) + BUCKETS.filter((b) => b.k !== 'canceled' || counts.canceled).map((b) => UI.checkChip({ key: b.k, label: b.label, count: counts[b.k], checked: st.on.includes(b.k), tone: b.tone, icon: b.icon ? UI.img(b.icon) : `<span class="ci" style="width:20px;height:20px;color:var(--color-status-error-fg)">${CLM_ICONS['sm-canceled']}</span>` })).join('');
      chips.querySelectorAll('[data-cc]').forEach((c) => c.onclick = () => { const k = c.dataset.cc; st.on = !k ? [] : st.on.includes(k) ? st.on.filter((x) => x !== k) : st.on.concat(k); if (st.on.length === shown.length) st.on = []; draw(); });
      view.querySelector('#gBody').innerHTML = !all.length ? emptyHtml(wp, status, 'No shipments in this working package yet.')
        : !list.length ? emptyHtml(null, null, 'No shipments match the selected status.')
          : st.view === 'cards' ? `<div class="scards">${list.map(cardHtml).join('')}</div>` : tableHtml(list, by);
      bindBody(view, by, key);
    };
    draw();

    view.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => { if (b.disabled) return; st.view = b.dataset.v; view.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
    view.querySelector('#gBack').onclick = () => goBack();
    view.querySelector('#gAdd')?.addEventListener('click', () => CREATE.start({ wpId: wp ? wp.id : null }));
    view.querySelector('#gEdit')?.addEventListener('click', () => WPFORM.open(wp));
  }

  function emptyHtml(wp, status, text) {
    return `<div class="empty card">${ms('local_shipping')}<span>${text}</span>${wp && status !== 'completed' ? `<button class="btn primary" data-addship>${ms('add')}Add shipment</button>` : ''}</div>`;
  }

  // shipment card — Figma "Lean card" shipment card on DS tokens
  function statusIcon(s, size = 20) { return HUB_legendShipIcon(s.status, size); }
  function cardHtml(s) {
    const cr = S.person(s.createdBy);
    return `<div class="scard" data-ship="${s.id}" tabindex="0">
      <div class="sc-head">${statusIcon(s)}<div class="grow"><div class="ell" data-tip="${esc(s.name)}">${esc(s.name)}</div><div class="sc-no">${esc(s.no)}</div></div><button class="icon-btn sm sc-menu" data-rowmenu="${s.id}" data-tip="Actions">${ms('more_vert', 's18')}</button></div>
      <div class="sc-when"><span data-tip="${D.dayName(s.date, true)}"><i class="ms">event</i>${D.fmt(s.date)}</span><span class="vr"></span><span><i class="ms">schedule</i>${s.start} – ${s.end}</span></div>
      <div class="sc-rows">
        <div><i class="ms">location_on</i><b>Unloading zone</b><em>${esc(s.up)} · ${esc(s.zone)}</em></div>
        <div><i class="ms">corporate_fare</i><b>Building</b><em>${esc(s.building)}</em></div>
        <div><i class="ms">layers</i><b>Floor</b><em>${esc(s.floor)}</em></div>
      </div>
      <div class="sc-foot"><span class="avatar sm">${UI.initials(cr.name)}</span><div class="grow"><div class="cap">Created by</div><div class="ell">${esc(cr.name)} · ${D.fmt(s.created.slice(0, 10))}, ${s.created.slice(11)}</div></div></div>
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
      const list = (by === 'wp' ? S.shipmentsOf(key) : S.data.SHIPMENTS.filter((s) => S.groupKey(s, by) === key)).filter((s) => !st.on.length || BUCKETS.some((b) => st.on.includes(b.k) && b.test(s)));
      body.innerHTML = tableHtml(list); bindBody(view, by, key);
      const n = body.querySelector(`[data-q="${k}"]`); n.focus(); n.setSelectionRange(pos, pos);
    });
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
