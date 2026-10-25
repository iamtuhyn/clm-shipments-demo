/* Shipment details page — tabs + full-height details panel */
(function () {
  const { D, SHIPMENT_STATUS, STATUS_FLOW } = CLM;
  const { esc, ms, ci, isDark } = UI;
  const TABS = [['overview', 'Overview'], ['documents', 'Documents & photos'], ['annotations', 'Annotations'], ['activity', 'Activity']];
  let view, s;

  function render(v, id, tab) {
    view = v; s = S.shipment(id);
    if (!s) { v.innerHTML = `<div class="page"><div class="na-page"><div>${ms('search_off')}<h2>Shipment not found</h2><a class="btn" href="#/shipments">Back to Shipments</a></div></div></div>`; return; }
    tab = TABS.some((t) => t[0] === tab) ? tab : 'overview';
    const wp = S.wp(s.wpId); const cr = S.person(s.createdBy);
    const counts = { documents: s.docs.length + s.photos.length, annotations: s.annotations.length, activity: s.activity.length };
    v.innerHTML = `
    <div class="page">
      <div class="sticky-head lined">
        <div class="page-head" style="padding-bottom:6px">
          <button class="back" id="dBack" data-tip="Back">${ms('arrow_back')}</button>
          <div class="grow">
            <div class="row" style="gap:10px"><h1 class="ell">${esc(s.name)}</h1>${UI.shipPill(s.status)}</div>
            <div class="meta"><span>${ms('tag')}${esc(s.no)}</span><span>${ms('person')}Created ${UI.dt(s.created)} by ${esc(cr.name)}</span><span>${ms('location_on')}${esc(s.building)} · ${esc(s.floor)} · ${esc(s.zone)}</span><span>${ms('folder')}<a href="#/group/wp/${wp.id}">${esc(wp.title)}</a></span></div>
          </div>
          <button class="btn text" id="dPrint">${ms('print')}Print</button>
          <button class="btn" id="dEdit" ${['Completed', 'Canceled'].includes(s.status) ? 'disabled data-tip="Completed or canceled shipments can’t be edited"' : ''}>${ms('edit')}Edit shipment</button>
        </div>
        <div class="tabs" role="tablist" style="border-bottom:0">${TABS.map(([k, l]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#/shipment/${s.id}/${k}" role="tab" aria-selected="${tab === k}">${l}${k !== 'overview' ? ` <span class="count">${counts[k]}</span>` : ''}</a>`).join('')}</div>
      </div>
      <div class="split-layout" style="--rp-top:140px;margin-top:16px">
        <div id="dTab">${tabHtml(tab)}</div>
        <aside class="rpanel" id="dPanel">${panelHtml()}</aside>
      </div>
    </div>`;
    bind(tab);
  }

  // ---------------------------------------------------------------- tabs
  function tabHtml(tab) {
    if (tab === 'documents') return docsHtml();
    if (tab === 'annotations') return annotationsHtml();
    if (tab === 'activity') return activityHtml();
    return overviewHtml();
  }

  function weatherFor(date) {
    const seed = +date.slice(8) + +date.slice(5, 7);
    return Array.from({ length: 12 }, (_, i) => {
      const h = 7 + i; const k = (seed + i * 3) % 10;
      const ic = k < 4 ? ['sunny', 'sun'] : k < 7 ? ['partly_cloudy_day', 'sun'] : k < 9 ? ['cloud', 'cloud'] : ['rainy', 'rain'];
      return { h, ic, t: 12 + Math.round(4 * Math.sin((i / 11) * Math.PI)) + (seed % 3) };
    });
  }

  function overviewHtml() {
    const v = S.vehicle(s.vehicle); const w = weatherFor(s.date);
    const sh = +s.start.slice(0, 2), eh = +s.end.slice(0, 2) + (+s.end.slice(3) ? 1 : 0);
    const rainAt = w.find((x) => x.ic[1] === 'rain');
    return `
    ${s.justCreated ? `<div class="banner ok" style="margin-bottom:12px" id="dCreated">${ms('check_circle')}<div class="grow"><b>Shipment created</b><p>${s.status === 'Open' ? 'It is waiting for approval by the site logistics team. You’ll be notified when it’s approved.' : 'It is approved and visible to the site team.'}</p></div><button class="icon-btn sm x" data-dismiss>${ms('close')}</button></div>` : ''}
    ${s.status === 'Canceled' || s.status === 'Rejected' ? `<div class="banner err" style="margin-bottom:12px">${ms('block')}<div><b>${s.status === 'Canceled' ? 'Shipment canceled' : 'Shipment rejected'}</b><p>${esc(s.reason || 'No reason given.')}</p></div></div>` : ''}
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Booking</div></div></div>
      <div class="tiles">
        <div class="tile">${ms('event')}<div style="min-width:0"><div class="overline">Date</div><b>${D.dayName(s.date)}, ${D.fmt(s.date)}</b></div></div>
        <div class="tile">${ms('schedule')}<div style="min-width:0"><div class="overline">Time slot</div><b>${s.start} – ${s.end}</b></div></div>
        <div class="tile">${ms('location_on')}<div style="min-width:0"><div class="overline">Unloading point</div><b>${s.up} · ${esc(s.zone)}</b></div></div>
        <div class="tile">${ci(v.icon, 34, 'height:20px')}<div style="min-width:0"><div class="overline">Vehicle</div><b data-tip="${esc(v.name)}">${esc(v.name)} · ${s.vehicles || 1}</b></div></div>
      </div></div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Weather</div></div><span class="cap">${D.dayName(s.date)}, ${D.fmt(s.date)} · ${esc(s.building)}</span></div>
      <div class="weather-row">${w.map((x) => `<div class="wh ${x.h >= sh && x.h < eh ? 'in' : ''}" data-tip="${String(x.h).padStart(2, '0')}:00 · ${x.t}°"><span class="cap">${String(x.h).padStart(2, '0')}:00</span>${ms(x.ic[0], x.ic[1])}<span>${x.t}°</span></div>`).join('')}</div>
      <div class="cap row" style="margin-top:8px;gap:6px">${ms('info', 's16')}Highlighted hours are your time slot${rainAt ? ` · rain expected from ${String(rainAt.h).padStart(2, '0')}:00` : ' · no rain expected'}.</div></div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Materials (${s.materials.length})</div></div></div>
      <div class="tbl-wrap"><table class="table"><thead><tr><th>Material</th><th>Quantity</th><th>Packaging</th><th>Note</th></tr></thead><tbody>
      ${s.materials.map((m) => { const mm = S.material(m.id); return `<tr><td class="tline1">${esc(mm.name)}</td><td>${m.qty} ${esc(m.unit || mm.unit)}</td><td>${esc(mm.pack || '—')}</td><td class="muted">${esc(m.note || '—')}</td></tr>`; }).join('')}
      </tbody></table></div></div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Equipment (${s.equipment.length})</div></div></div>
      ${s.equipment.length ? s.equipment.map((e) => { const q = S.equipment(e.id); const pill = e.kind === 'onsite' ? '<span class="pill success">Available</span>' : e.state === 'approved' ? '<span class="pill success">Approved</span>' : e.state === 'rejected' ? '<span class="pill error">Rejected</span>' : '<span class="pill warning">Pending approval</span>';
        return `<div class="eq-row">${ci(q.icon, 32)}<div class="grow"><div class="overline">${e.kind === 'onsite' ? 'On site (non-bookable)' : 'Booked'}</div><b style="font-weight:500">${esc(q.name)}</b><div class="cap">${e.kind === 'onsite' ? `${e.pulls || 1} pulls · ${e.start} – ${e.end}` : `${e.start} – ${e.end} · ${q.slot || 20} minutes · free of charge`}</div></div>${pill}</div>`; }).join('') : `<div class="cap">No equipment booked for this shipment.</div>`}
    </div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Transport &amp; sustainability</div></div></div>
      <dl class="kv" style="grid-template-columns:150px 1fr 150px 1fr">
        <dt>Arrival gate</dt><dd>${esc(s.gate)}</dd><dt>License plate</dt><dd>${esc(s.plate || '—')}</dd>
        <dt>Driver phone</dt><dd>${esc(s.phone || '—')}</dd><dt>Transport modes</dt><dd>${esc((s.modes || ['Truck']).join(', '))}</dd>
        <dt>Origin</dt><dd>${esc(s.origin)}</dd><dt>Distance</dt><dd>${s.km} km · ≈ ${(s.km * 0.9).toFixed(1)} kg CO₂</dd>
      </dl></div>
    <div class="card" id="dComments"><div class="card-head"><div class="grow"><div class="card-h">Comments (${s.comments.length})</div></div></div>
      ${s.comments.map((c) => { const p = S.person(c.by); return `<div class="cmt"><span class="avatar sm">${UI.initials(p.name)}</span><div class="grow"><div class="cap">${esc(p.name)} · ${UI.dt(c.at)}</div><div>${esc(c.text)}</div></div></div>`; }).join('') || '<div class="cap">No comments yet.</div>'}
      <div class="field" style="margin-top:12px"><label>Add a comment</label><textarea class="input" id="cText" maxlength="250" placeholder="Write here"></textarea>
        <div class="row"><span class="counter grow" id="cCount">0/250</span><button class="btn primary" id="cPost" disabled>${ms('send')}Post</button></div></div>
    </div>`;
  }

  function docsHtml() {
    return `<div class="card"><div class="card-head"><div class="grow"><div class="card-h">Documents (${s.docs.length})</div><div class="card-sub">Delivery notes, permits or plans · PDF, DOCX, PPTX, XLSX up to 20 MB</div></div></div>
      <div class="drop" id="docDrop">${ms('upload')}<div>Drag files here or <a class="link">browse</a></div></div>
      <div style="margin-top:12px">${s.docs.map((d, i) => `<div class="doc"><span class="dic">${ms('description')}</span><div class="grow"><b style="font-weight:500">${esc(d.name)}</b><div class="cap">${esc(d.type)} · ${esc(d.size)} · ${esc(S.person(d.by).name)}, ${UI.dt(d.at)}</div></div><button class="icon-btn sm" data-dl="${i}" data-tip="Download">${ms('download')}</button><button class="icon-btn sm" data-rmdoc="${i}" data-tip="Delete">${ms('delete')}</button></div>`).join('') || '<div class="cap">No documents uploaded yet.</div>'}</div></div>
    <div class="card"><div class="card-head"><div class="grow"><div class="card-h">Photos (${s.photos.length})</div><div class="card-sub">Helps the site team identify the load</div></div></div>
      <div class="photos">${s.photos.map((p, i) => `<div class="photo" data-ph="${i}"><img src="${p}" alt=""><button class="rm" data-rmph="${i}" data-tip="Remove">${ms('close', 's16')}</button></div>`).join('')}<div class="add-tile" id="addPhoto">${ms('add_a_photo')}Add photo</div></div></div>`;
  }

  function annotationsHtml() {
    const tones = { Note: ['sticky_note_2', 'neutral'], Damage: ['report', 'error'], Delay: ['schedule', 'warning'] };
    return `<div class="card"><div class="card-head"><div class="grow"><div class="card-h">Annotations (${s.annotations.length})</div><div class="card-sub">Notes from the site team about this delivery — damage, delays or anything worth remembering.</div></div><button class="btn primary" id="annAdd">${ms('add')}Add annotation</button></div>
      ${s.annotations.length ? s.annotations.map((a, i) => `<div class="doc" style="align-items:flex-start"><span class="dic" style="background:var(--${tones[a.type][1] === 'error' ? 'err-bg' : tones[a.type][1] === 'warning' ? 'warn-bg' : 'subtle'});color:var(--${tones[a.type][1] === 'error' ? 'err' : tones[a.type][1] === 'warning' ? 'warn' : 'icon'})">${ms(tones[a.type][0])}</span><div class="grow"><div class="row"><b style="font-weight:500">${esc(a.title)}</b><span class="pill ${tones[a.type][1]}">${a.type}</span></div><div style="margin-top:4px">${esc(a.text)}</div><div class="cap" style="margin-top:4px">${esc(S.person(a.by).name)} · ${UI.dt(a.at)}</div></div><button class="icon-btn sm" data-rmann="${i}" data-tip="Delete">${ms('delete')}</button></div>`).join('')
        : `<div class="empty">${ms('edit_note')}<b style="color:var(--t1)">No annotations yet</b><span>Add the first one, e.g. “Pallet 3 damaged on arrival”.</span></div>`}</div>`;
  }

  function activityHtml() {
    const list = s.activity.slice().sort((a, b) => b.at.localeCompare(a.at));
    return `<div class="card"><div class="card-head"><div class="grow"><div class="card-h">Activity</div><div class="card-sub">Everything that happened to this shipment, newest first</div></div></div>
      <div class="timeline-act">${list.map((a) => `<div class="act"><span class="ai">${ms(a.icon || 'edit')}</span><div><b style="font-weight:500">${esc(S.person(a.by).name)}</b> ${esc(a.text)}</div><div class="cap">${UI.dt(a.at)}</div></div>`).join('')}</div></div>`;
  }

  // ---------------------------------------------------------------- right panel
  function panelHtml() {
    const st = SHIPMENT_STATUS[s.status]; const wp = S.wp(s.wpId); const v = S.vehicle(s.vehicle);
    const booked = s.equipment.filter((e) => e.kind === 'booked'); const onsite = s.equipment.filter((e) => e.kind === 'onsite');
    const p = (id) => (id ? S.person(id).name : null);
    const row = (k, val) => `<dt>${k}</dt><dd class="${val ? '' : 'na'}">${val ? esc(val) : 'Not added'}</dd>`;
    return `<div class="rp-head"><h3>Details</h3><div class="rp-name">${esc(s.name)}</div>
        <div class="status-btn ${isDark(st.color) ? 'dark-t' : ''}" style="background:${st.color}">
          <div class="sb-main">${ci(st.icon, 18)}${esc(s.status)}</div>
          <button class="sb-dd" id="dStatus" data-tip="Change status" ${!STATUS_FLOW[s.status].length ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>${ms('expand_more')}</button>
        </div></div>
      <div class="rp-body">
        <div class="rp-sec"><h4>Shipment information</h4><dl class="kv">
          ${row('Shipment no', s.no)}${row('Shipment date', D.fmt(s.date))}<dt>Working package</dt><dd><a href="#/group/wp/${wp.id}">${esc(wp.trade)} · ${esc(wp.title)}</a></dd>
          ${row('Vehicle', `${v.name} · ${s.vehicles || 1} vehicle${(s.vehicles || 1) > 1 ? 's' : ''}`)}${row('Unloading point', `${s.up} · ${s.start} – ${s.end}`)}
          ${row('Sender', s.sender)}${row('Recipient', s.recipient)}</dl></div>
        <div class="rp-sec"><h4>Equipment and usage</h4><dl class="kv">
          <div class="sub">Logistic equipment</div>
          ${onsite.length ? onsite.map((e) => row('Name', S.equipment(e.id).name) + row('Usage', `${e.pulls || 1} pull${(e.pulls || 1) > 1 ? 's' : ''}`) + row('Duration', `${e.start} – ${e.end}`)).join('') : row('Name', null)}
          <div class="sub">Special equipment</div>
          ${booked.length ? booked.map((e) => row('Name', S.equipment(e.id).name) + row('Duration', `${e.start} – ${e.end}`) + row('Planned usage', `${S.equipment(e.id).slot || 20} minutes`) + row('Estimated cost', 'Free of charge')).join('') : row('Name', null)}
        </dl></div>
        <div class="rp-sec"><h4>Responsible persons</h4><dl class="kv">${row('Created by', p(s.createdBy))}${row('Onsite contact', p(s.onsite))}${row('Order', p(s.orderResp))}${row('Delivery', p(s.deliveryResp))}</dl></div>
      </div>
      <div class="rp-foot"><button class="btn primary" id="dManage" style="width:100%">Manage${ms('expand_more')}</button></div>`;
  }

  // ---------------------------------------------------------------- events
  function rerender(tab) { const sc = view.scrollTop; render(view, s.id, tab || currentTab()); view.scrollTop = sc; }
  function currentTab() { return (location.hash.split('/')[3]) || 'overview'; }

  function bind(tab) {
    view.querySelector('#dBack').onclick = () => goBack();
    view.querySelector('#dPrint').onclick = () => { UI.toast('Opening print preview…', { icon: 'print' }); setTimeout(() => window.print(), 300); };
    view.querySelector('#dEdit').onclick = () => CREATE.start({ edit: s.id });
    view.querySelector('#dStatus').onclick = (e) => statusMenu(e.currentTarget);
    view.querySelector('#dManage').onclick = (e) => UI.menu(e.currentTarget, [
      { label: 'Edit shipment', icon: 'edit', disabled: ['Completed', 'Canceled'].includes(s.status), onClick: () => CREATE.start({ edit: s.id }) },
      { label: 'Duplicate shipment', icon: 'content_copy', onClick: () => CREATE.start({ duplicate: s.id }) },
      { label: 'Save as template', icon: 'bookmark_add', onClick: () => saveTemplate() },
      { label: 'Print', icon: 'print', onClick: () => window.print() },
      { sep: true },
      { label: 'Cancel shipment', icon: 'block', danger: true, disabled: ['Completed', 'Canceled'].includes(s.status), onClick: () => cancel(s, () => rerender()) },
    ], { align: 'right', minWidth: 260 });
    view.querySelector('[data-dismiss]')?.addEventListener('click', () => { delete s.justCreated; S.persist(); view.querySelector('#dCreated').remove(); });

    if (tab === 'overview') {
      const t = view.querySelector('#cText'), b = view.querySelector('#cPost'), c = view.querySelector('#cCount');
      t.oninput = () => { c.textContent = t.value.length + '/250'; b.disabled = !t.value.trim(); };
      t.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && t.value.trim()) b.click(); };
      b.onclick = () => { s.comments.push({ by: 'p1', at: S.nowIso(), text: t.value.trim() }); S.log(s, 'added a comment', 'chat'); S.persist(); rerender(); UI.toast('Comment posted'); setTimeout(() => view.querySelector('#dComments')?.scrollIntoView({ block: 'center' }), 50); };
    }
    if (tab === 'documents') {
      const drop = view.querySelector('#docDrop');
      const addDocs = (files) => { if (!files.length) return; files.forEach((f) => s.docs.push({ name: f.name, type: (f.name.split('.').pop() || 'FILE').toUpperCase(), size: UI.fileSize(f.size), by: 'p1', at: S.nowIso() })); S.log(s, `uploaded ${files.length} document${files.length > 1 ? 's' : ''}`, 'upload_file'); S.persist(); rerender(); UI.toast(`${files.length} document${files.length > 1 ? 's' : ''} added`); };
      drop.onclick = async () => addDocs(await UI.pickFiles('.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx'));
      drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); addDocs([...e.dataTransfer.files]); };
      view.querySelectorAll('[data-dl]').forEach((x) => x.onclick = () => UI.toast(`Downloading “${esc(s.docs[+x.dataset.dl].name)}” is simulated in this demo.`, { icon: 'download' }));
      view.querySelectorAll('[data-rmdoc]').forEach((x) => x.onclick = async () => {
        const d = s.docs[+x.dataset.rmdoc];
        if (await UI.confirm({ title: 'Delete document?', text: `“${esc(d.name)}” will be removed from this shipment.`, ok: 'Delete', danger: true })) { s.docs.splice(+x.dataset.rmdoc, 1); S.log(s, `deleted ${d.name}`, 'delete'); S.persist(); rerender(); UI.toast('Document deleted', { action: 'Undo', onAction: () => { s.docs.push(d); S.persist(); rerender(); } }); }
      });
      view.querySelectorAll('[data-ph]').forEach((x) => x.onclick = (e) => { if (e.target.closest('[data-rmph]')) return; UI.lightbox(s.photos, +x.dataset.ph); });
      view.querySelectorAll('[data-rmph]').forEach((x) => x.onclick = () => { const i = +x.dataset.rmph; const p = s.photos[i]; s.photos.splice(i, 1); S.persist(); rerender(); UI.toast('Photo removed', { action: 'Undo', onAction: () => { s.photos.splice(i, 0, p); S.persist(); rerender(); } }); });
      view.querySelector('#addPhoto').onclick = async () => {
        const files = await UI.pickFiles('image/*'); if (!files.length) return;
        files.forEach((f) => s.photos.push(URL.createObjectURL(f))); S.log(s, `added ${files.length} photo${files.length > 1 ? 's' : ''}`, 'add_a_photo'); rerender(); UI.toast('Photo added (kept for this session)');
      };
    }
    if (tab === 'annotations') {
      view.querySelector('#annAdd').onclick = () => addAnnotation();
      view.querySelectorAll('[data-rmann]').forEach((x) => x.onclick = async () => {
        if (await UI.confirm({ title: 'Delete annotation?', text: 'This annotation will be removed.', ok: 'Delete', danger: true })) { s.annotations.splice(+x.dataset.rmann, 1); S.persist(); rerender(); }
      });
    }
  }

  function addAnnotation() {
    UI.modal({ title: 'Add annotation', icon: 'edit_note', body: `
      <div class="col" style="gap:14px">
        <div class="field"><label>Type</label><div class="chips" id="annType">${['Note', 'Damage', 'Delay'].map((t, i) => `<button class="chip ${i ? '' : 'on'}" data-t="${t}">${t}</button>`).join('')}</div></div>
        <div class="field"><label>Title *</label><input class="input" id="annTitle" placeholder="e.g. Pallet 3 damaged on arrival"><span class="error-msg">Please add a title</span></div>
        <div class="field"><label>Description</label><textarea class="input" id="annText" maxlength="500" placeholder="What happened?"></textarea></div>
      </div>`,
      onMount: (el) => el.querySelectorAll('#annType .chip').forEach((c) => c.onclick = () => { el.querySelectorAll('#annType .chip').forEach((x) => x.classList.toggle('on', x === c)); }),
      actions: [{ label: 'Cancel', text: true }, { label: 'Add annotation', primary: true, onClick: (close, sc) => {
        const ti = sc.querySelector('#annTitle'); if (!ti.value.trim()) { ti.closest('.field').classList.add('has-error'); ti.focus(); return false; }
        s.annotations.push({ type: sc.querySelector('#annType .on').dataset.t, title: ti.value.trim(), text: sc.querySelector('#annText').value.trim(), by: 'p1', at: S.nowIso() });
        S.log(s, 'added an annotation', 'edit_note'); S.persist(); rerender(); UI.toast('Annotation added');
      } }] });
  }

  function saveTemplate() {
    UI.modal({ title: 'Save as template', icon: 'bookmark_add', size: 'sm', body: `<div class="field"><label>Template name *</label><input class="input" id="tplName" value="${esc(S.material(s.materials[0].id).name)} delivery"></div><p class="cap" style="margin-top:8px">Vehicle, materials and equipment are saved. Date and time slot are chosen when you use it.</p>`,
      actions: [{ label: 'Cancel', text: true }, { label: 'Save template', primary: true, onClick: (c, sc) => {
        const n = sc.querySelector('#tplName').value.trim(); if (!n) return false;
        (S.data.templates = S.data.templates || []).push({ id: 'ut' + Date.now(), name: n, desc: `${S.vehicle(s.vehicle).name} · ${S.material(s.materials[0].id).name}`, vehicle: s.vehicle, materials: s.materials, equipment: s.equipment, used: 0 });
        S.persist(); UI.toast(`Template “${esc(n)}” saved`);
      } }] });
  }

  function statusMenu(anchor) {
    const next = STATUS_FLOW[s.status];
    const label = { Approved: 'Approve', Rejected: 'Reject', Open: 'Reopen', Waiting: 'Mark as waiting', 'In Transit': 'Mark as in transit', Arrived: 'Mark as arrived', Unloading: 'Start unloading', Completed: 'Mark as completed' };
    UI.menu(anchor, [{ header: 'Change status to' }].concat(next.map((n) => ({
      label: label[n] || n, ci: `<span style="color:${SHIPMENT_STATUS[n].color}">${ci(SHIPMENT_STATUS[n].icon, 18)}</span>`, danger: n === 'Rejected',
      onClick: () => setStatus(n),
    }))), { align: 'right', minWidth: 230 });
  }

  function setStatus(n) {
    const prev = s.status;
    const apply = (reason) => {
      s.status = n; if (reason) s.reason = reason;
      if (n === 'Approved') s.equipment.forEach((e) => { if (e.kind === 'booked') e.state = 'approved'; });
      if (n === 'Rejected') s.equipment.forEach((e) => { if (e.kind === 'booked') e.state = 'rejected'; });
      S.log(s, `changed status to ${n}`, n === 'Rejected' ? 'block' : 'sync_alt'); S.persist(); rerender();
      UI.toast(`Status changed to <b>${n}</b>`, { action: 'Undo', onAction: () => { s.status = prev; S.log(s, `changed status back to ${prev}`, 'undo'); S.persist(); rerender(); } });
    };
    if (n === 'Rejected') {
      UI.modal({ title: 'Reject shipment?', icon: 'block', iconTone: 'warn', body: `<p class="muted" style="margin-bottom:12px">The sender is notified and the time slot is released.</p><div class="field"><label>Reason *</label><textarea class="input" id="rjReason" placeholder="e.g. Unloading point closed on this day"></textarea><span class="error-msg">Please give a reason</span></div>`,
        actions: [{ label: 'Cancel', text: true }, { label: 'Reject', primary: true, danger: true, onClick: (c, sc) => { const r = sc.querySelector('#rjReason'); if (!r.value.trim()) { r.closest('.field').classList.add('has-error'); return false; } apply(r.value.trim()); } }] });
    } else if (n === 'Approved' && s.equipment.some((e) => e.kind === 'booked' && e.state !== 'approved')) {
      UI.modal({ title: 'Approve shipment?', icon: 'check_circle', body: `<p class="muted">The booked special equipment is approved too:</p><ul style="margin:8px 0 0;padding-left:20px">${s.equipment.filter((e) => e.kind === 'booked').map((e) => `<li>${esc(S.equipment(e.id).name)} · ${e.start} – ${e.end}</li>`).join('')}</ul>`,
        actions: [{ label: 'Cancel', text: true }, { label: 'Approve', primary: true, onClick: () => apply() }] });
    } else apply();
  }

  function cancel(sh, after) {
    UI.modal({ title: 'Cancel shipment?', icon: 'warning', iconTone: 'warn', sub: esc(sh.name), body: `
      <div class="col" style="gap:14px"><p class="muted">The time slot and booked equipment are released. The shipment stays in the list as canceled.</p>
      <div class="field"><label>Reason *</label><select class="select" id="cxReason"><option value="">Select a reason</option><option>Delivery postponed</option><option>Material not available</option><option>Booked twice</option><option>Other</option></select><span class="error-msg">Please select a reason</span></div>
      <div class="field"><label>Comment</label><textarea class="input" id="cxText" placeholder="Optional"></textarea></div></div>`,
      actions: [{ label: 'Keep shipment', text: true }, { label: 'Cancel shipment', primary: true, danger: true, onClick: (c, sc) => {
        const r = sc.querySelector('#cxReason'); if (!r.value) { r.closest('.field').classList.add('has-error'); return false; }
        const prev = sh.status; sh.status = 'Canceled'; sh.reason = r.value + (sc.querySelector('#cxText').value ? ' — ' + sc.querySelector('#cxText').value : '');
        S.log(sh, 'canceled the shipment', 'block'); S.persist(); after && after();
        UI.toast('Shipment canceled', { action: 'Undo', onAction: () => { sh.status = prev; S.persist(); after && after(); } });
      } }] });
  }

  window.DETAILS = { render, cancel };
})();
