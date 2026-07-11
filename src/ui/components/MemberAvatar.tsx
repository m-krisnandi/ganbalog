import { useState } from 'react'

const sizeClasses = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
} as const

interface MemberAvatarProps {
  displayName: string
  avatarUrl: string | null
  size?: keyof typeof sizeClasses
}

export function MemberAvatar({ displayName, avatarUrl, size = 'md' }: MemberAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const initial = displayName.slice(0, 1).toUpperCase() || '?'

  if (avatarUrl && !imageFailed) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full object-cover ${sizeClasses[size]}`}
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent dark:bg-accent-soft-dark ${sizeClasses[size]}`}
      aria-hidden
    >
      {initial}
    </div>
  )
}
