// Sanity check for items.js: `node check.js` prints every item's sinking result and
// asserts well-known real-world outcomes. `node check.js -q` skips the table.
const { ITEMS, SHAPES, MAXD, makeVariant } = require('./items.js');
const assert = require('assert');
const fmt = d => d < 1 ? Math.round(d * 100) + ' cm' : Math.round(d).toLocaleString() + ' m';
const R = Object.fromEntries(ITEMS.map(b => [b.name, makeVariant(b, null)]));

for (const b of ITEMS) {
  assert(b.d > 0 && b.m > 0, b.name + ': bad numbers');
  assert(typeof b.shape === 'number' || SHAPES[b.shape], b.name + ': unknown shape ' + b.shape);
}
assert.equal(new Set(ITEMS.map(b => b.name)).size, ITEMS.length, 'duplicate names');

// Things everyone knows float / sink in seawater
for (const n of ['Apple', 'Basketball', 'Ice Cube', 'Rubber Duck', 'Cruise Ship', 'Barrel of Oil', 'Log', 'Stick of Butter', 'Watermelon'])
  assert(R[n].floats, n + ' should float');
for (const n of ['Dog', 'Elephant', 'Polar Bear', 'Snorlax', 'Wailord', 'Santa Claus'])
  assert(R[n].floats, n + ' should float');
for (const n of ['Potato', 'Egg', 'Smartphone', 'Ship Anchor', 'Gold Bar', 'Car', '16 lb Bowling Ball', 'Brick', 'Hippo', 'Great White Shark', 'Mjölnir', 'Cosmoem'])
  assert(!R[n].floats, n + ' should sink');
// Rankings that hold in reality
const deeper = (a, b) => assert(R[a].depth > R[b].depth, `${a} (${fmt(R[a].depth)}) should beat ${b} (${fmt(R[b].depth)})`);
deeper('Ship Anchor', 'Smartphone'); deeper('Gold Bar', 'Gold Coin'); deeper('Boulder', 'Pebble'); deeper('Cannonball', 'Glass Marble');
deeper('16 lb Bowling Ball', 'T-Shirt'); deeper('Gold Coin', 'Copper Penny'); deeper('Curling Stone', 'Brick'); deeper('Pebble', 'Dollar Bill');
// Terminal speeds stay sane: everyday things under ~7 m/s; the Titanic hit the seabed at roughly 10-15 m/s
for (const r of Object.values(R)) if (!r.floats && r.base.m < 1000 && r.base.d < 100) assert(r.v > .01 && r.v < 7, `${r.name}: speed ${r.v.toFixed(2)} m/s`);
assert(R['The Titanic'].v > 8 && R['The Titanic'].v < 16, 'Titanic speed ' + R['The Titanic'].v);

assert.equal(ITEMS.filter(b => b.e && b.name.trim().length > 0).length, ITEMS.length, 'every item needs a name + emoji');
console.log(`${ITEMS.length} objects. All checks passed.`);
if (!process.argv.includes('-q')) {
  const rows = Object.values(R).sort((a, b) => (a.floats - b.floats) || b.depth - a.depth || a.depth - b.depth);
  for (const r of rows) console.log(r.floats ? `  floats  ${fmt(r.depth).padStart(8)} draft   ${r.name}`
    : `  ${r.v.toFixed(2).padStart(5)} m/s ${fmt(r.depth).padStart(9)}  ${r.name}`);
}
