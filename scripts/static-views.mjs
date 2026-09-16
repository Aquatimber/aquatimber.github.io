/** 构建期静态视图。浏览器端 JS 负责增强，HTML 本身先保证可阅读与可导航。 */
export const esc = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

const icons = {
  search: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
  moon: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 16.2A8.5 8.5 0 0 1 7.8 4 8.5 8.5 0 1 0 20 16.2Z"/></svg>',
  menu: '<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
};

const formatDate = (value, detail = false) => new Intl.DateTimeFormat('zh-CN', detail
  ? { year: 'numeric', month: 'long', day: 'numeric' }
  : { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`));

const articleHref = (article, prefix = '../') => `${prefix}posts/${encodeURIComponent(article.slug)}/`;
const pageHref = (path, prefix = '../') => `${prefix}${path}`;

export function staticHeader(config, page, prefix = '../') {
  const navigation = config.navigation.map((item) => `<a class="nav-link${item.page === page ? ' active' : ''}" href="${pageHref(item.url, prefix)}"${item.page === page ? ' aria-current="page"' : ''}>${esc(item.label)}</a>`).join('');
  const seal = esc((config.site.shortName || config.site.name || '云').slice(0, 1));
  return `<header id="site-header" class="site-header"><div class="container nav-wrap">
    <a class="site-brand" href="${pageHref('pages/index.html', prefix)}" aria-label="${esc(config.site.name)}首页"><span class="brand-seal">${seal}</span><span class="brand-copy"><strong>${esc(config.site.name)}</strong><small>Digital Pavilion</small></span></a>
    <nav class="site-nav" id="site-nav" aria-label="主导航">${navigation}</nav>
    <div class="nav-actions"><button class="icon-btn" type="button" data-search-open aria-label="打开全站搜索">${icons.search}</button><button class="icon-btn theme-header-btn" type="button" data-theme-toggle aria-label="切换明暗主题">${icons.moon}</button><button class="icon-btn menu-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="展开导航">${icons.menu}</button></div>
  </div></header>`;
}

export function staticFooter(config) {
  const icp = config.footer.icp ? ` · ${esc(config.footer.icp)}` : '';
  return `<footer id="site-footer" class="site-footer"><div class="container"><p class="footer-slogan">${esc(config.footer.slogan)}</p><div class="footer-meta">${esc(config.footer.copyright)} · ${esc(config.site.description)}${icp}</div></div></footer>`;
}

function categoryMap(categories) {
  const map = new Map();
  const visit = (items, ancestors = []) => items.forEach((item) => {
    map.set(item.id, { ...item, ancestors });
    visit(item.children || [], [...ancestors, item.id]);
  });
  visit(categories);
  return map;
}

function archives(articles) {
  return articles.reduce((tree, article) => {
    const [year, month] = article.date.split('-');
    tree[year] ||= {};
    tree[year][month] ||= [];
    tree[year][month].push(article);
    return tree;
  }, {});
}

function cardHTML(article, index = 0) {
  const tags = (article.tagNames || []).slice(0, 2).map((name, tagIndex) => `<a href="../pages/tag.html?tag=${encodeURIComponent(article.tags[tagIndex] || '')}">#${esc(name)}</a>`).join('');
  return `<article class="article-card reveal" style="transition-delay:${Math.min(index, 5) * 65}ms">
    <div class="card-cover cover-${esc(article.cover || 'gradient-ink')}"><span class="cover-landscape" aria-hidden="true"></span><span class="cover-lines" aria-hidden="true"></span><span class="cover-index" aria-hidden="true">${String(index + 1).padStart(2, '0')} / ESSAY</span><span class="cover-title" aria-hidden="true">${esc(article.categoryName)}</span><span class="cover-seal" aria-hidden="true">阅</span></div>
    <div class="card-body"><div class="card-meta"><span>${formatDate(article.date, true)}</span><span>${esc(article.categoryName)}</span><span>${article.readingTime} 分钟</span></div><h3><a href="${articleHref(article)}">${esc(article.title)}</a></h3><p class="card-excerpt">${esc(article.excerpt)}</p><footer class="card-footer"><span class="card-tags">${tags}</span><span class="read-more">展卷 →</span></footer></div>
  </article>`;
}

function emptyHTML(message = '此处尚无文章。') {
  return `<div class="empty-state"><img src="../assets/images/empty-ink.svg" alt="水墨远山"><p>${esc(message)}</p></div>`;
}

function sidebarHTML(state) {
  const categories = categoryMap(state.categories);
  const counts = new Map();
  state.articles.forEach((article) => {
    counts.set(article.category, (counts.get(article.category) || 0) + 1);
    (categories.get(article.category)?.ancestors || []).forEach((parent) => counts.set(parent, (counts.get(parent) || 0) + 1));
  });
  const categoryItems = state.categories.map((category) => `<li><a href="../pages/category.html?category=${encodeURIComponent(category.id)}"><span>${esc(category.name)}</span><span class="count-badge">${counts.get(category.id) || 0}</span></a></li>`).join('');
  const tags = state.tags.map((tag) => `<a class="tag-pill" href="../pages/tag.html?tag=${encodeURIComponent(tag.id)}">${esc(tag.name)} · ${state.articles.filter((article) => article.tags.includes(tag.id)).length}</a>`).join('');
  const months = Object.entries(archives(state.articles)).flatMap(([year, values]) => Object.entries(values).map(([month, items]) => ({ year, month, count: items.length }))).sort((a, b) => `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`)).slice(0, 3);
  const archiveItems = months.map((item) => `<li><a href="../pages/archive.html#archive-${item.year}-${item.month}"><span>${item.year} 年 ${Number(item.month)} 月</span><span class="count-badge">${item.count}</span></a></li>`).join('');
  return `<aside class="scroll-sidebar" aria-label="文章索引"><section class="sidebar-profile"><a href="../pages/about.html" class="sidebar-portrait"><img src="../${esc(state.config.owner.avatar)}" alt="${esc(state.config.owner.name)}" width="54" height="54"><span><strong>${esc(state.config.owner.name)}</strong><small>此间执笔人</small></span><span class="profile-stamp" aria-hidden="true">墨</span></a><p>${esc(state.config.owner.bio)}</p><div class="profile-counts"><span><b>${state.articles.length}</b>文章</span><span><b>${state.categories.length}</b>主题</span><span><b>${state.tags.length}</b>签笺</span></div></section><section class="scroll-panel"><h2 class="panel-title">卷帙分类</h2><ul class="category-list">${categoryItems}</ul></section><section class="scroll-panel"><h2 class="panel-title">签笺云集</h2><div class="tag-cluster">${tags}</div></section><section class="scroll-panel"><h2 class="panel-title">岁月存卷</h2><ul class="archive-mini">${archiveItems}</ul><a class="sidebar-more" href="../pages/archive.html">查看全部归档 ↗</a></section></aside>`;
}

function renderHome(state) {
  const cards = state.articles.slice(0, state.config.site.postsPerPage || 6).map(cardHTML).join('');
  return `<section class="home-hero reveal"><div class="hero-landscape" aria-hidden="true"><img src="../assets/images/landscape.svg" alt="" width="1200" height="720"><span class="landscape-mist"></span></div><div class="hero-copy"><span class="eyebrow">YUNMO JOURNAL <span class="eyebrow-divider">/</span> 山水之间 · 数字之外</span><h1>以代码筑山，<br>以文字<span>行舟。</span></h1><p>观技术之道，记造物之思。<br>一半是理性的探索，一半是自由的远游。</p><div class="hero-actions"><a class="primary-btn" href="#latest">翻阅新章 <span>↗</span></a><a class="hero-text-link" href="../pages/about.html">认识执笔人 <span>→</span></a></div></div><span class="hero-poem" aria-hidden="true">心有山海<br>静而不争</span><span class="hero-seal" aria-hidden="true">云<br>墨</span><div class="hero-caption"><span><i></i> 在此，记录思考的痕迹</span><span>卷 ${String(state.articles.length).padStart(2, '0')} · 持续生长的数字花园</span></div></section>
  <div class="notice-strip"><span class="notice-stamp">笺</span><span>${esc(state.config.site.notice)}</span><a href="../pages/link.html">檐下留笺 ↗</a></div>
  <div class="content-grid">${sidebarHTML(state)}<section id="latest"><header class="feed-header"><div><span class="eyebrow">THE JOURNAL</span><h2 class="section-title">纸上光阴<span class="title-dot">。</span></h2></div><nav class="feed-tabs" aria-label="文章排序"><a href="?sort=latest#latest" class="active" aria-current="true">最新</a><a href="?sort=featured#latest">精选</a><a href="?sort=hot#latest">热门</a></nav></header><div class="article-grid home-articles">${cards || emptyHTML()}</div><div class="feed-bottom"><span>共 ${state.articles.length} 篇 · 第 1 / ${Math.max(1, Math.ceil(state.articles.length / (state.config.site.postsPerPage || 6)))} 页</span></div></section></div>`;
}

function renderArchive(state) {
  const tree = archives(state.articles);
  const body = Object.entries(tree).sort(([a], [b]) => b.localeCompare(a)).map(([year, months]) => `<section class="archive-year reveal"><h2>${year}</h2>${Object.entries(months).sort(([a], [b]) => b.localeCompare(a)).map(([month, items]) => `<div class="archive-month" id="archive-${year}-${month}"><h3>${Number(month)} 月 · ${items.length} 卷</h3>${items.map((article) => `<a class="archive-item" href="${articleHref(article)}"><time>${article.date.slice(5)}</time><strong>${esc(article.title)}</strong><span>${esc(article.categoryName)}</span></a>`).join('')}</div>`).join('')}</section>`).join('');
  return `<header class="page-heading reveal" data-watermark="藏"><span class="eyebrow">ARCHIVES</span><h1>岁月藏卷</h1><p>依年月收拢写过的文字。${state.articles.length} 篇文章，始于 ${state.articles.at(-1)?.date.slice(0, 7) || '此刻'}。</p></header><div class="archive-timeline">${body || emptyHTML()}</div>`;
}

function descendantIds(item) {
  return [item.id, ...(item.children || []).flatMap(descendantIds)];
}

function renderCategory(state) {
  const childLinks = (items, depth = 0) => items.map((child) => `<a class="filter-btn" style="--category-depth:${depth}" href="?category=${encodeURIComponent(child.id)}">${depth ? '↳ ' : ''}${esc(child.name)}</a>${childLinks(child.children || [], depth + 1)}`).join('');
  const branches = state.categories.map((parent) => {
    const ids = descendantIds(parent);
    const count = state.articles.filter((article) => ids.includes(article.category)).length;
    return `<section class="category-branch reveal"><span class="category-icon">${esc(parent.icon)}</span><h2>${esc(parent.name)} <small class="count-badge">${count} 卷</small></h2><p>${esc(parent.description)}</p><div class="category-children"><a class="filter-btn" href="?category=${encodeURIComponent(parent.id)}">全部</a>${childLinks(parent.children || [])}</div></section>`;
  }).join('');
  return `<header class="page-heading reveal" data-watermark="类"><span class="eyebrow">CATEGORIES</span><h1>分门别卷</h1><p>以主题为经纬，让散落的思考彼此相连。</p></header><div class="category-tree">${branches}</div><header class="filter-heading"><div><span class="eyebrow">FILTERED ARTICLES</span><h2 class="section-title">全部文章</h2></div></header><div class="article-grid">${state.articles.map(cardHTML).join('') || emptyHTML()}</div>`;
}

function renderTag(state) {
  const counts = new Map(state.tags.map((tag) => [tag.id, state.articles.filter((article) => article.tags.includes(tag.id)).length]));
  const max = Math.max(...counts.values(), 1);
  const cloud = state.tags.map((tag) => `<a class="cloud-tag" style="--tag-color:${esc(tag.color)};font-size:${.78 + (counts.get(tag.id) / max) * .75}rem" href="?tag=${encodeURIComponent(tag.id)}">${esc(tag.name)} <small>${counts.get(tag.id)}</small></a>`).join('');
  return `<header class="page-heading reveal" data-watermark="签"><span class="eyebrow">TAGS</span><h1>签笺云集</h1><p>每枚签笺都是一条隐约的路径，沿它寻找跨越分类的共同线索。</p></header><div class="tag-cloud-stage reveal">${cloud}</div><header class="filter-heading"><div><span class="eyebrow">TAGGED ARTICLES</span><h2 class="section-title">所有签笺</h2></div></header><div class="article-grid">${state.articles.map(cardHTML).join('') || emptyHTML()}</div>`;
}

function renderAbout(state) {
  const owner = state.config.owner;
  const socials = owner.socials.map((social) => `<a href="${esc(social.url)}"${/^https?:/i.test(social.url) ? ' target="_blank"' : ''} rel="noopener" title="${esc(social.name)}" aria-label="${esc(social.name)}">${esc(social.icon)}</a>`).join('');
  return `<header class="page-heading reveal" data-watermark="我"><span class="eyebrow">ABOUT</span><h1>知我二三</h1><p>关于执笔的人、这座书阁，以及我们相信的数字造物方式。</p></header><div class="about-grid"><aside class="profile-card reveal"><img class="profile-avatar" src="../${esc(owner.avatar)}" alt="${esc(owner.name)}头像"><h2>${esc(owner.name)}</h2><div class="profile-role">${esc(owner.title)}</div><p class="profile-bio">${esc(owner.bio)}</p><div class="social-row">${socials}</div></aside><article class="prose-card reveal"><section><span class="eyebrow">THE KEEPER</span><h2>山水之外，仍是山水</h2><p>你好，我是${esc(owner.name)}。工作在软件与产品的交界处，关心一个界面如何被理解，也关心技术怎样在更长的时间里保持简单。这里不追逐所有新潮，只记录经过实践后仍值得留下的东西。</p><p>“云墨阁”是一座纯静态数字书阁。没有数据库，没有跟踪脚本，文章以 Markdown 保存，目录以 JSON 编排。它希望证明：轻量并不意味着单薄，克制也可以拥有丰富的气韵。</p></section><section><span class="eyebrow">VALUES</span><h2>造物三则</h2><div class="value-list"><div class="value-item"><strong>清晰</strong><span>结构先于装饰，让每个入口都有来处。</span></div><div class="value-item"><strong>节制</strong><span>动效服务于氛围，而不争夺注意力。</span></div><div class="value-item"><strong>长久</strong><span>选择开放格式，让内容比工具活得更久。</span></div></div></section><section><span class="eyebrow">CONTACT</span><h2>以字会友</h2><p>常居${esc(owner.location)}。若你也在研究独立站点、东方数字美学或轻量产品，可以写信至 <a href="mailto:${esc(owner.email)}">${esc(owner.email)}</a>。</p></section></article></div>`;
}

function renderLink(state) {
  const cards = state.links.filter((link) => link.status === 'active').map((link) => `<a class="link-card reveal" href="${esc(link.url)}" target="_blank" rel="noopener"><img src="../${esc(link.avatar)}" alt="" loading="lazy"><div><h2>${esc(link.name)} ↗</h2><p>${esc(link.description)}</p></div></a>`).join('');
  const notes = state.messages.map((message) => `<article class="message-item reveal"><div class="message-author"><span class="message-avatar">${esc(message.avatarText)}</span><strong>${esc(message.name)}</strong><time>${formatDate(message.date)}</time></div><p>${esc(message.content)}</p></article>`).join('');
  return `<header class="page-heading reveal" data-watermark="邻"><span class="eyebrow">LINKS</span><h1>芳邻雅集</h1><p>互联网不是孤岛。沿着这些门扉，去拜访认真生活与创作的人们。</p></header><div class="link-grid">${cards || emptyHTML()}</div><section class="message-board reveal"><span class="eyebrow">STATIC MESSAGES</span><h2>檐下留笺</h2><p class="message-note">纯静态站无法直接写入数据；以下留言来自 <code>data/message.json</code>，更新文件即可展示。</p><div class="message-list">${notes}</div></section>`;
}

export function renderStaticMain(page, state) {
  return ({ home: renderHome, archive: renderArchive, category: renderCategory, tag: renderTag, about: renderAbout, link: renderLink })[page]?.(state) || renderHome(state);
}

export const noScriptNavigationCSS = '<noscript><style>@media(max-width:960px){.site-header{height:auto!important;position:static!important}.nav-wrap{display:block!important;padding-block:10px!important}.site-nav{position:static!important;display:flex!important;overflow-x:auto!important;height:auto!important;padding:8px 0!important;opacity:1!important;visibility:visible!important;transform:none!important;background:transparent!important;box-shadow:none!important}.nav-actions{display:none!important}}.reveal{opacity:1!important;transform:none!important}</style></noscript>';
