"""Plan ingredients for an elder overload salve."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

from calculator import Bonuses, RecipeError, calculate, load_catalog, load_inventory, render
from graph import fill_graph

ROOT = Path(__file__).resolve().parent


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="How many resources you still need for a batch of elder overload salves."
    )
    parser.add_argument("inventory", type=Path, help="YAML map of what you already have")
    parser.add_argument("count", type=int, help="Finished potions to make, defaulting to elder overload salves")
    parser.add_argument("--portable-well", action="store_true", help="Use a portable well (5%% extra potion, free vials of water)")
    parser.add_argument("--brooch", action="store_true", help="Brooch of the Gods: the well's extra-potion chance becomes 10%%")
    parser.add_argument(
        "--workbench",
        action="store_true",
        help="Finish overloads at Granny Rowan's workbench, which cannot save ingredients",
    )
    parser.add_argument("--recipes", type=Path, default=ROOT / "recipes.yaml")
    parser.add_argument("--item", help="Recipe to plan. Defaults to the target in recipes.yaml")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        catalog = load_catalog(args.recipes)
        inventory, warnings = load_inventory(args.inventory, catalog)
        plan = calculate(
            catalog,
            inventory,
            args.item or catalog.target,
            args.count,
            Bonuses(
                portable_well=args.portable_well,
                brooch=args.brooch,
                workbench=args.workbench,
            ),
        )
    except (OSError, RecipeError, yaml.YAMLError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    plan.warnings.extend(warnings)
    print(render(plan, catalog))
    try:
        picture = fill_graph(plan)
    except (OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(f"Graph: {picture}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
