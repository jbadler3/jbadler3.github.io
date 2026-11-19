/* Prototype A: #41 Reserve-ahead stops */
(function () {
  const M = window.MALL, { esc, loc, routeStats, bestOrder, directions, mapSVG, fmtMin, money } = window.Mall;
  const P = window.Proto;
  const J = o => esc(JSON.stringify(o));

  function findItem(q) {
    q = (q || "").toLowerCase().trim(); if (!q) return null;
    for (const k in M.items) {
      const it = M.items[k];
      if (it.keywords.some(w => q.indexOf(w) >= 0 || w.indexOf(q) >= 0) || it.name.toLowerCase().indexOf(q) >= 0) return k;
    }
    return null;
  }
  const code = (k, st) => { let h = 7; (k + st).split("").forEach(c => h = (h * 31 + c.charCodeAt(0)) % 9973); return "PU-" + (1000 + h % 9000); };
  const stockOf = (k, st) => M.items[k].stock.find(x => x.store === st);
  const walkFromEntrance = st => routeStats([st], "entrance").minutes;
  const stockBadge = q => q === 0 ? '<span class="badge gray">Out of stock</span>' : q <= 2 ? '<span class="badge">Low stock (' + q + ")</span>" : '<span class="badge accent">In stock (' + q + ")</span>";
  function routeOrder(s) { const ids = [...new Set(s.res.map(r => r.store))]; return bestOrder(ids, "time", "entrance"); }
  const resAt = (s, st) => s.res.filter(r => r.store === st);

  const screens = {
    home(s) {
      const n = s.res.length;
      return {
        title: "Find & reserve",
        body:
          '<p class="big">What do you need today?</p>' +
          '<p class="muted">Search for an item. See which stores have it in stock, reserve it, and pick it up on your route.</p>' +
          '<div class="search"><input id="q" type="search" placeholder="e.g. phone charger" data-enter="search" data-label="Search box" autocomplete="off"><button class="btn primary" data-action="search" data-label="Search button">Search</button></div>' +
          "<h2>Popular searches</h2>" +
          '<div class="chips"><button class="chip" data-action="chip" data-arg="phone charger">Phone charger</button><button class="chip" data-action="chip" data-arg="running socks">Running socks</button><button class="chip" data-action="chip" data-arg="sunscreen">Sunscreen</button><button class="chip" data-action="chip" data-arg="water bottle">Water bottle</button></div>' +
          "<h2>My pickups</h2>" +
          (n ? '<button class="card li" style="border:1.5px solid var(--line)" data-go="pickups" data-label="My pickups card"><div class="grow"><div class="t">' + n + " item" + (n > 1 ? "s" : "") + " reserved</div><div class=\"s\">" + esc(s.res.map(r => M.items[r.item].name).join(", ")) + '</div></div><span class="chev">›</span></button>'
             : '<div class="empty">No reserved items yet.<br>Reserved items become stops on your route.</div>'),
        foot: n ? '<button class="btn ghost" data-go="pickups">My pickups (' + n + ')</button><button class="btn primary" data-go="route">View route</button>' : ""
      };
    },
    results(s, p) {
      const k = findItem(p.q);
      if (!k) return {
        title: "Search results",
        body: '<div class="empty">No stores found for \u201c' + esc(p.q) + '\u201d.</div><p class="muted">Try one of these:</p><div class="chips"><button class="chip" data-action="chip" data-arg="phone charger">Phone charger</button><button class="chip" data-action="chip" data-arg="running socks">Running socks</button><button class="chip" data-action="chip" data-arg="sunscreen">Sunscreen</button></div>'
      };
      const it = M.items[k];
      const rows = it.stock.slice().sort((a, b) => (a.qty === 0) - (b.qty === 0) || walkFromEntrance(a.store) - walkFromEntrance(b.store)).map(x => {
        const st = loc(x.store), mins = fmtMin(walkFromEntrance(x.store)), reserved = s.res.some(r => r.item === k && r.store === x.store);
        const inner = '<div class="grow"><div class="t">' + esc(st.name) + '</div><div class="s">Floor ' + st.floor + " · " + mins + " walk · " + money(x.price) + "</div></div>" + (reserved ? '<span class="badge fill">Reserved</span>' : stockBadge(x.qty));
        return x.qty === 0 ? '<div class="li off" data-label="Result (out of stock): ' + esc(st.name) + '">' + inner + "</div>"
          : '<button class="li" data-go="item" data-p="' + J({ k, store: x.store }) + '" data-label="Result: ' + esc(st.name) + '">' + inner + '<span class="chev">›</span></button>';
      }).join("");
      return {
        title: "Results",
        body: '<p class="t"><b>' + esc(it.name) + '</b></p><p class="muted">' + it.stock.filter(x => x.qty > 0).length + " of " + it.stock.length + " stores have it in stock. Sorted by walking time from the Main Entrance.</p>" +
          '<div class="list">' + rows + "</div>"
      };
    },
    item(s, p) {
      const it = M.items[p.k], x = stockOf(p.k, p.store), st = loc(p.store);
      const here = s.res.find(r => r.item === p.k && r.store === p.store), other = s.res.find(r => r.item === p.k && r.store !== p.store);
      return {
        title: "Item details",
        body: '<div class="ph" style="min-height:140px"><span>Product image</span></div>' +
          '<p class="big">' + esc(it.name) + "</p><p class=\"big\" style=\"font-size:18px\">" + money(x.price) + "</p>" +
          '<div class="card"><div class="kv"><span>Store</span><b>' + esc(st.name) + '</b></div><div class="kv"><span>Location</span><span>Floor ' + st.floor + " · " + fmtMin(walkFromEntrance(p.store)) + ' walk</span></div><div class="kv"><span>Stock</span>' + stockBadge(x.qty) + '</div><div class="kv"><span>Pickup</span><span>Front counter, ready in about 10 min</span></div><div class="kv"><span>Held for</span><span>24 hours, pay at pickup</span></div></div>' +
          (other ? '<p class="muted">You already reserved this item at ' + esc(loc(other.store).name) + ". Reserving here will replace it.</p>" : ""),
        foot: here ? '<button class="btn" disabled>Reserved</button><button class="btn primary" data-go="pickups">My pickups</button>'
          : '<button class="btn primary" data-action="reserve" data-arg="' + p.k + "|" + p.store + '">Reserve for pickup</button>'
      };
    },
    reserved(s, p) {
      const r = s.res.find(x => x.id === p.rid); if (!r) return screens.pickups(s);
      const st = loc(r.store), idx = routeOrder(s).indexOf(r.store) + 1;
      return {
        title: "Reserved", noBack: true,
        body: '<div class="hero"><div class="icon">✓</div><p class="big">Item reserved</p><p class="muted">' + esc(M.items[r.item].name) + " at " + esc(st.name) + "</p></div>" +
          '<p class="center small">Your pickup code</p><div class="code">' + r.code + "</div>" +
          '<div class="card accent"><b>Added to your route as stop ' + idx + " of " + routeOrder(s).length + '.</b><div class="small">Floor ' + st.floor + ". We will show this code when you arrive.</div></div>",
        foot: '<button class="btn ghost" data-action="another">Find another item</button><button class="btn primary" data-go="pickups">My pickups</button>'
      };
    },
    pickups(s) {
      const rows = s.res.map(r => {
        const st = loc(r.store);
        return '<div class="li"><div class="grow"><div class="t">' + esc(M.items[r.item].name) + '</div><div class="s">' + esc(st.name) + " · Floor " + st.floor + " · " + money(r.price) + '</div><div class="s"><span class="badge accent">Ready for pickup</span> <span class="code sm">' + r.code + '</span></div></div><button class="btn sm ghost" data-action="cancel" data-arg="' + r.id + '" data-label="Cancel reservation: ' + esc(M.items[r.item].name) + '">Cancel</button></div>';
      }).join("");
      return {
        title: "My pickups",
        body: s.res.length ? '<p class="muted">Each store becomes one stop on your route.</p><div class="list">' + rows + '</div><button class="btn ghost block" data-action="another">+ Reserve another item</button>'
          : '<div class="empty">No reserved items yet.</div><button class="btn primary block" data-action="another">Search for an item</button>',
        foot: s.res.length ? '<button class="btn primary" data-go="route">Plan my route (' + routeOrder(s).length + " stop" + (routeOrder(s).length > 1 ? "s" : "") + ")</button>" : ""
      };
    },
    route(s) {
      const ord = routeOrder(s), rs = routeStats(ord, "entrance");
      if (!ord.length) return { title: "Your route", body: '<div class="empty">Reserve an item to build a route.</div><button class="btn primary block" data-action="another">Search for an item</button>' };
      const list = ord.map((id, i) => {
        const st = loc(id), L = rs.legs[i];
        return '<div class="li"><div class="num accent">' + (i + 1) + '</div><div class="grow"><div class="t">' + esc(st.name) + ' <span class="badge">F' + st.floor + '</span></div><div class="s">' + esc(resAt(s, id).map(r => M.items[r.item].name).join(", ")) + '</div><div class="s">' + fmtMin(L.minutes) + " walk" + (L.change ? " · " + L.connector.name + " " + L.dir : "") + ' · <span class="badge accent">Ready</span></div></div></div>';
      }).join("");
      return {
        title: "Your route",
        body: '<div class="tiles"><div class="tile"><b>' + ord.length + '</b><span>pickup stops</span></div><div class="tile"><b>' + fmtMin(rs.minutes) + '</b><span>walking</span></div><div class="tile"><b>' + rs.changes + '</b><span>floor changes</span></div></div>' +
          '<p class="muted">Starting at the Main Entrance. Stops are ordered for the shortest trip.</p><div class="list">' + list + "</div>" +
          '<button class="link" data-go="map" data-p="' + J({ f: loc(ord[0]).floor }) + '">View route on map ›</button>',
        foot: '<button class="btn primary" data-go="nav" data-p="' + J({ i: 0 }) + '">Start route</button>'
      };
    },
    map(s, p) {
      const ord = routeOrder(s), f = p.f || 1;
      return {
        title: "Route map",
        body: '<div class="tabs">' + M.floors.map(n => '<button class="' + (n === f ? "on" : "") + '" data-action="floor" data-arg="' + n + '">Floor ' + n + "</button>").join("") + "</div>" +
          mapSVG(f, { seq: ["entrance"].concat(ord) }) +
          '<p class="small"><b>Legend:</b> ○ start · numbered circles = pickup stops · A/B = escalators · EL = elevator</p>' +
          '<div class="list">' + ord.map((id, i) => '<div class="li"><div class="num accent">' + (i + 1) + '</div><div class="grow">' + esc(loc(id).name) + '</div><span class="badge">F' + loc(id).floor + "</span></div>").join("") + "</div>"
      };
    },
    nav(s, p) {
      const ord = routeOrder(s), i = p.i, id = ord[i]; if (!id) return screens.done(s);
      const prev = i ? ord[i - 1] : "entrance", st = loc(id), pf = loc(prev).floor, seq = ["entrance"].concat(ord);
      const steps = directions(prev, id);
      return {
        title: "Stop " + (i + 1) + " of " + ord.length,
        body: '<p class="muted">Next pickup</p><p class="big">' + esc(st.name) + ' <span class="badge">Floor ' + st.floor + "</span></p>" +
          '<p class="small">' + fmtMin(routeStats([id], prev).minutes) + " walk · " + esc(resAt(s, id).map(r => M.items[r.item].name).join(", ")) + ' · <span class="badge accent">Ready for pickup</span></p>' +
          mapSVG(pf, { seq, focusLeg: i, showStart: true, youAt: prev, labels: ord.map((x, j) => j + 1) }) +
          (pf !== st.floor ? mapSVG(st.floor, { seq, focusLeg: i, labels: ord.map((x, j) => j + 1) }) : "") +
          '<h2>Directions</h2><ol class="steps">' + steps.map(x => '<li class="' + (x.ride ? "ride" : "") + '">' + esc(x.text) + "</li>").join("") + "</ol>",
        foot: '<button class="btn primary" data-go="pickup" data-p="' + J({ i }) + '">I\'m at ' + esc(st.short) + "</button>"
      };
    },
    pickup(s, p) {
      const ord = routeOrder(s), id = ord[p.i], st = loc(id), rs = resAt(s, id);
      return {
        title: "Pickup at " + st.short,
        body: '<div class="center" style="margin-top:6px"><span class="badge fill" style="font-size:14px;padding:4px 10px">Ready for pickup</span></div>' +
          '<p class="center muted">Show this code at the front counter</p>' +
          rs.map(r => '<div class="code">' + r.code + '</div><p class="center small">' + esc(M.items[r.item].name) + " · " + money(r.price) + " · pay at counter</p>").join("") +
          '<button class="link" data-action="problem">Problem with this pickup?</button>',
        foot: '<button class="btn primary" data-action="picked" data-arg="' + p.i + '">Picked up' + (p.i + 1 < ord.length ? ", next stop" : "") + "</button>"
      };
    },
    done(s) {
      const ord = routeOrder(s), rs = routeStats(ord, "entrance"), total = s.res.reduce((a, r) => a + r.price, 0);
      return {
        title: "Trip complete", noBack: true,
        body: '<div class="hero"><div class="icon">✓</div><p class="big">All items picked up</p><p class="muted">' + s.res.length + " items from " + ord.length + " stores</p></div>" +
          '<div class="list">' + s.res.map(r => '<div class="li"><span class="check on">✓</span><div class="grow"><div class="t">' + esc(M.items[r.item].name) + '</div><div class="s">' + esc(loc(r.store).name) + "</div></div><b>" + money(r.price) + "</b></div>").join("") + "</div>" +
          '<div class="card"><div class="kv"><span>Total paid</span><b>' + money(total) + '</b></div><div class="kv"><span>Walking</span><span>about ' + fmtMin(rs.minutes) + "</span></div></div>",
        foot: '<button class="btn primary" data-action="finish">Back to start</button>'
      };
    }
  };

  const actions = {
    search(s, v, el) {
      const q = (el.tagName === "INPUT" ? el.value : document.getElementById("q").value).trim();
      if (!q) { P.toast("Type an item to search."); return; }
      P.go("results", { q });
    },
    chip(s, v) { P.go("results", { q: v }); },
    reserve(s, v) {
      const [k, store] = v.split("|"), x = stockOf(k, store);
      s.res = s.res.filter(r => r.item !== k);
      const r = { id: k + "-" + store, item: k, store, price: x.price, code: code(k, store) };
      s.res.push(r); P.go("reserved", { rid: r.id });
    },
    another() { P.root("home"); },
    cancel(s, v) { const r = s.res.find(x => x.id === v); s.res = s.res.filter(x => x.id !== v); P.rerender(); if (r) P.toast("Reservation canceled.", "Undo", () => { s.res.push(r); P.rerender(); }); },
    floor(s, v) { P.replace("map", { f: +v }); },
    problem() { P.toast("Ask a staff member at the counter. Your item is held for 24 hours."); },
    picked(s, v) { const i = +v, n = routeOrder(s).length; if (i + 1 < n) P.go("nav", { i: i + 1 }); else P.root("done"); },
    finish() { P.restart(); }
  };

  const tasks = [
    { id: "A1", label: "Reserve a phone charger and start your route" },
    { id: "A2", label: "Reserve running socks at the closest store which has them in stock", hint: "Success = StrideRun Shoes (Floor 1)." },
    { id: "A3", label: "Reserve sunscreen and a phone charger, then show the pickup code at your first stop", hint: "Success = reaches the Pickup screen for stop 1." },
    { id: "A0", label: "Free exploration (think aloud)" }
  ];

  Fac.init({ proto: "A", name: "Prototype A: Reserve-ahead stops", tasks, onTaskStart: () => P.restart() });
  P.init({ tag: "Prototype A", home: "home", initState: () => ({ res: [] }), screens, actions });
})();
