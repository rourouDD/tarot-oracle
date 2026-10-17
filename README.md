# 🔮 塔罗问卜 · Operit ToolPkg

一个跑在 [Operit](https://github.com/AAswordman/Operit) 上的塔罗牌插件。写下想问的事，抽韦特塔罗，把牌面交给对话里的 AI 解读。

牌面不预言命运，只当镜子用。

## 功能

- **78 张韦特塔罗**：22 张大阿卡纳 + 56 张小阿卡纳，正逆位皆有释义
- **8 种牌阵**：单张指引、时间流三张、选择十字、关系五张、二选一、困境破解、自我照见、凯尔特十字
- **两种抽牌方式**
  - 工具箱面板：点「抽牌」直接出牌
  - 对话内牌桌：AI 发出 `<tarot>` 标签，消息里摊开一副背面朝上的牌，自己点着翻
- **一键送解读**：抽完把牌面（位置 + 正逆位 + 关键词）发进对话，让 AI 结合问题解读
- **AI 直调**：子包提供 `draw_tarot` / `list_tarot_spreads`，AI 自己也能抽

## 界面

深紫夜空底 + 暖白文字 + 淡金强调，逆位用柔和的珊瑚红。

## 安装

1. 构建：`npx tsc -p tsconfig.json`
2. 打包：把 `manifest.json` 和 `dist/` 一起打成 zip，改后缀为 `.toolpkg`
3. 在 Operit 的包管理里导入

或者直接拿现成的 `.toolpkg` 装。

## 目录

```
manifest.json          包声明
src/
  main.ts              入口，注册 UI 路由与导航
  packages/            子包（给 AI 调的工具）
  plugin/              chatView hook、<tarot> 标签渲染
  shared/              牌库、牌阵、常量
  ui/
    theme.ts           配色（改颜色只动这个文件）
    index.ui.ts        工具箱面板
    inline_draw.ui.ts  对话内交互牌桌
```

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `TAROT_ORACLE_ALLOW_REVERSED` | `true` | 是否允许逆位 |
| `TAROT_ORACLE_DEFAULT_SPREAD` | `three` | 默认牌阵（`single` / `three` / `career`） |

## 配置

面板里的「发到哪个对话」可以填对话 ID，**留空就是当前对话**，一般不用填。

## 数据

抽牌会话落在 `cleanOnExit/tarot_oracle`，Operit 退出时自动清理。

## 许可

MIT。牌面释义为本项目自撰，未使用受版权保护的牌面图像。
