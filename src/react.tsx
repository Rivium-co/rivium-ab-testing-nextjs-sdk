'use client';

import {
  createContext,
  useContext,
  useEffect,
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

  // Follows the signed-in user: a login or logout changes `userId`, and the
  // SDK must drop the last user's variants and token when it does.
  const [userReady, setUserReady] = useState<string | undefined>(undefined);
  const attributesKey = JSON.stringify(userAttributes ?? {});

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;

    (async () => {
      if (userId) {
        await RiviumAbTesting.setUserId(userId);
        if (userAttributes) {
          await RiviumAbTesting.setUserAttributes(userAttributes);
        }
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
      {children}
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
  }, [sdk, experimentKey, defaultVariant]);

  return { variant, isLoading };
}

export function useFeatureFlag(
  flagKey: string,
  defaultValue: boolean = false
): { enabled: boolean; isLoading: boolean } {
  const [enabled, setEnabled] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const sdk = useContext(RiviumAbTestingContext);

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
  }, [sdk, flagKey, defaultValue]);

  return { enabled, isLoading };
}

export function useFeatureValue(
  flagKey: string,
  defaultValue?: unknown
): { value: unknown; isLoading: boolean } {
  const [value, setValue] = useState<unknown>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const sdk = useContext(RiviumAbTestingContext);

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
  }, [sdk, flagKey, defaultValue]);

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
