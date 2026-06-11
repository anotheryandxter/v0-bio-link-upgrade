# SPEC.md — Bio-link Upgrade

**Status:** DRAFT (not finalized — run `/new-project` or `/map` to complete)

---

## Product Overview

Bio-link Upgrade adalah platform bio-link (link-in-bio) yang memungkinkan kreator dan bisnis menampilkan semua link penting dalam satu halaman yang dapat dikustomisasi. Dibangun di atas Next.js 16 dan Supabase.

## Target Users

- Kreator konten (YouTuber, Instagram, TikTok)
- Bisnis kecil dan UMKM
- Profesional yang ingin satu halaman profil digital

## Core Requirements

### Authentication
- [ ] Login / register dengan email
- [ ] Reset password
- [ ] Session management via Supabase Auth

### Bio-link Profile
- [ ] Halaman publik dengan username/slug unik
- [ ] Tampilkan nama, bio, avatar
- [ ] Daftar link dengan judul, URL, icon
- [ ] Kustomisasi tema/warna halaman

### Dashboard (Admin)
- [ ] CRUD links (tambah/edit/hapus)
- [ ] Reorder links dengan drag & drop
- [ ] Statistik klik per link
- [ ] Upload avatar

### Analytics
- [ ] Tracking klik per link
- [ ] Total views per profil
- [ ] (Opsional) Referrer tracking

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database/Auth**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI
- **Hosting**: Vercel

## Out of Scope
- Payment/monetization
- Custom domains (phase 2)
- Team/multi-user per account

---
*Created: 2026-06-11 — GSD installed, awaiting /map and /new-project to finalize*
