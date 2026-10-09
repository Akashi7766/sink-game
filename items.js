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
// Pokémon: official Pokédex height (m) and weight (kg). Volume ≈ k·height³ with k from the body
// shape PokéAPI lists (Pokémon humanoids are stockier than a real person's k≈0.013), so
// density = weight / volume. Round ones PokéAPI calls "humanoid" (Snorlax, Golem…) use round shapes.
// The Pokédex makes most Pokémon very light for their size, so most of them float!
const POKE_SHAPE = { ball: [.4, 'ball'], squiggle: [.012, 'long'], fish: [.12, 'long'], arms: [.15, 'blob'], blob: [.25, 'blob'],
  upright: [.09, 'blob'], legs: [.1, 'blob'], quadruped: [.17, 'box'], wings: [.06, 'flat'], tentacles: [.12, 'blob'],
  heads: [.12, 'blob'], humanoid: [.03, 'long'], 'bug-wings': [.04, 'flat'], armor: [.2, 'box'] };
const poke = (name, e, h, w, body, tint) => { const [k, shape] = POKE_SHAPE[body]; return [name, e, w / (k * h ** 3 * 1000), w, shape, tint]; };

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
  // ---- animals (whole-body density incl. lungs/fat/feathers; most mammals float)
  ['Dog', '🐕', .95, 25, 'blob'], ['Cat', '🐈', .95, 4.5, 'blob'], ['Cow', '🐄', .95, 700, 'box'],
  ['Horse', '🐎', .95, 500, 'box'], ['Elephant', '🐘', .95, 5000, 'box'], ['Pig', '🐖', .95, 100, 'box'],
  ['Sheep', '🐑', .7, 70, 'blob'], ['Chicken', '🐔', .6, 2.5, 'blob'], ['Swan', '🦢', .6, 10, 'blob'],
  ['Flamingo', '🦩', .7, 3, 'long'], ['Polar Bear', '🐻‍❄️', .95, 450, 'blob'], ['Penguin', '🐧', .9, 5, 'blob'],
  ['Seal', '🦭', .97, 100, 'long'], ['Beaver', '🦫', .95, 20, 'blob'], ['Otter', '🦦', .9, 10, 'long'],
  ['Sloth', '🦥', .9, 5, 'blob'], ['Kangaroo', '🦘', .97, 60, 'blob'], ['Giraffe', '🦒', .95, 1200, 'long'],
  ['Camel', '🐫', .95, 500, 'box'], ['Zebra', '🦓', .95, 350, 'box'], ['Monkey', '🐒', .97, 8, 'blob'],
  ['Koala', '🐨', .95, 10, 'blob'], ['Panda', '🐼', .95, 100, 'blob'], ['Rabbit', '🐇', .9, 2, 'blob'],
  ['Mouse', '🐁', .95, .02, 'blob'], ['Hamster', '🐹', .95, .1, 'blob'], ['Frog', '🐸', .98, .05, 'blob'],
  ['Snake', '🐍', .98, 2, 'long'], ['Butterfly', '🦋', .3, .0005, 'sheet'], ['Honeybee', '🐝', .9, .0001, 'blob'],
  ['Ladybug', '🐞', .9, .00002, 'blob'], ['Spider', '🕷️', .9, .001, 'blob'], ['Ant', '🐜', .9, .000003, 'blob'],
  ['Lion', '🦁', .97, 190, 'box'], ['Tiger', '🐅', .97, 220, 'box'], ['Leopard', '🐆', .97, 60, 'long'],
  ['Wolf', '🐺', .95, 40, 'blob'], ['Fox', '🦊', .95, 6, 'blob'], ['Deer', '🦌', .95, 100, 'box'],
  ['Raccoon', '🦝', .95, 8, 'blob'], ['Hedgehog', '🦔', .9, .8, 'blob'], ['Skunk', '🦨', .95, 3, 'blob'],
  ['Llama', '🦙', .9, 150, 'box'], ['Goat', '🐐', .95, 60, 'box'], ['Bison', '🦬', .95, 900, 'box'],
  ['Woolly Mammoth', '🦣', .95, 6000, 'box'], ['T. rex', '🦖', .9, 8000, 'long'], ['Brachiosaurus', '🦕', .8, 40000, 'long'],
  ['Dodo', '🦤', .8, 12, 'blob'], ['Peacock', '🦚', .6, 5, 'blob'], ['Parrot', '🦜', .6, 1, 'blob'],
  ['Owl', '🦉', .5, 1.5, 'blob'], ['Eagle', '🦅', .6, 5, 'blob'], ['Bat', '🦇', .7, .03, 'flat'],
  ['Turkey', '🦃', .7, 9, 'blob'], ['Lizard', '🦎', .95, .1, 'long'], ['Cockroach', '🪳', .9, .001, 'blob'],
  // animals that really do sink
  ['Hippo', '🦛', 1.05, 1500, 'box'], ['Great White Shark', '🦈', 1.04, 1000, 'long'], ['Octopus', '🐙', 1.04, 3, 'blob'],
  ['Crab', '🦀', 1.2, .5, 'box'], ['Lobster', '🦞', 1.15, .7, 'long'], ['Shrimp', '🦐', 1.07, .01, 'long'],
  ['Oyster', '🦪', 1.8, .1, 'flat'], ['Snail', '🐌', 1.3, .01, 'blob'], ['Earthworm', '🪱', 1.05, .005, 'long'],
  // ---- Pokémon: all 151 Kanto Pokémon from the official Pokédex (via PokéAPI) — see poke() above
  poke('Bulbasaur', '🐸', 0.7, 6.9, 'quadruped', '#5cb85c'), poke('Ivysaur', '🐸', 1, 13, 'quadruped', '#5cb85c'), poke('Venusaur', '🐸', 2, 100, 'quadruped', '#5cb85c'),
  poke('Charmander', '🦎', 0.6, 8.5, 'upright', '#ff7a3d'), poke('Charmeleon', '🦎', 1.1, 19, 'upright', '#ff7a3d'), poke('Charizard', '🐉', 1.7, 90.5, 'upright', '#ff7a3d'),
  poke('Squirtle', '🐢', 0.5, 9, 'upright', '#4a90e2'), poke('Wartortle', '🐢', 1, 22.5, 'upright', '#4a90e2'), poke('Blastoise', '🐢', 1.6, 85.5, 'upright', '#4a90e2'),
  poke('Caterpie', '🐛', 0.3, 2.9, 'armor', '#a8b820'), poke('Metapod', '🐛', 0.7, 9.9, 'arms', '#a8b820'), poke('Butterfree', '🦋', 1.1, 32, 'bug-wings', '#a8b820'),
  poke('Weedle', '🐛', 0.3, 3.2, 'armor', '#a8b820'), poke('Kakuna', '🐛', 0.6, 10, 'arms', '#a8b820'), poke('Beedrill', '🐝', 1, 29.5, 'bug-wings', '#a8b820'),
  poke('Pidgey', '🐦', 0.3, 1.8, 'wings', '#b8834f'), poke('Pidgeotto', '🐦', 1.1, 30, 'wings', '#b8834f'), poke('Pidgeot', '🦅', 1.5, 39.5, 'wings', '#b8834f'),
  poke('Rattata', '🐀', 0.3, 3.5, 'quadruped', '#9a6fc0'), poke('Raticate', '🐀', 0.7, 18.5, 'quadruped', '#c8b88a'), poke('Spearow', '🐦', 0.3, 2, 'wings', '#a87b4a'),
  poke('Fearow', '🦅', 1.2, 38, 'wings', '#a87b4a'), poke('Ekans', '🐍', 2, 6.9, 'squiggle', '#a05cc8'), poke('Arbok', '🐍', 3.5, 65, 'squiggle', '#a05cc8'),
  poke('Pikachu', '🐭', 0.4, 6, 'quadruped', '#ffd43b'), poke('Raichu', '🐭', 0.8, 30, 'upright', '#ffd43b'), poke('Sandshrew', '🦔', 0.6, 12, 'upright', '#d4a95a'),
  poke('Sandslash', '🦔', 1, 29.5, 'upright', '#d4a95a'), poke('Nidoran♀', '🐇', 0.4, 7, 'quadruped', '#7fb0e0'), poke('Nidorina', '🐇', 0.8, 20, 'quadruped', '#7fb0e0'),
  poke('Nidoqueen', '🦏', 1.3, 60, 'upright', '#5b8def'), poke('Nidoran♂', '🐇', 0.5, 9, 'quadruped', '#a05cc8'), poke('Nidorino', '🦏', 0.9, 19.5, 'quadruped', '#a05cc8'),
  poke('Nidoking', '🦏', 1.4, 62, 'upright', '#a05cc8'), poke('Clefairy', '🧚', 0.6, 7.5, 'upright', '#ff9ecb'), poke('Clefable', '🧚', 1.3, 40, 'upright', '#ff9ecb'),
  poke('Vulpix', '🦊', 0.6, 9.9, 'quadruped', '#c8693a'), poke('Ninetales', '🦊', 1.1, 19.9, 'quadruped', '#f2e1a6'), poke('Jigglypuff', '⚪', 0.5, 5.5, 'ball', '#ff9ecb'),
  poke('Wigglytuff', '🐇', 1, 12, 'ball', '#ff9ecb'), poke('Zubat', '🦇', 0.8, 7.5, 'wings', '#5b8def'), poke('Golbat', '🦇', 1.6, 55, 'wings', '#5b8def'),
  poke('Oddish', '🌱', 0.5, 5.4, 'legs', '#5cb85c'), poke('Gloom', '🌺', 0.8, 8.6, 'humanoid', '#5cb85c'), poke('Vileplume', '🌺', 1.2, 18.6, 'humanoid', '#5cb85c'),
  poke('Paras', '🍄', 0.3, 5.4, 'armor', '#a8b820'), poke('Parasect', '🍄', 1, 29.5, 'armor', '#a8b820'), poke('Venonat', '🪲', 1, 30, 'blob', '#a8b820'),
  poke('Venomoth', '🦋', 1.5, 12.5, 'bug-wings', '#a8b820'), poke('Diglett', '🥔', 0.2, 0.8, 'blob', '#d4a95a'), poke('Dugtrio', '🥔', 0.7, 33.3, 'heads', '#d4a95a'),
  poke('Meowth', '🐈', 0.4, 4.2, 'quadruped', '#c8b88a'), poke('Persian', '🐈', 1, 32, 'quadruped', '#c8b88a'), poke('Psyduck', '🦆', 0.8, 19.6, 'upright', '#ffd43b'),
  poke('Golduck', '🦆', 1.7, 76.6, 'upright', '#4a90e2'), poke('Mankey', '🐒', 0.5, 28, 'ball', '#c0504d'), poke('Primeape', '🐒', 1, 32, 'upright', '#c0504d'),
  poke('Growlithe', '🐕', 0.7, 19, 'quadruped', '#ff7a3d'), poke('Arcanine', '🐕', 1.9, 155, 'quadruped', '#ff7a3d'), poke('Poliwag', '🐸', 0.6, 12.4, 'legs', '#4a90e2'),
  poke('Poliwhirl', '🐸', 1, 20, 'humanoid', '#4a90e2'), poke('Poliwrath', '🐸', 1.3, 54, 'humanoid', '#4a90e2'), poke('Abra', '🦊', 0.9, 19.5, 'upright', '#e8c34a'),
  poke('Kadabra', '🦊', 1.3, 56.5, 'upright', '#e8c34a'), poke('Alakazam', '🧙', 1.5, 48, 'humanoid', '#e8c34a'), poke('Machop', '💪', 0.8, 19.5, 'upright', '#8fa3c7'),
  poke('Machoke', '💪', 1.5, 70.5, 'humanoid', '#8fa3c7'), poke('Machamp', '💪', 1.6, 130, 'humanoid', '#8fa3c7'), poke('Bellsprout', '🌱', 0.7, 4, 'humanoid', '#5cb85c'),
  poke('Weepinbell', '🌱', 1, 6.4, 'blob', '#5cb85c'), poke('Victreebel', '🌱', 1.7, 15.5, 'blob', '#5cb85c'), poke('Tentacool', '🦑', 0.9, 45.5, 'tentacles', '#4a90e2'),
  poke('Tentacruel', '🦑', 1.6, 55, 'tentacles', '#4a90e2'), poke('Geodude', '🪨', 0.4, 20, 'arms', '#8d8378'), poke('Graveler', '🪨', 1, 105, 'blob', '#8d8378'),
  poke('Golem', '🪨', 1.4, 300, 'blob', '#8d8378'), poke('Ponyta', '🐎', 1, 30, 'quadruped', '#ff7a3d'), poke('Rapidash', '🐎', 1.7, 95, 'quadruped', '#ff7a3d'),
  poke('Slowpoke', '🦛', 1.2, 36, 'quadruped', '#ff9ecb'), poke('Slowbro', '🦛', 1.6, 78.5, 'upright', '#ff9ecb'), poke('Magnemite', '🧲', 0.3, 6, 'arms', '#ffd43b'),
  poke('Magneton', '🧲', 1, 60, 'heads', '#ffd43b'), poke('Farfetch’d', '🦆', 0.8, 15, 'wings', '#a87b4a'), poke('Doduo', '🐦', 1.4, 39.2, 'legs', '#a87b4a'),
  poke('Dodrio', '🐦', 1.8, 85.2, 'legs', '#a87b4a'), poke('Seel', '🦭', 1.1, 90, 'fish', '#e8f4ff'), poke('Dewgong', '🦭', 1.7, 120, 'fish', '#e8f4ff'),
  poke('Grimer', '💩', 0.9, 30, 'arms', '#a05cc8'), poke('Muk', '💩', 1.2, 30, 'arms', '#a05cc8'), poke('Shellder', '🐚', 0.3, 4, 'ball', '#8a6fd1'),
  poke('Cloyster', '🐚', 1.5, 132.5, 'ball', '#8a6fd1'), poke('Gastly', '👻', 1.3, 0.1, 'ball', '#705898'), poke('Haunter', '👻', 1.6, 0.1, 'arms', '#705898'),
  poke('Gengar', '👻', 1.5, 40.5, 'upright', '#705898'), poke('Onix', '🐍', 8.8, 210, 'squiggle', '#8d8d8d'), poke('Drowzee', '🐘', 1, 32.4, 'humanoid', '#ff6fa0'),
  poke('Hypno', '🐘', 1.6, 75.6, 'humanoid', '#ff6fa0'), poke('Krabby', '🦀', 0.4, 6.5, 'armor', '#e0533d'), poke('Kingler', '🦀', 1.3, 60, 'armor', '#e0533d'),
  poke('Voltorb', '🔴', 0.5, 10.4, 'ball', '#e53935'), poke('Electrode', '🔴', 1.2, 66.6, 'ball', '#e53935'), poke('Exeggcute', '🥚', 0.4, 2.5, 'heads', '#f5e6c8'),
  poke('Exeggutor', '🌴', 2, 120, 'legs', '#5cb85c'), poke('Cubone', '🦴', 0.4, 6.5, 'upright', '#b8834f'), poke('Marowak', '🦴', 1, 45, 'upright', '#b8834f'),
  poke('Hitmonlee', '🦵', 1.5, 49.8, 'humanoid', '#c0504d'), poke('Hitmonchan', '🥊', 1.4, 50.2, 'humanoid', '#c0504d'), poke('Lickitung', '👅', 1.2, 65.5, 'upright', '#ff9ecb'),
  poke('Koffing', '🟣', 0.6, 1, 'ball', '#a05cc8'), poke('Weezing', '🟣', 1.2, 9.5, 'heads', '#a05cc8'), poke('Rhyhorn', '🦏', 1, 115, 'quadruped', '#9a9a9a'),
  poke('Rhydon', '🦏', 1.9, 120, 'upright', '#9a9a9a'), poke('Chansey', '🥚', 1.1, 34.6, 'upright', '#ff9ecb'), poke('Tangela', '🧶', 1, 35, 'legs', '#3d6fd9'),
  poke('Kangaskhan', '🦘', 2.2, 80, 'upright', '#a87b4a'), poke('Horsea', '🐠', 0.4, 8, 'blob', '#4a90e2'), poke('Seadra', '🐠', 1.2, 25, 'blob', '#4a90e2'),
  poke('Goldeen', '🐟', 0.6, 15, 'fish', '#ff9a5c'), poke('Seaking', '🐟', 1.3, 39, 'fish', '#ff9a5c'), poke('Staryu', '⭐', 0.8, 34.5, 'blob', '#d4a95a'),
  poke('Starmie', '⭐', 1.1, 80, 'blob', '#8a6fd1'), poke('Mr. Mime', '🤡', 1.3, 54.5, 'humanoid', '#ff6fa0'), poke('Scyther', '🦗', 1.5, 56, 'bug-wings', '#a8b820'),
  poke('Jynx', '💃', 1.4, 40.6, 'humanoid', '#8fe3ff'), poke('Electabuzz', '🐅', 1.1, 30, 'upright', '#ffd43b'), poke('Magmar', '🦎', 1.3, 44.5, 'upright', '#ff7a3d'),
  poke('Pinsir', '🪲', 1.5, 55, 'humanoid', '#a8b820'), poke('Tauros', '🐂', 1.4, 88.4, 'quadruped', '#a87b4a'), poke('Magikarp', '🐟', 0.9, 10, 'fish', '#ff7043'),
  poke('Gyarados', '🐉', 6.5, 235, 'squiggle', '#4a90e2'), poke('Lapras', '🦕', 2.5, 220, 'fish', '#4a90e2'), poke('Ditto', '😊', 0.3, 4, 'ball', '#c6a1e0'),
  poke('Eevee', '🦊', 0.3, 6.5, 'quadruped', '#b8834f'), poke('Vaporeon', '🦊', 1, 29, 'quadruped', '#4a90e2'), poke('Jolteon', '🦊', 0.8, 24.5, 'quadruped', '#ffd43b'),
  poke('Flareon', '🦊', 0.9, 25, 'quadruped', '#ff7a3d'), poke('Porygon', '🔷', 0.8, 36.5, 'legs', '#ff6f8f'), poke('Omanyte', '🐚', 0.4, 7.5, 'tentacles', '#5bb8ff'),
  poke('Omastar', '🐚', 1, 35, 'tentacles', '#5bb8ff'), poke('Kabuto', '🦀', 0.5, 11.5, 'armor', '#a87b4a'), poke('Kabutops', '🦂', 1.3, 40.5, 'upright', '#b8a038'),
  poke('Aerodactyl', '🦇', 1.8, 59, 'wings', '#a8a0b8'), poke('Snorlax', '🐻', 2.1, 460, 'blob', '#2f7f8f'), poke('Articuno', '🦅', 1.7, 55.4, 'wings', '#8fe3ff'),
  poke('Zapdos', '🦅', 1.6, 52.6, 'wings', '#ffd43b'), poke('Moltres', '🦅', 2, 60, 'wings', '#ff7a3d'), poke('Dratini', '🐍', 1.8, 3.3, 'squiggle', '#5b8def'),
  poke('Dragonair', '🐍', 4, 16.5, 'squiggle', '#5b8def'), poke('Dragonite', '🐉', 2.2, 210, 'upright', '#ffb347'), poke('Mewtwo', '👽', 2, 122, 'upright', '#c9a7e8'),
  poke('Mew', '🐈', 0.4, 4, 'upright', '#ff9ecb'),
  // later-generation favourites (same method, hand-estimated volume)
  ['Aron', '🦏', 1.8, 60, 'blob', '#9aa3ad'], ['Cosmoem', '🌕', 1908, 999.9, 'ball', '#e8b84a'], ['Wailord', '🐋', .00125, 398, 'blob', '#3d7fd9'],
  ['Metagross', '🕷️', .3, 550, 'box', '#4a78b5'], ['Steelix', '🐍', .1, 400, 'long', '#9aa3ad'], ['Kyogre', '🐋', .033, 352, 'flat', '#1e5bb8'],
  ['Groudon', '🦖', .1, 950, 'blob', '#d84343'], ['Bronzor', '🛡️', 3.08, 60.5, 'flat', '#3d8a8a'], ['Klink', '⚙️', 2.1, 21, 'flat', '#cfd6de'],
  ['Beldum', '🔩', 2.5, 95.2, 'blob', '#4a78b5'],
  // movies, comics & games (canon sizes/weights where they exist)
  ['Mjölnir', '🔨', 6, 19.2, 'blob', '#c3cad3'], ["Captain America's Shield", '🛡️', 3, 5.4, 'thin', '#d84343'], ['The One Ring', '💍', 19.3, .008, 'frame', '#ffc531'],
  ['Excalibur', '🗡️', 7.8, 1.5, 'long'], ['Heart of Te Fiti', '🟢', 2.95, .1, 'blob'], ['Groot', '🌳', .6, 200, 'long'],
  ['The Hulk', '🦸', 1.7, 472, 'blob', '#4caf50'], ['Santa Claus', '🎅', .98, 130, 'blob'], ['Godzilla', '🦖', 1.47, 99634000, 'blob', '#4f7a4f'],
  ['King Kong', '🦍', .145, 158000, 'blob'], ['Jaws', '🦈', 1.04, 3000, 'long', '#7d8fa0'], ['R2-D2', '🤖', .18, 32, 'box', '#5b8def'],
  ['The Titanic', '🚢', 3, 52310000, 'shell', '#3a3f4b'], ['Minecraft Dirt Block', '🟫', 1.5, 1500, 'box'], ['Minecraft Diamond Block', '🟦', 3.51, 3510, 'box', '#7ff0ff'],
  ['Minecraft TNT Block', '🟥', 1.65, 1650, 'box'], ['Patrick Star', '⭐', 1.07, .5, 'flat', '#ff9ecb'], ['SpongeBob', '🧽', 1.1, .2, 'box', '#ffe14d'],
  ['Lightsaber (switched off)', '🔦', 3.1, 1, 'long', '#b0b8c4'],
  ['Optimus Prime', '🤖', .23, 4300, 'long', '#d84343'], ['Iron Man (suited up)', '🦾', 1.7, 179, 'long', '#c0392b'], ['Sonic the Hedgehog', '🦔', .39, 35, 'blob', '#3d6fd9'],
  ['Thanos', '🦸', 2.75, 447, 'long', '#8e6bbf'], ['The Thing', '🪨', 2.5, 227, 'blob', '#e07a3d'], ['Baymax', '🤖', .1, 35, 'blob', '#f4f6f8'],
  ['Hello Kitty', '🐱', .4, .6, 'blob', '#ffffff'],
];
const ITEMS = ITEMS_RAW.map(([name, e, d, m, shape, c]) => ({ name, e, d, m, shape, c }));
const makeVariant = b => ({ name: b.name, base: b, den: b.d, ...physics(b.d, b.m, b.shape) });

if (typeof module !== 'undefined') module.exports = { ITEMS, SHAPES, MAXD, SINK_TIME, physics, makeVariant };
