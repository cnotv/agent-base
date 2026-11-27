---
name: designo-template
description: >-
  Use when an artist or designer asks for a template to start from in Designo: a picture book,
  zine, card, postcard, letterhead or stationery set, poster series or any paged layout where the
  text, art areas, briefs and palette are prepared and the artist paints or composes into them.
  Builds the pages through the Designo MCP server and exports a print shaped PDF.
---

# Designo Template

Builds a hand off file for an artist: every page typeset and sized to the print spec, with the
art area, a short brief, a colour palette and a composition diagram already in place. The artist
paints full page, drops the image above the placeholder and hides the placeholder. Nothing is
retyped.

This skill builds structure and guidance. Style direction, palette theory and picture book
pacing come from `visual-design-craft`; run it first when the look is not decided yet. Painting
the art is out of scope, and so is press ready CMYK output: never call a file print ready while
placeholders stand in for art.

## 1. Intake

Settle these in one message, with a default for each, and ask only for what is missing and has no
safe default:

| Item | Default |
| --- | --- |
| Product (see `references/formats.md`) | picture book |
| Trim size and unit | from the format preset |
| Page count and story or content source | required, no default |
| Bleed | 3 mm (8.5 pt) |
| Safe margin | 0.5 in (36 pt) |
| Colour space | RGB now, CMYK at press |
| Palette and fonts | propose from the mood words, 8 to 10 named colours, two families |
| Who paints and in what tool | ask once; sets the canvas size you give them |

Text that arrives as a PDF has line breaks, not paragraphs. Join it into real paragraphs and
confirm the page splits with the owner before any layout.

## 2. Check the tool first

The Designo MCP tools differ between versions. Read the schema of `apply_ops` and
`create_file` before building, and list what it supports: pages, `pdfPage`, `bleed`, `guides`,
gradients, spans, `measure_text`, `export_pdf`.

- A feature that is missing gets a fallback, not a silent skip: no pages means one frame per
  page stacked in a column on a single page with a 40 pt gap; no gradient means a stack of
  rectangles at stepped opacity for the scrim; no `export_pdf` means export SVG per frame.
- Say in the final report which fallbacks were used.
- Give every node your own id. Later operations and screenshots address nodes by id.

## 3. Plan the pages

Working pages first, then the product in reading order. Name every working page
`WORKING PAGE · NOT PART OF THE PRODUCT` so nobody prints it.

| Part | Purpose |
| --- | --- |
| Cover | Title and full bleed art area |
| How to use | Five steps for the artist, the spec box, the layer and hide convention |
| Art direction | Tone, medium, light, colour script across the pages, the palette |
| Characters and continuity | What must stay identical page to page, sketch boxes |
| Map | A table: page, section, scene, dominant colour, shot type |
| Preflight | Pass or fail list of every handover check and what still blocks print |
| Content pages | The product itself |
| Closing and back cover | As the format needs |

Drop the parts a format does not need: a postcard has no characters page. Stationery sets use
one page per piece (letterhead, envelope, card, label) and a spec box instead of a story map.

## 4. Print specs

Write them on the how to page and bake them in:

- PDF page size is trim plus bleed on every side. For 8.5 in square with 3 mm bleed: 612 pt trim, 629 pt PDF page.
- Safe margin on every page. Body text and faces stay inside it.
- Art at 300 dpi at final size (2550 px for 8.5 in). Give the artist the pixel size including bleed.
- Page count: a multiple of 4 is the press minimum, 8 or 16 for a signature. If the plan is not a multiple, state the gap and the options (add a title or colophon page, split a long page) rather than pretend.
- Add a `GUIDES` frame per page, hidden by default, with the trim line, bleed line and safe margin, so the artist can switch it on.

## 5. Content pages

Each content page is one full bleed frame. Everything the artist replaces lives inside a single
group named `ART PLACEHOLDER pN (hide when art is in)`, so one click hides the whole brief.

Inside the placeholder group:

- Label `ILLUSTRATION PLACEHOLDER · n / total`.
- Scene brief, one sentence, in the display face.
- Mood and composition note, small sans.
- A composition diagram about 92 pt square: mass, light direction, horizon, subjects, drawn in palette colours.
- A row of 3 or 4 flat colour chips. Swatches, never colour names.
- Shot type (wide, medium, close) and where the text sits, so consecutive pages differ.

Outside it: the text scrim and the text.

- Scrim: a vertical gradient from paper at 0 alpha to paper at full alpha, opaque by the start of the text block. It lets art run to the trim while the text stays legible.
- Heading and body in the text styles, inside the safe margin, no folio unless the format needs one.

## 6. Typography

- Load fonts by family name from Fontsource; never reference Google font URLs.
- Choose body size by measuring, not by feel: `measure_text` with the real font, size, leading and width returns height and line count. Fit the longest page first, then apply that size to every page. If it does not fit, split the content across pages; do not shrink below the minimum.
- Defaults that held up: body 14 pt at leading 1.45, measure about 62 characters; heading 20 pt in the deepest palette colour; working page text 8.5 to 9.5 pt sans, labels 8.5 pt at 600 weight with 0.14 tracking.
- Name text styles `Body / Story`, `Heading / Story`, `Display / Cover`, `Display / Subtitle`, or the product's equivalents.
- Text boxes with `textWrap: true` need `width`. Height is computed.
- Check contrast: 4.5 to 1 for body text against the scrim.

## 7. Palette

One table, named, with a role per colour: paper, three or four neighbours of the main hue, one
accent, one glow, one cool dusk colour, ink. Rules to write on the art direction page: at most
four colours per page plus paper; glow is always the lightest value; no pure black.

## 8. Build order

1. Fix tokens: sizes, margins, palette, text styles.
2. Create all frames with ids, guides and `pdfPage` numbers.
3. Typeset every content page at final size; fit the longest page.
4. Add the art frame, the scrim, then move text onto the scrim.
5. Add the per page placeholder group, diagram and chips.
6. Build working pages last, since they describe decisions already made.
7. Batch 50 to 150 operations per `apply_ops` call. A failed call saves nothing, so a batch is easy to retry.

## 9. Verify

- `get_screenshot` per new page at scale 1, and look at it. Update responses carry no ids, so a screenshot is the only proof a change landed.
- Check the riskiest pages at 2x: the longest text, the cover, the map table.
- Export with `export_pdf` (RGB). Read the PDF back with pypdf: page count, media box (trim plus bleed), and the last sentence of the longest page in `extract_text()`.
- Only frames with a `pdfPage` number print, sorted by that number, not by page order. Renumber after any move.
- If the client cannot read resources, ask the owner how to save the export; never go looking for tokens on disk.

## 10. Hand off

Fill the preflight page, then report plainly:

- [ ] Placeholder groups named and hide as one
- [ ] Each content page has brief, chips and diagram inside the group
- [ ] Longest page text found in the exported PDF
- [ ] Working pages marked, page count and multiple of 4 gap stated
- [ ] Colour space, dpi, bleed and safe margin written on the how to page
- [ ] What still blocks print: the art, the working pages, the colour space

Hand the artist the canvas size per page and the palette hex list. For a Procreate or similar
canvas, name layers after the placeholder ids so the art maps back to the page.

## Gotchas

- Deleting a page deletes its frames; do not delete frames you still reference.
- A frame clips its children, so placeholder groups can live inside it.
- `stroke: null` removes a border, `fill: null` is transparent. Opacity is per node, so light chips on a cream page need a hairline stroke.
- Uploaded fonts win over a Fontsource family of the same name.
- Gradients: 90 degrees points down.
