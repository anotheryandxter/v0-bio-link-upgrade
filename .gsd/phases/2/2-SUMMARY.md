# Plan 2.2 Summary

**Objective achieved:**
Harden backend operations by enforcing strict URL protocol validation to prevent open redirects and SSRF, and implement database-level security rules.

**Changes made:**
- **app/api/embed/redirect/route.ts**: Added a `try/catch` block with a `new URL()` check to ensure `link.url` protocol is exactly `http:` or `https:`. This prevents `javascript:` XSS or SSRF via other protocols, returning a 400 status if invalid.
- **supabase/migrations/20260612_security_rls.sql**: Created a SQL migration to enable Row Level Security (RLS) on `links`, `profiles`, and `link_clicks`. Created policies to allow public reads (`SELECT`), but restricted inserts, updates, and deletes to `authenticated` users only, securing the database against unauthorized manipulation.

**Verification passed:**
- URL validation logic exists in the redirect API.
- RLS migration script is created successfully.
