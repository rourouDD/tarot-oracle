/** 牌阵定义与洗牌/解读文本构建 */

import { DrawnCard, SUIT_LABEL, drawCards } from "./deck.js";

export type SpreadId =
  | "single"
  | "three"
  | "career"
  | "love"
  | "decision"
  | "challenge"
  | "self"
  | "celtic";

export interface SpreadDef {
  id: SpreadId;
  name: string;
  desc: string;
  positions: string[];
}

export const SPREADS: SpreadDef[] = [
  {
    id: "single",
    name: "单张指引",
    desc: "一张牌，回答此刻最需要看见的事",
    positions: ["此刻的指引"],
  },
  {
    id: "three",
    name: "时间流三张",
    desc: "过去 · 现在 · 未来，看事态的走向",
    positions: ["过去 · 因", "现在 · 况", "未来 · 果"],
  },
  {
    id: "career",
    name: "选择十字",
    desc: "现状、阻碍、助力和建议，适合做决定",
    positions: ["现状", "阻碍", "助力", "建议"],
  },
  {
    id: "love",
    name: "关系五张",
    desc: "看两个人的位置、卡点与走向",
    positions: ["我的状态", "对方的状态", "关系现状", "隐藏的卡点", "可能走向"],
  },
  {
    id: "decision",
    name: "二选一",
    desc: "两条路各走一张，再看最终建议",
    positions: ["选择A · 发展", "选择A · 结果", "选择B · 发展", "选择B · 结果", "核心建议"],
  },
  {
    id: "challenge",
    name: "困境破解",
    desc: "卡在哪、为什么、怎么破",
    positions: ["困境本身", "深层原因", "你看不见的", "能借的力", "该走的一步"],
  },
  {
    id: "self",
    name: "自我照见",
    desc: "此刻的你，里里外外三层",
    positions: ["你展现的样子", "你藏起来的部分", "你真正想要的"],
  },
  {
    id: "celtic",
    name: "凯尔特十字",
    desc: "十张牌，最完整的一张全景图",
    positions: [
      "核心现状",
      "横在面前的",
      "意识层面",
      "潜意识",
      "过去的影响",
      "即将到来",
      "你自己的态度",
      "周围的环境",
      "希望与担忧",
      "最终结果",
    ],
  },
];

export function resolveSpread(id: string | undefined): SpreadDef {
  const found = SPREADS.find((item) => item.id === id);
  return found ?? SPREADS[1]!;
}

export interface OracleResult {
  question: string;
  spread: SpreadDef;
  cards: DrawnCard[];
  allowReversed: boolean;
}

export function shuffleAndDraw(
  question: string,
  spreadId: string | undefined,
  allowReversed: boolean,
  random?: () => number
): OracleResult {
  const spread = resolveSpread(spreadId);
  const cards = drawCards(spread.positions.length, allowReversed, spread.positions, random);
  return {
    question: question.trim(),
    spread,
    cards,
    allowReversed,
  };
}

function cardLine(item: DrawnCard, index: number): string {
  const { card, reversed, position } = item;
  const orientation = reversed ? "逆位" : "正位";
  const meta =
    card.arcana === "major"
      ? "大阿卡纳"
      : `${SUIT_LABEL[card.suit!]}花色`;
  return `${index + 1}. 【${position}】${card.name}（${card.en}）· ${orientation} · ${meta}\n   关键词：${card.keywords.join("、")}`;
}

/** 生成发给 AI 的解读请求 */
export function buildReadingMessage(result: OracleResult): string {
  const lines: string[] = [];
  lines.push("🔮 塔罗占卜结果");
  lines.push("");
  lines.push(`【问题】${result.question || "（未提问，请求整体指引）"}`);
  lines.push(`【牌阵】${result.spread.name}（${result.spread.desc}）`);
  lines.push("");
  lines.push("【抽到的牌】");
  result.cards.forEach((item, index) => lines.push(cardLine(item, index)));
  lines.push("");
  lines.push("——");
  lines.push("请帮我解读这次占卜。要求：");
  lines.push("1. 先逐张说明这张牌在此位置、此正逆位下的含义，扣着我的问题说，不要只背牌义。");
  lines.push("2. 再把几张牌串起来给出整体判断，指出牌与牌之间的呼应或矛盾。");
  lines.push("3. 最后给一条具体、能落地的建议或提醒。");
  lines.push("4. 语气自然、说人话，不要用宿命论吓人；把牌当作镜子，而不是判决书。");
  return lines.join("\n");
}

/** 简洁文本版（用于工具返回） */
export function buildReadingSummary(result: OracleResult): string {
  const cards = result.cards
    .map(
      (item) =>
        `${item.position}：${item.card.name}${item.reversed ? "（逆位）" : "（正位）"} — ${item.meaning}`
    )
    .join("\n");
  return `【问题】${result.question || "（无）"}\n【牌阵】${result.spread.name}\n${cards}`;
}