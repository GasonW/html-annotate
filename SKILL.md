---
name: annotate
description: "HTML 批注工具：对任意 HTML 文件添加批注（文字+图片），Claude 可读取批注并应用修改。使用场景：批注 HTML、标注 HTML、annotate、给 HTML 加评论、根据批注修改 HTML。当用户提到要对 HTML 文件做批注、标注、加评论时使用此 skill。"
---

# HTML 批注工具

为任意 HTML 文件提供可视化批注能力。用户在浏览器中批注，数据保存为 `.annotations.json`，Claude 读取后可自动应用修改。

## 两种用法

### 1. 启动批注模式

用户说 `/annotate path/to/file.html` 或 "批注这个 HTML" 时：

```bash
# 启动批注服务（后台运行）
source ~/venv/bin/activate
nohup python ~/.claude/skills/annotate/scripts/annotate-server.py "<HTML所在目录>" --port 8787 > /tmp/annotate-server.log 2>&1 &
echo $!  # 记住 PID 以便后续停止

# 打开浏览器
open "http://localhost:8787/<文件名>.html"
```

启动后告知用户：
- 选中文字 → 点击"+ 添加批注"按钮
- 输入评论文字，可 ⌘+V 粘贴图片
- ⌘+Enter 快速提交
- 右侧边栏默认展示未解决批注，可切换全部 / 未解决 / 已解决，并可编辑 / 标记解决
- 批注自动保存到 `<文件名>.annotations.json`
- 完成批注后回来告诉我

### 2. 读取并应用批注

用户说"根据批注修改"或"应用批注"时：

**Step 1: 读取批注（含图片提取）**

```bash
source ~/venv/bin/activate
python ~/.claude/skills/annotate/scripts/read-annotations.py "<文件名>.annotations.json" --open-only
```

这个脚本会：
- 列出所有未解决的批注（原始序号、ID、选中文字、评论）
- 把批注中的 base64 图片提取为临时文件到 `/tmp/ann_images/`
- 输出图片文件路径

**Step 2: 查看批注图片**

如果输出中包含图片路径，**必须使用 Read 工具逐个读取图片文件**来查看用户截图/标注内容：
```
Read /tmp/ann_images/ann1_img1.png
Read /tmp/ann_images/ann3_img2.jpg
```

图片可能包含：用户的手绘标注、截图对比、UI 参考图、期望效果示意等。这些视觉信息对理解批注意图至关重要，**不要跳过**。

**Step 3: 逐条应用修改并回写解决状态**

必须按脚本输出顺序逐条处理未解决批注，不要一次性把所有批注标记完成：
1. 结合文字评论 + 图片内容理解修改意图
2. 在源 HTML 中定位 `selectedText` 对应的位置
3. 执行修改
4. 对这一条做必要验证，确认修改已经覆盖评论意图
5. 立即把这一条标记为已解决：

```bash
source ~/venv/bin/activate
python ~/.claude/skills/annotate/scripts/read-annotations.py "<文件名>.annotations.json" --resolve "<批注ID>" --open-only
```

如果无法确定如何处理某条批注，保持未解决状态，不要强行标记解决，并在回复中说明阻塞点。全部处理完成后，再运行一次：

```bash
source ~/venv/bin/activate
python ~/.claude/skills/annotate/scripts/read-annotations.py "<文件名>.annotations.json" --open-only
```

用它确认剩余未解决数量。最后告知用户每条批注的处理结果：已解决、未解决及原因。

**批注 JSON 结构：**
```json
[
  {
    "id": "a...",
    "selectedText": "被批注的原文",
    "comment": "用户的评论/修改意见",
    "images": ["data:image/..."],  // base64 图片
    "resolved": false,
    "resolvedAt": null,
    "createdAt": 1234567890
  }
]
```

### 停止服务

完成批注工作后：
```bash
kill <PID>  # 停止之前记录的服务进程
```

## 注意事项

- 服务启动在 `127.0.0.1`（仅本机访问），默认端口 8787
- 如果端口被占用，换一个端口：`--port 8788`
- 批注数据不会修改源 HTML，全部存在独立的 `.annotations.json` 中
- 图片以 base64 存储在 JSON 中（批注中包含图片时 JSON 文件会较大）
- 刷新页面后批注会自动恢复（高亮标记基于 `selectedText` 文本匹配重建——如果源文本已改变，高亮可能无法恢复，但批注数据不会丢失）

## 文件说明

- `scripts/annotate-server.py` — Python HTTP 服务，自动给 HTML 注入批注脚本 + 提供 REST API
- `scripts/read-annotations.py` — 读取批注 JSON，提取图片为临时文件，输出结构化摘要供 Claude 处理
- `assets/annotate.js` — 纯前端批注 UI（CSS/HTML/JS 全部自包含）
