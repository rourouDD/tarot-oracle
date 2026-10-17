/** 对话内交互抽牌面板：背面朝上摊牌，用户自己点选翻开 */

import type { ComposeDslContext, ComposeNode } from "../../../types/compose-dsl.js";
import { DrawnCard, TarotCard, findCard, makeDrawnCard, shuffleDeck } from "../shared/deck.js";
import { SpreadDef, buildReadingMessage, resolveSpread } from "../shared/spreads.js";
import { CRYSTAL_BALL, TAROT_THEME } from "./theme.js";

interface InlineData {
  sessionId: string;
  question: string;
  spreadId: string;
  allowReversed: boolean;
  /** 洗好的牌面 id 序列 */
  poolIds: string[];
  chatId: string;
}

interface PickedEntry {
  cardId: string;
  reversed: boolean;
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

/** 一张背面朝上的牌 */
function backCard(
  ctx: ComposeDslContext,
  index: number,
  disabled: boolean,
  onTap: () => void
): ComposeNode {
  return ctx.UI.Surface(
    {
      key: `tarot-back-${index}`,
      width: 42,
      height: 62,
      containerColor: disabled ? TAROT_THEME.cardUsed : TAROT_THEME.cardBack,
      shape: { cornerRadius: 8 },
      onClick: disabled ? undefined : onTap,
    },
    [
      ctx.UI.Column(
        {
          fillMaxWidth: true,
          fillMaxHeight: true,
          horizontalAlignment: "center",
          verticalArrangement: "center",
          spacing: 2,
        },
        [
          ctx.UI.Text({
            text: "✦",
            style: "bodyMedium",
            color: disabled ? TAROT_THEME.textDim : TAROT_THEME.accent,
          }),
        ]
      ),
    ]
  );
}

/** 一张已翻开的牌 */
function faceCard(ctx: ComposeDslContext, item: DrawnCard, index: number): ComposeNode {
  const suitColor = item.reversed ? TAROT_THEME.warn : TAROT_THEME.accent;
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
              text: `${index + 1}. ${item.position}`,
              style: "labelMedium",
              color: TAROT_THEME.accent,
              fontWeight: "bold",
            }),
            ctx.UI.Text({
              text: item.reversed ? "逆位" : "正位",
              style: "labelMedium",
              color: suitColor,
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
  const pickedRaw = useVal<string>(ctx, "picked", "[]");
  const submittedRaw = useVal<string>(ctx, "submitted", "");
  const sendingRaw = useVal<string>(ctx, "sending", "0");
  const errRaw = useVal<string>(ctx, "err", "");
  // 牌池单独放 state，重洗才能触发重绘
  const poolRaw = useVal<string>(ctx, "pool", "");

  if (!data) {
    return ctx.UI.Column({ fillMaxWidth: true, containerColor: TAROT_THEME.bg, padding: 16 }, [
      ctx.UI.Text({
        text: `${CRYSTAL_BALL} 牌桌没摆好，让我重新抽一次吧`,
        style: "bodyMedium",
        color: TAROT_THEME.warn,
      }),
    ]);
  }

  const spread: SpreadDef = resolveSpread(data.spreadId);
  const need = spread.positions.length;

  // 牌池优先取 state（重洗过就以 state 为准），否则用初始数据
  let rawPool: TarotCard[] = idsToCards(data.poolIds);
  if (poolRaw.v !== "") {
    try {
      const parsedIds = JSON.parse(poolRaw.v) as string[];
      if (Array.isArray(parsedIds) && parsedIds.length > 0) {
        rawPool = idsToCards(parsedIds);
      }
    } catch {
      rawPool = idsToCards(data.poolIds);
    }
  }
  // 保险：万一还原失败，现洗一副
  const pool: TarotCard[] = rawPool.length > 0 ? rawPool : shuffleDeck();

  let picked: PickedEntry[] = [];
  try {
    const parsed = JSON.parse(pickedRaw.v) as PickedEntry[];
    if (Array.isArray(parsed)) {
      picked = parsed;
    }
  } catch {
    picked = [];
  }
  const isSubmitted = submittedRaw.v === "1";
  const sending = sendingRaw.v === "1";
  const full = picked.length >= need;

  // 已翻开的牌按位置排好
  const drawnList: DrawnCard[] = [];
  for (let i = 0; i < picked.length && i < need; i += 1) {
    const entry = picked[i]!;
    const item = makeDrawnCard(entry.cardId, entry.reversed, spread.positions[i] ?? `第 ${i + 1} 张`);
    if (item) {
      drawnList.push(item);
    }
  }

  const pickCard = (poolIndex: number): void => {
    if (isSubmitted || sending || full) {
      return;
    }
    // 已经点过的不能重复点
    const cardId = pool[poolIndex]?.id;
    if (!cardId) {
      return;
    }
    if (picked.some((entry) => entry.cardId === cardId)) {
      return;
    }
    // 正逆位在翻开那一刻定，跟牌一样随机
    const reversed = data.allowReversed ? Math.random() < 0.5 : false;
    const next = picked.concat([{ cardId, reversed }]);
    pickedRaw.set(JSON.stringify(next));
  };

  const undoPick = (): void => {
    if (isSubmitted || sending || picked.length === 0) {
      return;
    }
    pickedRaw.set(JSON.stringify(picked.slice(0, -1)));
  };

  const reshuffle = (): void => {
    if (isSubmitted || sending) {
      return;
    }
    pickedRaw.set("[]");
    errRaw.set("");
    const copy = pool.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = tmp;
    }
    poolRaw.set(JSON.stringify(copy));
  };

  const sendReading = async (): Promise<void> => {
    if (sending || isSubmitted) {
      return;
    }
    if (!full) {
      errRaw.set(`还要再翻 ${need - picked.length} 张`);
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

  // 摊开的牌：每行 5 张
  const perRow = 6;
  const rows: ComposeNode[] = [];
  for (let start = 0; start < pool.length; start += perRow) {
    const slice = pool.slice(start, start + perRow);
    const cells: ComposeNode[] = slice.map((card, offset) => {
      const poolIndex = start + offset;
      const used = picked.some((entry) => entry.cardId === card.id);
      const onTap = (): void => pickCard(poolIndex);
      if (used) {
        return ctx.UI.Surface(
          {
            key: `tarot-used-${poolIndex}`,
            width: 42,
            height: 62,
            containerColor: TAROT_THEME.cardUsed,
            shape: { cornerRadius: 8 },
          },
          [
            ctx.UI.Column(
              {
                fillMaxWidth: true,
                fillMaxHeight: true,
                horizontalAlignment: "center",
                verticalArrangement: "center",
              },
              [
                ctx.UI.Text({
                  text: "已翻",
                  style: "labelSmall",
                  color: TAROT_THEME.textDim,
                }),
              ]
            ),
          ]
        );
      }
      return backCard(ctx, poolIndex, isSubmitted || sending || full, onTap);
    });
    rows.push(
      ctx.UI.Row({ fillMaxWidth: true, horizontalArrangement: "start", spacing: 4 }, cells)
    );
  }

  const hintText = isSubmitted
    ? "牌已经送出去了，等 TA 回你"
    : full
      ? "牌翻齐了，点下面的按钮发给我"
      : `自己点牌，翻开第 ${picked.length + 1} 张（共需 ${need} 张）`;

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
      style: "bodyMedium",
      color: full && !isSubmitted ? TAROT_THEME.accent : TAROT_THEME.textDim,
      fontWeight: full && !isSubmitted ? "semibold" : "normal",
    }),
    ...(drawnList.length > 0
      ? [ctx.UI.Column({ fillMaxWidth: true, spacing: 8 }, drawnList.map((item, i) => faceCard(ctx, item, i)))]
      : []),
    ctx.UI.Text({
      text: "牌都背面朝上，点你想翻的那张",
      style: "labelSmall",
      color: TAROT_THEME.textDim,
    }),
    ctx.UI.Column({ fillMaxWidth: true, spacing: 4 }, rows),
    errRaw.v !== ""
      ? ctx.UI.Text({ text: errRaw.v, style: "bodySmall", color: TAROT_THEME.warn })
      : null,
    ctx.UI.Row({ fillMaxWidth: true, spacing: 8 }, [
      ctx.UI.OutlinedButton(
        {
          key: "tarot-undo",
          weight: 1,
          enabled: !isSubmitted && !sending && picked.length > 0,
          shape: { cornerRadius: 12 },
          onClick: undoPick,
        },
        [
          ctx.UI.Text({
            text: "收回一张",
            style: "labelLarge",
            color: TAROT_THEME.textDim,
          }),
        ]
      ),
      ctx.UI.OutlinedButton(
        {
          key: "tarot-reshuffle",
          weight: 1,
          enabled: !isSubmitted && !sending,
          shape: { cornerRadius: 12 },
          onClick: reshuffle,
        },
        [
          ctx.UI.Text({
            text: "重洗",
            style: "labelLarge",
            color: TAROT_THEME.textDim,
          }),
        ]
      ),
    ]),
    ctx.UI.Button({
      key: "tarot-inline-send",
      text: isSubmitted ? "已发送 ✓" : sending ? "发送中…" : `${CRYSTAL_BALL} 发给 TA 解读`,
      enabled: !isSubmitted && !sending && full,
      fillMaxWidth: true,
      onClick: sendReading,
      shape: { cornerRadius: 12 },
    }),
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
