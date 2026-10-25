/* Shipments hub — grouped shipments in Timeline / List / Cards views */
(function () {
  const { D, WP_STATUS, SHIPMENT_STATUS } = CLM;
  const { esc, ms, ci, hl, wpPill, tradeColor, tradeDark, isDark } = UI;
  const MAX = 5;
  let showAll = {};     // per group "show all" (session only)
  let root = null;

  const agg = (list, f) => { const v = [...new Set(list.map((s) => s[f]))]; return v.length === 1 ? v[0] : v.length ? 'Multiple' : '—'; };
  const legendShipIcon = (status, size = 18) => {
    const map = { Open: 'legend-open', Approved: 'legend-approved', Completed: 'legend-completed' };
    if (map[status]) return `<span data-tip="Shipment: ${status}">${ci(map[status], size)}</span>`;
    const s = SHIPMENT_STATUS[status];
    return `<span data-tip="Shipment: ${esc(status)}" style="color:${s.color}">${ci(s.icon, size)}</span>`;
  };
  HUB_legendShipIcon = legendShipIcon;

  // ---------------------------------------------------------------- shell
  function render(view) {
    root = view;
    const P = S.prefs;
    view.innerHTML = `
    <div class="page hub">
      <div class="sticky-head">
        <div class="page-head">
          <h1>Shipments</h1>
          <span class="sp"></span>
          <div class="input-icon search-box search-lg">${ms('search')}<input class="input" id="hubSearch" placeholder="Search packages and shipments" value="${esc(P.search)}" autocomplete="off"><button class="icon-btn sm clear ${P.search ? '' : 'hidden'}" id="hubClear" data-tip="Clear search">${ms('close')}</button></div>
          ${createButton()}
        </div>
      </div>
      <div class="hub-toolbar">
          <div class="chips" id="hubChips"></div>
          <button class="info-btn" id="legendBtn" aria-label="Status legend">${ms('info')}</button>
          <div class="right">
            <span class="lbl-inline">Group by</span>
            <button class="dd-btn" id="groupBy"><span>${S.groupLabel(P.groupBy)}</span>${ms('expand_more')}</button>
            <div class="itabs" role="tablist" aria-label="View">
              ${[['timeline', 'view_timeline', 'Timeline'], ['list', 'view_list', 'List'], ['cards', 'view_module', 'Cards']].map(([k, ic, t]) => `<button class="itab ${P.view === k ? 'on' : ''}" data-view="${k}" data-tip="${t}" role="tab" aria-selected="${P.view === k}">${ms(ic)}</button>`).join('')}
            </div>
            <button class="icon-btn ${P.panel ? 'active' : ''}" id="propsBtn" data-tip="Properties">${ms('settings')}</button>
          </div>
      </div>
      <div class="hub-body">
        <div class="hub-main" id="hubMain"></div>
        <div id="hubPanel"></div>
      </div>
    </div>`;
    bindShell();
    renderChips(); renderMain(); renderPanel();
  }

  function createButton() {
    return `<div class="split"><button class="btn primary" id="createBtn">${ms('add')}Create</button><button class="btn primary" id="createMore" data-tip="More create options">${ms('expand_more')}</button></div>`;
  }
  HUB_createButton = createButton;
  function bindCreate(scope) {
    scope.querySelector('#createBtn').onclick = () => CREATE.start();
    scope.querySelector('#createMore').onclick = (e) => UI.menu(e.currentTarget, [
      { label: 'New shipment', icon: 'local_shipping', onClick: () => CREATE.start() },
      { label: 'New working package', icon: 'folder', onClick: () => WPFORM.open() },
      { label: 'Import working packages (Excel)', icon: 'upload_file', onClick: () => UI.go('#/upload') },
    ], { align: 'right', minWidth: 320 });
  }
  HUB_bindCreate = bindCreate;

  function bindShell() {
    const P = S.prefs;
    const inp = root.querySelector('#hubSearch'); let t;
    inp.oninput = () => { clearTimeout(t); t = setTimeout(() => { P.search = inp.value; S.savePrefs(); root.querySelector('#hubClear').classList.toggle('hidden', !inp.value); renderMain(); }, 120); };
    root.querySelector('#hubClear').onclick = () => { inp.value = ''; P.search = ''; S.savePrefs(); root.querySelector('#hubClear').classList.add('hidden'); renderMain(); inp.focus(); };
    bindCreate(root);
    root.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => {
      P.view = b.dataset.view; S.savePrefs();
      root.querySelectorAll('[data-view]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
      renderMain(); renderPanel();
    });
    root.querySelector('#groupBy').onclick = (e) => UI.menu(e.currentTarget, ['wp', 'destination', 'sender', 'recipient'].map((k) => ({
      label: S.groupLabel(k), icon: { wp: 'folder', destination: 'location_on', sender: 'outbox', recipient: 'move_to_inbox' }[k], on: P.groupBy === k,
      onClick: () => { P.groupBy = k; S.savePrefs(); root.querySelector('#groupBy span').textContent = S.groupLabel(k); renderMain(); renderPanel(); },
    })), { minWidth: 220 });
    const lb = root.querySelector('#legendBtn');
    let hoverT;
    const showLegend = () => { if (UI.closeFloat && lb.classList.contains('on')) return; UI.float(lb, legendHtml(), { cls: 'popover legend-pop', hover: true }); };
    lb.onmouseenter = () => { hoverT = setTimeout(showLegend, 120); };
    lb.onmouseleave = () => { clearTimeout(hoverT); setTimeout(() => { const pop = document.querySelector('.legend-pop'); if (pop && !pop.matches(':hover') && !lb.matches(':hover')) UI.closeFloat(); }, 200); };
    lb.onclick = () => { if (lb.classList.contains('on')) UI.closeFloat(); else showLegend(); };
    root.querySelector('#propsBtn').onclick = () => { P.panel = !P.panel; S.savePrefs(); renderPanel(); };
  }

  function legendHtml() {
    const wp = Object.values(WP_STATUS).map((w) => `<div class="lg-item">${ci(w.icon, 20)}${w.label}</div>`).join('');
    const sh = [['legend-open', 'Open'], ['legend-approved', 'Approved'], ['legend-completed', 'Completed']].map(([i, l]) => `<div class="lg-item">${ci(i, 20)}${l}</div>`).join('');
    return `<h4>Working package status</h4><div class="lg-list">${wp}</div><h4>Shipment status</h4><div class="lg-list">${sh}</div>`;
  }
  document.addEventListener('mouseleave', (e) => { if (e.target.classList?.contains('legend-pop')) setTimeout(() => { if (!document.querySelector('#legendBtn:hover')) UI.closeFloat(); }, 150); }, true);

  function renderChips() {
    const P = S.prefs; const c = S.countsByStatus();
    const el = root.querySelector('#hubChips');
    el.innerHTML = `<button class="chip ${!P.wpStatus.length ? 'on' : ''}" data-st="">All<span class="n">${c.all}</span></button>` +
      Object.entries(WP_STATUS).map(([k, w]) => `<button class="chip ${P.wpStatus.includes(k) ? 'on' : ''}" data-st="${k}" aria-pressed="${P.wpStatus.includes(k)}"><i class="dot" style="background:${UI.DOT[k]}"></i>${w.label}<span class="n">${c[k]}</span></button>`).join('');
    el.querySelectorAll('.chip').forEach((b) => b.onclick = () => {
      const k = b.dataset.st;
      if (!k) P.wpStatus = [];
      else {
        P.wpStatus = P.wpStatus.includes(k) ? P.wpStatus.filter((x) => x !== k) : P.wpStatus.concat(k);
        if (P.wpStatus.length === 4) P.wpStatus = [];
      }
      S.savePrefs(); renderChips(); renderMain();
    });
  }

  function renderMain() {
    const main = root.querySelector('#hubMain');
    const groups = S.groups();
    const v = S.prefs.view;
    if (v === 'timeline') main.innerHTML = timelineHtml(groups);
    else if (v === 'list') main.innerHTML = listHtml(groups);
    else main.innerHTML = cardsHtml(groups);
    bindMain(main, groups);
  }
  HUB_refresh = () => { if (root && document.body.contains(root)) { renderChips(); renderMain(); } };

  function emptyHtml() {
    const P = S.prefs;
    return `<div class="empty">${ms('search_off')}<b style="color:var(--t1)">No results</b><span>${P.search ? `Nothing matches “${esc(P.search)}”.` : 'No working packages match the selected status.'}</span><button class="btn" data-reset-filters>${ms('filter_alt_off')}Clear filters</button></div>`;
  }

  // ---------------------------------------------------------------- LIST
  function listCols() {
    const c = S.prefs.columns;
    const cols = ['44px', 'minmax(200px, 1fr)'];
    if ((c.building || c.floor) && S.prefs.groupBy !== 'destination') cols.push('150px');
    cols.push('170px');
    if (c.sender || c.recipient) cols.push('210px');
    cols.push('170px', '132px');
    return cols.join(' ');
  }
  function listHtml(groups) {
    const P = S.prefs; const c = P.columns; const q = P.search;
    const loc = (c.building || c.floor) && P.groupBy !== 'destination'; const sr = c.sender || c.recipient;
    const gl = S.groupLabel(P.groupBy);
    const head = `<div class="glist-head" style="grid-template-columns:${listCols()}"><span></span><span>${gl}</span>${loc ? '<span>Location</span>' : ''}<span>${P.groupBy === 'wp' ? 'Booking window' : 'Shipment dates'}</span>${sr ? `<span>${[c.sender && 'Sender', c.recipient && 'Recipient'].filter(Boolean).join(' → ')}</span>` : ''}<span>Shipments</span><span>Status</span></div>`;
    if (!groups.length) return `<div class="glist">${head}${emptyHtml()}</div>`;
    const rows = groups.map((g) => {
      const key = P.groupBy + ':' + g.key; const open = !!P.expanded[key] || (q && g.matched?.length);
      const list = g.shipments; const done = list.filter((s) => s.status === 'Completed').length; const op = list.filter((s) => s.status === 'Open').length;
      const pct = list.length ? (done / list.length) * 100 : 0;
      const appr = list.length ? (list.filter((s) => !['Open', 'Completed', 'Canceled', 'Rejected'].includes(s.status)).length / list.length) * 100 : 0;
      const note = g.wp ? S.wpWindowNote(g.wp) : { text: `${list.length} shipment${list.length !== 1 ? 's' : ''}` };
      const sender = g.wp ? g.wp.sender : agg(list, 'sender'); const recip = g.wp ? g.wp.recipient : agg(list, 'recipient');
      const bld = g.wp ? g.wp.building : agg(list, 'building'); const fl = g.wp ? g.wp.floor : agg(list, 'floor');
      return `
      <div class="grow-row ${open ? 'open' : ''}" data-group="${esc(g.key)}" style="grid-template-columns:${listCols()}">
        ${g.wp ? `<i class="trade-bar" style="background:${tradeColor(g.trade)}"></i>` : ''}
        <button class="caret ${open ? 'open' : ''}" data-toggle="${esc(key)}" data-tip="${open ? 'Hide' : 'Show'} shipments" aria-expanded="${!!open}">${ms('chevron_right')}</button>
        <div style="min-width:0"><div class="g-title"><span class="t">${hl(g.title, q)}</span>${ms('arrow_forward', 'go')}</div><div class="g-sub">${esc(g.sub)}</div></div>
        ${loc ? `<div><div>${[c.building && bld, c.floor && fl].filter(Boolean).join(' · ')}</div><div class="g-sub">${g.wp ? esc(g.wp.zone) : ''}</div></div>` : ''}
        <div><div class="nowrap">${g.from ? D.fmtShort(g.from) + ' – ' + D.fmtShort(g.to) : '—'}</div><div class="g-sub ${note.tone === 'err' ? 'err-t' : ''}">${esc(note.text)}</div></div>
        ${sr ? `<div style="min-width:0"><div class="ell">${c.sender ? hl(sender, q) : hl(recip, q)}</div>${c.sender && c.recipient ? `<div class="g-sub ell">→ ${hl(recip, q)}</div>` : ''}</div>` : ''}
        <div><div class="progress" data-tip="${done} completed · ${list.length - done - op} approved / in progress · ${op} open"><i style="width:${pct}%"></i><i class="b" style="width:${appr}%"></i></div><div class="g-sub">${done} of ${list.length} done${op ? ` · ${op} open` : list.length && done === list.length ? ' · all done' : ''}</div></div>
        <div>${g.status ? `<span class="row" style="gap:6px">${ci(WP_STATUS[g.status].icon, 16)}${wpPill(g.status)}</span>` : `<span class="cap">${new Set(list.map((s) => s.wpId)).size} WP</span>`}</div>
      </div>
      ${open ? shipRowsHtml(g, key) : ''}`;
    }).join('');
    const add = P.groupBy === 'wp' ? `<button class="add-row" data-add-wp>${ms('add')}Add working package</button>` : '';
    return `<div class="glist">${head}${rows}${add}</div>`;
  }

  function shipRowsHtml(g, key) {
    const q = S.prefs.search; const all = showAll[key];
    const list = g.shipments; const shown = all ? list : pickVisible(list).slice(0, MAX);
    if (!list.length) return `<div class="ships"><div class="show-all cap">No shipments yet · <a class="link" data-add-ship="${esc(g.wp?.id || '')}">${ms('add', 's16')}Add shipment</a></div></div>`;
    return `<div class="ships">${shown.map((s) => `
      <div class="srow" data-ship="${s.id}" style="grid-template-columns:${listCols()}">
        <span></span>
        <div class="s-name">${legendShipIcon(s.status, 18)}<div style="min-width:0"><div class="ell" style="font-weight:500">${hl(s.name, q)}</div><div class="g-sub">${hl(s.no, q)}</div></div></div>
        ${(S.prefs.columns.building || S.prefs.columns.floor) && S.prefs.groupBy !== 'destination' ? `<div><div class="ell">${s.up}</div><div class="g-sub ell">${esc(s.building)} · ${esc(s.floor)}</div></div>` : ''}
        <div><div class="nowrap">${D.dayName(s.date)}, ${D.fmtShort(s.date)}</div><div class="g-sub">${s.start} – ${s.end}</div></div>
        ${S.prefs.columns.sender || S.prefs.columns.recipient ? `<div><div class="ell">${esc(S.vehicle(s.vehicle).name)}</div><div class="g-sub ell">${s.vehicles || 1} vehicle${(s.vehicles || 1) > 1 ? 's' : ''}</div></div>` : ''}
        <div><div class="ell">${s.equipment.length ? s.equipment.map((e) => S.equipment(e.id).name).join(', ') : '—'}</div><div class="g-sub">Equipment</div></div>
        <div>${UI.shipPill(s.status)}</div>
      </div>`).join('')}
      <div class="show-all">${list.length > MAX ? `<a class="link" data-showall="${esc(key)}">${all ? ms('expand_less', 's18') + 'Show less' : ms('expand_more', 's18') + `Show all ${list.length} shipments`}</a><span class="faint">·</span>` : ''}<a class="link" data-open-group="${esc(g.key)}">${ms('open_in_new', 's16')}Open ${S.prefs.groupBy === 'wp' ? 'working package' : 'group'}</a>${g.wp && S.wpStatus(g.wp) !== 'completed' ? `<span class="faint">·</span><a class="link" data-add-ship="${g.wp.id}">${ms('add', 's16')}Add shipment</a>` : ''}</div>
    </div>`;
  }
  // prefer upcoming / current shipments when only 5 are shown
  function pickVisible(list) {
    const up = list.filter((s) => D.diff(s.date, D.add(D.today, -3)) >= 0);
    const past = list.filter((s) => D.diff(s.date, D.add(D.today, -3)) < 0).reverse();
    return up.concat(past).slice(0, MAX).sort((a, b) => a.date.localeCompare(b.date));
  }

  // ---------------------------------------------------------------- CARDS
  function cardsHtml(groups) {
    const P = S.prefs;
    if (!groups.length) return emptyHtml();
    const cards = groups.map((g) => {
      const list = g.shipments;
      const counts = { open: list.filter((s) => s.status === 'Open').length, approved: list.filter((s) => !['Open', 'Completed', 'Canceled', 'Rejected'].includes(s.status)).length, completed: list.filter((s) => s.status === 'Completed').length, draft: list.filter((s) => ['Canceled', 'Rejected'].includes(s.status)).length };
      return UI.wpCard({
        title: g.title, titleHtml: hl(g.title, P.search), trade: g.trade, tabLabel: g.wp ? g.trade : S.groupLabel(P.groupBy), tabColor: g.wp ? null : 'var(--color-action-primary)',
        building: g.wp ? g.wp.building : agg(list, 'building'), floor: g.wp ? g.wp.floor : agg(list, 'floor'),
        dates: g.from ? D.fmt(g.from) + ' - ' + D.fmt(g.to) : '—', sender: g.wp ? g.wp.sender : g.sub, counts, status: g.status, attrs: `data-group="${esc(g.key)}"`,
      });
    }).join('');
    const add = P.groupBy === 'wp' ? `<div class="fcard add" data-add-wp tabindex="0"><div class="ftab"></div><div class="fbody">${ms('add', 's24')}Add working package</div></div>` : '';
    return `<div class="cards">${cards}${add}</div>`;
  }

  // ---------------------------------------------------------------- TIMELINE
  function tlCols() {
    const c = S.prefs.columns; const cols = [{ k: 'name', w: 250, label: S.groupLabel(S.prefs.groupBy) }];
    if (c.sender) cols.push({ k: 'sender', w: 112, label: 'Sender' });
    if (c.recipient) cols.push({ k: 'recipient', w: 112, label: 'Recipient' });
    if (c.building) cols.push({ k: 'building', w: 70, label: 'Building' });
    if (c.floor) cols.push({ k: 'floor', w: 60, label: 'Floor' });
    return cols;
  }
  function timelineHtml(groups) {
    const P = S.prefs; const q = P.search;
    const days = P.period * 7; const start = P.rangeStart; const end = D.add(start, days - 1);
    const cols = tlCols(); const leftW = cols.reduce((a, c) => a + c.w, 0);
    const colT = cols.map((c) => c.w + 'px').join(' ');
    const pct = (d) => (D.diff(d, start) / days) * 100;
    const dayArr = Array.from({ length: days }, (_, i) => D.add(start, i));
    const bg = `<div class="tl-bgcols" style="grid-template-columns:repeat(${days},1fr)">${dayArr.map((d) => `<div class="${d === D.today ? 'td' : D.dow(d) > 4 ? 'we' : ''}"></div>`).join('')}</div>`;
    const weeks = []; for (let i = 0; i < days; i += 7) { const d = D.add(start, i); const e = D.add(d, 6); weeks.push(`<div>W${D.week(d)}, ${D.monthName(d, true)}${D.monthName(e, true) !== D.monthName(d, true) ? '–' + D.monthName(e, true) : ''} ${d.slice(0, 4)}</div>`); }
    const dayW = days > 35 ? 'narrow' : '';
    const head = `
      <div class="tl-corner" style="height:61px"><div class="tl-cols" style="grid-template-columns:${colT}">${cols.map((c) => `<div>${c.label}</div>`).join('')}</div></div>
      <div class="tl-hd"><div class="tl-weeks" style="grid-template-columns:repeat(${P.period},1fr)">${weeks.join('')}</div>
      <div class="tl-days" style="grid-template-columns:repeat(${days},1fr)">${dayArr.map((d) => `<div class="${d === D.today ? 'td' : D.dow(d) > 4 ? 'we' : ''}" ${d === D.today ? 'data-tip="Today"' : `data-tip="${D.dayName(d, true)}, ${D.fmt(d)}"`}>${days > 35 && D.dow(d) % 2 ? '' : +d.slice(8)}</div>`).join('')}</div></div>`;

    let rows = '';
    groups.forEach((g) => {
      const key = P.groupBy + ':' + g.key; const open = !!P.expanded[key] || (q && g.matched?.length);
      const list = g.shipments;
      const vals = { sender: g.wp ? g.wp.sender : agg(list, 'sender'), recipient: g.wp ? g.wp.recipient : agg(list, 'recipient'), building: g.wp ? g.wp.building : agg(list, 'building'), floor: g.wp ? g.wp.floor : agg(list, 'floor') };
      // group span bar
      let span = '';
      if (g.from && !(D.diff(g.to, start) < 0 || D.diff(g.from, end) > 0)) {
        const l = Math.max(0, pct(g.from)); const r = Math.min(100, pct(D.add(g.to, 1)));
        const col = g.wp ? tradeColor(g.trade) : '#969300';
        span = `<div class="tl-span ${g.wp && tradeDark(g.trade) ? 'dark-t' : ''} ${pct(g.from) < 0 ? 'clip-l' : ''} ${pct(D.add(g.to, 1)) > 100 ? 'clip-r' : ''}" data-open-group="${esc(g.key)}" style="left:${l}%;width:${r - l}%;background:${col}" data-tip="<b>${esc(g.title)}</b><br>${D.fmt(g.from)} – ${D.fmt(g.to)} · ${list.length} shipments">${esc(g.title)}</div>`;
      } else if (g.from) {
        const before = D.diff(g.to, start) < 0;
        span = `<div class="tl-span" style="${before ? 'left:4px' : 'right:4px'};background:var(--subtle);color:var(--t2)" data-jump="${before ? g.to : g.from}" data-tip="Jump to ${before ? 'end' : 'start'}">${before ? '‹ ended ' + D.fmtShort(g.to) : 'starts ' + D.fmtShort(g.from) + ' ›'}</div>`;
      }
      const ticks = list.filter((s) => D.diff(s.date, start) >= 0 && D.diff(s.date, end) <= 0).map((s) => `<i class="tl-tick" style="left:${pct(s.date) + 50 / days}%;background:${SHIPMENT_STATUS[s.status].color}"></i>`).join('');
      rows += `<div class="tl-row" data-row>
        <div class="tl-lcell g tl-left" data-group="${esc(g.key)}" style="grid-template-columns:${colT}">
          <div class="first"><button class="caret ${open ? 'open' : ''}" data-toggle="${esc(key)}" aria-expanded="${!!open}" data-tip="${open ? 'Hide' : 'Show'} shipments">${ms('chevron_right')}</button>${g.wp ? `<span class="dot-s" style="background:${tradeColor(g.trade)}"></span>` : ''}<span class="ell" data-tip="${esc(g.title)}">${hl(g.title, q)}</span><span class="count" style="margin-left:auto">${list.length}</span></div>
          ${cols.slice(1).map((c) => `<div data-tip="${esc(vals[c.k])}">${hl(vals[c.k], q)}</div>`).join('')}
        </div>
        <div class="tl-rcell" data-group-r="${esc(g.key)}">${bg}${span}${ticks}</div></div>`;
      if (open) {
        const all = showAll[key];
        const inRange = list.filter((s) => D.diff(s.date, start) >= 0 && D.diff(s.date, end) <= 0);
        const near = (x) => Math.abs(D.diff(x.date, D.today)) - (D.diff(x.date, D.today) >= 0 ? 0.5 : 0);
        const ordered = inRange.slice().sort((a, b) => near(a) - near(b)).concat(list.filter((s) => !inRange.includes(s)));
        const shown = all ? list : ordered.slice(0, MAX).sort((a, b) => a.date.localeCompare(b.date));
        if (!list.length) rows += `<div class="tl-row"><div class="tl-lcell s tl-left" style="grid-template-columns:${colT}"><div class="first cap">No shipments yet</div></div><div class="tl-rcell s">${bg}</div></div>`;
        shown.forEach((s) => {
          const st = SHIPMENT_STATUS[s.status]; const inR = D.diff(s.date, start) >= 0 && D.diff(s.date, end) <= 0;
          const bar = inR ? `<div class="tl-ship" data-ship="${s.id}" style="left:calc(${pct(s.date)}% + 2px);width:calc(${100 / days}% - 4px);background:${st.color};color:${isDark(st.color) ? 'rgba(0,0,0,.78)' : '#fff'}" data-tip="<b>${esc(s.name)}</b><br>${s.no} · ${s.status}<br>${D.dayName(s.date)}, ${D.fmt(s.date)} · ${s.start}–${s.end}<br>${esc(S.vehicle(s.vehicle).name)} · ${s.up}">${ci(st.icon, 14)}${days <= 14 ? s.start : ''}</div>`
            : `<div class="tl-span" style="${D.diff(s.date, start) < 0 ? 'left:4px' : 'right:4px'};top:12px;background:var(--subtle);color:var(--t2)" data-jump="${s.date}" data-tip="Show ${D.fmt(s.date)} in timeline">${D.diff(s.date, start) < 0 ? '‹ ' : ''}${D.fmtShort(s.date)}${D.diff(s.date, start) < 0 ? '' : ' ›'}</div>`;
          rows += `<div class="tl-row" data-row>
            <div class="tl-lcell s tl-left" data-ship="${s.id}" style="grid-template-columns:${colT}">
              <div class="first">${legendShipIcon(s.status, 16)}<span class="ell" data-tip="${esc(s.name)}">${hl(s.name, q)}</span></div>
              ${cols.slice(1).map((c) => `<div class="cap" style="font-size:12px">${esc(s[c.k])}</div>`).join('')}
            </div>
            <div class="tl-rcell s">${bg}${bar}</div></div>`;
        });
        if (list.length > MAX || (g.wp && S.wpStatus(g.wp) !== 'completed')) {
          rows += `<div class="tl-row"><div class="tl-showall tl-left" style="gap:8px">${list.length > MAX ? `<a class="link" data-showall="${esc(key)}">${all ? ms('expand_less', 's18') + 'Show less' : ms('expand_more', 's18') + `Show all ${list.length}`}</a>` : ''}${g.wp && S.wpStatus(g.wp) !== 'completed' ? `${list.length > MAX ? '<span class="faint">·</span>' : ''}<a class="link" data-add-ship="${g.wp.id}">${ms('add', 's16')}Add shipment</a>` : ''}</div><div class="tl-rcell s showall">${bg}</div></div>`;
        }
      }
    });
    const legend = ['Open', 'Approved', 'Waiting', 'In Transit', 'Completed', 'Canceled'].map((k) => `<span class="lgd"><i class="sw" style="background:${SHIPMENT_STATUS[k].color}"></i>${k}</span>`).join('');
    return `<div class="tl">
      <div class="tl-bar">
        <button class="btn text today" id="tlToday">TODAY</button>
        <button class="icon-btn" id="tlCal" data-tip="Pick a date">${ms('calendar_month')}</button>
        <span class="sp"></span>
        <button class="icon-btn" id="tlPrev" data-tip="Previous ${P.period > 1 ? P.period + ' weeks' : 'week'}" style="color:var(--olive)">${ms('chevron_left')}</button>
        <span class="tl-range">${D.fmt(start)} – ${D.fmt(end)} (${P.period}W)</span>
        <button class="icon-btn" id="tlNext" data-tip="Next ${P.period > 1 ? P.period + ' weeks' : 'week'}" style="color:var(--olive)">${ms('chevron_right')}</button>
        <span class="sp"></span>
        <button class="dd-btn" id="tlPeriod">${ms('date_range')}<span>${P.period} Week${P.period > 1 ? 's' : ''}</span>${ms('expand_more')}</button>
        <button class="btn text neutral" id="tlExpand">${ms(anyOpen(groups) ? 'unfold_less' : 'unfold_more')}${anyOpen(groups) ? 'Collapse all' : 'Expand all'}</button>
      </div>
      ${groups.length ? `<div class="tl-grid ${dayW}" id="tlGrid" style="grid-template-columns:${leftW}px minmax(${days * (days > 35 ? 14 : days > 14 ? 16 : 40)}px, 1fr)">${head}${rows}</div>` : emptyHtml()}
      <div class="tl-foot"><span>Shipment status:</span>${legend}<span class="sp"></span>${P.groupBy === 'wp' ? `<a class="link" data-add-wp>${ms('add_circle', 's18')}Working package</a>` : ''}</div>
    </div>`;
  }
  function anyOpen(groups) { return groups.some((g) => S.prefs.expanded[S.prefs.groupBy + ':' + g.key]); }

  // ---------------------------------------------------------------- events
  function bindMain(main, groups) {
    const P = S.prefs;
    main.onclick = (e) => {
      const t = e.target;
      const tog = t.closest('[data-toggle]');
      if (tog) { e.stopPropagation(); const k = tog.dataset.toggle; P.expanded[k] = !P.expanded[k]; if (!P.expanded[k]) delete P.expanded[k]; S.savePrefs(); renderMain(); return; }
      const sa = t.closest('[data-showall]'); if (sa) { showAll[sa.dataset.showall] = !showAll[sa.dataset.showall]; renderMain(); return; }
      const add = t.closest('[data-add-ship]'); if (add) { e.stopPropagation(); CREATE.start({ wpId: add.dataset.addShip || null }); return; }
      if (t.closest('[data-add-wp]')) { WPFORM.open(); return; }
      if (t.closest('[data-reset-filters]')) { P.search = ''; P.wpStatus = []; S.savePrefs(); render(root); return; }
      const j = t.closest('[data-jump]'); if (j) { e.stopPropagation(); P.rangeStart = D.add(D.monday(j.dataset.jump), -7 * Math.floor((P.period - 1) / 2)); S.savePrefs(); renderMain(); flash(); return; }
      const sh = t.closest('[data-ship]'); if (sh) { UI.go('#/shipment/' + sh.dataset.ship); return; }
      const g = t.closest('[data-open-group]') || t.closest('[data-group]'); if (g) { openGroup(g.dataset.openGroup || g.dataset.group); }
    };
    main.onkeydown = (e) => { if (e.key === 'Enter' && e.target.matches('.fcard')) e.target.click(); };
    // row hover across the sticky left column and the gantt cells
    main.querySelectorAll('[data-row]').forEach((r) => {
      r.querySelectorAll('.tl-lcell, .tl-rcell').forEach((c) => {
        c.onmouseenter = () => r.classList.add('hover'); c.onmouseleave = () => r.classList.remove('hover');
      });
    });
    if (P.view === 'timeline') bindTimeline(main, groups);
  }
  function flash() { const r = root.querySelector('.tl-range'); if (r) { r.style.transition = 'none'; r.style.background = 'var(--olive-100)'; setTimeout(() => { r.style.transition = 'background .8s'; r.style.background = ''; }, 50); } }

  function bindTimeline(main, groups) {
    const P = S.prefs;
    const shift = (w) => { P.rangeStart = D.add(P.rangeStart, w * 7); S.savePrefs(); renderMain(); flash(); };
    main.querySelector('#tlPrev').onclick = () => shift(-P.period);
    main.querySelector('#tlNext').onclick = () => shift(P.period);
    main.querySelector('#tlToday').onclick = () => { P.rangeStart = todayStart(P.period); S.savePrefs(); renderMain(); flash(); };
    main.querySelector('#tlPeriod').onclick = (e) => UI.menu(e.currentTarget, [1, 2, 4, 8].map((n) => ({ label: `${n} Week${n > 1 ? 's' : ''}`, on: P.period === n, onClick: () => setPeriod(n) })));
    main.querySelector('#tlCal').onclick = (e) => calendarPop(e.currentTarget, P.rangeStart, (d) => { P.rangeStart = D.add(D.monday(d), -7 * Math.floor((P.period - 1) / 2)); S.savePrefs(); renderMain(); flash(); });
    main.querySelector('#tlExpand').onclick = () => {
      const open = anyOpen(groups);
      groups.forEach((g) => { const k = P.groupBy + ':' + g.key; if (open) delete P.expanded[k]; else P.expanded[k] = true; });
      S.savePrefs(); renderMain();
    };
    // keep the "today" column in view on first paint
    const grid = main.querySelector('#tlGrid');
    if (grid) { const td = grid.querySelector('.tl-days .td'); if (td && grid.scrollWidth > grid.clientWidth) grid.scrollLeft = td.offsetLeft - grid.clientWidth / 2; }
  }
  function todayStart(period) { return D.add(D.monday(D.today), -7 * { 1: 0, 2: 0, 4: 2, 8: 3 }[period]); }
  function setPeriod(n) { const P = S.prefs; P.period = n; P.rangeStart = todayStart(n); S.savePrefs(); renderMain(); renderPanel(); }

  function calendarPop(anchor, sel, onPick) {
    let month = sel.slice(0, 7) + '-01';
    const draw = (el) => {
      const first = D.monday(month); const m = month.slice(0, 7);
      let cells = ''; for (let i = 0; i < 42; i++) { const d = D.add(first, i); cells += `<button class="cal-d ${d.slice(0, 7) !== m ? 'o' : ''} ${d === D.today ? 't' : ''}" data-d="${d}">${+d.slice(8)}</button>`; }
      el.innerHTML = `<div style="padding:12px;width:276px"><div class="row" style="justify-content:space-between;margin-bottom:8px"><button class="icon-btn sm" data-m="-1">${ms('chevron_left')}</button><b style="font-weight:500">${D.monthName(month)} ${month.slice(0, 4)}</b><button class="icon-btn sm" data-m="1">${ms('chevron_right')}</button></div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font-size:11px;color:var(--t2);margin-bottom:4px">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((x) => `<span>${x}</span>`).join('')}</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">${cells}</div>
        <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn text sm" data-d="${D.today}">Today</button></div></div>`;
    };
    const el = UI.float(anchor, '', { cls: 'popover' }); if (!el) return;
    draw(el); UI.place(el, anchor);
    el.onclick = (e) => {
      const mb = e.target.closest('[data-m]'); if (mb) { const d = D.parse(month); d.setUTCMonth(d.getUTCMonth() + +mb.dataset.m); month = D.iso(d); draw(el); return; }
      const db = e.target.closest('[data-d]'); if (db) { UI.closeFloat(); onPick(db.dataset.d); }
    };
  }
  HUB_calendarPop = calendarPop;

  function openGroup(key) {
    const by = S.prefs.groupBy;
    UI.go(`#/group/${by}/${encodeURIComponent(key)}`);
  }

  // ---------------------------------------------------------------- properties panel
  function renderPanel() {
    const P = S.prefs; const el = root.querySelector('#hubPanel');
    root.querySelector('#propsBtn').classList.toggle('active', !!P.panel);
    root.querySelector('#propsBtn').innerHTML = ms('settings', P.panel ? 'fill' : '');
    if (!P.panel) { el.innerHTML = ''; el.className = ''; return; }
    el.className = 'sidepanel'; el.style.cssText = 'margin-left:16px;border-radius:8px;box-shadow:var(--e-card);border:0;align-self:flex-start;position:sticky;top:16px';
    const c = P.columns; const gl = S.groupLabel(P.groupBy);
    el.innerHTML = `
      <div class="sp-h"><h3>Properties</h3><button class="icon-btn" id="ppClose" data-tip="Close">${ms('close')}</button></div>
      <div class="sp-b">
        <div class="field"><label>Time period</label>
          <select class="select" id="ppPeriod" ${P.view !== 'timeline' ? 'disabled' : ''}>${[1, 2, 4, 8].map((n) => `<option value="${n}" ${P.period === n ? 'selected' : ''}>${n} Week${n > 1 ? 's' : ''}</option>`).join('')}</select>
          ${P.view !== 'timeline' ? '<span class="hint">Applies to the timeline view</span>' : ''}</div>
        <label class="switch"><input type="checkbox" id="ppCompleted" ${P.showCompleted ? 'checked' : ''}><span>Completed</span></label>
        <div class="cap" style="margin-top:-12px">Show completed working packages and shipments</div>
        <div class="field"><label>Visible columns</label>
          <div class="acc" id="ppAcc"><button class="acc-h">Columns${ms('expand_less')}</button>
            <div class="acc-b">
              <label class="check" data-tip="Always visible"><input type="checkbox" checked disabled>${esc(gl)}</label>
              ${[['sender', 'Sender'], ['recipient', 'Recipient'], ['building', 'Building'], ['floor', 'Floor']].map(([k, l]) => `<label class="check"><input type="checkbox" data-col="${k}" ${c[k] ? 'checked' : ''}>${l}</label>`).join('')}
            </div></div></div>
        <button class="btn text" id="ppReset" style="align-self:flex-start">${ms('restart_alt')}Reset to default</button>
      </div>`;
    el.querySelector('#ppClose').onclick = () => { P.panel = false; S.savePrefs(); renderPanel(); };
    el.querySelector('#ppPeriod').onchange = (e) => setPeriod(+e.target.value);
    el.querySelector('#ppCompleted').onchange = (e) => { P.showCompleted = e.target.checked; S.savePrefs(); renderMain(); UI.toast(P.showCompleted ? 'Completed items are visible' : 'Completed items are hidden', { icon: 'visibility' }); };
    el.querySelector('.acc-h').onclick = () => el.querySelector('#ppAcc').classList.toggle('closed');
    el.querySelectorAll('[data-col]').forEach((b) => b.onchange = () => { P.columns[b.dataset.col] = b.checked; S.savePrefs(); renderMain(); });
    el.querySelector('#ppReset').onclick = () => { P.period = 4; P.rangeStart = todayStart(4); P.showCompleted = true; P.columns = { sender: true, recipient: true, building: true, floor: true }; S.savePrefs(); renderMain(); renderPanel(); };
  }

  window.HUB = { render, refresh: () => HUB_refresh() };
})();
var HUB_refresh, HUB_createButton, HUB_bindCreate, HUB_legendShipIcon, HUB_calendarPop;
