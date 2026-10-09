// Sanity check for items.js: `node check.js` prints every item's result and asserts the
// physics against real measurements and well-known outcomes. `node check.js -q` skips the table.
const { ITEMS, SHAPES, physics, makeVariant } = require('./items.js');
const assert = require('assert');
const fmt = d => d < 1 ? Math.round(d * 100) + ' cm' : Math.round(d).toLocaleString() + ' m';
const R = Object.fromEntries(ITEMS.map(b => [b.name, makeVariant(b)]));
const near = (got, want, tol, what) => assert(Math.abs(got - want) / want <= tol, `${what}: got ${got.toFixed(2)}, expected ≈${want}`);

// 1) data sanity: real numbers, known shapes, unique names, and an object can't displace more
//    water than its bounding box holds (catches typos in mass or size)
assert.equal(new Set(ITEMS.map(b => b.name)).size, ITEMS.length, 'duplicate names');
for (const b of ITEMS) {
  assert(b.m > 0 && b.dims.every(d => d > 0) && SHAPES[b.shape] && b.e, b.name + ': bad data');
  if (b.rho) { const V = b.m / (b.rho * 1000), box = b.dims[0] * b.dims[1] * b.dims[2]; assert(V <= box * 1.15, `${b.name}: ${(V * 1000).toFixed(2)} L can't fit in its ${(box * 1000).toFixed(2)} L size`); }
}

// 2) the formula against measured terminal velocities in water
const ball = (m, d, rho) => physics({ m, dims: [d, d, d], rho, shape: 'ball' }).v;
near(ball(.00411, .01, 7.85), 1.4, .15, '1 cm steel ball (measured ≈1.4 m/s)');
near(ball(.0005, .005, 7.85), .95, .2, '5 mm steel ball (measured ≈0.9–1.0 m/s)');
near(ball(.0055, .016, 2.5), .75, .25, '16 mm glass marble (measured ≈0.7–0.8 m/s)');
assert(R['The Titanic'].v > 5 && R['The Titanic'].v < 16, 'Titanic: ' + R['The Titanic'].v.toFixed(1) + ' m/s (bow hit bottom at ≈10–15 m/s)');

// 3) real-world outcomes
for (const n of ['Apple', 'Basketball', 'Ice Cube', 'Rubber Duck', 'Cruise Ship', 'Barrel of Oil', 'Log', 'Stick of Butter', 'Watermelon',
  'Dog', 'Elephant', 'Polar Bear', 'Brachiosaurus', 'Santa Claus', 'Baymax', 'Pikachu', 'Snorlax', 'Gastly', 'Pidgey', 'Wailord'])
  assert(R[n].floats, n + ' should float');
for (const n of ['Potato', 'Egg', 'Smartphone', 'Ship Anchor', 'Gold Bar', 'Car', '16 lb Bowling Ball', 'Brick', 'Hippo', 'Great White Shark',
  'Mjölnir', 'Cosmoem', 'Geodude', 'Golem', 'Onix', 'Magnemite', 'Machamp', 'Cloyster', 'Sonic the Hedgehog'])
  assert(!R[n].floats, n + ' should sink');
const deeper = (a, b) => assert(R[a].depth > R[b].depth, `${a} (${fmt(R[a].depth)}) should beat ${b} (${fmt(R[b].depth)})`);
deeper('Ship Anchor', 'Smartphone'); deeper('Gold Bar', 'Gold Coin'); deeper('Boulder', 'Pebble'); deeper('Cannonball', 'Glass Marble');
deeper('16 lb Bowling Ball', 'T-Shirt'); deeper('Curling Stone', 'Brick'); deeper('Pebble', 'Dollar Bill'); deeper('Rock', 'Stop Sign');
deeper('Golem', 'Geodude'); deeper('Steel Ball Bearing', 'Copper Penny');
// floaters: bigger, denser ones ride lower
assert(R['Cruise Ship'].depth > R['Speedboat'].depth && R['Elephant'].depth > R['Dog'].depth, 'drafts');
for (const r of Object.values(R)) if (!r.floats && r.base.m < 1000 && r.rho < 100000) assert(r.v > .005 && r.v < 8, `${r.name}: ${r.v.toFixed(2)} m/s`);

console.log(`${ITEMS.length} objects (${Object.values(R).filter(r => r.floats).length} float). All checks passed.`);
if (!process.argv.includes('-q')) {
  const rows = Object.values(R).sort((a, b) => (a.floats - b.floats) || b.depth - a.depth);
  for (const r of rows) console.log(r.floats
    ? `  floats  ρ ${(r.rho / 1000).toFixed(2)}  dips ${fmt(r.depth).padStart(6)}   ${r.name} (${r.base.m} kg)`
    : `  ${r.v.toFixed(2).padStart(5)} m/s ${fmt(r.depth).padStart(9)}  ρ ${(r.rho / 1000).toFixed(2)}  ${r.name} (${r.base.m} kg)`);
}
