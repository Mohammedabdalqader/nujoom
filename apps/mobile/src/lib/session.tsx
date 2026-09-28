import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { ConfigError, getSource, type Account, type Session } from '@/data/source';

type SessionState =
  | { status: 'loading'; session: null }
  | { status: 'signedOut'; session: null }
  | { status: 'signedIn'; session: Session }
  /** A production build without backend settings (contract §7): shown, never papered over. */
  | { status: 'misconfigured'; session: null; error: ConfigError };

const SessionContext = createContext<SessionState>({ status: 'loading', session: null });

/**
 * Tracks who is signed in (contract §3). The demo build is always signed in as its sample
 * player. On sign-out or a user switch the query cache is cleared, so one account's data can
 * never show under another.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>(() => {
    try {
      getSource();
      return { status: 'loading', session: null };
    } catch (error) {
      if (error instanceof ConfigError) return { status: 'misconfigured', session: null, error };
      throw error;
    }
  });
  const misconfigured = state.status === 'misconfigured';

  useEffect(() => {
    if (misconfigured) return;
    const source = getSource();
    let active = true;
    let currentUser: string | null = null;
    const apply = (session: Session | null) => {
      if (!active) return;
      if (session?.userId !== currentUser) {
        currentUser = session?.userId ?? null;
        queryClient.clear();
      }
      setState(session ? { status: 'signedIn', session } : { status: 'signedOut', session: null });
    };
    source.auth.current().then(apply, () => apply(null));
    const unsubscribe = source.auth.subscribe(apply);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient, misconfigured]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}

export const accountKey = (userId: string | undefined) => ['account', userId] as const;

/** The signed-in account: journey stage, youth/guardian state, recording permission, settings. */
export function useAccount() {
  const { session } = useSession();
  return useQuery<Account>({
    queryKey: accountKey(session?.userId),
    queryFn: () => getSource().account(),
    enabled: session !== null,
    staleTime: 60_000,
  });
}

/** Signs out, clears every cached query and local draft; the router then shows sign-in. */
export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    await getSource().auth.signOut();
    queryClient.clear();
  };
}
