"""Fixed brew diagram. Layout and icons stay in graph/template.svg.

Each plan only replaces the numbered <text> spots. Vials of water are omitted;
unfinished potions are folded into the herb they are made from.
"""

from __future__ import annotations

import re
import struct
from fractions import Fraction
from pathlib import Path

from calculator import Plan

ROOT = Path(__file__).resolve().parent
GRAPH = ROOT / "graph"
ICONS = GRAPH / "icons"
TEMPLATE = GRAPH / "template.svg"
PLAN_SVG = GRAPH / "plan.svg"

SLOT = 78
GAP = 22
ARROW = 46
DECANT = 88
ROW_H = 104
MARGIN_X = 24
MARGIN_Y = 20

HERB_OF = {
    "Super attack": ("Irit potion (unfinished)", "Clean irit"),
    "Super strength": ("Kwuarm potion (unfinished)", "Clean kwuarm"),
    "Super defence": ("Cadantine potion (unfinished)", "Clean cadantine"),
    "Super magic potion": ("Lantadyme potion (unfinished)", "Clean lantadyme"),
    "Super ranging potion": ("Dwarf weed potion (unfinished)", "Clean dwarf weed"),
    "Super necromancy": ("Spirit weed potion (unfinished)", "Clean spirit weed"),
    "Prayer renewal": ("Fellstalk potion (unfinished)", "Clean fellstalk"),
    "Prayer potion": ("Ranarr potion (unfinished)", "Clean ranarr"),
    "Super antipoison": ("Irit potion (unfinished)", "Clean irit"),
    "Antifire": ("Lantadyme potion (unfinished)", "Clean lantadyme"),
}


def _slug(text: str) -> str:
    return text.lower().replace(" ", "-").replace("(", "").replace(")", "")


def _spot(icon: str, label: str, kind: str, recipe: str, ingredient: str = "") -> dict[str, str]:
    if kind == "herb":
        qid = f"q-herb-{_slug(recipe)}"
    elif kind == "use":
        qid = f"q-use-{_slug(recipe)}-{_slug(ingredient)}"
    elif kind == "make":
        qid = f"q-make-{_slug(recipe)}"
    elif kind == "decant":
        qid = f"q-decant-{_slug(recipe)}"
    else:
        raise ValueError(kind)
    return {"icon": icon, "label": label, "qid": qid, "kind": kind, "recipe": recipe, "ingredient": ingredient}


def _rows() -> list[dict[str, object]]:
    """Recipe rows, top to bottom, in brew order."""
    herb = lambda recipe, icon, label: _spot(icon, label, "herb", recipe)
    use = lambda recipe, ingredient, icon, label: _spot(icon, label, "use", recipe, ingredient)
    make = lambda recipe, icon, label: _spot(icon, label, "make", recipe)
    decant = lambda recipe, icon, label: _spot(icon, label, "decant", recipe)

    return [
        {
            "section": "Super potions",
            "rows": [
                [herb("Super attack", "clean-irit", "Irit"), use("Super attack", "Eye of newt", "eye-of-newt", "Newt"), make("Super attack", "super-attack-3", "Super att")],
                [herb("Super strength", "clean-kwuarm", "Kwuarm"), use("Super strength", "Limpwurt root", "limpwurt-root", "Limpwurt"), make("Super strength", "super-strength-3", "Super str")],
                [herb("Super defence", "clean-cadantine", "Cadantine"), use("Super defence", "White berries", "white-berries", "Berries"), make("Super defence", "super-defence-3", "Super def")],
                [herb("Super magic potion", "clean-lantadyme", "Lantadyme"), use("Super magic potion", "Potato cactus", "potato-cactus", "Cactus"), make("Super magic potion", "super-magic-potion-3", "Super mag")],
                [herb("Super ranging potion", "clean-dwarf-weed", "Dwarf weed"), use("Super ranging potion", "Wine of Zamorak", "wine-of-zamorak", "Wine"), make("Super ranging potion", "super-ranging-potion-3", "Super rng")],
                [herb("Super necromancy", "clean-spirit-weed", "Spirit weed"), use("Super necromancy", "Congealed blood", "congealed-blood", "Blood"), make("Super necromancy", "super-necromancy-3", "Super nec")],
            ],
        },
        {
            "section": "Extremes",
            "rows": [
                [use("Extreme attack", "Super attack", "super-attack-3", "Super att"), use("Extreme attack", "Clean avantoe", "clean-avantoe", "Avantoe"), make("Extreme attack", "extreme-attack-3", "Ext att")],
                [use("Extreme strength", "Super strength", "super-strength-3", "Super str"), use("Extreme strength", "Clean dwarf weed", "clean-dwarf-weed", "Dwarf weed"), make("Extreme strength", "extreme-strength-3", "Ext str")],
                [use("Extreme defence", "Super defence", "super-defence-3", "Super def"), use("Extreme defence", "Clean lantadyme", "clean-lantadyme", "Lantadyme"), make("Extreme defence", "extreme-defence-3", "Ext def")],
                [use("Extreme magic", "Super magic potion", "super-magic-potion-3", "Super mag"), use("Extreme magic", "Ground mud runes", "ground-mud-runes", "Mud runes"), make("Extreme magic", "extreme-magic-3", "Ext mag")],
                [use("Extreme ranging", "Super ranging potion", "super-ranging-potion-3", "Super rng"), use("Extreme ranging", "Grenwall spikes", "grenwall-spikes", "Grenwall"), make("Extreme ranging", "extreme-ranging-3", "Ext rng")],
                [use("Extreme necromancy", "Super necromancy", "super-necromancy-3", "Super nec"), use("Extreme necromancy", "Ground miasma rune", "ground-miasma-rune", "Miasma"), make("Extreme necromancy", "extreme-necromancy-3", "Ext nec")],
            ],
        },
        {
            "section": "Overload",
            "rows": [
                [
                    use("Overload", "Extreme attack", "extreme-attack-3", "Ext att"),
                    use("Overload", "Extreme strength", "extreme-strength-3", "Ext str"),
                    use("Overload", "Extreme defence", "extreme-defence-3", "Ext def"),
                    use("Overload", "Extreme magic", "extreme-magic-3", "Ext mag"),
                    use("Overload", "Extreme ranging", "extreme-ranging-3", "Ext rng"),
                    use("Overload", "Extreme necromancy", "extreme-necromancy-3", "Ext nec"),
                    use("Overload", "Clean torstol", "clean-torstol", "Torstol"),
                    make("Overload", "overload-3", "Overload"),
                    decant("Overload", "overload-4", "Overload (4)"),
                ]
            ],
        },
        {
            "section": "Supreme overload",
            "rows": [
                [
                    use("Supreme overload", "Crystal flask", "crystal-flask", "Flask"),
                    use("Supreme overload", "Overload", "overload-4", "Overload"),
                    use("Supreme overload", "Super attack", "super-attack-4", "Super att"),
                    use("Supreme overload", "Super defence", "super-defence-4", "Super def"),
                    use("Supreme overload", "Super strength", "super-strength-4", "Super str"),
                    use("Supreme overload", "Super ranging potion", "super-ranging-potion-4", "Super rng"),
                    use("Supreme overload", "Super magic potion", "super-magic-potion-4", "Super mag"),
                    use("Supreme overload", "Super necromancy", "super-necromancy-4", "Super nec"),
                    make("Supreme overload", "supreme-overload-potion-6", "Supreme"),
                ]
            ],
        },
        {
            "section": "Elder overload",
            "rows": [
                [
                    use("Elder overload", "Supreme overload", "supreme-overload-potion-6", "Supreme"),
                    use("Elder overload", "Primal extract", "primal-extract", "Primal"),
                    use("Elder overload", "Clean fellstalk", "clean-fellstalk", "Fellstalk"),
                    make("Elder overload", "elder-overload-potion-6", "Elder"),
                ]
            ],
        },
        {
            "section": "Salve components",
            "rows": [
                [herb("Prayer renewal", "clean-fellstalk", "Fellstalk"), use("Prayer renewal", "Morchella mushroom", "morchella-mushroom", "Morchella"), make("Prayer renewal", "prayer-renewal-3", "Renewal"), decant("Prayer renewal", "prayer-renewal-4", "Renewal (4)")],
                [herb("Prayer potion", "clean-ranarr", "Ranarr"), use("Prayer potion", "Snape grass", "snape-grass", "Snape"), make("Prayer potion", "prayer-potion-3", "Prayer"), decant("Prayer potion", "prayer-potion-4", "Prayer (4)")],
                [herb("Super antipoison", "clean-irit", "Irit"), use("Super antipoison", "Unicorn horn dust", "unicorn-horn-dust", "Horn dust"), make("Super antipoison", "super-antipoison-3", "Antipois."), decant("Super antipoison", "super-antipoison-4", "Antipois. (4)")],
                [herb("Antifire", "clean-lantadyme", "Lantadyme"), use("Antifire", "Dragon scale dust", "dragon-scale-dust", "Scales"), make("Antifire", "antifire-3", "Antifire"), decant("Antifire", "antifire-4", "Antifire (4)")],
                [use("Super antifire", "Antifire", "antifire-3", "Antifire"), use("Super antifire", "Phoenix feather", "phoenix-feather", "Phoenix"), make("Super antifire", "super-antifire-3", "S. antifire"), decant("Super antifire", "super-antifire-4", "S. antifire (4)")],
            ],
        },
        {
            "section": "Elder overload salve",
            "rows": [
                [
                    use("Elder overload salve", "Elder overload", "elder-overload-potion-6", "Elder"),
                    use("Elder overload salve", "Prayer renewal", "prayer-renewal-4", "Renewal"),
                    use("Elder overload salve", "Prayer potion", "prayer-potion-4", "Prayer"),
                    use("Elder overload salve", "Super antipoison", "super-antipoison-4", "Antipois."),
                    use("Elder overload salve", "Antifire", "antifire-4", "Antifire"),
                    use("Elder overload salve", "Super antifire", "super-antifire-4", "S. antifire"),
                    make("Elder overload salve", "elder-overload-salve-6", "Salve"),
                ]
            ],
        },
    ]


def spot_ids() -> list[str]:
    found = ["q-banner"]
    for section in _rows():
        for row in section["rows"]:
            for spot in row:
                found.append(str(spot["qid"]))
    return found


def quantities(plan: Plan) -> dict[str, str]:
    crafts = {craft.item: craft for craft in plan.crafted}
    values = {"q-banner": f"{plan.vials} × {plan.item}"}
    for section in _rows():
        for row in section["rows"]:
            for spot in row:
                values[str(spot["qid"])] = _amount(crafts, spot)
    return values


def _amount(crafts: dict, spot: dict[str, str]) -> str:
    kind = spot["kind"]
    recipe = spot["recipe"]
    craft = crafts.get(recipe)
    if kind in {"make", "decant"}:
        return _number(craft.produced if craft else Fraction(0))
    if kind == "use":
        if craft is None:
            return "0"
        return _number(craft.consumed.get(spot["ingredient"], Fraction(0)))
    unfinished, herb = HERB_OF[recipe]
    step = crafts.get(unfinished)
    if step is None:
        return "0"
    return _number(step.consumed.get(herb, Fraction(0)))


def _number(value: Fraction) -> str:
    if value == 0:
        return "0"
    if value.denominator == 1:
        return f"{value.numerator:,}"
    number = float(value)
    if number >= 100:
        return f"{round(number):,}"
    if number >= 10:
        return f"{number:.1f}".rstrip("0").rstrip(".")
    return f"{number:.2f}".rstrip("0").rstrip(".")


def write_template(path: Path = TEMPLATE) -> Path:
    sections = _rows()
    width, height, body = _layout(sections)
    svg = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        f'<rect width="100%" height="100%" fill="#241c14"/>',
        body,
        "</svg>",
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(svg), encoding="utf-8")
    return path


def fill_graph(plan: Plan, destination: Path = PLAN_SVG, template: Path = TEMPLATE) -> Path:
    """Copy the template and replace quantity text. Icons and coordinates stay put."""
    source = template.read_text(encoding="utf-8")
    values = quantities(plan)
    missing = [qid for qid in values if f'id="{qid}"' not in source]
    if missing:
        raise ValueError("Template is missing quantity spots: " + ", ".join(missing))
    filled = source
    for qid, value in values.items():
        filled = _replace_text(filled, qid, value)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(filled, encoding="utf-8")
    return destination


def _replace_text(svg: str, qid: str, value: str) -> str:
    pattern = re.compile(
        rf'(<text\b[^>]*\bid="{re.escape(qid)}"[^>]*>)[^<]*(</text>)',
    )
    updated, count = pattern.subn(rf"\g<1>{value}\2", svg, count=1)
    if count != 1:
        raise ValueError(f"Could not fill {qid}")
    return updated


def _layout(sections: list[dict[str, object]]) -> tuple[int, int, str]:
    parts: list[str] = []
    y = MARGIN_Y
    parts.append(
        f'<text x="{MARGIN_X}" y="{y + 22}" fill="#f0e2c4" font-family="Arial, Helvetica, sans-serif" font-size="22">Elder overload salve</text>'
    )
    parts.append(
        '<text id="q-banner" x="430" y="'
        + str(y + 22)
        + '" fill="#ffe566" font-family="Arial, Helvetica, sans-serif" font-size="18">0</text>'
    )
    y += 36
    parts.append(
        f'<text x="{MARGIN_X}" y="{y + 14}" fill="#a89880" font-family="Arial, Helvetica, sans-serif" font-size="13">'
        "Expected doses on potions, items on everything else. Vials are left out. (3) → (4) is a free decant."
        "</text>"
    )
    y += 32
    max_x = 640
    for section in sections:
        parts.append(
            f'<text x="{MARGIN_X}" y="{y + 16}" fill="#e6c98a" font-family="Arial, Helvetica, sans-serif" font-size="15">{_xml(str(section["section"]))}</text>'
        )
        y += 28
        for row in section["rows"]:
            x = MARGIN_X
            output_at = _output_index(row)
            for index, spot in enumerate(row):
                if index == output_at:
                    _arrow(parts, x, y)
                    x += ARROW
                elif index > output_at:
                    _decant_label(parts, x, y)
                    x += DECANT
                elif index > 0:
                    _plus(parts, x, y)
                    x += GAP
                _slot(parts, x, y, spot)
                x += SLOT
                max_x = max(max_x, x)
            y += ROW_H
        y += 8
    return max_x + MARGIN_X, y + 8, "\n".join(parts)


def _output_index(row: list[dict[str, str]]) -> int:
    for index, spot in enumerate(row):
        if spot["kind"] == "make":
            return index
    raise ValueError("row has no output")


def _slot(parts: list[str], x: int, y: int, spot: dict[str, str]) -> None:
    icon = ICONS / f"{spot['icon']}.png"
    width, height = _png_size(icon)
    scale = 2 if width * 2 <= SLOT - 8 and height * 2 <= SLOT - 8 else 1
    draw_w = width * scale
    draw_h = height * scale
    icon_x = x + (SLOT - draw_w) / 2
    icon_y = y + (SLOT - draw_h) / 2
    parts.append(
        f'<rect x="{x}" y="{y}" width="{SLOT}" height="{SLOT}" rx="6" fill="#3a2f24" stroke="#8a7044"/>'
    )
    parts.append(
        f'<image href="icons/{spot["icon"]}.png" x="{icon_x:.1f}" y="{icon_y:.1f}" '
        f'width="{draw_w}" height="{draw_h}" style="image-rendering: pixelated"/>'
    )
    parts.append(
        f'<text id="{spot["qid"]}" x="{x + SLOT - 5}" y="{y + SLOT - 6}" text-anchor="end" '
        f'fill="#ffe566" stroke="#1a1008" stroke-width="3" paint-order="stroke" '
        f'font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700">0</text>'
    )
    parts.append(
        f'<text x="{x + SLOT / 2}" y="{y + SLOT + 14}" text-anchor="middle" fill="#d9c7a2" '
        f'font-family="Arial, Helvetica, sans-serif" font-size="11">{_xml(spot["label"])}</text>'
    )


def _plus(parts: list[str], x: int, y: int) -> None:
    parts.append(
        f'<text x="{x + GAP / 2}" y="{y + SLOT / 2 + 5}" text-anchor="middle" fill="#8a7044" '
        f'font-family="Arial, Helvetica, sans-serif" font-size="16">+</text>'
    )


def _arrow(parts: list[str], x: int, y: int) -> int:
    mid = y + SLOT / 2
    end = x + ARROW - 8
    parts.append(
        f'<line x1="{x + 6}" y1="{mid}" x2="{end}" y2="{mid}" stroke="#c4a46a" stroke-width="2"/>'
    )
    parts.append(
        f'<polygon points="{end},{mid - 5} {x + ARROW},{mid} {end},{mid + 5}" fill="#c4a46a"/>'
    )
    return x + ARROW


def _decant_label(parts: list[str], x: int, y: int) -> int:
    mid = y + SLOT / 2
    parts.append(
        f'<text x="{x + DECANT / 2}" y="{mid + 4}" text-anchor="middle" fill="#e6c98a" '
        f'font-family="Arial, Helvetica, sans-serif" font-size="12">(3) → (4)</text>'
    )
    return x + DECANT


def _png_size(path: Path) -> tuple[int, int]:
    header = path.read_bytes()[:24]
    if header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG")
    return struct.unpack(">II", header[16:24])


def _xml(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


if __name__ == "__main__":
    written = write_template()
    print(written)
