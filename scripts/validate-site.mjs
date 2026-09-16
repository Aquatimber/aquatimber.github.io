import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown } from '../assets/script/markdown.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isDist = process.argv.includes('--dist');
const targetRoot = isDist ? join(projectRoot, 'dist') : projectRoot;
let failures = 0;
const fail = (message) => { failures += 1; console.error(`✗ ${message}`); };
const ok = (message) => console.log(`✓ ${message}`);

async function exists(path) { try { await access(path); return true; } catch { return false; } }
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries
    .filter((entry) => isDist || entry.name !== 'dist')
    .map((entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : join(dir, entry.name)));
  return nested.flat();
}

function exactDate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

async function validateLocalReferences(file, html) {
  const links = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const value of links) {
    if (!value || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(value)) continue;
    let decoded;
    try { decoded = decodeURIComponent(value.split(/[?#]/)[0]); } catch { fail(`${file}: URL 编码无效 ${value}`); continue; }
    if (!decoded) continue;
    let destination = decoded.startsWith('/') ? resolve(targetRoot, decoded.replace(/^\/+/, '')) : resolve(dirname(file), decoded);
    if (!(await exists(destination))) { fail(`${file}: 本地引用不存在 ${value}`); continue; }
    try { if ((await stat(destination)).isDirectory()) destination = join(destination, 'index.html'); } catch {}
    if (!(await exists(destination))) fail(`${file}: 目录缺少 index.html ${value}`);
  }
}

async function main() {
  const required = ['index.html', 'entry.html', '404.html', '.nojekyll', 'data/config.json', 'data/articles.json', 'data/search-index.json', 'pages/index.html', 'pages/article.html'];
  for (const path of required) (await exists(join(targetRoot, path))) ? ok(path) : fail(`缺少 ${path}`);

  const jsonFiles = ['data/config.json', 'data/category.json', 'data/tag.json', 'data/link.json', 'data/message.json', 'data/articles.json', 'data/search-index.json'];
  for (const path of jsonFiles) {
    try { JSON.parse(await readFile(join(targetRoot, path), 'utf8')); ok(`${path} JSON 格式`); } catch (error) { fail(`${path}: ${error.message}`); }
  }

  const articles = JSON.parse(await readFile(join(targetRoot, 'data/articles.json'), 'utf8'));
  const searchIndex = JSON.parse(await readFile(join(targetRoot, 'data/search-index.json'), 'utf8'));
  const slugs = new Set();
  for (const article of articles) {
    if (!article.slug || !article.title || !article.source) fail(`文章索引字段不完整：${JSON.stringify(article)}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug || '')) fail(`slug 格式无效：${article.slug}`);
    if (!exactDate(article.date) || !exactDate(article.updated)) fail(`文章日期无效：${article.slug}`);
    if (!Number.isInteger(article.views) || article.views < 0) fail(`文章 views 无效：${article.slug}`);
    if (slugs.has(article.slug)) fail(`重复 slug：${article.slug}`);
    slugs.add(article.slug);
    if (!(await exists(join(targetRoot, article.source)))) fail(`文章源不存在：${article.source}`);
    if (isDist && !(await exists(join(targetRoot, article.url || `posts/${article.slug}/`, 'index.html')))) fail(`文章静态页不存在：${article.slug}`);
  }
  const indexedSlugs = new Set(searchIndex.map((item) => item.slug));
  if (indexedSlugs.size !== slugs.size || [...slugs].some((slug) => !indexedSlugs.has(slug))) fail('search-index.json 与文章索引不一致');
  else ok(`搜索索引覆盖 ${indexedSlugs.size} 篇文章`);
  ok(`文章索引引用 ${articles.length} 篇 Markdown`);

  const markdownFixture = renderMarkdown('![示例](assets/images/avatar.svg)', { assetPrefix: '../' }).html;
  if (!markdownFixture.includes('src="../assets/images/avatar.svg"')) fail('Markdown 项目相对图片路径解析失败');
  else ok('Markdown 相对图片路径');

  if (!isDist) {
    const [index, entry] = await Promise.all([readFile(join(projectRoot, 'index.html'), 'utf8'), readFile(join(projectRoot, 'entry.html'), 'utf8')]);
    if (index !== entry) fail('index.html 与 entry.html 已发生漂移，请保持入口内容同步');
    else ok('双入口内容一致');
  }

  const files = await walk(targetRoot);
  const htmlFiles = files.filter((file) => extname(file) === '.html');
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    if (!/<html[^>]+lang="zh-CN"/.test(html)) fail(`${file}: 缺少中文 lang`);
    if (!/<meta[^>]+name="viewport"/.test(html)) fail(`${file}: 缺少 viewport`);
    if (isDist) await validateLocalReferences(file, html);
  }
  if (isDist) {
    for (const page of ['index.html', 'archive.html', 'category.html', 'tag.html', 'about.html', 'link.html']) {
      const html = await readFile(join(targetRoot, 'pages', page), 'utf8');
      if (!html.includes('data-prerendered="true"') || !/<h[12]\b/.test(html)) fail(`pages/${page}: 尚未静态预渲染`);
    }
  }
  ok(`${htmlFiles.length} 个 HTML 基础结构${isDist ? '与本地引用' : ''}`);

  if (failures) { console.error(`\n校验失败：${failures} 项`); process.exitCode = 1; }
  else console.log('\n全部静态校验通过。');
}

main().catch((error) => { fail(error.stack || error.message); process.exitCode = 1; });
