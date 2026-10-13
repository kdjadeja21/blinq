export interface Item {
  id: string;
  name: string;
  emoji: string;
  category: string;
  synonyms: string[];
}

type Row = [name: string, emoji: string, category: string, ...synonyms: string[]];

const ROWS: Row[] = [
  ["apple", "🍎", "grocery"],
  ["banana", "🍌", "grocery"],
  ["bread", "🍞", "grocery", "loaf"],
  ["cheese", "🧀", "grocery"],
  ["egg", "🥚", "grocery"],
  ["milk", "🥛", "grocery"],
  ["carrot", "🥕", "grocery"],
  ["tomato", "🍅", "grocery"],
  ["pineapple", "🍍", "grocery"],
  ["cherry", "🍒", "grocery", "cherries"],
  ["strawberry", "🍓", "grocery"],
  ["lemon", "🍋", "grocery"],
  ["avocado", "🥑", "grocery"],
  ["broccoli", "🥦", "grocery"],
  ["corn", "🌽", "grocery", "maize", "sweetcorn"],
  ["cookie", "🍪", "grocery", "biscuit"],
  ["cake", "🍰", "grocery", "cake slice"],
  ["donut", "🍩", "grocery", "doughnut"],
  ["pizza", "🍕", "grocery"],
  ["burger", "🍔", "grocery", "hamburger"],
  ["cola", "🥤", "grocery", "soda", "soft drink", "pop", "fizzy drink"],
  ["coffee", "☕", "kitchen", "cup of coffee", "hot drink"],
  ["teapot", "🫖", "kitchen", "kettle"],
  ["fork", "🍴", "kitchen"],
  ["knife", "🔪", "kitchen", "kitchen knife"],
  ["spoon", "🥄", "kitchen"],
  ["bowl", "🥣", "kitchen"],
  ["pan", "🍳", "kitchen", "frying pan", "skillet"],
  ["wine glass", "🍷", "kitchen", "wine", "glass of wine"],
  ["salt", "🧂", "kitchen", "salt shaker"],
  ["phone", "📱", "tech", "smartphone", "mobile", "mobile phone", "cell phone"],
  ["laptop", "💻", "tech", "computer", "notebook computer"],
  ["headphones", "🎧", "tech", "headset", "earphones"],
  ["camera", "📷", "tech"],
  ["keyboard", "⌨️", "tech"],
  ["mouse", "🖱️", "tech", "computer mouse"],
  ["battery", "🔋", "tech"],
  ["television", "📺", "tech", "tv", "telly"],
  ["radio", "📻", "tech"],
  ["lightbulb", "💡", "tech", "light bulb", "bulb"],
  ["watch", "⌚", "tech", "wristwatch", "smartwatch"],
  ["pen", "🖊️", "office", "ballpoint", "biro"],
  ["pencil", "✏️", "office"],
  ["book", "📖", "office", "open book"],
  ["notebook", "📓", "office", "journal", "diary"],
  ["scissors", "✂️", "office", "scissor"],
  ["paperclip", "📎", "office", "paper clip"],
  ["calculator", "🧮", "office", "abacus"],
  ["envelope", "✉️", "office", "mail", "letter"],
  ["pushpin", "📌", "office", "pin", "thumbtack", "drawing pin"],
  ["ruler", "📏", "office", "straight ruler"],
  ["key", "🔑", "home"],
  ["lock", "🔒", "home", "padlock"],
  ["umbrella", "☂️", "home", "brolly"],
  ["glasses", "👓", "home", "spectacles", "eyeglasses"],
  ["candle", "🕯️", "home"],
  ["clock", "⏰", "home", "alarm clock", "alarm"],
  ["bucket", "🪣", "home", "pail"],
  ["broom", "🧹", "home", "brush"],
  ["soap", "🧼", "home", "bar of soap"],
  ["toothbrush", "🪥", "home", "tooth brush"],
  ["guitar", "🎸", "vintage"],
  ["telephone", "☎️", "vintage", "landline", "old phone"],
  ["film reel", "🎞️", "vintage", "film"],
  ["trophy", "🏆", "vintage", "cup"],
  ["globe", "🌍", "vintage", "earth", "world"],
  ["dice", "🎲", "vintage", "die"],
  ["balloon", "🎈", "vintage"],
  ["gift", "🎁", "vintage", "present"],
  ["magnet", "🧲", "tech"],
  ["compass", "🧭", "vintage"],
];

export const ITEMS: Item[] = ROWS.map(([name, emoji, category, ...synonyms]) => ({
  id: name.replace(/\s+/g, "-"),
  name,
  emoji,
  category,
  synonyms,
}));

export const ITEMS_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

export const TRAINING_ITEM_IDS = ["apple", "banana", "coffee"];

const LOOKALIKE_GROUPS: string[][] = [
  ["banana", "lemon", "corn", "pineapple"],
  ["apple", "tomato", "cherry", "strawberry"],
  ["cake", "donut", "cookie", "bread"],
  ["pizza", "burger", "cheese"],
  ["cola", "coffee", "milk", "wine-glass"],
  ["fork", "knife", "spoon"],
  ["pen", "pencil", "ruler"],
  ["book", "notebook", "envelope"],
  ["scissors", "paperclip", "pushpin"],
  ["phone", "calculator", "radio", "television"],
  ["laptop", "keyboard", "camera"],
  ["mouse", "magnet", "battery"],
  ["key", "lock"],
  ["watch", "clock"],
  ["glasses", "headphones"],
  ["candle", "lightbulb"],
  ["bucket", "broom", "soap", "toothbrush"],
  ["globe", "compass"],
  ["trophy", "gift", "balloon"],
  ["bowl", "pan", "teapot"],
  ["avocado", "broccoli", "egg"],
];

export const LOOKALIKES = new Map<string, string[]>();
for (const group of LOOKALIKE_GROUPS) {
  for (const id of group) {
    LOOKALIKES.set(id, [...(LOOKALIKES.get(id) ?? []), ...group.filter((g) => g !== id)]);
  }
}
