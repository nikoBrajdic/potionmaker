import unittest
from fractions import Fraction
from pathlib import Path

from calculator import Bonuses, calculate, load_catalog, load_inventory

ROOT = Path(__file__).resolve().parents[1]
CATALOG = load_catalog(ROOT / "recipes.yaml")

# Wiki "creation from scratch" list for 3 supreme overload potions, with no boosts.
SUPREME_THREE = {
    "Crystal flask": Fraction(3),
    "Clean torstol": Fraction(4),
    "Clean avantoe": Fraction(4),
    "Clean dwarf weed": Fraction(12),
    "Clean lantadyme": Fraction(12),
    "Clean irit": Fraction(8),
    "Eye of newt": Fraction(8),
    "Clean kwuarm": Fraction(8),
    "Limpwurt root": Fraction(8),
    "Clean cadantine": Fraction(8),
    "White berries": Fraction(8),
    "Wine of Zamorak": Fraction(8),
    "Grenwall spikes": Fraction(20),
    "Potato cactus": Fraction(8),
    "Ground mud runes": Fraction(4),
    "Clean spirit weed": Fraction(8),
    "Congealed blood": Fraction(40),
    "Ground miasma rune": Fraction(4),
    "Vial of water": Fraction(48),
}


def plain() -> Bonuses:
    return Bonuses(mask=Fraction(0), cleansing=Fraction(0))


class CalculatorTest(unittest.TestCase):
    def test_three_supremes_match_the_wiki_scratch_list(self) -> None:
        plan = calculate(CATALOG, {}, "Supreme overload", 3, plain())
        self.assertEqual(plan.raw, SUPREME_THREE)
        self.assertEqual(plan.crafted[0].item, "Supreme overload")
        self.assertEqual(plan.crafted[0].attempts, Fraction(3))

    def test_one_salve_adds_the_utility_potions(self) -> None:
        plan = calculate(CATALOG, {}, "Elder overload salve", 1, plain())
        expected = {name: amount / 3 for name, amount in SUPREME_THREE.items()}
        expected["Primal extract"] = Fraction(1)
        expected["Clean fellstalk"] = Fraction(7, 3)
        expected["Morchella mushroom"] = Fraction(4, 3)
        expected["Snape grass"] = Fraction(4, 3)
        expected["Clean ranarr"] = Fraction(4, 3)
        expected["Unicorn horn dust"] = Fraction(4, 3)
        expected["Clean irit"] += Fraction(4, 3)
        expected["Dragon scale dust"] = Fraction(8, 3)
        expected["Clean lantadyme"] += Fraction(8, 3)
        expected["Phoenix feather"] = Fraction(4, 3)
        expected["Vial of water"] += Fraction(20, 3)
        self.assertEqual(plan.raw, expected)

    def test_banked_overload_is_not_expanded(self) -> None:
        plan = calculate(CATALOG, {"Overload": 4}, "Supreme overload", 1, plain())
        self.assertNotIn("Clean torstol", plan.raw)
        self.assertEqual(plan.inventory_used["Overload"], Fraction(4))
        self.assertEqual(plan.raw["Crystal flask"], Fraction(1))
        self.assertEqual(plan.raw["Clean irit"], Fraction(4, 3))
        self.assertNotIn("Clean avantoe", plan.raw)

    def test_alias_and_partial_elder_stock(self) -> None:
        inventory, warnings = load_inventory_text("Basic overload: 3\nNot a herb: 4\n")
        self.assertEqual(warnings, ["Ignoring unknown inventory item Not a herb"])
        plan = calculate(CATALOG, inventory, "Overload", 2, plain())
        # Two 3-dose overloads are 6 doses. Three are already banked, so one mix remains.
        self.assertEqual(plan.inventory_used["Overload"], Fraction(3))
        self.assertEqual(plan.crafted[0].attempts, Fraction(1))
        self.assertEqual(plan.raw["Clean torstol"], Fraction(1))

    def test_mask_lowers_salve_mixes_and_the_well_does_not(self) -> None:
        masked = calculate(CATALOG, {}, "Elder overload salve", 1, Bonuses(cleansing=Fraction(0)))
        with_well = calculate(
            CATALOG,
            {},
            "Elder overload salve",
            1,
            Bonuses(cleansing=Fraction(0), portable_well=True, brooch=True),
        )
        self.assertEqual(masked.crafted[0].attempts, Fraction(20, 21))
        self.assertEqual(with_well.crafted[0].attempts, Fraction(20, 21))

    def test_well_and_brooch_stack_with_the_mask_on_a_normal_potion(self) -> None:
        plan = calculate(
            CATALOG,
            {},
            "Super attack",
            1,
            Bonuses(portable_well=True, brooch=True),
        )
        # 5% mask + 10% well, then the same chance again on the unfinished potion.
        self.assertEqual(plan.crafted[0].attempts, Fraction(20, 23))
        self.assertNotIn("Vial of water", plan.raw)
        self.assertEqual(plan.raw["Eye of newt"], Fraction(20, 23) * Fraction(9, 10))
        self.assertEqual(plan.raw["Clean irit"], Fraction(20, 23) / Fraction(23, 20) * Fraction(9, 10))

    def test_brooch_without_a_well_changes_nothing(self) -> None:
        left = calculate(CATALOG, {}, "Super attack", 1, Bonuses(cleansing=Fraction(0)))
        right = calculate(
            CATALOG,
            {},
            "Super attack",
            1,
            Bonuses(cleansing=Fraction(0), brooch=True),
        )
        self.assertEqual(left.raw, right.raw)

    def test_cleansing_saves_one_secondary_and_never_the_first(self) -> None:
        plan = calculate(
            CATALOG,
            {},
            "Supreme overload",
            1,
            Bonuses(mask=Fraction(0)),
        )
        self.assertEqual(plan.raw["Crystal flask"], Fraction(1))
        # 4 overload doses, each secondary saved at 1/70, then torstol saved at 1/60.
        self.assertEqual(
            plan.raw["Clean torstol"],
            Fraction(4, 3) * Fraction(69, 70) * Fraction(59, 60),
        )

    def test_super_necromancy_saves_the_whole_blood_stack(self) -> None:
        plan = calculate(CATALOG, {}, "Super necromancy", 1, Bonuses(mask=Fraction(0)))
        self.assertEqual(plan.raw["Congealed blood"], Fraction(5) * Fraction(9, 10))
        self.assertEqual(plan.raw["Clean spirit weed"], Fraction(9, 10))
        self.assertEqual(plan.raw["Vial of water"], Fraction(1))

    def test_workbench_disables_cleansing_on_overloads_only(self) -> None:
        normal = calculate(CATALOG, {}, "Elder overload", 1, Bonuses(mask=Fraction(0)))
        bench = calculate(
            CATALOG,
            {},
            "Elder overload",
            1,
            Bonuses(mask=Fraction(0), workbench=True),
        )
        self.assertEqual(normal.raw["Primal extract"], Fraction(19, 20))
        self.assertEqual(bench.raw["Primal extract"], Fraction(1))
        self.assertEqual(bench.raw["Clean fellstalk"], Fraction(1))
        # The supreme underneath is also a workbench recipe, so its flask is still 1
        # and its secondaries are no longer discounted either.
        self.assertGreater(bench.raw["Clean torstol"], normal.raw["Clean torstol"])

    def test_records_what_each_mix_uses_and_makes(self) -> None:
        plan = calculate(CATALOG, {}, "Super attack", 1, plain())
        made = {craft.item: craft for craft in plan.crafted}
        self.assertEqual(made["Super attack"].produced, Fraction(3))
        self.assertEqual(made["Super attack"].consumed["Eye of newt"], Fraction(1))
        self.assertEqual(made["Irit potion (unfinished)"].consumed["Clean irit"], Fraction(1))
        self.assertEqual(made["Irit potion (unfinished)"].consumed["Vial of water"], Fraction(1))

    def test_example_inventory_loads(self) -> None:
        stock, warnings = load_inventory(ROOT / "inventory.example.yaml", CATALOG)
        self.assertEqual(warnings, [])
        self.assertEqual(set(stock), set(CATALOG.units))


def load_inventory_text(text: str) -> tuple[dict[str, int], list[str]]:
    path = ROOT / "tests" / "_inventory.yaml"
    path.write_text(text, encoding="utf-8")
    try:
        return load_inventory(path, CATALOG)
    finally:
        path.unlink()


if __name__ == "__main__":
    unittest.main()
