---
layout: page
title: 我的收藏
lang: zh
permalink: /zh/favorites/
translation_url: /favorites/
description: "保存在当前设备上的文章。"
---

<div class="favorites-browser" data-favorites-page>
<p class="favorites-intro">收藏保存在当前设备中，无需登录；访客 ID 为匿名随机标识，不包含个人信息。</p>
<p class="favorites-loading" data-favorites-loading><span>$</span> 正在读取 saved_articles.json…</p>
<div class="saved-post-list">
{% assign localized_posts = site.posts | where: "lang", page.lang %}
{% for post in localized_posts %}
<article class="saved-post" data-favorite-item data-page-id="{{ post.url | escape }}" hidden>
<div>
<time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%Y.%m.%d' }}</time>
<h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
<p>{{ post.excerpt | strip_html | normalize_whitespace | truncate: 135 }}</p>
</div>
<button class="post-favorite" type="button" data-favorite-toggle data-page-id="{{ post.url | escape }}" data-page-title="{{ post.title | escape }}" aria-pressed="true" aria-label="从收藏中移除 {{ post.title }}">
<span aria-hidden="true" data-favorite-icon>♥</span>
</button>
</article>
{% endfor %}
</div>
<div class="favorites-empty" data-favorites-empty hidden>
<span>EMPTY_SET</span>
<h2>还没有收藏文章。</h2>
<p>点击文章上的心形按钮，稍后就能从这里继续阅读。</p>
<a href="{{ '/zh/' | relative_url }}#latest">浏览最新文章 →</a>
</div>
</div>
