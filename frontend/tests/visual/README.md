# Frozen UI baseline

The visual baseline comes from commit `36aad30` on the original repository's
`feature/generosity-website-design-intergation` branch. The UI was imported without its obsolete
public-registration screen. Visual components use local fixture data only; API integration belongs
in feature services and hooks introduced by later slices.

## Responsive contract

- Mobile (`< 768px`): the information bar is hidden, navigation uses a right-side drawer, content
  grids collapse, forms use one column, and page spacing remains touch friendly.
- Tablet (`768px–1023px`): two-column content and card grids are used where space permits; primary
  navigation remains in the drawer until the large breakpoint.
- Desktop (`>= 1024px`): the full three-tier header, multi-column grids, sidebars, and wide content
  containers are shown. Content width is capped at `80rem`.
- Typography, colors, imagery, spacing rhythm, and component proportions are intentional. A visual
  change requires updating snapshots and explaining the design decision in review.

Run `pnpm test:visual` to compare both 1440×900 desktop and 390×844 mobile captures. Use
`pnpm test:visual:update` only after reviewing the rendered pages at both sizes.
