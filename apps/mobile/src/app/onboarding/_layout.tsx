import { Stack } from 'expo-router';

import { OnboardingDraftProvider } from '@/features/onboarding/draft';

export default function OnboardingLayout() {
  return (
    <OnboardingDraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingDraftProvider>
  );
}
