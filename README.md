# HTML Annotate

<p align="center">
  <b>赋予 HTML 可批注能力，让 AI Agent 看懂你的反馈</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.8+-blue" alt="Python">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/claude_code-skill-orange" alt="Claude Code Skill">
</p>

---

## 为什么做这个？

2025 年 5 月，Anthropic 工程师 **Thariq Shihipar** 发表了《[Using Claude Code: The Unreasonable Effectiveness of HTML](https://www.anthropic.com/engineering/using-claude-code-the-unreasonable-effectiveness-of-html)》，核心论断：

> **"HTML is the new Markdown."** — 在 AI 成为文档写作者的时代，HTML 比 Markdown 更适合做展示层。

这篇文章 48 小时内获得 **440 万浏览**，Simon Willison 公开说"打破了我三年用 Markdown 的默认习惯"。社区迅速形成共识：<strong>HTML 做界面，Markdown 做协议</strong>。

但这里有一个致命缺口：

| Markdown | HTML |
|----------|------|
| 任何人都能在任意行下面写评论 | ❌ 好看、结构化，但**没有原生的批注能力** |
| Agent 可以直接理解"这段需要改" | ❌ 你无法在某段文字旁写意见，Agent 无从知道"这里要改什么" |

**HTML Annotate** 填的就是这个缺口。它不修改源文件，通过本地服务动态注入批注 UI，把任何 HTML 变成可划线、可评论、可贴图的"协作文档"。

```
选中文字 → 荧光批注 → 文字 + 图片评论 → JSON 落盘 → AI 读取 → AI 修改源文件
```

## Demo

> 打开 [demo.html](assets/demo.html) 查看一个未注入批注的静态页面。然后运行：
>
> ```bash
> python scripts/annotate-server.py assets/
> open http://localhost:8787/demo.html
> ```
>
> 你就能在这个 demo 页面上批注了。

## 核心能力

| 能力 | 说明 |
|------|------|
| 🖊️ **文字划线批注** | 选中任意文本，点击浮动按钮添加评论 |
| ✨ **荧光高亮双态** | 弱态 = 荧光下划线；hover/选中 = 暖色背景高亮；点击空白处自动返回弱态 |
| 🖼️ **图片批注** | Cmd+V 粘贴剪贴板图片，或点击上传；图片与文字一起存储 |
| 🤖 **AI 可直接消费** | 批注存为 `.annotations.json`；`read-annotations.py` 提取图片为 PNG，Claude 可直接阅读 |
| 📄 **零侵入源文件** | 批注独立存储，源 HTML 完全不被修改 |
| 🔄 **刷新恢复高亮** | 页面刷新后自动从 JSON 重建所有高亮 |
| 📋 **侧边栏管理** | 全部 / 未解决 / 已解决三视图；编辑、解决、双向联动 |
| 🎯 **评论即编辑器** | 输入面板嵌入侧边栏，不遮挡正文；侧边栏可折叠 |

## 安装

### 前置依赖

- Python 3.8+（仅需标准库，无额外依赖）
- Claude Code（可选，用于 `/annotate` skill）

### 作为 Claude Code Skill 安装

```bash
git clone https://github.com/GasonW/html-annotate.git ~/.claude/skills/annotate
```

然后在 Claude Code 中：

```
/annotate path/to/report.html
```

### 独立使用

```bash
git clone https://github.com/GasonW/html-annotate.git
cd html-annotate

# 启动批注服务
python scripts/annotate-server.py /path/to/html/files

# 浏览器打开
open http://localhost:8787/your-file.html

# 批注完成后，读取批注数据
python scripts/read-annotations.py /path/to/your-file.annotations.json
```

## 使用方式

### 1. 浏览器中批注

```
            选中文字
               │
    ┌──────────┴──────────┐
    │  点击 "+ 添加批注"   │
    │  输入评论  ⌘+V 贴图  │
    │  ⌘+Enter 提交        │
    └──────────┬──────────┘
               │
    文字高亮 + 侧边栏卡片
               │
        自动保存 JSON
```

- **弱高亮**：荧光黄下划线，不遮挡文字
- **强高亮**：hover 或点击时切换为暖色背景，视觉突出
- **失焦**：点击其他位置自动回到弱态
- **编辑**：点击卡片上的"编辑"按钮修改评论
- **解决**：点击"解决"移除原文高亮
- **展开/收起**：长评论自动折叠

### 2. Claude Code 中读取批注

```
用户: 帮我根据批注修改
```

Claude Code 会自动：
1. 运行 `read-annotations.py --open-only` 列出所有未解决批注
2. 提取图片到 `/tmp/ann_images/`
3. **逐条阅读图片内容**（Read 工具），结合文字评论理解意图
4. 按序修改源 HTML

### 3. 手动读取

```bash
# 查看所有未解决批注（含图片提取）
python scripts/read-annotations.py report.annotations.json --open-only

# 查看全部批注
python scripts/read-annotations.py report.annotations.json
```

## 批注数据结构

```json
[
  {
    "id": "amk7x...",
    "selectedText": "用户选中的原文",
    "comment": "用户的评论文本",
    "images": ["data:image/png;base64,..."],
    "resolved": false,
    "createdAt": 1716153600000
  }
]
```

图片以 base64 内嵌在 JSON 中，`read-annotations.py` 会自动提取为临时 PNG 文件供 Claude 查看。

## 技术设计

### 架构

```
┌─────────────────────────────────────────┐
│             annotate-server.py           │
│                                          │
│  静态文件服务 (SimpleHTTPRequestHandler)  │
│       │         │                        │
│       ▼         ▼                        │
│   HTML 注入   REST API                   │
│   (注入      (GET/POST                    │
│  <script>)   annotations.json)           │
│       │         │                        │
│       ▼         ▼                        │
│  annotate.js   .annotations.json        │
│  (纯前端批注)   (数据持久化)              │
└─────────────────────────────────────────┘
```

### 高亮实现

使用 `document.createTreeWalker()` + `NodeFilter.SHOW_TEXT` 遍历选区内的文本节点，每个文本节点单独包裹 `<span class="ann-hl">`。避免 `surroundContents()` 将块级元素包裹进内联标签导致的布局破坏。

### 存储

- **运行时**：`annotate.js → POST /__ann__/api/data → Python server → .annotations.json`
- **启动时**：`annotate.js → GET /__ann__/api/data → Python server → .annotations.json`
- **离线降级**：HTTP API 不可用时自动降级到 `localStorage`

### 浮动按钮定位

使用 `mouseup` 事件的 `clientX/Y` 坐标直接定位按钮，让按钮出现在鼠标松手位置，而非选区矩形中心。

### 防抖设计

`mousedown` → 立即隐藏浮动按钮 + 设 `btnJustHidden = true`。`mouseup` 时若选区文字与上次相同则跳过，避免"点击已选中文字→按钮重复出现"。

## 文件结构

```
html-annotate/
├── README.md
├── SKILL.md                      # Claude Code skill 定义
├── assets/
│   ├── annotate.js               # 批注前端脚本（CSS/HTML/JS 全自包含）
│   └── demo.html                 # 演示页面
└── scripts/
    ├── annotate-server.py        # 本地 HTTP 服务
    └── read-annotations.py       # 批注读取 & 图片提取
```

## 哲学

1. **零侵入。** 不做任何修改源文件的事。注入是瞬时的，批注数据是独立的。
2. **人机共享语言。** 人不需要会写代码，Agent 不需要猜人的意思。批注 JSON 是它们之间的共同语言。
3. **所见即所批。** 浏览器里看到的，就是能批注的。没有额外工具，没有学习成本。

## License

MIT
