<div align="center">

# 云墨阁

### 国风水墨 × 轻量科技的纯静态数字书阁

无需后端、无需数据库、无运行时依赖。文章以 Markdown 保存，索引由本地 JSON 驱动，构建后可直接部署到 GitHub Pages。

`Pure Static` · `Markdown` · `Vanilla JavaScript` · `GitHub Pages` · `Responsive`

</div>

<p align="center">
  <img src="./assets/images/landscape.svg" width="920" alt="云墨阁水墨山水视觉">
</p>

---

## 项目简介

云墨阁是一套以东方数字美学为核心的静态博客。它将水墨、窗棂、印鉴、传统色谱与克制的流光粒子结合，同时保留博客真正重要的能力：清晰的内容结构、快速加载、全文搜索、分类归档、移动端适配，以及低成本维护。

整个站点仅由 HTML、CSS、JavaScript、Markdown 和 JSON 组成。构建阶段会自动生成文章索引、搜索索引、预渲染页面和独立文章地址；部署后的访客阅读过程不依赖任何服务器接口。

## 视觉与交互

| 场景 | 设计表现 |
| --- | --- |
| 入阁首屏 | 全屏流云、远山、水墨颗粒、星盘窗棂、门阙、朱砂印鉴与垂穗 |
| 博客首页 | 宣纸基底、窗棂导航、卷轴侧栏、错落文章卡片与轻量山水封面 |
| 文章阅读 | 书法标题、宣纸正文、悬浮目录、阅读进度、国风代码块 |
| 深色模式 | 黛青墨夜、低亮度流光与柔和玻璃层次 |
| 移动端 | 自动折叠导航和侧栏，降低粒子数量，避免横向溢出 |
| 无障碍 | 键盘导航、跳转正文、语义化结构、减少动态效果与无脚本回退 |

## 已实现功能

- 门阙与朱砂印组成的“入阁”交互首屏；
- 首页、文章、归档、分类、标签、关于、友链和 404 页面；
- Markdown 文章详情与独立静态 URL；
- 最新、热门、精选、分页、年月归档与多级分类筛选；
- 首次搜索时按需加载的本地全文索引；
- 月白、墨夜、跟随系统三态主题；
- 宋体、楷体、黑体切换；
- 文章目录、阅读进度、返回顶部和页面过渡；
- PC、平板、手机完整响应式适配；
- 构建期预渲染，JavaScript 关闭时仍可阅读和导航；
- RSS、sitemap、robots.txt 按站点地址自动生成；
- GitHub Actions 一键构建、校验并发布 GitHub Pages。

## 快速开始

环境要求：Node.js 18 或更高版本。项目没有第三方运行依赖，无需执行 `npm install`。

```bash
# 进入项目目录
cd blog-static

# 生成文章索引与 dist 静态产物
npm run build

# 启动本地预览
npm run dev
```

浏览器访问终端显示的地址，默认是：

```text
http://127.0.0.1:4173/
```

按 `Ctrl + C` 即可关闭预览。

仅执行校验：

```bash
npm run check
npm run check -- --dist
```

> 不建议直接双击 HTML 使用 `file://` 预览，因为浏览器通常会阻止页面读取本地 JSON 和 Markdown。

## 项目结构

```text
blog-static/
├─ .github/workflows/
│  └─ deploy.yml                 # GitHub Pages 自动部署
├─ assets/
│  ├─ animation/                 # 流云与 Canvas 粒子
│  ├─ fonts/                     # 字体说明与扩展位置
│  ├─ images/                    # 头像、山水、图标
│  ├─ script/                    # 数据接口、页面渲染、交互逻辑
│  └─ style/                     # 基础、组件、文章和响应式样式
├─ data/
│  ├─ articles/                  # Markdown 文章源文件
│  ├─ articles.json              # 自动生成的轻量文章索引
│  ├─ search-index.json          # 自动生成的全文搜索索引
│  ├─ config.json                # 站点与博主配置
│  ├─ category.json              # 多级分类
│  ├─ tag.json                   # 标签与颜色
│  ├─ link.json                  # 友情链接
│  └─ message.json               # 展示型静态留言
├─ pages/                        # 各内容页面模板
├─ scripts/                      # 索引、构建、校验和预览服务
├─ dist/                         # 构建后的 GitHub Pages 产物
├─ index.html                    # 默认入口：入阁页
├─ entry.html                    # 独立入阁页
├─ 404.html                      # 自定义 404
├─ .nojekyll                     # 禁止 Jekyll 改写资源
└─ package.json
```

## 发布新文章

日常更新只需要新增一份 Markdown，然后重新构建。页面代码无需修改。

1. 复制 `data/articles/_template.md.example`；
2. 重命名为 `YYYY-MM-DD-slug.md`；
3. 修改 front matter 与正文；
4. 运行 `npm run build`；
5. 运行 `npm run check -- --dist`；
6. 提交并推送到 GitHub。

文章示例：

```markdown
---
title: 一篇新文章
slug: a-new-article
date: 2026-09-16
updated: 2026-09-16
category: frontend
tags: [javascript, performance]
cover: gradient-cyan
featured: false
views: 0
excerpt: 用一句简短的话介绍文章内容。
---

# 一篇新文章

从这里开始正文。
```

可用字段：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文章标题 |
| `slug` | 是 | 小写字母、数字和单个连字符组成的唯一地址 |
| `date` | 是 | 发布日期，格式为 `YYYY-MM-DD` |
| `updated` | 否 | 更新日期，默认与发布日期相同 |
| `category` | 是 | `category.json` 中存在的分类 ID |
| `tags` | 是 | `tag.json` 中存在的标签 ID 数组 |
| `cover` | 否 | `gradient-ink/cyan/violet/red/paper/blue` |
| `featured` | 否 | 是否列入精选，值为 `true` 或 `false` |
| `views` | 否 | 用于静态热门排序的非负整数 |
| `excerpt` | 是 | 卡片、搜索和页面描述使用的摘要 |

构建脚本会自动计算字数、阅读时长、分类名称和标签名称，并生成：

```text
data/articles.json
data/search-index.json
dist/posts/<slug>/index.html
```

文章插图建议使用项目根相对路径：

```markdown
![图片说明](assets/images/example.webp)
```

## 修改站点内容

| 内容 | 文件 |
| --- | --- |
| 站名、简介、公告、导航、博主和页脚 | `data/config.json` |
| 多级分类 | `data/category.json` |
| 标签名称与颜色 | `data/tag.json` |
| 友情链接 | `data/link.json` |
| 静态留言 | `data/message.json` |
| 传统色与深色模式 | `assets/style/base.css` |
| 首页、卡片和卷轴布局 | `assets/style/editorial.css` |
| 入阁门阙与印鉴 | `assets/style/entry.css` |
| 流云与粒子 | `assets/animation/` |

修改 JSON 后建议运行 `npm run check`。构建器会阻止无效日期、重复 slug、未知分类、未知标签和错误字段类型进入产物。

## 部署到 GitHub Pages

### 方式一：GitHub Actions

仓库已包含 `.github/workflows/deploy.yml`，这是推荐方式。

1. 新建 GitHub 仓库；
2. 将本目录中的内容放在仓库根目录；
3. 推送到 `main` 或 `master` 分支；
4. 打开仓库的 `Settings → Pages`；
5. 在 `Build and deployment → Source` 中选择 `GitHub Actions`；
6. 等待 `Deploy static blog to GitHub Pages` 工作流完成。

工作流会自动读取 Pages 的真实地址，并依次执行：

```text
生成文章索引 → 构建静态页面 → 校验本地资源 → 发布 dist
```

项目使用相对路径，因此既支持用户主页仓库，也支持带仓库名子路径的项目主页。

### 方式二：从分支发布

先设置站点地址并构建：

PowerShell：

```powershell
$env:SITE_URL = 'https://用户名.github.io/仓库名'
npm run build
npm run check -- --dist
```

macOS / Linux：

```bash
SITE_URL='https://用户名.github.io/仓库名' npm run build
npm run check -- --dist
```

然后将 `dist/` 目录内的内容发布到目标分支根目录，并在 `Settings → Pages` 中选择 `Deploy from a branch`。

> 发布的是 `dist/` 里面的内容，不要把 `dist` 或 `blog-static` 再套一层目录。

## 构建命令

| 命令 | 作用 |
| --- | --- |
| `npm run build` | 生成索引、预渲染页面和完整 `dist/` |
| `npm run dev` | 重新构建并启动本地静态服务器 |
| `npm run preview` | 与 `npm run dev` 相同 |
| `npm run check` | 校验源码、JSON、Markdown 和入口一致性 |
| `npm run check -- --dist` | 额外校验构建产物与所有本地资源链接 |

设置 `SITE_URL` 或 `data/config.json` 中的 `site.url` 后，构建器还会生成：

- `feed.xml`
- `sitemap.xml`
- `robots.txt`
- 页面 canonical 与 Open Graph 地址

## 静态数据接口

浏览器端通过 `assets/script/data-api.js` 统一读取本地数据：

| 方法 | 用途 |
| --- | --- |
| `bootstrap()` | 并行加载配置、文章、分类和标签 |
| `article(slug)` | 获取文章元数据与 Markdown 正文 |
| `searchIndex()` | 首次搜索时加载全文索引 |
| `paginate()` | 文章分页 |
| `search()` | 本地关键词检索 |
| `archives()` | 年月归档 |
| `hot()` / `latest()` | 热门和最新文章 |
| `links()` / `messages()` | 友链与静态留言 |

这些接口全部读取站内静态文件，不会访问外部服务。

## 纯静态边界

- GitHub Pages 无法把访客留言直接写回 `message.json`；
- `views` 是内容元数据中的静态热度，不是实时浏览量；
- 当前没有第三方评论、统计、远程字体或跟踪脚本；
- 如需真实评论或统计，可自行接入适合静态站的第三方服务。

## 浏览器与性能

建议使用近两年的 Chrome、Edge、Firefox 或 Safari。

- 无框架与第三方运行依赖；
- 全文搜索索引只在首次搜索时加载；
- Canvas 像素密度设有上限；
- 移动端自动降低粒子数量；
- 页面隐藏后暂停 Canvas 绘制；
- 尊重系统的 `prefers-reduced-motion` 设置；
- 关闭 JavaScript 后仍保留主要内容和导航。

---

<div align="center">

以像素为墨，以逻辑为山河。

</div>
