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
  let filter = 'all', editingId = null, sidebarOpen = true;
  let btnJustHidden = false;

  // --- CSS injection ---
  function injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
  span.ann-hl { background: transparent; border-bottom: 3px solid rgb(247,224,141); cursor: pointer; border-radius: 0; transition: all .15s; }
  span.ann-hl:hover, span.ann-hl.active { background: rgb(253,241,210); border-bottom-color: transparent; border-radius: 2px; }
  span.ann-hl.resolved { background: transparent; border-bottom-color: #94a3b8; }

  #ann-toolbar {
    position: fixed; top: 0; left: 0; right: 0; height: 38px; z-index: 9999;
    background: #fff; border-bottom: 1px solid #e2e8f0;
    display: flex; align-items: center; padding: 0 16px; gap: 8px;
    font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; font-size: 13px;
  }
  #ann-toolbar .atb-title { font-weight: 700; color: #1e293b; }
  #ann-toolbar .badge { background: #ef4444; color: #fff; font-size: 11px; padding: 1px 7px; border-radius: 10px; }
  #ann-toolbar .spacer { flex: 1; }
  #ann-toolbar button {
    border: 1px solid #e2e8f0; background: #fff; padding: 4px 10px; border-radius: 6px;
    font-size: 12px; cursor: pointer; color: #64748b;
  }
  #ann-toolbar button:hover { background: #f8fafc; }
  #ann-toolbar button.active { background: #2563eb; color: #fff; border-color: #2563eb; }
  #ann-toolbar button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
  #ann-toolbar button.primary:hover { background: #1d4ed8; }
  #ann-toolbar .toggle-sb { font-size: 16px; border: none; background: none; cursor: pointer; color: #94a3b8; }

  body.ann-active { padding-top: 42px !important; }
  body.ann-active .wrap,
  body.ann-active > main,
  body.ann-active > article,
  body.ann-active > .content,
  body.ann-active > div:first-child {
    max-width: 880px; margin-right: calc(340px + 24px);
  }
  body.ann-active.sb-collapsed .wrap,
  body.ann-active.sb-collapsed > main,
  body.ann-active.sb-collapsed > article,
  body.ann-active.sb-collapsed > .content,
  body.ann-active.sb-collapsed > div:first-child {
    margin-right: 24px;
  }

  #ann-float-btn {
    position: absolute; display: none; z-index: 9998;
    background: #2563eb; color: #fff; border: none; border-radius: 6px;
    padding: 4px 12px; font-size: 12px; cursor: pointer; white-space: nowrap;
    box-shadow: 0 2px 8px rgba(37,99,235,.25); font-weight: 500;
  }
  #ann-float-btn:hover { background: #1d4ed8; }

  #ann-sidebar {
    position: fixed; top: 38px; right: 0; width: 340px; bottom: 0;
    background: #f8fafc; border-left: 1px solid #e2e8f0; z-index: 9998;
    overflow-y: auto; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    transition: transform .2s; transform: translateX(0);
  }
  #ann-sidebar.collapsed { transform: translateX(100%); }
  #ann-sidebar .sb-header {
    padding: 14px 16px 10px; border-bottom: 1px solid #e2e8f0;
    font-size: 14px; font-weight: 700; color: #1e293b;
    display: flex; align-items: center; gap: 8px;
  }
  #ann-sidebar .sb-header .sb-count { font-weight: 400; font-size: 12px; color: #94a3b8; }
  #ann-sidebar .sb-tabs {
    display: flex; border-bottom: 1px solid #f1f5f9; padding: 0 16px;
  }
  #ann-sidebar .sb-tabs button {
    border: none; background: none; padding: 8px 12px; font-size: 12px;
    cursor: pointer; color: #94a3b8; border-bottom: 2px solid transparent; font-weight: 500;
  }
  #ann-sidebar .sb-tabs button.active { color: #2563eb; border-bottom-color: #2563eb; }
  .ann-list { padding: 8px; }

  /* --- Editor panel (embedded in sidebar) --- */
  #ann-editor-panel {
    display: none; padding: 14px 16px; border-bottom: 1px solid #e2e8f0;
  }
  #ann-editor-panel.active { display: block; }
  #ann-editor-panel .ed-header {
    font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 8px;
  }
  #ann-editor-panel .ed-quote {
    font-size: 12px; color: #64748b; border-left: 3px solid #2563eb;
    padding: 6px 10px; margin-bottom: 10px; background: #f8fafc;
    border-radius: 0 6px 6px 0; max-height: 60px; overflow: auto; line-height: 1.5;
  }
  #ann-editor-panel .ed-input-box {
    border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
    transition: border-color .15s;
  }
  #ann-editor-panel .ed-input-box:focus-within { border-color: #2563eb; }
  #ann-editor-panel .ed-input-box textarea {
    width: 100%; min-height: 80px; border: none; padding: 10px 12px;
    font-size: 14px; font-family: inherit; resize: vertical;
    line-height: 1.6; outline: none; box-sizing: border-box;
  }
  #ann-editor-panel .ed-input-box .ed-img-tray {
    display: flex; gap: 6px; flex-wrap: wrap; padding: 0 10px 8px; min-height: 0;
  }
  #ann-editor-panel .ed-input-box .ed-img-tray:empty { display: none; }
  #ann-editor-panel .ed-input-box .ed-img-tray img {
    width: 56px; height: 42px; object-fit: cover; border-radius: 4px;
    border: 1px solid #e2e8f0; cursor: pointer;
  }
  #ann-editor-panel .ed-input-box .ed-img-tray img:hover { opacity: .6; }
  #ann-editor-panel .ed-input-bottom {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 10px; border-top: 1px solid #f1f5f9;
  }
  #ann-editor-panel .ed-input-bottom .upload-btn {
    border: none; background: none; cursor: pointer; font-size: 12px; color: #94a3b8;
    padding: 2px 6px; border-radius: 4px;
  }
  #ann-editor-panel .ed-input-bottom .upload-btn:hover { background: #f1f5f9; color: #64748b; }
  #ann-editor-panel .ed-input-bottom .hint { font-size: 11px; color: #cbd5e1; }
  #ann-editor-panel .ed-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
  #ann-editor-panel .ed-actions button {
    padding: 7px 18px; border-radius: 7px; font-size: 13px; cursor: pointer;
    font-weight: 500; border: 1px solid #e2e8f0; background: #fff; color: #64748b;
  }
  #ann-editor-panel .ed-actions button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
  #ann-editor-panel .ed-actions button.primary:hover { background: #1d4ed8; }

  /* --- Cards --- */
  .ann-card {
    border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;
    margin-bottom: 8px; cursor: pointer; transition: all .15s; background: #fff;
  }
  .ann-card:hover { border-color: #cbd5e1; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
  .ann-card.active { border-color: #f97316; box-shadow: 0 0 0 2px rgba(249,115,22,.15); }
  .ann-card.resolved { opacity: .45; }
  .ann-card .ac-quote {
    font-size: 12px; color: #64748b; border-left: 3px solid #e2e8f0;
    padding: 4px 8px; margin-bottom: 8px; line-height: 1.5;
    max-height: 56px; overflow: hidden; background: #f8fafc; border-radius: 0 4px 4px 0;
  }
  .ann-card .ac-comment {
    font-size: 13px; line-height: 1.6; color: #1e293b; margin-bottom: 8px;
    white-space: pre-wrap; max-height: 80px; overflow: hidden; transition: max-height .25s ease;
  }
  .ann-card .ac-comment.expanded { max-height: 2000px; }
  .ann-card .ac-toggle {
    font-size: 11px; color: #3b82f6; cursor: pointer; margin: -4px 0 8px;
    display: none; user-select: none;
  }
  .ann-card .ac-toggle:hover { text-decoration: underline; }
  .ann-card .ac-images { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
  .ann-card .ac-images img {
    max-width: 120px; max-height: 80px; border-radius: 6px;
    border: 1px solid #e2e8f0; cursor: zoom-in; object-fit: cover;
  }
  .ann-card .ac-meta {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 11px; color: #94a3b8;
  }
  .ann-card .ac-actions button {
    border: none; background: none; font-size: 11px; cursor: pointer;
    padding: 2px 8px; border-radius: 4px; color: #64748b;
  }
  .ann-card .ac-actions button:hover { background: #f1f5f9; }
  .ann-card .ac-actions .resolve-btn { color: #059669; }
  .ann-card .ac-actions .edit-btn { color: #2563eb; }

  #ann-lightbox {
    position: fixed; inset: 0; background: rgba(0,0,0,.8);
    z-index: 10001; display: none; align-items: center; justify-content: center; cursor: zoom-out;
  }
  #ann-lightbox.show { display: flex; }
  #ann-lightbox img { max-width: 90vw; max-height: 90vh; border-radius: 8px; }

  .ann-empty { text-align: center; padding: 40px 20px; color: #94a3b8; font-size: 13px; }
  .ann-empty .icon { font-size: 28px; margin-bottom: 6px; }
    `;
    document.head.appendChild(s);
  }

  // --- HTML injection ---
  function injectHTML() {
    const toolbar = document.createElement('div');
    toolbar.id = 'ann-toolbar';
    toolbar.innerHTML = `
      <span class="atb-title">批注模式</span>
      <span id="ann-badge" class="badge" style="display:none">0</span>
      <span class="spacer"></span>
      <button onclick="ANN.setFilter('all')" id="f-all">全部</button>
      <button onclick="ANN.setFilter('open')" id="f-open">未解决</button>
      <button onclick="ANN.exportJSON()" class="primary">导出 JSON</button>
      <button onclick="ANN.copyJSON()">复制到剪贴板</button>
      <button class="toggle-sb" onclick="ANN.toggleSidebar()" title="收起/展开批注列表">◨</button>
    `;
    document.body.appendChild(toolbar);

    const floatBtn = document.createElement('button');
    floatBtn.id = 'ann-float-btn';
    floatBtn.textContent = '+ 添加批注';
    floatBtn.onmousedown = e => e.preventDefault();
    floatBtn.onclick = () => openEditor();
    document.body.appendChild(floatBtn);

    const sidebar = document.createElement('div');
    sidebar.id = 'ann-sidebar';
    sidebar.innerHTML = `
      <div class="sb-header">批注列表 <span class="sb-count" id="sb-count">0 条</span></div>
      <div class="sb-tabs" id="sb-tabs">
        <button class="active" id="tab-all" onclick="ANN.setFilter('all')">全部</button>
        <button id="tab-open" onclick="ANN.setFilter('open')">未解决</button>
        <button id="tab-resolved" onclick="ANN.setFilter('resolved')">已解决</button>
      </div>
      <div id="ann-editor-panel">
        <div class="ed-header" id="ed-header">添加批注</div>
        <div class="ed-quote" id="ed-quote"></div>
        <div class="ed-input-box">
          <textarea id="ed-comment" placeholder="输入评论..."></textarea>
          <div class="ed-img-tray" id="ed-img-tray"></div>
          <div class="ed-input-bottom">
            <button class="upload-btn" onclick="document.getElementById('ed-img-input').click()">📎 上传图片</button>
            <input type="file" id="ed-img-input" accept="image/*" multiple style="display:none" onchange="ANN.onFileInput(event)">
            <span class="hint">⌘+Enter 提交 · ⌘+V 粘贴图片</span>
          </div>
        </div>
        <div class="ed-actions">
          <button onclick="ANN.closeEditor()">取消</button>
          <button class="primary" onclick="ANN.submit()">提交</button>
        </div>
      </div>
      <div class="ann-list" id="ann-list"></div>
    `;
    document.body.appendChild(sidebar);

    const lightbox = document.createElement('div');
    lightbox.id = 'ann-lightbox';
    lightbox.onclick = () => lightbox.classList.remove('show');
    lightbox.innerHTML = '<img id="lb-img" src="">';
    document.body.appendChild(lightbox);
  }

  // --- Helpers ---
  function gid() { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'); }

  // --- Sidebar open/close ---
  function expandSidebar() {
    if (!sidebarOpen) {
      sidebarOpen = true;
      document.getElementById('ann-sidebar').classList.remove('collapsed');
      document.body.classList.remove('sb-collapsed');
    }
  }

  // --- Storage (HTTP API) ---
  async function save() {
    const data = anns.map(a => ({
      id: a.id, selectedText: a.selectedText, comment: a.comment,
      images: a.images, resolved: a.resolved, createdAt: a.createdAt
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
      if (e.key === 'Escape') { closeEditor(); document.getElementById('ann-lightbox').classList.remove('show'); }
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
  }

  function onUp(e) {
    if (e.target.closest('#ann-sidebar,#ann-toolbar,#ann-float-btn')) return;
    const sel = window.getSelection(), text = sel?.toString().trim();
    const btn = document.getElementById('ann-float-btn');
    if (text && sel.rangeCount > 0) {
      if (btnJustHidden && text === pendingText) { btnJustHidden = false; return; }
      btnJustHidden = false;
      const r = sel.getRangeAt(0);
      const body = document.body;
      if (r.commonAncestorContainer === body ||
          e.target.closest('#ann-sidebar,#ann-toolbar')) return;
      pendingRange = r.cloneRange(); pendingText = text;
      btn.style.left = (e.clientX + window.scrollX - 8) + 'px';
      btn.style.top = (e.clientY + window.scrollY - 24) + 'px';
      btn.style.display = 'block';
    }
  }

  // --- Highlight (TreeWalker, text-node only) ---
  function hlRange(range, id) {
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
      const mid = tn.splitText(start);
      mid.splitText(end - start);
      const sp = document.createElement('span');
      sp.className = 'ann-hl'; sp.dataset.annId = id;
      sp.addEventListener('click', () => focusCard(id));
      mid.parentNode.insertBefore(sp, mid);
      sp.appendChild(mid);
    });
  }

  function removeHl(id) {
    document.querySelectorAll(`span.ann-hl[data-ann-id="${id}"]`).forEach(sp => {
      const p = sp.parentNode;
      while (sp.firstChild) p.insertBefore(sp.firstChild, sp);
      p.removeChild(sp); p.normalize();
    });
  }

  // --- Editor (in sidebar) ---
  function openEditor() {
    if (!pendingText && !editingId) return;
    document.getElementById('ann-float-btn').style.display = 'none';
    expandSidebar();
    const a = editingId ? anns.find(x => x.id === editingId) : null;
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
    document.getElementById('ann-editor-panel').classList.remove('active');
    document.getElementById('sb-tabs').style.display = '';
    document.getElementById('ann-list').style.display = '';
    imgs = []; pendingRange = null; pendingText = ''; editingId = null;
  }

  function submit() {
    const c = document.getElementById('ed-comment').value.trim();
    if (!c && imgs.length === 0) return;
    if (editingId) {
      const a = anns.find(x => x.id === editingId);
      if (a) { a.comment = c; a.images = [...imgs]; }
      save(); render(); closeEditor(); return;
    }
    const id = gid();
    anns.push({ id, selectedText: pendingText, comment: c, images: [...imgs], resolved: false, createdAt: Date.now() });
    if (pendingRange) try { hlRange(pendingRange, id); } catch (e) { console.warn(e); }
    save(); render(); closeEditor();
    setTimeout(() => focusCard(id), 150);
  }

  function startEdit(id) { editingId = id; pendingText = ''; openEditor(); }

  // --- Images ---
  function toB64(f) {
    const r = new FileReader();
    r.onload = e => { imgs.push(e.target.result); renderTray(); };
    r.readAsDataURL(f);
  }
  function onFileInput(e) { for (const f of e.target.files) if (f.type.startsWith('image/')) toB64(f); e.target.value = ''; }
  function renderTray() {
    const t = document.getElementById('ed-img-tray');
    t.innerHTML = imgs.map((s, i) =>
      `<img src="${s}" title="点击移除" onclick="event.stopPropagation();ANN._rmImg(${i})">`
    ).join('');
  }
  function _rmImg(i) { imgs.splice(i, 1); renderTray(); }

  // --- Sidebar toggle ---
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    document.getElementById('ann-sidebar').classList.toggle('collapsed', !sidebarOpen);
    document.body.classList.toggle('sb-collapsed', !sidebarOpen);
  }

  // --- Render ---
  function render() {
    const list = document.getElementById('ann-list');
    const f = anns.filter(a =>
      filter === 'all' ? true : filter === 'open' ? !a.resolved : a.resolved
    );
    const oc = anns.filter(a => !a.resolved).length;
    const b = document.getElementById('ann-badge');
    b.textContent = oc; b.style.display = oc > 0 ? '' : 'none';
    document.getElementById('sb-count').textContent = `${f.length} 条`;
    ['all', 'open', 'resolved'].forEach(k => {
      const tb = document.getElementById('tab-' + k);
      if (tb) tb.className = filter === k ? 'active' : '';
    });
    document.getElementById('f-all').className = filter === 'all' ? 'active' : '';
    document.getElementById('f-open').className = filter === 'open' ? 'active' : '';
    if (f.length === 0) {
      list.innerHTML = '<div class="ann-empty"><div class="icon">💬</div>' + (
        filter === 'all' ? '选中文字即可添加批注' : '暂无' + (filter === 'open' ? '未解决' : '已解决') + '的批注'
      ) + '</div>';
      return;
    }
    list.innerHTML = f.map(a => {
      const idx = anns.indexOf(a) + 1;
      return `<div class="ann-card ${a.resolved ? 'resolved' : ''}" id="card-${a.id}" onclick="ANN.focusHl('${a.id}')">
        <div class="ac-quote">${esc(a.selectedText)}</div>
        ${a.comment ? `<div class="ac-comment">${esc(a.comment)}</div><div class="ac-toggle" onclick="event.stopPropagation();ANN.toggleComment(this)">展开 ▾</div>` : ''}
        ${a.images.length ? `<div class="ac-images">${a.images.map(s =>
          `<img src="${s}" onclick="event.stopPropagation();ANN.lb('${s.replace(/'/g, "\\'")}')">`
        ).join('')}</div>` : ''}
        <div class="ac-meta">
          <span>#${idx}</span>
          <div class="ac-actions">
            <button class="edit-btn" onclick="event.stopPropagation();ANN.startEdit('${a.id}')">编辑</button>
            <button class="resolve-btn" onclick="event.stopPropagation();ANN.resolve('${a.id}')">
              ${a.resolved ? '↩ 重开' : '✓ 解决'}
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
    el.textContent = expanded ? '收起 ▴' : '展开 ▾';
  }

  function resolve(id) {
    const a = anns.find(x => x.id === id); if (!a) return;
    a.resolved = !a.resolved;
    if (a.resolved) {
      removeHl(id);
    }
    save(); render();
  }

  function setFilter(f) { filter = f; render(); }

  function focusCard(id) {
    document.querySelectorAll('.ann-card.active').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('span.ann-hl.active').forEach(m => m.classList.remove('active'));
    const card = document.getElementById('card-' + id);
    if (card) { card.classList.add('active'); card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    document.querySelectorAll(`span.ann-hl[data-ann-id="${id}"]`).forEach(s => s.classList.add('active'));
  }

  function focusHl(id) {
    document.querySelectorAll('.ann-card.active').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('span.ann-hl.active').forEach(m => m.classList.remove('active'));
    const card = document.getElementById('card-' + id);
    if (card) card.classList.add('active');
    const hls = document.querySelectorAll(`span.ann-hl[data-ann-id="${id}"]`);
    hls.forEach(s => s.classList.add('active'));
    if (hls.length) hls[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function lb(s) { document.getElementById('lb-img').src = s; document.getElementById('ann-lightbox').classList.add('show'); }

  function buildExport() {
    return anns.map((a, i) => ({
      index: i + 1, selectedText: a.selectedText, comment: a.comment,
      images: a.images, resolved: a.resolved
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
      const b = document.querySelector('#ann-toolbar .primary');
      const o = b.textContent; b.textContent = '已复制 ✓'; setTimeout(() => b.textContent = o, 1500);
    });
  }

  // --- Restore highlights from loaded data ---
  function restoreHighlights() {
    anns.forEach(a => {
      if (a.resolved) return;
      const tns = [];
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: n => {
          const el = n.parentElement;
          if (!el || el.closest('#ann-sidebar,#ann-toolbar,#ann-editor-panel,script,style,title,noscript')) return NodeFilter.FILTER_REJECT;
          return el.offsetParent !== null ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      // Avoid highlighting inside existing highlights
      while (tw.nextNode()) {
        if (tw.currentNode.parentElement && tw.currentNode.parentElement.classList.contains('ann-hl')) continue;
        const idx = tw.currentNode.textContent.indexOf(a.selectedText);
        if (idx !== -1) {
          const r = document.createRange();
          r.setStart(tw.currentNode, idx);
          r.setEnd(tw.currentNode, idx + a.selectedText.length);
          try { hlRange(r, a.id); } catch(e) { /* ignore */ }
          return; // first match only
        }
      }
    });
  }

  // --- Init ---
  async function init() {
    injectCSS();
    injectHTML();
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
