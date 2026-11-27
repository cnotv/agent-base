# Format presets

Sizes are trim in points (72 per inch) before bleed. Add 8.5 pt bleed on every side for the PDF page.

| Product | Trim | Pages | Working pages | Notes |
| --- | --- | --- | --- | --- |
| Picture book, square | 612 x 612 (8.5 in) | multiple of 8 for a signature, 4 minimum | how to, direction, characters, map, preflight | single pages for the template; review facing spreads in the proofs |
| Picture book, landscape | 720 x 576 (10 x 8 in) | as above | as above | keep faces 12 to 15 mm from the fold |
| Zine, half letter | 396 x 612 | 8 or 16 | how to, fold map, preflight | one sheet folds to 8; mark fold and cut lines on the how to page |
| Greeting card A6 | 298 x 420 | 2 sides | spec box | front art, inside text area, back credit |
| Postcard A6 | 420 x 298 | 2 sides | spec box | address zone on the back, 40 percent of the width |
| Letterhead set | A4 595 x 842, DL envelope 624 x 312, card 252 x 144 | one page per piece | spec box, palette | margins from the printer, not the default |
| Poster series | 18 x 24 in, 1296 x 1728 | one per poster | direction, palette, map | one dominant focus, headline readable from 2 m |

Print notes: a spine adds thickness (ask the printer); saddle stitch needs a multiple of 4; keep
text 12 mm from the fold and 10 mm from the trim on bound pages.

## Content page recipe

Frame 612 x 612, fill paper. Operations, in order:

1. `frame` `pN` with `pdfPage`, `bleed`, `guides`.
2. `group` `art-pN` named `ART PLACEHOLDER pN (hide when art is in)` holding the label, brief, note, diagram and chips.
3. `rectangle` `scrim-pN` at the bottom with the paper gradient.
4. `text` `heading-pN` and `text` `body-pN` on the scrim.

## Brief row example

```
Label    ILLUSTRATION PLACEHOLDER · 3 / 10
Brief    A soft glow between big leaves, seen from low behind Maya.
Mood     calm, curious. Subject lower left, light upper right, wide shot.
Chips    #5f7f5a  #8fae8b  #e8b84a  #f7f0e1
```
