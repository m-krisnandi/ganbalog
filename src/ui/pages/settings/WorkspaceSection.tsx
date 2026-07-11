import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronRight, Cloud, Copy, LogIn, LogOut, Pencil, RefreshCw } from 'lucide-react'
import { useAuth } from '../../../app/auth/AuthProvider'
import { useServices } from '../../../core/di/ServicesProvider'
import { useWorkspaceInfo, useWorkspaceList } from '../../../app/queries'
import { useToastStore } from '../../../app/toast-store'
import { MemberAvatar } from '../../components/MemberAvatar'
import { Button, Card, TextInput } from '../../components/primitives'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { QueryErrorState } from '../../components/QueryErrorState'
import { Sheet } from '../../components/Sheet'
import { WorkspaceSwitcherControl } from '../../components/WorkspaceSwitcher'

export function WorkspaceSection() {
  const { t } = useTranslation()
  const {
    cloudEnabled,
    session,
    loading,
    authError,
    signInWithGoogle,
    signOut,
    joinWorkspace,
    switchWorkspace,
    renameWorkspace,
    leaveWorkspace,
    createWorkspace,
  } = useAuth()
  const { actor, auth } = useServices()
  const { data: info, isError: infoError, refetch } = useWorkspaceInfo(session?.workspaceId)
  const { data: workspaceList = [] } = useWorkspaceList(session?.userId)
  const [hubOpen, setHubOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')

  useEffect(() => {
    if (info?.workspace.name) setNameDraft(info.workspace.name)
  }, [info?.workspace.name])

  if (!cloudEnabled) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">{t('settings.workspaceLocal')}</p>
      </Card>
    )
  }

  const displayCode = inviteCode ?? info?.workspace.inviteCode ?? null

  const handleCopyInvite = async () => {
    if (!displayCode) return
    const link = `${window.location.origin}${window.location.pathname}?join=${displayCode}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    useToastStore.getState().show(t('settings.workspaceInviteCopied'), 'success')
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerateInvite = async () => {
    if (!auth || !session) return
    setRegenerating(true)
    try {
      const code = displayCode
        ? await auth.regenerateInviteCode(session.workspaceId)
        : await auth.ensureInviteCode(session.workspaceId)
      setInviteCode(code)
      void refetch()
    } finally {
      setRegenerating(false)
    }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setJoining(true)
    try {
      await joinWorkspace(joinCode)
      setJoinCode('')
    } finally {
      setJoining(false)
    }
  }

  const handleRename = async () => {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === info?.workspace.name) {
      setEditingName(false)
      return
    }
    setRenaming(true)
    try {
      await renameWorkspace(trimmed)
      setEditingName(false)
      void refetch()
    } finally {
      setRenaming(false)
    }
  }

  const handleLeave = async () => {
    setLeaving(true)
    try {
      await leaveWorkspace()
      setConfirmLeave(false)
      setInviteCode(null)
      void refetch()
    } finally {
      setLeaving(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      await createWorkspace(createName.trim() || undefined)
      setShowCreate(false)
      setCreateName('')
      setInviteCode(null)
      void refetch()
    } finally {
      setCreating(false)
    }
  }

  const canLeave = workspaceList.length > 1 || (info?.members.length ?? 0) > 1

  return (
    <section>
      {!session ? (
        <Card className="space-y-3">
          <div className="flex items-start gap-3">
            <Cloud size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('settings.workspaceSignInHint')}</p>
          </div>
          {authError && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{authError}</p>
          )}
          <Button variant="primary" className="w-full" disabled={loading} onClick={() => void signInWithGoogle()}>
            <span className="inline-flex items-center gap-2">
              <LogIn size={16} />
              {loading ? t('settings.signingIn') : t('settings.signInGoogle')}
            </span>
          </Button>
        </Card>
      ) : (
        <Card className="p-0">
          <button
            type="button"
            onClick={() => setHubOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-surface-muted/50 dark:hover:bg-surface-muted-dark/50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent dark:bg-accent-soft-dark">
              {(info?.workspace.name ?? '?').slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {info?.workspace.name ?? t('settings.workspaceShared')}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-400">
                {t('settings.workspaceSignedInAs', { name: session.displayName })}
                {info ? ` · ${t('settings.workspaceMembers', { count: info.members.length })}` : ''}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-zinc-300" aria-hidden />
          </button>
        </Card>
      )}

      <Sheet open={hubOpen} title={t('settings.accountHub')} onClose={() => setHubOpen(false)}>
        {session && (
          <div className="space-y-4 pb-2">
            <div className="flex items-start gap-3">
              <Cloud size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <div className="space-y-2">
                    <TextInput
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder={t('settings.workspaceRenamePlaceholder')}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button className="flex-1" disabled={renaming} onClick={() => void handleRename()}>
                        {renaming ? '…' : t('common.save')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1"
                        disabled={renaming}
                        onClick={() => {
                          setEditingName(false)
                          setNameDraft(info?.workspace.name ?? '')
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-sm font-medium">
                      {info?.workspace.name ?? t('settings.workspaceShared')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      aria-label={t('settings.workspaceRename')}
                      className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-surface-muted hover:text-zinc-600 dark:hover:bg-surface-muted-dark"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
                <p className="mt-0.5 text-xs text-zinc-400">
                  {t('settings.workspaceSignedInAs', { name: session.displayName })}
                </p>
              </div>
            </div>

            {infoError && <QueryErrorState compact onRetry={() => void refetch()} />}

            <WorkspaceSwitcherControl
              userId={session.userId}
              activeWorkspaceId={session.workspaceId}
              onSwitch={switchWorkspace}
            />

            <div className="space-y-2">
              {showCreate ? (
                <div className="space-y-2 rounded-2xl border border-dashed border-border-subtle p-3 dark:border-border-subtle-dark">
                  <TextInput
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder={t('settings.workspaceCreatePlaceholder')}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1" disabled={creating} onClick={() => void handleCreate()}>
                      {creating ? '…' : t('settings.workspaceCreate')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1"
                      disabled={creating}
                      onClick={() => {
                        setShowCreate(false)
                        setCreateName('')
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" className="w-full" onClick={() => setShowCreate(true)}>
                  {t('settings.workspaceCreateNew')}
                </Button>
              )}
            </div>

            {info && info.members.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase">
                  {t('settings.workspaceMembers', { count: info.members.length })}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {info.members.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2 text-sm dark:bg-surface-muted-dark"
                    >
                      <MemberAvatar
                        displayName={member.displayName}
                        avatarUrl={member.avatarUrl}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        <span className="block truncate font-medium">{member.displayName}</span>
                        {member.email && (
                          <span className="block truncate text-[11px] text-zinc-400">{member.email}</span>
                        )}
                      </span>
                      {member.id === actor.userId && (
                        <span className="ml-auto shrink-0 text-[10px] text-zinc-400">{t('progress.groupYou')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2 rounded-2xl border border-dashed border-accent/30 bg-accent-soft/20 p-3 dark:border-accent/20 dark:bg-accent-soft-dark/20">
              <p className="text-xs font-semibold">{t('settings.workspaceInviteTitle')}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t('settings.workspaceInviteBody')}
              </p>
              {displayCode ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-xl bg-surface-raised px-3 py-2 text-center text-sm font-bold tracking-widest dark:bg-surface-raised-dark">
                    {displayCode}
                  </code>
                  <Button variant="ghost" className="shrink-0 px-3" onClick={() => void handleCopyInvite()}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </Button>
                </div>
              ) : (
                <Button className="w-full" disabled={regenerating} onClick={() => void handleRegenerateInvite()}>
                  {regenerating ? '…' : t('settings.workspaceCreateInvite')}
                </Button>
              )}
              {displayCode && (
                <Button
                  variant="ghost"
                  className="w-full text-xs"
                  disabled={regenerating}
                  onClick={() => void handleRegenerateInvite()}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw size={14} />
                    {t('settings.workspaceRegenerateInvite')}
                  </span>
                </Button>
              )}
            </div>

            <div className="space-y-2 border-t border-border-subtle pt-3 dark:border-border-subtle-dark">
              <p className="text-xs font-semibold">{t('settings.workspaceJoinTitle')}</p>
              <div className="flex gap-2">
                <TextInput
                  placeholder={t('settings.workspaceJoinPlaceholder')}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-wider"
                />
                <Button disabled={joining || !joinCode.trim()} onClick={() => void handleJoin()}>
                  {joining ? '…' : t('settings.workspaceJoin')}
                </Button>
              </div>
            </div>

            {canLeave && (
              <Button
                variant="ghost"
                className="w-full text-red-500 hover:text-red-600"
                onClick={() => setConfirmLeave(true)}
              >
                {t('settings.workspaceLeave')}
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full"
              disabled={loading}
              onClick={() => {
                void signOut()
                setHubOpen(false)
              }}
            >
              <span className="inline-flex items-center gap-2">
                <LogOut size={16} />
                {t('settings.signOut')}
              </span>
            </Button>
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmLeave}
        title={t('settings.workspaceLeaveTitle')}
        message={t('settings.workspaceLeaveConfirm', { name: info?.workspace.name ?? '' })}
        confirmLabel={t('settings.workspaceLeave')}
        variant="danger"
        loading={leaving}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => void handleLeave()}
      />
    </section>
  )
}
