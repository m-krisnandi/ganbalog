import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { useFlashToast } from './app/useFlashToast'
import { PwaUpdater } from './app/PwaUpdater'
import { AppShell } from './ui/layout/AppShell'
import { RouteFallback } from './ui/layout/RouteFallback'
import { ToastHost } from './ui/components/ToastHost'
import { TodayPage } from './ui/pages/TodayPage'
import { PlanImportHandler } from './app/PlanImportHandler'
import { PwaInstallListener } from './app/pwa-install'
import { PwaInstallPrompt } from './ui/components/PwaInstallBanner'
import { StudyReminder } from './ui/components/StudyReminder'

const PlanPage = lazy(() =>
  import('./ui/pages/PlanPage').then((m) => ({ default: m.PlanPage })),
)
const ProgressPage = lazy(() =>
  import('./ui/pages/ProgressPage').then((m) => ({ default: m.ProgressPage })),
)
const SettingsPage = lazy(() =>
  import('./ui/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const LegalPage = lazy(() =>
  import('./ui/pages/LegalPage').then((m) => ({ default: m.LegalPage })),
)

export function App() {
  useFlashToast()

  return (
    <>
      <ToastHost />
      <PwaInstallListener />
      <PwaInstallPrompt />
      <PwaUpdater />
      <StudyReminder />
      <PlanImportHandler />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/legal" element={<LegalPage />} />
          <Route element={<AppShell />}>
            <Route index element={<TodayPage />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
