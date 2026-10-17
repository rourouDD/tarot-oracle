/** 常量与 IPC 通道 */

export const TOOLPKG_ID = "com.mi.rou.tarot_oracle";
export const SUBPACKAGE_ID = "tarot_oracle";

export const IPC_CHANNELS = {
  /** 提交占卜结果，请求 AI 解读 */
  submitReading: "com.mi.rou.tarot_oracle_submit_reading",
} as const;

export const HOOK_IDS = {
  chatView: "tarot_oracle_chat_view",
  inputMenu: "tarot_oracle_menu",
} as const;

export const ENV_KEYS = {
  allowReversed: "TAROT_ORACLE_ALLOW_REVERSED",
  defaultSpread: "TAROT_ORACLE_DEFAULT_SPREAD",
} as const;

export const ROUTE_ID = "tarot_oracle_panel";
export const UI_MODULE_ID = "tarot_oracle";

/** 对话内交互抽牌的 XML 标签名 */
export const RENDER_TAG = "tarot";

/** 交互抽牌会话状态落盘目录（与 UNO 一致，走 cleanOnExit 自动清理） */
export const SESSION_DIR = "/storage/emulated/0/Download/Operit/cleanOnExit/tarot_oracle";

export interface TarotRenderState {
  sessionId: string;
  question: string;
  spreadId: string;
  allowReversed: boolean;
  /** 洗好的牌池快照（背面朝上，id 数组），用户点选后按索引取牌 */
  pool: string[];
  createdAt: number;
}

export interface TarotSessionRecord {
  sessionId: string;
  question: string;
  spreadId: string;
  cards: Array<{ cardId: string; reversed: boolean }>;
  submittedAt: number;
  delivered: boolean;
}

export interface SubmitReadingPayload {
  question: string;
  spreadId: string;
  allowReversed: boolean;
  chatId?: string;
  runtime?: string;
}

export interface SubmitReadingResult {
  success: boolean;
  error?: string;
  message?: string;
}