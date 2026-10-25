/* Group page — a working package (or destination / sender / recipient group) with its shipments */
(function () {
  const { D, WP_STATUS, SHIPMENT_STATUS } = CLM;
  const { esc, ms, ci, hl, wpPill, tradeColor, tradeDark } = UI;
  let st = { filter: '', q: '', sort: 'date', dir: 1 };

  function render(view, by, key) {
    const wp = by === 'wp' ? S.wp(key) : null;
    if (by === 'wp' && !wp) { view.innerHTML = `<div class="page"><div class="na-page"><div>${ms('folder_off')}<h2>Working package not found</h2><a class="btn" href="#/shipments">Back to Shipments</a></div></div></div>`; return; }
    if (view._groupKey !== by + key) { st = { filter: '', q: '', sort: 'date', dir: 1 }; view._groupKey = by + key; }
    const all = by === 'wp' ? S.shipmentsOf(key) : S.data.SHIPMENTS.filter((s) => S.groupKey(s, by) === key).sort((a, b) => a.date.localeCompare(b.date));
    const status = wp ? S.wpStatus(wp) : null;
    const note = wp ? S.wpWindowNote(wp) : null;
    const done = all.filter((s) => s.status === 'Completed').length;
    const title = wp ? wp.title : key;

    view.innerHTML = `
    <div class="page">
      <div class="sticky-head">
        <div class="page-head" style="align-items:flex-start">
          <button class="back" id="gBack" data-tip="Back">${ms('arrow_back')}</button>
          <div class="grow">
            <div class="row" style="gap:10px;flex-wrap:wrap">
              ${wp ? `<span class="pill lg" style="background:${tradeColor(wp.trade)};color:${tradeDark(wp.trade) ? 'rgba(0,0,0,.8)' : '#fff'};letter-spacing:.5px;text-transform:none;font-weight:500;font-size:12px">${esc(wp.trade)}</span>` : `<span class="pill lg olive" style="text-transform:none;letter-spacing:.5px;font-size:12px">${S.groupLabel(by)}</span>`}
              <h1>${esc(title)}</h1>
              ${status ? `<span class="row" style="gap:4px">${ci(WP_STATUS[status].icon, 18)}${wpPill(status)}</span>` : ''}
            </div>
            <div class="meta">
              ${wp ? `<span>${ms('location_on')}${esc(wp.building)} · ${esc(wp.floor)} · ${esc(wp.zone)}</span><span>${ms('date_range')}${D.fmt(wp.from)} – ${D.fmt(wp.to)} <b class="${note.tone === 'err' ? 'err-t' : ''}" style="font-weight:500">· ${esc(note.text)}</b></span><span>${ms('swap_horiz')}${esc(wp.sender)} → ${esc(wp.recipient)}</span>`
                : `<span>${ms('local_shipping')}${all.length} shipments</span><span>${ms('folder')}${new Set(all.map((s) => s.wpId)).size} working packages</span>`}
            </div>
          </div>
          ${wp ? `<button class="btn" id="gEdit">${ms('edit')}Edit</button><button class="icon-btn" id="gMore" data-tip="More actions">${ms('more_vert')}</button>` : ''}
          ${!wp || status !== 'completed' ? `<button class="btn primary" id="gAdd">${ms('add')}Add shipment</button>` : ''}
        </div>
      </div>
      <div class="split-layout" style="--rp-top:24px">
        <div>
          <div class="kpis" id="gKpis"></div>
          <div class="card" style="margin-top:12px;padding:0;overflow:hidden">
            <div class="row" style="padding:14px 16px;gap:12px">
              <div class="card-h" style="font-size:16px">Shipments <span class="count">${all.length}</span></div>
              <span class="sp"></span>
              <div class="input-icon" style="width:260px">${ms('search')}<input class="input" id="gSearch" placeholder="Search shipments" value="${esc(st.q)}"></div>
            </div>
            <div id="gTable"></div>
          </div>
        </div>
        <aside class="rpanel">${wp ? wpPanel(wp, all, done) : groupPanel(by, key, all)}</aside>
      </div>
    </div>`;

    const drawKpis = () => {
      const k = [['', 'Total', 'local_shipping', all.length], ['Open', 'Open', 'legend-open', all.filter((s) => s.status === 'Open').length],
        ['progress', 'Approved / in progress', 'legend-approved', all.filter((s) => !['Open', 'Completed', 'Canceled', 'Rejected'].includes(s.status)).length],
        ['Completed', 'Completed', 'legend-completed', done], ['canceled', 'Canceled / rejected', 'st-cancelled', all.filter((s) => ['Canceled', 'Rejected'].includes(s.status)).length]];
      view.querySelector('#gKpis').innerHTML = k.map(([f, l, ic, n]) => `<div class="kpi ${st.filter === f ? 'on' : ''}" data-f="${f}" role="button" tabindex="0"><b>${n}</b><span>${ic.includes('-') ? ci(ic, 14, ic === 'st-cancelled' ? 'color:#A3162B' : '') : ms(ic, 's16')}${l}</span></div>`).join('');
      view.querySelectorAll('.kpi').forEach((x) => x.onclick = () => { st.filter = st.filter === x.dataset.f ? '' : x.dataset.f; drawKpis(); drawTable(); });
    };
    const drawTable = () => {
      let list = all.filter((s) => {
        if (st.filter === 'Open' || st.filter === 'Completed') return s.status === st.filter;
        if (st.filter === 'progress') return !['Open', 'Completed', 'Canceled', 'Rejected'].includes(s.status);
        if (st.filter === 'canceled') return ['Canceled', 'Rejected'].includes(s.status);
        return true;
      });
      const q = st.q.trim().toLowerCase();
      if (q) list = list.filter((s) => [s.name, s.no, s.status, S.vehicle(s.vehicle).name, s.up].join(' ').toLowerCase().includes(q));
      const key = { date: (s) => s.date + s.start, name: (s) => s.name, status: (s) => s.status, vehicle: (s) => S.vehicle(s.vehicle).name };
      list = list.slice().sort((a, b) => key[st.sort](a).localeCompare(key[st.sort](b)) * st.dir);
      const th = (k, l) => `<th class="sortable" data-sort="${k}">${l}${st.sort === k ? ms(st.dir > 0 ? 'arrow_upward' : 'arrow_downward') : ''}</th>`;
      const tbl = view.querySelector('#gTable');
      tbl.innerHTML = list.length ? `<table class="table"><thead><tr>${th('name', 'Shipment')}${th('date', 'Date &amp; time slot')}${th('vehicle', 'Vehicle · unloading point')}${by !== 'wp' ? '<th>Working package</th>' : ''}${th('status', 'Status')}<th style="width:44px"></th></tr></thead><tbody>
        ${list.map((s) => { const late = D.diff(s.date, D.today) < 0 && !['Completed', 'Canceled', 'Rejected'].includes(s.status); return `<tr class="click" data-ship="${s.id}">
          <td><div class="row" style="gap:10px">${HUB_legendShipIcon(s.status, 18)}<div style="min-width:0;max-width:230px"><div class="tline1 ell" data-tip="${esc(s.name)}">${hl(s.name, st.q)}</div><div class="tline2">${hl(s.no, st.q)}</div></div></div></td>
          <td class="nowrap"><div>${D.dayName(s.date)}, ${D.fmt(s.date)}</div><div class="tline2 ${late ? 'err-t' : ''}">${s.start} – ${s.end}${late ? ' · late' : D.diff(s.date, D.today) >= 0 && D.diff(s.date, D.today) < 7 ? ' · ' + D.rel(s.date) : ''}</div></td>
          <td><div class="nowrap">${esc(S.vehicle(s.vehicle).name)}</div><div class="tline2 nowrap">${s.up} · ${esc(s.zone)}</div></td>
          ${by !== 'wp' ? `<td><a class="link" data-wp="${s.wpId}">${esc(S.wp(s.wpId).title)}</a></td>` : ''}
          <td class="nowrap">${UI.shipPill(s.status)}</td>
          <td style="padding-left:0"><button class="icon-btn sm" data-rowmenu="${s.id}" data-tip="Actions">${ms('more_vert')}</button></td></tr>`; }).join('')}
      </tbody></table>` : `<div class="empty">${ms('local_shipping')}<span>${all.length ? 'No shipments match this filter.' : 'No shipments in this working package yet.'}</span>${wp && status !== 'completed' ? `<button class="btn primary" data-addship>${ms('add')}Add shipment</button>` : ''}</div>`;
      tbl.querySelectorAll('[data-sort]').forEach((h) => h.onclick = () => { if (st.sort === h.dataset.sort) st.dir *= -1; else { st.sort = h.dataset.sort; st.dir = 1; } drawTable(); });
      tbl.onclick = (e) => {
        const m = e.target.closest('[data-rowmenu]');
        if (m) { e.stopPropagation(); rowMenu(m, S.shipment(m.dataset.rowmenu), () => render(view, by, key)); return; }
        const w = e.target.closest('[data-wp]'); if (w) { e.stopPropagation(); UI.go('#/group/wp/' + w.dataset.wp); return; }
        if (e.target.closest('[data-addship]')) { CREATE.start({ wpId: wp.id }); return; }
        const r = e.target.closest('[data-ship]'); if (r) UI.go('#/shipment/' + r.dataset.ship);
      };
    };
    drawKpis(); drawTable();
    const si = view.querySelector('#gSearch'); si.oninput = () => { st.q = si.value; drawTable(); };

    view.querySelector('#gBack').onclick = () => goBack();
    view.querySelector('#gAdd')?.addEventListener('click', () => CREATE.start({ wpId: wp ? wp.id : null }));
    view.querySelector('#gEdit')?.addEventListener('click', () => WPFORM.open(wp));
    view.querySelector('#rpEdit')?.addEventListener('click', () => WPFORM.open(wp));
    view.querySelectorAll('[data-wp-link]').forEach((a) => a.onclick = () => UI.go('#/group/wp/' + a.dataset.wpLink));
    view.querySelector('#gMore')?.addEventListener('click', (e) => UI.menu(e.currentTarget, [
      { label: 'Add shipment', icon: 'add', disabled: status === 'completed', onClick: () => CREATE.start({ wpId: wp.id }) },
      { label: 'Duplicate working package', icon: 'content_copy', onClick: () => {
        const copy = Object.assign(JSON.parse(JSON.stringify(wp)), { id: 'wp' + Date.now(), title: wp.title + ' (copy)', completed: false });
        S.data.WPS.push(copy); S.persist(); UI.go('#/group/wp/' + copy.id); UI.toast('Working package duplicated · shipments were not copied');
      } },
      wp.completed ? { label: 'Reopen working package', icon: 'lock_open', onClick: () => { wp.completed = false; S.persist(); render(view, by, key); UI.toast('Working package reopened'); } }
        : { label: 'Mark as completed', icon: 'library_add_check', onClick: async () => {
          const openN = all.filter((s) => !['Completed', 'Canceled', 'Rejected'].includes(s.status)).length;
          if (await UI.confirm({ title: 'Mark as completed?', text: openN ? `${openN} shipment${openN > 1 ? 's are' : ' is'} not completed yet. They stay as they are, but no new shipments can be added.` : 'No new shipments can be added afterwards. You can reopen it any time.', ok: 'Mark as completed' })) { wp.completed = true; S.persist(); render(view, by, key); UI.toast('Working package completed'); }
        } },
      { sep: true },
      { label: 'Delete working package', icon: 'delete', danger: true, onClick: async () => {
        if (all.length) { UI.modal({ title: 'Can’t delete this working package', icon: 'block', iconTone: 'warn', size: 'sm', body: `<p class="muted">It still has ${all.length} shipment${all.length > 1 ? 's' : ''}. Move or cancel them first, or mark the working package as completed.</p>`, actions: [{ label: 'OK', primary: true }] }); return; }
        if (await UI.confirm({ title: 'Delete working package?', text: `“${esc(wp.title)}” will be deleted. This can’t be undone.`, ok: 'Delete', danger: true })) { S.data.WPS = S.data.WPS.filter((w) => w !== wp); S.persist(); UI.go('#/shipments'); UI.toast('Working package deleted'); }
      } },
    ], { align: 'right', minWidth: 240 }));
  }

  function wpPanel(wp, all, done) {
    const pct = all.length ? Math.round((done / all.length) * 100) : 0;
    const days = D.diff(wp.to, wp.from); const passed = Math.min(Math.max(D.diff(D.today, wp.from), 0), days);
    return `<div class="rp-head"><h3>Details</h3><div class="rp-name">${esc(wp.title)}</div>
      <div class="cap" style="margin-top:10px;display:flex;justify-content:space-between"><span>Shipments completed</span><b style="font-weight:500;color:var(--t1)">${done} / ${all.length}</b></div>
      <div class="prog-steps" style="margin-top:6px"><i class="done" style="flex:${pct || 0.0001}"></i><i style="flex:${100 - pct || 0.0001}"></i></div>
      <div class="cap" style="margin-top:10px;display:flex;justify-content:space-between"><span>Booking window</span><b style="font-weight:500;color:var(--t1)">${Math.round((passed / Math.max(days, 1)) * 100)}% elapsed</b></div>
      <div class="prog-steps" style="margin-top:6px"><i class="cur" style="flex:${passed || 0.0001}"></i><i style="flex:${days - passed || 0.0001}"></i></div></div>
      <div class="rp-body">
        <div class="rp-sec"><h4>General</h4><dl class="kv">
          <dt>Trade</dt><dd><span class="row" style="gap:6px"><span class="dot-s" style="background:${tradeColor(wp.trade)}"></span>${esc(wp.trade)}</span></dd>
          <dt>Sender</dt><dd>${esc(wp.sender)}</dd><dt>Recipient</dt><dd>${esc(wp.recipient)}</dd>
          <dt>Date from</dt><dd>${D.fmt(wp.from)}</dd><dt>Date to</dt><dd>${D.fmt(wp.to)}</dd></dl></div>
        <div class="rp-sec"><h4>Destination</h4><dl class="kv"><dt>Building</dt><dd>${esc(wp.building)}</dd><dt>Floor</dt><dd>${esc(wp.floor)}</dd><dt>Zone</dt><dd>${esc(wp.zone || '—')}</dd></dl></div>
        <div class="rp-sec"><h4>Volume</h4><dl class="kv"><dt>Volume</dt><dd>${esc(wp.volume || '—')}</dd><dt>Est. transport</dt><dd>${wp.unitsQty ? wp.unitsQty + ' ' : ''}${esc(wp.units || '—')}</dd></dl></div>
      </div>
      <div class="rp-foot"><button class="btn primary" id="rpEdit" style="width:100%">${ms('edit')}Edit working package</button></div>`;
  }
  function groupPanel(by, key, all) {
    const wps = [...new Set(all.map((s) => s.wpId))].map((id) => S.wp(id));
    return `<div class="rp-head"><h3>${S.groupLabel(by)}</h3><div class="rp-name">${esc(key)}</div></div>
      <div class="rp-body"><div class="rp-sec"><h4>Working packages (${wps.length})</h4>
        ${wps.map((w) => { const s = S.wpStatus(w); return `<a class="row" data-wp-link="${w.id}" style="padding:8px 0;gap:10px;cursor:pointer;color:var(--t1);text-decoration:none;border-bottom:1px solid #f0f0f0"><span class="dot-s" style="background:${tradeColor(w.trade)}"></span><span class="grow"><span class="ell" style="display:block;font-weight:500">${esc(w.title)}</span><span class="cap">${esc(w.trade)} · ${all.filter((x) => x.wpId === w.id).length} shipments</span></span>${ci(WP_STATUS[s].icon, 16)}</a>`; }).join('')}
      </div></div>`;
  }

  /* row actions shared with details page */
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
