# GanbaLog (頑張る + Log)

Aplikasi jadwal belajar JLPT — PWA minimalis, mobile-first, local-first.
Tagline: **継続は力なり** (konsistensi adalah kekuatan).

Dibangun sesuai [JLPT_STUDY_PLANNER_PLAN.md](../JLPT_STUDY_PLANNER_PLAN.md).

## Fitur

- **Today** — task harian dari jadwal mingguan, one-tap completion, countdown ke hari ujian, chip durasi belajar (opsional).
- **Fukushū otomatis** — setiap task belajar yang selesai otomatis dijadwalkan review di +3/+7/+21 hari; boleh dilewati tanpa penalti.
- **Plan** — jadwal mingguan (edit lewat bottom sheet), buku/materi dengan progress bar, checkpoint per periode.
- **Progress** — heatmap konsistensi gaya GitHub, statistik hari belajar/task selesai/jam, status semua materi & checkpoint.
- **Multi-plan** — buat plan baru (N1, bisnis nihongo, mensetsu, dll.), arsipkan yang lama, **plan aktif per-user** (pilihan Anda tidak mengubah tampilan orang lain).
- **Shared workspace (opsional)** — dengan Supabase: semua member lihat & edit semua plan, realtime refresh, login Google.
- **Audit trail** — semua aktivitas (buat/ubah/hapus/selesai) tercatat dan bisa dilihat di Settings → Riwayat.
- **Error log** — error runtime tercatat ke IndexedDB dan bisa dilihat di Settings → Diagnostik (berguna untuk debugging di HP).
- **PWA** — installable ke home screen (iOS/Android), offline via service worker, dark mode.
- Saat pertama dibuka, plan **JLPT N2 — Desember 2026** langsung ter-seed lengkap dengan materi (SKM Bunpou/Dokkai/Choukai, N2 Tango 3000, Kanji Master), jadwal mingguan, dan checkpoint per bulan.

## Menjalankan

```bash
npm install
npm run dev       # development
npm run build     # production build (dist/)
npm run preview   # preview hasil build (perlu untuk tes PWA/service worker)
```

## Tech stack

Vite 8 · React 19 · TypeScript · Tailwind CSS 4 · TanStack Query 5 · Zustand 5 · Dexie 4 (IndexedDB) · Supabase (opsional) · Motion · react-router 8 · vite-plugin-pwa

## Arsitektur

Berlapis dengan dependency injection — setiap layer hanya bergantung pada interface layer di bawahnya (Dependency Inversion):

```
src/
├── domain/               # Inti — tidak tahu soal DB maupun UI
│   ├── models.ts         # Entitas: Plan, Material, ScheduleItem, Task,
│   │                     # Checkpoint, StudyLog, AuditEvent, LogEntry
│   ├── repositories.ts   # Kontrak repository (port)
│   └── services/         # Logika bisnis: PlanService, TaskService,
│                         # StudyLogService, ReviewPolicy (fukushū)
├── data/
│   ├── local/            # Adapter IndexedDB (Dexie) — implementasi port
│   ├── supabase/         # Adapter Supabase + SQL migration
│   └── seed.ts           # Seed plan N2 pertama kali
├── core/
│   ├── di/               # Composition root (container) + ServicesProvider
│   ├── auth/             # Google login + workspace bootstrap
│   ├── session/          # Actor context (userId, workspaceId)
│   ├── logging/          # CompositeLogger, ConsoleSink, PersistentSink,
│   │                     # ErrorBoundary, global error handlers
│   ├── audit/            # AuditService
│   ├── clock.ts          # Abstraksi waktu (testable)
│   └── ids.ts            # Abstraksi ID generator
├── app/                  # Hook TanStack Query + store tema (Zustand)
└── ui/                   # Halaman & komponen — hanya memakai hook app/
```

### Mode lokal vs cloud

Tanpa env Supabase, app berjalan **local-first** (IndexedDB). Untuk workspace bersama:

1. Buat project Supabase, jalankan `supabase/migrations/001_collaborative_schema.sql`.
2. Aktifkan Google OAuth di Supabase Auth.
3. Salin `.env.example` → `.env` dan isi `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` dari Dashboard → Settings → API.
4. `npm run dev` — login lewat Settings → Workspace.

Container (`src/core/di/container.ts`) otomatis memilih repository lokal atau Supabase.

## Deploy

Static build — deploy `dist/` ke Vercel/Cloudflare Pages/Netlify gratis.
Untuk SPA routing, arahkan fallback ke `index.html` (otomatis di Vercel dengan
framework preset Vite).
