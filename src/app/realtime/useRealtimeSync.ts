import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useServices } from '../../core/di/ServicesProvider'
import { invalidateWorkspaceQueries } from '../queries'

/** Invalidate queries saat data workspace berubah lewat Supabase Realtime. */
export function useRealtimeSync(): void {
  const { auth, actor, logger, supabase } = useServices()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!auth || !supabase) return

    const invalidateAll = () => invalidateWorkspaceQueries(queryClient)

    const tables = [
      'plans',
      'materials',
      'material_units',
      'schedule_items',
      'tasks',
      'checkpoints',
      'study_logs',
      'audit_events',
    ] as const

    const channel = supabase
      .channel(`workspace:${actor.workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, invalidateAll)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'material_units' },
        invalidateAll,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_items' },
        invalidateAll,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkpoints' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_logs' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_events' }, invalidateAll)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('Realtime subscribed', { tables, workspaceId: actor.workspaceId })
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [actor.workspaceId, auth, logger, queryClient, supabase])
}
