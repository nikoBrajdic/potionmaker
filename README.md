# Recipe calculator

Plans the herbs, secondaries, and half-made potions still needed for a batch of [elder overload salves](https://runescape.wiki/w/Elder_overload_salve).

Potion amounts in the inventory are **doses**. Twelve 6-dose supremes and eighteen 4-dose supremes are both `Supreme overload: 72`. Everything else is a single item: a herb, a crystal flask, an unfinished potion.

```bash
python craft.py inventory.example.yaml 500
python craft.py inventory.yaml 500 --portable-well
python craft.py inventory.yaml 500 --portable-well --brooch
python craft.py inventory.yaml 500 --workbench
```

`500` is 500 finished 6-dose salves. The report lists expected mixes, what it will take from the inventory, and raw materials both as an expected value and rounded up to a whole item.

Every run also fills `graph/plan.svg` from `graph/template.svg`. The template already has the bank icons and the arrows; the run only writes the counts into the marked spots. Numbers are doses on potions and items everywhere else. Vials of water are not drawn. `(3) → (4)` is decanting, which keeps the same number of doses. Rebuild the template with `python3 graph.py` only when the picture itself should change.

## What it assumes

- Modified botanist's mask: 5% chance of an extra potion, including combination potions. Always on.
- Scroll of cleansing: 10% chance to save one secondary ingredient, chosen at random. The first ingredient of a recipe is never saved. Saving grenwall spikes or congealed blood saves the whole stack. Always on.
- Portable well: off unless you pass `--portable-well`. Then normal mixes, including unfinished potions, have a 5% chance of an extra potion, and vials of water are free. Combination potions (overload, supreme, elder, salve) do not get the extra potion.
- `--brooch` raises that well chance from 5% to 10%. It does nothing without the well.
- The mask and the well add. A normal mix at a well with the brooch expects 1.15 potions per attempt.
- `--workbench` is Granny Rowan's unfinished-overload route. Duplication still applies. Ingredient saving does not, on the overload, supreme, elder, and salve mixes.
- No Herblore master cape, so there is no 4-into-5 batch. The botanist's outfit is experience only.
- Overloads are mixed as 3-dose vials and decanted for free. Four doses of overload is one 4-dose vial, or a 3-dose plus a leftover dose.
- Figures are expected values. A 10% proc is not a promise that every tenth mix is free.

Recipes live in `recipes.yaml`. An inventory can be a flat map or an `inventory:` map. `Basic overload` is accepted as `Overload`.

The direct salve recipe cannot save the elder overload. The wiki notes that a supreme overload salve can save the supreme overload instead, which is cheaper if you have that recipe and no master cape. This planner follows the direct elder-overload recipe.
