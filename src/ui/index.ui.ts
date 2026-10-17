/** 塔罗占卜面板 UI（Compose DSL） */

import type { ComposeDslContext, ComposeNode } from "../../../types/compose-dsl.js";
import { IPC_CHANNELS, SubmitReadingResult } from "../shared/constants.js";
import { DrawnCard, FULL_DECK, drawCards } from "../shared/deck.js";
import { SPREADS, SpreadDef, buildReadingMessage, resolveSpread, shuffleAndDraw } from "../shared/spreads.js";
import { CRYSTAL_BALL, TAROT_THEME } from "./theme.js";

/** 直接兜底发送：IPC 不可用时由 UI 自己抽牌并调用 Chat.sendMessage */
async function sendDirectly(
  question: string,
  spreadId: string,
  allowReversed: boolean,
  overrideChatId?: string
): Promise<string> {
  const result = shuffleAndDraw(question, spreadId, allowReversed);
  const message = buildReadingMessage(result);
  const chatApi = typeof Tools !== "undefined" && Tools && Tools.Chat ? Tools.Chat : null;
  if (!chatApi || typeof chatApi.sendMessage !== "function") {
    throw new Error("Chat 接口暂不可用");
  }
  let chatId: string | undefined;
  if (overrideChatId && overrideChatId.trim() !== "") {
    // 用户手填的对话 ID 优先
    chatId = overrideChatId.trim();
  } else {
    try {
      if (typeof getChatId === "function") {
        const id = getChatId();
        if (typeof id === "string" && id.trim() !== "") {
          chatId = id;
        }
      }
    } catch {
      chatId = undefined;
    }
  }
  // 注意：sendMessage 会一直等到 AI 把整轮回复生成完才返回。
  // 在面板里干等会让按钮永远停在“发送中…”，所以这里不 await 结果，
  // 只负责把消息投递出去，失败通过 catch 上报。
  const pending = chatApi.sendMessage(message, chatId, undefined, undefined, {
    runtime: "main",
    notify_reply: true,
    timeout_ms: 120000,
  });
  if (pending && typeof pending.then === "function") {
    pending.then(
      () => {
        /* 正常完成，无需处理 */
      },
      (err: unknown) => {
        console.log(`[tarot_oracle] send settled with error: ${String(err)}`);
      }
    );
  }
  return `已抽到 ${result.cards.length} 张牌，已投递`;
}

function useStateValue<T>(
  ctx: ComposeDslContext,
  key: string,
  initialValue: T
): { value: T; set: (value: T) => void } {
  const pair = ctx.useState<T>(key, initialValue);
  return { value: pair[0], set: pair[1] };
}

function cardNode(ctx: ComposeDslContext, item: DrawnCard, index: number): ComposeNode {
  const reversedTag = item.reversed ? "逆位" : "正位";
  return ctx.UI.Card(
    {
      key: `tarot-card-${index}`,
      fillMaxWidth: true,
      containerColor: TAROT_THEME.card,
      shape: { cornerRadius: 12 },
      elevation: 0,
      border: { width: 1, color: TAROT_THEME.border },
    },
    [
      ctx.UI.Column({ fillMaxWidth: true, padding: 14, spacing: 8 }, [
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
              text: reversedTag,
              style: "labelMedium",
              color: item.reversed ? TAROT_THEME.warn : TAROT_THEME.textDim,
              fontWeight: "semibold",
            }),
          ]
        ),
        ctx.UI.Text({
          text: `${item.card.name} · ${item.card.en}`,
          style: "titleMedium",
          color: TAROT_THEME.text,
          fontWeight: "bold",
        }),
      ]),
    ]
  );
}

export default function Screen(ctx: ComposeDslContext): ComposeNode {
  const allowReversedState = useStateValue<boolean>(ctx, "allowReversed", true);
  const spreadState = useStateValue<string>(ctx, "spreadId", "three");
  const questionState = useStateValue<string>(ctx, "question", "");
  // 目标对话 ID：留空则发到当前活跃对话
  const chatIdState = useStateValue<string>(ctx, "targetChatId", "");
  const cardsState = useStateValue<DrawnCard[]>(ctx, "cards", []);
  const drawingState = useStateValue<boolean>(ctx, "drawing", false);
  const submittingState = useStateValue<boolean>(ctx, "submitting", false);
  const sentState = useStateValue<boolean>(ctx, "sent", false);
  const errorState = useStateValue<string>(ctx, "error", "");

  const currentSpread: SpreadDef = resolveSpread(spreadState.value);

  const handleDraw = async (): Promise<void> => {
    if (drawingState.value || submittingState.value) {
      return;
    }
    errorState.set("");
    drawingState.set(true);
    cardsState.set([]);
    sentState.set(false);
    // 洗牌动效：先停一下再翻牌
    for (let step = 0; step < 3; step += 1) {
      await new Promise((resolve) => setTimeout(resolve, 260));
    }
    const drawn = drawCards(
      currentSpread.positions.length,
      allowReversedState.value,
      currentSpread.positions
    );
    cardsState.set(drawn);
    drawingState.set(false);
  };

  const handleSend = async (): Promise<void> => {
    if (submittingState.value || sentState.value) {
      return;
    }
    if (cardsState.value.length === 0) {
      errorState.set("先抽牌再发给我");
      return;
    }
    submittingState.set(true);
    errorState.set("");
    try {
      let handled = false;
      let message = "";
      const manualChatId = chatIdState.value.trim();

      // 手填了对话 ID 就跳过 IPC，直接发（工具箱面板里没有 IPC 响应方，走 IPC 会卡住）
      if (manualChatId === "") {
        try {
          // IPC 在工具箱面板里可能没有响应方，加个超时兜底，避免永久挂起
          const ipcCall = ToolPkg.ipc.call<
            { question: string; spreadId: string; allowReversed: boolean },
            SubmitReadingResult
          >(IPC_CHANNELS.submitReading, {
            question: questionState.value,
            spreadId: spreadState.value,
            allowReversed: allowReversedState.value,
          });
          const timeout = new Promise<SubmitReadingResult>((resolve) => {
            setTimeout(() => {
              resolve({ success: false, error: "ipc timeout" });
            }, 1500);
          });
          const result = await Promise.race([ipcCall, timeout]);
          if (result && result.success) {
            handled = true;
            message = result.message || "已发送，等我解读";
          } else if (result && result.error) {
            throw new Error(result.error);
          }
        } catch (ipcError) {
          console.log(`[tarot_oracle] ipc failed, fallback to direct send: ${String(ipcError)}`);
        }
      }

      if (!handled) {
        // sendDirectly 已经改成投递后立即返回，不会阻塞按钮
        message = await sendDirectly(
          questionState.value,
          spreadState.value,
          allowReversedState.value,
          manualChatId
        );
      }
      sentState.set(true);
      await ctx.showToast(message);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      errorState.set(text);
      await ctx.showToast(`发送失败：${text}`);
    } finally {
      submittingState.set(false);
    }
  };

  const handleReset = (): void => {
    cardsState.set([]);
    sentState.set(false);
    errorState.set("");
    drawingState.set(false);
    submittingState.set(false);
  };

  const spreadChips: ComposeNode[] = SPREADS.map((spread) => {
    const selected = spread.id === spreadState.value;
    const label = `${spread.name} · ${spread.positions.length}张`;
    const onClick = (): void => {
      spreadState.set(spread.id);
      cardsState.set([]);
      sentState.set(false);
      errorState.set("");
    };
    if (selected) {
      return ctx.UI.FilledTonalButton(
        {
          key: `tarot-spread-${spread.id}`,
          fillMaxWidth: true,
          containerColor: TAROT_THEME.cardBack,
          contentColor: TAROT_THEME.accent,
          shape: { cornerRadius: 12 },
          contentPadding: { horizontal: 14, vertical: 10 },
          onClick,
        },
        [
          ctx.UI.Text({
            text: label,
            style: "labelLarge",
            color: TAROT_THEME.accent,
            fontWeight: "semibold",
          }),
        ]
      );
    }
    return ctx.UI.OutlinedButton(
      {
        key: `tarot-spread-${spread.id}`,
        fillMaxWidth: true,
        shape: { cornerRadius: 12 },
        contentPadding: { horizontal: 14, vertical: 10 },
        onClick,
      },
      [
        ctx.UI.Text({
          text: label,
          style: "labelLarge",
          color: TAROT_THEME.textDim,
          fontWeight: "medium",
        }),
      ]
    );
  });

  const drawnCards = cardsState.value;
  const cardList: ComposeNode[] = drawnCards.map((item, index) => cardNode(ctx, item, index));

  let placeholder: ComposeNode | null = null;
  if (drawingState.value) {
    placeholder = ctx.UI.Card(
      {
        key: "tarot-drawing",
        fillMaxWidth: true,
        containerColor: TAROT_THEME.card,
        shape: { cornerRadius: 12 },
        elevation: 0,
        border: { width: 1, color: TAROT_THEME.border },
      },
      [
        ctx.UI.Column({ fillMaxWidth: true, padding: 20, spacing: 10 }, [
          ctx.UI.Text({
            text: `${CRYSTAL_BALL} 洗牌中 …`,
            style: "titleSmall",
            color: TAROT_THEME.accent,
            fontWeight: "semibold",
          }),
          ctx.UI.Text({
            text: "把问题放在心里，牌会自己找过来",
            style: "bodySmall",
            color: TAROT_THEME.textDim,
          }),
          ctx.UI.LinearProgressIndicator({ progress: 0.6, fillMaxWidth: true }),
        ]),
      ]
    );
  } else if (drawnCards.length === 0) {
    placeholder = ctx.UI.Card(
      {
        key: "tarot-idle",
        fillMaxWidth: true,
        containerColor: TAROT_THEME.card,
        shape: { cornerRadius: 12 },
        elevation: 0,
        border: { width: 1, color: TAROT_THEME.border },
      },
      [
        ctx.UI.Column({ fillMaxWidth: true, padding: 20, spacing: 8 }, [
          ctx.UI.Text({
            text: `${CRYSTAL_BALL} ${FULL_DECK.length} 张韦特塔罗已经摆好`,
            style: "bodyMedium",
            color: TAROT_THEME.text,
          }),
          ctx.UI.Text({
            text: `${currentSpread.name}：${currentSpread.desc}`,
            style: "bodySmall",
            color: TAROT_THEME.textDim,
          }),
        ]),
      ]
    );
  }

  const sendButtonLabel = sentState.value
    ? "已发送 ✓"
    : submittingState.value
      ? "发送中…"
      : "发给 TA 解读";

  const children: Array<ComposeNode | null> = [
    ctx.UI.Text({
      text: `${CRYSTAL_BALL} 塔罗问卜`,
      style: "headlineSmall",
      color: TAROT_THEME.text,
      fontWeight: "bold",
    }),
    ctx.UI.Text({
      text: "把想问的事写下来，抽牌，然后把牌面交给 TA。",
      style: "bodySmall",
      color: TAROT_THEME.textDim,
    }),
    ctx.UI.TextField({
      key: "tarot-question-input",
      fillMaxWidth: true,
      label: "你想问什么",
      placeholder: "例如：我和他这段关系接下来会怎么走？",
      value: questionState.value,
      onValueChange: (value: string) => {
        questionState.set(value);
        if (errorState.value !== "") {
          errorState.set("");
        }
      },
      singleLine: false,
      minLines: 2,
      maxLines: 4,
    }),
    ctx.UI.TextField({
      key: "tarot-chatid-input",
      fillMaxWidth: true,
      label: "发到哪个对话（可选）",
      placeholder: "粘贴对话 ID，留空 = 当前对话",
      value: chatIdState.value,
      onValueChange: (value: string) => {
        chatIdState.set(value);
      },
      singleLine: true,
    }),
    ctx.UI.Text({
      text: "选牌阵",
      style: "labelLarge",
      color: TAROT_THEME.textDim,
      fontWeight: "semibold",
    }),
    ctx.UI.Column(
      {
        fillMaxWidth: true,
        spacing: 8,
      },
      spreadChips
    ),
    ctx.UI.Row(
      { fillMaxWidth: true, horizontalArrangement: "spaceBetween", verticalAlignment: "center" },
      [
        ctx.UI.Text({
          text: "允许逆位",
          style: "bodyMedium",
          color: TAROT_THEME.text,
        }),
        ctx.UI.Switch({
          key: "tarot-reversed-switch",
          checked: allowReversedState.value,
          onCheckedChange: (checked: boolean) => {
            allowReversedState.set(checked);
          },
        }),
      ]
    ),
    ctx.UI.Row({ fillMaxWidth: true, spacing: 10 }, [
      ctx.UI.Button({
        key: "tarot-draw-button",
        text: drawingState.value ? "抽牌中…" : "抽牌",
        enabled: !drawingState.value && !submittingState.value,
        fillMaxWidth: true,
        weight: 1,
        onClick: handleDraw,
        shape: { cornerRadius: 12 },
      }),
      ctx.UI.OutlinedButton(
        {
          key: "tarot-reset-button",
          weight: 1,
          shape: { cornerRadius: 12 },
          onClick: handleReset,
        },
        [
          ctx.UI.Text({
            text: "重来",
            style: "labelLarge",
            color: TAROT_THEME.textDim,
            fontWeight: "medium",
          }),
        ]
      ),
    ]),
    errorState.value !== ""
      ? ctx.UI.Text({
          text: errorState.value,
          style: "bodySmall",
          color: "error",
        })
      : null,
    placeholder,
    ...cardList,
    drawnCards.length > 0
      ? ctx.UI.Button({
          key: "tarot-send-button",
          text: sendButtonLabel,
          enabled: !submittingState.value && !sentState.value,
          fillMaxWidth: true,
          onClick: handleSend,
          shape: { cornerRadius: 12 },
        })
      : null,
  ];

  // 顶层用 LazyColumn 包一层，内容多了可以上下滚动，发牌按钮不会被挤出屏幕
  return ctx.UI.LazyColumn(
    {
      fillMaxWidth: true,
      fillMaxHeight: true,
      containerColor: TAROT_THEME.bg,
      padding: { horizontal: 16, vertical: 14 },
      spacing: 14,
    },
    children.filter((item): item is ComposeNode => item !== null && item !== undefined)
  );
}