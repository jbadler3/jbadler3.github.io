/* Shared routing math, map drawing, and a tiny screen router for the prototypes. */
(function () {
  const M = window.MALL;
  const UNIT_M = 3, WALK_M_PER_MIN = 72; // 1 hallway unit = 3 m; 1.2 m/s walking

  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const loc = id => id === "entrance" ? M.entrance : M.stores.find(s => s.id === id);
  const conn = id => M.connectors.find(c => c.id === id);
  const fmtMin = m => Math.max(1, Math.round(m)) + " min";
  const money = n => "$" + n.toFixed(2);

  function leg(a, b) {
    if (a.floor === b.floor) {
      const u = Math.abs(a.x - b.x), meters = u * UNIT_M, walkMin = meters / WALK_M_PER_MIN;
      return { units: u, meters, walkMin, rideMin: 0, minutes: walkMin, change: 0, connector: null };
    }
    let best = null;
    const floors = Math.abs(a.floor - b.floor);
    M.connectors.forEach(c => {
      const u = Math.abs(a.x - c.x) + Math.abs(c.x - b.x), meters = u * UNIT_M, walkMin = meters / WALK_M_PER_MIN;
      const rideMin = c.type === "escalator" ? 0.75 * floors : 1.0 + 0.25 * floors;
      const minutes = walkMin + rideMin;
      if (!best || minutes < best.minutes) best = { units: u, meters, walkMin, rideMin, minutes, change: 1, connector: c, dir: b.floor > a.floor ? "up" : "down", fromFloor: a.floor, toFloor: b.floor };
    });
    return best;
  }

  function routeStats(ids, startId) {
    let prev = loc(startId || "entrance");
    const legs = []; let meters = 0, minutes = 0, walkMin = 0, changes = 0;
    ids.forEach(id => {
      const L = Object.assign({ from: prev.id, to: id }, leg(prev, loc(id)));
      legs.push(L); meters += L.meters; minutes += L.minutes; walkMin += L.walkMin; changes += L.change;
      prev = loc(id);
    });
    return { legs, meters, minutes, walkMin, changes };
  }

  function perms(a) {
    if (a.length <= 1) return [a.slice()];
    const out = [];
    a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => out.push([x].concat(p))));
    return out;
  }

  /* mode: "time" (fastest), "walk" (fewest meters), "floors" (fewest floor changes, then fastest) */
  function bestOrder(ids, mode, startId) {
    if (ids.length <= 1) return ids.slice();
    const key = s => mode === "floors" ? s.changes * 1e6 + s.minutes : mode === "walk" ? s.meters * 1e3 + s.minutes : s.minutes;
    let cands = ids.length <= 7 ? perms(ids) : [ids.slice()];
    let best = null, bestK = Infinity;
    cands.forEach(p => { const k = key(routeStats(p, startId)); if (k < bestK - 1e-9) { bestK = k; best = p; } });
    return best;
  }

  /* Plain-language walking directions between two places. */
  function heading(x1, x2) { return x2 >= x1 ? "right" : "left"; }
  function sideWord(store, head) {
    if (store.side === "mid") return "ahead";
    return (store.side === "top") === (head === "right") ? "on your left" : "on your right";
  }
  function passing(floor, x1, x2, excludeIds) {
    const lo = Math.min(x1, x2) + 4, hi = Math.max(x1, x2) - 4, mid = (x1 + x2) / 2;
    const c = M.stores.filter(s => s.floor === floor && s.x > lo && s.x < hi && s.cat !== "Restrooms" && excludeIds.indexOf(s.id) < 0)
      .sort((p, q) => Math.abs(p.x - mid) - Math.abs(q.x - mid));
    return c[0];
  }
  function nearest(floor, x, excludeIds) {
    return M.stores.filter(s => s.floor === floor && excludeIds.indexOf(s.id) < 0).sort((p, q) => Math.abs(p.x - x) - Math.abs(q.x - x))[0];
  }
  function walkStep(floor, x1, x2, toName, ex) {
    const m = Math.round(Math.abs(x2 - x1) * UNIT_M / 5) * 5;
    if (m < 5) return null;
    const p = passing(floor, x1, x2, ex);
    return "Head " + heading(x1, x2) + " along the main hallway for about " + m + " m" + (p ? ", past " + p.name : "") + (toName ? ", to " + toName : "") + ".";
  }
  function floorChange(a, b) {
    const L = leg(a, b); if (!L.change) return null;
    const c = L.connector;
    const near = nearest(a.floor, c.x, [a.id, b.id]);
    const arrive = nearest(b.floor, c.x, [b.id]);
    const head = heading(c.x, b.x);
    return {
      connector: c, dir: L.dir, from: a.floor, to: b.floor,
      nearText: c.name + " is next to " + near.name + ".",
      rideText: "Take " + c.name + " " + L.dir + " to Floor " + b.floor + (c.type === "escalator" && Math.abs(b.floor - a.floor) > 1 ? " (stay on for " + Math.abs(b.floor - a.floor) + " floors)" : "") + ".",
      exitText: "Exit on Floor " + b.floor + ".",
      arriveText: "When you step off, " + arrive.name + " is right there. Turn " + head + " toward " + b.name + ".",
      photoLabel: "Photo: " + c.name + " (" + L.dir + "), next to " + near.short,
      arrivePhotoLabel: "Photo: view on arrival at Floor " + b.floor + ", " + arrive.short + " in sight"
    };
  }
  function directions(fromId, toId) {
    const a = loc(fromId), b = loc(toId), steps = [];
    const ex = [a.id, b.id];
    if (a.floor === b.floor) {
      const s = walkStep(a.floor, a.x, b.x, null, ex); if (s) steps.push({ text: s });
      steps.push({ text: b.name + " is " + sideWord(b, heading(a.x, b.x)) + "." });
    } else {
      const fc = floorChange(a, b), c = fc.connector;
      const s1 = walkStep(a.floor, a.x, c.x, c.name, ex); if (s1) steps.push({ text: s1 });
      steps.push({ text: fc.rideText, ride: true });
      const s2 = walkStep(b.floor, c.x, b.x, null, ex); if (s2) steps.push({ text: s2 });
      steps.push({ text: b.name + " is " + sideWord(b, heading(c.x, b.x)) + "." });
    }
    return steps;
  }

  /* ---------- 2D floor map (SVG) ---------- */
  const SX = x => 20 + x * 3, CY = 124, KY = 105; // CY = path line, KY = connector row
  function door(s) { return s.side === "top" ? [SX(s.x), 88] : s.side === "bottom" ? [SX(s.x), 142] : [SX(s.x), CY]; }
  function wrapLabel(t) {
    const w = t.split(" "); if (t.length <= 9 || w.length === 1) return [t];
    const half = Math.ceil(w.length / 2); return [w.slice(0, half).join(" "), w.slice(half).join(" ")];
  }
  /* opts: { seq: [startId, stopId...], numbered: true, focusLeg: index or null } */
  function mapSVG(floor, opts) {
    opts = opts || {};
    const seq = opts.seq || [], stops = seq.slice(1);
    let s = '<svg viewBox="0 0 340 228" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,Arial" role="img" aria-label="Floor ' + floor + ' map">';
    s += '<rect x="0" y="0" width="340" height="228" fill="#fff"/>';
    s += '<rect x="8" y="95" width="324" height="40" fill="#f1f1f1" stroke="#bbb"/>';
    s += '<text x="170" y="222" font-size="10" fill="#888" text-anchor="middle">Floor ' + floor + ' · main hallway (west → east)</text>';
    M.stores.filter(st => st.floor === floor).forEach(st => {
      const on = stops.indexOf(st.id) >= 0, x = SX(st.x) - 24, y = st.side === "top" ? 22 : 142;
      s += '<rect x="' + x + '" y="' + y + '" width="48" height="66" rx="4" fill="' + (on ? "#dbe7fd" : "#fafafa") + '" stroke="' + (on ? "#2563eb" : "#999") + '" stroke-width="' + (on ? 2 : 1) + '"/>';
      const lines = wrapLabel(st.short);
      lines.forEach((ln, i) => { s += '<text x="' + SX(st.x) + '" y="' + (y + 30 + i * 11 - (lines.length - 1) * 5) + '" font-size="8" text-anchor="middle" fill="' + (on ? "#1e4fc2" : "#444") + '">' + esc(ln) + "</text>"; });
    });
    M.connectors.forEach(c => {
      s += '<rect x="' + (SX(c.x) - 9) + '" y="' + (KY - 8) + '" width="18" height="16" rx="3" fill="#fff" stroke="#555" stroke-dasharray="' + (c.type === "elevator" ? "0" : "3 2") + '"/>';
      s += '<text x="' + SX(c.x) + '" y="' + (KY + 3) + '" font-size="8" text-anchor="middle" fill="#333" font-weight="700">' + (c.type === "elevator" ? "EL" : c.id === "escA" ? "A" : "B") + "</text>";
    });
    if (floor === 1) s += '<path d="M8 113 L20 124 L8 135" fill="none" stroke="#333" stroke-width="2"/><text x="12" y="146" font-size="8" fill="#333">Entrance</text>';
    // route path
    const segs = []; let tags = "";
    for (let i = 1; i < seq.length; i++) {
      if (opts.focusLeg != null && opts.focusLeg !== i - 1) continue;
      const a = loc(seq[i - 1]), b = loc(seq[i]), L = leg(a, b);
      if (a.floor === b.floor && a.floor === floor) segs.push([door(a), [SX(a.x), CY], [SX(b.x), CY], door(b)]);
      else if (a.floor !== b.floor) {
        const cx = SX(L.connector.x);
        if (a.floor === floor) { segs.push([door(a), [SX(a.x), CY], [cx, CY], [cx, KY + 8]]); tags += connTag(cx, "to F" + b.floor + (L.dir === "up" ? " ↑" : " ↓"), SX(a.x)); }
        if (b.floor === floor) { segs.push([[cx, KY + 8], [cx, CY], [SX(b.x), CY], door(b)]); tags += connTag(cx, "from F" + a.floor, SX(b.x)); }
      }
    }
    segs.forEach(p => { s += '<polyline points="' + p.map(q => q.join(",")).join(" ") + '" fill="none" stroke="#2563eb" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>'; });
    s += tags;
    // start marker
    if (seq.length) {
      const st = loc(seq[0]);
      if (st.floor === floor && (opts.focusLeg == null || opts.focusLeg === 0 || opts.showStart)) {
        const d = door(st); s += '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="6" fill="#fff" stroke="#111" stroke-width="2.5"/><circle cx="' + d[0] + '" cy="' + d[1] + '" r="2.5" fill="#111"/>';
      }
    }
    if (opts.youAt) { const y = loc(opts.youAt); if (y.floor === floor) { const d = door(y); s += '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="6" fill="#fff" stroke="#111" stroke-width="2.5"/><circle cx="' + d[0] + '" cy="' + d[1] + '" r="2.5" fill="#111"/>'; } }
    stops.forEach((id, i) => {
      const st = loc(id); if (st.floor !== floor) return;
      if (opts.focusLeg != null && opts.focusLeg !== i) return;
      const d = door(st);
      s += '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="8" fill="#2563eb"/><text x="' + d[0] + '" y="' + (d[1] + 3.5) + '" font-size="10" fill="#fff" text-anchor="middle" font-weight="700">' + (opts.labels ? opts.labels[i] : i + 1) + "</text>";
    });
    s += "</svg>";
    return '<div class="map">' + s + "</div>";
  }
  function connTag(cx, t, otherX) {
    const x0 = otherX > cx ? cx - 55 : cx + 11; // put the tag on the side away from the path
    return '<rect x="' + x0 + '" y="' + (KY - 7) + '" width="44" height="13" rx="3" fill="#2563eb"/><text x="' + (x0 + 22) + '" y="' + (KY + 2.5) + '" font-size="8" fill="#fff" text-anchor="middle" font-weight="700">' + t + "</text>";
  }

  window.Mall = { esc, loc, conn, leg, routeStats, bestOrder, directions, floorChange, mapSVG, fmtMin, money, UNIT_M };

  /* ---------- Tiny screen router ---------- */
  const Proto = {
    stack: [], cur: null, state: null, cfg: null,
    init(cfg) {
      this.cfg = cfg; this.state = cfg.initState();
      this.el = document.getElementById("screen");
      this.phone = document.getElementById("phone");
      this.phone.addEventListener("click", e => this.onClick(e));
      this.phone.addEventListener("keydown", e => {
        if (e.key === "Enter" && e.target.dataset && e.target.dataset.enter) {
          e.preventDefault(); const fn = cfg.actions[e.target.dataset.enter]; fn && fn(this.state, e.target.value, e.target, this);
        }
      });
      this.reset();
    },
    onClick(e) {
      const t = e.target.closest("[data-back],[data-go],[data-action]");
      if (!t || t.disabled || !this.phone.contains(t)) return;
      if (t.hasAttribute("data-back")) return this.back();
      if (t.dataset.go) return this.go(t.dataset.go, t.dataset.p ? JSON.parse(t.dataset.p) : {});
      const fn = this.cfg.actions[t.dataset.action];
      if (fn) fn(this.state, t.dataset.arg, t, this);
    },
    go(id, params) { if (this.cur) this.stack.push(this.cur); this.cur = { id, params: params || {} }; this.render(); },
    replace(id, params) { this.cur = { id, params: params || {} }; this.render(); },
    root(id, params) { this.stack = []; this.cur = { id: id || this.cfg.home, params: params || {} }; this.render(); },
    back() {
      if (!this.stack.length) return;
      if (window.Fac) Fac.back(this.cur.id);
      this.cur = this.stack.pop(); this.render();
    },
    reset() { this.stack = []; this.cur = { id: this.cfg.home, params: {} }; this.hideToast(); this.render(); },
    restart() { this.state = this.cfg.initState(); this.reset(); },
    applyPreset(name) { const p = this.cfg.presets && this.cfg.presets[name]; if (p) p(this.state, this); },
    rerender() { const st = this.el.querySelector(".body"), top = st ? st.scrollTop : 0; this.render(true); const b = this.el.querySelector(".body"); if (b) b.scrollTop = top; },
    render(silent) {
      const fn = this.cfg.screens[this.cur.id];
      const o = fn(this.state, this.cur.params, this);
      const showBack = this.stack.length > 0 && !o.noBack;
      this.el.innerHTML =
        '<div class="status"><span>9:41</span><span class="tag">' + esc(this.cfg.tag) + '</span><span>▮▮▮</span></div>' +
        (o.title != null ? '<header class="hdr">' + (showBack ? '<button class="back" data-back aria-label="Back" data-label="Back">‹ Back</button>' : "") + "<h1>" + esc(o.title) + "</h1>" + (o.right || "") + "</header>" : "") +
        '<main class="body">' + o.body + "</main>" + (o.foot ? '<footer class="foot">' + o.foot + "</footer>" : "");
      this.el.dataset.screen = this.cur.id;
      if (!silent && window.Fac) Fac.screen(this.cur.id, o.title);
    },
    toast(msg, actLabel, actFn) {
      const t = document.getElementById("toast");
      t.innerHTML = '<span class="grow">' + esc(msg) + "</span>" + (actLabel ? '<button data-label="Toast: ' + esc(actLabel) + '">' + esc(actLabel) + "</button>" : "");
      t.classList.add("show");
      if (actLabel) t.querySelector("button").onclick = () => { this.hideToast(); actFn(); };
      clearTimeout(this._tt); this._tt = setTimeout(() => this.hideToast(), 5000);
    },
    hideToast() { const t = document.getElementById("toast"); if (t) t.classList.remove("show"); }
  };
  window.Proto = Proto;
})();
