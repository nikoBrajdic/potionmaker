// Dose math matches calculator.py. Vials of water stay in the totals when the
// well is off, and the page simply does not draw them. Unfinished potions stay
// in the math so the herb can be saved; the graph draws the herb instead.

const ZERO = fr(0);

export const TARGETS = [
  ["Elder overload salve", "Elder overload salve (6)"],
  ["Supreme overload salve", "Supreme overload salve (6)"],
  ["Elder overload", "Elder overload (6)"],
  ["Supreme overload", "Supreme overload (6)"],
  ["Overload", "Overload (3)"],
];

const CAPE_BATCH = new Set(["Overload", "Supreme overload", "Elder overload"]);

// Base XP for one mix. Steps without an entry are left out of the total.
// Sources: potion pages on the wiki, November 2026. Salve XP differs by path.
export const XP = {
  "Super attack": 125,
  "Super strength": 125,
  "Super defence": 125,
  "Super ranging potion": 162.5,
  "Super magic potion": 172.5,
  "Super necromancy": 177.5,
  "Extreme attack": 220,
  "Extreme strength": 230,
  "Extreme defence": 240,
  "Extreme magic": 250,
  "Extreme ranging": 260,
  "Prayer potion": 87.5,
  "Super antipoison": 106.3,
  "Antifire": 157.5,
  "Super antifire": 210,
  Overload: 1000,
  "Supreme overload": 600,
  "Supreme overload salve": 700,
};

const SALVE_XP = { elder: 750, salve: 900 };

export const RECIPES = [
  recipe("Elder overload salve", 6, [
    ["Elder overload", 6],
    ["Prayer renewal", 4],
    ["Prayer potion", 4],
    ["Super antipoison", 4],
    ["Antifire", 4],
    ["Super antifire", 4],
  ], { combination: true, workbench: true, path: "elder" }),
  recipe("Elder overload salve", 6, [
    ["Supreme overload salve", 6],
    ["Primal extract", 1],
    ["Clean fellstalk", 1],
  ], { combination: true, workbench: true, path: "salve" }),
  recipe("Supreme overload salve", 6, [
    ["Supreme overload", 6],
    ["Prayer renewal", 4],
    ["Prayer potion", 4],
    ["Super antipoison", 4],
    ["Antifire", 4],
    ["Super antifire", 4],
    ["Crystal flask", 1],
  ], { combination: true, workbench: true }),
  recipe("Elder overload", 6, [
    ["Supreme overload", 6],
    ["Primal extract", 1],
    ["Clean fellstalk", 1],
  ], { combination: true, workbench: true }),
  recipe("Supreme overload", 6, [
    ["Crystal flask", 1],
    ["Overload", 4],
    ["Super attack", 4],
    ["Super defence", 4],
    ["Super strength", 4],
    ["Super ranging potion", 4],
    ["Super magic potion", 4],
    ["Super necromancy", 4],
  ], { combination: true, workbench: true }),
  recipe("Overload", 3, [
    ["Extreme attack", 3],
    ["Extreme strength", 3],
    ["Extreme defence", 3],
    ["Extreme magic", 3],
    ["Extreme ranging", 3],
    ["Extreme necromancy", 3],
    ["Clean torstol", 1],
  ], { combination: true, workbench: true }),
  recipe("Extreme attack", 3, [["Super attack", 3], ["Clean avantoe", 1]]),
  recipe("Extreme strength", 3, [["Super strength", 3], ["Clean dwarf weed", 1]]),
  recipe("Extreme defence", 3, [["Super defence", 3], ["Clean lantadyme", 1]]),
  recipe("Extreme magic", 3, [["Super magic potion", 3], ["Ground mud runes", 1]]),
  recipe("Extreme ranging", 3, [["Super ranging potion", 3], ["Grenwall spikes", 5]]),
  recipe("Extreme necromancy", 3, [["Super necromancy", 3], ["Ground miasma rune", 1]]),
  recipe("Super attack", 3, [["Irit potion (unfinished)", 1], ["Eye of newt", 1]]),
  recipe("Super strength", 3, [["Kwuarm potion (unfinished)", 1], ["Limpwurt root", 1]]),
  recipe("Super defence", 3, [["Cadantine potion (unfinished)", 1], ["White berries", 1]]),
  recipe("Super magic potion", 3, [["Lantadyme potion (unfinished)", 1], ["Potato cactus", 1]]),
  recipe("Super ranging potion", 3, [["Dwarf weed potion (unfinished)", 1], ["Wine of Zamorak", 1]]),
  recipe("Super necromancy", 3, [["Spirit weed potion (unfinished)", 1], ["Congealed blood", 5]]),
  recipe("Prayer renewal", 3, [["Fellstalk potion (unfinished)", 1], ["Morchella mushroom", 1]]),
  recipe("Prayer potion", 3, [["Ranarr potion (unfinished)", 1], ["Snape grass", 1]]),
  recipe("Super antipoison", 3, [["Irit potion (unfinished)", 1], ["Unicorn horn dust", 1]]),
  recipe("Antifire", 3, [["Lantadyme potion (unfinished)", 1], ["Dragon scale dust", 1]]),
  recipe("Super antifire", 3, [["Antifire", 3], ["Phoenix feather", 1]]),
  recipe("Irit potion (unfinished)", 1, [["Vial of water", 1], ["Clean irit", 1]]),
  recipe("Kwuarm potion (unfinished)", 1, [["Vial of water", 1], ["Clean kwuarm", 1]]),
  recipe("Cadantine potion (unfinished)", 1, [["Vial of water", 1], ["Clean cadantine", 1]]),
  recipe("Dwarf weed potion (unfinished)", 1, [["Vial of water", 1], ["Clean dwarf weed", 1]]),
  recipe("Lantadyme potion (unfinished)", 1, [["Vial of water", 1], ["Clean lantadyme", 1]]),
  recipe("Spirit weed potion (unfinished)", 1, [["Vial of water", 1], ["Clean spirit weed", 1]]),
  recipe("Fellstalk potion (unfinished)", 1, [["Vial of water", 1], ["Clean fellstalk", 1]]),
  recipe("Ranarr potion (unfinished)", 1, [["Vial of water", 1], ["Clean ranarr", 1]]),
];

export const BREW = {};
const NAME_OF = {};
for (const entry of RECIPES) {
  remember(entry.output);
  for (const [name] of entry.ingredients) remember(name);
  if (!entry.output.endsWith("(unfinished)") && entry.amount >= 3) BREW[entry.output] = entry.amount;
}

export const UNTRADEABLE = new Set([
  "Overload",
  "Supreme overload",
  "Elder overload",
  "Elder overload salve",
  "Supreme overload salve",
  "Extreme attack",
  "Extreme strength",
  "Extreme defence",
  "Extreme magic",
  "Extreme ranging",
  "Extreme necromancy",
  "Phoenix feather",
]);

export function recipeFor(item, path) {
  const found = RECIPES.filter((entry) => entry.output === item && (!entry.path || entry.path === path));
  return found[0] || null;
}

export function closure(target, path) {
  const seen = new Set();
  const walk = (item) => {
    if (seen.has(item)) return;
    seen.add(item);
    const entry = recipeFor(item, path);
    if (!entry) return;
    for (const [name] of entry.ingredients) walk(name);
  };
  walk(target);
  return seen;
}

export function usesFour(item, target, path) {
  if (BREW[item] !== 3) return false;
  const items = closure(target, path);
  for (const entry of RECIPES) {
    if (!items.has(entry.output)) continue;
    if (entry.path && entry.path !== path) continue;
    for (const [name, amount] of entry.ingredients) {
      if (name === item && amount === 4) return true;
    }
  }
  return false;
}

export function calculate(options) {
  const target = options.target;
  const path = options.path || "elder";
  const mods = normalize(options.mods);
  const vials = options.vials;
  if (!Number.isInteger(vials) || vials <= 0) throw new Error("Batch size must be a positive integer");
  const output = recipeFor(target, path);
  if (!output) throw new Error(`No recipe for ${target}`);

  let stock = doseStock(options.stock || {});
  let reserved = {};
  const marks = options.marks || [];
  let plan = null;
  for (let pass = 0; pass < 16; pass += 1) {
    plan = run(target, fr(vials * output.amount), stock, mods, path, reserved);
    let changed = false;
    for (const mark of marks) {
      const extra = markDoses(plan, mark);
      if (cmp(extra.doses, ZERO) <= 0) continue;
      if (extra.bucket === "reserved") {
        reserved = { ...reserved, [extra.item]: add(reserved[extra.item] || ZERO, extra.doses) };
      } else {
        stock = { ...stock, [extra.item]: add(stock[extra.item] || ZERO, extra.doses) };
      }
      changed = true;
    }
    if (!changed) break;
  }
  plan.mods = mods;
  plan.path = path;
  plan.target = target;
  plan.vials = vials;
  plan.xp = experience(plan, mods, path);
  return plan;
}

function markDoses(plan, mark) {
  if (mark.startsWith("item:")) {
    const item = mark.slice(5);
    return { item, bucket: "stock", doses: plan.raw[item] || ZERO };
  }
  const [slugId, size] = mark.split("--");
  const item = NAME_OF[slugId];
  if (!item) return { item: slugId, bucket: "stock", doses: ZERO };
  const demand = plan.demand[item] || { d3: ZERO, d4: ZERO, d6: ZERO };
  if (size === "4") return { item, bucket: "reserved", doses: demand.d4 };
  const row = plan.crafted[item];
  return { item, bucket: "stock", doses: row ? row.produced : ZERO };
}

function run(target, doses, stock, mods, path, reservedIn) {
  const inventory = {};
  for (const [name, amount] of Object.entries(stock)) inventory[name] = amount;
  const reserved = {};
  for (const [name, amount] of Object.entries(reservedIn || {})) reserved[name] = amount;
  const crafted = {};
  const raw = {};
  const demand = {};
  const requireItem = (item, amount) => {
    if (item === "Vial of water" && mods.well !== "no") return;
    if (cmp(amount, ZERO) <= 0) return;
    const have = inventory[item] || ZERO;
    const used = cmp(have, amount) < 0 ? have : amount;
    if (cmp(used, ZERO) > 0) inventory[item] = sub(have, used);
    const needed = sub(amount, used);
    if (cmp(needed, ZERO) <= 0) return;
    const entry = recipeFor(item, path);
    if (!entry) {
      if (item !== "Vial of water" || mods.well === "no") raw[item] = add(raw[item] || ZERO, needed);
      return;
    }
    const each = outputPerMix(entry, mods);
    const attempts = div(needed, each);
    const row = crafted[item] || { attempts: ZERO, produced: ZERO, consumed: {} };
    row.attempts = add(row.attempts, attempts);
    row.produced = add(row.produced, needed);
    crafted[item] = row;
    entry.ingredients.forEach((ingredient, index) => {
      const [name, count] = ingredient;
      if (mods.well !== "no" && name === "Vial of water") return;
      const keep = saveChance(entry, index, mods);
      let take = mul(attempts, mul(fr(count), sub(fr(1), keep)));
      if (count === 4 && reserved[name] && cmp(reserved[name], ZERO) > 0) {
        const use = cmp(reserved[name], take) < 0 ? reserved[name] : take;
        reserved[name] = sub(reserved[name], use);
        take = sub(take, use);
      }
      if (cmp(take, ZERO) <= 0) return;
      row.consumed[name] = add(row.consumed[name] || ZERO, take);
      if (BREW[name]) {
        const bucket = count === 4 ? "d4" : count >= 6 ? "d6" : "d3";
        const slot = demand[name] || { d3: ZERO, d4: ZERO, d6: ZERO };
        slot[bucket] = add(slot[bucket], take);
        demand[name] = slot;
      }
      requireItem(name, take);
    });
  };
  requireItem(target, doses);
  return { crafted, raw, demand };
}

function outputPerMix(entry, mods) {
  let amount = fr(entry.amount);
  if (entry.amount === 3) amount = add(amount, fourDose(entry.output, mods));
  if (mods.cape && CAPE_BATCH.has(entry.output)) amount = mul(amount, fr(5, 4));
  return mul(amount, add(fr(1), duplication(entry, mods)));
}

function duplication(entry, mods) {
  let extra = mods.mask ? fr(1, 20) : ZERO;
  if (mods.well !== "no" && !entry.combination) extra = add(extra, mods.brooch ? fr(1, 10) : fr(1, 20));
  return extra;
}

function saveChance(entry, index, mods) {
  if (index === 0) return ZERO;
  if (mods.workbench && entry.workbench) return ZERO;
  const secondaries = entry.ingredients.length - 1;
  if (secondaries <= 0 || !mods.scroll) return ZERO;
  return fr(1, 10 * secondaries);
}

export function fourDose(item, mods) {
  if (BREW[item] !== 3) return ZERO;
  if (item === "Overload" && mods.cape) return ZERO;
  const pocketBlocked = mods.brooch && mods.grimoire > 0 && mods.grimoire < 4;
  let chance = ZERO;
  const amuletBlocked = mods.desert && item === "Super antifire";
  if (mods.amulet && !amuletBlocked) chance = add(chance, fr(1, 20));
  if (mods.mory && item === "Prayer renewal") chance = add(chance, fr(1, 5));
  if (mods.desert && item === "Super antifire") chance = add(chance, fr(1, 5));
  if (mods.varan && item === "Super antipoison") chance = add(chance, fr(1, 10));
  if (!pocketBlocked && mods.grimoire >= 2 && item === "Super necromancy") chance = add(chance, fr(1, 10));
  if (!pocketBlocked && mods.grimoire >= 3 && item === "Extreme necromancy") chance = add(chance, fr(1, 10));
  if (cmp(chance, fr(1)) > 0) return fr(1);
  return chance;
}

function experience(plan, mods, path) {
  let total = 0;
  let missing = false;
  for (const [item, row] of Object.entries(plan.crafted)) {
    if (cmp(row.attempts, ZERO) <= 0) continue;
    let base = XP[item];
    if (item === "Elder overload salve") base = SALVE_XP[path] || SALVE_XP.elder;
    if (base == null) {
      if (!item.endsWith("(unfinished)")) missing = true;
      continue;
    }
    const entry = recipeFor(item, path);
    total += num(row.attempts) * base * xpMultiplier(entry, mods);
  }
  return { total, missing };
}

function xpMultiplier(entry, mods) {
  if (!entry) return 1;
  const outfit = (mods.outfit || 0) * 0.01 + (mods.outfit === 5 ? 0.01 : 0);
  const juju = entry.combination && mods.juju ? 0.05 : 0;
  const additive = 1 + outfit + juju + (mods.boost || 0) / 100;
  const meilyr = entry.combination && mods.meilyr ? 1.2 : 1;
  const incense = 1 + 0.005 * (mods.incense || 0);
  let well = 1;
  if (mods.well === "always" || (mods.well === "mix" && !entry.combination)) well = 1.1;
  return additive * meilyr * incense * well;
}

export function nodeFigures(plan) {
  const figures = {};
  const mods = plan.mods;
  for (const item of Object.keys(BREW)) {
    const row = plan.crafted[item];
    const attempts = row ? num(row.attempts) : 0;
    const demand = plan.demand[item] || { d3: ZERO, d4: ZERO, d6: ZERO };
    const brew = BREW[item];
    if (brew === 3) {
      const p = num(fourDose(item, mods));
      const expected3 = attempts * (1 - p);
      const d3 = num(demand.d3);
      const d4 = num(demand.d4);
      figures[`${slug(item)}--3`] = { vials: ceil(expected3), expected: expected3 };
      figures[`${slug(item)}--4`] = {
        vials: ceil(d4 / 4),
        expected: d4 / 4,
        leftover: leftover(expected3, p, attempts, d3, d4),
      };
    } else {
      figures[`${slug(item)}--${brew}`] = { vials: ceil(attempts), expected: attempts, leftover: 0 };
    }
  }
  return figures;
}

function leftover(expected3, p, attempts, d3, d4) {
  if (d4 <= 1e-8) return 0;
  const mixes3 = ceil(expected3);
  const mixes4 = ceil(attempts * p);
  const extra = mixes3 * 3 + mixes4 * 4 - d3 - d4;
  if (extra <= 0.5) return 0;
  const rem = Math.round(extra) % 4;
  return rem === 0 ? 0 : rem;
}

export function leafNames() {
  const names = new Set();
  for (const entry of RECIPES) {
    for (const [name] of entry.ingredients) {
      if (!recipeFor(name, "elder") && !recipeFor(name, "salve") && name !== "Vial of water") names.add(name);
    }
  }
  return [...names].sort();
}

export function unfinishedNames() {
  return RECIPES.map((entry) => entry.output).filter((name) => name.endsWith("(unfinished)"));
}

export function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function remember(name) {
  NAME_OF[slug(name)] = name;
}

export function num(value) {
  return value.n / value.d;
}

export function eq(a, b) {
  return a.n * b.d === b.n * a.d;
}

export function fr(n, d = 1) {
  if (typeof n === "object") return n;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(Math.abs(n), Math.abs(d));
  return { n: n / g, d: d / g };
}

function add(a, b) {
  return fr(a.n * b.d + b.n * a.d, a.d * b.d);
}
function sub(a, b) {
  return fr(a.n * b.d - b.n * a.d, a.d * b.d);
}
function mul(a, b) {
  return fr(a.n * b.n, a.d * b.d);
}
function div(a, b) {
  return fr(a.n * b.d, a.d * b.n);
}
function cmp(a, b) {
  return a.n * b.d - b.n * a.d;
}
function gcd(a, b) {
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}
function ceil(value) {
  if (value <= 1e-8) return 0;
  return Math.ceil(value - 1e-8);
}

function recipe(output, amount, ingredients, flags = {}) {
  return {
    output,
    amount,
    ingredients,
    combination: Boolean(flags.combination),
    workbench: Boolean(flags.workbench),
    path: flags.path || null,
  };
}

function doseStock(stock) {
  const doses = {};
  for (const [name, amount] of Object.entries(stock)) {
    doses[name] = fr(amount);
  }
  return doses;
}

function normalize(mods = {}) {
  return {
    mask: Boolean(mods.mask),
    scroll: Boolean(mods.scroll),
    well: mods.well || "no",
    brooch: Boolean(mods.brooch),
    workbench: Boolean(mods.workbench),
    cape: Boolean(mods.cape),
    amulet: Boolean(mods.amulet),
    mory: Boolean(mods.mory),
    desert: Boolean(mods.desert),
    varan: Boolean(mods.varan),
    grimoire: Number(mods.grimoire) || 0,
    outfit: Number(mods.outfit) || 0,
    meilyr: Boolean(mods.meilyr),
    juju: Boolean(mods.juju),
    incense: Number(mods.incense) || 0,
    boost: Number(mods.boost) || 0,
  };
}
