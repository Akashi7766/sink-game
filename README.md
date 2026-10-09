# How Far Will It Sink? 🌊

A browser game: two objects are dropped over the Mariana Trench. Pick the one that sinks **deeper in 30 minutes**. Guess right to score and keep going, guess wrong and it's game over.

- 4,000+ objects (292 base items plus solid-material versions like *Gold Rubber Duck*)
- A dive through all five ocean zones with depth-appropriate sea life, down to the Challenger Deep (10,935 m)
- Depths come from real terminal-velocity physics in seawater (weight, density, shape)

## Play

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 5173
```

## Files

- `index.html` – the game (canvas rendering, UI, game loop)
- `items.js` – item data and sinking physics
- `check.js` – sanity check for item values: `node check.js` prints every item's speed and depth
