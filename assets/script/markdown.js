/**
 * 小型可信 Markdown 渲染器，覆盖博客常用语法。
 * Markdown 来自站点维护者本地文件，不接受访客输入。
 */
function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeURL(value, kind = 'href') {
  const decoded = String(value).replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').trim();
  if (/^(?:javascript|vbscript|data):/i.test(decoded)) return '#';
  // 图片允许 HTTPS、站点绝对路径和普通相对路径；拒绝 file:/ftp: 等非网页资源协议。
  if (kind === 'src' && /^[a-z][a-z\d+.-]*:/i.test(decoded) && !/^https?:/i.test(decoded)) return '#';
  return escapeHTML(value);
}

function slugify(text, index) {
  const slug = text.toLocaleLowerCase('zh-CN')
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return slug || `section-${index}`;
}

function inline(source) {
  const tokens = [];
  let text = escapeHTML(source);
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const key = `\u0000${tokens.length}\u0000`;
    tokens.push(`<code>${code}</code>`);
    return key;
  });
  text = text
    .replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, url) => `<img src="${safeURL(url, 'src')}" alt="${alt}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, label, url) => `<a href="${safeURL(url)}" rel="noopener">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');
  tokens.forEach((token, index) => { text = text.replace(`\u0000${index}\u0000`, token); });
  return text;
}

function stripFrontMatter(markdown) {
  return markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, '');
}

/**
 * 文章页面已经由模板输出标题；若 Markdown 仍保留同名一级标题，去掉它以避免重复 h1。
 * 标题不一致时保留原文，方便作者在正文中使用自定义一级标题。
 */
export function withoutLeadingTitle(markdown, title = '') {
  const body = stripFrontMatter(markdown);
  const match = body.match(/^\s*#\s+([^\r\n]+)\s*(?:\r?\n|$)/);
  if (!match) return body;
  const heading = match[1].replace(/[*_`]/g, '').trim();
  if (!title || heading !== String(title).trim()) return body;
  return body.slice(match[0].length).replace(/^\s*\r?\n/, '');
}

export function renderMarkdown(markdown, options = {}) {
  const lines = stripFrontMatter(markdown).replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const toc = [];
  const usedIds = new Set();
  let paragraph = [];
  let listType = '';
  let inCode = false;
  let codeLanguage = '';
  let codeLines = [];
  let quoteLines = [];

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (listType) html.push(`</${listType}>`);
    listType = '';
  };
  const flushQuote = () => {
    if (quoteLines.length) html.push(`<blockquote><p>${inline(quoteLines.join(' '))}</p></blockquote>`);
    quoteLines = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fence = line.match(/^```\s*([\w-]*)/);
    if (fence) {
      flushParagraph(); closeList(); flushQuote();
      if (!inCode) {
        inCode = true;
        codeLanguage = fence[1] || 'text';
        codeLines = [];
      } else {
        html.push(`<pre data-language="${escapeHTML(codeLanguage)}"><code>${escapeHTML(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (/^\s*$/.test(line)) {
      flushParagraph(); closeList(); flushQuote();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(); closeList(); flushQuote();
      const level = heading[1].length;
      let id = slugify(heading[2], toc.length + 1);
      if (usedIds.has(id)) id = `${id}-${toc.length + 1}`;
      usedIds.add(id);
      html.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);
      if (level >= 2) toc.push({ level, id, text: heading[2].replace(/[*_`]/g, '') });
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph(); closeList(); flushQuote(); html.push('<hr>'); continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph(); closeList(); quoteLines.push(line.slice(2)); continue;
    }
    flushQuote();

    const list = line.match(/^\s*([-*+] |\d+\. )(.+)$/);
    if (list) {
      flushParagraph();
      const nextType = /^\d/.test(list[1]) ? 'ol' : 'ul';
      if (listType !== nextType) { closeList(); listType = nextType; html.push(`<${listType}>`); }
      html.push(`<li>${inline(list[2])}</li>`);
      continue;
    }
    closeList();

    // GitHub 风格的简单表格。
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-+/.test(lines[i + 1])) {
      flushParagraph();
      const headers = line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(lines[i].replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
        i += 1;
      }
      i -= 1;
      html.push(`<table><thead><tr>${headers.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCode) html.push(`<pre data-language="${escapeHTML(codeLanguage)}"><code>${escapeHTML(codeLines.join('\n'))}</code></pre>`);
  flushParagraph(); closeList(); flushQuote();
  let renderedHTML = html.join('\n');
  const assetPrefix = String(options.assetPrefix || '');
  if (assetPrefix) {
    renderedHTML = renderedHTML.replace(/\bsrc="([^"]+)"/g, (match, source) => {
      if (/^(?:https?:|\/|#|data:)/i.test(source) || source.startsWith('../')) return match;
      return `src="${assetPrefix}${source.replace(/^\.\//, '')}"`;
    });
  }
  return { html: renderedHTML, toc };
}
