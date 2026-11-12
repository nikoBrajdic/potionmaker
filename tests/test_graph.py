import unittest
from pathlib import Path

from calculator import calculate, load_catalog
from graph import TEMPLATE, fill_graph, quantities, spot_ids, write_template

ROOT = Path(__file__).resolve().parents[1]
CATALOG = load_catalog(ROOT / "recipes.yaml")


class GraphTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        write_template()

    def test_spots_are_unique_and_present(self) -> None:
        ids = spot_ids()
        self.assertEqual(len(ids), len(set(ids)))
        template = TEMPLATE.read_text(encoding="utf-8")
        for qid in ids:
            self.assertEqual(template.count(f'id="{qid}"'), 1)

    def test_fill_changes_counts_and_leaves_icons_where_they_are(self) -> None:
        template = TEMPLATE.read_text(encoding="utf-8")
        images = [line for line in template.splitlines() if "<image " in line]
        plan = calculate(CATALOG, {}, "Elder overload salve", 1)
        destination = ROOT / "graph" / "_plan_test.svg"
        try:
            fill_graph(plan, destination)
            filled = destination.read_text(encoding="utf-8")
        finally:
            destination.unlink(missing_ok=True)
        self.assertEqual([line for line in filled.splitlines() if "<image " in line], images)
        self.assertIn(">1 × Elder overload salve<", filled)
        self.assertNotEqual(quantities(plan)["q-make-elder-overload-salve"], "0")
        self.assertIn(f'>{quantities(plan)["q-make-elder-overload-salve"]}<', filled)
        self.assertIn('id="q-make-elder-overload-salve"', template)
        self.assertIn(">0</text>", template)


if __name__ == "__main__":
    unittest.main()
