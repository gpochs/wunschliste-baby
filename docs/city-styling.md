# City Styling

This feature improves the visual map of City Stroller without changing gameplay logic.

- Config: `src/city/config.ts`
- Icons: `src/city/icons.ts` (emoji fallbacks; swap to SVGs later)
- New tiles: GRASS, FLOWERBED, PARK_PATH

How it works
- Green spaces: ~12% of tiles (configurable). Small (2x2) and big (3x3) parks are placed, then single tiles sprinkled.
- Sidewalk frame: rounded outer frame with subtle shadow for better separation from the page background.
- No white gaps: remaining empty tiles are GRASS.
- KiTa: guaranteed 2x2 block labeled on every tile.

Extending icons
1. Add an asset under /public/icons/*.svg (optional).
2. Add an entry to CITY_ICONS in `src/city/icons.ts` with `src` and `emojiFallback`.
3. Use `<CityIcon id="bank" />` to render.

Feature flag
- `ENABLE_CITY_STYLING` toggles all styling enhancements.
