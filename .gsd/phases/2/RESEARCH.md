---
phase: 2
level: 3
researched_at: 2026-06-12
---

# Phase 2 Research: Security Hardening

## Questions Investigated
1. How to secure the Next.js frontend against XSS, especially considering `dangerouslySetInnerHTML`?
2. What protections are needed for URL redirects to prevent open redirect and SSRF vulnerabilities?
3. How to harden the Supabase backend against injection, unauthorized access, and rate-limit abuse?
4. What general app hardening practices prevent reverse engineering and pentester discovery?

## Findings

### Frontend & XSS Prevention
We found `dangerouslySetInnerHTML` used in `app/page.tsx` and `app/layout.tsx` for preloaders and easter-egg logic. These are currently static strings and not immediately exploitable, but they enforce a requirement for `'unsafe-inline'` scripts in Content Security Policy (CSP).
- **Recommendation**: To implement a strong CSP without `'unsafe-inline'`, we must refactor inline scripts into separate files or use CSP nonces generated per request in middleware. Any future dynamic content injected must be sanitized using `DOMPurify`.

### URL Redirection Security
The `/api/embed/redirect/route.ts` redirects based on `link.url` from the database using `NextResponse.redirect`.
- **Vulnerability**: If an admin inputs `javascript:alert(1)` or an internal IP like `http://localhost:3000`, the redirect could lead to XSS or SSRF.
- **Recommendation**: Enforce URL validation both on the frontend dashboard and backend database. Ensure the URL scheme is strictly `http:` or `https:`, rejecting `javascript:`, `data:`, and `file:` schemes.

### Backend Hardening (Supabase)
The app uses Supabase with client-side and server-side components. Analytics tracking and click logging pass user agents, referrers, and IPs directly to RPCs like `insert_click_if_not_exists`.
- **Recommendation**: Implement Row Level Security (RLS) comprehensively. Restrict `INSERT` access to `link_clicks` to only authenticated service roles or via rate-limited API routes. Sanitize headers (e.g., truncate `user-agent` to prevent database overflow or injection). Implement API rate limiting on `/api/analytics/*` and `/api/embed/*` to prevent abuse.

### App Hardening & Anti-Reverse Engineering
The app uses a client-side easter egg (8 clicks on the background) to navigate to `/login`. It also has basic script-based right-click blocking.
- **Recommendation**: Client-side right-click blockers are easily bypassed. True hardening requires:
  1. **Strict CSP & Security Headers**: Set `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: SAMEORIGIN` (to prevent clickjacking unless embedding is desired, then use `frame-ancestors`).
  2. **Disable Source Maps**: Ensure `productionBrowserSourceMaps: false` in `next.config.mjs` to hide source code from pentesters.
  3. **Obfuscation**: For specific client-side logic that must be hidden (if any), consider obfuscation, but generally relying on backend enforcement is safer.

## Decisions Made
| Decision | Choice | Rationale |
|----------|--------|-----------|
| XSS Prevention | Implement strict CSP with nonces | Protects against injection in Next.js without breaking inline styles/scripts if managed properly via middleware. |
| URL Security | Protocol Allowlisting | Rejecting `javascript:` prevents stored XSS via the redirect endpoint. |
| Backend Access | Supabase RLS & Rate Limiting | Prevents API abuse and unauthorized data scraping. |

## Patterns to Follow
- **Defense in Depth**: Validate inputs on the client dashboard, the API route, and at the database level.
- **Strict Protocol Validation**: Use URL constructors to validate all outbound links.
- **Context-Aware Encoding**: Use Next.js built-in escaping; avoid `dangerouslySetInnerHTML` when possible.

## Anti-Patterns to Avoid
- **Unsafe Inline Scripts**: Relying on inline scripts forces weakened CSP.
- **Trusting Client Headers**: IP, User-Agent, and Referrer can be spoofed; do not use them for logic without sanitization.

## Dependencies Identified
| Package | Version | Purpose |
|---------|---------|---------|
| dompurify | latest | Sanitizing any user-supplied rich text or HTML. |
| @upstash/ratelimit | latest | (Optional) For Next.js edge rate-limiting if Redis is available. |

## Risks
- **Refactoring Inline Scripts**: Might temporarily break the preloader or easter egg if CSP is overly strict. Mitigation: Test CSP in report-only mode first.

## Ready for Planning
- [x] Questions answered
- [x] Approach selected
- [x] Dependencies identified
