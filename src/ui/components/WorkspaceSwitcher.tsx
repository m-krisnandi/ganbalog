import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Users } from 'lucide-react'
import type { Id } from '../../domain/models'
import { useWorkspaceList } from '../../app/queries'

interface WorkspaceSwitcherProps {
  userId: Id
  activeWorkspaceId: Id
  switching: boolean
  onSwitch: (workspaceId: Id) => void
}

export function WorkspaceSwitcher({
  userId,
  activeWorkspaceId,
  switching,
  onSwitch,
}: WorkspaceSwitcherProps) {
  const { t } = useTranslation()
  const { data: workspaces = [] } = useWorkspaceList(userId)

  if (workspaces.length <= 1) return null

  return (
    <div className="space-y-2 border-b border-border-subtle pb-4 dark:border-border-subtle-dark">
      <p className="text-xs font-semibold text-zinc-400 uppercase">{t('settings.workspaceSwitcherTitle')}</p>
      <ul className="space-y-1.5">
        {workspaces.map(({ workspace, memberCount }) => {
          const active = workspace.id === activeWorkspaceId
          return (
            <li key={workspace.id}>
              <button
                type="button"
                disabled={active || switching}
                onClick={() => onSwitch(workspace.id)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-default ${
                  active
                    ? 'bg-accent-soft ring-1 ring-accent/30 dark:bg-accent-soft-dark dark:ring-accent/20'
                    : 'bg-surface-muted hover:bg-surface-raised dark:bg-surface-muted-dark dark:hover:bg-surface-raised-dark'
                }`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    active ? 'bg-accent text-white' : 'bg-surface-raised text-zinc-500 dark:bg-surface-raised-dark'
                  }`}
                >
                  {active ? <Check size={16} strokeWidth={3} /> : workspace.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{workspace.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-400">
                    <Users size={11} aria-hidden />
                    {t('settings.workspaceMembers', { count: memberCount })}
                  </span>
                </span>
                {active && (
                  <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {t('settings.workspaceSwitcherActive')}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-[11px] leading-relaxed text-zinc-400">{t('settings.workspaceSwitcherHint')}</p>
    </div>
  )
}

/** Wrapper with local switching state for Settings. */
export function WorkspaceSwitcherControl({
  userId,
  activeWorkspaceId,
  onSwitch,
}: {
  userId: Id
  activeWorkspaceId: Id
  onSwitch: (workspaceId: Id) => Promise<void>
}) {
  const [switching, setSwitching] = useState(false)

  const handleSwitch = async (workspaceId: Id) => {
    if (switching || workspaceId === activeWorkspaceId) return
    setSwitching(true)
    try {
      await onSwitch(workspaceId)
    } finally {
      setSwitching(false)
    }
  }

  return (
    <WorkspaceSwitcher
      userId={userId}
      activeWorkspaceId={activeWorkspaceId}
      switching={switching}
      onSwitch={(id) => void handleSwitch(id)}
    />
  )
}
