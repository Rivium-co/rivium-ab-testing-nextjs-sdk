import { FakeService, assigned, tokenFor, tokenUser, settle, platform, stopTimers } from './helpers';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('<RiviumAbTestingProvider> and hooks', () => {
  let service: FakeService;
  let React: typeof import('react');
  let TestRenderer: any;
  let bindings: typeof import('../react');

  function Show({ experiment = 'checkout' }: { experiment?: string }) {
    const { variant, isLoading } = bindings.useVariant(experiment, 'fallback');
    const { enabled } = bindings.useFeatureFlag('dark-mode', false);
    return <>{`${variant}|${isLoading ? 'loading' : 'ready'}|${enabled ? 'on' : 'off'}`}</>;
  }

  async function render(element: React.ReactElement) {
    let renderer: any;
    await React.act(async () => {
      renderer = TestRenderer.create(element);
      await settle();
    });
    return renderer;
  }

  async function during(work: () => unknown) {
    await React.act(async () => {
      await work();
      await settle();
    });
  }

  beforeEach(() => {
    platform.install();
    service = new FakeService();
    service.install();
    service.routes['/public/assign'] = (call) => assigned(`for-${tokenUser(call.token)}`);
    service.routes['/public/flag-evaluation'] = { body: { enabled: true, value: true } };
    // The renderer announces its own deprecation on every use.
    const realError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      if (!String(args[0]).includes('react-test-renderer is deprecated')) realError(...args);
    });
    jest.resetModules();
    React = require('react');
    TestRenderer = require('react-test-renderer');
    bindings = require('../react');
  });

  afterEach(async () => {
    await bindings.RiviumAbTesting.reset();
    stopTimers();
    jest.restoreAllMocks();
  });

  it('shows the default while waiting for a user token and the variant once it arrives', async () => {
    const { RiviumAbTestingProvider, RiviumAbTesting } = bindings;
    const renderer = await render(
      <RiviumAbTestingProvider config={{ apiKey: 'rv_test_key' }}>
        <Show />
      </RiviumAbTestingProvider>
    );

    expect(renderer.toJSON()).toBe('fallback|ready|off');
    expect(RiviumAbTesting.isAwaitingUserToken).toBe(true);
    expect(service.userCalls()).toEqual([]);

    await during(() => RiviumAbTesting.setUserToken(tokenFor('user-1')));
    expect(renderer.toJSON()).toBe('for-user-1|ready|on');

    await during(() => RiviumAbTesting.setUserToken(null));
    expect(renderer.toJSON()).toBe('fallback|ready|off');
  });

  it('follows the provider\'s token without a userId prop', async () => {
    const { RiviumAbTestingProvider, RiviumAbTesting } = bindings;
    let token: string | null = null;
    const config = { apiKey: 'rv_test_key', tokenProvider: async () => token };
    const renderer = await render(
      <RiviumAbTestingProvider config={config} userAttributes={{ plan: 'free' }}>
        <Show />
      </RiviumAbTestingProvider>
    );
    expect(renderer.toJSON()).toBe('fallback|ready|off');

    token = tokenFor('user-1');
    await during(() => RiviumAbTesting.refreshUserToken());
    expect(renderer.toJSON()).toBe('for-user-1|ready|on');

    // Rendering again with other attributes must not sign the user out.
    await during(() =>
      renderer.update(
        <RiviumAbTestingProvider config={config} userAttributes={{ plan: 'premium' }}>
          <Show />
        </RiviumAbTestingProvider>
      )
    );
    expect(renderer.toJSON()).toBe('for-user-1|ready|on');
    await expect(RiviumAbTesting.getUserId()).resolves.toBe('user-1');
  });

  it('follows the userId prop through sign-in, a user change and sign-out', async () => {
    const { RiviumAbTestingProvider, RiviumAbTesting } = bindings;
    let token: string | null = null;
    const config = { apiKey: 'rv_test_key', tokenProvider: async () => token };
    const tree = (userId?: string) => (
      <RiviumAbTestingProvider config={config} userId={userId}>
        <Show />
      </RiviumAbTestingProvider>
    );
    const renderer = await render(tree());
    expect(renderer.toJSON()).toBe('fallback|ready|off');

    token = tokenFor('user-a');
    await during(() => renderer.update(tree('user-a')));
    expect(renderer.toJSON()).toBe('for-user-a|ready|on');

    token = tokenFor('user-b');
    await during(() => renderer.update(tree('user-b')));
    expect(renderer.toJSON()).toBe('for-user-b|ready|on');

    token = null;
    await during(() => renderer.update(tree()));
    expect(renderer.toJSON()).toBe('fallback|ready|off');
    expect(RiviumAbTesting.isAwaitingUserToken).toBe(true);
    expect(platform.storedAssignments()).toEqual([]);
    for (const call of service.to('/public/assign')) {
      expect(tokenUser(call.token)).toBe(call.body.userId);
    }
  });

  it('follows config.userToken', async () => {
    const { RiviumAbTestingProvider } = bindings;
    const tree = (userToken?: string) => (
      <RiviumAbTestingProvider config={{ apiKey: 'rv_test_key', userToken }}>
        <Show />
      </RiviumAbTestingProvider>
    );
    const renderer = await render(tree());
    expect(renderer.toJSON()).toBe('fallback|ready|off');

    await during(() => renderer.update(tree(tokenFor('user-a'))));
    expect(renderer.toJSON()).toBe('for-user-a|ready|on');

    await during(() => renderer.update(tree(tokenFor('user-b'))));
    expect(renderer.toJSON()).toBe('for-user-b|ready|on');

    await during(() => renderer.update(tree()));
    expect(renderer.toJSON()).toBe('fallback|ready|off');
  });

  it('does nothing on the server', async () => {
    platform.remove();
    const { RiviumAbTestingProvider, RiviumAbTesting } = bindings;

    const renderer = await render(
      <RiviumAbTestingProvider config={{ apiKey: 'rv_test_key', userToken: tokenFor('user-1') }} userId="user-1">
        <Show />
      </RiviumAbTestingProvider>
    );

    expect(renderer.toJSON()).toBe('fallback|ready|off');
    await expect(RiviumAbTesting.getVariant('checkout', 'fallback')).resolves.toBe('fallback');
    await expect(RiviumAbTesting.trackView('checkout')).resolves.toBeUndefined();
    expect(service.calls).toEqual([]);
  });
});
