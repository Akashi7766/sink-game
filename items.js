// How Far Will It Sink? — item data + sinking physics.
//
// Every object is dropped over the Mariana Trench and gets 30 minutes. In real life anything
// denser than seawater ends up on the seabed eventually, so the time limit is what makes
// "how far" a real question. Floaters are compared by how deep they dip (their draft).
//
// For each object we use its real mass and real size:
//   1. Displaced volume V: from its material density if we know it (solid things, flooded
//      things like cups and cars), otherwise from its outer size (sealed/hollow things like balls).
//   2. Density ρ = m / V. Below seawater (1025 kg/m³) it floats; draft = (ρ/ρw) · height.
//   3. Otherwise it falls at terminal velocity, where weight − buoyancy = drag:
//        v = √( 2·m·g·(1 − ρw/ρ) / (ρw · Cd · A) )
//      A = the area it presents while falling, from its real dimensions and how that shape
//      falls (plates flat-side down, rods sideways, lumps tumbling = average projected area).
//   4. Depth = v × 30 min, stopping at the trench floor.
// Checked against known cases in check.js (e.g. a 1 cm steel ball ≈ 1.4 m/s, the Titanic's
// bow hit the seabed at roughly 10–15 m/s).

const RHO_W = 1025, G = 9.81, MAXD = 10935, SINK_TIME = 1800; // seawater kg/m³, Challenger Deep m, 30 min
const tumble = (L, W, H) => (L * W + W * H + L * H) / 2;       // mean projected area of a tumbling box
const SHAPES = {   // fill = displaced volume ÷ bounding box (for sealed items) · cd = drag coefficient
  ball:  { fill: .524, cd: .47,  area: (L, W) => Math.PI / 4 * L * W },
  blob:  { fill: .524, cd: .8,   area: (L, W, H) => Math.PI / 4 * (L * W + W * H + L * H) / 3 },
  box:   { fill: 1,    cd: 1.05, area: tumble },
  cyl:   { fill: .785, cd: .9,   area: (L, W) => L * W },               // falls sideways
  long:  { fill: .5,   cd: 1,    area: (L, W) => L * W },               // rods & tools fall sideways
  flat:  { fill: .8,   cd: 1.17, area: (L, W) => L * W },               // plates fall flat-side down
  frame: { fill: .1,   cd: 1.2,  area: (L, W, H) => .25 * tumble(L, W, H) }, // open frames ~25% solid
  shell: { fill: .3,   cd: 1.05, area: tumble },                        // flooded hollow bodies
  open:  { fill: .3,   cd: 1.2,  area: tumble },                        // cups & bowls fill with water
  sheet: { fill: .5,   cd: 1.2,  area: (L, W) => .3 * L * W },          // soaked cloth crumples up
};

function physics(b) {
  const [L, W, H] = b.dims, S = SHAPES[b.shape];
  const V = b.rho ? b.m / (b.rho * 1000) : L * W * H * S.fill;
  const rho = b.m / V;
  if (rho < RHO_W) return { floats: true, v: 0, rho, depth: Math.max(.005, rho / RHO_W * H) };
  const v = Math.sqrt(2 * b.m * G * (1 - RHO_W / rho) / (RHO_W * S.cd * S.area(L, W, H)));
  return { floats: false, v, rho, depth: Math.min(MAXD, v * SINK_TIME) };
}

// Pokémon: mass = official Pokédex weight. Density = what the body is made of (flesh with air in
// the lungs ≈ 0.98, feathers 0.6, muscle 1.06, shell/exoskeleton 1.05–2, rock 2.4–2.6, steel 6, gas ~0).
// Size is then set by that volume, in body proportions matching the shape PokéAPI lists.
const POKE_BODY = {
  ball: [[1, 1, 1], 'ball'], squiggle: [[8, 1, 1], 'cyl'], fish: [[3, 1.4, 1], 'blob'], arms: [[1.2, 1, 1], 'blob'],
  blob: [[1.3, 1, 1], 'blob'], upright: [[1.6, 1, .8], 'blob'], legs: [[1.5, 1, .8], 'blob'], quadruped: [[1.8, 1, .8], 'box'],
  wings: [[2.5, 1, .6], 'blob'], tentacles: [[1.5, 1, 1], 'blob'], heads: [[1.5, 1, 1], 'blob'], humanoid: [[3.5, 1.4, 1], 'long'],
  'bug-wings': [[2, 1.5, .5], 'flat'], armor: [[1.5, 1.2, 1], 'box'],
};
function poke(name, e, h, w, body, tint, rho) {
  const [p, shape] = POKE_BODY[body], V = w / (rho * 1000);
  const s = Math.cbrt(V / (SHAPES[shape].fill * p[0] * p[1] * p[2])) * 100;
  return [name, e, w, p.map(x => x * s), rho, shape, tint, `Pokédex: ${h} m, ${w} kg`];
}

// [name, emoji, mass kg, [length, width, height] cm, density kg/L (0 = sealed: use outer size), shape, tint?, note?]
const ITEMS_RAW = [
  // ---- fruit & veg
  ['Apple', '🍎', .2, [8, 8, 8], .8, 'ball'], ['Banana', '🍌', .12, [20, 4, 4], .95, 'long'], ['Watermelon', '🍉', 5, [30, 22, 22], .96, 'blob'],
  ['Pineapple', '🍍', 1.5, [25, 13, 13], .95, 'blob'], ['Orange', '🍊', .2, [8, 8, 8], .87, 'ball', 0, 'Peel it and it sinks — the peel is full of air.'],
  ['Lemon', '🍋', .1, [7, 6, 6], .94, 'blob'], ['Coconut', '🥥', 1.4, [15, 13, 13], .9, 'blob'], ['Strawberry', '🍓', .02, [4, 3, 3], .92, 'blob'],
  ['Tomato', '🍅', .12, [7, 7, 6], .97, 'ball'], ['Cucumber', '🥒', .3, [20, 5, 5], .96, 'cyl'], ['Eggplant', '🍆', .4, [22, 9, 9], .6, 'blob'],
  ['Bell Pepper', '🫑', .17, [9, 8, 8], .5, 'blob'], ['Broccoli', '🥦', .3, [15, 12, 12], .9, 'blob'], ['Mushroom', '🍄', .05, [6, 6, 5], .6, 'blob'],
  ['Pumpkin', '🎃', 5, [28, 28, 22], .75, 'blob'], ['Chili Pepper', '🌶️', .02, [10, 2, 2], .7, 'long'], ['Onion', '🧅', .15, [8, 8, 7], .95, 'ball'],
  ['Peanut', '🥜', .002, [3, 1.3, 1.3], .5, 'blob'], ['Bunch of Grapes', '🍇', .3, [18, 10, 8], 1.08, 'blob'], ['Potato', '🥔', .2, [10, 7, 5], 1.08, 'blob'],
  ['Sweet Potato', '🍠', .3, [18, 6, 6], 1.08, 'cyl'], ['Chestnut', '🌰', .01, [3, 3, 2], 1.1, 'blob'], ['Kidney Bean', '🫘', .0006, [1.5, .8, .6], 1.25, 'blob'],
  // ---- food
  ['Egg', '🥚', .06, [5.7, 4.4, 4.4], 1.08, 'blob', 0, 'Fresh eggs sink; old eggs float because air builds up inside.'],
  ['Steak', '🥩', .3, [20, 12, 2.5], 1.06, 'flat'], ['Chicken Drumstick', '🍗', .15, [14, 5, 5], 1.07, 'blob'],
  ['Sushi', '🍣', .04, [5, 2.5, 2.5], 1.12, 'box'], ['Chocolate Bar', '🍫', .1, [15, 7, 1], 1.3, 'flat'], ['Hard Candy', '🍬', .006, [2, 2, 1], 1.5, 'blob'],
  ['Lollipop', '🍭', .03, [12, 4, 1], 1.45, 'flat'], ['Jar of Honey', '🍯', .54, [9, 8, 8], 0, 'cyl'], ['Can of Soup', '🥫', .5, [11, 7.5, 7.5], 0, 'cyl'],
  ['Stick of Butter', '🧈', .25, [12, 6, 3.5], .91, 'box'], ['Ice Cube', '🧊', .024, [3, 3, 3], .917, 'box'], ['Bread Loaf', '🍞', .5, [25, 12, 10], .25, 'box'],
  ['Bagel', '🥯', .1, [10, 10, 3], .4, 'flat'], ['Croissant', '🥐', .06, [14, 7, 5], .25, 'blob'], ['Baguette', '🥖', .25, [60, 6, 6], .25, 'cyl'],
  ['Pretzel', '🥨', .1, [14, 12, 3], .5, 'flat'], ['Donut', '🍩', .07, [9, 9, 3], .45, 'flat'], ['Stack of Pancakes', '🥞', .3, [14, 14, 6], .6, 'box'],
  ['Waffle', '🧇', .08, [12, 12, 2], .4, 'flat'], ['Cupcake', '🧁', .08, [7, 7, 7], .6, 'blob'], ['Ice Cream Cone', '🍦', .15, [18, 7, 7], .6, 'long'],
  ['Bag of Popcorn', '🍿', .1, [20, 15, 8], .1, 'box'], ['Fortune Cookie', '🥠', .008, [6, 4, 3], .4, 'blob'], ['Rice Cracker', '🍘', .01, [7, 7, 1], .5, 'flat'],
  ['Birthday Cake', '🎂', 1.5, [22, 22, 10], .65, 'box'], ['Bento Box', '🍱', .5, [20, 12, 6], 0, 'box'],
  // ---- kitchen (open containers fill with water, so they sink like their material)
  ['Coffee Mug', '☕', .35, [12, 8, 10], 2.4, 'open'], ['Teacup', '🍵', .2, [10, 10, 7], 2.4, 'open'], ['Teapot', '🫖', 1, [22, 15, 15], 2.4, 'open'],
  ['Wine Glass', '🍷', .15, [20, 8, 8], 2.5, 'open'], ['Beer Mug', '🍺', .6, [16, 12, 9], 2.5, 'open'], ['Cocktail Glass', '🍸', .15, [17, 11, 11], 2.5, 'open'],
  ['Whiskey Tumbler', '🥃', .35, [9, 8, 8], 2.5, 'open'], ['Drinking Glass', '🥛', .25, [14, 7, 7], 2.5, 'open'], ['Plastic Soda Cup', '🥤', .03, [17, 9, 9], .9, 'open'],
  ['Full Champagne Bottle', '🍾', 1.6, [30, 9, 9], 1.39, 'cyl'], ['Message in a Bottle', '🍾', .5, [30, 8, 8], 0, 'cyl'], ['Empty Sealed Jar', '🫙', .35, [12, 9, 9], 0, 'cyl'],
  ['Baby Bottle of Milk', '🍼', .3, [18, 6, 6], .95, 'cyl'], ['Salt Shaker', '🧂', .15, [9, 4, 4], 1.8, 'cyl'], ['Chopsticks', '🥢', .008, [24, 1.4, .7], .7, 'long'],
  ['Steel Spoon', '🥄', .04, [17, 4, 1], 7.9, 'flat'], ['Wooden Spoon', '🥄', .05, [30, 6, 1.5], .7, 'flat', '#a8743f'], ['Fork & Knife', '🍴', .1, [21, 3, 1], 7.9, 'long'],
  ['Kitchen Knife', '🔪', .2, [33, 5, 2], 5.5, 'flat'], ['Cast-Iron Pan', '🍳', 2.5, [38, 26, 5], 7.2, 'flat'], ['Cereal Bowl', '🥣', .4, [16, 16, 7], 2.4, 'open'],
  ['Dinner Plate', '🍽️', .5, [27, 27, 2], 2.4, 'flat'],
  // ---- sports
  ['Basketball', '🏀', .62, [24, 24, 24], 0, 'ball'], ['Soccer Ball', '⚽', .43, [22, 22, 22], 0, 'ball'], ['Baseball', '⚾', .145, [7.4, 7.4, 7.4], 0, 'ball'],
  ['Softball', '🥎', .19, [9.7, 9.7, 9.7], 0, 'ball'], ['Tennis Ball', '🎾', .058, [6.7, 6.7, 6.7], 0, 'ball'], ['Volleyball', '🏐', .27, [21, 21, 21], 0, 'ball'],
  ['American Football', '🏈', .41, [28, 17, 17], 0, 'blob'], ['Rugby Ball', '🏉', .44, [30, 19, 19], 0, 'blob'], ['Ping-Pong Ball', '🏓', .0027, [4, 4, 4], 0, 'ball'],
  ['16 lb Bowling Ball', '🎳', 7.26, [21.8, 21.8, 21.8], 0, 'ball', 0, 'Bowling balls under 12 lb float — they are bigger than the water they weigh.'],
  ['Pool 8-Ball', '🎱', .17, [5.7, 5.7, 5.7], 0, 'ball'], ['Shuttlecock', '🏸', .005, [8, 6.5, 6.5], .3, 'blob'], ['Cricket Bat', '🏏', 1.2, [85, 11, 6], .45, 'long'],
  ['Hockey Puck', '🏒', .17, [7.6, 7.6, 2.5], 0, 'flat'], ['Boxing Glove', '🥊', .4, [30, 15, 12], .5, 'blob'], ['Skateboard', '🛹', 3, [80, 20, 10], .8, 'flat'],
  ['Olympic Gold Medal', '🥇', .53, [8.5, 8.5, .85], 10.3, 'flat'], ['Trophy Cup', '🏆', 3, [40, 25, 20], 8.5, 'open'], ['Curling Stone', '🥌', 19.96, [29, 29, 11.4], 0, 'flat'],
  ['Frisbee', '🥏', .175, [27, 27, 3], .95, 'flat'], ['Kite', '🪁', .3, [90, 60, 2], .4, 'sheet'], ['Plastic Sled', '🛷', 4, [120, 50, 15], .9, 'flat'],
  ['Fishing Rod', '🎣', .5, [200, 3, 3], 1.6, 'long'], ['Diving Mask', '🤿', .4, [18, 12, 10], 1.6, 'open'], ['Swim Goggles', '🥽', .05, [17, 5, 3], 1.15, 'frame'],
  ['Martial Arts Uniform', '🥋', 1, [80, 60, 5], 1.5, 'sheet'], ['Dartboard', '🎯', 4, [45, 45, 4], .6, 'flat'], ['Boomerang', '🪃', .3, [40, 30, 1], .7, 'flat'],
  // ---- toys & games
  ['Teddy Bear', '🧸', .5, [35, 25, 20], .2, 'blob'], ['Rubber Duck', '🦆', .05, [10, 9, 8], 0, 'blob'], ['Balloon', '🎈', .005, [28, 28, 28], 0, 'ball'],
  ['Gift Box', '🎁', 2, [30, 25, 15], 0, 'box'], ['Dice', '🎲', .005, [1.6, 1.6, 1.6], 0, 'box'], ['Puzzle Piece', '🧩', .0008, [2.5, 2.5, .2], .7, 'flat'],
  ['Mahjong Tile', '🀄', .015, [3, 2.2, 1.6], 0, 'box'], ['Nesting Dolls', '🪆', .2, [15, 8, 8], 0, 'blob'], ['Piñata', '🪅', 1, [60, 40, 40], 0, 'blob'],
  ['Disco Ball', '🪩', 2, [30, 30, 30], 0, 'ball'], ['Unicorn Plushie', '🦄', .5, [35, 25, 15], .2, 'blob'], ['Magic Wand', '🪄', .03, [35, 1.5, 1.5], .7, 'long'],
  ['Crystal Ball', '🔮', 2, [11.5, 11.5, 11.5], 0, 'ball'], ['Water Pistol', '🔫', .2, [25, 15, 5], 0, 'box'], ['Party Popper', '🎉', .02, [12, 3, 3], .4, 'cyl'],
  ['Firecracker', '🧨', .03, [15, 2, 2], .6, 'cyl'], ['Glass Marble', '🔵', .005, [1.6, 1.6, 1.6], 0, 'ball'],
  ['Steel Ball Bearing', '⚪', .0005, [.5, .5, .5], 0, 'ball', '#9aa3ad'], ['Cannonball', '⚫', 5.4, [11, 11, 11], 0, 'ball'],
  // ---- music
  ['Electric Guitar', '🎸', 3.6, [100, 33, 5], .65, 'flat'], ['Violin', '🎻', .45, [60, 21, 11], .4, 'flat'], ['Trumpet', '🎺', 1.1, [48, 13, 10], 8.5, 'frame'],
  ['Saxophone', '🎷', 2.5, [65, 20, 15], 8.5, 'frame'], ['Drum', '🥁', 4, [36, 36, 30], 0, 'cyl'], ['Banjo', '🪕', 2.5, [95, 33, 8], .5, 'flat'],
  ['Accordion', '🪗', 8, [45, 40, 20], 0, 'box'], ['Maracas', '🪇', .2, [25, 8, 8], .3, 'long'], ['Wooden Flute', '🪈', .2, [40, 2.5, 2.5], .7, 'cyl'],
  ['Bronze Bell', '🔔', 2, [15, 15, 15], 8.6, 'open'], ['Electronic Keyboard', '🎹', 10, [100, 30, 10], 0, 'box'],
  // ---- tech & science
  ['Smartphone', '📱', .17, [14.7, 7.2, .8], 2.1, 'flat'], ['Laptop', '💻', 1.6, [31, 22, 1.6], 1.5, 'flat'], ['CD', '💿', .016, [12, 12, .12], 1.2, 'flat'],
  ['AA Battery', '🔋', .023, [5, 1.4, 1.4], 0, 'cyl'], ['Light Bulb', '💡', .03, [11, 6, 6], 0, 'blob'], ['Flashlight', '🔦', .3, [20, 4, 4], 0, 'cyl'],
  ['Wristwatch', '⌚', .15, [20, 4.5, 1.3], 5, 'flat'], ['Microscope', '🔬', 4, [35, 20, 15], 3.5, 'box'], ['Horseshoe Magnet', '🧲', .3, [10, 8, 1.5], 7.5, 'flat'],
  ['Satellite Dish', '📡', 15, [100, 100, 40], 2.7, 'open'], ['Glass Thermometer', '🌡️', .05, [30, 2, 1], 2.5, 'long'], ['Stethoscope', '🩺', .2, [70, 15, 3], 2, 'frame'],
  ['Test Tube', '🧪', .02, [15, 1.6, 1.6], 2.2, 'long'], ['Glass Flask', '⚗️', .3, [25, 12, 12], 2.3, 'open'], ['Petri Dish', '🧫', .015, [9, 9, 1.5], 1.05, 'flat'],
  ['Magnifying Glass', '🔍', .15, [25, 10, 2], 2, 'flat'], ['Abacus', '🧮', .5, [30, 20, 3], .7, 'flat'], ['Hourglass', '⏳', .6, [20, 10, 10], 0, 'cyl'],
  ['Candle', '🕯️', .2, [20, 5, 5], .9, 'cyl'], ['Clay Oil Lamp', '🪔', .2, [10, 7, 4], 1.9, 'open'], ['Paper Lantern', '🏮', .2, [40, 30, 30], 0, 'blob'],
  ['Tooth', '🦷', .002, [2, 1, .8], 2.2, 'blob'], ['Bone', '🦴', .3, [40, 5, 5], 1.8, 'long'],
  // ---- tools & hardware
  ['Hammer', '🔨', .6, [33, 13, 3], 1.9, 'long'], ['Wrench', '🔧', .3, [25, 6, 1], 7.85, 'flat'], ['Screwdriver', '🪛', .15, [25, 3, 3], 2.5, 'long'],
  ['Hand Saw', '🪚', .8, [60, 15, 1], 4, 'flat'], ['Axe', '🪓', 1.7, [70, 18, 4], 1.7, 'long'], ['Pickaxe', '⛏️', 2.5, [90, 50, 4], 2.4, 'long'],
  ['Nut & Bolt', '🔩', .05, [6, 2, 2], 7.85, 'cyl'], ['Steel Gear', '⚙️', 1, [15, 15, 2], 7.85, 'flat'], ['C-Clamp', '🗜️', 1, [20, 12, 3], 7.2, 'flat'],
  ['Steel Chain', '⛓️', 5, [200, 4, 2], 7.85, 'long'], ['Hook', '🪝', .1, [10, 5, 1], 7.85, 'flat'], ['Aluminum Ladder', '🪜', 7, [200, 45, 8], 2.7, 'frame'],
  ['Toolbox', '🧰', 8, [50, 22, 22], 3.5, 'shell'], ['Balance Scale', '⚖️', 1, [30, 25, 10], 8.5, 'frame'], ['Scissors', '✂️', .1, [20, 8, 1], 4, 'flat'],
  ['Paperclip', '📎', .001, [3.3, .8, .1], 7.85, 'flat'], ['Safety Pin', '🧷', .0005, [3, .6, .1], 7.85, 'flat'], ['House Key', '🔑', .01, [6, 2.3, .2], 8.5, 'flat'],
  ['Old Iron Key', '🗝️', .05, [10, 3, .6], 7.85, 'flat'], ['Padlock', '🔒', .25, [7, 5, 2.5], 7.5, 'box'], ['Pencil', '✏️', .006, [19, .7, .7], .7, 'cyl'],
  ['Wooden Ruler', '📏', .02, [30, 3, .3], .7, 'flat'], ['Plastic Set Square', '📐', .02, [20, 15, .3], 1.19, 'flat'], ['Paintbrush', '🖌️', .03, [25, 3, 1], .7, 'long'],
  ['Broom', '🧹', .6, [140, 25, 5], .6, 'long'], ['Shopping Cart', '🛒', 20, [100, 95, 55], 7.85, 'frame'], ['Brick', '🧱', 2.5, [22, 10, 6.5], 0, 'box'],
  ['Ship Anchor', '⚓', 500, [150, 40, 30], 7.85, 'long'], ['Trident', '🔱', 3, [180, 30, 3], 7.85, 'long'], ['Steel Dagger', '🗡️', .5, [35, 5, 2], 6, 'flat'],
  ['Steel Shield', '🛡️', 5, [60, 60, 4], 7.85, 'flat'], ['Bow & Arrow', '🏹', 1, [150, 20, 3], .7, 'long'], ['Steel Army Helmet', '🪖', 1.4, [28, 24, 17], 7.85, 'open'],
  ['Plastic Hard Hat', '⛑️', .4, [30, 25, 16], .95, 'open'],
  // ---- treasure & accessories
  ['Royal Crown', '👑', 2.2, [30, 25, 25], 15, 'frame'], ['Diamond Ring', '💍', .005, [2.2, 2.2, .6], 15.5, 'frame'], ['Cut Diamond', '💎', .002, [1.1, 1.1, .7], 3.51, 'blob'],
  ['Gold Coin', '🪙', .031, [3.3, 3.3, .28], 19.3, 'flat'], ['Silver Coin', '🪙', .031, [4, 4, .3], 10.5, 'flat', '#d9dee5'], ['Copper Penny', '🪙', .0025, [1.9, 1.9, .15], 7.1, 'flat', '#c8693a'],
  ['Gold Bar', '🧈', 12.4, [25, 7, 4.5], 19.3, 'box', '#ffc531'], ['Bag of Coins', '💰', 3, [25, 18, 10], 5, 'blob'], ['Dollar Bill', '💵', .001, [15.6, 6.6, .01], 1.4, 'sheet'],
  ['Credit Card', '💳', .005, [8.6, 5.4, .08], 1.4, 'flat'], ['Glasses', '👓', .03, [14, 14, 4], 1.25, 'frame'], ['Sunglasses', '🕶️', .03, [14, 14, 5], 1.2, 'frame'],
  ['Prayer Beads', '📿', .03, [30, 15, 1], .7, 'frame'],
  // ---- clothes (soaked fabric: fibre density, laid out size)
  ['T-Shirt', '👕', .2, [70, 50, 1], 1.5, 'sheet'], ['Jeans', '👖', .6, [100, 40, 2], 1.5, 'sheet'], ['Socks', '🧦', .05, [40, 10, 1], 1.4, 'sheet'],
  ['Wool Scarf', '🧣', .15, [150, 25, 1], 1.3, 'sheet'], ['Gloves', '🧤', .1, [25, 12, 2], 1.3, 'sheet'], ['Dress', '👗', .3, [100, 50, 1], 1.38, 'sheet'],
  ['Bikini', '👙', .1, [30, 20, 1], 1.14, 'sheet'], ['Shirt & Tie', '👔', .25, [75, 55, 1], 1.5, 'sheet'], ['Lab Coat', '🥼', .6, [100, 60, 1], 1.5, 'sheet'],
  ['Silk Kimono', '👘', .8, [150, 120, 1], 1.33, 'sheet'], ['Sari', '🥻', .6, [550, 110, .1], 1.38, 'sheet'], ['Wool Coat', '🧥', 1.5, [110, 60, 3], 1.3, 'sheet'],
  ['Shorts', '🩳', .2, [50, 40, 1], 1.5, 'sheet'], ['Swimsuit', '🩱', .1, [60, 30, 1], 1.14, 'sheet'], ['Pirate Flag', '🏴‍☠️', .3, [150, 90, .1], 1.4, 'sheet'],
  ['Satin Ribbon', '🎀', .01, [100, 2.5, .05], 1.38, 'sheet'], ['Sneaker', '👟', .4, [28, 11, 10], .5, 'box'], ['Top Hat', '🎩', .2, [30, 25, 18], .4, 'cyl'],
  ['Baseball Cap', '🧢', .1, [27, 20, 12], .3, 'open'], ['Graduation Cap', '🎓', .3, [25, 25, 10], .4, 'flat'], ['Backpack', '🎒', 1, [45, 30, 15], 0, 'box'],
  ['Briefcase', '💼', 2, [45, 33, 10], 0, 'box'], ['Suitcase', '🧳', 4, [70, 45, 28], 0, 'box'],
  // ---- home
  ['Bar of Soap', '🧼', .12, [9, 6, 2.5], 1.07, 'box'], ['Sponge', '🧽', .01, [11, 7, 4], .1, 'box'], ['Toilet Paper', '🧻', .1, [11, 11, 10], 0, 'cyl'],
  ['Lotion Bottle', '🧴', .3, [18, 6, 4], .95, 'box'], ['Plastic Bucket', '🪣', 1, [30, 30, 30], .95, 'open'], ['Wicker Basket', '🧺', .5, [35, 25, 20], .5, 'open'],
  ['Toothbrush', '🪥', .02, [19, 1.5, 1.5], .95, 'long'], ['Straight Razor', '🪒', .05, [15, 2.5, 1], 3, 'flat'], ['Mirror', '🪞', 3, [60, 40, .5], 2.5, 'flat'],
  ['Spool of Thread', '🧵', .03, [6, 4, 4], 1.2, 'cyl'], ['Ball of Yarn', '🧶', .1, [10, 10, 10], .4, 'ball'], ['Wooden Chair', '🪑', 5, [90, 45, 45], .6, 'frame'],
  ['Bed', '🛏️', 40, [200, 140, 50], .3, 'box'], ['Couch', '🛋️', 50, [200, 90, 85], .35, 'box'], ['Wooden Door', '🚪', 25, [200, 80, 4], .65, 'flat'],
  ['Toilet', '🚽', 40, [75, 70, 40], 2.4, 'open'], ['Cast-Iron Bathtub', '🛁', 120, [170, 75, 50], 7.2, 'open'], ['Wooden Coffin', '⚰️', 40, [200, 60, 50], 0, 'box'],
  ['Funeral Urn', '⚱️', 2, [25, 15, 15], 2.4, 'open'], ['Granite Headstone', '🪦', 100, [70, 60, 10], 2.7, 'flat'], ['Moai Statue', '🗿', 12500, [400, 150, 120], 1.8, 'long'],
  ['Potted Plant', '🪴', 3, [30, 25, 25], 1.6, 'cyl'], ['Clay Amphora', '🏺', 4, [60, 30, 30], 1.9, 'open'], ['Cardboard Box', '📦', 1, [40, 30, 30], 0, 'box'],
  ['Barrel of Oil', '🛢️', 195, [88, 58, 58], 0, 'cyl', 0, 'Oil is lighter than water, so a full barrel floats.'],
  ['Lifebuoy', '🛟', 2, [75, 75, 12], .15, 'flat'], ['Wooden Sign', '🪧', 1, [40, 30, 2], .6, 'flat'],
  ['Stop Sign', '🛑', 2.6, [76, 76, .2], 2.7, 'flat', 0, 'A thin aluminium plate: heavy for its size, but it falls flat and drifts down slowly.'],
  ['Mouse Trap', '🪤', .03, [10, 5, 1], .6, 'flat'],
  // ---- nature
  ['Pebble', '🪨', .05, [4.5, 3.5, 2], 2.65, 'blob'], ['Rock', '🪨', 2, [15, 12, 8], 2.7, 'blob'], ['Boulder', '🪨', 500, [80, 70, 60], 2.7, 'blob'],
  ['Log', '🪵', 20, [100, 22, 22], .6, 'cyl'], ['Feather', '🪶', .0005, [25, 4, .5], .1, 'sheet'], ['Leaf', '🍃', .001, [10, 5, .03], .7, 'sheet'],
  ['Maple Leaf', '🍁', .002, [12, 12, .03], .7, 'sheet'], ['Pine Tree', '🌲', 500, [1000, 300, 300], .6, 'long'], ['Christmas Tree', '🎄', 30, [200, 100, 100], .6, 'blob'],
  ['Cactus', '🌵', 10, [120, 30, 30], .9, 'cyl'], ['Sunflower', '🌻', .1, [150, 20, 2], .5, 'long'], ['Rose', '🌹', .03, [50, 6, 6], .6, 'long'],
  ['Tulip', '🌷', .03, [40, 5, 5], .6, 'long'], ['Lotus Flower', '🪷', .1, [20, 20, 10], .4, 'flat'], ['Bouquet', '💐', .5, [45, 25, 25], .5, 'blob'],
  ['Bamboo', '🎍', 2, [300, 8, 8], .4, 'cyl'], ['Seashell', '🐚', .1, [12, 9, 5], 2.7, 'open'], ['Dead Coral', '🪸', 1, [30, 20, 15], 1.8, 'frame'],
  ['Snowman', '⛄', 30, [150, 60, 60], .5, 'blob'], ["Bird's Nest", '🪹', .1, [20, 20, 10], .3, 'open'],
  // ---- vehicles (sunken vehicles flood, so they fall as big hollow shells)
  ['Bicycle', '🚲', 12, [170, 100, 60], 1.8, 'frame'], ['Kick Scooter', '🛴', 5, [100, 80, 40], 2.5, 'frame'], ['Motor Scooter', '🛵', 110, [180, 115, 70], 3, 'shell'],
  ['Motorcycle', '🏍️', 200, [210, 110, 80], 2.5, 'frame'], ['Car', '🚗', 1400, [450, 180, 145], 2.5, 'shell'], ['Taxi', '🚕', 1500, [460, 180, 150], 2.5, 'shell'],
  ['Police Car', '🚓', 1700, [490, 190, 150], 2.5, 'shell'], ['Pickup Truck', '🛻', 2200, [530, 200, 185], 2.5, 'shell'], ['Ambulance', '🚑', 3000, [600, 250, 220], 2.5, 'shell'],
  ['Minibus', '🚐', 2500, [500, 200, 190], 2.5, 'shell'], ['Bus', '🚌', 12000, [1200, 300, 255], 3, 'shell'], ['Auto Rickshaw', '🛺', 400, [260, 170, 140], 2.5, 'shell'],
  ['Car Tire', '🛞', 9, [65, 65, 20], 1.15, 'flat'], ['Airliner', '✈️', 40000, [3800, 3500, 1200], .4, 'long'], ['Small Plane', '🛩️', 1000, [1100, 800, 250], .4, 'flat'],
  ['Speedboat', '🚤', 1500, [600, 240, 120], .3, 'box'], ['Motor Yacht', '🛥️', 8000, [1200, 400, 300], .3, 'box'], ['Ferry', '⛴️', 2e6, [10000, 2000, 1500], .3, 'box'],
  ['Sailboat', '⛵', 2000, [1000, 800, 250], .3, 'box'], ['Canoe', '🛶', 30, [500, 90, 40], .3, 'long'], ['Cruise Ship', '🚢', 1e8, [30000, 4000, 3000], .3, 'box'],
  // ---- animals (whole body incl. air in lungs; most land animals float and swim)
  ['Dog', '🐕', 25, [90, 60, 30], .97, 'blob'], ['Cat', '🐈', 4.5, [45, 25, 15], .97, 'blob'], ['Cow', '🐄', 700, [240, 140, 80], .97, 'box'],
  ['Horse', '🐎', 500, [240, 160, 60], .97, 'box'], ['Elephant', '🐘', 5000, [600, 300, 250], .97, 'box', 0, 'Elephants are strong swimmers — air in their huge lungs keeps them up.'],
  ['Pig', '🐖', 100, [140, 70, 40], .95, 'box'], ['Sheep', '🐑', 70, [120, 80, 50], .8, 'blob'], ['Chicken', '🐔', 2.5, [40, 40, 20], .6, 'blob'],
  ['Swan', '🦢', 10, [130, 40, 40], .6, 'blob'], ['Flamingo', '🦩', 3, [120, 30, 30], .7, 'long'], ['Polar Bear', '🐻‍❄️', 450, [240, 130, 90], .93, 'blob'],
  ['Penguin', '🐧', 5, [60, 25, 25], .9, 'blob'], ['Seal', '🦭', 100, [170, 50, 50], .97, 'cyl'], ['Beaver', '🦫', 20, [100, 30, 30], .95, 'blob'],
  ['Otter', '🦦', 10, [100, 25, 25], .9, 'cyl'], ['Sloth', '🦥', 5, [60, 30, 30], .9, 'blob'], ['Kangaroo', '🦘', 60, [150, 100, 50], .97, 'blob'],
  ['Giraffe', '🦒', 1200, [500, 200, 150], .95, 'box'], ['Camel', '🐫', 500, [300, 200, 80], .95, 'box'], ['Zebra', '🦓', 350, [250, 140, 60], .97, 'box'],
  ['Monkey', '🐒', 8, [50, 25, 25], .97, 'blob'], ['Koala', '🐨', 10, [70, 35, 35], .95, 'blob'], ['Panda', '🐼', 100, [150, 80, 70], .95, 'blob'],
  ['Rabbit', '🐇', 2, [40, 25, 20], .95, 'blob'], ['Mouse', '🐁', .02, [8, 3, 3], .97, 'blob'], ['Hamster', '🐹', .1, [12, 6, 6], .97, 'blob'],
  ['Frog', '🐸', .05, [10, 5, 4], .98, 'blob'], ['Snake', '🐍', 2, [180, 5, 5], .98, 'cyl'], ['Butterfly', '🦋', .0005, [8, 5, .5], .3, 'sheet'],
  ['Honeybee', '🐝', .0001, [1.5, .6, .6], .9, 'blob'], ['Ladybug', '🐞', .00002, [.7, .5, .4], .9, 'blob'], ['Spider', '🕷️', .001, [3, 3, 1], .9, 'blob'],
  ['Ant', '🐜', .000003, [.5, .1, .1], .9, 'blob'], ['Lion', '🦁', 190, [250, 110, 60], .97, 'box'], ['Tiger', '🐅', 220, [280, 100, 60], .97, 'box'],
  ['Leopard', '🐆', 60, [200, 70, 40], .97, 'box'], ['Wolf', '🐺', 40, [150, 80, 35], .97, 'box'], ['Fox', '🦊', 6, [90, 40, 20], .97, 'blob'],
  ['Deer', '🦌', 100, [180, 100, 50], .97, 'box'], ['Raccoon', '🦝', 8, [70, 30, 25], .95, 'blob'], ['Hedgehog', '🦔', .8, [20, 12, 12], .9, 'blob'],
  ['Skunk', '🦨', 3, [60, 25, 20], .95, 'blob'], ['Llama', '🦙', 150, [200, 170, 60], .9, 'box'], ['Goat', '🐐', 60, [130, 80, 40], .97, 'box'],
  ['Bison', '🦬', 900, [300, 180, 110], .97, 'box'], ['Woolly Mammoth', '🦣', 6000, [550, 330, 250], .95, 'box'],
  ['T. rex', '🦖', 8000, [1200, 400, 250], .85, 'long', 0, 'Air sacs in its body made it lighter than water (Henderson 2003).'],
  ['Brachiosaurus', '🦕', 40000, [2200, 1200, 300], .8, 'long', 0, 'Sauropods were full of air sacs — studies find they floated (Henderson 2004).'],
  ['Dodo', '🦤', 12, [70, 60, 40], .8, 'blob'], ['Peacock', '🦚', 5, [200, 60, 40], .6, 'long'], ['Parrot', '🦜', 1, [40, 15, 15], .6, 'blob'],
  ['Owl', '🦉', 1.5, [50, 25, 25], .5, 'blob'], ['Eagle', '🦅', 5, [90, 40, 40], .6, 'blob'], ['Bat', '🦇', .03, [12, 6, 3], .7, 'flat'],
  ['Turkey', '🦃', 9, [100, 60, 40], .7, 'blob'], ['Lizard', '🦎', .1, [25, 4, 3], .97, 'cyl'], ['Cockroach', '🪳', .001, [3, 1.5, .5], .9, 'flat'],
  // animals that really do sink
  ['Hippo', '🦛', 1500, [400, 150, 150], 1.08, 'box', 0, "Hippos can't swim — they're denser than water and walk along river bottoms."],
  ['Great White Shark', '🦈', 1000, [500, 150, 120], 1.04, 'cyl', 0, 'Sharks have no swim bladder; stop swimming and they slowly sink.'],
  ['Octopus', '🐙', 3, [60, 40, 20], 1.04, 'blob'], ['Crab', '🦀', .5, [18, 12, 6], 1.2, 'flat'], ['Lobster', '🦞', .7, [40, 12, 10], 1.15, 'cyl'],
  ['Shrimp', '🦐', .01, [7, 1.5, 1.5], 1.07, 'cyl'], ['Oyster', '🦪', .1, [9, 7, 3], 1.8, 'flat'], ['Snail', '🐌', .01, [3, 2.5, 2], 1.3, 'blob'],
  ['Earthworm', '🪱', .003, [15, .5, .5], 1.05, 'cyl'],
  // ---- Pokémon: all 151 Kanto Pokémon — official Pokédex weight, body density from what they're made of
  poke('Bulbasaur', '🐸', 0.7, 6.9, 'quadruped', '#5cb85c', 0.95), poke('Ivysaur', '🐸', 1, 13, 'quadruped', '#5cb85c', 0.95),
  poke('Venusaur', '🐸', 2, 100, 'quadruped', '#5cb85c', 0.95), poke('Charmander', '🦎', 0.6, 8.5, 'upright', '#ff7a3d', 0.98),
  poke('Charmeleon', '🦎', 1.1, 19, 'upright', '#ff7a3d', 0.98), poke('Charizard', '🐉', 1.7, 90.5, 'upright', '#ff7a3d', 0.9),
  poke('Squirtle', '🐢', 0.5, 9, 'upright', '#4a90e2', 1.05), poke('Wartortle', '🐢', 1, 22.5, 'upright', '#4a90e2', 1.05),
  poke('Blastoise', '🐢', 1.6, 85.5, 'upright', '#4a90e2', 1.3), poke('Caterpie', '🐛', 0.3, 2.9, 'armor', '#a8b820', 1.05),
  poke('Metapod', '🐛', 0.7, 9.9, 'arms', '#a8b820', 1.2), poke('Butterfree', '🦋', 1.1, 32, 'bug-wings', '#a8b820', 0.6),
  poke('Weedle', '🐛', 0.3, 3.2, 'armor', '#a8b820', 1.05), poke('Kakuna', '🐛', 0.6, 10, 'arms', '#a8b820', 1.2),
  poke('Beedrill', '🐝', 1, 29.5, 'bug-wings', '#a8b820', 0.9), poke('Pidgey', '🐦', 0.3, 1.8, 'wings', '#b8834f', 0.6),
  poke('Pidgeotto', '🐦', 1.1, 30, 'wings', '#b8834f', 0.6), poke('Pidgeot', '🦅', 1.5, 39.5, 'wings', '#b8834f', 0.6),
  poke('Rattata', '🐀', 0.3, 3.5, 'quadruped', '#9a6fc0', 0.98), poke('Raticate', '🐀', 0.7, 18.5, 'quadruped', '#c8b88a', 0.98),
  poke('Spearow', '🐦', 0.3, 2, 'wings', '#a87b4a', 0.6), poke('Fearow', '🦅', 1.2, 38, 'wings', '#a87b4a', 0.6),
  poke('Ekans', '🐍', 2, 6.9, 'squiggle', '#a05cc8', 0.98), poke('Arbok', '🐍', 3.5, 65, 'squiggle', '#a05cc8', 0.98),
  poke('Pikachu', '🐭', 0.4, 6, 'quadruped', '#ffd43b', 0.98), poke('Raichu', '🐭', 0.8, 30, 'upright', '#ffd43b', 0.98),
  poke('Sandshrew', '🦔', 0.6, 12, 'upright', '#d4a95a', 1.2), poke('Sandslash', '🦔', 1, 29.5, 'upright', '#d4a95a', 1.2),
  poke('Nidoran♀', '🐇', 0.4, 7, 'quadruped', '#7fb0e0', 0.98), poke('Nidorina', '🐇', 0.8, 20, 'quadruped', '#7fb0e0', 0.98),
  poke('Nidoqueen', '🦏', 1.3, 60, 'upright', '#5b8def', 0.98), poke('Nidoran♂', '🐇', 0.5, 9, 'quadruped', '#a05cc8', 0.98),
  poke('Nidorino', '🦏', 0.9, 19.5, 'quadruped', '#a05cc8', 0.98), poke('Nidoking', '🦏', 1.4, 62, 'upright', '#a05cc8', 0.98),
  poke('Clefairy', '🧚', 0.6, 7.5, 'upright', '#ff9ecb', 0.98), poke('Clefable', '🧚', 1.3, 40, 'upright', '#ff9ecb', 0.98),
  poke('Vulpix', '🦊', 0.6, 9.9, 'quadruped', '#c8693a', 0.98), poke('Ninetales', '🦊', 1.1, 19.9, 'quadruped', '#f2e1a6', 0.98),
  poke('Jigglypuff', '⚪', 0.5, 5.5, 'ball', '#ff9ecb', 0.15), poke('Wigglytuff', '🐇', 1, 12, 'ball', '#ff9ecb', 0.5),
  poke('Zubat', '🦇', 0.8, 7.5, 'wings', '#5b8def', 0.6), poke('Golbat', '🦇', 1.6, 55, 'wings', '#5b8def', 0.6),
  poke('Oddish', '🌱', 0.5, 5.4, 'legs', '#5cb85c', 0.8), poke('Gloom', '🌺', 0.8, 8.6, 'humanoid', '#5cb85c', 0.8),
  poke('Vileplume', '🌺', 1.2, 18.6, 'humanoid', '#5cb85c', 0.8), poke('Paras', '🍄', 0.3, 5.4, 'armor', '#a8b820', 0.95),
  poke('Parasect', '🍄', 1, 29.5, 'armor', '#a8b820', 0.95), poke('Venonat', '🪲', 1, 30, 'blob', '#a8b820', 0.9),
  poke('Venomoth', '🦋', 1.5, 12.5, 'bug-wings', '#a8b820', 0.6), poke('Diglett', '🥔', 0.2, 0.8, 'blob', '#d4a95a', 1.05),
  poke('Dugtrio', '🥔', 0.7, 33.3, 'heads', '#d4a95a', 1.05), poke('Meowth', '🐈', 0.4, 4.2, 'quadruped', '#c8b88a', 0.98),
  poke('Persian', '🐈', 1, 32, 'quadruped', '#c8b88a', 0.98), poke('Psyduck', '🦆', 0.8, 19.6, 'upright', '#ffd43b', 0.98),
  poke('Golduck', '🦆', 1.7, 76.6, 'upright', '#4a90e2', 0.98), poke('Mankey', '🐒', 0.5, 28, 'ball', '#c0504d', 1.06),
  poke('Primeape', '🐒', 1, 32, 'upright', '#c0504d', 1.06), poke('Growlithe', '🐕', 0.7, 19, 'quadruped', '#ff7a3d', 0.98),
  poke('Arcanine', '🐕', 1.9, 155, 'quadruped', '#ff7a3d', 0.98), poke('Poliwag', '🐸', 0.6, 12.4, 'legs', '#4a90e2', 0.98),
  poke('Poliwhirl', '🐸', 1, 20, 'humanoid', '#4a90e2', 0.98), poke('Poliwrath', '🐸', 1.3, 54, 'humanoid', '#4a90e2', 1.06),
  poke('Abra', '🦊', 0.9, 19.5, 'upright', '#e8c34a', 0.98), poke('Kadabra', '🦊', 1.3, 56.5, 'upright', '#e8c34a', 0.98),
  poke('Alakazam', '🧙', 1.5, 48, 'humanoid', '#e8c34a', 0.98), poke('Machop', '💪', 0.8, 19.5, 'upright', '#8fa3c7', 1.06),
  poke('Machoke', '💪', 1.5, 70.5, 'humanoid', '#8fa3c7', 1.06), poke('Machamp', '💪', 1.6, 130, 'humanoid', '#8fa3c7', 1.06),
  poke('Bellsprout', '🌱', 0.7, 4, 'humanoid', '#5cb85c', 0.8), poke('Weepinbell', '🌱', 1, 6.4, 'blob', '#5cb85c', 0.8),
  poke('Victreebel', '🌱', 1.7, 15.5, 'blob', '#5cb85c', 0.8), poke('Tentacool', '🦑', 0.9, 45.5, 'tentacles', '#4a90e2', 0.99),
  poke('Tentacruel', '🦑', 1.6, 55, 'tentacles', '#4a90e2', 0.99), poke('Geodude', '🪨', 0.4, 20, 'arms', '#8d8378', 2.6),
  poke('Graveler', '🪨', 1, 105, 'blob', '#8d8378', 2.5), poke('Golem', '🪨', 1.4, 300, 'blob', '#8d8378', 2.4),
  poke('Ponyta', '🐎', 1, 30, 'quadruped', '#ff7a3d', 0.98), poke('Rapidash', '🐎', 1.7, 95, 'quadruped', '#ff7a3d', 0.98),
  poke('Slowpoke', '🦛', 1.2, 36, 'quadruped', '#ff9ecb', 0.98), poke('Slowbro', '🦛', 1.6, 78.5, 'upright', '#ff9ecb', 0.98),
  poke('Magnemite', '🧲', 0.3, 6, 'arms', '#ffd43b', 6), poke('Magneton', '🧲', 1, 60, 'heads', '#ffd43b', 6),
  poke('Farfetch’d', '🦆', 0.8, 15, 'wings', '#a87b4a', 0.6), poke('Doduo', '🐦', 1.4, 39.2, 'legs', '#a87b4a', 0.7),
  poke('Dodrio', '🐦', 1.8, 85.2, 'legs', '#a87b4a', 0.7), poke('Seel', '🦭', 1.1, 90, 'fish', '#e8f4ff', 0.95),
  poke('Dewgong', '🦭', 1.7, 120, 'fish', '#e8f4ff', 0.95), poke('Grimer', '💩', 0.9, 30, 'arms', '#a05cc8', 1.3),
  poke('Muk', '💩', 1.2, 30, 'arms', '#a05cc8', 1.3), poke('Shellder', '🐚', 0.3, 4, 'ball', '#8a6fd1', 2),
  poke('Cloyster', '🐚', 1.5, 132.5, 'ball', '#8a6fd1', 2), poke('Gastly', '👻', 1.3, 0.1, 'ball', '#705898', 0.002),
  poke('Haunter', '👻', 1.6, 0.1, 'arms', '#705898', 0.1), poke('Gengar', '👻', 1.5, 40.5, 'upright', '#705898', 0.9),
  poke('Onix', '🐍', 8.8, 210, 'squiggle', '#8d8d8d', 2.4), poke('Drowzee', '🐘', 1, 32.4, 'humanoid', '#ff6fa0', 0.98),
  poke('Hypno', '🐘', 1.6, 75.6, 'humanoid', '#ff6fa0', 0.98), poke('Krabby', '🦀', 0.4, 6.5, 'armor', '#e0533d', 1.2),
  poke('Kingler', '🦀', 1.3, 60, 'armor', '#e0533d', 1.2), poke('Voltorb', '🔴', 0.5, 10.4, 'ball', '#e53935', 0.2),
  poke('Electrode', '🔴', 1.2, 66.6, 'ball', '#e53935', 0.2), poke('Exeggcute', '🥚', 0.4, 2.5, 'heads', '#f5e6c8', 1.05),
  poke('Exeggutor', '🌴', 2, 120, 'legs', '#5cb85c', 0.7), poke('Cubone', '🦴', 0.4, 6.5, 'upright', '#b8834f', 1.1),
  poke('Marowak', '🦴', 1, 45, 'upright', '#b8834f', 1.1), poke('Hitmonlee', '🦵', 1.5, 49.8, 'humanoid', '#c0504d', 1.06),
  poke('Hitmonchan', '🥊', 1.4, 50.2, 'humanoid', '#c0504d', 1.06), poke('Lickitung', '👅', 1.2, 65.5, 'upright', '#ff9ecb', 0.98),
  poke('Koffing', '🟣', 0.6, 1, 'ball', '#a05cc8', 0.05), poke('Weezing', '🟣', 1.2, 9.5, 'heads', '#a05cc8', 0.05),
  poke('Rhyhorn', '🦏', 1, 115, 'quadruped', '#9a9a9a', 1.6), poke('Rhydon', '🦏', 1.9, 120, 'upright', '#9a9a9a', 1.6),
  poke('Chansey', '🥚', 1.1, 34.6, 'upright', '#ff9ecb', 0.98), poke('Tangela', '🧶', 1, 35, 'legs', '#3d6fd9', 0.7),
  poke('Kangaskhan', '🦘', 2.2, 80, 'upright', '#a87b4a', 0.98), poke('Horsea', '🐠', 0.4, 8, 'blob', '#4a90e2', 1.03),
  poke('Seadra', '🐠', 1.2, 25, 'blob', '#4a90e2', 1.03), poke('Goldeen', '🐟', 0.6, 15, 'fish', '#ff9a5c', 1.03),
  poke('Seaking', '🐟', 1.3, 39, 'fish', '#ff9a5c', 1.03), poke('Staryu', '⭐', 0.8, 34.5, 'blob', '#d4a95a', 1.1),
  poke('Starmie', '⭐', 1.1, 80, 'blob', '#8a6fd1', 1.2), poke('Mr. Mime', '🤡', 1.3, 54.5, 'humanoid', '#ff6fa0', 0.98),
  poke('Scyther', '🦗', 1.5, 56, 'bug-wings', '#a8b820', 1.1), poke('Jynx', '💃', 1.4, 40.6, 'humanoid', '#8fe3ff', 0.98),
  poke('Electabuzz', '🐅', 1.1, 30, 'upright', '#ffd43b', 0.98), poke('Magmar', '🦎', 1.3, 44.5, 'upright', '#ff7a3d', 0.98),
  poke('Pinsir', '🪲', 1.5, 55, 'humanoid', '#a8b820', 1.1), poke('Tauros', '🐂', 1.4, 88.4, 'quadruped', '#a87b4a', 0.98),
  poke('Magikarp', '🐟', 0.9, 10, 'fish', '#ff7043', 1.03), poke('Gyarados', '🐉', 6.5, 235, 'squiggle', '#4a90e2', 0.98),
  poke('Lapras', '🦕', 2.5, 220, 'fish', '#4a90e2', 0.95), poke('Ditto', '😊', 0.3, 4, 'ball', '#c6a1e0', 0.98),
  poke('Eevee', '🦊', 0.3, 6.5, 'quadruped', '#b8834f', 0.98), poke('Vaporeon', '🦊', 1, 29, 'quadruped', '#4a90e2', 0.98),
  poke('Jolteon', '🦊', 0.8, 24.5, 'quadruped', '#ffd43b', 0.98), poke('Flareon', '🦊', 0.9, 25, 'quadruped', '#ff7a3d', 0.98),
  poke('Porygon', '🔷', 0.8, 36.5, 'legs', '#ff6f8f', 1.2), poke('Omanyte', '🐚', 0.4, 7.5, 'tentacles', '#5bb8ff', 1.6),
  poke('Omastar', '🐚', 1, 35, 'tentacles', '#5bb8ff', 1.6), poke('Kabuto', '🦀', 0.5, 11.5, 'armor', '#a87b4a', 1.4),
  poke('Kabutops', '🦂', 1.3, 40.5, 'upright', '#b8a038', 1.2), poke('Aerodactyl', '🦇', 1.8, 59, 'wings', '#a8a0b8', 1.3),
  poke('Snorlax', '🐻', 2.1, 460, 'blob', '#2f7f8f', 0.94), poke('Articuno', '🦅', 1.7, 55.4, 'wings', '#8fe3ff', 0.6),
  poke('Zapdos', '🦅', 1.6, 52.6, 'wings', '#ffd43b', 0.6), poke('Moltres', '🦅', 2, 60, 'wings', '#ff7a3d', 0.6),
  poke('Dratini', '🐍', 1.8, 3.3, 'squiggle', '#5b8def', 0.98), poke('Dragonair', '🐍', 4, 16.5, 'squiggle', '#5b8def', 0.98),
  poke('Dragonite', '🐉', 2.2, 210, 'upright', '#ffb347', 0.95), poke('Mewtwo', '👽', 2, 122, 'upright', '#c9a7e8', 0.98),
  poke('Mew', '🐈', 0.4, 4, 'upright', '#ff9ecb', 0.98),
  // later-generation favourites
  poke('Aron', '🦏', 0.4, 60, 'quadruped', '#9aa3ad', 4), poke('Cosmoem', '🌕', 0.1, 999.9, 'ball', '#e8b84a', 1908),
  poke('Wailord', '🐋', 14.5, 398, 'fish', '#3d7fd9', .95), poke('Metagross', '🕷️', 1.6, 550, 'armor', '#4a78b5', 6),
  poke('Steelix', '🐍', 9.2, 400, 'squiggle', '#9aa3ad', 6), poke('Kyogre', '🐋', 4.5, 352, 'fish', '#1e5bb8', .98),
  poke('Groudon', '🦖', 3.5, 950, 'upright', '#d84343', 2.4), poke('Bronzor', '🛡️', 0.5, 60.5, 'armor', '#3d8a8a', 8),
  poke('Klink', '⚙️', 0.3, 21, 'heads', '#cfd6de', 7.8), poke('Beldum', '🔩', 0.6, 95.2, 'arms', '#4a78b5', 6),
  // ---- movies, comics & games (canon sizes and weights)
  ['Mjölnir', '🔨', 19.2, [40, 20, 12], 6, 'box', '#c3cad3'], ["Captain America's Shield", '🛡️', 5.4, [76, 76, 3], 3, 'flat', '#d84343'],
  ['The One Ring', '💍', .008, [2.2, 2.2, .3], 19.3, 'frame', '#ffc531'], ['Excalibur', '🗡️', 1.5, [100, 5, 1], 7.8, 'flat'],
  ['Heart of Te Fiti', '🟢', .1, [5, 4, 2], 2.95, 'flat'], ['Groot', '🌳', 200, [230, 60, 40], .6, 'long'],
  ['The Hulk', '🦸', 472, [244, 100, 60], 1.7, 'long', '#4caf50'], ['Santa Claus', '🎅', 130, [175, 60, 45], .97, 'long'],
  ['Godzilla', '🦖', 99634000, [11980, 4000, 3000], 1.47, 'long', '#4f7a4f', 'Toho: 119.8 m, 99,634 tonnes.'],
  ['King Kong', '🦍', 158000, [3160, 1500, 1000], .145, 'blob', 0, 'Kong: Skull Island — 31.6 m but only 158 tonnes, so he floats.'],
  ['Jaws', '🦈', 3000, [760, 180, 150], 1.04, 'cyl', '#7d8fa0'], ['R2-D2', '🤖', 32, [96, 60, 60], 0, 'cyl', '#5b8def'],
  ['The Titanic', '🚢', 52310000, [26900, 5300, 2800], 3, 'shell', '#3a3f4b', 'Its bow hit the seabed at roughly 10–15 m/s.'],
  ['Minecraft Dirt Block', '🟫', 1500, [100, 100, 100], 0, 'box'], ['Minecraft Diamond Block', '🟦', 3510, [100, 100, 100], 0, 'box', '#7ff0ff'],
  ['Minecraft TNT Block', '🟥', 1650, [100, 100, 100], 0, 'box'], ['Patrick Star', '⭐', .3, [20, 20, 4], 1.07, 'flat', '#ff9ecb'],
  ['SpongeBob', '🧽', .2, [10, 8, 3], 1.1, 'box', '#ffe14d', 'A soaked sea sponge — and he is 10 cm tall in the show.'],
  ['Lightsaber (switched off)', '🔦', 1, [28, 4, 4], 0, 'cyl', '#b0b8c4'],
  ['Optimus Prime', '🤖', 4300, [850, 300, 150], .54, 'long', '#d84343', 'Movie canon: 8.5 m, 4.3 tonnes — too light for his size to sink.'],
  ['Iron Man (suited up)', '🦾', 179, [185, 60, 35], 1.7, 'long', '#c0392b'],
  ['Sonic the Hedgehog', '🦔', 35, [100, 50, 40], 1.17, 'blob', '#3d6fd9', "Canon: 1 m, 35 kg — which is why Sonic can't swim."],
  ['Thanos', '🦸', 447, [201, 80, 45], 2.6, 'long', '#8e6bbf'], ['The Thing', '🪨', 227, [183, 70, 40], 2.5, 'long', '#e07a3d'],
  ['Baymax', '🤖', 34, [188, 100, 60], 0, 'blob', '#f4f6f8', 'An inflatable robot: 34 kg filled with air.'],
  ['Hello Kitty', '🐱', .6, [35, 25, 15], 0, 'blob', '#ffffff', 'Officially five apples tall and three apples heavy.'],
];

const ITEMS = ITEMS_RAW.map(([name, e, m, dims, rho, shape, c, note]) =>
  ({ name, e, m, dims: dims.map(x => x / 100).sort((a, b) => b - a), rho, shape, c: c || null, note: note || null }));
const makeVariant = b => ({ name: b.name, base: b, ...physics(b) });

if (typeof module !== 'undefined') module.exports = { ITEMS, SHAPES, MAXD, SINK_TIME, RHO_W, physics, makeVariant };
