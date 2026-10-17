/* METADATA
{
    "name": "tarot_oracle",
    "display_name": {
        "zh": "塔罗问卜",
        "en": "Tarot Oracle"
    },
    "description": {
        "zh": "抽韦特塔罗牌并直接取回牌面结果，供 AI 解读；支持单张、三张时间流、选择十字牌阵，支持正逆位。",
        "en": "Draw Waite tarot cards and return structured readings for AI interpretation."
    },
    "category": "Utility",
    "enabledByDefault": true,
    "env": [
        {
            "name": "TAROT_ORACLE_ALLOW_REVERSED",
            "description": {
                "zh": "是否允许逆位，true/false，默认 true",
                "en": "Allow reversed cards, default true"
            },
            "required": false
        },
        {
            "name": "TAROT_ORACLE_DEFAULT_SPREAD",
            "description": {
                "zh": "默认牌阵：single/three/career，默认 three",
                "en": "Default spread: single/three/career, default three"
            },
            "required": false
        }
    ],
    "tools": [
        {
            "name": "draw_tarot",
            "description": {
                "zh": "抽塔罗牌。传入问题和牌阵，返回抽到的牌、正逆位、位置与关键词；拿到结果后请直接解读。",
                "en": "Draw tarot cards for a question and return the structured result."
            },
            "parameters": [
                {
                    "name": "question",
                    "description": {
                        "zh": "占卜的问题，尽量具体",
                        "en": "The question to ask"
                    },
                    "type": "string",
                    "required": false
                },
                {
                    "name": "spread",
                    "description": {
                        "zh": "牌阵：single（单张）/three（过去现在未来）/career（现状阻碍助力建议），默认 three",
                        "en": "Spread: single / three / career, default three"
                    },
                    "type": "string",
                    "required": false
                },
                {
                    "name": "allow_reversed",
                    "description": {
                        "zh": "是否允许逆位，默认 true",
                        "en": "Allow reversed cards, default true"
                    },
                    "type": "boolean",
                    "required": false
                }
            ]
        },
        {
            "name": "list_tarot_spreads",
            "description": {
                "zh": "列出所有可用牌阵及其位置说明",
                "en": "List all available tarot spreads"
            },
            "parameters": []
        }
    ]
}
*/
import { ENV_KEYS } from "../shared/constants.js";
import { FULL_DECK } from "../shared/deck.js";
import { SPREADS, buildReadingSummary, shuffleAndDraw } from "../shared/spreads.js";

interface DrawParams {
  question?: string;
  spread?: string;
  allow_reversed?: string | boolean;
}

function readEnvBool(key: string, fallback: boolean): boolean {
  if (typeof getEnv !== "function") {
    return fallback;
  }
  const raw = String(getEnv(key) ?? "").trim().toLowerCase();
  if (!raw) {
    return fallback;
  }
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function parseBool(value: string | boolean | undefined, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const raw = value.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") {
    return true;
  }
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") {
    return false;
  }
  return fallback;
}

export function draw_tarot(params: DrawParams) {
  try {
    const defaultSpread = String(getEnv?.(ENV_KEYS.defaultSpread) ?? "").trim() || "three";
    const spreadId = (params.spread ?? defaultSpread).trim();
    const allowReversed = parseBool(
      params.allow_reversed,
      readEnvBool(ENV_KEYS.allowReversed, true)
    );
    const question = (params.question ?? "").trim();
    const result = shuffleAndDraw(question, spreadId, allowReversed);
    const cards = result.cards.map((item) => ({
      position: item.position,
      name: item.card.name,
      en: item.card.en,
      arcana: item.card.arcana,
      suit: item.card.suit ?? null,
      reversed: item.reversed,
      keywords: item.card.keywords,
      meaning: item.meaning,
    }));
    complete({
      success: true,
      question,
      spread: result.spread.id,
      spread_name: result.spread.name,
      allow_reversed: allowReversed,
      cards,
      text: buildReadingSummary(result),
      hint: "请基于上面的牌面，结合问题逐张解读，再串成整体判断，最后给一条具体建议。不要说宿命论的话。",
    });
  } catch (error) {
    complete({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function list_tarot_spreads() {
  complete({
    success: true,
    deck_size: FULL_DECK.length,
    spreads: SPREADS.map((item) => ({
      id: item.id,
      name: item.name,
      positions: item.positions,
      description: item.desc,
    })),
  });
}