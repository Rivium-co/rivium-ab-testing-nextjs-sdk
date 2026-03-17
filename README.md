# Rivium AB Testing Next.js SDK

A/B Testing and Feature Flags SDK for Next.js / React with offline-first sync.

[![npm](https://img.shields.io/npm/v/rivium-ab-testing-nextjs.svg)](https://www.npmjs.com/package/rivium-ab-testing-nextjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- A/B testing with automatic variant assignment
- Feature flags with targeting rules and rollout percentages
- Sticky bucketing — users stay in the same variant
- Offline-first event queue with automatic sync
- 17 built-in event types (view, click, conversion, purchase, etc.)
- React hooks and provider for easy integration
- SSR-safe — works with Next.js server-side rendering
- Dual CJS/ESM output with full TypeScript types

## Installation

```bash
npm install rivium-ab-testing-nextjs
```

## Quick Start

### With React Hooks (Recommended)

```tsx
// app/providers.tsx
'use client';

import { RiviumAbTestingProvider } from 'rivium-ab-testing-nextjs/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RiviumAbTestingProvider
      config={{
        apiKey: 'rv_live_your_api_key',
        debug: true,
      }}
      userId="user-123"
      userAttributes={{ plan: 'premium', country: 'US' }}
    >
      {children}
    </RiviumAbTestingProvider>
  );
}
```

```tsx
// app/checkout.tsx
'use client';

import { useVariant, useFeatureFlag } from 'rivium-ab-testing-nextjs/react';

export default function Checkout() {
  const { variant, isLoading } = useVariant('checkout-redesign');
  const { enabled: darkMode } = useFeatureFlag('dark-mode');

  if (isLoading) return <div>Loading...</div>;

  return variant === 'variant-a' ? <NewCheckout /> : <OriginalCheckout />;
}
```

### Without React Hooks

```typescript
import { RiviumAbTesting } from 'rivium-ab-testing-nextjs';

// 1. Initialize
await RiviumAbTesting.init({
  apiKey: 'rv_live_your_api_key',
  debug: true,
});

// 2. Set user
await RiviumAbTesting.setUserId('user-123');

// 3. Get variant
const variant = await RiviumAbTesting.getVariant('checkout-redesign');

// 4. Track conversion
await RiviumAbTesting.trackConversion('checkout-redesign', 49.99);

// 5. Flush events
await RiviumAbTesting.flush();
```

## React Hooks

### RiviumAbTestingProvider

Wrap your app with the provider to initialize the SDK:

```tsx
<RiviumAbTestingProvider
  config={{
    apiKey: 'rv_live_your_api_key',
    debug: true,
    flushInterval: 30000,
    maxQueueSize: 100,
  }}
  userId="user-123"
  userAttributes={{ plan: 'premium' }}
>
  {children}
</RiviumAbTestingProvider>
```

### useVariant

```tsx
const { variant, isLoading } = useVariant('experiment-key', 'control');
```

### useFeatureFlag

```tsx
const { enabled, isLoading } = useFeatureFlag('dark-mode', false);
```

### useFeatureValue

```tsx
const { value, isLoading } = useFeatureValue('max-upload-size', 10);
```

### useRiviumAbTesting

Direct SDK access:

```tsx
const sdk = useRiviumAbTesting();
await sdk.trackClick('experiment-key');
```

## A/B Testing

### Get Variant

```typescript
const variant = await RiviumAbTesting.getVariant(
  'experiment-key',
  'control' // fallback if offline and no cache
);
```

### Get Variant Config

```typescript
const config = await RiviumAbTesting.getVariantConfig('experiment-key');
// config is a Record<string, unknown> set in the Rivium dashboard
const layout = config?.layout;
const buttonColor = config?.button_color;
```

### List Experiments

```typescript
const experiments = await RiviumAbTesting.getExperiments();
experiments.forEach((exp) => {
  console.log(`${exp.key} [${exp.status}] - ${exp.variants.length} variants`);
});

// Refresh from server
await RiviumAbTesting.refreshExperiments();
```

## Feature Flags

```typescript
// Check if feature is enabled
const darkMode = await RiviumAbTesting.isFeatureEnabled('dark-mode');

// Get feature value (string, number, JSON, etc.)
const maxUpload = await RiviumAbTesting.getFeatureValue('max-upload-size', 10);

// Get all flags
const flags = await RiviumAbTesting.getFeatureFlags();
flags.forEach((flag) => {
  console.log(`${flag.key}: enabled=${flag.enabled}, rollout=${flag.rolloutPercentage}%`);
});

// Refresh flags from server
await RiviumAbTesting.refreshFeatureFlags();
```

## Event Tracking

Track user interactions with 17 built-in event types:

```typescript
// Core events
await RiviumAbTesting.trackView('experiment-key');
await RiviumAbTesting.trackClick('experiment-key');
await RiviumAbTesting.trackConversion('experiment-key', 99.99);

// Custom event
await RiviumAbTesting.trackCustomEvent('experiment-key', 'button_hover', {
  duration_ms: 1500,
  element: 'cta_button',
});

// E-commerce events
await RiviumAbTesting.trackAddToCart('experiment-key', 29.99, 'sku-123', { quantity: 2 });
await RiviumAbTesting.trackPurchase('experiment-key', 59.99, 'txn-456', { currency: 'USD' });
await RiviumAbTesting.trackRemoveFromCart('experiment-key', 29.99, 'sku-123');
await RiviumAbTesting.trackBeginCheckout('experiment-key', 59.99);

// Engagement events
await RiviumAbTesting.trackScroll('experiment-key', 75.0);
await RiviumAbTesting.trackFormSubmit('experiment-key', 'signup');
await RiviumAbTesting.trackSearch('experiment-key', 'shoes');
await RiviumAbTesting.trackShare('experiment-key', 'twitter');

// Media events
await RiviumAbTesting.trackVideoStart('experiment-key', 'vid-001');
await RiviumAbTesting.trackVideoComplete('experiment-key', 'vid-001');

// Auth events
await RiviumAbTesting.trackSignUp('experiment-key', 'google');
await RiviumAbTesting.trackLogin('experiment-key', 'email');
await RiviumAbTesting.trackLogout('experiment-key');
```

### Generic Event Tracking

```typescript
await RiviumAbTesting.trackEvent(
  'experiment-key',
  EventType.CUSTOM,
  'page_load_time',
  2.3,
  { page: '/checkout', cached: false }
);
```

## User Attributes

Set attributes for targeting rules:

```typescript
await RiviumAbTesting.setUserId('user-123');

await RiviumAbTesting.setUserAttributes({
  plan: 'premium',
  country: 'US',
  age: 28,
  platform: 'web',
});
```

## Event Listeners

```typescript
// Listen for SDK events
const unsubscribe = RiviumAbTesting.on('experimentAssigned', (event) => {
  console.log('Assigned:', event.data);
});

// Available events:
// 'initialized', 'error', 'experimentAssigned', 'experimentsRefreshed',
// 'featureFlagsRefreshed', 'syncCompleted', 'offlineMode', 'onlineMode'

// Unsubscribe
unsubscribe();
// or: RiviumAbTesting.off('experimentAssigned', callback);
```

## Configuration

```typescript
await RiviumAbTesting.init({
  apiKey: 'rv_live_your_api_key',
  debug: true,            // Enable debug logging
  flushInterval: 30000,   // Auto-flush interval in ms (default: 30000)
  maxQueueSize: 100,      // Max events before auto-flush (default: 100)
});
```

## Lifecycle

```typescript
// Refresh experiments from server
await RiviumAbTesting.refreshExperiments();

// Flush pending events
await RiviumAbTesting.flush();

// Reset all state (clears cache, assignments, events)
await RiviumAbTesting.reset();
```

## API Reference

| Method | Description |
|---|---|
| `init(config)` | Initialize the SDK |
| `setUserId(id)` | Set user ID for assignment |
| `getUserId()` | Get current user ID |
| `setUserAttributes(attrs)` | Set targeting attributes |
| `getVariant(key)` | Get assigned variant |
| `getVariantConfig(key)` | Get variant configuration |
| `isFeatureEnabled(key)` | Check if feature flag is on |
| `getFeatureValue(key)` | Get feature flag value |
| `getFeatureFlags()` | Get all feature flags |
| `refreshFeatureFlags()` | Refresh flags from server |
| `refreshExperiments()` | Refresh experiments from server |
| `getExperiments()` | Get all experiments |
| `trackEvent(key, type, ...)` | Track generic event |
| `flush()` | Force sync pending events |
| `reset()` | Clear all state and cache |
| `on(event, callback)` | Subscribe to SDK events |
| `off(event, callback)` | Unsubscribe from events |

### React Hooks

| Hook | Description |
|---|---|
| `useVariant(key, default?)` | Get variant with loading state |
| `useFeatureFlag(key, default?)` | Get flag enabled state |
| `useFeatureValue(key, default?)` | Get flag value |
| `useRiviumAbTesting()` | Direct SDK access |

## Example App

See the `example/` directory for a complete working Next.js example.

## Documentation

- [Rivium Console](https://console.rivium.co)
- [Next.js SDK Docs](https://console.rivium.co/dashboard/rivium-abtest/docs/nextjs)

## License

MIT
