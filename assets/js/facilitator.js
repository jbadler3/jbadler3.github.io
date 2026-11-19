/* Facilitator / test panel. Logs every tap inside the phone, task timing, marks, notes,
   and post-task ratings. Everything stays in this browser's localStorage. Nothing is sent anywhere. */
(function () {
  const KEY = "mallNavProto.v1";
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const nowIso = () => new Date().toISOString();
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  const db = Object.assign({ version: 1, session_id: uid(), participant: "", events: [], tasks: [], active: {} }, load());
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn("Storage failed", e); } }

  const Fac = {
    proto: null, protoName: "", tasks: [], curScreen: null, onTaskStart: null,

    init(cfg) {
      this.proto = cfg.proto; this.protoName = cfg.name; this.tasks = cfg.tasks; this.onTaskStart = cfg.onTaskStart;
      this.build();
      const phone = document.getElementById("phone");
      phone.addEventListener("click", e => this.onTap(e), true); // capture: logs the screen the tap happened on
      const qs = new URLSearchParams(location.search);
      if (qs.get("facilitator") === "1") this.open(true);
      document.addEventListener("keydown", e => {
        if (e.shiftKey && (e.key === "F" || e.key === "f") && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) this.open(!this.isOpen());
      });
      setInterval(() => this.tick(), 100);
      this.refresh();
      save();
    },
    active() { return db.active[this.proto] || null; },
    lastRun() { for (let i = db.tasks.length - 1; i >= 0; i--) if (db.tasks[i].prototype === this.proto) return db.tasks[i]; return null; },
    target() { return this.active() || this.lastRun(); },

    /* ---------- logging ---------- */
    log(type, label, detail) {
      const a = this.active();
      const ev = {
        seq: db.events.length + 1, session_id: db.session_id, participant: db.participant || "", prototype: this.proto,
        run_id: a ? a.run_id : "", task_id: a ? a.task_id : "", type, timestamp: nowIso(),
        ms_since_task_start: a ? Date.now() - a.start_ms : "", screen: this.curScreen || "", label: label || "", detail: detail || ""
      };
      db.events.push(ev); save(); this.refresh();
      return ev;
    },
    onTap(e) {
      const el = e.target.closest("[data-label],button,a,input,select,textarea,label,[data-go],[data-action]");
      let label, dead = false;
      if (el && document.getElementById("phone").contains(el)) {
        label = el.dataset.label || el.getAttribute("aria-label") ||
          (el.tagName === "INPUT" ? "input: " + (el.placeholder || el.name || el.type) : (el.innerText || el.value || "").trim().replace(/\s+/g, " ").slice(0, 70)) || el.tagName.toLowerCase();
      } else { label = "(no target)"; dead = true; }
      const a = this.active();
      if (a) { a.taps++; if (dead) a.dead_taps++; }
      this.log(dead ? "dead_tap" : "tap", label, "x=" + Math.round(e.clientX) + " y=" + Math.round(e.clientY));
    },
    screen(id, title) {
      this.curScreen = id;
      const a = this.active();
      if (a) { a.screens_total++; if (a.screens_unique.indexOf(id) < 0) a.screens_unique.push(id); }
      this.log("screen", title || id);
    },
    back(fromId) { const a = this.active(); if (a) a.back_presses++; this.log("back", "Back from " + fromId); },

    /* ---------- tasks ---------- */
    startTask() {
      if (this.active()) return;
      const sel = this.$("#fac-task"), t = this.tasks.find(x => x.id === sel.value);
      db.participant = this.$("#fac-pid").value.trim();
      if (this.$("#fac-reset").checked && this.onTaskStart) this.onTaskStart(t, true);
      db.active[this.proto] = {
        run_id: uid(), session_id: db.session_id, participant: db.participant, prototype: this.proto, task_id: t.id, task_label: t.label,
        start_ts: nowIso(), start_ms: Date.now(), end_ts: "", duration_ms: "",
        taps: 0, dead_taps: 0, screens_total: 0, screens_unique: [], back_presses: 0, errors_marked: 0, help_requests: 0,
        outcome: "", seq_ease: "", confidence: "", notes: []
      };
      this.log("task_start", t.label);
      // count the screen the participant starts on
      const a = this.active(); a.screens_total = 1; a.screens_unique = [this.curScreen];
      save(); this.refresh();
    },
    stopTask() {
      const a = this.active(); if (!a) return;
      this.log("task_stop", a.task_label);
      a.end_ts = nowIso(); a.duration_ms = Date.now() - a.start_ms;
      db.tasks.push(a); delete db.active[this.proto]; save(); this.refresh();
    },
    mark(kind) {
      const r = this.target(); if (!r) { alert("Start a task first."); return; }
      if (kind === "error") r.errors_marked++;
      if (kind === "help") r.help_requests++;
      if (["success", "partial", "fail"].indexOf(kind) >= 0) r.outcome = kind;
      this.log("mark", kind, r === this.active() ? "" : "applied to last run " + r.run_id); save(); this.refresh();
    },
    addNote() {
      const ta = this.$("#fac-note"), txt = ta.value.trim(); if (!txt) return;
      const r = this.target();
      const ev = this.log("note", txt, r && r !== this.active() ? "after task, run " + r.run_id : "");
      if (r) { r.notes.push({ t: ev.timestamp, ms: ev.ms_since_task_start, text: txt }); save(); }
      ta.value = ""; this.refresh();
    },
    rate(kind, v) {
      const r = this.target(); if (!r) { alert("Run a task first."); return; }
      r[kind] = v; this.log("rating", kind + "=" + v, r.run_id); save(); this.refresh();
    },

    /* ---------- export ---------- */
    csv(rows, cols) {
      const q = v => { v = v == null ? "" : Array.isArray(v) ? v.join("|") : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      return [cols.join(",")].concat(rows.map(r => cols.map(c => q(r[c])).join(","))).join("\n");
    },
    taskRows() {
      return db.tasks.map(t => Object.assign({}, t, {
        screens_unique_count: t.screens_unique.length, screens_unique: t.screens_unique.join("|"),
        possible_errors: t.back_presses + t.dead_taps, notes: t.notes.map(n => "[" + Math.round((n.ms || 0) / 1000) + "s] " + n.text).join(" / ")
      }));
    },
    download(name, text, type) {
      const b = new Blob([text], { type }), a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
    fname(ext, what) { const d = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"); return "mallnav_" + what + "_" + (db.participant || "anon").replace(/\W+/g, "") + "_" + d + "." + ext; },
    exportEvents() { this.download(this.fname("csv", "events"), this.csv(db.events, ["seq", "session_id", "participant", "prototype", "run_id", "task_id", "type", "timestamp", "ms_since_task_start", "screen", "label", "detail"]), "text/csv"); },
    exportTasks() { this.download(this.fname("csv", "tasks"), this.csv(this.taskRows(), ["run_id", "session_id", "participant", "prototype", "task_id", "task_label", "start_ts", "end_ts", "duration_ms", "taps", "dead_taps", "screens_total", "screens_unique_count", "screens_unique", "back_presses", "possible_errors", "errors_marked", "help_requests", "outcome", "seq_ease", "confidence", "notes"]), "text/csv"); },
    exportJSON() { this.download(this.fname("json", "all"), JSON.stringify(db, null, 2), "application/json"); },
    clear() {
      if (!confirm("Delete all logged events, tasks, and notes stored in this browser? Export first if you need them.")) return;
      db.events = []; db.tasks = []; db.active = {}; db.session_id = uid(); save(); this.refresh();
    },
    newParticipant() {
      const a = this.active(); if (a) this.stopTask();
      this.$("#fac-pid").value = ""; db.participant = ""; db.session_id = uid(); save();
      if (this.onTaskStart) this.onTaskStart(null, true);
      this.refresh(); this.$("#fac-pid").focus();
    },

    /* ---------- UI ---------- */
    $(s) { return this.panel.querySelector(s); },
    isOpen() { return this.panel.classList.contains("open"); },
    open(on) { this.panel.classList.toggle("open", on); document.body.classList.toggle("fac-open", on); },
    build() {
      const tg = document.createElement("button");
      tg.className = "fac-toggle"; tg.title = "Facilitator panel (Shift+F)"; tg.setAttribute("aria-label", "Facilitator panel"); tg.textContent = "≡";
      tg.onclick = () => this.open(!this.isOpen());
      document.body.appendChild(tg);
      const p = document.createElement("aside");
      p.className = "fac"; p.id = "fac";
      const rateRow = k => '<div class="rate" data-k="' + k + '">' + [1, 2, 3, 4, 5, 6, 7].map(n => '<button data-r="' + n + '">' + n + "</button>").join("") + "</div>";
      p.innerHTML =
        '<div class="fhead"><b>Facilitator · ' + esc(this.protoName) + '</b><button class="fb" id="fac-close">Close</button></div>' +
        '<div class="hint"><a href="index.html">All prototypes</a> · Taps inside the phone are logged automatically. Data stays in this browser (localStorage) until you export or clear it.</div>' +
        "<h3>Session</h3>" +
        '<label for="fac-pid">Participant ID</label><input type="text" id="fac-pid" placeholder="e.g. P07">' +
        '<div class="fbtns"><button class="fb" id="fac-newp">New participant</button><button class="fb" id="fac-restart">Reset prototype</button></div>' +
        "<h3>Task</h3>" +
        '<select id="fac-task">' + this.tasks.map(t => '<option value="' + t.id + '">' + esc(t.id + ": " + t.label) + "</option>").join("") + "</select>" +
        '<div class="hint" id="fac-taskhint"></div>' +
        '<label style="font-weight:400"><input type="checkbox" id="fac-reset" checked> Reset prototype to the task start screen on Start</label>' +
        '<div class="row" style="display:flex;gap:10px;align-items:center"><div class="timer" id="fac-timer">00:00.0</div><button class="fb go" id="fac-start">Start task</button></div>' +
        '<div class="stats"><div><b id="s-taps">0</b>taps</div><div><b id="s-screens">0</b>screens (unique)</div><div><b id="s-back">0</b>back presses</div><div><b id="s-dead">0</b>dead taps</div><div><b id="s-err">0</b>errors marked</div><div><b id="s-help">0</b>help</div></div>' +
        '<div class="status-line" id="fac-state"></div>' +
        "<h3>Mark</h3>" +
        '<div class="fbtns"><button class="fb" data-m="error">Error</button><button class="fb" data-m="help">Asked for help</button></div>' +
        '<div class="fbtns"><button class="fb" data-m="success">Task success</button><button class="fb" data-m="partial">Partial</button><button class="fb" data-m="fail">Fail</button></div>' +
        "<h3>Notes</h3>" +
        '<textarea id="fac-note" placeholder="Observation or quote (Enter to save, Shift+Enter for new line)"></textarea>' +
        '<div class="fbtns"><button class="fb" id="fac-addnote">Add timestamped note</button></div>' +
        "<h3>Post-task ratings</h3>" +
        '<div class="hint">Applied to the running task, or the last finished task.</div>' +
        '<label>Ease (SEQ): Overall, how difficult or easy was this task? 1 = very difficult, 7 = very easy</label>' + rateRow("seq_ease") +
        '<label>Confidence: How confident are you that you completed the task correctly? 1 = not at all, 7 = very</label>' + rateRow("confidence") +
        "<h3>Live log</h3><div class=\"flog\" id=\"fac-log\"></div>" +
        "<h3>Data</h3>" +
        '<div class="status-line" id="fac-count"></div>' +
        '<div class="fbtns"><button class="fb" id="fac-xe">Export events CSV</button><button class="fb" id="fac-xt">Export tasks CSV</button><button class="fb" id="fac-xj">Export JSON</button></div>' +
        '<div class="fbtns"><button class="fb danger" id="fac-clear">Clear session data</button></div>';
      document.body.appendChild(p);
      this.panel = p;
      this.$("#fac-close").onclick = () => this.open(false);
      this.$("#fac-pid").value = db.participant || "";
      this.$("#fac-pid").oninput = e => { db.participant = e.target.value.trim(); const a = this.active(); if (a) a.participant = db.participant; save(); };
      this.$("#fac-start").onclick = () => this.active() ? this.stopTask() : this.startTask();
      this.$("#fac-task").onchange = () => this.refresh();
      this.$("#fac-newp").onclick = () => this.newParticipant();
      this.$("#fac-restart").onclick = () => { if (this.onTaskStart) this.onTaskStart(this.tasks.find(x => x.id === this.$("#fac-task").value), true); this.log("reset_prototype", ""); };
      p.querySelectorAll("[data-m]").forEach(b => b.onclick = () => this.mark(b.dataset.m));
      p.querySelectorAll(".rate").forEach(row => row.querySelectorAll("button").forEach(b => b.onclick = () => this.rate(row.dataset.k, +b.dataset.r)));
      this.$("#fac-addnote").onclick = () => this.addNote();
      this.$("#fac-note").onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.addNote(); } };
      this.$("#fac-xe").onclick = () => this.exportEvents();
      this.$("#fac-xt").onclick = () => this.exportTasks();
      this.$("#fac-xj").onclick = () => this.exportJSON();
      this.$("#fac-clear").onclick = () => this.clear();
      const a = this.active(); if (a) this.$("#fac-task").value = a.task_id;
    },
    tick() {
      const a = this.active(); if (!this.panel) return;
      const ms = a ? Date.now() - a.start_ms : 0;
      const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, d = Math.floor(ms / 100) % 10;
      this.$("#fac-timer").textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") + "." + d;
    },
    refresh() {
      if (!this.panel) return;
      const a = this.active(), r = this.target();
      const t = this.tasks.find(x => x.id === this.$("#fac-task").value);
      this.$("#fac-taskhint").textContent = t && t.hint ? "Read aloud: \u201c" + t.label + ".\u201d " + t.hint : (t ? "Read aloud: \u201c" + t.label + ".\u201d" : "");
      const st = this.$("#fac-start"); st.textContent = a ? "Stop task" : "Start task"; st.className = "fb " + (a ? "stop" : "go");
      this.$("#fac-task").disabled = !!a;
      const v = (k, f) => { this.$(k).textContent = f; };
      v("#s-taps", r ? r.taps : 0); v("#s-screens", r ? r.screens_total + " (" + r.screens_unique.length + ")" : 0);
      v("#s-back", r ? r.back_presses : 0); v("#s-dead", r ? r.dead_taps : 0); v("#s-err", r ? r.errors_marked : 0); v("#s-help", r ? r.help_requests : 0);
      this.$("#fac-state").textContent = a ? "Running: " + a.task_id + " (participant " + (a.participant || "not set") + ")" :
        r ? "Last run: " + r.task_id + ", " + Math.round(r.duration_ms / 1000) + " s, outcome " + (r.outcome || "not marked") + ", ease " + (r.seq_ease || "-") + ", confidence " + (r.confidence || "-") : "No task run yet.";
      ["success", "partial", "fail"].forEach(k => this.panel.querySelector('[data-m="' + k + '"]').classList.toggle("on", !!r && r.outcome === k));
      this.panel.querySelectorAll(".rate").forEach(row => row.querySelectorAll("button").forEach(b => b.classList.toggle("on", !!r && r[row.dataset.k] === +b.dataset.r)));
      const evs = db.events.filter(e => e.prototype === this.proto).slice(-40).reverse();
      this.$("#fac-log").innerHTML = evs.map(e => "<div>" + (e.ms_since_task_start !== "" ? (e.ms_since_task_start / 1000).toFixed(1) + "s" : "--") + " · " + esc(e.type) + " · " + esc(e.screen) + " · " + esc(e.label) + "</div>").join("") || "<div>No events yet.</div>";
      this.$("#fac-count").textContent = db.events.length + " events and " + db.tasks.length + " finished task runs stored (all prototypes).";
    },
    _db: db
  };
  window.Fac = Fac;
})();
