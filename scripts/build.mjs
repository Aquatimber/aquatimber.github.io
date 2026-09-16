import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, withoutLeadingTitle } from '../assets/script/markdown.js';
import { esc, noScriptNavigationCSS, renderStaticMain, staticFooter, staticHeader } from './static-views.mjs';

const exec = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'dist');
const xml = (value = '') => esc(value).replace(/&#039;/g, '&apos;');

async function runIndex() {
  await exec(process.execPath, [join(projectRoot, 'scripts', 'generate-index.mjs')], { cwd: projectRoot });
}

function articleDocument(config, article, rendered, neighbors = {}) {
  const toc = rendered.toc.map((item) => `<li class="level-${item.level}"><a href="#${esc(item.id)}">${esc(item.text)}</a></li>`).join('');
  const tags = article.tagNames.map((name, index) => `<a class="tag-pill" href="../../pages/tag.html?tag=${encodeURIComponent(article.tags[index])}">#${esc(name)}</a>`).join('');
  const origin = siteOrigin(config);
  const canonical = origin ? `${origin}/posts/${article.slug}/` : '';
  const feedLink = origin ? `<link rel="alternate" type="application/rss+xml" title="${esc(config.site.name)} RSS" href="../../feed.xml">` : '';
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article', headline: article.title,
    description: article.excerpt, datePublished: article.date, dateModified: article.updated,
    author: { '@type': 'Person', name: config.owner.name },
    mainEntityOfPage: canonical || article.url
  }).replace(/</g, '\\u003c');
  const previous = neighbors.previous ? `<a href="../../posts/${encodeURIComponent(neighbors.previous.slug)}/"><small>← 上一卷</small><strong>${esc(neighbors.previous.title)}</strong></a>` : '<span></span>';
  const next = neighbors.next ? `<a href="../../posts/${encodeURIComponent(neighbors.next.slug)}/"><small>下一卷 →</small><strong>${esc(neighbors.next.title)}</strong></a>` : '';
  return `<!doctype html>
<html lang="${esc(config.site.language || 'zh-CN')}" data-default-theme="${esc(config.site.defaultTheme || 'auto')}"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="${esc(config.site.themeColor || '#122e30')}">
  <title>${esc(article.title)} · ${esc(config.site.name)}</title><meta name="description" content="${esc(article.excerpt)}"><meta name="author" content="${esc(config.owner.name)}">
  <meta property="og:type" content="article"><meta property="og:title" content="${esc(article.title)}"><meta property="og:description" content="${esc(article.excerpt)}"><meta property="article:published_time" content="${esc(article.date)}">${canonical ? `<meta property="og:url" content="${esc(canonical)}"><link rel="canonical" href="${esc(canonical)}">` : ''}${feedLink}<link rel="icon" href="../../assets/images/favicon.svg" type="image/svg+xml">
  <script src="../../assets/script/theme-init.js"></script>
  <link rel="stylesheet" href="../../assets/style/base.css"><link rel="stylesheet" href="../../assets/style/components.css"><link rel="stylesheet" href="../../assets/style/article.css"><link rel="stylesheet" href="../../assets/style/responsive.css"><link rel="stylesheet" href="../../assets/style/editorial.css">
  <script type="application/ld+json">${jsonLd}</script></head>
  <body data-page="article" data-root="../.." data-slug="${esc(article.slug)}" data-prerendered="true"><a class="skip-link" href="#article-content">跳到正文</a><div class="site-shell"><div class="ambient-clouds" aria-hidden="true"></div>${staticHeader(config, 'article', '../../')}<main class="page-main page-main--inner" id="page-content"><div class="article-layout"><article class="article-paper"><header class="article-header"><a class="article-category" href="../../pages/category.html?category=${encodeURIComponent(article.category)}">${esc(article.categoryName)}</a><h1>${esc(article.title)}</h1><div class="article-meta"><span>${esc(article.date)}</span><span>约 ${article.readingTime} 分钟</span><span>${Number(article.wordCount).toLocaleString('zh-CN')} 字</span></div></header><div class="article-content" id="article-content">${rendered.html}</div><footer class="article-end"><div class="article-taxonomy"><span>落款签笺</span>${tags}</div><nav class="article-nav">${previous}${next}</nav></footer></article><aside class="article-aside"><nav class="toc-panel" aria-label="文章目录"><h2>卷中目录</h2><ol class="toc-list">${toc || '<li><span>短笺无目录</span></li>'}</ol></nav></aside></div></main>${staticFooter(config)}</div>${noScriptNavigationCSS}<script type="module" src="../../assets/script/app.js"></script></body></html>`;
}

function siteOrigin(config) {
  const raw = process.env.SITE_URL || config.site.url || '';
  const value = String(raw).trim();
  if (!value) return '';
  let url;
  try { url = new URL(value); } catch { throw new Error('SITE_URL/config.site.url 必须是完整的 http(s) 地址'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('SITE_URL/config.site.url 只允许 http 或 https');
  return url.href.replace(/\/$/, '');
}

async function writeFeeds(config, articles) {
  const origin = siteOrigin(config);
  if (!origin) {
    console.warn('提示：未设置 SITE_URL/config.site.url，本地构建将跳过 RSS、sitemap 与 robots.txt。');
    return;
  }
  const articleUrl = (article) => `${origin}/posts/${article.slug}/`;
  const pages = ['/', '/pages/index.html', '/pages/archive.html', '/pages/category.html', '/pages/tag.html', '/pages/about.html', '/pages/link.html'];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((path) => `<url><loc>${xml(`${origin}${path}`)}</loc></url>`).join('')}${articles.map((article) => `<url><loc>${xml(articleUrl(article))}</loc><lastmod>${xml(article.updated || article.date)}</lastmod></url>`).join('')}</urlset>\n`;
  const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(config.site.title)}</title><link>${xml(origin)}</link><description>${xml(config.site.description)}</description>${articles.slice(0, 20).map((article) => `<item><title>${xml(article.title)}</title><link>${xml(articleUrl(article))}</link><guid>${xml(articleUrl(article))}</guid><pubDate>${new Date(`${article.date}T08:00:00+08:00`).toUTCString()}</pubDate><description>${xml(article.excerpt)}</description></item>`).join('')}</channel></rss>\n`;
  await writeFile(join(distRoot, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(join(distRoot, 'feed.xml'), rss, 'utf8');
  await writeFile(join(distRoot, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, 'utf8');
}

async function preRenderInformationPages(config, articles) {
  const [categories, tags, links, messages] = await Promise.all([
    readFile(join(projectRoot, 'data', 'category.json'), 'utf8').then(JSON.parse),
    readFile(join(projectRoot, 'data', 'tag.json'), 'utf8').then(JSON.parse),
    readFile(join(projectRoot, 'data', 'link.json'), 'utf8').then(JSON.parse),
    readFile(join(projectRoot, 'data', 'message.json'), 'utf8').then(JSON.parse)
  ]);
  const state = { config, articles, categories, tags, links, messages };
  const pages = [
    ['index.html', 'home'], ['archive.html', 'archive'], ['category.html', 'category'],
    ['tag.html', 'tag'], ['about.html', 'about'], ['link.html', 'link']
  ];
  const origin = siteOrigin(config);
  for (const [filename, page] of pages) {
    let html = await readFile(join(projectRoot, 'pages', filename), 'utf8');
    html = html.replace('<html lang="zh-CN">', `<html lang="zh-CN" data-default-theme="${esc(config.site.defaultTheme || 'auto')}">`);
    html = html.replace(/<body([^>]+)>/, (match, attributes) => `<body${attributes} data-prerendered="true">`);
    html = html.replace('<header id="site-header"></header>', staticHeader(config, page));
    html = html.replace(/(<main\b[^>]*\bid="page-content"[^>]*>)[\s\S]*?<\/main>/, `$1${renderStaticMain(page, state)}</main>`);
    html = html.replace('<footer id="site-footer"></footer>', staticFooter(config));
    const canonical = origin ? `<link rel="canonical" href="${esc(`${origin}/pages/${filename}`)}"><meta property="og:url" content="${esc(`${origin}/pages/${filename}`)}">` : '';
    const feedLink = origin ? `<link rel="alternate" type="application/rss+xml" title="${esc(config.site.name)} RSS" href="../feed.xml">` : '';
    html = html.replace('</head>', `${feedLink}${canonical}</head>`);
    html = html.replace('</body>', `${noScriptNavigationCSS}</body>`);
    await writeFile(join(distRoot, 'pages', filename), html, 'utf8');
  }
  let articleTemplate = await readFile(join(projectRoot, 'pages', 'article.html'), 'utf8');
  articleTemplate = articleTemplate.replace('<html lang="zh-CN">', `<html lang="zh-CN" data-default-theme="${esc(config.site.defaultTheme || 'auto')}">`);
  if (origin) articleTemplate = articleTemplate.replace('</head>', `<link rel="alternate" type="application/rss+xml" title="${esc(config.site.name)} RSS" href="../feed.xml"></head>`);
  await writeFile(join(distRoot, 'pages', 'article.html'), articleTemplate, 'utf8');
}

async function main() {
  await runIndex();
  await rm(distRoot, { recursive: true, force: true });
  await mkdir(distRoot, { recursive: true });
  for (const file of ['index.html', 'entry.html', '404.html', '.nojekyll']) await cp(join(projectRoot, file), join(distRoot, file));
  for (const directory of ['assets', 'data', 'pages']) await cp(join(projectRoot, directory), join(distRoot, directory), { recursive: true });

  const config = JSON.parse(await readFile(join(projectRoot, 'data', 'config.json'), 'utf8'));
  const sourceArticles = JSON.parse(await readFile(join(projectRoot, 'data', 'articles.json'), 'utf8'));
  const articles = sourceArticles.map((article) => ({ ...article, url: `posts/${article.slug}/` }));
  await writeFile(join(distRoot, 'data', 'articles.json'), `${JSON.stringify(articles, null, 2)}\n`, 'utf8');
  await preRenderInformationPages(config, articles);

  const postsRoot = resolve(distRoot, 'posts');
  for (const [index, article] of articles.entries()) {
    const markdown = await readFile(join(projectRoot, article.source), 'utf8');
    const rendered = renderMarkdown(withoutLeadingTitle(markdown, article.title), { assetPrefix: '../../' });
    const output = resolve(postsRoot, article.slug, 'index.html');
    if (!output.startsWith(`${postsRoot}${sep}`)) throw new Error(`文章输出路径越界：${article.slug}`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, articleDocument(config, article, rendered, { previous: articles[index + 1], next: articles[index - 1] }), 'utf8');
  }
  await writeFeeds(config, articles);
  console.log(`构建完成：${articles.length} 篇文章 → ${relative(projectRoot, distRoot).replace(/\\/g, '/')}`);
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
