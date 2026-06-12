---
phase: 2
plan: 2
wave: 2
---

# Plan 2.2: Backend Security & Redirection Validation

## Objective
Harden backend operations by enforcing strict URL protocol validation to prevent open redirects and SSRF, and implement basic database-level security rules.

## Context
- .gsd/SPEC.md
- app/api/embed/redirect/route.ts

## Tasks

<task type="auto">
  <name>Secure Embed Redirect Route</name>
  <files>app/api/embed/redirect/route.ts</files>
  <action>
    - Add URL parsing validation before `NextResponse.redirect(link.url, 307)`.
    - Ensure `link.url` uses `http:` or `https:` protocol. Reject `javascript:`, `file:`, or `data:` schemes by returning a 400 Bad Request response.
  </action>
  <verify>grep -q "URL" app/api/embed/redirect/route.ts</verify>
  <done>Embed redirect rejects non-HTTP/HTTPS URLs.</done>
</task>

<task type="auto">
  <name>Supabase RLS & Input Sanitization Planning</name>
  <files>supabase/migrations/20260612_security_rls.sql</files>
  <action>
    - Create a new migration file `supabase/migrations/20260612_security_rls.sql`.
    - Add SQL to enable Row Level Security (RLS) on `links`, `profiles`, and `link_clicks`.
    - Add policies to allow `SELECT` for anonymous users, but restrict `INSERT` and `UPDATE` on `links` and `profiles` to authenticated users only.
  </action>
  <verify>test -f supabase/migrations/20260612_security_rls.sql</verify>
  <done>RLS migration is prepared for database hardening.</done>
</task>

## Success Criteria
- [ ] Redirect route strictly validates URLs to prevent open redirects.
- [ ] RLS policies are drafted to secure the Supabase database.
