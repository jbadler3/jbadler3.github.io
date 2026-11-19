/* Prototype B: #47 Shopping progress tracker */
(function () {
  const M = window.MALL, { esc, loc, routeStats, bestOrder, directions, mapSVG, fmtMin } = window.Mall;
  const P = window.Proto;
  const J = o => esc(JSON.stringify(o));
  const CATS = ["All", "Food", "Clothing", "Shoes", "Electronics", "Pharmacy", "Restrooms", "Other"];
  const catOf = st => CATS.indexOf(st.cat) > 0 ? st.cat : "Other";
  const dwell = id => { const c = loc(id).cat; return c === "Food" ? 10 : c === "Restrooms" ? 3 : 6; };

  /* trip helpers */
  const up = t => t.stops.filter(x => x.status === "upcoming");
  const pos = t => { const d = t.stops.filter(x => x.status === "done"); return d.length ? d[d.length - 1].id : "entrance"; };
  function reorder(t) {
    const fixed = t.stops.filter(x => x.status !== "upcoming");
    const ord = bestOrder(up(t).map(x => x.id), "time", pos(t));
    t.stops = fixed.concat(ord.map(id => ({ id, status: "upcoming" })));
  }
  const remaining = t => { const ids = up(t).map(x => x.id); return routeStats(ids, pos(t)).minutes + ids.reduce((a, id) => a + dwell(id), 0); };
  function setStatus(s, id, status, toastMsg) {
    const t = s.trip, st = t.stops.find(x => x.id === id), prevStatus = st.status;
    // move the item to the end of the "handled" part so the timeline reads in order
    t.stops = t.stops.filter(x => x !== st);
    st.status = status; t.stops.push(st); reorder(t);
    if (toastMsg) P.toast(toastMsg, "Undo", () => { st.status = prevStatus; reorder(t); P.rerender(); });
  }

  const statusBadge = st => st === "done" ? '<span class="badge fill">Done</span>' : st === "skipped" ? '<span class="badge gray">Skipped</span>' : '<span class="badge">Upcoming</span>';

  const screens = {
    home(s) {
      const rows = s.plan.map(id => { const st = loc(id); return '<div class="li"><div class="grow"><div class="t">' + esc(st.name) + '</div><div class="s">' + esc(st.cat) + " · Floor " + st.floor + '</div></div><button class="btn sm ghost" data-action="removePlan" data-arg="' + id + '" data-label="Remove stop: ' + esc(st.name) + '">Remove</button></div>'; }).join("");
      return {
        title: "Plan your trip",
        body: '<p class="big">Where do you need to go?</p><p class="muted">Add the stores you want to visit. During your trip, check off each stop and we will keep track of what is left.</p>' +
          (s.plan.length ? "<h2>Your stops (" + s.plan.length + ')</h2><div class="list">' + rows + "</div>" : '<div class="empty">No stops yet.</div>') +
          '<button class="btn block" data-go="add">+ Add stops</button>',
        foot: '<button class="btn primary" data-go="review" ' + (s.plan.length ? "" : "disabled") + ">Review trip" + (s.plan.length ? " (" + s.plan.length + ")" : "") + "</button>"
      };
    },
    add(s, p) {
      const inTrip = !!p.trip, chosen = inTrip ? s.trip.stops.map(x => x.id) : s.plan;
      const list = M.stores.filter(st => s.cat === "All" || catOf(st) === s.cat).map(st => {
        const on = chosen.indexOf(st.id) >= 0;
        return '<button class="li" data-action="toggle" data-arg="' + st.id + '" data-label="' + (on ? "Unselect: " : "Select: ") + esc(st.name) + '"><span class="check ' + (on ? "on" : "") + '">' + (on ? "✓" : "") + '</span><div class="grow"><div class="t">' + esc(st.name) + '</div><div class="s">' + esc(st.cat) + " · Floor " + st.floor + "</div></div></button>";
      }).join("");
      return {
        title: inTrip ? "Add a stop" : "Add stops",
        body: '<div class="chips">' + CATS.map(c => '<button class="chip ' + (s.cat === c ? "on" : "") + '" data-action="cat" data-arg="' + c + '" data-label="Category: ' + c + '">' + c + "</button>").join("") + "</div>" +
          '<div class="list">' + list + "</div>",
        foot: '<button class="btn primary" data-back>Done · ' + chosen.length + " selected</button>"
      };
    },
    review(s) {
      const ord = bestOrder(s.plan, "time", "entrance"), rs = routeStats(ord, "entrance"), total = rs.minutes + ord.reduce((a, id) => a + dwell(id), 0);
      return {
        title: "Review trip",
        body: '<div class="tiles"><div class="tile"><b>' + ord.length + '</b><span>stops</span></div><div class="tile"><b>' + fmtMin(total) + '</b><span>total, with time in stores</span></div></div>' +
          '<p class="muted">Ordered to keep walking short, starting at the Main Entrance.</p>' +
          '<div class="list">' + ord.map((id, i) => '<div class="li"><div class="num">' + (i + 1) + '</div><div class="grow"><div class="t">' + esc(loc(id).name) + '</div><div class="s">Floor ' + loc(id).floor + " · " + fmtMin(rs.legs[i].minutes) + " walk · about " + dwell(id) + " min there</div></div></div>").join("") + "</div>",
        foot: '<button class="btn primary" data-action="start">Start trip</button>'
      };
    },
    trip(s) {
      const t = s.trip, n = t.stops.length, done = t.stops.filter(x => x.status === "done").length, sk = t.stops.filter(x => x.status === "skipped").length;
      const u = up(t), next = u[0];
      const pct = n ? Math.round((done + sk) / n * 100) : 0;
      let nextCard = "";
      if (next) {
        const st = loc(next.id), L = routeStats([next.id], pos(t)).legs[0];
        nextCard = '<div class="card accent"><div class="muted">Next stop</div><p class="big">' + esc(st.name) + '</p><div class="small">Floor ' + st.floor + " · " + fmtMin(L.minutes) + " walk" + (L.change ? " · " + L.connector.name + " " + L.dir : "") + "</div>" +
          '<div class="row" style="margin-top:10px"><button class="btn primary" style="flex:2" data-action="done" data-arg="' + next.id + '" data-label="Done: ' + esc(st.name) + '">✓ Done</button><button class="btn" style="flex:1" data-action="skip" data-arg="' + next.id + '" data-label="Skip: ' + esc(st.name) + '">Skip</button></div>' +
          '<button class="link" data-go="directions">Directions ›</button></div>';
      } else nextCard = '<div class="card accent"><b>No stops left.</b><div class="small">You can finish your trip or add back skipped stops.</div><button class="btn primary block" data-go="summary">See trip summary</button></div>';
      return {
        title: "My trip", noBack: true,
        right: '<button class="btn sm ghost" data-go="list" data-label="All stops (header)">All stops</button>',
        body: '<div class="row"><b class="grow">' + done + " of " + n + " done" + (sk ? " · " + sk + " skipped" : "") + "</b><span class=\"small\">" + pct + "%</span></div>" +
          '<div class="progress" style="margin:6px 0 10px"><div style="width:' + pct + '%"></div></div>' +
          '<div class="tiles"><div class="tile"><b>' + u.length + '</b><span>stops left</span></div><div class="tile"><b>' + (u.length ? fmtMin(remaining(t)) : "0 min") + "</b><span>left, about</span></div></div>" +
          nextCard +
          (u.length > 1 ? "<h2>Coming up</h2><div class=\"list\">" + u.slice(1).map((x, i) => '<div class="li"><div class="num">' + (i + 2) + '</div><div class="grow"><div class="t">' + esc(loc(x.id).name) + '</div><div class="s">Floor ' + loc(x.id).floor + "</div></div></div>").join("") + "</div>" : "") +
          (sk ? '<button class="link" data-go="list">' + sk + " skipped stop" + (sk > 1 ? "s" : "") + " · add back ›</button>" : ""),
        foot: '<button class="btn ghost" data-go="list">See all stops</button><button class="btn ghost" data-go="add" data-p="' + J({ trip: 1 }) + '">+ Add stop</button>'
      };
    },
    directions(s) {
      const t = s.trip, next = up(t)[0]; if (!next) return screens.trip(s);
      const from = pos(t), st = loc(next.id), seq = [from, next.id];
      return {
        title: "To " + st.short,
        body: '<p class="small">From ' + esc(loc(from).name) + " · " + fmtMin(routeStats([next.id], from).minutes) + "</p>" +
          mapSVG(loc(from).floor, { seq, showStart: true }) + (loc(from).floor !== st.floor ? mapSVG(st.floor, { seq }) : "") +
          '<ol class="steps">' + directions(from, next.id).map(x => '<li class="' + (x.ride ? "ride" : "") + '">' + esc(x.text) + "</li>").join("") + "</ol>",
        foot: '<button class="btn primary" data-back>Back to my trip</button>'
      };
    },
    list(s) {
      const t = s.trip;
      const row = x => {
        const st = loc(x.id);
        const btn = x.status === "done" ? '<button class="btn sm ghost" data-action="undo" data-arg="' + x.id + '" data-label="Undo done: ' + esc(st.name) + '">Undo</button>'
          : x.status === "skipped" ? '<button class="btn sm" data-action="addback" data-arg="' + x.id + '" data-label="Add back: ' + esc(st.name) + '">Add back</button>'
          : '<button class="btn sm ghost" data-action="skip" data-arg="' + x.id + '" data-label="Skip: ' + esc(st.name) + '">Skip</button>';
        return '<div class="li ' + (x.status === "skipped" ? "off" : "") + '"><div class="grow"><div class="t">' + esc(st.name) + '</div><div class="s">Floor ' + st.floor + " · " + statusBadge(x.status) + "</div></div>" + btn + "</div>";
      };
      return {
        title: "All stops",
        body: '<p class="muted">Done and skipped stops are listed first, then what is left in walking order.</p><div class="list">' + t.stops.map(row).join("") + "</div>" +
          '<button class="btn ghost block" data-go="add" data-p="' + J({ trip: 1 }) + '">+ Add a stop</button>',
        foot: '<button class="btn" data-go="summary">End trip</button><button class="btn primary" data-back>Back to trip</button>'
      };
    },
    summary(s) {
      const t = s.trip, d = t.stops.filter(x => x.status === "done"), sk = t.stops.filter(x => x.status === "skipped"), u = up(t);
      const mins = routeStats(d.map(x => x.id), "entrance").minutes + d.reduce((a, x) => a + dwell(x.id), 0);
      return {
        title: "Trip summary",
        body: '<div class="hero"><div class="icon">✓</div><p class="big">' + (u.length ? "Trip ended early" : "Trip complete") + '</p><p class="muted">' + d.length + " done · " + sk.length + " skipped" + (u.length ? " · " + u.length + " not visited" : "") + " · about " + fmtMin(mins) + "</p></div>" +
          "<h2>Done</h2>" + (d.length ? '<div class="list">' + d.map(x => '<div class="li"><span class="check on">✓</span><div class="grow">' + esc(loc(x.id).name) + "</div></div>").join("") + "</div>" : '<p class="muted">None</p>') +
          (sk.length ? "<h2>Skipped</h2><div class=\"list\">" + sk.map(x => '<div class="li off"><span class="check"></span><div class="grow">' + esc(loc(x.id).name) + "</div></div>").join("") + "</div>" +
            '<button class="btn block" data-action="revisit">Go to skipped stops now</button>' : ""),
        foot: '<button class="btn primary" data-action="finish">Finish</button>'
      };
    }
  };

  const actions = {
    removePlan(s, v) { s.plan = s.plan.filter(x => x !== v); P.rerender(); },
    cat(s, v) { s.cat = v; P.rerender(); },
    toggle(s, v) {
      if (P.cur.params.trip) {
        const t = s.trip, ex = t.stops.find(x => x.id === v);
        if (ex) { if (ex.status === "upcoming") t.stops = t.stops.filter(x => x !== ex); else { P.toast("This stop is already done or skipped. Use All stops to change it."); return; } }
        else t.stops.push({ id: v, status: "upcoming" });
        reorder(t);
      } else s.plan = s.plan.indexOf(v) >= 0 ? s.plan.filter(x => x !== v) : s.plan.concat([v]);
      P.rerender();
    },
    start(s) { s.trip = { stops: bestOrder(s.plan, "time", "entrance").map(id => ({ id, status: "upcoming" })) }; P.root("trip"); },
    done(s, v) { setStatus(s, v, "done", "Marked " + loc(v).name + " done."); if (!up(s.trip).length) P.go("summary"); else P.rerender(); },
    skip(s, v) { setStatus(s, v, "skipped", "Skipped " + loc(v).name + "."); if (P.cur.id === "trip" && !up(s.trip).length) P.go("summary"); else P.rerender(); },
    undo(s, v) { setStatus(s, v, "upcoming"); P.rerender(); P.toast(loc(v).name + " is back on your list."); },
    addback(s, v) { setStatus(s, v, "upcoming"); P.rerender(); P.toast(loc(v).name + " added back to your route."); },
    revisit(s) { s.trip.stops.forEach(x => { if (x.status === "skipped") x.status = "upcoming"; }); reorder(s.trip); P.root("trip"); },
    finish() { P.restart(); }
  };

  const presets = {
    trip4(s) { s.plan = ["care", "volt", "techhub", "bean"]; s.trip = { stops: bestOrder(s.plan, "time", "entrance").map(id => ({ id, status: "upcoming" })) }; P.root("trip"); }
  };
  const tasks = [
    { id: "B1", label: "Plan a trip to 4 stores, including the pharmacy, and start it" },
    { id: "B2", label: "Complete your trip and skip the pharmacy", preset: "trip4", hint: "Starts on an active trip: Volt Electronics, Bean & Leaf Coffee, CarePlus Pharmacy, Tech Hub." },
    { id: "B3", label: "Skip Bean & Leaf Coffee, then add it back and finish the trip", preset: "trip4", hint: "Starts on the same active trip." },
    { id: "B0", label: "Free exploration (think aloud)" }
  ];
  Fac.init({ proto: "B", name: "Prototype B: Shopping progress tracker", tasks, onTaskStart: t => { P.restart(); if (t && t.preset) P.applyPreset(t.preset); } });
  P.init({ tag: "Prototype B", home: "home", initState: () => ({ plan: [], trip: null, cat: "All" }), screens, actions, presets });
})();
