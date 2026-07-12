# GanbaLog (頑張る + Log)

Aplikasi belajar ber-target untuk orang yang **susah konsisten** — PWA minimalis, mobile-first, local-first.

JLPT, TOEIC, IELTS, nihongo bisnis, mensetsu, sertifikasi apapun: yang penting ada **target**, **langkah harian**, dan **ritme yang terjaga**.

Tagline: **継続は力なり** (konsistensi adalah kekuatan).

## Untuk siapa?

- Kamu punya tujuan belajar (ujian, sertifikasi, skill baru) tapi sering putus di tengah
- Butuh checklist harian supaya tidak bingung "hari ini ngapain?"
- Mau belajar bareng teman dan saling lihat progress (mode cloud)

## Navigasi (4 tab)

| Tab | Fungsi |
|-----|--------|
| **Today** | Checklist harian, streak, countdown target — tap nama plan untuk ganti plan |
| **My plan** | Jadwal · Buku · Milestone (segmented); hub plan (buat/ganti/sample/share) |
| **Stats** | Angka headline, aktivitas terbaru, heatmap (unlock setelah 7 hari), progress grup |
| **Settings** | Akun/grup, bahasa, tema, backup data, opsi lanjutan (arsip plan, import JSON, log) |

## Fitur

- **Today** — task harian (study + catch-up review dalam satu list), one-tap completion, countdown ke target, log waktu opsional, streak dari task selesai.
- **Review otomatis** — setiap task belajar selesai dijadwalkan review +3/+7/+21 hari; boleh dilewati.
- **My plan** — jadwal mingguan (Mon–Fri bisa di-collapse), materi dengan tag & progress, milestone; setup guide 2 langkah untuk plan kosong.
- **Stats** — snapshot plan, filter (muncul setelah cukup data), heatmap 8→18 minggu, kartu grup (cloud).
- **Multi-plan** — hub di My plan / Today: buat blank, dari sample (JLPT/TOEIC/IELTS), edit, share link, export JSON, arsip.
- **Grup belajar (cloud)** — undang via kode; progress grup di tab Stats; kelola akun di Settings.
- **PWA** — modal install otomatis (Android/desktop), iOS via Settings, offline banner, toast update SW.
- **Onboarding** — default plan kosong; opsional pilih sample.
- **i18n** — English, Indonesia, 日本語, Myanmar.

## Menjalankan

```bash
cd ganbalog
npm install
npm run dev       # development (port 5173)
npm run build     # production build (dist/)
npm run preview   # preview hasil build (perlu untuk tes PWA/service worker)
npm run pwa:icons # regenerate PWA icons (scripts/generate-pwa-icons.mjs) setelah ganti public/logo.png
npm run lint      # oxlint
npm test          # vitest unit tests
```

## Tech stack

Vite 8 · React 19 · TypeScript · Tailwind CSS 4 · TanStack Query 5 · Zustand 5 · Dexie 4 (IndexedDB) · Supabase (opsional) · Motion · react-router 8 · vite-plugin-pwa

## Arsitektur

Berlapis dengan dependency injection:

```
src/
├── domain/               # Inti — tidak tahu soal DB maupun UI
├── data/                 # IndexedDB + Supabase adapters, study templates
├── core/                 # Auth, DI, logging, workspace
├── app/                  # TanStack Query + i18n + PWA
└── ui/                   # Halaman & komponen
```

### Mode lokal vs cloud

| | Lokal (tanpa Supabase) | Cloud (Supabase) |
|---|---|---|
| Penyimpanan | IndexedDB di perangkat | Postgres + sync realtime |
| Task harian | Satu user | **Per anggota** |
| Plan / jadwal / materi | Pribadi | **Dibagi** di grup |
| Progress | Pribadi | Pribadi + **kartu grup** |
| Login | Tidak perlu | Google OAuth |

Tanpa env Supabase, app berjalan **local-first** (IndexedDB).

#### Setup cloud (grup belajar)

1. Buat project Supabase.
2. Apply schema dengan **Supabase CLI** (bukan SQL Editor manual):
   ```bash
   npm run db:login
   npm run db:link    # pilih project xnlyyzizpphpfidfxbvb (atau project baru)
   npm run db:push    # jalankan semua migration di supabase/migrations/
   npm run db:status  # cek remote vs local
   ```
   Butuh **Database password** (Settings → Database). Install CLI: `brew install supabase/tap/supabase`.
3. Aktifkan **Google OAuth** + redirect URL production & dev.
4. Salin `.env.example` → `.env`, isi `VITE_SUPABASE_*` (dan set yang sama di Vercel).
5. `npm run dev` → login → **Settings → Account** untuk workspace.

Migration berikutnya: tambah file `supabase/migrations/YYYYMMDDHHmmss_nama.sql`, lalu `npm run db:push` (atau push ke `main`/`develop` supaya GitHub Action yang push).

> Jangan auto-migrate dari browser/app — butuh privilege DB. CLI / CI saja.

## Deploy

Static build — deploy `dist/` ke Vercel/Cloudflare Pages/Netlify.
Jalankan `npm run build` sebelum deploy.

### Create with AI (OpenAI)

Butuh login Google. API key **hanya** di server (Vercel env), bukan `VITE_*`:

1. Vercel → Project → Settings → Environment Variables:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL` (sama dengan `VITE_SUPABASE_URL`)
   - `SUPABASE_PUBLISHABLE_KEY` (sama dengan publishable/anon key)
2. Redeploy (`vercel --prod`).
3. Di app: Plan hub → **Create with AI** (goal, tanggal, hari belajar, intensitas).

Lokal: `vercel dev` (bukan hanya `npm run dev`) supaya `/api/generate-plan` tersedia.

## Checklist sebelum publish (cloud)

- [ ] `npm run db:push` (migration terbaru di remote)
- [ ] Env OpenAI + Supabase di Vercel (untuk Create with AI)
- [ ] Google OAuth redirect URL production
- [ ] `npm run lint && npm test && npm run build` lulus
- [ ] Tes join grup + progress realtime
- [ ] Halaman `/legal`
- [ ] Tes import plan via link share + JSON

## Checklist lokal / PWA personal

- [x] Mode tanpa Supabase (IndexedDB)
- [x] Onboarding plan kosong + sample template
- [x] Export/import plan JSON & link share
- [x] Background study reminder (SW + Periodic Sync di Android Chrome PWA)
- [x] Toast reload setelah update service worker
- [ ] Tes install PWA di iOS/Android (lihat **QA manual** di bawah)
- [ ] Tes offline banner (cloud) & reload setelah update SW
- [ ] Uji 3–5 pengguna non-teknis (copy task di bawah)

### QA manual — PWA & offline

Jalankan **`npm run build && npm run preview`** (service worker hanya aktif di production build).

#### Android (Chrome)

1. Buka preview URL — modal **Install GanbaLog** muncul otomatis (Android Chrome / desktop).
2. Tap **Install app** → dialog native browser.
3. Setelah terinstall, buka dari browser lagi — modal **Open in app** jika terdeteksi.
4. **iOS:** tidak ada modal otomatis — Settings → Preferences → Add to Home Screen.
2. Buka dari home screen (standalone) — pastikan bottom nav tidak menutupi konten di Today, Plan, Stats, Settings.
3. **Offline:** matikan Wi‑Fi/data → buka app → Today & Plan masih load (IndexedDB). Cloud: banner offline muncul.
4. **Update SW:** deploy build baru → buka app → toast “versi baru” → tap **Reload** → halaman refresh.
5. **Reminder:** Settings → aktifkan reminder → izinkan notifikasi → (opsional) tunggu jam reminder atau uji dengan set jam = jam sekarang + 1 menit via devtools tidak applicable — set jam ke jam berikutnya, biarkan PWA di background (Android).

#### iOS (Safari → Add to Home Screen)

1. Install PWA dari Safari.
2. Buka standalone — cek safe area (notch) dan scroll ke bawah Settings/Plan.
3. **Offline:** mode pesawat → app tetap buka untuk mode lokal.
4. **Reminder:** iOS terbatas — reminder background tidak dijamin; foreground reminder saat app terbuka tetap jalan.

#### Reload / regression cepat (desktop)

```bash
npm run lint && npm test && npm run build && npm run preview
```

- [ ] Today: complete task, streak, log time
- [ ] Plan: segmented tabs, tambah material, milestone
- [ ] Stats: insight card, heatmap setelah 7 hari (seed/dev)
- [ ] Settings: Help FAQ, text size, contrast, reminder toggle
- [ ] Plan hub: ganti plan, sample, share link

### Skrip uji pengguna non-teknis (15 menit)

Berikan tanpa dokumentasi — amati di mana mereka bingung:

1. “Apa yang harus kamu lakukan hari ini?” (harus ke Today)
2. “Ganti rencana belajarmu.” (Plan hub / tap nama plan)
3. “Lihat apakah kamu konsisten minggu ini.” (Stats)
4. “Ajak teman belajar bareng.” (Settings → Study group — skip jika lokal)
5. “Cari bantuan kalau bingung.” (Settings → Help)

Catat: tab pertama yang mereka tap, istilah yang mereka tidak pahami, apakah Settings terasa “admin”.
