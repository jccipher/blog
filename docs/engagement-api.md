# Blog engagement service

The blog works without a backend in `LOCAL` privacy mode. In that mode the visitor ID, view counts, and saved posts belong only to the current browser. Deploy the included Cloudflare Worker when shared counters should be durable across visitors.

The service intentionally stores only:

- a random browser-generated visitor ID;
- the normalized page path and an hourly view bucket;
- favorite state; and
- timestamps.

The application does not collect names, emails, user agents, referrers, or persist IP addresses. A repeated view from the same visitor on the same page within one hour counts once. The public summary exposes only the final eight characters of the latest random visitor ID.

## Deploy the Worker

From `engagement-worker/`:

1. Copy `wrangler.jsonc.example` to `wrangler.jsonc`.
2. Run `npx wrangler d1 create jccipher-blog-engagement` and put the returned database ID in `wrangler.jsonc`.
3. Run `npx wrangler d1 migrations apply jccipher-blog-engagement --remote`.
4. Run `npx wrangler deploy`.
5. Put the deployed Worker origin in `_config.yml` as `engagement.api_endpoint`.

Keep `ALLOWED_ORIGINS` restricted to the production blog origin and the local preview origins that are actually used.

## API contract

`POST /v1/visit`

```json
{
  "visitorId": "v_0123456789abcdef01234567",
  "path": "/posts/example/",
  "language": "en"
}
```

Returns `latestVisitorId`, `pageViews`, `siteViews`, `uniqueVisitors`, and `favoriteCount`.

`POST /v1/favorite`

```json
{
  "visitorId": "v_0123456789abcdef01234567",
  "path": "/posts/example/",
  "active": true
}
```

Returns the shared favorite count for the page.

`GET /v1/summary?path=/posts/example/` returns the same summary without recording a view. `GET /health` returns service health.

## Configure donations

Add a verified hosted payment page to `_config.yml`:

```yaml
support:
  donation_url: "https://your-trusted-payment-page.example"
  donation_provider: "Provider name"
```

The donation link opens in a separate tab with opener isolation. If no URL is configured, the dialog clearly reports that payments are not active and offers only GitHub and email support links.
