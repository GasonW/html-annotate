# HTML Annotate

<p align="center">
  <b>赋予 HTML 可批注能力，让 AI Agent 看懂你的反馈</b>
  <br><br>
  <a href="README_EN.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.8+-blue" alt="Python">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/agent_agnostic-skill-orange" alt="Agent Agnostic">
</p>

---

## 为什么做这个？

2025 年 5 月，Anthropic 工程师 **Thariq Shihipar** 发表了《[Using Claude Code: The Unreasonable Effectiveness of HTML](https://www.anthropic.com/engineering/using-claude-code-the-unreasonable-effectiveness-of-html)》，核心论断：

> **"HTML is the new Markdown."** — 在 AI 成为文档写作者的时代，HTML 比 Markdown 更适合做展示层。

这篇文章 48 小时内获得 **440 万浏览**。社区迅速形成共识：**HTML 做界面，Markdown 做协议**。

但有一个致命缺口：

| Markdown | HTML |
|----------|------|
| 任何人都能在任意行下面写评论 | ❌ 好看、结构化，但**没有原生的批注能力** |
| Agent 可以直接理解"这段需要改" | ❌ 你无法在某段文字旁写意见，Agent 无从知道"这里要改什么" |

**HTML Annotate** 填的就是这个缺口。它不修改源文件，通过本地服务动态注入批注 UI，把任何 HTML 变成可划线、可评论、可贴图的协作文档。

```
选中文字 → 荧光批注 → 文字 + 图片评论 → JSON 落盘 → AI 读取 → AI 修改源文件
```

## 核心能力

| 能力 | 说明 |
|------|------|
| 🖊️ **文字划线批注** | 选中任意文本，点击浮动按钮添加评论 |
| 🖼️ **图片批注** | Cmd+V 粘贴剪贴板图片，或点击上传；图片与文字一起存储 |
| 🤖 **AI 可直接消费** | 批注存为 `.annotations.json`；`read-annotations.py` 提取图片为 PNG，AI Agent 可直接阅读 |
| 📄 **零侵入源文件** | 批注独立存储，源 HTML 完全不被修改 |

## 30 秒开始

**前置依赖：** Python 3.8+

```bash
git clone https://github.com/GasonW/html-annotate.git ~/.claude/skills/annotate
```

也可以直接把这段话发给有 shell 权限的 AI Agent：

```
帮我安装 annotate skill。skill 路径：https://github.com/GasonW/html-annotate.git

安装完成后确认 SKILL.md、assets/annotate.js、scripts/annotate-server.py 是否存在。
```

已经安装过的话，用这段话更新：

```
帮我更新 html-annotate。进入 ~/.claude/skills/annotate 执行 git pull，告诉我当前最新 commit。
```

在使用时对 Agent 说：

```
使用 annotate 技能为当前的 html 增加批注能力
```

批注完成后，可以对 Agent 说：

```
请根据批注修改
```

Claude 会读取 JSON、提取图片、逐条修改源 HTML。

## 数据结构

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

图片以 base64 内嵌在 JSON 中。`read-annotations.py` 将其提取为临时 PNG 文件供 Agent 查看。

## 文件结构

```
html-annotate/
├── README.md
├── README_EN.md
├── SKILL.md                      # Claude Code skill 定义
├── assets/
│   └── annotate.js               # 批注前端脚本（CSS/HTML/JS 全自包含）
└── scripts/
    ├── annotate-server.py        # 本地 HTTP 服务
    └── read-annotations.py       # 批注读取 & 图片提取
```

## License

MIT
