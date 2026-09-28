import type { DominantFoot, PlayerPosition, ProfileVisibility } from '@nujoom/shared';
import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * The onboarding answers, kept in memory across the two steps (profile → consent) and across
 * language switches. Not written to the device: it holds a date of birth.
 */
export type OnboardingDraft = {
  displayName: string;
  day: string;
  month: string;
  year: string;
  cityId: number | null;
  neighborhoodId: number | null;
  position: PlayerPosition | null;
  foot: DominantFoot | null;
  shirt: string;
  handle: string;
  visibility: ProfileVisibility;
  terms: boolean;
  privacy: boolean;
  recording: boolean | null;
};

const EMPTY: OnboardingDraft = {
  displayName: '',
  day: '',
  month: '',
  year: '',
  cityId: null,
  neighborhoodId: null,
  position: null,
  foot: null,
  shirt: '',
  handle: '',
  // Onboarding suggests "players in my city" for adults (D-038 carried over); youth are private.
  visibility: 'city',
  terms: false,
  privacy: false,
  recording: null,
};

type DraftContext = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  /** A server-side field error to show when the user is sent back to the profile step. */
  serverError: string | null;
  setServerError: (message: string | null) => void;
};

const Context = createContext<DraftContext | null>(null);

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(EMPTY);
  const [serverError, setServerError] = useState<string | null>(null);
  return (
    <Context.Provider
      value={{
        draft,
        update: (patch) => setDraft((d) => ({ ...d, ...patch })),
        serverError,
        setServerError,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useOnboardingDraft(): DraftContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useOnboardingDraft outside OnboardingDraftProvider');
  return ctx;
}
