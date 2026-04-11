// content-script.js - JSON Formatter Extension
// Detects JSON pages and replaces them with a rich interactive viewer

(function() {
  'use strict';

  // ── Security Constants ──────────────────────────────────────────
  const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10 MB limit
  const MAX_DEPTH = 5000;                  // Prevent stack overflow

  // ── JSON Detection ──────────────────────────────────────────────
  function detectJSON() {
    // Check content type
    const isJSONContentType = (document.contentType || '').includes('json');

    // Check if page is a single <pre> with JSON content
    const pre = document.querySelector('body > pre');
    const isSinglePre = document.body.children.length === 1 && pre instanceof HTMLPreElement;

    // Must be either JSON content-type OR a single <pre> element
    if (!isJSONContentType && !isSinglePre) return null;

    // Get the raw text content
    const rawText = (pre ? pre.textContent : document.body.textContent || '').trim();
    if (!rawText) return null;

    // Enforce size limit before parsing
    if (rawText.length > MAX_JSON_SIZE) {
      console.warn('JSON Formatter: JSON too large (' + rawText.length + ' bytes), skipping');
      return null;
    }

    // Try to parse as JSON
    try {
      const data = JSON.parse(rawText);
      // Must be an object or array
      if (data === null || typeof data !== 'object') return null;
      return { data, rawText };
    } catch (e) {
      return null;
    }
  }

  // ── Initialize ──────────────────────────────────────────────────
  function init() {
    const result = detectJSON();
    if (!result) return;

    const { data, rawText } = result;

    // Expose data to console
    window.jsonData = data;
    window.data = data;
    console.log('[JSON Formatter] Data available as window.data');

    // Clear page completely
    document.documentElement.innerHTML = '';

    // Build the viewer
    const head = document.createElement('head');
    const body = document.createElement('body');
    document.documentElement.appendChild(head);
    document.documentElement.appendChild(body);

    // Load stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = browser.runtime.getURL('styles.css');
    head.appendChild(link);

    // Create root element
    const root = document.createElement('div');
    root.id = 'jf-root';
    root.dataset.theme = getTheme();
    body.appendChild(root);

    // Build complete UI
    buildViewer(root, data, rawText);
  }

  // ── Theme Management ────────────────────────────────────────────
  // Use a simple in-memory default since we don't have storage permission in MV3
  // Theme preference is stored in the extension's own storage, not page localStorage
  let _themeOverride = null;

  function getTheme() {
    if (_themeOverride) return _themeOverride;
    try {
      return localStorage.getItem('jf-theme') || 'auto';
    } catch {
      return 'auto';
    }
  }

  function cycleTheme() {
    const themes = ['auto', 'dark', 'light'];
    const current = getTheme();
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    try {
      localStorage.setItem('jf-theme', next);
    } catch { /* localStorage may be blocked */ }
    _themeOverride = next;
    const root = document.getElementById('jf-root');
    if (root) root.dataset.theme = next;
    return next;
  }

  // ── Build Viewer ────────────────────────────────────────────────
  function buildViewer(root, data, rawText) {
    const formatted = JSON.stringify(data, null, 2);

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'jf-toolbar';

    // Info section
    const info = document.createElement('span');
    info.id = 'jf-info';
    toolbar.appendChild(info);

    // Level controls
    const levels = document.createElement('div');
    levels.id = 'jf-levels';
    levels.innerHTML = '<span>Level:</span>';
    toolbar.appendChild(levels);

    // View mode buttons
    const viewPicker = document.createElement('div');
    viewPicker.id = 'jf-view-picker';
    ['tree', 'formatted', 'raw'].forEach(mode => {
      const btn = document.createElement('button');
      btn.className = 'jf-view-btn' + (mode === 'tree' ? ' jf-active' : '');
      btn.dataset.view = mode;
      btn.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
      btn.addEventListener('click', () => switchView(mode));
      viewPicker.appendChild(btn);
    });
    toolbar.appendChild(viewPicker);

    // Actions
    const actions = document.createElement('div');
    actions.id = 'jf-actions';

    const copyBtn = document.createElement('button');
    copyBtn.id = 'jf-copy';
    copyBtn.textContent = 'Copy';
    copyBtn.title = 'Copy JSON to clipboard';
    copyBtn.addEventListener('click', () => copyJSON(formatted, copyBtn));
    actions.appendChild(copyBtn);

    const themeBtn = document.createElement('button');
    themeBtn.id = 'jf-theme-btn';
    themeBtn.textContent = getThemeLabel(getTheme());
    themeBtn.title = 'Toggle theme';
    themeBtn.addEventListener('click', () => {
      const next = cycleTheme();
      themeBtn.textContent = getThemeLabel(next);
    });
    actions.appendChild(themeBtn);

    toolbar.appendChild(actions);
    root.appendChild(toolbar);

    // Content area
    const content = document.createElement('div');
    content.id = 'jf-content';
    root.appendChild(content);

    // Create three view panels
    const treePanel = document.createElement('div');
    treePanel.id = 'jf-tree';
    treePanel.className = 'jf-panel jf-active';
    content.appendChild(treePanel);

    const formattedPanel = document.createElement('div');
    formattedPanel.id = 'jf-formatted';
    formattedPanel.className = 'jf-panel';
    formattedPanel.textContent = formatted;
    content.appendChild(formattedPanel);

    const rawPanel = document.createElement('div');
    rawPanel.id = 'jf-raw';
    rawPanel.className = 'jf-panel';
    rawPanel.textContent = JSON.stringify(data);
    content.appendChild(rawPanel);

    // Path display bar
    const pathBar = document.createElement('div');
    pathBar.id = 'jf-path-bar';

    const pathText = document.createElement('span');
    pathText.id = 'jf-path-text';
    pathBar.appendChild(pathText);

    const pathCopyBtn = document.createElement('button');
    pathCopyBtn.id = 'jf-path-copy';
    pathCopyBtn.textContent = 'Copy';
    pathCopyBtn.title = 'Copy path';
    pathCopyBtn.addEventListener('click', () => {
      const path = pathText.textContent;
      if (path) {
        navigator.clipboard.writeText(path);
        pathCopyBtn.textContent = 'OK';
        setTimeout(() => pathCopyBtn.textContent = 'Copy', 1000);
      }
    });
    pathBar.appendChild(pathCopyBtn);

    content.appendChild(pathBar);

    // Render tree
    const { maxDepth, totalKeys } = renderTree(treePanel, data);
    info.textContent = `${totalKeys} nodes · ${maxDepth} level${maxDepth !== 1 ? 's' : ''} deep`;

    // Build level buttons
    const maxLevelBtns = Math.min(maxDepth, 10);
    for (let i = 1; i <= maxLevelBtns; i++) {
      const btn = document.createElement('button');
      btn.textContent = i.toString();
      btn.title = `Expand to level ${i}`;
      btn.addEventListener('click', () => {
        expandToLevel(treePanel, i);
        setActiveLevelBtn(btn);
      });
      levels.appendChild(btn);
    }

    const allBtn = document.createElement('button');
    allBtn.textContent = 'All';
    allBtn.title = 'Expand all';
    allBtn.addEventListener('click', () => {
      expandAll(treePanel);
      setActiveLevelBtn(allBtn);
    });
    levels.appendChild(allBtn);

    // Set active button
    setActiveLevelBtn(allBtn);

    // Path tracking
    setupPathTracking(treePanel, pathText, pathBar);

    // Tree click handlers
    treePanel.addEventListener('click', e => {
      // Toggle collapse
      if (e.target.classList.contains('jf-toggle')) {
        const line = e.target.closest('.jf-line');
        if (line) toggleLine(line);
      }

      // Expand/collapse all children
      if (e.target.classList.contains('jf-expand-children')) {
        const line = e.target.closest('.jf-line');
        if (line) expandCollapseChildren(line);
      }

      // Copy node JSON
      if (e.target.classList.contains('jf-copy-node')) {
        const line = e.target.closest('.jf-line');
        if (line) copyNodeJSON(line, data, e.target);
      }
    });

    // Inject page script for console access
    injectPageScript(rawText);
  }

  // ── Tree Rendering ──────────────────────────────────────────────
  let globalMaxDepth = 0;
  let globalTotalKeys = 0;

  function renderTree(container, data) {
    globalMaxDepth = 0;
    globalTotalKeys = 0;
    container.innerHTML = '';

    const rootNode = renderValue(null, data, 'data', 0, true, false);
    container.appendChild(rootNode);

    return { maxDepth: globalMaxDepth, totalKeys: globalTotalKeys };
  }

  function renderValue(key, value, path, depth, isLast, isRoot) {
    globalMaxDepth = Math.max(globalMaxDepth, depth);

    // Enforce depth limit to prevent stack overflow
    if (depth > MAX_DEPTH) {
      const line = document.createElement('div');
      line.className = 'jf-line';
      line.dataset.path = path;
      line.dataset.depth = depth;
      const spacer = document.createElement('span');
      spacer.className = 'jf-spacer';
      line.appendChild(spacer);
      const msg = document.createElement('span');
      msg.className = 'jf-null';
      msg.textContent = '"(max depth reached)"';
      line.appendChild(msg);
      return line;
    }

    const line = document.createElement('div');
    line.className = 'jf-line';
    line.dataset.path = path;
    line.dataset.depth = depth;

    const type = getValueType(value);
    const isExpandable = type === 'object' || type === 'array';
    const comma = isLast ? '' : ',';

    // Toggle
    if (isExpandable) {
      const toggle = document.createElement('span');
      toggle.className = 'jf-toggle';
      line.appendChild(toggle);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'jf-spacer';
      line.appendChild(spacer);
    }

    // Key
    if (!isRoot) {
      globalTotalKeys++;
      const keySpan = document.createElement('span');
      keySpan.className = 'jf-key';
      keySpan.textContent = isRootKey(key) ? key : `"${key}"`;
      line.appendChild(keySpan);

      const colon = document.createElement('span');
      colon.className = 'jf-colon';
      colon.textContent = ': ';
      line.appendChild(colon);
    }

    // Value
    if (value === null) {
      const nullSpan = document.createElement('span');
      nullSpan.className = 'jf-null';
      nullSpan.textContent = 'null';
      line.appendChild(nullSpan);
    } else if (typeof value === 'boolean') {
      const boolSpan = document.createElement('span');
      boolSpan.className = 'jf-bool';
      boolSpan.textContent = value.toString();
      line.appendChild(boolSpan);
    } else if (typeof value === 'number') {
      const numSpan = document.createElement('span');
      numSpan.className = 'jf-number';
      numSpan.textContent = value.toString();
      line.appendChild(numSpan);
    } else if (typeof value === 'string') {
      const strWrapper = document.createElement('span');
      strWrapper.className = 'jf-string';
      const safeURL = sanitizeURL(value);
      if (safeURL) {
        const link = document.createElement('a');
        link.className = 'jf-link';
        link.href = safeURL;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `"${value}"`;
        strWrapper.appendChild(link);
      } else {
        strWrapper.textContent = `"${value}"`;
      }
      line.appendChild(strWrapper);
    } else if (isExpandable) {
      const count = getCount(value);
      const openBracket = type === 'array' ? '[' : '{';
      const closeBracket = type === 'array' ? ']' : '}';
      const label = type === 'array' ? 'items' : 'keys';
      const hasNested = hasNestedObjects(value);

      // Header — use DOM methods, never innerHTML with untrusted data
      const header = document.createElement('span');
      header.className = 'jf-header';
      header.textContent = openBracket;
      if (count > 0) {
        const countSpan = document.createElement('span');
        countSpan.className = 'jf-count';
        countSpan.textContent = ` ${count} ${label}`;
        header.appendChild(countSpan);
      }
      line.appendChild(header);

      // Preview (shown when collapsed)
      const preview = document.createElement('span');
      preview.className = 'jf-preview';
      preview.textContent = getPreview(value, 80);
      line.appendChild(preview);

      // Inline actions
      const actions = document.createElement('span');
      actions.className = 'jf-inline-actions';

      if (hasNested) {
        const expandBtn = document.createElement('button');
        expandBtn.className = 'jf-copy-node';
        expandBtn.textContent = '{}';
        expandBtn.title = 'Copy this node as JSON';
        actions.appendChild(expandBtn);

        const toggleChildrenBtn = document.createElement('button');
        toggleChildrenBtn.className = 'jf-expand-children';
        toggleChildrenBtn.textContent = '[+]';
        toggleChildrenBtn.title = 'Expand/collapse all children';
        actions.appendChild(toggleChildrenBtn);
      }

      line.appendChild(actions);

      // Children
      const children = document.createElement('div');
      children.className = 'jf-children';

      if (type === 'array') {
        value.forEach((item, index) => {
          const childPath = `${path}[${index}]`;
          const childNode = renderValue(index.toString(), item, childPath, depth + 1, index === value.length - 1, false);
          children.appendChild(childNode);
        });
      } else {
        const keys = Object.keys(value);
        keys.forEach((k, index) => {
          const childPath = path === 'data' ? `data.${k}` : `${path}.${k}`;
          const childNode = renderValue(k, value[k], childPath, depth + 1, index === keys.length - 1, false);
          children.appendChild(childNode);
        });
      }

      // Close bracket
      const closeDiv = document.createElement('div');
      closeDiv.className = 'jf-close-bracket';
      closeDiv.textContent = `${closeBracket}${comma}`;
      children.appendChild(closeDiv);

      line.appendChild(children);
    } else {
      // Add comma for primitives
      if (comma) {
        const commaSpan = document.createElement('span');
        commaSpan.className = 'jf-comma';
        commaSpan.textContent = comma;
        line.appendChild(commaSpan);
      }
    }

    return line;
  }

  // ── Utility Functions ───────────────────────────────────────────
  function getValueType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  function getCount(value) {
    if (Array.isArray(value)) return value.length;
    if (value !== null && typeof value === 'object') return Object.keys(value).length;
    return 0;
  }

  function hasNestedObjects(value) {
    if (Array.isArray(value)) return value.some(v => v !== null && typeof v === 'object');
    if (value !== null && typeof value === 'object') return Object.values(value).some(v => v !== null && typeof v === 'object');
    return false;
  }

  function getPreview(value, maxLength) {
    if (Array.isArray(value)) {
      return value.slice(0, 3).map(v => JSON.stringify(v)).join(', ') + (value.length > 3 ? ', …' : '');
    }
    if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value).slice(0, 3);
      return keys.join(', ') + (Object.keys(value).length > 3 ? ', …' : '');
    }
    return '';
  }

  function isRootKey(key) {
    return typeof key === 'number' || /^\d+$/.test(key);
  }

  function sanitizeURL(url) {
    // Only allow http/https URLs
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return parsed.href;
    } catch {
      return null;
    }
  }

  // ── Tree Interactions ───────────────────────────────────────────
  function toggleLine(line) {
    const children = line.querySelector(':scope > .jf-children');
    if (!children) return;

    const isCollapsed = children.classList.toggle('jf-collapsed');
    line.classList.toggle('jf-collapsed', isCollapsed);
  }

  function expandCollapseChildren(line) {
    const children = line.querySelector(':scope > .jf-children');
    if (!children) return;

    const collapsedChildren = children.querySelectorAll('.jf-children.jf-collapsed');
    const allChildren = children.querySelectorAll('.jf-children');
    const shouldExpand = collapsedChildren.length > 0;

    allChildren.forEach(child => {
      child.classList.toggle('jf-collapsed', !shouldExpand);
      const childLine = child.closest('.jf-line');
      if (childLine) childLine.classList.toggle('jf-collapsed', !shouldExpand);
    });

    children.classList.remove('jf-collapsed');
    line.classList.remove('jf-collapsed');
  }

  function expandToLevel(container, level) {
    container.querySelectorAll('.jf-line').forEach(line => {
      const depth = parseInt(line.dataset.depth || '0', 10);
      const children = line.querySelector(':scope > .jf-children');
      if (children) {
        const shouldCollapse = depth >= level;
        children.classList.toggle('jf-collapsed', shouldCollapse);
        line.classList.toggle('jf-collapsed', shouldCollapse);
      }
    });
  }

  function expandAll(container) {
    container.querySelectorAll('.jf-children, .jf-line').forEach(el => {
      el.classList.remove('jf-collapsed');
    });
  }

  function copyNodeJSON(line, data, btn) {
    const path = line.dataset.path;
    if (!path) return;

    const value = getValueAtPath(data, path);
    if (value === undefined) return;

    navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    const original = btn.textContent;
    btn.textContent = 'OK';
    setTimeout(() => btn.textContent = original, 1000);
  }

  // ── Path Parsing ────────────────────────────────────────────────
  function parsePath(pathStr) {
    const parts = [];
    const regex = /([^[.\]]+)|\[(\d+|"(?:[^"\\]|\\.)*")\]/g;
    let match = regex.exec(pathStr);

    while (match) {
      if (match[1]) parts.push(match[1]);
      else if (match[2]) {
        if (match[2].startsWith('"')) {
          try { parts.push(JSON.parse(match[2])); } catch { return []; }
        } else {
          parts.push(match[2]);
        }
      }
      match = regex.exec(pathStr);
    }

    // Skip 'data' prefix
    if (parts[0] === 'data') parts.shift();
    return parts;
  }

  function getValueAtPath(data, pathStr) {
    const parts = parsePath(pathStr);
    if (!parts.length && pathStr !== 'data') return undefined;

    let current = data;
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return undefined;
      if (Array.isArray(current)) {
        if (!/^\d+$/.test(part)) return undefined;
        current = current[Number(part)];
      } else {
        current = current[part];
      }
      if (current === undefined) return undefined;
    }
    return current;
  }

  // ── Path Tracking ───────────────────────────────────────────────
  function setupPathTracking(treePanel, pathText, pathBar) {
    let pinned = false;

    treePanel.addEventListener('mouseover', e => {
      const line = e.target.closest('.jf-line');
      if (!line || pinned) return;

      const path = line.dataset.path;
      if (path) {
        pathText.textContent = path;
        pathBar.classList.add('jf-visible');
        pathBar.classList.remove('jf-pinned');
      }

      // Highlight ancestors
      treePanel.querySelectorAll('.jf-current, .jf-ancestor').forEach(el => {
        el.classList.remove('jf-current', 'jf-ancestor');
      });

      line.classList.add('jf-current');
      let parent = line.parentElement;
      while (parent) {
        const parentLine = parent.closest('.jf-line');
        if (parentLine && parentLine !== line) {
          parentLine.classList.add('jf-ancestor');
          parent = parentLine.parentElement;
        } else break;
      }
    });

    treePanel.addEventListener('mouseout', e => {
      if (!treePanel.contains(e.relatedTarget)) {
        if (!pinned) {
          pathBar.classList.remove('jf-visible', 'jf-pinned');
          pathText.textContent = '';
        }
        treePanel.querySelectorAll('.jf-current, .jf-ancestor').forEach(el => {
          el.classList.remove('jf-current', 'jf-ancestor');
        });
      }
    });

    treePanel.addEventListener('click', e => {
      if (e.target.closest('.jf-toggle, .jf-inline-actions, .jf-expand-children, .jf-copy-node')) return;

      const line = e.target.closest('.jf-line');
      if (!line) return;

      const path = line.dataset.path;
      if (path) {
        pinned = !pinned;
        pathText.textContent = pinned ? path : '';
        pathBar.classList.toggle('jf-pinned', pinned);
        if (!pinned) pathBar.classList.remove('jf-visible');
      }
    });

    // Escape to unpin
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && pinned) {
        pinned = false;
        pathBar.classList.remove('jf-visible', 'jf-pinned');
        pathText.textContent = '';
      }
    });
  }

  // ── View Switching ──────────────────────────────────────────────
  function switchView(mode) {
    document.querySelectorAll('.jf-view-btn').forEach(btn => {
      btn.classList.toggle('jf-active', btn.dataset.view === mode);
    });

    document.querySelectorAll('.jf-panel').forEach(panel => {
      panel.classList.toggle('jf-active', panel.id === `jf-${mode}`);
      panel.classList.toggle('jf-hidden', panel.id !== `jf-${mode}`);
    });
  }

  // ── UI Helpers ──────────────────────────────────────────────────
  function getThemeLabel(theme) {
    const labels = { auto: '◐ Auto', dark: '☾ Dark', light: '☀ Light' };
    return labels[theme] || theme;
  }

  function copyJSON(text, btn) {
    navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = original, 1000);
  }

  function setActiveLevelBtn(btn) {
    document.querySelectorAll('#jf-levels button').forEach(b => b.classList.remove('jf-active'));
    if (btn) btn.classList.add('jf-active');
  }

  // ── Page Script Injection ───────────────────────────────────────
  function injectPageScript(rawText) {
    try {
      // Inject JSON data as a script element for page context access
      const script = document.createElement('script');
      script.type = 'application/json';
      script.id = 'jf-json-data';
      script.textContent = rawText;
      document.documentElement.appendChild(script);

      // Set window.data in the page context via a self-contained script
      const initScript = document.createElement('script');
      initScript.textContent = [
        '(function() {',
        '  try {',
        '    const el = document.getElementById("jf-json-data");',
        '    if (el) {',
        '      window.data = JSON.parse(el.textContent);',
        '      window.jsonData = window.data;',
        '    }',
        '  } catch(e) {}',
        '})();'
      ].join('\n');
      document.documentElement.appendChild(initScript);
    } catch (e) {
      console.error('Failed to inject page script:', e);
    }
  }

  // ── Start ───────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
