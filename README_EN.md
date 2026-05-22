# HTML Annotate

<p align="center">
  <b>Give any HTML file annotation superpowers. Let AI agents understand your feedback.</b>
  <br><br>
  <a href="README.md">中文文档</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.8+-blue" alt="Python">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/agent_agnostic-skill-orange" alt="Agent Agnostic">
</p>

---

## Why?

In May 2025, Anthropic engineer **Thariq Shihipar** published "[Using Claude Code: The Unreasonable Effectiveness of HTML](https://www.anthropic.com/engineering/using-claude-code-the-unreasonable-effectiveness-of-html)". His thesis:

> **"HTML is the new Markdown."** — When AI becomes the author, HTML is a far better presentation layer.

The post hit **4.4M views** in 48 hours. The community converged: **HTML for presentation, Markdown for protocol**.

But HTML has a critical gap: **no native annotation capability**. You can't circle a sentence, leave a comment, or paste a screenshot next to a table cell. An AI agent reading the HTML has no idea what needs to change.

**HTML Annotate** fills this gap. It injects annotation UI into any HTML file without modifying the source. Select text, leave comments, paste screenshots — the agent reads the structured output and applies changes.

```
Select text → Highlight → Comment + screenshots → JSON on disk → AI reads → AI edits source
```

## Features

| Feature | Description |
|---------|-------------|
| 🖊️ **Text annotation** | Select any text, click the floating button, leave a comment |
| 🖼️ **Image paste** | Cmd+V to paste clipboard images, or click to upload; stored alongside text |
| 🤖 **AI-consumable output** | Annotations saved as `.annotations.json`; `read-annotations.py` extracts images as PNGs |
| ✅ **Resolution sync** | Agents can mark each annotation resolved after applying it; the page updates open counts |
| 📄 **Zero source modification** | Annotations live in a separate file — your HTML stays untouched |

## 30 seconds to start

**Prerequisites:** Python 3.8+

```bash
git clone https://github.com/GasonW/html-annotate.git ~/.claude/skills/annotate
```

Or copy-paste this to any AI agent with shell access:

> 帮我安装 html-annotate skill。把 https://github.com/GasonW/html-annotate.git 克隆到 ~/.claude/skills/annotate。安装完成后确认 SKILL.md、assets/annotate.js、scripts/annotate-server.py 是否存在。

Already installed? Update:

> 帮我更新 html-annotate。进入 ~/.claude/skills/annotate 执行 git pull，告诉我当前最新 commit。

Then just say:

> /annotate path/to/report.html

Annotate in the browser, then say **"apply my annotations"** — Claude reads the JSON, extracts images, edits the source HTML one item at a time, and marks completed annotations resolved.

### Without Claude Code

```bash
python ~/.claude/skills/annotate/scripts/annotate-server.py /path/to/html/dir
# → Annotate in browser at http://localhost:8787/your-file.html
# → Then pipe to any agent:
python ~/.claude/skills/annotate/scripts/read-annotations.py file.annotations.json --open-only
python ~/.claude/skills/annotate/scripts/read-annotations.py file.annotations.json --resolve amk7x...
```

## Data Format

```json
[
  {
    "id": "amk7x...",
    "selectedText": "The original selected text",
    "comment": "The user's comment",
    "images": ["data:image/png;base64,..."],
    "resolved": false,
    "resolvedAt": null,
    "createdAt": 1716153600000
  }
]
```

Images are base64-embedded. `read-annotations.py` extracts them as PNGs so agents can view them.

## File Structure

```
html-annotate/
├── README.md
├── README_EN.md
├── SKILL.md                      # Claude Code skill definition
├── assets/
│   └── annotate.js               # Annotation frontend (self-contained)
└── scripts/
    ├── annotate-server.py        # Local HTTP server
    └── read-annotations.py       # Reader + image extractor
```

## License

MIT
