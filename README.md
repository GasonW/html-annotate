# HTML Annotate

<p align="center">
  <b>Give any HTML file annotation superpowers. Let AI agents understand your feedback.</b>
  <br><br>
  <a href="README_CN.md">中文文档</a>
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
| 📄 **Zero source modification** | Annotations live in a separate file — your HTML stays untouched |

## Installation

**Prerequisites:** Python 3.8+ and Claude Code.

```bash
git clone https://github.com/GasonW/html-annotate.git ~/.claude/skills/annotate
```

Then in Claude Code:

```
/annotate path/to/report.html
```

That's it. It will start a local server, open the page in your browser, and the annotation toolbar will appear. Annotate in the browser, then say **"apply my annotations"** — Claude reads the JSON, extracts any images, and edits the source HTML.

### Use without Claude Code

Start the server and annotate manually, then pipe the output to any agent (Codex, Cursor, etc.):

```bash
python ~/.claude/skills/annotate/scripts/annotate-server.py /path/to/html/dir
# → Annotate in browser at http://localhost:8787/your-file.html
# → Then:
python ~/.claude/skills/annotate/scripts/read-annotations.py file.annotations.json --open-only
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
    "createdAt": 1716153600000
  }
]
```

Images are base64-embedded. `read-annotations.py` extracts them as PNGs so agents can view them.

## File Structure

```
html-annotate/
├── README.md
├── README_CN.md
├── SKILL.md                      # Claude Code skill definition
├── assets/
│   └── annotate.js               # Annotation frontend (self-contained)
└── scripts/
    ├── annotate-server.py        # Local HTTP server
    └── read-annotations.py       # Reader + image extractor
```

## License

MIT
