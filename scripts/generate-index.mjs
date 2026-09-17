import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const articleDir = join(projectRoot, 'data', 'articles');
const coverNames = new Set(['gradient-ink', 'gradient-cyan', 'gradient-violet', 'gradient-red', 'gradient-paper', 'gradient-blue']);

function isExactDate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseScalar(value) {
  const text = value.trim();
  if (/^\[.*\]$/.test(text)) return text.slice(1, -1).split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text.replace(/^['"]|['"]$/g, '');
}

function parseArticle(markdown, filename) {
  const match = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: 缺少 YAML front matter`);
  const meta = {};
  match[1].split(/\r?\n/).forEach((line) => {
    if (!line.trim() || line.trimStart().startsWith('#')) return;
    const separator = line.indexOf(':');
    if (separator < 1) throw new Error(`${filename}: 无法解析字段 “${line}”`);
    meta[line.slice(0, separator).trim()] = parseScalar(line.slice(separator + 1));
  });
  for (const key of ['title', 'slug', 'date', 'category', 'tags', 'excerpt']) {
    if (meta[key] === undefined || meta[key] === '') throw new Error(`${filename}: 缺少必填字段 ${key}`);
  }
  for (const key of ['title', 'slug', 'category', 'excerpt']) {
    if (typeof meta[key] !== 'string') throw new Error(`${filename}: ${key} 必须是字符串`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) {
    throw new Error(`${filename}: slug 只能使用小写字母、数字和单个连字符`);
  }
  for (const key of ['date', 'updated']) {
    if (meta[key] !== undefined && !isExactDate(meta[key])) {
      throw new Error(`${filename}: ${key} 必须使用有效的 YYYY-MM-DD 日期`);
    }
  }
  if (!Array.isArray(meta.tags) || !meta.tags.length || meta.tags.some((tag) => typeof tag !== 'string' || !tag)) throw new Error(`${filename}: tags 必须使用非空的 [tag-a, tag-b] 格式`);
  if (meta.featured !== undefined && typeof meta.featured !== 'boolean') throw new Error(`${filename}: featured 必须是 true 或 false`);
  if (meta.views !== undefined && (!Number.isFinite(meta.views) || meta.views < 0 || !Number.isInteger(meta.views))) throw new Error(`${filename}: views 必须是非负整数`);
  if (meta.cover !== undefined && !coverNames.has(meta.cover)) throw new Error(`${filename}: cover 不在允许的封面枚举中`);
  const plain = match[2]
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*_`~|\[\]()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const chinese = (plain.match(/[\u3400-\u9fff]/g) || []).length;
  const latinWords = (plain.replace(/[\u3400-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  const wordCount = chinese + latinWords;
  return {
    ...meta,
    updated: meta.updated || meta.date,
    cover: meta.cover || 'gradient-ink',
    featured: meta.featured ?? false,
    views: meta.views ?? 0,
    wordCount,
    readingTime: Math.max(1, Math.ceil(wordCount / 400)),
    searchText: [meta.title, meta.excerpt, plain].join(' '),
    source: `data/articles/${filename}`
  };
}

async function main() {
  const [categoryData, tagData, filenames] = await Promise.all([
    readFile(join(projectRoot, 'data', 'category.json'), 'utf8').then(JSON.parse),
    readFile(join(projectRoot, 'data', 'tag.json'), 'utf8').then(JSON.parse),
    readdir(articleDir)
  ]);
  const categories = new Map();
  const visitCategories = (items) => items.forEach((item) => {
    if (!item?.id || !item?.name || typeof item.id !== 'string' || typeof item.name !== 'string') throw new Error('category.json: 每个分类都必须包含字符串 id 与 name');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) throw new Error(`category.json: 分类 id “${item.id}” 格式无效`);
    if (categories.has(item.id)) throw new Error(`category.json: 分类 id “${item.id}” 重复`);
    categories.set(item.id, item.name);
    visitCategories(item.children || []);
  });
  visitCategories(categoryData);
  tagData.forEach((tag) => {
    if (!tag?.id || !tag?.name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag.id)) throw new Error('tag.json: 每个标签都必须包含规范的 id 与 name');
    if (!/^#[\da-f]{6}$/i.test(tag.color || '')) throw new Error(`tag.json: 标签 “${tag.id}” 的 color 必须是六位十六进制颜色`);
  });
  const tags = new Map(tagData.map((tag) => [tag.id, tag.name]));
  if (tags.size !== tagData.length) throw new Error('tag.json: 标签 id 重复');
  const slugs = new Set();
  const articles = [];

  for (const filename of filenames.filter((name) => name.endsWith('.md')).sort()) {
    const markdown = await readFile(join(articleDir, filename), 'utf8');
    const article = parseArticle(markdown, filename);
    if (slugs.has(article.slug)) throw new Error(`${filename}: slug “${article.slug}” 重复`);
    if (!categories.has(article.category)) throw new Error(`${filename}: 未知分类 “${article.category}”`);
    const unknownTags = article.tags.filter((tag) => !tags.has(tag));
    if (unknownTags.length) throw new Error(`${filename}: 未知标签 ${unknownTags.join(', ')}`);
    slugs.add(article.slug);
    articles.push({ ...article, categoryName: categories.get(article.category), tagNames: article.tags.map((tag) => tags.get(tag)) });
  }

  if (!articles.length) {
    throw new Error('data/articles: 未找到 Markdown 文章，已中止构建，避免发布空站点');
  }

  articles.sort((a, b) => b.date.localeCompare(a.date));
  const output = join(projectRoot, 'data', 'articles.json');
  const searchOutput = join(projectRoot, 'data', 'search-index.json');
  const publicArticles = articles.map(({ searchText, ...article }) => article);
  const searchIndex = articles.map(({ slug, title, excerpt, date, categoryName, tagNames, searchText }) => ({ slug, title, excerpt, date, categoryName, tagNames, searchText }));
  await Promise.all([
    writeFile(output, `${JSON.stringify(publicArticles, null, 2)}\n`, 'utf8'),
    writeFile(searchOutput, `${JSON.stringify(searchIndex, null, 2)}\n`, 'utf8')
  ]);
  console.log(`已生成 ${relative(projectRoot, output).split(sep).join('/')} 与 data/search-index.json：${articles.length} 篇文章`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
