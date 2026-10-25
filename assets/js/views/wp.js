/* Create / edit working package — one compact card, no scrolling */
(function () {
  const { D, TRADES, ORGS, BUILDINGS, FLOORS, ZONES, TRANSPORT_UNITS } = CLM;
  const { esc, ms } = UI;
  const opt = (list, v, ph) => `<option value="">${ph || 'Select'}</option>` + list.map((x) => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');

  function open(wp) {
    const edit = !!wp; const w = wp || { sender: 'Team pRED', from: D.add(D.today, 1) };
    const body = `
    <form id="wpForm" class="col" style="gap:4px" novalidate>
      <div class="section-label" style="margin-top:0">General</div>
      <div class="grid3">
        <div class="field" style="grid-column:span 2"><label>Title *</label><input class="input" name="title" value="${esc(w.title || '')}" placeholder="e.g. Kanäle U46 Montage" maxlength="80"><span class="error-msg">Title is required</span></div>
        <div class="field"><label>Trade</label><select class="select" name="trade">${opt(Object.keys(TRADES), w.trade, 'Select trade')}</select></div>
        <div class="field"><label>Sender *</label><select class="select" name="sender">${opt(ORGS, w.sender)}</select><span class="error-msg">Sender is required</span></div>
        <div class="field"><label>Recipient *</label><select class="select" name="recipient">${opt(ORGS, w.recipient)}</select><span class="error-msg">Recipient is required</span></div>
        <div class="field"><label>Volume</label><input class="input" name="volume" value="${esc(w.volume && w.volume !== '—' ? w.volume : '')}" placeholder="e.g. 420 m³"></div>
      </div>
      <div class="section-label">Destination</div>
      <div class="grid3">
        <div class="field"><label>Building *</label><select class="select" name="building">${opt(BUILDINGS, w.building)}</select><span class="error-msg">Building is required</span></div>
        <div class="field"><label>Floor *</label><select class="select" name="floor">${opt(FLOORS, w.floor)}</select><span class="error-msg">Floor is required</span></div>
        <div class="field"><label>Zone</label><select class="select" name="zone">${opt(ZONES, w.zone, 'Select zone')}</select></div>
      </div>
      <div class="section-label">Booking window</div>
      <div class="grid3">
        <div class="field"><label>Date from *</label><input class="input" type="date" name="from" value="${w.from || ''}" min="2026-01-01" max="2027-12-31"><span class="error-msg">Start date is required</span></div>
        <div class="field"><label>Date to *</label><input class="input" type="date" name="to" value="${w.to || ''}" min="2026-01-01" max="2027-12-31"><span class="error-msg" data-to>End date is required</span></div>
        <div class="field"><label>Estimated transport units</label><div class="row" style="gap:6px"><input class="input" name="unitsQty" type="number" min="0" value="${w.unitsQty || ''}" placeholder="Qty" style="width:72px"><select class="select" name="units">${opt(TRANSPORT_UNITS, w.units, 'Unit')}</select></div></div>
      </div>
    </form>`;
    const m = UI.modal({
      title: edit ? 'Edit working package' : 'Create working package', sub: edit ? esc(wp.title) : 'Group shipments that belong to the same delivery scope.', size: 'wide', sticky: true, body,
      actions: [
        ...(edit ? [] : [{ label: 'Upload Excel instead', text: true, left: true, icon: 'upload_file', onClick: () => { UI.go('#/upload'); } }]),
        { label: 'Cancel', text: true },
        { label: edit ? 'Save changes' : 'Create working package', primary: true, onClick: (close, sc) => submit(sc, wp) },
      ],
      onMount: (el) => {
        el.querySelectorAll('input, select').forEach((i) => i.addEventListener('input', () => i.closest('.field').classList.remove('has-error')));
        el.querySelector('[name=from]').addEventListener('change', (e) => { const to = el.querySelector('[name=to]'); to.min = e.target.value; });
      },
    });
    return m;
  }

  function submit(sc, wp) {
    const f = sc.querySelector('#wpForm'); const v = Object.fromEntries(new FormData(f).entries());
    let ok = true; const bad = (n, msg) => { const fld = f.querySelector(`[name=${n}]`).closest('.field'); fld.classList.add('has-error'); if (msg) fld.querySelector('.error-msg').textContent = msg; if (ok) f.querySelector(`[name=${n}]`).focus(); ok = false; };
    ['title', 'sender', 'recipient', 'building', 'floor', 'from', 'to'].forEach((n) => { if (!String(v[n] || '').trim()) bad(n); });
    if (v.from && v.to && v.to < v.from) bad('to', '“Date to” must be after “Date from”');
    if (!ok) return false;
    const data = { title: v.title.trim(), trade: v.trade || 'Baumeister', sender: v.sender, recipient: v.recipient, building: v.building, floor: v.floor, zone: v.zone || '', from: v.from, to: v.to, volume: v.volume || '—', units: v.units || '', unitsQty: +v.unitsQty || 0 };
    if (wp) {
      Object.assign(wp, data); S.persist(); UI.toast('Working package saved');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      const nw = Object.assign({ id: 'wp' + Date.now() }, data);
      S.data.WPS.push(nw); S.persist();
      UI.go('#/group/wp/' + nw.id);
      UI.toast(`Working package <b>${esc(nw.title)}</b> created`, { action: 'Add shipment', onAction: () => CREATE.start({ wpId: nw.id }), ms: 7000 });
    }
  }

  window.WPFORM = { open };
})();
