import { OnboardingWizard } from './OnboardingWizard'
import { SetupRequiredState } from './SetupRequiredState'

/** Full wizard on Today; compact prompt on other tabs. */
export function NoPlanEmptyState({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  if (variant === 'compact') return <SetupRequiredState />
  return <OnboardingWizard />
}
