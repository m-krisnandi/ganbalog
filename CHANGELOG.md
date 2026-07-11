# Changelog

## 0.2.0 — 2026-07-11

### Added
- **Plan hub** on My plan & Today — switch, create, samples, edit, share, export, archive
- Segmented My plan: Schedule · Books · Milestones
- Stats: insight card, recent activity, heatmap unlock (7 days) + expand to 18 weeks
- Settings: Help FAQ, text size, high contrast, opt-in daily reminder
- **Background reminder** via service worker (`sw-reminder.js`) + Periodic Background Sync (Android PWA)
- Setup guide on My plan (2 steps); NavCoach inline on Today
- Seed migration v3: Weekly reflection rename + duplicate schedule dedupe
- Review tasks use `Review:` prefix; unified Today task list
- UI surfaces: `PageHeader`, `ListPanel`, `StatTile`, `EmptyPanel` (flatter hierarchy)
- PWA: reload button on update toast; offline-ready toast
- **Install banner** — modal install otomatis Android/desktop (alur HRMS, tampilan GanbaLog); iOS hanya di Settings
- README: QA manual (iOS/Android/offline) + non-technical user test script

### Changed
- Settings simplified — plans moved to My plan hub; archived/import under Troubleshooting
- Nav labels: My plan, Stats; microcopy (Study materials, Study group, Milestones)
- Progress shows plan snapshot instead of full duplicate lists
- Cards flattened (`rounded-xl`, no stacked shadows); list rows use `ListPanel`
- Material row actions moved to detail sheet only
- Removed global workspace banner (group stats on Stats tab)
- Bottom nav: CSS `--nav-height`, 52px touch targets
- **PWA install modal** — benefit-first copy (en/id/ja/my); tab title `GanbaLog — …` per locale
- **Code splitting** — lazy routes, lazy i18n, dynamic `xlsx`, vendor chunks (main bundle ~210 kB)
- **OAuth redirect** — after login always lands on Today (`/`)

### Fixed
- Bottom nav overlap; target date copy (no more D-124)
- Filters & heatmap gated until enough study data
- PWA icons — opaque `#0c0a09` bleed (no white corner artifacts in Chrome “Open in app”)
- Sign out — toast with “Sign in again”; URL resets to `/` on login screen

## 0.1.0 — 2026-07-11

### Added
- Multi-goal study templates (JLPT N1/N2, TOEIC 800, IELTS 6.5)
- Material tags and Progress page filters
- Plan export/import (JSON) and share links
- Template gallery in Settings
- Myanmar locale with Noto Sans Myanmar font
- Offline banner (cloud mode) and PWA update toast
- Vitest unit tests for core domain logic
- GitHub Actions CI (lint, test, build)

### Changed
- Onboarding defaults to blank plan; sample templates optional
- Streak counts completed tasks only (not duration chips alone)
- Share links open at `/` instead of current path
- README updated for migration 007 and cloud setup

### Fixed
- ProgressPage React hooks ordering
- Plan/Progress loading skeletons (no onboarding flash)
- Skipped task restore; Escape key stacking in dialogs
- Plan import preserves `sourceTemplateId`
- Query error states across Today, Plan, Progress, Settings
