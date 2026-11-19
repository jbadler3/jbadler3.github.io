/* Prototype C: #40 Floor-aware stop ordering */
(function () {
  const M = window.MALL, { esc, loc, routeStats, bestOrder, directions, floorChange, mapSVG, fmtMin } = window.Mall;
  const P = window.Proto;
  const J = o => esc(JSON.stringify(o));
  const MODES = { floors: "Fewest floor changes", walk: "Shortest walk" };
  const order = (s, mode) => bestOrder(s.stops, mode || s.mode, "entrance");
  function runs(ord) { // consecutive groups of stops on the same floor, with the leg index where each group starts
    const out = [];
    ord.forEach((id, i) => { const f = loc(id).floor; if (!out.length || out[out.length - 1].floor !== f) out.push({ floor: f, start: i, ids: [] }); out[out.length - 1].ids.push(id); });
    return out;
  }
  const changeWord = n => n === 0 ? "no floor changes" : n === 1 ? "1 floor change" : n + " floor changes";

  function fcCard(ord, k) {
    const a = k ? ord[k - 1] : "entrance", fc = floorChange(loc(a), loc(ord[k]));
    return '<button class="fc" data-go="change" data-p="' + J({ k }) + '" data-label="Floor change card: to Floor ' + fc.to + '"><span class="ic">' + (fc.dir === "up" ? "↑" : "↓") + '</span><span class="grow"><b>Floor change: ' + esc(fc.connector.name) + " " + fc.dir + " to Floor " + fc.to + '</b><br><span class="small">' + esc(fc.nearText) + ' Tap for details.</span></span><span class="chev">›</span></button>';
  }

  const screens = {
    home(s) {
      const by = M.floors.map(f => ({ f, ids: s.stops.filter(id => loc(id).floor === f) })).filter(g => g.ids.length);
      return {
        title: "Plan a multi-floor trip",
        body: '<p class="big">Which stores do you need?</p><p class="muted">Add stores on any floor. We will group them by floor so you change floors as few times as possible.</p>' +
          (s.stops.length ? by.map(g => '<div class="group"><div class="gh">Floor ' + g.f + '<span class="badge">' + g.ids.length + " stop" + (g.ids.length > 1 ? "s" : "") + "</span></div>" +
            g.ids.map(id => '<div class="li"><div class="grow">' + esc(loc(id).name) + '</div><button class="btn sm ghost" data-action="remove" data-arg="' + id + '" data-label="Remove stop: ' + esc(loc(id).name) + '">Remove</button></div>').join("") + "</div>").join("")
            : '<div class="empty">No stops yet.</div>') +
          '<button class="btn block" data-go="add">+ Add stops</button>',
        foot: '<button class="btn primary" data-go="plan" ' + (s.stops.length >= 2 ? "" : "disabled") + ">Plan route" + (s.stops.length ? " (" + s.stops.length + ")" : "") + "</button>"
      };
    },
    add(s) {
      return {
        title: "Add stops",
        body: '<p class="muted">Stores are listed by floor.</p>' + M.floors.map(f => '<div class="group"><div class="gh">Floor ' + f + "</div>" +
          M.stores.filter(st => st.floor === f).map(st => { const on = s.stops.indexOf(st.id) >= 0; return '<button class="li" data-action="toggle" data-arg="' + st.id + '" data-label="' + (on ? "Unselect: " : "Select: ") + esc(st.name) + '"><span class="check ' + (on ? "on" : "") + '">' + (on ? "✓" : "") + '</span><div class="grow"><div class="t">' + esc(st.name) + '</div><div class="s">' + esc(st.cat) + "</div></div></button>"; }).join("") + "</div>").join(""),
        foot: '<button class="btn primary" data-back>Done · ' + s.stops.length + " selected</button>"
      };
    },
    plan(s) {
      const ord = order(s), rs = routeStats(ord, "entrance"), g = runs(ord);
      let groups = "";
      g.forEach((r, gi) => {
        if (gi > 0 || r.floor !== M.entrance.floor) groups += fcCard(ord, r.start);
        groups += '<div class="group"><div class="gh">Floor ' + r.floor + '<span class="badge">' + r.ids.length + " stop" + (r.ids.length > 1 ? "s" : "") + "</span></div>" +
          r.ids.map((id, j) => '<div class="li"><div class="num accent">' + (r.start + j + 1) + '</div><div class="grow"><div class="t">' + esc(loc(id).name) + '</div><div class="s">' + fmtMin(rs.legs[r.start + j].minutes) + " walk</div></div></div>").join("") + "</div>";
      });
      return {
        title: "Your route",
        body: '<div class="seg" role="tablist">' + Object.keys(MODES).map(m => '<button class="' + (s.mode === m ? "on" : "") + '" data-action="mode" data-arg="' + m + '" data-label="Mode: ' + MODES[m] + '">' + MODES[m] + "</button>").join("") + "</div>" +
          '<div class="tiles"><div class="tile"><b>' + rs.changes + '</b><span>floor changes</span></div><div class="tile"><b>' + fmtMin(rs.minutes) + '</b><span>total time</span></div><div class="tile"><b>' + Math.round(rs.meters) + ' m</b><span>walking</span></div></div>' +
          '<div class="row"><span class="small grow">Start: Main Entrance, Floor 1</span><button class="link" data-go="compare">Compare options ›</button></div>' +
          groups +
          '<button class="link" data-go="map" data-p="' + J({ f: loc(ord[0]).floor }) + '">View route on map ›</button>',
        foot: '<button class="btn primary" data-action="start">Start route</button>'
      };
    },
    compare(s) {
      const o = { floors: order(s, "floors"), walk: order(s, "walk") }, st = { floors: routeStats(o.floors, "entrance"), walk: routeStats(o.walk, "entrance") };
      const best = (k, lowIsBest) => { const a = st.floors[k], b = st.walk[k]; return Math.abs(a - b) < 0.01 ? ["", ""] : (a < b) ? ["best", ""] : ["", "best"]; };
      const row = (label, k, fmt) => { const b = best(k); return "<tr><th>" + label + '</th><td class="' + b[0] + '">' + fmt(st.floors[k]) + '</td><td class="' + b[1] + '">' + fmt(st.walk[k]) + "</td></tr>"; };
      const seqTxt = ord => ord.map((id, i) => (i + 1) + ". " + esc(loc(id).short) + " (F" + loc(id).floor + ")").join("<br>");
      return {
        title: "Compare options",
        body: '<p class="muted">Same stops, two ways to order them. The better value in each row is in blue.</p>' +
          '<table class="cmp"><tr><th></th><th>Fewest floor changes</th><th>Shortest walk</th></tr>' +
          row("Floor changes", "changes", v => v) + row("Walking", "meters", v => Math.round(v) + " m") + row("Total time", "minutes", fmtMin) +
          "<tr><th>Order</th><td>" + seqTxt(o.floors) + "</td><td>" + seqTxt(o.walk) + "</td></tr></table>" +
          (o.floors.join() === o.walk.join() ? '<p class="small">For these stops, both options give the same route.</p>' : ""),
        foot: '<button class="btn ' + (s.mode === "floors" ? "primary" : "ghost") + '" data-action="use" data-arg="floors">Use fewest changes</button><button class="btn ' + (s.mode === "walk" ? "primary" : "ghost") + '" data-action="use" data-arg="walk">Use shortest walk</button>'
      };
    },
    change(s, p) {
      const ord = order(s), k = p.k, a = k ? ord[k - 1] : "entrance", b = ord[k], fc = floorChange(loc(a), loc(b));
      const all = runs(ord).filter((r, gi) => gi > 0 || r.floor !== M.entrance.floor), idx = all.findIndex(r => r.start === k) + 1;
      return {
        title: "Floor change " + idx + " of " + all.length,
        body: '<div class="row"><span class="badge">Floor ' + fc.from + '</span><b>' + (fc.dir === "up" ? "↑" : "↓") + '</b><span class="badge fill">Floor ' + fc.to + "</span></div>" +
          '<p class="big">Take ' + esc(fc.connector.name) + " " + fc.dir + "</p>" +
          '<div class="ph" style="min-height:150px"><span>' + esc(fc.photoLabel) + "</span></div>" +
          '<ol class="steps"><li>' + esc(fc.nearText) + '</li><li class="ride">' + esc(fc.rideText) + "</li><li><b>" + esc(fc.exitText) + "</b></li></ol>" +
          "<h2>On arrival you will see</h2>" +
          '<div class="ph" style="min-height:100px"><span>' + esc(fc.arrivePhotoLabel) + "</span></div><p>" + esc(fc.arriveText) + "</p>",
        foot: p.nav ? '<button class="btn primary" data-go="nav" data-p="' + J({ i: k }) + '">I\'m on Floor ' + fc.to + "</button>" : '<button class="btn primary" data-back>Back to route</button>'
      };
    },
    nav(s, p) {
      const ord = order(s), i = p.i, id = ord[i], prev = i ? ord[i - 1] : "entrance", st = loc(id), seq = ["entrance"].concat(ord);
      const r = runs(ord).find(x => i >= x.start && i < x.start + x.ids.length), pos = i - r.start + 1;
      return {
        title: "Stop " + (i + 1) + " of " + ord.length,
        body: '<div class="card accent" style="padding:8px 12px"><b>Floor ' + st.floor + "</b> · stop " + pos + " of " + r.ids.length + " on this floor</div>" +
          '<p class="muted">Next stop</p><p class="big">' + esc(st.name) + "</p><p class=\"small\">" + fmtMin(routeStats([id], prev).minutes) + " from " + esc(loc(prev).name) + "</p>" +
          mapSVG(st.floor, { seq, focusLeg: i, showStart: true, youAt: loc(prev).floor === st.floor ? prev : null, labels: ord.map((x, j) => j + 1) }) +
          '<ol class="steps">' + directions(prev, id).map(x => '<li class="' + (x.ride ? "ride" : "") + '">' + esc(x.text) + "</li>").join("") + "</ol>",
        foot: '<button class="btn primary" data-action="arrive" data-arg="' + i + '">Arrived at ' + esc(st.short) + "</button>"
      };
    },
    map(s, p) {
      const ord = order(s), f = p.f || 1;
      return {
        title: "Route map",
        body: '<div class="tabs">' + M.floors.map(n => '<button class="' + (n === f ? "on" : "") + '" data-action="floor" data-arg="' + n + '">Floor ' + n + "</button>").join("") + "</div>" +
          mapSVG(f, { seq: ["entrance"].concat(ord) }) +
          '<p class="small"><b>' + MODES[s.mode] + ":</b> " + changeWord(routeStats(ord, "entrance").changes) + ". Blue tags show where you change floors.</p>" +
          '<p class="small"><b>Legend:</b> ○ start · numbered circles = stops · A/B = escalators · EL = elevator</p>'
      };
    },
    done(s) {
      const ord = order(s), rs = routeStats(ord, "entrance");
      return {
        title: "Route complete", noBack: true,
        body: '<div class="hero"><div class="icon">✓</div><p class="big">You visited all ' + ord.length + ' stops</p><p class="muted">' + changeWord(rs.changes) + " · about " + fmtMin(rs.minutes) + " · " + Math.round(rs.meters) + " m</p></div>" +
          runs(ord).map(r => '<div class="group"><div class="gh">Floor ' + r.floor + "</div>" + r.ids.map(id => '<div class="li"><span class="check on">✓</span><div class="grow">' + esc(loc(id).name) + "</div></div>").join("") + "</div>").join(""),
        foot: '<button class="btn primary" data-action="finish">Plan a new trip</button>'
      };
    }
  };

  const actions = {
    remove(s, v) { s.stops = s.stops.filter(x => x !== v); P.rerender(); },
    toggle(s, v) { s.stops = s.stops.indexOf(v) >= 0 ? s.stops.filter(x => x !== v) : s.stops.concat([v]); P.rerender(); },
    mode(s, v) { if (s.mode !== v) { s.mode = v; P.rerender(); P.toast(MODES[v] + ": " + changeWord(routeStats(order(s), "entrance").changes) + "."); } },
    use(s, v) { s.mode = v; P.back(); },
    floor(s, v) { P.replace("map", { f: +v }); },
    start(s) { const ord = order(s); if (loc(ord[0]).floor !== M.entrance.floor) P.go("change", { k: 0, nav: 1 }); else P.go("nav", { i: 0 }); },
    arrive(s, v) {
      const ord = order(s), i = +v + 1;
      if (i >= ord.length) P.root("done");
      else if (loc(ord[i]).floor !== loc(ord[i - 1]).floor) P.go("change", { k: i, nav: 1 });
      else P.go("nav", { i });
    },
    finish() { P.restart(); }
  };
  const presets = { four(s) { s.stops = ["volt", "hartwell", "thread", "sunny"]; P.go("plan"); } };
  const tasks = [
    { id: "C1", label: "Plan a route visiting 4 stores on 2 floors with the fewest floor changes", hint: "Any 4 stores across 2 floors. Success = Plan screen with Fewest floor changes selected." },
    { id: "C2", label: "Compare the two route options and say which one walks less and how many floor changes it has", preset: "four", hint: "Starts on the Plan screen with Volt Electronics, Hartwell, Threadline, Sunny Days. Answer: Shortest walk, 2 floor changes." },
    { id: "C3", label: "Start the route and find out which escalator or elevator to take up to Floor 2", preset: "four", hint: "Answer (fewest floor changes): Escalator B up, next to CarePlus Pharmacy." },
    { id: "C0", label: "Free exploration (think aloud)" }
  ];
  Fac.init({ proto: "C", name: "Prototype C: Floor-aware stop ordering", tasks, onTaskStart: t => { P.restart(); if (t && t.preset) P.applyPreset(t.preset); } });
  P.init({ tag: "Prototype C", home: "home", initState: () => ({ stops: [], mode: "floors" }), screens, actions, presets });
})();
