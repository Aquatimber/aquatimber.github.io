/** 静态数据访问层。根路径随页面部署目录解析，兼容用户站点和仓库子目录。 */
const declaredRoot = typeof document !== 'undefined' ? document.body?.dataset.root : null;
const baseURL = declaredRoot == null
  ? new URL('../../', import.meta.url)
  : new URL(`${declaredRoot.replace(/\/$/, '')}/`, document.baseURI);
const cache = new Map();
const articlePaths = new Map();

export function sitePath(path = '') {
  const clean = String(path).replace(/^\.\//, '').replace(/^\/+/, '');
  const url = new URL(clean, baseURL);
  return /^https?:$/.test(url.protocol) ? `${url.pathname}${url.search}${url.hash}` : url.href;
}

/** 构建产物带独立文章 URL；直接预览源码时保留 query 路由。 */
export function articlePath(slug) {
  const path = articlePaths.get(String(slug));
  return path ? sitePath(path) : `${sitePath('pages/article.html')}?slug=${encodeURIComponent(slug)}`;
}

export async function getJSON(path) {
  const url = sitePath(path);
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((response) => {
      if (!response.ok) throw new Error(`无法读取 ${path}（${response.status}）`);
      return response.json();
    }).catch((error) => {
      // 失败不永久缓存，网络恢复后可再次读取。
      cache.delete(url);
      throw error;
    }));
  }
  return cache.get(url);
}

export async function getText(path) {
  const url = sitePath(path);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`无法读取 ${path}（${response.status}）`);
  return response.text();
}

export function searchTerms(keyword) {
  return String(keyword || '').trim().toLocaleLowerCase('zh-CN').split(/\s+/).filter(Boolean);
}

function searchableText(article) {
  return [article.title, article.excerpt, article.categoryName, ...(article.tagNames || []), article.searchText || '']
    .join(' ').toLocaleLowerCase('zh-CN');
}

export const API = {
  async bootstrap() {
    const [config, articles, categories, tags] = await Promise.all([
      getJSON('data/config.json'),
      getJSON('data/articles.json'),
      getJSON('data/category.json'),
      getJSON('data/tag.json')
    ]);
    if (!Array.isArray(articles) || !Array.isArray(categories) || !Array.isArray(tags) || !config?.site) {
      throw new Error('站点索引格式不正确，请重新构建后再试。');
    }
    articlePaths.clear();
    articles.forEach((article) => {
      if (typeof article.url === 'string' && /^posts\/[\w-]+\/(?:index\.html)?$/.test(article.url)) {
        articlePaths.set(article.slug, article.url);
      }
    });
    return { config, articles, categories, tags };
  },

  async article(slug) {
    const articles = await getJSON('data/articles.json');
    const item = articles.find((article) => article.slug === slug);
    if (!item) return null;
    return { ...item, markdown: await getText(item.source) };
  },

  async links() { return getJSON('data/link.json'); },
  async messages() { return getJSON('data/message.json'); },
  async searchIndex() { return getJSON('data/search-index.json'); },

  paginate(items, page = 1, pageSize = 6) {
    const total = items.length;
    const size = Math.max(1, Math.floor(Number(pageSize)) || 6);
    const pages = Math.max(1, Math.ceil(total / size));
    const current = Math.min(Math.max(Math.floor(Number(page)) || 1, 1), pages);
    const start = (current - 1) * size;
    return { items: items.slice(start, start + size), page: current, pages, total, pageSize: size };
  },

  search(articles, keyword) {
    const terms = searchTerms(keyword);
    if (!terms.length) return [];
    return articles.filter((article) => {
      const text = searchableText(article);
      return terms.every((term) => text.includes(term));
    }).sort((a, b) => {
      const score = (article) => terms.reduce((sum, term) => sum + (article.title.toLocaleLowerCase('zh-CN').includes(term) ? 3 : 0)
        + ((article.excerpt || '').toLocaleLowerCase('zh-CN').includes(term) ? 1 : 0), 0);
      return score(b) - score(a);
    });
  },

  archives(articles) {
    return articles.reduce((tree, article) => {
      const [year, month] = article.date.split('-');
      tree[year] ||= {};
      tree[year][month] ||= [];
      tree[year][month].push(article);
      return tree;
    }, {});
  },

  hot(articles, limit = 5) {
    return [...articles].sort((a, b) => Number(b.views) - Number(a.views)).slice(0, limit);
  },

  latest(articles, limit = 5) {
    return [...articles].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }
};
