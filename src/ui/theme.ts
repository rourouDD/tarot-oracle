/** 塔罗面板配色：夜空紫底 + 浅色字 */

export const TAROT_THEME = {
  /** 面板整体：深紫夜空 */
  bg: "#1B1230",
  /** 卡片：略浅一层，带一点透明 */
  card: "#2A1C45",
  /** 背面的牌 */
  cardBack: "#3A2761",
  /** 已用掉的牌位 */
  cardUsed: "#221737",
  /** 主文字：暖白 */
  text: "#F2EAFB",
  /** 次文字：淡紫灰 */
  textDim: "#B9A8D6",
  /** 强调：淡金 */
  accent: "#E8C36B",
  /** 逆位：淡珊瑚红 */
  warn: "#F08A8A",
  /** 描边 */
  border: "#4A3575",
} as const;

/** 水晶球图标（纯文字，避免依赖图片资源） */
export const CRYSTAL_BALL = "🔮";
