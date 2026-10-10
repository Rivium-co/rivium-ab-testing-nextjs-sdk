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
- Browser SDK for Next.js — runs in client components; `init()` is ignored on the server, so no visitor's state is shared between requests (for server code use [`rivium-ab-testing-node`](https://www.npmjs.com/package/rivium-ab-testing-node))
- Signed user tokens — the service takes the user from a token your server mints, not from the app
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
        // Your server mints this for the signed-in user (see "User tokens").
        tokenProvider: async () => (await (await fetch('/api/rivium-token', { method: 'POST' })).json()).token,
      }}
      userId={session.user.id}
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

// 1. Initialize (in the browser)
await RiviumAbTesting.init({
  apiKey: 'rv_live_your_api_key',
  tokenProvider: fetchRiviumToken, // see "User tokens"
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

## User tokens

Anyone can read the API key out of your site, so on its own it can't prove
which user a request is for. Your server can: it holds your project's **server
secret** and mints a short-lived token for the signed-in user. The SDK sends
it, and the service takes the user from the token.

```typescript
// app/api/rivium-token/route.ts  (server)
import { RiviumAbTesting } from 'rivium-ab-testing-node';

await RiviumAbTesting.init({ apiKey: process.env.RIVIUM_API_KEY!, serverSecret: process.env.RIVIUM_SERVER_SECRET });

export async function POST() {
  const session = await getSession();           // your auth
  if (!session) return new Response(null, { status: 401 });
  return Response.json(await RiviumAbTesting.createUserToken(session.user.id));
}
```

Give the SDK a `tokenProvider` that calls it. The SDK asks again shortly
before the token expires, and once more if the service says it has expired.
When a user signs out, clear `userId` on the provider (or call
`clearUserId()`); when another signs in, pass their id (or call `setUserId`).
Either way the last user's variants, attributes, token and unsent events are
dropped before anything is sent for the next one; events still waiting go out
under the last user's own token, never under another user's.

A token is **required** for assigning variants, tracking events and
evaluating flags (reading the experiment and flag lists is not, so the page
can load them before anyone signs in). The service takes the user from the
token, so the SDK does too: you may leave `userId` out and let the token say
who the user is. The same token works for Rivium Chat and Sync: mint one and
pass it to every Rivium SDK.

### Before your user signs in

You can start the SDK before anyone is signed in: return `null` from
`tokenProvider` and call `refreshUserToken()` when the user signs in or out
(or push a token yourself with `setUserToken(token)`, and `setUserToken(null)`
on sign-out). Until it has a token the SDK waits: `getVariant`, the flag
getters and the hooks return your defaults at once, nothing is sent, and
nothing is reported as an error. When the token arrives the SDK continues by
itself, and the hooks render again with the real values.

```typescript
RiviumAbTesting.isAwaitingUserToken;             // true while it waits
RiviumAbTesting.onAwaitingUserToken(() => {});   // called each time it starts waiting
RiviumAbTesting.on('userTokenReady', () => {});  // a token arrived: read variants again
await RiviumAbTesting.refreshUserToken();        // ask tokenProvider again now
await RiviumAbTesting.setUserToken(token);       // or hand over a token (null: signed out)
```

Events tracked while it waits are kept (up to 1000, the oldest dropped first)
and sent after sign-in **only if they were recorded for that same user**
(`setUserId` was called with their id before the token arrived). Events
recorded while no user was set belong to nobody, cannot be credited to anyone,
and are dropped when a user signs in.

**Never put the server secret in client code or a `NEXT_PUBLIC_` variable.**

## React Hooks

### RiviumAbTestingProvider

Wrap your app with the provider to initialize the SDK:

```tsx
<RiviumAbTestingProvider
  config={{
    apiKey: 'rv_live_your_api_key',
    tokenProvider: fetchRiviumToken,
    flushInterval: 30000,
  }}
  userId={session.user.id}   // changes on login/logout are followed
  userAttributes={{ plan: 'premium' }}
>
  {children}
</RiviumAbTestingProvider>
```

`userId` is optional when you use a user token: the SDK takes the user from
it. While there is no token the hooks return their defaults (with `isLoading`
false) and render again when the token arrives or the user changes.

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
  'control' // returned while there is no user token, or when the service
            // cannot be reached and nothing is cached
);
```

The variant always comes from the service (and is cached for the user); the
SDK never works one out on the device.

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
// 'featureFlagsRefreshed', 'syncCompleted', 'offlineMode', 'onlineMode',
// 'awaitingUserToken', 'userTokenReady'

// Unsubscribe
unsubscribe();
// or: RiviumAbTesting.off('experimentAssigned', callback);
```

## Configuration

```typescript
await RiviumAbTesting.init({
  apiKey: 'rv_live_your_api_key',
  tokenProvider: fetchRiviumToken, // returns a user token minted by your server
  debug: false,           // log to the console (development only)
  flushInterval: 30000,   // send queued events every N ms (default: 30000)
  maxQueueSize: 1000,     // events kept while they cannot be sent (default and maximum: 1000)
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
| `clearUserId()` | Sign the user out: drop their data, token and unsent events |
| `isAwaitingUserToken` | `true` while the SDK waits for a user token |
| `onAwaitingUserToken(callback)` | Called each time the SDK starts waiting; returns an unsubscribe function |
| `setUserToken(token)` | Hand over a user token; `null` when the user signs out |
| `refreshUserToken()` | Ask `tokenProvider` again (call on sign-in and sign-out) |
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
