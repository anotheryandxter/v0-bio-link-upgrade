Feature: Embedded redirect URLs (?source=slug)

Overview:
- Admins can optionally set an `Embedded Slug` on any link via the dashboard link editor.
- When set, the site will accept requests in the format: `https://<your-domain>/?source=<slug>` and automatically redirect the visitor to the configured link's destination URL.
- The redirect is logged using the same analytics RPC (`insert_click_if_not_exists`) so clicks from embedded URLs are tracked like normal clicks.

How it works:
- Dashboard: the `LinkForm` component includes an "Embedded Slug (optional)" field. Enter a short identifier (lowercase letters, numbers, hyphen, underscore) and save.
- Preview: the form shows a `window.location.origin` preview: `https://your-site.com?source=slug`.
- Redirect: the middleware checks for a `source` query param and forwards to a server API route `/api/embed/redirect?source=slug`.
- The server route performs an admin lookup for the link by `embed_slug`, calls the analytics RPC to record the click, and returns a 307 redirect to the link URL.

Notes and constraints:
- Slugs must match /^[a-z0-9_-]{1,64}$/.
- If your database schema does not yet include the `embed_slug` column, the UI will still allow saving links (the client retries without the field to remain compatible). To persist embed slugs across deploys, add the `embed_slug` column to your `links` table, e.g.:

  ALTER TABLE links ADD COLUMN embed_slug text;

- In production behind a CDN (Vercel), middleware/edge caching may affect how quickly new slugs become active after deployment. A normal redeploy or cache purge will propagate the new assets.

Security and abuse considerations:
- Slugs are public and cause immediate redirect to arbitrary URLs configured by profile owners. Consider adding rate limits or abuse detection at the analytics RPC if you expect malicious usage.
- The embed route records IP, user-agent, and referrer similar to normal link clicks.

If you want, I can:
- Add a migration script to add the `embed_slug` column to the database schema in `scripts/`.
- Add server-side uniqueness enforcement (DB unique index) and UI feedback when a slug is already taken.
- Add a QR-code/one-click copy UI in the dashboard for quick distribution.
