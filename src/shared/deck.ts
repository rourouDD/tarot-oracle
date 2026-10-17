/**
 * 韦特塔罗 78 张牌完整牌库
 * 大阿卡纳 22 + 小阿卡纳 56（权杖/圣杯/宝剑/星币 × 14）
 */

export type TarotArcana = "major" | "minor";
export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";

export interface TarotCard {
  id: string;
  name: string;
  en: string;
  arcana: TarotArcana;
  suit?: TarotSuit;
  number: number;
  keywords: string[];
  upright: string;
  reversed: string;
  element?: string;
}

const MAJOR: Array<[string, string, string, string]> = [
  ["愚人", "The Fool", "新的开始、冒险、天真、无限可能", "鲁莽、逃避责任、方向不明、轻率"],
  ["魔术师", "The Magician", "行动力、资源整合、创造力、显化", "欺骗、能力闲置、操控、空谈"],
  ["女祭司", "The High Priestess", "直觉、潜意识、秘密、内在智慧", "忽视直觉、隐瞒、情绪压抑、表面化"],
  ["皇后", "The Empress", "丰盛、滋养、母性、感官享受", "过度依赖、创作停滞、控制欲、忽略自我"],
  ["皇帝", "The Emperor", "秩序、掌控、规则、稳定结构", "专断、僵化、权威冲突、失去掌控"],
  ["教皇", "The Hierophant", "传统、指引、信念体系、学习", "墨守成规、教条、反抗权威、迷茫信仰"],
  ["恋人", "The Lovers", "结合、选择、价值观一致、心意相通", "摇摆不定、价值冲突、诱惑、关系失衡"],
  ["战车", "The Chariot", "前进、意志、胜利、掌控方向", "失控、动力涣散、冲突、被推着走"],
  ["力量", "Strength", "温柔的坚持、勇气、自制、驯服本能", "自我怀疑、情绪失控、软弱、勉强硬撑"],
  ["隐士", "The Hermit", "独处、内省、寻找答案、沉淀", "孤立、逃避人群、固执、拒绝倾听"],
  ["命运之轮", "Wheel of Fortune", "转机、周期、顺势而为、命运推动", "阻滞、反复循环、抗拒变化、时机未到"],
  ["正义", "Justice", "公平、因果、权衡、真相", "失衡、逃避责任、偏见、赖账"],
  ["倒吊人", "The Hanged Man", "暂停、换位思考、牺牲、等待顿悟", "徒劳的等待、拖延、自我消耗、拒绝改变视角"],
  ["死神", "Death", "结束与重生、彻底告别、蜕变", "抗拒结束、拖着不放、停滞、恐惧改变"],
  ["节制", "Temperance", "平衡、调和、耐心、恰到好处", "失衡、过度、急躁、消耗失衡"],
  ["恶魔", "The Devil", "欲望、执念、束缚、成瘾", "挣脱束缚、看清真相、戒断、重获自由"],
  ["高塔", "The Tower", "突变、崩塌、真相暴露、摧毁重建", "躲过一劫、延迟的崩坏、内部动摇、不愿承认"],
  ["星星", "The Star", "希望、疗愈、指引、信心恢复", "失去信心、灰心、方向感缺失、疗愈受阻"],
  ["月亮", "The Moon", "迷雾、不安、潜意识、真假难辨", "真相浮现、焦虑减退、拨云见月、看清了"],
  ["太阳", "The Sun", "喜悦、成功、光明、坦荡", "延迟的喜悦、过度乐观、虚荣、焰火后的空"],
  ["审判", "Judgement", "觉醒、召唤、复盘、重生", "逃避审视、自我否定、错过召唤、旧账未清"],
  ["世界", "The World", "完成、圆满、整合、阶段性终点", "收尾未成、差一口气、停滞、循环未闭合"],
];

const SUITS: Array<{
  suit: TarotSuit;
  name: string;
  en: string;
  element: string;
  ranks: Array<[string, string, string, string]>;
}> = [
  {
    suit: "wands",
    name: "权杖",
    en: "Wands",
    element: "火",
    ranks: [
      ["王牌", "Ace of Wands", "灵感迸发、新行动、热情点火", "动力不足、计划落空、三分钟热度"],
      ["二", "Two of Wands", "规划、眺望远方、选择方向", "犹豫、原地打转、缺乏规划"],
      ["三", "Three of Wands", "展开、等待成果、视野拓宽", "延迟、格局受限、白等一场"],
      ["四", "Four of Wands", "庆祝、安定、归属、里程碑", "不安定、推迟庆祝、根基不稳"],
      ["五", "Five of Wands", "竞争、摩擦、各说各话", "内耗、回避冲突、无意义争吵"],
      ["六", "Six of Wands", "被看见、胜利、认可", "虚名、失落、认可延迟"],
      ["七", "Seven of Wands", "坚持立场、防守、顶住压力", "撑不住、放弃阵地、被动应付"],
      ["八", "Eight of Wands", "加速、消息传来、进展飞快", "延迟、沟通不畅、节奏散乱"],
      ["九", "Nine of Wands", "疲惫但没倒下、最后一程、戒备", "耗竭、戒备过头、想撂挑子"],
      ["十", "Ten of Wands", "负荷过重、扛太多、快到终点", "卸下包袱、超负荷崩溃、学会分派"],
      ["侍从", "Page of Wands", "好奇、尝试、热情的小火苗", "虎头蛇尾、浮躁、方向不明"],
      ["骑士", "Knight of Wands", "冲劲、出发、行动派", "莽撞、半途而废、冲动惹祸"],
      ["王后", "Queen of Wands", "自信、魅力、独当一面", "情绪化、患得患失、光芒被压"],
      ["国王", "King of Wands", "领导、远见、气魄", "独断、傲慢、画大饼"],
    ],
  },
  {
    suit: "cups",
    name: "圣杯",
    en: "Cups",
    element: "水",
    ranks: [
      ["王牌", "Ace of Cups", "心动、情感满溢、新的爱", "情感封闭、空虚、错过心意"],
      ["二", "Two of Cups", "互相喜欢、契合、连接", "错位、不平等、心不在一处"],
      ["三", "Three of Cups", "友谊、庆祝、有人一起", "圈子疏离、表面热闹、被排除"],
      ["四", "Four of Cups", "倦怠、没兴趣、视而不见", "重新留意、走出低谷、接受好意"],
      ["五", "Five of Cups", "失落、遗憾、看着打翻的杯子", "走出来、接受失去、重拾希望"],
      ["六", "Six of Cups", "怀旧、童年、纯粹的好意", "困在过去、回忆滤镜、旧人旧事"],
      ["七", "Seven of Cups", "选择太多、幻想、看花眼", "看清现实、果断取舍、幻想破灭"],
      ["八", "Eight of Cups", "离开、追寻更深的意义", "放不下、徘徊、回头"],
      ["九", "Nine of Cups", "满足、如愿、小确幸", "贪心、表面满足、心里空"],
      ["十", "Ten of Cups", "圆满、家人、归属感", "不和、理想落差、关系裂痕"],
      ["侍从", "Page of Cups", "天真、浪漫的讯息、灵感", "闹小情绪、幼稚、情感不成熟"],
      ["骑士", "Knight of Cups", "表白、追求、浪漫赴约", "口惠而实不至、情绪化、暧昧不清"],
      ["王后", "Queen of Cups", "温柔、共情、懂人心", "情绪淹没、过度付出、界限模糊"],
      ["国王", "King of Cups", "成熟的情感、包容、稳定", "情感压抑、表面平静、逃避表达"],
    ],
  },
  {
    suit: "swords",
    name: "宝剑",
    en: "Swords",
    element: "风",
    ranks: [
      ["王牌", "Ace of Swords", "清醒、真相、一剑见血", "误解、想太多、言语伤人"],
      ["二", "Two of Swords", "僵持、两难、拒绝看真相", "看清了、做出选择、打破僵局"],
      ["三", "Three of Swords", "心碎、扎心的真相、刺痛", "释怀、伤口结痂、慢慢放下"],
      ["四", "Four of Swords", "休息、暂停、养精蓄锐", "硬撑、睡不着、该歇没歇"],
      ["五", "Five of Swords", "冲突、输赢、代价", "和解、放下胜负、及时止损"],
      ["六", "Six of Swords", "过渡、驶离风暴、渐入平静", "卡在过渡、旧伤跟过来、迟迟不走"],
      ["七", "Seven of Swords", "策略、隐瞒、走捷径", "被拆穿、坦白、收手"],
      ["八", "Eight of Swords", "自我设限、看不到出路", "解开束缚、发现路还在"],
      ["九", "Nine of Swords", "焦虑、失眠、越想越怕", "天亮、焦虑缓解、说出来就好了"],
      ["十", "Ten of Swords", "谷底、彻底结束、无法再坏", "触底反弹、缓过来、重新开始"],
      ["侍从", "Page of Swords", "好奇、试探、讯息", "流言、口舌、话说太满"],
      ["骑士", "Knight of Swords", "直冲、快刀、不留情面", "鲁莽、话太冲、横冲直撞"],
      ["王后", "Queen of Swords", "清醒、界限、理性表达", "冷硬、刻薄、防备过深"],
      ["国王", "King of Swords", "理性、公正、权威判断", "冷酷、独断、只讲道理不讲人情"],
    ],
  },
  {
    suit: "pentacles",
    name: "星币",
    en: "Pentacles",
    element: "土",
    ranks: [
      ["王牌", "Ace of Pentacles", "机会落地、新的资源、实在的offer", "机会流失、钱没到位、心不落实"],
      ["二", "Two of Pentacles", "平衡多件事、灵活周转", "顾此失彼、手忙脚乱、失衡"],
      ["三", "Three of Pentacles", "协作、专业、被认可的手艺", "配合不顺、被轻视、返工"],
      ["四", "Four of Pentacles", "守成、抓着不放、安全感", "松手、过度守财、投资放开"],
      ["五", "Five of Pentacles", "匮乏、被冷落、缺支持", "转机、有人拉一把、缓过来"],
      ["六", "Six of Pentacles", "给予与接受、互相帮衬", "不对等、欠着人情、有借无还"],
      ["七", "Seven of Pentacles", "等待收获、长期投入、评估", "投入产出不成正比、白熬、改方向"],
      ["八", "Eight of Pentacles", "专注打磨、重复精进、勤勉", "敷衍、原地重复、技能停滞"],
      ["九", "Nine of Pentacles", "自给自足、享受成果、独立", "外表体面、内里不安、依赖"],
      ["十", "Ten of Pentacles", "长期稳定、家族、积累", "根基动摇、短视、家事纠纷"],
      ["侍从", "Page of Pentacles", "学习、起步、务实的小机会", "拖延、光想不做、基础不牢"],
      ["骑士", "Knight of Pentacles", "稳扎稳打、靠谱、按部就班", "拖沓、保守、死板"],
      ["王后", "Queen of Pentacles", "照顾、务实、会过日子", "忽略自己、过度操劳、务实变麻木"],
      ["国王", "King of Pentacles", "稳健、实力、掌控资源", "固执、唯利是图、掌控过度"],
    ],
  },
];

function buildDeck(): TarotCard[] {
  const cards: TarotCard[] = [];
  MAJOR.forEach((item, index) => {
    cards.push({
      id: `major-${index}`,
      name: item[0],
      en: item[1],
      arcana: "major",
      number: index,
      keywords: item[2].split("、"),
      upright: item[2],
      reversed: item[3],
    });
  });
  for (const suit of SUITS) {
    suit.ranks.forEach((rank, index) => {
      cards.push({
        id: `${suit.suit}-${index}`,
        name: `${suit.name}${rank[0]}`,
        en: rank[1],
        arcana: "minor",
        suit: suit.suit,
        element: suit.element,
        number: index + 1,
        keywords: rank[2].split("、"),
        upright: rank[2],
        reversed: rank[3],
      });
    });
  }
  return cards;
}

export const FULL_DECK: TarotCard[] = buildDeck();

export const SUIT_LABEL: Record<TarotSuit, string> = {
  wands: "权杖·火",
  cups: "圣杯·水",
  swords: "宝剑·风",
  pentacles: "星币·土",
};

export interface DrawnCard {
  card: TarotCard;
  reversed: boolean;
  position: string;
  meaning: string;
}

/** 洗牌 + 无放回抽取，支持指定是否逆位 */
export function drawCards(count: number, allowReversed: boolean, positions: string[], random?: () => number): DrawnCard[] {
  const rand = random ?? Math.random;
  const pool = shuffleDeck(rand);
  const total = Math.max(1, Math.min(count, pool.length, positions.length || count));
  const result: DrawnCard[] = [];
  for (let i = 0; i < total; i += 1) {
    const card = pool[i];
    const reversed = allowReversed ? rand() < 0.5 : false;
    result.push({
      card,
      reversed,
      position: positions[i] ?? `第 ${i + 1} 张`,
      meaning: reversed ? card.reversed : card.upright,
    });
  }
  return result;
}

/** 洗整副牌，返回打乱后的完整牌序（供交互抽牌用） */
export function shuffleDeck(random?: () => number): TarotCard[] {
  const rand = random ?? Math.random;
  const pool = FULL_DECK.slice();
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool;
}

/** 按 id 找牌 */
export function findCard(cardId: string): TarotCard | undefined {
  return FULL_DECK.find((item) => item.id === cardId);
}

/** 由牌 id + 正逆位构造一张已抽出的牌 */
export function makeDrawnCard(cardId: string, reversed: boolean, position: string): DrawnCard | null {
  const card = findCard(cardId);
  if (!card) {
    return null;
  }
  return {
    card,
    reversed,
    position,
    meaning: reversed ? card.reversed : card.upright,
  };
}
