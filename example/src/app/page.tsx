'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RiviumAbTesting, EventType } from 'rivium-ab-testing-nextjs';
import type { Experiment, FeatureFlag } from 'rivium-ab-testing-nextjs';

// ============================================
// CONSTANTS
// ============================================

const API_KEY = 'YOUR_API_KEY_HERE';
const EXPERIMENT_KEYS = ['checkout-flow-test', 'pricing-page-test'];
const FLAG_KEYS = ['dark_mode', 'Onboarding Flow', 'Dark Mode Settings', 'maintenance_mode', 'premium_banner', 'checkout_flow'];

// ============================================
// LOG TYPES
// ============================================

interface LogEntry {
  id: string;
  message: string;
  color: 'white' | 'green' | 'red' | 'yellow' | 'blue';
  timestamp: string;
}

// ============================================
// MAIN PAGE
// ============================================

export default function Home() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentVariant, setCurrentVariant] = useState<string | null>(null);
  const [variantConfig, setVariantConfig] = useState<Record<string, unknown> | null>(null);
  const logPanelRef = useRef<HTMLDivElement>(null);

  const currentExperiment = EXPERIMENT_KEYS[0];

  // Auto-scroll logs
  useEffect(() => {
    if (logPanelRef.current) {
      logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
    }
  }, [logs]);

  // ============================================
  // LOGGING
  // ============================================

  const log = useCallback((message: string, color: LogEntry['color'] = 'white') => {
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setLogs((prev) => [
      ...prev,
      { id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, message: `[${ts}] ${message}`, color, timestamp: ts },
    ]);
  }, []);

  const logSection = useCallback((title: string) => log(`--- ${title} ---`, 'yellow'), [log]);
  const logSuccess = useCallback((message: string) => log(message, 'green'), [log]);
  const logError = useCallback((message: string) => log(message, 'red'), [log]);

  // ============================================
  // SETUP
  // ============================================

  const initSDK = useCallback(async () => {
    log('Initializing SDK...');
    try {
      await RiviumAbTesting.init({
        apiKey: API_KEY,
        debug: true,
        flushInterval: 10000,
        maxQueueSize: 50,
      });
      setIsInitialized(true);
      logSuccess('SDK initialized successfully');
    } catch (e) {
      logError(`Init failed: ${e}`);
    }
  }, [log, logSuccess, logError]);

  const setUser = useCallback(async () => {
    const userId = `nextjs-test-user-${Math.floor(Math.random() * 9000) + 1000}`;
    try {
      await RiviumAbTesting.setUserId(userId);
      logSuccess(`User set: ${userId}`);
    } catch (e) {
      logError(`Set user failed: ${e}`);
    }
  }, [logSuccess, logError]);

  const setAttributes = useCallback(async () => {
    try {
      await RiviumAbTesting.setUserAttributes({
        plan: 'premium',
        country: 'US',
        age: 28,
        appVersion: '2.1.0',
        platform: 'nextjs',
      });
      logSuccess('Attributes set: 5 keys');
    } catch (e) {
      logError(`Set attributes failed: ${e}`);
    }
  }, [logSuccess, logError]);

  // ============================================
  // EXPERIMENTS
  // ============================================

  const getVariant = useCallback(async () => {
    log(`Getting variant for ${currentExperiment}...`);
    try {
      const variant = await RiviumAbTesting.getVariant(currentExperiment);
      setCurrentVariant(variant);
      logSuccess(`Variant: ${variant}`);
    } catch (e) {
      logError(`Get variant failed: ${e}`);
    }
  }, [currentExperiment, log, logSuccess, logError]);

  const getVariantConfig = useCallback(async () => {
    try {
      const config = await RiviumAbTesting.getVariantConfig(currentExperiment);
      setVariantConfig(config);
      if (config) {
        logSuccess(`Config: ${JSON.stringify(config)}`);
      } else {
        log(`No config for ${currentExperiment}`);
      }
    } catch (e) {
      logError(`Get config failed: ${e}`);
    }
  }, [currentExperiment, log, logSuccess, logError]);

  const listExperiments = useCallback(async () => {
    try {
      const experiments: Experiment[] = await RiviumAbTesting.getExperiments();
      logSuccess(`Experiments: ${experiments.length}`);
      experiments.forEach((exp) => {
        log(`  - ${exp.key} (${exp.status}) ${exp.variants.length} variants`);
      });
    } catch (e) {
      logError(`List experiments failed: ${e}`);
    }
  }, [log, logSuccess, logError]);

  const refreshExperiments = useCallback(async () => {
    log('Refreshing experiments...');
    try {
      await RiviumAbTesting.refreshExperiments();
      logSuccess('Experiments refreshed');
    } catch (e) {
      logError(`Refresh failed: ${e}`);
    }
  }, [log, logSuccess, logError]);

  // ============================================
  // CORE EVENTS
  // ============================================

  const trackView = useCallback(async () => {
    try {
      await RiviumAbTesting.trackView(currentExperiment);
      logSuccess('Tracked: view');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackClick = useCallback(async () => {
    try {
      await RiviumAbTesting.trackClick(currentExperiment);
      logSuccess('Tracked: click');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackConversion = useCallback(async () => {
    try {
      await RiviumAbTesting.trackConversion(currentExperiment, 49.99);
      logSuccess('Tracked: conversion ($49.99)');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackCustomEvent = useCallback(async () => {
    try {
      await RiviumAbTesting.trackCustomEvent(currentExperiment, 'button_tap', {
        screen: 'home',
        element: 'hero_banner',
      });
      logSuccess('Tracked: custom (button_tap)');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackGenericEvent = useCallback(async () => {
    try {
      await RiviumAbTesting.trackEvent(currentExperiment, EventType.CLICK, 'generic_test', 1.0, {
        source: 'nextjs_example',
      });
      logSuccess('Tracked: generic (click)');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  // ============================================
  // ENGAGEMENT EVENTS
  // ============================================

  const trackScroll = useCallback(async () => {
    try {
      await RiviumAbTesting.trackScroll(currentExperiment, 75.0, { page: 'product_list' });
      logSuccess('Tracked: scroll (75%)');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackFormSubmit = useCallback(async () => {
    try {
      await RiviumAbTesting.trackFormSubmit(currentExperiment, 'checkout_form', { fields: 5 });
      logSuccess('Tracked: form_submit');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackSearch = useCallback(async () => {
    try {
      await RiviumAbTesting.trackSearch(currentExperiment, 'premium plan', { results: 12 });
      logSuccess('Tracked: search');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackShare = useCallback(async () => {
    try {
      await RiviumAbTesting.trackShare(currentExperiment, 'twitter', { contentType: 'product' });
      logSuccess('Tracked: share');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  // ============================================
  // E-COMMERCE EVENTS
  // ============================================

  const trackAddToCart = useCallback(async () => {
    try {
      await RiviumAbTesting.trackAddToCart(currentExperiment, 29.99, 'PROD-001', { quantity: 1 });
      logSuccess('Tracked: add_to_cart ($29.99)');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackRemoveFromCart = useCallback(async () => {
    try {
      await RiviumAbTesting.trackRemoveFromCart(currentExperiment, 29.99, 'PROD-001');
      logSuccess('Tracked: remove_from_cart');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackBeginCheckout = useCallback(async () => {
    try {
      await RiviumAbTesting.trackBeginCheckout(currentExperiment, 59.98, { items: 2 });
      logSuccess('Tracked: begin_checkout ($59.98)');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackPurchase = useCallback(async () => {
    try {
      const txnId = `TXN-${Math.floor(Math.random() * 90000) + 10000}`;
      await RiviumAbTesting.trackPurchase(currentExperiment, 59.98, txnId, { currency: 'USD' });
      logSuccess('Tracked: purchase ($59.98)');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  // ============================================
  // MEDIA EVENTS
  // ============================================

  const trackVideoStart = useCallback(async () => {
    try {
      await RiviumAbTesting.trackVideoStart(currentExperiment, 'onboarding-v2', { duration: 120 });
      logSuccess('Tracked: video_start');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackVideoComplete = useCallback(async () => {
    try {
      await RiviumAbTesting.trackVideoComplete(currentExperiment, 'onboarding-v2', { watchTime: 118 });
      logSuccess('Tracked: video_complete');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  // ============================================
  // AUTH EVENTS
  // ============================================

  const trackSignUp = useCallback(async () => {
    try {
      await RiviumAbTesting.trackSignUp(currentExperiment, 'google', { source: 'onboarding' });
      logSuccess('Tracked: sign_up (google)');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackLogin = useCallback(async () => {
    try {
      await RiviumAbTesting.trackLogin(currentExperiment, 'email', { device: 'desktop' });
      logSuccess('Tracked: login (email)');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  const trackLogout = useCallback(async () => {
    try {
      await RiviumAbTesting.trackLogout(currentExperiment, { sessionDuration: 3600 });
      logSuccess('Tracked: logout');
    } catch (e) { logError(`${e}`); }
  }, [currentExperiment, logSuccess, logError]);

  // ============================================
  // FEATURE FLAGS
  // ============================================

  const checkFlag = useCallback(async (key: string) => {
    try {
      const enabled = await RiviumAbTesting.isFeatureEnabled(key);
      logSuccess(`Flag '${key}': ${enabled ? 'ENABLED' : 'DISABLED'}`);
    } catch (e) { logError(`${e}`); }
  }, [logSuccess, logError]);

  const getFlagValue = useCallback(async () => {
    try {
      const value = await RiviumAbTesting.getFeatureValue('Dark Mode Settings', 'default');
      logSuccess(`Flag value Dark Mode Settings: ${value}`);
    } catch (e) { logError(`${e}`); }
  }, [logSuccess, logError]);

  const listFlags = useCallback(async () => {
    try {
      const flags: FeatureFlag[] = await RiviumAbTesting.getFeatureFlags();
      logSuccess(`Feature flags: ${flags.length}`);
      flags.forEach((flag) => {
        log(`  - ${flag.key} [${flag.enabled ? 'ON' : 'OFF'}] rollout: ${flag.rolloutPercentage}%`);
      });
    } catch (e) { logError(`${e}`); }
  }, [log, logSuccess, logError]);

  const refreshFlags = useCallback(async () => {
    log('Refreshing feature flags...');
    try {
      await RiviumAbTesting.refreshFeatureFlags();
      logSuccess('Feature flags refreshed');
    } catch (e) { logError(`${e}`); }
  }, [log, logSuccess, logError]);

  // ============================================
  // ADVANCED
  // ============================================

  const multiUserTest = useCallback(async () => {
    log('Running multi-user test (20 users)...');
    const variantCounts: Record<string, number> = {};

    for (let i = 1; i <= 20; i++) {
      const userId = `multi-user-${i}`;
      await RiviumAbTesting.setUserId(userId);
      try {
        const variant = await RiviumAbTesting.getVariant(currentExperiment);
        variantCounts[variant] = (variantCounts[variant] || 0) + 1;
      } catch {
        variantCounts['error'] = (variantCounts['error'] || 0) + 1;
      }
    }

    logSuccess('Multi-user results:');
    Object.entries(variantCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([variant, count]) => {
        log(`  ${variant}: ${count}/20 (${Math.round((count * 100) / 20)}%)`);
      });
  }, [currentExperiment, log, logSuccess]);

  // ============================================
  // LIFECYCLE
  // ============================================

  const flushEvents = useCallback(async () => {
    try {
      await RiviumAbTesting.flush();
      logSuccess('Events flushed');
    } catch (e) { logError(`${e}`); }
  }, [logSuccess, logError]);

  const resetSDK = useCallback(async () => {
    try {
      await RiviumAbTesting.reset();
      setIsInitialized(false);
      setCurrentVariant(null);
      setVariantConfig(null);
      logSuccess('SDK reset');
    } catch (e) { logError(`${e}`); }
  }, [logSuccess, logError]);

  const clearLogs = useCallback(() => setLogs([]), []);

  // ============================================
  // RUN FULL SCENARIO
  // ============================================

  const runFullScenario = useCallback(async () => {
    logSection('FULL SCENARIO');
    log('Starting comprehensive SDK test...');

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // 1. Init
    logSection('1. Initialize SDK');
    await initSDK();
    await delay(2000);

    // 2. User
    logSection('2. Set User');
    await setUser();
    await setAttributes();
    await delay(500);

    // 3. Experiments
    logSection('3. Experiments');
    await getVariant();
    await delay(1500);
    await getVariantConfig();
    await listExperiments();
    await delay(500);

    // 4. Core Events
    logSection('4. Core Events');
    await trackView();
    await trackClick();
    await trackConversion();
    await trackCustomEvent();
    await trackGenericEvent();
    await delay(500);

    // 5. Engagement Events
    logSection('5. Engagement Events');
    await trackScroll();
    await trackFormSubmit();
    await trackSearch();
    await trackShare();
    await delay(500);

    // 6. E-Commerce Events
    logSection('6. E-Commerce Events');
    await trackAddToCart();
    await trackRemoveFromCart();
    await trackBeginCheckout();
    await trackPurchase();
    await delay(500);

    // 7. Media Events
    logSection('7. Media Events');
    await trackVideoStart();
    await trackVideoComplete();
    await delay(500);

    // 8. Auth Events
    logSection('8. Auth Events');
    await trackSignUp();
    await trackLogin();
    await trackLogout();
    await delay(500);

    // 9. Feature Flags
    logSection('9. Feature Flags');
    for (const key of FLAG_KEYS) {
      await checkFlag(key);
    }
    await getFlagValue();
    await listFlags();
    await delay(500);

    // 10. Multi-user test
    logSection('10. Multi-User Test');
    await multiUserTest();
    await delay(3000);

    // 11. Flush
    logSection('11. Flush & Complete');
    await flushEvents();
    await delay(1000);

    log('');
    logSuccess('=== FULL SCENARIO COMPLETE ===');
  }, [
    logSection, log, logSuccess, initSDK, setUser, setAttributes,
    getVariant, getVariantConfig, listExperiments, trackView, trackClick,
    trackConversion, trackCustomEvent, trackGenericEvent, trackScroll,
    trackFormSubmit, trackSearch, trackShare, trackAddToCart, trackRemoveFromCart,
    trackBeginCheckout, trackPurchase, trackVideoStart, trackVideoComplete,
    trackSignUp, trackLogin, trackLogout, checkFlag, getFlagValue, listFlags,
    multiUserTest, flushEvents,
  ]);

  // ============================================
  // RENDER
  // ============================================

  const logColorMap: Record<string, string> = {
    white: 'text-gray-300',
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-amber-400',
    blue: 'text-blue-400',
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">RiviumAbTesting Next.js</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-600">{isInitialized ? 'SDK Ready' : 'Not Initialized'}</span>
          </div>
          {currentVariant && (
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
              Variant: {currentVariant}
            </span>
          )}
          {variantConfig && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              Config: {Object.keys(variantConfig).length} keys
            </span>
          )}
        </div>
      </header>

      {/* Log Panel */}
      <div className="bg-gray-900 border-b border-gray-700 flex-shrink-0" style={{ height: '40vh' }}>
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
          <span className="text-xs text-gray-400">Logs ({logs.length})</span>
          <button onClick={clearLogs} className="text-xs text-gray-400 hover:text-white transition">
            Clear
          </button>
        </div>
        <div ref={logPanelRef} className="overflow-y-auto p-2" style={{ height: 'calc(40vh - 32px)' }}>
          {logs.map((entry) => (
            <p key={entry.id} className={`font-mono text-[11px] leading-4 ${logColorMap[entry.color]}`}>
              {entry.message}
            </p>
          ))}
        </div>
      </div>

      {/* Button Sections */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Run Full Scenario */}
          <button
            onClick={runFullScenario}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
          >
            Run Full Scenario
          </button>

          {/* Setup */}
          <Section title="Setup" icon="gear" color="blue">
            <Btn onClick={initSDK}>Init SDK</Btn>
            <Btn onClick={setUser} disabled={!isInitialized}>Set User</Btn>
            <Btn onClick={setAttributes} disabled={!isInitialized}>Set Attributes</Btn>
          </Section>

          {/* Experiments */}
          <Section title="Experiments" icon="flask" color="purple">
            <Btn onClick={getVariant} disabled={!isInitialized}>Get Variant</Btn>
            <Btn onClick={getVariantConfig} disabled={!isInitialized}>Get Config</Btn>
            <Btn onClick={listExperiments} disabled={!isInitialized}>List Experiments</Btn>
            <Btn onClick={refreshExperiments} disabled={!isInitialized}>Refresh</Btn>
          </Section>

          {/* Core Events */}
          <Section title="Core Events" icon="bolt" color="orange">
            <Btn onClick={trackView} disabled={!isInitialized}>View</Btn>
            <Btn onClick={trackClick} disabled={!isInitialized}>Click</Btn>
            <Btn onClick={trackConversion} disabled={!isInitialized}>Conversion</Btn>
            <Btn onClick={trackCustomEvent} disabled={!isInitialized}>Custom</Btn>
            <Btn onClick={trackGenericEvent} disabled={!isInitialized}>Generic</Btn>
          </Section>

          {/* Engagement Events */}
          <Section title="Engagement Events" icon="hand" color="teal">
            <Btn onClick={trackScroll} disabled={!isInitialized}>Scroll</Btn>
            <Btn onClick={trackFormSubmit} disabled={!isInitialized}>Form Submit</Btn>
            <Btn onClick={trackSearch} disabled={!isInitialized}>Search</Btn>
            <Btn onClick={trackShare} disabled={!isInitialized}>Share</Btn>
          </Section>

          {/* E-Commerce Events */}
          <Section title="E-Commerce Events" icon="cart" color="green">
            <Btn onClick={trackAddToCart} disabled={!isInitialized}>Add to Cart</Btn>
            <Btn onClick={trackRemoveFromCart} disabled={!isInitialized}>Remove from Cart</Btn>
            <Btn onClick={trackBeginCheckout} disabled={!isInitialized}>Begin Checkout</Btn>
            <Btn onClick={trackPurchase} disabled={!isInitialized}>Purchase</Btn>
          </Section>

          {/* Media Events */}
          <Section title="Media Events" icon="play" color="red">
            <Btn onClick={trackVideoStart} disabled={!isInitialized}>Video Start</Btn>
            <Btn onClick={trackVideoComplete} disabled={!isInitialized}>Video Complete</Btn>
          </Section>

          {/* Auth Events */}
          <Section title="Auth Events" icon="user" color="indigo">
            <Btn onClick={trackSignUp} disabled={!isInitialized}>Sign Up</Btn>
            <Btn onClick={trackLogin} disabled={!isInitialized}>Login</Btn>
            <Btn onClick={trackLogout} disabled={!isInitialized}>Logout</Btn>
          </Section>

          {/* Feature Flags */}
          <Section title="Feature Flags" icon="flag" color="emerald">
            <Btn onClick={() => checkFlag('dark_mode')} disabled={!isInitialized}>Check dark_mode</Btn>
            <Btn onClick={() => checkFlag('Onboarding Flow')} disabled={!isInitialized}>Check Onboarding Flow</Btn>
            <Btn onClick={getFlagValue} disabled={!isInitialized}>Get Value</Btn>
            <Btn onClick={listFlags} disabled={!isInitialized}>List Flags</Btn>
            <Btn onClick={refreshFlags} disabled={!isInitialized}>Refresh Flags</Btn>
          </Section>

          {/* Advanced */}
          <Section title="Advanced" icon="wrench" color="gray">
            <Btn onClick={multiUserTest} disabled={!isInitialized}>Multi-User Test</Btn>
          </Section>

          {/* Lifecycle */}
          <Section title="Lifecycle" icon="refresh" color="pink">
            <Btn onClick={flushEvents} disabled={!isInitialized}>Flush</Btn>
            <Btn onClick={resetSDK}>Reset</Btn>
            <Btn onClick={clearLogs}>Clear Logs</Btn>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ============================================
// UI COMPONENTS
// ============================================

const sectionColors: Record<string, string> = {
  blue: 'text-blue-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  teal: 'text-teal-600',
  green: 'text-green-600',
  red: 'text-red-600',
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  gray: 'text-gray-600',
  pink: 'text-pink-600',
};

function Section({
  title,
  color,
  children,
}: {
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className={`text-sm font-semibold mb-2 ${sectionColors[color] || 'text-gray-600'}`}>{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Btn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-3 py-2 rounded-lg transition font-medium ${
        disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-800 active:bg-gray-300'
      }`}
    >
      {children}
    </button>
  );
}
