/* Create / edit shipment — 5 steps + overview, live summary panel */
(function () {
  const { D, TRADES, VEHICLES, MATERIALS, UNLOADING_POINTS, EQUIPMENT_BOOKABLE, EQUIPMENT_ONSITE, ORGS, BUILDINGS, FLOORS, ZONES, GATES, WP_STATUS } = CLM;
  const { esc, ms, ci, tradeColor, tradeDark } = UI;
  const STEPS = ['Date', 'Materials', 'Transport', 'Time slot', 'Other info', 'Overview'];
  const DAY_START = 7 * 60, DAY_END = 18 * 60;
  const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  const fromMin = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  let d = null;      // draft
  let view = null;
  let anchorCell = null;
  let wpSearch = '', wpShowAll = false, matFilter = 'All', matSearch = '';

  // ---------------------------------------------------------------- entry points
  function blank(extra = {}) {
    return Object.assign({
      mode: 'new', step: 1, maxStep: 1, name: '', sender: 'Team pRED', express: false, date: '', wpId: null, wpLocked: false,
      recipient: '', building: '', floor: '', zone: '', materials: [], comment: '', vehicle: '', vehicles: 1, gate: GATES[0], plate: '', phone: '',
      up: '', start: '', end: '', equipment: [], createdBy: 'p1', onsite: 'p2', orderResp: '', deliveryResp: '', docs: [], photos: [],
      origin: '', km: '', multi: false, modes: ['Truck'], dirty: false, weekStart: D.monday(D.add(D.today, 1)),
    }, extra);
  }
  function fromWp(wpId, x) {
    const wp = S.wp(wpId); if (!wp) return x;
    return Object.assign(x, { wpId, sender: wp.sender, recipient: wp.recipient, building: wp.building, floor: wp.floor, zone: wp.zone });
  }
  function fromShipment(s, x) {
    const c = JSON.parse(JSON.stringify(s));
    return Object.assign(x, { name: c.name, sender: c.sender, wpId: c.wpId, recipient: c.recipient, building: c.building, floor: c.floor, zone: c.zone, materials: c.materials, comment: '',
      vehicle: c.vehicle, vehicles: c.vehicles || 1, gate: c.gate, plate: c.plate || '', phone: c.phone || '', up: c.up, equipment: c.equipment, onsite: c.onsite, orderResp: c.orderResp || '', deliveryResp: c.deliveryResp || '',
      origin: c.origin, km: c.km, modes: c.modes || ['Truck'], multi: (c.modes || []).length > 1 });
  }

  function start(o = {}) {
    wpSearch = ''; wpShowAll = false; matFilter = 'All'; matSearch = '';
    if (o.edit) {
      const s = S.shipment(o.edit);
      d = fromShipment(s, blank({ mode: 'edit', editId: s.id, step: 1, maxStep: 6, date: s.date, start: s.start, end: s.end, docs: s.docs.slice(), photos: s.photos.slice(), weekStart: D.monday(s.date) }));
      d.name = s.name; return UI.go('#/create');
    }
    if (o.duplicate) {
      const s = S.shipment(o.duplicate);
      d = fromShipment(s, blank()); d.name = s.name + ' (copy)'; d.maxStep = 1;
      UI.go('#/create'); UI.toast('Copied from ' + esc(s.no) + ' · pick a new date and time slot', { icon: 'content_copy' }); return;
    }
    if (o.wpId) { d = fromWp(o.wpId, blank({ wpLocked: true })); return UI.go('#/create'); }
    startModal();
  }

  /* "How would you like to start?" — CLM Figma 38218:8917. No templates: every option is copied from shipment history. */
  function startModal() {
    const byNew = (a, b) => b.created.localeCompare(a.created);
    const uniq = (list) => { const seen = new Set(); return list.filter((s) => !seen.has(s.name) && seen.add(s.name)); };
    const freq = (() => { const n = {}; S.data.SHIPMENTS.forEach((s) => { n[s.name] = (n[s.name] || 0) + 1; }); return uniq(S.data.SHIPMENTS.slice().sort((a, b) => n[b.name] - n[a.name] || byNew(a, b))); })();
    const SRC = {
      freq: { label: 'Frequently used', list: freq },
      mine: { label: 'From your shipments', list: uniq(S.data.SHIPMENTS.filter((s) => s.createdBy === 'p1').sort(byNew)) },
      team: { label: 'From your team mates', list: uniq(S.data.SHIPMENTS.filter((s) => s.createdBy !== 'p1').sort(byNew)) },
    };
    let src = 'freq'; let all = false;
    let saved = null; try { saved = JSON.parse(localStorage.getItem('clm-shipment-draft') || 'null'); } catch (e) {}
    const card = (s) => { const by = S.person(s.createdBy); return `<div class="hcard">
      <b class="hc-n ell" data-tip="${esc(s.name)}">${esc(s.name)}</b>
      <div class="hc-b">
        <div><i class="ms">location_on</i><span>Unloading point</span><em>${esc(s.up)}</em></div>
        <div><i class="ms">apartment</i><span>Building</span><em>${esc(s.building)}</em></div>
        <div><i class="ms">layers</i><span>Floor</span><em>${esc(s.floor)}</em></div>
      </div>
      <div class="hc-by"><span class="hc-av">${UI.initials(by.name)}</span><span class="ell">by ${esc(by.name)} · ${D.fmt(s.created.slice(0, 10))}</span></div>
      <div class="hc-a"><button class="btn text sm" data-prev="${s.id}">${ms('visibility')}Preview</button><button class="btn text sm" data-use="${s.id}">${ms('content_copy')}Duplicate</button></div>
    </div>`; };
    const list = () => { const l = SRC[src].list; return `${l.length ? `<div class="hcards">${l.slice(0, all ? 12 : 3).map(card).join('')}</div>` : '<div class="cap" style="padding:8px 0">No shipments yet</div>'}
      ${l.length > 3 ? `<button class="hs-all" data-all>${all ? 'Show less' : `See all ${SRC[src].label.toLowerCase().replace(/^from /, '')}`}</button>` : ''}`; };
    UI.modal({ title: 'How would you like to start?', size: 'wide', body: `
      ${saved ? `<div class="banner info" style="margin-bottom:12px" id="smDraft">${ms('edit_document')}<div class="grow"><b>Continue your draft?</b><p>${esc(saved.name || 'Untitled shipment')} · step ${saved.step} of 6 · ${STEPS[saved.step - 1]}</p></div><button class="btn text sm" data-draft-x>Discard</button><button class="btn sm primary" data-draft-go>Continue draft</button></div>` : ''}
      <div class="hs-new">
        <span class="hs-plus">${ms('add')}</span>
        <div class="grow"><b>Start from scratch</b><p>Create a new shipment step by step. You pick the working package in the first step.</p></div>
        <button class="btn primary" data-new>Create new</button>
      </div>
      <div class="hs-hist">
        <div class="hs-h"><b>Start from a previous shipment</b><p>Copy the details of a shipment you or your team created. You pick a new date and time slot.</p></div>
        <div class="hs-pills">${Object.entries(SRC).map(([k, o]) => `<button class="hs-pill ${k === src ? 'on' : ''}" data-src="${k}">${o.label}</button>`).join('')}</div>
        <div id="hsList">${list()}</div>
      </div>`,
      onMount: (el, close) => {
        const start = () => { wpSearch = ''; wpShowAll = false; close(); UI.go('#/create'); };
        el.querySelector('[data-draft-go]')?.addEventListener('click', () => { d = saved; d.dirty = true; close(); UI.go('#/create'); });
        el.querySelector('[data-draft-x]')?.addEventListener('click', () => { try { localStorage.removeItem('clm-shipment-draft'); } catch (e) {} el.querySelector('#smDraft').remove(); });
        el.addEventListener('click', (e) => {
          const t = e.target;
          if (t.closest('[data-new]')) { d = blank(); return start(); }
          const sp = t.closest('[data-src]'); if (sp) { src = sp.dataset.src; all = false; el.querySelectorAll('[data-src]').forEach((x) => x.classList.toggle('on', x === sp)); el.querySelector('#hsList').innerHTML = list(); return; }
          if (t.closest('[data-all]')) { all = !all; el.querySelector('#hsList').innerHTML = list(); return; }
          const pv = t.closest('[data-prev]'); if (pv) { close(); return UI.go('#/shipment/' + pv.dataset.prev); }
          const u = t.closest('[data-use]'); if (u) { const s = S.shipment(u.dataset.use); d = fromShipment(s, blank()); d.name = s.name + ' (copy)'; return start(); }
        });
      } });
  }

  // ---------------------------------------------------------------- page
  function render(v) {
    view = v;
    if (!d) d = blank();
    const edit = d.mode === 'edit';
    v.innerHTML = `
    <div class="page">
      <div class="sticky-head">
        <div class="flow-head">
          <button class="back" id="cBack" data-tip="Leave">${ms('arrow_back')}</button>
          <h1>${edit ? 'Edit Shipment' : 'Create Shipment'}</h1>
        </div>
        <div class="stepper-bar">
          <button class="btn" id="cPrev" ${d.step === 1 ? 'disabled' : ''}>${ms('arrow_back')}Back</button>
          <div class="stepper" id="cStepper"></div>
          ${edit ? `<button class="btn" id="cSave">${ms('save')}Save changes</button>` : ''}
          <button class="btn primary" id="cNext"></button>
        </div>
      </div>
      <div class="split-layout" style="--rp-top:24px">
        <div id="cStep"></div>
        <aside class="rpanel" id="cSummary"></aside>
      </div>
    </div>`;
    v.querySelector('#cBack').onclick = leave;
    v.querySelector('#cPrev').onclick = () => go(d.step - 1);
    v.querySelector('#cNext').onclick = () => (d.step === 6 ? (edit ? save() : create()) : next());
    v.querySelector('#cSave')?.addEventListener('click', () => { if (validateAll()) save(); });
    drawStepper(); drawStep(); drawSummary();
  }

  function drawStepper() {
    const el = view.querySelector('#cStepper');
    el.innerHTML = STEPS.map((l, i) => {
      const n = i + 1; const cls = n < d.step || (n <= d.maxStep && n !== d.step && valid(n, true)) ? 'done' : n === d.step ? 'cur' : n <= d.maxStep ? '' : 'locked';
      return `${i ? `<span class="step-line ${n <= d.maxStep && n - 1 < d.step ? 'done' : ''}"></span>` : ''}<div class="step ${cls}" data-s="${n}" role="button" tabindex="0" ${cls === 'locked' ? 'data-tip="Complete the previous steps first"' : ''}><span class="bub">${cls === 'done' ? ms('check', 's18') : n}</span><span class="lab">${l}</span></div>`;
    }).join('');
    el.querySelectorAll('.step').forEach((s) => s.onclick = () => { const n = +s.dataset.s; if (n <= d.maxStep || (n === d.maxStep + 1 && valid(d.step))) go(n); });
    view.querySelector('#cPrev').disabled = d.step === 1;
    const nx = view.querySelector('#cNext');
    nx.innerHTML = d.step === 6 ? `${ms('check')}${d.mode === 'edit' ? 'Save changes' : 'Create shipment'}` : d.step === 5 ? `Review${ms('arrow_forward')}` : `Next${ms('arrow_forward')}`;
    if (d.mode === 'edit' && d.step === 6) view.querySelector('#cSave')?.classList.add('hidden'); else view.querySelector('#cSave')?.classList.remove('hidden');
  }

  function go(n) {
    if (n < 1 || n > 6) return;
    d.step = n; d.maxStep = Math.max(d.maxStep, n); anchorCell = null;
    drawStepper(); drawStep(); drawSummary(); view.scrollTop = 0;
  }
  function next() { if (!valid(d.step)) { showErrors(); return; } go(d.step + 1); }

  // ---------------------------------------------------------------- validation
  function errors(step) {
    const e = {};
    if (step === 1) {
      if (!d.name.trim()) e.name = 'Shipment name is required';
      if (!d.sender) e.sender = 'Organization is required';
      if (!d.date) e.date = 'Pick a date';
      else if (needsExpress(d.date) && !d.express) e.date = 'This date is only bookable as express shipment';
      if (!d.wpId) e.wp = 'Choose the working package this shipment belongs to';
    }
    if (step === 2) {
      ['recipient', 'building', 'floor', 'zone'].forEach((k) => { if (!d[k]) e[k] = 'Required'; });
      if (!d.materials.length) e.materials = 'Add at least one material';
    }
    if (step === 3) { if (!d.vehicle) e.vehicle = 'Choose a vehicle'; if (!(d.vehicles >= 1)) e.vehicles = 'At least 1'; }
    if (step === 4) {
      if (!d.up) e.up = 'Choose an unloading point';
      if (!d.start || !d.end) e.slot = 'Pick a time slot';
      else if (toMin(d.end) <= toMin(d.start)) e.slot = 'End time must be after start time';
      else if (clash()) e.slot = 'This time overlaps with another booking';
    }
    if (step === 5) { if (!d.origin.trim()) e.origin = 'Address is required for the CO₂ report'; if (d.multi && !d.modes.length) e.modes = 'Choose at least one transport mode'; }
    return e;
  }
  function valid(step) { return Object.keys(errors(step)).length === 0; }
  function validateAll() { for (let i = 1; i <= 5; i++) if (!valid(i)) { go(i); showErrors(); UI.toast(`Please complete step ${i} · ${STEPS[i - 1]}`, { err: true }); return false; } return true; }
  function showErrors() {
    const e = errors(d.step);
    Object.entries(e).forEach(([k, msg]) => {
      const f = view.querySelector(`[data-err="${k}"]`);
      if (f) { f.classList.add('has-error'); const m = f.querySelector('.error-msg'); if (m) m.textContent = msg; }
    });
    const first = view.querySelector('.has-error'); if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
    UI.toast(Object.values(e)[0], { err: true, ms: 3000 });
  }
  function clearErr(k) { view.querySelector(`[data-err="${k}"]`)?.classList.remove('has-error'); }
  const errSlot = (k) => `<span class="error-msg"></span>`;

  // ---------------------------------------------------------------- business rules
  function needsExpress(date) { let n = 0, x = D.today; while (x < date) { x = D.add(x, 1); if (D.dow(x) < 5) n++; } return n <= 2; }
  function dayState(date) {
    if (D.diff(date, D.today) <= 0) return 'past';
    if (D.dow(date) > 4) return 'closed';
    return needsExpress(date) ? 'express' : 'ok';
  }
  function weather(date) {
    const k = (+date.slice(8) * 7 + +date.slice(5, 7)) % 6;
    return [['rainy', 'rain', 3], ['sunny', 'sun', 0], ['cloud', 'cloud', 2], ['partly_cloudy_day', 'sun', 1], ['cloud', 'cloud', 5], ['sunny', 'sun', 4]][k];
  }
  function busy(date, up) {
    if (!date || !up) return [];
    const list = S.data.SHIPMENTS.filter((s) => s.date === date && s.up === up && s.id !== d.editId && !['Canceled', 'Rejected'].includes(s.status)).map((s) => ({ s: toMin(s.start), e: toMin(s.end), label: s.no }));
    const seed = +date.slice(8);
    const fixed = up === 'UP 01' ? [{ s: 440, e: 480, label: 'Elevator CR1' }, { s: 720 + (seed % 3) * 20, e: 760 + (seed % 3) * 20, label: 'Crane 2' }] : [{ s: 600, e: 660, label: 'Street closed' }];
    return fixed.concat(list).filter((b) => b.e > DAY_START && b.s < DAY_END);
  }
  function eqBusy(date, id) { if (!date) return []; const seed = +date.slice(8); return id === 'crane5' ? [{ s: 480 + (seed % 2) * 20, e: 520 + (seed % 2) * 20 }, { s: 840, e: 900 }] : [{ s: 780, e: 840 }]; }
  function clash() { const s = toMin(d.start), e = toMin(d.end); return busy(d.date, d.up).some((b) => s < b.e && e > b.s); }
  function freeSlots() {
    const b = busy(d.date, d.up).sort((x, y) => x.s - y.s); const out = []; let t = DAY_START;
    const up20 = (m) => Math.ceil(m / 20) * 20;
    b.forEach((x) => { if (x.s - t >= 40) out.push([t, x.s]); t = Math.max(t, up20(x.e)); });
    if (DAY_END - t >= 40) out.push([t, DAY_END]);
    return out;
  }
  function recommendedVehicle() { const ids = d.materials.map((m) => m.id); if (ids.includes('concrete')) return 'fahrmischer'; if (ids.includes('rebar') || ids.includes('steel')) return 'sattelzug'; if (ids.includes('ducts')) return 'anhaenger'; return d.materials.length ? 'solo-ab-7-5' : null; }
  function set(k, v) { d[k] = v; d.dirty = true; drawSummary(k); }

  // ---------------------------------------------------------------- steps
  function drawStep() {
    const el = view.querySelector('#cStep');
    el.innerHTML = [null, step1, step2, step3, step4, step5, step6][d.step]();
    [null, bind1, bind2, bind3, bind4, bind5, bind6][d.step](el);
    el.querySelectorAll('.cancel-link').forEach((x) => x.onclick = leave);
  }
  const footer = () => `<div class="row" style="margin-top:16px"><a class="link cancel-link" style="color:var(--olive-600)">Cancel</a><span class="sp"></span>${d.mode === 'new' ? `<button class="btn" data-draft>${ms('save')}Save draft</button>` : ''}</div>`;

  // ---------- step 1: date ----------
  function step1() {
    const days = Array.from({ length: 7 }, (_, i) => D.add(d.weekStart, i));
    const wps = S.data.WPS.filter((w) => S.wpStatus(w) !== 'completed');
    const q = wpSearch.trim().toLowerCase();
    let list = d.wpLocked ? wps.filter((w) => w.id === d.wpId) : wps.filter((w) => !q || [w.title, w.trade, w.sender, w.building].join(' ').toLowerCase().includes(q));
    if (!d.wpLocked && !wpShowAll && !q) list = list.filter((w) => w.sender === d.sender || w.id === d.wpId);
    const wp = d.wpId && S.wp(d.wpId);
    const outside = wp && d.date && (d.date < wp.from || d.date > wp.to);
    return `
    <div class="banner" style="margin-bottom:12px">${ms('warning')}<div><b>Important</b><p>Due to local conditions there is only one entrance to unloading points A1 to A5. Please arrive on time — late arrivals can lead to waiting times.</p></div></div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">General</div><div class="card-sub">Name the shipment and tell us who it is for.</div></div></div>
      <div class="grid2">
        <div class="field" data-err="name"><label>Shipment name *</label><input class="input" id="fName" value="${esc(d.name)}" placeholder="e.g. B06-OG01-Luftung_Montage der Kanäle" maxlength="80">${errSlot()}</div>
        <div class="field" data-err="sender"><label>Organization *</label><select class="select" id="fSender" ${d.wpLocked ? 'disabled' : ''}>${ORGS.map((o) => `<option ${o === d.sender ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>${errSlot()}</div>
      </div>
      <label class="check" style="margin-top:14px"><input type="checkbox" id="fExpress" ${d.express ? 'checked' : ''}><span>Express shipment<small>Allows booking on short notice (marked days below).</small></span></label>
    </div>
    <div class="card" data-err="date"><div class="card-head"><div class="grow"><div class="card-h">Select date</div><div class="card-sub">When do you want to schedule the shipment?</div></div>
        <div class="row" style="gap:2px"><button class="icon-btn sm" id="wkPrev" ${d.weekStart <= D.monday(D.today) ? 'disabled style="opacity:.3"' : ''} data-tip="Previous week">${ms('chevron_left')}</button><b style="font-weight:500;min-width:160px;text-align:center">${D.monthName(d.weekStart)} ${d.weekStart.slice(0, 4)} · Week ${D.week(d.weekStart)}</b><button class="icon-btn sm" id="wkNext" data-tip="Next week">${ms('chevron_right')}</button></div></div>
      <div class="sel-grid" style="grid-template-columns:repeat(7,1fr)">
        ${days.map((x) => { const st = dayState(x); const w = weather(x); const off = st === 'past' || st === 'closed' || (st === 'express' && !d.express);
          return `<div class="stile day-card ${x === d.date ? 'on' : ''} ${off ? 'off' : ''}" data-day="${x}" data-st="${st}" ${st === 'closed' ? 'data-tip="Weekends are closed"' : st === 'past' ? 'data-tip="This day is in the past"' : st === 'express' && !d.express ? 'data-tip="Tick “Express shipment” to book this day"' : ''}>
            <b>${+x.slice(8)}, ${D.dayName(x)}</b>${UI.wx(w[1] === 'sun' && w[0] !== 'sunny' ? 'partly' : w[1], 32, 'wx')}<span class="temp"><span class="lo">${10 + w[2]}°</span><span class="hi">${16 + w[2]}°</span></span><small>${ms('south_east')} ${2 + w[2]} km/h</small>${st === 'express' ? '<span class="pill error">Express</span>' : ''}</div>`; }).join('')}
      </div>
      <div class="row cap" style="margin-top:10px;gap:8px"><span class="pill error">Express</span>Only bookable as express shipment · Weekends are closed</div>
      <div class="grid2" style="margin-top:14px">
        <div class="field"><label>Shipment date *</label><input class="input" type="date" id="fDate" value="${d.date}" min="${D.add(D.today, 1)}" max="2027-12-31"></div>
        <div class="field"><label>Site time zone</label><input class="input" value="Europe/Zurich" readonly></div>
      </div>
      <span class="error-msg" style="margin-top:6px"></span>
    </div>
    <div class="card" data-err="wp"><div class="card-head"><div class="grow"><div class="card-h">Working package</div><div class="card-sub">${d.wpLocked ? 'This shipment is added to the working package you started from.' : 'Assign the shipment to the working package it belongs to.'}</div></div>
      ${d.wpLocked ? `<span class="pill olive">${ms('lock', 's16')}Locked</span>` : ''}</div>
      ${d.wpLocked ? '' : `<div class="row" style="gap:16px;margin-bottom:14px"><div class="input-icon grow">${ms('search')}<input class="input" id="wpQ" placeholder="Search working packages" value="${esc(wpSearch)}"></div><label class="check"><input type="checkbox" id="wpAll" ${wpShowAll ? 'checked' : ''}>Show all organizations</label></div>`}
      <div class="cards" style="grid-template-columns:repeat(3,1fr)">
        ${list.map((w) => { const st = S.wpStats(w); return UI.wpCard({ title: w.title, trade: w.trade, building: w.building, floor: w.floor, dates: D.fmt(w.from) + ' - ' + D.fmt(w.to), sender: w.sender, counts: { open: st.open, approved: st.approved, completed: st.done, draft: st.canceled }, status: S.wpStatus(w), sel: w.id === d.wpId, attrs: `data-wp="${w.id}"` }); }).join('') || `<div class="cap">No working package found. <a class="link" id="wpCreate">Create a new one</a></div>`}
      </div>
      ${outside ? `<div class="banner" style="margin-top:12px">${ms('event_busy')}<div><b>Date is outside the booking window</b><p>${esc(wp.title)} runs from ${D.fmt(wp.from)} to ${D.fmt(wp.to)}. You can still create the shipment, but the site team will review it.</p></div></div>` : ''}
      <span class="error-msg" style="margin-top:8px"></span>
    </div>${footer()}`;
  }
  function bind1(el) {
    el.querySelector('#fName').oninput = (e) => { set('name', e.target.value); clearErr('name'); };
    el.querySelector('#fSender').onchange = (e) => { set('sender', e.target.value); drawStep(); };
    el.querySelector('#fExpress').onchange = (e) => { set('express', e.target.checked); if (!e.target.checked && d.date && needsExpress(d.date)) set('date', ''); drawStep(); };
    el.querySelectorAll('[data-day]').forEach((c) => c.onclick = () => {
      const st = c.dataset.st;
      if (st === 'past' || st === 'closed') return;
      if (st === 'express' && !d.express) { UI.toast('This day is only bookable as express shipment. Tick “Express shipment” first.', { icon: 'bolt' }); el.querySelector('#fExpress').closest('.check').animate([{ background: 'var(--olive-100)' }, { background: 'transparent' }], 900); return; }
      set('date', c.dataset.day); if (d.start && clash()) { set('start', ''); set('end', ''); } drawStep();
    });
    el.querySelector('#fDate').onchange = (e) => {
      const v = e.target.value; if (!v) return;
      const st = dayState(v);
      if (st === 'past' || st === 'closed') { UI.toast(st === 'closed' ? 'Weekends are closed — pick a weekday.' : 'Pick a date in the future.', { err: true }); e.target.value = d.date; return; }
      if (st === 'express' && !d.express) { UI.toast('This date needs an express shipment.', { err: true }); e.target.value = d.date; return; }
      set('date', v); d.weekStart = D.monday(v); drawStep();
    };
    el.querySelector('#wkPrev').onclick = () => { d.weekStart = D.add(d.weekStart, -7); drawStep(); };
    el.querySelector('#wkNext').onclick = () => { d.weekStart = D.add(d.weekStart, 7); drawStep(); };
    const q = el.querySelector('#wpQ'); if (q) { q.oninput = () => { wpSearch = q.value; const pos = q.selectionStart; drawStep(); const nq = view.querySelector('#wpQ'); nq.focus(); nq.setSelectionRange(pos, pos); }; }
    el.querySelector('#wpAll')?.addEventListener('change', (e) => { wpShowAll = e.target.checked; drawStep(); });
    el.querySelector('#wpCreate')?.addEventListener('click', () => WPFORM.open());
    if (!d.wpLocked) el.querySelectorAll('[data-wp]').forEach((c) => c.onclick = () => { Object.assign(d, fromWp(c.dataset.wp, d)); d.dirty = true; drawStep(); drawSummary('wp'); });
    el.querySelector('[data-draft]')?.addEventListener('click', saveDraft);
  }

  // ---------- step 2: materials ----------
  function step2() {
    const allM = MATERIALS.concat(S.data.extraMaterials || []);
    const q = matSearch.trim().toLowerCase();
    let list = allM.filter((m) => (matFilter === 'All' || (matFilter === 'Pinned' ? m.pinned || (S.data.pins || []).includes(m.id) : m.group === matFilter)) && (!q || m.name.toLowerCase().includes(q)));
    const show = d.showAllMat || q || matFilter !== 'All' ? list : list.slice(0, 11);
    const sel = (id) => d.materials.find((m) => m.id === id);
    return `
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Destination</div><div class="card-sub">Where should the delivery go on site?${d.wpId ? ' Prefilled from the working package.' : ''}</div></div></div>
      <div class="grid2">
        ${[['recipient', 'Recipient', ORGS], ['building', 'Building', BUILDINGS], ['floor', 'Floor', FLOORS], ['zone', 'Laydown area', ZONES]].map(([k, l, o]) => `<div class="field" data-err="${k}"><label>${l} *</label><select class="select" data-f="${k}"><option value="">Select</option>${o.map((x) => `<option ${x === d[k] ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>${errSlot()}</div>`).join('')}
      </div></div>
    <div class="card" data-err="materials"><div class="card-head"><div class="grow"><div class="card-h">Materials</div><div class="card-sub">Which material do you want to deliver? Pick one or more and set the quantity.</div></div></div>
      <div class="row" style="margin-bottom:12px"><div class="chips">${['All', 'Pinned', 'Bulk', 'Pallets'].map((f) => `<button class="chip filled ${matFilter === f ? 'on' : ''}" data-mf="${f}">${f}</button>`).join('')}</div><span class="sp"></span><div class="input-icon" style="width:240px">${ms('search')}<input class="input" id="matQ" placeholder="Search material" value="${esc(matSearch)}"></div></div>
      <div class="sel-grid" style="grid-template-columns:repeat(6,1fr)">
        <div class="stile add-stile" id="matNew">${ms('add', 's24')}<b>Add new</b></div>
        ${show.map((m) => { const s = sel(m.id); return `<div class="stile ${s ? 'on' : ''}" data-mat="${m.id}"><b>${esc(m.name)}</b><small>Unit: ${esc(m.unit)}</small>${s ? `<span class="pill olive">${s.qty} ${esc(s.unit)}</span>` : ''}</div>`; }).join('')}
      </div>
      ${list.length > 11 && matFilter === 'All' && !q ? `<a class="link" id="matMore" style="margin-top:10px">${ms(d.showAllMat ? 'expand_less' : 'expand_more', 's18')}${d.showAllMat ? 'Show fewer' : `See all materials (${list.length})`}</a>` : ''}
      ${!list.length ? `<div class="cap" style="margin-top:8px">No material found. <a class="link" id="matNew2">Add “${esc(matSearch)}”</a></div>` : ''}
      <div class="sel-list" style="margin-top:14px;border-top:1px solid var(--border);padding-top:10px">
        <div class="overline">Selected (${d.materials.length})</div>
        ${d.materials.map((m, i) => { const mm = S.material(m.id); return `<div class="sl-item"><div><b style="font-weight:500">${esc(mm.name)}</b><div class="cap">${esc(mm.pack || '')}${m.pallets ? ` · ${m.pallets} EUR pallets` : ''}${m.weight ? ` · ${m.weight} kg` : ''}${m.note ? ' · ' + esc(m.note) : ''}</div></div>
          <div class="field"><label>Quantity *</label><input class="input" type="number" min="1" value="${m.qty}" data-qty="${i}"></div>
          <div class="field"><label>Unit</label><input class="input" value="${esc(m.unit)}" readonly></div>
          <div class="row" style="gap:0"><button class="btn text" data-medit="${i}">${ms('edit')}Details</button><button class="btn text" data-mrm="${i}">${ms('delete')}Remove</button></div></div>`; }).join('') || '<div class="cap" style="padding:8px 0">Nothing selected yet — click a material above.</div>'}
      </div><span class="error-msg"></span></div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Comment</div></div></div>
      <div class="field"><label>Note for the site team (optional)</label><textarea class="input" id="fComment" maxlength="250" placeholder="e.g. Please unload at the north side of Bau 06.">${esc(d.comment)}</textarea><div class="counter" id="cmtCount">${d.comment.length}/250</div></div></div>
    ${footer()}`;
  }
  function bind2(el) {
    el.querySelectorAll('[data-f]').forEach((s) => s.onchange = () => { set(s.dataset.f, s.value); clearErr(s.dataset.f); });
    el.querySelectorAll('[data-mf]').forEach((c) => c.onclick = () => { matFilter = c.dataset.mf; drawStep(); });
    const q = el.querySelector('#matQ'); q.oninput = () => { matSearch = q.value; const p = q.selectionStart; drawStep(); const n = view.querySelector('#matQ'); n.focus(); n.setSelectionRange(p, p); };
    el.querySelector('#matMore')?.addEventListener('click', () => { d.showAllMat = !d.showAllMat; drawStep(); });
    el.querySelectorAll('[data-mat]').forEach((t) => t.onclick = () => { const i = d.materials.findIndex((m) => m.id === t.dataset.mat); qtyModal(t.dataset.mat, i >= 0 ? i : null); });
    el.querySelectorAll('[data-qty]').forEach((x) => x.onchange = () => { d.materials[+x.dataset.qty].qty = Math.max(1, +x.value || 1); d.dirty = true; drawStep(); drawSummary(); });
    el.querySelectorAll('[data-mrm]').forEach((x) => x.onclick = () => { const m = d.materials.splice(+x.dataset.mrm, 1)[0]; drawStep(); drawSummary(); UI.toast(`${esc(S.material(m.id).name)} removed`, { action: 'Undo', onAction: () => { d.materials.push(m); drawStep(); drawSummary(); } }); });
    el.querySelectorAll('[data-medit]').forEach((x) => x.onclick = () => qtyModal(d.materials[+x.dataset.medit].id, +x.dataset.medit));
    const nm = () => newMaterial(); el.querySelector('#matNew').onclick = nm; el.querySelector('#matNew2')?.addEventListener('click', nm);
    const c = el.querySelector('#fComment'); c.oninput = () => { d.comment = c.value; el.querySelector('#cmtCount').textContent = c.value.length + '/250'; };
    el.querySelector('[data-draft]')?.addEventListener('click', saveDraft);
  }
  function qtyModal(id, idx) {
    const mm = S.material(id); const cur = idx != null ? d.materials[idx] : { qty: mm.unit === 'm³' ? 8 : 1, unit: mm.unit, note: '' };
    const pinned = mm.pinned || (S.data.pins || []).includes(id);
    UI.modal({ title: esc(mm.name), sub: `Unit: ${esc(mm.unit)} · ${esc(mm.pack || '')}`, icon: 'category', body: `
      <div class="grid2">
        <div class="field"><label>Quantity *</label><div class="qty"><button data-d="-1">${ms('remove')}</button><input id="qQty" type="number" min="1" value="${cur.qty}"><button data-d="1">${ms('add')}</button></div></div>
        <div class="field"><label>EUR pallets</label><input class="input" id="qPal" type="number" min="0" value="${cur.pallets || ''}" placeholder="0"></div>
        <div class="field" style="grid-column:span 2"><label>Dimensions per unit (L × W × H, cm)</label><div class="row" style="gap:6px"><input class="input" id="qL" placeholder="L" value="${cur.l || ''}"><span class="faint">×</span><input class="input" id="qW" placeholder="W" value="${cur.w || ''}"><span class="faint">×</span><input class="input" id="qH" placeholder="H" value="${cur.h || ''}"></div></div>
        <div class="field"><label>Total weight (kg)</label><input class="input" id="qKg" type="number" min="0" value="${cur.weight || ''}"></div>
        <div class="field"><label>Note</label><input class="input" id="qNote" value="${esc(cur.note || '')}" placeholder="e.g. Unload north side"></div>
      </div>
      <label class="check" style="margin-top:14px"><input type="checkbox" id="qPin" ${pinned ? 'checked' : ''}>Pin as favourite material</label>`,
      onMount: (el) => el.querySelectorAll('.qty button').forEach((b) => b.onclick = () => { const i = el.querySelector('#qQty'); i.value = Math.max(1, (+i.value || 0) + +b.dataset.d); }),
      actions: [
        ...(idx != null ? [{ label: 'Remove', text: true, left: true, danger: true, icon: 'delete', onClick: () => { d.materials.splice(idx, 1); drawStep(); drawSummary(); } }] : []),
        { label: 'Cancel', text: true },
        { label: idx != null ? 'Update' : 'Add material', primary: true, onClick: (c, sc) => {
          const q = +sc.querySelector('#qQty').value; if (!(q > 0)) { sc.querySelector('#qQty').focus(); return false; }
          const m = { id, qty: q, unit: mm.unit, pallets: +sc.querySelector('#qPal').value || 0, l: sc.querySelector('#qL').value, w: sc.querySelector('#qW').value, h: sc.querySelector('#qH').value, weight: +sc.querySelector('#qKg').value || 0, note: sc.querySelector('#qNote').value.trim() };
          if (idx != null) d.materials[idx] = m; else d.materials.push(m);
          const pins = S.data.pins = S.data.pins || []; const pin = sc.querySelector('#qPin').checked;
          if (pin && !pins.includes(id)) pins.push(id); if (!pin) S.data.pins = pins.filter((x) => x !== id); S.persist();
          d.dirty = true; clearErr('materials'); drawStep(); drawSummary('materials');
          if (!d.vehicle && recommendedVehicle()) d.vehicle = recommendedVehicle();
        } }] });
  }
  function newMaterial() {
    UI.modal({ title: 'Add new material', icon: 'add_box', size: 'sm', body: `<div class="col" style="gap:12px"><div class="field"><label>Name *</label><input class="input" id="nmName" value="${esc(matSearch)}"></div><div class="grid2"><div class="field"><label>Unit *</label><select class="select" id="nmUnit">${['pcs', 'm³', 'm²', 'm', 't', 'kg', 'pallets', 'bags'].map((u) => `<option>${u}</option>`).join('')}</select></div><div class="field"><label>Type</label><select class="select" id="nmGroup"><option>Pallets</option><option>Bulk</option></select></div></div></div>`,
      actions: [{ label: 'Cancel', text: true }, { label: 'Add', primary: true, onClick: (c, sc) => {
        const n = sc.querySelector('#nmName').value.trim(); if (!n) return false;
        const m = { id: 'm' + Date.now(), name: n, unit: sc.querySelector('#nmUnit').value, group: sc.querySelector('#nmGroup').value, pack: sc.querySelector('#nmGroup').value };
        (S.data.extraMaterials = S.data.extraMaterials || []).push(m); S.persist(); matSearch = ''; setTimeout(() => qtyModal(m.id, null), 50);
      } }] });
  }

  // ---------- step 3: transport ----------
  function step3() {
    const rec = recommendedVehicle();
    return `
    <div class="card" data-err="vehicle"><div class="card-head"><div class="grow"><div class="card-h">Vehicle</div><div class="card-sub">Which vehicle do you need for the shipment?${rec ? ` Recommended for ${esc(S.material(d.materials.find((m) => true).id).name.toLowerCase())}: <b>${esc(S.vehicle(rec).name)}</b>.` : ''}</div></div></div>
      <div class="sel-grid" style="grid-template-columns:repeat(4,1fr)">
        ${VEHICLES.map((v) => `<div class="stile ${d.vehicle === v.id ? 'on' : ''}" data-veh="${v.id}" style="min-height:108px">${ci(v.icon, 64, 'height:32px')}<b>${esc(v.name)}</b><small>${esc(v.desc)}</small>${v.id === rec ? '<span class="pill olive">Recommended</span>' : ''}</div>`).join('')}
      </div><span class="error-msg"></span></div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Access &amp; arrival</div><div class="card-sub">How will the vehicle reach the site?</div></div></div>
      <div class="grid2">
        <div class="field"><label>Arrival gate *</label><select class="select" id="fGate">${GATES.map((g) => `<option ${g === d.gate ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
        <div class="field" data-err="vehicles"><label>Number of vehicles *</label><div class="qty" style="width:max-content"><button data-vn="-1">${ms('remove')}</button><input id="fVn" type="number" min="1" max="20" value="${d.vehicles}"><button data-vn="1">${ms('add')}</button></div>${errSlot()}</div>
        <div class="field"><label>License plate</label><input class="input" id="fPlate" value="${esc(d.plate)}" placeholder="ZH 123 456"></div>
        <div class="field"><label>Driver phone</label><input class="input" id="fPhone" value="${esc(d.phone)}" placeholder="+41 79 123 45 67" inputmode="tel"></div>
      </div></div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Site map</div><div class="card-sub">Check the access route and unloading points before you continue.</div></div><button class="btn" id="mapFull">${ms('fullscreen')}Full screen</button></div>
      <div class="map"><img src="assets/img/site-map.jpg" alt="Site map">
        ${[['A1', 46, 58], ['A2', 52, 64], ['A3', 58, 52], ['A4', 63, 70], ['A5', 41, 72]].map(([n, x, y]) => `<span class="pin" style="left:${x}%;top:${y}%" data-tip="Unloading point ${n}">${ms('location_on', 'fill')}<span>${n}</span></span>`).join('')}
      </div>
      <div class="row cap" style="gap:16px;margin-top:8px"><span class="row" style="gap:6px"><span class="dot-s" style="background:var(--olive)"></span>Access route</span><span class="row" style="gap:6px"><span class="dot-s" style="background:var(--violet)"></span>Unloading points A1–A5</span><span class="row" style="gap:6px"><span class="dot-s" style="background:var(--err)"></span>Restricted zone</span></div></div>
    ${footer()}`;
  }
  function bind3(el) {
    el.querySelectorAll('[data-veh]').forEach((t) => t.onclick = () => { set('vehicle', t.dataset.veh); clearErr('vehicle'); el.querySelectorAll('[data-veh]').forEach((x) => x.classList.toggle('on', x === t)); });
    el.querySelector('#fGate').onchange = (e) => set('gate', e.target.value);
    const vn = el.querySelector('#fVn'); vn.onchange = () => set('vehicles', Math.max(1, Math.min(20, +vn.value || 1)));
    el.querySelectorAll('[data-vn]').forEach((b) => b.onclick = () => { vn.value = Math.max(1, Math.min(20, (+vn.value || 1) + +b.dataset.vn)); set('vehicles', +vn.value); });
    el.querySelector('#fPlate').oninput = (e) => { d.plate = e.target.value.toUpperCase(); e.target.value = d.plate; };
    el.querySelector('#fPhone').oninput = (e) => { d.phone = e.target.value; };
    el.querySelector('#mapFull').onclick = () => UI.lightbox(['assets/img/site-map.jpg']);
    el.querySelectorAll('.pin').forEach((p) => p.onclick = () => UI.toast(p.dataset.tip + ' · max. vehicle height 4 m', { icon: 'location_on' }));
    el.querySelector('[data-draft]')?.addEventListener('click', saveDraft);
  }

  // ---------- step 4: time slot ----------
  function step4() {
    const up = UNLOADING_POINTS.find((u) => u.id === d.up);
    const b = busy(d.date, d.up); const span = DAY_END - DAY_START; const p = (m) => ((m - DAY_START) / span) * 100;
    const booked = d.equipment.filter((e) => e.kind === 'booked'); const eqCol = booked[0];
    const times = []; for (let m = DAY_START; m <= DAY_END; m += 20) times.push(fromMin(m));
    const hours = []; for (let h = 7; h < 18; h++) hours.push(h);
    const sel = d.start && d.end ? [toMin(d.start), toMin(d.end)] : null;
    const cell = (col, m) => {
      const isBusy = col === 'up' ? b.some((x) => m < x.e && m + 20 > x.s) : eqBusy(d.date, eqCol.id).some((x) => m < x.e && m + 20 > x.s);
      const inSel = col === 'up' ? sel && m >= sel[0] && m < sel[1] : eqCol && m >= toMin(eqCol.start) && m < toMin(eqCol.end);
      return `<div class="slot-cell ${isBusy ? 'busy' : ''} ${inSel ? 'sel' : ''} ${anchorCell && anchorCell.col === col && anchorCell.m === m ? 'sel' : ''}" data-col="${col}" data-m="${m}" data-tip="${fromMin(m)} – ${fromMin(m + 20)}${isBusy ? ' · booked' : ''}"></div>`;
    };
    const w = (h) => { const k = (h + +(d.date || '2026-01-01').slice(8)) % 5; return [['sunny', 'sun', 'Sunny'], ['partly_cloudy_day', 'sun', 'Partly cloudy'], ['cloud', 'cloud', 'Cloudy'], ['rainy', 'rain', 'Rain'], ['sunny', 'sun', 'Sunny']][k]; };
    return `
    <div class="card" data-err="up"><div class="card-head"><div class="grow"><div class="card-h">Unloading zone</div><div class="card-sub">Select the unloading point for ${d.date ? D.fmt(d.date) : 'your date'}.</div></div></div>
      <div class="sel-grid" style="grid-template-columns:repeat(3,1fr)">
        ${UNLOADING_POINTS.map((u) => `<div class="stile ${d.up === u.id ? 'on' : ''} ${u.disabled ? 'off' : ''}" data-up="${u.id}" ${u.disabled ? `data-tip="${esc(u.desc)}"` : ''}>${ms('location_on', 's24')}<b>${u.name}</b><small>${esc(u.area)} · ${esc(u.desc)}</small>${!u.disabled ? `<span class="pill ${busy(d.date, u.id).length > 2 ? 'warning' : 'success'}">${busy(d.date, u.id).length > 2 ? 'Busy day' : 'Free today'}</span>` : ''}</div>`).join('')}
      </div><span class="error-msg"></span></div>
    <div class="card ${!d.up ? 'hidden' : ''}" data-err="slot"><div class="card-head"><div class="grow"><div class="card-h">Time slot</div><div class="card-sub">Pick the start and end time. Grey blocks are already booked at ${esc(d.up || '')}. Drag on the bar or pick slots in the grid below.</div></div></div>
      <div class="mini-tl" id="miniTl"><div class="hrs">${hours.concat(18).map((h) => `<span>${String(h).padStart(2, '0')}</span>`).join('')}</div>
        ${b.map((x) => `<div class="blk busy" style="left:${p(Math.max(x.s, DAY_START))}%;width:${p(Math.min(x.e, DAY_END)) - p(Math.max(x.s, DAY_START))}%" data-tip="${esc(x.label)} · ${fromMin(x.s)} – ${fromMin(x.e)}">${esc(x.label)}<br>${fromMin(x.s)}–${fromMin(x.e)}</div>`).join('')}
        ${sel ? `<div class="blk mine" style="left:${p(sel[0])}%;width:${p(sel[1]) - p(sel[0])}%">Your shipment<br>${d.start} – ${d.end}</div>` : ''}
      </div>
      <div class="row" style="margin-top:12px;flex-wrap:wrap"><span class="cap">Free slots:</span>${freeSlots().map(([s, e]) => { const en = Math.min(e, s + 120); return `<button class="chip ${sel && sel[0] === s && sel[1] === en ? 'on' : ''}" data-free="${s}-${en}">${fromMin(s)} – ${fromMin(en)}</button>`; }).join('') || '<span class="cap">No free slot on this day</span>'}</div>
      <div class="grid3" style="margin-top:14px">
        <div class="field"><label>Start time *</label><select class="select" id="fStart"><option value="">--:--</option>${times.slice(0, -1).map((t) => `<option ${t === d.start ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label>End time *</label><select class="select" id="fEnd"><option value="">--:--</option>${times.slice(1).map((t) => `<option ${t === d.end ? 'selected' : ''} ${d.start && toMin(t) <= toMin(d.start) ? 'disabled' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label>Duration</label><input class="input" readonly value="${sel ? `${Math.floor((sel[1] - sel[0]) / 60)} h ${(sel[1] - sel[0]) % 60} min` : '—'}"></div>
      </div>
      <span class="error-msg" style="margin-top:6px"></span>
      <div class="row" style="margin:20px 0 4px;align-items:flex-end"><div class="grow"><b style="font-weight:500">Or pick slots in the grid</b><div class="cap">Click a start cell, then an end cell. Your selection stays in sync with the bar above.</div></div><span class="slot-legend"><span><i></i>Free</span><span><i style="background:#FBE3DF;border-color:#FBE3DF"></i>Booked</span><span><i style="background:var(--olive-200);border-color:var(--olive)"></i>Your selection</span></span></div>
      <div class="slot-grid" style="grid-template-columns:96px 1fr ${eqCol ? '1fr' : ''}">
        <div class="sgh"></div><div class="sgh" style="border-left:1px solid #eee">${esc(d.up)}<small>Slot length ${up ? up.slot : 20} min${sel ? ` · Selected: ${d.start} – ${d.end}` : ''}</small></div>
        ${eqCol ? `<div class="sgh" style="border-left:1px solid #eee">${esc(S.equipment(eqCol.id).name)}<small>Slot length ${S.equipment(eqCol.id).slot} min · Selected: ${eqCol.start} – ${eqCol.end}</small></div>` : ''}
        ${hours.map((h) => { const wx = w(h); return `<div class="hr"><b>${String(h).padStart(2, '0')}:00</b><span>${UI.wx(wx[0] === 'partly_cloudy_day' ? 'partly' : wx[1], 18)}</span><span>${wx[2]}</span></div><div class="cells">${[0, 20, 40].map((o) => cell('up', h * 60 + o)).join('')}</div>${eqCol ? `<div class="cells">${[0, 20, 40].map((o) => cell('eq', h * 60 + o)).join('')}</div>` : ''}`; }).join('')}
      </div>
    </div>
    <div class="card ${!d.up ? 'hidden' : ''}"><div class="card-head"><div class="grow"><div class="card-h">Bookable equipment</div><div class="card-sub">Book special equipment for your delivery. Slot length is fixed per equipment. Bookings need approval.</div></div></div>
      <div class="sel-grid" style="grid-template-columns:repeat(4,1fr)">${EQUIPMENT_BOOKABLE.map((e) => { const on = d.equipment.find((x) => x.id === e.id); return `<div class="stile ${on ? 'on' : ''} ${e.disabled ? 'off' : ''}" data-eqb="${e.id}" ${e.disabled ? `data-tip="${esc(e.spec)}"` : ''}>${ci(e.icon, 36)}<b>${esc(e.name)}</b><small>${esc(e.spec)}</small>${!e.disabled ? `<span class="pill olive">Slot ${e.slot} min</span>` : ''}</div>`; }).join('')}</div></div>
    <div class="card ${!d.up ? 'hidden' : ''}"><div class="card-head"><div class="grow"><div class="card-h">Non-bookable equipment</div><div class="card-sub">Equipment available on site without a booking. Tell us how you’ll use it.</div></div></div>
      <div class="sel-grid" style="grid-template-columns:repeat(4,1fr)">${EQUIPMENT_ONSITE.map((e) => { const on = d.equipment.find((x) => x.id === e.id); return `<div class="stile ${on ? 'on' : ''}" data-eqo="${e.id}">${ci(e.icon, 36)}<b>${esc(e.name)}</b><small>${esc(e.spec)}</small>${on ? `<span class="pill olive">${on.pulls} pull${on.pulls > 1 ? 's' : ''}</span>` : ''}</div>`; }).join('')}</div></div>
    ${footer()}`;
  }
  function setSlot(s, e, quiet) {
    d.start = fromMin(s); d.end = fromMin(e); d.dirty = true;
    d.equipment.forEach((x) => { if (x.kind === 'booked') { const len = S.equipment(x.id).slot; if (toMin(x.start || '00:00') < s || toMin(x.end || '00:00') > e || !x.start) { x.start = fromMin(s); x.end = fromMin(Math.min(e, s + len)); } } else { x.start = d.start; x.end = d.end; } });
    clearErr('slot'); drawStep(); drawSummary('slot');
    if (!quiet && clash()) UI.toast('This time overlaps with another booking at ' + d.up, { err: true });
  }
  function bind4(el) {
    el.querySelectorAll('[data-up]').forEach((t) => t.onclick = () => { if (t.classList.contains('off')) return; set('up', t.dataset.up); clearErr('up'); if (d.start && clash()) { d.start = ''; d.end = ''; } drawStep(); });
    el.querySelectorAll('[data-free]').forEach((c) => c.onclick = () => { const [s, e] = c.dataset.free.split('-').map(Number); setSlot(s, e); });
    el.querySelector('#fStart').onchange = (e) => { const s = e.target.value; if (!s) return; const len = d.start && d.end ? toMin(d.end) - toMin(d.start) : 120; setSlot(toMin(s), Math.min(DAY_END, toMin(s) + len)); };
    el.querySelector('#fEnd').onchange = (e) => { if (!e.target.value || !d.start) return; setSlot(toMin(d.start), toMin(e.target.value)); };
    // grid cells
    el.querySelectorAll('.slot-cell').forEach((c) => c.onclick = () => {
      const m = +c.dataset.m; const col = c.dataset.col;
      if (c.classList.contains('busy')) { UI.toast('This slot is already booked', { err: true, ms: 2200 }); return; }
      if (col === 'eq') {
        const eq = d.equipment.find((x) => x.kind === 'booked'); const len = S.equipment(eq.id).slot;
        if (d.start && (m < toMin(d.start) || m + len > toMin(d.end))) { UI.toast('Equipment must be used within your time slot', { err: true }); return; }
        eq.start = fromMin(m); eq.end = fromMin(m + len); d.dirty = true; drawStep(); drawSummary('eq'); return;
      }
      if (!anchorCell || anchorCell.col !== 'up' || m < anchorCell.m) { anchorCell = { col, m }; setSlot(m, m + 20, true); anchorCell = { col, m }; drawStep(); return; }
      const s = anchorCell.m; anchorCell = null; setSlot(s, m + 20);
    });
    // drag on mini timeline
    const tl = el.querySelector('#miniTl');
    if (tl) {
      let dragS = null;
      const at = (e) => { const r = tl.getBoundingClientRect(); const m = DAY_START + ((e.clientX - r.left) / r.width) * (DAY_END - DAY_START); return Math.max(DAY_START, Math.min(DAY_END, Math.round(m / 20) * 20)); };
      tl.onmousedown = (e) => { dragS = at(e); e.preventDefault(); };
      tl.onmousemove = (e) => {
        if (dragS == null) return; const m = at(e); const s = Math.min(dragS, m), en = Math.max(dragS, m);
        let g = tl.querySelector('.ghost'); if (!g) { g = document.createElement('div'); g.className = 'blk mine ghost'; tl.appendChild(g); }
        const p = (x) => ((x - DAY_START) / (DAY_END - DAY_START)) * 100; g.style.left = p(s) + '%'; g.style.width = (p(en) - p(s)) + '%'; g.textContent = `${fromMin(s)} – ${fromMin(en)}`;
      };
      const up = (e) => { if (dragS == null) return; const m = at(e); const s = Math.min(dragS, m), en = Math.max(dragS, m); dragS = null; if (en - s >= 20) setSlot(s, en); else UI.toast('Drag across the bar to pick a time range', { icon: 'swipe' }); };
      tl.onmouseup = up; tl.onmouseleave = (e) => { if (dragS != null) up(e); };
    }
    el.querySelectorAll('[data-eqb]').forEach((t) => t.onclick = () => {
      if (t.classList.contains('off')) return;
      const id = t.dataset.eqb; const i = d.equipment.findIndex((x) => x.id === id);
      if (i >= 0) d.equipment.splice(i, 1);
      else { const len = S.equipment(id).slot; const s = d.start ? toMin(d.start) : 560; d.equipment = d.equipment.filter((x) => x.kind !== 'booked'); d.equipment.push({ id, kind: 'booked', start: fromMin(s), end: fromMin(s + len), state: 'pending' }); if (d.equipment.filter((x) => x.kind === 'booked').length) UI.toast(`${esc(S.equipment(id).name)} added · pick its slot in the grid`, { icon: 'precision_manufacturing' }); }
      d.dirty = true; drawStep(); drawSummary('eq');
    });
    el.querySelectorAll('[data-eqo]').forEach((t) => t.onclick = () => {
      const id = t.dataset.eqo; const cur = d.equipment.find((x) => x.id === id);
      UI.modal({ title: esc(S.equipment(id).name), sub: 'How will you use it?', icon: 'construction', size: 'sm', body: `<div class="grid2"><div class="field"><label>Number of pulls / lifts *</label><div class="qty"><button data-q="-1">${ms('remove')}</button><input id="pulls" type="number" min="1" value="${cur ? cur.pulls : 1}"><button data-q="1">${ms('add')}</button></div></div><div class="field"><label>Max. load (t)</label><input class="input" id="ton" type="number" min="0" step=".5" value="${cur?.ton || ''}" placeholder="e.g. 2"></div></div><p class="cap" style="margin-top:10px">Used during your time slot ${d.start ? `(${d.start} – ${d.end})` : ''}.</p>`,
        onMount: (el2) => el2.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { const i = el2.querySelector('#pulls'); i.value = Math.max(1, (+i.value || 1) + +b.dataset.q); }),
        actions: [...(cur ? [{ label: 'Remove', text: true, danger: true, left: true, icon: 'delete', onClick: () => { d.equipment = d.equipment.filter((x) => x !== cur); drawStep(); drawSummary('eq'); } }] : []), { label: 'Cancel', text: true }, { label: cur ? 'Update' : 'Add', primary: true, onClick: (c, sc) => {
          const n = Math.max(1, +sc.querySelector('#pulls').value || 1);
          if (cur) { cur.pulls = n; cur.ton = sc.querySelector('#ton').value; } else d.equipment.push({ id, kind: 'onsite', pulls: n, ton: sc.querySelector('#ton').value, start: d.start, end: d.end });
          d.dirty = true; drawStep(); drawSummary('eq');
        } }] });
    });
    el.querySelector('[data-draft]')?.addEventListener('click', saveDraft);
  }

  // ---------- step 5: other info ----------
  function step5() {
    const pc = (role, id, label) => { const p = S.person(id); return `<div class="person-card grow"><span class="avatar">${UI.initials(p.name)}</span><div class="grow"><div class="overline">${label}</div><b style="font-weight:500">${esc(p.name)}${p.me ? ' (you)' : ''}</b><div class="cap">${esc(p.phone || '')}<br>${esc(p.email || '')}</div></div>${role === 'createdBy' ? '' : `<button class="icon-btn sm" data-pick="${role}" data-tip="Change">${ms('edit')}</button>`}</div>`; };
    const pplOpt = (v) => `<option value="">Select person</option>` + S.people().map((p) => `<option value="${p.id}" ${p.id === v ? 'selected' : ''}>${esc(p.name)} · ${esc(p.org)}</option>`).join('');
    const modes = [['Truck', 'local_shipping'], ['Train', 'tr-train'], ['Ship', 'tr-ship'], ['Air', 'tr-air']];
    return `
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Responsible persons</div><div class="card-sub">Who is in charge of this delivery on site?</div></div></div>
      <div class="row" style="gap:12px;align-items:stretch">${pc('createdBy', d.createdBy, 'Creator')}${pc('onsite', d.onsite, 'Onsite contact')}</div>
      <div class="grid2" style="margin-top:14px"><div class="field"><label>Order responsible</label><select class="select" id="fOrder">${pplOpt(d.orderResp)}</select></div><div class="field"><label>Delivery responsible</label><select class="select" id="fDeliv">${pplOpt(d.deliveryResp)}</select></div></div>
      <button class="btn text" id="addPerson" style="margin-top:10px">${ms('person_add')}Add person</button></div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Documents</div><div class="card-sub">Delivery notes, permits or plans · PDF, DOCX, PPTX up to 20 MB.</div></div></div>
      <div class="drop" id="cDrop">${ms('upload')}<div>Drag files here or <a class="link">browse</a></div></div>
      <div style="margin-top:10px">${d.docs.map((x, i) => `<div class="doc"><span class="dic">${ms('description')}</span><div class="grow"><b style="font-weight:500">${esc(x.name)}</b><div class="cap">${esc(x.type)} · ${esc(x.size)} · uploaded just now</div></div><button class="icon-btn sm" data-rmd="${i}" data-tip="Remove">${ms('delete')}</button></div>`).join('')}</div></div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Photos</div><div class="card-sub">Optional · helps the site team identify the load.</div></div></div>
      <div class="photos">${d.photos.map((p, i) => `<div class="photo" data-ph="${i}"><img src="${p}" alt=""><button class="rm" data-rmp="${i}">${ms('close', 's16')}</button></div>`).join('')}<div class="add-tile" id="cPhoto">${ms('add_a_photo')}Add photo</div></div></div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Sustainability</div><div class="card-sub">Place of origin of the delivery — used for the CO₂ report.</div></div></div>
      <div class="grid3"><div class="field" data-err="origin" style="grid-column:span 2"><label>Address *</label><input class="input" id="fOrigin" value="${esc(d.origin)}" placeholder="Street, ZIP, city">${errSlot()}</div><div class="field"><label>Kilometers</label><input class="input" id="fKm" type="number" min="0" value="${esc(d.km)}" placeholder="Calculated from the address"></div></div>
      <label class="check" style="margin-top:14px"><input type="checkbox" id="fMulti" ${d.multi ? 'checked' : ''}>Has multiple vehicles / transport modes</label>
      <div class="field ${d.multi ? '' : 'hidden'}" data-err="modes" style="margin-top:10px"><label>Transport modes</label><div class="chips">${modes.map(([m, ic]) => `<button class="chip ${d.modes.includes(m) ? 'on' : ''}" data-mode="${m}">${ic.includes('-') ? ci(ic, 16) : ms(ic, 's18')}${m}</button>`).join('')}</div>${errSlot()}</div></div>
    ${footer()}`;
  }
  function bind5(el) {
    el.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => personPicker(b.dataset.pick));
    el.querySelector('#fOrder').onchange = (e) => set('orderResp', e.target.value);
    el.querySelector('#fDeliv').onchange = (e) => set('deliveryResp', e.target.value);
    el.querySelector('#addPerson').onclick = () => addPerson();
    const drop = el.querySelector('#cDrop');
    const add = (files) => { files.forEach((f) => d.docs.push({ name: f.name, type: (f.name.split('.').pop() || '').toUpperCase(), size: UI.fileSize(f.size), by: 'p1', at: S.nowIso() })); if (files.length) { drawStep(); UI.toast(`${files.length} document${files.length > 1 ? 's' : ''} attached`); } };
    drop.onclick = async () => add(await UI.pickFiles('.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx'));
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); add([...e.dataTransfer.files]); };
    el.querySelectorAll('[data-rmd]').forEach((b) => b.onclick = () => { d.docs.splice(+b.dataset.rmd, 1); drawStep(); });
    el.querySelector('#cPhoto').onclick = async () => { const f = await UI.pickFiles('image/*'); f.forEach((x) => d.photos.push(URL.createObjectURL(x))); if (f.length) drawStep(); };
    el.querySelectorAll('[data-ph]').forEach((p) => p.onclick = (e) => { if (!e.target.closest('[data-rmp]')) UI.lightbox(d.photos, +p.dataset.ph); });
    el.querySelectorAll('[data-rmp]').forEach((b) => b.onclick = () => { d.photos.splice(+b.dataset.rmp, 1); drawStep(); });
    const o = el.querySelector('#fOrigin'); o.oninput = () => { d.origin = o.value; clearErr('origin'); };
    o.onchange = () => { if (o.value.trim() && !d.km) { d.km = 5 + (o.value.length * 7) % 60; el.querySelector('#fKm').value = d.km; UI.toast(`Distance calculated: ${d.km} km`, { icon: 'route' }); drawSummary(); } };
    el.querySelector('#fKm').oninput = (e) => { d.km = e.target.value; };
    el.querySelector('#fMulti').onchange = (e) => { d.multi = e.target.checked; if (!d.multi) d.modes = ['Truck']; drawStep(); };
    el.querySelectorAll('[data-mode]').forEach((c) => c.onclick = () => { const m = c.dataset.mode; d.modes = d.modes.includes(m) ? d.modes.filter((x) => x !== m) : d.modes.concat(m); c.classList.toggle('on'); clearErr('modes'); });
    el.querySelector('[data-draft]')?.addEventListener('click', saveDraft);
  }
  function personPicker(role) {
    let q = '';
    const list = () => S.people().filter((p) => !q || (p.name + p.org).toLowerCase().includes(q.toLowerCase()));
    UI.modal({ title: role === 'onsite' ? 'Onsite contact' : 'Select person', icon: 'person_search', body: `<div class="input-icon" style="margin-bottom:10px">${ms('search')}<input class="input" id="ppQ" placeholder="Search by name or organization"></div><div id="ppList" style="max-height:300px;overflow:auto"></div><button class="btn text" id="ppNew" style="margin-top:8px">${ms('person_add')}Add new person</button>`,
      onMount: (el, close) => {
        const draw = () => { el.querySelector('#ppList').innerHTML = list().map((p) => `<label class="check radio" style="display:flex;padding:8px 4px;border-bottom:1px solid #f0f0f0"><input type="radio" name="pp" value="${p.id}" ${d[role] === p.id ? 'checked' : ''}><span class="avatar sm">${UI.initials(p.name)}</span><span class="grow"><b style="font-weight:500">${esc(p.name)}</b><small>${esc(p.org)} · ${esc(p.phone)}</small></span></label>`).join('') || '<div class="cap">No person found</div>'; };
        draw(); el.querySelector('#ppQ').oninput = (e) => { q = e.target.value; draw(); };
        el.querySelector('#ppNew').onclick = () => { close(); addPerson(role); };
      },
      actions: [{ label: 'Cancel', text: true }, { label: 'Select', primary: true, onClick: (c, sc) => { const r = sc.querySelector('[name=pp]:checked'); if (!r) return false; set(role, r.value); drawStep(); } }] });
  }
  function addPerson(role) {
    UI.modal({ title: 'Add new person', icon: 'person_add', body: `<div class="grid2"><div class="field" style="grid-column:span 2"><label>Full name *</label><input class="input" id="npName"></div><div class="field"><label>Organization *</label><select class="select" id="npOrg">${ORGS.map((o) => `<option>${esc(o)}</option>`).join('')}</select></div><div class="field"><label>Phone</label><input class="input" id="npPhone" placeholder="+41 …"></div><div class="field" style="grid-column:span 2"><label>Email</label><input class="input" id="npMail" type="email" placeholder="name@company.com"></div></div>`,
      actions: [{ label: 'Cancel', text: true }, { label: 'Add person', primary: true, onClick: (c, sc) => {
        const n = sc.querySelector('#npName'); if (!n.value.trim()) { n.classList.add('invalid'); n.focus(); return false; }
        const p = { id: 'px' + Date.now(), name: n.value.trim(), org: sc.querySelector('#npOrg').value, phone: sc.querySelector('#npPhone').value, email: sc.querySelector('#npMail').value };
        (S.data.extraPeople = S.data.extraPeople || []).push(p); S.persist();
        if (role) set(role, p.id); drawStep(); UI.toast(`${esc(p.name)} added`);
      } }] });
  }

  // ---------- step 6: overview ----------
  function step6() {
    const wp = S.wp(d.wpId); const v = S.vehicle(d.vehicle);
    const sec = (t, n, body) => `<div class="card"><div class="card-head"><div class="grow"><div class="card-h">${t}</div></div><button class="btn text sm" data-goto="${n}">${ms('edit', 's16')}Change</button></div>${body}</div>`;
    const kv = (rows) => `<dl class="kv" style="grid-template-columns:170px 1fr">${rows.map(([k, val]) => `<dt>${k}</dt><dd class="${val ? '' : 'na'}">${val ? esc(val) : 'Not added'}</dd>`).join('')}</dl>`;
    return `
    <div class="banner info" style="margin-bottom:12px">${ms('fact_check')}<div><b>Review your shipment</b><p>Check everything before you ${d.mode === 'edit' ? 'save' : 'create it'}. ${d.mode === 'edit' ? '' : 'After creating, the site logistics team approves the time slot and booked equipment.'}</p></div></div>
    ${sec('Date &amp; working package', 1, kv([['Shipment name', d.name], ['Organization', d.sender], ['Date', d.date && `${D.dayName(d.date, true)}, ${D.fmt(d.date)}${d.express ? ' · Express' : ''}`], ['Working package', wp && `${wp.trade} · ${wp.title}`]]))}
    ${sec('Destination &amp; materials', 2, kv([['Recipient', d.recipient], ['Location', [d.building, d.floor, d.zone].filter(Boolean).join(' · ')], ['Materials', d.materials.map((m) => `${S.material(m.id).name} ${m.qty} ${m.unit}`).join(', ')], ['Comment', d.comment]]))}
    ${sec('Transport', 3, kv([['Vehicle', v && d.vehicle ? `${v.name} · ${d.vehicles} vehicle${d.vehicles > 1 ? 's' : ''}` : ''], ['Arrival gate', d.gate], ['License plate', d.plate], ['Driver phone', d.phone]]))}
    ${sec('Time slot &amp; equipment', 4, kv([['Unloading point', d.up], ['Time slot', d.start && `${d.start} – ${d.end}`], ...d.equipment.map((e) => [e.kind === 'booked' ? 'Special equipment' : 'Logistic equipment', `${S.equipment(e.id).name} · ${e.kind === 'booked' ? `${e.start} – ${e.end} (needs approval)` : `${e.pulls} pulls`}`])]))}
    ${sec('Other info', 5, kv([['Creator', S.person(d.createdBy).name], ['Onsite contact', S.person(d.onsite).name], ['Order responsible', d.orderResp && S.person(d.orderResp).name], ['Delivery responsible', d.deliveryResp && S.person(d.deliveryResp).name], ['Documents', d.docs.map((x) => x.name).join(', ')], ['Photos', d.photos.length ? `${d.photos.length} photo${d.photos.length > 1 ? 's' : ''}` : ''], ['Origin', d.origin && `${d.origin}${d.km ? ` · ${d.km} km` : ''}`], ['Transport modes', d.modes.join(', ')]]))}
    <div class="row" style="margin-top:16px"><a class="link cancel-link">Cancel</a><span class="sp"></span>${d.mode === 'new' ? `<button class="btn" data-draft>${ms('save')}Save draft</button>` : ''}<button class="btn primary" id="cCreate2">${ms('check')}${d.mode === 'edit' ? 'Save changes' : 'Create shipment'}</button></div>`;
  }
  function bind6(el) {
    el.querySelectorAll('[data-goto]').forEach((b) => b.onclick = () => go(+b.dataset.goto));
    el.querySelector('[data-draft]')?.addEventListener('click', saveDraft);
    el.querySelector('#cCreate2').onclick = () => (d.mode === 'edit' ? save() : create());
  }

  // ---------------------------------------------------------------- summary panel
  function drawSummary(changed) {
    const el = view && view.querySelector('#cSummary'); if (!el) return;
    const wp = d.wpId && S.wp(d.wpId);
    const booked = d.equipment.filter((e) => e.kind === 'booked'); const onsite = d.equipment.filter((e) => e.kind === 'onsite');
    const row = (k, v, key) => `<dt>${k}</dt><dd class="${v ? '' : 'na'} ${changed && key === changed ? 'flash' : ''}">${v ? esc(v) : 'Not added yet'}</dd>`;
    el.innerHTML = `<div class="rp-head"><h3>Summary</h3><div class="rp-name">${d.name ? esc(d.name) : '<span class="faint">Untitled shipment</span>'}</div>
        <div class="row" style="margin-top:8px"><span class="pill">${d.mode === 'edit' ? 'Editing' : 'Draft'}</span></div>
        <div class="cap" style="margin-top:8px">Step ${d.step} of 6 · ${STEPS[d.step - 1]}${d.step === 5 ? ' — almost done' : ''}</div>
        <div class="prog-steps">${STEPS.map((_, i) => `<i class="${i + 1 < d.step ? 'done' : i + 1 === d.step ? 'cur' : ''}"></i>`).join('')}</div></div>
      <div class="rp-body">
        <div class="rp-sec"><h4>Shipment information</h4><dl class="kv">
          ${row('Shipment no', d.mode === 'edit' ? S.shipment(d.editId).no : '', 'no').replace('Not added yet', 'Generated on create')}
          ${row('Shipment date', d.date && D.fmt(d.date) + (d.express ? ' · Express' : ''), 'date')}
          ${row('Working package', wp && `${wp.trade} · ${wp.title}`, 'wp')}
          ${row('Materials', d.materials.map((m) => `${S.material(m.id).name} ${m.qty} ${m.unit}`).join(', '), 'materials')}
          ${row('Vehicle', d.vehicle && `${S.vehicle(d.vehicle).name} · ${d.vehicles} vehicle${d.vehicles > 1 ? 's' : ''}`, 'vehicle')}
          ${row('Unloading point', d.up && `${d.up}${d.start ? ` · ${d.start} – ${d.end}` : ''}`, 'slot')}
        </dl></div>
        <div class="rp-sec"><h4>Equipment and usage</h4><dl class="kv">
          <div class="sub">Logistic equipment</div>
          ${onsite.length ? onsite.map((e) => row('Name', S.equipment(e.id).name, 'eq') + row('Usage', `${e.pulls} pull${e.pulls > 1 ? 's' : ''}`, 'eq') + row('Duration', e.start && `${e.start} – ${e.end}`, 'slot')).join('') : row('Name', '') + row('Usage', '') + row('Duration', '')}
          <div class="sub">Special equipment</div>
          ${booked.length ? booked.map((e) => row('Name', S.equipment(e.id).name, 'eq') + row('Duration', `${e.start} – ${e.end}`, 'eq') + row('Planned usage', `${S.equipment(e.id).slot} minutes`, 'eq') + row('Estimated cost', 'Free of charge', 'eq')).join('') : row('Name', '') + row('Duration', '') + row('Planned usage', '') + row('Estimated cost', '')}
        </dl></div>
      </div>`;
  }

  // ---------------------------------------------------------------- finish
  function buildShipment(base) {
    const wp = S.wp(d.wpId);
    return Object.assign(base, {
      name: d.name.trim(), wpId: d.wpId, date: d.date, start: d.start, end: d.end, sender: d.sender, recipient: d.recipient, building: d.building, floor: d.floor, zone: d.zone,
      up: d.up, vehicle: d.vehicle, vehicles: d.vehicles, materials: d.materials, equipment: d.equipment, onsite: d.onsite, orderResp: d.orderResp, deliveryResp: d.deliveryResp,
      gate: d.gate, plate: d.plate, phone: d.phone, origin: d.origin, km: +d.km || 0, modes: d.modes, docs: d.docs, photos: d.photos.filter((p) => !p.startsWith('blob:')).concat(d.photos.filter((p) => p.startsWith('blob:'))),
    }, wp ? {} : {});
  }
  function create() {
    if (!validateAll()) return;
    const no = S.nextShipmentNo(d.sender);
    const s = buildShipment({ id: 's' + Date.now(), no, status: 'Open', createdBy: 'p1', created: S.nowIso(), comments: [], annotations: [], activity: [] });
    if (d.comment.trim()) s.comments.push({ by: 'p1', at: S.nowIso(), text: d.comment.trim() });
    s.activity.push({ at: S.nowIso(), by: 'p1', text: 'created the shipment', icon: 'add_circle' });
    s.justCreated = true;
    try { localStorage.removeItem('clm-shipment-draft'); } catch (e) {}
    S.data.SHIPMENTS.push(s); S.prefs.expanded['wp:' + s.wpId] = true; S.savePrefs(); S.persist();
    d = null;
    UI.modal({ title: 'Shipment created', icon: 'check_circle', iconTone: 'ok', size: 'sm', sticky: true, noClose: true,
      body: `<p><b style="font-weight:500">${esc(s.name)}</b></p><p class="muted" style="margin-top:4px">${esc(s.no)} · ${D.dayName(s.date)}, ${D.fmt(s.date)} · ${s.start} – ${s.end} · ${s.up}</p><p class="muted" style="margin-top:12px">The shipment is <b>Open</b> and waiting for approval. You can approve it right away if you’re responsible for this site.</p>`,
      actions: [{ label: 'Open shipment', icon: 'open_in_new', onClick: () => UI.go('#/shipment/' + s.id) },
        { label: 'Approve', primary: true, icon: 'check', onClick: () => { s.status = 'Approved'; s.equipment.forEach((e) => { if (e.kind === 'booked') e.state = 'approved'; }); S.log(s, 'changed status to Approved', 'sync_alt'); S.persist(); UI.go('#/shipment/' + s.id); UI.toast('Shipment approved'); } }] });
  }
  function save() {
    if (!validateAll()) return;
    const s = S.shipment(d.editId);
    buildShipment(s); if (d.comment.trim()) s.comments.push({ by: 'p1', at: S.nowIso(), text: d.comment.trim() });
    S.log(s, 'edited the shipment', 'edit'); S.persist();
    const id = s.id; d = null; UI.go('#/shipment/' + id); UI.toast('Changes saved');
  }
  function saveDraft() {
    UI.toast('Draft saved · you can continue later from this browser', { icon: 'save' });
    try { localStorage.setItem('clm-shipment-draft', JSON.stringify(d)); } catch (e) {}
    d.dirty = false;
  }
  async function leave() {
    if (d && d.dirty && !(await UI.confirm({ title: 'Discard changes?', text: d.mode === 'edit' ? 'Your changes to this shipment will be lost.' : 'This shipment hasn’t been created yet. Everything you entered will be lost.', ok: 'Discard', danger: true }))) return;
    const back = d && d.mode === 'edit' ? '#/shipment/' + d.editId : d && d.wpLocked ? '#/group/wp/' + d.wpId : null;
    d = null; if (back) UI.go(back); else goBack();
  }

  window.CREATE = { start, render };
})();
