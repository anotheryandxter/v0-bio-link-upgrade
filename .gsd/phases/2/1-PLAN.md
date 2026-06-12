---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Frontend XSS Prevention & Anti-Debugging

## Objective
Harden the frontend against XSS by removing `dangerouslySetInnerHTML` and disable browser debugging features (F12, DevTools) to prevent reverse engineering. Enforce security headers to mitigate clickjacking and source map leakage.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- app/layout.tsx
- app/page.tsx
- next.config.mjs

## Tasks

<task type="auto">
  <name>Harden layout.tsx and Anti-Debugging Script</name>
  <files>app/layout.tsx</files>
  <action>
    - Expand the existing easter-egg script inside `app/layout.tsx` to explicitly block F12 (`e.keyCode === 123` or `e.key === 'F12'`), Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, and Ctrl+Shift+C.
    - Remove `dangerouslySetInnerHTML` for inline styles and CSS preloads if possible, or convert them into proper React elements (`<style>{`...`}</style>`).
  </action>
  <verify>grep -q "F12" app/layout.tsx</verify>
  <done>F12 and DevTools shortcuts are explicitly blocked.</done>
</task>

<task type="auto">
  <name>Refactor ServerPreloader in page.tsx</name>
  <files>app/page.tsx</files>
  <action>
    - Refactor the `ServerPreloader` component to eliminate the use of `dangerouslySetInnerHTML`.
    - Extract the preloader logic into a client component or use standard React hooks like `useEffect` if client-side execution is needed, while preserving the fast-paint properties.
  </action>
  <verify>grep -q "dangerouslySetInnerHTML" app/page.tsx || echo "Clean"</verify>
  <done>`dangerouslySetInnerHTML` is removed from `app/page.tsx`.</done>
</task>

<task type="auto">
  <name>Configure Security Headers & Disable Source Maps</name>
  <files>next.config.mjs</files>
  <action>
    - Update `next.config.mjs` to add `productionBrowserSourceMaps: false`.
    - Add `async headers()` rules for `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
  </action>
  <verify>grep -q "X-Frame-Options" next.config.mjs</verify>
  <done>Security headers are enforced and production source maps are disabled.</done>
</task>

## Success Criteria
- [ ] F12 and DevTools shortcuts are blocked on the client side.
- [ ] `dangerouslySetInnerHTML` is removed or strictly isolated.
- [ ] Security headers are applied to the Next.js config.
