---
layout: page
title: 归档
lang: zh
permalink: /zh/archives/
translation_url: /archives/
description: "按时间整理的全部技术日志。"
---

{% assign localized_posts = site.posts | where: "lang", page.lang %}
<div class="archive-list">
{% for post in localized_posts %}
  <a class="archive-item" href="{{ post.url | relative_url }}">
    <time datetime="{{ post.publication_day }}">{{ post.publication_label }}</time>
    <span>{{ post.title }}</span>
    <i>↗</i>
  </a>
{% endfor %}
</div>
