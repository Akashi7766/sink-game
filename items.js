// How Far Will It Sink? — item data + sinking physics.
//
// Why a time limit: in real life, anything denser than seawater ends up on the seabed,
// so "how deep" alone would be a tie. Instead every object is dropped over the Mariana
// Trench and falls at its real terminal velocity for SINK_TIME. Depth = speed x time,
// capped at the trench floor. Floaters report how deep they ride in the water (draft).
//
// Terminal velocity in seawater:  v = sqrt( 2·m·g·(1 − ρw/ρ) / (ρw · Cd·A) )
// with Cd·A = SHAPES[shape] · V^(2/3)  (V = m/ρ). SHAPES folds the drag coefficient and
// how much area the shape presents per unit volume (a sphere is 1.21·Cd = 0.57).
// ponytail: shape classes, not per-object CFD; fine to ~±30%, which is enough to rank.

const RHO_W = 1025, G = 9.81, MAXD = 10935, SINK_TIME = 1800; // seawater kg/m³, Challenger Deep m, 30 min
const SHAPES = {
  ball: .57,  // spheres
  blob: .9,   // rounded, compact (fruit, rocks)
  box: 1.4,   // blocky, tumbling
  long: 2.5,  // rods & sticks — fall broadside
  open: 2.5,  // cups/bowls that fill with water (density = material)
  flat: 4,    // plates, phones, books — flutter
  frame: 6,   // wire/tube frames (bikes, rings, glasses)
  thin: 7,    // coins, cards, discs — strong flutter
  shell: 8,   // flooded hollow bodies (vehicles): big outside, little material
  sheet: 40,  // soaked fabric, paper, leaves
};
const DRAFT = { ball: 1.24, flat: .3, thin: .15, long: .6, sheet: .05 }; // height ÷ V^(1/3)
// Material swaps make a solid statue with the same outside volume. That only works when
// m/ρ is the outside volume, i.e. not for open/flooded/frame/fabric shapes — and only for
// things under a tonne (a solid-gold cruise ship is just silly).
const NO_MAT = new Set(['open', 'frame', 'shell', 'sheet']);

function physics(den, mass, shape) {
  const rho = den * 1000, V = mass / rho;
  if (rho < RHO_W) {
    const draft = (rho / RHO_W) * Math.cbrt(V) * (DRAFT[shape] || 1);
    return { floats: true, v: 0, depth: Math.min(15, Math.max(.01, draft)) };
  }
  const kCd = typeof shape === 'number' ? shape : SHAPES[shape];
  const v = Math.sqrt(2 * mass * G * (1 - RHO_W / rho) / (RHO_W * kCd * Math.pow(V, 2 / 3)));
  return { floats: false, v, depth: Math.min(MAXD, v * SINK_TIME) };
}

// [name, emoji, effective density (kg/L, as dropped incl. trapped air), mass (kg), shape, tint?]
// Seawater is 1.025, so anything below that floats.
const ITEMS_RAW = [
  // ---- fruit & veg
  ['Apple', '🍎', .85, .2, 'blob'], ['Banana', '🍌', .95, .12, 'long'], ['Watermelon', '🍉', .96, 5, 'ball'],
  ['Pineapple', '🍍', .95, 1.5, 'blob'], ['Orange', '🍊', .87, .2, 'ball'], ['Lemon', '🍋', .94, .1, 'ball'],
  ['Coconut', '🥥', .9, 1.4, 'ball'], ['Strawberry', '🍓', .92, .02, 'blob'], ['Tomato', '🍅', .97, .12, 'ball'],
  ['Cucumber', '🥒', .96, .3, 'long'], ['Eggplant', '🍆', .6, .4, 'long'], ['Bell Pepper', '🫑', .5, .17, 'blob'],
  ['Broccoli', '🥦', .9, .3, 'blob'], ['Mushroom', '🍄', .6, .05, 'blob'], ['Pumpkin', '🎃', .75, 5, 'ball'],
  ['Chili Pepper', '🌶️', .7, .02, 'long'], ['Onion', '🧅', .95, .15, 'ball'], ['Peanut', '🥜', .5, .002, 'blob'],
  ['Bunch of Grapes', '🍇', 1.08, .3, 'blob'], ['Potato', '🥔', 1.08, .2, 'blob'], ['Sweet Potato', '🍠', 1.08, .3, 'long'],
  ['Chestnut', '🌰', 1.1, .01, 'blob'], ['Kidney Bean', '🫘', 1.25, .0006, 'blob'],
  // ---- food
  ['Egg', '🥚', 1.08, .06, 'blob'], ['Steak', '🥩', 1.06, .3, 'flat'], ['Chicken Drumstick', '🍗', 1.07, .15, 'blob'],
  ['Sushi', '🍣', 1.12, .04, 'blob'], ['Chocolate Bar', '🍫', 1.3, .1, 'flat'], ['Hard Candy', '🍬', 1.5, .006, 'blob'],
  ['Lollipop', '🍭', 1.45, .03, 'flat'], ['Jar of Honey', '🍯', 1.45, .5, 'box'], ['Can of Soup', '🥫', 1.1, .45, 'box'],
  ['Stick of Butter', '🧈', .91, .25, 'box'], ['Ice Cube', '🧊', .917, .03, 'box'], ['Bread Loaf', '🍞', .25, .5, 'box'],
  ['Bagel', '🥯', .4, .1, 'flat'], ['Croissant', '🥐', .25, .06, 'blob'], ['Baguette', '🥖', .25, .25, 'long'],
  ['Pretzel', '🥨', .5, .1, 'flat'], ['Donut', '🍩', .45, .07, 'flat'], ['Stack of Pancakes', '🥞', .6, .3, 'box'],
  ['Waffle', '🧇', .4, .08, 'flat'], ['Cupcake', '🧁', .6, .08, 'blob'], ['Ice Cream Cone', '🍦', .6, .15, 'long'],
  ['Bag of Popcorn', '🍿', .1, .1, 'box'], ['Fortune Cookie', '🥠', .4, .008, 'blob'], ['Rice Cracker', '🍘', .5, .01, 'flat'],
  ['Birthday Cake', '🎂', .65, 1.5, 'box'], ['Bento Box', '🍱', .5, .5, 'box'],
  // ---- kitchen (open containers fill with water, so they sink like their material)
  ['Coffee Mug', '☕', 2.4, .35, 'open'], ['Teacup', '🍵', 2.4, .2, 'open'], ['Teapot', '🫖', 2.4, 1, 'open'],
  ['Wine Glass', '🍷', 2.5, .15, 'open'], ['Beer Mug', '🍺', 2.5, .6, 'open'], ['Cocktail Glass', '🍸', 2.5, .15, 'open'],
  ['Whiskey Tumbler', '🥃', 2.5, .35, 'open'], ['Drinking Glass', '🥛', 2.5, .25, 'open'], ['Plastic Soda Cup', '🥤', .9, .03, 'open'],
  ['Full Champagne Bottle', '🍾', 1.4, 1.6, 'blob'], ['Message in a Bottle', '🍾', .5, .5, 'blob'], ['Empty Sealed Jar', '🫙', .6, .35, 'box'],
  ['Baby Bottle of Milk', '🍼', .95, .3, 'long'], ['Salt Shaker', '🧂', 1.8, .15, 'box'], ['Chopsticks', '🥢', .7, .02, 'long'],
  ['Steel Spoon', '🥄', 7.9, .04, 'flat'], ['Wooden Spoon', '🥄', .7, .05, 'flat', '#a8743f'], ['Fork & Knife', '🍴', 7.9, .1, 'long'],
  ['Kitchen Knife', '🔪', 5.5, .2, 'flat'], ['Cast-Iron Pan', '🍳', 7.2, 2.5, 'flat'], ['Cereal Bowl', '🥣', 2.4, .4, 'open'],
  ['Dinner Plate', '🍽️', 2.4, .5, 'thin'],
  // ---- sports
  ['Basketball', '🏀', .08, .6, 'ball'], ['Soccer Ball', '⚽', .07, .43, 'ball'], ['Baseball', '⚾', .69, .145, 'ball'],
  ['Softball', '🥎', .6, .19, 'ball'], ['Tennis Ball', '🎾', .4, .058, 'ball'], ['Volleyball', '🏐', .08, .27, 'ball'],
  ['American Football', '🏈', .1, .41, 'blob'], ['Rugby Ball', '🏉', .1, .44, 'blob'], ['Ping-Pong Ball', '🏓', .08, .0027, 'ball'],
  ['16 lb Bowling Ball', '🎳', 1.33, 7.26, 'ball'], ['Pool 8-Ball', '🎱', 1.75, .17, 'ball'], ['Shuttlecock', '🏸', .3, .005, 'blob'],
  ['Cricket Bat', '🏏', .45, 1.2, 'long'], ['Hockey Puck', '🏒', 1.5, .17, 'box'], ['Boxing Glove', '🥊', .5, .4, 'blob'],
  ['Skateboard', '🛹', .8, 3, 'flat'], ['Olympic Gold Medal', '🥇', 10.3, .53, 'thin'], ['Trophy Cup', '🏆', 8.5, 3, 'open'],
  ['Curling Stone', '🥌', 2.7, 19.96, 'box'], ['Frisbee', '🥏', .95, .175, 'thin'], ['Kite', '🪁', .4, .3, 'sheet'],
  ['Plastic Sled', '🛷', .9, 4, 'flat'], ['Fishing Rod', '🎣', 1.6, .5, 'long'], ['Diving Mask', '🤿', 1.6, .4, 'open'],
  ['Swim Goggles', '🥽', 1.15, .05, 'frame'], ['Martial Arts Uniform', '🥋', 1.5, 1, 'sheet'], ['Dartboard', '🎯', .6, 4, 'flat'],
  ['Boomerang', '🪃', .7, .3, 'flat'],
  // ---- toys & games
  ['Teddy Bear', '🧸', .2, .5, 'blob'], ['Rubber Duck', '🦆', .15, .05, 'blob'], ['Balloon', '🎈', .01, .005, 'ball'],
  ['Gift Box', '🎁', .3, 2, 'box'], ['Dice', '🎲', 1.25, .005, 'box'], ['Puzzle Piece', '🧩', .7, .01, 'thin'],
  ['Mahjong Tile', '🀄', 1.5, .015, 'box'], ['Nesting Dolls', '🪆', .4, .2, 'blob'], ['Piñata', '🪅', .1, 1, 'blob'],
  ['Disco Ball', '🪩', .3, 2, 'ball'], ['Unicorn Plushie', '🦄', .2, .5, 'blob'], ['Magic Wand', '🪄', .7, .03, 'long'],
  ['Crystal Ball', '🔮', 2.5, 2, 'ball'], ['Water Pistol', '🔫', .6, .2, 'blob'], ['Party Popper', '🎉', .4, .02, 'long'],
  ['Firecracker', '🧨', .6, .05, 'long'], ['Glass Marble', '🔵', 2.5, .005, 'ball'], ['Steel Ball Bearing', '⚪', 7.85, .0005, 'ball', '#9aa3ad'],
  ['Cannonball', '⚫', 7.2, 5, 'ball'],
  // ---- music
  ['Electric Guitar', '🎸', .65, 3.5, 'flat'], ['Violin', '🎻', .4, .45, 'flat'], ['Trumpet', '🎺', 8.5, 1.1, 'frame'],
  ['Saxophone', '🎷', 8.5, 2.5, 'frame'], ['Drum', '🥁', .3, 4, 'box'], ['Banjo', '🪕', .5, 2.5, 'flat'],
  ['Accordion', '🪗', .4, 8, 'box'], ['Maracas', '🪇', .3, .2, 'blob'], ['Wooden Flute', '🪈', .7, .2, 'long'],
  ['Bronze Bell', '🔔', 8.6, 2, 'open'], ['Electronic Keyboard', '🎹', .4, 10, 'box'],
  // ---- tech & science
  ['Smartphone', '📱', 2.1, .17, 'flat'], ['Laptop', '💻', 1.6, 1.6, 'flat'], ['CD', '💿', 1.2, .016, 'thin'],
  ['AA Battery', '🔋', 2.8, .023, 'blob'], ['Light Bulb', '💡', .3, .03, 'blob'], ['Flashlight', '🔦', 1.3, .2, 'long'],
  ['Wristwatch', '⌚', 5, .15, 'blob'], ['Microscope', '🔬', 3.5, 4, 'box'], ['Horseshoe Magnet', '🧲', 7.5, .3, 'blob'],
  ['Satellite Dish', '📡', 2.7, 15, 'thin'], ['Glass Thermometer', '🌡️', 2.5, .05, 'long'], ['Stethoscope', '🩺', 2, .2, 'frame'],
  ['Test Tube', '🧪', 2.2, .02, 'long'], ['Glass Flask', '⚗️', 2.3, .3, 'open'], ['Petri Dish', '🧫', 1.05, .015, 'thin'],
  ['Magnifying Glass', '🔍', 2, .15, 'flat'], ['Abacus', '🧮', .7, .5, 'box'], ['Hourglass', '⏳', 1.3, .6, 'blob'],
  ['Candle', '🕯️', .9, .2, 'long'], ['Clay Oil Lamp', '🪔', 1.9, .2, 'open'], ['Paper Lantern', '🏮', .1, .2, 'blob'],
  ['Tooth', '🦷', 2.2, .002, 'blob'], ['Bone', '🦴', 1.8, .3, 'long'],
  // ---- tools & hardware
  ['Hammer', '🔨', 1.9, .6, 'long'], ['Wrench', '🔧', 7.85, .3, 'long'], ['Screwdriver', '🪛', 2.5, .15, 'long'],
  ['Hand Saw', '🪚', 4, .8, 'flat'], ['Axe', '🪓', 1.7, 1.7, 'long'], ['Pickaxe', '⛏️', 2.4, 2.5, 'long'],
  ['Nut & Bolt', '🔩', 7.85, .05, 'blob'], ['Steel Gear', '⚙️', 7.85, 1, 'flat'], ['C-Clamp', '🗜️', 7.2, 1, 'blob'],
  ['Steel Chain', '⛓️', 7.85, 5, 'long'], ['Hook', '🪝', 7.85, .1, 'long'], ['Aluminum Ladder', '🪜', 2.7, 7, 'frame'],
  ['Toolbox', '🧰', 3.5, 8, 'shell'], ['Balance Scale', '⚖️', 8.5, 1, 'frame'], ['Scissors', '✂️', 4, .1, 'long'],
  ['Paperclip', '📎', 7.85, .001, 'frame'], ['Safety Pin', '🧷', 7.85, .0005, 'frame'], ['House Key', '🔑', 8.5, .01, 'flat'],
  ['Old Iron Key', '🗝️', 7.85, .05, 'flat'], ['Padlock', '🔒', 7.5, .25, 'box'], ['Pencil', '✏️', .7, .006, 'long'],
  ['Wooden Ruler', '📏', .7, .02, 'thin'], ['Plastic Set Square', '📐', 1.19, .02, 'thin'], ['Paintbrush', '🖌️', .7, .03, 'long'],
  ['Broom', '🧹', .6, .6, 'long'], ['Shopping Cart', '🛒', 7.85, 20, 'frame'], ['Brick', '🧱', 1.9, 2.5, 'box'],
  ['Ship Anchor', '⚓', 7.85, 500, 1.5], ['Trident', '🔱', 7.85, 3, 'long'], ['Steel Dagger', '🗡️', 6, .5, 'long'],
  ['Steel Shield', '🛡️', 7.85, 5, 'flat'], ['Bow & Arrow', '🏹', .7, 1, 'long'], ['Steel Army Helmet', '🪖', 7.85, 1.4, 'open'],
  ['Plastic Hard Hat', '⛑️', .95, .4, 'open'],
  // ---- treasure & accessories
  ['Royal Crown', '👑', 15, 2.2, 'frame'], ['Diamond Ring', '💍', 15.5, .005, 'frame'], ['Cut Diamond', '💎', 3.51, .002, 'blob'],
  ['Gold Coin', '🪙', 19.3, .031, 'thin'], ['Silver Coin', '🪙', 10.5, .031, 'thin', '#d9dee5'], ['Copper Penny', '🪙', 7.1, .0025, 'thin', '#c8693a'],
  ['Gold Bar', '🧈', 19.3, 12.4, 'box', '#ffc531'], ['Bag of Coins', '💰', 5, 3, 'blob'], ['Dollar Bill', '💵', 1.4, .001, 'sheet'],
  ['Credit Card', '💳', 1.4, .005, 'thin'], ['Glasses', '👓', 1.25, .03, 'frame'], ['Sunglasses', '🕶️', 1.2, .03, 'frame'],
  ['Prayer Beads', '📿', .7, .05, 'frame'],
  // ---- clothes (soaked fabric: fibre density, huge drag)
  ['T-Shirt', '👕', 1.5, .2, 'sheet'], ['Jeans', '👖', 1.5, .6, 'sheet'], ['Socks', '🧦', 1.4, .05, 'sheet'],
  ['Wool Scarf', '🧣', 1.3, .15, 'sheet'], ['Gloves', '🧤', 1.3, .1, 'sheet'], ['Dress', '👗', 1.38, .3, 'sheet'],
  ['Bikini', '👙', 1.14, .1, 'sheet'], ['Shirt & Tie', '👔', 1.5, .25, 'sheet'], ['Lab Coat', '🥼', 1.5, .6, 'sheet'],
  ['Silk Kimono', '👘', 1.33, .8, 'sheet'], ['Sari', '🥻', 1.38, .6, 'sheet'], ['Wool Coat', '🧥', 1.3, 1.5, 'sheet'],
  ['Shorts', '🩳', 1.5, .2, 'sheet'], ['Swimsuit', '🩱', 1.14, .1, 'sheet'], ['Pirate Flag', '🏴‍☠️', 1.4, .3, 'sheet'],
  ['Satin Ribbon', '🎀', 1.38, .01, 'sheet'], ['Sneaker', '👟', .5, .4, 'blob'], ['Top Hat', '🎩', .4, .2, 'box'],
  ['Baseball Cap', '🧢', .3, .1, 'blob'], ['Graduation Cap', '🎓', .4, .3, 'flat'], ['Backpack', '🎒', .5, 1, 'box'],
  ['Briefcase', '💼', .6, 2, 'box'], ['Suitcase', '🧳', .3, 4, 'box'],
  // ---- home
  ['Bar of Soap', '🧼', 1.07, .12, 'box'], ['Sponge', '🧽', .1, .01, 'box'], ['Toilet Paper', '🧻', .3, .1, 'box'],
  ['Lotion Bottle', '🧴', .95, .3, 'box'], ['Plastic Bucket', '🪣', .95, 1, 'open'], ['Wicker Basket', '🧺', .5, .5, 'open'],
  ['Toothbrush', '🪥', .95, .02, 'long'], ['Straight Razor', '🪒', 3, .05, 'flat'], ['Mirror', '🪞', 2.5, 3, 'thin'],
  ['Spool of Thread', '🧵', 1.2, .03, 'blob'], ['Ball of Yarn', '🧶', .4, .1, 'ball'], ['Wooden Chair', '🪑', .6, 5, 'frame'],
  ['Bed', '🛏️', .4, 40, 'box'], ['Couch', '🛋️', .35, 50, 'box'], ['Wooden Door', '🚪', .65, 25, 'flat'],
  ['Toilet', '🚽', 2.4, 40, 'open'], ['Cast-Iron Bathtub', '🛁', 7.2, 120, 'open'], ['Wooden Coffin', '⚰️', .5, 40, 'box'],
  ['Funeral Urn', '⚱️', 2.4, 2, 'open'], ['Granite Headstone', '🪦', 2.7, 100, 'box'], ['Moai Statue', '🗿', 1.8, 12500, 'box'],
  ['Potted Plant', '🪴', 1.6, 3, 'box'], ['Clay Amphora', '🏺', 1.9, 4, 'open'], ['Cardboard Box', '📦', .2, 1, 'box'],
  ['Barrel of Oil', '🛢️', .93, 195, 'box'], ['Lifebuoy', '🛟', .15, 2, 'flat'], ['Wooden Sign', '🪧', .6, 1, 'flat'],
  ['Stop Sign', '🛑', 2.7, 3, 'thin'], ['Mouse Trap', '🪤', .6, .03, 'flat'],
  // ---- nature
  ['Pebble', '🪨', 2.65, .05, 'blob'], ['Rock', '🪨', 2.7, 2, 'blob'], ['Boulder', '🪨', 2.7, 500, 'blob'],
  ['Log', '🪵', .6, 20, 'long'], ['Feather', '🪶', .1, .0005, 'sheet'], ['Leaf', '🍃', .7, .001, 'sheet'],
  ['Maple Leaf', '🍁', .7, .002, 'sheet'], ['Pine Tree', '🌲', .6, 500, 'long'], ['Christmas Tree', '🎄', .6, 30, 'blob'],
  ['Cactus', '🌵', .9, 10, 'long'], ['Sunflower', '🌻', .5, .1, 'long'], ['Rose', '🌹', .6, .03, 'long'],
  ['Tulip', '🌷', .6, .03, 'long'], ['Lotus Flower', '🪷', .4, .1, 'flat'], ['Bouquet', '💐', .5, .5, 'blob'],
  ['Bamboo', '🎍', .4, 2, 'long'], ['Seashell', '🐚', 2.7, .1, 'open'], ['Dead Coral', '🪸', 1.8, 1, 'frame'],
  ['Snowman', '⛄', .5, 30, 'blob'], ["Bird's Nest", '🪹', .3, .1, 'open'],
  // ---- vehicles (sunken vehicles flood, so they fall as big hollow shells)
  ['Bicycle', '🚲', 1.8, 12, 'frame'], ['Kick Scooter', '🛴', 2.5, 5, 'frame'], ['Motor Scooter', '🛵', 3, 110, 'shell'],
  ['Motorcycle', '🏍️', 2.5, 200, 'frame'], ['Car', '🚗', 2.5, 1400, 'shell'], ['Taxi', '🚕', 2.5, 1500, 'shell'],
  ['Police Car', '🚓', 2.5, 1700, 'shell'], ['Pickup Truck', '🛻', 2.5, 2200, 'shell'], ['Ambulance', '🚑', 2.5, 3000, 'shell'],
  ['Minibus', '🚐', 2.5, 2500, 'shell'], ['Bus', '🚌', 3, 12000, 'shell'], ['Auto Rickshaw', '🛺', 2.5, 400, 'shell'],
  ['Car Tire', '🛞', 1.15, 9, 3], ['Airliner', '✈️', .4, 40000, 'long'], ['Small Plane', '🛩️', .4, 1000, 'long'],
  ['Speedboat', '🚤', .3, 1500, 'box'], ['Motor Yacht', '🛥️', .3, 8000, 'box'], ['Ferry', '⛴️', .3, 2e6, 'flat'],
  ['Sailboat', '⛵', .3, 2000, 'box'], ['Canoe', '🛶', .3, 30, 'long'], ['Cruise Ship', '🚢', .3, 1e8, 'flat'],
];
const MATS = [
  { n: 'Gold', d: 19.3, c: '#ffc531', l: .08 }, { n: 'Silver', d: 10.5, c: '#d9dee5', l: .2 }, { n: 'Copper', d: 8.96, c: '#c8693a' },
  { n: 'Iron', d: 7.87, c: '#8b97a5' }, { n: 'Lead', d: 11.34, c: '#5f6577', l: -.15 }, { n: 'Aluminum', d: 2.7, c: '#c3cad3', l: .15 },
  { n: 'Titanium', d: 4.51, c: '#9aa3ad' }, { n: 'Platinum', d: 21.45, c: '#e5e4e2', l: .2 }, { n: 'Osmium', d: 22.59, c: '#7084c2' },
  { n: 'Tungsten', d: 19.25, c: '#7d8590' }, { n: 'Glass', d: 2.5, c: '#8fe3ff', l: .25, a: .6 }, { n: 'Granite', d: 2.7, c: '#9a9a9a' },
  { n: 'Concrete', d: 2.4, c: '#a8a8a0' }, { n: 'Diamond', d: 3.51, c: '#d8fbff', l: .4, a: .85 }, { n: 'Ice', d: .917, c: '#bff3ff', l: .35, a: .8 },
  { n: 'Wooden', d: .6, c: '#a8743f' }, { n: 'Cork', d: .24, c: '#d1a370', l: .1 }, { n: 'Styrofoam', d: .05, c: '#ffffff', l: .5 },
  { n: 'Chocolate', d: 1.3, c: '#7a4426', l: -.2 }, { n: 'Wax', d: .9, c: '#fff3c4', l: .3 },
];
const ITEMS = ITEMS_RAW.map(([name, e, d, m, shape, c]) => ({ name, e, d, m, shape, c }));
// A material version only exists when it means something new.
const matOK = (b, mat) => !NO_MAT.has(b.shape) && b.m < 1000 && !b.name.includes(mat.n) && Math.abs(mat.d - b.d) / b.d > .05;

function makeVariant(b, mat) {
  const den = mat ? mat.d : b.d, mass = b.m * den / b.d;
  return { name: mat ? `${mat.n} ${b.name}` : b.name, base: b, mat, den, ...physics(den, mass, b.shape) };
}

if (typeof module !== 'undefined') module.exports = { ITEMS, MATS, SHAPES, MAXD, SINK_TIME, physics, makeVariant, matOK };
