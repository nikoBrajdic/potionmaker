"""Recursive herblore planner.

Expected yields come from the Scroll of cleansing, the modified botanist's mask,
and an optional portable well. Inventory is spent from the finished potion
downward, so a banked overload is not also expanded into its ingredients.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from fractions import Fraction
from math import ceil
from pathlib import Path

import yaml


class RecipeError(ValueError):
    """The recipe file or an inventory entry cannot be used."""


@dataclass(frozen=True)
class Ingredient:
    item: str
    amount: int


@dataclass(frozen=True)
class Recipe:
    output: str
    amount: int
    combination: bool
    workbench: bool
    ingredients: tuple[Ingredient, ...]


@dataclass(frozen=True)
class Catalog:
    target: str
    units: dict[str, str]
    aliases: dict[str, str]
    recipes: dict[str, Recipe]
    free_with_well: frozenset[str]

    def unit(self, item: str) -> str:
        try:
            return self.units[item]
        except KeyError as error:
            raise RecipeError(f"Unknown item {item!r}") from error


@dataclass(frozen=True)
class Bonuses:
    """Production bonuses. Chances are expected values, not guaranteed procs."""

    mask: Fraction = Fraction(1, 20)
    cleansing: Fraction = Fraction(1, 10)
    portable_well: bool = False
    brooch: bool = False
    workbench: bool = False

    def duplication(self, recipe: Recipe) -> Fraction:
        """Extra potions per mix. The mask and the well each add their own chance."""
        if self.mask < 0 or self.cleansing < 0:
            raise RecipeError("Bonus chances cannot be negative")
        chance = self.mask
        if self.portable_well and not recipe.combination:
            chance += Fraction(1, 10) if self.brooch else Fraction(1, 20)
        return chance

    def save_chance(self, recipe: Recipe, index: int) -> Fraction:
        """Chance this ingredient is not consumed.

        The first ingredient is never saved. One of the remaining ingredients
        is saved, chosen uniformly, when cleansing applies. A workbench mix
        keeps duplication and drops ingredient saving.
        """
        if index == 0 or not recipe.ingredients:
            return Fraction(0)
        if self.workbench and recipe.workbench:
            return Fraction(0)
        secondaries = len(recipe.ingredients) - 1
        if secondaries <= 0 or self.cleansing == 0:
            return Fraction(0)
        return self.cleansing / secondaries


@dataclass
class Craft:
    item: str
    attempts: Fraction = Fraction(0)
    output_each: int = 0
    unit: str = "item"
    produced: Fraction = Fraction(0)
    consumed: dict[str, Fraction] = field(default_factory=dict)


@dataclass
class Plan:
    item: str
    vials: int
    doses: Fraction
    bonuses: Bonuses
    crafted: list[Craft] = field(default_factory=list)
    inventory_used: dict[str, Fraction] = field(default_factory=dict)
    raw: dict[str, Fraction] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def load_catalog(path: Path) -> Catalog:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RecipeError(f"{path} must contain a mapping")

    units = data.get("items")
    if not isinstance(units, dict) or not units:
        raise RecipeError("recipes.yaml needs an items map")
    normalized: dict[str, str] = {}
    for name, unit in units.items():
        if unit not in {"dose", "item"}:
            raise RecipeError(f"{name} has unit {unit!r}; use 'dose' or 'item'")
        normalized[str(name)] = unit

    aliases = {str(key): str(value) for key, value in (data.get("aliases") or {}).items()}
    for alias, target in aliases.items():
        if target not in normalized:
            raise RecipeError(f"Alias {alias!r} points at unknown item {target!r}")

    free = frozenset(str(item) for item in (data.get("free_with_well") or []))
    for item in free:
        if item not in normalized:
            raise RecipeError(f"free_with_well lists unknown item {item!r}")

    recipes: dict[str, Recipe] = {}
    for entry in data.get("recipes") or []:
        recipe = _recipe(entry, normalized)
        if recipe.output in recipes:
            raise RecipeError(f"Duplicate recipe for {recipe.output}")
        recipes[recipe.output] = recipe

    target = str(data.get("target") or "")
    if target not in recipes:
        raise RecipeError("target must name an item that has a recipe")
    return Catalog(target, normalized, aliases, recipes, free)


def _recipe(entry: object, units: dict[str, str]) -> Recipe:
    if not isinstance(entry, dict):
        raise RecipeError("Each recipe must be a mapping")
    output = str(entry.get("output") or "")
    if output not in units:
        raise RecipeError(f"Recipe output {output!r} is not in items")
    amount = entry.get("amount")
    if not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0:
        raise RecipeError(f"{output} needs a positive integer amount")
    ingredients: list[Ingredient] = []
    raw_ingredients = entry.get("ingredients")
    if not isinstance(raw_ingredients, list) or not raw_ingredients:
        raise RecipeError(f"{output} needs at least one ingredient")
    for raw in raw_ingredients:
        if (
            not isinstance(raw, list)
            or len(raw) != 2
            or not isinstance(raw[1], int)
            or isinstance(raw[1], bool)
            or raw[1] <= 0
        ):
            raise RecipeError(f"{output} has an invalid ingredient {raw!r}")
        item = str(raw[0])
        if item not in units:
            raise RecipeError(f"{output} uses unknown item {item!r}")
        ingredients.append(Ingredient(item, raw[1]))
    return Recipe(
        output=output,
        amount=amount,
        combination=bool(entry.get("combination", False)),
        workbench=bool(entry.get("workbench", False)),
        ingredients=tuple(ingredients),
    )


def load_inventory(path: Path, catalog: Catalog) -> tuple[dict[str, int], list[str]]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if data is None:
        data = {}
    if not isinstance(data, dict):
        raise RecipeError(f"{path} must contain a mapping")
    stock = data.get("inventory", data)
    if not isinstance(stock, dict):
        raise RecipeError("inventory must be a mapping of item to amount")

    inventory: dict[str, int] = {}
    warnings: list[str] = []
    for name, amount in stock.items():
        if isinstance(amount, bool) or not isinstance(amount, int) or amount < 0:
            raise RecipeError(f"{name} must be a non-negative integer, not {amount!r}")
        canonical = catalog.aliases.get(str(name), str(name))
        if canonical not in catalog.units:
            warnings.append(f"Ignoring unknown inventory item {name}")
            continue
        inventory[canonical] = inventory.get(canonical, 0) + amount
    return inventory, warnings


def calculate(
    catalog: Catalog,
    inventory: dict[str, int],
    item: str,
    vials: int,
    bonuses: Bonuses | None = None,
) -> Plan:
    if not isinstance(vials, int) or isinstance(vials, bool) or vials <= 0:
        raise RecipeError("Potion count must be a positive integer")
    item = catalog.aliases.get(item, item)
    recipe = catalog.recipes.get(item)
    if recipe is None:
        raise RecipeError(f"No recipe for {item}")
    bonuses = bonuses or Bonuses()
    goal = Fraction(vials * recipe.amount)
    plan = Plan(item=item, vials=vials, doses=goal, bonuses=bonuses)
    remaining = {name: Fraction(amount) for name, amount in inventory.items()}
    crafted: dict[str, Craft] = {}
    _require(catalog, bonuses, remaining, plan, crafted, item, goal)
    plan.crafted = [row for row in crafted.values() if row.attempts > 0]
    return plan


def _require(
    catalog: Catalog,
    bonuses: Bonuses,
    inventory: dict[str, Fraction],
    plan: Plan,
    crafted: dict[str, Craft],
    item: str,
    amount: Fraction,
) -> None:
    if amount <= 0:
        return
    have = inventory.get(item, Fraction(0))
    used = min(have, amount)
    if used > 0:
        inventory[item] = have - used
        plan.inventory_used[item] = plan.inventory_used.get(item, Fraction(0)) + used
    needed = amount - used
    if needed <= 0:
        return

    recipe = catalog.recipes.get(item)
    if recipe is None:
        plan.raw[item] = plan.raw.get(item, Fraction(0)) + needed
        return

    per_mix = Fraction(recipe.amount) * (1 + bonuses.duplication(recipe))
    attempts = needed / per_mix
    row = crafted.setdefault(
        item,
        Craft(item=item, output_each=recipe.amount, unit=catalog.unit(item)),
    )
    row.attempts += attempts
    row.produced += needed
    for index, ingredient in enumerate(recipe.ingredients):
        if bonuses.portable_well and ingredient.item in catalog.free_with_well:
            continue
        keep = bonuses.save_chance(recipe, index)
        amount = attempts * ingredient.amount * (1 - keep)
        row.consumed[ingredient.item] = row.consumed.get(ingredient.item, Fraction(0)) + amount
        _require(
            catalog,
            bonuses,
            inventory,
            plan,
            crafted,
            ingredient.item,
            amount,
        )


def format_amount(value: Fraction) -> str:
    if value.denominator == 1:
        return str(value.numerator)
    text = f"{float(value):.4f}".rstrip("0").rstrip(".")
    return text or "0"


def render(plan: Plan, catalog: Catalog) -> str:
    bonuses = plan.bonuses
    well = "off"
    if bonuses.portable_well:
        well = "10% extra potion" if bonuses.brooch else "5% extra potion"
        well += ", not on combination potions"
    lines = [
        f"{plan.item} x {plan.vials}",
        f"  {format_amount(plan.doses)} doses before duplication",
        "",
        "Assumptions",
        f"  Modified botanist's mask: {format_amount(bonuses.mask * 100)}% extra potion, including combinations",
        f"  Scroll of cleansing: {format_amount(bonuses.cleansing * 100)}% chance to save one secondary ingredient",
        f"  Portable well: {well}",
        "  Brooch of the Gods: "
        + (
            "doubles the well chance"
            if bonuses.brooch and bonuses.portable_well
            else "no effect without a portable well"
            if bonuses.brooch
            else "off"
        ),
        "  Botanist's workbench: "
        + (
            "on, so overload mixes do not save ingredients"
            if bonuses.workbench
            else "off, so overload mixes can save ingredients"
        ),
        "  Herblore master cape: off",
        "  Botanist's outfit: experience only, ignored",
    ]
    if plan.warnings:
        lines.extend(["", "Warnings"])
        lines.extend(f"  {warning}" for warning in plan.warnings)

    lines.extend(["", "Taken from inventory"])
    if plan.inventory_used:
        for name, amount in plan.inventory_used.items():
            lines.append(f"  {_row(name, format_amount(amount), _unit_label(catalog, name, amount))}")
    else:
        lines.append("  nothing")

    lines.extend(["", "Mix"])
    if plan.crafted:
        lines.append(f"  {_row('Item', 'Expected mixes', 'Each mix')}")
        for craft in plan.crafted:
            each = f"{craft.output_each} {craft.unit}"
            if craft.unit == "dose":
                each += "s" if craft.output_each != 1 else ""
            lines.append(f"  {_row(craft.item, format_amount(craft.attempts), each)}")
    else:
        lines.append("  nothing")

    lines.extend(["", "Gather"])
    if plan.raw:
        lines.append(f"  {_row('Item', 'Expected', 'Round up')}")
        for name in sorted(plan.raw):
            amount = plan.raw[name]
            lines.append(f"  {_row(name, format_amount(amount), str(ceil(amount)))}")
    else:
        lines.append("  nothing")

    lines.append("")
    lines.append(
        "Expected mixes already include extra potions from the mask and the well. "
        "Round up is only for buying or collecting whole items. "
        "A 10% proc is not a guaranteed 10% saving."
    )
    return "\n".join(lines)


def _unit_label(catalog: Catalog, item: str, amount: Fraction) -> str:
    unit = catalog.unit(item)
    if unit == "dose":
        return "dose" if amount == 1 else "doses"
    return "item" if amount == 1 else "items"


def _row(name: str, second: str, third: str) -> str:
    return f"{name:<32} {second:>14} {third:>16}"
