// annotate.js — Standalone HTML annotation UI
// Injected by annotate-server.py; all CSS/HTML created dynamically.
// Storage: HTTP API at /__ann__/api/data
(function() {
  'use strict';
  if (window.__ANN_LOADED__) return;
  window.__ANN_LOADED__ = true;

  const API = '/__ann__/api/data';
  const FILE = location.pathname.split('/').pop() || 'index.html';

  let anns = [], pendingRange = null, pendingText = '', imgs = [];
  let filter = 'open', editingId = null, sidebarOpen = true;
  let btnJustHidden = false;
  let layoutCaptured = false;
  let editorEscArmed = false, editorEscTimer = null;

  // --- CSS injection ---
  function injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
  /* === Highlights === */
  span.ann-hl {
    --ann-underline: rgb(245, 220, 128);
    --ann-highlight: rgb(252, 240, 206);
    background: linear-gradient(to bottom, transparent calc(100% - 2px), var(--ann-underline) 0);
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    cursor: pointer;
    border-radius: 0;
    transition: background .15s ease, box-shadow .15s ease;
  }
  span.ann-hl:hover, span.ann-hl.active {
    background: linear-gradient(to bottom, rgba(252, 240, 206, .72) calc(100% - 2px), var(--ann-underline) 0);
  }
  span.ann-hl.pending {
    background: linear-gradient(to bottom, rgba(252, 240, 206, .72) calc(100% - 2px), var(--ann-underline) 0);
    box-shadow: 0 0 0 1px rgba(245, 220, 128, .5);
  }
  span.ann-hl.resolved {
    --ann-underline: #d2d6dc;
    opacity: .78;
  }
  span.ann-hl.resolved:hover, span.ann-hl.resolved.active {
    background: linear-gradient(to bottom, rgba(243, 244, 246, .72) calc(100% - 2px), #d2d6dc 0);
  }

  #ann-sidebar, #ann-float-btn, #ann-lightbox {
    --ann-ink: #20242a;
    --ann-muted: #707982;
    --ann-subtle: #8a939d;
    --ann-line: #dfe3e8;
    --ann-surface: #ffffff;
    --ann-panel: #ffffff;
    --ann-wash: #eff6ff;
    --ann-accent: #2563eb;
    --ann-accent-strong: #2563eb;
    --ann-link: #1d5cff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    letter-spacing: 0;
  }

  body.ann-active {
    --ann-sidebar-width: 380px;
    --ann-sidebar-gap: 0px;
    --ann-reserved-right: calc(var(--ann-sidebar-width));
    transition: margin-right .2s ease;
  }
  body.ann-active:not(.sb-collapsed) {
    margin-right: calc(var(--ann-original-margin-right, 0px) + var(--ann-reserved-right)) !important;
  }
  body.ann-active.sb-collapsed {
    margin-right: var(--ann-original-margin-right, 0px) !important;
  }
  body.ann-active:not(.sb-collapsed) > :not(#ann-sidebar):not(#ann-float-btn):not(#ann-lightbox):not(script):not(style):not(link):not(meta) {
    max-width: calc(100vw - var(--ann-reserved-right)) !important;
    box-sizing: border-box !important;
  }

  /* === Floating Add Button === */
  #ann-float-btn {
    position: fixed; display: none; z-index: 10000;
    background: #fff; color: #20242a; border: 1px solid #dfe3e8;
    border-radius: 8px; padding: 7px 13px; font-size: 13px; cursor: pointer;
    white-space: nowrap; box-shadow: 0 12px 28px rgba(32,36,42,.14);
    font-weight: 600; line-height: 18px;
    align-items: center; gap: 6px;
    transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, color .15s ease;
  }
  #ann-float-btn::before {
    content: "+";
    color: #2563eb;
    font-size: 16px;
    line-height: 16px;
    font-weight: 700;
  }
  #ann-float-btn:hover {
    background: #f8fafc;
    border-color: #b7c6dc;
    box-shadow: 0 14px 32px rgba(32,36,42,.16);
    color: #111827;
  }

  /* === Sidebar === */
  #ann-sidebar {
    position: fixed; top: 0; right: 0; width: 380px; bottom: 0;
    background: var(--ann-panel); border-left: 1px solid var(--ann-line); z-index: 9998;
    display: flex; flex-direction: column;
    color: var(--ann-ink);
    box-shadow: -1px 0 18px rgba(32,36,42,.05);
    transition: transform .25s cubic-bezier(.4,0,.2,1); transform: translateX(0);
  }
  #ann-sidebar.collapsed { transform: translateX(100%); }

  /* Reopen tab — visible only when sidebar is collapsed */
  #ann-reopen {
    position: fixed; right: 0; top: 50%; transform: translateY(-50%);
    z-index: 9997; display: none;
    background: #fff; border: 1px solid var(--ann-line); border-right: none;
    border-radius: 8px 0 0 8px; padding: 10px 10px 10px 12px;
    cursor: pointer; box-shadow: -2px 0 16px rgba(32,36,42,.08);
    font-size: 12px; color: var(--ann-muted); font-weight: 600;
    writing-mode: vertical-rl; letter-spacing: .05em;
    transition: all .15s; user-select: none; gap: 6px;
    display: flex; align-items: center;
  }
  #ann-reopen:hover { color: #20242a; border-color: #cdd3da; }
  #ann-reopen .reopen-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 5px;
    background: var(--ann-accent-strong); color: #fff; font-size: 10px; font-weight: 700;
    border-radius: 9px; line-height: 1; writing-mode: horizontal-tb;
    margin-bottom: 4px;
  }
  #ann-reopen.show { display: flex; }

  /* Header */
  #ann-sidebar .sb-header {
    padding: 14px 20px;
    border-bottom: 1px solid var(--ann-line);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  #ann-sidebar .sb-header .sb-title-group {
    display: inline-flex; align-items: center; gap: 6px;
  }
  #ann-sidebar .sb-header .sb-title {
    font-size: 16px; line-height: 24px; font-weight: 700; color: var(--ann-ink);
  }
  #ann-sidebar .sb-header .sb-count {
    font-weight: 700; font-size: 16px; line-height: 24px; color: var(--ann-ink);
  }
  #ann-sidebar .sb-header .sb-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 5px;
    background: var(--ann-accent-strong); color: #fff; font-size: 10px; font-weight: 700;
    border-radius: 9px; line-height: 1;
  }
  #ann-sidebar .sb-header .sb-close {
    width: 28px; height: 28px; border: none; background: none;
    cursor: pointer; color: #6f7882; font-size: 28px;
    border-radius: 6px; display: flex; align-items: center; justify-content: center;
    transition: all .15s;
    line-height: 1;
  }
  #ann-sidebar .sb-header .sb-close:hover { background: #f6f7f8; color: #20242a; }

  /* Tabs */
  #ann-sidebar .sb-tabs {
    display: flex; padding: 10px 20px; gap: 10px;
    border-bottom: 1px solid #edf0f2;
    flex-shrink: 0;
  }
  #ann-sidebar .sb-tabs button {
    display: inline-flex; align-items: center; gap: 4px;
    position: relative;
    border: 1px solid transparent; background: none; padding: 5px 4px 7px; font-size: 13px;
    line-height: 20px; cursor: pointer; color: var(--ann-muted); border-radius: 0; font-weight: 600;
    transition: all .15s;
  }
  #ann-sidebar .sb-tabs button:hover { color: #20242a; }
  #ann-sidebar .sb-tabs button.active { color: #20242a; background: none; border-color: transparent; }
  #ann-sidebar .sb-tabs button.active::after {
    content: "";
    position: absolute; left: 4px; right: 4px; bottom: 1px; height: 2px;
    background: var(--ann-accent-strong);
    border-radius: 999px;
  }

  .ann-list { flex: 1; overflow-y: auto; padding: 16px 20px 20px; }

  /* === Editor panel === */
  #ann-editor-panel {
    display: none; padding: 14px 16px; border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;
  }
  #ann-editor-panel.active { display: block; }
  #ann-editor-panel .ed-header {
    font-size: 13px; font-weight: 700; color: var(--ann-ink); margin-bottom: 8px;
  }
  #ann-editor-panel .ed-quote {
    font-size: 12px; color: var(--ann-muted); border-left: 3px solid #cfd5dc;
    padding: 6px 10px; margin-bottom: 10px; background: #fafbfc;
    border-radius: 0 4px 4px 0; max-height: 44px; overflow: auto; line-height: 1.4;
  }
  #ann-editor-panel .ed-input-box {
    border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #fff;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  #ann-editor-panel .ed-input-box:focus-within {
    border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(37, 99, 235, .14);
  }
  #ann-editor-panel .ed-input-box.shake {
    animation: ann-shake .26s ease;
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220,38,38,.14);
  }
  @keyframes ann-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-5px); }
    40% { transform: translateX(5px); }
    60% { transform: translateX(-3px); }
    80% { transform: translateX(3px); }
  }
  #ann-editor-panel .ed-input-box textarea {
    width: 100%; min-height: 72px; border: none; padding: 10px 12px;
    font-size: 13px; font-family: inherit; resize: vertical;
    line-height: 1.5; outline: none; box-sizing: border-box; color: var(--ann-ink);
  }
  #ann-editor-panel .ed-input-box textarea::placeholder { color: #cbd5e1; }
  #ann-editor-panel .ed-input-box .ed-img-tray {
    display: flex; gap: 6px; flex-wrap: wrap; padding: 0 10px 8px; min-height: 0;
  }
  #ann-editor-panel .ed-input-box .ed-img-tray:empty { display: none; }
  #ann-editor-panel .ed-input-box .ed-img-item {
    position: relative; width: 52px; height: 40px; border-radius: 4px;
    display: inline-block; flex: 0 0 52px;
  }
  #ann-editor-panel .ed-input-box .ed-img-item img {
    width: 52px; height: 40px; object-fit: cover; border-radius: 4px;
    border: 1px solid #e2e8f0; cursor: pointer;
  }
  #ann-editor-panel .ed-input-box .ed-img-item img:hover { opacity: .6; }
  #ann-editor-panel .ed-input-box .ed-img-remove {
    position: absolute; top: -7px; right: -7px; width: 18px; height: 18px;
    border: 1px solid rgba(31,41,51,.18); border-radius: 999px;
    background: #1e293b; color: #fff; cursor: pointer; font-size: 13px;
    line-height: 16px; padding: 0; display: grid; place-items: center;
    box-shadow: 0 4px 10px rgba(15,23,42,.22);
  }
  #ann-editor-panel .ed-input-box .ed-img-remove:hover { background: #dc2626; }
  #ann-editor-panel .ed-input-bottom {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 6px 10px; border-top: 1px solid #f1f5f9;
  }
  #ann-editor-panel .ed-input-bottom .upload-btn {
    border: none; background: none; cursor: pointer; font-size: 12px;
    color: #94a3b8; padding: 3px 7px; border-radius: 6px; font-weight: 600;
    transition: all .15s;
  }
  #ann-editor-panel .ed-input-bottom .upload-btn:hover { background: #f1f5f9; color: #475569; }
  #ann-editor-panel .ed-input-bottom .hint { font-size: 11px; color: #cbd5e1; text-align: right; }
  #ann-editor-panel .ed-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
  #ann-editor-panel .ed-actions button {
    padding: 6px 16px; border-radius: 6px; font-size: 12px; cursor: pointer;
    font-weight: 600; border: 1px solid #e2e8f0; background: #fff; color: #475569;
    transition: all .15s;
  }
  #ann-editor-panel .ed-actions button:hover { background: #f8fafc; border-color: #cbd5e1; }
  #ann-editor-panel .ed-actions button.primary { background: var(--ann-accent-strong); color: #fff; border-color: var(--ann-accent-strong); }
  #ann-editor-panel .ed-actions button.primary:hover { background: #1d4ed8; border-color: #1d4ed8; }

  /* === Cards === */
  .ann-card {
    position: relative;
    border: 1px solid var(--ann-line); border-radius: 8px; padding: 14px 14px 12px;
    margin-bottom: 12px; cursor: pointer;
    transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
    background: #fff;
    overflow: hidden;
  }
  .ann-card:last-child { margin-bottom: 0; }
  .ann-card:hover { border-color: #cfd5dc; box-shadow: 0 8px 22px rgba(32,36,42,.06); }
  .ann-card.active {
    border-color: #d9dee3;
    box-shadow: 0 10px 28px rgba(32,36,42,.10);
    transform: translateY(-1px);
    padding-top: 18px;
  }
  .ann-card.active::before {
    content: "";
    position: absolute; left: 0; right: 0; top: 0; height: 4px;
    background: var(--ann-accent-strong);
  }
  .ann-card.resolved { opacity: .45; }
  .ann-card.resolved:hover { opacity: .7; }

  .ann-card .ac-head {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    margin-bottom: 6px; font-size: 11px;
  }
  .ann-card .ac-index { color: #94a3b8; font-weight: 700; }
  .ann-card .ac-status {
    border-radius: 4px; padding: 1px 6px; font-size: 10px; line-height: 16px;
    font-weight: 700;
  }
  .ann-card .ac-status.open { background: #eff6ff; color: #2563eb; }
  .ann-card .ac-status.resolved { background: #f1f5f9; color: #94a3b8; }

  .ann-card .ac-quote {
    font-size: 13px; color: var(--ann-muted); border-left: 3px solid #cfd5dc;
    padding: 1px 0 1px 10px; margin: 0 0 12px; line-height: 20px;
    max-height: 40px; overflow: hidden; background: transparent;
    border-radius: 0;
  }
  .ann-card.resolved .ac-quote { border-left-color: #d7dce2; color: #9aa3ad; }

  .ann-card .ac-time {
    color: var(--ann-subtle); font-size: 12px; line-height: 18px;
    margin: 0 0 6px;
  }

  .ann-card .ac-comment {
    font-size: 14px; line-height: 22px; color: var(--ann-ink); margin-bottom: 10px;
    white-space: pre-wrap; max-height: 88px; overflow: hidden; transition: max-height .25s ease;
  }
  .ann-card .ac-comment.expanded { max-height: 2000px; }
  .ann-card .ac-toggle {
    font-size: 12px; color: var(--ann-link); cursor: pointer; margin: -4px 0 8px;
    display: none; user-select: none; font-weight: 600;
  }
  .ann-card .ac-toggle:hover { opacity: .7; }
  .ann-card .ac-images { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
  .ann-card .ac-images img {
    width: 80px; height: 56px; border-radius: 4px;
    border: 1px solid #f1f5f9; cursor: zoom-in; object-fit: cover;
    transition: border-color .15s;
  }
  .ann-card .ac-images img:hover { border-color: #cbd5e1; }

  .ann-card .ac-meta {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    font-size: 12px; color: var(--ann-subtle);
    padding-top: 2px; margin-top: 2px;
  }
  .ann-card .ac-state {
    min-width: 48px; color: var(--ann-subtle); font-weight: 600;
  }
  .ann-card .ac-actions { display: flex; gap: 8px; margin-left: auto; }
  .ann-card .ac-actions button {
    border: 1px solid #dfe3e8; background: #fff; font-size: 12px; cursor: pointer;
    padding: 4px 10px; border-radius: 6px; font-weight: 600; transition: all .15s;
    color: #5f6872; line-height: 18px;
  }
  .ann-card .ac-actions button:hover { background: #f6f7f8; border-color: #cfd5dc; color: #20242a; }
  .ann-card .ac-actions .edit-btn { color: #5f6872; }
  .ann-card .ac-actions .edit-btn:hover { color: #20242a; background: #f6f7f8; }
  .ann-card .ac-actions .resolve-btn {
    color: #20242a;
    border-color: #dfe3e8;
    background: #fff;
  }
  .ann-card .ac-actions .resolve-btn:hover {
    background: #f6f7f8; border-color: #cfd5dc; color: #20242a;
  }
  .ann-card.resolved .ac-actions .resolve-btn { color: #94a3b8; border-color: #e2e8f0; }
  .ann-card.resolved .ac-actions .resolve-btn:hover { background: #f1f5f9; color: #475569; }

  /* Footer */
  #ann-sidebar .sb-footer {
    padding: 9px 16px; border-top: 1px solid #f1f5f9;
    display: flex; gap: 10px; flex-shrink: 0;
  }
  #ann-sidebar .sb-footer button {
    border: none; background: none; font-size: 11px;
    cursor: pointer; color: #94a3b8; padding: 4px 8px;
    border-radius: 4px; transition: all .15s; font-weight: 500;
  }
  #ann-sidebar .sb-footer button:hover { color: #20242a; background: var(--ann-wash); }

  /* Empty State */
  .ann-empty { text-align: center; padding: 48px 20px; color: #94a3b8; font-size: 12px; }
  .ann-empty .icon { font-size: 20px; margin-bottom: 8px; opacity: .4; }

  /* Lightbox */
  #ann-lightbox {
    position: fixed; inset: 0; background: rgba(15,23,42,.85);
    z-index: 10001; display: none; align-items: center; justify-content: center; cursor: zoom-out;
  }
  #ann-lightbox.show { display: flex; }
  #ann-lightbox img { max-width: 90vw; max-height: 90vh; border-radius: 8px; box-shadow: 0 24px 70px rgba(0,0,0,.4); }
    `;
    document.head.appendChild(s);
  }

  // --- HTML injection ---
  function injectHTML() {
    // Reopen tab (visible when sidebar collapsed)
    const reopen = document.createElement('div');
    reopen.id = 'ann-reopen';
    reopen.innerHTML = '<span class="reopen-badge" id="reopen-badge">0</span>批注';
    reopen.onclick = () => ANN.toggleSidebar();
    document.body.appendChild(reopen);

    // Floating add button
    const floatBtn = document.createElement('button');
    floatBtn.id = 'ann-float-btn';
    floatBtn.textContent = '添加批注';
    floatBtn.onmousedown = e => e.preventDefault();
    floatBtn.onclick = () => openEditor();
    document.body.appendChild(floatBtn);

    // Sidebar (full-height, no toolbar)
    const sidebar = document.createElement('div');
    sidebar.id = 'ann-sidebar';
    sidebar.innerHTML = `
      <div class="sb-header">
        <div class="sb-title-group">
          <span class="sb-title">评论</span>
          <span class="sb-count" id="sb-count">(0)</span>
          <span class="sb-badge" id="ann-badge" style="display:none">0</span>
        </div>
        <button class="sb-close" onclick="ANN.toggleSidebar()" title="收起侧边栏">»</button>
      </div>
      <div class="sb-tabs" id="sb-tabs">
        <button class="active" id="tab-open" onclick="ANN.setFilter('open')">未解决</button>
        <button id="tab-all" onclick="ANN.setFilter('all')">全部</button>
        <button id="tab-resolved" onclick="ANN.setFilter('resolved')">已解决</button>
      </div>
      <div id="ann-editor-panel">
        <div class="ed-header" id="ed-header">添加批注</div>
        <div class="ed-quote" id="ed-quote"></div>
        <div class="ed-input-box">
          <textarea id="ed-comment" placeholder="输入评论..."></textarea>
          <div class="ed-img-tray" id="ed-img-tray"></div>
          <div class="ed-input-bottom">
            <button class="upload-btn" onclick="document.getElementById('ed-img-input').click()">上传图片</button>
            <input type="file" id="ed-img-input" accept="image/*" multiple style="display:none" onchange="ANN.onFileInput(event)">
            <span class="hint">Ctrl+V 粘贴 · Ctrl+Enter 提交</span>
          </div>
        </div>
        <div class="ed-actions">
          <button onclick="ANN.closeEditor()">取消</button>
          <button class="primary" onclick="ANN.submit()">提交</button>
        </div>
      </div>
      <div class="ann-list" id="ann-list"></div>
      <div class="sb-footer">
        <button onclick="ANN.exportJSON()">导出 JSON</button>
        <button onclick="ANN.copyJSON()" id="btn-copy">复制到剪贴板</button>
      </div>
    `;
    document.body.appendChild(sidebar);

    // Lightbox
    const lightbox = document.createElement('div');
    lightbox.id = 'ann-lightbox';
    lightbox.onclick = () => closeLightbox();
    lightbox.innerHTML = '<img id="lb-img" src="" onclick="event.stopPropagation()">';
    document.body.appendChild(lightbox);
  }

  // --- Helpers ---
  function gid() { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'); }
  function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }
  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff >= 0 && diff < 60 * 1000) return '刚刚';
    if (diff >= 0 && diff < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
    if (diff >= 0 && diff < 24 * 60 * 60 * 1000) return `${Math.max(1, Math.floor(diff / 3600000))} 小时前`;
    const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
  }

  function captureLayoutMetrics() {
    if (layoutCaptured) return;
    const bodyStyle = window.getComputedStyle(document.body);
    document.body.style.setProperty('--ann-original-margin-right', bodyStyle.marginRight || '0px');
    layoutCaptured = true;
  }

  function contentRightEdge() {
    const sidebar = document.getElementById('ann-sidebar');
    if (sidebarOpen && sidebar && !sidebar.classList.contains('collapsed')) {
      return Math.max(160, sidebar.getBoundingClientRect().left - 12);
    }
    return window.innerWidth;
  }

  function placeFloatButton(btn, e, range) {
    btn.style.display = 'inline-flex';
    btn.style.visibility = 'hidden';

    const pad = 12;
    const gap = 18;
    const btnBox = btn.getBoundingClientRect();
    const rightEdge = contentRightEdge();
    let x = e.clientX + gap;
    let y = e.clientY + gap;

    if (x + btnBox.width > rightEdge - pad) x = e.clientX - btnBox.width - gap;
    if (y + btnBox.height > window.innerHeight - pad) y = e.clientY - btnBox.height - gap;

    if (range && (x < pad || y < pad)) {
      const rangeBox = range.getBoundingClientRect();
      if (rangeBox && rangeBox.width) {
        x = rangeBox.right + gap;
        y = rangeBox.bottom + 8;
      }
    }

    const maxX = Math.max(pad, rightEdge - btnBox.width - pad);
    const maxY = Math.max(pad, window.innerHeight - btnBox.height - pad);
    btn.style.left = clamp(x, pad, maxX) + 'px';
    btn.style.top = clamp(y, pad, maxY) + 'px';
    btn.style.visibility = 'visible';
  }

  // --- Sidebar open/close ---
  function expandSidebar() {
    if (!sidebarOpen) {
      sidebarOpen = true;
      document.getElementById('ann-sidebar').classList.remove('collapsed');
      document.body.classList.remove('sb-collapsed');
      document.getElementById('ann-reopen').classList.remove('show');
    }
  }

  // --- Storage (HTTP API) ---
  async function save() {
    const data = anns.map(a => ({
      id: a.id, selectedText: a.selectedText, comment: a.comment,
      images: a.images, resolved: a.resolved, createdAt: a.createdAt,
      resolvedAt: a.resolvedAt || null
    }));
    try {
      await fetch(API + '?file=' + encodeURIComponent(FILE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.warn('Annotation save failed, falling back to localStorage', e);
      localStorage.setItem('ann_' + FILE, JSON.stringify(data));
    }
  }

  async function load() {
    try {
      const r = await fetch(API + '?file=' + encodeURIComponent(FILE));
      if (r.ok) { anns = await r.json(); return; }
    } catch (e) { console.warn('API load failed, trying localStorage', e); }
    try { anns = JSON.parse(localStorage.getItem('ann_' + FILE)) || []; } catch { anns = []; }
  }

  // --- Event binding ---
  function bind() {
    document.addEventListener('mousedown', e => {
      if (!e.target.closest('#ann-float-btn')) {
        document.getElementById('ann-float-btn').style.display = 'none';
        btnJustHidden = true;
      }
      if (!e.target.closest('span.ann-hl,.ann-card')) {
        document.querySelectorAll('span.ann-hl.active,.ann-card.active').forEach(el => el.classList.remove('active'));
      }
    });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (document.getElementById('ann-lightbox').classList.contains('show')) {
          closeLightbox();
          return;
        }
        handleEditorEscape();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' &&
          document.getElementById('ann-editor-panel').classList.contains('active')) {
        e.preventDefault(); submit();
      }
    });
    document.addEventListener('paste', e => {
      if (!document.getElementById('ann-editor-panel').classList.contains('active')) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith('image/')) { e.preventDefault(); toB64(it.getAsFile()); }
      }
    });
    document.getElementById('ed-comment').addEventListener('input', resetEditorEscapeGuard);
  }

  function onUp(e) {
    if (e.target.closest('#ann-sidebar,#ann-float-btn')) return;
    const sel = window.getSelection(), text = sel?.toString().trim();
    const btn = document.getElementById('ann-float-btn');
    if (text && sel.rangeCount > 0) {
      if (btnJustHidden && text === pendingText) { btnJustHidden = false; return; }
      btnJustHidden = false;
      const r = sel.getRangeAt(0);
      const body = document.body;
      if (r.commonAncestorContainer === body ||
          e.target.closest('#ann-sidebar')) return;
      pendingRange = r.cloneRange(); pendingText = text;
      placeFloatButton(btn, e, r);
    }
  }

  // --- Highlight (TreeWalker, text-node only) ---
  function hlRange(range, id, resolved = false) {
    const tns = [];
    let root = range.commonAncestorContainer;
    if (root.nodeType === Node.TEXT_NODE) root = root.parentNode;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => range.intersectsNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    while (tw.nextNode()) tns.push(tw.currentNode);
    if (tns.length === 0) return;
    tns.forEach(tn => {
      let start = 0, end = tn.length;
      if (tn === range.startContainer) start = range.startOffset;
      if (tn === range.endContainer) end = range.endOffset;
      if (start >= end) return;
      if (!tn.textContent.slice(start, end).trim()) return;
      const mid = tn.splitText(start);
      mid.splitText(end - start);
      const sp = document.createElement('span');
      sp.className = 'ann-hl' + (resolved ? ' resolved' : ''); sp.dataset.annId = id;
      sp.addEventListener('click', () => focusCard(id));
      mid.parentNode.insertBefore(sp, mid);
      sp.appendChild(mid);
    });
  }

  function unwrapHighlightElements(selector) {
    document.querySelectorAll(selector).forEach(sp => {
      const p = sp.parentNode;
      while (sp.firstChild) p.insertBefore(sp.firstChild, sp);
      p.removeChild(sp); p.normalize();
    });
  }

  function removeHighlight(id) {
    unwrapHighlightElements(`span.ann-hl[data-ann-id="${id}"]`);
  }

  function removePendingHighlight() {
    unwrapHighlightElements('span.ann-hl.pending[data-ann-id="pending"]');
  }

  function commitPendingHighlight(id) {
    const pending = document.querySelectorAll('span.ann-hl.pending[data-ann-id="pending"]');
    pending.forEach(sp => {
      sp.classList.remove('pending', 'active');
      sp.dataset.annId = id;
      sp.addEventListener('click', () => focusCard(id));
    });
    return pending.length > 0;
  }

  function resetEditorEscapeGuard() {
    editorEscArmed = false;
    if (editorEscTimer) {
      clearTimeout(editorEscTimer);
      editorEscTimer = null;
    }
  }

  function editorHasDraftContent() {
    const panel = document.getElementById('ann-editor-panel');
    if (!panel.classList.contains('active')) return false;
    return document.getElementById('ed-comment').value.length > 0 || imgs.length > 0;
  }

  function shakeEditorInput() {
    const box = document.querySelector('#ann-editor-panel .ed-input-box');
    if (!box) return;
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
    setTimeout(() => box.classList.remove('shake'), 300);
  }

  function handleEditorEscape() {
    const panel = document.getElementById('ann-editor-panel');
    if (!panel.classList.contains('active')) return;
    if (!editorHasDraftContent()) {
      closeEditor();
      return;
    }
    if (editorEscArmed) {
      closeEditor();
      return;
    }
    editorEscArmed = true;
    shakeEditorInput();
    editorEscTimer = setTimeout(resetEditorEscapeGuard, 800);
  }

  // --- Editor (in sidebar) ---
  function openEditor() {
    if (!pendingText && !editingId) return;
    document.getElementById('ann-float-btn').style.display = 'none';
    expandSidebar();
    const a = editingId ? anns.find(x => x.id === editingId) : null;
    resetEditorEscapeGuard();
    if (!a && pendingRange) {
      removePendingHighlight();
      try {
        hlRange(pendingRange, 'pending');
        document.querySelectorAll('span.ann-hl[data-ann-id="pending"]').forEach(sp => {
          sp.classList.add('pending', 'active');
        });
        window.getSelection()?.removeAllRanges();
      } catch (e) {
        console.warn(e);
      }
      pendingRange = null;
    }
    document.getElementById('ed-header').textContent = a ? '编辑批注' : '添加批注';
    document.getElementById('ed-quote').textContent = a ? a.selectedText : pendingText;
    document.getElementById('ed-comment').value = a ? a.comment : '';
    imgs = a ? [...a.images] : [];
    renderTray();

    document.getElementById('ann-editor-panel').classList.add('active');
    document.getElementById('sb-tabs').style.display = 'none';
    document.getElementById('ann-list').style.display = 'none';
    setTimeout(() => document.getElementById('ed-comment').focus(), 80);
  }

  function closeEditor() {
    resetEditorEscapeGuard();
    if (!editingId) removePendingHighlight();
    document.getElementById('ann-editor-panel').classList.remove('active');
    document.getElementById('sb-tabs').style.display = '';
    document.getElementById('ann-list').style.display = '';
    imgs = []; pendingRange = null; pendingText = ''; editingId = null;
  }

  function submit() {
    resetEditorEscapeGuard();
    const c = document.getElementById('ed-comment').value.trim();
    if (!c && imgs.length === 0) return;
    if (editingId) {
      const a = anns.find(x => x.id === editingId);
      if (a) { a.comment = c; a.images = [...imgs]; }
      save(); render(); closeEditor(); return;
    }
    const id = gid();
    anns.push({ id, selectedText: pendingText, comment: c, images: [...imgs], resolved: false, createdAt: Date.now() });
    if (!commitPendingHighlight(id) && pendingRange) try { hlRange(pendingRange, id); } catch (e) { console.warn(e); }
    save(); render(); closeEditor();
    setTimeout(() => focusCard(id), 150);
  }

  function startEdit(id) { editingId = id; pendingText = ''; openEditor(); }

  // --- Images ---
  function toB64(f) {
    const r = new FileReader();
    r.onload = e => { imgs.push(e.target.result); resetEditorEscapeGuard(); renderTray(); };
    r.readAsDataURL(f);
  }
  function onFileInput(e) { for (const f of e.target.files) if (f.type.startsWith('image/')) toB64(f); e.target.value = ''; }
  function renderTray() {
    const t = document.getElementById('ed-img-tray');
    t.innerHTML = imgs.map((s, i) =>
      `<span class="ed-img-item">
        <img src="${s}" title="点击预览" onclick="event.stopPropagation();ANN.lb('${s.replace(/'/g, "\\'")}')">
        <button class="ed-img-remove" title="移除图片" onclick="event.stopPropagation();ANN._rmImg(${i})">×</button>
      </span>`
    ).join('');
  }
  function _rmImg(i) { imgs.splice(i, 1); resetEditorEscapeGuard(); renderTray(); }

  // --- Sidebar toggle ---
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    document.getElementById('ann-sidebar').classList.toggle('collapsed', !sidebarOpen);
    document.body.classList.toggle('sb-collapsed', !sidebarOpen);
    const reopen = document.getElementById('ann-reopen');
    if (sidebarOpen) {
      reopen.classList.remove('show');
    } else {
      reopen.classList.add('show');
    }
  }

  // --- Render ---
  function render() {
    const list = document.getElementById('ann-list');
    const f = anns.filter(a =>
      filter === 'all' ? true : filter === 'open' ? !a.resolved : a.resolved
    );
    const oc = anns.filter(a => !a.resolved).length;
    const rc = anns.length - oc;
    const b = document.getElementById('ann-badge');
    b.textContent = oc; b.title = `${oc} 条未解决`;
    b.style.display = 'none';
    const rb = document.getElementById('reopen-badge');
    rb.textContent = oc; rb.style.display = oc > 0 ? '' : 'none';
    document.getElementById('sb-count').textContent = `(${oc})`;
    const tabAll = document.getElementById('tab-all');
    const tabOpen = document.getElementById('tab-open');
    const tabResolved = document.getElementById('tab-resolved');
    if (tabOpen) tabOpen.innerHTML = `<span>未解决</span><span>${oc}</span>`;
    if (tabAll) tabAll.innerHTML = `<span>全部</span><span>${anns.length}</span>`;
    if (tabResolved) tabResolved.innerHTML = `<span>已解决</span><span>${rc}</span>`;
    ['all', 'open', 'resolved'].forEach(k => {
      const tb = document.getElementById('tab-' + k);
      if (tb) tb.className = filter === k ? 'active' : '';
    });
    if (f.length === 0) {
      list.innerHTML = '<div class="ann-empty"><div class="icon">—</div>' + (
        filter === 'all' ? '选中文字即可添加批注' : '暂无' + (filter === 'open' ? '未解决' : '已解决') + '的批注'
      ) + '</div>';
      return;
    }
    list.innerHTML = f.map(a => {
      const time = formatTime(a.createdAt);
      return `<div class="ann-card ${a.resolved ? 'resolved' : ''}" id="card-${a.id}" onclick="ANN.focusHl('${a.id}')">
        <div class="ac-quote">${esc(a.selectedText)}</div>
        ${time ? `<div class="ac-time">${esc(time)}</div>` : ''}
        ${a.comment ? `<div class="ac-comment">${esc(a.comment)}</div><div class="ac-toggle" onclick="event.stopPropagation();ANN.toggleComment(this)">展开</div>` : ''}
        ${a.images.length ? `<div class="ac-images">${a.images.map(s =>
          `<img src="${s}" onclick="event.stopPropagation();ANN.lb('${s.replace(/'/g, "\\'")}')">`
        ).join('')}</div>` : ''}
        <div class="ac-meta">
          <span class="ac-state">${a.resolved ? '已解决' : ''}</span>
          <div class="ac-actions">
            ${a.resolved ? '' : `<button class="edit-btn" onclick="event.stopPropagation();ANN.startEdit('${a.id}')">编辑</button>`}
            <button class="resolve-btn" onclick="event.stopPropagation();ANN.resolve('${a.id}')">
              ${a.resolved ? '重开' : '✓ 标记解决'}
            </button>
          </div>
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('.ac-comment').forEach(cm => {
      const tog = cm.nextElementSibling;
      if (tog && tog.classList.contains('ac-toggle'))
        tog.style.display = cm.scrollHeight > cm.clientHeight + 2 ? 'block' : 'none';
    });
  }

  function toggleComment(el) {
    const cm = el.previousElementSibling;
    const expanded = cm.classList.toggle('expanded');
    el.textContent = expanded ? '收起' : '展开';
  }

  function resolve(id) {
    const a = anns.find(x => x.id === id); if (!a) return;
    a.resolved = !a.resolved;
    a.resolvedAt = a.resolved ? Date.now() : null;
    if (a.resolved) {
      removeHighlight(id);
    } else {
      restoreAnnotationHighlight(a);
    }
    save(); render();
  }

  function setFilter(f) { filter = f; render(); }

  function focusCard(id) {
    expandSidebar();
    document.querySelectorAll('.ann-card.active').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('span.ann-hl.active').forEach(m => m.classList.remove('active'));
    const card = document.getElementById('card-' + id);
    if (card) { card.classList.add('active'); card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    document.querySelectorAll(`span.ann-hl[data-ann-id="${id}"]`).forEach(s => s.classList.add('active'));
  }

  function focusHl(id) {
    expandSidebar();
    document.querySelectorAll('.ann-card.active').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('span.ann-hl.active').forEach(m => m.classList.remove('active'));
    const card = document.getElementById('card-' + id);
    if (card) card.classList.add('active');
    const hls = document.querySelectorAll(`span.ann-hl[data-ann-id="${id}"]`);
    hls.forEach(s => s.classList.add('active'));
    if (hls.length) hls[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function lb(s) {
    document.getElementById('lb-img').src = s;
    document.getElementById('ann-lightbox').classList.add('show');
  }

  function closeLightbox() {
    const lightbox = document.getElementById('ann-lightbox');
    lightbox.classList.remove('show');
    document.getElementById('lb-img').src = '';
  }

  function buildExport() {
    return anns.map((a, i) => ({
      index: i + 1, id: a.id, selectedText: a.selectedText, comment: a.comment,
      images: a.images, resolved: a.resolved, createdAt: a.createdAt,
      resolvedAt: a.resolvedAt || null
    }));
  }

  function exportJSON() {
    const d = buildExport();
    const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u;
    a.download = 'annotations_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click(); URL.revokeObjectURL(u);
  }

  function copyJSON() {
    navigator.clipboard.writeText(JSON.stringify(buildExport(), null, 2)).then(() => {
      const btn = document.getElementById('btn-copy');
      const o = btn.textContent; btn.textContent = '已复制';
      btn.style.color = '#059669';
      setTimeout(() => { btn.textContent = o; btn.style.color = ''; }, 1500);
    });
  }

  // --- Restore highlights from loaded data ---
  function restoreAnnotationHighlight(a) {
    if (!a || a.resolved || !a.selectedText) return false;
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        const el = n.parentElement;
        if (!el || el.closest('#ann-sidebar,#ann-editor-panel,script,style,title,noscript')) return NodeFilter.FILTER_REJECT;
        return el.offsetParent !== null ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    while (tw.nextNode()) {
      if (tw.currentNode.parentElement && tw.currentNode.parentElement.classList.contains('ann-hl')) continue;
      const idx = tw.currentNode.textContent.indexOf(a.selectedText);
      if (idx !== -1) {
        const r = document.createRange();
        r.setStart(tw.currentNode, idx);
        r.setEnd(tw.currentNode, idx + a.selectedText.length);
        try {
          hlRange(r, a.id);
          return true;
        } catch(e) {
          return false;
        }
      }
    }
    return false;
  }

  function restoreHighlights() {
    anns.forEach(a => {
      restoreAnnotationHighlight(a);
    });
  }

  // --- Init ---
  async function init() {
    injectCSS();
    injectHTML();
    captureLayoutMetrics();
    document.body.classList.add('ann-active');
    await load();
    restoreHighlights();
    render();
    bind();
  }

  // Expose global
  window.ANN = {
    openEditor, closeEditor, submit, startEdit, resolve, setFilter,
    toggleSidebar, focusHl, focusCard, lb, onFileInput, _rmImg,
    exportJSON, copyJSON, toggleComment
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
