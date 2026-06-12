# ROADMAP.md — Bio-link Upgrade Implementation Roadmap

> **Current Milestone**: v1.0 (Initial GSD Setup & Codebase Mapping)
> **Goal**: Establish development workflow, map existing codebase, and plan first feature milestone.

## Milestones
- 🔄 **v1.0 Setup & Mapping** — In Progress

## Must-Haves
- [ ] Codebase fully mapped
- [ ] SPEC.md defined and FINALIZED
- [ ] First development milestone planned

## Phases

### Phase 1: Codebase Mapping & Project Definition
**Status**: ⬜ Planned
**Goal**: Map the existing codebase, understand what's built, define what needs to be built.
**Success Criteria**:
1. ARCHITECTURE.md reflects actual codebase structure.
2. SPEC.md is FINALIZED with clear requirements.
3. STACK.md documents all technologies in use.

### Phase 2: Security Hardening
**Status**: ✅ Complete
**Goal**: Harden the application against XSS, debugging/reverse-engineering, and backend vulnerabilities.
**Success Criteria**:
1. Inline unsafe scripts removed or isolated.
2. Developer tools shortcuts (F12) explicitly blocked.
3. Redirect route strictly validates HTTP/HTTPS protocols.
4. RLS migration prepared for database.

---
*Last updated: 2026-06-11 — GSD installed*
