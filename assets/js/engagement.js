(() => {
  'use strict';

  const root = document.querySelector('[data-engagement-root]');
  if (!root) return;

  const pageId = normalizePath(document.body.dataset.pageId || window.location.pathname);
  const pageTitle = document.body.dataset.pageTitle || document.title;
  const language = document.body.dataset.pageLang === 'zh' ? 'zh' : 'en';
  const endpoint = (document.body.dataset.engagementEndpoint || '').replace(/\/$/, '');
  const copy = language === 'zh'
    ? {
        save: '收藏本文',
        saved: '已收藏',
        local: '本地隐私模式 · 配置统计接口后可显示全站汇总。',
        cloud: '全站统计已连接 · 访客 ID 为匿名随机标识。',
        fallback: '统计服务暂不可用 · 已切换为本地隐私模式。',
      }
    : {
        save: 'Save article',
        saved: 'Saved',
        local: 'Local privacy mode · connect the analytics endpoint for shared totals.',
        cloud: 'Shared counters are online · visitor IDs are pseudonymous.',
        fallback: 'Shared counters are unavailable · using local privacy mode.',
      };

  const storageKeys = {
    visitor: 'jccipher.blog.visitor.v1',
    summary: 'jccipher.blog.summary.v1',
    favorites: 'jccipher.blog.favorites.v1',
  };

  const storage = getStorage();
  const visitorId = getVisitorId();
  const localSummary = recordLocalVisit();
  let favorites = readJson(storageKeys.favorites, {});
  let currentSummary = {
    latestVisitorId: visitorId,
    pageViews: localSummary.pageViews[pageId] || 1,
    siteViews: localSummary.siteViews || 1,
    uniqueVisitors: 1,
    favoriteCount: favorites[pageId] ? 1 : 0,
  };

  renderSummary(currentSummary, false);
  renderFavorites();
  bindFavoriteButtons();
  bindSupportDialog();

  if (endpoint) {
    syncVisit();
  } else {
    setStatus('LOCAL', copy.local);
  }

  function normalizePath(value) {
    const base = document.querySelector('link[rel="canonical"]')?.pathname || '';
    const configuredBase = base.includes('/blog/') ? '/blog' : '';
    let path = String(value || '/').split(/[?#]/, 1)[0];
    if (configuredBase && path.startsWith(`${configuredBase}/`)) path = path.slice(configuredBase.length);
    if (!path.startsWith('/')) path = `/${path}`;
    if (!path.endsWith('/') && !path.endsWith('.html')) path += '/';
    return path.replace(/\/+/g, '/');
  }

  function getStorage() {
    try {
      const probe = '__engagement_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch {
      return window.sessionStorage;
    }
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(storage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      // The feature remains usable for the current page when storage is blocked.
    }
  }

  function getVisitorId() {
    const stored = storage.getItem(storageKeys.visitor);
    if (stored && /^v_[a-f0-9]{16,40}$/i.test(stored)) return stored;

    const random = window.crypto?.randomUUID
      ? window.crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
    const created = `v_${random.slice(0, 24)}`;
    try {
      storage.setItem(storageKeys.visitor, created);
    } catch {
      // Use the in-memory ID when storage is unavailable.
    }
    return created;
  }

  function recordLocalVisit() {
    const summary = readJson(storageKeys.summary, { siteViews: 0, pageViews: {} });
    summary.siteViews = Number(summary.siteViews || 0) + 1;
    summary.pageViews = summary.pageViews && typeof summary.pageViews === 'object' ? summary.pageViews : {};
    summary.pageViews[pageId] = Number(summary.pageViews[pageId] || 0) + 1;
    summary.latestVisitorId = visitorId;
    summary.lastVisitAt = new Date().toISOString();
    writeJson(storageKeys.summary, summary);
    return summary;
  }

  function shortVisitorId(value) {
    const suffix = String(value || visitorId).replace(/^v_/i, '').slice(-8).toUpperCase();
    return `V-${suffix || 'ANONYMOUS'}`;
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function renderSummary(summary, isRemote) {
    currentSummary = { ...currentSummary, ...summary };
    setText('[data-latest-visitor]', shortVisitorId(currentSummary.latestVisitorId));
    setText('[data-page-views]', formatNumber(currentSummary.pageViews));
    setText('[data-inline-page-views]', formatNumber(currentSummary.pageViews));
    setText('[data-site-views]', formatNumber(currentSummary.siteViews));
    setText('[data-unique-visitors]', formatNumber(currentSummary.uniqueVisitors));
    setText('[data-page-favorites]', formatNumber(currentSummary.favoriteCount));
    setText('[data-saved-count]', formatNumber(Object.keys(favorites).length));
    root.classList.toggle('is-connected', isRemote);
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-US', { notation: 'compact' })
      .format(number(value));
  }

  function setStatus(mode, message) {
    setText('[data-engagement-mode]', mode);
    setText('[data-engagement-status]', message);
  }

  async function apiRequest(path, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${endpoint}${path}`, {
        ...options,
        headers: { 'content-type': 'application/json', ...(options.headers || {}) },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Engagement API returned ${response.status}`);
      return response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function syncVisit() {
    try {
      const summary = await apiRequest('/v1/visit', {
        method: 'POST',
        body: JSON.stringify({ visitorId, path: pageId, language }),
      });
      renderSummary({
        latestVisitorId: summary.latestVisitorId,
        pageViews: number(summary.pageViews, currentSummary.pageViews),
        siteViews: number(summary.siteViews, currentSummary.siteViews),
        uniqueVisitors: number(summary.uniqueVisitors, currentSummary.uniqueVisitors),
        favoriteCount: number(summary.favoriteCount, currentSummary.favoriteCount),
      }, true);
      setStatus('SHARED', copy.cloud);
    } catch {
      setStatus('LOCAL', copy.fallback);
    }
  }

  function bindFavoriteButtons() {
    document.querySelectorAll('[data-favorite-toggle]').forEach((button) => {
      button.addEventListener('click', () => toggleFavorite(button));
    });
  }

  function toggleFavorite(button) {
    const targetPath = normalizePath(button.dataset.pageId || pageId);
    const active = !Boolean(favorites[targetPath]);

    if (active) {
      favorites[targetPath] = {
        title: button.dataset.pageTitle || pageTitle,
        savedAt: new Date().toISOString(),
        language,
      };
    } else {
      delete favorites[targetPath];
    }

    writeJson(storageKeys.favorites, favorites);
    renderFavorites();

    if (targetPath === pageId) {
      const optimisticCount = Math.max(0, number(currentSummary.favoriteCount) + (active ? 1 : -1));
      renderSummary({ favoriteCount: optimisticCount }, root.classList.contains('is-connected'));
    }

    if (endpoint) syncFavorite(targetPath, active);
  }

  async function syncFavorite(targetPath, active) {
    try {
      const response = await apiRequest('/v1/favorite', {
        method: 'POST',
        body: JSON.stringify({ visitorId, path: targetPath, active }),
      });
      if (targetPath === pageId) {
        renderSummary({ favoriteCount: number(response.favoriteCount) }, true);
      }
    } catch {
      // Local favorites remain authoritative for this device when sync fails.
    }
  }

  function renderFavorites() {
    document.querySelectorAll('[data-favorite-toggle]').forEach((button) => {
      const targetPath = normalizePath(button.dataset.pageId || pageId);
      const active = Boolean(favorites[targetPath]);
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-favorite', active);
      const icon = button.querySelector('[data-favorite-icon]');
      const label = button.querySelector('[data-favorite-label]');
      if (icon) icon.textContent = active ? '♥' : '♡';
      if (label) label.textContent = active ? copy.saved : copy.save;
      if (!label && button.dataset.pageTitle) {
        const action = language === 'zh' ? (active ? '从收藏中移除' : '收藏') : (active ? 'Remove from favorites' : 'Save');
        button.setAttribute('aria-label', `${action} ${button.dataset.pageTitle}`);
      }
    });

    const favoritePage = document.querySelector('[data-favorites-page]');
    if (favoritePage) {
      let visibleCount = 0;
      favoritePage.querySelectorAll('[data-favorite-item]').forEach((item) => {
        const visible = Boolean(favorites[normalizePath(item.dataset.pageId)]);
        item.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      const loading = favoritePage.querySelector('[data-favorites-loading]');
      const empty = favoritePage.querySelector('[data-favorites-empty]');
      if (loading) loading.hidden = true;
      if (empty) empty.hidden = visibleCount !== 0;
    }

    setText('[data-saved-count]', formatNumber(Object.keys(favorites).length));
  }

  function bindSupportDialog() {
    const dialog = document.querySelector('[data-support-dialog]');
    if (!dialog) return;

    let opener = null;
    document.querySelectorAll('[data-support-open]').forEach((button) => {
      button.addEventListener('click', () => {
        opener = button;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      });
    });

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => opener?.focus());
  }
})();
