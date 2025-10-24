Title: Ensuring Sharp builds on Vercel

Problem
-------
Sharp is a native module that needs prebuilt libvips binaries or to run native build scripts during install. When Vercel uses pnpm, pnpm may ignore native build scripts by default and the build log will show a warning: "Ignored build scripts: sharp. Run \"pnpm approve-builds\" to pick which dependencies should be allowed to run scripts." If Sharp isn't installed at build time, your server image processing route will fall back to uploading originals only.

Options (recommended)
----------------------

1) Use npm for the Vercel install step (fastest, simplest)

- In the Vercel dashboard for your project -> Settings -> Git -> Build & Development Settings, change the "Install Command" to:

  npm ci

- Keep your "Build Command" as `npm run build` (or `next build`). This causes Vercel to use npm instead of pnpm for the install step and allows Sharp's install scripts to run and fetch prebuilt libvips binaries.

2) Approve pnpm builds (if you must keep pnpm)

- Locally run `pnpm approve-builds` and follow the interactive prompt to allow sharp's install scripts. This writes approvals locally. Commit any generated approval file (if any) to the repo only if you understand the security implications. Vercel's build runner will then be allowed to execute those approved scripts. NOTE: the exact behavior changes across pnpm versions.

3) Avoid native builds entirely (most robust)

- Replace in-server processing with an external image CDN or transformation service (Cloudinary, Imgproxy, Supabase Image CDN). This removes the need for Sharp on your server and simplifies CI. If you choose this path, keep the server route fallback (it already uploads original files) and return transformation URLs from the CDN.

What I can do for you
----------------------
- Add a short doc (this file) with step-by-step instructions (done).
- Optionally update the repo to prefer npm installs on Vercel by adding a note in `vercel.json` or by updating project settings (this must be done in the Vercel dashboard or via the Vercel API / CLI by you or by providing CI tokens).
- Implement a Cloudinary or Supabase-transform fallback so you never depend on Sharp in CI (I can implement this if you choose that option).

Security notes
--------------
- Approving native build scripts means you trust those package install scripts run at build time. Prefer using vendor-provided prebuilt binaries or an external image service if security is a major concern.

Troubleshooting
---------------
- If the build still fails after switching to npm, check the build logs for libvips download errors — you can sometimes fix these by upgrading/downgrading `sharp` to a version with available prebuilt binaries for your target platform.
