# Uploads & Image Variants

This project includes a server-side upload flow that:

- Accepts `multipart/form-data` uploads at `POST /api/uploads` (pages API)
- Generates WebP variants at widths [320, 640, 1200] and an optimized JPEG (1200px)
- Uploads generated files to Supabase Storage (default `public` bucket)
- Sets `Cache-Control: public, max-age=31536000` on uploads
- Returns JSON with public URLs for use in the UI

Why server-side processing?
- Sharp is faster and more robust on the server than client-side canvas for producing WebP and multi-size variants.
- Ensures consistent output formats and sizes for faster mobile LCP.

Low-cost CDN + Brotli/Gzip recommendations

1) Use Supabase's built-in CDN: Supabase storage endpoints are typically served via CDN. Confirm with Supabase docs for your project.

2) If you want an external free/low-cost front door with Brotli/Gzip and caching rules, use Cloudflare in front of your storage domain:
   - Create a Cloudflare account (free tier is usually enough).
   - Add a DNS CNAME pointing a subdomain (e.g. `cdn.example.com`) to your Supabase storage hostname.
   - On Cloudflare, enable `Brotli` and `Auto Minify` (JS/CSS/HTML), and set `Caching` rules to respect the origin `Cache-Control` headers.
   - Configure `Cache-Control` for long-lived assets (we already set `public, max-age=31536000`).

3) Alternative: Push variants to S3 + CloudFront (incurs costs). Not needed if Cloudflare fronting Supabase works for your needs.

Security notes
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. The upload endpoint uses the server service role key.
- Use signed uploads if you want clients to upload directly to storage without exposing admin keys.

How to test
- Start dev server: `npm run dev`
- Use the UI image upload or POST to `/api/uploads` with a `file` field. The handler returns JSON with `uploaded` (array of variants) and `jpeg`.

