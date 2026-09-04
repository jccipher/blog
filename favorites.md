---
layout: page
title: Favorites
lang: en
permalink: /favorites/
translation_url: /zh/favorites/
description: "Articles saved on this device."
---

<div class="favorites-browser" data-favorites-page>
<p class="favorites-intro">Saved articles stay on this device. Your visitor ID is anonymous and no sign-in is required.</p>
<p class="favorites-loading" data-favorites-loading><span>$</span> Loading saved_articles.json…</p>
<div class="saved-post-list">
{% assign localized_posts = site.posts | where: "lang", page.lang %}
{% for post in localized_posts %}
<article class="saved-post" data-favorite-item data-page-id="{{ post.url | escape }}" hidden>
<div>
<time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%Y.%m.%d' }}</time>
<h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
<p>{{ post.excerpt | strip_html | normalize_whitespace | truncate: 135 }}</p>
</div>
<button class="post-favorite" type="button" data-favorite-toggle data-page-id="{{ post.url | escape }}" data-page-title="{{ post.title | escape }}" aria-pressed="true" aria-label="Remove {{ post.title }} from favorites">
<span aria-hidden="true" data-favorite-icon>♥</span>
</button>
</article>
{% endfor %}
</div>
<div class="favorites-empty" data-favorites-empty hidden>
<span>EMPTY_SET</span>
<h2>No saved articles yet.</h2>
<p>Use the heart button on a post to keep it here for later.</p>
<a href="{{ '/' | relative_url }}#latest">Browse latest posts →</a>
</div>
</div>
