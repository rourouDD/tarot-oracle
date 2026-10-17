/** <tarot> 标签渲染：在对话消息里摊开一副牌，让用户自己抽 */
import inlineDrawScreen from "../ui/inline_draw.ui.js";
import { RENDER_TAG } from "../shared/constants.js";
import { shuffleDeck } from "../shared/deck.js";
import { resolveSpread } from "../shared/spreads.js";

function parseAttrs(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w-]+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrStr)) !== null) {
    attrs[m[1]!] = m[2]!;
  }
  const re2 = /([\w-]+)\s*=\s*'([^']*)'/g;
  while ((m = re2.exec(attrStr)) !== null) {
    attrs[m[1]!] = m[2]!;
  }
  return attrs;
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return "t" + (hash >>> 0).toString(36);
}

export function onXmlRender(event: unknown): unknown {
  try {
    const evt = event as { eventPayload?: Record<string, unknown> } | null;
    const payload = (evt && evt.eventPayload) || {};
    const tagName = String(payload.tagName || "");
    if (tagName !== RENDER_TAG) {
      return { handled: false };
    }
    const xmlContent = String(payload.xmlContent || "");
    // 属性写法：<tarot question="..." spread="three" reversed="true"/>
    const attrs: Record<string, string> = {};
    const outer = xmlContent.match(/<tarot\s+([^>]*)>/i);
    if (outer && outer[1]) {
      Object.assign(attrs, parseAttrs(outer[1]));
    }
    // 内部 JSON：<tarot>{"question":"...","spread":"three"}</tarot>
    let inner: Record<string, unknown> = {};
    const innerMatch = xmlContent.match(/<tarot[^>]*>([\s\S]*?)<\/tarot>/i);
    if (innerMatch && innerMatch[1]) {
      const text = innerMatch[1].trim();
      if (text.startsWith("{")) {
        try {
          const parsed = JSON.parse(text) as Record<string, unknown>;
          if (parsed && typeof parsed === "object") {
            inner = parsed;
          }
        } catch {
          // 忽略
        }
      }
    }

    const question = String(inner.question ?? attrs.question ?? "").trim();
    const spread = resolveSpread(String(inner.spread ?? attrs.spread ?? "three"));
    const reversedRaw = String(inner.reversed ?? attrs.reversed ?? "true").toLowerCase();
    const allowReversed = !(reversedRaw === "false" || reversedRaw === "0" || reversedRaw === "no");

    // 洗整副牌，只保留 id 序列，UI 端用牌库还原，避免 state 过大
    const poolIds = shuffleDeck().map((card) => card.id);
    const sessionId = simpleHash(`${Date.now()}_${Math.random()}_${question}`);
    let chatId = "";
    try {
      if (typeof getChatId === "function") {
        chatId = String(getChatId() || "");
      }
    } catch {
      chatId = "";
    }

    const dataForUi = {
      sessionId,
      question,
      spreadId: spread.id,
      allowReversed,
      poolIds,
      chatId,
    };
    const dataJson = JSON.stringify(dataForUi);

    return {
      handled: true,
      composeDsl: {
        screen: inlineDrawScreen,
        state: {
          _tarotData: dataJson,
          picked: "[]",
          pool: "",
          submitted: "",
          sending: "0",
          err: "",
        },
        memo: { fingerprint: sessionId },
        moduleSpec: { id: `tarot_${sessionId}`, runtime: "compose_dsl" },
      },
    };
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    return {
      handled: true,
      text: `塔罗牌桌加载失败：${text}`,
    };
  }
}