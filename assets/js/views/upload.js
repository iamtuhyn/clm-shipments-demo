/* Upload working packages from Excel — select → check → fix → import → done, plus history */
(function () {
  const { D, TRADES, ORGS, BUILDINGS, FLOORS } = CLM;
  const { esc, ms } = UI;
  const COLS = [['title', 'Title'], ['trade', 'Trade'], ['sender', 'Sender'], ['recipient', 'Recipient'], ['building', 'Building'], ['floor', 'Floor'], ['zone', 'Zone'], ['from', 'Date from'], ['to', 'Date to']];
  let st = { stage: 'select', file: null, rows: [], skip: true, page: 1, result: [] };
  let view;

  function render(v) { view = v; draw(); }

  function draw() {
    const stages = ['select', 'checking', 'review', 'importing', 'done'];
    const idx = { select: 0, checking: 1, review: 1, importing: 2, done: 3 }[st.stage];
    view.innerHTML = `
    <div class="page">
      <div class="sticky-head"><div class="page-head">
        <button class="back" id="uBack" data-tip="Back">${ms('arrow_back')}</button>
        <div class="grow"><h1>Upload working packages</h1><div class="meta"><span>Create many working packages at once from an Excel sheet.</span></div></div>
        <a class="btn" id="uSample">${ms('download')}Download sample file</a>
      </div></div>
      <div class="card">
        <div class="u-steps">${['Select file', 'Check data', 'Import', 'Done'].map((l, i) => `${i ? `<span class="u-line ${i <= idx ? 'done' : ''}"></span>` : ''}<span class="u-step ${i < idx || st.stage === 'done' ? 'done' : i === idx ? 'cur' : ''}"><span class="bub">${i < idx || st.stage === 'done' ? ms('check', 's16') : i + 1}</span>${l}</span>`).join('')}</div>
        <div id="uStage">${stageHtml()}</div>
      </div>
      <div class="card" id="uHistory">${historyHtml()}</div>
    </div>`;
    view.querySelector('#uBack').onclick = () => goBack();
    view.querySelector('#uSample').onclick = sample;
    bindStage(); bindHistory();
  }

  // ---------------------------------------------------------------- stages
  function stageHtml() {
    if (st.stage === 'select') return `
      ${st.error ? `<div class="banner err" style="margin-bottom:12px">${ms('error')}<div><b>${esc(st.error.title)}</b><p>${esc(st.error.text)}</p></div></div>` : ''}
      <div class="drop" id="uDrop" style="flex-direction:row;justify-content:flex-start;gap:16px;padding:22px 24px;text-align:left">
        <span class="xls lg">X</span><div class="grow"><b style="font-weight:500">Drag and drop a file here or browse</b><div class="cap">Only .xlsx, .xls or .csv · up to 10 MB · one working package per row</div></div>
        <button class="btn primary" id="uPick">${ms('upload')}Upload file</button></div>
      <div class="row cap" style="margin-top:12px;gap:16px;flex-wrap:wrap">${ms('info', 's16')}<span>Required columns: Title, Sender, Recipient, Building, Floor, Date from, Date to. Optional: Trade, Zone, Volume.</span><a class="link" id="uSample2">${ms('download', 's16')}Download sample file</a></div>`;
    if (st.stage === 'checking' || st.stage === 'importing') return `
      <div class="row" style="gap:16px;padding:12px 0"><span class="xls lg">X</span><div class="grow"><b style="font-weight:500">${esc(st.file.name)}</b><div class="cap" id="uMsg">${st.stage === 'checking' ? 'Reading file…' : 'Creating working packages…'}</div><div class="prog-big" style="margin-top:8px"><i id="uBar"></i></div></div></div>`;
    if (st.stage === 'review') {
      const bad = st.rows.filter((r) => rowErrors(r).length); const ok = st.rows.length - bad.length;
      const importN = st.skip ? ok : bad.length ? 0 : ok;
      return `
      <div class="row" style="gap:16px;margin-bottom:12px"><span class="xls lg">X</span><div class="grow"><b style="font-weight:500">${esc(st.file.name)}</b><div class="cap">${st.rows.length} rows found · <span class="ok-t">${ok} ready</span>${bad.length ? ` · <span class="err-t">${bad.length} need${bad.length > 1 ? '' : 's'} attention</span>` : ''}</div></div><button class="btn text" id="uAgain">${ms('swap_horiz')}Choose another file</button></div>
      ${bad.length ? `<div class="banner" style="margin-bottom:12px">${ms('edit_note')}<div><b>Fix the highlighted cells right here</b><p>Rows turn green as soon as they are valid. Or skip them and import only the ready rows.</p></div></div>` : `<div class="banner ok" style="margin-bottom:12px">${ms('check_circle')}<div><b>All rows are valid</b><p>Ready to import ${ok} working packages.</p></div></div>`}
      <div class="tbl-wrap" style="max-height:420px;overflow:auto"><table class="table"><thead><tr><th style="width:40px">#</th>${COLS.map(([, l]) => `<th>${l}</th>`).join('')}<th>Check</th></tr></thead><tbody>
        ${st.rows.map((r, i) => { const errs = rowErrors(r); const ef = errs.map((e) => e.f); return `<tr><td class="faint">${i + 2}</td>${COLS.map(([k]) => ef.includes(k) ? `<td class="cell-err"><input class="cell-in" data-r="${i}" data-k="${k}" value="${esc(r[k] || '')}" placeholder="${k === 'from' || k === 'to' ? 'YYYY-MM-DD' : 'Required'}" ${k === 'building' ? `list="dl-b"` : k === 'floor' ? 'list="dl-f"' : k === 'trade' ? 'list="dl-t"' : ''}></td>` : `<td class="nowrap">${esc(k === 'from' || k === 'to' ? (r[k] ? D.fmt(r[k]) : '') : r[k] || '')}</td>`).join('')}
          <td class="nowrap">${errs.length ? `<span class="pill error" data-tip="${esc(errs.map((e) => e.m).join('<br>'))}">${errs.length} error${errs.length > 1 ? 's' : ''}</span>` : '<span class="pill success">Ready</span>'}</td></tr>`; }).join('')}
      </tbody></table></div>
      <datalist id="dl-b">${BUILDINGS.map((b) => `<option>${b}</option>`).join('')}</datalist><datalist id="dl-f">${FLOORS.map((b) => `<option>${b}</option>`).join('')}</datalist><datalist id="dl-t">${Object.keys(TRADES).map((b) => `<option>${b}</option>`).join('')}</datalist>
      <div class="row" style="margin-top:14px">${bad.length ? `<label class="check"><input type="checkbox" id="uSkip" ${st.skip ? 'checked' : ''}>Skip ${bad.length} row${bad.length > 1 ? 's' : ''} with errors</label>` : ''}<span class="sp"></span><button class="btn text" id="uCancel">Cancel</button><button class="btn primary" id="uImport" ${importN ? '' : 'disabled'}>${ms('file_download_done')}Import ${importN} working package${importN !== 1 ? 's' : ''}</button></div>`;
    }
    // done
    return `<div class="banner ok" style="margin-bottom:12px">${ms('task_alt')}<div><b>${st.result.length} working package${st.result.length !== 1 ? 's' : ''} imported</b><p>${st.skipped ? `${st.skipped} row${st.skipped > 1 ? 's were' : ' was'} skipped. ` : ''}You can add shipments to them right away.</p></div></div>
      <div class="tbl-wrap"><table class="table"><thead><tr><th>Working package</th><th>Location</th><th>Booking window</th><th></th></tr></thead><tbody>
        ${st.result.map((w) => `<tr class="click" data-wp="${w.id}"><td><div class="row" style="gap:8px"><span class="dot-s" style="background:${UI.tradeColor(w.trade)}"></span><span class="tline1">${esc(w.title)}</span></div><div class="tline2">${esc(w.trade)} · ${esc(w.sender)} → ${esc(w.recipient)}</div></td><td>${esc(w.building)} · ${esc(w.floor)}</td><td>${D.fmt(w.from)} – ${D.fmt(w.to)}</td><td style="text-align:right"><button class="btn text sm" data-addship="${w.id}">${ms('add', 's16')}Add shipment</button></td></tr>`).join('')}
      </tbody></table></div>
      <div class="row" style="margin-top:14px"><span class="sp"></span><button class="btn" id="uAnother">${ms('upload_file')}Upload another file</button><a class="btn primary" href="#/shipments" id="uView">${ms('local_shipping')}View in Shipments</a></div>`;
  }

  function bindStage() {
    const $ = (s) => view.querySelector(s);
    if (st.stage === 'select') {
      const drop = $('#uDrop');
      const pick = async (e) => { e && e.stopPropagation(); const f = await UI.pickFiles('.xlsx,.xls,.csv', false); if (f[0]) accept(f[0]); };
      drop.onclick = pick; $('#uPick').onclick = pick; $('#uSample2').onclick = sample;
      drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) accept(f); };
    }
    if (st.stage === 'review') {
      view.querySelectorAll('.cell-in').forEach((inp) => {
        inp.oninput = () => { const r = st.rows[+inp.dataset.r]; r[inp.dataset.k] = inp.value.trim(); const ok = !rowErrors(r).some((e) => e.f === inp.dataset.k); inp.classList.toggle('ok', ok); };
        inp.onchange = () => { const pos = [inp.dataset.r, inp.dataset.k]; draw(); const nx = view.querySelector(`.cell-in`); if (nx) nx.focus(); else UI.toast('All rows are valid now', { icon: 'task_alt' }); void pos; };
        inp.onkeydown = (e) => { if (e.key === 'Enter') inp.blur(); };
      });
      $('#uSkip')?.addEventListener('change', (e) => { st.skip = e.target.checked; draw(); });
      $('#uAgain').onclick = () => reset();
      $('#uCancel').onclick = () => reset();
      $('#uImport').onclick = () => doImport();
    }
    if (st.stage === 'done') {
      view.querySelectorAll('[data-wp]').forEach((r) => r.onclick = (e) => { const a = e.target.closest('[data-addship]'); if (a) { CREATE.start({ wpId: a.dataset.addship }); return; } UI.go('#/group/wp/' + r.dataset.wp); });
      $('#uAnother').onclick = () => reset();
      $('#uView').onclick = () => { S.prefs.wpStatus = []; S.prefs.search = ''; S.prefs.view = 'list'; S.savePrefs(); };
    }
  }
  function reset() { st = Object.assign(st, { stage: 'select', file: null, rows: [], error: null, skip: true }); draw(); }

  function accept(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) { st.error = { title: 'This file type is not supported', text: `“${file.name}” is not an Excel file. Please upload .xlsx, .xls or .csv.` }; draw(); return; }
    if (file.size > 10e6) { st.error = { title: 'File is too large', text: 'The maximum size is 10 MB.' }; draw(); return; }
    st.error = null; st.file = file; st.stage = 'checking'; draw();
    const finish = (rows) => {
      animate(1100, (p) => { const m = view.querySelector('#uMsg'); if (m) m.textContent = p < .4 ? 'Reading file…' : `Checking ${rows.length} rows…`; }, () => {
        st.rows = rows; st.stage = 'review'; draw();
        const bad = rows.filter((r) => rowErrors(r).length).length;
        if (!rows.length) { st.stage = 'select'; st.error = { title: 'No rows found', text: 'The file is empty or the header row is missing. Use the sample file as a template.' }; draw(); }
        else if (bad) UI.toast(`${bad} row${bad > 1 ? 's need' : ' needs'} attention`, { icon: 'edit_note' });
      });
    };
    if (ext === 'csv') { const rd = new FileReader(); rd.onload = () => finish(parseCsv(String(rd.result))); rd.readAsText(file); }
    else finish(simulatedRows());   // .xlsx parsing is simulated in this front-end demo
  }

  function animate(ms_, onTick, done) {
    const t0 = Date.now();
    const iv = setInterval(() => { const p = Math.min(1, (Date.now() - t0) / ms_); const b = view.querySelector('#uBar'); if (b) b.style.width = (p * 100) + '%'; onTick && onTick(p); if (p >= 1) { clearInterval(iv); setTimeout(done, 150); } }, 30);
  }

  function doImport() {
    const good = st.rows.filter((r) => !rowErrors(r).length); const skipped = st.rows.length - good.length;
    st.stage = 'importing'; draw();
    animate(900, null, () => {
      const res = good.map((r, i) => Object.assign({ id: 'wpu' + Date.now() + i, volume: r.volume || '—', units: 'Truck loads', unitsQty: 0 }, { title: r.title, trade: TRADES[r.trade] ? r.trade : 'Baumeister', sender: r.sender, recipient: r.recipient, building: r.building, floor: r.floor, zone: r.zone || '', from: r.from, to: r.to }));
      S.data.WPS.push(...res);
      S.data.UPLOADS.unshift({ id: 'u' + Date.now(), name: st.file.name, by: 'max.mustermann@sample.com', on: D.today, rows: res.length, status: skipped ? 'Partly imported' : 'Succeeded', errors: skipped ? st.rows.filter((r) => rowErrors(r).length).map((r) => `Row ${st.rows.indexOf(r) + 2}: ${rowErrors(r).map((e) => e.m).join(', ')}`) : [] });
      S.persist();
      st.result = res; st.skipped = skipped; st.stage = 'done'; st.page = 1; draw();
      UI.toast(`${res.length} working packages imported`);
    });
  }

  // ---------------------------------------------------------------- rows
  function rowErrors(r) {
    const e = [];
    [['title', 'Title'], ['sender', 'Sender'], ['recipient', 'Recipient'], ['building', 'Building'], ['floor', 'Floor'], ['from', 'Date from'], ['to', 'Date to']].forEach(([k, l]) => { if (!String(r[k] || '').trim()) e.push({ f: k, m: `“${l}” is required` }); });
    ['from', 'to'].forEach((k) => { if (r[k] && !/^\d{4}-\d{2}-\d{2}$/.test(r[k])) e.push({ f: k, m: 'Use the date format YYYY-MM-DD' }); });
    if (r.from && r.to && /^\d{4}-\d{2}-\d{2}$/.test(r.from) && /^\d{4}-\d{2}-\d{2}$/.test(r.to) && r.to < r.from) e.push({ f: 'to', m: '“Date to” is before “Date from”' });
    if (r.trade && !TRADES[r.trade]) e.push({ f: 'trade', m: `Trade “${r.trade}” does not exist` });
    if (r.building && !BUILDINGS.includes(r.building)) e.push({ f: 'building', m: `Building “${r.building}” does not exist on this site` });
    return e;
  }
  function parseCsv(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
    if (lines.length < 2) return [];
    const sep = lines[0].includes(';') ? ';' : ',';
    const split = (l) => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((x) => x.trim()); };
    const head = split(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
    const map = { title: 'title', trade: 'trade', sender: 'sender', recipient: 'recipient', building: 'building', floor: 'floor', zone: 'zone', datefrom: 'from', from: 'from', dateto: 'to', to: 'to', volume: 'volume' };
    const toIso = (v) => { const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : v; };
    return lines.slice(1).map((l) => { const c = split(l); const r = {}; head.forEach((h, i) => { if (map[h]) r[map[h]] = map[h] === 'from' || map[h] === 'to' ? toIso(c[i] || '') : c[i] || ''; }); return r; });
  }
  function simulatedRows() {
    return [
      { title: 'Lüftungszentrale Dach Bau 06', trade: 'Lüftung', sender: 'Team pRED', recipient: 'Organization P', building: 'Bau 06', floor: 'OG 03', zone: 'Crane zone', from: '2026-11-09', to: '2027-02-26' },
      { title: 'Sprinkleranlage UG', trade: 'Heizung/Kühlung', sender: 'Hälg & Co. AG', recipient: 'Team Intel', building: 'Bau 04', floor: 'UG 02', zone: 'Lay Area 14', from: '2026-11-16', to: '2027-01-29' },
      { title: 'Elektro Steigzonen', trade: 'Elektro', sender: 'B. Braun Medical AG', recipient: 'Organization P', building: 'Bau 06', floor: 'EG', zone: 'Lay Area 25', from: '2026-11-02', to: '2026-12-18' },
      { title: 'Rückbau Altbau Nord', trade: 'Rückbau', sender: 'Biffco Enterprises', recipient: 'Team Intel', building: '', floor: 'EG', zone: 'Yard North', from: '2026-11-23', to: '2027-03-12' },
      { title: 'Holzfassade West', trade: 'Holzbau', sender: 'Hydroplant AG', recipient: 'Organization P', building: 'Bau 01', floor: 'OG 02', zone: 'Lay Area 26', from: '2027-01-11', to: '2027-04-30' },
      { title: 'Betonage Bodenplatte Bau 02', trade: 'Baumeister', sender: 'ERNA AG', recipient: 'Organization P', building: 'Bau 02', floor: 'UG 01', zone: 'Crane zone', from: '2026-11-30', to: '2027-01-22' },
      { title: 'Kältezentrale', trade: 'Heizung/Kühlung', sender: 'Hälg & Co. AG', recipient: 'Organization P', building: 'Bau 04', floor: 'UG 04', zone: 'Lay Area 12', from: '2026-12-07', to: '2027-03-26' },
      { title: 'Kabelzug Hauptverteilung', trade: 'Elektro', sender: 'B. Braun Medical AG', recipient: 'Team Intel', building: 'Bau 01', floor: 'UG 01', zone: 'Lay Area 03', from: '2026-11-09', to: '2026-12-11' },
      { title: 'Schalung Treppenhaus', trade: 'Baumeister', sender: 'ERNA AG', recipient: 'Organization P', building: 'Bau 06', floor: 'OG 02', zone: 'Lay Area 26', from: '2026-12-14', to: '2026-11-30' },
      { title: 'Lüftungskanäle OG 02', trade: 'Lüftung', sender: 'Team pRED', recipient: 'Organization P', building: 'Bau 06', floor: 'OG 02', zone: 'Lay Area 25', from: '2026-11-16', to: '2027-01-15' },
      { title: 'Dämmung Dach', trade: 'Holzbau', sender: 'Hydroplant AG', recipient: 'Organization P', building: 'Bau 04', floor: 'OG 03', zone: 'Crane zone', from: '2027-02-01', to: '2027-03-31' },
      { title: 'Beleuchtung Tiefgarage', trade: 'Elektro', sender: 'B. Braun Medical AG', recipient: 'Organization P', building: 'Bau 04', floor: 'UG 04', zone: 'Lay Area 12', from: '2026-12-01', to: '2027-02-12' },
    ];
  }

  function sample() {
    const head = COLS.map(([, l]) => l).concat('Volume').join(';');
    const rows = simulatedRows().slice(0, 3).map((r) => COLS.map(([k]) => (k === 'from' || k === 'to' ? D.fmt(r[k]) : r[k])).concat('').join(';'));
    const blob = new Blob(['﻿' + [head].concat(rows).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'CLM_working_packages_sample.csv'; a.click();
    UI.toast('Sample file downloaded · fill it in and upload it here', { icon: 'download' });
  }

  // ---------------------------------------------------------------- history
  function historyHtml() {
    const all = S.data.UPLOADS; const per = 6; const pages = Math.ceil(all.length / per); st.page = Math.min(st.page, pages);
    const list = all.slice((st.page - 1) * per, st.page * per);
    const pill = (s) => ({ Succeeded: 'success', Failed: 'error', Processing: 'warning', 'Partly imported': 'warning' }[s]);
    return `<div class="card-head"><div class="grow"><div class="card-h">Upload history (${all.length})</div></div></div>
      <div class="tbl-wrap"><table class="table"><thead><tr><th>File name</th><th>Uploaded by</th><th>Uploaded on</th><th>Rows</th><th>Status</th></tr></thead><tbody>
      ${list.map((u) => `<tr class="click" data-u="${u.id}"><td><div class="row" style="gap:10px"><span class="xls">X</span><a class="link">${esc(u.name)}</a></div></td><td>${esc(u.by)}</td><td>${D.fmt(u.on)}</td><td>${u.rows || '—'}</td><td><span class="pill ${pill(u.status)}">${u.status}${u.status === 'Failed' ? ` · ${(u.errors || []).length} errors` : ''}</span></td></tr>`).join('')}
      </tbody></table></div>
      <div class="pager"><span>Items per page ${per}</span><span>${(st.page - 1) * per + 1} – ${Math.min(st.page * per, all.length)} of ${all.length}</span><button class="icon-btn sm" data-pg="-1" ${st.page <= 1 ? 'disabled style="opacity:.3"' : ''}>${ms('chevron_left')}</button><button class="icon-btn sm" data-pg="1" ${st.page >= pages ? 'disabled style="opacity:.3"' : ''}>${ms('chevron_right')}</button></div>`;
  }
  function bindHistory() {
    const h = view.querySelector('#uHistory');
    h.querySelectorAll('[data-pg]').forEach((b) => b.onclick = () => { st.page += +b.dataset.pg; h.innerHTML = historyHtml(); bindHistory(); });
    h.querySelectorAll('[data-u]').forEach((r) => r.onclick = () => {
      const u = S.data.UPLOADS.find((x) => x.id === r.dataset.u);
      const body = u.status === 'Processing' ? '<p class="muted">This file is still being processed. Large files can take a few minutes.</p>'
        : u.errors && u.errors.length ? `<p class="muted" style="margin-bottom:8px">${u.status === 'Failed' ? 'Nothing was imported because of these errors:' : 'These rows were skipped:'}</p><ul style="margin:0;padding-left:20px;line-height:22px">${u.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`
          : `<p class="muted">${u.rows} working packages were imported on ${D.fmt(u.on)} by ${esc(u.by)}.</p>`;
      UI.modal({ title: esc(u.name), icon: u.status === 'Failed' ? 'error' : u.status === 'Processing' ? 'hourglass_top' : 'task_alt', iconTone: u.status === 'Failed' ? 'warn' : u.status === 'Processing' ? 'olive' : 'ok', size: 'sm', body,
        actions: u.status === 'Failed' ? [{ label: 'Close', text: true }, { label: 'Upload corrected file', primary: true, icon: 'upload', onClick: () => { reset(); setTimeout(() => view.querySelector('#uPick')?.click(), 50); } }] : [{ label: 'Close', primary: true }] });
    });
  }

  window.UPLOAD = { render: (v) => { if (st.stage === 'done' || st.stage === 'importing' || st.stage === 'checking') st.stage = 'select'; render(v); } };
})();
