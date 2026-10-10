'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  RiviumAbTesting,
  type RiviumAbTestingConfig,
} from './index';

// ============================================
// CONTEXT
// ============================================

const RiviumAbTestingContext = createContext<typeof RiviumAbTesting | null>(null);

// Goes up when the signed-in user or their token changes, so the hooks read
// their values again.
const RiviumAbTestingUserContext = createContext(0);

// ============================================
// PROVIDER
// ============================================

interface RiviumAbTestingProviderProps {
  config: RiviumAbTestingConfig;
  userId?: string;
  userAttributes?: Record<string, unknown>;
  children: ReactNode;
}

export function RiviumAbTestingProvider({
  config,
  userId,
  userAttributes,
  children,
}: RiviumAbTestingProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      await RiviumAbTesting.init(config);
      if (!cancelled) {
        setIsReady(true);
      }
    }

    initialize().catch((e) => {
      if (config.debug) {
        console.error('RiviumAbTesting: Failed to initialize:', e);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A user token arriving (sign-in) or going away (sign-out) changes what the
  // hooks should show: the real values, or the defaults while the SDK waits.
  const [userVersion, setUserVersion] = useState(0);

  useEffect(() => {
    if (!isReady) return;
    const bump = () => setUserVersion((v) => v + 1);
    const offReady = RiviumAbTesting.on('userTokenReady', bump);
    const offAwaiting = RiviumAbTesting.on('awaitingUserToken', bump);
    return () => {
      offReady();
      offAwaiting();
    };
  }, [isReady]);

  // Follows `config.userToken` when the app renders with a new one.
  const lastUserToken = useRef(config.userToken);

  useEffect(() => {
    if (!isReady || lastUserToken.current === config.userToken) return;
    lastUserToken.current = config.userToken;
    RiviumAbTesting.setUserToken(config.userToken ?? null).catch((e) => {
      if (config.debug) {
        console.error('RiviumAbTesting: Failed to set user token:', e);
      }
    });
  }, [isReady, config.userToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follows the signed-in user: a login or logout changes `userId`, and the
  // SDK must drop the last user's variants and token when it does.
  const [userReady, setUserReady] = useState<string | undefined>(undefined);
  const attributesKey = JSON.stringify(userAttributes ?? {});
  const hadUserId = useRef(false);
  const usesUserToken = !!(config.tokenProvider || config.userToken);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;

    (async () => {
      if (userId) {
        hadUserId.current = true;
        await RiviumAbTesting.setUserId(userId);
        if (userAttributes) {
          await RiviumAbTesting.setUserAttributes(userAttributes);
        }
      } else if (hadUserId.current || !usesUserToken) {
        // Signed out: the last user's variants and token must not stay behind.
        // (Without a `userId` prop from the start, the user token says who
        // the user is and the SDK follows it by itself.)
        hadUserId.current = false;
        if (await RiviumAbTesting.getUserId()) {
          await RiviumAbTesting.clearUserId();
        }
      } else if (userAttributes) {
        await RiviumAbTesting.setUserAttributes(userAttributes);
      }
      if (!cancelled) setUserReady(userId ?? '');
    })().catch((e) => {
      if (config.debug) {
        console.error('RiviumAbTesting: Failed to set user:', e);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isReady, userId, attributesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = isReady && userReady === (userId ?? '');

  return (
    <RiviumAbTestingContext.Provider value={ready ? RiviumAbTesting : null}>
      <RiviumAbTestingUserContext.Provider value={userVersion}>
        {children}
      </RiviumAbTestingUserContext.Provider>
    </RiviumAbTestingContext.Provider>
  );
}

// ============================================
// HOOKS
// ============================================

export function useRiviumAbTesting(): typeof RiviumAbTesting {
  const ctx = useContext(RiviumAbTestingContext);
  if (!ctx) {
    throw new Error(
      'useRiviumAbTesting must be used within a <RiviumAbTestingProvider>'
    );
  }
  return ctx;
}

export function useVariant(
  experimentKey: string,
  defaultVariant: string = 'control'
): { variant: string; isLoading: boolean } {
  const [variant, setVariant] = useState(defaultVariant);
  const [isLoading, setIsLoading] = useState(true);
  const sdk = useContext(RiviumAbTestingContext);
  const userVersion = useContext(RiviumAbTestingUserContext);

  useEffect(() => {
    if (!sdk) return;

    let cancelled = false;

    sdk
      .getVariant(experimentKey, defaultVariant)
      .then((v) => {
        if (!cancelled) {
          setVariant(v);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVariant(defaultVariant);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sdk, userVersion, experimentKey, defaultVariant]);

  return { variant, isLoading };
}

export function useFeatureFlag(
  flagKey: string,
  defaultValue: boolean = false
): { enabled: boolean; isLoading: boolean } {
  const [enabled, setEnabled] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const sdk = useContext(RiviumAbTestingContext);
  const userVersion = useContext(RiviumAbTestingUserContext);

  useEffect(() => {
    if (!sdk) return;

    let cancelled = false;

    sdk
      .isFeatureEnabled(flagKey, defaultValue)
      .then((v) => {
        if (!cancelled) {
          setEnabled(v);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(defaultValue);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sdk, userVersion, flagKey, defaultValue]);

  return { enabled, isLoading };
}

export function useFeatureValue(
  flagKey: string,
  defaultValue?: unknown
): { value: unknown; isLoading: boolean } {
  const [value, setValue] = useState<unknown>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const sdk = useContext(RiviumAbTestingContext);
  const userVersion = useContext(RiviumAbTestingUserContext);

  useEffect(() => {
    if (!sdk) return;

    let cancelled = false;

    sdk
      .getFeatureValue(flagKey, defaultValue)
      .then((v) => {
        if (!cancelled) {
          setValue(v);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setValue(defaultValue);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sdk, userVersion, flagKey, defaultValue]);

  return { value, isLoading };
}

// Re-export core types for convenience
export {
  RiviumAbTesting,
  EventType,
  type RiviumAbTestingConfig,
  type Experiment,
  type Variant,
  type Assignment,
  type FeatureFlag,
  type FlagVariant,
  type RiviumAbTestingEventType,
  type RiviumAbTestingEvent,
} from './index';
