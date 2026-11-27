// Economy + global game state. All tuning lives here.

export const ITEM_TYPES = {
  plastic: { name: 'Chai nhựa', value: 2500, weight: .36, bag: 'Nhựa' },
  can:     { name: 'Lon',       value: 3500, weight: .30, bag: 'Lon' },
  paper:   { name: 'Carton',    value: 3500, weight: .24, bag: 'Giấy' },
  metal:   { name: 'Sắt vụn',   value: 7000, weight: .10, bag: 'Sắt' },
};
export const SORT_ORDER = ['plastic', 'can', 'paper', 'metal'];

// Street item value multiplier per phase (a vựa gets better prices)
export const PHASE_ITEM_MUL = [0, 1, 2.5, 1];

export const PHASES = [
  null,
  { name: 'Gầm cầu', icon: '🏚️', buyer: 'chú Tư' },
  { name: 'Vựa ve chai nhỏ', icon: '🏪', buyer: 'đại lý ông Bảy' },
  { name: 'Vựa phế liệu lớn', icon: '🏭', buyer: 'nhà máy tái chế' },
];

// Tools: linear chain. rate = potential đ/s used for the "còn X năm" line.
export const TOOLS = [
  { id: 'hand',   name: 'Tay không',          icon: '✋', phase: 1, cost: 0,        cap: 4,  radius: 1.4, speed: 5.2,  rate: 700,     vehicle: null,     desc: 'Hai bàn tay trắng.' },
  { id: 'sack',   name: 'Bao tải',            icon: '🛍️', phase: 1, cost: 25000,    cap: 10, radius: 1.6, speed: 5.2,  rate: 1700,    vehicle: null,     desc: 'Mang được 10 món.' },
  { id: 'magnet', name: 'Que gắp + nam châm', icon: '🧲', phase: 1, cost: 80000,    cap: 14, radius: 3.4, speed: 5.6,  rate: 2700,    vehicle: null,     desc: 'Hút đồ từ xa, 14 món.' },
  { id: 'bike',   name: 'Xe đạp có giỏ',      icon: '🚲', phase: 2, cost: 0,        cap: 22, radius: 3.4, speed: 8.6,  rate: 7000,    vehicle: 'bike',   desc: 'Tặng kèm khi lên vựa nhỏ.' },
  { id: 'bagac',  name: 'Xe ba gác',          icon: '🛺', phase: 2, cost: 300000,   cap: 36, radius: 3.8, speed: 8.4,  rate: 13000,   vehicle: 'bagac',  desc: 'Thùng to, 36 món.' },
  { id: 'bagacm', name: 'Ba gác máy',         icon: '🏍️', phase: 3, cost: 30000000, cap: 60, radius: 4.6, speed: 13.5, rate: 40000,   vehicle: 'bagacm', desc: 'Chạy vèo vèo, 60 món.' },
];

// Extras: id -> def. max = how many times purchasable.
export const EXTRAS = [
  { id: 'tarp',  name: 'Tấm bạt che mưa', icon: '⛺', phase: 1, costs: [15000],               desc: 'Mưa không làm ướt carton.' },
  { id: 'loa',   name: 'Loa xịn',          icon: '📢', phase: 2, costs: [150000],              desc: 'Rao xa gấp đôi, khách ra nhanh hơn.' },
  { id: 'em',    name: 'Thuê thằng em',    icon: '🧒', phase: 2, costs: [120000, 6000000, 18000000], desc: 'Tự chạy đi nhặt ve chai giùm.' },
  { id: 'moi',   name: 'Thêm mối quen',    icon: '🤝', phase: 3, costs: [20000000, 60000000], desc: 'Các vựa nhỏ đổ hàng về kho nhanh hơn.' },
  { id: 'press', name: 'Máy ép kiện',      icon: '🗜️', phase: 3, costs: [45000000],           desc: 'Kiện chặt, mỗi kiện giá ×1,5.' },
  { id: 'truck', name: 'Xe tải lớn',        icon: '🚛', phase: 3, costs: [80000000],           desc: 'Thùng xe rộng hơn, chở nhiều hơn.' },
];

export const HOMES = [
  null,
  null,
  { phase: 2, name: 'Vựa ve chai nhỏ',  icon: '🏪', cost: 200000,     desc: 'Mở khóa xe đạp + loa rao. Dân trong xóm tự mang đồ ra bán.' },
  { phase: 3, name: 'Vựa phế liệu lớn', icon: '🏭', cost: 1500000,    desc: 'Thành đầu mối. Kho tự đầy, gọi xe tải bán cho nhà máy.' },
  { phase: 4, name: 'Xây biệt thự',     icon: '🏰', cost: 1000000000, desc: 'Cột La Mã, sư tử đá, cổng mạ vàng. Đích đến cuối cùng!' },
];
export const VILLA_COST = HOMES[4].cost;

// Phase 2: goods neighbours bring out (elec = can be stripped for copper at the vựa)
export const GOODS = [
  { name: 'Quạt máy hỏng',      icon: '🌀', kg: 3.5, value: 160000, slots: 3, elec: true },
  { name: 'Nồi cơm điện hư',    icon: '🍚', kg: 2.2, value: 130000, slots: 2, elec: true },
  { name: 'Chồng báo cũ',       icon: '📰', kg: 9,   value: 110000, slots: 3 },
  { name: 'Bao lon bia Tết',    icon: '🥫', kg: 4,   value: 190000, slots: 3 },
  { name: 'Cuộn dây điện đồng', icon: '🧶', kg: 1.6, value: 340000, slots: 2, elec: true },
  { name: 'Can nhựa, chai lọ',  icon: '🧴', kg: 3,   value: 90000,  slots: 2 },
  { name: 'Tivi đời cũ',        icon: '📺', kg: 12,  value: 260000, slots: 5, elec: true },
  { name: 'Xe đạp gãy',         icon: '🚲', kg: 11,  value: 220000, slots: 5 },
];

// Phase 3
export const P3 = {
  cellValue: 6000000,     // đ per truck cell at market x1 (tuned: ~3 trucks to the villa)
  baseStockRate: 1.4,     // cells / second
  moiRate: .9,
  emRate: .35,
  stockCap: 80,
  startStock: 30,         // the network you inherit, so the first truck is callable right away
  minTruck: 12,
  itemsPerCell: 5,        // street items -> 1 cell
};

// HUD joke: real seconds that count as one in-game year
export const SEC_PER_YEAR = 30400;

export const G = {
  started: false,
  paused: false,       // minigame / shop open
  cutscene: false,
  judge: false,
  phase: 1,
  money: 0,
  shownMoney: 0,
  toolIdx: 0,
  extras: {},          // id -> level
  cargo: [],           // [{type, value, wet, good?}]
  stock: 0,            // phase 3 cells
  loa: false,
  raining: false,
  collected: 0,
  clean: 0,
  playTime: 0,
  earned: 0,
  deals: 0,
  trucks: 0,
  market: 1,
  marketHist: [],
};

export function tool() { return TOOLS[G.toolIdx]; }
export function lvl(id) { return G.extras[id] || 0; }
export function capUsed() { return G.cargo.reduce((s, c) => s + (c.slots || 1), 0); }
export function incomeMul() { return G.judge ? 3 : 1; }

export function potentialRate() {
  const t = tool();
  let r = t.rate;
  if (lvl('tarp')) r *= 1.05;
  if (G.phase >= 2) {
    r += lvl('em') * 2600;
    if (lvl('loa')) r *= 1.3;
  }
  if (G.phase >= 3) {
    const cells = P3.baseStockRate + lvl('moi') * P3.moiRate + lvl('em') * P3.emRate;
    let v = cells * P3.cellValue * .55;
    if (lvl('press')) v *= 1.5;
    if (lvl('truck')) v *= 1.3;
    r += v;
  }
  return r * incomeMul();
}

export function resetState() {
  Object.assign(G, {
    phase: 1, money: 0, shownMoney: 0, toolIdx: 0, extras: {}, cargo: [], stock: 0, loa: false,
    raining: false, collected: 0, clean: 0, playTime: 0, earned: 0, deals: 0, trucks: 0, market: 1, marketHist: [],
    paused: false, cutscene: false,
  });
}
