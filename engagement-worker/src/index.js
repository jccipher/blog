const DEFAULT_ORIGINS = [
  'https://jccipher.github.io',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin');
    const allowedOrigins = String(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(','))
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (origin && !allowedOrigins.includes(origin)) {
      return json({ error: 'Origin is not allowed.' }, 403);
    }

    const cors = origin
      ? {
          'access-control-allow-origin': origin,
          vary: 'Origin',
        }
      : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
        },
      });
    }

    const url = new URL(request.url);

    try {
      if (request.method === 'POST' && url.pathname === '/v1/visit') {
        const input = await readPayload(request);
        const visitorId = validateVisitorId(input.visitorId);
        const path = validatePath(input.path);
        const now = new Date().toISOString();
        const hourBucket = now.slice(0, 13);

        await env.DB.batch([
          env.DB.prepare(
            `INSERT INTO visitors (visitor_id, first_seen_at, last_seen_at)
             VALUES (?1, ?2, ?2)
             ON CONFLICT(visitor_id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
          ).bind(visitorId, now),
          env.DB.prepare(
            `INSERT OR IGNORE INTO page_view_events (visitor_id, path, hour_bucket, viewed_at)
             VALUES (?1, ?2, ?3, ?4)`,
          ).bind(visitorId, path, hourBucket, now),
        ]);

        return json(await getSummary(env.DB, path), 200, cors);
      }

      if (request.method === 'POST' && url.pathname === '/v1/favorite') {
        const input = await readPayload(request);
        const visitorId = validateVisitorId(input.visitorId);
        const path = validatePath(input.path);

        if (input.active === true) {
          const now = new Date().toISOString();
          await env.DB.batch([
            env.DB.prepare(
              `INSERT INTO visitors (visitor_id, first_seen_at, last_seen_at)
               VALUES (?1, ?2, ?2)
               ON CONFLICT(visitor_id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
            ).bind(visitorId, now),
            env.DB.prepare(
              `INSERT INTO favorites (visitor_id, path, created_at)
               VALUES (?1, ?2, ?3)
               ON CONFLICT(visitor_id, path) DO NOTHING`,
            ).bind(visitorId, path, now),
          ]);
        } else if (input.active === false) {
          await env.DB.prepare(
            'DELETE FROM favorites WHERE visitor_id = ?1 AND path = ?2',
          ).bind(visitorId, path).run();
        } else {
          throw new RequestError('active must be a boolean.');
        }

        const result = await env.DB.prepare(
          'SELECT COUNT(*) AS count FROM favorites WHERE path = ?1',
        ).bind(path).first();
        return json({ favoriteCount: Number(result?.count || 0) }, 200, cors);
      }

      if (request.method === 'GET' && url.pathname === '/v1/summary') {
        return json(await getSummary(env.DB, validatePath(url.searchParams.get('path'))), 200, cors);
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ status: 'ok' }, 200, cors);
      }

      return json({ error: 'Not found.' }, 404, cors);
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, 400, cors);
      console.error(error);
      return json({ error: 'Unexpected service error.' }, 500, cors);
    }
  },
};

class RequestError extends Error {}

async function readPayload(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4096) throw new RequestError('Payload is too large.');

  let payload;
  try {
    payload = await request.json();
  } catch {
    throw new RequestError('A JSON request body is required.');
  }
  if (JSON.stringify(payload).length > 4096) throw new RequestError('Payload is too large.');
  return payload;
}

function validateVisitorId(value) {
  const visitorId = String(value || '');
  if (!/^v_[a-f0-9]{16,40}$/i.test(visitorId)) throw new RequestError('Invalid visitor ID.');
  return visitorId.toLowerCase();
}

function validatePath(value) {
  let path = String(value || '').split(/[?#]/, 1)[0];
  if (!path.startsWith('/') || path.length > 300 || /[\u0000-\u001f]/.test(path)) {
    throw new RequestError('Invalid page path.');
  }
  if (!path.endsWith('/') && !path.endsWith('.html')) path += '/';
  return path.replace(/\/+/g, '/');
}

async function getSummary(db, path) {
  const [pageViews, siteViews, uniqueVisitors, latestVisitor, favoriteCount] = await db.batch([
    db.prepare('SELECT COUNT(*) AS count FROM page_view_events WHERE path = ?1').bind(path),
    db.prepare('SELECT COUNT(*) AS count FROM page_view_events'),
    db.prepare('SELECT COUNT(*) AS count FROM visitors'),
    db.prepare('SELECT visitor_id FROM visitors ORDER BY last_seen_at DESC LIMIT 1'),
    db.prepare('SELECT COUNT(*) AS count FROM favorites WHERE path = ?1').bind(path),
  ]);

  return {
    pageViews: resultCount(pageViews),
    siteViews: resultCount(siteViews),
    uniqueVisitors: resultCount(uniqueVisitors),
    latestVisitorId: maskVisitorId(latestVisitor.results?.[0]?.visitor_id),
    favoriteCount: resultCount(favoriteCount),
  };
}

function maskVisitorId(visitorId) {
  if (!visitorId) return null;
  return `v_${String(visitorId).slice(-8)}`;
}

function resultCount(result) {
  return Number(result.results?.[0]?.count || 0);
}

function json(payload, status = 200, extraHeaders = {}) {
  return Response.json(payload, {
    status,
    headers: {
      ...extraHeaders,
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
  });
}
