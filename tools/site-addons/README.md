# T5 site additions

This isolated package supplies a contact Worker and post-processing for an existing static site build. The confirmed site repository is `DLAte-1201/dlate-1201.github.io`, checked out for this task at `/workspace/site-t5`. Its README identifies it as published static output with development sources in a separate working copy. That development working copy/build framework, real D1 binding, Cloudflare credentials, and Analytics site token were not present. This package is staged in the confirmed site repository; no existing portfolio pages or Glance application files are changed. Source build integration and live checks remain BLOCKED.

## Install and verify

Use Node 22 or newer and a system font covering your page languages (for Korean, Noto Sans CJK KR).

```sh
cd tools/site-addons
npm ci
npm test
npm run db:local
npm run check:worker
```

In a restricted cloud workspace, use `npm ci --cache /tmp/t5-npm-cache` and prefix Wrangler commands with `XDG_CONFIG_HOME=/tmp/t5-xdg WRANGLER_SEND_METRICS=false` if its default cache/log directory is unavailable.

Tests generate and decode PNG/AVIF/WebP, verify page metadata and repeat builds, and exercise contact JSON/form submission against real local D1 using Miniflare. The Wrangler configuration is local only, with a dummy database ID. These commands neither create a Cloudflare resource nor apply a remote migration. `check:worker` bundles using `--dry-run`.

## Site build hook

Run this **after** the site framework's static build, passing that build's output directory. The tool rewrites HTML in that directory; pass a disposable build output, never the source repository. Do not use `app/static` as the marketing site.

```sh
# Substitute the actual site build output and canonical base URL.
# Supply an already registered Web Analytics site token through the environment.
CF_WEB_ANALYTICS_TOKEN=<existing-site-token> npm run build -- /path/to/site/dist https://reseorch-ai.com/
```

Run separately for the launcher build with `https://glance.reseorch-ai.com/`. A base URL may include a hosting prefix. Existing title, description, copy, image attributes and original images supply all content; no new marketing copy or UI is authored here.

The build creates 1200×630 PNG OG images under `_site-addons/og/`, then sets absolute `og:image` metadata in each HTML page. It writes `image.png.avif` / `image.png.webp` (also for JPEG) and wraps eligible local `<img>` elements in AVIF → WebP → original `<picture>` fallbacks. Animated images, existing pictures, and responsive `srcset` markup are retained. CSS background images and existing responsive image pipelines are not rewritten. Original files remain byte-preserved. Generated assets and markup can be rebuilt; only build outputs should be published.

The Analytics beacon uses the official manual snippet. `CF_WEB_ANALYTICS_TOKEN` is the public site token, **not** a Cloudflare API credential. If absent, the build completes OG/image work and reports Analytics BLOCKED without adding a beacon. Existing externally managed beacons are preserved; use manual injection or automatic Cloudflare injection, avoiding both. If a site has a CSP, its existing owner must account for the beacon script and collection endpoint during integration; this task does not change policy.

## Contact endpoint

`worker/contact.mjs` exports a Worker fetch handler for same-origin `POST /api/contact`. JSON, URL-encoded forms and multipart forms accept `email`, `message`, and optional `name`. Success is HTTP 201 `{"ok":true}` only after the D1 insert succeeds. Malformed input returns 400/415, unavailable D1 returns 503, unsupported methods return 405 and other paths return 404. There is no public inquiry-list endpoint. It stores inquiries; it does not send email or call an external service.

```sh
npm run db:local
npm run dev
# In another terminal, submit synthetic data only:
curl -i http://localhost:8787/api/contact \
  -H 'Content-Type: application/json' \
  --data '{"email":"test@example.org","message":"local smoke test"}'
```

Use the existing site's form and connect its submission handler to this endpoint once the source is supplied. For an existing T2/T3 Worker, route `/api/contact` to this handler in the shared router and add its `CONTACT_DB` binding; do not replace the other routes or their configuration. Apply `migrations/0001_contact_messages.sql` to the already provisioned D1 through the owner's normal release procedure. The table is independent of T3's `waitlist`. No form markup is invented because UI design/copy is outside this task and the target source is absent.

## Integration prerequisites still needed

- Make the separate development working copy and launcher source/build command available, then wire this post-build hook and the existing inquiry form.
- Supply the existing Cloudflare account/D1 binding and credentials for the owner to release and test the Worker. No account, database, route, DNS, or Access policy was created or changed.
- Supply the already registered Web Analytics site token, then verify beacon delivery on the real hostname and dashboard ingestion after the owner deploys.

No paid service was invoked or new permission requested. Local tests cannot establish production routing, D1 persistence or Analytics ingestion.

References: [Cloudflare local development](https://developers.cloudflare.com/d1/best-practices/local-development/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Web Analytics manual beacon](https://developers.cloudflare.com/web-analytics/faq/).
