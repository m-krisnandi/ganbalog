import { createContext, useContext, type ReactNode } from 'react'
import type { Container } from './container'

const ServicesContext = createContext<Container | null>(null)

export function ServicesProvider({
  container,
  children,
}: {
  container: Container
  children: ReactNode
}) {
  return <ServicesContext.Provider value={container}>{children}</ServicesContext.Provider>
}

/** Hook DI: komponen mengambil service lewat context, bukan import konkret. */
export function useServices(): Container {
  const container = useContext(ServicesContext)
  if (!container) {
    throw new Error('useServices harus dipakai di dalam <ServicesProvider>')
  }
  return container
}
