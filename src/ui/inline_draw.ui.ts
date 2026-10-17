/** 对话内塔罗牌桌：选牌阵 → 一键抽牌 → 发给我解读 */

import type { ComposeDslContext, ComposeNode } from "../../../types/compose-dsl.js";
import { FULL_DECK, DrawnCard, findCard, makeDrawnCard, TarotCard } from "../shared/deck.js";
import { SPREADS, SpreadDef, buildReadingMessage, resolveSpread } from "../shared/spreads.js";
import { CRYSTAL_BALL, TAROT_THEME } from "./theme.js";

interface InlineData {
  sessionId: string;
  question: string;
  spreadId: string;
  allowReversed: boolean;
  /** 洗好的牌面 id 序列（一次性抽牌用） */
  poolIds: string[];
  chatId: string;
}

function useVal<T>(ctx: ComposeDslContext, key: string, init: T): { v: T; set: (x: T) => void } {
  const pair = ctx.useState<T>(key, init);
  return { v: pair[0], set: pair[1] };
}

function readData(raw: string): InlineData | null {
  try {
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as InlineData;
    if (!parsed || !Array.isArray(parsed.poolIds) || parsed.poolIds.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 把 id 序列还原成牌对象（找不到的跳过） */
function idsToCards(ids: string[]): TarotCard[] {
  const cards: TarotCard[] = [];
  for (const id of ids) {
    const card = findCard(id);
    if (card) {
      cards.push(card);
    }
  }
  return cards;
}

/** 一张已抽出的牌 */
function faceCard(ctx: ComposeDslContext, item: DrawnCard, index: number): ComposeNode {
  return ctx.UI.Card(
    {
      key: `tarot-face-${index}`,
      fillMaxWidth: true,
      containerColor: TAROT_THEME.card,
      shape: { cornerRadius: 10 },
      elevation: 0,
      border: { width: 1, color: TAROT_THEME.border },
    },
    [
      ctx.UI.Column({ fillMaxWidth: true, padding: 12, spacing: 4 }, [
        ctx.UI.Row(
          { fillMaxWidth: true, horizontalArrangement: "spaceBetween", verticalAlignment: "center" },
          [
            ctx.UI.Text({
              text: `${CRYSTAL_BALL} ${item.position}`,
              style: "labelMedium",
              color: TAROT_THEME.accent,
              fontWeight: "bold",
            }),
            ctx.UI.Text({
              text: item.reversed ? "逆位" : "正位",
              style: "labelMedium",
              color: item.reversed ? TAROT_THEME.warn : TAROT_THEME.textDim,
              fontWeight: "semibold",
            }),
          ]
        ),
        ctx.UI.Text({
          text: `${item.card.name} · ${item.card.en}`,
          style: "titleSmall",
          color: TAROT_THEME.text,
          fontWeight: "bold",
        }),
      ]),
    ]
  );
}

export default function InlineDrawScreen(ctx: ComposeDslContext): ComposeNode {
  const dataRaw = useVal<string>(ctx, "_tarotData", "");
  const data = readData(dataRaw.v);
  const spreadRaw = useVal<string>(ctx, "spreadId", "");
  const drawnRaw = useVal<string>(ctx, "drawn", "[]");
  const submittedRaw = useVal<string>(ctx, "submitted", "");
  const sendingRaw = useVal<string>(ctx, "sending", "0");
  const errRaw = useVal<string>(ctx, "err", "");

  if (!data) {
    return ctx.UI.Column({ fillMaxWidth: true, containerColor: TAROT_THEME.bg, padding: 16 }, [
      ctx.UI.Text({
        text: `${CRYSTAL_BALL} 牌桌没摆好，让我重新抽一次吧`,
        style: "bodyMedium",
        color: TAROT_THEME.warn,
      }),
    ]);
  }

  // 牌阵优先取面板里选过的，否则用标签带来的默认
  const activeId = spreadRaw.v !== "" ? spreadRaw.v : data.spreadId;
  const spread: SpreadDef = resolveSpread(activeId);
  const need = spread.positions.length;

  const drawnList: DrawnCard[] = [];
  try {
    const parsed = JSON.parse(drawnRaw.v) as Array<{ cardId: string; reversed: boolean; position: string }>;
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        const item = makeDrawnCard(entry.cardId, entry.reversed, entry.position);
        if (item) {
          drawnList.push(item);
        }
      }
    }
  } catch {
    drawnList.length = 0;
  }
  const isSubmitted = submittedRaw.v === "1";
  const sending = sendingRaw.v === "1";
  const hasCards = drawnList.length > 0;

  /** 一键抽牌：从洗好的牌池里顺序取 need 张 */
  const drawAll = (): void => {
    if (sending || isSubmitted) {
      return;
    }
    errRaw.set("");
    let pool = idsToCards(data.poolIds);
    if (pool.length < need) {
      pool = FULL_DECK.slice();
      for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = pool[i]!;
        pool[i] = pool[j]!;
        pool[j] = tmp;
      }
    }
    const picks: Array<{ cardId: string; reversed: boolean; position: string }> = [];
    for (let i = 0; i < need; i += 1) {
      const card = pool[i]!;
      picks.push({
        cardId: card.id,
        reversed: data.allowReversed ? Math.random() < 0.5 : false,
        position: spread.positions[i] ?? `第 ${i + 1} 张`,
      });
    }
    drawnRaw.set(JSON.stringify(picks));
  };

  /** 换牌阵：清掉已抽的牌，强制重抽 */
  const switchSpread = (id: string): void => {
    if (sending || isSubmitted) {
      return;
    }
    spreadRaw.set(id);
    drawnRaw.set("[]");
    submittedRaw.set("");
    errRaw.set("");
  };

  const sendReading = async (): Promise<void> => {
    if (sending || isSubmitted) {
      return;
    }
    if (!hasCards) {
      errRaw.set("先抽牌");
      return;
    }
    sendingRaw.set("1");
    errRaw.set("");
    try {
      const message = buildReadingMessage({
        question: data.question,
        spread,
        cards: drawnList,
        allowReversed: data.allowReversed,
      });
      const chatApi = typeof Tools !== "undefined" && Tools && Tools.Chat ? Tools.Chat : null;
      if (!chatApi || typeof chatApi.sendMessage !== "function") {
        throw new Error("对话接口暂不可用");
      }
      await chatApi.sendMessage(message, data.chatId || undefined);
      submittedRaw.set("1");
      await ctx.showToast("牌已经送到对话框，等我解读");
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      errRaw.set(text);
    } finally {
      sendingRaw.set("0");
    }
  };

  // 牌阵按钮
  const spreadChips: ComposeNode[] = SPREADS.map((item) => {
    const selected = item.id === activeId;
    const label = `${item.name} · ${item.positions.length}`;
    const onClick = (): void => switchSpread(item.id);
    if (selected) {
      return ctx.UI.FilledTonalButton(
        {
          key: `tarot-spread-${item.id}`,
          fillMaxWidth: true,
          containerColor: TAROT_THEME.cardBack,
          contentColor: TAROT_THEME.accent,
          shape: { cornerRadius: 10 },
          contentPadding: { horizontal: 12, vertical: 8 },
          onClick,
        },
        [
          ctx.UI.Text({
            text: label,
            style: "labelMedium",
            color: TAROT_THEME.accent,
            fontWeight: "semibold",
          }),
        ]
      );
    }
    return ctx.UI.OutlinedButton(
      {
        key: `tarot-spread-${item.id}`,
        fillMaxWidth: true,
        shape: { cornerRadius: 10 },
        contentPadding: { horizontal: 12, vertical: 8 },
        onClick,
      },
      [
        ctx.UI.Text({
          text: label,
          style: "labelMedium",
          color: TAROT_THEME.textDim,
          fontWeight: "medium",
        }),
      ]
    );
  });

  const hintText = isSubmitted
    ? "牌已经送出去了，等我回你"
    : hasCards
      ? "牌抽好了，觉得对了就发给我"
      : `选个牌阵，点下面的按钮抽牌（${spread.name} · ${need} 张）`;

  const children: Array<ComposeNode | null> = [
    ctx.UI.Text({
      text: `${CRYSTAL_BALL} ${data.question || "一次没有问题的占卜"}`,
      style: "titleMedium",
      color: TAROT_THEME.text,
      fontWeight: "bold",
    }),
    ctx.UI.Text({
      text: `${spread.name} · ${spread.positions.join(" / ")}`,
      style: "bodySmall",
      color: TAROT_THEME.textDim,
    }),
    ctx.UI.Text({
      text: hintText,
      style: "bodySmall",
      color: hasCards && !isSubmitted ? TAROT_THEME.accent : TAROT_THEME.textDim,
      fontWeight: hasCards && !isSubmitted ? "semibold" : "normal",
    }),
    ...(drawnList.length > 0
      ? [ctx.UI.Column({ fillMaxWidth: true, spacing: 8 }, drawnList.map((item, i) => faceCard(ctx, item, i)))]
      : []),
    ctx.UI.Text({
      text: hasCards ? "换牌阵会清空已抽的牌" : "选牌阵",
      style: "labelSmall",
      color: TAROT_THEME.textDim,
    }),
    ctx.UI.Column({ fillMaxWidth: true, spacing: 6 }, spreadChips),
    errRaw.v !== ""
      ? ctx.UI.Text({ text: errRaw.v, style: "bodySmall", color: TAROT_THEME.warn })
      : null,
    ctx.UI.Button({
      key: "tarot-inline-draw",
      text: hasCards ? "重抽" : "抽牌",
      enabled: !isSubmitted && !sending,
      fillMaxWidth: true,
      onClick: drawAll,
      shape: { cornerRadius: 12 },
    }),
    hasCards
      ? ctx.UI.Button({
          key: "tarot-inline-send",
          text: isSubmitted ? "已发送 ✓" : sending ? "发送中…" : `${CRYSTAL_BALL} 发给 TA 解读`,
          enabled: !isSubmitted && !sending,
          fillMaxWidth: true,
          onClick: sendReading,
          shape: { cornerRadius: 12 },
        })
      : null,
  ];

  return ctx.UI.Column(
    {
      fillMaxWidth: true,
      containerColor: TAROT_THEME.bg,
      padding: { horizontal: 14, vertical: 12 },
      spacing: 10,
    },
    children.filter((item): item is ComposeNode => item !== null && item !== undefined)
  );
}