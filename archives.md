---
layout: page
title: Archive
lang: en
permalink: /archives/
translation_url: /zh/archives/
description: "All technical notes, organized chronologically."
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
