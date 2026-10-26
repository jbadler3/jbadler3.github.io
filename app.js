/* CS6750 Final Prototype – flight picker (ORD → SFO). Static, no dependencies. */
(function () {
  'use strict';

  // ---------- Data (fictional flights for a class prototype) ----------
  var BAG_FEE = 35;
  var BALANCE_PER_HOUR = 25; // "Best balance": score = total price + $25 per hour of trip time
  var FLIGHTS = [
    { id: 1, dep: 360, arr: 518, dur: 278, stops: 0, layover: null, nums: ['UA 1191'], op: 'United Airlines', total1: 329 },
    { id: 2, dep: 465, arr: 800, dur: 455, stops: 1, layover: { min: 75, city: 'DEN' }, nums: ['UA 2217', 'UA 640'], op: 'United Airlines and United Express (SkyWest)', total1: 238 },
    { id: 3, dep: 605, arr: 1005, dur: 520, stops: 1, layover: { min: 110, city: 'DEN' }, nums: ['UA 1450', 'UA 2383'], op: 'United Airlines', total1: 254 },
    { id: 4, dep: 690, arr: 850, dur: 280, stops: 0, layover: null, nums: ['UA 1543'], op: 'United Airlines', total1: 289 },
    { id: 5, dep: 855, arr: 1018, dur: 283, stops: 0, layover: null, nums: ['UA 652'], op: 'United Airlines', total1: 274 },
    { id: 6, dep: 1060, arr: 1225, dur: 285, stops: 0, layover: null, nums: ['UA 2044'], op: 'United Airlines', total1: 309 }
  ];
  FLIGHTS.forEach(function (f) { f.base = f.total1 - BAG_FEE; });
  var ARRIVE_OPTIONS = [
    { v: 480, l: '8:00 AM' }, { v: 600, l: '10:00 AM' }, { v: 720, l: '12:00 PM (noon)' },
    { v: 900, l: '3:00 PM' }, { v: 1020, l: '5:00 PM' }, { v: 1440, l: 'Any time' }
  ];

  // ---------- Helpers ----------
  function byId(id) { return FLIGHTS.filter(function (f) { return f.id === id; })[0]; }
  function price(f, bags) { return f.base + BAG_FEE * bags; }
  function fmtTime(m) { var h = Math.floor(m / 60) % 24, mm = m % 60; return ((h % 12) || 12) + ':' + (mm < 10 ? '0' : '') + mm + ' ' + (h >= 12 ? 'PM' : 'AM'); }
  function fmtDur(m) { var h = Math.floor(m / 60), r = m % 60; return h ? (h + 'h' + (r ? ' ' + r + 'm' : '')) : r + 'm'; }
  function times(f) { return fmtTime(f.dep) + ' – ' + fmtTime(f.arr); }
  function stopsText(f) { return f.stops === 0 ? 'Nonstop' : '1 stop · ' + fmtDur(f.layover.min) + ' in ' + f.layover.city; }
  function bagsText(n) { return n + ' checked bag' + (n === 1 ? '' : 's'); }
  function money(n) { return '$' + Math.round(n); }
  function arriveLabel(v) { var o = ARRIVE_OPTIONS.filter(function (x) { return x.v === v; })[0]; return o ? o.l : fmtTime(v); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function score(f, bags) { return price(f, bags) + BALANCE_PER_HOUR * f.dur / 60; }

  // ---------- Guided picks (computed, never hardcoded) ----------
  function fits(f, a) { return f.arr <= a.arriveBy && (a.okStop || f.stops === 0); }
  function computePicks(a) {
    var list = FLIGHTS.filter(function (f) { return fits(f, a); });
    var res = { fits: list, cheapest: null, fastest: null, balance: null, ranked: [] };
    if (!list.length) return res;
    var b = a.bags;
    res.cheapest = list.slice().sort(function (x, y) { return price(x, b) - price(y, b) || x.dur - y.dur || x.dep - y.dep; })[0];
    res.fastest = list.slice().sort(function (x, y) { return x.dur - y.dur || price(x, b) - price(y, b) || x.dep - y.dep; })[0];
    res.ranked = list.slice().sort(function (x, y) { return score(x, b) - score(y, b) || price(x, b) - price(y, b); });
    res.balance = res.ranked[0];
    return res;
  }
  function relaxOptions(a) {
    var out = [];
    if (!a.okStop && computePicks({ arriveBy: a.arriveBy, okStop: true, bags: a.bags }).fits.length) out.push({ action: 'relax-stop', label: 'Allow a stop' });
    var later = ARRIVE_OPTIONS.filter(function (o) { return o.v > a.arriveBy && computePicks({ arriveBy: o.v, okStop: a.okStop, bags: a.bags }).fits.length; })[0];
    if (later) out.push({ action: 'relax-time', value: later.v, label: 'Arrive by ' + later.l + ' instead' });
    return out;
  }

  // ---------- Scenarios (answers are solved from the data, facilitator-only) ----------
  var SCENARIOS = [
    { id: 'S1', text: 'You need to be in San Francisco by 5 PM. You are bringing 1 checked bag. Spend as little as possible. Pick the flight you would book.',
      solve: function () { return FLIGHTS.filter(function (f) { return f.arr <= 1020; }).sort(function (x, y) { return price(x, 1) - price(y, 1); })[0].id; },
      expected: 2, note: 'Flight 2 · 7:45 AM – 1:20 PM, 1 stop in DEN, $238 with 1 bag.' },
    { id: 'S2', text: 'You want a nonstop flight that leaves after 10 AM. You are traveling with a carry-on only (no checked bags). Find the cheapest one and pick it.',
      solve: function () { return FLIGHTS.filter(function (f) { return f.stops === 0 && f.dep > 600; }).sort(function (x, y) { return price(x, 0) - price(y, 0); })[0].id; },
      expected: 5, note: 'Flight 5 · 2:15 PM – 4:58 PM nonstop, $239 with 0 bags ($274 with 1). Participant must set bags to 0.' },
    { id: 'S3', text: 'You are bringing 1 checked bag. You want the shortest trip that lands before 3 PM. Pick it.',
      solve: function () { return FLIGHTS.filter(function (f) { return f.arr < 900; }).sort(function (x, y) { return x.dur - y.dur; })[0].id; },
      expected: 1, note: 'Flight 1 · 6:00 AM nonstop, 4h 38m, $329. Trap: Flight 4 (11:30 AM) is 4h 40m.' },
    { id: 'S4', text: 'Use "Help me choose". Say you must arrive by 5 PM, a stop is OK, and you have 1 checked bag. Look at the "Best balance" pick. Tell me, in your own words, why it was recommended. Then pick the flight you would book.',
      answers: { arriveBy: 1020, okStop: true, bags: 1 },
      solve: function () { return computePicks({ arriveBy: 1020, okStop: true, bags: 1 }).balance.id; },
      expected: 5, note: 'Best balance = Flight 5 · 2:15 PM nonstop, $274. Score $274 + $25 × 4.72 h ≈ $392, lowest (next: 11:30 AM at ≈ $406; cheapest 7:45 AM ≈ $428). Good answer: "nonstop, only $36 more than the cheapest but about 3 hours shorter." The log marks the chosen flight vs this pick; mark the explanation with the buttons.' }
  ];
  var selfCheck = SCENARIOS.map(function (s) { return { id: s.id, solved: s.solve(), expected: s.expected, ok: s.solve() === s.expected }; });
  selfCheck.forEach(function (c) { if (!c.ok) console.warn('Scenario self-check failed', c); });

  // ---------- State ----------
  var HINT_KEY = 'fp_hint_seen';
  function freshState() {
    return { screen: 'entry', mode: 'all', bags: 1, field: 'stops', pins: [], open: {}, everOpened: {}, whyOpen: {},
      answers: { arriveBy: null, okStop: null }, guidedSubmitted: false, trayOpen: true, swapCandidate: null, selected: null };
  }
  var S = freshState();
  function hintSeen() { try { return sessionStorage.getItem(HINT_KEY) === '1'; } catch (e) { return false; } }
  function setHintSeen() { try { sessionStorage.setItem(HINT_KEY, '1'); } catch (e) {} }

  // ---------- Templates ----------
  var PIN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M16 3l5 5-2 1-3.5 3.5.5 4.5-1.5 1.5-4-4-5 5-1-1 5-5-4-4L7 8.5l4.5.5L15 5.5z"/></svg>';
  function pinBtn(f, ctx, pulse) {
    var on = S.pins.indexOf(f.id) >= 0;
    return '<button type="button" class="pin' + (pulse ? ' pulse' : '') + '" id="pin-' + ctx + '-' + f.id + '" data-action="pin" data-id="' + f.id + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Unpin' : 'Pin') + ' the ' + fmtTime(f.dep) + ' flight' + (on ? '' : ' to compare') + '">' + PIN_SVG + '<span>' + (on ? 'Pinned' : 'Pin') + '</span></button>';
  }
  function detailsBlock(f, ctx) {
    var key = ctx + '-' + f.id, b = S.bags;
    return '<div class="details" id="det-' + key + '"' + (S.open[key] ? '' : ' hidden') + '>' +
      '<dl><dt>Flights</dt><dd>' + f.nums.join(' + ') + '</dd>' +
      '<dt>Operated by</dt><dd>' + esc(f.op) + '</dd>' +
      '<dt>Route</dt><dd>' + (f.stops ? 'ORD → ' + f.layover.city + ' (' + fmtDur(f.layover.min) + ' layover) → SFO' : 'ORD → SFO nonstop') + ' · ' + fmtDur(f.dur) + ' total</dd>' +
      '<dt>Fare</dt><dd>Economy</dd></dl>' +
      '<div class="fares">' +
        '<div class="fare' + (b === 0 ? ' current' : '') + '">' + (b === 0 ? '<div class="tag">Matches your bags</div>' : '') + '<h4>Carry-on only</h4><div class="amt">' + money(f.base) + ' total</div><div class="air">Airline calls this “Basic Economy”: lowest price, carry-on bag only, seat assigned at check-in.</div></div>' +
        '<div class="fare' + (b >= 1 ? ' current' : '') + '">' + (b >= 1 ? '<div class="tag">Matches your bags' + (b === 2 ? ' (+ $35 for a 2nd bag = ' + money(price(f, 2)) + ')' : '') + '</div>' : '') + '<h4>1 checked bag included</h4><div class="amt">' + money(f.total1) + ' total</div><div class="air">Airline calls this “Main Cabin”: standard economy, you choose your seat, one checked bag included.</div></div>' +
      '</div></div>';
  }
  function detailsBtn(f, ctx) {
    var key = ctx + '-' + f.id;
    return '<button type="button" class="btn" id="dbtn-' + key + '" data-action="details" data-key="' + key + '" data-id="' + f.id + '" aria-expanded="' + !!S.open[key] + '" aria-controls="det-' + key + '">' + (S.open[key] ? 'Hide details' : 'Details') + '</button>';
  }
  function selectBtn(f, ctx) {
    return '<button type="button" class="btn primary" id="sel-' + ctx + '-' + f.id + '" data-action="select" data-id="' + f.id + '" aria-label="Select the ' + fmtTime(f.dep) + ' flight, ' + money(price(f, S.bags)) + '">Select</button>';
  }
  function bagSeg(idp) {
    return '<div class="seg" role="group" aria-label="Checked bags">' + [0, 1, 2].map(function (n) {
      return '<button type="button" id="' + idp + n + '" data-action="bags" data-value="' + n + '" aria-pressed="' + (S.bags === n) + '">' + n + '</button>';
    }).join('') + '</div>';
  }
  function nextWeekday() {
    var d = new Date(); var add = ((8 - d.getDay()) % 7) || 7; d.setDate(d.getDate() + add + 1); // Tuesday next week
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function header() {
    var modeToggle = S.screen === 'results' ?
      '<div class="seg" role="group" aria-label="View mode"><button type="button" id="mode-guided" data-action="mode" data-value="guided" aria-pressed="' + (S.mode === 'guided') + '">Guided</button><button type="button" id="mode-all" data-action="mode" data-value="all" aria-pressed="' + (S.mode === 'all') + '">All flights</button></div>' : '';
    return '<header class="topbar"><div class="wrap"><div class="brand">Flight <span>results</span></div>' + modeToggle + '</div></header>' +
      '<section class="search" aria-label="Your search"><div class="wrap"><span class="route">ORD → SFO</span><span class="meta">One-way · ' + nextWeekday() + ' · 1 adult</span>' +
      (S.screen !== 'confirm' ? '<div class="bags"><span class="lbl" id="bags-lbl">Checked bags ($35 each)</span>' + bagSeg('bag-') + '</div>' : '') + '</div></section>';
  }

  function entryView() {
    return '<div class="entry"><h1>How would you like to choose?</h1><p class="lead">6 flights match your search. You can switch between these anytime.</p>' +
      '<div class="choices"><button type="button" class="choice" id="choose-guided" data-action="choose" data-value="guided"><strong>Help me choose</strong><span>Answer 3 quick questions and get 3 picks.</span></button>' +
      '<button type="button" class="choice" id="choose-all" data-action="choose" data-value="all"><strong>Skip, show all flights</strong><span>See all 6 flights in one simple list.</span></button></div></div>';
  }

  function banner() {
    return '<div class="banner" role="status"><span>Prices include <strong>' + bagsText(S.bags) + '</strong>' + (S.bags === 0 ? ' (carry-on only)' : '') + '</span><span class="muted">Times are local</span></div>';
  }
  function coach() {
    if (hintSeen()) return '';
    return '<div class="coach" id="coach" role="note">' + PIN_SVG.replace('<svg', '<svg width="18" height="18"') + '<span>Pin two flights to compare</span><button type="button" class="x" id="coach-x" data-action="dismiss-hint" aria-label="Dismiss tip">×</button></div>';
  }

  function allView() {
    var showHint = !hintSeen();
    var rows = FLIGHTS.map(function (f, i) {
      var pinned = S.pins.indexOf(f.id) >= 0;
      return '<li class="row' + (pinned ? ' pinned' : '') + '" id="row-' + f.id + '" data-fid="' + f.id + '"><div class="row-main">' + pinBtn(f, 'list', showHint && i === 0) +
        '<div class="c-times"><span class="t">' + times(f) + '</span></div>' +
        '<div class="c-field">' + (S.field === 'stops' ? stopsText(f) : fmtDur(f.dur)) + '</div>' +
        '<div class="c-price">' + money(price(f, S.bags)) + '</div>' +
        '<div class="c-actions">' + detailsBtn(f, 'list') + selectBtn(f, 'list') + '</div></div>' + detailsBlock(f, 'list') + '</li>';
    }).join('');
    return banner() +
      '<div class="toolbar"><h1>All flights</h1><div><span class="muted" id="field-lbl">Show: </span><div class="seg small" role="group" aria-labelledby="field-lbl">' +
      '<button type="button" id="field-stops" data-action="field" data-value="stops" aria-pressed="' + (S.field === 'stops') + '">Stops</button>' +
      '<button type="button" id="field-time" data-action="field" data-value="time" aria-pressed="' + (S.field === 'time') + '">Trip time</button></div></div></div>' +
      coach() +
      '<div class="list" role="region" aria-label="Flight list"><div class="list-head" aria-hidden="true"><span>Pin</span><span>Depart – Arrive</span><span>' + (S.field === 'stops' ? 'Stops' : 'Trip time') + '</span><span style="text-align:right">Total</span><span></span></div>' +
      '<ul style="list-style:none;margin:0;padding:0">' + rows + '</ul></div>';
  }

  function answersComplete() { return S.answers.arriveBy !== null && S.answers.okStop !== null; }
  function guidedView() {
    var a = S.answers;
    var opts = '<option value="">Choose a time…</option>' + ARRIVE_OPTIONS.map(function (o) { return '<option value="' + o.v + '"' + (a.arriveBy === o.v ? ' selected' : '') + '>' + o.l + '</option>'; }).join('');
    var yn = function (val, label) { return '<button type="button" id="stop-' + label.toLowerCase() + '" data-action="okstop" data-value="' + val + '" aria-pressed="' + (a.okStop === val) + '">' + label + '</button>'; };
    var q = '<section class="qcard" aria-labelledby="qtitle"><h2 id="qtitle">' + (S.guidedSubmitted ? 'Your answers <span class="muted" style="font-weight:400">(change anytime – picks update)</span>' : 'Help me choose: 3 quick questions') + '</h2>' +
      '<div class="qs"><div class="q"><label for="q-arrive">1. Arrive in San Francisco by</label><select id="q-arrive" data-action="arrive">' + opts + '</select></div>' +
      '<div class="q"><span class="qlabel" id="q2l">2. OK with a stop to save money?</span><div class="seg" role="group" aria-labelledby="q2l">' + yn(true, 'Yes') + yn(false, 'No') + '</div></div>' +
      '<div class="q"><span class="qlabel" id="q3l">3. Checked bags</span>' + bagSeg('qbag-').replace('aria-label="Checked bags"', 'aria-labelledby="q3l"') + '</div></div>' +
      (S.guidedSubmitted ? '' : '<div class="qactions"><button type="button" class="btn primary" id="show-picks" data-action="show-picks"' + (answersComplete() ? '' : ' disabled') + '>Show my picks</button><button type="button" class="btn link" id="skip-guided" data-action="mode" data-value="all">Skip, show all flights</button></div>') +
      '</section>';
    if (!S.guidedSubmitted || !answersComplete()) return q;
    var ans = { arriveBy: a.arriveBy, okStop: a.okStop, bags: S.bags };
    var p = computePicks(ans);
    var fitDesc = 'flights arriving by ' + arriveLabel(a.arriveBy) + (a.okStop ? '' : ' with no stops');
    if (!p.fits.length) {
      var rel = relaxOptions(ans);
      return banner() + q + '<div class="nofit" role="alert"><h2>No flights fit all your answers</h2><p>There are no ' + fitDesc + '. Try relaxing one answer:</p><div class="acts">' +
        rel.map(function (r, i) { return '<button type="button" class="btn primary" id="relax-' + i + '" data-action="' + r.action + '"' + (r.value ? ' data-value="' + r.value + '"' : '') + '>' + r.label + '</button>'; }).join('') +
        '<button type="button" class="btn" id="nofit-all" data-action="mode" data-value="all">See all flights</button></div></div>';
    }
    var b = S.bags, n = p.fits.length;
    var reasons = {
      cheapest: function (f) { return 'Lowest total (' + money(price(f, b)) + ') of the ' + n + ' flight' + (n > 1 ? 's' : '') + ' that fit.'; },
      fastest: function (f) { return 'Shortest trip (' + fmtDur(f.dur) + ') of the ' + n + ' flight' + (n > 1 ? 's' : '') + ' that fit.'; },
      balance: function (f) {
        if (n === 1) return 'The only flight that fits.';
        var c = p.cheapest, fa = p.fastest;
        if (f === c && f === fa) return 'It is both the cheapest and the fastest that fits.';
        if (f === c) return 'Cheapest, and the faster flights cost more than the time they save is worth.';
        if (f === fa) return 'Fastest; it costs ' + money(price(f, b) - price(c, b)) + ' more than the cheapest but saves ' + fmtDur(c.dur - f.dur) + '.';
        return (f.stops === 0 ? 'Nonstop, ' : '') + money(price(f, b) - price(c, b)) + ' more than the cheapest but ' + fmtDur(c.dur - f.dur) + ' shorter.';
      }
    };
    var rules = {
      cheapest: function () { return 'Rule: the lowest total price (with ' + bagsText(b) + ') among ' + fitDesc + '. Ties go to the shorter trip.'; },
      fastest: function () { return 'Rule: the shortest total trip time (door-to-door flying time, including any layover) among ' + fitDesc + '. Ties go to the lower price.'; },
      balance: function () {
        var top = p.ranked.slice(0, 3).map(function (f) { return times(f).split(' – ')[0] + ': ' + money(price(f, b)) + ' + $25 × ' + (f.dur / 60).toFixed(1) + ' h ≈ ' + money(score(f, b)); });
        return 'Rule: among ' + fitDesc + ', we add <strong>$25 for every hour of trip time</strong> to the total price, and pick the lowest result. In other words, an hour of your time counts as $25.<br><span class="muted">Lowest scores: ' + top.join(' · ') + '</span>';
      }
    };
    var LABELS = { cheapest: 'Cheapest that fits', fastest: 'Fastest that fits', balance: 'Best balance' };
    var groups = [];
    ['cheapest', 'fastest', 'balance'].forEach(function (k) {
      var f = p[k], g = groups.filter(function (x) { return x.f === f; })[0];
      if (g) g.keys.push(k); else groups.push({ f: f, keys: [k] });
    });
    var cards = groups.map(function (g) {
      var f = g.f;
      return '<article class="pick" id="pick-' + g.keys[0] + '" data-fid="' + f.id + '" data-keys="' + g.keys.join(' ') + '" aria-label="' + g.keys.map(function (k) { return LABELS[k]; }).join(' and ') + '">' +
        '<div class="labels">' + g.keys.map(function (k) { return '<span class="plabel">' + LABELS[k] + '</span>'; }).join('') + '</div>' +
        '<div class="t">' + times(f) + '</div><div>' + stopsText(f) + ' · ' + fmtDur(f.dur) + '</div><div class="price">' + money(price(f, b)) + '</div>' +
        g.keys.map(function (k) {
          var wk = 'why-' + k;
          return '<p class="reason">' + (g.keys.length > 1 ? '<strong>' + LABELS[k] + ':</strong> ' : '') + reasons[k](f) + '</p>' +
            '<div><button type="button" class="btn link" id="' + wk + '" data-action="why" data-key="' + k + '" aria-expanded="' + !!S.whyOpen[k] + '" aria-controls="' + wk + '-body">Why?</button></div>' +
            '<div class="why" id="' + wk + '-body"' + (S.whyOpen[k] ? '' : ' hidden') + '>' + rules[k]() + '</div>';
        }).join('') +
        '<div class="acts">' + pinBtn(f, 'pick', false) + detailsBtn(f, 'pick') + selectBtn(f, 'pick') + '</div>' + detailsBlock(f, 'pick') + '</article>';
    }).join('');
    return banner() + q + coach() + '<h2>' + (groups.length === 3 ? 'Our 3 picks for you' : 'Our picks for you') + ' <span class="muted" style="font-weight:400">(' + n + ' of 6 flights fit)</span></h2><div class="picks">' + cards + '</div>' +
      '<p class="after-picks">Not quite right? <button type="button" class="btn link" id="see-all" data-action="mode" data-value="all">See all 6 flights</button></p>';
  }

  function trayView() {
    if (S.screen !== 'results' || !S.pins.length) return '';
    var b = S.bags;
    if (S.pins.length === 1) {
      var f = byId(S.pins[0]);
      return '<aside class="tray" id="tray" aria-label="Pinned flights"><div class="wrap"><div class="tray-bar"><strong>1 flight pinned</strong><span class="grow">' + times(f) + ' · ' + stopsText(f) + ' · ' + money(price(f, b)) + ' <span class="muted">— pin one more to compare</span></span>' +
        '<button type="button" class="btn" id="tray-unpin-' + f.id + '" data-action="unpin" data-id="' + f.id + '">Unpin</button>' + '<button type="button" class="btn primary" id="tray-sel-' + f.id + '" data-action="select" data-id="' + f.id + '">Select</button></div></div></aside>';
    }
    var A = byId(S.pins[0]), B = byId(S.pins[1]);
    var rowsDef = [
      ['Departs', function (f) { return fmtTime(f.dep); }],
      ['Arrives', function (f) { return fmtTime(f.arr); }],
      ['Stops', function (f) { return stopsText(f); }],
      ['Trip time', function (f) { return fmtDur(f.dur); }],
      ['Total (' + bagsText(b) + ')', function (f) { return money(price(f, b)); }],
      ['Flights', function (f) { return f.nums.join(' + '); }]
    ];
    var body = rowsDef.map(function (r) {
      var va = r[1](A), vb = r[1](B), cls = va === vb ? 'same' : 'diff';
      return '<tr><th scope="row">' + r[0] + '</th><td class="' + cls + '">' + va + '</td><td class="' + cls + '">' + vb + '</td></tr>';
    }).join('');
    var acts = function (f) { return '<td><div class="acts"><button type="button" class="btn primary" id="tray-sel-' + f.id + '" data-action="select" data-id="' + f.id + '">Select</button><button type="button" class="btn" id="tray-unpin-' + f.id + '" data-action="unpin" data-id="' + f.id + '" aria-label="Unpin the ' + fmtTime(f.dep) + ' flight">Unpin</button></div></td>'; };
    return '<aside class="tray" id="tray" aria-label="Compare pinned flights"><div class="wrap"><div class="tray-bar"><strong>Comparing 2 pinned flights</strong><span class="grow legend">Bold = different · gray = same</span>' +
      '<button type="button" class="btn" id="tray-toggle" data-action="tray-toggle" aria-expanded="' + S.trayOpen + '" aria-controls="cmp">' + (S.trayOpen ? 'Hide comparison' : 'Show comparison') + '</button></div>' +
      '<table class="cmp" id="cmp"' + (S.trayOpen ? '' : ' hidden') + '><thead><tr><th scope="col"><span class="sr-only">Attribute</span></th><th scope="col">' + times(A) + '</th><th scope="col">' + times(B) + '</th></tr></thead><tbody>' + body +
      '<tr><th scope="row"><span class="sr-only">Actions</span></th>' + acts(A) + acts(B) + '</tr></tbody></table></div></aside>';
  }

  function swapView() {
    if (S.swapCandidate === null) return '';
    var n = byId(S.swapCandidate);
    return '<div class="backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="swap-title"><h2 id="swap-title">You can compare 2 flights at a time</h2><p>To pin the <strong>' + times(n) + '</strong> flight (' + money(price(n, S.bags)) + '), which one should it replace?</p><div class="opts">' +
      S.pins.map(function (id) { var f = byId(id); return '<button type="button" class="btn" id="swap-' + id + '" data-action="swap-out" data-id="' + id + '">Replace ' + times(f) + ' · ' + stopsText(f) + ' · ' + money(price(f, S.bags)) + '</button>'; }).join('') +
      '</div><button type="button" class="btn link" id="swap-cancel" data-action="swap-cancel">Cancel, keep my 2 pins</button></div></div>';
  }

  function confirmView() {
    var f = byId(S.selected);
    return '<section class="confirm" aria-labelledby="ctitle"><h1 id="ctitle">You picked:</h1><p class="big">' + times(f) + '</p><p>' + stopsText(f) + ' · ' + fmtDur(f.dur) + ' · ' + f.nums.join(' + ') + ' · Economy</p>' +
      '<p class="total">Total ' + money(price(f, S.bags)) + ' with ' + bagsText(S.bags) + '</p><p class="muted">This is a prototype. No payment is taken.</p>' +
      '<div class="acts"><button type="button" class="btn primary" id="back" data-action="back">Back to results</button><button type="button" class="btn" id="start-over" data-action="start-over">Start over</button></div></section>';
  }

  // ---------- Render ----------
  var app = document.getElementById('app');
  function render() {
    var focusId = document.activeElement && document.activeElement.id;
    var main = S.screen === 'entry' ? entryView() : S.screen === 'confirm' ? confirmView() : (S.mode === 'guided' ? guidedView() : allView());
    app.innerHTML = header() + '<main id="main" tabindex="-1"><div class="wrap">' + main + '</div></main>' + trayView() + swapView();
    var tray = document.getElementById('tray');
    document.body.classList.toggle('has-tray', !!tray);
    if (tray) document.body.style.setProperty('--tray-h', (tray.offsetHeight + 20) + 'px');
    var el = focusId && document.getElementById(focusId);
    if (S.swapCandidate !== null) { var s = document.getElementById('swap-' + S.pins[0]); if (s && !(el && el.closest('.modal'))) s.focus(); else if (el) el.focus(); }
    else if (el) el.focus({ preventScroll: true });
    Fac.update();
  }

  // ---------- Actions ----------
  function togglePin(id) {
    var i = S.pins.indexOf(id);
    if (i >= 0) { S.pins.splice(i, 1); return; }
    Fac.mark('pin');
    setHintSeen();
    if (S.pins.length >= 2) { S.swapCandidate = id; return; }
    S.pins.push(id);
    if (S.pins.length === 2) S.trayOpen = true;
  }
  function act(btn, ev) {
    var a = btn.getAttribute('data-action'), id = +btn.getAttribute('data-id'), v = btn.getAttribute('data-value');
    switch (a) {
      case 'choose': S.screen = 'results'; S.mode = v; Fac.mode(v); window.scrollTo(0, 0); break;
      case 'mode': S.mode = v; S.screen = 'results'; Fac.mode(v); break;
      case 'bags': S.bags = +v; break;
      case 'field': S.field = v; break;
      case 'pin': togglePin(id); break;
      case 'unpin': S.pins = S.pins.filter(function (x) { return x !== id; }); break;
      case 'details':
        var k = btn.getAttribute('data-key');
        if (!S.open[k]) { if (S.everOpened[id]) Fac.mark('lookback-details'); S.everOpened[id] = true; Fac.mark('details'); }
        S.open[k] = !S.open[k]; break;
      case 'why': S.whyOpen[btn.getAttribute('data-key')] = !S.whyOpen[btn.getAttribute('data-key')]; Fac.mark('why'); break;
      case 'select': S.selected = id; S.screen = 'confirm'; S.swapCandidate = null; Fac.select(id); window.scrollTo(0, 0); break;
      case 'dismiss-hint': setHintSeen(); break;
      case 'swap-out': S.pins = S.pins.map(function (x) { return x === id ? S.swapCandidate : x; }); S.swapCandidate = null; S.trayOpen = true; break;
      case 'swap-cancel': S.swapCandidate = null; break;
      case 'tray-toggle': S.trayOpen = !S.trayOpen; break;
      case 'okstop': S.answers.okStop = v === 'true'; break;
      case 'show-picks': S.guidedSubmitted = true; break;
      case 'relax-stop': S.answers.okStop = true; break;
      case 'relax-time': S.answers.arriveBy = +v; break;
      case 'back': S.screen = 'results'; break;
      case 'start-over': var keep = hintSeen(); S = freshState(); if (keep) setHintSeen(); window.scrollTo(0, 0); break;
      default: return;
    }
    render();
  }
  document.addEventListener('click', function (ev) {
    if (ev.target.closest('#fac-root')) return;
    Fac.click();
    var btn = ev.target.closest('[data-action]');
    if (btn && btn.tagName === 'BUTTON' && !btn.disabled) act(btn, ev);
  });
  document.addEventListener('change', function (ev) {
    if (ev.target.id === 'q-arrive') { S.answers.arriveBy = ev.target.value === '' ? null : +ev.target.value; render(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && S.swapCandidate !== null) { S.swapCandidate = null; render(); }
  });

  // ---------- Facilitator mode (?facilitator=1 or Shift+F) ----------
  var Fac = (function () {
    var LOG_KEY = 'fp_fac_log';
    var root = document.getElementById('fac-root');
    var open = false, scen = SCENARIOS[0].id, task = null, log = [], timer = null, lastY = 0, maxY = 0;
    try { log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { log = []; }
    function save() { try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) {} }
    function sc() { return SCENARIOS.filter(function (s) { return s.id === scen; })[0]; }
    function secs(t) { return Math.round(((t.end || Date.now()) - t.start) / 100) / 10; }
    function startTask() {
      if (task) finish(null);
      resetProto();
      task = { scenario: scen, start: Date.now(), end: null, clicks: 0, detailsOpens: 0, detailsReopens: 0, scrollUps: 0, whyOpens: 0, modes: [], firstMode: '', pinUsed: false, pinCount: 0, chosen: null, expected: sc().solve(), correct: null, explanation: '' };
      maxY = lastY = window.scrollY;
      clearInterval(timer); timer = setInterval(update, 1000);
      draw();
    }
    function finish(chosen) {
      if (!task) return;
      task.end = Date.now(); task.chosen = chosen;
      task.correct = chosen === null ? null : chosen === task.expected;
      var t = task, row = { scenario: t.scenario, started: new Date(t.start).toISOString(), seconds: secs(t), clicks: t.clicks,
        lookBacks: t.detailsReopens + t.scrollUps, detailsReopens: t.detailsReopens, scrollUps: t.scrollUps, detailsOpens: t.detailsOpens, whyOpens: t.whyOpens,
        firstMode: t.firstMode, modesUsed: t.modes.join('+'), pinUsedUnprompted: t.pinUsed, pinActions: t.pinCount,
        chosenFlight: chosen, chosenDesc: chosen ? times(byId(chosen)) + ' ' + money(price(byId(chosen), S.bags)) + ' (' + bagsText(S.bags) + ')' : 'abandoned',
        expectedFlight: t.expected, correct: t.correct === null ? 'n/a' : (t.correct ? 'correct' : 'incorrect'), bagsAtChoice: S.bags, explanation: '' };
      log.push(row); save(); task = null; clearInterval(timer); draw();
    }
    function resetProto() {
      try { sessionStorage.removeItem(HINT_KEY); } catch (e) {}
      S = freshState(); window.scrollTo(0, 0); render();
    }
    function download(name, text, type) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function csv() {
      if (!log.length) return '';
      var cols = Object.keys(log[0]);
      return cols.join(',') + '\n' + log.map(function (r) { return cols.map(function (c) { var v = String(r[c] === undefined ? '' : r[c]); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    }
    function liveHtml() {
      if (!task) return '<div class="live">No task running. Pick a scenario and press <b>Start task</b>.</div>';
      return '<div class="live" id="fac-live"><b>Running ' + task.scenario + '</b> · ' + Math.round(secs(task)) + ' s<br>Clicks ' + task.clicks + ' · Look-backs ' + (task.detailsReopens + task.scrollUps) + ' (details re-opens ' + task.detailsReopens + ', scroll-ups ' + task.scrollUps + ')<br>Mode(s) ' + (task.modes.join(' + ') || '–') + ' · Pin used ' + (task.pinUsed ? 'yes' : 'no') + '</div>';
    }
    function draw() {
      document.body.classList.toggle('fac-open', open);
      if (!open) { root.innerHTML = ''; return; }
      var s = sc();
      root.innerHTML = '<aside class="fac" id="fac" aria-label="Facilitator panel"><button type="button" class="close" id="fac-close">Close (Shift+F)</button><h2>Facilitator</h2>' +
        '<label for="fac-scen">Scenario</label><select id="fac-scen">' + SCENARIOS.map(function (x) { return '<option' + (x.id === scen ? ' selected' : '') + '>' + x.id + '</option>'; }).join('') + '</select>' +
        '<p><b>Read aloud:</b></p><div class="script" id="fac-script">' + esc(s.text) + '</div>' +
        '<div class="row2"><button type="button" class="go" id="fac-start">Start task</button><button type="button" id="fac-end">End task (abandon)</button><button type="button" id="fac-reset">Reset prototype</button></div>' +
        '<div id="fac-livewrap">' + liveHtml() + '</div>' +
        '<details><summary>Answer key (don’t share screen)</summary><p id="fac-answer">' + esc(s.note) + '<br>Solved from data: flight ' + s.solve() + '.</p></details>' +
        (log.length && log[log.length - 1].scenario === 'S4' ? '<div class="row2">S4 explanation: <button type="button" id="fac-exp-ok">Correct</button><button type="button" id="fac-exp-bad">Incorrect</button></div>' : '') +
        '<h2 style="margin-top:12px">Log (' + log.length + ')</h2><div class="row2"><button type="button" id="fac-csv">Export CSV</button><button type="button" id="fac-json">Export JSON</button><button type="button" id="fac-clear">Clear log</button></div>' +
        '<table id="fac-log"><thead><tr><th>#</th><th>Task</th><th>s</th><th>Clicks</th><th>Look-b.</th><th>Mode</th><th>Pin</th><th>Pick</th><th>Result</th></tr></thead><tbody>' +
        log.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td>' + r.scenario + '</td><td>' + r.seconds + '</td><td>' + r.clicks + '</td><td>' + r.lookBacks + '</td><td>' + r.modesUsed + '</td><td>' + (r.pinUsedUnprompted ? 'Y' : 'N') + '</td><td>' + (r.chosenFlight || '–') + '</td><td class="' + (r.correct === 'correct' ? 'ok' : r.correct === 'incorrect' ? 'bad' : '') + '">' + r.correct + (r.explanation ? ' / expl ' + r.explanation : '') + '</td></tr>'; }).join('') +
        '</tbody></table><p style="color:#999">Look-backs = re-opening Details on a flight already viewed + scrolling back up ≥ 250 px from the furthest point reached.</p></aside>';
    }
    root.addEventListener('click', function (ev) {
      var id = ev.target.id;
      if (id === 'fac-close') toggle(false);
      else if (id === 'fac-start') startTask();
      else if (id === 'fac-end') finish(null);
      else if (id === 'fac-reset') { if (task) finish(null); resetProto(); draw(); }
      else if (id === 'fac-csv') download('prototype-log.csv', csv(), 'text/csv');
      else if (id === 'fac-json') download('prototype-log.json', JSON.stringify(log, null, 2), 'application/json');
      else if (id === 'fac-clear') { if (confirm('Clear all logged tasks?')) { log = []; save(); draw(); } }
      else if (id === 'fac-exp-ok' || id === 'fac-exp-bad') { log[log.length - 1].explanation = id === 'fac-exp-ok' ? 'correct' : 'incorrect'; save(); draw(); }
    });
    root.addEventListener('change', function (ev) { if (ev.target.id === 'fac-scen') { scen = ev.target.value; draw(); } });
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y > maxY) maxY = y;
      if (task && maxY - y >= 250) { task.scrollUps++; maxY = y; update(); }
      lastY = y;
    }, { passive: true });
    function toggle(v) { open = v === undefined ? !open : v; draw(); }
    document.addEventListener('keydown', function (ev) {
      var tag = (ev.target.tagName || '').toLowerCase();
      if (ev.shiftKey && (ev.key === 'F' || ev.key === 'f') && tag !== 'input' && tag !== 'textarea' && tag !== 'select') { ev.preventDefault(); toggle(); }
    });
    function update() { if (!open) return; var w = document.getElementById('fac-livewrap'); if (w) w.innerHTML = liveHtml(); }
    if (/[?&]facilitator=1\b/.test(location.search)) open = true;
    return {
      init: draw, update: update,
      click: function () { if (task) task.clicks++; },
      mark: function (k) { if (!task) return; if (k === 'pin') { task.pinUsed = true; task.pinCount++; } if (k === 'details') task.detailsOpens++; if (k === 'lookback-details') task.detailsReopens++; if (k === 'why') task.whyOpens++; update(); },
      mode: function (m) { if (!task) return; var name = m === 'guided' ? 'guided' : 'all'; if (!task.firstMode) task.firstMode = name; if (task.modes.indexOf(name) < 0) task.modes.push(name); },
      select: function (id) { if (task) finish(id); },
      get log() { return log; }, get task() { return task; }, start: startTask, setScenario: function (s) { scen = s; draw(); }, toggle: toggle
    };
  })();

  // Expose for testing / console
  window.Proto = { FLIGHTS: FLIGHTS, price: price, computePicks: computePicks, relaxOptions: relaxOptions, SCENARIOS: SCENARIOS, selfCheck: selfCheck, Fac: Fac, state: function () { return S; } };
  render();
  Fac.init();
})();
