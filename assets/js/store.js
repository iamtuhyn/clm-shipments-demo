/* State, persistence (localStorage) and derived selectors */
(function () {
  const { D, WP_STATUS } = CLM;
  const KEY = 'clm-shipments-demo-v1';
  const PREFS_KEY = 'clm-shipments-demo-prefs-v1';

  const clone = (o) => JSON.parse(JSON.stringify(o));
  function load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private mode */ } }

  const defaultPrefs = () => ({
    view: 'timeline', groupBy: 'wp', wpStatus: [], search: '',
    period: 4, showCompleted: true, columns: { sender: true, recipient: true, building: true, floor: true },
    rangeStart: D.add(D.monday(D.today), -14), expanded: { 'wp:wp1': true }, navCollapsed: false,
  });

  const S = {
    data: load(KEY, null) || clone(CLM_SEED),
    prefs: (() => { const p = Object.assign(defaultPrefs(), load(PREFS_KEY, {})); if (![4, 52].includes(p.period)) { p.period = 4; p.rangeStart = D.add(D.monday(D.today), -14); } if (!Array.isArray(p.wpStatus) || p.wpStatus.length === 4) p.wpStatus = []; return p; })(),
    persist() { save(KEY, S.data); },
    savePrefs() { save(PREFS_KEY, S.prefs); },
    reset() {
      try { localStorage.removeItem(KEY); localStorage.removeItem(PREFS_KEY); } catch (e) {}
      S.data = clone(CLM_SEED); S.prefs = defaultPrefs();
    },

    // ---------- lookups ----------
    wp(id) { return S.data.WPS.find((w) => w.id === id); },
    shipment(id) { return S.data.SHIPMENTS.find((s) => s.id === id); },
    person(id) { return CLM.PEOPLE.find((p) => p.id === id) || S.data.extraPeople?.find((p) => p.id === id) || { name: 'Unknown', org: '' }; },
    people() { return CLM.PEOPLE.concat(S.data.extraPeople || []); },
    vehicle(id) { return CLM.VEHICLES.find((v) => v.id === id) || CLM.VEHICLES[0]; },
    material(id) { return CLM.MATERIALS.find((m) => m.id === id) || S.data.extraMaterials?.find((m) => m.id === id) || { name: id, unit: '' }; },
    equipment(id) { return CLM.EQUIPMENT_BOOKABLE.concat(CLM.EQUIPMENT_ONSITE).find((e) => e.id === id) || { name: id, icon: 'eq-general' }; },
    shipmentsOf(wpId) { return S.data.SHIPMENTS.filter((s) => s.wpId === wpId).sort(byDate); },

    // ---------- working package status ----------
    wpStats(wp) {
      const list = S.shipmentsOf(wp.id);
      const done = list.filter((s) => s.status === 'Completed').length;
      const canceled = list.filter((s) => s.status === 'Canceled' || s.status === 'Rejected').length;
      const open = list.filter((s) => s.status === 'Open').length;
      const approved = list.filter((s) => !['Open', 'Completed', 'Canceled', 'Rejected'].includes(s.status)).length;
      const late = list.filter((s) => D.diff(s.date, D.today) < 0 && !['Completed', 'Canceled', 'Rejected'].includes(s.status)).length;
      return { total: list.length, done, open, approved, canceled, late, active: list.length - canceled };
    },
    wpStatus(wp) {
      if (wp.completed) return 'completed';
      const st = S.wpStats(wp);
      if (D.diff(wp.to, D.today) < 0 || st.late > 0) return 'overdue';
      if (D.diff(wp.from, D.today) > 0) return 'pending';
      return 'active';
    },
    wpWindowNote(wp) {
      const s = S.wpStatus(wp); const st = S.wpStats(wp);
      if (s === 'completed') return { text: 'Completed ' + D.fmt(wp.to), tone: '' };
      if (s === 'overdue') return st.late && D.diff(wp.to, D.today) >= 0 ? { text: `${st.late} shipment${st.late > 1 ? 's' : ''} late`, tone: 'err' } : { text: 'Ended ' + D.rel(wp.to), tone: 'err' };
      if (s === 'pending') return { text: 'Starts ' + D.rel(wp.from), tone: '' };
      return { text: 'Ends ' + D.rel(wp.to), tone: '' };
    },

    // ---------- grouping ----------
    groupKey(s, by) {
      if (by === 'wp') return s.wpId;
      if (by === 'destination') return `${s.building} · ${s.floor}`;
      if (by === 'sender') return s.sender;
      return s.recipient;
    },
    groupLabel(by) { return { wp: 'Working package', destination: 'Destination', sender: 'Sender', recipient: 'Recipient' }[by]; },

    /* Returns groups [{key, title, sub, trade, wp, shipments, from, to, status}] using current prefs (filters). */
    groups(opts = {}) {
      const p = Object.assign({}, S.prefs, opts);
      const q = (p.search || '').trim().toLowerCase();
      const statusOk = (wp) => !p.wpStatus.length || p.wpStatus.includes(S.wpStatus(wp));
      const map = new Map();
      if (p.groupBy === 'wp') {
        S.data.WPS.forEach((wp) => {
          if (!statusOk(wp)) return;
          if (!p.showCompleted && S.wpStatus(wp) === 'completed') return;
          map.set(wp.id, { key: wp.id, title: wp.title, sub: wp.trade, trade: wp.trade, wp, shipments: [] });
        });
      }
      S.data.SHIPMENTS.forEach((s) => {
        const wp = S.wp(s.wpId);
        if (!wp || !statusOk(wp)) return;
        if (!p.showCompleted && (s.status === 'Completed' || S.wpStatus(wp) === 'completed')) return;
        const k = S.groupKey(s, p.groupBy);
        if (!map.has(k)) map.set(k, { key: k, title: k, sub: '', shipments: [] });
        map.get(k).shipments.push(s);
      });
      let groups = [...map.values()];
      groups.forEach((g) => {
        g.shipments.sort(byDate);
        if (g.wp) { g.from = g.wp.from; g.to = g.wp.to; g.status = S.wpStatus(g.wp); }
        else {
          const ds = g.shipments.map((s) => s.date).sort();
          g.from = ds[0]; g.to = ds[ds.length - 1];
          const wps = [...new Set(g.shipments.map((s) => s.wpId))];
          g.sub = `${wps.length} working package${wps.length > 1 ? 's' : ''}`;
          g.status = null;
        }
      });
      if (q) {
        groups = groups.map((g) => {
          const hit = [g.title, g.sub, g.wp?.sender, g.wp?.recipient, g.wp?.building].join(' ').toLowerCase().includes(q);
          const ships = g.shipments.filter((s) => [s.name, s.no, s.sender, s.recipient, s.building, s.floor, s.status].join(' ').toLowerCase().includes(q));
          if (hit) return Object.assign({}, g, { matched: ships.map((s) => s.id) });
          if (ships.length) return Object.assign({}, g, { shipments: ships, matched: ships.map((s) => s.id), filtered: true });
          return null;
        }).filter(Boolean);
      }
      const order = { overdue: 0, active: 1, pending: 2, completed: 3 };
      groups.sort((a, b) => (a.status && b.status ? order[a.status] - order[b.status] : 0) || String(a.title).localeCompare(b.title));
      return groups;
    },
    countsByStatus() {
      const c = { all: S.data.WPS.length, overdue: 0, active: 0, pending: 0, completed: 0 };
      S.data.WPS.forEach((w) => c[S.wpStatus(w)]++);
      return c;
    },

    // ---------- mutations ----------
    nextShipmentNo(sender) {
      const max = Math.max(...S.data.SHIPMENTS.map((s) => parseInt(s.no, 10) || 0));
      return `${max + 1}-${(sender || 'Team pRED').split(' ').slice(-1)[0] === 'pRED' ? 'Team pRED' : (sender || '').split(' ').slice(-1)[0]}`;
    },
    log(s, text, icon) { s.activity.push({ at: nowIso(), by: 'p1', text, icon: icon || 'edit' }); },
  };

  function byDate(a, b) { return a.date.localeCompare(b.date) || a.start.localeCompare(b.start); }
  function nowIso() {
    const t = new Date();
    return D.today + 'T' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
  }
  S.nowIso = nowIso;
  window.S = S;
})();
