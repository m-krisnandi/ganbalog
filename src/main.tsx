import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/inter/index.css'
import '@fontsource-variable/noto-sans-jp/index.css'
import './index.css'
import './app/i18n'
import { App } from './App'
import { buildContainer } from './core/di/container'
import { ServicesProvider } from './core/di/ServicesProvider'
import { ErrorBoundary } from './core/logging/ErrorBoundary'
import { installGlobalErrorHandlers } from './core/logging/global-handlers'
import { seedIfNeeded } from './data/seed'
import { applyTheme, useThemeStore, watchSystemTheme } from './app/theme'
import { AuthProvider } from './app/auth/AuthProvider'

const container = buildContainer()
installGlobalErrorHandlers(container.logger)
applyTheme(useThemeStore.getState().mode)
watchSystemTheme()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

async function bootstrap(): Promise<void> {
  if (!container.cloudEnabled) {
    try {
      await seedIfNeeded(
        container.planService,
        container.taskService,
        container.meta,
        container.audit,
        container.logger,
      )
    } catch (error) {
      container.logger.error('Seeding gagal', error)
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary logger={container.logger}>
          <ServicesProvider container={container}>
            <AuthProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AuthProvider>
          </ServicesProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
