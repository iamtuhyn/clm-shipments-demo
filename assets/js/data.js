/* CLM Shipments demo — seed data (all dates in 2026, "today" = 25.10.2026) */
(function () {
  const TODAY = '2026-10-25';

  // ---------- date helpers ----------
  const D = {
    today: TODAY,
    parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); },
    iso(dt) { return dt.toISOString().slice(0, 10); },
    add(s, n) { const d = D.parse(s); d.setUTCDate(d.getUTCDate() + n); return D.iso(d); },
    diff(a, b) { return Math.round((D.parse(a) - D.parse(b)) / 864e5); },
    dow(s) { return (D.parse(s).getUTCDay() + 6) % 7; }, // 0 = Monday
    monday(s) { return D.add(s, -D.dow(s)); },
    fmt(s) { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}.${m}.${y}`; },
    fmtShort(s) { const [y, m, d] = s.split('-'); return `${d}.${m}.${y.slice(2)}`; },
    dayName(s, long) { const n = long ? ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; return n[D.dow(s)]; },
    monthName(s, short) { const m = D.parse(s).getUTCMonth(); return (short ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] : ['January','February','March','April','May','June','July','August','September','October','November','December'])[m]; },
    week(s) { const d = D.parse(s); const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const day = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - day + 3); const fy = new Date(Date.UTC(t.getUTCFullYear(), 0, 4)); return 1 + Math.round(((t - fy) / 864e5 - 3 + ((fy.getUTCDay() + 6) % 7)) / 7); },
    rel(s) {
      const n = D.diff(s, TODAY);
      if (n === 0) return 'today'; if (n === 1) return 'tomorrow'; if (n === -1) return 'yesterday';
      if (Math.abs(n) < 14) return n > 0 ? `in ${n} days` : `${-n} days ago`;
      const w = Math.round(Math.abs(n) / 7); return n > 0 ? `in ${w} weeks` : `${w} weeks ago`;
    },
  };

  // ---------- reference data ----------
  const TRADES = {
    'Lüftung': { color: '#2E60AA', short: 'Luftung' },
    'Baumeister': { color: '#F2CA27', dark: true, short: 'Baumeister' },
    'Rückbau': { color: '#765AB0', short: 'Ruckbau' },
    'Holzbau': { color: '#317A7C', short: 'Holzbau' },
    'Heizung/Kühlung': { color: '#E12601', short: 'Heizung' },
    'Elektro': { color: '#3CA227', short: 'Elektro' },
  };

  const SHIPMENT_STATUS = {
    'Open':       { color: '#A09FB5', icon: 'st-requested', tone: 'neutral' },
    'Approved':   { color: '#C4C27A', icon: 'st-approved', tone: 'olive' },
    'Waiting':    { color: '#71C68D', icon: 'st-waiting', tone: 'success' },
    'In Transit': { color: '#4CBB6C', icon: 'st-intransit', tone: 'success' },
    'Arrived':    { color: '#30713D', icon: 'st-parking', tone: 'success' },
    'Unloading':  { color: '#30713D', icon: 'st-unloading', tone: 'success' },
    'Completed':  { color: '#1E3F8A', icon: 'st-completed', tone: 'blue' },
    'Canceled':   { color: '#A3162B', icon: 'st-cancelled', tone: 'error' },
    'Rejected':   { color: '#9E9EA7', icon: 'st-cancelled', tone: 'inactive' },
  };
  // allowed next steps from each status (front-end only, mirrors backend workflow)
  const STATUS_FLOW = {
    'Open': ['Approved', 'Rejected'],
    'Approved': ['Waiting', 'In Transit', 'Open'],
    'Waiting': ['In Transit'],
    'In Transit': ['Arrived'],
    'Arrived': ['Unloading'],
    'Unloading': ['Completed'],
    'Completed': [],
    'Canceled': ['Open'],
    'Rejected': ['Open'],
  };

  const WP_STATUS = {
    overdue:   { label: 'Overdue', icon: 'legend-overdue', tone: 'error', dot: '#E12601' },
    active:    { label: 'Active', icon: 'legend-active', tone: 'success', dot: '#36A162' },
    pending:   { label: 'Pending', icon: 'legend-pending', tone: 'warning', dot: '#676770' },
    completed: { label: 'Completed', icon: 'legend-wp-completed', tone: 'blue', dot: '#2E60AA' },
  };

  const VEHICLES = [
    { id: 'solo-bis-7-5', name: 'LKW solo bis 7.5 t', desc: 'Box truck · up to 7.5 t', icon: 'veh-solo-bis-7-5' },
    { id: 'solo-ab-7-5', name: 'LKW solo ab 7.5 t', desc: 'Box truck · from 7.5 t', icon: 'veh-solo-ab-7-5' },
    { id: 'lkw-30', name: 'LKW bis 30 t', desc: 'Truck · up to 30 t', icon: 'veh-lkw-30' },
    { id: 'lkw-40', name: 'LKW bis 40 t', desc: 'Truck · up to 40 t', icon: 'veh-lkw-40' },
    { id: 'anhaenger', name: 'LKW mit Anhänger', desc: 'Truck + trailer · up to 40 t', icon: 'veh-anhaenger' },
    { id: 'sattelzug', name: 'Sattelzug', desc: 'Semi-trailer · up to 40 t', icon: 'veh-sattelzug' },
    { id: 'fahrmischer', name: 'Fahrmischer', desc: 'Concrete mixer · 8 m³', icon: 'veh-fahrmischer' },
    { id: 'betonpumpe', name: 'Betonpumpe', desc: 'Concrete pump', icon: 'veh-betonpumpe' },
    { id: 'autokran', name: 'Autokran', desc: 'Mobile crane', icon: 'veh-autokran' },
    { id: 'lieferwagen', name: 'Lieferwagen', desc: 'Low-loader · heavy parts', icon: 'veh-lieferwagen' },
    { id: 'pkw', name: 'PKW', desc: 'Car · small parts', icon: 'veh-pkw' },
  ];

  const MATERIALS = [
    { id: 'brick', name: 'Brick', unit: 'm³', pack: 'Pallets', group: 'Pallets' },
    { id: 'rebar', name: 'Rebar', unit: 't', pack: 'Bundles', group: 'Bulk' },
    { id: 'pipes', name: 'Pipes', unit: 'pcs', pack: 'Bundles', group: 'Pallets' },
    { id: 'copper', name: 'Copper wire', unit: 'm', pack: 'Drums', group: 'Pallets' },
    { id: 'gravel', name: 'Gravel', unit: 'm³', pack: 'Bulk · tipper', group: 'Bulk' },
    { id: 'sand', name: 'Sand', unit: 'm³', pack: 'Bulk · tipper', group: 'Bulk' },
    { id: 'formwork', name: 'Formwork', unit: 'm²', pack: 'Pallets', group: 'Pallets' },
    { id: 'steel', name: 'Steel', unit: 't', pack: 'Bundles', group: 'Bulk' },
    { id: 'concrete', name: 'Concrete', unit: 'm³', pack: 'Bulk · mixer truck', group: 'Bulk', pinned: true },
    { id: 'cement', name: 'Cement', unit: 'bags', pack: 'Pallets', group: 'Pallets' },
    { id: 'insulation', name: 'Insulation', unit: 'pallets', pack: 'Pallets', group: 'Pallets' },
    { id: 'ducts', name: 'Ventilation ducts', unit: 'pcs', pack: 'Crates', group: 'Pallets', pinned: true },
    { id: 'cable-trays', name: 'Cable trays', unit: 'm', pack: 'Bundles', group: 'Pallets' },
    { id: 'timber', name: 'Timber elements', unit: 'pcs', pack: 'Stacks', group: 'Pallets' },
    { id: 'glass', name: 'Glass panels', unit: 'pcs', pack: 'Racks', group: 'Pallets' },
    { id: 'plaster', name: 'Plasterboard', unit: 'pallets', pack: 'Pallets', group: 'Pallets' },
    { id: 'heat-pump', name: 'Heat pump unit', unit: 'pcs', pack: 'Crate', group: 'Pallets' },
    { id: 'nitrogen', name: 'Nitrogen tank', unit: 'pcs', pack: 'Single load', group: 'Bulk' },
  ];

  const UNLOADING_POINTS = [
    { id: 'UP 01', name: 'UP 01', area: 'Lay Area 25', desc: 'Quick unloading · 2 bays', slot: 20 },
    { id: 'UP 02', name: 'UP 02', area: 'Lay Area 12', desc: 'Street unloading point', slot: 30 },
    { id: 'UP 03', name: 'UP 03', area: 'Yard North', desc: 'Closed until 30.11.2026', slot: 30, disabled: true },
  ];

  const EQUIPMENT_BOOKABLE = [
    { id: 'crane5', name: 'Crane 5', icon: 'eq-tower-crane', spec: 'Hub 7.5 m · load max 2 t', slot: 20 },
    { id: 'elevator', name: 'Elevator', icon: 'eq-elevator', spec: 'Elevator 1 · load max 200 kg', slot: 120 },
    { id: 'scissor', name: 'Scissor lift', icon: 'eq-scissor-lift', spec: 'Lift 01 · load max 200 kg', slot: 30 },
    { id: 'crane3', name: 'Crane 3', icon: 'eq-tower-crane', spec: 'Booked 12:00 – 16:00', slot: 20, disabled: true },
  ];
  const EQUIPMENT_ONSITE = [
    { id: 'crane1', name: 'Crane 1', icon: 'eq-mobile-crane', spec: 'Hub 7 m · weight 2000 kg' },
    { id: 'forklift2', name: 'Forklift 2', icon: 'eq-forklift', spec: '3000 kg · max load 500 kg' },
    { id: 'forklift3', name: 'Forklift 3', icon: 'eq-forklift', spec: '3000 kg · max load 500 kg' },
    { id: 'telehandler', name: 'Telehandler', icon: 'eq-telehandler', spec: 'Reach 17 m · 4 t' },
  ];

  const PEOPLE = [
    { id: 'p1', name: 'Max Mustermann', org: 'Team pRED', phone: '+41 44 220 44 11', email: 'max.mustermann@sample.com', me: true },
    { id: 'p2', name: 'Veeti Seppanen', org: 'Organization P', phone: '+41 44 220 44 12', email: 'veeti.seppanen@sample.com' },
    { id: 'p3', name: 'Darrell Steward', org: 'B. Braun Medical AG', phone: '+41 79 410 22 31', email: 'darrell.steward@sample.com' },
    { id: 'p4', name: 'Leonie Brunner', org: 'Hälg & Co. AG', phone: '+41 71 243 43 43', email: 'leonie.brunner@sample.com' },
    { id: 'p5', name: 'Jonas Keller', org: 'ERNA AG', phone: '+41 61 555 10 20', email: 'jonas.keller@sample.com' },
    { id: 'p6', name: 'Aylin Demir', org: 'Hydroplant AG', phone: '+41 43 300 70 70', email: 'aylin.demir@sample.com' },
    { id: 'p7', name: 'Marco Rossi', org: 'Biffco Enterprises', phone: '+41 31 888 12 12', email: 'marco.rossi@sample.com' },
  ];

  const ORGS = ['Team pRED', 'Organization P', 'Team Intel', 'Biffco Enterprises', 'Hydroplant AG', 'Hälg & Co. AG', 'B. Braun Medical AG', 'ERNA AG'];
  const BUILDINGS = ['Bau 01', 'Bau 02', 'Bau 04', 'Bau 06'];
  const FLOORS = ['UG 04', 'UG 02', 'UG 01', 'EG', 'OG 01', 'OG 02', 'OG 03'];
  const ZONES = ['Lay Area 03', 'Lay Area 12', 'Lay Area 14', 'Lay Area 25', 'Lay Area 26', 'Yard North', 'Crane zone'];
  const TRANSPORT_UNITS = ['EUR pallets', 'Truck loads', 'Containers', 'Bundles', 'm³'];
  const GATES = ['Gate A1 – North entrance', 'Gate A2 – East entrance', 'Gate B – Service road'];

  const TEMPLATES = [
    { id: 't1', name: 'Concrete delivery', desc: 'Fahrmischer · Concrete 8 m³ · Crane 5', vehicle: 'fahrmischer', materials: [{ id: 'concrete', qty: 8 }], used: 24 },
    { id: 't2', name: 'Ventilation ducts', desc: 'LKW mit Anhänger · Ducts · Forklift', vehicle: 'anhaenger', materials: [{ id: 'ducts', qty: 40 }], used: 12 },
    { id: 't3', name: 'Rebar bundles', desc: 'Sattelzug · Rebar 12 t · Crane 5', vehicle: 'sattelzug', materials: [{ id: 'rebar', qty: 12 }], used: 9 },
    { id: 't4', name: 'Small parts', desc: 'LKW solo bis 7.5 t · Pallets', vehicle: 'solo-bis-7-5', materials: [{ id: 'plaster', qty: 6 }], used: 31 },
  ];

  // ---------- working packages ----------
  const WPS = [
    { id: 'wp1', title: 'Erne Bauunternehmung Bau 34-A32', trade: 'Lüftung', sender: 'Team pRED', recipient: 'Organization P', building: 'Bau 06', floor: 'OG 01', zone: 'Lay Area 25', from: '2026-09-01', to: '2026-12-18', volume: '420 m³', units: 'Truck loads', unitsQty: 38 },
    { id: 'wp2', title: 'Anlieferung Bohrgerät', trade: 'Baumeister', sender: 'Team pRED', recipient: 'Organization P', building: 'Bau 04', floor: 'UG 01', zone: 'Lay Area 12', from: '2026-06-15', to: '2026-11-20', volume: '—', units: 'Truck loads', unitsQty: 17 },
    { id: 'wp3', title: 'Stickstofftank Vereisung', trade: 'Rückbau', sender: 'Biffco Enterprises', recipient: 'Team Intel', building: 'Bau 02', floor: 'EG', zone: 'Yard North', from: '2026-08-03', to: '2026-11-13', volume: '12 tanks', units: 'Containers', unitsQty: 13 },
    { id: 'wp4', title: 'Fassadenelemente Nord', trade: 'Holzbau', sender: 'Hydroplant AG', recipient: 'Organization P', building: 'Bau 06', floor: 'OG 02', zone: 'Lay Area 26', from: '2026-11-02', to: '2027-01-15', volume: '86 elements', units: 'Truck loads', unitsQty: 9 },
    { id: 'wp5', title: 'Hälg & Co. AG Heizung', trade: 'Heizung/Kühlung', sender: 'Hälg & Co. AG', recipient: 'Team Intel', building: 'Bau 01', floor: 'OG 01', zone: 'Lay Area 03', from: '2026-07-01', to: '2026-10-19', volume: '—', units: 'EUR pallets', unitsQty: 60 },
    { id: 'wp6', title: 'Kabeltrassen UG', trade: 'Elektro', sender: 'B. Braun Medical AG', recipient: 'Organization P', building: 'Bau 04', floor: 'UG 02', zone: 'Lay Area 14', from: '2026-09-14', to: '2026-12-30', volume: '2.4 km', units: 'Bundles', unitsQty: 24 },
    { id: 'wp7', title: 'Betonage Decke OG 03', trade: 'Baumeister', sender: 'ERNA AG', recipient: 'Organization P', building: 'Bau 06', floor: 'OG 03', zone: 'Crane zone', from: '2026-09-21', to: '2026-11-27', volume: '640 m³', units: 'm³', unitsQty: 640 },
    { id: 'wp8', title: 'Kanäle U46 Montage', trade: 'Lüftung', sender: 'Team pRED', recipient: 'Organization P', building: 'Bau 04', floor: 'UG 04', zone: 'Lay Area 25', from: '2026-05-04', to: '2026-09-30', volume: '180 pcs', units: 'Truck loads', unitsQty: 8, completed: true },
  ];

  // ---------- shipments (deterministic generator) ----------
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const DESC = {
    'Lüftung': ['Montage der Kanäle', 'Lüftungsgerät Dach', 'Brandschutzklappen', 'Kanalformteile', 'Monoblock RLT'],
    'Baumeister': ['Bohrgerät Anlieferung', 'Schalung Decke', 'Bewehrung Stützen', 'Beton C30/37', 'Kies Hinterfüllung'],
    'Rückbau': ['Stickstofftank', 'Vereisungsrohre', 'Container Mulden', 'Kompressor'],
    'Holzbau': ['Fassadenelemente', 'Brettschichtholz', 'Dämmplatten'],
    'Heizung/Kühlung': ['Wärmepumpe', 'Heizverteiler', 'Rohrleitungen', 'Kältemaschine'],
    'Elektro': ['Kabeltrassen', 'Kabeltrommeln', 'Verteilerschrank', 'Leuchten'],
  };
  const MAT_BY_TRADE = {
    'Lüftung': ['ducts', 'insulation'], 'Baumeister': ['concrete', 'rebar', 'formwork', 'gravel'], 'Rückbau': ['nitrogen', 'pipes'],
    'Holzbau': ['timber', 'insulation', 'glass'], 'Heizung/Kühlung': ['heat-pump', 'pipes'], 'Elektro': ['cable-trays', 'copper'],
  };
  const VEH_BY_TRADE = {
    'Lüftung': ['anhaenger', 'lkw-30', 'solo-ab-7-5'], 'Baumeister': ['fahrmischer', 'sattelzug', 'lkw-40'], 'Rückbau': ['lieferwagen', 'lkw-30'],
    'Holzbau': ['sattelzug', 'anhaenger'], 'Heizung/Kühlung': ['solo-bis-7-5', 'lkw-30'], 'Elektro': ['solo-ab-7-5', 'solo-bis-7-5'],
  };
  const SLOTS = [['07:00', '07:40'], ['07:40', '08:20'], ['08:00', '09:00'], ['09:20', '11:20'], ['10:00', '10:40'], ['11:20', '12:00'], ['12:20', '14:00'], ['13:00', '13:40'], ['14:20', '15:00'], ['15:40', '16:20']];
  const COUNTS = { wp1: 13, wp2: 17, wp3: 13, wp4: 2, wp5: 13, wp6: 6, wp7: 6, wp8: 8 };

  const SHIPMENTS = [];
  let no = 880;
  const bnum = (b) => b.replace('Bau ', 'B');
  const fnum = (f) => f.replace(' ', '');

  WPS.forEach((wp) => {
    const n = COUNTS[wp.id];
    const end = wp.completed ? wp.to : D.add(TODAY, 32) < wp.to ? D.add(TODAY, 32) : wp.to;
    const start = wp.id === 'wp4' ? '2026-11-03' : D.diff(wp.from, D.add(TODAY, -42)) < 0 ? D.add(TODAY, -42) : wp.from;
    const span = Math.max(1, D.diff(end, start));
    for (let i = 0; i < n; i++) {
      let date = D.add(start, Math.round((span * (i + 0.5)) / n));
      while (D.dow(date) > 4) date = D.add(date, 1);
      const [t1, t2] = pick(SLOTS);
      const past = D.diff(date, TODAY) < 0;
      let status;
      if (wp.completed) status = 'Completed';
      else if (wp.id === 'wp4') status = 'Open';
      else if (past) status = rnd() < 0.86 ? 'Completed' : 'Canceled';
      else if (D.diff(date, TODAY) <= 2) status = pick(['Approved', 'Approved', 'Waiting', 'Open']);
      else status = rnd() < 0.55 ? 'Open' : 'Approved';
      const desc = pick(DESC[wp.trade]);
      const matId = pick(MAT_BY_TRADE[wp.trade]);
      const mat = MATERIALS.find((m) => m.id === matId);
      no += 1 + Math.floor(rnd() * 3);
      SHIPMENTS.push({
        id: 's' + no, no: `${no}-${wp.sender.split(' ').slice(-1)[0]}`,
        name: `${bnum(wp.building)}-${fnum(wp.floor)}-${TRADES[wp.trade].short}_${desc}`,
        wpId: wp.id, date, start: t1, end: t2, status,
        sender: wp.sender, recipient: wp.recipient, building: wp.building, floor: wp.floor, zone: wp.zone,
        up: pick(['UP 01', 'UP 01', 'UP 02']), vehicle: pick(VEH_BY_TRADE[wp.trade]), vehicles: 1,
        materials: [{ id: matId, qty: mat.unit === 'm³' ? 8 * (1 + Math.floor(rnd() * 3)) : 2 + Math.floor(rnd() * 30), note: '' }],
        equipment: rnd() < 0.6 ? [{ id: 'crane5', kind: 'booked', start: t1, end: D && t1.replace(/:(\d\d)/, (m, mm) => ':' + String(Math.min(59, +mm + 20)).padStart(2, '0')), state: status === 'Open' ? 'pending' : 'approved' }] : [],
        createdBy: pick(PEOPLE).id, onsite: 'p2', created: D.add(date, -6 - Math.floor(rnd() * 10)) + 'T' + pick(['08:12', '09:45', '13:20', '16:05']),
        comments: [], docs: [], photos: [], annotations: [], gate: GATES[0], plate: 'ZH ' + (100 + Math.floor(rnd() * 800)) + ' ' + (100 + Math.floor(rnd() * 800)),
        origin: 'Hardturmstrasse 161, 8005 Zürich', km: 8 + Math.floor(rnd() * 40),
      });
    }
  });

  // late shipments for overdue packages (still open although date passed)
  ['wp7', 'wp7', 'wp5'].forEach((wid, k) => {
    const s = SHIPMENTS.filter((x) => x.wpId === wid && D.diff(x.date, TODAY) < 0).slice(-1 - k)[0];
    if (s) s.status = k === 2 ? 'Approved' : 'Open';
  });

  // ---------- hero shipment (used throughout the demo) ----------
  const hero = {
    id: 's908', no: '908-Team pRED', name: 'B04-UG04-Luftung_Montage der Kanäle U46', wpId: 'wp1',
    date: '2026-10-27', start: '09:20', end: '11:20', status: 'Open',
    sender: 'Team pRED', recipient: 'Organization P', building: 'Bau 06', floor: 'OG 01', zone: 'Lay Area 25',
    up: 'UP 01', vehicle: 'fahrmischer', vehicles: 1,
    materials: [{ id: 'concrete', qty: 200, note: 'Unload north side' }],
    equipment: [
      { id: 'crane5', kind: 'booked', start: '09:20', end: '09:40', state: 'pending' },
      { id: 'crane1', kind: 'onsite', pulls: 3, start: '09:20', end: '11:20' },
    ],
    createdBy: 'p1', onsite: 'p2', orderResp: 'p1', deliveryResp: 'p2', created: '2026-10-20T08:12',
    gate: GATES[0], plate: 'ZH 123 456', phone: '+41 79 123 45 67', origin: 'Hardturmstrasse 161, 8005 Zürich', km: 12,
    comments: [{ by: 'p1', at: '2026-10-20T08:12', text: 'Please unload at the north side of Bau 06.' }],
    docs: [
      { name: 'Delivery note_B04-UG04.pdf', type: 'PDF', size: '1.2 MB', by: 'p1', at: '2026-10-20T08:14' },
      { name: 'document info_S1234.docx', type: 'DOCX', size: '840 KB', by: 'p1', at: '2026-10-20T08:15' },
      { name: 'Site access plan.pptx', type: 'PPTX', size: '3.4 MB', by: 'p2', at: '2026-10-21T10:02' },
    ],
    photos: ['assets/img/site-1.jpg', 'assets/img/site-2.jpg', 'assets/img/site-3.jpg', 'assets/img/site-2.jpg', 'assets/img/site-1.jpg'],
    annotations: [],
  };
  SHIPMENTS.unshift(hero);

  // activity log entries
  SHIPMENTS.forEach((s) => {
    s.activity = [{ at: s.created, by: s.createdBy, text: 'created the shipment', icon: 'add_circle' }];
    if (s.id === 's908') {
      s.activity.push({ at: '2026-10-20T08:14', by: 'p1', text: 'uploaded 2 documents', icon: 'upload_file' });
      s.activity.push({ at: '2026-10-21T10:02', by: 'p2', text: 'uploaded Site access plan.pptx', icon: 'upload_file' });
      s.activity.push({ at: '2026-10-22T07:45', by: 'p2', text: 'requested Crane 5 for 09:20 – 09:40', icon: 'precision_manufacturing' });
    } else if (s.status !== 'Open') {
      s.activity.push({ at: D.add(s.created.slice(0, 10), 1) + 'T09:00', by: 'p2', text: `changed status to ${s.status === 'Completed' ? 'Approved' : s.status}`, icon: 'sync_alt' });
      if (s.status === 'Completed') s.activity.push({ at: s.date + 'T' + s.end, by: 'p2', text: 'changed status to Completed', icon: 'done_all' });
    }
  });

  const UPLOADS = [
    { id: 'u1', name: 'Working packages Bau 06.xlsx', by: 'max.mustermann@sample.com', on: '2026-10-21', rows: 24, status: 'Succeeded' },
    { id: 'u2', name: 'Lüftung Q4.xlsx', by: 'veeti.seppanen@sample.com', on: '2026-10-18', rows: 8, status: 'Succeeded' },
    { id: 'u3', name: 'Rückbau Paket.xlsx', by: 'max.mustermann@sample.com', on: '2026-10-14', rows: 0, status: 'Failed', errors: ['Row 3: "Building" is required', 'Row 7: "Date To" is before "Date From"', 'Row 9: Trade "Abbruch" does not exist'] },
    { id: 'u4', name: 'Elektro UG.xlsx', by: 'darrell.steward@sample.com', on: '2026-10-12', rows: 5, status: 'Succeeded' },
    { id: 'u5', name: 'Holzbau Fassade.xls', by: 'max.mustermann@sample.com', on: '2026-10-07', rows: 12, status: 'Succeeded' },
    { id: 'u6', name: 'Import 2026-10-03.xlsx', by: 'max.mustermann@sample.com', on: '2026-10-03', rows: 0, status: 'Processing' },
    ...Array.from({ length: 19 }, (_, i) => ({ id: 'ux' + i, name: `Import 2026-${String(9 - Math.floor(i / 4)).padStart(2, '0')}-${String(28 - (i % 4) * 6).padStart(2, '0')}.xlsx`, by: pick(['max.mustermann@sample.com', 'veeti.seppanen@sample.com']), on: `2026-${String(9 - Math.floor(i / 4)).padStart(2, '0')}-${String(28 - (i % 4) * 6).padStart(2, '0')}`, rows: 3 + Math.floor(rnd() * 20), status: rnd() < 0.85 ? 'Succeeded' : 'Failed', errors: ['Row 2: "Recipient" is required'] })),
  ];

  const NOTIFICATIONS = [
    { icon: 'warning', tone: 'error', text: '<b>Betonage Decke OG 03</b> has 2 shipments past their date', at: '2026-10-25T07:30', link: '#/group/wp/wp7' },
    { icon: 'check_circle', tone: 'success', text: 'Crane 5 booking for <b>908-Team pRED</b> is waiting for approval', at: '2026-10-24T16:10', link: '#/shipment/s908' },
    { icon: 'upload_file', tone: 'neutral', text: '<b>Working packages Bau 06.xlsx</b> imported · 24 rows', at: '2026-10-21T11:00', link: '#/upload' },
  ];

  window.CLM_SEED = { WPS, SHIPMENTS, UPLOADS, NOTIFICATIONS };
  window.CLM = { D, TRADES, SHIPMENT_STATUS, STATUS_FLOW, WP_STATUS, VEHICLES, MATERIALS, UNLOADING_POINTS, EQUIPMENT_BOOKABLE, EQUIPMENT_ONSITE, PEOPLE, ORGS, BUILDINGS, FLOORS, ZONES, TRANSPORT_UNITS, GATES, TEMPLATES };
})();
