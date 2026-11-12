import assert from "node:assert/strict";
import { calculate, eq, fr, nodeFigures, num } from "./planner.js";

const plain = { mask: false, scroll: false, well: "no" };

const SUPREME_THREE = {
  "Crystal flask": fr(3),
  "Clean torstol": fr(4),
  "Clean avantoe": fr(4),
  "Clean dwarf weed": fr(12),
  "Clean lantadyme": fr(12),
  "Clean irit": fr(8),
  "Eye of newt": fr(8),
  "Clean kwuarm": fr(8),
  "Limpwurt root": fr(8),
  "Clean cadantine": fr(8),
  "White berries": fr(8),
  "Wine of Zamorak": fr(8),
  "Grenwall spikes": fr(20),
  "Potato cactus": fr(8),
  "Ground mud runes": fr(4),
  "Clean spirit weed": fr(8),
  "Congealed blood": fr(40),
  "Ground miasma rune": fr(4),
};

function checkRaw(actual, expected) {
  for (const [name, amount] of Object.entries(expected)) {
    assert.ok(actual[name], `missing ${name}`);
    assert.ok(eq(actual[name], amount), `${name}: got ${actual[name].n}/${actual[name].d}, want ${amount.n}/${amount.d}`);
  }
  for (const name of Object.keys(actual)) {
    if (name === "Vial of water") continue;
    assert.ok(expected[name], `unexpected ${name}`);
  }
}

const three = calculate({ target: "Supreme overload", vials: 3, mods: plain });
checkRaw(three.raw, SUPREME_THREE);
assert.ok(eq(three.crafted["Supreme overload"].attempts, fr(3)));
const figures = nodeFigures(three);
assert.equal(figures["super-attack--3"].vials, 8);
assert.equal(figures["super-attack--4"].vials, 3);
assert.equal(figures["super-attack--4"].leftover, 0);

const one = calculate({ target: "Supreme overload", vials: 1, mods: plain });
assert.equal(nodeFigures(one)["super-attack--4"].leftover, 1);

const salve = calculate({ target: "Elder overload salve", vials: 1, mods: plain, path: "elder" });
const salveExpected = {};
for (const [name, amount] of Object.entries(SUPREME_THREE)) salveExpected[name] = fr(amount.n, amount.d * 3);
salveExpected["Primal extract"] = fr(1);
salveExpected["Clean fellstalk"] = fr(7, 3);
salveExpected["Morchella mushroom"] = fr(4, 3);
salveExpected["Snape grass"] = fr(4, 3);
salveExpected["Clean ranarr"] = fr(4, 3);
salveExpected["Unicorn horn dust"] = fr(4, 3);
salveExpected["Clean irit"] = fr(4);
salveExpected["Dragon scale dust"] = fr(8, 3);
salveExpected["Clean lantadyme"] = fr(20, 3);
salveExpected["Phoenix feather"] = fr(4, 3);
checkRaw(salve.raw, salveExpected);

const banked = calculate({
  target: "Supreme overload",
  vials: 1,
  stock: { Overload: 4 },
  mods: plain,
});
assert.equal(banked.raw["Clean torstol"], undefined);
assert.ok(eq(banked.raw["Crystal flask"], fr(1)));
assert.ok(eq(banked.raw["Clean irit"], fr(4, 3)));

const torstol = calculate({ target: "Supreme overload", vials: 1, mods: { mask: false, scroll: true, well: "no" } });
assert.ok(eq(torstol.raw["Crystal flask"], fr(1)));
assert.ok(eq(torstol.raw["Clean torstol"], fr(4 * 69 * 59, 3 * 70 * 60)));

const blood = calculate({ target: "Super necromancy", vials: 1, mods: { mask: false, scroll: true, well: "no" } });
assert.ok(eq(blood.raw["Congealed blood"], fr(9, 2)));
assert.ok(eq(blood.raw["Clean spirit weed"], fr(9, 10)));
assert.ok(eq(blood.raw["Vial of water"], fr(1)));

const boosted = calculate({
  target: "Super attack",
  vials: 1,
  mods: { mask: true, scroll: true, well: "always", brooch: true },
});
assert.ok(eq(boosted.crafted["Super attack"].attempts, fr(20, 23)));
assert.equal(boosted.raw["Vial of water"], undefined);
assert.ok(eq(boosted.raw["Eye of newt"], fr(20 * 9, 23 * 10)));
assert.ok(eq(boosted.raw["Clean irit"], fr(20 * 20 * 9, 23 * 23 * 10)));

const masked = calculate({ target: "Elder overload salve", vials: 1, mods: { mask: true, scroll: false, well: "no" } });
const welled = calculate({
  target: "Elder overload salve",
  vials: 1,
  mods: { mask: true, scroll: false, well: "always", brooch: true },
});
assert.ok(eq(masked.crafted["Elder overload salve"].attempts, fr(20, 21)));
assert.ok(eq(welled.crafted["Elder overload salve"].attempts, fr(20, 21)));

const bench = calculate({
  target: "Elder overload",
  vials: 1,
  mods: { mask: false, scroll: true, well: "no", workbench: true },
});
assert.ok(eq(bench.raw["Primal extract"], fr(1)));
assert.ok(eq(bench.raw["Clean fellstalk"], fr(1)));

const marked = calculate({
  target: "Supreme overload",
  vials: 1,
  mods: plain,
  marks: ["super-attack--4"],
});
assert.equal(nodeFigures(marked)["super-attack--4"].vials, 0);
assert.ok(nodeFigures(marked)["super-attack--3"].vials > 0);
assert.ok(eq(marked.raw["Clean irit"], fr(4, 3)));
assert.ok(marked.raw["Clean torstol"]);

console.log("planner ok", num(three.raw["Clean irit"]));
