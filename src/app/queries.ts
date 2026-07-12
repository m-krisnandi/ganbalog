/**
 * Hook data (TanStack Query) — jembatan antara UI dan service.
 * UI tidak pernah menyentuh repository/DB langsung.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { useServices } from '../core/di/ServicesProvider'
import { downloadBackupFile, type GanbaLogBackup } from '../data/backup'
import { downloadExcelBackup } from '../data/export-excel'
import { isSupabaseUuid } from '../data/supabase/ids'
import { queueFlashToast } from './flash-toast'
import type { Checkpoint, Id, IsoDate, ScheduleItem, Task, Weekday } from '../domain/models'
import { useToastStore } from './toast-store'
import i18n from './i18n'

type BoundMutation<TVariables> = Pick<
  UseMutationResult<unknown, Error, TVariables>,
  'isPending' | 'isError' | 'error'
> & {
  mutate: (
    variables: TVariables,
    options?: Parameters<UseMutationResult<unknown, Error, TVariables>['mutate']>[1],
  ) => void
  mutateAsync: (variables: TVariables) => Promise<unknown>
}

function useAppMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient()
  const { onError, ...rest } = options
  return useMutation(
    {
      ...rest,
      onError: (error, variables, onMutateResult, context) => {
        const message =
          error instanceof Error && error.message
            ? error.message
            : i18n.t('common.actionFailed')
        useToastStore.getState().show(message, 'error')
        onError?.(error, variables, onMutateResult, context)
      },
    },
    queryClient,
  )
}

function bindMutation<TCommand, TVariables>(
  mutation: UseMutationResult<unknown, Error, TCommand>,
  toCommand: (variables: TVariables) => TCommand,
): BoundMutation<TVariables> {
  return {
    mutate: (variables, options) =>
      mutation.mutate(
        toCommand(variables),
        options as unknown as Parameters<typeof mutation.mutate>[1],
      ),
    mutateAsync: (variables) => mutation.mutateAsync(toCommand(variables)),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

export const keys = {
  plans: ['plans'] as const,
  activePlan: ['activePlan'] as const,
  materials: (planId: Id) => ['materials', planId] as const,
  materialUnits: (materialId: Id) => ['materialUnits', materialId] as const,
  schedule: (planId: Id) => ['schedule', planId] as const,
  tasks: (planId: Id, date: IsoDate) => ['tasks', planId, date] as const,
  allTasks: (planId: Id) => ['allTasks', planId] as const,
  checkpoints: (planId: Id) => ['checkpoints', planId] as const,
  studyLogs: (planId: Id, userId: Id) => ['studyLogs', planId, userId] as const,
  audit: ['audit'] as const,
  errorLogs: ['errorLogs'] as const,
}

/** Segarkan cache data workspace tanpa menghapus observer yang sedang aktif. */
export function invalidateWorkspaceQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: keys.plans })
  void queryClient.invalidateQueries({ queryKey: keys.activePlan })
  void queryClient.invalidateQueries({ queryKey: ['materials'] })
  void queryClient.invalidateQueries({ queryKey: ['materialUnits'] })
  void queryClient.invalidateQueries({ queryKey: ['schedule'] })
  void queryClient.invalidateQueries({ queryKey: ['tasks'] })
  void queryClient.invalidateQueries({ queryKey: ['allTasks'] })
  void queryClient.invalidateQueries({ queryKey: ['checkpoints'] })
  void queryClient.invalidateQueries({ queryKey: ['studyLogs'] })
  void queryClient.invalidateQueries({ queryKey: ['groupStudyLogs'] })
  void queryClient.invalidateQueries({ queryKey: ['groupTaskStats'] })
  void queryClient.invalidateQueries({ queryKey: ['workspaceInfo'] })
  void queryClient.invalidateQueries({ queryKey: ['workspaceList'] })
  void queryClient.invalidateQueries({ queryKey: keys.audit })
}

/* ------------------------------- Plan -------------------------------- */

export function usePlans() {
  const { planService, cloudEnabled, actor } = useServices()
  const ready = !cloudEnabled || isSupabaseUuid(actor.workspaceId)
  return useQuery({
    queryKey: [...keys.plans, actor.workspaceId],
    queryFn: () => planService.getPlans(),
    enabled: ready,
  })
}

export function useActivePlan() {
  const { planService, cloudEnabled, actor } = useServices()
  const ready =
    !cloudEnabled || (isSupabaseUuid(actor.userId) && isSupabaseUuid(actor.workspaceId))
  return useQuery({
    queryKey: [...keys.activePlan, actor.userId, actor.workspaceId],
    queryFn: async () => (await planService.getActivePlan()) ?? null,
    enabled: ready,
  })
}

export function usePlanMutations() {
  const { planService } = useServices()
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: keys.plans })
    void queryClient.invalidateQueries({ queryKey: keys.activePlan })
  }

  type PlanCmd =
    | {
        type: 'create'
        input: { name: string; description: string; startDate: IsoDate; targetDate: IsoDate }
      }
    | {
        type: 'updateDetails'
        planId: Id
        input: { name: string; description: string; startDate: IsoDate; targetDate: IsoDate }
      }
    | { type: 'archive'; planId: Id }
    | { type: 'restore'; planId: Id }
    | { type: 'deletePermanently'; planId: Id }
    | { type: 'setActive'; planId: Id }

  const mutation = useAppMutation({
    mutationKey: ['planMutations'],
    mutationFn: async (cmd: PlanCmd) => {
      switch (cmd.type) {
        case 'create':
          return { result: 'create' as const, plan: await planService.createPlan(cmd.input) }
        case 'updateDetails':
          await planService.updatePlanDetails(cmd.planId, cmd.input)
          return { result: 'updateDetails' as const }
        case 'archive':
          await planService.archivePlan(cmd.planId)
          return { result: 'archive' as const }
        case 'restore':
          await planService.restorePlan(cmd.planId)
          return { result: 'restore' as const }
        case 'deletePermanently':
          await planService.deletePlanPermanently(cmd.planId)
          return { result: 'deletePermanently' as const, planId: cmd.planId }
        case 'setActive':
          await planService.setActivePlan(cmd.planId)
          return { result: 'setActive' as const }
      }
    },
    onSuccess: async (data) => {
      if (data.result === 'create') {
        await planService.setActivePlan(data.plan.id)
      }
      invalidate()
      if (data.result === 'deletePermanently') {
        queryClient.removeQueries({ queryKey: keys.materials(data.planId) })
        queryClient.removeQueries({ queryKey: keys.schedule(data.planId) })
        queryClient.removeQueries({ queryKey: keys.checkpoints(data.planId) })
        queryClient.removeQueries({ queryKey: keys.allTasks(data.planId) })
      }
    },
  })

  return {
    create: bindMutation(
      mutation,
      (input: { name: string; description: string; startDate: IsoDate; targetDate: IsoDate }) => ({
        type: 'create' as const,
        input,
      }),
    ),
    updateDetails: bindMutation(
      mutation,
      (input: {
        planId: Id
        name: string
        description: string
        startDate: IsoDate
        targetDate: IsoDate
      }) => ({
        type: 'updateDetails' as const,
        planId: input.planId,
        input: {
          name: input.name,
          description: input.description,
          startDate: input.startDate,
          targetDate: input.targetDate,
        },
      }),
    ),
    archive: bindMutation(mutation, (planId: Id) => ({ type: 'archive' as const, planId })),
    restore: bindMutation(mutation, (planId: Id) => ({ type: 'restore' as const, planId })),
    deletePermanently: bindMutation(mutation, (planId: Id) => ({
      type: 'deletePermanently' as const,
      planId,
    })),
    setActive: bindMutation(mutation, (planId: Id) => ({ type: 'setActive' as const, planId })),
  }
}

/* ----------------------------- Material ------------------------------ */

export function useMaterials(planId: Id | undefined) {
  const { planService } = useServices()
  return useQuery({
    queryKey: keys.materials(planId ?? ''),
    queryFn: () => planService.getMaterials(planId!),
    enabled: Boolean(planId),
  })
}

export function useMaterialUnits(materialId: Id | undefined) {
  const { planService } = useServices()
  return useQuery({
    queryKey: keys.materialUnits(materialId ?? ''),
    queryFn: () => planService.getMaterialUnits(materialId!),
    enabled: Boolean(materialId),
  })
}

export function useMaterialMutations(planId: Id) {
  const { planService } = useServices()
  const queryClient = useQueryClient()
  const invalidateMaterials = () =>
    void queryClient.invalidateQueries({ queryKey: keys.materials(planId) })
  const invalidateUnits = (materialId: Id) =>
    void queryClient.invalidateQueries({ queryKey: keys.materialUnits(materialId) })

  type MaterialCmd =
    | { type: 'add'; input: { name: string; unitLabel: string; totalUnits: number; tags: string[] } }
    | {
        type: 'updateDetails'
        input: { materialId: Id; name: string; unitLabel: string; totalUnits: number; tags: string[] }
      }
    | { type: 'adjustProgress'; input: { materialId: Id; delta: number } }
    | { type: 'toggleUnit'; input: { unitId: Id; materialId: Id } }
    | { type: 'remove'; materialId: Id }

  const mutation = useAppMutation({
    mutationKey: ['materialMutations', planId],
    mutationFn: async (cmd: MaterialCmd) => {
      switch (cmd.type) {
        case 'add':
          await planService.addMaterial(
            planId,
            cmd.input.name,
            cmd.input.unitLabel,
            cmd.input.totalUnits,
            cmd.input.tags,
          )
          return { type: 'add' as const }
        case 'updateDetails':
          await planService.updateMaterialDetails(cmd.input.materialId, {
            name: cmd.input.name,
            unitLabel: cmd.input.unitLabel,
            totalUnits: cmd.input.totalUnits,
            tags: cmd.input.tags,
          })
          return { type: 'updateDetails' as const, materialId: cmd.input.materialId }
        case 'adjustProgress':
          await planService.adjustMaterialProgress(cmd.input.materialId, cmd.input.delta)
          return { type: 'adjustProgress' as const, materialId: cmd.input.materialId }
        case 'toggleUnit':
          await planService.toggleMaterialUnit(cmd.input.unitId)
          return { type: 'toggleUnit' as const, materialId: cmd.input.materialId }
        case 'remove':
          await planService.deleteMaterial(cmd.materialId)
          return { type: 'remove' as const }
      }
    },
    onSuccess: (data) => {
      invalidateMaterials()
      if (
        data.type === 'updateDetails' ||
        data.type === 'adjustProgress' ||
        data.type === 'toggleUnit'
      ) {
        invalidateUnits(data.materialId)
      }
    },
  })

  return {
    add: bindMutation(mutation, (input: { name: string; unitLabel: string; totalUnits: number; tags?: string[] }) => ({
      type: 'add' as const,
      input: { ...input, tags: input.tags ?? [] },
    })),
    updateDetails: bindMutation(
      mutation,
      (input: { materialId: Id; name: string; unitLabel: string; totalUnits: number; tags?: string[] }) => ({
        type: 'updateDetails' as const,
        input: { ...input, tags: input.tags ?? [] },
      }),
    ),
    adjustProgress: bindMutation(
      mutation,
      (input: { materialId: Id; delta: number }) => ({
        type: 'adjustProgress' as const,
        input,
      }),
    ),
    toggleUnit: bindMutation(
      mutation,
      (input: { unitId: Id; materialId: Id }) => ({ type: 'toggleUnit' as const, input }),
    ),
    remove: bindMutation(mutation, (materialId: Id) => ({ type: 'remove' as const, materialId })),
  }
}

/* ------------------------------ Jadwal -------------------------------- */

export function useSchedule(planId: Id | undefined) {
  const { planService } = useServices()
  return useQuery({
    queryKey: keys.schedule(planId ?? ''),
    queryFn: () => planService.getSchedule(planId!),
    enabled: Boolean(planId),
  })
}

export function useScheduleMutations(planId: Id) {
  const { planService } = useServices()
  const queryClient = useQueryClient()
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: keys.schedule(planId) })

  const add = useAppMutation({
    mutationFn: (input: { weekday: Weekday; title: string; materialId: Id | null }) =>
      planService.addScheduleItem(planId, input.weekday, input.title, input.materialId),
    onSuccess: invalidate,
  })

  const update = useAppMutation({
    mutationFn: (item: ScheduleItem) => planService.updateScheduleItem(item),
    onSuccess: invalidate,
  })

  const remove = useAppMutation({
    mutationFn: (itemId: Id) => planService.deleteScheduleItem(itemId),
    onSuccess: invalidate,
  })

  return { add, update, remove }
}

/* ------------------------------- Task --------------------------------- */

export function useTodayTasks(planId: Id | undefined, date: IsoDate) {
  const { taskService } = useServices()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!planId) return
    let cancelled = false
    void (async () => {
      const tasks = await taskService.ensureTasksForDate(planId, date)
      if (!cancelled) {
        queryClient.setQueryData(keys.tasks(planId, date), tasks)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [date, planId, queryClient, taskService])

  return useQuery({
    queryKey: keys.tasks(planId ?? '', date),
    queryFn: () => taskService.getTasksForDate(planId!, date),
    enabled: Boolean(planId),
    staleTime: 60_000,
  })
}

export function useAllTasks(planId: Id | undefined) {
  const { taskService } = useServices()
  return useQuery({
    queryKey: keys.allTasks(planId ?? ''),
    queryFn: () => taskService.getAllTasks(planId!),
    enabled: Boolean(planId),
  })
}

type TaskCacheSnapshot = { prevToday?: Task[]; prevAll?: Task[] }

function patchTaskList(
  list: Task[] | undefined,
  taskId: Id,
  updater: (task: Task) => Task,
): Task[] | undefined {
  if (!list) return list
  return list.map((task) => (task.id === taskId ? updater(task) : task))
}

function useTaskCache(planId: Id, date: IsoDate) {
  const queryClient = useQueryClient()
  const { clock } = useServices()
  const todayKey = keys.tasks(planId, date)
  const allKey = keys.allTasks(planId)

  const snapshot = (): TaskCacheSnapshot => ({
    prevToday: queryClient.getQueryData<Task[]>(todayKey),
    prevAll: queryClient.getQueryData<Task[]>(allKey),
  })

  const cancelInFlight = () =>
    Promise.all([
      queryClient.cancelQueries({ queryKey: todayKey }),
      queryClient.cancelQueries({ queryKey: allKey }),
    ])

  const restore = (ctx: TaskCacheSnapshot | undefined) => {
    if (ctx?.prevToday !== undefined) queryClient.setQueryData(todayKey, ctx.prevToday)
    if (ctx?.prevAll !== undefined) queryClient.setQueryData(allKey, ctx.prevAll)
  }

  const patch = (taskId: Id, updater: (task: Task) => Task) => {
    queryClient.setQueryData<Task[]>(todayKey, (old) => patchTaskList(old, taskId, updater))
    queryClient.setQueryData<Task[]>(allKey, (old) => patchTaskList(old, taskId, updater))
  }

  const syncStudyLogs = () => {
    void queryClient.invalidateQueries({ queryKey: ['studyLogs'] })
  }

  return { cancelInFlight, clock, patch, restore, snapshot, syncStudyLogs }
}

export function useTaskMutations(planId: Id, date: IsoDate) {
  const { taskService } = useServices()
  const queryClient = useQueryClient()
  const cache = useTaskCache(planId, date)
  const todayKey = keys.tasks(planId, date)
  const allKey = keys.allTasks(planId)

  const complete = useAppMutation<void, Error, Id, TaskCacheSnapshot>({
    mutationFn: (taskId: Id) => taskService.completeTask(taskId),
    onMutate: async (taskId) => {
      await cache.cancelInFlight()
      const ctx = cache.snapshot()
      const stamp = cache.clock.stamp()
      cache.patch(taskId, (task) => ({ ...task, status: 'done', completedAt: stamp }))
      return ctx
    },
    onError: (_err, _taskId, ctx) => cache.restore(ctx),
    onSuccess: () => {
      cache.syncStudyLogs()
    },
  })

  const reopen = useAppMutation<void, Error, Id, TaskCacheSnapshot>({
    mutationFn: (taskId: Id) => taskService.reopenTask(taskId),
    onMutate: async (taskId) => {
      await cache.cancelInFlight()
      const ctx = cache.snapshot()
      cache.patch(taskId, (task) => ({ ...task, status: 'open', completedAt: null }))
      return ctx
    },
    onError: (_err, _taskId, ctx) => cache.restore(ctx),
    onSuccess: () => {
      cache.syncStudyLogs()
    },
  })

  const skip = useAppMutation<void, Error, Id, TaskCacheSnapshot>({
    mutationFn: (taskId: Id) => taskService.skipTask(taskId),
    onMutate: async (taskId) => {
      await cache.cancelInFlight()
      const ctx = cache.snapshot()
      cache.patch(taskId, (task) => ({
        ...task,
        status: 'skipped',
        completedAt: null,
      }))
      return ctx
    },
    onError: (_err, _taskId, ctx) => cache.restore(ctx),
    onSuccess: () => {
      cache.syncStudyLogs()
    },
  })

  const addAdhoc = useAppMutation({
    mutationFn: (title: string) => taskService.addAdhocTask(planId, date, title),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: todayKey })
      void queryClient.invalidateQueries({ queryKey: allKey })
    },
  })

  const remove = useAppMutation<void, Error, Id, TaskCacheSnapshot>({
    mutationFn: (taskId: Id) => taskService.removeFromToday(taskId),
    onMutate: async (taskId) => {
      await cache.cancelInFlight()
      const ctx = cache.snapshot()
      const task = ctx.prevToday?.find((item) => item.id === taskId)
      if (task?.scheduleItemId) {
        cache.patch(taskId, (item) => ({ ...item, status: 'skipped', completedAt: null }))
      } else {
        queryClient.setQueryData<Task[]>(todayKey, (old) => old?.filter((item) => item.id !== taskId))
        queryClient.setQueryData<Task[]>(allKey, (old) => old?.filter((item) => item.id !== taskId))
      }
      return ctx
    },
    onError: (_err, _taskId, ctx) => cache.restore(ctx),
    onSuccess: () => {
      cache.syncStudyLogs()
    },
  })

  const rename = useAppMutation<void, Error, { taskId: Id; title: string }, TaskCacheSnapshot>({
    mutationFn: (input: { taskId: Id; title: string }) =>
      taskService.renameAdhocTask(input.taskId, input.title),
    onMutate: async ({ taskId, title }) => {
      await cache.cancelInFlight()
      const ctx = cache.snapshot()
      cache.patch(taskId, (task) => ({ ...task, title: title.trim() }))
      return ctx
    },
    onError: (_err, _input, ctx) => cache.restore(ctx),
  })

  return { complete, reopen, skip, addAdhoc, remove, rename }
}

/* ---------------------------- Checkpoint ------------------------------ */

export function useCheckpoints(planId: Id | undefined) {
  const { planService } = useServices()
  return useQuery({
    queryKey: keys.checkpoints(planId ?? ''),
    queryFn: () => planService.getCheckpoints(planId!),
    enabled: Boolean(planId),
  })
}

export function useCheckpointMutations(planId: Id) {
  const { planService } = useServices()
  const queryClient = useQueryClient()
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: keys.checkpoints(planId) })

  const add = useAppMutation({
    mutationFn: (input: { title: string; dueDate: IsoDate }) =>
      planService.addCheckpoint(planId, input.title, input.dueDate),
    onSuccess: invalidate,
  })

  const toggle = useAppMutation({
    mutationFn: (checkpoint: Checkpoint) => planService.toggleCheckpoint(checkpoint.id),
    onSuccess: invalidate,
  })

  const remove = useAppMutation({
    mutationFn: (checkpointId: Id) => planService.deleteCheckpoint(checkpointId),
    onSuccess: invalidate,
  })

  return { add, toggle, remove }
}

/* ------------------------- Study log & lainnya ------------------------ */

export function useStudyLogs() {
  const { studyLogService, actor } = useServices()
  const { data: activePlan } = useActivePlan()
  const planId = activePlan?.id ?? ''
  return useQuery({
    queryKey: keys.studyLogs(planId, actor.userId),
    queryFn: () => studyLogService.getForActivePlan(),
    enabled: Boolean(planId),
  })
}

export function useGroupStudyLogs(planId: Id | undefined) {
  const { studyLogService, cloudEnabled } = useServices()
  return useQuery({
    queryKey: ['groupStudyLogs', planId ?? ''],
    queryFn: () => studyLogService.getAllForActivePlan(),
    enabled: Boolean(planId),
    refetchInterval: cloudEnabled ? 30_000 : false,
  })
}

export function useGroupTaskStats(planId: Id | undefined) {
  const { auth, clock, cloudEnabled } = useServices()
  const today = clock.todayIso()
  return useQuery({
    queryKey: ['groupTaskStats', planId ?? '', today],
    queryFn: () => auth!.getPlanMemberTaskStats(planId!, today),
    enabled: Boolean(auth && planId),
    refetchInterval: cloudEnabled ? 30_000 : false,
  })
}

export function useWorkspaceInfo(workspaceId: Id | undefined) {
  const { auth } = useServices()
  return useQuery({
    queryKey: ['workspaceInfo', workspaceId ?? ''],
    queryFn: () => auth!.getWorkspaceInfo(workspaceId!),
    enabled: Boolean(auth && workspaceId),
  })
}

export function useWorkspaceList(userId: Id | undefined) {
  const { auth } = useServices()
  return useQuery({
    queryKey: ['workspaceList', userId ?? ''],
    queryFn: () => auth!.listUserWorkspaces(userId!),
    enabled: Boolean(auth && userId),
  })
}

export function useSetMinutesToday(planId: Id) {
  const { studyLogService, taskService } = useServices()
  const queryClient = useQueryClient()
  return useAppMutation({
    mutationFn: (minutes: number | null) =>
      minutes === null
        ? taskService.clearStudyDurationToday(planId)
        : studyLogService.setMinutesToday(minutes),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['studyLogs'] }),
  })
}

export function useAuditTrail(limit = 100) {
  const { audit } = useServices()
  return useQuery({ queryKey: [...keys.audit, limit], queryFn: () => audit.getRecent(limit) })
}

export function useErrorLogs(limit = 100) {
  const { logRepository } = useServices()
  return useQuery({
    queryKey: [...keys.errorLogs, limit],
    queryFn: () => logRepository.getRecent(limit),
  })
}

export function useClearErrorLogs() {
  const { logRepository } = useServices()
  const queryClient = useQueryClient()
  return useAppMutation({
    mutationFn: () => logRepository.clear(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.errorLogs })
    },
  })
}

export function useExportBackup(format: 'json' | 'excel' = 'json') {
  const { backupService } = useServices()
  return useAppMutation({
    mutationKey: ['exportBackup', format],
    mutationFn: async () => {
      const backup = await backupService.export()
      if (format === 'excel') await downloadExcelBackup(backup)
      else downloadBackupFile(backup)
    },
    onSuccess: () => {
      useToastStore.getState().show(i18n.t('settings.exportSuccess'), 'success')
    },
  })
}

export function useImportBackup() {
  const { backupService } = useServices()
  const queryClient = useQueryClient()
  return useAppMutation({
    mutationFn: (backup: GanbaLogBackup) => backupService.import(backup),
    onSuccess: () => {
      queueFlashToast('settings.importSuccess')
      queryClient.clear()
      window.location.reload()
    },
  })
}

export function useImportExcelBackup() {
  const { backupService } = useServices()
  const queryClient = useQueryClient()
  return useAppMutation({
    mutationFn: (buffer: ArrayBuffer) => backupService.importFromExcel(buffer),
    onSuccess: () => {
      queueFlashToast('settings.importSuccess')
      queryClient.clear()
      window.location.reload()
    },
  })
}
