# Mall Navigation Prototypes (CS 6750 Team Project)

Static site: plain HTML/CSS/JS, no build step, no external resources. Works on GitHub Pages.

- `index.html`: landing page
- `a-reserve-ahead.html`: Prototype A (#41 Reserve-ahead stops)
- `b-progress-tracker.html`: Prototype B (#47 Shopping progress tracker)
- `c-floor-aware.html`: Prototype C (#40 Floor-aware stop ordering)
- `assets/js/mall-data.js`: shared fictional mall (3 floors, 17 places, 2 escalators, 1 elevator, inventory)
- `assets/js/core.js`: routing math, SVG floor maps, screen router
- `assets/js/facilitator.js`: facilitator/test panel (logging, timer, notes, ratings, CSV/JSON export)

## Facilitator mode
Open any prototype with `?facilitator=1`, click the small ≡ button (bottom right), or press Shift+F.
All data is stored in localStorage under `mallNavProto.v1` and only leaves the browser when exported.

## Deploy
Copy everything in this folder (including `.nojekyll`) to the root of your `<user>.github.io` repository and push.
