import { API, sitePath } from './data-api.js';
import { articleUrl, cardHTML, escapeHTML, formatDate, paginationHTML, toolsHTML } from './ui.js';
import { renderMarkdown, withoutLeadingTitle } from './markdown.js';

function categoryMap(categories) {
  const map = new Map();
  const visit = (items, ancestors = []) => items.forEach((item) => {
    map.set(item.id, { ...item, ancestors, parentId: ancestors.at(-1) });
    visit(item.children || [], [...ancestors, item.id]);
  });
  visit(categories);
  return map;
}

function tagMap(tags) { return new Map(tags.map((tag) => [tag.id, tag])); }

function emptyHTML(message = '此处尚无文章。') {
  return `<div class="empty-state"><img src="${sitePath('assets/images/empty-ink.svg')}" alt="水墨远山"><p>${escapeHTML(message)}</p></div>`;
}

function sidebarHTML(state) {
  const categories = categoryMap(state.categories);
  const counts = new Map();
  state.articles.forEach((article) => {
    counts.set(article.category, (counts.get(article.category) || 0) + 1);
    (categories.get(article.category)?.ancestors || []).forEach((parent) => counts.set(parent, (counts.get(parent) || 0) + 1));
  });
  const categoryItems = state.categories.map((category) => `<li><a href="${sitePath('pages/category.html')}?category=${encodeURIComponent(category.id)}"><span>${escapeHTML(category.name)}</span><span class="count-badge">${counts.get(category.id) || 0}</span></a></li>`).join('');
  const tags = state.tags.map((tag) => {
    const count = state.articles.filter((article) => article.tags.includes(tag.id)).length;
    return `<a class="tag-pill" href="${sitePath('pages/tag.html')}?tag=${encodeURIComponent(tag.id)}">${escapeHTML(tag.name)} · ${count}</a>`;
  }).join('');
  const archives = Object.entries(API.archives(state.articles)).flatMap(([year, months]) => Object.entries(months).map(([month, items]) => ({ year, month, count: items.length }))).sort((a,b) => `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`)).slice(0, 3).map((item) => `<li><a href="${sitePath('pages/archive.html')}#archive-${item.year}-${item.month}"><span>${item.year} 年 ${Number(item.month)} 月</span><span class="count-badge">${item.count}</span></a></li>`).join('');
  return `<aside class="scroll-sidebar" aria-label="文章索引">
    <section class="sidebar-profile"><a href="${sitePath('pages/about.html')}" class="sidebar-portrait"><img src="${sitePath(state.config.owner.avatar)}" alt="${escapeHTML(state.config.owner.name)}" width="54" height="54"><span><strong>${escapeHTML(state.config.owner.name)}</strong><small>此间执笔人</small></span><span class="profile-stamp" aria-hidden="true">墨</span></a><p>${escapeHTML(state.config.owner.bio)}</p><div class="profile-counts"><span><b>${state.articles.length}</b>文章</span><span><b>${state.categories.length}</b>主题</span><span><b>${state.tags.length}</b>签笺</span></div></section>
    <section class="scroll-panel"><h2 class="panel-title">卷帙分类</h2><ul class="category-list">${categoryItems}</ul></section>
    <section class="scroll-panel"><h2 class="panel-title">签笺云集</h2><div class="tag-cluster">${tags}</div></section>
    <section class="scroll-panel"><h2 class="panel-title">岁月存卷</h2><ul class="archive-mini">${archives}</ul><a class="sidebar-more" href="${sitePath('pages/archive.html')}">查看全部归档 ↗</a></section>
  </aside>`;
}

export function renderHome(state) {
  const host = document.querySelector('#page-content');
  const params = new URLSearchParams(location.search);
  const page = Number(params.get('page')) || 1;
  const sort = ['latest', 'featured', 'hot'].includes(params.get('sort')) ? params.get('sort') : 'latest';
  const articles = sort === 'featured' ? state.articles.filter(article => article.featured) : sort === 'hot' ? API.hot(state.articles, state.articles.length) : state.articles;
  const info = API.paginate(articles, page, state.config.site.postsPerPage || 6);
  const cards = info.items.map(cardHTML).join('');
  host.innerHTML = `<section class="home-hero reveal">
    <div class="hero-landscape" aria-hidden="true"><img src="${sitePath('assets/images/landscape.svg')}" alt="" width="1200" height="720"><span class="landscape-mist"></span></div>
    <div class="hero-copy"><span class="eyebrow">YUNMO JOURNAL <span class="eyebrow-divider">/</span> 山水之间 · 数字之外</span><h1>以代码筑山，<br>以文字<span>行舟。</span></h1><p>观技术之道，记造物之思。<br>一半是理性的探索，一半是自由的远游。</p><div class="hero-actions"><a class="primary-btn" href="#latest">翻阅新章 <span>↗</span></a><a class="hero-text-link" href="${sitePath('pages/about.html')}">认识执笔人 <span>→</span></a></div></div>
    <span class="hero-poem" aria-hidden="true">心有山海<br>静而不争</span><span class="hero-seal" aria-hidden="true">云<br>墨</span>
    <div class="hero-caption"><span><i></i> 在此，记录思考的痕迹</span><span>卷 ${String(state.articles.length).padStart(2,'0')} · 持续生长的数字花园</span></div>
  </section>
  <div class="notice-strip"><span class="notice-stamp">笺</span><span>${escapeHTML(state.config.site.notice)}</span><a href="${sitePath('pages/link.html')}">檐下留笺 ↗</a></div>
  <div class="content-grid">
    ${sidebarHTML(state)}
    <section id="latest"><header class="feed-header"><div><span class="eyebrow">THE JOURNAL</span><h2 class="section-title">纸上光阴<span class="title-dot">。</span></h2></div><nav class="feed-tabs" aria-label="文章排序">${[['latest','最新'],['featured','精选'],['hot','热门']].map(([id,name]) => `<a href="?sort=${id}#latest" class="${sort===id?'active':''}"${sort===id?' aria-current="true"':''}>${name}</a>`).join('')}</nav></header><div class="article-grid home-articles">${cards || emptyHTML()}</div><div class="feed-bottom"><span>共 ${info.total} 篇 · 第 ${info.page} / ${info.pages} 页</span>${paginationHTML(info, location.href)}</div></section>
    ${toolsHTML()}
  </div>`;
}

export function renderArchive(state) {
  const archives = API.archives(state.articles);
  const body = Object.entries(archives).sort(([a], [b]) => b.localeCompare(a)).map(([year, months]) => `<section class="archive-year reveal"><h2>${year}</h2>${Object.entries(months).sort(([a], [b]) => b.localeCompare(a)).map(([month, items]) => `<div class="archive-month" id="archive-${year}-${month}"><h3>${Number(month)} 月 · ${items.length} 卷</h3>${items.map((article) => `<a class="archive-item" href="${articleUrl(article.slug)}"><time>${article.date.slice(5)}</time><strong>${escapeHTML(article.title)}</strong><span>${escapeHTML(article.categoryName)}</span></a>`).join('')}</div>`).join('')}</section>`).join('');
  document.querySelector('#page-content').innerHTML = `<header class="page-heading reveal" data-watermark="藏"><span class="eyebrow">ARCHIVES</span><h1>岁月藏卷</h1><p>依年月收拢写过的文字。${state.articles.length} 篇文章，始于 ${state.articles.at(-1)?.date.slice(0, 7) || '此刻'}。</p></header><div class="archive-timeline">${body || emptyHTML()}</div>`;
}

function filterArticlesByCategory(state, id) {
  if (!id) return state.articles;
  const parent = categoryMap(state.categories).get(id);
  const ids = [];
  const visit = (item) => {
    if (!item) return;
    ids.push(item.id);
    (item.children || []).forEach(visit);
  };
  visit(parent || { id, children: [] });
  return state.articles.filter((article) => ids.includes(article.category));
}

export function renderCategory(state) {
  const params = new URLSearchParams(location.search);
  const active = params.get('category') || '';
  const categories = categoryMap(state.categories);
  const filtered = filterArticlesByCategory(state, active);
  const childLinks = (items, depth = 0) => items.map((child) => `<a class="filter-btn${active === child.id ? ' active' : ''}" style="--category-depth:${depth}" href="?category=${encodeURIComponent(child.id)}">${depth ? '↳ ' : ''}${escapeHTML(child.name)}</a>${childLinks(child.children || [], depth + 1)}`).join('');
  const branches = state.categories.map((parent) => {
    const count = filterArticlesByCategory(state, parent.id).length;
    return `<section class="category-branch reveal"><span class="category-icon">${escapeHTML(parent.icon)}</span><h2>${escapeHTML(parent.name)} <small class="count-badge">${count} 卷</small></h2><p>${escapeHTML(parent.description)}</p><div class="category-children"><a class="filter-btn${active === parent.id ? ' active' : ''}" href="?category=${encodeURIComponent(parent.id)}">全部</a>${childLinks(parent.children || [])}</div></section>`;
  }).join('');
  const current = categories.get(active);
  document.querySelector('#page-content').innerHTML = `<header class="page-heading reveal" data-watermark="类"><span class="eyebrow">CATEGORIES</span><h1>分门别卷</h1><p>以主题为经纬，让散落的思考彼此相连。</p></header><div class="category-tree">${branches}</div><header class="filter-heading"><div><span class="eyebrow">FILTERED ARTICLES</span><h2 class="section-title">${current ? escapeHTML(current.name) : '全部文章'}</h2></div><a class="ghost-btn" href="${sitePath('pages/category.html')}">清除筛选</a></header><div class="article-grid">${filtered.map(cardHTML).join('') || emptyHTML('该分类仍待落笔。')}</div>`;
}

export function renderTag(state) {
  const params = new URLSearchParams(location.search);
  const active = params.get('tag') || '';
  const tags = tagMap(state.tags);
  const counts = new Map(state.tags.map((tag) => [tag.id, state.articles.filter((article) => article.tags.includes(tag.id)).length]));
  const max = Math.max(...counts.values(), 1);
  const cloud = state.tags.map((tag) => `<a class="cloud-tag${active === tag.id ? ' active' : ''}" style="--tag-color:${escapeHTML(tag.color)};font-size:${.78 + (counts.get(tag.id) / max) * .75}rem" href="?tag=${encodeURIComponent(tag.id)}">${escapeHTML(tag.name)} <small>${counts.get(tag.id)}</small></a>`).join('');
  const filtered = active ? state.articles.filter((article) => article.tags.includes(active)) : state.articles;
  document.querySelector('#page-content').innerHTML = `<header class="page-heading reveal" data-watermark="签"><span class="eyebrow">TAGS</span><h1>签笺云集</h1><p>每枚签笺都是一条隐约的路径，沿它寻找跨越分类的共同线索。</p></header><div class="tag-cloud-stage reveal">${cloud}</div><header class="filter-heading"><div><span class="eyebrow">TAGGED ARTICLES</span><h2 class="section-title">${active ? `# ${escapeHTML(tags.get(active)?.name || active)}` : '所有签笺'}</h2></div><a class="ghost-btn" href="${sitePath('pages/tag.html')}">清除筛选</a></header><div class="article-grid">${filtered.map(cardHTML).join('') || emptyHTML('这枚签笺尚未关联文章。')}</div>`;
}

export function renderAbout(state) {
  const owner = state.config.owner;
  const socials = owner.socials.map((social) => `<a href="${escapeHTML(social.url)}"${/^https?:/i.test(social.url) ? ' target="_blank"' : ''} rel="noopener" title="${escapeHTML(social.name)}" aria-label="${escapeHTML(social.name)}">${escapeHTML(social.icon)}</a>`).join('');
  document.querySelector('#page-content').innerHTML = `<header class="page-heading reveal" data-watermark="我"><span class="eyebrow">ABOUT</span><h1>知我二三</h1><p>关于执笔的人、这座书阁，以及我们相信的数字造物方式。</p></header><div class="about-grid">
    <aside class="profile-card reveal"><img class="profile-avatar" src="${sitePath(owner.avatar)}" alt="${escapeHTML(owner.name)}头像"><h2>${escapeHTML(owner.name)}</h2><div class="profile-role">${escapeHTML(owner.title)}</div><p class="profile-bio">${escapeHTML(owner.bio)}</p><div class="social-row">${socials}</div></aside>
    <article class="prose-card reveal"><section><span class="eyebrow">THE KEEPER</span><h2>山水之外，仍是山水</h2><p>你好，我是${escapeHTML(owner.name)}。工作在软件与产品的交界处，关心一个界面如何被理解，也关心技术怎样在更长的时间里保持简单。这里不追逐所有新潮，只记录经过实践后仍值得留下的东西。</p><p>“云墨阁”是一座纯静态数字书阁。没有数据库，没有跟踪脚本，文章以 Markdown 保存，目录以 JSON 编排。它希望证明：轻量并不意味着单薄，克制也可以拥有丰富的气韵。</p></section>
    <section><span class="eyebrow">VALUES</span><h2>造物三则</h2><div class="value-list"><div class="value-item"><strong>清晰</strong><span>结构先于装饰，让每个入口都有来处。</span></div><div class="value-item"><strong>节制</strong><span>动效服务于氛围，而不争夺注意力。</span></div><div class="value-item"><strong>长久</strong><span>选择开放格式，让内容比工具活得更久。</span></div></div></section>
    <section><span class="eyebrow">CONTACT</span><h2>以字会友</h2><p>常居${escapeHTML(owner.location)}。若你也在研究独立站点、东方数字美学或轻量产品，可以写信至 <a href="mailto:${escapeHTML(owner.email)}">${escapeHTML(owner.email)}</a>。</p></section></article>
  </div>`;
}

export async function renderLink(state) {
  const [links, messages] = await Promise.all([API.links(), API.messages()]);
  const cards = links.filter((link) => link.status === 'active').map((link) => `<a class="link-card reveal" href="${escapeHTML(link.url)}" target="_blank" rel="noopener"><img src="${sitePath(link.avatar)}" alt="" loading="lazy"><div><h2>${escapeHTML(link.name)} ↗</h2><p>${escapeHTML(link.description)}</p></div></a>`).join('');
  const notes = messages.map((message) => `<article class="message-item reveal"><div class="message-author"><span class="message-avatar">${escapeHTML(message.avatarText)}</span><strong>${escapeHTML(message.name)}</strong><time>${formatDate(message.date)}</time></div><p>${escapeHTML(message.content)}</p></article>`).join('');
  document.querySelector('#page-content').innerHTML = `<header class="page-heading reveal" data-watermark="邻"><span class="eyebrow">LINKS</span><h1>芳邻雅集</h1><p>互联网不是孤岛。沿着这些门扉，去拜访认真生活与创作的人们。</p></header><div class="link-grid">${cards || emptyHTML()}</div><section class="message-board reveal"><span class="eyebrow">STATIC MESSAGES</span><h2>檐下留笺</h2><p class="message-note">纯静态站无法直接写入数据；以下留言来自 <code>data/message.json</code>，更新文件即可展示。</p><div class="message-list">${notes}</div></section>`;
}

export async function renderArticle(state) {
  const slug = new URLSearchParams(location.search).get('slug') || document.body.dataset.slug;
  const host = document.querySelector('#page-content');
  if (document.body.dataset.prerendered === 'true' && host.querySelector('.article-content')) {
    const toc = [...host.querySelectorAll('.article-content h2[id], .article-content h3[id]')].map((heading) => ({ level: Number(heading.tagName.slice(1)), id: heading.id }));
    setupArticleToc(toc);
    return;
  }
  if (!slug) { host.innerHTML = `<div class="article-error"><img src="${sitePath('assets/images/empty-ink.svg')}" alt=""><h1>未指定卷册</h1><p>请从文章列表选择一篇文章。</p><a class="primary-btn" href="${sitePath('pages/index.html')}">返回卷首</a></div>`; return; }
  const article = await API.article(slug);
  if (!article) { host.innerHTML = `<div class="article-error"><img src="${sitePath('assets/images/empty-ink.svg')}" alt=""><h1>卷册不在此处</h1><p>文章可能已更名或移卷。</p><a class="primary-btn" href="${sitePath('pages/index.html')}">返回卷首</a></div>`; return; }
  const rendered = renderMarkdown(withoutLeadingTitle(article.markdown, article.title), { assetPrefix: document.body.dataset.root === '../..' ? '../../' : '../' });
  const index = state.articles.findIndex((item) => item.slug === slug);
  const newer = index > 0 ? state.articles[index - 1] : null;
  const older = index < state.articles.length - 1 ? state.articles[index + 1] : null;
  const toc = rendered.toc.map((item) => `<li class="level-${item.level}"><a href="#${escapeHTML(item.id)}">${escapeHTML(item.text)}</a></li>`).join('');
  const tags = article.tagNames.map((name, tagIndex) => `<a class="tag-pill" href="${sitePath('pages/tag.html')}?tag=${encodeURIComponent(article.tags[tagIndex])}">#${escapeHTML(name)}</a>`).join('');
  host.innerHTML = `<div class="article-layout"><article class="article-paper reveal">
    <header class="article-header"><a class="article-category" href="${sitePath('pages/category.html')}?category=${encodeURIComponent(article.category)}">${escapeHTML(article.categoryName)}</a><h1>${escapeHTML(article.title)}</h1><div class="article-meta"><span>${formatDate(article.date, true)}</span><span>约 ${article.readingTime} 分钟</span><span>${Number(article.wordCount).toLocaleString('zh-CN')} 字</span><span>${Number(article.views).toLocaleString('zh-CN')} 次静态热度</span></div></header>
    <div class="article-content" id="article-content">${rendered.html}</div>
    <footer class="article-end"><div class="article-taxonomy"><span>落款签笺</span>${tags}</div><nav class="article-nav">${older ? `<a href="${articleUrl(older.slug)}"><small>← 上一卷</small><strong>${escapeHTML(older.title)}</strong></a>` : '<span></span>'}${newer ? `<a href="${articleUrl(newer.slug)}"><small>下一卷 →</small><strong>${escapeHTML(newer.title)}</strong></a>` : ''}</nav></footer>
  </article><aside class="article-aside"><nav class="toc-panel" aria-label="文章目录"><h2>卷中目录</h2><ol class="toc-list">${toc || '<li><span>短笺无目录</span></li>'}</ol><div class="toc-progress"><span></span></div></nav></aside></div>`;
  document.title = `${article.title} · ${state.config.site.name}`;
  setupArticleToc(rendered.toc);
}

function setupArticleToc(toc) {
  const links = [...document.querySelectorAll('.toc-list a')];
  const bar = document.querySelector('.toc-progress span');
  const headings = toc.map((item) => document.getElementById(item.id)).filter(Boolean);
  const update = () => {
    const paper = document.querySelector('.article-paper');
    if (!paper) return;
    const start = paper.offsetTop;
    const max = paper.offsetHeight - innerHeight;
    const ratio = max > 0 ? Math.max(0, Math.min((scrollY - start + 90) / max, 1)) : 0;
    if (bar) bar.style.width = `${ratio * 100}%`;
    let active = headings[0]?.id;
    headings.forEach((heading) => { if (heading.getBoundingClientRect().top <= 150) active = heading.id; });
    links.forEach((link) => link.classList.toggle('active', link.hash === `#${active}`));
  };
  addEventListener('scroll', update, { passive: true });
  update();
}

export const pageRenderers = {
  home: renderHome,
  archive: renderArchive,
  category: renderCategory,
  tag: renderTag,
  about: renderAbout,
  link: renderLink,
  article: renderArticle
};
