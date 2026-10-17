/** ToolPkg 主入口 */

import { TOOLPKG_ID } from "./shared/constants.js";
import { registerToolPkg as registerPlugin } from "./plugin/main_plugin.js";
import tarotScreen from "./ui/index.ui.js";

const ROUTE = `toolpkg:${TOOLPKG_ID}:ui:tarot_oracle_panel`;

export function registerToolPkg(): boolean {
  const ok = registerPlugin();

  ToolPkg.registerUiRoute({
    id: "tarot_oracle_panel",
    route: ROUTE,
    runtime: "compose_dsl",
    screen: tarotScreen as unknown as ToolPkg.ComposeDslScreenRef,
    params: {},
    title: {
      zh: "塔罗占卜",
      en: "Tarot Oracle",
    },
  });

  ToolPkg.registerNavigationEntry({
    id: "tarot_oracle_nav",
    route: ROUTE,
    surface: "toolbox",
    icon: "auto_awesome",
    order: 60,
    title: {
      zh: "塔罗占卜",
      en: "Tarot Oracle",
    },
  });
  // 侧边栏插件入口
  ToolPkg.registerNavigationEntry({
    id: "tarot_oracle_sidebar",
    route: ROUTE,
    surface: "main_sidebar_plugins",
    icon: "auto_awesome",
    order: 60,
    title: {
      zh: "塔罗占卜",
      en: "Tarot Oracle",
    },
  });

  return ok;
}

export { onChatViewEvent } from "./plugin/main_plugin.js";