import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useServices } from '../../core/di/ServicesProvider'
import { invalidateWorkspaceQueries } from '../queries'
import { useToastStore } from '../toast-store'
import i18n from '../i18n'

interface MemberRow {
  user_id: string
  workspace_id: string
}

/** Invalidate queries saat data workspace berubah lewat Supabase Realtime. */
export function useRealtimeSync(): void {
  const { auth, actor, logger, supabase } = useServices()
  const queryClient = useQueryClient()
  const actorRef = useRef(actor)
  actorRef.current = actor

  useEffect(() => {
    if (!auth || !supabase) return

    const invalidateAll = () => invalidateWorkspaceQueries(queryClient)

    const invalidateGroup = () => {
      void queryClient.invalidateQueries({ queryKey: ['groupStudyLogs'] })
      void queryClient.invalidateQueries({ queryKey: ['groupTaskStats'] })
      void queryClient.invalidateQueries({ queryKey: ['workspaceInfo'] })
      void queryClient.invalidateQueries({ queryKey: ['workspaceList'] })
      void queryClient.invalidateQueries({ queryKey: ['studyLogs'] })
    }

    const notifyMemberJoined = (row: MemberRow) => {
      const current = actorRef.current
      if (row.workspace_id !== current.workspaceId || row.user_id === current.userId) return

      void supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', row.user_id)
        .maybeSingle()
        .then(({ data }) => {
          const name = data?.display_name as string | undefined
          if (!name) return
          useToastStore.getState().show(
            i18n.t('settings.workspaceMemberJoined', { name }),
            'success',
          )
        })
    }

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        const row = (payload.new ?? payload.old) as { user_id?: string } | undefined
        if (row?.user_id === actorRef.current.userId) return
        invalidateAll()
        invalidateGroup()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkpoints' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_logs' }, invalidateGroup)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_events' }, invalidateAll)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'workspace_members' },
        (payload) => {
          invalidateGroup()
          notifyMemberJoined(payload.new as MemberRow)
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'workspace_members' },
        invalidateGroup,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, invalidateGroup)
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
