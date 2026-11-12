import { readBankShot } from "./bankshot.js";
import {
  BREW,
  TARGETS,
  UNTRADEABLE,
  calculate,
  closure,
  leafNames,
  nodeFigures,
  num,
  recipeFor,
  slug,
  unfinishedNames,
  usesFour,
  RECIPES,
} from "./planner.js";

const ICON = 36;
const NODE_W = 52;
const NODE_H = 52;
const COUNT_YELLOW = "#e2c200";
const MESH_ICON = 1.2;
const MESH_COUNT = 2;
const STORE = "overload-calc-v1";
const PRICE_STORE = "overload-prices-v1";
const MEMORY = "overload-bank-memory-v1";
let bundledMemory = null;
const FOUR_HOURS = 4 * 60 * 60 * 1000;
const ALIAS = {
  "Basic overload": "Overload",
  "Overload potion": "Overload",
  "Super magic": "Super magic potion",
  "Super ranging": "Super ranging potion",
};

const PRIMARY = new Set();
for (const entry of RECIPES) {
  if (!entry.output.endsWith("(unfinished)")) continue;
  const herb = entry.ingredients.find((part) => part[0] !== "Vial of water");
  if (herb) PRIMARY.add(herb[0]);
}

const GLYPH = {
  0: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["01110", "10001", "00001", "00110", "00001", "10001", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "11100"],
};

const PLACE = {
  "herb--clean-kwuarm": [0, 0],
  "herb--limpwurt-root": [1, 0],
  "super-strength--3": [2, 0],
  "super-strength--4": [3, 0],
  "extreme-strength--3": [3, 1],
  "herb--clean-dwarf-weed": [0, 2],
  "herb--wine-of-zamorak": [1, 2],
  "super-ranging-potion--3": [2, 2],
  "super-ranging-potion--4": [3, 2],
  "herb--grenwall-spikes": [4, 3],
  "extreme-ranging--3": [3, 3],
  "herb--clean-spirit-weed": [0, 4],
  "herb--congealed-blood": [1, 4],
  "super-necromancy--3": [2, 4],
  "super-necromancy--4": [3, 4],
  "herb--ground-miasma-rune": [4, 5],
  "extreme-necromancy--3": [3, 5],
  "herb--clean-irit": [0, 6],
  "herb--eye-of-newt": [1, 6],
  "super-attack--3": [2, 6],
  "super-attack--4": [3, 6],
  "herb--clean-avantoe": [4, 7],
  "extreme-attack--3": [3, 7],
  "herb--unicorn-horn-dust": [1, 8],
  "super-antipoison--3": [2, 8],
  "super-antipoison--4": [3, 8],
  "herb--clean-cadantine": [0, 9],
  "herb--white-berries": [1, 9],
  "super-defence--3": [2, 9],
  "super-defence--4": [3, 9],
  "extreme-defence--3": [3, 10],
  "herb--clean-lantadyme": [0, 11],
  "herb--potato-cactus": [1, 11],
  "super-magic-potion--3": [2, 11],
  "super-magic-potion--4": [3, 11],
  "herb--ground-mud-runes": [4, 12],
  "extreme-magic--3": [3, 12],
  "herb--dragon-scale-dust": [1, 13],
  "antifire--3": [2, 13],
  "antifire--4": [3, 13],
  "herb--phoenix-feather": [1, 14],
  "super-antifire--3": [3, 14],
  "super-antifire--4": [4, 14],
  "herb--clean-ranarr": [0, 16],
  "herb--snape-grass": [1, 16],
  "prayer-potion--3": [2, 16],
  "prayer-potion--4": [3, 16],
  "herb--clean-fellstalk": [0, 17],
  "herb--morchella-mushroom": [1, 17],
  "prayer-renewal--3": [2, 17],
  "prayer-renewal--4": [3, 17],
  "herb--clean-torstol": [8, 7],
  "overload--3": [9, 7],
  "overload--4": [10, 7],
  "herb--crystal-flask": [11, 7],
  "supreme-overload--6": [12, 7],
  "herb--primal-extract": [12, 14],
  "elder-overload--6": [13, 14],
  "supreme-overload-salve--6": [15, 16],
  "elder-overload-salve--6": [15, 17],
};

const state = loadState();
let plan = null;
let figures = {};
let edges = [];
let nodes = [];
let pan = { x: 28, y: 28 };
let meshScale = 1;
let dragging = null;
let excerptView = { x: 12, y: 8, scale: 1, forId: null };
let excerptDrag = null;
let stockBuiltFor = "";
let grossKey = "";
let grossFigures = {};
const mixMemo = {};

const viewport = document.querySelector("#viewport");
const world = document.querySelector("#world");
const drawer = document.querySelector("#drawer");

init();

function syncPathField() {
  const field = document.querySelector("#path-field");
  const choice = document.querySelector("#path");
  const salve = state.target === "Elder overload salve";
  field.hidden = !salve;
  if (salve) choice.value = state.path === "salve" ? "salve" : "elder";
}

function init() {
  const target = document.querySelector("#target");
  for (const [value, label] of TARGETS) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    target.append(option);
  }
  target.value = state.target;
  document.querySelector("#batch").value = state.batch;
  bindMods();
  document.querySelector("#tab").addEventListener("click", () => document.body.classList.toggle("drawer-open"));
  document.querySelector("#guide-tab").addEventListener("click", () => document.body.classList.toggle("guide-open"));
  document.querySelector("#import").addEventListener("click", () => document.querySelector("#file").click());
  document.querySelector("#file").addEventListener("change", onFile);
  document.querySelector("#shot").addEventListener("click", () => document.querySelector("#shots").click());
  document.querySelector("#shots").addEventListener("change", (event) => {
    const files = [...event.target.files];
    event.target.value = "";
    beginShots(files);
  });
  document.querySelector("#review-add").addEventListener("click", () => document.querySelector("#shots").click());
  document.querySelector("#review-apply").addEventListener("click", applyReview);
  document.querySelector("#review-cancel").addEventListener("click", closeReview);
  document.addEventListener("paste", onPasteShot);
  bundledEntries();
  document.querySelector("#example").addEventListener("click", downloadExample);
  document.querySelector("#update").addEventListener("click", commitForm);
  document.querySelector("#clear").addEventListener("click", clearAll);
  document.querySelector("#reset").addEventListener("click", resetProgress);
  document.querySelector("#excerpt-close").addEventListener("click", () => select(null));
  document.querySelector("#batch").addEventListener("input", markDirty);
  document.querySelector("#target").addEventListener("change", () => {
    state.target = target.value;
    state.selected = null;
    render();
  });
  document.querySelector("#path").addEventListener("change", (event) => {
    state.path = event.target.value;
    state.selected = null;
    render();
  });
  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("selectstart", (event) => event.preventDefault());
  viewport.addEventListener("dragstart", (event) => event.preventDefault());
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerup", () => { dragging = null; viewport.classList.remove("dragging"); });
  const excerptHost = document.querySelector("#excerpt-scroll");
  excerptHost.addEventListener("pointerdown", onExcerptPointerDown);
  excerptHost.addEventListener("pointermove", onExcerptPointerMove);
  excerptHost.addEventListener("pointerup", endExcerptDrag);
  excerptHost.addEventListener("pointercancel", endExcerptDrag);
  viewport.addEventListener("wheel", onWheel, { passive: false });
  document.querySelector("#excerpt").addEventListener("wheel", onExcerptWheel, { passive: false });
  window.addEventListener("wheel", onWindowWheel, { capture: true, passive: false });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (review) {
        closeReview();
        return;
      }
      if (document.body.classList.contains("guide-open")) {
        document.body.classList.remove("guide-open");
        return;
      }
      if (document.body.classList.contains("drawer-open")) {
        document.body.classList.remove("drawer-open");
        return;
      }
      if (state.selected) select(null);
    }
    if (event.key === "Enter" && event.target.closest("#drawer") && !review) commitForm();
  });
  ensurePrices();
  render();
}

function bindMods() {
  for (const id of ["mask", "scroll", "brooch", "workbench", "cape", "amulet", "mory", "desert", "varan", "meilyr", "juju"]) {
    const input = document.querySelector(`#${id}`);
    input.checked = Boolean(state.mods[id]);
    input.addEventListener("change", () => {
      state.mods[id] = input.checked;
      render();
    });
  }
  document.querySelector("#well").value = state.mods.well;
  document.querySelector("#well").addEventListener("change", (event) => {
    state.mods.well = event.target.value;
    render();
  });
  document.querySelector("#grimoire").value = String(state.mods.grimoire);
  document.querySelector("#grimoire").addEventListener("change", (event) => {
    state.mods.grimoire = Number(event.target.value);
    render();
  });
  for (const id of ["outfit", "incense", "boost"]) {
    const input = document.querySelector(`#${id}`);
    input.value = state.mods[id];
    input.addEventListener("change", () => {
      state.mods[id] = Number(input.value) || 0;
      render();
    });
  }
}

function render(options = {}) {
  const batch = Math.max(1, state.batch);
  plan = calculate({
    target: state.target,
    vials: batch,
    path: state.path,
    mods: state.mods,
    stock: dosesFromFields(state.fields, state.loose),
    marks: state.marks,
  });
  figures = nodeFigures(plan);
  for (const key of Object.keys(mixMemo)) delete mixMemo[key];
  syncPathField();
  ({ nodes, edges } = buildGraph());
  drawWorld();
  if (options.excerpt !== false) drawExcerpt();
  ensureStockForm();
  paintGuide(batch);
  paintChecks();
  lockIconPixels(document);
  saveState();
  markDirty();
}

function buildGraph() {
  const active = closure(state.target, state.path);
  const built = [];
  const index = new Map();
  for (const item of active) {
    if (item === "Vial of water" || item.endsWith("(unfinished)")) continue;
    if (!BREW[item] && !PRIMARY.has(item)) continue;
    const doses = [];
    if (BREW[item]) {
      doses.push(BREW[item]);
      if (usesFour(item, state.target, state.path)) doses.push(4);
    }
    if (!doses.length) doses.push(0);
    for (const dose of doses) {
      const id = dose ? `${slug(item)}--${dose}` : `herb--${slug(item)}`;
      built.push({
        id,
        item,
        dose,
        kind: dose ? "potion" : "herb",
        active: true,
        place: PLACE[id] ? [...PLACE[id]] : [12, built.length % 8],
      });
      index.set(id, built[built.length - 1]);
    }
  }
  const list = [];
  const seen = new Set();
  for (const item of active) {
    const entry = recipeFor(item, state.path);
    if (!entry || item.endsWith("(unfinished)")) continue;
    if (entry.path && entry.path !== state.path) continue;
    const to = `${slug(item)}--${BREW[item]}`;
    if (!index.has(to)) continue;
    const floats = [];
    const links = [];
    for (const [name, amount] of entry.ingredients) {
      if (name === "Vial of water") continue;
      const source = name.endsWith("(unfinished)")
        ? recipeFor(name, state.path).ingredients.find((part) => part[0] !== "Vial of water")[0]
        : name;
      const from = BREW[source]
        ? `${slug(source)}--${amount >= 6 ? BREW[source] : amount}`
        : `herb--${slug(source)}`;
      if (index.has(from)) links.push(from);
      else floats.push({ name: source, id: from });
    }
    const carrier = links[0];
    for (const from of links) {
      const key = `${from}>${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        from,
        to,
        decant: false,
        inactive: false,
        floats: from === carrier ? floats : [],
      });
    }
  }
  for (const node of built) {
    if (!node.dose || node.dose === 4) continue;
    const four = `${slug(node.item)}--4`;
    if (index.has(four)) list.push({ from: node.id, to: four, decant: true, inactive: false, floats: [] });
  }
  stepRight(built, list);
  return { nodes: built, edges: list };
}

function stepRight(list, links) {
  const byId = new Map(list.map((node) => [node.id, node]));
  for (let pass = 0; pass < list.length + 2; pass += 1) {
    let moved = false;
    for (const edge of links) {
      const parent = byId.get(edge.from);
      const child = byId.get(edge.to);
      if (!parent || !child || child.place[0] >= parent.place[0] + 1) continue;
      child.place = [parent.place[0] + 1, child.place[1]];
      moved = true;
    }
    if (!moved) break;
  }
}

function drawWorld() {
  const hGap = currentHGap();
  const vGap = currentVGap();
  const packed = pack(nodes);
  world.replaceChildren();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "wires";
  const forward = state.selected ? walkForward(state.selected) : null;
  const pad = 70;
  let maxX = pad;
  let maxY = pad;
  const at = new Map();
  const occupied = new Set();
  for (const node of nodes) {
    const col = packed.col.get(node.place[0]);
    const row = packed.row.get(node.place[1]);
    const x = pad + col * (NODE_W + hGap);
    const y = pad + row * (NODE_H + vGap);
    at.set(node.id, { x, y, col, row });
    occupied.add(`${col},${row}`);
    maxX = Math.max(maxX, x + NODE_W);
    maxY = Math.max(maxY, y + NODE_H);
  }
  let lane = 0;
  const columns = new Map();
  for (const pos of at.values()) if (!columns.has(pos.col)) columns.set(pos.col, pos.x);
  for (const edge of edges) {
    const a = at.get(edge.from);
    const b = at.get(edge.to);
    if (!a || !b) continue;
    const target = nodes.find((node) => node.id === edge.to);
    const green = target && isComplete(target) && target.active && !edge.inactive;
    const hot = forward && forward.has(edge.from) && forward.has(edge.to);
    const stroke = edge.inactive ? "#4a453e" : green ? "#63e25a" : hot ? "#f0d090" : "#8a7b66";
    const points = routePoints(a, b, hGap, vGap, occupied, maxY, lane);
    if (points.length > 3) lane += 1;
    for (const point of points) {
      maxX = Math.max(maxX, point[0]);
      maxY = Math.max(maxY, point[1]);
    }
    const line = polyline(points, stroke, hot || green ? "2.4" : "1.6");
    if (forward && !hot) line.setAttribute("opacity", "0.25");
    svg.append(line);
    const [lx, ly] = flatPoint(points);
    if (edge.decant) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", lx);
      label.setAttribute("y", ly - 8);
      label.setAttribute("text-anchor", "middle");
      label.textContent = "(3) → (4)";
      if (forward && !hot) label.setAttribute("opacity", "0.25");
      svg.append(label);
      const left = figures[edge.to]?.leftover || 0;
      if (left && !edge.inactive) {
        const spot = document.createElement("div");
        spot.className = "node leftover";
        if (forward && !hot) spot.classList.add("dim");
        spot.style.left = `${lx - 14}px`;
        spot.style.top = `${ly + 6}px`;
        spot.innerHTML = `<div class="slot"><img alt="" src="${iconPath(edge.from)}">${countCanvas(left, false, MESH_COUNT)}</div>`;
        spot.dataset.name = `${left} dose${left === 1 ? "" : "s"} left`;
        world.append(spot);
      }
    } else if (edge.floats?.length) {
      const row = floatRow(edge.floats);
      if (forward && !hot) row.classList.add("dim");
      pinFloat(row, points, a, b, columns);
      world.append(row);
    }
  }
  svg.setAttribute("width", maxX + 40);
  svg.setAttribute("height", maxY + 40);
  world.append(svg);
  for (const node of nodes) {
    const pos = at.get(node.id);
    const el = document.createElement("div");
    el.className = "node";
    if (!node.active) el.classList.add("inactive");
    if (isComplete(node) && node.active) el.classList.add("complete");
    if (state.selected === node.id) el.classList.add("selected");
    if (forward && !forward.has(node.id)) el.classList.add("dim");
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.dataset.name = pretty(node);
    const count = countFor(node);
    el.innerHTML = `<div class="slot"><img alt="" src="${iconPath(node.id)}">${countCanvas(count, isComplete(node) && node.active, MESH_COUNT)}</div>`;
    el.addEventListener("click", (event) => {
      if (event.shiftKey) toggleMark(node);
      else select(node.id);
    });
    world.append(el);
    const img = el.querySelector("img");
    img.addEventListener("error", () => { img.replaceWith(Object.assign(document.createElement("span"), { textContent: "?" })); });
  }
  world.style.width = `${maxX + 80}px`;
  world.style.height = `${maxY + 80}px`;
  if (!state.framed) {
    state.framed = true;
    pan = { x: 36, y: 28 };
  }
  applyPan();
}

function drawExcerpt() {
  const open = Boolean(state.selected && nodes.some((node) => node.id === state.selected));
  document.body.classList.toggle("excerpt-open", open);
  if (!open) return;
  const root = nodes.find((node) => node.id === state.selected);
  const keep = walkForward(root.id);
  const subset = nodes.filter((node) => keep.has(node.id) && (node.kind === "potion" || node.id === root.id));
  const placed = layoutExcerpt(root, subset);
  const ids = new Set(subset.map((node) => node.id));
  const carrier = excerptCarrier(ids);
  const inCount = new Map();
  const outCount = new Map();
  for (const edge of edges) {
    if (edge.inactive || !ids.has(edge.from) || !ids.has(edge.to)) continue;
    outCount.set(edge.from, (outCount.get(edge.from) || 0) + 1);
    inCount.set(edge.to, (inCount.get(edge.to) || 0) + 1);
  }
  const host = document.querySelector("#excerpt-scroll");
  host.replaceChildren();
  if (excerptView.forId !== root.id) excerptView = { x: 12, y: 8, scale: 1, forId: root.id };
  const layer = document.createElement("div");
  layer.className = "excerpt-layer";
  layer.style.position = "relative";
  let maxX = 0;
  let maxY = 0;
  for (const pos of placed.values()) {
    maxX = Math.max(maxX, pos.x + NODE_W);
    maxY = Math.max(maxY, pos.y + NODE_H);
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", maxX + 48);
  svg.setAttribute("height", maxY + 36);
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  const grids = [];
  for (const edge of edges) {
    if (edge.inactive || !placed.has(edge.from) || !placed.has(edge.to)) continue;
    const from = placed.get(edge.from);
    const to = placed.get(edge.to);
    const target = nodes.find((node) => node.id === edge.to);
    const companions = !edge.decant && carrier.get(edge.to) === edge.from ? excerptCompanions(target, ids) : [];
    const spread = Math.abs(from.y - to.y);
    const mode = spread < 2 ? "straight" : (inCount.get(edge.to) || 0) >= 2 ? "merge" : "branch";
    const points = excerptLeg(from, to, mode, excerptFlat(companions.length));
    svg.append(polyline(points, isComplete(target) ? "#63e25a" : "#8a7b66", "1.6"));
    const [lx, ly] = flatPoint(points);
    if (edge.decant) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", lx);
      text.setAttribute("y", ly - 8);
      text.setAttribute("text-anchor", "middle");
      text.textContent = "(3) → (4)";
      svg.append(text);
    } else if (companions.length) {
      const row = floatRow(companions, true);
      pinExcerptFloat(row, points, mode);
      grids.push(row);
    }
  }
  layer.append(svg);
  for (const grid of grids) layer.append(grid);
  for (const node of subset) {
    const pos = placed.get(node.id);
    const el = document.createElement("div");
    el.className = "node ex-node";
    if (isComplete(node)) el.classList.add("complete");
    const price = priceFor(node);
    if (price.calculated) el.classList.add("calculated");
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.dataset.name = pretty(node);
    el.innerHTML = `<div class="slot"><img alt="" src="${iconPath(node.id)}">${countCanvas(countFor(node), isComplete(node))}</div><div class="price">${escapeHtml(price.text)}</div>`;
    el.addEventListener("click", () => select(node.id));
    layer.append(el);
  }
  layer.style.width = `${maxX + 80}px`;
  layer.style.height = `${maxY + 36}px`;
  host.append(layer);
  applyExcerptView();
  const rootName = pretty(root);
  const end = TARGETS.find((row) => row[0] === state.target)[1];
  const same = root.item === state.target;
  document.querySelector("#excerpt-from").hidden = same;
  document.querySelector("#excerpt-arrow").hidden = same;
  document.querySelector("#excerpt-from").textContent = same ? "" : rootName;
  document.querySelector("#excerpt-to").textContent = end;
  const materials = materialCost();
  const xp = Math.round(plan.xp.total);
  const xpNote = plan.xp.missing ? " · XP skips prayer renewal, extreme necromancy, elder overload, and unfinished potions" : "";
  document.querySelector("#excerpt-meta").textContent = `${materials} · ${xp.toLocaleString("en-GB")} XP${xpNote}`;
}

function layoutExcerpt(root, subset) {
  const ids = new Set(subset.map((node) => node.id));
  const outgoing = new Map(subset.map((node) => [node.id, []]));
  const incoming = new Map(subset.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (edge.inactive || !ids.has(edge.from) || !ids.has(edge.to)) continue;
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  }
  const depth = new Map();
  const depthOf = (id) => {
    if (depth.has(id)) return depth.get(id);
    const preds = incoming.get(id) || [];
    const value = preds.length ? Math.max(...preds.map((edge) => depthOf(edge.from))) + 1 : 0;
    depth.set(id, value);
    return value;
  };
  for (const node of subset) depthOf(node.id);
  const lane = new Map([[root.id, 0]]);
  const taken = new Set(["0,0"]);
  const carrier = excerptCarrier(ids);
  const ordered = [...subset].sort((a, b) => depthOf(a.id) - depthOf(b.id) || a.id.localeCompare(b.id));
  for (const node of ordered) {
    if (node.id === root.id) continue;
    const preds = incoming.get(node.id) || [];
    const column = depthOf(node.id);
    if (!preds.length) {
      let row = 0;
      while (taken.has(`${column},${row}`)) row -= 1;
      taken.add(`${column},${row}`);
      lane.set(node.id, row);
      continue;
    }
    const preferred = preds.find((edge) => edge.from === carrier.get(node.id));
    const primary = preferred || preds.reduce((best, edge) => (lane.get(edge.from) > lane.get(best.from) ? edge : best));
    const ranked = outgoing.get(primary.from).slice().sort((a, b) => Number(b.decant) - Number(a.decant) || a.to.localeCompare(b.to));
    const branchCount = ranked.filter((edge) => !edge.decant).length;
    const edge = ranked.find((item) => item.to === node.id);
    let row = lane.get(primary.from);
    if (edge && !edge.decant && branchCount >= 2) {
      const branchIndex = ranked.filter((item) => !item.decant).findIndex((item) => item.to === node.id);
      const step = Math.floor(branchIndex / 2) + 1;
      row += (branchIndex % 2 === 0 ? -1 : 1) * step;
    } else {
      const index = Math.max(0, ranked.findIndex((item) => item.to === node.id));
      row -= index;
    }
    while (taken.has(`${column},${row}`)) row -= 1;
    taken.add(`${column},${row}`);
    lane.set(node.id, row);
  }
  let maxGrid = 0;
  for (const node of subset) maxGrid = Math.max(maxGrid, gridMetrics(excerptCompanions(node, ids).length).h);
  const minLane = Math.min(...lane.values());
  const lanePitch = Math.max(NODE_H + Math.max(excerptGap(), 36), maxGrid + NODE_H / 2 + 24);
  const gapAfter = new Map();
  for (const value of depth.values()) gapAfter.set(value, excerptGap());
  for (const edge of edges) {
    if (!depth.has(edge.from) || !depth.has(edge.to)) continue;
    const count = !edge.decant && carrier.get(edge.to) === edge.from ? excerptCompanions(nodes.find((node) => node.id === edge.to), ids).length : 0;
    const rise = Math.abs(lane.get(edge.from) - lane.get(edge.to)) * lanePitch;
    const need = Math.max(excerptGap(), excerptFlat(count) + rise);
    const column = depth.get(edge.from);
    gapAfter.set(column, Math.max(gapAfter.get(column) || 0, need));
  }
  const xOf = new Map();
  let cursor = 0;
  for (const column of [...gapAfter.keys()].sort((a, b) => a - b)) {
    xOf.set(column, cursor);
    cursor += NODE_W + gapAfter.get(column);
  }
  const y0 = Math.max(72, maxGrid + 20);
  const placed = new Map();
  for (const node of subset) {
    placed.set(node.id, {
      x: xOf.get(depthOf(node.id)),
      y: (lane.get(node.id) - minLane) * lanePitch + y0,
    });
  }
  return placed;
}

function excerptCarrier(ids) {
  const carrier = new Map();
  for (const id of ids) {
    const node = nodes.find((item) => item.id === id);
    if (!node?.dose || node.dose !== BREW[node.item]) continue;
    const entry = recipeFor(node.item, state.path);
    if (!entry) continue;
    for (const [name, amount] of entry.ingredients) {
      const ingredient = ingredientNodeId(name, amount);
      if (!ids.has(ingredient)) continue;
      carrier.set(node.id, ingredient);
      break;
    }
  }
  return carrier;
}

function excerptCompanions(node, ids) {
  if (!node?.dose || node.dose !== BREW[node.item]) return [];
  const entry = recipeFor(node.item, state.path);
  if (!entry) return [];
  const list = [];
  for (const [name, amount] of entry.ingredients) {
    if (name === "Vial of water") continue;
    const id = ingredientNodeId(name, amount);
    if (ids.has(id)) continue;
    const source = name.endsWith("(unfinished)")
      ? recipeFor(name, state.path).ingredients.find((part) => part[0] !== "Vial of water")[0]
      : name;
    list.push({ name: source, id });
  }
  return list;
}

function ingredientNodeId(name, amount) {
  const source = name.endsWith("(unfinished)")
    ? recipeFor(name, state.path).ingredients.find((part) => part[0] !== "Vial of water")[0]
    : name;
  if (BREW[source]) return `${slug(source)}--${amount >= 6 ? BREW[source] : amount}`;
  return `herb--${slug(source)}`;
}

function gridMetrics(count) {
  if (count <= 0) return { cols: 0, rows: 0, w: 0, h: 0 };
  const cols = count <= 2 ? count : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const gap = 6;
  return {
    cols,
    rows,
    w: cols * NODE_W + Math.max(0, cols - 1) * gap,
    h: rows * NODE_H + Math.max(0, rows - 1) * gap,
  };
}

function excerptGap() {
  return NODE_W * 1.5;
}

function excerptFlat(count) {
  const { w } = gridMetrics(count);
  return w ? w + 24 : 64;
}

function excerptLeg(a, b, mode, minFlat) {
  const x1 = a.x + NODE_W;
  const x2 = b.x;
  const y1 = a.y + NODE_H / 2;
  const y2 = b.y + NODE_H / 2;
  const span = Math.abs(y2 - y1);
  if (span < 2 || x2 <= x1) return [[x1, y1], [x2, y2]];
  const diag = Math.min(span, Math.max(0, x2 - x1 - minFlat));
  const dir = Math.sign(y2 - y1);
  if (mode === "branch") return [[x1, y1], [x1 + diag, y1 + dir * diag], [x2, y2]];
  return [[x1, y1], [x2 - diag, y1], [x2, y2]];
}

function pinExcerptFloat(row, points, mode) {
  const segment = mode === "branch" && points.length >= 3 ? [points[1], points[2]] : [points[0], points[1]];
  pinAbove(row, (segment[0][0] + segment[1][0]) / 2, segment[0][1]);
}

function flatPoint(points) {
  let best = 0;
  let length = -1;
  for (let i = 0; i < points.length - 1; i += 1) {
    const span = Math.abs(points[i + 1][0] - points[i][0]);
    const rise = Math.abs(points[i + 1][1] - points[i][1]);
    if (rise > 1) continue;
    if (span > length) {
      length = span;
      best = i;
    }
  }
  return [(points[best][0] + points[best + 1][0]) / 2, points[best][1]];
}

function floatRow(floats, grid) {
  const row = document.createElement("div");
  row.className = "edge-ings";
  if (grid && floats.length > 1) {
    const { cols, w } = gridMetrics(floats.length);
    row.style.display = "grid";
    row.style.gridTemplateColumns = `repeat(${cols}, ${NODE_W}px)`;
    row.style.width = `${w}px`;
    row.style.gap = "6px";
  }
  for (const item of floats) {
    const cell = document.createElement("div");
    const count = ingredientCount(item.name);
    const done = count === 0;
    cell.className = done ? "mini complete" : "mini";
    const dose = item.id.match(/--(\d+)$/);
    const base = item.name.replace(/^Clean /, "").replace(" potion", "");
    const titled = base.charAt(0).toUpperCase() + base.slice(1);
    cell.dataset.name = dose ? `${titled} (${dose[1]})` : titled;
    cell.innerHTML = `<img alt="" src="${iconPath(item.id)}">${countCanvas(done ? "ok" : count, done, MESH_COUNT)}`;
    row.append(cell);
  }
  return row;
}

function pinAbove(row, x, y) {
  row.style.left = `${x}px`;
  row.style.top = `${y - 8}px`;
  row.style.transform = "translate(-50%, -100%)";
}

function pinFloat(row, points, a, b, columns) {
  const x = floatX(a, b, columns);
  let across = -1;
  let y = null;
  for (let i = 0; i < points.length - 1; i += 1) {
    const dx = Math.abs(points[i + 1][0] - points[i][0]);
    const dy = Math.abs(points[i + 1][1] - points[i][1]);
    if (dx < dy || dx <= across) continue;
    across = dx;
    y = points[i][1];
  }
  if (y != null && across >= 24) {
    pinAbove(row, x, y);
    return;
  }
  const top = Math.min(...points.map((point) => point[1]));
  row.style.left = `${x}px`;
  row.style.top = `${top + 4}px`;
  row.style.transform = "translate(-50%, 0)";
}

function floatX(a, b, columns) {
  if (!a || !b) return 0;
  const gap = (left, right) => (Math.min(left, right) + NODE_W + Math.max(left, right)) / 2;
  if (columns && a.col != null && b.col != null) {
    const dir = b.col >= a.col ? 1 : -1;
    if (a.col === b.col || Math.abs(a.col - b.col) > 1) {
      const next = [...columns.keys()]
        .filter((col) => (dir > 0 ? col > a.col : col < a.col))
        .sort((left, right) => (dir > 0 ? left - right : right - left))[0];
      if (next != null) return gap(a.x, columns.get(next));
    }
  }
  return gap(a.x, b.x);
}

function ingredientCount(name) {
  if (BREW[name]) return figures[`${slug(name)}--${BREW[name]}`]?.vials || 0;
  const raw = plan.raw[name];
  return raw ? Math.ceil(num(raw) - 1e-8) : 0;
}

function select(id) {
  state.selected = id;
  render();
}

function toggleMark(node) {
  const mark = node.kind === "herb" ? `item:${node.item}` : node.id;
  state.marks = state.marks.includes(mark) ? state.marks.filter((item) => item !== mark) : [...state.marks, mark];
  render();
}

function isComplete(node) {
  if (!node || !node.active) return false;
  if (node.kind === "herb") return !(num(plan.raw[node.item] || { n: 0, d: 1 }) > 1e-8);
  return (figures[node.id]?.vials || 0) === 0;
}

function aimFigures(batch) {
  const key = JSON.stringify([state.target, state.path, batch, state.mods]);
  if (key === grossKey) return grossFigures;
  grossKey = key;
  grossFigures = nodeFigures(calculate({
    target: state.target,
    vials: batch,
    path: state.path,
    mods: state.mods,
    stock: {},
    marks: [],
  }));
  return grossFigures;
}

function paintGuide(batch) {
  const host = document.querySelector("#guide-body");
  const scroll = host.scrollTop;
  const aim = aimFigures(batch);
  const steps = nodes
    .filter((node) => node.kind === "potion" && (aim[node.id]?.vials || 0) > 0)
    .sort((a, b) => a.place[0] - b.place[0] || a.dose - b.dose || a.item.localeCompare(b.item));
  host.replaceChildren();
  const key = document.createElement("p");
  key.className = "hint guide-key";
  key.textContent = "Make, then the total to have before the next step.";
  host.append(key);
  for (const node of steps) host.append(guideStep(node, aim[node.id].vials));
  host.scrollTop = scroll;
}

function guideStep(node, aim) {
  const make = figures[node.id]?.vials || 0;
  const marked = state.marks.includes(node.id);
  const done = make === 0;
  const checked = done || marked;
  const held = Math.max(0, aim - make);
  const step = document.createElement("article");
  step.className = done ? "step done" : "step";
  const check = document.createElement("button");
  check.type = "button";
  check.className = "step-check";
  check.setAttribute("aria-pressed", checked ? "true" : "false");
  check.setAttribute("aria-label", marked ? `Clear ${pretty(node)}` : `Mark ${pretty(node)} done`);
  check.textContent = checked ? "✓" : "";
  check.addEventListener("click", () => toggleMark(node));
  const graph = document.createElement("div");
  graph.className = "step-graph";
  const decant = node.dose === 4;
  graph.append(stepGrid(decant ? [{ name: node.item, id: `${slug(node.item)}--${BREW[node.item]}`, count: null }] : stepIngredients(node)));
  const arrow = document.createElement("span");
  arrow.className = "step-arrow";
  arrow.textContent = decant ? "(3) → (4)" : "→";
  const out = document.createElement("div");
  out.className = "step-out";
  const product = document.createElement("div");
  product.className = "step-product";
  product.title = done
    ? `Done. Have ${aim} before the next step.`
    : `Make ${make}. ${held} already counted. Have ${aim} before the next step.`;
  const icon = document.createElement("div");
  icon.className = done ? "mini complete" : "mini";
  icon.dataset.name = pretty(node);
  icon.innerHTML = `<img alt="" src="${iconPath(node.id)}">${countCanvas(done ? "ok" : make, done)}`;
  const pipe = document.createElement("span");
  pipe.className = "step-pipe";
  pipe.textContent = "|";
  const total = document.createElement("span");
  total.className = "step-aim";
  total.innerHTML = countCanvas(aim, false);
  product.append(icon, pipe, total);
  const name = document.createElement("span");
  name.className = "step-name";
  name.textContent = pretty(node);
  out.append(product, name);
  graph.append(arrow, out);
  step.append(check, graph);
  return step;
}

function stepIngredients(node) {
  const entry = recipeFor(node.item, state.path);
  if (!entry) return [];
  const row = plan.crafted[node.item];
  const list = [];
  for (const [name, amount] of entry.ingredients) {
    if (name === "Vial of water") continue;
    const source = name.endsWith("(unfinished)")
      ? recipeFor(name, state.path).ingredients.find((part) => part[0] !== "Vial of water")[0]
      : name;
    const taken = row?.consumed[name];
    let count = 0;
    if (taken && num(taken) > 1e-8) {
      count = BREW[source] ? Math.ceil(num(taken) / amount - 1e-8) : Math.ceil(num(taken) - 1e-8);
    }
    list.push({ name: source, id: ingredientNodeId(name, amount), count });
  }
  return list;
}

function stepGrid(ingredients) {
  const row = document.createElement("div");
  row.className = "step-ings";
  if (ingredients.length > 1) {
    const { cols, w } = gridMetrics(ingredients.length);
    row.style.display = "grid";
    row.style.gridTemplateColumns = `repeat(${cols}, ${NODE_W}px)`;
    row.style.width = `${w}px`;
    row.style.gap = "6px";
  }
  for (const item of ingredients) {
    const cell = document.createElement("div");
    const known = item.count != null;
    const finished = known && item.count === 0;
    cell.className = finished ? "mini complete" : "mini";
    const dose = item.id.match(/--(\d+)$/);
    const base = item.name.replace(/^Clean /, "").replace(" potion", "");
    const titled = base.charAt(0).toUpperCase() + base.slice(1);
    cell.dataset.name = dose ? `${titled} (${dose[1]})` : titled;
    const badge = known ? countCanvas(finished ? "ok" : item.count, finished, MESH_COUNT) : "";
    cell.innerHTML = `<img alt="" src="${iconPath(item.id)}">${badge}`;
    row.append(cell);
  }
  return row;
}

function countFor(node) {
  if (!node.active) return null;
  if (isComplete(node)) return "ok";
  if (node.kind === "herb") {
    const raw = plan.raw[node.item];
    return raw ? Math.ceil(num(raw) - 1e-8) : 0;
  }
  return figures[node.id]?.vials || 0;
}

function titleFor(node) {
  const count = countFor(node);
  if (!node.active) return `${pretty(node)} · other recipe`;
  if (count === "ok") return `${pretty(node)} · done`;
  const expected = node.kind === "herb" ? num(plan.raw[node.item] || { n: 0, d: 1 }) : figures[node.id]?.expected;
  const left = node.dose === 4 ? figures[node.id]?.leftover : 0;
  return `${pretty(node)} · make ${count} · expected ${expected?.toFixed(2) || "0"}${left ? ` · +${left} dose leftover` : ""}`;
}

function pretty(node) {
  const base = node.item.replace(/^Clean /, "").replace(" potion", "");
  const titled = base.charAt(0).toUpperCase() + base.slice(1);
  return node.dose ? `${titled} (${node.dose})` : titled;
}

function walkForward(id) {
  const seen = new Set([id]);
  const stack = [id];
  while (stack.length) {
    const current = stack.pop();
    for (const edge of edges) {
      if (edge.inactive || edge.from !== current || seen.has(edge.to)) continue;
      seen.add(edge.to);
      stack.push(edge.to);
    }
  }
  return seen;
}

function pack(list) {
  const cols = [...new Set(list.map((node) => node.place[0]))].sort((a, b) => a - b);
  const rows = [...new Set(list.map((node) => node.place[1]))].sort((a, b) => a - b);
  return {
    col: new Map(cols.map((value, index) => [value, index])),
    row: new Map(rows.map((value, index) => [value, index])),
  };
}

function polyline(points, stroke, width) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", points.map(([x, y]) => `${x},${y}`).join(" "));
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", stroke);
  line.setAttribute("stroke-width", width);
  line.setAttribute("stroke-linejoin", "round");
  line.setAttribute("stroke-linecap", "round");
  return line;
}

function corridorClear(a, b, occupied) {
  if (a.row === b.row) {
    const lo = Math.min(a.col, b.col);
    const hi = Math.max(a.col, b.col);
    for (let col = lo + 1; col < hi; col += 1) if (occupied.has(`${col},${a.row}`)) return false;
    return true;
  }
  if (a.col === b.col) {
    const lo = Math.min(a.row, b.row);
    const hi = Math.max(a.row, b.row);
    for (let row = lo + 1; row < hi; row += 1) if (occupied.has(`${a.col},${row}`)) return false;
    return true;
  }
  return false;
}

function elbowClear(a, b, occupied) {
  const rowLo = Math.min(a.row, b.row);
  const rowHi = Math.max(a.row, b.row);
  for (let row = rowLo + 1; row < rowHi; row += 1) {
    if (occupied.has(`${a.col},${row}`)) return false;
  }
  if (a.col !== b.col && occupied.has(`${a.col},${b.row}`)) return false;
  const colLo = Math.min(a.col, b.col);
  const colHi = Math.max(a.col, b.col);
  for (let col = colLo + 1; col < colHi; col += 1) {
    if (occupied.has(`${col},${b.row}`)) return false;
  }
  return true;
}

function rowClear(a, b, occupied) {
  if (a.col === b.col) return false;
  const colLo = Math.min(a.col, b.col);
  const colHi = Math.max(a.col, b.col);
  for (let col = colLo + 1; col < colHi; col += 1) {
    if (occupied.has(`${col},${a.row}`)) return false;
  }
  if (occupied.has(`${b.col},${a.row}`)) return false;
  const rowLo = Math.min(a.row, b.row);
  const rowHi = Math.max(a.row, b.row);
  for (let row = rowLo + 1; row < rowHi; row += 1) {
    if (occupied.has(`${b.col},${row}`)) return false;
  }
  return true;
}

function routePoints(a, b, hGap, vGap, occupied, floorY = 0, lane = 0) {
  const down = b.row >= a.row;
  const goRight = b.x >= a.x;
  const x1 = goRight ? a.x + NODE_W : a.x;
  const x2 = goRight ? b.x : b.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const y2 = b.y + NODE_H / 2;
  const midX = a.x + NODE_W / 2;
  const midXB = b.x + NODE_W / 2;
  if (a.col === b.col && corridorClear(a, b, occupied)) {
    return [[midX, down ? a.y + NODE_H : a.y], [midX, down ? b.y : b.y + NODE_H]];
  }
  if (a.row === b.row && corridorClear(a, b, occupied)) return [[x1, y1], [x2, y2]];
  if (elbowClear(a, b, occupied)) {
    const yLeave = down ? a.y + NODE_H : a.y;
    const yEdge = down ? b.y : b.y + NODE_H;
    const yRail = down ? b.y - 10 : b.y + NODE_H + 10;
    return [[midX, yLeave], [midX, yRail], [midXB, yRail], [midXB, yEdge]];
  }
  if (rowClear(a, b, occupied)) {
    const yEnter = down ? b.y : b.y + NODE_H;
    const fan = ((a.row * 3 + a.col) % 7) * 6 - 18;
    const landX = Math.min(b.x + NODE_W - 10, Math.max(b.x + 10, midXB + fan));
    return [[x1, y1], [landX, y1], [landX, yEnter]];
  }
  const dropX = goRight ? a.x + NODE_W + hGap / 2 : a.x - hGap / 2;
  const riseX = goRight ? b.x - hGap / 2 : b.x + NODE_W + hGap / 2;
  const bottom = floorY + 36 + lane * 8;
  return [[x1, y1], [dropX, y1], [dropX, bottom], [riseX, bottom], [riseX, y2], [x2, y2]];
}

function routeLabel(points) {
  let best = 0;
  let length = -1;
  for (let i = 0; i < points.length - 1; i += 1) {
    const span = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    if (span > length) {
      length = span;
      best = i;
    }
  }
  return [(points[best][0] + points[best + 1][0]) / 2, (points[best][1] + points[best + 1][1]) / 2];
}

function anchors(a, b, pad = 4) {
  const width = a.w || NODE_W;
  const ax = a.x + width / 2;
  const ay = a.y + (a.cy ?? 32);
  const bx = b.x + (b.w || NODE_W) / 2;
  const by = b.y + (b.cy ?? 32);
  const inset = a.w ? 24 : 42;
  if (Math.abs(a.x - b.x) >= Math.abs(a.y - b.y)) {
    const dir = b.x >= a.x ? 1 : -1;
    return [ax + dir * inset, ay, bx - dir * inset, by];
  }
  const dir = b.y >= a.y ? 1 : -1;
  return [ax, ay + dir * (20 + pad), bx, by - dir * (20 + pad)];
}

function iconPath(id) {
  const file = {
    "supreme-overload--6": "supreme-overload-potion-6.png",
    "elder-overload--6": "elder-overload-potion-6.png",
    "elder-overload-salve--6": "elder-overload-salve-6.png",
    "supreme-overload-salve--6": "supreme-overload-salve-6.png",
  }[id] || `${id.replace("herb--", "").replace("--", "-")}.png`;
  return `../graph/icons/${file}`;
}

function countCanvas(value, done, scale = 2) {
  if (value == null) return "";
  const pad = scale;
  const box = (width, height) => `width:${Math.round(width * 0.6)}px;height:${Math.round(height * 0.6)}px`;
  if (done || value === "ok") {
    const size = 8 * scale;
    return `<canvas class="count" width="${size}" height="${size}" style="${box(size, size)}" data-check="1" data-scale="${scale}"></canvas>`;
  }
  const text = String(value);
  const width = text.length * 6 * scale + pad * 2;
  const height = 9 * scale;
  return `<canvas class="count" width="${width}" height="${height}" style="${box(width, height)}" data-text="${text}" data-scale="${scale}"></canvas>`;
}

function paintDigits(canvas, text, color) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Number(canvas.dataset.scale) || 2;
  const draw = (ox, oy, fill) => {
    ctx.fillStyle = fill;
    let x = scale + ox;
    for (const ch of text) {
      const rows = GLYPH[ch];
      if (!rows) continue;
      rows.forEach((row, y) => {
        [...row].forEach((bit, col) => {
          if (bit === "1") ctx.fillRect(x + col * scale, scale + oy + y * scale, scale, scale);
        });
      });
      x += 6 * scale;
    }
  };
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) draw(dx * scale, dy * scale, "#000");
  draw(0, 0, color);
}

function lockIconPixels(root) {
  for (const img of root.querySelectorAll("img")) {
    if (img.closest("#drawer") || img.closest("#tab") || img.closest("#guide") || img.closest("#guide-tab")) continue;
    const lock = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      const factor = MESH_ICON;
      img.style.width = `${img.naturalWidth * factor}px`;
      img.style.height = `${img.naturalHeight * factor}px`;
    };
    if (img.complete) lock();
    else img.addEventListener("load", lock, { once: true });
  }
}

function paintChecks() {
  for (const canvas of document.querySelectorAll("canvas.count")) {
    if (canvas.dataset.check) {
      const ctx = canvas.getContext("2d");
      const scale = Number(canvas.dataset.scale) || 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#63e25a";
      ctx.lineWidth = Math.max(2, scale);
      ctx.beginPath();
      ctx.moveTo(scale, 4 * scale);
      ctx.lineTo(3 * scale, 6.5 * scale);
      ctx.lineTo(7 * scale, scale);
      ctx.stroke();
    } else if (canvas.dataset.text) {
      paintDigits(canvas, canvas.dataset.text, COUNT_YELLOW);
    }
  }
}

function currentHGap() {
  return currentGap();
}

function currentVGap() {
  return currentGap();
}

function currentGap() {
  return NODE_W * 1.5;
}

function onWindowWheel(event) {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  if (!target || target.closest("button, input, select, textarea")) return;
  if (target.closest("#drawer") || target.closest("#guide")) return;
  if (target.closest("#excerpt")) {
    onExcerptWheel(event);
    return;
  }
  if (target.closest("#viewport")) onWheel(event);
}

function onExcerptWheel(event) {
  if (event.zoomHandled) return;
  event.zoomHandled = true;
  event.preventDefault();
  const host = document.querySelector("#excerpt-scroll");
  const rect = host.getBoundingClientRect();
  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;
  const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
  const next = Math.min(2.8, Math.max(0.35, excerptView.scale * factor));
  if (next === excerptView.scale) return;
  const scale = next / excerptView.scale;
  excerptView.x = px - (px - excerptView.x) * scale;
  excerptView.y = py - (py - excerptView.y) * scale;
  excerptView.scale = next;
  applyExcerptView();
}

function applyExcerptView() {
  const layer = document.querySelector("#excerpt-scroll .excerpt-layer");
  if (!layer) return;
  layer.style.transformOrigin = "0 0";
  layer.style.transform = `translate(${excerptView.x}px, ${excerptView.y}px) scale(${excerptView.scale})`;
}

function onExcerptPointerDown(event) {
  if (event.target.closest(".ex-node, .mini, button")) return;
  excerptDrag = { x: event.clientX, y: event.clientY, panX: excerptView.x, panY: excerptView.y };
  event.currentTarget.classList.add("dragging");
  event.currentTarget.setPointerCapture(event.pointerId);
}

function onExcerptPointerMove(event) {
  if (!excerptDrag) return;
  excerptView.x = excerptDrag.panX + event.clientX - excerptDrag.x;
  excerptView.y = excerptDrag.panY + event.clientY - excerptDrag.y;
  applyExcerptView();
}

function endExcerptDrag(event) {
  excerptDrag = null;
  event.currentTarget.classList.remove("dragging");
}

function onWheel(event) {
  if (event.zoomHandled) return;
  event.zoomHandled = true;
  event.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;
  const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
  const next = Math.min(2.8, Math.max(0.35, meshScale * factor));
  if (next === meshScale) return;
  const scale = next / meshScale;
  pan.x = px - (px - pan.x) * scale;
  pan.y = py - (py - pan.y) * scale;
  meshScale = next;
  applyPan();
}

function onPointerDown(event) {
  if (event.target.closest(".node, .edge-ings, button, a, input, select")) return;
  dragging = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, moved: false };
  viewport.classList.add("dragging");
  viewport.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!dragging) return;
  const dx = event.clientX - dragging.x;
  const dy = event.clientY - dragging.y;
  if (Math.hypot(dx, dy) > 4) dragging.moved = true;
  if (!dragging.moved) return;
  pan.x = dragging.panX + dx;
  pan.y = dragging.panY + dy;
  applyPan();
}

function applyPan() {
  world.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${meshScale})`;
  paintChecks();
}

function ensureStockForm() {
  const key = `${state.target}:${state.path}`;
  if (key === stockBuiltFor) return;
  stockBuiltFor = key;
  const active = closure(state.target, state.path);
  fillGroup(document.querySelector("#leaves"), leafNames().filter((name) => active.has(name) && name !== "Vial of water"));
  fillGroup(document.querySelector("#unfinished"), unfinishedNames());
  const potions = [];
  for (const item of Object.keys(BREW).sort()) {
    if (!active.has(item)) continue;
    potions.push(`${item} (${BREW[item]})`);
    if (BREW[item] === 3 && usesFour(item, state.target, state.path)) potions.push(`${item} (4)`);
  }
  fillGroup(document.querySelector("#potions"), potions);
}

function fillGroup(host, keys) {
  host.replaceChildren();
  for (const key of keys) {
    const row = document.createElement("label");
    row.className = "qty";
    const loose = state.loose[key.replace(/ \(\d+\)$/, "")];
    row.innerHTML = `<img class="ico" alt="" src="${stockIcon(key)}"><span>${escapeHtml(key)}${loose ? ` <i>+${loose} doses</i>` : ""}</span>`;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.dataset.stock = key;
    input.value = state.fields[key] || 0;
    input.addEventListener("input", markDirty);
    row.append(input);
    host.append(row);
  }
}

function stockIcon(key) {
  const dose = key.match(/^(.*) \((\d+)\)$/);
  if (dose) return iconPath(`${slug(dose[1])}--${dose[2]}`);
  if (key.endsWith("(unfinished)")) {
    const entry = RECIPES.find((recipe) => recipe.output === key);
    const herb = entry?.ingredients.find((part) => part[0] !== "Vial of water");
    if (herb) return iconPath(`herb--${slug(herb[0])}`);
  }
  return iconPath(`herb--${slug(key)}`);
}

function commitForm() {
  const batch = Number(document.querySelector("#batch").value);
  if (!Number.isInteger(batch) || batch <= 0) {
    note("Batch size has to be a positive whole number.");
    return;
  }
  state.batch = batch;
  state.fields = readFields();
  note("");
  render();
}

function readFields() {
  const fields = {};
  for (const input of drawer.querySelectorAll("[data-stock]")) {
    const amount = Number(input.value);
    if (Number.isInteger(amount) && amount > 0) fields[input.dataset.stock] = amount;
  }
  return fields;
}

function markDirty() {
  const batch = Number(document.querySelector("#batch").value);
  const fields = readFields();
  const dirty = batch !== state.batch || JSON.stringify(fields) !== JSON.stringify(state.fields);
  document.querySelector("#update").classList.toggle("pending", dirty);
}

function clearAll() {
  state.fields = {};
  state.loose = {};
  state.marks = [];
  stockBuiltFor = "";
  note("");
  render();
}

function resetProgress() {
  state.fields = { ...state.snapshot.fields };
  state.loose = { ...state.snapshot.loose };
  state.marks = [];
  stockBuiltFor = "";
  render();
}

let review = null;
let reviewToken = 0;
let shotJob = Promise.resolve();

function shotCatalog() {
  const items = [];
  for (const name of leafNames()) {
    if (name === "Vial of water") continue;
    items.push({
      key: name,
      name,
      src: stockIcon(name),
      family: name.startsWith("Clean ") ? "herb" : `item:${name}`,
    });
  }
  for (const name of unfinishedNames()) {
    items.push({ key: name, name, src: stockIcon(name), family: "unfinished" });
  }
  for (const item of Object.keys(BREW)) {
    const doses = [BREW[item]];
    if (BREW[item] === 3) doses.push(4);
    for (const dose of doses) {
      const key = `${item} (${dose})`;
      items.push({ key, name: key, src: stockIcon(key), family: `dose-${dose}` });
    }
  }
  return items;
}

function beginShots(files) {
  const images = files.filter((file) => file.type.startsWith("image/"));
  if (!images.length) return;
  document.body.classList.add("drawer-open");
  if (!review) {
    review = { shots: [], choices: {}, counts: {}, status: "Reading…" };
    document.body.classList.add("reviewing");
    document.querySelector("#review").hidden = false;
  }
  review.status = "Reading…";
  paintReview();
  shotJob = shotJob.then(() => ingestShots(images)).catch((error) => {
    if (!review) return;
    review.status = error.message || "Could not read that screenshot.";
    paintReview();
  });
}

async function ingestShots(files) {
  const token = reviewToken;
  const catalog = shotCatalog();
  for (let index = 0; index < files.length; index += 1) {
    if (token !== reviewToken || !review) return;
    review.status = `Reading ${index + 1} of ${files.length}…`;
    paintReview();
    const result = await readBankShot(files[index], catalog, await loadMemory());
    if (token !== reviewToken || !review) return;
    review.shots.push({
      id: `${Date.now()}-${index}-${result.name}`,
      name: result.name,
      skipped: result.skipped,
      rows: result.rows.map((row, rowIndex) => ({ ...row, id: `${Date.now()}-${index}-${rowIndex}` })),
    });
  }
  if (token !== reviewToken || !review) return;
  review.status = "";
  paintReview();
}

function onPasteShot(event) {
  if (!document.body.classList.contains("drawer-open") && !review) return;
  if (event.target.closest("input, textarea, select")) return;
  const files = [];
  for (const item of event.clipboardData?.items || []) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  if (!files.length) return;
  event.preventDefault();
  beginShots(files);
}

function paintReview() {
  const list = document.querySelector("#review-list");
  const noteEl = document.querySelector("#review-note");
  list.replaceChildren();
  if (!review) return;
  if (review.status) noteEl.textContent = review.status;
  else noteEl.textContent = reviewNote();
  const conflicts = conflictGroups();
  const claimed = new Set(conflicts.flatMap((group) => group.entries.flatMap((entry) => entry.rows)));
  for (const group of conflicts) list.append(conflictView(group));
  for (const shot of review.shots) {
    const block = document.createElement("section");
    block.className = "shot-block";
    const head = document.createElement("div");
    head.className = "shot-head";
    const title = document.createElement("span");
    title.textContent = shot.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      review.shots = review.shots.filter((item) => item.id !== shot.id);
      if (!review.shots.length && !review.status) closeReview();
      else paintReview();
    });
    head.append(title, remove);
    block.append(head);
    const rows = shot.rows.filter((row) => !row.deleted && !claimed.has(row));
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = shot.skipped ? `${shot.skipped} skipped in this image` : "Nothing new in this image";
      block.append(empty);
    }
    for (const row of rows) block.append(rowView(row));
    list.append(block);
  }
  document.querySelector("#review-apply").disabled = !canApply();
}

function conflictGroups() {
  const grouped = new Map();
  for (const shot of review.shots) {
    const seen = new Map();
    for (const row of shot.rows) {
      if (row.deleted || row.ambiguous || !row.key) continue;
      if (!seen.has(row.key)) seen.set(row.key, []);
      seen.get(row.key).push(row);
    }
    for (const [key, rows] of seen) {
      if (rows.some((row) => !validCount(row.count))) continue;
      if (!grouped.has(key)) grouped.set(key, []);
      const count = rows.reduce((sum, row) => sum + Number(row.count), 0);
      grouped.get(key).push({ shot, rows, count, name: rows[0].name, src: rows[0].src });
    }
  }
  const groups = [];
  for (const [key, entries] of grouped) {
    if (entries.length < 2) continue;
    groups.push({ key, name: entries[0].name, src: entries[0].src, entries });
  }
  return groups;
}

function conflictView(group) {
  const wrap = document.createElement("div");
  wrap.className = "shot-block";
  const row = document.createElement("div");
  row.className = "review-row";
  const icon = document.createElement("img");
  icon.alt = "";
  icon.src = group.src;
  const name = document.createElement("span");
  name.textContent = group.name;
  row.append(icon, name, document.createElement("span"), document.createElement("span"));
  const choice = document.createElement("div");
  choice.className = "review-choice";
  for (const entry of group.entries) {
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `conflict-${group.key}`;
    radio.checked = review.choices[group.key] === entry.shot.id;
    radio.addEventListener("change", () => {
      review.choices[group.key] = entry.shot.id;
      syncReviewGate();
    });
    const count = document.createElement("input");
    count.type = "number";
    count.min = "0";
    count.step = "1";
    const stored = review.counts[`${group.key}:${entry.shot.id}`];
    count.value = stored == null ? entry.count : stored;
    count.addEventListener("input", () => {
      review.counts[`${group.key}:${entry.shot.id}`] = count.value === "" ? null : Number(count.value);
      review.choices[group.key] = entry.shot.id;
      radio.checked = true;
      syncReviewGate();
    });
    const where = document.createElement("span");
    where.textContent = entry.shot.name;
    label.append(radio, count, where);
    choice.append(label);
  }
  wrap.append(row, choice);
  return wrap;
}

function rowView(row) {
  const line = document.createElement("div");
  line.className = "review-row";
  const icon = document.createElement("img");
  icon.alt = "";
  icon.src = row.preview || row.src;
  line.append(icon);
  if (row.ambiguous) {
    const select = document.createElement("select");
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Choose item";
    select.append(blank);
    const catalog = shotCatalog().slice().sort((a, b) => a.name.localeCompare(b.name));
    const groups = [
      ["Herbs", (item) => item.family === "herb"],
      ["Unfinished", (item) => item.family === "unfinished"],
      ["Potions", (item) => item.family.startsWith("dose")],
      ["Secondaries", (item) => item.family.startsWith("item:")],
    ];
    for (const [label, test] of groups) {
      const group = document.createElement("optgroup");
      group.label = label;
      for (const option of catalog.filter(test)) {
        const choice = document.createElement("option");
        choice.value = option.key;
        choice.textContent = option.name;
        group.append(choice);
      }
      if (group.childElementCount) select.append(group);
    }
    select.value = row.pick || "";
    select.addEventListener("change", () => {
      const picked = [...row.options, ...shotCatalog()].find((option) => option.key === select.value);
      row.pick = picked ? picked.key : "";
      row.key = row.pick;
      row.name = picked ? picked.name : row.name;
      row.src = picked ? picked.src : row.src;
      if (row.pick) rememberRows([row]);
      paintReview();
    });
    line.append(select);
  } else {
    const name = document.createElement("span");
    name.textContent = row.name;
    line.append(name);
  }
  const count = document.createElement("input");
  count.type = "number";
  count.min = "0";
  count.step = "1";
  count.value = row.count ?? "";
  if (row.assumed) {
    count.classList.add("assumed");
    count.title = "No count was read, so this starts at 1";
  }
  count.addEventListener("input", () => {
    row.count = count.value === "" ? null : Number(count.value);
    row.assumed = false;
    count.classList.remove("assumed");
    syncReviewGate();
  });
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "review-x";
  remove.textContent = "×";
  remove.addEventListener("click", () => {
    row.deleted = true;
    paintReview();
  });
  line.append(count, remove);
  return line;
}

function choiceCount(group, entry) {
  const stored = review.counts[`${group.key}:${entry.shot.id}`];
  return stored == null ? entry.count : stored;
}

function pendingChoices() {
  let pending = 0;
  const conflicts = conflictGroups();
  const claimed = new Set(conflicts.flatMap((group) => group.entries.flatMap((entry) => entry.rows)));
  for (const group of conflicts) {
    const chosen = group.entries.find((entry) => entry.shot.id === review.choices[group.key]);
    if (!chosen || !validCount(choiceCount(group, chosen))) pending += 1;
  }
  for (const shot of review.shots) {
    for (const row of shot.rows) {
      if (row.deleted || claimed.has(row)) continue;
      if ((row.ambiguous && !row.pick) || !validCount(row.count)) pending += 1;
    }
  }
  return pending;
}

function reviewNote() {
  const skipped = review.shots.reduce((sum, shot) => sum + shot.skipped, 0);
  const pending = pendingChoices();
  const choice = pending === 1 ? "1 needs a choice" : pending ? `${pending} need a choice` : "";
  const assumed = review.shots.some((shot) => shot.rows.some((row) => !row.deleted && row.assumed));
  const memory = pending ? "A name you pick is remembered next time" : "";
  const gold = assumed ? "Gold outlines were not read" : "";
  return [skipped ? `${skipped} skipped` : "", choice, memory, gold].filter(Boolean).join(" · ");
}

function syncReviewGate() {
  if (!review || review.status) return;
  document.querySelector("#review-note").textContent = reviewNote();
  document.querySelector("#review-apply").disabled = !canApply();
}

function validCount(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function canApply() {
  if (!review || review.status || !review.shots.length) return false;
  return pendingChoices() === 0 && review.shots.some((shot) => shot.rows.some((row) => !row.deleted));
}

async function applyReview() {
  if (!canApply()) return;
  const next = { ...state.fields };
  const snap = { ...state.snapshot.fields };
  const write = (key, count) => {
    const total = (write.totals.get(key) || 0) + count;
    write.totals.set(key, total);
  };
  write.totals = new Map();
  const claimed = new Set();
  for (const group of conflictGroups()) {
    const picked = group.entries.find((entry) => entry.shot.id === review.choices[group.key]);
    const count = picked ? choiceCount(group, picked) : null;
    if (!picked || !validCount(count)) return;
    write(group.key, count);
    for (const entry of group.entries) for (const row of entry.rows) claimed.add(row);
  }
  for (const shot of review.shots) {
    for (const row of shot.rows) {
      if (row.deleted || claimed.has(row)) continue;
      const key = row.pick || row.key;
      if (!key || !validCount(row.count)) continue;
      write(key, row.count);
    }
  }
  for (const [key, count] of write.totals) {
    if (count > 0) {
      next[key] = count;
      snap[key] = count;
    } else {
      delete next[key];
      delete snap[key];
    }
  }
  const remembered = [];
  for (const shot of review.shots) {
    for (const row of shot.rows) {
      if (!row.deleted && (row.pick || row.key) && row.signature) remembered.push(row);
    }
  }
  await rememberRows(remembered);
  state.fields = next;
  state.snapshot = { ...state.snapshot, fields: snap };
  state.marks = [];
  stockBuiltFor = "";
  closeReview();
  note("Imported from screenshots");
  render();
}

function closeReview() {
  reviewToken += 1;
  review = null;
  document.body.classList.remove("reviewing");
  document.querySelector("#review").hidden = true;
  document.querySelector("#review-list").replaceChildren();
  document.querySelector("#review-note").textContent = "";
}

async function onFile(event) {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    const parsed = parseYaml(await file.text());
    const imported = importMap(parsed);
    state.fields = imported.fields;
    state.loose = imported.loose;
    state.snapshot = { fields: { ...imported.fields }, loose: { ...imported.loose } };
    state.marks = [];
    stockBuiltFor = "";
    note(imported.warnings.length ? `Ignored: ${imported.warnings.join(", ")}` : `Imported ${file.name}`);
    render();
  } catch (error) {
    note(error.message);
  }
}

function downloadExample() {
  const lines = ["# Vial counts for potions, item counts for everything else.", "inventory:"];
  for (const name of [...leafNames(), ...unfinishedNames()].sort()) {
    if (name === "Vial of water") continue;
    lines.push(`  ${name}: 0`);
  }
  for (const item of Object.keys(BREW).sort()) {
    lines.push(`  ${item} (${BREW[item]}): 0`);
    if (BREW[item] === 3) lines.push(`  ${item} (4): 0`);
  }
  const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/yaml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "inventory.example.yaml";
  link.click();
  URL.revokeObjectURL(link.href);
}

function parseYaml(text) {
  const stock = {};
  let scoped = false;
  let inside = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "");
    if (!line.trim()) continue;
    const match = line.match(/^(\s*)([^:]+):\s*(.*?)\s*$/);
    if (!match) throw new Error(`Could not read “${raw.trim()}”`);
    const key = match[2].trim();
    const value = match[3].trim();
    if (match[1].length === 0 && key === "inventory" && value === "") {
      scoped = true;
      inside = true;
      continue;
    }
    if (scoped && match[1].length === 0) inside = false;
    if (scoped && !inside) continue;
    if (value === "") continue;
    const amount = Number(value);
    if (!Number.isInteger(amount) || amount < 0) throw new Error(`${key} has to be a non-negative integer`);
    stock[key] = amount;
  }
  return stock;
}

function importMap(map) {
  const fields = {};
  const loose = {};
  const warnings = [];
  const known = new Set([...leafNames(), ...unfinishedNames(), "Vial of water", ...Object.keys(BREW)]);
  for (const [rawKey, amount] of Object.entries(map)) {
    const key = ALIAS[rawKey] || rawKey;
    const sized = key.match(/^(.*) \((\d+)\)$/);
    if (sized) {
      fields[key] = (fields[key] || 0) + amount;
      continue;
    }
    if (BREW[key]) {
      if (BREW[key] === 6) {
        fields[`${key} (6)`] = Math.floor(amount / 6);
        if (amount % 6) loose[key] = amount % 6;
      } else {
        fields[`${key} (4)`] = Math.floor(amount / 4);
        const rem = amount % 4;
        fields[`${key} (3)`] = Math.floor(rem / 3);
        if (rem % 3) loose[key] = rem % 3;
      }
      continue;
    }
    if (!known.has(key)) {
      warnings.push(rawKey);
      continue;
    }
    fields[key] = amount;
  }
  return { fields, loose, warnings };
}

function dosesFromFields(fields, loose) {
  const stock = {};
  for (const [key, amount] of Object.entries(fields)) {
    const sized = key.match(/^(.*) \((\d+)\)$/);
    if (sized && BREW[sized[1]]) stock[sized[1]] = (stock[sized[1]] || 0) + amount * Number(sized[2]);
    else stock[key] = (stock[key] || 0) + amount;
  }
  for (const [key, amount] of Object.entries(loose)) stock[key] = (stock[key] || 0) + amount;
  return stock;
}

function priceFor(node) {
  const count = countFor(node);
  const vials = count === "ok" || count == null ? 0 : count;
  if (node.kind === "herb") {
    if (UNTRADEABLE.has(node.item) || state.prices[node.item] == null) {
      return { text: UNTRADEABLE.has(node.item) ? "no price" : "…", calculated: true };
    }
    return { text: gp(state.prices[node.item] * vials), calculated: false };
  }
  const exact = state.prices[`${node.item} (${node.dose})`];
  if (exact != null) return { text: gp(exact * vials), calculated: false };
  const made = mixCost(node.item);
  if (made == null) return { text: "calculated", calculated: true };
  const perVial = made / (BREW[node.item] / node.dose);
  return { text: `${gp(perVial * Math.max(vials, figures[node.id]?.expected || 0))} calc.`, calculated: true };
}

function materialCost() {
  let total = 0;
  let missing = false;
  const unpriced = [];
  for (const [name, amount] of Object.entries(plan.raw)) {
    if (UNTRADEABLE.has(name)) {
      unpriced.push(name);
      continue;
    }
    const price = state.prices[name];
    if (price == null) {
      missing = true;
      continue;
    }
    total += Math.ceil(num(amount) - 1e-8) * price;
  }
  const tail = unpriced.length ? ` · no GE price for ${unpriced.join(", ")}` : "";
  if (missing) return `${gp(total)} materials, some prices missing${tail}`;
  return `${gp(total)} materials${tail}`;
}

function mixCost(item, seen = new Set()) {
  const key = `${state.path}:${item}`;
  if (mixMemo[key] != null) return mixMemo[key];
  if (seen.has(item)) return null;
  seen.add(item);
  const entry = recipeFor(item, state.path);
  if (!entry) return null;
  let sum = 0;
  for (const [name, count] of entry.ingredients) {
    if (name === "Vial of water") {
      if (state.mods.well === "no" && state.prices["Vial of water"] != null) sum += state.prices["Vial of water"];
      continue;
    }
    if (BREW[name]) {
      const exact = state.prices[`${name} (${count})`];
      if (exact != null) {
        sum += exact;
        continue;
      }
      const made = mixCost(name, seen);
      if (made == null) return null;
      sum += made * (count / BREW[name]);
      continue;
    }
    if (state.prices[name] == null) return null;
    sum += state.prices[name] * count;
  }
  mixMemo[key] = sum;
  return sum;
}

function gp(value) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("en-GB")} gp`;
}

async function ensurePrices() {
  const cached = readJson(PRICE_STORE);
  if (cached && Date.now() - cached.at < FOUR_HOURS) {
    state.prices = cached.prices;
    state.priceAt = cached.at;
    setPriceStatus(false);
    render();
    return;
  }
  if (cached) {
    state.prices = cached.prices;
    state.priceAt = cached.at;
  }
  const names = priceNames();
  try {
    const response = await fetch(`https://api.weirdgloop.org/exchange/history/rs/latest?name=${encodeURIComponent(names.join("|"))}`);
    if (!response.ok) throw new Error(String(response.status));
    const payload = await response.json();
    const prices = { ...(cached?.prices || {}) };
    for (const [name, value] of Object.entries(payload)) {
      const point = Array.isArray(value) ? value[value.length - 1] : value;
      if (point && point.price != null) prices[point.name || name] = point.price;
    }
    state.prices = prices;
    state.priceAt = Date.now();
    localStorage.setItem(PRICE_STORE, JSON.stringify({ at: state.priceAt, prices }));
    setPriceStatus(false);
    render();
  } catch {
    setPriceStatus(true);
    if (cached) render();
  }
}

function priceNames() {
  const names = leafNames().filter((name) => !UNTRADEABLE.has(name));
  names.push("Vial of water");
  for (const item of Object.keys(BREW)) {
    if (UNTRADEABLE.has(item)) continue;
    names.push(`${item} (${BREW[item]})`);
    if (BREW[item] === 3) names.push(`${item} (4)`);
  }
  return names;
}

function setPriceStatus(failed) {
  const host = document.querySelector("#prices");
  if (!state.priceAt) {
    host.textContent = failed ? "Grand Exchange prices did not load." : "Loading Grand Exchange prices…";
    return;
  }
  const when = new Date(state.priceAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: "Europe/Zagreb" });
  host.textContent = failed ? `Prices from ${when} (Zagreb). The latest fetch failed.` : `RS3 prices cached at ${when} (Zagreb).`;
}

function note(text) {
  document.querySelector("#notice").textContent = text;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function loadState() {
  const saved = readJson(STORE) || {};
  return {
    target: saved.target || "Elder overload salve",
    path: saved.path || "elder",
    batch: saved.batch || 100,
    mods: {
      mask: true,
      scroll: true,
      well: "no",
      brooch: false,
      workbench: false,
      cape: false,
      amulet: false,
      mory: false,
      desert: false,
      varan: false,
      grimoire: 0,
      outfit: 0,
      meilyr: false,
      juju: false,
      incense: 0,
      boost: 0,
      ...(saved.mods || {}),
    },
    fields: saved.fields || {},
    loose: saved.loose || {},
    marks: saved.marks || [],
    snapshot: saved.snapshot || { fields: {}, loose: {} },
    selected: null,
    gapStep: Math.max(0, Number(saved.gapStep) || 0),
    framed: false,
    prices: {},
    priceAt: 0,
  };
}

function saveState() {
  localStorage.setItem(STORE, JSON.stringify({
    target: state.target,
    path: state.path,
    batch: state.batch,
    mods: state.mods,
    fields: state.fields,
    loose: state.loose,
    marks: state.marks,
    snapshot: state.snapshot,
    gapStep: state.gapStep,
  }));
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function bundledEntries() {
  if (bundledMemory) return bundledMemory;
  bundledMemory = fetch(new URL("./bank-memory.json", import.meta.url))
    .then((response) => (response.ok ? response.json() : []))
    .then((data) => (Array.isArray(data) ? data : []))
    .catch(() => []);
  return bundledMemory;
}

async function loadMemory() {
  const saved = readJson(MEMORY);
  const local = Array.isArray(saved) ? saved : [];
  const byKey = new Map();
  for (const item of await bundledEntries()) if (item && item.key) byKey.set(item.key, item);
  for (const item of local) if (item && item.key) byKey.set(item.key, item);
  return [...byKey.values()];
}

async function rememberRows(rows) {
  const bundled = new Map((await bundledEntries()).filter((item) => item && item.key).map((item) => [item.key, item]));
  const saved = readJson(MEMORY);
  const byKey = new Map((Array.isArray(saved) ? saved : []).filter((item) => item && item.key).map((item) => [item.key, item]));
  for (const row of rows) {
    const key = row.pick || (!row.ambiguous && row.key);
    if (!key || !row.signature || row.deleted) continue;
    if (!row.w || !row.h) continue;
    const next = { key, name: row.name, src: row.src, w: row.w, h: row.h, signature: row.signature };
    const shipped = bundled.get(key);
    if (shipped && shipped.signature === next.signature && shipped.name === next.name) {
      byKey.delete(key);
      continue;
    }
    byKey.set(key, next);
  }
  const entries = [...byKey.values()];
  if (entries.length) localStorage.setItem(MEMORY, JSON.stringify(entries));
  else localStorage.removeItem(MEMORY);
}
