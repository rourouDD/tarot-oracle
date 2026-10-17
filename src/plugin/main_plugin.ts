/** 主进程：跟踪活跃聊天视图、接收 UI 提交并发送给 AI */

import {
  HOOK_IDS,
  IPC_CHANNELS,
  RENDER_TAG,
  ROUTE_ID,
  SubmitReadingPayload,
  SubmitReadingResult,
  UI_MODULE_ID,
} from "../shared/constants.js";
import { buildReadingMessage, shuffleAndDraw } from "../shared/spreads.js";
import { onXmlRender } from "./xml_render.js";

interface TrackedChatView {
  viewId: string;
  chatId: string;
  runtime: string;
  updatedAt: number;
}

const LOG_TAG = "[tarot_oracle]";
const trackedViews: TrackedChatView[] = [];

function log(message: string, payload?: Record<string, unknown>): void {
  if (payload) {
    console.log(`${LOG_TAG} ${message} ${JSON.stringify(payload)}`);
    return;
  }
  console.log(`${LOG_TAG} ${message}`);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function upsertChatView(view: TrackedChatView): void {
  const index = trackedViews.findIndex((item) => item.viewId === view.viewId);
  if (index >= 0) {
    trackedViews[index] = view;
    return;
  }
  trackedViews.push(view);
}

function removeChatView(viewId: string): void {
  const index = trackedViews.findIndex((item) => item.viewId === viewId);
  if (index >= 0) {
    trackedViews.splice(index, 1);
  }
}

function latestChatView(): TrackedChatView | null {
  if (trackedViews.length === 0) {
    return null;
  }
  const sorted = trackedViews.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  return sorted[0] ?? null;
}

export async function onChatViewEvent(event: ToolPkg.ChatViewHookEvent): Promise<void> {
  try {
    const payload = event.eventPayload || {};
    const viewId = payload.viewId;
    const chatId = payload.chatId;
    const runtime = payload.runtime;
    if (!isNonEmptyString(viewId) || !isNonEmptyString(chatId)) {
      return;
    }
    if (event.eventName === "view_closed") {
      removeChatView(viewId);
      return;
    }
    upsertChatView({
      viewId,
      chatId,
      runtime: isNonEmptyString(runtime) ? runtime : "main",
      updatedAt: Date.now(),
    });
  } catch (error) {
    log("onChatViewEvent failed", { error: String(error) });
  }
}

async function resolveTargetChat(payload: SubmitReadingPayload): Promise<{ chatId?: string; runtime?: string }> {
  if (isNonEmptyString(payload.chatId)) {
    return { chatId: payload.chatId, runtime: payload.runtime };
  }
  const tracked = latestChatView();
  if (tracked) {
    return { chatId: tracked.chatId, runtime: tracked.runtime };
  }
  if (typeof getChatId === "function") {
    const chatId = getChatId();
    if (isNonEmptyString(chatId)) {
      return { chatId, runtime: payload.runtime };
    }
  }
  return { runtime: payload.runtime };
}

async function handleSubmitReading(payload: SubmitReadingPayload): Promise<SubmitReadingResult> {
  try {
    const question = typeof payload?.question === "string" ? payload.question : "";
    const allowReversed = payload?.allowReversed !== false;
    const result = shuffleAndDraw(question, payload?.spreadId, allowReversed);
    const message = buildReadingMessage(result);
    const target = await resolveTargetChat(payload);
    await Tools.Chat.sendMessage(
      message,
      target.chatId,
      undefined,
      undefined,
      target.runtime ? { runtime: target.runtime as "main" | "floating" } : undefined
    );
    log("submitReading sent", {
      question: question.slice(0, 40),
      spread: result.spread.id,
      cards: result.cards.map((item) => `${item.card.name}${item.reversed ? "逆" : "正"}`),
    });
    return {
      success: true,
      message: `已抽到 ${result.cards.length} 张牌，正在请求解读`,
    };
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    log("submitReading failed", { error: errorText });
    try {
      await Tools.System.toast(`塔罗问卜发送失败：${errorText}`);
    } catch {
      // ignore toast failure
    }
    return { success: false, error: errorText };
  }
}

export function registerToolPkg(): boolean {
  ToolPkg.registerChatViewHook({
    id: HOOK_IDS.chatView,
    function: onChatViewEvent as unknown as ToolPkg.HookHandler<ToolPkg.ChatViewHookEvent>,
  });
  ToolPkg.ipc.on<SubmitReadingPayload, SubmitReadingResult>(
    IPC_CHANNELS.submitReading,
    (payload) => handleSubmitReading(payload)
  );
  // 对话内交互抽牌：<tarot> 标签渲染成牌桌
  ToolPkg.registerXmlRenderPlugin({
    id: "tarot_oracle_render",
    tag: RENDER_TAG,
    function: onXmlRender as unknown as ToolPkg.XmlRenderHookHandler,
  });
  log("registered", { route: ROUTE_ID, ui: UI_MODULE_ID, tag: RENDER_TAG });
  return true;
}