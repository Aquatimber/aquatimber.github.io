---
title: 一座无需后端的数字书阁
slug: static-blog-architecture
date: 2026-06-28
updated: 2026-07-01
category: frontend
tags: [static-site, github-pages, javascript, performance]
cover: gradient-cyan
featured: true
views: 2341
excerpt: 用 Markdown 保存思想，以 JSON 组织索引，在纯静态托管上实现搜索、筛选、归档与文章详情。
---

# 一座无需后端的数字书阁

博客最重要的资产从来不是数据库，而是可以长久迁移的文字。Markdown 恰好提供了一种简单、透明又足够稳定的容器。

## 数据如何流动

这座静态博客把内容分成两层：文章源文件负责保存全文，JSON 索引负责列表、搜索和统计。

```text
Markdown 源文件 → 构建脚本 → articles.json → 浏览器渲染
```

每次增加文章后运行 `npm run build`，脚本会读取 front matter，自动计算阅读时长、归档月份与热门排序所需字段。

## 静态接口的边界

纯静态站点可以很好地完成读取，却无法安全地持久化访客输入。因此留言数据是展示型样例；若未来需要真实评论，可以接入独立第三方服务，而不污染内容层。

## 路径是部署的关键

GitHub Pages 既可能部署在域名根目录，也可能位于 `/repository-name/`。页面内的资源必须使用相对路径，脚本还要知道当前页面距离站点根目录有几层。

本项目在每个页面的 `body` 上保存 `data-root`，统一的路径工具会据此解析数据、图片和跳转链接。

## 简单带来的韧性

无运行时框架、无远程字体、无第三方脚本，让页面在网络不佳时仍可快速出现。复杂度被留在了构建阶段，而阅读保持安静。
