import { Route, Routes } from 'react-router'
import { AppShell } from './ui/layout/AppShell'
import { TodayPage } from './ui/pages/TodayPage'
import { PlanPage } from './ui/pages/PlanPage'
import { ProgressPage } from './ui/pages/ProgressPage'
import { SettingsPage } from './ui/pages/SettingsPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<TodayPage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
