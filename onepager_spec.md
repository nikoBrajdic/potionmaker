# Overload calculator one-pager

Browser one-pager (HTML + CSS + JS, no frameworks), served on localhost. Clone the insight of https://runescape.wiki/w/Calculator:Herblore/Overload_variants for the overload family, including the other overload recipes.

The main view is a horizontal mesh. One node per item. Arrows point from ingredients toward the finished potion, in the form of the attached currency chart (form only). A herb used by two mixes is one node with two outgoing arrows.

## Style

Match RuneScape 3’s own windows: the bank, the skill guides, the settings panel. Dark carved stone and worn metal, gold-tan titles, warm off-white body text, beveled edges with a light top and left and a shadow on the bottom and right. Item nodes are bank slots. The yellow top-left count sits on the icon the way a stack count does in the bank.

Use in-game art for icons and borders when we have it. Everywhere else, fill with a fine grain or a tiled stone noise, not a flat colour. The grain stays quieter than the icons and the numbers. Panels, the drawer, the bottom excerpt, buttons, recessed inputs, and the page behind the graph all get that texture. A solid brown or a solid charcoal is a last resort.

Greyed recipe edges desaturate and darken, the way the game marks a choice you cannot take. Completion green is the game’s bright interface green. Browser-default inputs, white dropdowns, pill buttons, and soft drop shadows are out. Square corners, a small chamfer at most. Scrollbars are thin stone tracks.

## Nodes

- Potion name includes the dose size: `Antifire (3)`.
- The corner count is vials, not doses. Top-left, RuneScape digit style (yellow, dark outline). Digits may hang past the icon.
- No banner above the graph. The finished potion’s own count is the batch size.
- Vials of water are not drawn. Clean herb, grimy herb, and the unfinished potion are the same node: the herb.
- Potions brewed as (3) and later used as (4) get an explicit decant. That includes the six supers before supreme overload, plus prayer renewal, prayer potion, super antipoison, antifire, and super antifire.
- Decant is not 1:1. Four vials of (3) are three vials of (4). The (4) count is `floor(doses / 4)`.
- When doses are left over, they are always a single partial vial (1–3 doses). Draw that as a smaller info node on the decant arrow. Omit it when the remainder is 0.

## Drawer (left, hidden)

- Batch size input at the top.
- Potion dropdown.
- YAML import. Import fills the stock fields and recalculates immediately.
- Example YAML download. Keys are vial-sized: `Antifire (3)`, `Antifire (4)`, `Clean irit`.
- Typed stock amounts wait. The update button commits them and recalculates. Leaving a field does not.
- Modifiers. See below.
- Stock fields for the selected potion’s base ingredients. Unfinished quantities stay collapsed.
- Clear all: every owned amount becomes 0, and completion marks clear.

## Modifiers

Quantity and dose size:

- Scroll of cleansing: 10% chance to save one secondary, chosen at random. The first ingredient of a recipe is never saved. Saving a stack saves the whole stack.
- Portable well and modified botanist’s mask: each is a 5% chance of an extra potion, per potion, added together. This is not a per-batch bonus. The well does not duplicate combination potions. The brooch raises the well’s chance from 5% to 10% and does nothing without the well.
- Botanist’s amulet, Morytania legs 4, Desert amulet 4, varanusaur totem, Underworld Grimoire: chances to brew a (4) directly, which lowers how many (3)s are decanted.
- Partial potion producer, when selected, replaces hand-making unfinished potions.
- Herblore master cape, when selected, changes batch output only. It does not reduce the mask or well chance.

Factory outfit is not a modifier.

Experience only, shown in the bottom panel, not in the node counts: botanist’s outfit pieces, Meilyr hour, perfect juju, torstol incense, and the generic XP boost. The outfit is always the botanist’s outfit.

## Competing recipes

Draw every competing edge (elder overload first vs supreme overload salve first, and the other path choices). Clicking an edge selects that recipe and greys the others. Counts follow the selected edges.

## Zoom

Scroll changes the gap between nodes in 10% steps. Icons, type, grids, and the leftover vial stay the same pixel size.

- Default gap from a node to the ingredient or text on its outgoing edge: 2.5× the node icon width, then the same again from that edge content to the next node.
- Minimum gap: 15px.
- Maximum gap: 70vw (0.7 of the viewport width).
- The chain is allowed to run off the canvas. Drag to pan. A drag of more than a few pixels is a pan, not a click.

## Selection

Clicking a node highlights its downstream path (everything between that node and the finished potion) and dims the rest. Escape closes the bottom panel and clears the highlight.

Downstream of irit is the chain toward the salve. Those same nodes are upstream of the salve.

## Bottom panel

Collapsed until a node is selected. Closes on Escape.

It is the downstream excerpt from the selected node to the finished potion, following the selected recipe edges. Co-ingredients sit on the edge, not as extra stops. A single companion (snape grass) is one icon on the edge. Several companions use a grid:

- 2 items: 1×2
- 3–4: 2×2
- 5–6: 2×3
- 7–9: 3×3

Ranarr, for example: ranarr → snape grass on the edge → prayer potion (3) → decant on the edge, plus the leftover vial when there is one → prayer potion (4) → the other salve ingredients in a grid on the edge → elder overload salve (6).

A branch splits and each arm follows the same rule until they meet again.

Each node shows its vial count and its price. Left-clicking a node in the excerpt makes that node the root and redraws from there.

Grand Exchange prices come from the RS3 feed (`rs`, not `osrs`): `https://api.weirdgloop.org/exchange/history/rs/latest`. RS3 names have a space before the dose: `Super attack (4)`. Cache prices for 4 hours. If a fetch fails, keep the stale cache and show its age. Potions and items with no GE price (overloads, elders, salves, phoenix feathers) cost the sum of their priced inputs, labelled calculated.

## Completion

A node is complete when its owned vials cover the expected vials, or when it was marked by hand. Shift+left click marks and unmarks.

A complete node and its upstream ingredients turn green, the quantity becomes a green check, and upstream remaining counts drop. Green stops on a shared ingredient: that node stays as-is while another branch still needs it, and only the edge into the finished branch turns green. When every branch is done, the shared node turns green too and the walk continues.

Two buttons:

- Drawer, “Clear all”: set every owned amount to 0 and clear marks.
- Main view, bottom right, crossed-out circle: clear completion marks and put owned amounts back to the last imported YAML. Displayed counts follow that stock. A node you still own enough of stays green.

Cache creation progress in localStorage when it is available.
