import { API, articlePath, searchTerms, sitePath } from './data-api.js';

export const icons = {
  search: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
  moon: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 16.2A8.5 8.5 0 0 1 7.8 4 8.5 8.5 0 1 0 20 16.2Z"/></svg>',
  top: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 14 6-6 6 6M12 8v11"/></svg>',
  font: '<span aria-hidden="true" style="font-family:serif;font-size:18px">字</span>',
  menu: '<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
};

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

export function formatDate(value, detail = false) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('zh-CN', detail ? { year: 'numeric', month: 'long', day: 'numeric' } : { month: 'short', day: 'numeric' }).format(date);
}

export function articleUrl(slug) { return articlePath(slug); }

export function cardHTML(article, delay = 0) {
  const tags = (article.tagNames || []).slice(0, 2).map((name, index) => {
    const id = article.tags[index] || '';
    return `<a href="${sitePath('pages/tag.html')}?tag=${encodeURIComponent(id)}">#${escapeHTML(name)}</a>`;
  }).join('');
  return `<article class="article-card reveal" style="transition-delay:${Math.min(delay, 5) * 65}ms">
    <div class="card-cover cover-${escapeHTML(article.cover || 'gradient-ink')}">
      <span class="cover-landscape" aria-hidden="true"></span><span class="cover-lines" aria-hidden="true"></span><span class="cover-index" aria-hidden="true">${String(delay + 1).padStart(2, '0')} / ESSAY</span><span class="cover-title" aria-hidden="true">${escapeHTML(article.categoryName)}</span><span class="cover-seal" aria-hidden="true">阅</span>
    </div>
    <div class="card-body">
      <div class="card-meta"><span>${formatDate(article.date, true)}</span><span>${escapeHTML(article.categoryName)}</span><span>${article.readingTime} 分钟</span></div>
      <h3><a href="${articleUrl(article.slug)}">${escapeHTML(article.title)}</a></h3>
      <p class="card-excerpt">${escapeHTML(article.excerpt)}</p>
      <footer class="card-footer"><span class="card-tags">${tags}</span><span class="read-more">展卷 →</span></footer>
    </div>
  </article>`;
}

const themeNames = { auto: '跟随系统', light: '月白', dark: '墨夜' };
const fontNames = { serif: '宋体', kai: '楷体', sans: '黑体' };
const fontFamilies = {
  serif: '"Noto Serif SC", "Songti SC", SimSun, serif',
  kai: '"STKaiti", "KaiTi", serif',
  sans: '"Noto Sans SC", "Microsoft YaHei", sans-serif'
};
const readPreference = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};
const savePreference = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* 私密模式或禁用存储时，仅在当前页面应用。 */ }
};

function resolveTheme(choice = readPreference('yunmo-theme', document.documentElement.dataset.defaultTheme || 'auto')) {
  const stored = Object.hasOwn(themeNames, choice) ? choice : 'auto';
  const dark = stored === 'dark' || (stored === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themeChoice = stored;
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.setAttribute('aria-label', `主题：${themeNames[stored]}，点击切换`);
    button.title = `主题：${themeNames[stored]}`;
  });
  return stored;
}

function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  const current = document.documentElement.dataset.themeChoice || 'auto';
  const next = order[(order.indexOf(current) + 1) % order.length];
  savePreference('yunmo-theme', next);
  resolveTheme(next);
}

function applyFont(choice = readPreference('yunmo-font', 'serif')) {
  const font = Object.hasOwn(fontFamilies, choice) ? choice : 'serif';
  document.documentElement.dataset.font = font;
  document.documentElement.style.setProperty('--font-body', fontFamilies[font]);
  document.querySelectorAll('[data-font-toggle]').forEach((button) => {
    button.setAttribute('aria-label', `正文字体：${fontNames[font]}，点击切换`);
    button.title = `正文字体：${fontNames[font]}`;
  });
}

function renderHeader(config, page) {
  const host = document.querySelector('#site-header');
  if (!host) return;
  const navigation = config.navigation.map((item) => `<a class="nav-link${item.page === page ? ' active' : ''}" href="${sitePath(item.url)}"${item.page === page ? ' aria-current="page"' : ''}>${escapeHTML(item.label)}</a>`).join('');
  host.className = 'site-header';
  host.innerHTML = `<div class="container nav-wrap">
    <a class="site-brand" href="${sitePath('pages/index.html')}" aria-label="${escapeHTML(config.site.name)}首页">
      <span class="brand-seal">${escapeHTML((config.site.shortName || config.site.name || '云').slice(0, 1))}</span><span class="brand-copy"><strong>${escapeHTML(config.site.name)}</strong><small>Digital Pavilion</small></span>
    </a>
    <nav class="site-nav" id="site-nav" aria-label="主导航">${navigation}</nav>
    <div class="nav-actions">
      <button class="icon-btn" type="button" data-search-open aria-label="打开全站搜索">${icons.search}</button>
      <button class="icon-btn theme-header-btn" type="button" data-theme-toggle aria-label="切换明暗主题">${icons.moon}</button>
      <button class="icon-btn menu-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="展开导航">${icons.menu}</button>
    </div>
  </div>`;
}

function renderFooter(config) {
  const host = document.querySelector('#site-footer');
  if (!host) return;
  host.className = 'site-footer';
  host.innerHTML = `<div class="container"><p class="footer-slogan">${escapeHTML(config.footer.slogan)}</p><div class="footer-meta">${escapeHTML(config.footer.copyright)} · ${escapeHTML(config.site.description)}${config.footer.icp ? ` · ${escapeHTML(config.footer.icp)}` : ''}</div></div>`;
}

function renderSearchDialog() {
  if (document.querySelector('#search-dialog')) return;
  document.body.insertAdjacentHTML('beforeend', `<dialog class="search-dialog" id="search-dialog" aria-labelledby="search-dialog-title" aria-describedby="search-dialog-hint">
    <div class="search-scroll">
      <div class="dialog-head"><h2 id="search-dialog-title">寻章摘句</h2><button class="icon-btn" type="button" data-search-close aria-label="关闭搜索">×</button></div>
      <label class="search-box">${icons.search}<span class="sr-only">搜索文章全文</span><input id="global-search" type="search" autocomplete="off" placeholder="寻一个词，或一段心事…" aria-controls="search-results"><kbd>ESC</kbd></label>
      <p class="search-hint" id="search-dialog-hint">可搜索标题、正文、分类与签笺，多个词以空格分隔。</p><p class="search-count" id="search-count" role="status" aria-live="polite" aria-atomic="true"></p><div class="search-results" id="search-results"></div>
    </div>
  </dialog>`);
}

function setupSearch(articles) {
  const dialog = document.querySelector('#search-dialog');
  const input = document.querySelector('#global-search');
  const results = document.querySelector('#search-results');
  const count = document.querySelector('#search-count');
  let previousFocus = null;
  let visibleLimit = 12;
  let searchItems = null;
  let searchPromise = null;
  let requestId = 0;
  let inputTimer = 0;
  const articleMeta = new Map(articles.map((article) => [article.slug, article]));

  const loadSearchItems = () => {
    if (!searchPromise) {
      searchPromise = API.searchIndex()
        .then((items) => items.map((item) => ({ ...articleMeta.get(item.slug), ...item })))
        .catch((error) => {
          console.warn('[云墨阁] 全文索引读取失败，已退回摘要搜索：', error);
          return articles;
        })
        .then((items) => { searchItems = items; return items; });
    }
    return searchPromise;
  };

  // 先转义每段文本，再插入高亮标记，不把搜索词当作 HTML 或正则表达式。
  const highlight = (value, terms) => {
    const text = String(value || '');
    const lower = text.toLocaleLowerCase('zh-CN');
    const ranges = [];
    terms.forEach((term) => {
      let start = lower.indexOf(term);
      while (start !== -1) {
        ranges.push([start, start + term.length]);
        start = lower.indexOf(term, start + term.length);
      }
    });
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [];
    ranges.forEach((range) => {
      const last = merged.at(-1);
      if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
      else merged.push([...range]);
    });
    let position = 0;
    const fragments = merged.map(([start, end]) => {
      const segment = `${escapeHTML(text.slice(position, start))}<mark>${escapeHTML(text.slice(start, end))}</mark>`;
      position = end;
      return segment;
    });
    return fragments.join('') + escapeHTML(text.slice(position));
  };
  const excerpt = (article, terms) => {
    const source = String(article.searchText || article.excerpt || '').replace(/\s+/g, ' ');
    const lower = source.toLocaleLowerCase('zh-CN');
    const hits = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0);
    const start = hits.length ? Math.max(0, Math.min(...hits) - 32) : 0;
    return `${start ? '…' : ''}${source.slice(start, start + 140)}${source.length > start + 140 ? '…' : ''}`;
  };

  const showResults = async (query = '') => {
    const currentRequest = ++requestId;
    const terms = searchTerms(query);
    if (terms.length && !searchItems) count.textContent = '正在翻检全文索引…';
    const source = terms.length ? await loadSearchItems() : articles;
    if (currentRequest !== requestId) return;
    const matches = terms.length ? API.search(source, query) : API.latest(articles, 5);
    const visible = matches.slice(0, visibleLimit);
    count.textContent = terms.length ? `找到 ${matches.length} 篇文章${matches.length > visibleLimit ? `，已显示 ${visible.length} 篇` : ''}` : '先读这几卷新章';
    results.innerHTML = visible.length ? visible.map((article) => `<a class="search-result" href="${articleUrl(article.slug)}"><strong>${highlight(article.title, terms)}</strong><small>${formatDate(article.date, true)} · ${highlight(article.categoryName, terms)} · ${article.readingTime} 分钟</small><p class="search-excerpt">${highlight(excerpt(article, terms), terms)}</p></a>`).join('') : '<div class="empty-state">云深不知处，换个词再寻。</div>';
    if (matches.length > visibleLimit) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'ghost-btn search-more';
      more.textContent = '再展十二卷';
      more.addEventListener('click', () => {
        const firstNew = visibleLimit;
        visibleLimit += 12;
        void showResults(input.value);
        results.querySelectorAll('a')[firstNew]?.focus();
      });
      results.append(more);
    }
  };
  const open = () => {
    if (dialog.open) { input.focus(); return; }
    previousFocus = document.activeElement;
    visibleLimit = 12;
    void showResults(input.value);
    dialog.showModal();
    input.focus();
  };
  const close = () => { if (dialog.open) dialog.close(); };
  document.querySelectorAll('[data-search-open]').forEach((button) => button.addEventListener('click', open));
  document.querySelector('[data-search-close]')?.addEventListener('click', close);
  input.addEventListener('input', () => {
    visibleLimit = 12;
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => { void showResults(input.value); }, 130);
  });
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    const first = results.querySelector('a');
    if (first && ['ArrowDown', 'Enter'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Enter') first.click(); else first.focus();
    }
  });
  dialog.addEventListener('close', () => { if (previousFocus?.isConnected) previousFocus.focus(); });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  });
  results.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const links = [...results.querySelectorAll('a, button')];
    const index = links.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
    (next < 0 ? input : links[Math.min(next, links.length - 1)])?.focus();
  });
  addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); open(); }
  });
}

function setupToolbar() {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => button.addEventListener('click', cycleTheme));
  document.querySelectorAll('[data-back-top]').forEach((button) => button.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })));
  document.querySelectorAll('[data-font-toggle]').forEach((button) => button.addEventListener('click', () => {
    const fonts = Object.keys(fontFamilies);
    const current = document.documentElement.dataset.font || 'serif';
    const next = fonts[(fonts.indexOf(current) + 1) % fonts.length];
    savePreference('yunmo-font', next);
    applyFont(next);
  }));
  resolveTheme(document.documentElement.dataset.themeChoice);
  applyFont();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (document.documentElement.dataset.themeChoice === 'auto') resolveTheme('auto');
  });
  addEventListener('storage', (event) => {
    if (event.key === 'yunmo-theme' || event.key === null) resolveTheme();
    if (event.key === 'yunmo-font' || event.key === null) applyFont();
  });
  const progress = [...document.querySelectorAll('.progress-value')];
  let scheduled = false;
  const update = () => {
    scheduled = false;
    const article = document.querySelector('.article-content');
    const start = article ? article.getBoundingClientRect().top + scrollY - 110 : 0;
    const end = article ? article.getBoundingClientRect().bottom + scrollY : document.documentElement.scrollHeight;
    const max = end - innerHeight - start;
    const ratio = Math.max(0, Math.min(max > 0 ? (scrollY - start) / max : 1, 1));
    progress.forEach((ring) => { ring.style.strokeDashoffset = String(126 - ratio * 126); });
    document.querySelectorAll('.progress-ring [data-back-top]').forEach((button) => button.setAttribute('aria-label', `阅读进度 ${Math.round(ratio * 100)}%，点击返回顶部`));
    document.documentElement.style.setProperty('--reading-progress', `${ratio * 100}%`);
  };
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  update();
}

function setupNavigation() {
  const button = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  const close = (restoreFocus = false) => {
    if (!nav?.classList.contains('open')) return;
    nav.classList.remove('open');
    button?.setAttribute('aria-expanded', 'false');
    button?.setAttribute('aria-label', '展开导航');
    if (restoreFocus) button?.focus();
  };
  button?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? '收起导航' : '展开导航');
    if (open) nav.querySelector('a')?.focus();
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (nav?.classList.contains('open') && !nav.contains(event.target) && !button?.contains(event.target)) close();
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download') || link.origin !== location.origin || link.hash) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    document.body.classList.add('page-leave');
    setTimeout(() => location.assign(link.href), 230);
  });
  addEventListener('keydown', (event) => { if (event.key === 'Escape') close(true); });
}

function setupReveal() {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }), { rootMargin: '0px 0px -35px', threshold: .06 });
  document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));
  return observer;
}

function setupAmbient() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches) return;
  const cloud = document.querySelector('.ambient-clouds');
  let scheduled = false;
  addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { if (cloud) cloud.style.transform = `translate3d(0, ${scrollY * .035}px, 0)`; scheduled = false; });
  }, { passive: true });
  let last = 0;
  addEventListener('pointermove', (event) => {
    if (performance.now() - last < 85) return;
    last = performance.now();
    const particle = document.createElement('i');
    particle.className = 'cursor-ink-particle';
    particle.style.left = `${event.clientX}px`;
    particle.style.top = `${event.clientY}px`;
    particle.style.setProperty('--dx', `${(Math.random() - .5) * 24}px`);
    document.body.append(particle);
    setTimeout(() => particle.remove(), 800);
  });
}

export function toolsHTML() {
  return `<aside class="floating-tools" aria-label="页面工具">
    <div class="tool-wrap progress-ring"><button class="tool-btn" type="button" data-back-top aria-label="阅读进度，点击返回顶部">${icons.top}</button><svg viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="20"></circle><circle class="progress-value" cx="23" cy="23" r="20"></circle></svg><span class="tool-label">返回顶部</span></div>
    <div class="tool-wrap"><button class="tool-btn" type="button" data-theme-toggle aria-label="切换明暗主题">${icons.moon}</button><span class="tool-label">切换明暗</span></div>
    <div class="tool-wrap"><button class="tool-btn" type="button" data-font-toggle aria-label="切换正文字体">${icons.font}</button><span class="tool-label">切换字体</span></div>
    <div class="tool-wrap"><button class="tool-btn" type="button" data-search-open aria-label="打开全站搜索">${icons.search}</button><span class="tool-label">全站搜索</span></div>
  </aside>`;
}

export function paginationHTML(info, baseUrl = location.pathname) {
  if (info.pages <= 1) return '';
  const make = (page) => {
    const url = new URL(baseUrl, location.href);
    url.searchParams.set('page', page);
    return url.pathname + url.search;
  };
  const edge = (page, label, accessibleLabel, disabled) => disabled
    ? `<span class="page-btn disabled" aria-disabled="true" aria-label="${accessibleLabel}">${label}</span>`
    : `<a class="page-btn" href="${make(page)}" aria-label="${accessibleLabel}">${label}</a>`;
  return `<nav class="pagination" aria-label="文章分页">
    ${edge(info.page - 1, '‹', '上一页', info.page === 1)}
    ${Array.from({ length: info.pages }, (_, index) => `<a class="page-btn${index + 1 === info.page ? ' active' : ''}" href="${make(index + 1)}"${index + 1 === info.page ? ' aria-current="page"' : ''}>${index + 1}</a>`).join('')}
    ${edge(info.page + 1, '›', '下一页', info.page === info.pages)}
  </nav>`;
}

export function initCommon(state) {
  resolveTheme();
  renderHeader(state.config, document.body.dataset.page);
  renderFooter(state.config);
  if (!document.querySelector('.floating-tools')) {
    document.body.insertAdjacentHTML('beforeend', toolsHTML());
  }
  renderSearchDialog();
  setupSearch(state.articles);
  setupToolbar();
  setupNavigation();
  setupAmbient();
  const observer = setupReveal();
  document.title = `${document.title.split('·')[0].trim()} · ${state.config.site.name}`;
  document.body.classList.add('page-enter');
  addEventListener('pageshow', () => document.body.classList.remove('page-leave'), { once: true });
  return { refreshReveal: () => document.querySelectorAll('.reveal:not(.is-visible)').forEach((node) => observer.observe(node)) };
}
