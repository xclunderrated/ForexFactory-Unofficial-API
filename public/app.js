// forex calendar - small, plain, no build step

const $ = (sel) => document.querySelector(sel);

const els = {
  date: $("#date"),
  prev: $("#prev"),
  next: $("#next"),
  today: $("#today"),
  csv: $("#csv"),
  reload: $("#reload"),
  q: $("#q"),
  high: $("#high"),
  status: $("#status"),
  table: $("#cal"),
  body: $("#cal tbody"),
  empty: $("#empty"),
};

const views = {
  calendar: $("#view-calendar"),
  api: $("#view-api"),
};

const tabs = [...document.querySelectorAll(".tabs a")];

const state = {
  date: isoToday(),
  events: [],
  query: "",
  highOnly: false,
  failed: false,
};

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function shiftDate(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function niceDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// "8:30am" -> 510, so rows sort by the clock instead of alphabetically.
function minutes(t) {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec((t || "").trim());
  if (!m) return 24 * 60 + 1; // all day, tentative, etc. go last
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "pm") h += 12;
  return h * 60 + Number(m[2]);
}

function impactClass(impact) {
  return { High: "high", Medium: "medium", Low: "low", "Non-Economic": "non" }[impact] || "non";
}

function cell(text, cls) {
  const td = document.createElement("td");
  if (cls) td.className = cls;
  td.textContent = text || "—";
  return td;
}

function buildRow(evt) {
  const tr = document.createElement("tr");
  tr.append(cell(evt.time, "time"));
  tr.append(cell(evt.currency, "ccy"));

  const impact = document.createElement("td");
  impact.className = "impact";
  const dot = document.createElement("span");
  dot.className = `dot ${impactClass(evt.impact)}`;
  impact.append(dot, document.createTextNode(evt.impact || "—"));
  tr.append(impact);

  tr.append(cell(evt.title, "event"));

  const actual = cell(evt.actual, "num actual");
  if (evt.actualStatus === "better") actual.classList.add("better");
  if (evt.actualStatus === "worse") actual.classList.add("worse");
  tr.append(actual);

  tr.append(cell(evt.forecast, "num"));
  tr.append(cell(evt.previous, "num"));
  return tr;
}

function render() {
  if (state.failed) {
    els.body.replaceChildren();
    els.table.hidden = true;
    els.empty.hidden = true;
    return;
  }

  const q = state.query.trim().toLowerCase();
  const rows = state.events.filter((evt) => {
    if (state.highOnly && evt.impact !== "High") return false;
    if (!q) return true;
    return `${evt.title} ${evt.currency} ${evt.impact}`.toLowerCase().includes(q);
  });

  els.body.replaceChildren(...rows.map(buildRow));

  const total = state.events.length;
  const shown = rows.length;

  if (total === 0) {
    els.status.textContent = niceDate(state.date);
  } else {
    const count = shown === total ? `${total} events` : `${shown} of ${total} events`;
    els.status.textContent = `${niceDate(state.date)} · ${count}`;
  }

  els.table.hidden = shown === 0;
  els.empty.hidden = shown !== 0;
  els.empty.textContent = total === 0 ? "Nothing scheduled for this day." : "No events match the filter.";
}

async function load() {
  const date = state.date;
  state.failed = false;
  els.status.textContent = "loading…";
  els.csv.href = `/api/v1/calendar/${date}.csv`;

  try {
    const res = await fetch(`/api/v1/calendar/${date}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (date !== state.date) return; // a newer date was picked while this was in flight

    state.events = (data.events || []).slice().sort((a, b) => minutes(a.time) - minutes(b.time));
    render();
  } catch (err) {
    state.failed = true;
    state.events = [];
    render();
    els.status.textContent = `couldn't load ${niceDate(date)} — ${err.message}`;
  }
}

function go(iso) {
  state.date = iso;
  els.date.value = iso;
  load();
}

function showView(name) {
  const view = name === "api" ? "api" : "calendar";
  views.calendar.hidden = view !== "calendar";
  views.api.hidden = view !== "api";
  for (const tab of tabs) tab.classList.toggle("active", tab.dataset.view === view);
  document.title = view === "api" ? "API · Forex calendar" : "Forex calendar";
}

for (const el of document.querySelectorAll(".base")) {
  el.textContent = location.origin;
}

els.date.value = state.date;

els.date.addEventListener("change", () => {
  if (els.date.value) go(els.date.value);
});

els.prev.addEventListener("click", () => go(shiftDate(state.date, -1)));
els.next.addEventListener("click", () => go(shiftDate(state.date, 1)));
els.today.addEventListener("click", () => go(isoToday()));
els.reload.addEventListener("click", load);

els.q.addEventListener("input", () => {
  state.query = els.q.value;
  render();
});

els.high.addEventListener("change", () => {
  state.highOnly = els.high.checked;
  render();
});

document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (!views.api.hidden) return;
  if (e.key === "ArrowLeft") go(shiftDate(state.date, -1));
  if (e.key === "ArrowRight") go(shiftDate(state.date, 1));
});

window.addEventListener("hashchange", () => showView(location.hash.slice(1)));
showView(location.hash.slice(1));

load();
